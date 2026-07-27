// Local-development data layer.
//
// Production runs on Supabase Edge Functions (supabase/functions/*), which reach
// the database through the same SECURITY DEFINER RPCs called below. The SQL
// itself lives in supabase/migrations/ and is deliberately not duplicated here —
// this module is a thin pg-backed shim so `npm run app` and `npm test` work
// without Docker or a deployed function.
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { configDotenv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
configDotenv({ path: path.join(__dirname, "..", ".env"), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// `words` and `game_sessions` are RLS-protected. This connects as the postgres
// role, which bypasses RLS; the Edge Functions use the service_role key instead.
async function rpc(fn, params = []) {
  const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await pool.query(`SELECT public.${fn}(${placeholders}) AS result`, params);
  return rows[0]?.result ?? null;
}

export const wordExists = word => rpc("word_exists", [word]);

export const getRandomWord = () => rpc("random_word");

export const wordCount = () => rpc("word_count");

// 1-based rank of guessWord relative to secretWord.
// Rank 1 = the secret itself (distance 0); higher rank = less similar.
export const getRank = (secretWord, guessWord) => rpc("get_rank", [secretWord, guessWord]);

export const newGameSession = () => rpc("new_game");

/** Secret word for the session, or null if unknown or past its 24h TTL. */
export const touchGameSession = sessionId => rpc("touch_game_session", [sessionId]);

export const endGameSession = sessionId => rpc("end_game_session", [sessionId]);

/** Global ranks (1-based, over the full corpus) for each word, vs secretWord. */
export async function getRanksForWords(secretWord, words) {
  const { rows } = await pool.query(
    "SELECT word, rank FROM public.get_ranks_for_words($1, $2::text[])",
    [secretWord, words]
  );
  const out = {};
  for (const r of rows) out[r.word] = r.rank;
  return out;
}

export function closePool() {
  return pool.end();
}
