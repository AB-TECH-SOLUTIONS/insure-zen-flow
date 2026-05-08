import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import { FileSpreadsheet, Download } from "lucide-react";

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

interface Bordereau {
  id: string;
  periode_mois: number;
  periode_annee: number;
  total_contrats: number;
  total_prime_nette: number;
  total_prime_ttc: number;
  generated_at: string;
}

export default function Bordereaux() {
  const { user, primaryCompanyId } = useAuth();
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [list, setList] = useState<Bordereau[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("bordereaux")
      .select("*")
      .order("periode_annee", { ascending: false })
      .order("periode_mois", { ascending: false })
      .limit(50);
    setList((data as Bordereau[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const generer = async () => {
    if (!primaryCompanyId) { toast.error("Compagnie introuvable"); return; }
    setLoading(true);
    const start = `${annee}-${String(mois).padStart(2, "0")}-01`;
    const endDate = new Date(annee, mois, 0); // dernier jour
    const end = endDate.toISOString().slice(0, 10);
    const { data: contrats } = await supabase
      .from("contracts")
      .select("id,total_premium,prime_nette")
      .eq("company_id", primaryCompanyId)
      .gte("created_at", start)
      .lte("created_at", `${end}T23:59:59`);
    const total_contrats = contrats?.length ?? 0;
    const total_prime_ttc = (contrats ?? []).reduce((s, c) => s + Number(c.total_premium ?? 0), 0);
    const total_prime_nette = (contrats ?? []).reduce((s, c) => s + Number(c.prime_nette ?? 0), 0);
    const { error } = await supabase.from("bordereaux").insert({
      company_id: primaryCompanyId,
      periode_mois: mois, periode_annee: annee,
      total_contrats, total_prime_nette, total_prime_ttc,
      generated_by: user?.id,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Bordereau ${MOIS[mois - 1]} ${annee} généré (${total_contrats} contrats)`);
    load();
  };

  const exportCSV = (b: Bordereau) => {
    const rows = [
      ["Période", `${MOIS[b.periode_mois - 1]} ${b.periode_annee}`],
      ["Nombre de contrats", b.total_contrats],
      ["Prime nette", b.total_prime_nette],
      ["Prime TTC", b.total_prime_ttc],
      ["Généré le", new Date(b.generated_at).toLocaleString("fr-FR")],
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Bordereau-${b.periode_annee}-${String(b.periode_mois).padStart(2,"0")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bordereaux" description="Production mensuelle consolidée pour la compagnie ou la réassurance." />
      <Card className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <Label>Mois</Label>
          <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOIS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Année</Label>
          <Input type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} />
        </div>
        <Button onClick={generer} disabled={loading} className="sm:col-span-2">
          <FileSpreadsheet className="h-4 w-4 mr-2" /> {loading ? "Génération…" : "Générer le bordereau"}
        </Button>
      </Card>

      <Card className="divide-y">
        {list.length === 0 && <div className="p-6 text-sm text-muted-foreground">Aucun bordereau généré.</div>}
        {list.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{MOIS[b.periode_mois - 1]} {b.periode_annee}</div>
              <div className="text-xs text-muted-foreground">
                {b.total_contrats} contrats • Nette {formatFCFA(b.total_prime_nette)} • TTC {formatFCFA(b.total_prime_ttc)}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => exportCSV(b)}>
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}