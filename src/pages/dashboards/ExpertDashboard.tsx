import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { ClipboardList, FileCheck } from "lucide-react";

export default function ExpertDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Expert / Cabinet — Tableau de bord"
        description="Bienvenue sur votre espace expert."
      />
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          Votre portail de gestion des rapports d'expertise arrive bientôt.
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Missions assignées" value="—" icon={ClipboardList} accent="primary" />
        <StatCard label="Rapports soumis" value="—" icon={FileCheck} accent="success" />
      </div>
    </div>
  );
}