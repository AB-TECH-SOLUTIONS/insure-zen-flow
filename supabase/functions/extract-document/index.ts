// Extraction d'informations à partir d'une image (carte grise / permis / passeport / CNI)
// via Lovable AI Gateway (Gemini Flash vision).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type DocType = "carte_grise" | "permis" | "passeport" | "cni";

const SCHEMAS: Record<DocType, { name: string; description: string; parameters: Record<string, unknown> }> = {
  carte_grise: {
    name: "extract_carte_grise",
    description:
      "Extraction des informations d'une carte grise (certificat d'immatriculation) Cameroun/CEMAC.",
    parameters: {
      type: "object",
      properties: {
        immatriculation: { type: "string", description: "Numéro d'immatriculation, ex: LT 123 AB" },
        marque: { type: "string" },
        modele: { type: "string" },
        energie: { type: "string", enum: ["essence", "diesel", "hybride", "electrique"] },
        cv: { type: "number", description: "Puissance fiscale en CV" },
        places: { type: "number" },
        chargeUtileKg: { type: "number", description: "Charge utile en kg si véhicule utilitaire" },
        vin: { type: "string", description: "Numéro de châssis" },
        dateMiseEnCirculation: { type: "string", description: "AAAA-MM-JJ" },
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
        dateNaissance: { type: "string", description: "AAAA-MM-JJ" },
        numeroPermis: { type: "string" },
        categories: { type: "array", items: { type: "string" } },
        dateDelivrance: { type: "string", description: "AAAA-MM-JJ" },
        dateExpiration: { type: "string", description: "AAAA-MM-JJ" },
      },
      additionalProperties: false,
    },
  },
  passeport: {
    name: "extract_passeport",
    description: "Extraction des informations d'un passeport (zone MRZ comprise).",
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { docType, imageBase64, mimeType } = await req.json();
    if (!docType || !imageBase64) {
      return json({ error: "docType et imageBase64 requis" }, 400);
    }
    if (!(docType in SCHEMAS)) {
      return json({ error: `docType inconnu : ${docType}` }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY manquant" }, 500);

    const tool = SCHEMAS[docType as DocType];
    const dataUrl = `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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

    if (aiResp.status === 429) return json({ error: "Limite atteinte, réessayez plus tard." }, 429);
    if (aiResp.status === 402) return json({ error: "Crédits IA épuisés, ajoutez des crédits dans Lovable Cloud." }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return json({ error: "Échec de l'extraction" }, 500);
    }

    const data = await aiResp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: Record<string, unknown> = {};
    if (call?.function?.arguments) {
      try {
        extracted = JSON.parse(call.function.arguments);
      } catch (e) {
        console.error("JSON parse failed", e);
      }
    }

    return json({ extracted });
  } catch (e) {
    console.error("extract-document error", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}