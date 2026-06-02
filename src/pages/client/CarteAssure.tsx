import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "@/components/QrCode";
import { formatFCFA } from "@/lib/format";
import { ShieldCheck } from "lucide-react";

type Row = {
  id: string;
  contract_number: string;
  type: string;
  status: string;
  end_date: string;
  total_premium: number;
  attestation_number: string | null;
  client: { full_name: string } | null;
  company: { name: string; primary_color: string | null } | null;
};

export default function CarteAssure() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cli } = await supabase.from("clients").select("id").eq("client_user_id", user.id).maybeSingle();
      if (!cli) { setLoading(false); return; }
      const { data } = await supabase
        .from("contracts")
        .select("id,contract_number,type,status,end_date,total_premium,attestation_number,client:clients(full_name),company:companies(name,primary_color)")
        .eq("client_id", cli.id)
        .eq("status", "actif");
      setRows((data as unknown as Row[]) || []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <p className="text-muted-foreground p-6">Chargement…</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Ma carte d'assuré" description="Présentez ce QR code pour faire vérifier votre couverture." />
      {rows.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">Aucun contrat actif.</Card>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        {rows.map((c) => {
          const verifyUrl = `${window.location.origin}/autorite/verification?police=${encodeURIComponent(c.contract_number)}`;
          const color = c.company?.primary_color ?? "#0EA5E9";
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="p-4 text-white flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${color}, #111)` }}>
                <div>
                  <p className="text-xs opacity-80">Carte d'assuré</p>
                  <p className="font-display font-bold">{c.company?.name ?? "—"}</p>
                </div>
                <ShieldCheck className="h-6 w-6 opacity-80" />
              </div>
              <div className="p-4 flex gap-4">
                <QrCode value={verifyUrl} size={120} />
                <div className="text-sm space-y-1 flex-1">
                  <p className="font-semibold">{c.client?.full_name}</p>
                  <p className="text-xs text-muted-foreground">N° police</p>
                  <p className="font-mono text-xs">{c.contract_number}</p>
                  <p className="text-xs text-muted-foreground mt-2">Échéance</p>
                  <p>{new Date(c.end_date).toLocaleDateString("fr-FR")}</p>
                  <Badge className="mt-2 capitalize" variant="secondary">{c.type}</Badge>
                </div>
              </div>
              <div className="px-4 pb-3 text-xs text-muted-foreground flex justify-between">
                <span>Prime annuelle</span>
                <span className="tabular-nums">{formatFCFA(Number(c.total_premium))}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
