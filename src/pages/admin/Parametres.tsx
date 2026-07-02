import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, FileCheck, AlertTriangle, Download, AlertOctagon, Settings2, Globe, Building2, Sliders } from "lucide-react";

export default function Parametres() {
  const nav = useNavigate();
  const [stats, setStats] = useState({ users: 0, contracts: 0, claims: 0 });

  useEffect(() => {
    (async () => {
      const [u, c, s] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("contracts").select("id", { count: "exact", head: true }).eq("status", "actif"),
        supabase.from("claims").select("id", { count: "exact", head: true }).neq("status", "clos"),
      ]);
      setStats({
        users: u.count ?? 0,
        contracts: c.count ?? 0,
        claims: s.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" description="Configuration globale de la plateforme." />

      <Card className="p-5">
        <h2 className="font-display font-semibold mb-3">Configuration dynamique</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Modifiez tarifs, référentiels, partenaires et paramètres système sans redéploiement.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="justify-start h-auto py-3" onClick={() => nav("/admin/configuration")}>
            <Sliders className="h-4 w-4 mr-2" /> Tarifs & barèmes
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3" onClick={() => nav("/admin/configuration")}>
            <Building2 className="h-4 w-4 mr-2" /> Partenaires
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3" onClick={() => nav("/admin/configuration")}>
            <Globe className="h-4 w-4 mr-2" /> Pays CIMA
          </Button>
          <Button variant="outline" className="justify-start h-auto py-3" onClick={() => nav("/admin/configuration")}>
            <Settings2 className="h-4 w-4 mr-2" /> Système
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold mb-3">Plateforme</h2>
        <dl className="grid sm:grid-cols-3 gap-4 text-sm">
          <div><dt className="text-muted-foreground">Nom</dt><dd className="font-medium">InsureFlow</dd></div>
          <div><dt className="text-muted-foreground">Version</dt><dd className="font-medium">1.0.0-MVP</dd></div>
          <div><dt className="text-muted-foreground">Région</dt><dd className="font-medium">Afrique centrale</dd></div>
        </dl>
      </Card>

      <div>
        <h2 className="font-display font-semibold mb-3">Statistiques globales</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Utilisateurs" value={stats.users} icon={Users} accent="primary" />
          <StatCard label="Contrats actifs" value={stats.contracts} icon={FileCheck} accent="success" />
          <StatCard label="Sinistres ouverts" value={stats.claims} icon={AlertTriangle} accent="warning" />
        </div>
      </div>

      <Card className="p-5 border-destructive/30">
        <h2 className="font-display font-semibold mb-3 text-destructive">Zone danger</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => nav("/admin/import-export")}>
            <Download className="h-4 w-4 mr-1" /> Exporter toutes les données
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="destructive" disabled>
                  <AlertOctagon className="h-4 w-4 mr-1" /> Réinitialiser la plateforme
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Contactez le support InsureFlow</TooltipContent>
          </Tooltip>
        </div>
      </Card>
    </div>
  );
}