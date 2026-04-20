import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ScanLine, CheckCircle2, FileWarning } from "lucide-react";
import { toast } from "sonner";

export type ScanDocType = "carte_grise" | "permis" | "passeport" | "cni";

interface Props {
  docType: ScanDocType;
  label?: string;
  description?: string;
  clientId?: string | null;
  companyId?: string | null;
  onExtracted: (data: Record<string, unknown>) => void;
  compact?: boolean;
}

const DEFAULT_LABELS: Record<ScanDocType, string> = {
  carte_grise: "Scanner une carte grise",
  permis: "Scanner un permis de conduire",
  passeport: "Scanner un passeport",
  cni: "Scanner une CNI",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DocumentScanner({
  docType,
  label,
  description,
  clientId,
  companyId,
  onExtracted,
  compact = false,
}: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error("Connectez-vous pour scanner un document");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 Mo)");
      return;
    }

    setBusy(true);
    setDone(false);
    try {
      const base64 = await fileToBase64(file);

      // 1) Upload (best-effort)
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${docType}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) console.warn("upload warning", upErr.message);

      // 2) Extraction IA
      const { data, error } = await supabase.functions.invoke("extract-document", {
        body: { docType, imageBase64: base64, mimeType: file.type },
      });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      const extracted = (data as { extracted?: Record<string, unknown> })?.extracted ?? {};

      // 3) Persist metadata
      if (!upErr) {
        await supabase.from("client_documents").insert({
          client_id: clientId ?? null,
          uploaded_by: user.id,
          company_id: companyId ?? null,
          doc_type: docType,
          storage_path: path,
          mime_type: file.type,
          extracted: extracted as never,
        });
      }

      onExtracted(extracted);
      setDone(true);
      toast.success("Document analysé — vérifiez et corrigez si besoin");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'extraction");
    } finally {
      setBusy(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  if (compact) {
    return (
      <>
        <Button type="button" variant="outline" size="sm" onClick={pick} disabled={busy}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanLine className="h-3 w-3" />}
          <span className="ml-2">{label ?? DEFAULT_LABELS[docType]}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onChange}
        />
      </>
    );
  }

  return (
    <Card className="p-4 border-dashed">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {done ? <CheckCircle2 className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{label ?? DEFAULT_LABELS[docType]}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {description ??
              "Photo ou PDF du document. Nous pré-remplissons les champs ; vous pouvez tout corriger ensuite."}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" size="sm" onClick={pick} disabled={busy}>
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanLine className="h-3 w-3" />}
              <span className="ml-2">{busy ? "Analyse en cours…" : "Choisir un fichier"}</span>
            </Button>
            {done && (
              <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Données pré-remplies
              </span>
            )}
            {!user && (
              <span className="text-xs text-amber-600 inline-flex items-center gap-1">
                <FileWarning className="h-3 w-3" /> Connexion requise
              </span>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onChange}
          />
        </div>
      </div>
    </Card>
  );
}