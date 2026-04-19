// Tarifaire Voyage NSIA — grille âge × produit × durée
// Source : tarifaire_ass_voyage NSIA (30/12/2022)
// Extension Sports d'Hiver : surprime de +100% sur prime nette

export type ZoneVoyage = "europe_schengen" | "schengen_exclusif" | "voyageur" | "perle" | "famille" | "economie";

export const PRODUITS_VOYAGE: { code: ZoneVoyage; label: string; zone: "Europe" | "Monde" }[] = [
  { code: "europe_schengen",  label: "Europe et Schengen",  zone: "Europe" },
  { code: "schengen_exclusif", label: "Schengen exclusif",  zone: "Europe" },
  { code: "voyageur",          label: "Voyageur",            zone: "Monde" },
  { code: "perle",             label: "Perle",               zone: "Monde" },
  { code: "famille",           label: "Famille",             zone: "Monde" },
  { code: "economie",          label: "Économie",            zone: "Monde" },
];

export type TrancheAge = "0_18" | "18_65" | "66_75" | "76_80" | "80_plus";

export const TRANCHES_AGE: { code: TrancheAge; label: string }[] = [
  { code: "0_18",  label: "3 mois à 18 ans" },
  { code: "18_65", label: "18 à 65 ans" },
  { code: "66_75", label: "66 à 75 ans" },
  { code: "76_80", label: "76 à 80 ans" },
  { code: "80_plus", label: "80 ans et +" },
];

export function getTrancheAge(age: number): TrancheAge {
  if (age < 18) return "0_18";
  if (age <= 65) return "18_65";
  if (age <= 75) return "66_75";
  if (age <= 80) return "76_80";
  return "80_plus";
}

export const DUREES_VOYAGE = [7, 10, 15, 21, 31, 45, 60, 92, 180, 365, 730] as const;
export type DureeVoyage = (typeof DUREES_VOYAGE)[number];

export function snapDureeVoyage(jours: number): DureeVoyage {
  for (const d of DUREES_VOYAGE) if (jours <= d) return d;
  return 730;
}

// Tables : [tranche][produit] -> { duree -> prime nette }
type GrillePrime = Record<DureeVoyage, number>;
type GrilleProduit = Record<ZoneVoyage, GrillePrime>;

const TARIF_18_65: GrilleProduit = {
  europe_schengen:   { 7: 12_953, 10: 14_506, 15: 16_058, 21: 19_933, 31: 21_486, 45: 26_143, 60: 30_029, 92: 40_895, 180: 47_105, 365: 66_503, 730: 123_940 },
  schengen_exclusif: { 7: 10_757, 10: 11_834, 15: 12_890, 21: 15_562, 31: 16_628, 45: 19_828, 60: 22_500, 92: 29_966, 180: 34_242, 365: 47_569, 730: 87_043 },
  voyageur:          { 7: 33_091, 10: 34_686, 15: 44_000, 21: 52_532, 31: 74_265, 45: 82_808, 60: 90_570, 92: 101_436, 180: 124_721, 365: 134_806, 730: 255_117 },
  perle:             { 7: 18_381, 10: 19_933, 15: 25_372, 21: 27_695, 31: 33_904, 45: 37_009, 60: 40_895, 92: 57_971, 180: 64_951, 365: 75_817, 730: 137_140 },
  famille:           { 7: 30_029, 10: 35_457, 15: 40_895, 21: 55_637, 31: 58_742, 45: 62_628, 60: 67_285, 92: 93_675, 180: 144_902, 365: 158_091, 730: 302_458 },
  economie:          { 7: 12_172, 10: 13_724, 15: 15_276, 21: 19_163, 31: 20_715, 45: 24_590, 60: 30_029, 92: 39_343, 180: 46_323, 365: 56_419, 730: 103_759 },
};

