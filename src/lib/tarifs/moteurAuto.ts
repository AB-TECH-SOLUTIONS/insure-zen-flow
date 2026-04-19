// Moteur de cotation Auto unifié — NSIA / GMC / AFRI
// Mode manuel : toggle global + override champ par champ
import {
  type Categorie,
  type Zone,
  calculerRC,
  calculerDTA,
  TAUX_DOMMAGES,
  GARANTIES_PAR_CATEGORIE,
  OPTIONS_IPT,
  TAUX_DEFENSE_RECOURS,
  TAUX_PROTECTION_CONDUCTEUR,
  PROTECTION_CONDUCTEUR_MIN,
  TVA,
  FICHIER_CENTRAL,
  CARTE_ROSE_CEMAC,
  calculerAccessoires,
  REDUCTION_RC_MAX,
} from "./auto";
import { calculerRcGmc, calculerDtaGmc, rcGmcDisponible, GMC_TAUX, type GmcEnergie } from "./gmc";

export type CompagnieCode = "NSIA" | "AFRI" | "GMC" | "AUTRE";

export interface AutoInput {
  // Compagnie (détermine le barème appliqué)
  compagnie: CompagnieCode;
  // Véhicule
  categorie: Categorie;
  cv: number;
  zone: Zone;
  energie: GmcEnergie;
  places: number;
  chargeUtileKg: number;
  valeurNeuve: number;
  valeurVenale: number;
  immatriculation?: string;
  marque?: string;
  modele?: string;
  // Garanties activées
  garanties: {
    rc: boolean; // toujours true (obligatoire)
    defenseRecours: boolean;
    ipt: boolean;
    iptOption?: "I" | "II" | "III" | "IV";
    dommages: boolean;
    brisDeGlaces: boolean;
    incendie: boolean;
    volSimple: boolean;
    volBraquage: boolean;
    tierceCollision: boolean;
    protectionConducteur: boolean;
    carteRoseCEMAC: boolean;
  };
  // Réductions
  reductionRcPct: number; // 0..0.15
  // Durée
  dureeMois: number; // 1..12
}

export interface LigneDecompte {
  key: string;
  label: string;
  montant: number;
  editable: boolean;
  source: "auto" | "manuel"; // d'où vient cette ligne
}

export interface AutoOverrides {
  // Toggle global : si true, toutes les lignes sont en mode manuel (mais initialisées au calcul auto)
  manualMode: boolean;
  // Override champ par champ : key = clé de ligne
  lines: Partial<Record<string, number>>;
}

export interface AutoCotationResult {
  lignes: LigneDecompte[];
  primeNette: number;
  reductionRC: number;
  primeNetteApresReduction: number;
  accessoires: number;
  fichierCentral: number;
  dta: number;
  carteRose: number;
  baseTva: number; // prime nette + accessoires
  tva: number;
  primeTTC: number;
}

// Coefficient de prorata (cotisations RC notamment) — IPT non proratisable
function coefDuree(mois: number): number {
  if (mois >= 12) return 1;
  if (mois === 6) return 0.53;
  if (mois === 3) return 0.28;
  if (mois === 1) return 0.1;
  return mois / 12;
}

