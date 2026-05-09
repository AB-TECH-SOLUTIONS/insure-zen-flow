import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";

type Vehicle = { registration: string | null; brand: string | null; model: string | null };

export default function RapportExpertise() {
  const { claimId } = useParams<{ claimId: string }>();
  const { user } = useAuth();
  const [claim, setClaim] = useState<{ claim_number: string; client_id: string; contract_id: string } | null>(null);
  const [client, setClient] = useState<{ full_name: string } | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [f, setF] = useState({
    date_expertise: new Date().toISOString().slice(0, 10),
    lieu: "",
    etat_vehicule: "reparable",
    valeur_avant: 0,
    valeur_apres: 0,
    cout_reparation: 0,
    responsabilite_assure: 50,
    nature_dommages: "",
    recommandation: "",
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!claimId || !user) return;
    (async () => {
      const { data: c } = await supabase.from("claims")
        .select("claim_number, client_id, contract_id").eq("id", claimId).maybeSingle();
      if (c) {
        setClaim(c);
        const { data: cli } = await supabase.from("clients").select("full_name").eq("id", c.client_id).maybeSingle();
        setClient(cli ?? null);
        const { data: veh } = await supabase.from("vehicles").select("registration, brand, model")
          .eq("client_id", c.client_id).limit(1).maybeSingle();
        setVehicle(veh ?? null);
      }
      const { data: rep } = await supabase.from("expertise_reports").select("*")
        .eq("claim_id", claimId).eq("expert_user_id", user.id).maybeSingle();
      if (rep) {
        setReportId(rep.id);
        setF({
          date_expertise: rep.date_expertise ?? f.date_expertise,
          lieu: rep.lieu ?? "",
          etat_vehicule: rep.etat_vehicule ?? "reparable",
          valeur_avant: Number(rep.valeur_avant ?? 0),
          valeur_apres: Number(rep.valeur_apres ?? 0),
          cout_reparation: Number(rep.cout_reparation ?? 0),
          responsabilite_assure: rep.responsabilite_assure ?? 50,
          nature_dommages: rep.nature_dommages ?? "",
          recommandation: rep.recommandation ?? "",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, user]);

  const save = async (statut: "brouillon" | "soumis") => {
    if (!claimId || !user) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      if (files) {
        for (const file of Array.from(files)) {
          const path = `${user.id}/${claimId}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from("expertise-documents").upload(path, file);
          if (!error) urls.push(path);
        }
      }
      const payload = {
        claim_id: claimId,
        expert_user_id: user.id,
        ...f,
        statut,
        ...(urls.length ? { file_urls: urls } : {}),
      };
      if (reportId) {
        const { error } = await supabase.from("expertise_reports").update(payload).eq("id", reportId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("expertise_reports").insert(payload).select("id").single();
        if (error) throw error;
        setReportId(data.id);
      }
      if (statut === "soumis" && claim) {
        await supabase.from("claims").update({ status: "expertise" }).eq("id", claimId);
        // notif agent : on récupère created_by du contrat
        const { data: ct } = await supabase.from("contracts").select("created_by")
          .eq("id", claim.contract_id).maybeSingle();
        if (ct?.created_by) {
          await supabase.from("notifications").insert({
            user_id: ct.created_by,
            title: "Rapport d'expertise soumis",
            body: `Expert a soumis son rapport pour le sinistre ${claim.claim_number}`,
            link: `/agent/sinistres`,
            category: "info",
          });
        }
      }
      toast.success(statut === "soumis" ? "Rapport soumis" : "Brouillon enregistré");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 27, 61);
    doc.rect(0, 0, 210, 25, "F");
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.text("RAPPORT D'EXPERTISE", 105, 16, { align: "center" });
    doc.setTextColor(0);
    doc.setFontSize(10);
    let y = 35;
    doc.text(`N° mission : EXP-${claimId?.slice(0, 8).toUpperCase()}`, 14, y); y += 6;
    doc.text(`Date : ${f.date_expertise}`, 14, y); y += 6;
    doc.text(`Lieu : ${f.lieu}`, 14, y); y += 10;
    doc.setFont("helvetica", "bold"); doc.text("Véhicule", 14, y); doc.setFont("helvetica", "normal"); y += 6;
    doc.text(`Immatriculation : ${vehicle?.registration ?? "—"}`, 14, y); y += 5;
    doc.text(`Marque/Modèle : ${vehicle?.brand ?? "—"} ${vehicle?.model ?? ""}`, 14, y); y += 5;
    doc.text(`Assuré : ${client?.full_name ?? "—"}`, 14, y); y += 10;
    doc.setFont("helvetica", "bold"); doc.text("Évaluation", 14, y); doc.setFont("helvetica", "normal"); y += 6;
    doc.text(`Valeur avant sinistre : ${formatFCFA(f.valeur_avant)}`, 14, y); y += 5;
    doc.text(`Valeur après sinistre : ${formatFCFA(f.valeur_apres)}`, 14, y); y += 5;
    doc.text(`Coût réparation : ${formatFCFA(f.cout_reparation)}`, 14, y); y += 5;
    doc.text(`État véhicule : ${f.etat_vehicule}`, 14, y); y += 10;
    doc.setFont("helvetica", "bold"); doc.text("Responsabilités", 14, y); doc.setFont("helvetica", "normal"); y += 6;
    doc.text(`Assuré : ${f.responsabilite_assure}% — Tiers : ${100 - f.responsabilite_assure}%`, 14, y); y += 10;
    doc.setFont("helvetica", "bold"); doc.text("Nature des dommages", 14, y); doc.setFont("helvetica", "normal"); y += 6;
    doc.text(doc.splitTextToSize(f.nature_dommages || "—", 180), 14, y); y += 20;
    doc.setFont("helvetica", "bold"); doc.text("Recommandation", 14, y); doc.setFont("helvetica", "normal"); y += 6;
    doc.text(doc.splitTextToSize(f.recommandation || "—", 180), 14, y);
    doc.setFontSize(8);
    doc.text("Rapport établi conformément aux normes CIMA", 105, 285, { align: "center" });
    doc.save(`rapport-expertise-${claimId?.slice(0, 8)}.pdf`);
  };

  if (!claim) return <div className="p-6">Chargement…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={`Rapport d'expertise — ${claim.claim_number}`}
        description={`${client?.full_name ?? ""} — ${vehicle?.registration ?? ""}`}
        actions={<Button variant="outline" onClick={downloadPDF}>Télécharger PDF</Button>} />
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date d'expertise</Label>
            <Input type="date" value={f.date_expertise}
              onChange={(e) => setF({ ...f, date_expertise: e.target.value })} />
          </div>
          <div>
            <Label>Lieu d'expertise</Label>
            <Input value={f.lieu} onChange={(e) => setF({ ...f, lieu: e.target.value })} />
          </div>
          <div>
            <Label>État du véhicule</Label>
            <Select value={f.etat_vehicule} onValueChange={(v) => setF({ ...f, etat_vehicule: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reparable">Réparable</SelectItem>
                <SelectItem value="perte_totale">Perte totale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Nature des dommages</Label>
          <Textarea value={f.nature_dommages}
            onChange={(e) => setF({ ...f, nature_dommages: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Valeur avant (FCFA)</Label>
            <Input type="number" value={f.valeur_avant}
              onChange={(e) => setF({ ...f, valeur_avant: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Valeur après (FCFA)</Label>
            <Input type="number" value={f.valeur_apres}
              onChange={(e) => setF({ ...f, valeur_apres: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Coût réparation (FCFA)</Label>
            <Input type="number" value={f.cout_reparation} disabled={f.etat_vehicule === "perte_totale"}
              onChange={(e) => setF({ ...f, cout_reparation: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label>Responsabilité assuré : {f.responsabilite_assure}% — Tiers : {100 - f.responsabilite_assure}%</Label>
          <Slider value={[f.responsabilite_assure]} min={0} max={100} step={5}
            onValueChange={([v]) => setF({ ...f, responsabilite_assure: v })} />
        </div>
        <div>
          <Label>Recommandation</Label>
          <Textarea value={f.recommandation}
            onChange={(e) => setF({ ...f, recommandation: e.target.value })} />
        </div>
        <div>
          <Label>Documents (photos, rapport PDF)</Label>
          <Input type="file" multiple accept="image/*,application/pdf"
            onChange={(e) => setFiles(e.target.files)} />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => save("brouillon")} disabled={busy}>
            Enregistrer brouillon
          </Button>
          <Button onClick={() => save("soumis")} disabled={busy}>
            Soumettre le rapport
          </Button>
        </div>
      </Card>
    </div>
  );
}