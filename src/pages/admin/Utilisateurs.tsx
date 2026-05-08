import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, type AppRole } from "@/types/roles";
import { toast } from "sonner";

interface Profile {
  id: string; user_id: string; full_name: string | null; phone: string | null;
  is_active: boolean; primary_company_id: string | null;
}

const ROLES: AppRole[] = ["client","agent","courtier","assureur","super_admin","garage","expert","hopital","pharmacie","autorite","reassureur"];

export default function Utilisateurs() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole[]>>({});
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const [{ data: p }, { data: ur }, { data: c }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("companies").select("id,name").order("name"),
    ]);
    setProfiles((p as Profile[]) ?? []);
    const map: Record<string, AppRole[]> = {};
    (ur ?? []).forEach((r: { user_id: string; role: AppRole }) => {
      (map[r.user_id] ??= []).push(r.role);
    });
    setRoles(map);
    setCompanies((c as { id: string; name: string }[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (p: Profile) => {
    const { error } = await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message); else load();
  };

  const setRole = async (userId: string, role: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error(error.message); else { toast.success("Rôle mis à jour"); load(); }
  };

  const setCompany = async (p: Profile, companyId: string) => {
    const { error } = await supabase.from("profiles").update({ primary_company_id: companyId || null }).eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Compagnie assignée"); load(); }
  };

  const filtered = profiles.filter((p) =>
    !q || (p.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || (p.phone ?? "").includes(q)
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Utilisateurs" description="Gérez les comptes, rôles et rattachements aux compagnies." />
      <Input placeholder="Rechercher (nom, téléphone)…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      <Card className="divide-y">
        {filtered.map((p) => {
          const userRoles = roles[p.user_id] ?? [];
          return (
            <div key={p.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-4">
              <div>
                <div className="font-medium">{p.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">{p.phone || ""}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {userRoles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABELS[r]}</Badge>)}
                {userRoles.length === 0 && <Badge variant="outline">Aucun rôle</Badge>}
              </div>
              <Select onValueChange={(v) => setRole(p.user_id, v as AppRole)}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Changer rôle" /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={p.primary_company_id ?? ""} onValueChange={(v) => setCompany(p, v)}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Compagnie" /></SelectTrigger>
                <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center justify-end gap-2">
                <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                <span className="text-xs text-muted-foreground">{p.is_active ? "Actif" : "Désactivé"}</span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">Aucun utilisateur.</div>}
      </Card>
    </div>
  );
}