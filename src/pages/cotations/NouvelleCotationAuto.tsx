import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { VehiculeForm } from "@/components/cotation/VehiculeForm";
import { DecomptePanel } from "@/components/cotation/DecomptePanel";
import { ClientSelector, type ClientLite } from "@/components/clients/ClientSelector";
import { ensureClient } from "@/lib/clients";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { coter, defaultOverrides, type AutoInput, type AutoOverrides } from "@/lib/tarifs/moteurAuto";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface Props { basePath: string }

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

export default function NouvelleCotationAuto({ basePath = "/agent" }: Partial<Props> = {}) {
  const navigate = useNavigate();
  const { user, primaryCompanyId } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [client, setClient] = useState<ClientLite | null>({ full_name: "", phone: "" });
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
    if (!client || !client.full_name.trim()) {
      toast.error("Sélectionnez ou renseignez un client");
      return;
    }
    setSaving(true);
    try {
      const clientId = await ensureClient(client, companyId, user.id);
      const { data: quote, error: qErr } = await supabase.from("quotes").insert({
        company_id: companyId,
        client_id: clientId,
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
      }).select("id").single();
      if (qErr || !quote) throw new Error(qErr?.message ?? "Erreur");
      toast.success("Cotation enregistrée");
      navigate(`${basePath}/cotations/${quote.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle cotation Auto"
        description="Calcul automatique unifié — NSIA / GMC / AFRI. Mode manuel disponible."
      />

      <Card className="p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Compagnie</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </Card>

      <ClientSelector companyId={companyId} value={client} onChange={setClient} />

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
