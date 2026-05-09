import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA } from "@/lib/format";
import { LineChart, FileText } from "lucide-react";

type GQ = {
  id: string; claim_id: string; description: string | null;
  montant_pieces: number; montant_mo: number; montant_total: number; created_at: string;
};

const TVA = 0.1925;

export default function Factures() {
  const { user } = useAuth();
  const [list, setList] = useState<GQ[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("garage_quotes").select("*")
        .eq("garage_user_id", user.id).eq("statut", "accepte")
        .order("created_at", { ascending: false });
      setList((data ?? []) as unknown as GQ[]);
      const { data: p } = await supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle();
      setProfile(p ?? null);
    })();
  }, [user]);

  const totalCA = list.reduce((s, q) => s + Number(q.montant_total), 0);

  const downloadPDF = (q: GQ) => {
    const doc = new jsPDF();
    const ht = Number(q.montant_total);
    const tva = ht * TVA;
    const ttc = ht + tva;
    doc.setFontSize(18);
    doc.text("FACTURE DE RÉPARATION", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`N° FACT-${q.id.slice(0, 8).toUpperCase()}`, 14, 32);
    doc.text(`Date : ${new Date(q.created_at).toLocaleDateString("fr-FR")}`, 14, 38);
    doc.text(`Garage : ${profile?.full_name ?? "—"}`, 14, 48);
    doc.text(`Téléphone : ${profile?.phone ?? "—"}`, 14, 54);
    let y = 70;
    doc.text("Désignation", 14, y); doc.text("Montant", 160, y, { align: "right" });
    y += 4; doc.line(14, y, 196, y); y += 8;
    doc.text("Pièces détachées", 14, y); doc.text(formatFCFA(Number(q.montant_pieces)), 196, y, { align: "right" }); y += 7;
    doc.text("Main d'œuvre", 14, y); doc.text(formatFCFA(Number(q.montant_mo)), 196, y, { align: "right" }); y += 7;
    doc.line(14, y, 196, y); y += 7;
    doc.text("Sous-total HT", 14, y); doc.text(formatFCFA(ht), 196, y, { align: "right" }); y += 7;
    doc.text("TVA 19,25%", 14, y); doc.text(formatFCFA(tva), 196, y, { align: "right" }); y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Total TTC", 14, y); doc.text(formatFCFA(ttc), 196, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Document établi conformément aux prestations effectuées.", 105, 280, { align: "center" });
    doc.save(`facture-${q.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Mes factures" description="Devis acceptés convertis en factures." />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Chiffre d'affaires accepté" value={formatFCFA(totalCA)} icon={LineChart} accent="success" />
        <StatCard label="Factures" value={list.length} icon={FileText} accent="primary" />
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° devis</TableHead>
              <TableHead>Sinistre</TableHead>
              <TableHead>Pièces</TableHead>
              <TableHead>MO</TableHead>
              <TableHead>HT</TableHead>
              <TableHead>TVA</TableHead>
              <TableHead>TTC</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((q) => {
              const ht = Number(q.montant_total);
              const tva = ht * TVA;
              return (
                <TableRow key={q.id}>
                  <TableCell className="font-mono text-xs">{q.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">{q.claim_id.slice(0, 8)}</TableCell>
                  <TableCell>{formatFCFA(Number(q.montant_pieces))}</TableCell>
                  <TableCell>{formatFCFA(Number(q.montant_mo))}</TableCell>
                  <TableCell>{formatFCFA(ht)}</TableCell>
                  <TableCell>{formatFCFA(tva)}</TableCell>
                  <TableCell className="font-semibold">{formatFCFA(ht + tva)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => downloadPDF(q)}>PDF</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {list.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Aucune facture pour le moment.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}