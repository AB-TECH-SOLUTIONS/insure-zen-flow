import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

type Req = { id: string; broker_user_id: string; company_id: string; justification: string | null; created_at: string };

export default function DemandesCourtiers() {
  const { user, primaryCompanyId } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null }>>({});

  const load = async () => {
    if (!primaryCompanyId) return;
    const { data } = await supabase.from("broker_company_requests").select("*")
      .eq("company_id", primaryCompanyId).eq("status", "en_attente").order("created_at", { ascending: false });
    const list = (data as Req[]) ?? [];
    setReqs(list);
    if (list.length) {
      const { data: pr } = await supabase.from("profiles").select("user_id,full_name")
        .in("user_id", list.map((r) => r.broker_user_id));
      const map: Record<string, { full_name: string | null }> = {};
      (pr ?? []).forEach((p: { user_id: string; full_name: string | null }) => { map[p.user_id] = { full_name: p.full_name }; });
      setProfiles(map);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [primaryCompanyId]);

  const decide = async (r: Req, accept: boolean) => {
    if (!user) return;
    const status = accept ? "acceptee" : "refusee";
    const { error } = await supabase.from("broker_company_requests").update({
      status, decided_at: new Date().toISOString(), decided_by: user.id,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    if (accept) {
      await supabase.from("broker_company_access").insert({
        broker_user_id: r.broker_user_id, company_id: r.company_id, granted_by: user.id, is_active: true,
      });
    }
    await supabase.from("messages").insert({
      sender_id: user.id, recipient_id: r.broker_user_id,
      subject: "Demande d'accès compagnie",
      body: accept ? "Votre demande d'accès a été approuvée." : "Votre demande d'accès a été refusée.",
    });
    await supabase.from("notifications").insert({
      user_id: r.broker_user_id, category: accept ? "success" : "warning",
      title: accept ? "Accès compagnie approuvé" : "Accès compagnie refusé",
      body: accept ? "Vous pouvez maintenant distribuer ses produits." : "Contactez la compagnie pour plus d'infos.",
      link: "/courtier/compagnies",
    });
    toast.success(accept ? "Approuvé" : "Refusé");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Demandes courtiers" description="Validez ou refusez les demandes d'accès à votre compagnie." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Courtier</TableHead><TableHead>Date</TableHead><TableHead>Justification</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {reqs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune demande en attente</TableCell></TableRow>}
            {reqs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{profiles[r.broker_user_id]?.full_name ?? r.broker_user_id.slice(0, 8)}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-md truncate">{r.justification ?? "—"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => decide(r, true)}><Check className="h-3 w-3 mr-1" /> Approuver</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(r, false)}><X className="h-3 w-3 mr-1" /> Refuser</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}