import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { HeartPulse, Banknote } from "lucide-react";

export default function HopitalDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Établissement hospitalier — Tableau de bord"
        description="Bienvenue sur votre espace hospitalier."
      />
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          Votre portail tiers payant arrive bientôt.
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Dossiers tiers payant" value="—" icon={HeartPulse} accent="primary" />
        <StatCard label="Remboursements reçus" value="—" icon={Banknote} accent="success" />
      </div>
    </div>
  );
}