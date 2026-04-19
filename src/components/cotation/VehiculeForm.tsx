import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import type { AutoInput } from "@/lib/tarifs/moteurAuto";
import { CATEGORIE_LABELS, OPTIONS_IPT, type Categorie, type Zone } from "@/lib/tarifs/auto";

interface Props {
  value: AutoInput;
  onChange: (next: AutoInput) => void;
}

export function VehiculeForm({ value, onChange }: Props) {
  const set = <K extends keyof AutoInput>(k: K, v: AutoInput[K]) => onChange({ ...value, [k]: v });
  const setG = <K extends keyof AutoInput["garanties"]>(k: K, v: AutoInput["garanties"][K]) =>
    onChange({ ...value, garanties: { ...value.garanties, [k]: v } });

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Véhicule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={value.categorie} onValueChange={(v) => set("categorie", v as Categorie)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIE_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Zone</Label>
            <Select value={value.zone} onValueChange={(v) => set("zone", v as Zone)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Zone A — Urbaine</SelectItem>
                <SelectItem value="B">Zone B — Secondaire</SelectItem>
                <SelectItem value="C">Zone C — Rurale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Marque</Label>
            <Input value={value.marque ?? ""} onChange={(e) => set("marque", e.target.value)} placeholder="Toyota" />
          </div>
          <div className="space-y-2">
            <Label>Modèle</Label>
            <Input value={value.modele ?? ""} onChange={(e) => set("modele", e.target.value)} placeholder="Corolla" />
          </div>
          <div className="space-y-2">
            <Label>Immatriculation</Label>
            <Input value={value.immatriculation ?? ""} onChange={(e) => set("immatriculation", e.target.value)} placeholder="LT 471 HZ" />
          </div>
          <div className="space-y-2">
            <Label>Puissance fiscale (CV)</Label>
            <Input type="number" min={1} value={value.cv} onChange={(e) => set("cv", parseInt(e.target.value || "0", 10))} />
          </div>
          <div className="space-y-2">
            <Label>Énergie</Label>
            <Select value={value.energie} onValueChange={(v) => set("energie", v as "essence" | "diesel")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="essence">Essence</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nombre de places</Label>
            <Input type="number" min={1} value={value.places} onChange={(e) => set("places", parseInt(e.target.value || "0", 10))} />
          </div>
          <div className="space-y-2">
            <Label>Charge utile / PTAC (kg)</Label>
            <Input type="number" min={0} value={value.chargeUtileKg} onChange={(e) => set("chargeUtileKg", parseInt(e.target.value || "0", 10))} />
          </div>
          <div className="space-y-2">
            <Label>Valeur neuve (FCFA)</Label>
            <Input type="number" min={0} value={value.valeurNeuve} onChange={(e) => set("valeurNeuve", parseInt(e.target.value || "0", 10))} />
          </div>
          <div className="space-y-2">
            <Label>Valeur vénale (FCFA)</Label>
            <Input type="number" min={0} value={value.valeurVenale} onChange={(e) => set("valeurVenale", parseInt(e.target.value || "0", 10))} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Garanties</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <CheckboxRow label="Responsabilité Civile (obligatoire)" checked disabled />
          <CheckboxRow label="Défense & Recours" checked={value.garanties.defenseRecours} onChange={(v) => setG("defenseRecours", v)} />
          <CheckboxRow label="Dommages Tous Accidents (DTA)" checked={value.garanties.dommages} onChange={(v) => setG("dommages", v)} />
          <CheckboxRow label="Bris de Glaces" checked={value.garanties.brisDeGlaces} onChange={(v) => setG("brisDeGlaces", v)} />
          <CheckboxRow label="Incendie" checked={value.garanties.incendie} onChange={(v) => setG("incendie", v)} />
          <CheckboxRow label="Vol simple" checked={value.garanties.volSimple} onChange={(v) => setG("volSimple", v)} />
          <CheckboxRow label="Vol à main armée / Braquage" checked={value.garanties.volBraquage} onChange={(v) => setG("volBraquage", v)} />
          <CheckboxRow label="Tierce collision" checked={value.garanties.tierceCollision} onChange={(v) => setG("tierceCollision", v)} />
          <CheckboxRow label="Protection du conducteur" checked={value.garanties.protectionConducteur} onChange={(v) => setG("protectionConducteur", v)} />
          <CheckboxRow label="Carte rose CEMAC" checked={value.garanties.carteRoseCEMAC} onChange={(v) => setG("carteRoseCEMAC", v)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label>IPT — Individuelle Personnes Transportées</Label>
            <div className="flex items-center gap-2">
              <Checkbox checked={value.garanties.ipt} onCheckedChange={(v) => setG("ipt", !!v)} />
              <Select
                value={value.garanties.iptOption ?? "I"}
                onValueChange={(v) => setG("iptOption", v as "I" | "II" | "III" | "IV")}
                disabled={!value.garanties.ipt}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPTIONS_IPT.map((o) => (
                    <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Durée du contrat</Label>
            <Select value={String(value.dureeMois)} onValueChange={(v) => set("dureeMois", parseInt(v, 10))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 mois</SelectItem>
                <SelectItem value="3">3 mois</SelectItem>
                <SelectItem value="6">6 mois</SelectItem>
                <SelectItem value="12">12 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex justify-between">
            <Label>Réduction RC (max 15%)</Label>
            <span className="text-sm font-mono">{Math.round(value.reductionRcPct * 100)}%</span>
          </div>
          <Slider
            value={[value.reductionRcPct * 100]}
            max={15}
            step={1}
            onValueChange={(v) => set("reductionRcPct", v[0] / 100)}
          />
        </div>
      </Card>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange?.(!!v)} disabled={disabled} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
