import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatFCFA, parseFCFA } from "@/lib/format";
import type { AutoCotationResult, AutoOverrides } from "@/lib/tarifs/moteurAuto";
import { Sparkles, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  result: AutoCotationResult;
  overrides: AutoOverrides;
  onChange: (next: AutoOverrides) => void;
}

export function DecomptePanel({ result, overrides, onChange }: Props) {
  const setLine = (key: string, value: number | undefined) => {
    const lines = { ...overrides.lines };
    if (value === undefined) delete lines[key];
    else lines[key] = value;
    onChange({ ...overrides, lines });
  };

  const toggleManual = (manualMode: boolean) => {
    if (manualMode) {
      // Pré-remplir toutes les lignes avec les valeurs auto courantes pour permettre l'édition
      const lines: Record<string, number> = { ...overrides.lines };
      result.lignes.forEach((l) => {
        if (lines[l.key] === undefined) lines[l.key] = l.montant;
      });
      lines.reductionRC = lines.reductionRC ?? result.reductionRC;
      lines.accessoires = lines.accessoires ?? result.accessoires;
      lines.fichierCentral = lines.fichierCentral ?? result.fichierCentral;
      lines.dta = lines.dta ?? result.dta;
      lines.tva = lines.tva ?? result.tva;
      if (result.carteRose) lines.carteRose = lines.carteRose ?? result.carteRose;
      onChange({ manualMode: true, lines });
    } else {
      onChange({ manualMode: false, lines: {} });
    }
  };

  const reset = () => onChange({ manualMode: false, lines: {} });

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Décompte de prime</h3>
          <p className="text-xs text-muted-foreground">
            Le calcul est automatique. Activez le mode manuel ou éditez ligne par ligne si nécessaire.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="manual" checked={overrides.manualMode} onCheckedChange={toggleManual} />
            <Label htmlFor="manual" className="text-sm cursor-pointer">
              Mode manuel
            </Label>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} title="Réinitialiser">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        {result.lignes.map((l) => (
          <DecompteLine
            key={l.key}
            label={l.label}
            montant={l.montant}
            edited={overrides.lines[l.key] !== undefined}
            onEdit={(v) => setLine(l.key, v)}
            onClear={() => setLine(l.key, undefined)}
          />
        ))}
      </div>

      <div className="text-sm space-y-1.5">
        <Row label="Total prime nette" value={result.primeNette} bold />
        <RowEdit
          label="Réduction RC"
          value={result.reductionRC}
          edited={overrides.lines.reductionRC !== undefined}
          onEdit={(v) => setLine("reductionRC", v)}
          onClear={() => setLine("reductionRC", undefined)}
          negative
        />
        <Row label="Prime nette après réduction" value={result.primeNetteApresReduction} bold />
        <RowEdit
          label="Accessoires"
          value={result.accessoires}
          edited={overrides.lines.accessoires !== undefined}
          onEdit={(v) => setLine("accessoires", v)}
          onClear={() => setLine("accessoires", undefined)}
        />
        <RowEdit
          label="Fichier central"
          value={result.fichierCentral}
          edited={overrides.lines.fichierCentral !== undefined}
          onEdit={(v) => setLine("fichierCentral", v)}
          onClear={() => setLine("fichierCentral", undefined)}
        />
        <RowEdit
          label="TVA (19,25%)"
          value={result.tva}
          edited={overrides.lines.tva !== undefined}
          onEdit={(v) => setLine("tva", v)}
          onClear={() => setLine("tva", undefined)}
        />
        {result.carteRose > 0 && (
          <RowEdit
            label="Carte rose CEMAC"
            value={result.carteRose}
            edited={overrides.lines.carteRose !== undefined}
            onEdit={(v) => setLine("carteRose", v)}
            onClear={() => setLine("carteRose", undefined)}
          />
        )}
        <RowEdit
          label="Droit de timbre auto (DTA / vignette)"
          value={result.dta}
          edited={overrides.lines.dta !== undefined}
          onEdit={(v) => setLine("dta", v)}
          onClear={() => setLine("dta", undefined)}
        />
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-primary text-primary-foreground">
        <span className="font-display font-semibold">Prime TTC</span>
        <span className="font-display text-2xl font-bold">{formatFCFA(result.primeTTC)}</span>
      </div>
    </Card>
  );
}

function DecompteLine({
  label,
  montant,
  edited,
  onEdit,
  onClear,
}: {
  label: string;
  montant: number;
  edited: boolean;
  onEdit: (v: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
        {edited ? (
          <Badge variant="outline" className="text-xs gap-1">
            <Pencil className="h-3 w-3" />
            Manuel
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs gap-1 opacity-60">
            <Sparkles className="h-3 w-3" />
            Auto
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={formatFCFA(montant).replace(" FCFA", "")}
          onChange={(e) => onEdit(parseFCFA(e.target.value))}
          className="w-36 text-right font-mono text-sm h-8"
        />
        {edited && (
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onClear} title="Revenir au calcul auto">
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className="font-mono">{formatFCFA(value)}</span>
    </div>
  );
}

function RowEdit({
  label,
  value,
  edited,
  onEdit,
  onClear,
  negative = false,
}: {
  label: string;
  value: number;
  edited: boolean;
  onEdit: (v: number) => void;
  onClear: () => void;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {label}
        {edited && <Pencil className="h-3 w-3 text-primary" />}
      </span>
      <div className="flex items-center gap-1">
        <Input
          type="text"
          value={formatFCFA(value).replace(" FCFA", "")}
          onChange={(e) => onEdit(parseFCFA(e.target.value))}
          className={`w-32 text-right font-mono text-sm h-7 ${negative ? "text-success" : ""}`}
        />
        {edited && (
          <Button variant="ghost" size="sm" className="h-7 px-1" onClick={onClear}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
