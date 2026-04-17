import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileCheck, AlertTriangle, CreditCard, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function ClientDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bienvenue 👋"
        description="Gérez vos assurances en toute simplicité."
        actions={
          <Button asChild className="bg-gradient-primary shadow-glow">
            <Link to="/client/cotations/nouvelle"><Plus className="h-4 w-4" /> Nouvelle cotation</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Cotations en cours" value="0" icon={FileText} accent="primary" />
        <StatCard label="Contrats actifs" value="0" icon={FileCheck} accent="success" />
        <StatCard label="Sinistres ouverts" value="0" icon={AlertTriangle} accent="warning" />
        <StatCard label="Paiements en attente" value="0" icon={CreditCard} accent="info" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Vos derniers contrats</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Aucun contrat pour le moment.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />Messages</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Aucun nouveau message.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
