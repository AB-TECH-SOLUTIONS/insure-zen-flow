import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { ROLE_HOME } from "@/types/roles";

type State = "verifying" | "success" | "error";

/**
 * Page de retour magic link / OAuth.
 * Supabase pose la session via le hash de l'URL ; on attend simplement
 * que onAuthStateChange peuple useAuth, puis on redirige.
 */
export default function EmailConfirmation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [state, setState] = useState<State>("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Erreurs renvoyées par Supabase via le hash (#error=...) ou la query
    const err =
      params.get("error_description") ||
      params.get("error") ||
      (typeof window !== "undefined" && window.location.hash.includes("error")
        ? decodeURIComponent(window.location.hash.replace(/^#/, "").split("&")
            .find((p) => p.startsWith("error_description="))?.split("=")[1] ?? "Lien invalide")
        : "");
    if (err) {
      setErrorMsg(err);
      setState("error");
      return;
    }
    const t = setTimeout(() => {
      if (!user && !loading) {
        setErrorMsg("Lien expiré ou invalide. Demandez un nouvel email.");
        setState("error");
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [params, user, loading]);

  useEffect(() => {
    if (!loading && user && role) {
      setState("success");
      const timer = setTimeout(() => navigate(ROLE_HOME[role], { replace: true }), 800);
      return () => clearTimeout(timer);
    }
  }, [user, role, loading, navigate]);

  const resend = async () => {
    if (!email) {
      toast.error("Saisissez votre email");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Email envoyé ! Vérifiez votre boîte (et vos spams).");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display">Confirmation de votre email</CardTitle>
          <CardDescription>InsureZen Flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "verifying" && (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Vérification du lien…</p>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center gap-3 py-6 text-foreground">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-sm">Connexion réussie, redirection…</p>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <XCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm">{errorMsg || "Le lien est invalide ou a expiré."}</p>
              </div>
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button className="w-full" onClick={resend} disabled={resending}>
                  {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MailCheck className="h-4 w-4 mr-2" />}
                  Renvoyer un email
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/auth">Retour à la connexion</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}