import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, FileCheck, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function AutoriteDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({ docs: 0, constats: 0 });
  const verifs = Number(sessionStorage.getItem("autorite_verifs") ?? 0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("official_documents").select("document_type, created_at")
        .eq("deposited_by", user.id);
      const all = (data ?? []) as { document_type: string; created_at: string }[];
      const now = new Date();
      const m = all.filter((d) => {
        const dt = new Date(d.created_at);
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      });
      setStats({
        docs: m.length,
        constats: all.filter((d) => d.document_type === "Constat à l'amiable").length,
      });
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader title="Autorité — Tableau de bord" description="Dépôt et contrôle de documents officiels." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Documents ce mois" value={stats.docs} icon={FileText} accent="primary" />
        <StatCard label="Attestations vérifiées" value={verifs} icon={ShieldCheck} accent="success" />
        <StatCard label="Constats enregistrés" value={stats.constats} icon={FileCheck} accent="info" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-8 text-center cursor-pointer hover:border-primary" onClick={() => nav("/autorite/depot")}>
          <Upload className="h-12 w-12 mx-auto mb-3 text-primary" />
          <h3 className="font-display text-lg font-semibold">📋 Déposer un document</h3>
          <Button variant="outline" className="mt-3">Accéder</Button>
        </Card>
        <Card className="p-8 text-center cursor-pointer hover:border-primary" onClick={() => nav("/autorite/verification")}>
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-primary" />
          <h3 className="font-display text-lg font-semibold">🔍 Vérifier une attestation</h3>
          <Button variant="outline" className="mt-3">Accéder</Button>
        </Card>
      </div>
    </div>
  );
}