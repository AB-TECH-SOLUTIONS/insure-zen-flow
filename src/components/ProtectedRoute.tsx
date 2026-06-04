import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/types/roles";
import { ROLE_HOME } from "@/types/roles";
import { Loader2, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  allow?: AppRole[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const { user, role, loading, noRoleConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Compte authentifié mais aucun rôle disponible après plusieurs tentatives
  if (noRoleConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <LifeBuoy className="h-10 w-10 mx-auto text-primary" />
          <h1 className="font-display text-2xl font-bold">Compte en cours de configuration</h1>
          <p className="text-sm text-muted-foreground">
            Votre accès est en attente d'attribution par un administrateur. Vous recevrez un email
            dès que votre compte sera prêt.
          </p>
          <Button asChild variant="outline">
            <a href="mailto:support@insurezenflow.com">Contacter le support</a>
          </Button>
        </div>
      </div>
    );
  }

  // Rôle pas encore chargé mais l'utilisateur est connecté → spinner (évite un Navigate prématuré)
  if (allow && !role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allow && role && !allow.includes(role)) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  return <>{children}</>;
}
