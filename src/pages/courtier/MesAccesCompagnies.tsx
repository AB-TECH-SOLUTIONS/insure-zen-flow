import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ShieldCheck, Clock, Ban } from "lucide-react";

type Req = { id: string; company_id: string; status: string; justification: string | null; created_at: string };
type Comp = { id: string; name: string };

export default function MesAccesCompagnies() {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [companies, setCompanies] = useState<Comp[]>([]);
  const [active, setActive] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [just, setJust] = useState("");

  const load = async () => {
    if (!user) return;
    const [{ data: r }, { data: c }, { data: a }] = await Promise.all([
      supabase.from("broker_company_requests").select("*").eq("broker_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("companies").select("id,name").eq("is_active", true).order("name"),
      supabase.from("broker_company_access").select("company_id").eq("broker_user_id", user.id).eq("is_active", true),
    ]);
    setReqs((r as Req[]) ?? []);
    setCompanies((c as Comp[]) ?? []);
    setActive(new Set((a ?? []).map((x: { company_id: string }) => x.company_id)));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const submit = async () => {
    if (!user || !target) return;
    const { error } = await supabase.from("broker_company_requests").insert({
      broker_user_id: user.id, company_id: target, justification: just || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Demande envoyée — en attente de validation");
    setOpen(false); setTarget(""); setJust(""); load();
  };

  const compName = (id: string) => companies.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Mes accès compagnies"
        description="Demandez l'accès aux compagnies partenaires pour distribuer leurs produits."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Faire une demande</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Demande d'accès compagnie</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger><SelectValue placeholder="Choisir une compagnie" /></SelectTrigger>
                  <SelectContent>
                    {companies.filter((c) => !active.has(c.id) && !reqs.some((r) => r.company_id === c.id && r.status === "en_attente"))
                      .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Justification (numéro agrément, expérience, portefeuille…)" value={just} onChange={(e) => setJust(e.target.value)} />
              </div>
              <DialogFooter><Button onClick={submit}>Envoyer</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Compagnie</TableHead><TableHead>Statut</TableHead><TableHead>Demandé le</TableHead><TableHead>Justification</TableHead></TableRow></TableHeader>
          <TableBody>
            {reqs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune demande</TableCell></TableRow>}
            {reqs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{compName(r.company_id)}</TableCell>
                <TableCell>
                  {active.has(r.company_id) ? <Badge className="bg-emerald-600"><ShieldCheck className="h-3 w-3 mr-1" /> Accès actif</Badge>
                    : r.status === "en_attente" ? <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> En attente</Badge>
                    : r.status === "refusee" ? <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" /> Refusée</Badge>
                    : <Badge variant="outline">{r.status}</Badge>}
                </TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-md truncate">{r.justification ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}