const TARIF_0_18: GrilleProduit = {
  europe_schengen:   { 7: 9_587, 10: 10_392, 15: 11_197, 21: 13_207, 31: 14_012, 45: 16_426, 60: 18_441, 92: 24_076, 180: 27_295, 365: 37_354, 730: 67_136 },
  schengen_exclusif: { 7: 8_360, 10: 8_898, 15: 9_426, 21: 10_762, 31: 11_295, 45: 12_895, 60: 14_231, 92: 17_964, 180: 20_102, 365: 26_766, 730: 46_503 },
  voyageur:          { 7: 19_527, 10: 20_324, 15: 24_981, 21: 29_247, 31: 40_114, 45: 44_385, 60: 48_266, 92: 53_699, 180: 65_342, 365: 70_384, 730: 130_540 },
  perle:             { 7: 12_172, 10: 12_948, 15: 15_667, 21: 16_829, 31: 19_933, 45: 21_486, 60: 23_429, 92: 31_967, 180: 35_457, 365: 40_890, 730: 71_551 },
  famille:           { 7: 17_996, 10: 20_710, 15: 23_429, 21: 30_800, 31: 32_352, 45: 34_295, 60: 36_624, 92: 49_819, 180: 75_432, 365: 82_027, 730: 154_210 },
  economie:          { 7: 9_067, 10: 9_843, 15: 10_619, 21: 12_563, 31: 13_339, 45: 15_276, 60: 17_996, 92: 22_653, 180: 26_143, 365: 31_191, 730: 54_861 },
};

const TARIF_66_75: GrilleProduit = {
  europe_schengen:   { 7: 16_449, 10: 18_777, 15: 21_106, 21: 26_919, 31: 29_247, 45: 36_233, 60: 42_062, 92: 58_362, 180: 67_676, 365: 96_774, 730: 182_928 },
  schengen_exclusif: { 7: 13_154, 10: 14_770, 15: 16_354, 21: 20_361, 31: 21_961, 45: 26_761, 60: 30_768, 92: 41_967, 180: 48_382, 365: 68_373, 730: 127_583 },
  voyageur:          { 7: 46_656, 10: 49_048, 15: 63_019, 21: 75_817, 31: 108_416, 45: 121_231, 60: 132_874, 92: 149_173, 180: 184_101, 365: 199_228, 730: 385_657 },
  perle:             { 7: 24_590, 10: 26_919, 15: 35_077, 21: 38_561, 31: 47_875, 45: 52_532, 60: 58_362, 92: 83_975, 180: 94_445, 365: 110_745, 730: 202_729 },
  famille:           { 7: 42_062, 10: 50_204, 15: 58_362, 21: 80_474, 31: 85_131, 45: 90_961, 60: 97_946, 92: 137_531, 180: 214_371, 365: 234_155, 730: 456_668 },
  economie:          { 7: 15_276, 10: 17_605, 15: 19_933, 21: 25_763, 31: 28_091, 45: 33_904, 60: 42_062, 92: 56_033, 180: 66_503, 365: 81_647, 730: 152_658 },
};

const TARIF_76_80: GrilleProduit = {
  europe_schengen:   { 7: 19_944, 10: 23_049, 15: 26_153, 21: 33_904, 31: 37_009, 45: 46_323, 60: 54_095, 92: 75_828, 180: 88_247, 365: 127_044, 730: 241_917 },
  schengen_exclusif: { 7: 15_551, 10: 17_705, 15: 19_817, 21: 25_161, 31: 27_294, 45: 33_693, 60: 39_037, 92: 53_969, 180: 62_522, 365: 89_176, 730: 168_123 },
  voyageur:          { 7: 60_220, 10: 63_409, 15: 82_037, 21: 99_102, 31: 142_568, 45: 159_654, 60: 175_177, 92: 196_910, 180: 243_480, 365: 263_650, 730: 510_234 },
  perle:             { 7: 30_800, 10: 33_904, 15: 44_781, 21: 49_428, 31: 61_846, 45: 68_056, 60: 75_828, 92: 109_979, 180: 123_940, 365: 145_672, 730: 268_317 },
  famille:           { 7: 54_095, 10: 64_951, 15: 75_828, 21: 105_312, 31: 111_521, 45: 119_293, 60: 128_607, 92: 181_387, 180: 283_841, 365: 310_220, 730: 604_916 },
  economie:          { 7: 18_381, 10: 21_486, 15: 24_590, 21: 32_363, 31: 35_467, 45: 43_218, 60: 54_095, 92: 72_723, 180: 86_684, 365: 106_875, 730: 201_556 },
};

