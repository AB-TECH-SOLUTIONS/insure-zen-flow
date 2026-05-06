import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatFCFA } from "@/lib/format";

export interface RecuData {
  recuNumber: string;
  date: string;
  clientNom: string;
  clientTel?: string;
  policeNumber?: string;
  montant: number;
  montantLettres: string;
  methode: string;
  reference?: string;
  companyName: string;
  companyColor: string;
  agentNom?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function generateRecu(d: RecuData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const [r, g, b] = hexToRgb(d.companyColor || "#0EA5E9");

  doc.setFillColor(r, g, b); doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(d.companyName, 14, 16);
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("REÇU DE RÈGLEMENT DE PRIME", 14, 24);
  doc.text(`N° ${d.recuNumber}`, W - 14, 24, { align: "right" });

  doc.setTextColor(0);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  let y = 50;
  doc.text(`Date : ${d.date}`, 14, y); y += 10;

  const corps = `Reçu de M./Mme ${d.clientNom} la somme de ${d.montantLettres} (${formatFCFA(d.montant)}) en règlement de la prime d'assurance${d.policeNumber ? ` N° police ${d.policeNumber}` : ""}.`;
  const lines = doc.splitTextToSize(corps, W - 28);
  doc.text(lines, 14, y);
  y += lines.length * 6 + 6;

  autoTable(doc, {
    startY: y,
    head: [["Montant", "Mode de paiement", "Date", "Référence"]],
    body: [[formatFCFA(d.montant), d.methode, d.date, d.reference ?? "—"]],
    headStyles: { fillColor: [r, g, b], textColor: 255 },
    styles: { fontSize: 9 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y2 = (doc as any).lastAutoTable.finalY + 30;
  doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(120);
  doc.text("Merci pour votre confiance.", 14, y2);
  doc.setTextColor(0); doc.setFont("helvetica", "normal");
  doc.text("Signature & cachet", W - 60, y2 + 20);
  doc.setDrawColor(180); doc.line(W - 60, y2 + 30, W - 14, y2 + 30);
  if (d.agentNom) doc.text(d.agentNom, W - 60, y2 + 35);

  return doc;
}