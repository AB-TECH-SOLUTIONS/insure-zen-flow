import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

type Method = "mobile_money_mtn" | "mobile_money_orange" | "virement" | "especes" | "cheque" | "carte";
type Status = "en_attente" | "paye" | "echoue" | "rembourse";

interface ContractRow {
  id: string;
  contract_number: string;
  total_premium: number;
  company_id: string;
  client_id: string;
  status: string;
}

export function PaiementForm({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [contractId, setContractId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<Method>("mobile_money_mtn");
  const [status, setStatus] = useState<Status>("paye");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("contracts")
        .select("id, contract_number, total_premium, company_id, client_id, status")
        .order("created_at", { ascending: false })
        .limit(200);
      setContracts((data ?? []) as ContractRow[]);
    })();
  }, [open]);

  const selected = contracts.find((c) => c.id === contractId);

  useEffect(() => {
    if (selected && !amount) setAmount(String(selected.total_premium));
  }, [selected, amount]);

  const submit = async () => {
    if (!user) return;
    if (!selected) return toast.error("Sélectionnez un contrat");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Montant invalide");

    setLoading(true);
    try {
      const { error } = await supabase.from("payments").insert({
        contract_id: selected.id,
        client_id: selected.client_id,
        company_id: selected.company_id,
        amount: amt,
        method,
        status,
        external_reference: reference || null,
        paid_at: status === "paye" ? new Date().toISOString() : null,
        created_by: user.id,
      });
      if (error) throw error;

      // Bascule contrat actif si premier paiement encaissé
      if (status === "paye" && selected.status !== "actif") {
        await supabase.from("contracts").update({ status: "actif" }).eq("id", selected.id);
      }

      toast.success("Paiement enregistré");
      setOpen(false);
      setContractId(""); setAmount(""); setReference("");
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary shadow-glow">
          <Plus className="h-4 w-4" /> Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Nouveau paiement</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Contrat</Label>
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un contrat" /></SelectTrigger>
              <SelectContent>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.contract_number} — {Math.round(c.total_premium).toLocaleString("fr-FR")} FCFA
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Montant (FCFA)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Méthode</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money_mtn">Mobile Money MTN</SelectItem>
                  <SelectItem value="mobile_money_orange">Mobile Money Orange</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="carte">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paye">Payé</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="echoue">Échoué</SelectItem>
                  <SelectItem value="rembourse">Remboursé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Référence externe</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° transaction" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={loading} className="bg-gradient-primary">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}