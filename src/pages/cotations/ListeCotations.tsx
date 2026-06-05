import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatFCFA } from "@/lib/format";

type Quote = {
  id: string;
  reference: string;
  type: string;
  status: string;
  total_premium: number | null;
  created_at: string;
};

export default function ListeCotations({ basePath }: { basePath: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("quotes")
      .select("id,reference,type,status,total_premium,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setQuotes((data as Quote[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = quotes.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (typeFilter !== "all" && q.type !== typeFilter) return false;
    if (search && !q.reference.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor = (s: string) =>
    s === "acceptee" ? "default" : s === "refusee" || s === "expiree" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotations"
        description="Liste de vos cotations enregistrées."
        actions={
          <Button asChild>
            <Link to={`${basePath}/cotations/nouvelle/auto`}>
              <Plus className="h-4 w-4" /> <span className="ml-2">Nouvelle cotation Auto</span>
            </Link>
          </Button>
        }
      />
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder="Rechercher une référence…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="envoyee">Envoyée</SelectItem>
            <SelectItem value="acceptee">Acceptée</SelectItem>
            <SelectItem value="refusee">Refusée</SelectItem>
            <SelectItem value="expiree">Expirée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Produit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous produits</SelectItem>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="voyage">Voyage</SelectItem>
            <SelectItem value="risques_divers">Risques divers</SelectItem>
          </SelectContent>
        </Select>
      </Card>
      <Card className="divide-y">
        {loading && <div className="p-6 text-sm text-muted-foreground">Chargement…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            Aucune cotation ne correspond à vos filtres.
          </div>
        )}
        {filtered.map((q) => (
          <Link
            key={q.id}
            to={`${basePath}/cotations/${q.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/30 transition"
          >
            <div>
              <div className="font-medium">{q.reference}</div>
              <div className="text-xs text-muted-foreground">
                {q.type.toUpperCase()} • {new Date(q.created_at).toLocaleString("fr-FR")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusColor(q.status)}>{q.status}</Badge>
              <span className="font-mono text-sm">
                {q.total_premium ? formatFCFA(q.total_premium) : "—"}
              </span>
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
