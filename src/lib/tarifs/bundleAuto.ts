// Moteur Auto branché sur la base de données (tarifs par compagnie × pays × date d'effet).
// Aucune constante compagnie n'est codée en dur : tout provient de `tarif_*` filtré par company_id.
// Utilise `useAutoTarifBundle` pour charger, puis `coterDB(input, overrides, bundle)`.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AutoInput, AutoOverrides, AutoCotationResult, LigneDecompte } from "./moteurAuto";

// Constantes CIMA (rarement modifiées) — restent en code
export const TVA_CM = 0.1925;
export const TAUX_PROTECTION_CONDUCTEUR = 0.25;
export const REDUCTION_RC_MAX = 0.15;

export interface AutoTarifBundle {
  companyId: string;
  countryCode: string;
  effectiveDate: string; // YYYY-MM-DD
  baremeRc: Array<{ categorie: string; cv_min: number | null; cv_max: number | null; places_max: number | null; ptac_max_kg: number | null; cu_max_kg: number | null; prime_annuelle: number }>;
  taux: Array<{ categorie: string; code_garantie: string; base_calcul: "valeur_neuve" | "valeur_venale" | "prime_rc" | "forfait"; taux: number }>;
  dta: Array<{ usage: "transport_commun" | "autre"; cv_min: number; cv_max: number; montant: number }>;
  ipt: Array<{ code: string; capital_deces: number; capital_invalidite: number; frais_medicaux: number; prime_par_place: number }>;
  frais: Record<string, number>; // code -> montant (fichier_central, carte_rose_cemac, defense_recours, protection_conducteur_min…)
  accessoires: Array<{ prime_nette_min: number; prime_nette_max: number; montant: number }>;
}

async function fetchBundle(companyId: string, countryCode: string, effectiveDate: string): Promise<AutoTarifBundle> {
  const dateFilter = (col: string) => `and(${col}.lte.${effectiveDate},or(date_fin.is.null,date_fin.gte.${effectiveDate}))`;
  const base = { company_id: companyId, country_code: countryCode, actif: true };

  const [rc, taux, dta, ipt, frais, acc] = await Promise.all([
    supabase.from("tarif_bareme_rc").select("categorie,cv_min,cv_max,places_max,ptac_max_kg,cu_max_kg,prime_annuelle,date_effet,date_fin").match({ ...base, produit: "auto" as const }),
    supabase.from("tarif_taux_garantie").select("categorie,code_garantie,base_calcul,taux,date_effet,date_fin").match({ ...base, produit: "auto" as const }),
    supabase.from("tarif_dta_vignette").select("usage,cv_min,cv_max,montant,date_effet,date_fin").match(base),
    supabase.from("tarif_options_ipt").select("code,capital_deces,capital_invalidite,frais_medicaux,prime_par_place,date_effet,date_fin").match(base),
    supabase.from("tarif_frais_fixes").select("code,montant,date_effet,date_fin").match(base),
    supabase.from("tarif_accessoires").select("prime_nette_min,prime_nette_max,montant,date_effet,date_fin").match(base),
  ]);
  const err = rc.error || taux.error || dta.error || ipt.error || frais.error || acc.error;
  if (err) throw err;

  const active = <T = any>(rows: any): T[] =>
    ((rows ?? []) as any[]).filter((r) => r.date_effet <= effectiveDate && (!r.date_fin || r.date_fin >= effectiveDate)) as T[];

  const fraisMap: Record<string, number> = {};
  for (const f of active<{ code: string; montant: number }>(frais.data)) fraisMap[f.code] = Number(f.montant);

  void dateFilter; // linter — filtre côté client sur date_effet/date_fin

  return {
    companyId,
    countryCode,
    effectiveDate,
    baremeRc: active<any>(rc.data).map((r: any) => ({ ...r, prime_annuelle: Number(r.prime_annuelle) })),
    taux: active<any>(taux.data).map((r: any) => ({ ...r, taux: Number(r.taux) })),
    dta: active<any>(dta.data).map((r: any) => ({ ...r, montant: Number(r.montant) })),
    ipt: active<any>(ipt.data).map((r: any) => ({ ...r, prime_par_place: Number(r.prime_par_place) })),
    frais: fraisMap,
    accessoires: active<any>(acc.data).map((r: any) => ({ prime_nette_min: Number(r.prime_nette_min), prime_nette_max: Number(r.prime_nette_max), montant: Number(r.montant) })),
  };
}

