import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "./PageHeader";
import { Construction } from "lucide-react";

export function PlaceholderPage({
  title, description, sprint,
}: { title: string; description?: string; sprint?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center">
            <Construction className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Module en cours de construction</p>
            <p className="text-sm text-muted-foreground mt-1">
              {sprint ? `Prévu pour le ${sprint}.` : "Cette page sera implémentée au prochain sprint."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
