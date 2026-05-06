import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentScanner } from "@/components/scan/DocumentScanner";
import { ensureClient } from "@/lib/clients";
import { coterVoyage, defaultVoyageOverrides, type ZoneVoyage } from "@/lib/tarifs/voyage";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import { Save } from "lucide-react";

const ZONES: { code: ZoneVoyage; label: string }[] = [
  { code: "europe_schengen", label: "Europe complète (Schengen)" },
  { code: "schengen_exclusif", label: "Europe partielle (Schengen)" },
  { code: "voyageur", label: "International Premium" },
  { code: "perle", label: "International Standard" },
  { code: "famille", label: "Famille" },
  { code: "economie", label: "Économique" },
];

export default function CotationVoyageClient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [age, setAge] = useState(35);
  const [zone, setZone] = useState<ZoneVoyage>("europe_schengen");
  const [jours, setJours] = useState(15);
  const [voyageurs, setVoyageurs] = useState(1);
  const [sportsHiver, setSportsHiver] = useState(false);
  const [passeport, setPasseport] = useState<{ nom?: string; numero?: string }>({});

  useEffect(() => {
    supabase.from("companies").select("id,name").eq("is_active", true).order("name").then(({ data }) => {
      const list = data ?? [];
      setCompanies(list as typeof companies);
      if (list[0]) setCompanyId(list[0].id);
    });
  }, []);

  const result = useMemo(() => coterVoyage(
    { produit: zone, age, jours, nbVoyageurs: voyageurs, sportsHiver },
    defaultVoyageOverrides(),
  ), [age, zone, jours, voyageurs, sportsHiver]);

  const submit = async () => {
    if (!user || !companyId) return toast.error("Compagnie manquante");
    try {
      const profile = await supabase.from("profiles").select("full_name,phone").eq("user_id", user.id).maybeSingle();
      const clientId = await ensureClient(
        { full_name: profile.data?.full_name || passeport.nom || user.email || "Client", phone: profile.data?.phone || "" },
        companyId, user.id, "client",
      );
      const { data, error } = await supabase.from("quotes").insert({
        company_id: companyId, client_id: clientId, type: "voyage",
        created_by: user.id, status: "brouillon",
        payload: { age, zone, jours, voyageurs, sportsHiver, passeport } as never,
        breakdown: result as never,
        base_premium: result.primeNette, taxes: result.tva, total_premium: result.primeTTC,
        duration_days: jours,
      }).select("id").single();
      if (error) throw error;
      toast.success("Demande envoyée — un conseiller vous contacte sous 24h");
      navigate(`/client/cotations/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Devis voyage en 30 secondes" description="Renseignez votre voyage, on calcule en direct." />

      <Card className="p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Mon voyage</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Âge du voyageur</Label><Input type="number" value={age} onChange={(e) => setAge(+e.target.value)} /></div>
          <div>
            <Label>Destination</Label>
            <Select value={zone} onValueChange={(v) => setZone(v as ZoneVoyage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ZONES.map((z) => <SelectItem key={z.code} value={z.code}>{z.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Durée (jours)</Label><Input type="number" min={1} max={365} value={jours} onChange={(e) => setJours(+e.target.value)} /></div>
          <div><Label>Nombre de voyageurs</Label><Input type="number" min={1} max={10} value={voyageurs} onChange={(e) => setVoyageurs(+e.target.value)} /></div>
          <div className="sm:col-span-2 flex items-center justify-between pt-2">
            <Label htmlFor="sh">Sports d'hiver ?</Label>
            <Switch id="sh" checked={sportsHiver} onCheckedChange={setSportsHiver} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h3 className="font-display text-lg font-semibold">📷 Vos documents (optionnel)</h3>
        <DocumentScanner docType="passeport" label="Scanner mon passeport"
          onExtracted={(d) => setPasseport({ nom: d.nom as string, numero: d.numero as string })} />
        {passeport.nom && (
          <p className="text-sm text-muted-foreground">Détecté : {passeport.nom} — {passeport.numero}</p>
        )}
      </Card>

      <Card className="p-6 bg-primary/5 border-primary/30">
        <p className="text-xs text-muted-foreground">Estimation pour {jours} jour(s)</p>
        <p className="font-display text-3xl font-bold text-primary">{formatFCFA(result.primeTTC)}</p>
        {companies.length > 1 && (
          <div className="mt-3">
            <Label className="text-xs">Compagnie</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </Card>

      <Button size="lg" className="w-full" onClick={submit}>
        <Save className="h-4 w-4 mr-2" /> Demander ce devis
      </Button>
    </div>
  );
}