// POST /functions/v1/guess
//   headers: x-session-id
//   body:    { word }
//   ->       { word, rank, total, won }
import { json, preflight } from "../_shared/cors.ts";
import { endSession, getRank, isUuid, touchSession, wordCount, wordExists } from "../_shared/db.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const sessionId = req.headers.get("x-session-id");
  if (!isUuid(sessionId)) {
    return json({ error: "session not found — start a new game" }, 401);
  }

  try {
    // Validates the session, enforces the 24h TTL, and bumps last_accessed_at.
    const secretWord = await touchSession(sessionId);
    if (!secretWord) {
      return json({ error: "session not found — start a new game" }, 401);
    }

    let body: { word?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "missing word" }, 400);
    }

    const word = typeof body?.word === "string" ? body.word.trim().toLowerCase() : "";
    if (!word) return json({ error: "missing word" }, 400);

    if (!await wordExists(word)) return json({ error: "word not recognized" }, 404);

    const rank = await getRank(secretWord, word);
    const won = rank === 1;

    if (won) await endSession(sessionId);

    return json({ word, rank, total: await wordCount(), won });
  } catch (err) {
    console.error("guess failed:", err);
    return json({ error: "internal error" }, 500);
  }
});