// 80+ : grille uniquement Europe + Schengen disponible dans le PDF — primes nettes
const TARIF_80_PLUS_EUR_SCH: GrillePrime = {
  7: 23_449, 10: 28_656, 15: 33_863, 21: 46_863, 31: 52_070, 45: 67_691, 60: 80_726, 92: 117_175, 180: 138_003, 365: 203_072, 730: 395_731,
};
// Pour produits Monde 80+, on applique surcoût × 2 par rapport à 76-80 (estimation conservatrice)
const TARIF_80_PLUS: GrilleProduit = {
  europe_schengen: TARIF_80_PLUS_EUR_SCH,
  schengen_exclusif: Object.fromEntries(DUREES_VOYAGE.map((d) => [d, Math.round(TARIF_76_80.schengen_exclusif[d] * 1.4)])) as GrillePrime,
  voyageur:          Object.fromEntries(DUREES_VOYAGE.map((d) => [d, Math.round(TARIF_76_80.voyageur[d] * 1.4)])) as GrillePrime,
  perle:             Object.fromEntries(DUREES_VOYAGE.map((d) => [d, Math.round(TARIF_76_80.perle[d] * 1.4)])) as GrillePrime,
  famille:           Object.fromEntries(DUREES_VOYAGE.map((d) => [d, Math.round(TARIF_76_80.famille[d] * 1.4)])) as GrillePrime,
  economie:          Object.fromEntries(DUREES_VOYAGE.map((d) => [d, Math.round(TARIF_76_80.economie[d] * 1.4)])) as GrillePrime,
};

const GRILLE_VOYAGE: Record<TrancheAge, GrilleProduit> = {
  "0_18":  TARIF_0_18,
  "18_65": TARIF_18_65,
  "66_75": TARIF_66_75,
  "76_80": TARIF_76_80,
  "80_plus": TARIF_80_PLUS,
};

export interface VoyageInput {
  produit: ZoneVoyage;
  age: number;
  jours: number;
  nbVoyageurs: number;
  sportsHiver: boolean;
}

export interface VoyageLigne {
  key: string;
  label: string;
  montant: number;
  source: "auto" | "manuel";
  editable: boolean;
}

export interface VoyageOverrides {
  manualMode: boolean;
  lines: Partial<Record<string, number>>;
}

export interface VoyageResult {
  lignes: VoyageLigne[];
  primeNette: number;
  accessoires: number;
  baseTva: number;
  tva: number;
  primeTTC: number;
  trancheAge: TrancheAge;
  dureeRetenue: DureeVoyage;
}

export const TVA_VOYAGE = 0.1925;
export const ACCESSOIRES_VOYAGE_DEFAUT = 5_000; // alignée tarifaire NSIA page 80+

export function getPrimeBase(input: VoyageInput): number {
  const tranche = getTrancheAge(input.age);
  const duree = snapDureeVoyage(input.jours);
  return GRILLE_VOYAGE[tranche][input.produit][duree];
}

export function coterVoyage(input: VoyageInput, overrides: VoyageOverrides): VoyageResult {
  const tranche = getTrancheAge(input.age);
  const duree = snapDureeVoyage(input.jours);
  const primeBase = GRILLE_VOYAGE[tranche][input.produit][duree];

  const auto: Record<string, number> = {};
  auto.primeBase = primeBase * Math.max(1, input.nbVoyageurs);
  auto.sportsHiver = input.sportsHiver ? auto.primeBase : 0; // +100%

  const val = (k: string) => (overrides.lines[k] !== undefined ? overrides.lines[k]! : auto[k] ?? 0);

  const lignes: VoyageLigne[] = [
    { key: "primeBase", label: `Prime nette × ${input.nbVoyageurs} voyageur(s)`, montant: val("primeBase"), editable: true, source: overrides.manualMode || overrides.lines.primeBase !== undefined ? "manuel" : "auto" },
    { key: "sportsHiver", label: "Extension Sports d'Hiver (+100%)", montant: val("sportsHiver"), editable: true, source: overrides.manualMode || overrides.lines.sportsHiver !== undefined ? "manuel" : "auto" },
  ];

  const primeNette = lignes.reduce((s, l) => s + l.montant, 0);
  const accessoires = overrides.lines.accessoires !== undefined ? overrides.lines.accessoires! : ACCESSOIRES_VOYAGE_DEFAUT;
  const baseTva = primeNette + accessoires;
  const tvaAuto = Math.round(baseTva * TVA_VOYAGE);
  const tva = overrides.lines.tva !== undefined ? overrides.lines.tva! : tvaAuto;
  const primeTTC = primeNette + accessoires + tva;

  return { lignes, primeNette, accessoires, baseTva, tva, primeTTC, trancheAge: tranche, dureeRetenue: duree };
}

export function defaultVoyageOverrides(): VoyageOverrides {
  return { manualMode: false, lines: {} };
}
