import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Mail, Phone } from "lucide-react";

interface Props { basePath: string }

type Row = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  kind: "personne_physique" | "personne_morale";
  created_at: string;
};

export default function ListeClients({ basePath }: Props) {
  const { primaryCompanyId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const q = supabase
      .from("clients")
      .select("id,full_name,phone,email,kind,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (primaryCompanyId) q.eq("company_id", primaryCompanyId);
    q.then(({ data }) => {
      if (!cancel) {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      }
    });
    return () => { cancel = true; };
  }, [primaryCompanyId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.full_name.toLowerCase().includes(s) ||
      (r.phone ?? "").toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Portefeuille clients — recherche, fiches détaillées, véhicules et contrats."
        actions={
          <Button asChild>
            <Link to={`${basePath}/clients/nouveau`}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau client
            </Link>
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, téléphone, email…"
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
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chargement…</TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun client.</TableCell></TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="font-medium">{c.full_name}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-0.5">
                    {c.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</div>}
                    {c.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {c.kind === "personne_morale" ? "Entreprise" : "Particulier"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`${basePath}/clients/${c.id}`}>Voir</Link>
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