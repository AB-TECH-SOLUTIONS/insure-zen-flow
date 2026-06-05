// Edge Function interne : insère une notification.
// Appelable :
//   - depuis une autre edge function avec la service-role key (anycast),
//   - depuis le frontend authentifié (l'utilisateur peut s'auto-notifier ou un admin peut notifier).
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeadersFor, jsonResponse, requireUser, serviceClient, checkRateLimit, isInternalCron } from "../_shared/security.ts";

const BodySchema = z.object({
  user_id: z.string().uuid(),
  category: z.enum(["info", "success", "warning", "error"]).default("info"),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional().nullable(),
  link: z.string().max(500).optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeadersFor(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  // Soit appel interne (service_role), soit appel utilisateur authentifié.
  let actorId = "internal";
  if (!isInternalCron(req)) {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    actorId = auth.userId;
    const ok = await checkRateLimit("send-notification", actorId, 60);
    if (!ok) return jsonResponse(req, { error: "Trop de requêtes" }, 429);
  }

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return jsonResponse(req, { error: parsed.error.flatten().fieldErrors }, 400);

  // Les utilisateurs non super_admin ne peuvent s'auto-notifier.
  if (actorId !== "internal" && actorId !== parsed.data.user_id) {
    const svc = serviceClient();
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: actorId, _role: "super_admin" });
    if (!isAdmin) return jsonResponse(req, { error: "Forbidden" }, 403);
  }

  const { error } = await serviceClient().from("notifications").insert({
    user_id: parsed.data.user_id,
    category: parsed.data.category,
    title: parsed.data.title,
    body: parsed.data.body ?? null,
    link: parsed.data.link ?? null,
  });
  if (error) return jsonResponse(req, { error: error.message }, 500);

  return jsonResponse(req, { ok: true });
});