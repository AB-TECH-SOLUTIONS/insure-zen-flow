import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FinanceStats {
  caMonth: number;
  caYear: number;
  pending: number;
  contractsActive: number;
  loading: boolean;
}

export function useFinanceStats(): FinanceStats {
  const [s, setS] = useState<FinanceStats>({
    caMonth: 0, caYear: 0, pending: 0, contractsActive: 0, loading: true,
  });

  useEffect(() => {
    (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

      const [pm, py, pp, ca] = await Promise.all([
        supabase.from("payments").select("amount").eq("status", "paye").gte("paid_at", monthStart),
        supabase.from("payments").select("amount").eq("status", "paye").gte("paid_at", yearStart),
        supabase.from("payments").select("amount").eq("status", "en_attente"),
        supabase.from("contracts").select("id", { count: "exact", head: true }).eq("status", "actif"),
      ]);
      const sum = (rows: { amount: number }[] | null) =>
        (rows ?? []).reduce((acc, r) => acc + Number(r.amount), 0);

      setS({
        caMonth: sum(pm.data as { amount: number }[]),
        caYear: sum(py.data as { amount: number }[]),
        pending: sum(pp.data as { amount: number }[]),
        contractsActive: ca.count ?? 0,
        loading: false,
      });
    })();
  }, []);

  return s;
}