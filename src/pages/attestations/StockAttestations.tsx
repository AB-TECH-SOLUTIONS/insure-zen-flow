import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Stamp } from "lucide-react";
import { toast } from "sonner";

export default function StockAttestations() {
  const { user, role, primaryCompanyId } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    serial_start: "", serial_end: "", total_count: "", assigned_to: "", notes: "",
  });

  const isAssureur = role === "assureur" || role === "super_admin";

  const load = async () => {
    const { data } = await supabase.from("attestations_stock")
      .select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (open && primaryCompanyId) {
      supabase.from("profiles").select("user_id, full_name").limit(200)
        .then(({ data }) => setUsers(data ?? []));
    }
  }, [open, primaryCompanyId]);

  const create = async () => {
    if (!primaryCompanyId) return toast.error("Aucune compagnie associée");
    const total = Number(form.total_count);
    if (!form.serial_start || !form.serial_end || !total) return toast.error("Champs requis");
    const { error } = await supabase.from("attestations_stock").insert({
      company_id: primaryCompanyId,
      serial_start: form.serial_start, serial_end: form.serial_end,
      total_count: total, used_count: 0,
      assigned_to: form.assigned_to || null, notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Stock créé");
    setOpen(false);
    setForm({ serial_start: "", serial_end: "", total_count: "", assigned_to: "", notes: "" });
    load();
  };

  const incrementUsed = async (id: string, current: number, total: number) => {
    if (current >= total) return toast.error("Stock épuisé");
    await supabase.from("attestations_stock").update({ used_count: current + 1 }).eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader title="Stock attestations" description="Gestion des séries d'attestations papier"
        actions={isAssureur ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouveau stock</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau stock d'attestations</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Série début</Label><Input value={form.serial_start} onChange={(e) => setForm({...form, serial_start: e.target.value})} /></div>
                  <div><Label>Série fin</Label><Input value={form.serial_end} onChange={(e) => setForm({...form, serial_end: e.target.value})} /></div>
                </div>
                <div><Label>Quantité totale</Label><Input type="number" value={form.total_count} onChange={(e) => setForm({...form, total_count: e.target.value})} /></div>
                <div>
                  <Label>Assigné à (optionnel)</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={form.assigned_to} onChange={(e) => setForm({...form, assigned_to: e.target.value})}>
                    <option value="">Non assigné</option>
                    {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0,8)}</option>)}
                  </select>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
                <Button onClick={create} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      />
      <Card>
        <CardContent className="p-4">
          {items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Stamp className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Aucun stock enregistré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Série</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Consommation</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(s => {
                  const pct = (s.used_count / s.total_count) * 100;
                  const remaining = s.total_count - s.used_count;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.serial_start} → {s.serial_end}</TableCell>
                      <TableCell>
                        <Badge variant={remaining < 10 ? "destructive" : "secondary"}>
                          {remaining}/{s.total_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-48">
                        <Progress value={pct} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}%</p>
                      </TableCell>
                      <TableCell className="text-sm">{s.notes || "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" disabled={remaining <= 0}
                          onClick={() => incrementUsed(s.id, s.used_count, s.total_count)}>+1 utilisé</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}