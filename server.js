import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import path from "path";
import { wordExists, getRandomWord, wordCount, getRank, getRanksForWords } from "./db/index.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// Map<sessionId, { secretWord, lastAccessedAt }>
const sessions = new Map();

// Kick off the word count query immediately but don't block module initialization.
// This way app.listen() always fires even if the DB is slow or unreachable at startup.
const totalWordsPromise = wordCount();
const getTotal = () => totalWordsPromise;

// Sweep expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccessedAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 60 * 60 * 1000).unref();

app.post("/new-game", async (_req, res) => {
  try {
    const secretWord = await getRandomWord();
    const sessionId = randomUUID();
    sessions.set(sessionId, { secretWord, lastAccessedAt: Date.now() });
    res.json({ sessionId, message: "New game started" });
  } catch {
    res.status(500).json({ error: "failed to start game" });
  }
});

app.post("/guess", async (req, res) => {
  const sessionId = req.headers["x-session-id"];
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: "session not found — start a new game" });

  session.lastAccessedAt = Date.now();

  const word = req.body?.word?.trim().toLowerCase();
  if (!word) return res.status(400).json({ error: "missing word" });

  try {
    if (!await wordExists(word)) return res.status(404).json({ error: "word not recognized" });

    const rank = await getRank(session.secretWord, word);
    const won = rank === 1;

    if (won) sessions.delete(sessionId);

    res.json({ word, rank, total: await getTotal(), won });
  } catch {
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/health", async (_req, res) => {
  res.json({ status: "ok", words: await getTotal() });
});

// Visualization endpoint: ranks a fixed set of words against a secret. Returns
// the secret in plaintext — this is unrelated to game sessions and exists purely
// to drive the About-tab 3D viz.
app.post("/viz/ranks", async (req, res) => {
  const words = req.body?.words;
  if (!Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: "words must be a non-empty array" });
  }
  if (words.length > 2500) {
    return res.status(400).json({ error: "too many words (max 2500)" });
  }
  if (!words.every(w => typeof w === "string" && w.length > 0)) {
    return res.status(400).json({ error: "words must all be non-empty strings" });
  }

  let secret = req.body?.secret;
  if (secret !== undefined) {
    if (typeof secret !== "string" || !await wordExists(secret)) {
      return res.status(404).json({ error: "secret word not found" });
    }
  } else {
    secret = words[Math.floor(Math.random() * words.length)];
  }

  try {
    const ranks = await getRanksForWords(secret, words);
    res.json({ secret, ranks });
  } catch (err) {
    console.error("/viz/ranks failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "frontend", "dist");

app.use(express.static(distPath));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(distPath, "index.html")));

export { app, sessions };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, async () => console.log(`Server running on port ${PORT}, ${await getTotal()} words`));
}
