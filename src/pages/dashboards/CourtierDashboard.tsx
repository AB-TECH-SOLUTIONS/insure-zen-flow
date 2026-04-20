import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, TrendingUp, Wallet, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useFinanceStats } from "@/hooks/useFinanceStats";
import { formatFCFA } from "@/lib/format";

export default function CourtierDashboard() {
  const f = useFinanceStats();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord courtier"
        description="Production multi-compagnies."
        actions={
          <Button asChild className="bg-gradient-primary shadow-glow">
            <Link to="/courtier/cotations/nouvelle"><Plus className="h-4 w-4" /> Nouvelle cotation</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CA encaissé (mois)" value={formatFCFA(f.caMonth)} icon={TrendingUp} accent="success" />
        <StatCard label="CA encaissé (année)" value={formatFCFA(f.caYear)} icon={TrendingUp} accent="primary" />
        <StatCard label="À encaisser" value={formatFCFA(f.pending)} icon={Wallet} accent="warning" />
        <StatCard label="Contrats actifs" value={f.contractsActive} icon={FileCheck} accent="info" />
      </div>

      <Card>
        <CardHeader><CardTitle>Mes accès compagnies</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun accès actif. Faites une demande d'accès à une compagnie depuis la page « Mes accès ».
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/courtier/compagnies"><Building2 className="h-4 w-4" /> Gérer mes accès</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