export function coter(input: AutoInput, overrides: AutoOverrides): AutoCotationResult {
  const isGmc = input.compagnie === "GMC" && rcGmcDisponible(input.categorie);
  const useGmcTaux = input.compagnie === "GMC" && (input.categorie === "cat1" || input.categorie === "cat2");
  const garanties = GARANTIES_PAR_CATEGORIE[input.categorie];
  const tauxDommages = useGmcTaux ? GMC_TAUX.dommages : TAUX_DOMMAGES[input.categorie];
  const coef = coefDuree(input.dureeMois);

  const auto: Record<string, number> = {};

  if (isGmc) {
    auto.rc = calculerRcGmc({
      categorie: input.categorie as "cat1" | "cat2",
      cv: input.cv,
      energie: input.energie,
      dureeMois: input.dureeMois,
    });
  } else {
    auto.rc = Math.round(calculerRC(input) * coef);
  }
  auto.dr = input.garanties.defenseRecours ? TAUX_DEFENSE_RECOURS : 0;
  auto.dommages = input.garanties.dommages ? Math.round(input.valeurVenale * tauxDommages * coef) : 0;
  auto.brisDeGlaces = input.garanties.brisDeGlaces ? Math.round(input.valeurNeuve * (useGmcTaux ? GMC_TAUX.brisDeGlaces : garanties.brisDeGlaces) * coef) : 0;
  auto.incendie = input.garanties.incendie ? Math.round(input.valeurVenale * (useGmcTaux ? GMC_TAUX.incendie : garanties.incendie) * coef) : 0;
  auto.volSimple = input.garanties.volSimple ? Math.round(input.valeurVenale * (useGmcTaux ? GMC_TAUX.volSimple : garanties.volSimple) * coef) : 0;
  auto.volBraquage = input.garanties.volBraquage ? Math.round(input.valeurVenale * (useGmcTaux ? GMC_TAUX.volBraquage : garanties.volBraquage) * coef) : 0;
  auto.tierceCollision = input.garanties.tierceCollision ? Math.round(input.valeurVenale * (useGmcTaux ? GMC_TAUX.tierceCollision : garanties.tierceCollision) * coef) : 0;

  if (input.garanties.ipt) {
    const option = OPTIONS_IPT.find((o) => o.code === (input.garanties.iptOption ?? "I"))!;
    auto.ipt = option.primeParPlace * input.places;
  } else {
    auto.ipt = 0;
  }

  if (input.garanties.protectionConducteur) {
    auto.protectionConducteur = Math.max(Math.round(auto.rc * TAUX_PROTECTION_CONDUCTEUR), PROTECTION_CONDUCTEUR_MIN);
  } else {
    auto.protectionConducteur = 0;
  }

  // ---- application des overrides ligne par ligne ----
  const val = (key: string) => {
    if (overrides.lines[key] !== undefined) return overrides.lines[key]!;
    return auto[key] ?? 0;
  };

  const labels: Record<string, string> = {
    rc: "Responsabilité Civile (RC/RTI)",
    dr: "Défense & Recours (DR)",
    ipt: "Individuelle Personnes Transportées (IPT)",
    dommages: "Dommages Tous Accidents (DTA)",
    brisDeGlaces: "Bris de Glaces",
    incendie: "Incendie",
    volSimple: "Vol simple",
    volBraquage: "Vol à main armée / Braquage",
    tierceCollision: "Tierce collision",
    protectionConducteur: "Protection du conducteur",
  };

  const lignes: LigneDecompte[] = Object.keys(labels).map((key) => ({
    key,
    label: labels[key],
    montant: val(key),
    editable: true,
    source: overrides.manualMode || overrides.lines[key] !== undefined ? "manuel" : "auto",
  }));

  // ---- agrégation ----
  const primeNette = lignes.reduce((s, l) => s + l.montant, 0);

  // Réduction RC plafonnée
  const pctRed = Math.min(Math.max(input.reductionRcPct, 0), REDUCTION_RC_MAX);
  const reductionRCAuto = Math.round(val("rc") * pctRed);
  const reductionRC = overrides.lines.reductionRC !== undefined ? overrides.lines.reductionRC! : reductionRCAuto;
  const primeNetteApresReduction = primeNette - reductionRC;

  // Frais & taxes
  const accessoiresAuto = calculerAccessoires(primeNetteApresReduction);
  const accessoires = overrides.lines.accessoires !== undefined ? overrides.lines.accessoires! : accessoiresAuto;

  const fichierCentral = overrides.lines.fichierCentral !== undefined ? overrides.lines.fichierCentral! : FICHIER_CENTRAL;
  const carteRose = input.garanties.carteRoseCEMAC
    ? overrides.lines.carteRose !== undefined
      ? overrides.lines.carteRose!
      : CARTE_ROSE_CEMAC
    : 0;

  const dtaAuto = isGmc ? calculerDtaGmc(input.cv) : calculerDTA(input.categorie, input.cv, input.zone);
  const dta = overrides.lines.dta !== undefined ? overrides.lines.dta! : dtaAuto;

  // TVA s'applique sur prime nette + accessoires (page 12 NSIA)
  const baseTva = primeNetteApresReduction + accessoires;
  const tvaAuto = Math.round(baseTva * TVA);
  const tva = overrides.lines.tva !== undefined ? overrides.lines.tva! : tvaAuto;

  const primeTTC = primeNetteApresReduction + accessoires + fichierCentral + tva + carteRose + dta;

  return {
    lignes,
    primeNette,
    reductionRC,
    primeNetteApresReduction,
    accessoires,
    fichierCentral,
    dta,
    carteRose,
    baseTva,
    tva,
    primeTTC,
  };
}

export function defaultOverrides(): AutoOverrides {
  return { manualMode: false, lines: {} };
}
