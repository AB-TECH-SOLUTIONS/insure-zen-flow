const UNITES = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function centaines(n: number): string {
  if (n === 0) return "";
  let s = "";
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (c > 0) {
    if (c === 1) s += "cent";
    else s += UNITES[c] + " cent";
    if (r === 0 && c > 1) s += "s";
    if (r > 0) s += " ";
  }
  if (r > 0) {
    if (r < 20) s += UNITES[r];
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      if (d === 7 || d === 9) {
        s += DIZAINES[d] + (u === 1 && d !== 9 ? "-et-" : "-") + UNITES[10 + u];
      } else {
        s += DIZAINES[d];
        if (u === 1 && d !== 8) s += "-et-un";
        else if (u > 0) s += "-" + UNITES[u];
        else if (d === 8) s += "s";
      }
    }
  }
  return s.trim();
}

export function montantEnLettres(n: number): string {
  n = Math.round(n);
  if (n === 0) return "zéro francs CFA";
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  const parts: string[] = [];
  if (millions > 0) parts.push((millions === 1 ? "un million" : centaines(millions) + " millions"));
  if (milliers > 0) parts.push((milliers === 1 ? "mille" : centaines(milliers) + " mille"));
  if (reste > 0) parts.push(centaines(reste));
  const txt = parts.join(" ").trim() || "zéro";
  return txt.charAt(0).toUpperCase() + txt.slice(1) + " francs CFA";
}