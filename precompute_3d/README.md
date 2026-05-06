# precompute_3d

Offline script that pulls word embeddings from the database, projects them down to 3 dimensions via PCA, and writes the result to `frontend/public/words_3d.json`. The About-tab visualization loads this static asset at runtime.

## Run

```bash
npm run precompute:3d
```

Reads `DATABASE_URL` from `.env` at the repo root.

## When to re-run

- After embedding new words (so the cloud reflects the larger vocabulary).
- After changing the sample size `N` in `reduce.js`.

The output file is committed to git so deploys ship a working viz without DB access at build time.

## Notes

- Samples up to **2000** words by `md5(word)` ordering — deterministic so re-runs over the same corpus produce the same selection.
- PCA itself is deterministic; the script also pins the sign of each principal axis to prevent mirror-flips between runs.
- Output is normalized to a unit cube so the default camera always frames the cloud.
