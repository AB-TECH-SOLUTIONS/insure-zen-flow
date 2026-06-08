import { describe, it, expect } from "vitest";
import {
  calculerRC,
  calculerDTA,
  calculerAccessoires,
  GARANTIES_PAR_CATEGORIE,
  TVA,
  RC_CAT1,
} from "@/lib/tarifs/auto";

describe("calculerRC — cat1 tourisme", () => {
  it("renvoie la prime tranche 2-6 CV", () => {
    expect(calculerRC({ categorie: "cat1", cv: 5 })).toBe(47_252);
  });
  it("renvoie la prime tranche 7-10 CV", () => {
    expect(calculerRC({ categorie: "cat1", cv: 9 })).toBe(70_877);
  });
  it("plafonne au-delà de 24 CV", () => {
    expect(calculerRC({ categorie: "cat1", cv: 60 })).toBe(RC_CAT1.at(-1)!.prime);
  });
});

describe("calculerRC — cat2 utilitaire", () => {
  it("utilise la charge utile", () => {
    expect(calculerRC({ categorie: "cat2", cv: 10, chargeUtileKg: 1000 })).toBe(90_000);
    expect(calculerRC({ categorie: "cat2", cv: 10, chargeUtileKg: 5000 })).toBe(180_000);
  });
});

describe("calculerDTA (vignette)", () => {
  it("cat1 5 CV = 20 000 FCFA (autres)", () => {
    expect(calculerDTA("cat1", 5)).toBe(20_000);
  });
  it("cat3 5 CV = 15 000 FCFA (transport commun)", () => {
    expect(calculerDTA("cat3", 5)).toBe(15_000);
  });
  it("plafonne >20 CV", () => {
    expect(calculerDTA("cat1", 25)).toBe(200_000);
  });
});

describe("garanties optionnelles", () => {
  it("expose les taux DTA/Vol/Incendie/Bris pour cat1", () => {
    const g = GARANTIES_PAR_CATEGORIE.cat1;
    expect(g.tierceCollision).toBeGreaterThan(0);
    expect(g.volSimple).toBeGreaterThan(0);
    expect(g.incendie).toBeGreaterThan(0);
    expect(g.brisDeGlaces).toBeGreaterThan(0);
  });
});

describe("accessoires & TVA", () => {
  it("paliers d'accessoires progressifs", () => {
    expect(calculerAccessoires(50_000)).toBe(5_000);
    expect(calculerAccessoires(200_000)).toBe(10_000);
    expect(calculerAccessoires(400_000)).toBe(15_000);
    expect(calculerAccessoires(900_000)).toBe(25_000);
    expect(calculerAccessoires(2_000_000)).toBe(35_000);
  });
  it("TVA Cameroun = 19,25 %", () => {
    expect(TVA).toBeCloseTo(0.1925, 4);
  });
});