// Barèmes auto unifiés CIMA / Cameroun
// Sources : Tarifaire NSIA Cameroun (Modifié 2007 + révisions ASAC)
// AFRINSURANCE applique la même grille que NSIA (confirmé par l'utilisateur)
// GMC : à compléter quand le tarifaire sera disponible — pour l'instant on utilise la même grille
// Les valeurs en mode "manuel" sont toujours overridables par l'utilisateur

export type Categorie =
  | "cat1" // Tourisme personnes physiques
  | "cat2" // Transport propre compte (utilitaire)
  | "cat3" // Transport public marchandises (TPM)
  | "cat4a" // TPV - Taxi
  | "cat4b" // TPV - Bus urbain
  | "cat4c" // TPV - Interurbain
  | "cat5" // 2/3 roues
  | "cat6" // Garagistes
  | "cat7" // Auto-école
  | "cat8" // Location sans chauffeur
  | "cat9" // Engins chantier
  | "cat11"; // Véhicules spéciaux

export type Zone = "A" | "B" | "C"; // CEMAC zones — A=urbaine, B=secondaire, C=rurale

export const CATEGORIE_LABELS: Record<Categorie, string> = {
  cat1: "Cat. 1 — Tourisme (personnes physiques)",
  cat2: "Cat. 2 — Transport propre compte (utilitaire)",
  cat3: "Cat. 3 — Transport public marchandises (TPM)",
  cat4a: "Cat. 4A — Taxi",
  cat4b: "Cat. 4B — Bus urbain",
  cat4c: "Cat. 4C — Interurbain",
  cat5: "Cat. 5 — Engins 2/3 roues",
  cat6: "Cat. 6 — Garagistes (W garage)",
  cat7: "Cat. 7 — Auto-école",
  cat8: "Cat. 8 — Location sans chauffeur",
  cat9: "Cat. 9 — Engins de chantier",
  cat11: "Cat. 11 — Véhicules spéciaux",
};

// ============================================================================
// DTA (Droit de Timbre Automobile = vignette) — par puissance fiscale & catégorie
// ============================================================================
// Article 597 CGI Cameroun
// A. Transport en commun (cat 3, 4a/b/c) ET marchandises
// B. Autres véhicules (cat 1, 2, 7, 8…)

export interface DtaTranche {
  cvMin: number;
  cvMax: number;
  montant: number; // FCFA
}

export const DTA_TRANSPORT_COMMUN: DtaTranche[] = [
  { cvMin: 2, cvMax: 7, montant: 15_000 },
  { cvMin: 8, cvMax: 13, montant: 25_000 },
  { cvMin: 14, cvMax: 20, montant: 50_000 },
  { cvMin: 21, cvMax: 999, montant: 150_000 },
];

export const DTA_AUTRES: DtaTranche[] = [
  { cvMin: 2, cvMax: 7, montant: 20_000 },
  { cvMin: 8, cvMax: 13, montant: 50_000 },
  { cvMin: 14, cvMax: 20, montant: 75_000 },
  { cvMin: 21, cvMax: 999, montant: 200_000 },
];

const CAT_TRANSPORT_COMMUN: Categorie[] = ["cat3", "cat4a", "cat4b", "cat4c"];

export function calculerDTA(categorie: Categorie, cv: number, _zone: Zone = "A"): number {
  const grille = CAT_TRANSPORT_COMMUN.includes(categorie)
    ? DTA_TRANSPORT_COMMUN
    : DTA_AUTRES;
  const tranche = grille.find((t) => cv >= t.cvMin && cv <= t.cvMax);
  return tranche?.montant ?? grille[grille.length - 1].montant;
}

// ============================================================================
// Taux Dommages (DTA = "Dommages Tous Accidents") par catégorie
// ============================================================================
// % de la valeur vénale (ou neuve si récent)
export const TAUX_DOMMAGES: Record<Categorie, number> = {
  cat1: 0.035, // 3.5%
  cat2: 0.05, // 5%
  cat3: 0.04, // 4% (avec accord DG, sinon 7%)
  cat4a: 0.06,
  cat4b: 0.06,
  cat4c: 0.06,
  cat5: 0.06,
  cat6: 0.05,
  cat7: 0.05,
  cat8: 0.06,
  cat9: 0.04,
  cat11: 0.05,
};

