import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, FileCheck, LineChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA } from "@/lib/format";

type GQ = { id: string; claim_id: string; statut: string; montant_total: number; created_at: string };

export default function GarageDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({ actifs: 0, soumis: 0, acceptes: 0, ca: 0 });
  const [recent, setRecent] = useState<GQ[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count: actifs } = await supabase.from("claims").select("id", { count: "exact", head: true })
        .eq("assigned_garage_id", user.id).eq("status", "expertise");
      const { data: quotes } = await supabase.from("garage_quotes").select("*")
        .eq("garage_user_id", user.id).order("created_at", { ascending: false });
      const list = (quotes ?? []) as unknown as GQ[];
      const soumis = list.filter((q) => q.statut === "soumis").length;
      const acceptes = list.filter((q) => q.statut === "accepte");
      setStats({
        actifs: actifs ?? 0,
        soumis,
        acceptes: acceptes.length,
        ca: acceptes.reduce((s, q) => s + Number(q.montant_total ?? 0), 0),
      });
      setRecent(list.slice(0, 5));
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader title="Garage agréé — Tableau de bord" description="Vue d'ensemble de votre activité." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dossiers actifs" value={stats.actifs} icon={AlertTriangle} accent="primary" />
        <StatCard label="Devis soumis" value={stats.soumis} icon={FileText} accent="info" />
        <StatCard label="Devis acceptés" value={stats.acceptes} icon={FileCheck} accent="success" />
        <StatCard label="Chiffre d'affaires" value={formatFCFA(stats.ca)} icon={LineChart} accent="success" />
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Derniers devis</h2>
          <Button variant="outline" onClick={() => nav("/garage/sinistres")}>Voir tous les dossiers</Button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun devis pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b pb-2 text-sm">
                <span className="font-mono text-xs">{q.claim_id.slice(0, 8)}</span>
                <Badge variant="outline">{q.statut}</Badge>
                <span>{formatFCFA(Number(q.montant_total))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}