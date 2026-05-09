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

type Med = { designation: string; quantite: number; prix: number };
type PC = {
  id: string; created_at: string; medicaments: Med[]; montant_total: number;
  montant_assurance: number | null; statut: string; client_id: string;
  clients: { full_name: string } | null;
};

export default function Historique() {
  const { user } = useAuth();
  const [list, setList] = useState<PC[]>([]);
  const [filter, setFilter] = useState("tous");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("pharmacie_claims")
        .select("*, clients(full_name)").eq("pharmacie_user_id", user.id)
        .order("created_at", { ascending: false });
      setList((data as unknown as PC[]) ?? []);
    })();
  }, [user]);

  const filtered = filter === "tous" ? list : list.filter((p) => p.statut === filter);

  return (
    <div className="space-y-6">
      <PageHeader title="Historique des dispensations"
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
              <TableHead>Assuré</TableHead>
              <TableHead>Nb médicaments</TableHead>
              <TableHead>Montant total</TableHead>
              <TableHead>Remboursement</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{new Date(p.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>{p.clients?.full_name ?? "—"}</TableCell>
                <TableCell>{Array.isArray(p.medicaments) ? p.medicaments.length : 0}</TableCell>
                <TableCell>{formatFCFA(Number(p.montant_total))}</TableCell>
                <TableCell>{formatFCFA(Number(p.montant_assurance ?? 0))}</TableCell>
                <TableCell><Badge variant="outline">{p.statut}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Aucune dispensation.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}