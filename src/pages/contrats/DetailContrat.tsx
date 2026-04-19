import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Ban, CheckCircle2, Pause } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

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
}

export default function DetailContrat({ basePath }: { basePath: string }) {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<ContractFull | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("contracts").select("*").eq("id", id).maybeSingle();
    if (!data) {
      setLoading(false);
      return;
    }
    setContract(data as ContractFull);
    const [{ data: comp }, { data: cli }] = await Promise.all([
      supabase.from("companies").select("name").eq("id", data.company_id).maybeSingle(),
      supabase.from("clients").select("full_name").eq("id", data.client_id).maybeSingle(),
    ]);
    setCompanyName(comp?.name ?? "");
    setClientName(cli?.full_name ?? "—");
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
        <Card className="lg:col-span-2 p-6 space-y-4">
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

        <Card className="p-4 space-y-2">
          <h4 className="text-sm font-medium mb-2">Actions</h4>
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
