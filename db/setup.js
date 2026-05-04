import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "..", "words.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    word      TEXT    NOT NULL UNIQUE,
    embedding TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
`);

const { count } = db.prepare("SELECT COUNT(*) AS count FROM words").get();
console.log(`Database ready. words table has ${count} rows.`);
db.close();
