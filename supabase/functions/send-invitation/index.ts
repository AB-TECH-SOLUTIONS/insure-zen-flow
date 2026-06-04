// Envoi d'invitation à rejoindre une équipe / compagnie sur InsureZen Flow
// - JWT requis, rate-limited 10/min, RLS-aware
// - Seuls super_admin et assureur peuvent inviter
// - Crée la ligne dans `invitations` (token déjà géré par défaut côté DB)
// - Envoie l'email via Supabase Auth (lien magique) avec redirect /invitation/<token>
import {
  corsHeadersFor,
  jsonResponse,
  requireUser,
  serviceClient,
  checkRateLimit,
} from "../_shared/security.ts";

type AppRole =
  | "super_admin" | "assureur" | "courtier" | "agent"
  | "garage" | "expert" | "hopital" | "pharmacie" | "autorite" | "reassureur" | "client";

const INVITABLE_ROLES = new Set<AppRole>([
  "assureur", "courtier", "agent", "garage", "expert",
  "hopital", "pharmacie", "autorite", "reassureur",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const allowed = await checkRateLimit("send-invitation", auth.userId, 10);
  if (!allowed) return jsonResponse(req, { error: "Trop de requêtes" }, 429);

  try {
    const body = await req.json().catch(() => ({}));
    const email: string = (body.email ?? "").toString().trim().toLowerCase();
    const role = body.role as AppRole;
    const companyId: string | null = body.company_id ?? null;
    const positionId: string | null = body.position_id ?? null;
    const message: string = (body.message ?? "").toString().slice(0, 500);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(req, { error: "Email invalide" }, 400);
    }
    if (!role || !INVITABLE_ROLES.has(role)) {
      return jsonResponse(req, { error: "Rôle invité non autorisé" }, 400);
    }

    // Vérif droits inviteur — has_role(super_admin) ou has_role(assureur)+company match
    const svc = serviceClient();
    const { data: rolesData, error: rolesErr } = await svc
      .from("user_roles").select("role").eq("user_id", auth.userId);
    if (rolesErr) throw rolesErr;
    const myRoles = new Set((rolesData ?? []).map((r) => r.role as AppRole));

    const isSuper = myRoles.has("super_admin");
    const isAssureur = myRoles.has("assureur");
    if (!isSuper && !isAssureur) {
      return jsonResponse(req, { error: "Vous n'avez pas le droit d'inviter" }, 403);
    }
    if (isAssureur && !isSuper) {
      // L'assureur ne peut inviter que dans sa propre compagnie
      const { data: profile } = await svc.from("profiles")
        .select("primary_company_id").eq("user_id", auth.userId).maybeSingle();
      if (!companyId || companyId !== profile?.primary_company_id) {
        return jsonResponse(req, { error: "Compagnie cible invalide" }, 403);
      }
    }

    // Évite les doublons d'invitations en attente
    const { data: existing } = await svc.from("invitations")
      .select("id,token,expires_at,status")
      .eq("email", email).eq("status", "pending").maybeSingle();

    let token = existing?.token ?? null;
    let invitationId = existing?.id ?? null;
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

    if (!existing) {
      const { data: inserted, error: insErr } = await svc.from("invitations")
        .insert({
          email,
          role,
          company_id: companyId,
          position_id: positionId,
          invited_by: auth.userId,
          expires_at: expiresAt,
          status: "pending",
        })
        .select("id, token")
        .single();
      if (insErr || !inserted) throw insErr ?? new Error("Insert failed");
      token = inserted.token;
      invitationId = inserted.id;
    }

    // Lien de l'invitation
    const origin = req.headers.get("Origin")
      ?? Deno.env.get("PUBLIC_APP_URL")
      ?? "https://insurezenflow.com";
    const link = `${origin}/invitation/${token}`;

    // Email transactionnel via Supabase Auth magic-link redirigé vers la page d'invitation
    const { error: mailErr } = await svc.auth.admin.inviteUserByEmail(email, {
      redirectTo: link,
      data: { invited_role: role, company_id: companyId, message },
    });
    if (mailErr && !`${mailErr.message}`.toLowerCase().includes("already")) {
      console.error("inviteUserByEmail error", mailErr);
      // Email échoué mais invitation créée — on renvoie le lien pour partage manuel
      return jsonResponse(req, {
        success: true, warning: "Email non envoyé, lien fourni.",
        invitation_id: invitationId, link,
      });
    }

    return jsonResponse(req, { success: true, invitation_id: invitationId, link });
  } catch (e) {
    console.error("send-invitation error", e);
    return jsonResponse(req, { error: e instanceof Error ? e.message : "Erreur interne" }, 500);
  }
});