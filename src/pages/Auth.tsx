import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import type { AppRole } from "@/types/roles";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_HOME } from "@/types/roles";

type Company = { id: string; name: string; code: string };

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading: authLoading } = useAuth();

  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  // signup
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [signupRole, setSignupRole] = useState<AppRole>("client");
  const [companyId, setCompanyId] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (!authLoading && user && role) {
      const target = (location.state as { from?: string })?.from || ROLE_HOME[role];
      navigate(target, { replace: true });
    }
  }, [user, role, authLoading, navigate, location.state]);

  useEffect(() => {
    // companies are readable to all authenticated users; for signup we fetch them anonymously is not allowed.
    // Workaround : nous laissons le user choisir la compagnie après login pour agent/assureur. Mais pour MVP :
    // on tente le fetch ; si vide on affichera un sélecteur libre (saisie code).
    supabase
      .from("companies")
      .select("id,name,code")
      .order("name")
      .then(({ data }) => setCompanies((data as Company[]) ?? []));
  }, []);

  const needsCompany = signupRole === "agent" || signupRole === "assureur";

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
    if (needsCompany && !companyId) {
      toast.error("Sélectionnez votre compagnie");
      return;
    }
    setBusy(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: name,
          phone,
          role: signupRole,
        },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    // Si compagnie nécessaire, on l'enregistre dans le profil après création
    if (data.user && needsCompany && companyId) {
      // Le trigger a déjà créé profile + role 'client' OU le rôle demandé
      // On met à jour primary_company_id
      await supabase
        .from("profiles")
        .update({ primary_company_id: companyId })
        .eq("user_id", data.user.id);
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
            <CardDescription>Connectez-vous ou créez votre compte InsureFlow.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Créer un compte</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pwd">Mot de passe</Label>
                    <Input id="login-pwd" type="password" required value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Se connecter
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237…" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-email">Email</Label>
                      <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pwd">Mot de passe</Label>
                    <Input id="su-pwd" type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Je suis</Label>
                    <Select value={signupRole} onValueChange={(v) => setSignupRole(v as AppRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["client", "agent", "courtier", "assureur"] as AppRole[]).map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[signupRole]}</p>
                  </div>

                  {needsCompany && (
                    <div className="space-y-2">
                      <Label>Compagnie</Label>
                      <Select value={companyId} onValueChange={setCompanyId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner une compagnie" /></SelectTrigger>
                        <SelectContent>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {companies.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          La liste apparaîtra après votre première connexion.
                        </p>
                      )}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Créer mon compte
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
