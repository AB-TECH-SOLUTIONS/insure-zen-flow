import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, BarChart3, Users, Stamp, Wallet, TrendingUp } from "lucide-react";
import { useFinanceStats } from "@/hooks/useFinanceStats";
import { formatFCFA } from "@/lib/format";

export default function AssureurDashboard() {
  const f = useFinanceStats();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilotage compagnie"
        description="Vue d'ensemble de votre portefeuille."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CA mois" value={formatFCFA(f.caMonth)} icon={BarChart3} accent="primary" />
        <StatCard label="CA année" value={formatFCFA(f.caYear)} icon={TrendingUp} accent="success" />
        <StatCard label="À encaisser" value={formatFCFA(f.pending)} icon={Wallet} accent="warning" />
        <StatCard label="Contrats actifs" value={f.contractsActive} icon={FileCheck} accent="info" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Réseau</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Agents et courtiers affiliés à votre compagnie.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Stamp className="h-4 w-4" />Stock attestations</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Aucun stock enregistré.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
