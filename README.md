# Guess The Word Game

each round, the game selects a random secret word from the database. The user enters a random word and the game calculates how close it is to the secret word in comparison to other words in the db (cosine similarity). The user keeps entering words until they guess the secret one. The lower the score of a word the closer it is to the secret one. The game should have a /guess endpoint that verifies the word is in the database, calculates its closeness to the secret word, then sends that back to the user.

## Steps
- ~~Extract a list of unique english words (final_words.txt)~~
- ~~Settle on a suitable database solution~~ — Supabase Postgres + pgvector
- ~~Generate embeddings for each word in the final_words.txt~~
- ~~Create the server with the proper end points~~ — Supabase Edge Functions
- ~~test calculating the distance between words.~~

## Architecture

- **Database** — Supabase Postgres + pgvector. `words` table (10,897 rows), `game_sessions` table. All game logic lives in SQL functions under `supabase/migrations/`.
- **Backend** — Supabase Edge Functions: `new-game`, `guess`, `viz-ranks`. See [supabase/README.md](supabase/README.md).
- **Frontend** — React + Vite, deployed to Vercel on push to GitHub.

`server.js` is a local-only Express mirror of the Edge Functions so the app can run without Docker; it is not deployed.

## Local development

```bash
npm install
npm run app     # Express on :3000 + Vite dev server
npm test        # endpoint + database tests
```

Requires `DATABASE_URL` in `.env` (Supabase connection string).