// ============================================================================
// Garanties optionnelles (% sur valeur vénale ou neuve selon garantie)
// ============================================================================
export interface TauxGaranties {
  brisDeGlaces: number; // sur valeur neuve
  incendie: number;
  volSimple: number;
  volBraquage: number;
  tierceCollision: number;
}

export const GARANTIES_PAR_CATEGORIE: Record<Categorie, TauxGaranties> = {
  cat1: { brisDeGlaces: 0.003, incendie: 0.0024, volSimple: 0.01, volBraquage: 0.005, tierceCollision: 0.025 },
  cat2: { brisDeGlaces: 0.004, incendie: 0.0024, volSimple: 0.01, volBraquage: 0.005, tierceCollision: 0.02 },
  cat3: { brisDeGlaces: 0.004, incendie: 0.003, volSimple: 0.015, volBraquage: 0.005, tierceCollision: 0.02 },
  cat4a: { brisDeGlaces: 0.005, incendie: 0.003, volSimple: 0.015, volBraquage: 0.005, tierceCollision: 0.025 },
  cat4b: { brisDeGlaces: 0.005, incendie: 0.003, volSimple: 0.015, volBraquage: 0.005, tierceCollision: 0.025 },
  cat4c: { brisDeGlaces: 0.005, incendie: 0.003, volSimple: 0.015, volBraquage: 0.005, tierceCollision: 0.025 },
  cat5: { brisDeGlaces: 0, incendie: 0.005, volSimple: 0.02, volBraquage: 0.005, tierceCollision: 0.03 },
  cat6: { brisDeGlaces: 0.004, incendie: 0.003, volSimple: 0.01, volBraquage: 0.005, tierceCollision: 0.02 },
  cat7: { brisDeGlaces: 0.004, incendie: 0.003, volSimple: 0.01, volBraquage: 0.005, tierceCollision: 0.02 },
  cat8: { brisDeGlaces: 0.005, incendie: 0.003, volSimple: 0.015, volBraquage: 0.005, tierceCollision: 0.025 },
  cat9: { brisDeGlaces: 0, incendie: 0.003, volSimple: 0.015, volBraquage: 0.005, tierceCollision: 0.02 },
  cat11: { brisDeGlaces: 0, incendie: 0.003, volSimple: 0.015, volBraquage: 0.005, tierceCollision: 0.02 },
};

// ============================================================================
// RC (Responsabilité Civile) — barème simplifié par catégorie x CV
// Source : tarifaire NSIA Cat 1, plus barèmes spécifiques par cat
// ============================================================================
// Pour MVP : barème CV → prime annuelle RC nette (cat1)
// Catégories pro = forfait selon places/charge utile

export interface RcTranche {
  cvMin: number;
  cvMax: number;
  prime: number; // FCFA annuel
}

// Cat 1 — Tourisme personnes physiques (extrait tarifaire NSIA)
export const RC_CAT1: RcTranche[] = [
  { cvMin: 2, cvMax: 6, prime: 47_252 },
  { cvMin: 7, cvMax: 10, prime: 70_877 },
  { cvMin: 11, cvMax: 14, prime: 117_764 },
  { cvMin: 15, cvMax: 23, prime: 170_005 },
  { cvMin: 24, cvMax: 999, prime: 177_733 },
];

// Cat 2 — TPC utilitaire — fonction de la charge utile
export const RC_CAT2_PAR_CU: { cuMaxKg: number; prime: number }[] = [
  { cuMaxKg: 1500, prime: 90_000 },
  { cuMaxKg: 3500, prime: 130_000 },
  { cuMaxKg: 6000, prime: 180_000 },
  { cuMaxKg: 999_999, prime: 250_000 },
];

// Cat 3 — TPM — fonction du PTAC
export const RC_CAT3_PAR_PTAC: { ptacMaxKg: number; prime: number }[] = [
  { ptacMaxKg: 3500, prime: 200_000 },
  { ptacMaxKg: 10_000, prime: 350_000 },
  { ptacMaxKg: 19_000, prime: 500_000 },
  { ptacMaxKg: 999_999, prime: 750_000 },
];

