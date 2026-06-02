import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SignaturePad } from "@/components/SignaturePad";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function ConstatAmiable() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<{ id: string; contract_number: string; client_id: string }[]>([]);
  const [form, setForm] = useState({
    contract_id_a: "",
    date_accident: new Date().toISOString().slice(0, 10),
    heure_accident: "12:00",
    lieu: "",
    circonstances: "",
    degats_a: "",
    degats_b: "",
    blesses: false,
    description_blesses: "",
    responsabilite_a: 50,
  });
  const [sigA, setSigA] = useState<string | null>(null);
  const [sigB, setSigB] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cli } = await supabase.from("clients").select("id").eq("client_user_id", user.id).maybeSingle();
      const q = supabase.from("contracts").select("id,contract_number,client_id").eq("status", "actif").eq("type", "auto").limit(20);
      const { data } = cli ? await q.eq("client_id", cli.id) : await q;
      setContracts((data as typeof contracts) || []);
    })();
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!form.contract_id_a || !form.lieu) { toast.error("Contrat et lieu obligatoires"); return; }
    setBusy(true);
    const ctr = contracts.find(c => c.id === form.contract_id_a);
    const { error } = await supabase.from("constats_amiables").insert({
      contract_id_a: form.contract_id_a,
      assure_a_id: ctr?.client_id ?? null,
      date_accident: form.date_accident,
      heure_accident: form.heure_accident,
      lieu: form.lieu,
      circonstances: form.circonstances,
      degats_vehicule_a: form.degats_a,
      degats_vehicule_b: form.degats_b,
      blesses: form.blesses,
      description_blesses: form.blesses ? form.description_blesses : null,
      responsabilite_a: form.responsabilite_a,
      responsabilite_b: 100 - form.responsabilite_a,
      created_by: user.id,
      signe_a_at: sigA ? new Date().toISOString() : null,
      signe_b_at: sigB ? new Date().toISOString() : null,
      statut: sigA && sigB ? "signe" : "en_attente_signature",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Constat amiable enregistré");
    navigate(-1);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Constat amiable" description="Remplissez les éléments de l'accident et faites signer les deux parties." />
      <Card className="p-6 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Contrat (partie A) *</Label>
          <select className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            value={form.contract_id_a}
            onChange={(e) => setForm({ ...form, contract_id_a: e.target.value })}>
            <option value="">— Choisir —</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number}</option>)}
          </select>
        </div>
        <div><Label>Date *</Label><Input type="date" value={form.date_accident} onChange={(e) => setForm({ ...form, date_accident: e.target.value })} /></div>
        <div><Label>Heure</Label><Input type="time" value={form.heure_accident} onChange={(e) => setForm({ ...form, heure_accident: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Lieu *</Label><Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} placeholder="Ville, intersection, route..." /></div>
        <div className="sm:col-span-2"><Label>Circonstances</Label><Textarea rows={3} value={form.circonstances} onChange={(e) => setForm({ ...form, circonstances: e.target.value })} /></div>
        <div><Label>Dégâts véhicule A</Label><Textarea rows={2} value={form.degats_a} onChange={(e) => setForm({ ...form, degats_a: e.target.value })} /></div>
        <div><Label>Dégâts véhicule B</Label><Textarea rows={2} value={form.degats_b} onChange={(e) => setForm({ ...form, degats_b: e.target.value })} /></div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Switch checked={form.blesses} onCheckedChange={(v) => setForm({ ...form, blesses: v })} />
          <Label>Blessés ?</Label>
        </div>
        {form.blesses && (
          <div className="sm:col-span-2"><Label>Description des blessés</Label><Textarea rows={2} value={form.description_blesses} onChange={(e) => setForm({ ...form, description_blesses: e.target.value })} /></div>
        )}
        <div className="sm:col-span-2 space-y-2">
          <div className="flex justify-between text-sm"><span>Responsabilité A : {form.responsabilite_a}%</span><span>B : {100 - form.responsabilite_a}%</span></div>
          <Slider value={[form.responsabilite_a]} min={0} max={100} step={10} onValueChange={(v) => setForm({ ...form, responsabilite_a: v[0] })} />
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <Label>Signature partie A</Label>
          <SignaturePad onChange={setSigA} />
        </Card>
        <Card className="p-4 space-y-2">
          <Label>Signature partie B</Label>
          <SignaturePad onChange={setSigB} />
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
        <Button onClick={submit} disabled={busy}><Save className="h-4 w-4 mr-2" />{busy ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>
    </div>
  );
}
