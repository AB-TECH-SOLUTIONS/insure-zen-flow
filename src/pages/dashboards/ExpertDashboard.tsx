import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, LineChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA } from "@/lib/format";

type Claim = { id: string; claim_number: string; description: string | null; status: string };

export default function ExpertDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({ missions: 0, rapports: 0, valeur: 0 });
  const [recent, setRecent] = useState<Claim[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: claims } = await supabase.from("claims").select("*")
        .eq("assigned_expert_id", user.id).order("occurred_at", { ascending: false });
      const all = (claims ?? []) as Claim[];
      const missions = all.filter((c) => c.status === "expertise").length;
      const { data: reps } = await supabase.from("expertise_reports").select("statut, valeur_avant")
        .eq("expert_user_id", user.id);
      const list = (reps ?? []) as { statut: string; valeur_avant: number | null }[];
      const rapports = list.filter((r) => r.statut === "soumis").length;
      const valeur = list.reduce((s, r) => s + Number(r.valeur_avant ?? 0), 0);
      setStats({ missions, rapports, valeur });
      setRecent(all.slice(0, 5));
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader title="Expert CIMA — Tableau de bord" description="Vos missions et rapports d'expertise." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Missions en cours" value={stats.missions} icon={Briefcase} accent="primary" />
        <StatCard label="Rapports soumis" value={stats.rapports} icon={FileText} accent="success" />
        <StatCard label="Valeur totale évaluée" value={formatFCFA(stats.valeur)} icon={LineChart} accent="info" />
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Dernières missions</h2>
          <Button variant="outline" onClick={() => nav("/expert/missions")}>Voir toutes mes missions</Button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune mission.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((c) => (
              <li key={c.id} className="border-b pb-2 flex justify-between">
                <span className="font-mono text-xs">{c.claim_number}</span>
                <span className="truncate flex-1 mx-3">{c.description}</span>
                <span className="text-xs text-muted-foreground">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}