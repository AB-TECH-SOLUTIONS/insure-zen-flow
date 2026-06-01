import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Download, Send } from "lucide-react";
import { formatFCFA } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  declare: "bg-blue-500",
  en_instruction: "bg-amber-500",
  expertise: "bg-purple-500",
  regle: "bg-green-500",
  refuse: "bg-red-500",
  clos: "bg-gray-400",
};
const STATUSES = ["declare", "en_instruction", "expertise", "regle", "refuse", "clos"];

interface Claim {
  id: string; claim_number: string; status: string; occurred_at: string;
  description: string | null; estimated_amount: number | null; settled_amount: number | null;
  attachments: Array<{ name?: string; path: string }>;
  handler_notes: string | null; client_id: string; contract_id: string; company_id: string;
  declared_by: string | null;
}
interface ClaimEvent { id: string; event_type: string; old_status: string | null; new_status: string | null; comment: string | null; created_by: string | null; created_at: string; }

export default function DetailSinistre({ basePath }: { basePath: string }) {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const canManage = role && ["agent", "assureur", "super_admin"].includes(role);

  const [claim, setClaim] = useState<Claim | null>(null);
  const [events, setEvents] = useState<ClaimEvent[]>([]);
  const [clientName, setClientName] = useState("");
  const [contractNum, setContractNum] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [expertise, setExpertise] = useState<{ etat_vehicule: string; valeur_avant: number | null; valeur_apres: number | null; recommandation: string | null } | null>(null);
  const [garageQuotes, setGarageQuotes] = useState<Array<{ id: string; description: string | null; montant_total: number | null; delai_jours: number | null; statut: string }>>([]);
  const [officialDocs, setOfficialDocs] = useState<Array<{ id: string; document_type: string; reference_number: string | null; file_url: string | null }>>([]);
  const [notes, setNotes] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const { data: c } = await supabase.from("claims").select("*").eq("id", id).maybeSingle();
    if (!c) { setLoading(false); return; }
    setClaim(c as unknown as Claim);
    setNotes(((c as unknown as Claim).handler_notes) ?? "");

    const [{ data: cli }, { data: ct }, { data: comp }, { data: ev }, { data: exp }, { data: gq }, { data: od }] = await Promise.all([
      supabase.from("clients").select("full_name").eq("id", c.client_id).maybeSingle(),
      supabase.from("contracts").select("contract_number").eq("id", c.contract_id).maybeSingle(),
      supabase.from("companies").select("name").eq("id", c.company_id).maybeSingle(),
      supabase.from("claim_events").select("*").eq("claim_id", id).order("created_at"),
      supabase.from("expertise_reports").select("etat_vehicule,valeur_avant,valeur_apres,recommandation").eq("claim_id", id).maybeSingle(),
      supabase.from("garage_quotes").select("id,description,montant_total,delai_jours,statut").eq("claim_id", id),
      supabase.from("official_documents").select("id,document_type,reference_number,file_url").eq("claim_id", id),
    ]);
    setClientName(cli?.full_name ?? "—");
    setContractNum(ct?.contract_number ?? "—");
    setCompanyName(comp?.name ?? "—");
    setEvents((ev as ClaimEvent[]) ?? []);
    setExpertise(exp as typeof expertise);
    setGarageQuotes(gq ?? []);
    setOfficialDocs(od ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const saveNotes = async () => {
    if (!claim) return;
    const { error } = await supabase.from("claims").update({ handler_notes: notes }).eq("id", claim.id);
    if (error) toast.error(error.message); else toast.success("Note sauvegardée");
  };

  const changeStatus = async (status: string) => {
    if (!claim) return;
    const patch: Record<string, unknown> = { status };
    if (status === "regle") {
      const v = prompt("Montant réglé (FCFA)", String(claim.estimated_amount ?? 0));
      if (v !== null) patch.settled_amount = Number(v);
    }
    const { error } = await supabase.from("claims").update(patch as never).eq("id", claim.id);
    if (error) toast.error(error.message); else { toast.success("Statut mis à jour"); load(); }
  };

  const addComment = async () => {
    if (!claim || !comment.trim() || !user) return;
    const { error } = await supabase.from("claim_events").insert({
      claim_id: claim.id, event_type: "comment", comment: comment.trim(), created_by: user.id,
    });
    if (error) toast.error(error.message); else { setComment(""); load(); }
  };

  const dlAttachment = async (path: string) => {
    const { data } = await supabase.storage.from("claim-documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  if (!claim) return <div className="p-6">Sinistre introuvable.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={claim.claim_number}
        description={`${companyName} — ${clientName} — ${new Date(claim.occurred_at).toLocaleDateString("fr-FR")}`}
        actions={
          <Button variant="outline" asChild>
            <Link to={`${basePath}/sinistres`}><ArrowLeft className="h-4 w-4 mr-2" /> Retour</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Informations</h3>
              <Badge className={`${STATUS_COLORS[claim.status]} text-white`}>{claim.status}</Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-muted-foreground text-xs">Contrat</div><Link className="text-primary underline" to={`${basePath}/contrats/${claim.contract_id}`}>{contractNum}</Link></div>
              <div><div className="text-muted-foreground text-xs">Assuré</div><div>{clientName}</div></div>
              <div><div className="text-muted-foreground text-xs">Montant estimé</div><div>{claim.estimated_amount ? formatFCFA(Number(claim.estimated_amount)) : "—"}</div></div>
              <div><div className="text-muted-foreground text-xs">Montant réglé</div><div>{claim.settled_amount ? formatFCFA(Number(claim.settled_amount)) : "—"}</div></div>
              <div className="col-span-2"><div className="text-muted-foreground text-xs">Description</div><div>{claim.description || "—"}</div></div>
            </div>
            {canManage && (
              <div className="pt-2">
                <Select value={claim.status} onValueChange={changeStatus}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </Card>

          {claim.attachments?.length > 0 && (
            <Card className="p-6 space-y-2">
              <h3 className="font-display font-semibold">Documents joints</h3>
              {claim.attachments.map((a, i) => (
                <Button key={i} variant="ghost" size="sm" onClick={() => dlAttachment(a.path)}>
                  <Download className="h-3 w-3 mr-2" />{a.name ?? a.path.split("/").pop()}
                </Button>
              ))}
            </Card>
          )}

          {canManage && (
            <Card className="p-6 space-y-3">
              <h3 className="font-display font-semibold">Notes du gestionnaire</h3>
              <Textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes internes…" />
              <Button size="sm" onClick={saveNotes}><Save className="h-4 w-4 mr-2" />Sauvegarder</Button>
            </Card>
          )}

          {expertise && (
            <Card className="p-6 space-y-2">
              <h3 className="font-display font-semibold">Rapport d'expertise</h3>
              <div className="text-sm grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">État :</span> {expertise.etat_vehicule}</div>
                <div><span className="text-muted-foreground">Valeur avant :</span> {expertise.valeur_avant ? formatFCFA(Number(expertise.valeur_avant)) : "—"}</div>
                <div><span className="text-muted-foreground">Valeur après :</span> {expertise.valeur_apres ? formatFCFA(Number(expertise.valeur_apres)) : "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Reco :</span> {expertise.recommandation || "—"}</div>
              </div>
            </Card>
          )}

          {garageQuotes.length > 0 && (
            <Card className="p-6 space-y-2">
              <h3 className="font-display font-semibold">Devis garage</h3>
              {garageQuotes.map(q => (
                <div key={q.id} className="border-t pt-2 text-sm">
                  <div className="flex justify-between"><span>{q.description || "—"}</span><span className="font-mono">{q.montant_total ? formatFCFA(Number(q.montant_total)) : "—"}</span></div>
                  <div className="text-xs text-muted-foreground">Délai : {q.delai_jours ?? "—"} j • Statut : {q.statut}</div>
                </div>
              ))}
            </Card>
          )}

          {officialDocs.length > 0 && (
            <Card className="p-6 space-y-2">
              <h3 className="font-display font-semibold">Documents officiels</h3>
              {officialDocs.map(d => (
                <div key={d.id} className="flex justify-between text-sm border-t pt-2">
                  <span>{d.document_type} {d.reference_number && `— ${d.reference_number}`}</span>
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary underline">Télécharger</a>}
                </div>
              ))}
            </Card>
          )}
        </div>

        <Card className="p-6 space-y-4 h-fit">
          <h3 className="font-display font-semibold">Chronologie</h3>
          <div className="space-y-4 relative">
            {events.length === 0 && <p className="text-xs text-muted-foreground">Aucun événement.</p>}
            {events.map((e) => (
              <div key={e.id} className="flex gap-3">
                <div className={`h-3 w-3 rounded-full mt-1 ${STATUS_COLORS[e.new_status ?? ""] ?? "bg-muted"}`} />
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    {e.event_type === "status_change" ? `Statut : ${e.new_status}` : "Commentaire"}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-FR")}</div>
                  {e.comment && <div className="text-sm mt-1">{e.comment}</div>}
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <Textarea rows={2} placeholder="Ajouter un commentaire…" value={comment} onChange={e => setComment(e.target.value)} />
            <Button size="sm" className="w-full" onClick={addComment} disabled={!comment.trim()}>
              <Send className="h-3 w-3 mr-2" />Publier
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}