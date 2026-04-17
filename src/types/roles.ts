export type AppRole = "client" | "agent" | "courtier" | "assureur" | "super_admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  client: "Client",
  agent: "Agent général",
  courtier: "Courtier",
  assureur: "Assureur",
  super_admin: "Super administrateur",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  client: "Comparez, souscrivez, payez et déclarez vos sinistres.",
  agent: "Gérez les cotations et contrats d'une seule compagnie.",
  courtier: "Travaillez avec plusieurs compagnies sur demande validée.",
  assureur: "Vue 360° de votre compagnie : portefeuille, sinistres, CA.",
  super_admin: "Administration globale de la plateforme.",
};

export const ROLE_HOME: Record<AppRole, string> = {
  client: "/client",
  agent: "/agent",
  courtier: "/courtier",
  assureur: "/assureur",
  super_admin: "/admin",
};
