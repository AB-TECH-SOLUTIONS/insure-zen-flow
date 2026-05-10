import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ensureClient } from "@/lib/clients";
import { formatFCFA } from "@/lib/format";
import {
  coterVie, DUREES_VIE, MODES_VIE, PRODUITS_VIE,
  type DureeVie, type ModeVie, type ProduitVie,
} from "@/lib/tarifs/vie";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function CotationVieClient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [produit, setProduit] = useState<ProduitVie>("epargne");
  const [age, setAge] = useState(35);
  const [capital, setCapital] = useState(5_000_000);
  const [duree, setDuree] = useState<DureeVie>(10);
  const [mode, setMode] = useState<ModeVie>("annuel");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("companies").select("id,name").eq("is_active", true).order("name")
      .then(({ data }) => {
        const list = (data ?? []) as { id: string; name: string }[];
        setCompanies(list);
        if (list[0]) setCompanyId(list[0].id);
      });
  }, []);

  const result = useMemo(
    () => coterVie({ produit, age, capital, dureeAnnees: duree, mode }),
    [produit, age, capital, duree, mode],
  );

  const submit = async () => {
    if (!user || !companyId) return toast.error("Compagnie manquante");
    setSaving(true);
    try {
      const profile = await supabase.from("profiles").select("full_name,phone").eq("user_id", user.id).maybeSingle();
      const clientId = await ensureClient(
        { full_name: profile.data?.full_name || user.email || "Client", phone: profile.data?.phone || "" },
        companyId, user.id, "client",
      );
      const { data, error } = await supabase.from("quotes").insert({
        company_id: companyId, client_id: clientId, type: "vie",
        created_by: user.id, status: "brouillon",
        payload: { input: { produit, age, capital, dureeAnnees: duree, mode }, result } as never,
        breakdown: result as never,
        base_premium: result.primeAnnuelle, taxes: result.taxe,
        total_premium: result.primeAnnuelle + result.taxe,
        duration_days: duree * 365,
      }).select("id").single();
      if (error) throw error;
      toast.success("Demande envoyée — un conseiller vous contacte sous 24h");
      navigate(`/client/cotations/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Devis Assurance Vie" description="Quelques infos suffisent pour estimer votre prime." />

      <Card className="p-4 space-y-3">
        <Label>Type d'assurance</Label>
        <Select value={produit} onValueChange={(v) => setProduit(v as ProduitVie)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRODUITS_VIE.map((p) => <SelectItem key={p.code} value={p.code}>{p.label} — {p.desc}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Capital souhaité</Label>
          <span className="text-sm font-semibold text-primary">{formatFCFA(capital)}</span>
        </div>
        <Slider value={[capital]} min={1_000_000} max={100_000_000} step={1_000_000}
          onValueChange={(v) => setCapital(v[0])} />
      </Card>

      <Card className="p-4 space-y-3">
        <Label>Votre âge</Label>
        <Input type="number" min={18} max={75} value={age}
          onChange={(e) => setAge(Math.max(18, Math.min(75, +e.target.value || 18)))} />
      </Card>

      <Card className="p-4 space-y-3">
        <Label>Durée du contrat</Label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {DUREES_VIE.map((d) => (
            <button key={d} type="button" onClick={() => setDuree(d)}
              className={`p-3 rounded-lg border-2 transition font-semibold ${duree === d ? "border-primary bg-primary/5" : "border-border"}`}>
              {d} ans
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <Label>Fréquence de paiement</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as ModeVie)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODES_VIE.map((m) => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-4 space-y-2">
        <Label>Compagnie</Label>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
          <SelectContent>
            {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-6 text-center space-y-1">
        <p className="text-xs text-muted-foreground">Votre prime {MODES_VIE.find((m) => m.code === mode)?.label.toLowerCase()}</p>
        <p className="font-display text-4xl font-bold text-primary">{formatFCFA(result.primePeriodique)}</p>
        <p className="text-xs text-muted-foreground">soit {formatFCFA(result.primeAnnuelle)} / an · capital garanti {formatFCFA(result.capitalGaranti)}</p>
      </Card>

      <Button size="lg" className="w-full" onClick={submit} disabled={saving}>
        <Save className="h-4 w-4 mr-2" /> Demander ce devis
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Estimation indicative. Le devis officiel sera validé par un conseiller agréé sous 24h.
      </p>
    </div>
  );
}