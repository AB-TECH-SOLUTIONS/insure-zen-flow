import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFCFA } from "@/lib/format";

export interface CPData {
  companyName: string;
  companyColor: string;
  policeNumber: string;
  quittanceNumber?: string;
  emissionDate: string;
  souscripteur: { nom: string; adresse?: string; tel?: string; profession?: string };
  assure?: string;
  effet: string;
  expiration: string;
  duree: string;
  vehicule: {
    immatriculation: string; marque: string; modele: string;
    cv: number; energie: string; places: number;
    valeurNeuve: number; valeurVenale: number;
    vin?: string; dateMiseCirculation?: string;
    zone: string; categorie: string;
  };
  garanties: { nom: string; capital?: string; franchise?: string; primeNette: number }[];
  decompte: {
    primeNette: number; reductionRC?: number; accessoires: number;
    fichierCentral: number; tva: number; dta: number;
    carteRose?: number; primeTTC: number;
  };
  intermediaire?: string; reseau?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function generateCP(d: CPData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const [r, g, b] = hexToRgb(d.companyColor || "#0EA5E9");

  // Header
  doc.setTextColor(r, g, b);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(d.companyName, 14, 18);
  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.text("CONDITIONS PARTICULIÈRES", W / 2, 30, { align: "center" });

  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.6);
  doc.line(14, 33, W - 14, 33);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`N° Police : ${d.policeNumber}`, 14, 40);
  if (d.quittanceNumber) doc.text(`N° Quittance : ${d.quittanceNumber}`, 80, 40);
  doc.text(`Émis le : ${d.emissionDate}`, W - 14, 40, { align: "right" });

  // Souscripteur + effet
  let y = 48;
  doc.setFont("helvetica", "bold"); doc.text("Souscripteur", 14, y);
  doc.text("Période", W / 2 + 4, y);
  doc.setFont("helvetica", "normal"); y += 5;
  doc.text(d.souscripteur.nom, 14, y); doc.text(`Effet : ${d.effet}`, W / 2 + 4, y); y += 5;
  if (d.souscripteur.adresse) { doc.text(d.souscripteur.adresse, 14, y); }
  doc.text(`Expiration : ${d.expiration}`, W / 2 + 4, y); y += 5;
  if (d.souscripteur.tel) { doc.text(`Tél : ${d.souscripteur.tel}`, 14, y); }
  doc.text(`Durée : ${d.duree}`, W / 2 + 4, y); y += 5;
  if (d.assure && d.assure !== d.souscripteur.nom) { doc.text(`Assuré : ${d.assure}`, 14, y); y += 5; }

  // Véhicule
  y += 4;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.setFillColor(r, g, b); doc.setTextColor(255);
  doc.rect(14, y - 4, W - 28, 6, "F");
  doc.text("VÉHICULE ASSURÉ", 16, y);
  doc.setTextColor(0); doc.setFontSize(9); doc.setFont("helvetica", "normal");
  y += 6;
  const v = d.vehicule;
  const veh: [string, string][] = [
    ["Immatriculation", v.immatriculation], ["Marque/Modèle", `${v.marque} ${v.modele}`],
    ["Puissance", `${v.cv} CV`], ["Énergie", v.energie],
    ["Places", String(v.places)], ["Catégorie", v.categorie],
    ["Valeur neuve", formatFCFA(v.valeurNeuve)], ["Valeur vénale", formatFCFA(v.valeurVenale)],
    ["Zone", v.zone], ["1ère mise en circ.", v.dateMiseCirculation ?? "—"],
  ];
  if (v.vin) veh.push(["VIN", v.vin]);
  veh.forEach((row, i) => {
    const col = i % 2; const line = Math.floor(i / 2);
    const x = 14 + col * (W - 28) / 2;
    doc.setFont("helvetica", "bold"); doc.text(row[0] + " :", x, y + line * 5);
    doc.setFont("helvetica", "normal"); doc.text(row[1], x + 38, y + line * 5);
  });
  y += Math.ceil(veh.length / 2) * 5 + 6;

  // Garanties
  autoTable(doc, {
    startY: y,
    head: [["Garantie", "Capital", "Franchise", "Prime nette"]],
    body: d.garanties.map((g) => [g.nom, g.capital ?? "—", g.franchise ?? "—", formatFCFA(g.primeNette)]),
    headStyles: { fillColor: [r, g, b], textColor: 255 },
    styles: { fontSize: 8 },
    columnStyles: { 3: { halign: "right" } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y2 = (doc as any).lastAutoTable.finalY + 6;

  // Décompte
  const dec = d.decompte;
  const rows: [string, string][] = [["Prime nette", formatFCFA(dec.primeNette)]];
  if (dec.reductionRC) rows.push(["Réduction RC", `- ${formatFCFA(dec.reductionRC)}`]);
  rows.push(["Accessoires", formatFCFA(dec.accessoires)]);
  rows.push(["Fichier central", formatFCFA(dec.fichierCentral)]);
  rows.push(["Droit de timbre (DTA)", formatFCFA(dec.dta)]);
  if (dec.carteRose) rows.push(["Carte Rose CEMAC", formatFCFA(dec.carteRose)]);
  rows.push(["TVA (19,25 %)", formatFCFA(dec.tva)]);
  autoTable(doc, {
    startY: y2, body: rows, theme: "plain", styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y2 = (doc as any).lastAutoTable.finalY + 4;
  doc.setFillColor(r, g, b); doc.rect(14, y2, W - 28, 12, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("PRIME TTC", 18, y2 + 8);
  doc.text(formatFCFA(dec.primeTTC), W - 18, y2 + 8, { align: "right" });

  // Footer
  doc.setTextColor(120); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("Document établi conformément aux dispositions du Code CIMA.", 14, 280);
  doc.text("Ce document n'est pas valable sans la signature et le cachet de l'assureur.", 14, 285);
  if (d.intermediaire) doc.text(`Intermédiaire : ${d.intermediaire}`, W - 14, 285, { align: "right" });

  return doc;
}