import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/format";

interface Contract {
  id: string;
  contract_number: string;
  type: string;
  status: string;
  total_premium: number;
  start_date: string;
  end_date: string;
  client_id: string;
}

export default function ListeContrats({ basePath }: { basePath: string }) {
  const [list, setList] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("contracts")
      .select("id,contract_number,type,status,total_premium,start_date,end_date,client_id")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setList((data as Contract[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrats"
        description="Vos contrats actifs, suspendus, résiliés et expirés."
      />
      <Card className="divide-y">
        {loading && <div className="p-6 text-sm text-muted-foreground">Chargement…</div>}
        {!loading && list.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            Aucun contrat. Convertissez une cotation acceptée pour en créer un.
          </div>
        )}
        {list.map((c) => (
          <Link
            key={c.id}
            to={`${basePath}/contrats/${c.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/30 transition"
          >
            <div>
              <div className="font-mono font-medium">{c.contract_number}</div>
              <div className="text-xs text-muted-foreground">
                {c.type.toUpperCase()} • du {new Date(c.start_date).toLocaleDateString("fr-FR")} au{" "}
                {new Date(c.end_date).toLocaleDateString("fr-FR")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={c.status === "actif" ? "default" : "secondary"}>{c.status}</Badge>
              <span className="font-mono text-sm">{formatFCFA(c.total_premium)}</span>
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
