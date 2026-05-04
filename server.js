import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { wordExists, getRandomWord, wordCount, getRank } from "./db/index.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// Map<sessionId, { secretWord, lastAccessedAt }>
const sessions = new Map();

// Cache total word count once at module load (top-level await, ES module)
const totalWords = await wordCount();

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
  if (!session) return res.status(404).json({ error: "session not found — start a new game" });

  session.lastAccessedAt = Date.now();

  const word = req.body?.word?.trim().toLowerCase();
  if (!word) return res.status(400).json({ error: "missing word" });

  try {
    if (!await wordExists(word)) return res.status(404).json({ error: "word not recognized" });

    const rank = await getRank(session.secretWord, word);
    const won = rank === 1;

    if (won) sessions.delete(sessionId);

    res.json({ word, rank, total: totalWords, won });
  } catch {
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", words: totalWords });
});

export { app, sessions };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}, ${totalWords} words`));
}
