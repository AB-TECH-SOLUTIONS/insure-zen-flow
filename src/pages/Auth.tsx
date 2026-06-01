import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Shield } from "lucide-react";
import { ROLE_HOME } from "@/types/roles";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading: authLoading } = useAuth();

  const isAdminPortal =
    typeof window !== "undefined" &&
    (window.location.hostname.startsWith("admin.") ||
      window.location.hostname === "admin.insureflow.cm");

  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  // signup (client only)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (!authLoading && user && role) {
      const target = (location.state as { from?: string })?.from || ROLE_HOME[role];
      navigate(target, { replace: true });
    }
  }, [user, role, authLoading, navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPwd });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Connecté");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: name,
          role: "client",
        },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    setBusy(false);
    toast.success("Compte créé. Bienvenue !");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visuel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-hero p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold">InsureFlow</span>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            La plateforme assurance multi-compagnies pour l'Afrique.
          </h1>
          <p className="text-white/70 text-lg">
            Cotation auto, voyage et risques divers. Souscription en ligne. Sinistres digitalisés.
            Mobile Money intégré.
          </p>
          <div className="flex gap-3 pt-4">
            <span className="px-3 py-1 rounded-full bg-white/10 text-sm">NSIA</span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-sm">GMC</span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-sm">AFRINSURANCE</span>
          </div>
        </div>
        <p className="text-white/40 text-sm">© {new Date().getFullYear()} InsureFlow — Pilote Les Coralis</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md shadow-elev-lg">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Bienvenue</CardTitle>
            <CardDescription>
              {isAdminPortal
                ? "Portail réservé aux professionnels et administrateurs."
                : "Connectez-vous ou créez votre compte InsureFlow."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdminPortal && (
              <Alert className="mb-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Accès réservé aux administrateurs InsureFlow, autorités de supervision et compagnies agréées.
                </AlertDescription>
              </Alert>
            )}
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              {isAdminPortal ? (
                <TabsList className="grid grid-cols-1 w-full">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                </TabsList>
              ) : (
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="login">Connexion</TabsTrigger>
                  <TabsTrigger value="signup">Créer un compte</TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pwd">Mot de passe</Label>
                    <PasswordInput id="login-pwd" required value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Se connecter
                  </Button>
                </form>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-xs text-muted-foreground">
                    ou en un clic
                  </span>
                </div>
                <SocialAuthButtons />
                <div className="mt-4">
                  <MagicLinkForm />
                </div>
              </TabsContent>

              {!isAdminPortal && (
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pwd">Mot de passe</Label>
                    <PasswordInput id="su-pwd" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} />
                  </div>

                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Créer mon compte
                  </Button>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Professionnel de l'assurance ?{" "}
                    <a href="mailto:contact@insureflow.cm" className="underline hover:text-primary">
                      Contactez-nous
                    </a>
                  </p>
                </form>

                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-xs text-muted-foreground">
                    ou inscription rapide
                  </span>
                </div>
                <SocialAuthButtons />
              </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
