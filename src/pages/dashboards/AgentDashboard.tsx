import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileCheck, TrendingUp, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFinanceStats } from "@/hooks/useFinanceStats";
import { formatFCFA } from "@/lib/format";

export default function AgentDashboard() {
  const f = useFinanceStats();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord agent"
        description="Suivez votre production et votre portefeuille."
        actions={
          <Button asChild className="bg-gradient-primary shadow-glow">
            <Link to="/agent/cotations/nouvelle"><Plus className="h-4 w-4" /> Nouvelle cotation</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CA encaissé (mois)" value={formatFCFA(f.caMonth)} icon={TrendingUp} accent="success" hint="paiements encaissés ce mois" />
        <StatCard label="CA encaissé (année)" value={formatFCFA(f.caYear)} icon={TrendingUp} accent="primary" />
        <StatCard label="À encaisser" value={formatFCFA(f.pending)} icon={Wallet} accent="warning" />
        <StatCard label="Contrats actifs" value={f.contractsActive} icon={FileCheck} accent="info" />
      </div>

      <Card>
        <CardHeader><CardTitle>Production</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Détail des transactions dans <Link to="/agent/paiements" className="text-primary underline">Paiements</Link>.
          </p>
          <Button variant="outline" asChild className="mt-3"><Link to="/agent/cotations"><FileText className="h-4 w-4" /> Voir les cotations</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
