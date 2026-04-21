import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentScanner } from "@/components/scan/DocumentScanner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Props { basePath: string }

export default function NouveauClient({ basePath }: Props) {
  const navigate = useNavigate();
  const { user, role, primaryCompanyId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    profession: "",
    id_number: "",
    date_of_birth: "",
    kind: "personne_physique" as "personne_physique" | "personne_morale",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const applyExtraction = (d: Record<string, unknown>) => {
    const nom = (d.nom as string) ?? "";
    const prenom = (d.prenom as string) ?? "";
    const full = [prenom, nom].filter(Boolean).join(" ").trim();
    setForm((p) => ({
      ...p,
      full_name: full || p.full_name,
      date_of_birth: (d.date_naissance as string) ?? p.date_of_birth,
      id_number: (d.numero_document as string) ?? p.id_number,
    }));
  };

  const save = async () => {
    if (!user) return;
    if (!form.full_name.trim()) {
      toast.error("Nom complet requis");
      return;
    }
    setSaving(true);
    try {
      const isClient = role === "client";
      const { data, error } = await supabase
        .from("clients")
        .insert({
          full_name: form.full_name.trim(),
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          profession: form.profession || null,
          id_number: form.id_number || null,
          date_of_birth: form.date_of_birth || null,
          kind: form.kind,
          company_id: primaryCompanyId || null,
          owner_user_id: isClient ? null : user.id,
          client_user_id: isClient ? user.id : null,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Erreur création");
      toast.success("Client créé");
      navigate(`${basePath}/clients/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau client"
        description="Créer une fiche client — scan CNI / permis pour pré-remplir."
        actions={
          <Button variant="ghost" onClick={() => navigate(`${basePath}/clients`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        }
      />

      <Card className="p-6 space-y-4">
        <div className="flex justify-end">
          <DocumentScanner docType="cni" companyId={primaryCompanyId} onExtracted={applyExtraction} compact />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={form.kind} onValueChange={(v) => set("kind", v as typeof form.kind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personne_physique">Particulier</SelectItem>
                <SelectItem value="personne_morale">Entreprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nom complet *</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="MBONGO Samuel" />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+237…" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Profession</Label>
            <Input value={form.profession} onChange={(e) => set("profession", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>N° pièce d'identité</Label>
            <Input value={form.id_number} onChange={(e) => set("id_number", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date de naissance</Label>
            <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">Créer le client</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}