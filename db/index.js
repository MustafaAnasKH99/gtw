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

export function closePool() {
  return pool.end();
}
