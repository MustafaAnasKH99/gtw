import { PCA } from "ml-pca";
import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configDotenv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
configDotenv({ path: path.join(__dirname, "..", ".env"), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const N = 2000;
const OUT_PATH = path.join(__dirname, "..", "frontend", "public", "words_3d.json");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

console.log(`Fetching up to ${N} embedded words...`);
const { rows } = await pool.query(
  `SELECT word, embedding::text AS embedding
   FROM words
   WHERE embedding IS NOT NULL
   ORDER BY md5(word)
   LIMIT $1`,
  [N]
);
console.log(`Got ${rows.length} rows.`);

if (rows.length < 4) {
  await pool.end();
  throw new Error(`Need at least 4 embedded words for 3D PCA, got ${rows.length}.`);
}

const matrix = rows.map(r => JSON.parse(r.embedding));
const words = rows.map(r => r.word);

console.log("Running PCA → 3D...");
const pca = new PCA(matrix);
const proj = pca.predict(matrix, { nComponents: 3 }).to2DArray();

// Center each axis on 0.
const mean = [0, 1, 2].map(i => proj.reduce((s, p) => s + p[i], 0) / proj.length);
const centered = proj.map(p => p.map((v, i) => v - mean[i]));

// Stable sign: force the largest absolute coordinate on each axis to be positive.
// Prevents mirror-flips when re-running after embedding refreshes.
for (let axis = 0; axis < 3; axis++) {
  let maxIdx = 0;
  for (let i = 1; i < centered.length; i++) {
    if (Math.abs(centered[i][axis]) > Math.abs(centered[maxIdx][axis])) maxIdx = i;
  }
  if (centered[maxIdx][axis] < 0) {
    for (let i = 0; i < centered.length; i++) centered[i][axis] = -centered[i][axis];
  }
}

// Normalize to unit cube so the default camera always frames the cloud.
const maxAbs = Math.max(...centered.flat().map(Math.abs));
const scaled = centered.map(p => p.map(v => v / maxAbs));

const out = words.map((w, i) => ({
  word: w,
  x: +scaled[i][0].toFixed(4),
  y: +scaled[i][1].toFixed(4),
  z: +scaled[i][2].toFixed(4),
}));

await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
await fs.writeFile(OUT_PATH, JSON.stringify(out));
console.log(`Wrote ${out.length} points to ${OUT_PATH}.`);

await pool.end();
