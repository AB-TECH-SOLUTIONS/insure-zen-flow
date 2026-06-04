import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VehiculeFormDialog } from "@/components/vehicules/VehiculeFormDialog";
import { ArrowLeft, Plus, Save, Car, FileText, Receipt, Loader2, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";

interface Props { basePath: string }

type Client = {
  id: string; full_name: string; phone: string | null; email: string | null;
  address: string | null; profession: string | null; id_number: string | null;
  date_of_birth: string | null; kind: "personne_physique" | "personne_morale";
  company_id: string | null;
};
type Vehicle = { id: string; brand: string | null; model: string | null; registration: string | null; fiscal_power: number | null; energy: string | null };
type Quote = { id: string; reference: string; type: string; status: string; total_premium: number | null; created_at: string };
type Contract = { id: string; contract_number: string; type: string; status: string; total_premium: number; start_date: string; end_date: string };

export default function DetailClient({ basePath }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { primaryCompanyId } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehDialog, setVehDialog] = useState<{ open: boolean; vehicleId: string | null }>({ open: false, vehicleId: null });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [c, v, q, k] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("vehicles").select("id,brand,model,registration,fiscal_power,energy").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("quotes").select("id,reference,type,status,total_premium,created_at").eq("client_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("contracts").select("id,contract_number,type,status,total_premium,start_date,end_date").eq("client_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    setClient((c.data as Client) ?? null);
    setVehicles((v.data as Vehicle[]) ?? []);
    setQuotes((q.data as Quote[]) ?? []);
    setContracts((k.data as Contract[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const update = <K extends keyof Client>(k: K, v: Client[K]) =>
    setClient((p) => (p ? { ...p, [k]: v } : p));

  const save = async () => {
    if (!client) return;
    setSaving(true);
    const { error } = await supabase.from("clients").update({
      full_name: client.full_name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      profession: client.profession,
      id_number: client.id_number,
      date_of_birth: client.date_of_birth,
    }).eq("id", client.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Client mis à jour");
  };

  if (loading) return <div className="text-muted-foreground">Chargement…</div>;
  if (!client) return <div className="text-muted-foreground">Client introuvable.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.full_name}
        description={`${client.kind === "personne_morale" ? "Entreprise" : "Particulier"}${client.phone ? " · " + client.phone : ""}`}
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link to={`${basePath}/cotations/nouvelle?client=${client.id}`}>
                <Sparkles className="h-4 w-4 mr-2" /> Nouvelle cotation
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => navigate(`${basePath}/clients`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Informations</TabsTrigger>
          <TabsTrigger value="vehicules"><Car className="h-3 w-3 mr-1" />Véhicules ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="cotations"><Receipt className="h-3 w-3 mr-1" />Cotations ({quotes.length})</TabsTrigger>
          <TabsTrigger value="contrats"><FileText className="h-3 w-3 mr-1" />Contrats ({contracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nom complet</Label><Input value={client.full_name} onChange={(e) => update("full_name", e.target.value)} /></div>
              <div className="space-y-2"><Label>Téléphone</Label><Input value={client.phone ?? ""} onChange={(e) => update("phone", e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={client.email ?? ""} onChange={(e) => update("email", e.target.value)} /></div>
              <div className="space-y-2"><Label>Profession</Label><Input value={client.profession ?? ""} onChange={(e) => update("profession", e.target.value)} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Adresse</Label><Input value={client.address ?? ""} onChange={(e) => update("address", e.target.value)} /></div>
              <div className="space-y-2"><Label>N° pièce d'identité</Label><Input value={client.id_number ?? ""} onChange={(e) => update("id_number", e.target.value)} /></div>
              <div className="space-y-2"><Label>Date de naissance</Label><Input type="date" value={client.date_of_birth ?? ""} onChange={(e) => update("date_of_birth", e.target.value)} /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="ml-2">Enregistrer</span>
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="vehicules">
          <Card>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">Véhicules du client</h3>
              <Button size="sm" onClick={() => setVehDialog({ open: true, vehicleId: null })}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter un véhicule
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Marque / Modèle</TableHead>
                  <TableHead>Énergie</TableHead>
                  <TableHead>CV</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun véhicule.</TableCell></TableRow>
                )}
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.registration ?? "—"}</TableCell>
                    <TableCell>{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{v.energy ?? "—"}</TableCell>
                    <TableCell>{v.fiscal_power ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setVehDialog({ open: true, vehicleId: v.id })}>
                        <Pencil className="h-3 w-3 mr-1" /> Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="cotations">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Prime TTC</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune cotation.</TableCell></TableRow>
                )}
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm">{q.reference}</TableCell>
                    <TableCell><Badge variant="secondary">{q.type}</Badge></TableCell>
                    <TableCell><Badge>{q.status}</Badge></TableCell>
                    <TableCell>{q.total_premium ? formatFCFA(q.total_premium) : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(q.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline"><Link to={`${basePath}/cotations/${q.id}`}>Ouvrir</Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="contrats">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° contrat</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Prime</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun contrat.</TableCell></TableRow>
                )}
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.contract_number}</TableCell>
                    <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
                    <TableCell><Badge>{c.status}</Badge></TableCell>
                    <TableCell>{formatFCFA(c.total_premium)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.start_date).toLocaleDateString("fr-FR")} → {new Date(c.end_date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline"><Link to={`${basePath}/contrats/${c.id}`}>Ouvrir</Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <VehiculeFormDialog
        open={vehDialog.open}
        onOpenChange={(o) => setVehDialog((p) => ({ ...p, open: o }))}
        clientId={client.id}
        companyId={client.company_id ?? primaryCompanyId}
        vehicleId={vehDialog.vehicleId}
        onSaved={load}
      />
    </div>
  );
}