import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, Download, MessageSquare, RefreshCw, ListTodo, Loader2, CheckCircle2, AlertOctagon, Clock } from "lucide-react";

type Member = { user_id: string; full_name: string | null };
type Task = {
  id: string;
  company_id: string;
  title: string;
  priority: "low" | "med" | "high";
  status: "todo" | "wip" | "done" | "blocked";
  due_date: string | null;
  difficulties: string | null;
  observations: string | null;
  assigned_to: string | null;
  created_by: string | null;
  completed_at: string | null;
};

const STATUS_LABEL: Record<Task["status"], string> = {
  todo: "À faire", wip: "En cours", done: "Terminée", blocked: "Bloquée",
};
const PRIO_LABEL: Record<Task["priority"], string> = { low: "Basse", med: "Moyenne", high: "Haute" };
const PRIO_VARIANT: Record<Task["priority"], "secondary" | "default" | "destructive"> = {
  low: "secondary", med: "default", high: "destructive",
};

export default function ListeTaches() {
  const { user, primaryCompanyId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTasks((data as Task[]) || []);
    setLoading(false);
  };

  const loadMembers = async () => {
    if (!primaryCompanyId) return;
    // Profils des utilisateurs de la même compagnie
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("primary_company_id", primaryCompanyId);
    setMembers((data as Member[]) || []);
  };

  useEffect(() => {
    load();
    loadMembers();
    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCompanyId]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter(t => {
      if (filterAssignee !== "all" && t.assigned_to !== filterAssignee) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(t.title.toLowerCase().includes(q) || (t.observations || "").toLowerCase().includes(q))) return false;
      }
      return true;
    }).map(t => ({ ...t, _overdue: !!t.due_date && t.due_date < today && t.status !== "done" }));
  }, [tasks, filterAssignee, filterStatus, search]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === "done").length;
    const wip = tasks.filter(t => t.status === "wip").length;
    const blocked = tasks.filter(t => t.status === "blocked").length;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== "done").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, wip, blocked, overdue, pct };
  }, [tasks]);

  const addTask = async () => {
    if (!primaryCompanyId || !user) {
      toast.error("Compagnie ou utilisateur manquant");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        company_id: primaryCompanyId,
        title: "Nouvelle tâche",
        priority: "med",
        status: "todo",
        due_date: today,
        created_by: user.id,
        assigned_to: user.id,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setTasks(prev => [data as Task, ...prev]);
    toast.success("Tâche créée");
  };

  const updateImmediate = async (id: string, field: keyof Task, value: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    const patch: Record<string, unknown> = { [field as string]: value };
    if (field === "status") patch.completed_at = value === "done" ? new Date().toISOString() : null;
    const { error } = await supabase.from("tasks").update(patch as never).eq("id", id);
    if (error) toast.error(error.message);
  };

  const updateDebounced = (id: string, field: keyof Task, value: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    const key = `${id}-${field}`;
    clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(async () => {
      const patch: Record<string, unknown> = { [field as string]: value };
      const { error } = await supabase.from("tasks").update(patch as never).eq("id", id);
      if (error) toast.error(error.message);
      else toast.success("Sauvegardé", { duration: 1200 });
    }, 1200);
  };

  const removeTask = async (id: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { setTasks(prev => prev.filter(t => t.id !== id)); toast.success("Supprimée"); }
  };

  const memberName = (uid: string | null) => {
    if (!uid) return "Non assignée";
    return members.find(m => m.user_id === uid)?.full_name || "Membre";
  };

  const exportCSV = () => {
    const rows = tasks.map(t => [
      t.title, memberName(t.assigned_to), PRIO_LABEL[t.priority], STATUS_LABEL[t.status],
      t.due_date || "", (t.difficulties || "").replace(/;/g, ","), (t.observations || "").replace(/;/g, ","),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    const csv = ["Titre;Responsable;Priorité;Statut;Échéance;Difficultés;Observations", ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `taches_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exporté");
  };

  const copyWhatsApp = async () => {
    const today = new Date().toLocaleDateString("fr-FR");
    const done = tasks.filter(t => t.status === "done");
    const wip = tasks.filter(t => t.status === "wip");
    const todo = tasks.filter(t => t.status === "todo");
    const block = tasks.filter(t => t.status === "blocked");
    const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
    let m = `*📊 RAPPORT TÂCHES*\n📅 ${today}\n📈 ${pct}% (${done.length}/${tasks.length})\n\n`;
    if (wip.length) { m += `*🔄 EN COURS:*\n`; wip.forEach(t => m += `- ${t.title}${t.observations ? " (" + t.observations + ")" : ""}\n`); m += "\n"; }
    if (todo.length) { m += `*📋 À FAIRE:*\n`; todo.forEach(t => m += `- ${t.title}\n`); m += "\n"; }
    if (block.length) { m += `*⛔ BLOQUÉES:*\n`; block.forEach(t => m += `- ${t.title} — ${t.difficulties || "voir obs."}\n`); m += "\n"; }
    if (done.length) { m += `*✅ TERMINÉES:*\n`; done.forEach(t => m += `- ${t.title}\n`); }
    try { await navigator.clipboard.writeText(m); toast.success("Rapport copié dans le presse-papier"); }
    catch { toast.error("Impossible de copier"); }
  };

  return (
    <div>
      <PageHeader
        title="Gestion des tâches"
        description="Attribution, suivi et synchronisation temps réel des tâches de l'équipe"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Sync</Button>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button variant="outline" size="sm" onClick={copyWhatsApp}><MessageSquare className="h-4 w-4 mr-1" />WhatsApp</Button>
            <Button size="sm" onClick={addTask}><Plus className="h-4 w-4 mr-1" />Nouvelle tâche</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} icon={ListTodo} />
        <StatCard label="En cours" value={stats.wip} icon={Loader2} accent="info" />
        <StatCard label="Terminées" value={stats.done} icon={CheckCircle2} accent="success" />
        <StatCard label="Bloquées" value={stats.blocked} icon={AlertOctagon} accent="warning" />
        <StatCard label="En retard" value={stats.overdue} icon={Clock} accent="warning" />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avancement</p>
            <p className="text-2xl font-bold mt-1">{stats.pct}%</p>
            <Progress value={stats.pct} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute l'équipe</SelectItem>
              {members.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Membre"}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {(Object.keys(STATUS_LABEL) as Task["status"][]).map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucune tâche. Cliquez sur « Nouvelle tâche ».</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="p-3">Intitulé</th>
                  <th className="p-3 w-40">Responsable</th>
                  <th className="p-3 w-32">Priorité</th>
                  <th className="p-3 w-36">Statut</th>
                  <th className="p-3 w-36">Échéance</th>
                  <th className="p-3 w-48">Difficultés</th>
                  <th className="p-3 w-48">Observations</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className={`border-t ${t.status === "done" ? "opacity-60" : ""}`}>
                    <td className="p-2">
                      <Input value={t.title} onChange={e => updateDebounced(t.id, "title", e.target.value)}
                        className={`border-transparent hover:border-input focus:border-input ${t._overdue ? "text-destructive" : ""}`} />
                    </td>
                    <td className="p-2">
                      <Select value={t.assigned_to || ""} onValueChange={v => updateImmediate(t.id, "assigned_to", v)}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {members.map(m => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Membre"}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select value={t.priority} onValueChange={v => updateImmediate(t.id, "priority", v)}>
                        <SelectTrigger>
                          <Badge variant={PRIO_VARIANT[t.priority]}>{PRIO_LABEL[t.priority]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PRIO_LABEL) as Task["priority"][]).map(p => <SelectItem key={p} value={p}>{PRIO_LABEL[p]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select value={t.status} onValueChange={v => updateImmediate(t.id, "status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABEL) as Task["status"][]).map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input type="date" value={t.due_date || ""} onChange={e => updateImmediate(t.id, "due_date", e.target.value || null)}
                        className={t._overdue ? "text-destructive border-destructive/40" : ""} />
                    </td>
                    <td className="p-2">
                      <Input value={t.difficulties || ""} placeholder="RAS" onChange={e => updateDebounced(t.id, "difficulties", e.target.value)}
                        className="border-transparent hover:border-input focus:border-input" />
                    </td>
                    <td className="p-2">
                      <Input value={t.observations || ""} placeholder="—" onChange={e => updateDebounced(t.id, "observations", e.target.value)}
                        className="border-transparent hover:border-input focus:border-input" />
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="icon" onClick={() => removeTask(t.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
