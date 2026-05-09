export type AppRole =
  | "client"
  | "agent"
  | "courtier"
  | "assureur"
  | "super_admin"
  | "garage"
  | "expert"
  | "hopital"
  | "pharmacie"
  | "autorite"
  | "reassureur";

export const ROLE_LABELS: Record<AppRole, string> = {
  client: "Client",
  agent: "Agent général",
  courtier: "Courtier",
  assureur: "Assureur",
  super_admin: "Super administrateur",
  garage: "Garage agréé",
  expert: "Expert / Cabinet",
  hopital: "Établissement hospitalier",
  pharmacie: "Pharmacie",
  autorite: "Autorité compétente",
  reassureur: "Réassureur",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  client: "Comparez, souscrivez, payez et déclarez vos sinistres.",
  agent: "Gérez les cotations et contrats d'une seule compagnie.",
  courtier: "Travaillez avec plusieurs compagnies sur demande validée.",
  assureur: "Vue 360° de votre compagnie : portefeuille, sinistres, CA.",
  super_admin: "Administration globale de la plateforme.",
  garage: "Devis réparation, suivi sinistres, factures.",
  expert: "Rapports d'expertise et évaluation de dommages.",
  hopital: "Tiers payant, dossiers patients assurés.",
  pharmacie: "Tiers payant et facturation médicaments.",
  autorite: "Dépôt PV, constats, vérification d'attestations.",
  reassureur: "Cessions et traités de réassurance.",
};

export const ROLE_HOME: Record<AppRole, string> = {
  client: "/client",
  agent: "/agent",
  courtier: "/courtier",
  assureur: "/assureur",
  super_admin: "/admin",
  garage: "/garage",
  expert: "/expert",
  hopital: "/hopital",
  pharmacie: "/pharmacie",
  autorite: "/autorite",
  reassureur: "/assureur",
};
