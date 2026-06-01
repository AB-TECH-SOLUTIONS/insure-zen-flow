import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  declare: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  en_instruction: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  expertise: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  regle: "bg-green-500/10 text-green-700 dark:text-green-300",
  refuse: "bg-red-500/10 text-red-700 dark:text-red-300",
  clos: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};
const STATUSES = ["declare","en_instruction","expertise","regle","refuse","clos"] as const;

export default function ListeSinistres({ basePath }: { basePath: string }) {
  const { user, role, primaryCompanyId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [form, setForm] = useState({
    contract_id: "", occurred_at: new Date().toISOString().slice(0,10),
    description: "", estimated_amount: "",
  });

  const load = async () => {
    const { data } = await supabase.from("claims")
      .select("*, clients(full_name), contracts(contract_number, type)")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const openNew = async () => {
    setOpen(true);
    const { data } = await supabase.from("contracts")
      .select("id, contract_number, type, client_id, company_id, clients(full_name)")
      .eq("status", "actif").limit(200);
    setContracts(data ?? []);
  };

  const create = async () => {
    if (!user || !form.contract_id) return;
    const c = contracts.find(x => x.id === form.contract_id);
    if (!c) return;
    const { error } = await supabase.from("claims").insert({
      contract_id: c.id, client_id: c.client_id, company_id: c.company_id,
      occurred_at: new Date(form.occurred_at).toISOString(),
      description: form.description || null,
      estimated_amount: form.estimated_amount ? Number(form.estimated_amount) : null,
      declared_by: user.id, status: "declare",
    });
    if (error) return toast.error(error.message);
    toast.success("Sinistre déclaré");
    setOpen(false); setForm({ contract_id: "", occurred_at: new Date().toISOString().slice(0,10), description: "", estimated_amount: "" });
    load();
  };

  const updateStatus = async (id: string, status: string, settled?: number) => {
    const patch: any = { status };
    if (settled !== undefined) patch.settled_amount = settled;
    const { error } = await supabase.from("claims").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour");
    load();
  };

  const filtered = items.filter(i =>
    !search || i.claim_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.clients?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const canManage = role && ["agent","assureur","super_admin"].includes(role);

  return (
    <div>
      <PageHeader title="Sinistres" description="Gestion des déclarations de sinistre"
        actions={
          <Dialog open={open} onOpenChange={(o) => o ? openNew() : setOpen(false)}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Déclarer un sinistre</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Déclarer un sinistre</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Contrat concerné</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={form.contract_id} onChange={(e) => setForm({...form, contract_id: e.target.value})}>
                    <option value="">Sélectionner…</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.contract_number} — {c.clients?.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Date du sinistre</Label>
                  <Input type="date" value={form.occurred_at} onChange={(e) => setForm({...form, occurred_at: e.target.value})} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
                </div>
                <div>
                  <Label>Montant estimé (FCFA)</Label>
                  <Input type="number" value={form.estimated_amount} onChange={(e) => setForm({...form, estimated_amount: e.target.value})} />
                </div>
                <Button onClick={create} className="w-full">Déclarer</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input placeholder="Rechercher par numéro ou client…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Aucun sinistre</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Contrat</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Estimé</TableHead>
                  <TableHead>Réglé</TableHead>
                  <TableHead>Statut</TableHead>
                  {canManage && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      <Link to={`${basePath}/sinistres/${c.id}`} className="text-primary hover:underline">{c.claim_number}</Link>
                    </TableCell>
                    <TableCell>{c.clients?.full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.contracts?.contract_number}</TableCell>
                    <TableCell>{format(new Date(c.occurred_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{c.estimated_amount ? formatFCFA(c.estimated_amount) : "—"}</TableCell>
                    <TableCell>{c.settled_amount ? formatFCFA(c.settled_amount) : "—"}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[c.status]} variant="secondary">{c.status.replace("_"," ")}</Badge></TableCell>
                    {canManage && (
                      <TableCell>
                        <select className="h-8 text-xs px-2 rounded border border-input bg-background"
                          value={c.status} onChange={(e) => {
                            const ns = e.target.value;
                            if (ns === "regle") {
                              const v = prompt("Montant réglé (FCFA)", String(c.estimated_amount || 0));
                              if (v !== null) updateStatus(c.id, ns, Number(v));
                            } else updateStatus(c.id, ns);
                          }}>
                          {STATUSES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                        </select>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}