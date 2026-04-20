import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, UserPlus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentScanner, type ScanDocType } from "@/components/scan/DocumentScanner";

export interface ClientLite {
  id?: string; // undefined = nouveau client à créer
  full_name: string;
  phone?: string | null;
  email?: string | null;
}

interface Props {
  companyId: string;
  value: ClientLite | null;
  onChange: (c: ClientLite | null) => void;
  /** Type de pièce d'identité à proposer pour le scan IA. */
  scanDocType?: ScanDocType;
}

export function ClientSelector({ companyId, value, onChange, scanDocType = "permis" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">(value?.id ? "existing" : "new");

  useEffect(() => {
    if (mode !== "existing") return;
    let cancel = false;
    setLoading(true);
    const q = supabase
      .from("clients")
      .select("id,full_name,phone,email")
      .order("created_at", { ascending: false })
      .limit(20);
    if (search.trim()) q.ilike("full_name", `%${search.trim()}%`);
    if (companyId) q.eq("company_id", companyId);
    q.then(({ data }) => {
      if (cancel) return;
      setResults((data as ClientLite[]) ?? []);
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [search, companyId, mode]);

  const applyExtraction = (d: Record<string, unknown>) => {
    const nom = (d.nom as string | undefined) ?? "";
    const prenom = (d.prenom as string | undefined) ?? "";
    const full = [prenom, nom].filter(Boolean).join(" ").trim();
    onChange({
      ...(value ?? { full_name: "" }),
      full_name: full || value?.full_name || "",
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Client</h4>
        <div className="flex gap-1 text-xs">
          <Button
            type="button"
            size="sm"
            variant={mode === "existing" ? "default" : "ghost"}
            onClick={() => {
              setMode("existing");
              onChange(null);
            }}
          >
            <User className="h-3 w-3 mr-1" /> Existant
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "new" ? "default" : "ghost"}
            onClick={() => {
              setMode("new");
              onChange({ full_name: "", phone: "" });
            }}
          >
            <UserPlus className="h-3 w-3 mr-1" /> Nouveau
          </Button>
        </div>
      </div>

      {mode === "existing" ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-between"
            >
              {value?.id ? value.full_name : "Rechercher un client..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
            <Input
              placeholder="Nom du client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="mt-2 max-h-64 overflow-auto">
              {loading && <div className="p-2 text-xs text-muted-foreground">Recherche…</div>}
              {!loading && results.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">Aucun client trouvé.</div>
              )}
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2"
                  )}
                >
                  <Check className={cn("h-4 w-4", value?.id === c.id ? "opacity-100" : "opacity-0")} />
                  <div>
                    <div>{c.full_name}</div>
                    {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <>
        <div className="flex justify-end">
          <DocumentScanner
            docType={scanDocType}
            label={scanDocType === "passeport" ? "Scanner le passeport" : "Scanner permis / CNI"}
            companyId={companyId}
            onExtracted={applyExtraction}
            compact
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nom complet *</Label>
            <Input
              value={value?.full_name ?? ""}
              onChange={(e) => onChange({ ...(value ?? {}), full_name: e.target.value })}
              placeholder="MBONGO Samuel"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Téléphone</Label>
            <Input
              value={value?.phone ?? ""}
              onChange={(e) => onChange({ ...(value ?? { full_name: "" }), phone: e.target.value })}
              placeholder="+237…"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={value?.email ?? ""}
              onChange={(e) => onChange({ ...(value ?? { full_name: "" }), email: e.target.value })}
              placeholder="client@email.com"
            />
          </div>
        </div>
        </>
      )}
    </Card>
  );
}
