// Fully-qualified specifier on purpose: the deploy bundler does not apply the
// import map in deno.json, so a bare "@supabase/supabase-js" fails to resolve.
import { createClient } from "npm:@supabase/supabase-js@2.110.9";

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected into every Edge
// Function by the platform. The service role is required: `words` and
// `game_sessions` are RLS-protected and EXECUTE on the RPCs below is granted to
// service_role only.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(`rpc ${fn} failed: ${error.message}`);
  return data as T;
}

export const wordExists = (word: string) => rpc<boolean>("word_exists", { p_word: word });

export const getRank = (secretWord: string, guessWord: string) =>
  rpc<number | null>("get_rank", { p_secret: secretWord, p_guess: guessWord });

export const newGame = () => rpc<string>("new_game");

/** Secret word for the session, or null if unknown or past its 24h TTL. */
export const touchSession = (sessionId: string) =>
  rpc<string | null>("touch_game_session", { p_id: sessionId });

export const endSession = (sessionId: string) =>
  rpc<null>("end_game_session", { p_id: sessionId });

export async function getRanksForWords(
  secretWord: string,
  words: string[],
): Promise<Record<string, number>> {
  const rows = await rpc<Array<{ word: string; rank: number }>>("get_ranks_for_words", {
    p_secret: secretWord,
    p_words: words,
  });
  return Object.fromEntries(rows.map((r) => [r.word, r.rank]));
}

// The corpus is static, so the count is memoised for the life of the isolate
// rather than re-queried per request. This replaces the module-level
// `totalWordsPromise` the Express server held open.
let totalPromise: Promise<number> | null = null;
export function wordCount(): Promise<number> {
  if (!totalPromise) {
    totalPromise = rpc<number>("word_count").catch((err) => {
      totalPromise = null; // don't cache a failure
      throw err;
    });
  }
  return totalPromise;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** game_sessions.id is a uuid; a malformed value would make the RPC throw 22P02. */
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);
