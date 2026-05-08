import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface Row {
  id: string;
  contract_number: string;
  type: string;
  status: string;
  renewal_status: string;
  total_premium: number;
  start_date: string;
  end_date: string;
  client_id: string;
  company_id: string;
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export default function Renouvellements({ basePath }: { basePath: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contracts")
      .select("id,contract_number,type,status,renewal_status,total_premium,start_date,end_date,client_id,company_id")
      .order("end_date", { ascending: true })
      .limit(500);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const renouveler = async (c: Row) => {
    const newStart = new Date(c.end_date);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(newStart);
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    const { data: numData, error: numErr } = await supabase.rpc("next_contract_number", {
      _company_id: c.company_id,
      _product: c.type as "auto" | "voyage" | "risques_divers",
    });
    if (numErr || !numData) { toast.error(numErr?.message ?? "Numéro indisponible"); return; }
    const { data: orig } = await supabase.from("contracts").select("*").eq("id", c.id).maybeSingle();
    if (!orig) return;
    const { error } = await supabase.from("contracts").insert({
      contract_number: numData as string,
      type: c.type as "auto" | "voyage" | "risques_divers",
      status: "actif",
      total_premium: c.total_premium,
      start_date: newStart.toISOString().slice(0, 10),
      end_date: newEnd.toISOString().slice(0, 10),
      client_id: c.client_id,
      company_id: c.company_id,
      renewal_status: "renouvele",
      renewed_from_id: c.id,
      commercial_nature: "renouvellement",
      prime_nette: orig.prime_nette,
      prime_brute: orig.prime_brute,
      accessoires: orig.accessoires,
      reduction: orig.reduction,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("contracts").update({ renewal_status: "renouvele" }).eq("id", c.id);
    toast.success(`Contrat renouvelé : ${numData}`);
    load();
  };

  const expiringSoon = rows.filter((r) => {
    const d = daysUntil(r.end_date);
    return d >= 0 && d <= 60 && r.renewal_status === "actif" && r.status === "actif";
  });
  const expired = rows.filter((r) => daysUntil(r.end_date) < 0 && r.renewal_status === "actif");
  const renewed = rows.filter((r) => r.renewal_status === "renouvele");

  const renderRow = (r: Row, withAction: boolean) => {
    const d = daysUntil(r.end_date);
    return (
      <div key={r.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
        <div>
          <Link to={`${basePath}/contrats/${r.id}`} className="font-mono font-medium hover:underline">
            {r.contract_number}
          </Link>
          <div className="text-xs text-muted-foreground">
            {r.type.toUpperCase()} • Échéance : {new Date(r.end_date).toLocaleDateString("fr-FR")} •{" "}
            <span className={d < 0 ? "text-destructive font-medium" : d <= 30 ? "text-orange-500 font-medium" : ""}>
              {d < 0 ? `expiré depuis ${-d} j` : `dans ${d} j`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm">{formatFCFA(r.total_premium)}</span>
          <Badge variant={r.renewal_status === "renouvele" ? "default" : "secondary"}>{r.renewal_status}</Badge>
          {withAction && (
            <Button size="sm" onClick={() => renouveler(r)}>
              <RefreshCw className="h-3 w-3 mr-1" /> Renouveler
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Renouvellements" description="Pilotez les contrats expirant et automatisez leur reconduction." />
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>
      ) : (
        <Tabs defaultValue="expiring">
          <TabsList>
            <TabsTrigger value="expiring">À échoir ({expiringSoon.length})</TabsTrigger>
            <TabsTrigger value="expired">Expirés ({expired.length})</TabsTrigger>
            <TabsTrigger value="renewed">Renouvelés ({renewed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="expiring">
            <Card>{expiringSoon.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Aucun contrat n'arrive à échéance dans les 60 jours.</div> : expiringSoon.map((r) => renderRow(r, true))}</Card>
          </TabsContent>
          <TabsContent value="expired">
            <Card>{expired.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Aucun contrat expiré non renouvelé.</div> : expired.map((r) => renderRow(r, true))}</Card>
          </TabsContent>
          <TabsContent value="renewed">
            <Card>{renewed.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Aucun renouvellement enregistré.</div> : renewed.map((r) => renderRow(r, false))}</Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}