import { ShieldCheck } from "lucide-react";

/**
 * Plein écran — affiché pendant le lazy-load des routes ou
 * pendant la résolution de la session.
 */
export default function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background"
    >
      <div className="relative">
        <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-elev-md">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border-2 border-primary/40 animate-ping" />
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}