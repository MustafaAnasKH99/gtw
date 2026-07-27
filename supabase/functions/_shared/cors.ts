// Mirrors `app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }))` from the
// Express server. Set the CORS_ORIGIN secret to lock this to your site once the
// frontend has a permanent home:
//   supabase secrets set CORS_ORIGIN=https://your-site.example
const ORIGIN = Deno.env.get("CORS_ORIGIN") ?? "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  ...(ORIGIN === "*" ? {} : { Vary: "Origin" }),
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders }) : null;
}
