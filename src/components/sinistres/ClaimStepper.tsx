import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "declare", label: "Déclaré" },
  { key: "en_instruction", label: "Instruction" },
  { key: "expertise", label: "Expertise" },
  { key: "regle", label: "Réglé" },
] as const;

export function ClaimStepper({ status }: { status: string }) {
  if (status === "refuse") {
    return <p className="text-xs font-medium text-destructive">Dossier refusé</p>;
  }
  const idx = STEPS.findIndex((s) => s.key === status);
  const current = idx < 0 ? 0 : idx;
  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((s, i) => {
        const done = i < current || status === "clos";
        const active = i === current;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium border-2 transition",
                done ? "bg-primary border-primary text-primary-foreground"
                  : active ? "border-primary text-primary"
                  : "border-muted text-muted-foreground",
              )}>
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn("text-[10px] whitespace-nowrap", active ? "font-semibold" : "text-muted-foreground")}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-1 -mt-4", i < current ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
