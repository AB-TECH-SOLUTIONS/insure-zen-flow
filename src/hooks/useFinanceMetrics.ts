import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MonthlyPoint { month: string; total: number; }
export interface ProductSlice { product: string; total: number; }

const STALE = 5 * 60 * 1000;

/** Primes encaissées par mois sur les 12 derniers mois */
export function useMonthlyPremiums() {
  return useQuery<MonthlyPoint[]>({
    queryKey: ["finance", "monthly-premiums"],
    staleTime: STALE,
    queryFn: async () => {
      const since = new Date(); since.setMonth(since.getMonth() - 11); since.setDate(1);
      const { data, error } = await supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("status", "paye")
        .gte("paid_at", since.toISOString());
      if (error) throw error;
      const buckets = new Map<string, number>();
      for (let i = 0; i < 12; i++) {
        const d = new Date(since); d.setMonth(since.getMonth() + i);
        buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
      }
      for (const r of data ?? []) {
        if (!r.paid_at) continue;
        const d = new Date(r.paid_at);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(k, (buckets.get(k) ?? 0) + Number(r.amount));
      }
      return Array.from(buckets, ([month, total]) => ({ month, total }));
    },
  });
}

/** CA par type de produit (auto/voyage/risques_divers) */
export function useRevenueByProduct() {
  return useQuery<ProductSlice[]>({
    queryKey: ["finance", "by-product"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, contracts(type)")
        .eq("status", "paye");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        const t = (r as { contracts?: { type?: string } }).contracts?.type ?? "autre";
        map.set(t, (map.get(t) ?? 0) + Number(r.amount));
      }
      return Array.from(map, ([product, total]) => ({ product, total }));
    },
  });
}

/** Sinistres ouverts vs réglés */
export function useClaimsRatio() {
  return useQuery({
    queryKey: ["finance", "claims-ratio"],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase.from("claims").select("status, settled_amount, estimated_amount");
      if (error) throw error;
      const open = (data ?? []).filter((c) => !["regle", "refuse", "clos"].includes(c.status)).length;
      const settled = (data ?? []).filter((c) => c.status === "regle").length;
      const totalSettled = (data ?? []).reduce((s, c) => s + Number(c.settled_amount ?? 0), 0);
      return { open, settled, totalSettled };
    },
  });
}