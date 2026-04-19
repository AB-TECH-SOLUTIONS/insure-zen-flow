import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFCFA } from "@/lib/format";

interface DecompteData {
  reference: string;
  type: string;
  companyName: string;
  clientName: string;
  createdAt: string;
  lignes: { label: string; montant: number }[];
  primeNette: number;
  reductionRC?: number;
  primeNetteApresReduction?: number;
  accessoires: number;
  fichierCentral?: number;
  dta?: number;
  carteRose?: number;
  tva: number;
  primeTTC: number;
}

export function generateDecomptePdf(d: DecompteData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // En-tête
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(d.companyName, 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Décompte de cotation ${d.type.toUpperCase()}`, 14, 21);

  doc.setTextColor(0);

  // Métadonnées
  doc.setFontSize(10);
  doc.text(`Référence : ${d.reference}`, 14, 38);
  doc.text(`Date : ${new Date(d.createdAt).toLocaleDateString("fr-FR")}`, 14, 44);
  doc.text(`Client : ${d.clientName}`, 14, 50);

  // Tableau des garanties
  autoTable(doc, {
    startY: 58,
    head: [["Garantie", "Montant (FCFA)"]],
    body: d.lignes
      .filter((l) => l.montant > 0)
      .map((l) => [l.label, formatFCFA(l.montant).replace(" FCFA", "")]),
    headStyles: { fillColor: [14, 165, 233] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  const rows: [string, string][] = [
    ["Prime nette", formatFCFA(d.primeNette)],
  ];
  if (d.reductionRC) rows.push(["Réduction RC", `- ${formatFCFA(d.reductionRC)}`]);
  if (d.primeNetteApresReduction !== undefined && d.reductionRC)
    rows.push(["Prime nette après réduction", formatFCFA(d.primeNetteApresReduction)]);
  rows.push(["Accessoires", formatFCFA(d.accessoires)]);
  if (d.fichierCentral) rows.push(["Fichier central", formatFCFA(d.fichierCentral)]);
  if (d.dta) rows.push(["Droit de timbre", formatFCFA(d.dta)]);
  if (d.carteRose) rows.push(["Carte rose CEMAC", formatFCFA(d.carteRose)]);
  rows.push(["TVA (19,25 %)", formatFCFA(d.tva)]);

  autoTable(doc, {
    startY: finalY,
    body: rows,
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    theme: "plain",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y2 = (doc as any).lastAutoTable.finalY + 6;
  doc.setFillColor(14, 165, 233);
  doc.rect(14, y2, W - 28, 12, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PRIME TTC", 18, y2 + 8);
  doc.text(formatFCFA(d.primeTTC), W - 18, y2 + 8, { align: "right" });

  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Document non contractuel — valable 30 jours. Sous réserve d'acceptation par la compagnie.",
    14,
    285
  );

  return doc;
}
