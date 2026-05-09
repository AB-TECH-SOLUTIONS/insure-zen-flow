import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { FileText, ShieldCheck } from "lucide-react";

export default function AutoriteDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Autorité compétente — Tableau de bord"
        description="Bienvenue sur votre espace de contrôle."
      />
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          Votre portail de dépôt de documents officiels arrive bientôt.
        </p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Documents déposés" value="—" icon={FileText} accent="primary" />
        <StatCard label="Attestations vérifiées" value="—" icon={ShieldCheck} accent="success" />
      </div>
    </div>
  );
}