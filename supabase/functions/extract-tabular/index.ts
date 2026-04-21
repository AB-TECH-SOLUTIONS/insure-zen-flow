// Extraction tabulaire à partir d'un PDF/image vers un schéma d'entité (clients, contrats, ...)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entityKind, fileBase64, mimeType, columns } = await req.json();
    if (!entityKind || !fileBase64 || !columns?.length) {
      return json({ error: "Paramètres manquants" }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY manquant" }, 500);

    const properties: Record<string, unknown> = {};
    for (const c of columns) properties[c.key] = { type: "string", description: c.label };

    const tool = {
      name: "extract_rows",
      description: `Extraire toutes les lignes du document pour l'entité ${entityKind}`,
      parameters: {
        type: "object",
        properties: {
          rows: {
            type: "array",
            items: { type: "object", properties, additionalProperties: false },
          },
        },
        required: ["rows"],
        additionalProperties: false,
      },
    };

    const dataUrl = `data:${mimeType ?? "application/pdf"};base64,${fileBase64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant d'extraction de données structurées. Lis attentivement le document fourni (tableau, formulaire, liste) et extrais TOUTES les lignes au format demandé. Laisse un champ vide si l'information n'apparaît pas. N'invente jamais.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extrais toutes les lignes correspondant à l'entité "${entityKind}". Une ligne = une entité.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [{ type: "function", function: tool }],
        tool_choice: { type: "function", function: { name: "extract_rows" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Limite atteinte, réessayez plus tard." }, 429);
    if (aiResp.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return json({ error: "Échec de l'extraction" }, 500);
    }

    const data = await aiResp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: { rows: any[] } = { rows: [] };
    if (call?.function?.arguments) {
      try { extracted = JSON.parse(call.function.arguments); }
      catch (e) { console.error("JSON parse failed", e); }
    }
    return json({ rows: extracted.rows ?? [] });
  } catch (e) {
    console.error("extract-tabular error", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}