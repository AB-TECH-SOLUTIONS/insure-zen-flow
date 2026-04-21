import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentScanner } from "@/components/scan/DocumentScanner";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  companyId: string | null;
  vehicleId?: string | null;
  onSaved?: () => void;
}

type VForm = {
  brand: string; model: string; registration: string; vin: string;
  fiscal_power: string; energy: string; seats: string; payload_kg: string;
  new_value: string; market_value: string; first_registration_date: string;
};

const empty: VForm = {
  brand: "", model: "", registration: "", vin: "",
  fiscal_power: "", energy: "essence", seats: "5", payload_kg: "",
  new_value: "", market_value: "", first_registration_date: "",
};

export function VehiculeFormDialog({ open, onOpenChange, clientId, companyId, vehicleId, onSaved }: Props) {
  const [form, setForm] = useState<VForm>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!vehicleId) { setForm(empty); return; }
    supabase.from("vehicles").select("*").eq("id", vehicleId).maybeSingle().then(({ data }) => {
      if (!data) return;
      setForm({
        brand: data.brand ?? "",
        model: data.model ?? "",
        registration: data.registration ?? "",
        vin: data.vin ?? "",
        fiscal_power: data.fiscal_power?.toString() ?? "",
        energy: data.energy ?? "essence",
        seats: data.seats?.toString() ?? "5",
        payload_kg: data.payload_kg?.toString() ?? "",
        new_value: data.new_value?.toString() ?? "",
        market_value: data.market_value?.toString() ?? "",
        first_registration_date: data.first_registration_date ?? "",
      });
    });
  }, [open, vehicleId]);

  const set = <K extends keyof VForm>(k: K, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const apply = (d: Record<string, unknown>) => {
    setForm((p) => ({
      ...p,
      brand: (d.marque as string) ?? p.brand,
      model: (d.modele as string) ?? p.model,
      registration: (d.immatriculation as string) ?? p.registration,
      vin: (d.numero_serie as string) ?? p.vin,
      fiscal_power: (d.puissance_fiscale as string) ?? p.fiscal_power,
      energy: (d.energie as string) ?? p.energy,
      seats: (d.nombre_places as string) ?? p.seats,
      first_registration_date: (d.date_premiere_immatriculation as string) ?? p.first_registration_date,
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        brand: form.brand || null,
        model: form.model || null,
        registration: form.registration || null,
        vin: form.vin || null,
        fiscal_power: form.fiscal_power ? parseInt(form.fiscal_power) : null,
        energy: form.energy || null,
        seats: form.seats ? parseInt(form.seats) : null,
        payload_kg: form.payload_kg ? parseInt(form.payload_kg) : null,
        new_value: form.new_value ? parseFloat(form.new_value) : null,
        market_value: form.market_value ? parseFloat(form.market_value) : null,
        first_registration_date: form.first_registration_date || null,
      };
      const { error } = vehicleId
        ? await supabase.from("vehicles").update(payload).eq("id", vehicleId)
        : await supabase.from("vehicles").insert(payload);
      if (error) throw new Error(error.message);
      toast.success(vehicleId ? "Véhicule mis à jour" : "Véhicule ajouté");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vehicleId ? "Modifier le véhicule" : "Nouveau véhicule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-end">
            <DocumentScanner docType="carte_grise" clientId={clientId} companyId={companyId} onExtracted={apply} compact />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Marque</Label><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Modèle</Label><Input value={form.model} onChange={(e) => set("model", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Immatriculation</Label><Input value={form.registration} onChange={(e) => set("registration", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">N° série (VIN)</Label><Input value={form.vin} onChange={(e) => set("vin", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Puissance fiscale (CV)</Label><Input type="number" value={form.fiscal_power} onChange={(e) => set("fiscal_power", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Énergie</Label><Input value={form.energy} onChange={(e) => set("energy", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Places</Label><Input type="number" value={form.seats} onChange={(e) => set("seats", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Charge utile (kg)</Label><Input type="number" value={form.payload_kg} onChange={(e) => set("payload_kg", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">1ère immatriculation</Label><Input type="date" value={form.first_registration_date} onChange={(e) => set("first_registration_date", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Valeur neuve (FCFA)</Label><Input type="number" value={form.new_value} onChange={(e) => set("new_value", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Valeur vénale (FCFA)</Label><Input type="number" value={form.market_value} onChange={(e) => set("market_value", e.target.value)} /></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">Enregistrer</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}