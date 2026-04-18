// Helpers
export const formatFCFA = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " FCFA";

export const parseFCFA = (s: string): number => {
  const cleaned = s.replace(/[^\d-]/g, "");
  return parseInt(cleaned || "0", 10);
};
