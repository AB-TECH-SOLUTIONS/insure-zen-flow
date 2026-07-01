import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ROLE_LABELS, ROLE_HOME } from "@/types/roles";

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading, refresh } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "accepting" | "done">("loading");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_invitation_by_token", { _token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) return setState("invalid");
      setInvite(row);
      setState("ready");
    })();
  }, [token]);

  const accept = async () => {
    if (!user || !invite || !token) return;
    setState("accepting");
    const { error } = await supabase.rpc("accept_invitation", { _token: token });
    if (error) {
      toast.error("Impossible d'accepter cette invitation");
      setState("invalid");
      return;
    }
    await refresh();
    toast.success("Invitation acceptée");
    setState("done");
    setTimeout(() => navigate(ROLE_HOME[invite.role as keyof typeof ROLE_HOME] ?? "/"), 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation</CardTitle>
          <CardDescription>Rejoindre une équipe sur InsureFlow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
          {state === "invalid" && (
            <div className="text-center py-6">
              <XCircle className="h-10 w-10 mx-auto text-destructive mb-2" />
              <p>Cette invitation est invalide ou expirée.</p>
            </div>
          )}
          {state === "ready" && invite && (
            <>
              <p>Vous êtes invité à rejoindre l'équipe en tant que <strong>{ROLE_LABELS[invite.role as keyof typeof ROLE_LABELS]}</strong>.</p>
              <p className="text-sm text-muted-foreground">Email destinataire : {invite.email}</p>
              {!user && !authLoading && (
                <div className="space-y-2">
                  <p className="text-sm">Connectez-vous ou créez un compte avec cet email pour accepter.</p>
                  <Button asChild className="w-full"><Link to={`/auth?invite=${token}`}>Se connecter</Link></Button>
                </div>
              )}
              {user && (
                <Button className="w-full" onClick={accept}>Accepter l'invitation</Button>
              )}
            </>
          )}
          {state === "accepting" && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
          {state === "done" && (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
              <p>Bienvenue !</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}