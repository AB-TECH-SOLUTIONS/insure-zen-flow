import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileCheck, Users, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function AgentDashboard() {
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
        <StatCard label="Cotations du mois" value="0" icon={FileText} accent="primary" />
        <StatCard label="Contrats émis" value="0" icon={FileCheck} accent="success" />
        <StatCard label="Clients actifs" value="0" icon={Users} accent="info" />
        <StatCard label="Sinistres en cours" value="0" icon={AlertTriangle} accent="warning" />
      </div>

      <Card>
        <CardHeader><CardTitle>Production récente</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune cotation pour le moment. Cliquez sur « Nouvelle cotation » pour commencer.</p>
        </CardContent>
      </Card>
    </div>
  );
}
