import { describe, it, expect } from "vitest";
import { coterVoyage, getTrancheAge, snapDureeVoyage, defaultVoyageOverrides } from "@/lib/tarifs/voyage";

describe("getTrancheAge", () => {
  it("classe par tranche d'âge", () => {
    expect(getTrancheAge(5)).toBe("0_18");
    expect(getTrancheAge(35)).toBe("18_65");
    expect(getTrancheAge(70)).toBe("66_75");
    expect(getTrancheAge(78)).toBe("76_80");
    expect(getTrancheAge(85)).toBe("80_plus");
  });
});

describe("snapDureeVoyage", () => {
  it("arrondit à la tranche supérieure", () => {
    expect(snapDureeVoyage(5)).toBe(7);
    expect(snapDureeVoyage(20)).toBe(21);
    expect(snapDureeVoyage(400)).toBe(730);
  });
});

describe("coterVoyage", () => {
  it("Europe Schengen 7j / 1 adulte", () => {
    const r = coterVoyage(
      { produit: "europe_schengen", age: 30, jours: 7, nbVoyageurs: 1, sportsHiver: false },
      defaultVoyageOverrides()
    );
    expect(r.primeNette).toBe(12_953);
    expect(r.primeTTC).toBeGreaterThan(r.primeNette);
  });
  it("multiplie par nb voyageurs", () => {
    const r = coterVoyage(
      { produit: "europe_schengen", age: 30, jours: 7, nbVoyageurs: 2, sportsHiver: false },
      defaultVoyageOverrides()
    );
    expect(r.primeNette).toBe(12_953 * 2);
  });
  it("Sports d'hiver = +100% sur prime de base", () => {
    const r = coterVoyage(
      { produit: "europe_schengen", age: 30, jours: 7, nbVoyageurs: 1, sportsHiver: true },
      defaultVoyageOverrides()
    );
    expect(r.primeNette).toBe(12_953 * 2);
  });
  it("Voyageur Monde 30j / 1 adulte snap à 31j", () => {
    const r = coterVoyage(
      { produit: "voyageur", age: 40, jours: 30, nbVoyageurs: 1, sportsHiver: false },
      defaultVoyageOverrides()
    );
    expect(r.dureeRetenue).toBe(31);
    expect(r.primeNette).toBe(74_265);
  });
});