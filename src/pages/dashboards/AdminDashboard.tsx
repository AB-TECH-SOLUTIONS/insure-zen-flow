import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ companies: 0, quotes: 0, contracts: 0, claims: 0 });

  useEffect(() => {
    (async () => {
      const [c, q, k, s] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase.from("contracts").select("id", { count: "exact", head: true }),
        supabase.from("claims").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        companies: c.count ?? 0,
        quotes: q.count ?? 0,
        contracts: k.count ?? 0,
        claims: s.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration plateforme"
        description="Vue globale InsureFlow."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Compagnies" value={stats.companies} icon={Building2} accent="primary" />
        <StatCard label="Utilisateurs" value="—" icon={Users} accent="info" hint="à venir" />
        <StatCard label="Cotations" value={stats.quotes} icon={FileText} accent="success" />
        <StatCard label="Contrats" value={stats.contracts} icon={FileCheck} accent="warning" />
      </div>

      <Card>
        <CardHeader><CardTitle>Compagnies actives</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            NSIA, GMC, AFRINSURANCE — gérez les paramètres dans « Compagnies ».
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
