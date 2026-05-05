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
      const { data } = await supabase.from("invitations").select("*").eq("token", token).maybeSingle();
      if (!data) return setState("invalid");
      if (data.status !== "pending") return setState("invalid");
      if (new Date(data.expires_at) < new Date()) return setState("invalid");
      setInvite(data);
      setState("ready");
    })();
  }, [token]);

  const accept = async () => {
    if (!user || !invite) return;
    setState("accepting");
    // 1. ajouter le rôle s'il manque
    await supabase.from("user_roles").upsert({ user_id: user.id, role: invite.role }, { onConflict: "user_id,role" as any });
    // 2. compagnie principale si non définie
    if (invite.company_id) {
      await supabase.from("profiles").update({ primary_company_id: invite.company_id }).eq("user_id", user.id);
      await supabase.from("team_members").upsert({
        company_id: invite.company_id, user_id: user.id, position_id: invite.position_id,
      } as any, { onConflict: "company_id,user_id" as any });
    }
    // 3. marquer acceptée
    await supabase.from("invitations").update({
      status: "accepted", accepted_at: new Date().toISOString(), accepted_by: user.id,
    }).eq("id", invite.id);
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