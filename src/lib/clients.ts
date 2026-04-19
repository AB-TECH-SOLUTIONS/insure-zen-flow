import { supabase } from "@/integrations/supabase/client";
import type { ClientLite } from "@/components/clients/ClientSelector";

export async function ensureClient(
  client: ClientLite,
  companyId: string,
  ownerUserId: string
): Promise<string> {
  if (client.id) return client.id;
  const { data, error } = await supabase
    .from("clients")
    .insert({
      full_name: client.full_name,
      phone: client.phone || null,
      email: client.email || null,
      company_id: companyId,
      owner_user_id: ownerUserId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erreur création client");
  return data.id;
}
