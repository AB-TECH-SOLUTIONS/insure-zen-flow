import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Row = {
  id: string; claim_number: string; occurred_at: string;
  client_id: string; rapport_statut?: string;
  client_name?: string; vehicule?: string;
};

export default function Missions() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("claims")
        .select("id, claim_number, occurred_at, client_id, contract_id")
        .eq("assigned_expert_id", user.id)
        .order("occurred_at", { ascending: false });
      const claims = (data ?? []) as Array<Row & { contract_id: string }>;
      const enriched: Row[] = await Promise.all(claims.map(async (c) => {
        const { data: cli } = await supabase.from("clients").select("full_name").eq("id", c.client_id).maybeSingle();
        const { data: rep } = await supabase.from("expertise_reports").select("statut")
          .eq("claim_id", c.id).eq("expert_user_id", user.id).maybeSingle();
        return { ...c, client_name: cli?.full_name ?? "—", rapport_statut: rep?.statut };
      }));
      setRows(enriched);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader title="Mes missions" description="Sinistres qui vous ont été confiés." />
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° sinistre</TableHead>
              <TableHead>Assuré</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut rapport</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const s = r.rapport_statut;
              const badge = !s
                ? <Badge variant="destructive">Pas encore</Badge>
                : s === "soumis" ? <Badge className="bg-green-500/10 text-green-700">Soumis</Badge>
                : s === "valide" ? <Badge className="bg-blue-500/10 text-blue-700">Validé</Badge>
                : <Badge variant="outline">{s}</Badge>;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.claim_number}</TableCell>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell>{new Date(r.occurred_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{badge}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => nav(`/expert/rapport/${r.id}`)}>
                      {s ? "Voir / éditer" : "Rédiger rapport"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Aucune mission.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}