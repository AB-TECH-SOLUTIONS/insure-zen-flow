// Extraction tabulaire depuis un PDF/image vers un schéma d'entité.
// Sécurité : CORS restreint, JWT requis, rate limit 10/min, validation taille.
import {
  corsHeadersFor,
  jsonResponse,
  requireUser,
  checkRateLimit,
} from "../_shared/security.ts";

const ALLOWED_ENTITIES = new Set(["clients", "contrats", "vehicules", "paiements", "sinistres"]);
const ALLOWED_MIME = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
]);
const MAX_BASE64_LENGTH = Math.ceil((8 * 1024 * 1024) * 4 / 3); // ~8MB binaire

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const allowed = await checkRateLimit("extract-tabular", auth.userId, 10);
  if (!allowed) {
    return jsonResponse(req, { error: "Trop de requêtes, patientez 1 minute." }, 429);
  }

  try {
    const { entityKind, fileBase64, mimeType, columns } = await req.json();

    if (!entityKind || typeof entityKind !== "string" || !ALLOWED_ENTITIES.has(entityKind)) {
      return jsonResponse(req, { error: "entityKind invalide" }, 400);
    }
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return jsonResponse(req, { error: "fileBase64 requis" }, 400);
    }
    if (fileBase64.length > MAX_BASE64_LENGTH) {
      return jsonResponse(req, { error: "Fichier trop volumineux (>8MB)" }, 413);
    }
    if (mimeType && !ALLOWED_MIME.has(mimeType)) {
      return jsonResponse(req, { error: "mimeType non supporté" }, 400);
    }
    if (!Array.isArray(columns) || columns.length === 0 || columns.length > 30) {
      return jsonResponse(req, { error: "columns doit être un tableau de 1 à 30 éléments" }, 400);
    }
    for (const c of columns) {
      if (!c?.key || !c?.label || typeof c.key !== "string" || typeof c.label !== "string") {
        return jsonResponse(req, { error: "format de colonne invalide" }, 400);
      }
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return jsonResponse(req, { error: "LOVABLE_API_KEY manquant" }, 500);

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

    if (aiResp.status === 429) return jsonResponse(req, { error: "Limite IA atteinte." }, 429);
    if (aiResp.status === 402) return jsonResponse(req, { error: "Crédits IA épuisés." }, 402);
    if (!aiResp.ok) {
      console.error("AI gateway error", aiResp.status, await aiResp.text());
      return jsonResponse(req, { error: "Échec de l'extraction" }, 500);
    }

    const data = await aiResp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: { rows: unknown[] } = { rows: [] };
    if (call?.function?.arguments) {
      try { extracted = JSON.parse(call.function.arguments); }
      catch (e) { console.error("JSON parse failed", e); }
    }
    return jsonResponse(req, { rows: extracted.rows ?? [] });
  } catch (e) {
    console.error("extract-tabular error", e);
    return jsonResponse(req, { error: "Erreur interne" }, 500);
  }
});
