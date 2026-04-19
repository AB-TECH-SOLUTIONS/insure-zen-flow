// Tarifaire GMC — Cat 1 (Tourisme) & Cat 2 (TPC utilitaire)
// Source : tarifaire GMC fourni — primes RC nettes par tranche CV (essence/diesel) × durée
// Pour Cat 3-11, on retombe sur la grille NSIA (cf auto.ts) en attendant un barème spécifique
// Taux garanties GMC (mention manuscrite tarifaire) :
//   Vol simple = 1% V.V — Vol braquage = 1% V.V — BDG = 0,5% V.V — Incendie = 0,25% V.V — Dommages = 3,5% V.V
// DTA GMC : 02-07 = 30 000 / 08-13 = 50 000 / 14-20 = 75 000 / >20 = 200 000

import type { Categorie } from "./auto";

export type GmcCategorie = "cat1" | "cat2";
export type GmcEnergie = "essence" | "diesel";
export type GmcDuree = 2 | 4 | 6 | 12; // mois

interface GmcTranche {
  cvMin: number;
  cvMax: number;
  primes: Record<GmcDuree, number>;
}

// Cat 1 — Tourisme
const GMC_CAT1_ESSENCE: GmcTranche[] = [
  { cvMin: 3, cvMax: 6,   primes: { 2: 23_212,  4: 41_248,  6: 59_286,  12: 95_361  } },
  { cvMin: 7, cvMax: 10,  primes: { 2: 24_945,  4: 44_717,  6: 64_488,  12: 104_031 } },
  { cvMin: 11, cvMax: 14, primes: { 2: 30_230,  4: 55_287,  6: 80_344,  12: 130_230 } },
  { cvMin: 15, cvMax: 23, primes: { 2: 36_408,  4: 67_640,  6: 98_874,  12: 161_341 } },
  { cvMin: 24, cvMax: 999,primes: { 2: 41_565,  4: 77_957,  6: 114_348, 12: 187_131 } },
];

const GMC_CAT1_DIESEL: GmcTranche[] = [
  { cvMin: 2, cvMax: 4,   primes: { 2: 23_212,  4: 41_248,  6: 59_286,  12: 95_361  } },
  { cvMin: 5, cvMax: 7,   primes: { 2: 24_945,  4: 44_717,  6: 64_488,  12: 104_031 } },
  { cvMin: 8, cvMax: 10,  primes: { 2: 30_230,  4: 55_287,  6: 80_344,  12: 130_230 } },
  { cvMin: 11, cvMax: 16, primes: { 2: 36_408,  4: 67_640,  6: 98_874,  12: 161_341 } },
  { cvMin: 17, cvMax: 999,primes: { 2: 41_565,  4: 77_957,  6: 114_348, 12: 187_131 } },
];

// Cat 2 — TPC utilitaire
const GMC_CAT2_ESSENCE: GmcTranche[] = [
  { cvMin: 3, cvMax: 6,   primes: { 2: 25_021,  4: 44_866,  6: 64_713,  12: 104_405 } },
  { cvMin: 7, cvMax: 10,  primes: { 2: 27_400,  4: 49_625,  6: 71_852,  12: 116_304 } },
  { cvMin: 11, cvMax: 14, primes: { 2: 37_250,  4: 69_327,  6: 101_403, 12: 165_555 } },
  { cvMin: 15, cvMax: 23, primes: { 2: 44_309,  4: 83_443,  6: 122_579, 12: 200_849 } },
  { cvMin: 24, cvMax: 999,primes: { 2: 50_055,  4: 94_936,  6: 139_817, 12: 229_580 } },
];

const GMC_CAT2_DIESEL: GmcTranche[] = [
  { cvMin: 2, cvMax: 4,   primes: { 2: 25_021,  4: 44_866,  6: 64_713,  12: 104_405 } },
  { cvMin: 5, cvMax: 7,   primes: { 2: 27_400,  4: 49_625,  6: 71_852,  12: 116_304 } },
  { cvMin: 8, cvMax: 10,  primes: { 2: 37_250,  4: 69_327,  6: 101_403, 12: 165_555 } },
  { cvMin: 11, cvMax: 16, primes: { 2: 44_309,  4: 83_443,  6: 122_579, 12: 200_849 } },
  { cvMin: 17, cvMax: 999,primes: { 2: 50_055,  4: 94_936,  6: 139_817, 12: 229_580 } },
];

const GRILLE: Record<GmcCategorie, Record<GmcEnergie, GmcTranche[]>> = {
  cat1: { essence: GMC_CAT1_ESSENCE, diesel: GMC_CAT1_DIESEL },
  cat2: { essence: GMC_CAT2_ESSENCE, diesel: GMC_CAT2_DIESEL },
};

function snapDuree(mois: number): GmcDuree {
  if (mois >= 12) return 12;
  if (mois >= 6) return 6;
  if (mois >= 4) return 4;
  return 2;
}

export function rcGmcDisponible(categorie: Categorie): boolean {
  return categorie === "cat1" || categorie === "cat2";
}

export function calculerRcGmc(input: {
  categorie: GmcCategorie;
  cv: number;
  energie: GmcEnergie;
  dureeMois: number;
}): number {
  const grille = GRILLE[input.categorie][input.energie];
  const t = grille.find((x) => input.cv >= x.cvMin && input.cv <= x.cvMax);
  const tranche = t ?? grille[grille.length - 1];
  return tranche.primes[snapDuree(input.dureeMois)];
}

// Taux garanties GMC (override de GARANTIES_PAR_CATEGORIE pour Cat 1/2)
export const GMC_TAUX = {
  brisDeGlaces: 0.005,
  incendie: 0.0025,
  volSimple: 0.01,
  volBraquage: 0.01,
  tierceCollision: 0.025,
  dommages: 0.035,
} as const;

export const GMC_DTA: { cvMin: number; cvMax: number; montant: number }[] = [
  { cvMin: 2, cvMax: 7, montant: 30_000 },
  { cvMin: 8, cvMax: 13, montant: 50_000 },
  { cvMin: 14, cvMax: 20, montant: 75_000 },
  { cvMin: 21, cvMax: 999, montant: 200_000 },
];

export function calculerDtaGmc(cv: number): number {
  const t = GMC_DTA.find((x) => cv >= x.cvMin && cv <= x.cvMax);
  return t?.montant ?? GMC_DTA[GMC_DTA.length - 1].montant;
}
