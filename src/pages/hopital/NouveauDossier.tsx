import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";

const TYPES = [
  "Consultation", "Hospitalisation", "Chirurgie", "Analyses biologiques",
  "Imagerie médicale", "Médicaments", "Soins infirmiers", "Urgences", "Autre",
];

type Contract = {
  id: string; contract_number: string; status: string; type: string;
  start_date: string; end_date: string; client_id: string; company_id: string;
  clients: { full_name: string } | null;
  companies: { name: string } | null;
};

export default function NouveauDossier() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [policyNum, setPolicyNum] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [searching, setSearching] = useState(false);
  const [f, setF] = useState({ type_soin: "Consultation", description: "", montant: 0, taux: 80 });
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setSearching(true);
    const { data } = await supabase.from("contracts")
      .select("*, clients(full_name), companies(name)")
      .eq("contract_number", policyNum).maybeSingle();
    setContract((data as unknown as Contract) ?? null);
    setSearching(false);
    if (!data) toast.error("Aucun contrat trouvé");
  };

  const submit = async () => {
    if (!user || !contract) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      if (files) {
        for (const file of Array.from(files)) {
          const path = `${user.id}/${contract.id}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from("hopital-documents").upload(path, file);
          if (!error) urls.push(path);
        }
      }
      const montant_assurance = (f.montant * f.taux) / 100;
      const { error } = await supabase.from("health_claims").insert({
        contract_id: contract.id,
        client_id: contract.client_id,
        hopital_user_id: user.id,
        type_soin: f.type_soin,
        description: f.description,
        montant_soins: f.montant,
        taux_prise_charge: f.taux,
        montant_assurance,
        file_urls: urls,
      });
      if (error) throw error;
      const { data: ct } = await supabase.from("contracts").select("created_by").eq("id", contract.id).maybeSingle();
      if (ct?.created_by) {
        await supabase.from("notifications").insert({
          user_id: ct.created_by,
          title: "Nouveau dossier tiers payant",
          body: `Un dossier ${f.type_soin} a été soumis`,
          link: "/agent/sinistres",
          category: "info",
        });
      }
      toast.success("Dossier soumis");
      nav("/hopital/dossiers");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const part = (f.montant * f.taux) / 100;
  const isActive = contract?.status === "actif" && new Date(contract.end_date) > new Date();

  return (
    <div className="space-y-6">
      <PageHeader title="Nouveau dossier tiers payant"
        description={`Étape ${step} / 2 — ${step === 1 ? "Recherche assuré" : "Saisie des soins"}`} />
      {step === 1 && (
        <Card className="p-5 space-y-4 max-w-xl">
          <Label>N° de police</Label>
          <div className="flex gap-2">
            <Input value={policyNum} onChange={(e) => setPolicyNum(e.target.value)} />
            <Button onClick={search} disabled={searching || !policyNum}>Rechercher</Button>
          </div>
          {contract && (
            <Card className="p-4 bg-muted/30 space-y-2">
              <p><strong>Assuré :</strong> {contract.clients?.full_name}</p>
              <p><strong>Compagnie :</strong> {contract.companies?.name}</p>
              <p><strong>Type :</strong> {contract.type}</p>
              <p><strong>Validité :</strong> {contract.start_date} → {contract.end_date}</p>
              {isActive
                ? <Badge className="bg-green-500/10 text-green-700">Actif</Badge>
                : <Badge variant="destructive">Expiré / Suspendu</Badge>}
              {!isActive && (
                <p className="text-sm text-amber-600">⚠️ Couverture non active</p>
              )}
              <Button onClick={() => setStep(2)} className="mt-2">Utiliser ce contrat</Button>
            </Card>
          )}
        </Card>
      )}
      {step === 2 && contract && (
        <Card className="p-5 space-y-4 max-w-2xl">
          <div>
            <Label>Type de soin</Label>
            <Select value={f.type_soin} onValueChange={(v) => setF({ ...f, type_soin: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description / diagnostic</Label>
            <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Montant total (FCFA)</Label>
              <Input type="number" value={f.montant}
                onChange={(e) => setF({ ...f, montant: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Taux prise en charge (%)</Label>
              <Input type="number" min={0} max={100} value={f.taux}
                onChange={(e) => setF({ ...f, taux: Number(e.target.value) })} />
            </div>
          </div>
          <p className="text-sm">Part assurance : <strong>{formatFCFA(part)}</strong></p>
          <div>
            <Label>Documents</Label>
            <Input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
            <Button onClick={submit} disabled={busy}>{busy ? "..." : "Soumettre le dossier"}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}