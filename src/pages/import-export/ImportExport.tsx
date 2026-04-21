import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Download, Upload, FileSpreadsheet, Sparkles, Archive, FileText, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  TEMPLATE_COLUMNS, downloadTemplate, parseExcel, rowsByLabel, exportToExcel,
  type EntityKind,
} from "@/lib/excel/templates";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const ENTITIES: { key: EntityKind; label: string }[] = [
  { key: "clients", label: "Clients" },
  { key: "vehicules", label: "Véhicules" },
  { key: "contrats", label: "Contrats" },
  { key: "paiements", label: "Paiements" },
  { key: "sinistres", label: "Sinistres" },
];

export default function ImportExport() {
  const { user, primaryCompanyId } = useAuth();
  const [importKind, setImportKind] = useState<EntityKind>("clients");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [iaFile, setIaFile] = useState<File | null>(null);
  const [iaKind, setIaKind] = useState<EntityKind>("contrats");
  const [iaResult, setIaResult] = useState<any[] | null>(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [zipping, setZipping] = useState(false);

  const doImport = async () => {
    if (!file) return toast.error("Sélectionnez un fichier");
    if (!primaryCompanyId) return toast.error("Aucune compagnie associée");
    setImporting(true);
    try {
      const raw = await parseExcel(file);
      const rows = rowsByLabel(raw, importKind);
      if (!rows.length) { toast.error("Aucune ligne"); return; }

      let ok = 0; let fail = 0;
      for (const r of rows) {
        try {
          if (importKind === "clients") {
            await supabase.from("clients").insert({
              full_name: r.full_name, email: r.email || null, phone: r.phone || null,
              address: r.address || null, id_number: r.id_number || null,
              date_of_birth: r.date_of_birth || null, profession: r.profession || null,
              kind: r.kind || "personne_physique",
              owner_user_id: user?.id, company_id: primaryCompanyId,
            }).throwOnError();
          } else if (importKind === "vehicules") {
            const { data: c } = await supabase.from("clients").select("id").eq("email", r.client_email).maybeSingle();
            if (!c) throw new Error("Client introuvable: " + r.client_email);
            await supabase.from("vehicles").insert({
              client_id: c.id, registration: r.registration,
              brand: r.brand || null, model: r.model || null, energy: r.energy || null,
              fiscal_power: r.fiscal_power ? Number(r.fiscal_power) : null,
              seats: r.seats ? Number(r.seats) : null, vin: r.vin || null,
              first_registration_date: r.first_registration_date || null,
              new_value: r.new_value ? Number(r.new_value) : null,
              market_value: r.market_value ? Number(r.market_value) : null,
            }).throwOnError();
          } else if (importKind === "paiements") {
            const { data: ct } = await supabase.from("contracts").select("id, client_id, company_id").eq("contract_number", r.contract_number).maybeSingle();
            await supabase.from("payments").insert({
              contract_id: ct?.id ?? null, client_id: ct?.client_id ?? null,
              company_id: ct?.company_id ?? primaryCompanyId,
              amount: Number(r.amount), method: r.method,
              status: r.status || "en_attente",
              external_reference: r.external_reference || null,
              paid_at: r.paid_at || null, created_by: user?.id,
            }).throwOnError();
          } else if (importKind === "sinistres") {
            const { data: ct } = await supabase.from("contracts").select("id, client_id, company_id").eq("contract_number", r.contract_number).maybeSingle();
            if (!ct) throw new Error("Contrat introuvable: " + r.contract_number);
            await supabase.from("claims").insert({
              contract_id: ct.id, client_id: ct.client_id, company_id: ct.company_id,
              occurred_at: new Date(r.occurred_at).toISOString(),
              description: r.description || null,
              estimated_amount: r.estimated_amount ? Number(r.estimated_amount) : null,
              status: r.status || "declare", declared_by: user?.id,
            }).throwOnError();
          } else if (importKind === "contrats") {
            const { data: c } = await supabase.from("clients").select("id").eq("email", r.client_email).maybeSingle();
            if (!c) throw new Error("Client introuvable: " + r.client_email);
            await supabase.from("contracts").insert({
              contract_number: r.contract_number, client_id: c.id,
              company_id: primaryCompanyId, type: r.type,
              start_date: r.start_date, end_date: r.end_date,
              total_premium: Number(r.total_premium), status: r.status || "actif",
              created_by: user?.id,
            }).throwOnError();
          }
          ok++;
        } catch (e: any) { fail++; console.error("Import row error:", e); }
      }
      toast.success(`Import terminé : ${ok} OK, ${fail} erreurs`);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally { setImporting(false); }
  };

  const doExport = async (kind: EntityKind) => {
    const tableMap: Record<EntityKind, string> = {
      clients: "clients", vehicules: "vehicles", contrats: "contracts",
      paiements: "payments", sinistres: "claims",
    };
    const { data, error } = await supabase.from(tableMap[kind] as any).select("*").limit(10000);
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.warning("Aucune donnée");
    exportToExcel(data, `${kind}-${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success(`${data.length} lignes exportées`);
  };

  const doIaExtract = async () => {
    if (!iaFile) return toast.error("Choisissez un PDF ou image");
    setIaLoading(true); setIaResult(null);
    try {
      const b64 = await fileToBase64(iaFile);
      const { data, error } = await supabase.functions.invoke("extract-tabular", {
        body: {
          entityKind: iaKind,
          fileBase64: b64,
          mimeType: iaFile.type,
          columns: TEMPLATE_COLUMNS[iaKind].map(c => ({ key: c.key, label: c.label })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setIaResult(data?.rows ?? []);
      toast.success(`${data?.rows?.length ?? 0} lignes extraites`);
    } catch (e: any) {
      toast.error(e.message || "Échec IA");
    } finally { setIaLoading(false); }
  };

  const downloadIaAsExcel = () => {
    if (!iaResult) return;
    const cols = TEMPLATE_COLUMNS[iaKind];
    const rows = iaResult.map(r => {
      const o: any = {};
      cols.forEach(c => { o[c.label] = r[c.key] ?? ""; });
      return o;
    });
    exportToExcel(rows, `extraction-${iaKind}.xlsx`);
  };

  const doBackupZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      const tables: { name: string; table: string }[] = [
        { name: "clients", table: "clients" },
        { name: "vehicles", table: "vehicles" },
        { name: "quotes", table: "quotes" },
        { name: "contracts", table: "contracts" },
        { name: "payments", table: "payments" },
        { name: "claims", table: "claims" },
      ];
      for (const t of tables) {
        const { data } = await supabase.from(t.table as any).select("*").limit(20000);
        if (data?.length) {
          const csv = toCsv(data);
          zip.file(`${t.name}.csv`, csv);
        }
      }
      // PDFs des contrats
      const { data: contracts } = await supabase.from("contracts").select("contract_number, pdf_url").not("pdf_url", "is", null).limit(500);
      const pdfFolder = zip.folder("contrats-pdf");
      for (const c of contracts ?? []) {
        if (!c.pdf_url) continue;
        try {
          const path = c.pdf_url.includes("/") ? c.pdf_url : c.pdf_url;
          const { data: blob } = await supabase.storage.from("contracts-pdf").download(path);
          if (blob) pdfFolder?.file(`${c.contract_number}.pdf`, blob);
        } catch (e) { console.error("PDF skip", e); }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `sauvegarde-${new Date().toISOString().slice(0,10)}.zip`);
      toast.success("Sauvegarde générée");
    } catch (e: any) {
      toast.error(e.message || "Erreur ZIP");
    } finally { setZipping(false); }
  };

  return (
    <div>
      <PageHeader title="Import / Export & Sauvegarde" description="Import Excel, extraction IA, sauvegarde ZIP" />
      <Tabs defaultValue="excel">
        <TabsList>
          <TabsTrigger value="excel"><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</TabsTrigger>
          <TabsTrigger value="ia"><Sparkles className="h-4 w-4 mr-2" />Import IA (PDF)</TabsTrigger>
          <TabsTrigger value="backup"><Archive className="h-4 w-4 mr-2" />Sauvegarde ZIP</TabsTrigger>
        </TabsList>

        <TabsContent value="excel" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Templates & Export</CardTitle>
              <CardDescription>Téléchargez un template vide ou exportez vos données</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ENTITIES.map(e => (
                  <div key={e.key} className="border rounded-lg p-4 space-y-2">
                    <p className="font-medium">{e.label}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => downloadTemplate(e.key)}>
                        <Download className="h-3 w-3 mr-1" />Template
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => doExport(e.key)}>
                        <FileText className="h-3 w-3 mr-1" />Exporter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Excel</CardTitle>
              <CardDescription>Importez un fichier Excel pour créer en masse</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Type d'entité</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={importKind} onChange={(e) => setImportKind(e.target.value as EntityKind)}>
                  {ENTITIES.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Fichier Excel (.xlsx, .xls, .csv)</Label>
                <Input type="file" accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={doImport} disabled={!file || importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Importer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ia" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Extraction IA depuis PDF/image</CardTitle>
              <CardDescription>L'IA lit un document, extrait les lignes, vous validez puis téléchargez en Excel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Type d'entité cible</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={iaKind} onChange={(e) => setIaKind(e.target.value as EntityKind)}>
                  {ENTITIES.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Document (PDF, image)</Label>
                <Input type="file" accept="application/pdf,image/*"
                  onChange={(e) => setIaFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={doIaExtract} disabled={!iaFile || iaLoading}>
                {iaLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Extraire avec l'IA
              </Button>
              {iaResult && (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{iaResult.length} lignes extraites</Badge>
                    <Button size="sm" onClick={downloadIaAsExcel}>
                      <Download className="h-3 w-3 mr-1" />Télécharger en Excel
                    </Button>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded max-h-64 overflow-auto">
                    {JSON.stringify(iaResult.slice(0, 5), null, 2)}
                  </pre>
                  <p className="text-xs text-muted-foreground">Aperçu des 5 premières lignes. Téléchargez le fichier, vérifiez/corrigez puis ré-importez via l'onglet Excel.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sauvegarde complète</CardTitle>
              <CardDescription>Génère un .zip avec tous les CSV (clients, véhicules, cotations, contrats, paiements, sinistres) et les PDFs de contrats.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={doBackupZip} disabled={zipping}>
                {zipping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
                Générer la sauvegarde
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.split(",")[1]);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map(r => keys.map(k => escape(r[k])).join(","))].join("\n");
}