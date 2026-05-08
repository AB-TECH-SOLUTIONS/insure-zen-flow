import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import { Ban } from "lucide-react";

interface Member { user_id: string; full_name: string; phone: string | null; ca: number; contrats: number; since: string; }

export default function Reseau() {
  const { primaryCompanyId } = useAuth();
  const [agents, setAgents] = useState<Member[]>([]);
  const [courtiers, setCourtiers] = useState<(Member & { access_id: string })[]>([]);

  const load = async () => {
    if (!primaryCompanyId) return;
    const { data: prof } = await supabase.from("profiles").select("user_id,full_name,phone,created_at").eq("primary_company_id", primaryCompanyId);
    const userIds = (prof ?? []).map((p) => p.user_id);
    const { data: ur } = await supabase.from("user_roles").select("user_id,role").in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const agentIds = new Set((ur ?? []).filter((r) => r.role === "agent").map((r) => r.user_id));
    const { data: pays } = await supabase.from("payments").select("amount,created_by").eq("company_id", primaryCompanyId).eq("status", "paye");
    const { data: contrats } = await supabase.from("contracts").select("created_by").eq("company_id", primaryCompanyId);
    const caBy: Record<string, number> = {};
    (pays ?? []).forEach((p) => { if (p.created_by) caBy[p.created_by] = (caBy[p.created_by] ?? 0) + Number(p.amount); });
    const cBy: Record<string, number> = {};
    (contrats ?? []).forEach((c) => { if (c.created_by) cBy[c.created_by] = (cBy[c.created_by] ?? 0) + 1; });
    setAgents((prof ?? []).filter((p) => agentIds.has(p.user_id)).map((p) => ({
      user_id: p.user_id, full_name: p.full_name ?? "—", phone: p.phone,
      ca: caBy[p.user_id] ?? 0, contrats: cBy[p.user_id] ?? 0, since: p.created_at,
    })));

    const { data: bca } = await supabase.from("broker_company_access").select("id,broker_user_id,created_at").eq("company_id", primaryCompanyId).eq("is_active", true);
    const brokerIds = (bca ?? []).map((b) => b.broker_user_id);
    const { data: bp } = await supabase.from("profiles").select("user_id,full_name,phone").in("user_id", brokerIds.length > 0 ? brokerIds : ["00000000-0000-0000-0000-000000000000"]);
    const profMap = new Map((bp ?? []).map((p) => [p.user_id, p]));
    setCourtiers((bca ?? []).map((b) => {
      const p = profMap.get(b.broker_user_id);
      return {
        access_id: b.id, user_id: b.broker_user_id,
        full_name: p?.full_name ?? "—", phone: p?.phone ?? null,
        ca: caBy[b.broker_user_id] ?? 0, contrats: cBy[b.broker_user_id] ?? 0, since: b.created_at,
      };
    }));
  };

  useEffect(() => { load(); }, [primaryCompanyId]);

  const revoquer = async (access_id: string) => {
    const { error } = await supabase.from("broker_company_access").update({ is_active: false }).eq("id", access_id);
    if (error) toast.error(error.message); else { toast.success("Accès révoqué"); load(); }
  };

  const renderRow = (m: Member, action?: React.ReactNode) => (
    <div key={m.user_id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center p-4 border-b last:border-b-0">
      <div className="md:col-span-2">
        <div className="font-medium">{m.full_name}</div>
        <div className="text-xs text-muted-foreground">{m.phone}</div>
      </div>
      <div className="text-sm font-mono">{formatFCFA(m.ca)}</div>
      <div className="text-sm">{m.contrats} contrats</div>
      <div className="flex items-center justify-end gap-2">
        <Badge variant="outline" className="text-xs">depuis {new Date(m.since).toLocaleDateString("fr-FR")}</Badge>
        {action}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Réseau" description="Agents directs et courtiers partenaires de votre compagnie." />
      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agents directs ({agents.length})</TabsTrigger>
          <TabsTrigger value="courtiers">Courtiers partenaires ({courtiers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="agents">
          <Card>{agents.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Aucun agent rattaché.</div> : agents.map((m) => renderRow(m))}</Card>
        </TabsContent>
        <TabsContent value="courtiers">
          <Card>{courtiers.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Aucun courtier approuvé.</div> : courtiers.map((m) => renderRow(m, (
            <Button size="sm" variant="ghost" onClick={() => revoquer(m.access_id)}>
              <Ban className="h-3 w-3 mr-1" /> Révoquer
            </Button>
          )))}</Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}