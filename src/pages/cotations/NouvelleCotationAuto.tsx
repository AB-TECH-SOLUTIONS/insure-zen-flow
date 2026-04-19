import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { VehiculeForm } from "@/components/cotation/VehiculeForm";
import { DecomptePanel } from "@/components/cotation/DecomptePanel";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { coter, defaultOverrides, type AutoInput, type AutoOverrides } from "@/lib/tarifs/moteurAuto";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

type Company = { id: string; name: string; code: string };

function detectCompagnie(code: string): "NSIA" | "AFRI" | "GMC" | "AUTRE" {
  const c = code.toUpperCase();
  if (c.includes("NSIA")) return "NSIA";
  if (c.includes("AFRI")) return "AFRI";
  if (c.includes("GMC")) return "GMC";
  return "AUTRE";
}

const initialInput: AutoInput = {
  compagnie: "NSIA",
  categorie: "cat1",
  cv: 7,
  zone: "A",
  energie: "essence",
  places: 5,
  chargeUtileKg: 0,
  valeurNeuve: 8_000_000,
  valeurVenale: 5_000_000,
  garanties: {
    rc: true,
    defenseRecours: true,
    ipt: true,
    iptOption: "I",
    dommages: false,
    brisDeGlaces: false,
    incendie: false,
    volSimple: false,
    volBraquage: false,
    tierceCollision: false,
    protectionConducteur: false,
    carteRoseCEMAC: false,
  },
  reductionRcPct: 0,
  dureeMois: 12,
};

export default function NouvelleCotationAuto() {
  const navigate = useNavigate();
  const { user, primaryCompanyId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [input, setInput] = useState<AutoInput>(initialInput);
  const [overrides, setOverrides] = useState<AutoOverrides>(defaultOverrides());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("companies").select("id,name,code").order("name").then(({ data }) => {
      const list = (data as Company[]) ?? [];
      setCompanies(list);
      if (primaryCompanyId) setCompanyId(primaryCompanyId);
      else if (list[0]) setCompanyId(list[0].id);
    });
  }, [primaryCompanyId]);

  useEffect(() => {
    const c = companies.find((x) => x.id === companyId);
    if (c) setInput((prev) => ({ ...prev, compagnie: detectCompagnie(c.code) }));
  }, [companyId, companies]);

  const result = useMemo(() => coter(input, overrides), [input, overrides]);

  const save = async () => {
    if (!user || !companyId) {
      toast.error("Sélectionnez une compagnie");
      return;
    }
    if (!clientName.trim()) {
      toast.error("Renseignez le nom du client");
      return;
    }
    setSaving(true);
    // 1. créer/réutiliser un client minimal
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .insert({
        full_name: clientName,
        phone: clientPhone || null,
        company_id: companyId,
        owner_user_id: user.id,
      })
      .select("id")
      .single();
    if (cErr || !client) {
      setSaving(false);
      toast.error(cErr?.message ?? "Erreur création client");
      return;
    }
    // 2. créer la cotation
    const { error: qErr } = await supabase.from("quotes").insert({
      company_id: companyId,
      client_id: client.id,
      type: "auto",
      created_by: user.id,
      manual_mode: overrides.manualMode,
      manual_overrides: overrides.lines as never,
      payload: input as never,
      breakdown: result as never,
      base_premium: result.primeNetteApresReduction,
      taxes: result.tva,
      total_premium: result.primeTTC,
      duration_days: input.dureeMois * 30,
    });
    setSaving(false);
    if (qErr) {
      toast.error(qErr.message);
      return;
    }
    toast.success("Cotation enregistrée");
    navigate("/agent/quotes");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle cotation Auto"
        description="Calcul automatique unifié — NSIA / GMC / AFRI. Mode manuel disponible."
      />

      <Card className="p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Compagnie & Client</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Compagnie</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nom du client</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex : MBONGO Samuel" />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+237…" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <VehiculeForm value={input} onChange={setInput} />
        <div className="xl:sticky xl:top-4 space-y-4">
          <DecomptePanel result={result} overrides={overrides} onChange={setOverrides} />
          <Button onClick={save} disabled={saving} size="lg" className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">Enregistrer la cotation</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
