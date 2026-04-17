import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileCheck, Building2, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CourtierDashboard() {
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
        <StatCard label="Cotations du mois" value="0" icon={FileText} accent="primary" />
        <StatCard label="Contrats émis" value="0" icon={FileCheck} accent="success" />
        <StatCard label="Compagnies actives" value="0" icon={Building2} accent="info" />
        <StatCard label="Clients" value="0" icon={Users} accent="warning" />
      </div>

      <Card>
        <CardHeader><CardTitle>Mes accès compagnies</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun accès actif. Faites une demande d'accès à une compagnie depuis la page « Mes accès ».
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/courtier/compagnies">Gérer mes accès</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
