import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import { formatFCFA } from "@/lib/format";

type Row = {
  id: string;
  amount: number;
  rate: number;
  status: string;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  contract_id: string | null;
};

export default function MesCommissions() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("commission_reversals")
        .select("id,amount,rate,status,paid_at,note,created_at,contract_id")
        .eq("beneficiary_user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    const paid = rows.filter(r => r.status === "paye").reduce((s, r) => s + Number(r.amount), 0);
    const pending = rows.filter(r => r.status === "a_payer").reduce((s, r) => s + Number(r.amount), 0);
    return { total, paid, pending };
  }, [rows]);

  if (loading) return <p className="text-muted-foreground p-6">Chargement…</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Mes commissions" description="Historique de vos rétrocessions de commission." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total" value={formatFCFA(stats.total)} icon={Wallet} accent="primary" />
        <StatCard label="Payé" value={formatFCFA(stats.paid)} icon={CheckCircle2} accent="success" />
        <StatCard label="À payer" value={formatFCFA(stats.pending)} icon={Clock} accent="warning" />
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Aucune commission enregistrée.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Taux</th>
                  <th className="p-3 text-right">Montant</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="p-3 text-right tabular-nums">{Number(r.rate).toFixed(2)}%</td>
                    <td className="p-3 text-right tabular-nums">{formatFCFA(Number(r.amount))}</td>
                    <td className="p-3"><Badge variant={r.status === "paye" ? "secondary" : "outline"}>{r.status.replace("_", " ")}</Badge></td>
                    <td className="p-3 text-muted-foreground">{r.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
