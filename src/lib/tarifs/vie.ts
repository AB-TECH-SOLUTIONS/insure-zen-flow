// Moteur tarifaire Assurance Vie
// Pattern : src/lib/tarifs/voyage.ts

export type ProduitVie = "epargne" | "deces" | "retraite" | "education" | "obseques";

export const PRODUITS_VIE: { code: ProduitVie; label: string; desc: string }[] = [
  { code: "epargne",   label: "Vie Épargne",  desc: "Capital constitué + décès" },
  { code: "deces",     label: "Vie Décès",    desc: "Protection du foyer" },
  { code: "retraite",  label: "Retraite",     desc: "Complément de revenus" },
  { code: "education", label: "Éducation",    desc: "Avenir des enfants" },
  { code: "obseques",  label: "Obsèques",     desc: "Prévoyance funéraire" },
];

export type DureeVie = 5 | 10 | 15 | 20 | 25 | 30;
export const DUREES_VIE: DureeVie[] = [5, 10, 15, 20, 25, 30];

export type ModeVie = "mensuel" | "trimestriel" | "semestriel" | "annuel";
export const MODES_VIE: { code: ModeVie; label: string; diviseur: number }[] = [
  { code: "mensuel",     label: "Mensuelle",     diviseur: 12 },
  { code: "trimestriel", label: "Trimestrielle", diviseur: 4 },
  { code: "semestriel",  label: "Semestrielle",  diviseur: 2 },
  { code: "annuel",      label: "Annuelle",      diviseur: 1 },
];

// Taux annuel par tranche d'âge
const TAUX: Record<string, number> = {
  "18_30": 0.012,
  "31_40": 0.015,
  "41_50": 0.021,
  "51_60": 0.028,
  "61_70": 0.042,
  "71_plus": 0.065,
};

export function getTranche(age: number): string {
  if (age < 31) return "18_30";
  if (age < 41) return "31_40";
  if (age < 51) return "41_50";
  if (age < 61) return "51_60";
  if (age < 71) return "61_70";
  return "71_plus";
}

const FRAIS_DOSSIER = 5_000;
const TAXE = 0.03;

export interface VieBeneficiaire {
  nom: string;
  lien: string;
  pourcentage: number;
}

export interface VieInput {
  produit: ProduitVie;
  age: number;
  capital: number;
  dureeAnnees: DureeVie;
  mode: ModeVie;
  beneficiaire?: VieBeneficiaire;
}

export interface VieResult {
  primeAnnuelle: number;
  primePeriodique: number;
  mode: ModeVie;
  fraisDossier: number;
  taxe: number;
  coutTotal: number;
  capitalGaranti: number;
  tranche: string;
  taux: number;
}

export function coterVie(input: VieInput): VieResult {
  const tranche = getTranche(input.age);
  const taux = TAUX[tranche];
  const primeAnnuelle = Math.round(input.capital * taux);
  const mode = MODES_VIE.find((m) => m.code === input.mode)!;
  const primePeriodique = Math.round(primeAnnuelle / mode.diviseur);
  const taxe = Math.round(primeAnnuelle * TAXE);
  return {
    primeAnnuelle,
    primePeriodique,
    mode: input.mode,
    fraisDossier: FRAIS_DOSSIER,
    taxe,
    coutTotal: (primeAnnuelle + taxe) * input.dureeAnnees,
    capitalGaranti: input.capital,
    tranche,
    taux,
  };
}