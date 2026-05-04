import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMBEDDINGS_PATH = path.join(__dirname, "..", "generate_embeddings", "embeddings.json");
const DB_PATH = path.join(__dirname, "..", "words.db");

const raw = fs.readFileSync(EMBEDDINGS_PATH, "utf-8");

// Support both a single JSON array and newline-delimited JSON Lines
let entries = [];
const lines = raw.split("\n").filter(l => l.trim());
for (const line of lines) {
  const parsed = JSON.parse(line);
  if (Array.isArray(parsed)) {
    entries.push(...parsed);
  } else {
    entries.push(parsed);
  }
}

const db = new Database(DB_PATH);
const insert = db.prepare("INSERT OR IGNORE INTO words (word, embedding) VALUES (?, ?)");

const before = db.prepare("SELECT COUNT(*) AS count FROM words").get().count;

const insertMany = db.transaction((rows) => {
  for (const { word, embedding } of rows) {
    insert.run(word, JSON.stringify(embedding));
  }
});

insertMany(entries);

const after = db.prepare("SELECT COUNT(*) AS count FROM words").get().count;
console.log(`Loaded ${entries.length} entries from embeddings.json.`);
console.log(`Inserted ${after - before} new rows. Total rows: ${after}.`);
db.close();
