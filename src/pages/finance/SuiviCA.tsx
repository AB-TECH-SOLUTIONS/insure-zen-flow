import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Target, Wallet, Banknote, Plus, Save, RefreshCw } from "lucide-react";
import { formatFCFA as fmtFCFA } from "@/lib/format";

type Payment = { id: string; amount: number; status: string; paid_at: string | null; company_id: string };
type Contract = { id: string; company_id: string; type: string; commercial_nature: string | null; total_premium: number; start_date: string };
type Objective = { id?: string; company_id: string; year: number; month: number; product_type: string | null; target_amount: number };
type Company = { id: string; name: string };

const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

export default function SuiviCA() {
  const { user, primaryCompanyId } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [newObj, setNewObj] = useState<{ month: number; target: number }>({ month: now.getMonth() + 1, target: 0 });

  const load = async () => {
    setLoading(true);
    const yStart = `${year}-01-01`;
    const yEnd = `${year}-12-31`;
    const yPrevStart = `${year - 1}-01-01`;
    const [pay, ctr, obj, comp] = await Promise.all([
      supabase.from("payments").select("id,amount,status,paid_at,company_id").gte("paid_at", yPrevStart).lte("paid_at", yEnd),
      supabase.from("contracts").select("id,company_id,type,commercial_nature,total_premium,start_date").gte("start_date", yPrevStart).lte("start_date", yEnd),
      supabase.from("revenue_objectives").select("*").eq("year", year),
      supabase.from("companies").select("id,name").order("name"),
    ]);
    setPayments((pay.data as Payment[]) || []);
    setContracts((ctr.data as Contract[]) || []);
    setObjectives((obj.data as Objective[]) || []);
    setCompanies((comp.data as Company[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const filterCo = <T extends { company_id: string }>(rows: T[]) =>
    companyFilter === "all" ? rows : rows.filter(r => r.company_id === companyFilter);

  const monthlyCA = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => ({ paid: 0, contracts: 0, objective: 0, prev: 0 }));
    filterCo(payments).forEach(p => {
      if (p.status !== "paye" || !p.paid_at) return;
      const d = new Date(p.paid_at);
      const m = d.getMonth();
      if (d.getFullYear() === year) arr[m].paid += Number(p.amount);
      else if (d.getFullYear() === year - 1) arr[m].prev += Number(p.amount);
    });
    filterCo(contracts).forEach(c => {
      const d = new Date(c.start_date);
      if (d.getFullYear() === year) arr[d.getMonth()].contracts += Number(c.total_premium);
    });
    objectives
      .filter(o => companyFilter === "all" || o.company_id === companyFilter)
      .forEach(o => { if (o.month >= 1 && o.month <= 12) arr[o.month - 1].objective += Number(o.target_amount); });
    return arr;
  }, [payments, contracts, objectives, companyFilter, year]);

  const totals = useMemo(() => {
    const paidYear = monthlyCA.reduce((s, m) => s + m.paid, 0);
    const prevYear = monthlyCA.reduce((s, m) => s + m.prev, 0);
    const contractsYear = monthlyCA.reduce((s, m) => s + m.contracts, 0);
    const objectiveYear = monthlyCA.reduce((s, m) => s + m.objective, 0);
    const currentMonthIdx = now.getMonth();
    const paidThisMonth = monthlyCA[currentMonthIdx].paid;
    const paidLastMonth = currentMonthIdx > 0 ? monthlyCA[currentMonthIdx - 1].paid : 0;
    const mom = paidLastMonth > 0 ? ((paidThisMonth - paidLastMonth) / paidLastMonth) * 100 : 0;
    const yoy = prevYear > 0 ? ((paidYear - prevYear) / prevYear) * 100 : 0;
    const realisation = objectiveYear > 0 ? (paidYear / objectiveYear) * 100 : 0;
    return { paidYear, prevYear, contractsYear, objectiveYear, mom, yoy, realisation, paidThisMonth };
  }, [monthlyCA]);

  const byCompany = useMemo(() => {
    const map = new Map<string, { paid: number; contracts: number }>();
    payments.forEach(p => {
      if (p.status !== "paye" || !p.paid_at || new Date(p.paid_at).getFullYear() !== year) return;
      const e = map.get(p.company_id) || { paid: 0, contracts: 0 };
      e.paid += Number(p.amount);
      map.set(p.company_id, e);
    });
    contracts.forEach(c => {
      if (new Date(c.start_date).getFullYear() !== year) return;
      const e = map.get(c.company_id) || { paid: 0, contracts: 0 };
      e.contracts += Number(c.total_premium);
      map.set(c.company_id, e);
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: companies.find(c => c.id === id)?.name || "—", ...v }))
      .sort((a, b) => b.paid - a.paid);
  }, [payments, contracts, companies, year]);

  const byNature = useMemo(() => {
    let acq = 0, ren = 0;
    filterCo(contracts).forEach(c => {
      if (new Date(c.start_date).getFullYear() !== year) return;
      if (c.commercial_nature === "renouvellement") ren += Number(c.total_premium);
      else acq += Number(c.total_premium);
    });
    return { acq, ren };
  }, [contracts, companyFilter, year]);

  const saveObjective = async () => {
    if (!primaryCompanyId) { toast.error("Compagnie manquante sur votre profil"); return; }
    const { error } = await supabase.from("revenue_objectives").upsert({
      company_id: primaryCompanyId,
      year, month: newObj.month, product_type: null,
      target_amount: newObj.target,
    }, { onConflict: "company_id,year,month,product_type" });
    if (error) toast.error(error.message);
    else { toast.success("Objectif enregistré"); load(); }
  };

  const maxBar = Math.max(...monthlyCA.map(m => Math.max(m.paid, m.contracts, m.objective, m.prev)), 1);

  return (
    <div>
      <PageHeader
        title="Suivi du chiffre d'affaires"
        description={`Tableau de bord financier ${year} — encaissements, production, objectifs et comparatifs`}
        actions={
          <>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[year + 1, year, year - 1, year - 2].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes compagnies</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Recharger</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label={`CA encaissé ${year}`} value={fmtFCFA(totals.paidYear)} icon={Wallet} accent="success" />
        <StatCard label="Production (contrats)" value={fmtFCFA(totals.contractsYear)} icon={Banknote} accent="info" />
        <StatCard label="Objectif annuel" value={fmtFCFA(totals.objectiveYear)} icon={Target} />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Réalisation</p>
            <p className="text-2xl font-bold mt-1">{totals.realisation.toFixed(1)}%</p>
            <Progress value={Math.min(totals.realisation, 100)} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Évolution M/M</p>
            <p className={`text-2xl font-bold mt-1 ${totals.mom >= 0 ? "text-success" : "text-destructive"}`}>
              {totals.mom >= 0 ? "+" : ""}{totals.mom.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {totals.mom >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              vs mois précédent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Évolution A/A</p>
            <p className={`text-2xl font-bold mt-1 ${totals.yoy >= 0 ? "text-success" : "text-destructive"}`}>
              {totals.yoy >= 0 ? "+" : ""}{totals.yoy.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">vs {year - 1}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Évolution mensuelle {year}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthlyCA.map((m, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2 text-xs">
                  <span className="col-span-1 font-medium text-muted-foreground">{MONTHS[i]}</span>
                  <div className="col-span-8 space-y-1">
                    <div className="h-2 bg-muted rounded relative overflow-hidden">
                      <div className="h-full bg-success absolute left-0 top-0" style={{ width: `${(m.paid / maxBar) * 100}%` }} />
                    </div>
                    {m.objective > 0 && (
                      <div className="h-1 bg-muted/50 rounded relative overflow-hidden">
                        <div className="h-full bg-primary/60 absolute left-0 top-0" style={{ width: `${(m.objective / maxBar) * 100}%` }} />
                      </div>
                    )}
                  </div>
                  <span className="col-span-3 text-right tabular-nums">
                    {fmtFCFA(m.paid)}
                    {m.objective > 0 && (
                      <span className="block text-muted-foreground text-[10px]">obj. {fmtFCFA(m.objective)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-success rounded" /> Encaissé</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1 bg-primary/60 rounded" /> Objectif</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Acquisition vs Renouvellement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Acquisition</span><span className="font-medium">{fmtFCFA(byNature.acq)}</span>
              </div>
              <Progress value={byNature.acq + byNature.ren > 0 ? (byNature.acq / (byNature.acq + byNature.ren)) * 100 : 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Renouvellement</span><span className="font-medium">{fmtFCFA(byNature.ren)}</span>
              </div>
              <Progress value={byNature.acq + byNature.ren > 0 ? (byNature.ren / (byNature.acq + byNature.ren)) * 100 : 0} className="h-2" />
            </div>
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Définir un objectif mensuel</p>
              <div className="flex gap-2">
                <Select value={String(newObj.month)} onValueChange={v => setNewObj(s => ({ ...s, month: Number(v) }))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Montant FCFA" value={newObj.target || ""}
                  onChange={e => setNewObj(s => ({ ...s, target: Number(e.target.value) }))} />
                <Button size="icon" onClick={saveObjective}><Save className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">CA par compagnie — {year}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Chargement…</p>
          ) : byCompany.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune donnée pour {year}.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                  <th className="p-2">Compagnie</th>
                  <th className="p-2 text-right">CA encaissé</th>
                  <th className="p-2 text-right">Production (contrats)</th>
                  <th className="p-2 text-right">Part</th>
                </tr>
              </thead>
              <tbody>
                {byCompany.map(c => {
                  const tot = byCompany.reduce((s, x) => s + x.paid, 0);
                  const pct = tot > 0 ? (c.paid / tot) * 100 : 0;
                  return (
                    <tr key={c.id} className="border-b">
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2 text-right tabular-nums">{fmtFCFA(c.paid)}</td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">{fmtFCFA(c.contracts)}</td>
                      <td className="p-2 text-right"><Badge variant="secondary">{pct.toFixed(1)}%</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}