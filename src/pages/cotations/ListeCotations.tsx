import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
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
      <Card className="divide-y">
        {loading && <div className="p-6 text-sm text-muted-foreground">Chargement…</div>}
        {!loading && quotes.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            Aucune cotation. Cliquez sur « Nouvelle cotation Auto » pour commencer.
          </div>
        )}
        {quotes.map((q) => (
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
              <Badge variant="secondary">{q.status}</Badge>
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
