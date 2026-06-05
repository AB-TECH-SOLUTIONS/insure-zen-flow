// Edge Function : enregistre un paiement et simule la confirmation Mobile Money.
// Mode simulation (pas d'API MTN/Orange réelle) :
//  - Crée le paiement avec status "en_attente" pour MoMo, "paye" pour les autres modes.
//  - Pour MoMo, lance un "webhook interne" via EdgeRuntime.waitUntil() qui passe à "paye" après 3s.
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeadersFor, jsonResponse, requireUser, serviceClient, checkRateLimit } from "../_shared/security.ts";

const BodySchema = z.object({
  contract_id: z.string().uuid(),
  amount: z.number().positive().max(1_000_000_000),
  method: z.enum(["mobile_money_mtn", "mobile_money_orange", "virement", "especes", "cheque", "carte"]),
  phone: z.string().nullable().optional(),
  external_reference: z.string().max(120).optional(),
});

function genMomoRef(prefix: string) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${d}-${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeadersFor(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const allowed = await checkRateLimit("process-payment", auth.userId, 30);
  if (!allowed) return jsonResponse(req, { error: "Trop de requêtes" }, 429);

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return jsonResponse(req, { error: parsed.error.flatten().fieldErrors }, 400);

  const svc = serviceClient();
  const { data: contract, error: cErr } = await svc
    .from("contracts")
    .select("id, total_premium, client_id, company_id, status")
    .eq("id", parsed.data.contract_id)
    .maybeSingle();
  if (cErr || !contract) return jsonResponse(req, { error: "Contrat introuvable" }, 404);

  const isMomo = parsed.data.method === "mobile_money_mtn" || parsed.data.method === "mobile_money_orange";
  const ref = parsed.data.external_reference ?? (isMomo ? genMomoRef(parsed.data.method === "mobile_money_mtn" ? "MTN" : "ORG") : "");

  const { data: payment, error: pErr } = await svc.from("payments").insert({
    contract_id: contract.id,
    client_id: contract.client_id,
    company_id: contract.company_id,
    amount: parsed.data.amount,
    method: parsed.data.method,
    status: isMomo ? "en_attente" : "paye",
    external_reference: ref,
    paid_at: isMomo ? null : new Date().toISOString(),
    created_by: auth.userId,
  }).select("id").single();
  if (pErr || !payment) return jsonResponse(req, { error: pErr?.message ?? "Insert failed" }, 500);

  // Simulation : confirmation Mobile Money 3 secondes plus tard.
  if (isMomo) {
    const confirm = async () => {
      await new Promise((r) => setTimeout(r, 3000));
      await svc.from("payments").update({ status: "paye", paid_at: new Date().toISOString() }).eq("id", payment.id);
      if (contract.status !== "actif") {
        await svc.from("contracts").update({ status: "actif" }).eq("id", contract.id);
      }
      // Notifier le créateur du paiement
      await svc.from("notifications").insert({
        user_id: auth.userId,
        category: "success",
        title: "Paiement Mobile Money confirmé",
        body: `${parsed.data.amount.toLocaleString("fr-FR")} FCFA — Réf ${ref}`,
        link: `/agent/paiements`,
      });
    };
    // @ts-expect-error: EdgeRuntime fourni par Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(confirm());
    else confirm();
  }

  return jsonResponse(req, { payment_id: payment.id, external_reference: ref, status: isMomo ? "en_attente" : "paye" });
});