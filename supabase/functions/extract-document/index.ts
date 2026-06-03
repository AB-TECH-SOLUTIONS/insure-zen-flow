// Extraction d'informations à partir d'une image (carte grise/permis/passeport/CNI)
// Sécurité : CORS restreint, JWT requis, rate limit 20/min, validation taille image.
import {
  corsHeadersFor,
  jsonResponse,
  requireUser,
  checkRateLimit,
} from "../_shared/security.ts";

type DocType = "carte_grise" | "permis" | "passeport" | "cni";
const DOC_TYPES: DocType[] = ["carte_grise", "permis", "passeport", "cni"];
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_BASE64_LENGTH = Math.ceil((5 * 1024 * 1024) * 4 / 3); // ~5MB binaire

const SCHEMAS: Record<DocType, { name: string; description: string; parameters: Record<string, unknown> }> = {
  carte_grise: {
    name: "extract_carte_grise",
    description: "Extraction des informations d'une carte grise (certificat d'immatriculation) Cameroun/CEMAC.",
    parameters: {
      type: "object",
      properties: {
        immatriculation: { type: "string", description: "Numéro d'immatriculation, ex: LT 123 AB" },
        marque: { type: "string" },
        modele: { type: "string" },
        energie: { type: "string", enum: ["essence", "diesel", "hybride", "electrique"] },
        cv: { type: "number", description: "Puissance fiscale en CV" },
        places: { type: "number" },
        chargeUtileKg: { type: "number" },
        vin: { type: "string" },
        dateMiseEnCirculation: { type: "string" },
        proprietaireNom: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  permis: {
    name: "extract_permis",
    description: "Extraction des informations d'un permis de conduire.",
    parameters: {
      type: "object",
      properties: {
        nom: { type: "string" },
        prenom: { type: "string" },
        dateNaissance: { type: "string" },
        numeroPermis: { type: "string" },
        categories: { type: "array", items: { type: "string" } },
        dateDelivrance: { type: "string" },
        dateExpiration: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  passeport: {
    name: "extract_passeport",
    description: "Extraction des informations d'un passeport.",
    parameters: {
      type: "object",
      properties: {
        nom: { type: "string" },
        prenom: { type: "string" },
        dateNaissance: { type: "string" },
        sexe: { type: "string", enum: ["M", "F", "X"] },
        nationalite: { type: "string" },
        numeroPasseport: { type: "string" },
        dateDelivrance: { type: "string" },
        dateExpiration: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  cni: {
    name: "extract_cni",
    description: "Extraction d'une carte nationale d'identité.",
    parameters: {
      type: "object",
      properties: {
        nom: { type: "string" },
        prenom: { type: "string" },
        dateNaissance: { type: "string" },
        numeroCNI: { type: "string" },
        lieuNaissance: { type: "string" },
      },
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const allowed = await checkRateLimit("extract-document", auth.userId, 20);
  if (!allowed) {
    return jsonResponse(req, { error: "Trop de requêtes, patientez 1 minute." }, 429);
  }

  try {
    const { docType, imageBase64, mimeType } = await req.json();

    if (!docType || typeof docType !== "string" || !DOC_TYPES.includes(docType as DocType)) {
      return jsonResponse(req, { error: `docType invalide. Valeurs autorisées : ${DOC_TYPES.join(", ")}` }, 400);
    }
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return jsonResponse(req, { error: "imageBase64 requis" }, 400);
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return jsonResponse(req, { error: "Image trop volumineuse (>5MB)" }, 413);
    }
    if (mimeType && !ALLOWED_MIME.has(mimeType)) {
      return jsonResponse(req, { error: "mimeType non supporté" }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return jsonResponse(req, { error: "LOVABLE_API_KEY manquant" }, 500);

    const tool = SCHEMAS[docType as DocType];
    const dataUrl = `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant d'extraction de documents officiels d'Afrique centrale. Lis attentivement le document et appelle l'outil fourni. N'invente jamais : laisse un champ vide si tu n'es pas sûr.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extrais les informations de ce document de type "${docType}".` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [{ type: "function", function: tool }],
        tool_choice: { type: "function", function: { name: tool.name } },
      }),
    });

    if (aiResp.status === 429) return jsonResponse(req, { error: "Limite IA atteinte, réessayez." }, 429);
    if (aiResp.status === 402) return jsonResponse(req, { error: "Crédits IA épuisés." }, 402);
    if (!aiResp.ok) {
      console.error("AI gateway error", aiResp.status, await aiResp.text());
      return jsonResponse(req, { error: "Échec de l'extraction" }, 500);
    }

    const data = await aiResp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: Record<string, unknown> = {};
    if (call?.function?.arguments) {
      try { extracted = JSON.parse(call.function.arguments); }
      catch (e) { console.error("JSON parse failed", e); }
    }
    return jsonResponse(req, { extracted });
  } catch (e) {
    console.error("extract-document error", e);
    return jsonResponse(req, { error: "Erreur interne" }, 500);
  }
});
