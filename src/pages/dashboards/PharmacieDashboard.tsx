import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { ScrollText, LineChart, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA } from "@/lib/format";

type PC = { id: string; montant_total: number; statut: string; created_at: string };

export default function PharmacieDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ mois: 0, montant: 0, attente: 0 });
  const [recent, setRecent] = useState<PC[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("pharmacie_claims").select("*")
        .eq("pharmacie_user_id", user.id).order("created_at", { ascending: false });
      const all = (data ?? []) as unknown as PC[];
      const now = new Date();
      const m = all.filter((p) => {
        const d = new Date(p.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      setStats({
        mois: m.length,
        montant: m.reduce((s, p) => s + Number(p.montant_total), 0),
        attente: all.filter((p) => p.statut === "en_attente").length,
      });
      setRecent(all.slice(0, 5));
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pharmacie — Tableau de bord" description="Suivi de vos dispensations." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ordonnances ce mois" value={stats.mois} icon={ScrollText} accent="primary" />
        <StatCard label="Montant total médicaments" value={formatFCFA(stats.montant)} icon={LineChart} accent="info" />
        <StatCard label="En attente remboursement" value={stats.attente} icon={FileCheck} accent="warning" />
      </div>
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-3">Dernières dispensations</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dispensation.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((p) => (
              <li key={p.id} className="border-b pb-2 flex justify-between">
                <span>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                <span>{formatFCFA(Number(p.montant_total))}</span>
                <span className="text-xs text-muted-foreground">{p.statut}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}