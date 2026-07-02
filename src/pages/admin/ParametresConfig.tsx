import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

type AnyRow = Record<string, any>;

// ────────────────────────────────────────────────────────────
// Generic editable table for versioned tariff tables
// ────────────────────────────────────────────────────────────
function TarifTable({
  table,
  columns,
  country,
  filter,
  newRowDefaults,
}: {
  table: string;
  columns: { key: string; label: string; type?: "text" | "number" | "select"; options?: string[]; width?: string }[];
  country: string;
  filter?: Record<string, any>;
  newRowDefaults?: AnyRow;
}) {
  const qc = useQueryClient();
  const queryKey = ["cfg", table, country, JSON.stringify(filter ?? {})];

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase.from(table as any).select("*").eq("country_code", country).order("created_at", { ascending: true });
      if (filter) {
        for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as AnyRow[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AnyRow }) => {
      const { error } = await supabase.from(table as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: "Enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: "Supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const insert = useMutation({
    mutationFn: async (row: AnyRow) => {
      const { error } = await supabase.from(table as any).insert({ country_code: country, ...filter, ...newRowDefaults, ...row });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: "Ajouté" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const [drafts, setDrafts] = useState<Record<string, AnyRow>>({});
  const [newRow, setNewRow] = useState<AnyRow>({});

  const setDraft = (id: string, key: string, val: any) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: val } }));

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>;

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => <TableHead key={c.key} style={{ width: c.width }}>{c.label}</TableHead>)}
              <TableHead className="w-24">Actif</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const d = drafts[row.id] ?? {};
              const dirty = Object.keys(d).length > 0;
              return (
                <TableRow key={row.id}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>
                      {c.type === "select" ? (
                        <Select value={d[c.key] ?? row[c.key] ?? ""} onValueChange={(v) => setDraft(row.id, c.key, v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {c.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="h-8"
                          type={c.type === "number" ? "number" : "text"}
                          step={c.type === "number" ? "any" : undefined}
                          value={d[c.key] ?? row[c.key] ?? ""}
                          onChange={(e) => setDraft(row.id, c.key, c.type === "number" ? Number(e.target.value) : e.target.value)}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Switch
                      checked={d.actif ?? row.actif}
                      onCheckedChange={(v) => setDraft(row.id, "actif", v)}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      variant={dirty ? "default" : "ghost"}
                      disabled={!dirty}
                      onClick={() => {
                        update.mutate({ id: row.id, patch: d });
                        setDrafts((s) => { const n = { ...s }; delete n[row.id]; return n; });
                      }}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(row.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Card className="p-3 bg-muted/30">
        <div className="text-xs font-medium mb-2 text-muted-foreground">Ajouter une ligne</div>
        <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-6">
          {columns.map((c) => (
            <div key={c.key}>
              <Label className="text-xs">{c.label}</Label>
              {c.type === "select" ? (
                <Select value={newRow[c.key] ?? ""} onValueChange={(v) => setNewRow((r) => ({ ...r, [c.key]: v }))}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{c.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8"
                  type={c.type === "number" ? "number" : "text"}
                  step={c.type === "number" ? "any" : undefined}
                  value={newRow[c.key] ?? ""}
                  onChange={(e) => setNewRow((r) => ({ ...r, [c.key]: c.type === "number" ? Number(e.target.value) : e.target.value }))}
                />
              )}
            </div>
          ))}
          <div className="flex items-end">
            <Button size="sm" onClick={() => { insert.mutate(newRow); setNewRow({}); }}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Partenaires unifiés (CRUD)
// ────────────────────────────────────────────────────────────
function PartenairesPanel({ country }: { country: string }) {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AnyRow>({ type: "hopital", nom: "", pays_code: country, actif: true });

  const { data = [] } = useQuery({
    queryKey: ["partenaires", country, typeFilter],
    queryFn: async () => {
      let q = supabase.from("partenaires").select("*").eq("pays_code", country).order("nom");
      if (typeFilter !== "all") q = q.eq("type", typeFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (row: AnyRow) => {
      const payload = { ...row, pays_code: country };
      if (row.id) {
        const { error } = await supabase.from("partenaires").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partenaires").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["partenaires"] }); setOpen(false); toast({ title: "Enregistré" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("partenaires").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partenaires"] }),
  });

  const types = ["hopital", "clinique", "pharmacie", "garage", "expert", "centre_expertise", "laboratoire"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setForm({ type: "hopital", nom: "", pays_code: country, actif: true }); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau partenaire</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{form.id ? "Modifier" : "Nouveau"} partenaire</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Nom</Label><Input value={form.nom ?? ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Code</Label><Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                  <div><Label>N° agrément</Label><Input value={form.agrement_num ?? ""} onChange={(e) => setForm({ ...form, agrement_num: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Téléphone</Label><Input value={form.telephone ?? ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div><Label>Adresse</Label><Textarea rows={2} value={form.adresse ?? ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Switch checked={form.actif ?? true} onCheckedChange={(v) => setForm({ ...form, actif: v })} /><Label>Actif</Label></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate(form)}>Enregistrer</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead>Contact</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nom}</TableCell>
                <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.telephone ?? "—"} {p.email && `· ${p.email}`}</TableCell>
                <TableCell>{p.actif ? <Badge>Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}>Modifier</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aucun partenaire</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// App settings
// ────────────────────────────────────────────────────────────
function SettingsPanel() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").order("key")).data ?? [],
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase.from("app_settings").update({ value }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app_settings"] }); toast({ title: "Paramètre enregistré" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      {data.map((s: any) => {
        const current = drafts[s.key] ?? JSON.stringify(s.value);
        const dirty = drafts[s.key] !== undefined;
        return (
          <Card key={s.key} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-mono text-sm font-medium">{s.key}</div>
                {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
                <Input
                  className="mt-2 font-mono text-sm"
                  value={current}
                  onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                />
              </div>
              <Button
                size="sm"
                disabled={!dirty}
                onClick={() => {
                  try {
                    const parsed = JSON.parse(current);
                    save.mutate({ key: s.key, value: parsed });
                    setDrafts((d) => { const n = { ...d }; delete n[s.key]; return n; });
                  } catch {
                    toast({ title: "JSON invalide", variant: "destructive" });
                  }
                }}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Pays (toggle actif + TVA)
// ────────────────────────────────────────────────────────────
function PaysPanel() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["pays_cima"],
    queryFn: async () => (await supabase.from("pays_cima").select("*").order("nom")).data ?? [],
  });
  const update = useMutation({
    mutationFn: async ({ code, patch }: { code: string; patch: AnyRow }) => {
      const { error } = await supabase.from("pays_cima").update(patch).eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pays_cima"] }),
  });
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Pays</TableHead><TableHead>Devise</TableHead><TableHead>TVA</TableHead><TableHead>Actif</TableHead></TableRow></TableHeader>
        <TableBody>
          {data.map((p: any) => (
            <TableRow key={p.code}>
              <TableCell className="font-mono">{p.code}</TableCell>
              <TableCell>{p.nom}</TableCell>
              <TableCell>{p.devise}</TableCell>
              <TableCell>
                <Input
                  className="h-8 w-24"
                  type="number"
                  step="0.0001"
                  defaultValue={p.tva_taux}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== p.tva_taux) update.mutate({ code: p.code, patch: { tva_taux: v } });
                  }}
                />
              </TableCell>
              <TableCell>
                <Switch checked={p.actif} onCheckedChange={(v) => update.mutate({ code: p.code, patch: { actif: v } })} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────
export default function ParametresConfig() {
  const [country, setCountry] = useState<string>(() => localStorage.getItem("cfg_country") ?? "CM");
  const { data: pays = [] } = useQuery({
    queryKey: ["pays_cima_active"],
    queryFn: async () => (await supabase.from("pays_cima").select("code,nom").eq("actif", true).order("nom")).data ?? [],
  });

  const setCtry = (c: string) => { setCountry(c); localStorage.setItem("cfg_country", c); };

  return (
    <div className="space-y-6">
      <PageHeader title="Configuration" description="Tarifs, référentiels, partenaires et paramètres système — modifiable sans redéploiement." />

      <Card className="p-4 flex items-center gap-3">
        <Label>Pays</Label>
        <Select value={country} onValueChange={setCtry}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>{pays.map((p: any) => <SelectItem key={p.code} value={p.code}>{p.nom} ({p.code})</SelectItem>)}</SelectContent>
        </Select>
      </Card>

      <Tabs defaultValue="tarifs">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="tarifs">Tarifs Auto</TabsTrigger>
          <TabsTrigger value="voyage">Voyage</TabsTrigger>
          <TabsTrigger value="vie">Vie</TabsTrigger>
          <TabsTrigger value="gmc">GMC</TabsTrigger>
          <TabsTrigger value="partenaires">Partenaires</TabsTrigger>
          <TabsTrigger value="pays">Pays</TabsTrigger>
          <TabsTrigger value="systeme">Système</TabsTrigger>
        </TabsList>

        <TabsContent value="tarifs" className="space-y-6">
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Barème RC (par catégorie)</h3>
            <TarifTable
              table="tarif_bareme_rc"
              country={country}
              filter={{ produit: "auto" }}
              newRowDefaults={{ produit: "auto", categorie: "cat1" }}
              columns={[
                { key: "categorie", label: "Cat." },
                { key: "cv_min", label: "CV min", type: "number" },
                { key: "cv_max", label: "CV max", type: "number" },
                { key: "places_max", label: "Places max", type: "number" },
                { key: "ptac_max_kg", label: "PTAC max kg", type: "number" },
                { key: "cu_max_kg", label: "CU max kg", type: "number" },
                { key: "prime_annuelle", label: "Prime FCFA", type: "number" },
              ]}
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Taux garanties optionnelles</h3>
            <TarifTable
              table="tarif_taux_garantie"
              country={country}
              filter={{ produit: "auto" }}
              newRowDefaults={{ produit: "auto", base_calcul: "valeur_venale" }}
              columns={[
                { key: "categorie", label: "Cat." },
                { key: "code_garantie", label: "Code" },
                { key: "label", label: "Libellé" },
                { key: "base_calcul", label: "Base", type: "select", options: ["valeur_neuve", "valeur_venale", "prime_rc", "forfait"] },
                { key: "taux", label: "Taux", type: "number" },
              ]}
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">DTA vignette</h3>
            <TarifTable
              table="tarif_dta_vignette"
              country={country}
              columns={[
                { key: "usage", label: "Usage", type: "select", options: ["transport_commun", "autre"] },
                { key: "cv_min", label: "CV min", type: "number" },
                { key: "cv_max", label: "CV max", type: "number" },
                { key: "montant", label: "Montant", type: "number" },
              ]}
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Accessoires (par tranche)</h3>
            <TarifTable
              table="tarif_accessoires"
              country={country}
              columns={[
                { key: "prime_nette_min", label: "Prime min", type: "number" },
                { key: "prime_nette_max", label: "Prime max", type: "number" },
                { key: "montant", label: "Montant", type: "number" },
              ]}
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Options IPT</h3>
            <TarifTable
              table="tarif_options_ipt"
              country={country}
              columns={[
                { key: "code", label: "Code" },
                { key: "label", label: "Libellé" },
                { key: "capital_deces", label: "Décès", type: "number" },
                { key: "capital_invalidite", label: "Invalidité", type: "number" },
                { key: "frais_medicaux", label: "Frais méd.", type: "number" },
                { key: "prime_par_place", label: "Prime/place", type: "number" },
              ]}
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Frais fixes</h3>
            <TarifTable
              table="tarif_frais_fixes"
              country={country}
              columns={[
                { key: "code", label: "Code" },
                { key: "label", label: "Libellé" },
                { key: "montant", label: "Montant", type: "number" },
              ]}
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Réductions</h3>
            <TarifTable
              table="tarif_reductions"
              country={country}
              columns={[
                { key: "code", label: "Code" },
                { key: "label", label: "Libellé" },
                { key: "taux_max", label: "Taux max", type: "number" },
                { key: "plafond", label: "Plafond", type: "number" },
              ]}
            />
          </Card>
        </TabsContent>

        <TabsContent value="voyage" className="space-y-6">
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Zones Voyage</h3>
            <TarifTable
              table="tarif_voyage_zones"
              country={country}
              columns={[
                { key: "zone_code", label: "Code zone" },
                { key: "label", label: "Libellé" },
                { key: "coefficient", label: "Coefficient", type: "number" },
              ]}
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Barème (zone × durée × âge)</h3>
            <TarifTable
              table="tarif_voyage_bareme"
              country={country}
              columns={[
                { key: "zone_code", label: "Zone" },
                { key: "duree_min", label: "Durée min", type: "number" },
                { key: "duree_max", label: "Durée max", type: "number" },
                { key: "age_min", label: "Âge min", type: "number" },
                { key: "age_max", label: "Âge max", type: "number" },
                { key: "prime", label: "Prime", type: "number" },
              ]}
            />
          </Card>
        </TabsContent>

        <TabsContent value="vie" className="space-y-6">
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Barème Vie (par âge)</h3>
            <TarifTable
              table="tarif_vie_bareme"
              country={country}
              columns={[
                { key: "age_min", label: "Âge min", type: "number" },
                { key: "age_max", label: "Âge max", type: "number" },
                { key: "taux_annuel", label: "Taux annuel", type: "number" },
              ]}
            />
          </Card>
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Périodicités</h3>
            <TarifTable
              table="tarif_vie_periodicites"
              country={country}
              columns={[
                { key: "code", label: "Code" },
                { key: "label", label: "Libellé" },
                { key: "diviseur", label: "Diviseur", type: "number" },
                { key: "majoration", label: "Majoration", type: "number" },
              ]}
            />
          </Card>
        </TabsContent>

        <TabsContent value="gmc" className="space-y-6">
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Barème GMC (santé)</h3>
            <TarifTable
              table="tarif_gmc_bareme"
              country={country}
              columns={[
                { key: "formule", label: "Formule", type: "select", options: ["essentielle", "confort", "premium"] },
                { key: "age_min", label: "Âge min", type: "number" },
                { key: "age_max", label: "Âge max", type: "number" },
                { key: "prime_annuelle", label: "Prime", type: "number" },
                { key: "plafond_annuel", label: "Plafond", type: "number" },
                { key: "ticket_moderateur", label: "Ticket mod.", type: "number" },
              ]}
            />
          </Card>
        </TabsContent>

        <TabsContent value="partenaires"><PartenairesPanel country={country} /></TabsContent>
        <TabsContent value="pays"><PaysPanel /></TabsContent>
        <TabsContent value="systeme"><SettingsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}