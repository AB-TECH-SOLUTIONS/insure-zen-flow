import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, TrendingUp, Wallet, Hash } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { PaiementForm } from "@/components/paiements/PaiementForm";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Payment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  external_reference: string | null;
  contract_id: string | null;
  company_id: string;
  client_id: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paye: "default", en_attente: "secondary", echoue: "destructive", rembourse: "outline",
};
const METHOD_LABEL: Record<string, string> = {
  mobile_money_mtn: "MoMo MTN", mobile_money_orange: "MoMo Orange",
  virement: "Virement", especes: "Espèces", cheque: "Chèque", carte: "Carte",
};

export default function ListePaiements() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"30" | "90" | "365" | "all">("30");
  const [statusF, setStatusF] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("payments")
      .select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data ?? []) as Payment[]);
    const { data: cs } = await supabase.from("companies").select("id, name");
    const map: Record<string, string> = {};
    (cs ?? []).forEach((c) => (map[c.id] = c.name));
    setCompanies(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
    return rows.filter((p) => {
      if (cutoff && new Date(p.created_at).getTime() < cutoff) return false;
      if (statusF !== "all" && p.status !== statusF) return false;
      if (search && !(p.external_reference ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, period, statusF, search]);

  const stats = useMemo(() => {
    const paye = filtered.filter((p) => p.status === "paye");
    const attente = filtered.filter((p) => p.status === "en_attente");
    const ca = paye.reduce((s, p) => s + Number(p.amount), 0);
    const due = attente.reduce((s, p) => s + Number(p.amount), 0);
    return {
      ca, due, count: paye.length,
      avg: paye.length ? ca / paye.length : 0,
    };
  }, [filtered]);

  const monthly = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.filter((p) => p.status === "paye").forEach((p) => {
      const d = new Date(p.paid_at ?? p.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m[k] = (m[k] ?? 0) + Number(p.amount);
    });
    return Object.entries(m).sort().map(([month, ca]) => ({ month, ca }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements & chiffre d'affaires"
        description="Suivi des encaissements, méthodes de paiement et statuts."
        actions={<PaiementForm onCreated={load} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CA encaissé" value={formatFCFA(stats.ca)} icon={TrendingUp} accent="success" />
        <StatCard label="À encaisser" value={formatFCFA(stats.due)} icon={Wallet} accent="warning" />
        <StatCard label="Transactions" value={stats.count} icon={Hash} accent="primary" />
        <StatCard label="Panier moyen" value={formatFCFA(stats.avg)} icon={CreditCard} accent="info" />
      </div>

      <Card>
        <CardHeader><CardTitle>CA mensuel encaissé</CardTitle></CardHeader>
        <CardContent className="h-72">
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatFCFA(v)} />
                <Bar dataKey="ca" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <CardTitle>Transactions</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                  <SelectItem value="365">12 mois</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusF} onValueChange={setStatusF}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="echoue">Échoué</SelectItem>
                  <SelectItem value="rembourse">Remboursé</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Référence..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement trouvé.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Compagnie</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.paid_at ?? p.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-sm">{companies[p.company_id] ?? "—"}</TableCell>
                    <TableCell className="text-sm">{METHOD_LABEL[p.method] ?? p.method}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.external_reference ?? "—"}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatFCFA(Number(p.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}