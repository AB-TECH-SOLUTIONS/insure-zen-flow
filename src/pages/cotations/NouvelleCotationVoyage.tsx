import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientSelector, type ClientLite } from "@/components/clients/ClientSelector";
import { ensureClient } from "@/lib/clients";
import { formatFCFA } from "@/lib/format";
import {
  coterVoyage,
  defaultVoyageOverrides,
  PRODUITS_VOYAGE,
  TRANCHES_AGE,
  type VoyageInput,
  type VoyageOverrides,
  type ZoneVoyage,
} from "@/lib/tarifs/voyage";
import { Loader2, Save, Plane, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Company = { id: string; name: string; code: string };

const initialInput: VoyageInput = {
  produit: "europe_schengen",
  age: 35,
  jours: 15,
  nbVoyageurs: 1,
  sportsHiver: false,
};

export default function NouvelleCotationVoyage({ basePath = "/agent" }: { basePath?: string } = {}) {
  const navigate = useNavigate();
  const { user, primaryCompanyId, role } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [client, setClient] = useState<ClientLite | null>({ full_name: "", phone: "" });
  const [input, setInput] = useState<VoyageInput>(initialInput);
  const [overrides, setOverrides] = useState<VoyageOverrides>(defaultVoyageOverrides());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("companies").select("id,name,code").order("name").then(({ data }) => {
      const list = (data as Company[]) ?? [];
      setCompanies(list);
      if (primaryCompanyId) setCompanyId(primaryCompanyId);
      else if (list[0]) setCompanyId(list[0].id);
    });
  }, [primaryCompanyId]);

  const result = useMemo(() => coterVoyage(input, overrides), [input, overrides]);
  const set = <K extends keyof VoyageInput>(k: K, v: VoyageInput[K]) => setInput({ ...input, [k]: v });

  const setLine = (key: string, val: number) =>
    setOverrides({ ...overrides, lines: { ...overrides.lines, [key]: val } });
  const resetLine = (key: string) => {
    const { [key]: _, ...rest } = overrides.lines;
    setOverrides({ ...overrides, lines: rest });
  };

  const home = role ? `/${role === "super_admin" ? "admin" : role}` : "/";

  const save = async () => {
    if (!user || !companyId) return toast.error("Sélectionnez une compagnie");
    if (!client || !client.full_name.trim()) return toast.error("Sélectionnez ou renseignez un client");
    setSaving(true);
    try {
      const clientId = await ensureClient(client, companyId, user.id, role);
      const { data: quote, error: qErr } = await supabase.from("quotes").insert({
        company_id: companyId,
        client_id: clientId,
        type: "voyage",
        created_by: user.id,
        manual_mode: overrides.manualMode,
        manual_overrides: overrides.lines as never,
        payload: input as never,
        breakdown: result as never,
        base_premium: result.primeNette,
        taxes: result.tva,
        total_premium: result.primeTTC,
        duration_days: input.jours,
      }).select("id").single();
      if (qErr || !quote) throw new Error(qErr?.message ?? "Erreur");
      toast.success("Cotation Voyage enregistrée");
      navigate(`${basePath}/cotations/${quote.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Nouvelle cotation Voyage" description="Schengen, Europe, Monde — barème NSIA par âge × produit × durée." />

      <Card className="p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Compagnie</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Compagnie</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <ClientSelector companyId={companyId} value={client} onChange={setClient} scanDocType="passeport" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Card className="p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Plane className="h-5 w-5" /> Voyage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produit / Zone</Label>
              <Select value={input.produit} onValueChange={(v) => set("produit", v as ZoneVoyage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUITS_VOYAGE.map((p) => (
                    <SelectItem key={p.code} value={p.code}>{p.label} — {p.zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Âge du voyageur principal</Label>
              <Input type="number" min={0} max={120} value={input.age} onChange={(e) => set("age", parseInt(e.target.value || "0", 10))} />
              <p className="text-xs text-muted-foreground">Tranche retenue : {TRANCHES_AGE.find((t) => t.code === result.trancheAge)?.label}</p>
            </div>
            <div className="space-y-2">
              <Label>Durée (jours)</Label>
              <Input type="number" min={1} max={730} value={input.jours} onChange={(e) => set("jours", parseInt(e.target.value || "0", 10))} />
              <p className="text-xs text-muted-foreground">Palier appliqué : jusqu'à {result.dureeRetenue} jours</p>
            </div>
            <div className="space-y-2">
              <Label>Nombre de voyageurs</Label>
              <Input type="number" min={1} value={input.nbVoyageurs} onChange={(e) => set("nbVoyageurs", parseInt(e.target.value || "1", 10))} />
            </div>
            <div className="flex items-center justify-between md:col-span-2 pt-2">
              <Label htmlFor="sh">Extension Sports d'Hiver (+100%)</Label>
              <Switch id="sh" checked={input.sportsHiver} onCheckedChange={(v) => set("sportsHiver", v)} />
            </div>
          </div>
        </Card>

        <div className="xl:sticky xl:top-4 space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Décompte</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="manual" className="text-sm">Mode manuel</Label>
                <Switch id="manual" checked={overrides.manualMode} onCheckedChange={(v) => setOverrides({ ...overrides, manualMode: v })} />
              </div>
            </div>

            <div className="space-y-2">
              {result.lignes.map((l) => (
                <div key={l.key} className="flex items-center justify-between gap-2 py-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{l.label}</span>
                    <Badge variant={l.source === "manuel" ? "default" : "outline"} className="text-[10px]">{l.source}</Badge>
                  </div>
                  {overrides.manualMode || overrides.lines[l.key] !== undefined ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className="w-32 text-right font-mono"
                        value={l.montant}
                        onChange={(e) => setLine(l.key, parseInt(e.target.value || "0", 10))}
                      />
                      {overrides.lines[l.key] !== undefined && (
                        <Button size="icon" variant="ghost" onClick={() => resetLine(l.key)}>
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => setLine(l.key, l.montant)} className="font-mono text-sm hover:text-primary">
                      {formatFCFA(l.montant)}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <Row label="Prime nette" value={result.primeNette} />
              <Row label="Accessoires" value={result.accessoires} />
              <Row label={`TVA (19,25% sur ${formatFCFA(result.baseTva)})`} value={result.tva} />
              <div className="flex justify-between pt-2 font-display text-lg font-bold">
                <span>Prime TTC</span>
                <span>{formatFCFA(result.primeTTC)}</span>
              </div>
            </div>
          </Card>

          <Button onClick={save} disabled={saving} size="lg" className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">Enregistrer la cotation</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono">{formatFCFA(value)}</span>
    </div>
  );
}
