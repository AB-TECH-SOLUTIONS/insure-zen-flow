import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  declare: "bg-blue-500/10 text-blue-600",
  en_instruction: "bg-amber-500/10 text-amber-700",
  expertise: "bg-purple-500/10 text-purple-700",
  regle: "bg-green-500/10 text-green-700",
  refuse: "bg-red-500/10 text-red-700",
  clos: "bg-gray-500/10 text-gray-700",
};

type Claim = {
  id: string; claim_number: string; description: string | null;
  status: string; occurred_at: string; company_id: string;
};

export default function DossiersSinistres() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [existing, setExisting] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ description: "", pieces: 0, mo: 0, delai: 0 });
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("claims").select("*").eq("assigned_garage_id", user.id)
      .order("occurred_at", { ascending: false });
    setClaims((data ?? []) as Claim[]);
    const { data: gq } = await supabase.from("garage_quotes").select("claim_id, statut")
      .eq("garage_user_id", user.id);
    const map: Record<string, string> = {};
    (gq ?? []).forEach((q: { claim_id: string; statut: string }) => { map[q.claim_id] = q.statut; });
    setExisting(map);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!open || !user) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      if (files) {
        for (const f of Array.from(files)) {
          const path = `${user.id}/${open}/${Date.now()}-${f.name}`;
          const { error } = await supabase.storage.from("garage-documents").upload(path, f);
          if (!error) urls.push(path);
        }
      }
      const { error } = await supabase.from("garage_quotes").insert({
        claim_id: open,
        garage_user_id: user.id,
        description: form.description,
        montant_pieces: form.pieces,
        montant_mo: form.mo,
        delai_jours: form.delai,
        statut: "soumis",
        file_urls: urls,
      });
      if (error) throw error;
      toast.success("Devis soumis");
      setOpen(null);
      setForm({ description: "", pieces: 0, mo: 0, delai: 0 });
      setFiles(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Dossiers sinistres" description="Sinistres qui vous ont été assignés." />
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° sinistre</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.claim_number}</TableCell>
                <TableCell className="max-w-xs truncate">{c.description}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[c.status] ?? ""} variant="outline">{c.status}</Badge>
                </TableCell>
                <TableCell>{new Date(c.occurred_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>
                  {existing[c.id] ? (
                    <Badge variant="secondary">Devis {existing[c.id]}</Badge>
                  ) : c.status === "expertise" ? (
                    <Dialog open={open === c.id} onOpenChange={(o) => setOpen(o ? c.id : null)}>
                      <DialogTrigger asChild>
                        <Button size="sm">Soumettre un devis</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl">
                        <DialogHeader><DialogTitle>Devis pour {c.claim_number}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <Label>Description des travaux</Label>
                            <Textarea value={form.description}
                              onChange={(e) => setForm({ ...form, description: e.target.value })} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Montant pièces (FCFA)</Label>
                              <Input type="number" value={form.pieces}
                                onChange={(e) => setForm({ ...form, pieces: Number(e.target.value) })} />
                            </div>
                            <div>
                              <Label>Main d'œuvre (FCFA)</Label>
                              <Input type="number" value={form.mo}
                                onChange={(e) => setForm({ ...form, mo: Number(e.target.value) })} />
                            </div>
                            <div>
                              <Label>Délai (jours)</Label>
                              <Input type="number" value={form.delai}
                                onChange={(e) => setForm({ ...form, delai: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div>
                            <Label>Photos / rapport</Label>
                            <Input type="file" multiple accept="image/*,application/pdf"
                              onChange={(e) => setFiles(e.target.files)} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={submit} disabled={busy}>{busy ? "..." : "Soumettre"}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {claims.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Aucun dossier assigné.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}