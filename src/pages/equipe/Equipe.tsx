import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Send, Trash2, Building2, UserPlus } from "lucide-react";
import type { AppRole } from "@/types/roles";
import { ROLE_LABELS } from "@/types/roles";
import { PageHeader } from "@/components/PageHeader";

type Department = { id: string; name: string; description: string | null };
type Position = { id: string; title: string; department_id: string | null; level: number };
type Member = { id: string; user_id: string; position_id: string | null; is_active: boolean; joined_at: string; notes: string | null };
type Profile = { user_id: string; full_name: string | null };
type Invitation = { id: string; email: string; role: AppRole; status: string; expires_at: string; token: string; created_at: string };

const ROLES: AppRole[] = ["agent", "courtier", "assureur", "garage", "expert", "hopital", "pharmacie", "autorite", "reassureur"];

export default function Equipe() {
  const { user, primaryCompanyId, role } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(primaryCompanyId);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // dialogs
  const [depOpen, setDepOpen] = useState(false);
  const [depName, setDepName] = useState("");
  const [posOpen, setPosOpen] = useState(false);
  const [posTitle, setPosTitle] = useState("");
  const [posDep, setPosDep] = useState<string>("");
  const [invOpen, setInvOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<AppRole>("agent");
  const [invPos, setInvPos] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (!companyId && user) {
        // fallback: première compagnie accessible
        const { data } = await supabase.from("companies").select("id").limit(1).maybeSingle();
        if (data) setCompanyId(data.id);
      }
    })();
  }, [companyId, user]);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const [dep, pos, mem, inv] = await Promise.all([
      supabase.from("departments").select("*").eq("company_id", companyId).order("name"),
      supabase.from("positions").select("*").eq("company_id", companyId).order("title"),
      supabase.from("team_members").select("*").eq("company_id", companyId).order("joined_at", { ascending: false }),
      supabase.from("invitations").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);
    setDepartments((dep.data as Department[]) ?? []);
    setPositions((pos.data as Position[]) ?? []);
    setMembers((mem.data as Member[]) ?? []);
    setInvitations((inv.data as Invitation[]) ?? []);
    const userIds = (mem.data ?? []).map((m: any) => m.user_id);
    if (userIds.length) {
      const { data: pr } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map: Record<string, Profile> = {};
      (pr ?? []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [companyId]);

  const createDepartment = async () => {
    if (!depName.trim() || !companyId) return;
    const { error } = await supabase.from("departments").insert({ company_id: companyId, name: depName.trim() });
    if (error) return toast.error(error.message);
    toast.success("Département créé");
    setDepName(""); setDepOpen(false); load();
  };

  const createPosition = async () => {
    if (!posTitle.trim() || !companyId) return;
    const { error } = await supabase.from("positions").insert({
      company_id: companyId, title: posTitle.trim(), department_id: posDep || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Poste créé");
    setPosTitle(""); setPosDep(""); setPosOpen(false); load();
  };

  const sendInvitation = async () => {
    if (!invEmail.trim() || !companyId) return;
    const { data, error } = await supabase.from("invitations").insert({
      company_id: companyId, email: invEmail.trim().toLowerCase(), role: invRole,
      position_id: invPos || null, invited_by: user?.id,
    }).select().single();
    if (error) return toast.error(error.message);
    const link = `${window.location.origin}/invitation/${data.token}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    toast.success("Invitation créée — lien copié dans le presse-papier", { description: link });
    setInvEmail(""); setInvOpen(false); load();
  };

  const revokeInvitation = async (id: string) => {
    await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
    load();
  };

  const deactivateMember = async (id: string) => {
    await supabase.from("team_members").update({ is_active: false }).eq("id", id);
    toast.success("Membre désactivé");
    load();
  };

  const positionTitle = (id: string | null) =>
    id ? positions.find((p) => p.id === id)?.title ?? "—" : "—";

  const stats = useMemo(() => ({
    members: members.filter((m) => m.is_active).length,
    departments: departments.length,
    positions: positions.length,
    pending: invitations.filter((i) => i.status === "pending").length,
  }), [members, departments, positions, invitations]);

  if (!companyId) {
    return <div className="text-muted-foreground">Aucune compagnie associée à votre profil.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mon équipe" description="Départements, postes, collaborateurs et invitations" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Collaborateurs actifs" value={stats.members} />
        <Stat label="Départements" value={stats.departments} />
        <Stat label="Postes" value={stats.positions} />
        <Stat label="Invitations en attente" value={stats.pending} />
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Collaborateurs</TabsTrigger>
          <TabsTrigger value="departments">Départements</TabsTrigger>
          <TabsTrigger value="positions">Postes</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Collaborateurs</CardTitle>
              <Dialog open={invOpen} onOpenChange={setInvOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="h-4 w-4 mr-2" />Inviter</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Inviter un collaborateur</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Email</Label><Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} /></div>
                    <div>
                      <Label>Rôle</Label>
                      <Select value={invRole} onValueChange={(v) => setInvRole(v as AppRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Poste (optionnel)</Label>
                      <Select value={invPos} onValueChange={setInvPos}>
                        <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                        <SelectContent>
                          {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={sendInvitation}><Send className="h-4 w-4 mr-2" />Créer l'invitation</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Depuis</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{profiles[m.user_id]?.full_name ?? m.user_id.slice(0, 8)}</TableCell>
                      <TableCell>{positionTitle(m.position_id)}</TableCell>
                      <TableCell>{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Actif" : "Inactif"}</Badge>
                      </TableCell>
                      <TableCell>
                        {m.is_active && (
                          <Button size="sm" variant="ghost" onClick={() => deactivateMember(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!members.length && !loading && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun collaborateur. Invitez votre équipe.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Départements</CardTitle>
              <Dialog open={depOpen} onOpenChange={setDepOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouveau</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nouveau département</DialogTitle></DialogHeader>
                  <Input placeholder="Production, Sinistres, Comptabilité…" value={depName} onChange={(e) => setDepName(e.target.value)} />
                  <DialogFooter><Button onClick={createDepartment}>Créer</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                <TableBody>
                  {departments.map((d) => (
                    <TableRow key={d.id}><TableCell className="font-medium">{d.name}</TableCell><TableCell className="text-muted-foreground">{d.description ?? "—"}</TableCell></TableRow>
                  ))}
                  {!departments.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Aucun département.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Postes</CardTitle>
              <Dialog open={posOpen} onOpenChange={setPosOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouveau</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nouveau poste</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Intitulé</Label><Input value={posTitle} onChange={(e) => setPosTitle(e.target.value)} /></div>
                    <div>
                      <Label>Département</Label>
                      <Select value={posDep} onValueChange={setPosDep}>
                        <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={createPosition}>Créer</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Intitulé</TableHead><TableHead>Département</TableHead><TableHead>Niveau</TableHead></TableRow></TableHeader>
                <TableBody>
                  {positions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{departments.find((d) => d.id === p.department_id)?.name ?? "—"}</TableCell>
                      <TableCell>{p.level}</TableCell>
                    </TableRow>
                  ))}
                  {!positions.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucun poste.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader><CardTitle>Invitations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expire</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((i) => {
                    const link = `${window.location.origin}/invitation/${i.token}`;
                    return (
                      <TableRow key={i.id}>
                        <TableCell>{i.email}</TableCell>
                        <TableCell>{ROLE_LABELS[i.role]}</TableCell>
                        <TableCell>
                          <Badge variant={i.status === "pending" ? "default" : i.status === "accepted" ? "secondary" : "outline"}>
                            {i.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(i.expires_at).toLocaleDateString()}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast.success("Lien copié"); }}>Copier</Button>
                          {i.status === "pending" && (
                            <Button size="sm" variant="ghost" onClick={() => revokeInvitation(i.id)}><Trash2 className="h-4 w-4" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!invitations.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucune invitation.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}