import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole } from "@/types/roles";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  primaryCompanyId: string | null;
  loading: boolean;
  /** true quand l'utilisateur est authentifié mais n'a toujours pas de rôle après plusieurs tentatives */
  noRoleConfigured: boolean;
  /** dernière erreur réseau pendant le chargement du profil */
  error: string | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [primaryCompanyId, setPrimaryCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noRoleConfigured, setNoRoleConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserMeta = useCallback(async (uid: string) => {
    setError(null);
    const order: AppRole[] = [
      "super_admin", "assureur", "courtier", "agent",
      "garage", "expert", "hopital", "pharmacie", "autorite", "reassureur",
      "client",
    ];
    let lastErr: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const [{ data: roles, error: rErr }, { data: profile, error: pErr }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid).order("created_at", { ascending: true }),
          supabase.from("profiles").select("primary_company_id").eq("user_id", uid).maybeSingle(),
        ]);
        if (rErr) throw rErr;
        if (pErr) throw pErr;
        const found = order.find((r) => roles?.some((x) => x.role === r)) ?? null;
        setRole(found);
        setPrimaryCompanyId(profile?.primary_company_id ?? null);
        setNoRoleConfigured(!found);
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "Erreur réseau";
        if (attempt < 3) await sleep(500 * attempt);
      }
    }
    setError(lastErr);
  }, []);

  const refresh = async () => {
    if (user) await loadUserMeta(user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadUserMeta(sess.user.id), 0);
      } else {
        setRole(null);
        setPrimaryCompanyId(null);
        setNoRoleConfigured(false);
        setError(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadUserMeta(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadUserMeta]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setPrimaryCompanyId(null);
    setNoRoleConfigured(false);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, primaryCompanyId, loading, noRoleConfigured, error, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
