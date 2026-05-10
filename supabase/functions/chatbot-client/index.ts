// Awa — Assistante chatbot client (Lovable AI Gateway, gratuit, sans clé)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    if (!messages || !Array.isArray(messages)) return json({ error: "messages requis" }, 400);

    const systemPrompt = [
      "Tu es Awa, l'assistante InsureFlow, experte en assurance au Cameroun et zone CIMA.",
      "Tu aides les assurés à comprendre leurs contrats, suivre leurs sinistres,",
      "gérer leurs paiements et comprendre leurs garanties.",
      "Tu réponds en français simple, bienveillant et précis (3-5 phrases max).",
      "Ne donne jamais de conseils juridiques définitifs.",
      "Si une question dépasse tes compétences, recommande de contacter un conseiller agréé.",
      context ? "Données assuré : " + JSON.stringify(context) : "",
    ].filter(Boolean).join(" ");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY manquant" }, 500);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10).map((m: { role: string; content: string }) => ({
            role: m.role, content: m.content,
          })),
        ],
      }),
    });

    if (resp.status === 429) return json({ error: "Trop de requêtes, réessayez dans quelques secondes." }, 429);
    if (resp.status === 402) return json({ error: "Crédits IA épuisés, contactez votre conseiller." }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return json({ error: "Service IA indisponible" }, 500);
    }
    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Je n'ai pas pu répondre.";
    return json({ reply });
  } catch (e) {
    console.error("chatbot error", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});