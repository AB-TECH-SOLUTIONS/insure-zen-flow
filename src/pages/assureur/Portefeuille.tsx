import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { formatFCFA } from "@/lib/format";
import { FileCheck, AlertTriangle, Users, TrendingUp } from "lucide-react";

export default function Portefeuille() {
  const { primaryCompanyId } = useAuth();
  const [stats, setStats] = useState({ contrats: 0, ca: 0, sinistres: 0, clients: 0, parProduit: {} as Record<string, { n: number; ca: number }> });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!primaryCompanyId) return;
    (async () => {
      const [{ data: contrats }, { data: claims }, { data: clients }] = await Promise.all([
        supabase.from("contracts").select("type,total_premium,status").eq("company_id", primaryCompanyId),
        supabase.from("claims").select("id,status").eq("company_id", primaryCompanyId),
        supabase.from("clients").select("id").eq("company_id", primaryCompanyId),
      ]);
      const parProduit: Record<string, { n: number; ca: number }> = {};
      let ca = 0;
      (contrats ?? []).forEach((c) => {
        ca += Number(c.total_premium ?? 0);
        const t = c.type as string;
        parProduit[t] = parProduit[t] || { n: 0, ca: 0 };
        parProduit[t].n += 1;
        parProduit[t].ca += Number(c.total_premium ?? 0);
      });
      setStats({
        contrats: contrats?.length ?? 0, ca, sinistres: claims?.length ?? 0,
        clients: clients?.length ?? 0, parProduit,
      });
      setLoading(false);
    })();
  }, [primaryCompanyId]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Portefeuille" description="Vue 360° de votre compagnie : production, sinistralité, clients." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Contrats" value={String(stats.contrats)} icon={FileCheck} />
        <StatCard title="Chiffre d'affaires" value={formatFCFA(stats.ca)} icon={TrendingUp} />
        <StatCard title="Sinistres" value={String(stats.sinistres)} icon={AlertTriangle} />
        <StatCard title="Clients" value={String(stats.clients)} icon={Users} />
      </div>
      <Card className="p-6">
        <h3 className="font-display font-semibold mb-4">Répartition par produit</h3>
        <div className="space-y-3">
          {Object.entries(stats.parProduit).map(([t, v]) => {
            const pct = stats.ca > 0 ? Math.round((v.ca / stats.ca) * 100) : 0;
            return (
              <div key={t}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{t.toUpperCase()}</span>
                  <span className="text-muted-foreground">{v.n} contrats • {formatFCFA(v.ca)} ({pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {Object.keys(stats.parProduit).length === 0 && <div className="text-sm text-muted-foreground">Aucune donnée.</div>}
        </div>
      </Card>
    </div>
  );
}