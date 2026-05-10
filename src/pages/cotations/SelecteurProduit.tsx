import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { Car, Plane, Package, HeartPulse, ArrowRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  basePath: string; // ex /agent /client /courtier /assureur /admin
}

type Produit = {
  code: "auto" | "voyage" | "vie" | "rd";
  title: string;
  description: string;
  icon: typeof Car;
  badge?: string;
  available: boolean;
  path: string;
};

export default function SelecteurProduit({ basePath }: Props) {
  const navigate = useNavigate();
  const { role } = useAuth();

  // Filtrage selon rôle — un client ne souscrit pas (encore) Risques Divers complexes
  const produits: Produit[] = [
    {
      code: "auto",
      title: "Auto",
      description: "Véhicules tourisme, utilitaires, transport public, 2 roues, engins.",
      icon: Car,
      available: true,
      path: `${basePath}/cotations/nouvelle/auto`,
    },
    {
      code: "voyage",
      title: "Voyage",
      description: "Schengen, Europe, Monde — Voyageur, Perle, Famille, Économie.",
      icon: Plane,
      available: true,
      path: `${basePath}/cotations/nouvelle/voyage`,
    },
    {
      code: "vie",
      title: "Assurance Vie",
      description: "Épargne, décès, retraite, éducation, obsèques.",
      icon: HeartPulse,
      available: true,
      path: `${basePath}/cotations/nouvelle/vie`,
    },
    {
      code: "rd",
      title: "Risques Divers",
      description: "Multirisque habitation, professionnel, RC entreprise.",
      icon: Package,
      badge: "Sprint 2",
      available: role === "super_admin",
      path: `${basePath}/cotations/nouvelle/rd`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle cotation"
        description="Choisissez le type de produit à coter."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {produits.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => p.available && navigate(p.path)}
              disabled={!p.available}
              className="text-left group"
            >
              <Card className={`p-6 h-full transition-all ${p.available ? "hover:border-primary hover:shadow-md cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  {p.badge && <Badge variant="secondary">{p.badge}</Badge>}
                  {!p.available && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <h3 className="font-display text-lg font-semibold mb-1">{p.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
                {p.available && (
                  <div className="flex items-center text-sm text-primary group-hover:gap-2 transition-all gap-1">
                    Démarrer <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