export function useAutoTarifBundle(companyId: string | null, countryCode = "CM", effectiveDate?: string) {
  const date = effectiveDate ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["tarif-bundle-auto", companyId, countryCode, date],
    queryFn: () => fetchBundle(companyId!, countryCode, date),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

// ────────────────────────────────────────────────────────────
// Moteur de calcul (pur, à partir du bundle)
// ────────────────────────────────────────────────────────────

function coefDuree(mois: number): number {
  if (mois >= 12) return 1;
  if (mois === 6) return 0.53;
  if (mois === 3) return 0.28;
  if (mois === 1) return 0.1;
  return mois / 12;
}

function findRc(bundle: AutoTarifBundle, input: AutoInput): number {
  const rows = bundle.baremeRc.filter((r) => r.categorie === input.categorie);
  if (!rows.length) throw new Error(`Aucun barème RC pour la catégorie ${input.categorie} (compagnie/pays sélectionnés)`);
  // Priorité CV, puis PTAC, puis CU, puis places
  const byCv = rows.find((r) => r.cv_min != null && r.cv_max != null && input.cv >= r.cv_min && input.cv <= r.cv_max);
  if (byCv) return byCv.prime_annuelle;
  const byPtac = rows.find((r) => r.ptac_max_kg != null && input.chargeUtileKg <= r.ptac_max_kg);
  if (byPtac) return byPtac.prime_annuelle;
  const byCu = rows.find((r) => r.cu_max_kg != null && input.chargeUtileKg <= r.cu_max_kg);
  if (byCu) return byCu.prime_annuelle;
  const byPlaces = rows.find((r) => r.places_max != null && input.places <= r.places_max);
  if (byPlaces) return byPlaces.prime_annuelle;
  // Fallback tranche la plus large
  return rows[rows.length - 1].prime_annuelle;
}

function findTaux(bundle: AutoTarifBundle, categorie: string, code: string): number {
  const row = bundle.taux.find((t) => t.categorie === categorie && t.code_garantie === code);
  return row?.taux ?? 0;
}

function findDta(bundle: AutoTarifBundle, categorie: string, cv: number): number {
  const usage: "transport_commun" | "autre" = ["cat3", "cat4a", "cat4b", "cat4c"].includes(categorie) ? "transport_commun" : "autre";
  const row = bundle.dta.find((d) => d.usage === usage && cv >= d.cv_min && cv <= d.cv_max);
  if (!row) throw new Error(`Aucun tarif DTA (${usage}) pour ${cv} CV`);
  return row.montant;
}

function findAccessoires(bundle: AutoTarifBundle, primeNette: number): number {
  const row = bundle.accessoires.find((a) => primeNette >= a.prime_nette_min && primeNette < a.prime_nette_max);
  return row?.montant ?? bundle.accessoires[bundle.accessoires.length - 1]?.montant ?? 0;
}

function base(bundle: AutoTarifBundle, code: "valeur_neuve" | "valeur_venale" | "prime_rc" | "forfait", input: AutoInput, primeRc: number): number {
  if (code === "valeur_neuve") return input.valeurNeuve;
  if (code === "valeur_venale") return input.valeurVenale;
  if (code === "prime_rc") return primeRc;
  return 1;
}

export function coterDB(input: AutoInput, overrides: AutoOverrides, bundle: AutoTarifBundle): AutoCotationResult {
  const coef = coefDuree(input.dureeMois);
  const rcAnnuelle = findRc(bundle, input);

  const auto: Record<string, number> = {};
  auto.rc = Math.round(rcAnnuelle * coef);
  auto.dr = input.garanties.defenseRecours ? bundle.frais.defense_recours ?? 0 : 0;

  const garantieBase = (code: string) => {
    const row = bundle.taux.find((t) => t.categorie === input.categorie && t.code_garantie === code);
    if (!row) return 0;
    return Math.round(base(bundle, row.base_calcul, input, auto.rc) * row.taux * coef);
  };

  auto.dommages = input.garanties.dommages ? garantieBase("dommages") : 0;
  auto.brisDeGlaces = input.garanties.brisDeGlaces ? garantieBase("bris_de_glaces") : 0;
  auto.incendie = input.garanties.incendie ? garantieBase("incendie") : 0;
  auto.volSimple = input.garanties.volSimple ? garantieBase("vol_simple") : 0;
  auto.volBraquage = input.garanties.volBraquage ? garantieBase("vol_braquage") : 0;
  auto.tierceCollision = input.garanties.tierceCollision ? garantieBase("tierce_collision") : 0;

  if (input.garanties.ipt) {
    const option = bundle.ipt.find((o) => o.code === (input.garanties.iptOption ?? "I"));
    if (!option) throw new Error(`Option IPT ${input.garanties.iptOption ?? "I"} introuvable`);
    auto.ipt = option.prime_par_place * input.places;
  } else {
    auto.ipt = 0;
  }

  auto.protectionConducteur = input.garanties.protectionConducteur
    ? Math.max(Math.round(auto.rc * TAUX_PROTECTION_CONDUCTEUR), bundle.frais.protection_conducteur_min ?? 0)
    : 0;

  // Findt taux findTaux(bundle, input.categorie, "vol_simple") — ensures TS uses the helper
  void findTaux;

  const val = (key: string) => overrides.lines[key] ?? auto[key] ?? 0;
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

  const primeNette = lignes.reduce((s, l) => s + l.montant, 0);
  const pctRed = Math.min(Math.max(input.reductionRcPct, 0), REDUCTION_RC_MAX);
  const reductionRCAuto = Math.round(val("rc") * pctRed);
  const reductionRC = overrides.lines.reductionRC ?? reductionRCAuto;
  const primeNetteApresReduction = primeNette - reductionRC;

  const accessoiresAuto = findAccessoires(bundle, primeNetteApresReduction);
  const accessoires = overrides.lines.accessoires ?? accessoiresAuto;

  const fichierCentral = overrides.lines.fichierCentral ?? (bundle.frais.fichier_central ?? 0);
  const carteRose = input.garanties.carteRoseCEMAC
    ? (overrides.lines.carteRose ?? (bundle.frais.carte_rose_cemac ?? 0))
    : 0;

  const dtaAuto = findDta(bundle, input.categorie, input.cv);
  const dta = overrides.lines.dta ?? dtaAuto;

  const baseTva = primeNetteApresReduction + accessoires;
  const tvaAuto = Math.round(baseTva * TVA_CM);
  const tva = overrides.lines.tva ?? tvaAuto;

  const primeTTC = primeNetteApresReduction + accessoires + fichierCentral + tva + carteRose + dta;

  return { lignes, primeNette, reductionRC, primeNetteApresReduction, accessoires, fichierCentral, dta, carteRose, baseTva, tva, primeTTC };
}