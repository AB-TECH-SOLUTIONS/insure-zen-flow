import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Car } from "lucide-react";

interface Props { basePath: string }

type Row = {
  id: string;
  brand: string | null;
  model: string | null;
  registration: string | null;
  fiscal_power: number | null;
  energy: string | null;
  client_id: string;
  clients: { full_name: string } | null;
};

export default function ListeVehicules({ basePath }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    supabase
      .from("vehicles")
      .select("id,brand,model,registration,fiscal_power,energy,client_id,clients(full_name)")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!cancel) {
          setRows((data as unknown as Row[]) ?? []);
          setLoading(false);
        }
      });
    return () => { cancel = true; };
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      (r.registration ?? "").toLowerCase().includes(s) ||
      (r.brand ?? "").toLowerCase().includes(s) ||
      (r.model ?? "").toLowerCase().includes(s) ||
      (r.clients?.full_name ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Véhicules"
        description="Tous les véhicules assurés du portefeuille."
      />

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Immatriculation, marque, propriétaire…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Véhicule</TableHead>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Énergie / CV</TableHead>
              <TableHead>Propriétaire</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chargement…</TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun véhicule.</TableCell></TableRow>
            )}
            {filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Car className="h-4 w-4" />
                    </div>
                    <div className="font-medium">{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{v.registration ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{[v.energy, v.fiscal_power ? `${v.fiscal_power} CV` : null].filter(Boolean).join(" · ") || "—"}</TableCell>
                <TableCell>{v.clients?.full_name ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`${basePath}/clients/${v.client_id}`}>Voir client</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}