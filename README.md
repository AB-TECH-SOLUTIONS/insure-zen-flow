# InsureZen Flow

Plateforme d'assurance multi-compagnies pour le marché CEMAC (Cameroun, Congo,
Gabon, RCA, Tchad, Guinée Équatoriale), conforme aux barèmes CIMA.

## Fonctionnalités

- Cotation auto / voyage / vie avec moteur tarifaire CIMA
- Souscription en ligne, génération d'attestations et de cartes roses CEMAC
- Gestion sinistres avec workflow expert / garage
- Tiers payant médical (hôpital, pharmacie)
- Paiements Mobile Money (MTN, Orange) — en cours d'intégration
- Portails dédiés : client, agent, courtier, assureur, garage, expert,
  hôpital, pharmacie, autorité, super administrateur
- Chatbot Awa propulsé par l'IA

## Stack

React 18 · Vite 5 · TypeScript · Tailwind · shadcn/ui · Supabase · Lovable AI
Gateway · jsPDF

## Démarrage local

```bash
cp .env.example .env.local   # remplir avec vos clés
npm install
npm run dev
```

## Sécurité

Ne jamais commiter `.env` ni `.env.local`. Les vraies clés sont stockées dans
Vercel / GitHub Secrets / Lovable Cloud.
