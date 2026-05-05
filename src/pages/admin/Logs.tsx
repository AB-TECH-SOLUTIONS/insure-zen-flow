import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";

type Log = {
  id: string; actor_user_id: string | null; action: string; entity_type: string | null;
  entity_id: string | null; payload: any; created_at: string; company_id: string | null;
};

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setLogs((data as Log[]) ?? []));
  }, []);

  const filtered = logs.filter((l) =>
    !q || l.action.toLowerCase().includes(q.toLowerCase()) || (l.entity_type ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Journaux d'activité" description="Traçabilité des actions sensibles" />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Derniers événements</CardTitle>
          <Input placeholder="Filtrer…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Acteur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                  <TableCell className="text-sm">{l.entity_type ?? "—"} {l.entity_id ? `· ${l.entity_id.slice(0, 8)}` : ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.actor_user_id?.slice(0, 8) ?? "system"}</TableCell>
                </TableRow>
              ))}
              {!filtered.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun événement.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}