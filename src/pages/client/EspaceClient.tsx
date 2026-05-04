import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { formatFCFA } from "@/lib/format";
import { AlertTriangle, FileCheck, FileText, Plus, Download, MessageSquare, Upload, FilePlus2, Wallet } from "lucide-react";

type Contract = { id: string; contract_number: string; type: string; status: string; start_date: string; end_date: string; total_premium: number; pdf_url: string | null; client_id: string; company_id: string };
type Claim = { id: string; claim_number: string; status: string; occurred_at: string; description: string | null; estimated_amount: number | null };
type Payment = { id: string; amount: number; status: string; paid_at: string | null; method: string };
type ClientRow = { id: string; full_name: string; company_id: string | null };

export default function EspaceClient() {
  const { user } = useAuth();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [openClaim, setOpenClaim] = useState(false);
  const [claimForm, setClaimForm] = useState({ contract_id: "", occurred_at: new Date().toISOString().slice(0, 10), description: "", estimated_amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: cli } = await supabase.from("clients").select("id,full_name,company_id").eq("client_user_id", user.id).maybeSingle();
    setClient((cli as ClientRow) || null);
    if (cli) {
      const [ctr, clm, pay] = await Promise.all([
        supabase.from("contracts").select("*").eq("client_id", cli.id).order("start_date", { ascending: false }),
        supabase.from("claims").select("id,claim_number,status,occurred_at,description,estimated_amount").eq("client_id", cli.id).order("occurred_at", { ascending: false }),
        supabase.from("payments").select("id,amount,status,paid_at,method").eq("client_id", cli.id).order("paid_at", { ascending: false }).limit(20),
      ]);
      setContracts((ctr.data as Contract[]) || []);
      setClaims((clm.data as Claim[]) || []);
      setPayments((pay.data as Payment[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      activeContracts: contracts.filter(c => c.status === "actif").length,
      expiringSoon: contracts.filter(c => c.end_date && c.end_date >= today && c.end_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).length,
      openClaims: claims.filter(c => c.status !== "regle" && c.status !== "clos").length,
      pendingPayments: payments.filter(p => p.status === "en_attente").reduce((s, p) => s + Number(p.amount), 0),
    };
  }, [contracts, claims, payments]);

  const downloadContract = async (c: Contract) => {
    if (!c.pdf_url) { toast.info("Aucun PDF disponible pour ce contrat"); return; }
    const { data, error } = await supabase.storage.from("contracts-pdf").createSignedUrl(c.pdf_url, 60);
    if (error || !data) { toast.error("Lien indisponible"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const submitClaim = async () => {
    if (!user || !client) { toast.error("Profil client introuvable"); return; }
    if (!claimForm.contract_id) { toast.error("Choisissez le contrat concerné"); return; }
    if (!claimForm.description.trim()) { toast.error("Décrivez les faits"); return; }
    setSubmitting(true);
    const ctr = contracts.find(c => c.id === claimForm.contract_id);
    if (!ctr) { setSubmitting(false); return; }

    const attachments: Array<{ name: string; path: string }> = [];
    if (files) {
      for (const f of Array.from(files)) {
        const path = `${user.id}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("claim-documents").upload(path, f);
        if (!error) attachments.push({ name: f.name, path });
      }
    }

    const { error } = await supabase.from("claims").insert({
      company_id: ctr.company_id,
      client_id: client.id,
      contract_id: ctr.id,
      occurred_at: new Date(claimForm.occurred_at).toISOString(),
      description: claimForm.description,
      estimated_amount: claimForm.estimated_amount ? Number(claimForm.estimated_amount) : null,
      declared_by: user.id,
      attachments,
      status: "declare",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setOpenClaim(false);
    setClaimForm({ contract_id: "", occurred_at: new Date().toISOString().slice(0, 10), description: "", estimated_amount: "" });
    setFiles(null);
    toast.success("Sinistre déclaré. Notre équipe revient vers vous.");
    load();
  };

  if (loading) return <p className="text-muted-foreground p-6">Chargement…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Espace personnel${client ? ` — ${client.full_name}` : ""}`}
        description="Gérez vos contrats, déclarez un sinistre et téléchargez vos documents en quelques clics."
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link to="/client/cotations/nouvelle"><Plus className="h-4 w-4 mr-1" />Nouveau devis</Link></Button>
            <Button size="sm" onClick={() => setOpenClaim(true)}><AlertTriangle className="h-4 w-4 mr-1" />Déclarer un sinistre</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Contrats actifs" value={stats.activeContracts} icon={FileCheck} accent="success" />
        <StatCard label="Échéances à 30 j" value={stats.expiringSoon} icon={FileText} accent="warning" />
        <StatCard label="Sinistres ouverts" value={stats.openClaims} icon={AlertTriangle} accent="warning" />
        <StatCard label="Paiements en attente" value={formatFCFA(stats.pendingPayments)} icon={Wallet} accent="info" />
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Mes contrats</TabsTrigger>
          <TabsTrigger value="claims">Mes sinistres</TabsTrigger>
          <TabsTrigger value="payments">Mes paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {contracts.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Aucun contrat. <Link to="/client/cotations/nouvelle" className="text-primary underline">Demander un devis</Link>.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3 text-left">N°</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Période</th><th className="p-3 text-right">Prime</th><th className="p-3">Statut</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="p-3 font-medium">{c.contract_number}</td>
                        <td className="p-3 capitalize">{c.type.replace("_", " ")}</td>
                        <td className="p-3 text-muted-foreground">{c.start_date} → {c.end_date}</td>
                        <td className="p-3 text-right tabular-nums">{formatFCFA(Number(c.total_premium))}</td>
                        <td className="p-3"><Badge variant={c.status === "actif" ? "secondary" : "outline"}>{c.status}</Badge></td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => downloadContract(c)}><Download className="h-4 w-4 mr-1" />PDF</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Historique des sinistres</CardTitle>
              <Button size="sm" onClick={() => setOpenClaim(true)}><FilePlus2 className="h-4 w-4 mr-1" />Nouveau sinistre</Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {claims.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Aucun sinistre déclaré.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3 text-left">N°</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Estimé</th><th className="p-3">Statut</th></tr>
                  </thead>
                  <tbody>
                    {claims.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="p-3 font-medium">{c.claim_number}</td>
                        <td className="p-3">{new Date(c.occurred_at).toLocaleDateString("fr-FR")}</td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{c.description || "—"}</td>
                        <td className="p-3 text-right tabular-nums">{c.estimated_amount ? formatFCFA(Number(c.estimated_amount)) : "—"}</td>
                        <td className="p-3"><Badge>{c.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {payments.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Aucun paiement enregistré.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Moyen</th><th className="p-3 text-right">Montant</th><th className="p-3">Statut</th></tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-t">
                        <td className="p-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="p-3 capitalize">{p.method?.replace("_", " ")}</td>
                        <td className="p-3 text-right tabular-nums">{formatFCFA(Number(p.amount))}</td>
                        <td className="p-3"><Badge variant={p.status === "paye" ? "secondary" : "outline"}>{p.status.replace("_", " ")}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" />Besoin d'aide ?</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Contactez votre conseiller via la <Link to="/client/messages" className="text-primary underline">messagerie</Link> ou demandez un nouveau devis depuis le bouton ci-dessus.
        </CardContent>
      </Card>

      {/* Dialog déclaration sinistre */}
      <Dialog open={openClaim} onOpenChange={setOpenClaim}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Déclarer un sinistre</DialogTitle>
            <DialogDescription>Renseignez les éléments ci-dessous. Vous pouvez joindre photos, constat ou devis.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Contrat concerné *</Label>
              <select className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={claimForm.contract_id}
                onChange={e => setClaimForm(s => ({ ...s, contract_id: e.target.value }))}>
                <option value="">— Choisir —</option>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.type}</option>)}
              </select>
            </div>
            <div>
              <Label>Date de l'incident</Label>
              <Input type="date" value={claimForm.occurred_at} onChange={e => setClaimForm(s => ({ ...s, occurred_at: e.target.value }))} />
            </div>
            <div>
              <Label>Description des faits *</Label>
              <Textarea rows={3} value={claimForm.description} onChange={e => setClaimForm(s => ({ ...s, description: e.target.value }))} placeholder="Lieu, circonstances, dommages..." />
            </div>
            <div>
              <Label>Montant estimé (FCFA)</Label>
              <Input type="number" value={claimForm.estimated_amount} onChange={e => setClaimForm(s => ({ ...s, estimated_amount: e.target.value }))} placeholder="Optionnel" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Upload className="h-4 w-4" />Pièces jointes</Label>
              <Input type="file" multiple onChange={e => setFiles(e.target.files)} />
              {files && <p className="text-xs text-muted-foreground mt-1">{files.length} fichier(s) prêt(s)</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenClaim(false)}>Annuler</Button>
            <Button onClick={submitClaim} disabled={submitting}>{submitting ? "Envoi…" : "Envoyer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}