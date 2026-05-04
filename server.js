import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { getAllEmbeddings, getRandomWord } from "./db/index.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

console.log("Loading embeddings...");
const allEmbeddings = getAllEmbeddings();
console.log(`Loaded ${allEmbeddings.size} words.`);

// Map<sessionId, { secretWord, rankMap, lastAccessedAt }>
const sessions = new Map();

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function buildRankMap(secretWord) {
  const secretEmb = allEmbeddings.get(secretWord);
  return new Map(
    [...allEmbeddings.entries()]
      .map(([word, emb]) => ({ word, sim: dot(emb, secretEmb) }))
      .sort((a, b) => b.sim - a.sim)
      .map(({ word }, i) => [word, i + 1])
  );
}

// Sweep expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccessedAt > SESSION_TTL_MS) sessions.delete(id);
  }
}, 60 * 60 * 1000).unref();

app.post("/new-game", (_req, res) => {
  const secretWord = getRandomWord();
  const rankMap = buildRankMap(secretWord);
  const sessionId = randomUUID();
  sessions.set(sessionId, { secretWord, rankMap, lastAccessedAt: Date.now() });
  res.json({ sessionId, message: "New game started" });
});

app.post("/guess", (req, res) => {
  const sessionId = req.headers["x-session-id"];
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: "session not found — start a new game" });

  session.lastAccessedAt = Date.now();

  const word = req.body?.word?.trim().toLowerCase();
  if (!word) return res.status(400).json({ error: "missing word" });
  if (!allEmbeddings.has(word)) return res.status(404).json({ error: "word not recognized" });

  const rank = session.rankMap.get(word);
  const total = allEmbeddings.size;
  const won = rank === 1;

  if (won) sessions.delete(sessionId);

  res.json({ word, rank, total, won });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", words: allEmbeddings.size });
});


export { app, sessions };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
