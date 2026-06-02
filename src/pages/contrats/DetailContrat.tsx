import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Ban, CheckCircle2, Pause } from "lucide-react";
import { FileText, IdCard, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { generateCP } from "@/lib/pdf/generateCP";
import { generateCarteRose } from "@/lib/pdf/generateCarteRose";
import { generateRecu } from "@/lib/pdf/generateRecu";
import { montantEnLettres } from "@/lib/pdf/montantEnLettres";

type ContractStatus = Database["public"]["Enums"]["contract_status"];

interface ContractFull {
  id: string;
  contract_number: string;
  type: string;
  status: ContractStatus;
  total_premium: number;
  start_date: string;
  end_date: string;
  attestation_number: string | null;
  client_id: string;
  company_id: string;
  quote_id: string | null;
  created_at: string;
  prime_nette?: number | null;
  prime_brute?: number | null;
  accessoires?: number | null;
  reduction?: number | null;
}

export default function DetailContrat({ basePath }: { basePath: string }) {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<ContractFull | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyColor, setCompanyColor] = useState("#0EA5E9");
  const [clientName, setClientName] = useState("");
  const [clientFull, setClientFull] = useState<{ full_name: string; phone?: string | null; address?: string | null; profession?: string | null; id?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [avenants, setAvenants] = useState<Array<{ id: string; avenant_number: string; type: string; description: string | null; effective_date: string; prime_avant: number | null; prime_apres: number | null; delta_prime: number | null }>>([]);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("contracts").select("*").eq("id", id).maybeSingle();
    if (!data) {
      setLoading(false);
      return;
    }
    setContract(data as ContractFull);
    const [{ data: comp }, { data: cli }] = await Promise.all([
      supabase.from("companies").select("name,primary_color").eq("id", data.company_id).maybeSingle(),
      supabase.from("clients").select("id,full_name,phone,address,profession").eq("id", data.client_id).maybeSingle(),
    ]);
    setCompanyName(comp?.name ?? "");
    setCompanyColor((comp as { primary_color?: string } | null)?.primary_color ?? "#0EA5E9");
    setClientName(cli?.full_name ?? "—");
    setClientFull(cli as typeof clientFull);
    const { data: av } = await supabase
      .from("avenants")
      .select("id,avenant_number,type,description,effective_date,prime_avant,prime_apres,delta_prime")
      .eq("contract_id", id)
      .order("effective_date", { ascending: false });
    setAvenants((av as typeof avenants) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setStatus = async (status: ContractStatus) => {
    if (!contract) return;
    const { error } = await supabase.from("contracts").update({ status }).eq("id", contract.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContract({ ...contract, status });
    toast.success(`Contrat ${status}`);
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  if (!contract) return <div className="p-6">Contrat introuvable.</div>;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");

  const downloadCP = async () => {
    if (!contract || !clientFull) return;
    let vehData: { registration: string; brand: string; model: string; fiscal_power: number; energy: string; seats: number; new_value: number; market_value: number; vin?: string; first_registration_date?: string; category: string } | null = null;
    if (contract.type === "auto") {
      const { data: vs } = await supabase.from("vehicles").select("*").eq("client_id", clientFull.id!).limit(1);
      const v = vs?.[0];
      if (v) vehData = {
        registration: v.registration ?? "—", brand: v.brand ?? "—", model: v.model ?? "",
        fiscal_power: v.fiscal_power ?? 0, energy: v.energy ?? "Essence", seats: v.seats ?? 5,
        new_value: Number(v.new_value ?? 0), market_value: Number(v.market_value ?? 0),
        vin: v.vin ?? undefined, first_registration_date: v.first_registration_date ?? undefined,
        category: v.category ?? "201",
      };
    }
    const primeNette = Number(contract.prime_nette ?? contract.total_premium * 0.84);
    const accessoires = Number(contract.accessoires ?? 2500);
    const dta = Math.round(primeNette * 0.04);
    const tva = Math.round((primeNette + accessoires) * 0.1925);
    const fichierCentral = 1500;
    const doc = generateCP({
      companyName, companyColor,
      policeNumber: contract.contract_number,
      quittanceNumber: contract.attestation_number ?? undefined,
      emissionDate: fmtDate(contract.created_at),
      souscripteur: { nom: clientFull.full_name, adresse: clientFull.address ?? undefined, tel: clientFull.phone ?? undefined, profession: clientFull.profession ?? undefined },
      effet: fmtDate(contract.start_date), expiration: fmtDate(contract.end_date), duree: "12 mois",
      vehicule: {
        immatriculation: vehData?.registration ?? "—", marque: vehData?.brand ?? "—", modele: vehData?.model ?? "",
        cv: vehData?.fiscal_power ?? 0, energie: vehData?.energy ?? "—", places: vehData?.seats ?? 0,
        valeurNeuve: vehData?.new_value ?? 0, valeurVenale: vehData?.market_value ?? 0,
        vin: vehData?.vin, dateMiseCirculation: vehData?.first_registration_date,
        zone: "1", categorie: vehData?.category ?? "201",
      },
      garanties: [{ nom: "Responsabilité civile", primeNette }],
      decompte: {
        primeNette, accessoires, fichierCentral, dta, tva,
        primeTTC: contract.total_premium,
      },
    });
    doc.save(`CP-${contract.contract_number}.pdf`);
  };

  const downloadCarteRose = async () => {
    if (!contract || !clientFull) return;
    const { data: vs } = await supabase.from("vehicles").select("*").eq("client_id", clientFull.id!).limit(1);
    const v = vs?.[0];
    const doc = generateCarteRose({
      policeNumber: contract.contract_number,
      souscripteur: clientFull.full_name, assure: clientFull.full_name,
      immatriculation: v?.registration ?? "—",
      marque: `${v?.brand ?? "—"} ${v?.model ?? ""}`.trim(),
      categorie: v?.category ?? "201", usage: v?.usage ?? "Tourisme",
      effet: fmtDate(contract.start_date), expiration: fmtDate(contract.end_date),
      companyName, companyColor,
    });
    doc.save(`CarteRose-${contract.contract_number}.pdf`);
  };

  const downloadRecu = () => {
    if (!contract || !clientFull) return;
    const doc = generateRecu({
      recuNumber: `R-${contract.contract_number}`, date: fmtDate(new Date().toISOString()),
      clientNom: clientFull.full_name, clientTel: clientFull.phone ?? undefined,
      policeNumber: contract.contract_number,
      montant: contract.total_premium, montantLettres: montantEnLettres(contract.total_premium),
      methode: "Espèces", companyName, companyColor,
    });
    doc.save(`Recu-${contract.contract_number}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={contract.contract_number}
        description={`${contract.type.toUpperCase()} — ${companyName} — ${clientName}`}
        actions={
          <Button variant="outline" asChild>
            <Link to={`${basePath}/contrats`}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="avenants">Avenants {avenants.length > 0 && `(${avenants.length})`}</TabsTrigger>
          </TabsList>
          <TabsContent value="info">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Informations</h3>
            <Badge
              variant={
                contract.status === "actif"
                  ? "default"
                  : contract.status === "resilie"
                    ? "destructive"
                    : "secondary"
              }
            >
              {contract.status}
            </Badge>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Date d'effet</div>
              <div>{new Date(contract.start_date).toLocaleDateString("fr-FR")}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Date d'échéance</div>
              <div>{new Date(contract.end_date).toLocaleDateString("fr-FR")}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Compagnie</div>
              <div>{companyName}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Client</div>
              <div>{clientName}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">N° attestation</div>
              <div>{contract.attestation_number ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Prime TTC</div>
              <div className="font-mono font-semibold text-primary">
                {formatFCFA(contract.total_premium)}
              </div>
            </div>
          </div>
          {contract.quote_id && (
            <Button variant="link" asChild className="px-0">
              <Link to={`${basePath}/cotations/${contract.quote_id}`}>
                Voir la cotation d'origine →
              </Link>
            </Button>
          )}
        </Card>
          </TabsContent>
          <TabsContent value="avenants">
            <Card className="p-6">
              {avenants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun avenant pour ce contrat.</p>
              ) : (
                <ul className="divide-y">
                  {avenants.map(a => (
                    <li key={a.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.avenant_number}</span>
                          <Badge variant="outline" className="capitalize">{a.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Effet : {new Date(a.effective_date).toLocaleDateString("fr-FR")}</p>
                        {a.description && <p className="text-sm mt-1">{a.description}</p>}
                      </div>
                      {a.delta_prime !== null && (
                        <div className="text-right text-sm">
                          <p className="text-xs text-muted-foreground">Δ Prime</p>
                          <p className={`font-mono font-semibold ${Number(a.delta_prime) >= 0 ? "text-primary" : "text-destructive"}`}>
                            {Number(a.delta_prime) >= 0 ? "+" : ""}{formatFCFA(Number(a.delta_prime))}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
        </div>

        <Card className="p-4 space-y-2">
          <h4 className="text-sm font-medium mb-2">Actions</h4>
          <Button onClick={downloadCP} variant="default" className="w-full">
            <FileText className="h-4 w-4 mr-2" /> Conditions particulières (PDF)
          </Button>
          {contract.type === "auto" && (
            <Button onClick={downloadCarteRose} variant="secondary" className="w-full">
              <IdCard className="h-4 w-4 mr-2" /> Carte Rose CEMAC (PDF)
            </Button>
          )}
          <Button onClick={downloadRecu} variant="outline" className="w-full">
            <Receipt className="h-4 w-4 mr-2" /> Reçu de règlement (PDF)
          </Button>
          <Separator className="my-2" />
          {contract.status !== "actif" && (
            <Button onClick={() => setStatus("actif")} variant="outline" className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Activer
            </Button>
          )}
          {contract.status === "actif" && (
            <Button onClick={() => setStatus("suspendu")} variant="outline" className="w-full">
              <Pause className="h-4 w-4 mr-2" /> Suspendre
            </Button>
          )}
          {contract.status !== "resilie" && (
            <Button onClick={() => setStatus("resilie")} variant="destructive" className="w-full">
              <Ban className="h-4 w-4 mr-2" /> Résilier
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
