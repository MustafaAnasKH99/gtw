// POST /functions/v1/viz-ranks
//   body: { words: string[], secret?: string }
//   ->    { secret, ranks: { word: rank, ... } }
//
// Was POST /viz/ranks on the Express server; Edge Function names cannot contain
// a slash. Ranks a fixed set of words against a secret and returns that secret
// in plaintext — this is unrelated to game sessions and exists purely to drive
// the About-tab 3D visualisation.
import { json, preflight } from "../_shared/cors.ts";
import { getRanksForWords, wordExists } from "../_shared/db.ts";

const MAX_WORDS = 2500;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: { words?: unknown; secret?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "words must be a non-empty array" }, 400);
  }

  const words = body?.words;
  if (!Array.isArray(words) || words.length === 0) {
    return json({ error: "words must be a non-empty array" }, 400);
  }
  if (words.length > MAX_WORDS) {
    return json({ error: `too many words (max ${MAX_WORDS})` }, 400);
  }
  if (!words.every((w) => typeof w === "string" && w.length > 0)) {
    return json({ error: "words must all be non-empty strings" }, 400);
  }

  try {
    let secret = body?.secret;
    if (secret !== undefined) {
      if (typeof secret !== "string" || !await wordExists(secret)) {
        return json({ error: "secret word not found" }, 404);
      }
    } else {
      secret = words[Math.floor(Math.random() * words.length)];
    }

    const ranks = await getRanksForWords(secret as string, words as string[]);
    return json({ secret, ranks });
  } catch (err) {
    console.error("viz-ranks failed:", err);
    return json({ error: "internal error" }, 500);
  }
});
