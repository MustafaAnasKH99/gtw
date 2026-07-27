# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Guess The Word (GTW)** — a word guessing game where the server picks a secret word each round. Players submit guesses and receive a closeness score (cosine similarity of embeddings) indicating how near their guess is to the secret word. Lower scores mean closer guesses. The game exposes a `/guess` endpoint that validates the word exists, computes similarity, and returns the score.

**Hosting:** the backend runs on Supabase (Postgres + pgvector + Edge Functions); the frontend deploys to Vercel on push to GitHub. The project previously ran on Railway — there is no Railway config left, do not reintroduce one.

## Running Scripts

Requires Node.js ≥ 20.18.0. Install dependencies once:

```bash
npm install
```

Data pipeline (run in order when building/refreshing word data):

```bash
# 1. Extract words from Oxford PDF
node words_processing_code/main.js

# 2. Clean and filter extracted words
node words_processing_code/cleanText.js

# 3. Generate OpenAI embeddings for final_words.txt
node words_processing_code/generate_embeddings.js
```

Backend (Supabase):

```bash
npm test                  # node:test suite against the local Express server
npm run app               # local Express server + Vite dev server
npm run db:push           # apply supabase/migrations/ to the project
npm run functions:deploy  # deploy the Edge Functions
```

There is no linter configured at the repo root.

## Architecture

Production is entirely serverless: Supabase Edge Functions in front of Postgres + pgvector, with the frontend on Vercel. See `supabase/README.md` for the full backend reference.

### Runtime (`supabase/`)

The three Edge Functions — `new-game`, `guess`, `viz-ranks` — handle only HTTP concerns and delegate all game logic to SECURITY DEFINER Postgres RPCs defined in `supabase/migrations/`. Sessions are rows in `game_sessions` (not process memory) with a 24h TTL enforced inside `touch_game_session()`.

`words` and `game_sessions` have RLS enabled with no policies; EXECUTE on the RPCs is granted to `service_role` only. Do not disable this — with RLS off, the anon key can read every embedding and solve any round offline.

### Local development (`server.js`, `db/`)

`server.js` is a **local-only** Express mirror of the Edge Functions, kept so `npm run app` and `npm test` work without Docker. `db/index.js` calls the exact same RPCs over `pg`. When you change an endpoint, change it in both places — but put shared game logic in a migration, never duplicated in JS.

### Data Pipeline (`words_processing_code/`)

The directory `words_processing_code/` has the code and source files used to extract the final words. Those will not be used unless there is a need to refresh or update the database. This directory is for context and archival purposes only.

| Script | Input | Output | Purpose |
|---|---|---|---|
| `main.js` | `Oxford3000.pdf` | `output.txt` | PDF → raw text via pdf2json |
| `cleanText.js` | `output.txt` | `final_output_cleaned_*.txt` | Filter to valid English words |
| `generate_embeddings.js` | `final_words.txt` | `embeddings.json`, `embeddings.csv` | Embed each word via OpenAI |

**`final_words.txt`** — 14,685 unique English words, the source list fed to embedding generation.

**`embeddings.json`** — JSON Lines file; each line is `{ "word": "...", "embedding": [...] }`.

The authoritative corpus is now the `words` table in Supabase: **10,897 rows**, `word text primary key` + `embedding vector(1536)`. `final_words.txt` is upstream input, not the runtime source of truth.

## Key Conventions

- **ES6 modules** throughout (`"type": "module"` in package.json). Use `import`/`export`, not `require`.
- **OpenAI model** for embeddings: `text-embedding-3-small`. Do not switch models mid-pipeline or existing embeddings will be incompatible with new ones.
- **API keys must be in environment variables**, not hardcoded. `generate_embeddings.js` currently has a hardcoded key — this must be replaced with `process.env.OPENAI_API_KEY` before any further commits.
- The `guess` endpoint must verify the word exists in the `words` table (via `word_exists()`) before computing a rank.
- Similarity scoring: lower score = closer to secret word (distance, not similarity percentage). Rank 1 is the secret word itself.
- **Edge Functions are TypeScript/Deno**, not Node. Use `Deno.serve`, not Express.
- **Always import with a fully-qualified specifier** (`npm:@supabase/supabase-js@2.110.9`). The deploy bundler does not apply `deno.json` import maps, so a bare `@supabase/supabase-js` fails at deploy time with a 400, even though it type-checks locally. Type-check with `cd supabase/functions && npx deno check --node-modules-dir=auto */index.ts`.
- **Game logic belongs in a migration**, not in an Edge Function or in `db/index.js`. Both callers go through RPCs so the SQL exists once.
- Edge Function names cannot contain a slash — the old `/viz/ranks` route is `viz-ranks`.
