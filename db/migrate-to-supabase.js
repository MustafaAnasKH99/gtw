import Database from "better-sqlite3";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { configDotenv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
configDotenv({ path: path.join(__dirname, "..", ".env"), override: true });

const BATCH_SIZE = 100;

const sqlite = new Database(path.join(__dirname, "..", "words.db"));
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const rows = sqlite.prepare("SELECT word, embedding FROM words").all();
  console.log(`Migrating ${rows.length} words to Supabase...`);

  const client = await pool.connect();
  try {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await client.query("BEGIN");
      for (const row of batch) {
        const embedding = new Float32Array(JSON.parse(row.embedding));
        const embStr = JSON.stringify(Array.from(embedding));
        await client.query(
          "INSERT INTO words (word, embedding) VALUES ($1, $2::vector) ON CONFLICT (word) DO NOTHING",
          [row.word, embStr]
        );
      }
      await client.query("COMMIT");
      console.log(`  ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
    }
    console.log("Done.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
