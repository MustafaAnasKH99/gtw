// POST /functions/v1/new-game -> { sessionId, message }
import { json, preflight } from "../_shared/cors.ts";
import { newGame } from "../_shared/db.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const sessionId = await newGame();
    return json({ sessionId, message: "New game started" });
  } catch (err) {
    console.error("new-game failed:", err);
    return json({ error: "failed to start game" }, 500);
  }
});
