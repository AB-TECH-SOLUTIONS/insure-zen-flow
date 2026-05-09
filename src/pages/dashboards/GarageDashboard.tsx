import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Wrench, FileText, Receipt } from "lucide-react";

export default function GarageDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Garage agréé — Tableau de bord"
        description="Bienvenue sur votre espace garage."
      />
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          Votre portail de gestion des dossiers sinistres et devis de réparation arrive bientôt.
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Dossiers en cours" value="—" icon={Wrench} accent="primary" />
        <StatCard label="Devis soumis" value="—" icon={FileText} accent="info" />
        <StatCard label="Factures" value="—" icon={Receipt} accent="success" />
      </div>
    </div>
  );
}