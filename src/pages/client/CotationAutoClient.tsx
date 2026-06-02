import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DocumentScanner } from "@/components/scan/DocumentScanner";
import { ensureClient } from "@/lib/clients";
import { coter, defaultOverrides, type AutoInput } from "@/lib/tarifs/moteurAuto";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, Edit, ArrowLeft, Save, Trophy } from "lucide-react";

const DUREES = [
  { mois: 1, label: "1 mois" },
  { mois: 3, label: "3 mois" },
  { mois: 6, label: "6 mois" },
  { mois: 12, label: "1 an" },
];

const GARANTIES_CLIENT = [
  { key: "dommages", label: "Protection accidents", desc: "Couvre les dommages à votre véhicule" },
  { key: "volBraquage", label: "Vol & braquage", desc: "Indemnisation en cas de vol" },
  { key: "brisDeGlaces", label: "Bris de vitres", desc: "Pare-brise, vitres latérales" },
  { key: "incendie", label: "Incendie", desc: "Dégâts liés au feu" },
  { key: "protectionConducteur", label: "Protection du conducteur", desc: "Couvre vos blessures" },
  { key: "ipt", label: "Assistance routière", desc: "Dépannage et remorquage" },
] as const;

export default function CotationAutoClient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [companies, setCompanies] = useState<{ id: string; name: string; code: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [veh, setVeh] = useState({
    immatriculation: "", marque: "", modele: "",
    cv: 7, places: 5, valeur: 5_000_000,
  });
  const [editVeh, setEditVeh] = useState(false);
  const [niu, setNiu] = useState("");
  const [duree, setDuree] = useState(12);
  const [garanties, setGaranties] = useState<Record<string, boolean>>({
    dommages: true, volBraquage: false, brisDeGlaces: true,
    incendie: true, protectionConducteur: true, ipt: false,
  });

  useEffect(() => {
    supabase.from("companies").select("id,name,code").eq("is_active", true).order("name").then(({ data }) => {
      const list = data ?? [];
      setCompanies(list as typeof companies);
      if (list[0]) setCompanyId(list[0].id);
    });
  }, []);

  const result = useMemo(() => {
    const input: AutoInput = {
      compagnie: "AUTRE", categorie: "cat1", cv: veh.cv, zone: "A",
      energie: "essence", places: veh.places, chargeUtileKg: 0,
      valeurNeuve: veh.valeur, valeurVenale: veh.valeur,
      immatriculation: veh.immatriculation, marque: veh.marque, modele: veh.modele,
      garanties: {
        rc: true, defenseRecours: false,
        ipt: garanties.ipt, iptOption: "I",
        dommages: garanties.dommages, brisDeGlaces: garanties.brisDeGlaces,
        incendie: garanties.incendie, volSimple: false,
        volBraquage: garanties.volBraquage, tierceCollision: false,
        protectionConducteur: garanties.protectionConducteur,
        carteRoseCEMAC: false,
      },
      reductionRcPct: 0, dureeMois: duree,
    };
    return coter(input, defaultOverrides());
  }, [veh, duree, garanties]);

  // Comparateur multi-compagnies : variation déterministe par code compagnie
  const offers = useMemo(() => {
    const base = result.primeTTC;
    return companies.map((c) => {
      const hash = c.code.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const variation = ((hash % 17) - 8) / 100; // -8% à +8%
      const prime = Math.round(base * (1 + variation));
      return { id: c.id, name: c.name, code: c.code, prime };
    }).sort((a, b) => a.prime - b.prime);
  }, [companies, result.primeTTC]);

  useEffect(() => { if (offers[0] && !selectedCompany) setSelectedCompany(offers[0].id); }, [offers, selectedCompany]);

  const onScan = (extracted: Record<string, unknown>) => {
    setVeh((v) => ({
      ...v,
      immatriculation: (extracted.immatriculation as string) || v.immatriculation,
      marque: (extracted.marque as string) || v.marque,
      modele: (extracted.modele as string) || v.modele,
      cv: (extracted.puissance_cv as number) || v.cv,
      places: (extracted.places as number) || v.places,
    }));
  };

  const submit = async () => {
    const chosen = selectedCompany || companyId;
    if (!user || !chosen) return toast.error("Compagnie manquante");
    const finalPrime = offers.find(o => o.id === chosen)?.prime ?? result.primeTTC;
    try {
      const profile = await supabase.from("profiles").select("full_name,phone").eq("user_id", user.id).maybeSingle();
      const clientId = await ensureClient(
        { full_name: profile.data?.full_name || user.email || "Client", phone: profile.data?.phone || "" },
        chosen, user.id, "client",
      );
      const { data, error } = await supabase.from("quotes").insert({
        company_id: chosen, client_id: clientId, type: "auto",
        created_by: user.id, status: "brouillon",
        payload: { veh, duree, garanties, niu } as never,
        breakdown: result as never,
        base_premium: result.primeNette, taxes: result.tva, total_premium: finalPrime,
        duration_days: duree * 30,
      }).select("id").single();
      if (error) throw error;
      toast.success("Demande envoyée — un conseiller vous contacte sous 24h");
      navigate(`/client/cotations/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const vehResume = veh.marque || veh.modele || veh.immatriculation
    ? `${veh.marque} ${veh.modele} — ${veh.cv}CV — Immat: ${veh.immatriculation || "?"}`
    : "Aucun véhicule renseigné";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Devis auto en 2 minutes" description="Scannez vos documents, on s'occupe du reste." />

      {/* stepper */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step === 1 ? "default" : "outline"}>1. Vos documents</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === 2 ? "default" : "outline"}>2. Votre cotation</Badge>
      </div>

      {step === 1 && (
        <>
          <Card className="p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">📷 Scannez vos documents</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <DocumentScanner docType="carte_grise" label="Carte grise" onExtracted={onScan} />
              <DocumentScanner docType="permis" label="Permis de conduire" onExtracted={onScan} />
              <DocumentScanner docType="cni" label="Carte d'identité" onExtracted={onScan} />
            </div>
            <div className="space-y-2">
              <Label>NIU (optionnel)</Label>
              <Input value={niu} onChange={(e) => setNiu(e.target.value)} placeholder="Numéro d'identifiant unique" />
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Véhicule détecté</p>
                <p className="font-medium">{vehResume}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditVeh((v) => !v)}>
                <Edit className="h-3 w-3 mr-1" /> Modifier
              </Button>
            </div>
            {editVeh && (
              <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t">
                <div><Label>Immatriculation</Label><Input value={veh.immatriculation} onChange={(e) => setVeh({ ...veh, immatriculation: e.target.value })} /></div>
                <div><Label>Marque</Label><Input value={veh.marque} onChange={(e) => setVeh({ ...veh, marque: e.target.value })} /></div>
                <div><Label>Modèle</Label><Input value={veh.modele} onChange={(e) => setVeh({ ...veh, modele: e.target.value })} /></div>
                <div><Label>Puissance (CV)</Label><Input type="number" value={veh.cv} onChange={(e) => setVeh({ ...veh, cv: +e.target.value })} /></div>
                <div><Label>Nombre de places</Label><Input type="number" value={veh.places} onChange={(e) => setVeh({ ...veh, places: +e.target.value })} /></div>
                <div><Label>Valeur du véhicule (FCFA)</Label><Input type="number" value={veh.valeur} onChange={(e) => setVeh({ ...veh, valeur: +e.target.value })} /></div>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-display text-lg font-semibold">Durée de couverture</h3>
            <div className="grid grid-cols-4 gap-2">
              {DUREES.map((d) => (
                <button key={d.mois} onClick={() => setDuree(d.mois)}
                  className={`p-3 rounded-lg border-2 transition ${duree === d.mois ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="font-semibold">{d.label}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="font-display text-lg font-semibold">Garanties</h3>
            <p className="text-xs text-muted-foreground">La Responsabilité Civile est incluse d'office (obligatoire).</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {GARANTIES_CLIENT.map((g) => {
                const active = garanties[g.key];
                return (
                  <button key={g.key} onClick={() => setGaranties({ ...garanties, [g.key]: !active })}
                    className={`p-3 text-left rounded-lg border-2 transition ${active ? "border-primary bg-primary/5" : "border-border"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{g.label}</div>
                      {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{g.desc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Button size="lg" className="w-full" onClick={() => setStep(2)}>
            Voir ma cotation <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <Card className="p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold">Votre estimation</h3>
            <div className="space-y-2">
              {GARANTIES_CLIENT.filter((g) => garanties[g.key]).map((g) => (
                <div key={g.key} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{g.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Comparez les compagnies</h3>
              <span className="text-xs text-muted-foreground">{DUREES.find((d) => d.mois === duree)?.label}</span>
            </div>
            <div className="grid gap-2">
              {offers.map((o, i) => {
                const active = selectedCompany === o.id;
                return (
                  <button key={o.id} onClick={() => setSelectedCompany(o.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 text-left transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <div className="flex items-center gap-3">
                      {i === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                      <div>
                        <p className="font-medium text-sm">{o.name}</p>
                        {i === 0 && <p className="text-xs text-amber-600">Meilleure offre</p>}
                      </div>
                    </div>
                    <p className="font-display text-lg font-bold text-primary">{formatFCFA(o.prime)}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Modifier</Button>
            <Button onClick={submit} size="lg"><Save className="h-4 w-4 mr-2" /> Demander un devis officiel</Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Estimation indicative. Le devis officiel sera validé par un conseiller agréé sous 24h.
          </p>
        </>
      )}
    </div>
  );
}