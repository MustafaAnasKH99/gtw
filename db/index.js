import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, "..", "words.db");
const db = new Database(DB_PATH);

const stmtExists = db.prepare("SELECT 1 FROM words WHERE word = ?");
const stmtEmbedding = db.prepare("SELECT embedding FROM words WHERE word = ?");
const stmtCount = db.prepare("SELECT COUNT(*) AS count FROM words");
const stmtRandom = db.prepare("SELECT word FROM words ORDER BY RANDOM() LIMIT 1");
const stmtAll = db.prepare("SELECT word, embedding FROM words");

export function wordExists(word) {
  return !!stmtExists.get(word);
}

export function getEmbedding(word) {
  const row = stmtEmbedding.get(word);
  if (!row) return null;
  return new Float32Array(JSON.parse(row.embedding));
}

export function getRandomWord() {
  return stmtRandom.get()?.word ?? null;
}

export function wordCount() {
  return stmtCount.get().count;
}

export function getAllEmbeddings() {
  const map = new Map();
  for (const row of stmtAll.iterate()) {
    map.set(row.word, new Float32Array(JSON.parse(row.embedding)));
  }
  return map;
}
