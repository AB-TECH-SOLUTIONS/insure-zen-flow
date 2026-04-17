import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, hint, accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: "primary" | "success" | "info" | "warning";
}) {
  const accentClass = {
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
  }[accent ?? "primary"];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold mt-1">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
