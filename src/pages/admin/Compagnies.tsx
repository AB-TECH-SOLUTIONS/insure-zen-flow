import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";

interface Company {
  id: string; name: string; full_name: string | null; code: string;
  primary_color: string | null; logo_url: string | null; is_active: boolean;
}

export default function Compagnies() {
  const [list, setList] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", full_name: "", code: "", primary_color: "#0EA5E9" });

  const load = async () => {
    const { data } = await supabase.from("companies").select("*").order("name");
    setList((data as Company[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.code) { toast.error("Nom et code requis"); return; }
    const { error } = await supabase.from("companies").insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success("Compagnie créée");
    setOpen(false); setForm({ name: "", full_name: "", code: "", primary_color: "#0EA5E9" });
    load();
  };

  const toggle = async (c: Company) => {
    const { error } = await supabase.from("companies").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Compagnies" description="Gérez les compagnies d'assurance présentes sur la plateforme."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nouvelle compagnie</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer une compagnie</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nom court *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Raison sociale</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Code (ex: SAAR) *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
                <div><Label>Couleur principale</Label><Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={create}>Créer</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: c.primary_color ?? "#0EA5E9" }}>
                {c.logo_url ? <img src={c.logo_url} alt={c.name} className="h-12 w-12 object-contain rounded-lg" /> : <Building2 className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.code}</div>
                {c.full_name && <div className="text-xs text-muted-foreground mt-1">{c.full_name}</div>}
              </div>
              <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Actif" : "Inactif"}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                <span className="text-xs text-muted-foreground">Activée</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}