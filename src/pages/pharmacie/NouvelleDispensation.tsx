import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DocumentScanner } from "@/components/scan/DocumentScanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";

type Med = { designation: string; quantite: number; prix: number };
type Contract = {
  id: string; contract_number: string; status: string; end_date: string;
  client_id: string;
  clients: { full_name: string } | null;
  companies: { name: string } | null;
};

export default function NouvelleDispensation() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [policyNum, setPolicyNum] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [meds, setMeds] = useState<Med[]>([{ designation: "", quantite: 1, prix: 0 }]);
  const [taux, setTaux] = useState(80);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    const { data } = await supabase.from("contracts")
      .select("*, clients(full_name), companies(name)")
      .eq("contract_number", policyNum).maybeSingle();
    setContract((data as unknown as Contract) ?? null);
    if (!data) toast.error("Contrat introuvable");
  };

  const total = meds.reduce((s, m) => s + m.quantite * m.prix, 0);
  const part = (total * taux) / 100;

  const updateMed = (i: number, field: keyof Med, val: string) => {
    const next = [...meds];
    next[i] = { ...next[i], [field]: field === "designation" ? val : Number(val) };
    setMeds(next);
  };

  const submit = async () => {
    if (!user || !contract) return;
    setBusy(true);
    try {
      let ordonnance_url: string | undefined;
      if (file) {
        const path = `${user.id}/${contract.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("pharmacie-documents").upload(path, file);
        if (!error) ordonnance_url = path;
      }
      const { error } = await supabase.from("pharmacie_claims").insert({
        contract_id: contract.id,
        client_id: contract.client_id,
        pharmacie_user_id: user.id,
        medicaments: meds,
        montant_total: total,
        taux_remboursement: taux,
        montant_assurance: part,
        ordonnance_url,
      });
      if (error) throw error;
      const { data: ct } = await supabase.from("contracts").select("created_by").eq("id", contract.id).maybeSingle();
      if (ct?.created_by) {
        await supabase.from("notifications").insert({
          user_id: ct.created_by,
          title: "Nouvelle dispensation pharmacie",
          body: `Total ${formatFCFA(total)} — Part assurance ${formatFCFA(part)}`,
          link: "/agent/sinistres",
          category: "info",
        });
      }
      toast.success("Dispensation enregistrée");
      nav("/pharmacie/historique");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isActive = contract?.status === "actif" && new Date(contract.end_date) > new Date();

  return (
    <div className="space-y-6">
      <PageHeader title="Nouvelle dispensation" description="Saisie tiers payant médicaments." />
      <Card className="p-5 space-y-4 max-w-2xl">
        <Label>N° de police</Label>
        <div className="flex gap-2">
          <Input value={policyNum} onChange={(e) => setPolicyNum(e.target.value)} />
          <Button onClick={search} disabled={!policyNum}>Rechercher</Button>
        </div>
        {contract && (
          <Card className="p-3 bg-muted/30">
            <p className="text-sm"><strong>Assuré :</strong> {contract.clients?.full_name} — {contract.companies?.name}</p>
            <Badge className={isActive ? "bg-green-500/10 text-green-700" : ""} variant={isActive ? "outline" : "destructive"}>
              {isActive ? "Actif" : "Expiré"}
            </Badge>
          </Card>
        )}
      </Card>

      {contract && (
        <>
          <Card className="p-5 space-y-3 max-w-2xl">
            <Label>Scanner l'ordonnance (optionnel)</Label>
            <DocumentScanner docType="passeport" label="Scanner l'ordonnance"
              onExtracted={() => toast.success("Ordonnance scannée")} />
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-semibold">Médicaments</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Prix unitaire</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meds.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell><Input value={m.designation} onChange={(e) => updateMed(i, "designation", e.target.value)} /></TableCell>
                    <TableCell><Input type="number" value={m.quantite} onChange={(e) => updateMed(i, "quantite", e.target.value)} className="w-20" /></TableCell>
                    <TableCell><Input type="number" value={m.prix} onChange={(e) => updateMed(i, "prix", e.target.value)} className="w-32" /></TableCell>
                    <TableCell>{formatFCFA(m.quantite * m.prix)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setMeds(meds.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm"
              onClick={() => setMeds([...meds, { designation: "", quantite: 1, prix: 0 }])}>
              + Ajouter médicament
            </Button>
            <div className="flex justify-end items-center gap-4 pt-3 border-t">
              <span className="font-semibold">Total : {formatFCFA(total)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Label>Taux remboursement (%)</Label>
              <Input type="number" min={0} max={100} value={taux}
                onChange={(e) => setTaux(Number(e.target.value))} className="w-24" />
              <span className="text-sm">Part assurance : <strong>{formatFCFA(part)}</strong></span>
            </div>
            <div>
              <Label>Ordonnance (PDF/image)</Label>
              <Input type="file" accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button onClick={submit} disabled={busy}>
              {busy ? "..." : "Enregistrer la dispensation"}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}