// Cat 4 — TPV — fonction du nombre de places
export const RC_CAT4_PAR_PLACES: { placesMax: number; prime: number }[] = [
  { placesMax: 9, prime: 150_000 }, // taxi
  { placesMax: 20, prime: 280_000 },
  { placesMax: 50, prime: 450_000 },
  { placesMax: 999, prime: 700_000 },
];

export function calculerRC(input: {
  categorie: Categorie;
  cv: number;
  places?: number;
  chargeUtileKg?: number;
}): number {
  const { categorie, cv, places = 5, chargeUtileKg = 0 } = input;
  switch (categorie) {
    case "cat1": {
      const t = RC_CAT1.find((x) => cv >= x.cvMin && cv <= x.cvMax);
      return t?.prime ?? RC_CAT1[RC_CAT1.length - 1].prime;
    }
    case "cat2": {
      const t = RC_CAT2_PAR_CU.find((x) => chargeUtileKg <= x.cuMaxKg);
      return t?.prime ?? RC_CAT2_PAR_CU[RC_CAT2_PAR_CU.length - 1].prime;
    }
    case "cat3": {
      const t = RC_CAT3_PAR_PTAC.find((x) => chargeUtileKg <= x.ptacMaxKg);
      return t?.prime ?? RC_CAT3_PAR_PTAC[RC_CAT3_PAR_PTAC.length - 1].prime;
    }
    case "cat4a":
    case "cat4b":
    case "cat4c": {
      const t = RC_CAT4_PAR_PLACES.find((x) => places <= x.placesMax);
      return t?.prime ?? RC_CAT4_PAR_PLACES[RC_CAT4_PAR_PLACES.length - 1].prime;
    }
    case "cat5":
      return 18_000; // 2/3 roues forfait
    case "cat7":
      return 95_000;
    case "cat8":
      return 130_000;
    default:
      return 100_000; // forfait fallback
  }
}

// ============================================================================
// IPT (Individuelle Personnes Transportées) — prime forfaitaire par option
// Non proratisable
// ============================================================================
export interface OptionIPT {
  code: "I" | "II" | "III" | "IV";
  label: string;
  capitauxDeces: number;
  capitauxInvalidite: number;
  fraisMedicaux: number;
  primeParPlace: number;
}

export const OPTIONS_IPT: OptionIPT[] = [
  { code: "I", label: "Option I — Standard", capitauxDeces: 1_000_000, capitauxInvalidite: 1_000_000, fraisMedicaux: 100_000, primeParPlace: 1_500 },
  { code: "II", label: "Option II — Confort", capitauxDeces: 2_000_000, capitauxInvalidite: 2_000_000, fraisMedicaux: 200_000, primeParPlace: 3_000 },
  { code: "III", label: "Option III — Premium", capitauxDeces: 5_000_000, capitauxInvalidite: 5_000_000, fraisMedicaux: 500_000, primeParPlace: 7_500 },
  { code: "IV", label: "Option IV — Excellence", capitauxDeces: 10_000_000, capitauxInvalidite: 10_000_000, fraisMedicaux: 1_000_000, primeParPlace: 15_000 },
];

// ============================================================================
// Frais & taxes
// ============================================================================
export const TAUX_DEFENSE_RECOURS = 2_000; // forfait par véhicule
export const TAUX_PROTECTION_CONDUCTEUR = 0.25; // 25% prime RC, min 26 250 FCFA
export const PROTECTION_CONDUCTEUR_MIN = 26_250;

export const TVA = 0.1925; // 19.25% Cameroun
export const FICHIER_CENTRAL = 2_000;
export const CARTE_ROSE_CEMAC = 1_000;

// Accessoires (page 12 NSIA) — fonction de la prime nette
export function calculerAccessoires(primeNette: number): number {
  if (primeNette < 100_000) return 5_000;
  if (primeNette < 300_000) return 10_000;
  if (primeNette < 500_000) return 15_000;
  if (primeNette < 1_000_000) return 25_000;
  return 35_000;
}

// Réduction RC (max 15%) — flotte / fidélité
export const REDUCTION_RC_MAX = 0.15;
