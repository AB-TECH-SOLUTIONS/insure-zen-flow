// Cron quotidien : alertes de renouvellement contrats expirant dans <= 30 jours.
// Sécurité : CORS restreint, accès limité au scheduler interne Supabase
// (Authorization Bearer = SUPABASE_SERVICE_ROLE_KEY).
import { corsHeadersFor, jsonResponse, isInternalCron } from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  if (!isInternalCron(req)) {
    return jsonResponse(req, { error: "Forbidden" }, 403);
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    const in30 = new Date(today);
    in30.setDate(today.getDate() + 30);
    const todayStr = today.toISOString().split("T")[0];

    const { data: contracts, error } = await sb.from("contracts")
      .select("id,contract_number,end_date,created_by,company_id,client_id,type")
      .eq("status", "actif")
      .eq("renewal_status", "actif")
      .lte("end_date", in30.toISOString().split("T")[0])
      .gte("end_date", todayStr);

    if (error) throw error;

    let sent = 0;
    for (const c of contracts ?? []) {
      const daysLeft = Math.ceil(
        (new Date(c.end_date).getTime() - today.getTime()) / 86_400_000,
      );
      const isUrgent = daysLeft <= 15;
      const agentId = c.created_by;
      if (!agentId) continue;

      const { data: existing } = await sb.from("notifications")
        .select("id").eq("user_id", agentId)
        .like("title", `%${c.contract_number}%`)
        .gte("created_at", todayStr)
        .limit(1);
      if (existing && existing.length > 0) continue;

      await sb.from("notifications").insert({
        user_id: agentId,
        category: isUrgent ? "warning" : "info",
        title: `Renouvellement à venir : ${c.contract_number}`,
        body: `Ce contrat expire dans ${daysLeft} jour(s). Cliquez pour renouveler.`,
        link: "/agent/renouvellements",
      });
      sent++;
    }
    return jsonResponse(req, { success: true, sent });
  } catch (e) {
    console.error("check-renewals error", e);
    return jsonResponse(req, { error: "Erreur interne" }, 500);
  }
});
