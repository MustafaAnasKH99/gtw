-- Migration: move server-side game logic into the database.
--
-- The Express server kept sessions in a process-local Map and issued raw SQL
-- over a pg pool. Edge Functions are stateless and short-lived, so:
--   1. sessions become a table
--   2. every query the server ran becomes an RPC, so the pgvector SQL lives in
--      one place and both the Edge Functions and the local Express server call
--      the same thing.
--
-- Nothing here touches the existing `words` table's data.

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create table if not exists public.game_sessions (
  id               uuid primary key default gen_random_uuid(),
  secret_word      text not null references public.words(word) on delete cascade,
  created_at       timestamptz not null default now(),
  last_accessed_at timestamptz not null default now()
);

-- Supports the TTL sweep in purge_expired_game_sessions().
create index if not exists game_sessions_last_accessed_at_idx
  on public.game_sessions (last_accessed_at);

-- No policies are defined, so PostgREST's anon/authenticated roles get nothing.
-- Only service_role (the Edge Functions) and the postgres role reach this table.
alter table public.game_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- Lock down `words`
-- ---------------------------------------------------------------------------
-- Until now RLS was off, so anyone holding the (public) anon key could page
-- through the whole corpus and its embeddings via PostgREST — enough to compute
-- ranks offline and solve any round. The game only ever reaches this table
-- through the SECURITY DEFINER functions below, so direct reads are revoked.
alter table public.words enable row level security;

-- ---------------------------------------------------------------------------
-- Word lookups
-- ---------------------------------------------------------------------------

create or replace function public.word_exists(p_word text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from words where word = p_word);
$$;

create or replace function public.word_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from words;
$$;

create or replace function public.random_word()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select word from words order by random() limit 1;
$$;

-- 1-based rank of p_guess relative to p_secret.
-- Rank 1 = the secret itself (cosine distance 0); higher rank = less similar.
create or replace function public.get_rank(p_secret text, p_guess text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    select count(*)::int
    from words
    where (words.embedding <=> s.embedding) < (w.embedding <=> s.embedding)
  ) + 1
  from words w, words s
  where w.word = p_guess and s.word = p_secret;
$$;

-- Global ranks (1-based, over the full corpus) for each word in p_words.
-- RANK() OVER sorts the corpus by distance once (O(N log N)) and lets ties share
-- a rank. The per-row COUNT(*) subquery used by get_rank() is O(N^2) at this
-- fan-out and trips statement_timeout.
create or replace function public.get_ranks_for_words(p_secret text, p_words text[])
returns table (word text, rank integer)
language sql
stable
security definer
set search_path = public
as $$
  with s as materialized (
    select embedding from words where words.word = p_secret
  ),
  ranked as (
    select w.word,
           rank() over (order by w.embedding <=> s.embedding) as rank
    from words w, s
  )
  select ranked.word, ranked.rank::int
  from ranked
  where ranked.word = any(p_words);
$$;

-- ---------------------------------------------------------------------------
-- Session lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.new_game()
returns uuid
language sql
volatile
security definer
set search_path = public
as $$
  insert into game_sessions (secret_word)
  select word from words order by random() limit 1
  returning id;
$$;

-- Returns the secret word and bumps last_accessed_at, or NULL when the session
-- is unknown or has gone past the 24h TTL. Touch-and-read in one statement so a
-- stateless function needs a single round trip.
create or replace function public.touch_game_session(p_id uuid)
returns text
language sql
volatile
security definer
set search_path = public
as $$
  update game_sessions
  set last_accessed_at = now()
  where id = p_id
    and last_accessed_at > now() - interval '24 hours'
  returning secret_word;
$$;

create or replace function public.end_game_session(p_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from game_sessions where id = p_id;
$$;

-- Replaces the hourly setInterval sweep in server.js. Expired rows are already
-- rejected by touch_game_session(); this only reclaims space. Schedule it if
-- pg_cron is enabled, e.g.
--   select cron.schedule('purge-gtw-sessions', '0 * * * *',
--                        $q$select public.purge_expired_game_sessions()$q$);
create or replace function public.purge_expired_game_sessions()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  delete from game_sessions
  where last_accessed_at < now() - interval '24 hours';
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- These functions are SECURITY DEFINER and read the now-RLS-protected `words`
-- table, so EXECUTE must not be left on the default (PUBLIC). Only the Edge
-- Functions' service_role may call them; anon/authenticated get nothing, which
-- keeps get_rank() from becoming a public oracle against the secret word.

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'word_exists(text)',
    'word_count()',
    'random_word()',
    'get_rank(text, text)',
    'get_ranks_for_words(text, text[])',
    'new_game()',
    'touch_game_session(uuid)',
    'end_game_session(uuid)',
    'purge_expired_game_sessions()'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end;
$$;
