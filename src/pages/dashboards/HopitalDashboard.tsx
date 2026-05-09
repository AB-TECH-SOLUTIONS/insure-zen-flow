import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { FileCheck, LineChart, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA } from "@/lib/format";

type HC = { id: string; type_soin: string; montant_soins: number; statut: string; created_at: string };

export default function HopitalDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ mois: 0, montant: 0, attente: 0 });
  const [recent, setRecent] = useState<HC[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("health_claims").select("*")
        .eq("hopital_user_id", user.id).order("created_at", { ascending: false });
      const all = (data ?? []) as unknown as HC[];
      const now = new Date();
      const thisMonth = all.filter((h) => {
        const d = new Date(h.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      setStats({
        mois: thisMonth.length,
        montant: thisMonth.reduce((s, h) => s + Number(h.montant_soins), 0),
        attente: all.filter((h) => h.statut === "en_attente").length,
      });
      setRecent(all.slice(0, 5));
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader title="Hôpital — Tableau de bord" description="Suivi de vos dossiers tiers payant." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Dossiers ce mois" value={stats.mois} icon={Briefcase} accent="primary" />
        <StatCard label="Montant soins" value={formatFCFA(stats.montant)} icon={LineChart} accent="info" />
        <StatCard label="En attente remboursement" value={stats.attente} icon={FileCheck} accent="warning" />
      </div>
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-3">Derniers dossiers</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun dossier.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((h) => (
              <li key={h.id} className="border-b pb-2 flex justify-between">
                <span>{h.type_soin}</span>
                <span>{formatFCFA(Number(h.montant_soins))}</span>
                <span className="text-xs text-muted-foreground">{h.statut}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}