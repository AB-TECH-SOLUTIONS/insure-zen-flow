import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type AppRole } from "@/types/roles";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  full_name: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

export default function Roles() {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");

  const load = async () => {
    setLoading(true);
    const [{ data: ur }, { data: pr }] = await Promise.all([
      supabase.from("user_roles").select("id,user_id,role,created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id,full_name"),
    ]);
    const profMap = new Map((pr ?? []).map((p) => [p.user_id, p.full_name]));
    setRows(((ur ?? []) as Array<{ id: string; user_id: string; role: AppRole; created_at: string }>).map((r) => ({
      ...r,
      full_name: profMap.get(r.user_id) ?? null,
    })));
    setProfiles((pr ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredProfiles = profiles.filter((p) =>
    !search || (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const assign = async () => {
    if (!selectedUser || !selectedRole) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUser,
      role: selectedRole as AppRole,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Rôle attribué");
    setOpen(false);
    setSelectedUser(""); setSelectedRole(""); setSearch("");
    load();
  };

  const revoke = async (row: Row) => {
    if (row.role === "super_admin") {
      const remaining = rows.filter((r) => r.role === "super_admin").length;
      if (remaining <= 1) {
        toast.error("Impossible de révoquer le dernier super administrateur.");
        return;
      }
    }
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", row.user_id)
      .eq("role", row.role);
    if (error) { toast.error(error.message); return; }
    toast.success("Rôle révoqué");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rôles & accès"
        description="Gérez les rôles attribués aux utilisateurs de la plateforme."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Attribuer un rôle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Attribuer un rôle</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Rechercher un utilisateur…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
                  <SelectContent>
                    {filteredProfiles.slice(0, 50).map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name || p.user_id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={assign} disabled={!selectedUser || !selectedRole}>Attribuer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Aucun rôle attribué.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Depuis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.full_name || <span className="text-muted-foreground">{r.user_id.slice(0, 8)}…</span>}</TableCell>
                  <TableCell><Badge variant="secondary">{ROLE_LABELS[r.role]}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => revoke(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}