import { supabase } from "@/integrations/supabase/client";
import type { ClientLite } from "@/components/clients/ClientSelector";
import type { AppRole } from "@/types/roles";

export async function ensureClient(
  client: ClientLite,
  companyId: string,
  ownerUserId: string,
  role?: AppRole | null
): Promise<string> {
  if (client.id) return client.id;

  // Si l'utilisateur est un client final, on rattache son user.id à client_user_id
  // (la policy RLS l'exige) et on ne pose pas owner_user_id.
  const isClientRole = role === "client";

  const { data, error } = await supabase
    .from("clients")
    .insert({
      full_name: client.full_name,
      phone: client.phone || null,
      email: client.email || null,
      company_id: companyId || null,
      owner_user_id: isClientRole ? null : ownerUserId,
      client_user_id: isClientRole ? ownerUserId : null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erreur création client");
  return data.id;
}
