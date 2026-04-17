import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileCheck, AlertTriangle, BarChart3, Users, Stamp } from "lucide-react";

export default function AssureurDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilotage compagnie"
        description="Vue d'ensemble de votre portefeuille."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Chiffre d'affaires" value="0 FCFA" icon={BarChart3} accent="primary" hint="ce mois-ci" />
        <StatCard label="Contrats actifs" value="0" icon={FileCheck} accent="success" />
        <StatCard label="Cotations en attente" value="0" icon={FileText} accent="info" />
        <StatCard label="Sinistres ouverts" value="0" icon={AlertTriangle} accent="warning" />
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
