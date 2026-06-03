// Awa — Assistante chatbot client
// Sécurité : CORS restreint, JWT requis, rate limit 20 req/min par utilisateur.
import {
  corsHeadersFor,
  jsonResponse,
  requireUser,
  checkRateLimit,
} from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req) });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const allowed = await checkRateLimit("chatbot-client", auth.userId, 20);
  if (!allowed) {
    return jsonResponse(req, { error: "Trop de requêtes, patientez 1 minute." }, 429);
  }

  try {
    const body = await req.json();
    const { messages, context } = body ?? {};

    // Validation des inputs
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return jsonResponse(req, { error: "messages doit être un tableau de 1 à 50 éléments" }, 400);
    }
    for (const m of messages) {
      if (!m || typeof m.role !== "string" || typeof m.content !== "string") {
        return jsonResponse(req, { error: "format de message invalide" }, 400);
      }
      if (!["user", "assistant", "system"].includes(m.role)) {
        return jsonResponse(req, { error: "rôle de message invalide" }, 400);
      }
      if (m.content.length > 4000) {
        return jsonResponse(req, { error: "message trop long (>4000 caractères)" }, 400);
      }
    }

    const systemPrompt = [
      "Tu es Awa, l'assistante InsureZen Flow, experte en assurance au Cameroun et zone CIMA.",
      "Tu aides les assurés à comprendre leurs contrats, suivre leurs sinistres,",
      "gérer leurs paiements et comprendre leurs garanties.",
      "Tu réponds en français simple, bienveillant et précis (3-5 phrases max).",
      "Ne donne jamais de conseils juridiques définitifs.",
      "Si une question dépasse tes compétences, recommande de contacter un conseiller agréé.",
      context ? "Données assuré : " + JSON.stringify(context).slice(0, 1500) : "",
    ].filter(Boolean).join(" ");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return jsonResponse(req, { error: "LOVABLE_API_KEY manquant" }, 500);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

    if (resp.status === 429) return jsonResponse(req, { error: "Trop de requêtes côté IA, réessayez." }, 429);
    if (resp.status === 402) return jsonResponse(req, { error: "Crédits IA épuisés." }, 402);
    if (!resp.ok) {
      console.error("AI gateway error", resp.status, await resp.text());
      return jsonResponse(req, { error: "Service IA indisponible" }, 500);
    }
    const data = await resp.json();
    const reply = data?.choices?.[0]?.message?.content ?? "Je n'ai pas pu répondre.";
    return jsonResponse(req, { reply });
  } catch (e) {
    console.error("chatbot error", e);
    return jsonResponse(req, { error: "Erreur interne" }, 500);
  }
});
