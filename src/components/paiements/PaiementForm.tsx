import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Download } from "lucide-react";
import { generateRecu } from "@/lib/pdf/generateRecu";
import { montantEnLettres } from "@/lib/pdf/montantEnLettres";

type Method = "mobile_money_mtn" | "mobile_money_orange" | "virement" | "especes" | "cheque" | "carte";

interface ContractRow {
  id: string;
  contract_number: string;
  total_premium: number;
  company_id: string;
  client_id: string;
  status: string;
}

// Validation tél +237 :
// MTN Cameroun : +237 6[5-9]X XX XX XX  (et 67X anciens)
// Orange Cameroun : +237 6[5-7]X XX XX XX  (chevauchement, on autorise large)
const phoneMTN = /^\+2376[5-9]\d{7}$/;
const phoneOrange = /^\+2376[5-9]\d{7}$/;

export function PaiementForm({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [contractId, setContractId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("mobile_money_mtn");
  const [phone, setPhone] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [chequeNum, setChequeNum] = useState("");
  const [cashier, setCashier] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [lastPayment, setLastPayment] = useState<{ id: string; ref: string; amount: number; client: string; company: string; color: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("contracts")
      .select("id, contract_number, total_premium, company_id, client_id, status")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setContracts((data ?? []) as ContractRow[]));
  }, [open]);

  const selected = contracts.find((c) => c.id === contractId);

  useEffect(() => {
    if (selected && !amount) setAmount(String(selected.total_premium));
  }, [selected, amount]);

  const reset = () => {
    setContractId(""); setAmount(""); setPhone(""); setBankRef("");
    setChequeNum(""); setCashier(""); setReceiptUrl(null); setLastPayment(null);
  };

  const validateModeFields = (): string | null => {
    if (method === "mobile_money_mtn") {
      if (!phoneMTN.test(phone)) return "Numéro MTN invalide (format +2376XXXXXXXX)";
    } else if (method === "mobile_money_orange") {
      if (!phoneOrange.test(phone)) return "Numéro Orange invalide (format +2376XXXXXXXX)";
    } else if (method === "virement") {
      if (!bankRef.trim()) return "Référence bancaire requise";
    } else if (method === "cheque") {
      if (!chequeNum.trim()) return "Numéro de chèque requis";
    } else if (method === "especes") {
      if (!cashier.trim()) return "Caissier requis";
    }
    return null;
  };

  const submit = async () => {
    if (!user) return;
    if (!selected) return toast.error("Sélectionnez un contrat");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Montant invalide");
    if (amt < selected.total_premium) {
      const ok = window.confirm(`Le montant (${amt.toLocaleString("fr-FR")}) est inférieur à la prime due (${selected.total_premium.toLocaleString("fr-FR")}). Continuer ?`);
      if (!ok) return;
    }
    const err = validateModeFields();
    if (err) return toast.error(err);

    setLoading(true);
    try {
      const reference =
        method === "mobile_money_mtn" || method === "mobile_money_orange"
          ? `${method === "mobile_money_mtn" ? "MTN" : "ORG"}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
          : method === "virement" ? bankRef
          : method === "cheque" ? `CHQ-${chequeNum}`
          : method === "especes" ? `CASH-${cashier}`
          : "";

      // Mode simulation : appelle l'edge function process-payment qui crée le paiement
      // puis bascule vers "paye" 3s plus tard (Mobile Money), ou directement "paye" pour les autres modes.
      const { data: res, error: fnErr } = await supabase.functions.invoke("process-payment", {
        body: {
          contract_id: selected.id,
          amount: amt,
          method,
          phone: phone || null,
          external_reference: reference,
        },
      });
      if (fnErr) throw fnErr;
      const paymentId = (res as { payment_id?: string })?.payment_id ?? null;

      // Récupérer info pour la quittance (avant ou après confirmation)
      const [{ data: cli }, { data: comp }] = await Promise.all([
        supabase.from("clients").select("full_name,phone").eq("id", selected.client_id).maybeSingle(),
        supabase.from("companies").select("name,primary_color").eq("id", selected.company_id).maybeSingle(),
      ]);
      const isMM = method === "mobile_money_mtn" || method === "mobile_money_orange";
      setLastPayment({
        id: paymentId ?? "",
        ref: reference,
        amount: amt,
        client: cli?.full_name ?? "Client",
        company: comp?.name ?? "",
        color: (comp as { primary_color?: string } | null)?.primary_color ?? "#0EA5E9",
      });
      toast.success(isMM ? "Demande Mobile Money envoyée — confirmation dans 3s" : "Paiement enregistré");

      // Bascule contrat actif si premier paiement
      if (!isMM && selected.status !== "actif") {
        await supabase.from("contracts").update({ status: "actif" }).eq("id", selected.id);
      }
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    if (!lastPayment) return;
    const doc = generateRecu({
      recuNumber: `R-${lastPayment.ref}`,
      date: new Date().toLocaleDateString("fr-FR"),
      clientNom: lastPayment.client,
      policeNumber: selected?.contract_number ?? "—",
      montant: lastPayment.amount,
      montantLettres: montantEnLettres(lastPayment.amount),
      methode: method === "mobile_money_mtn" ? "Mobile Money MTN"
        : method === "mobile_money_orange" ? "Mobile Money Orange"
        : method === "virement" ? "Virement"
        : method === "cheque" ? "Chèque"
        : method === "especes" ? "Espèces" : "Carte",
      companyName: lastPayment.company,
      companyColor: lastPayment.color,
    });
    doc.save(`Recu-${lastPayment.ref}.pdf`);
    setReceiptUrl("done");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary shadow-glow">
          <Plus className="h-4 w-4" /> Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Nouveau paiement</DialogTitle></DialogHeader>

        {lastPayment ? (
          <div className="space-y-4 text-center py-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Paiement enregistré</p>
              <p className="text-xs text-muted-foreground mt-1">Référence : {lastPayment.ref}</p>
              <p className="text-sm mt-1 font-mono">{lastPayment.amount.toLocaleString("fr-FR")} FCFA</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={downloadReceipt} variant="outline">
                <Download className="h-4 w-4 mr-2" /> Télécharger la quittance
              </Button>
              <Button onClick={() => { reset(); }}>Nouveau paiement</Button>
            </div>
          </div>
        ) : (
          <>
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

              {(method === "mobile_money_mtn" || method === "mobile_money_orange") && (
                <div>
                  <Label>Numéro de téléphone (+237…)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 6 XX XX XX XX" />
                </div>
              )}
              {method === "virement" && (
                <div>
                  <Label>Référence bancaire</Label>
                  <Input value={bankRef} onChange={(e) => setBankRef(e.target.value)} placeholder="N° virement" />
                </div>
              )}
              {method === "cheque" && (
                <div>
                  <Label>Numéro de chèque</Label>
                  <Input value={chequeNum} onChange={(e) => setChequeNum(e.target.value)} />
                </div>
              )}
              {method === "especes" && (
                <div>
                  <Label>Caissier</Label>
                  <Input value={cashier} onChange={(e) => setCashier(e.target.value)} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={loading} className="bg-gradient-primary">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}