import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DOC_TYPES = [
  "Constat à l'amiable", "PV de constat", "PV définitif",
  "Jugement tribunal", "Ordonnance de non-lieu", "Rapport d'enquête", "Autre",
];

export default function DepotDocument() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({
    document_type: "Constat à l'amiable",
    claim_num: "", policy_num: "",
    reference_number: "", corps_unite: "",
    document_date: new Date().toISOString().slice(0, 10),
    resume: "",
  });
  const [linkedClaim, setLinkedClaim] = useState<{ id: string; claim_number: string; client_id: string; contract_id: string } | null>(null);
  const [linkedContract, setLinkedContract] = useState<{ id: string; contract_number: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const searchClaim = async () => {
    if (!f.claim_num) return;
    const { data } = await supabase.from("claims")
      .select("id, claim_number, client_id, contract_id")
      .eq("claim_number", f.claim_num).maybeSingle();
    setLinkedClaim(data ?? null);
    if (!data) toast.error("Sinistre introuvable");
  };
  const searchContract = async () => {
    if (!f.policy_num) return;
    const { data } = await supabase.from("contracts")
      .select("id, contract_number").eq("contract_number", f.policy_num).maybeSingle();
    setLinkedContract(data ?? null);
    if (!data) toast.error("Police introuvable");
  };

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      let file_url: string | undefined;
      if (file) {
        const path = `${user.id}/${Date.now()}/${file.name}`;
        const { error } = await supabase.storage.from("autorite-documents").upload(path, file);
        if (!error) file_url = path;
      }
      const { error } = await supabase.from("official_documents").insert({
        deposited_by: user.id,
        document_type: f.document_type,
        reference_number: f.reference_number || null,
        corps_unite: f.corps_unite || null,
        document_date: f.document_date,
        resume: f.resume || null,
        claim_id: linkedClaim?.id ?? null,
        contract_id: linkedContract?.id ?? linkedClaim?.contract_id ?? null,
        file_url,
      });
      if (error) throw error;
      if (linkedClaim?.contract_id) {
        const { data: ct } = await supabase.from("contracts").select("created_by")
          .eq("id", linkedClaim.contract_id).maybeSingle();
        if (ct?.created_by) {
          await supabase.from("notifications").insert({
            user_id: ct.created_by,
            title: "Document officiel reçu",
            body: `${f.document_type} déposé par ${f.corps_unite || "autorité"} pour le sinistre ${linkedClaim.claim_number}`,
            link: "/agent/sinistres",
            category: "info",
          });
        }
      }
      toast.success("Document déposé");
      nav("/autorite/documents");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Déposer un document" description="Dépôt officiel auprès des compagnies." />
      <Card className="p-5 space-y-4 max-w-2xl">
        <div>
          <Label>Type de document</Label>
          <Select value={f.document_type} onValueChange={(v) => setF({ ...f, document_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>N° sinistre (optionnel)</Label>
          <div className="flex gap-2">
            <Input value={f.claim_num} onChange={(e) => setF({ ...f, claim_num: e.target.value })} />
            <Button variant="outline" onClick={searchClaim}>Lier</Button>
          </div>
          {linkedClaim && <p className="text-xs text-green-600 mt-1">✓ Lié à {linkedClaim.claim_number}</p>}
        </div>
        <div>
          <Label>N° police (optionnel)</Label>
          <div className="flex gap-2">
            <Input value={f.policy_num} onChange={(e) => setF({ ...f, policy_num: e.target.value })} />
            <Button variant="outline" onClick={searchContract}>Lier</Button>
          </div>
          {linkedContract && <p className="text-xs text-green-600 mt-1">✓ Lié à {linkedContract.contract_number}</p>}
        </div>
        <div>
          <Label>N° de référence interne</Label>
          <Input value={f.reference_number} onChange={(e) => setF({ ...f, reference_number: e.target.value })} />
        </div>
        <div>
          <Label>Corps / Unité déposante</Label>
          <Input value={f.corps_unite} onChange={(e) => setF({ ...f, corps_unite: e.target.value })}
            placeholder="ex: Brigade de gendarmerie de Douala" />
        </div>
        <div>
          <Label>Date du document</Label>
          <Input type="date" value={f.document_date}
            onChange={(e) => setF({ ...f, document_date: e.target.value })} />
        </div>
        <div>
          <Label>Résumé des faits</Label>
          <Textarea value={f.resume} onChange={(e) => setF({ ...f, resume: e.target.value })} />
        </div>
        <div>
          <Label>Fichier (PDF ou image)</Label>
          <Input type="file" accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button onClick={submit} disabled={busy}>{busy ? "..." : "Déposer le document"}</Button>
      </Card>
    </div>
  );
}