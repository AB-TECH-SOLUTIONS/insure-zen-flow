import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole } from "@/types/roles";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  primaryCompanyId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [primaryCompanyId, setPrimaryCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserMeta = async (uid: string) => {
    // role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    // priorité au rôle "le plus fort"
    const order: AppRole[] = ["super_admin", "assureur", "courtier", "agent", "client"];
    const found = order.find((r) => roles?.some((x) => x.role === r)) ?? null;
    setRole(found);

    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_company_id")
      .eq("user_id", uid)
      .maybeSingle();
    setPrimaryCompanyId(profile?.primary_company_id ?? null);
  };

  const refresh = async () => {
    if (user) await loadUserMeta(user.id);
  };

  useEffect(() => {
    // 1. Listener D'ABORD (sync only inside callback)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer DB calls
        setTimeout(() => loadUserMeta(sess.user.id), 0);
      } else {
        setRole(null);
        setPrimaryCompanyId(null);
      }
    });

    // 2. PUIS getSession
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadUserMeta(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setPrimaryCompanyId(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, primaryCompanyId, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
