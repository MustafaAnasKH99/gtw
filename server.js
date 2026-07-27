// Local-development server.
//
// Production is Supabase Edge Functions — see supabase/functions/{new-game,
// guess,viz-ranks}. This mirrors their routes and responses so the frontend can
// run against localhost with no code changes, and so db/test.js has something to
// exercise. Keep the two in sync; the shared game logic lives in the RPCs under
// supabase/migrations/.
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import {
  wordExists,
  wordCount,
  getRank,
  getRanksForWords,
  newGameSession,
  touchGameSession,
  endGameSession,
} from "./db/index.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

// Sessions live in the game_sessions table, not in process memory, because Edge
// Function isolates are stateless and short-lived. TTL is enforced inside
// touch_game_session(); expired rows are reclaimed by
// purge_expired_game_sessions() rather than a setInterval sweep.

// Kick off the word count query immediately but don't block module initialization.
// This way app.listen() always fires even if the DB is slow or unreachable at startup.
const totalWordsPromise = wordCount();
const getTotal = () => totalWordsPromise;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.post("/new-game", async (_req, res) => {
  try {
    const sessionId = await newGameSession();
    res.json({ sessionId, message: "New game started" });
  } catch (err) {
    console.error("/new-game failed:", err);
    res.status(500).json({ error: "failed to start game" });
  }
});

app.post("/guess", async (req, res) => {
  const sessionId = req.headers["x-session-id"];
  if (!UUID_RE.test(sessionId ?? "")) {
    return res.status(401).json({ error: "session not found — start a new game" });
  }

  try {
    const secretWord = await touchGameSession(sessionId);
    if (!secretWord) {
      return res.status(401).json({ error: "session not found — start a new game" });
    }

    const word = req.body?.word?.trim().toLowerCase();
    if (!word) return res.status(400).json({ error: "missing word" });

    if (!await wordExists(word)) return res.status(404).json({ error: "word not recognized" });

    const rank = await getRank(secretWord, word);
    const won = rank === 1;

    if (won) await endGameSession(sessionId);

    res.json({ word, rank, total: await getTotal(), won });
  } catch (err) {
    console.error("/guess failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

app.get("/health", async (_req, res) => {
  res.json({ status: "ok", words: await getTotal() });
});

// Ranks a fixed set of words against a secret. Returns the secret in plaintext —
// this is unrelated to game sessions and exists purely to drive the About-tab 3D
// viz. Named to match the Edge Function, which cannot have a slash in its name.
app.post("/viz-ranks", async (req, res) => {
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

  try {
    let secret = req.body?.secret;
    if (secret !== undefined) {
      if (typeof secret !== "string" || !await wordExists(secret)) {
        return res.status(404).json({ error: "secret word not found" });
      }
    } else {
      secret = words[Math.floor(Math.random() * words.length)];
    }

    const ranks = await getRanksForWords(secret, words);
    res.json({ secret, ranks });
  } catch (err) {
    console.error("/viz-ranks failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "frontend", "dist");

app.use(express.static(distPath));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(distPath, "index.html")));

export { app };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, async () => console.log(`Server running on port ${PORT}, ${await getTotal()} words`));
}
