import jsPDF from "jspdf";

export interface CarteRoseData {
  policeNumber: string;
  souscripteur: string;
  assure: string;
  immatriculation: string;
  marque: string;
  categorie: string;
  usage: string;
  effet: string;
  expiration: string;
  companyName: string;
  companyColor: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function generateCarteRose(d: CarteRoseData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const [r, g, b] = hexToRgb(d.companyColor || "#E91E63");
  const certNum = `CR-${d.policeNumber}`;

  for (let i = 0; i < 3; i++) {
    const yTop = 10 + i * 92;

    // bord coloré
    doc.setDrawColor(r, g, b); doc.setLineWidth(0.8);
    doc.rect(10, yTop, W - 20, 86);

    // logo placeholder
    doc.setFillColor(r, g, b);
    doc.rect(14, yTop + 4, 22, 14, "F");
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("LOGO", 25, yTop + 12, { align: "center" });

    // titre
    doc.setTextColor(0); doc.setFontSize(10);
    doc.text("CARTE INTERNATIONALE D'ASSURANCE", W / 2, yTop + 8, { align: "center" });
    doc.setFontSize(11); doc.setTextColor(r, g, b);
    doc.text("CARTE ROSE — CEMAC", W / 2, yTop + 14, { align: "center" });
    doc.setTextColor(0);

    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const fields: [string, string][] = [
      ["N° Certificat", certNum], ["Assureur", d.companyName],
      ["N° Police", d.policeNumber], ["Souscripteur", d.souscripteur],
      ["Assuré", d.assure], ["Immatriculation", d.immatriculation],
      ["Marque", d.marque], ["Catégorie", d.categorie],
      ["Usage", d.usage], ["Validité", `${d.effet} → ${d.expiration}`],
    ];
    let yy = yTop + 24;
    fields.forEach((f, idx) => {
      const col = idx % 2; const ln = Math.floor(idx / 2);
      const x = 14 + col * (W - 28) / 2;
      doc.setFont("helvetica", "bold"); doc.text(f[0] + " :", x, yy + ln * 4.5);
      doc.setFont("helvetica", "normal"); doc.text(f[1], x + 30, yy + ln * 4.5);
    });

    doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(r, g, b);
    doc.text("VALIDE DANS LES PAYS DE LA CEMAC ET ÉTATS MEMBRES", W / 2, yTop + 78, { align: "center" });
    doc.setTextColor(0); doc.setFont("helvetica", "normal");
    doc.text("Signature & cachet", W - 50, yTop + 84);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(10, yTop + 90, W - 10, yTop + 90);
    doc.setLineDashPattern([], 0);
  }

  return doc;
}