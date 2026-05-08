import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/types/roles";
import Landing from "./Landing";
import { Loader2 } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user && role) navigate(ROLE_HOME[role], { replace: true });
  }, [user, role, loading, navigate]);

  if (loading || (user && role)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <Landing />;
}
