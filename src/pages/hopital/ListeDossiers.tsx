import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA } from "@/lib/format";

const COL: Record<string, string> = {
  en_attente: "bg-amber-500/10 text-amber-700",
  valide: "bg-blue-500/10 text-blue-700",
  rembourse: "bg-green-500/10 text-green-700",
  rejete: "bg-red-500/10 text-red-700",
};

type HC = {
  id: string; type_soin: string; montant_soins: number; montant_assurance: number | null;
  statut: string; created_at: string; client_id: string;
  clients: { full_name: string } | null;
};

export default function ListeDossiers() {
  const { user } = useAuth();
  const [list, setList] = useState<HC[]>([]);
  const [filter, setFilter] = useState("tous");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("health_claims")
        .select("*, clients(full_name)").eq("hopital_user_id", user.id)
        .order("created_at", { ascending: false });
      setList((data as unknown as HC[]) ?? []);
    })();
  }, [user]);

  const filtered = filter === "tous" ? list : list.filter((h) => h.statut === filter);

  return (
    <div className="space-y-6">
      <PageHeader title="Mes dossiers"
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="valide">Validé</SelectItem>
              <SelectItem value="rembourse">Remboursé</SelectItem>
              <SelectItem value="rejete">Rejeté</SelectItem>
            </SelectContent>
          </Select>
        } />
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type de soin</TableHead>
              <TableHead>Assuré</TableHead>
              <TableHead>Montant soins</TableHead>
              <TableHead>Part assurance</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{new Date(h.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>{h.type_soin}</TableCell>
                <TableCell>{h.clients?.full_name ?? "—"}</TableCell>
                <TableCell>{formatFCFA(Number(h.montant_soins))}</TableCell>
                <TableCell>{formatFCFA(Number(h.montant_assurance ?? 0))}</TableCell>
                <TableCell><Badge className={COL[h.statut] ?? ""} variant="outline">{h.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Aucun dossier.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}