import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, FileSignature, Loader2, Send } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { generateDecomptePdf } from "@/lib/pdf/decomptePdf";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface QuoteFull {
  id: string;
  reference: string;
  type: "auto" | "voyage" | "risques_divers";
  status: string;
  total_premium: number | null;
  base_premium: number | null;
  taxes: number | null;
  created_at: string;
  duration_days: number | null;
  start_date: string | null;
  end_date: string | null;
  company_id: string;
  client_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  breakdown: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  notes: string | null;
}

export default function DetailCotation({ basePath }: { basePath: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<QuoteFull | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      setQuote(data as QuoteFull);
      const [{ data: comp }, { data: cli }] = await Promise.all([
        supabase.from("companies").select("name").eq("id", data.company_id).maybeSingle(),
        data.client_id
          ? supabase.from("clients").select("full_name").eq("id", data.client_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setCompanyName(comp?.name ?? "");
      setClientName(cli?.full_name ?? "—");
      setLoading(false);
    })();
  }, [id]);

  const downloadPdf = () => {
    if (!quote) return;
    const b = quote.breakdown ?? {};
    const doc = generateDecomptePdf({
      reference: quote.reference,
      type: quote.type,
      companyName,
      clientName,
      createdAt: quote.created_at,
      lignes: (b.lignes ?? []).map((l: { label: string; montant: number }) => ({
        label: l.label,
        montant: l.montant,
      })),
      primeNette: b.primeNette ?? quote.base_premium ?? 0,
      reductionRC: b.reductionRC,
      primeNetteApresReduction: b.primeNetteApresReduction,
      accessoires: b.accessoires ?? 0,
      fichierCentral: b.fichierCentral,
      dta: b.dta,
      carteRose: b.carteRose,
      tva: b.tva ?? quote.taxes ?? 0,
      primeTTC: b.primeTTC ?? quote.total_premium ?? 0,
    });
    doc.save(`${quote.reference}.pdf`);
  };

  const sendToClient = async () => {
    if (!quote) return;
    await supabase.from("quotes").update({ status: "envoyee" }).eq("id", quote.id);
    setQuote({ ...quote, status: "envoyee" });
    toast.success("Cotation marquée comme envoyée");
  };

  const accept = async () => {
    if (!quote) return;
    await supabase.from("quotes").update({ status: "acceptee" }).eq("id", quote.id);
    setQuote({ ...quote, status: "acceptee" });
    toast.success("Cotation acceptée — vous pouvez la convertir en contrat");
  };

  const convertToContract = async () => {
    if (!quote || !user) return;
    if (!quote.client_id) {
      toast.error("Cotation sans client — impossible de convertir");
      return;
    }
    setConverting(true);
    try {
      const { data: numData, error: numErr } = await supabase.rpc("next_contract_number", {
        _company_id: quote.company_id,
        _product: quote.type,
      });
      if (numErr || !numData) throw new Error(numErr?.message ?? "Numérotation impossible");
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + (quote.duration_days ?? 365));
      const { data: contract, error: cErr } = await supabase
        .from("contracts")
        .insert({
          contract_number: numData as string,
          quote_id: quote.id,
          client_id: quote.client_id,
          company_id: quote.company_id,
          type: quote.type,
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          total_premium: quote.total_premium ?? 0,
          status: "actif",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (cErr || !contract) throw new Error(cErr?.message ?? "Erreur création contrat");
      await supabase.from("quotes").update({ status: "acceptee" }).eq("id", quote.id);
      toast.success(`Contrat ${numData} créé`);
      navigate(`${basePath}/contrats/${contract.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  if (!quote) return <div className="p-6">Cotation introuvable.</div>;

  const b = quote.breakdown ?? {};
  const lignes = (b.lignes ?? []) as { label: string; montant: number }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Cotation ${quote.reference}`}
        description={`${quote.type.toUpperCase()} — ${companyName} — ${clientName}`}
        actions={
          <Button variant="outline" asChild>
            <Link to={`${basePath}/cotations`}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Décompte</h3>
              <Badge variant={quote.status === "acceptee" ? "default" : "secondary"}>
                {quote.status}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              {lignes
                .filter((l) => l.montant > 0)
                .map((l) => (
                  <div key={l.label} className="flex justify-between">
                    <span>{l.label}</span>
                    <span className="font-mono">{formatFCFA(l.montant)}</span>
                  </div>
                ))}
              <Separator className="my-3" />
              <div className="flex justify-between">
                <span>Prime nette</span>
                <span className="font-mono">{formatFCFA(b.primeNette ?? 0)}</span>
              </div>
              {b.reductionRC > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Réduction RC</span>
                  <span className="font-mono">- {formatFCFA(b.reductionRC)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Accessoires</span>
                <span className="font-mono">{formatFCFA(b.accessoires ?? 0)}</span>
              </div>
              {b.fichierCentral > 0 && (
                <div className="flex justify-between">
                  <span>Fichier central</span>
                  <span className="font-mono">{formatFCFA(b.fichierCentral)}</span>
                </div>
              )}
              {b.dta > 0 && (
                <div className="flex justify-between">
                  <span>Droit de timbre</span>
                  <span className="font-mono">{formatFCFA(b.dta)}</span>
                </div>
              )}
              {b.carteRose > 0 && (
                <div className="flex justify-between">
                  <span>Carte rose CEMAC</span>
                  <span className="font-mono">{formatFCFA(b.carteRose)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>TVA</span>
                <span className="font-mono">{formatFCFA(b.tva ?? quote.taxes ?? 0)}</span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-base font-semibold">
                <span>Prime TTC</span>
                <span className="font-mono text-primary">
                  {formatFCFA(b.primeTTC ?? quote.total_premium ?? 0)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="p-4 space-y-2">
            <Button onClick={downloadPdf} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" /> Télécharger le PDF
            </Button>
            {quote.status === "brouillon" && (
              <Button onClick={sendToClient} variant="outline" className="w-full">
                <Send className="h-4 w-4 mr-2" /> Marquer comme envoyée
              </Button>
            )}
            {quote.status === "envoyee" && (
              <Button onClick={accept} variant="outline" className="w-full">
                Marquer comme acceptée
              </Button>
            )}
            {(quote.status === "acceptee" || quote.status === "envoyee") && (
              <Button onClick={convertToContract} disabled={converting} className="w-full">
                {converting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSignature className="h-4 w-4 mr-2" />
                )}
                Convertir en contrat
              </Button>
            )}
          </Card>
          <Card className="p-4 text-xs space-y-1 text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Référence :</span> {quote.reference}
            </div>
            <div>
              <span className="font-medium text-foreground">Créée le :</span>{" "}
              {new Date(quote.created_at).toLocaleString("fr-FR")}
            </div>
            <div>
              <span className="font-medium text-foreground">Durée :</span>{" "}
              {quote.duration_days ?? "—"} jours
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
