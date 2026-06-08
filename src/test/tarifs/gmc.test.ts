import { describe, it, expect } from "vitest";
import { calculerRcGmc, calculerDtaGmc, rcGmcDisponible, GMC_TAUX } from "@/lib/tarifs/gmc";

describe("GMC RC", () => {
  it("cat1 essence 5 CV / 12 mois", () => {
    expect(calculerRcGmc({ categorie: "cat1", cv: 5, energie: "essence", dureeMois: 12 })).toBe(95_361);
  });
  it("cat1 diesel 8 CV / 6 mois (tranche 8-10)", () => {
    expect(calculerRcGmc({ categorie: "cat1", cv: 8, energie: "diesel", dureeMois: 6 })).toBe(80_344);
  });
  it("cat2 essence 12 CV / 4 mois", () => {
    expect(calculerRcGmc({ categorie: "cat2", cv: 12, energie: "essence", dureeMois: 4 })).toBe(69_327);
  });
  it("plafonne durée > 12 mois à 12", () => {
    const a = calculerRcGmc({ categorie: "cat1", cv: 5, energie: "essence", dureeMois: 24 });
    const b = calculerRcGmc({ categorie: "cat1", cv: 5, energie: "essence", dureeMois: 12 });
    expect(a).toBe(b);
  });
});

describe("GMC DTA", () => {
  it("5 CV = 30 000", () => expect(calculerDtaGmc(5)).toBe(30_000));
  it("10 CV = 50 000", () => expect(calculerDtaGmc(10)).toBe(50_000));
  it("18 CV = 75 000", () => expect(calculerDtaGmc(18)).toBe(75_000));
  it(">20 CV = 200 000", () => expect(calculerDtaGmc(25)).toBe(200_000));
});

describe("GMC disponibilité & taux garanties", () => {
  it("disponible uniquement cat1/cat2", () => {
    expect(rcGmcDisponible("cat1")).toBe(true);
    expect(rcGmcDisponible("cat2")).toBe(true);
    expect(rcGmcDisponible("cat3")).toBe(false);
  });
  it("expose les taux clés", () => {
    expect(GMC_TAUX.dommages).toBeCloseTo(0.035);
    expect(GMC_TAUX.volSimple).toBeCloseTo(0.01);
    expect(GMC_TAUX.brisDeGlaces).toBeCloseTo(0.005);
  });
});