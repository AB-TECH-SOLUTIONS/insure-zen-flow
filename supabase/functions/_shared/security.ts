// Helpers de sécurité partagés par les Edge Functions InsureZen Flow
// (CORS restreint, validation JWT, rate limiting via la fonction RPC Postgres)

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ORIGINS = [
  "https://insurezenflow.com",
  "https://insure-zen-flow.lovable.app",
  "https://id-preview--8bcbd1f0-a3f2-4983-849d-057d07e34fef.lovable.app",
  "http://localhost:8080",
  "http://localhost:3000",
];

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (!raw) return DEFAULT_ORIGINS;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = parseAllowedOrigins();
  const allow = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

export async function requireUser(req: Request): Promise<
  { ok: true; userId: string; supabase: SupabaseClient } | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: jsonResponse(req, { error: "Unauthorized" }, 401) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { ok: false, response: jsonResponse(req, { error: "Unauthorized" }, 401) };
  }
  return { ok: true, userId: data.claims.sub as string, supabase };
}

let _serviceClient: SupabaseClient | null = null;
export function serviceClient(): SupabaseClient {
  if (_serviceClient) return _serviceClient;
  _serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _serviceClient;
}

export async function checkRateLimit(
  bucket: string,
  identifier: string,
  maxPerMinute: number,
): Promise<boolean> {
  try {
    const { data, error } = await serviceClient().rpc(
      "check_and_increment_rate_limit",
      { _bucket: bucket, _identifier: identifier, _max_per_minute: maxPerMinute },
    );
    if (error) {
      console.error("rate_limit rpc error", error);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("rate_limit exception", e);
    return true;
  }
}

export function isInternalCron(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.replace("Bearer ", "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return Boolean(serviceKey) && token === serviceKey;
}
