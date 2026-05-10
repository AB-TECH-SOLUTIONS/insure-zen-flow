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
import { ClientSelector, type ClientLite } from "@/components/clients/ClientSelector";
import { ensureClient } from "@/lib/clients";
import { formatFCFA } from "@/lib/format";
import {
  coterVie,
  DUREES_VIE,
  MODES_VIE,
  PRODUITS_VIE,
  type DureeVie,
  type ModeVie,
  type ProduitVie,
} from "@/lib/tarifs/vie";
import { toast } from "sonner";
import { HeartPulse, Save } from "lucide-react";

interface Props { basePath: string }

export default function NouvelleCotationVie({ basePath }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [client, setClient] = useState<ClientLite | null>(null);

  const [produit, setProduit] = useState<ProduitVie>("epargne");
  const [age, setAge] = useState(35);
  const [capital, setCapital] = useState(5_000_000);
  const [duree, setDuree] = useState<DureeVie>(10);
  const [mode, setMode] = useState<ModeVie>("annuel");
  const [bNom, setBNom] = useState("");
  const [bLien, setBLien] = useState("");
  const [bPct, setBPct] = useState(100);
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
    () => coterVie({
      produit, age, capital, dureeAnnees: duree, mode,
      beneficiaire: bNom ? { nom: bNom, lien: bLien, pourcentage: bPct } : undefined,
    }),
    [produit, age, capital, duree, mode, bNom, bLien, bPct],
  );

  const projection = useMemo(() => {
    const steps = Array.from(new Set([1, 5, Math.max(1, Math.round(duree / 2)), Math.max(1, duree - 1), duree]))
      .filter((n) => n >= 1 && n <= duree)
      .sort((a, b) => a - b);
    return steps.map((annee) => ({
      annee,
      primeCumulee: (result.primeAnnuelle + result.taxe) * annee,
      capital: result.capitalGaranti,
    }));
  }, [duree, result]);

  const submit = async () => {
    if (!user) return toast.error("Non authentifié");
    if (!companyId) return toast.error("Sélectionnez une compagnie");
    if (!client?.full_name) return toast.error("Sélectionnez ou créez un client");
    setSaving(true);
    try {
      const clientId = client.id ?? await ensureClient(
        { full_name: client.full_name, phone: client.phone ?? "", email: client.email ?? "" },
        companyId, user.id, "agent",
      );
      const { data, error } = await supabase.from("quotes").insert({
        company_id: companyId, client_id: clientId, type: "vie",
        created_by: user.id, status: "brouillon",
        payload: { input: { produit, age, capital, dureeAnnees: duree, mode, beneficiaire: bNom ? { nom: bNom, lien: bLien, pourcentage: bPct } : null }, result } as never,
        breakdown: result as never,
        base_premium: result.primeAnnuelle,
        taxes: result.taxe,
        total_premium: result.primeAnnuelle + result.taxe,
        duration_days: duree * 365,
      }).select("id").single();
      if (error) throw error;
      toast.success("Cotation enregistrée");
      navigate(`${basePath}/cotations/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Nouvelle cotation Vie" description="Calcul en temps réel de la prime selon l'âge, le capital et la durée." />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Colonne gauche */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <Label>Produit</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRODUITS_VIE.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setProduit(p.code)}
                  className={`text-left p-3 rounded-lg border-2 transition ${produit === p.code ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <HeartPulse className="h-4 w-4 text-primary" /> {p.label}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Capital souhaité</Label>
              <span className="text-sm font-semibold text-primary">{formatFCFA(capital)}</span>
            </div>
            <Slider
              value={[capital]}
              min={1_000_000}
              max={100_000_000}
              step={1_000_000}
              onValueChange={(v) => setCapital(v[0])}
            />
            <Input
              type="number"
              value={capital}
              min={1_000_000}
              max={100_000_000}
              step={1_000_000}
              onChange={(e) => setCapital(Math.max(1_000_000, Math.min(100_000_000, +e.target.value || 0)))}
            />
          </Card>

          <Card className="p-4 grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Âge du souscripteur</Label>
              <Input type="number" min={18} max={75} value={age} onChange={(e) => setAge(Math.max(18, Math.min(75, +e.target.value || 18)))} />
            </div>
            <div className="space-y-1">
              <Label>Durée</Label>
              <Select value={String(duree)} onValueChange={(v) => setDuree(+v as DureeVie)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DUREES_VIE.map((d) => <SelectItem key={d} value={String(d)}>{d} ans</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fréquence</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as ModeVie)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODES_VIE.map((m) => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Bénéficiaire (optionnel)</h4>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom complet</Label>
                <Input value={bNom} onChange={(e) => setBNom(e.target.value)} placeholder="MBONGO Awa" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lien de parenté</Label>
                <Input value={bLien} onChange={(e) => setBLien(e.target.value)} placeholder="conjoint, enfant…" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pourcentage (%)</Label>
                <Input type="number" min={0} max={100} value={bPct} onChange={(e) => setBPct(+e.target.value || 0)} />
              </div>
            </div>
          </Card>

          <div className="space-y-1">
            <Label>Compagnie</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <ClientSelector companyId={companyId} value={client} onChange={setClient} />
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Votre prime</p>
              <p className="font-display text-4xl font-bold text-primary">{formatFCFA(result.primeAnnuelle)}</p>
              <p className="text-xs text-muted-foreground">par an</p>
            </div>
            <div className="border-t pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Prime {MODES_VIE.find((m) => m.code === mode)?.label.toLowerCase()}</span><strong>{formatFCFA(result.primePeriodique)}</strong></div>
              <div className="flex justify-between text-muted-foreground"><span>Durée</span><span>{duree} ans</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Capital garanti</span><span>{formatFCFA(result.capitalGaranti)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Taxe (3%)</span><span>{formatFCFA(result.taxe)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Frais de dossier</span><span>{formatFCFA(result.fraisDossier)}</span></div>
              <div className="flex justify-between border-t pt-2 mt-2"><strong>Coût total sur {duree} ans</strong><strong>{formatFCFA(result.coutTotal)}</strong></div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium text-sm mb-2">Projection</h4>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left py-1">Année</th><th className="text-right">Prime cumulée</th><th className="text-right">Capital garanti</th></tr>
              </thead>
              <tbody>
                {projection.map((p) => (
                  <tr key={p.annee} className="border-b last:border-0">
                    <td className="py-1.5">An {p.annee}</td>
                    <td className="text-right">{formatFCFA(p.primeCumulee)}</td>
                    <td className="text-right">{formatFCFA(p.capital)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Button size="lg" className="w-full" onClick={submit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Enregistrer la cotation
          </Button>
        </div>
      </div>
    </div>
  );
}