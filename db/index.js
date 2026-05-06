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

export async function wordExists(word) {
  const { rows } = await pool.query("SELECT 1 FROM words WHERE word = $1", [word]);
  return rows.length > 0;
}

export async function getRandomWord() {
  const { rows } = await pool.query("SELECT word FROM words ORDER BY RANDOM() LIMIT 1");
  return rows[0]?.word ?? null;
}

export async function wordCount() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM words");
  return rows[0].count;
}

// Returns the 1-based rank of guessWord relative to secretWord.
// Rank 1 = the secret word itself (distance 0). Higher rank = less similar.
export async function getRank(secretWord, guessWord) {
  const { rows } = await pool.query(
    `SELECT (
       SELECT COUNT(*)::int FROM words
       WHERE embedding <=> s.embedding < (w.embedding <=> s.embedding)
     ) + 1 AS rank
     FROM words w, words s
     WHERE w.word = $1 AND s.word = $2`,
    [guessWord, secretWord]
  );
  return rows[0]?.rank ?? null;
}

// Returns global ranks (1-based, over the full corpus) for each word in `words`,
// relative to `secretWord`. RANK() OVER sorts all words by distance once
// (O(N log N)) and ties share a rank, instead of a per-row count subquery
// (O(N²)) that hits Supabase's statement_timeout on a 14k-row corpus.
export async function getRanksForWords(secretWord, words) {
  const { rows } = await pool.query(
    `WITH s AS MATERIALIZED (SELECT embedding FROM words WHERE word = $1),
          ranked AS (
            SELECT w.word,
                   RANK() OVER (ORDER BY w.embedding <=> s.embedding) AS rank
            FROM words w, s
          )
     SELECT word, rank::int AS rank FROM ranked WHERE word = ANY($2::text[])`,
    [secretWord, words]
  );
  const out = {};
  for (const r of rows) out[r.word] = r.rank;
  return out;
}

export function closePool() {
  return pool.end();
}
