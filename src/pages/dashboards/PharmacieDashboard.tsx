import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Pill, Clock } from "lucide-react";

export default function PharmacieDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacie — Tableau de bord"
        description="Bienvenue sur votre espace pharmacie."
      />
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          Votre portail de dispensation tiers payant arrive bientôt.
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Ordonnances traitées" value="—" icon={Pill} accent="primary" />
        <StatCard label="En attente remboursement" value="—" icon={Clock} accent="warning" />
      </div>
    </div>
  );
}