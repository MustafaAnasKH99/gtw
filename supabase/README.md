# Supabase backend

All server-side logic runs as Edge Functions against the project's Postgres
database. This replaces the Railway-hosted Express server.

```
supabase/
  config.toml                 project ref + per-function settings
  migrations/                 schema and game logic (SQL)
  functions/
    _shared/cors.ts           CORS headers + JSON helpers
    _shared/db.ts             service-role client, RPC wrappers
    new-game/                 POST -> { sessionId, message }
    guess/                    POST -> { word, rank, total, won }
    viz-ranks/                POST -> { secret, ranks }
```

## Endpoints

Base URL: `https://vgppqssqmtxqsyjcqoup.supabase.co/functions/v1`

| Function | Method | Request | Response |
|---|---|---|---|
| `new-game` | POST | — | `{ sessionId, message }` |
| `guess` | POST | header `x-session-id`, body `{ word }` | `{ word, rank, total, won }` |
| `viz-ranks` | POST | `{ words: string[], secret? }` | `{ secret, ranks }` |

`verify_jwt` is off for all three (the game has no user accounts), so no
`Authorization` header is required.

Error responses match the old Express server: 400 `missing word`, 401
`session not found — start a new game`, 404 `word not recognized`,
404 `secret word not found`, 500 `internal error`.

## Where the logic lives

The pgvector queries and session lifecycle are Postgres functions, not
TypeScript. The Edge Functions only do HTTP concerns — parsing, validation,
status codes — and call RPCs:

| RPC | Purpose |
|---|---|
| `word_exists(p_word)` | validate a guess is in the corpus |
| `word_count()` | corpus size (memoised per isolate) |
| `random_word()` | pick a secret |
| `get_rank(p_secret, p_guess)` | 1-based rank of a guess; 1 = the secret |
| `get_ranks_for_words(p_secret, p_words[])` | bulk ranks for the 3D viz |
| `new_game()` | create a session, return its uuid |
| `touch_game_session(p_id)` | read secret + bump TTL, or NULL if expired |
| `end_game_session(p_id)` | delete on win |
| `purge_expired_game_sessions()` | reclaim rows past the 24h TTL |

This keeps one source of truth: the local Express server in `../server.js` calls
the same functions through `pg`.

## Sessions

The Express server kept sessions in a process-local `Map` with an hourly
`setInterval` sweep. Edge Function isolates are stateless and short-lived, so
sessions are now rows in `game_sessions` (uuid pk, `secret_word`,
`last_accessed_at`).

The 24h TTL is enforced inside `touch_game_session()` — an expired row returns
NULL and reads as "session not found", so cleanup is not required for
correctness. To reclaim the rows, enable `pg_cron` and schedule the purge:

```sql
select cron.schedule(
  'purge-gtw-sessions', '0 * * * *',
  $$select public.purge_expired_game_sessions()$$
);
```

## Security

`words` and `game_sessions` both have RLS enabled with no policies, and EXECUTE
on the RPCs is granted to `service_role` only. Before this migration `words` had
RLS off, so anyone holding the (public) anon key could read the whole corpus and
its embeddings through PostgREST — enough to solve any round offline. The Edge
Functions use `SUPABASE_SERVICE_ROLE_KEY`, which the platform injects
automatically; it is never exposed to the browser.

## Deploying

Authenticate once:

```bash
npx supabase login          # or: export SUPABASE_ACCESS_TOKEN=...
npx supabase link --project-ref vgppqssqmtxqsyjcqoup
```

Then:

```bash
npm run db:push             # apply migrations/
npm run functions:deploy    # deploy all three functions
```

Optional — restrict CORS to the deployed frontend (defaults to `*`):

```bash
npx supabase secrets set CORS_ORIGIN=https://your-app.vercel.app
```

## Frontend wiring

The frontend is deployed on Vercel and picks its API base from
`VITE_API_BASE_URL`. Set it in the Vercel project settings:

```
VITE_API_BASE_URL=https://vgppqssqmtxqsyjcqoup.supabase.co/functions/v1
```

Left unset, it falls back to same-origin paths, which the Vite dev server
proxies to the local Express server on :3000.

Note the one path change: the Express route `/viz/ranks` became `/viz-ranks`,
since Edge Function names cannot contain a slash.
