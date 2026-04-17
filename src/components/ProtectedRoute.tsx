import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/types/roles";
import { ROLE_HOME } from "@/types/roles";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  allow?: AppRole[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const { user, role, loading } = useAuth();
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

  if (allow && role && !allow.includes(role)) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  return <>{children}</>;
}
