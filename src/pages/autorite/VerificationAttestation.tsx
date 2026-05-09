import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Result = {
  contract_number: string; type: string; status: string;
  start_date: string; end_date: string;
  client_name: string; company_name: string;
  vehicle?: { brand: string | null; model: string | null; registration: string | null };
};

export default function VerificationAttestation() {
  const [val, setVal] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [searched, setSearched] = useState(false);

  const verify = async () => {
    setRes(null);
    setSearched(true);
    let { data: ct } = await supabase.from("contracts")
      .select("*, clients(full_name), companies(name)")
      .eq("contract_number", val).maybeSingle();
    if (!ct) {
      const { data: veh } = await supabase.from("vehicles")
        .select("*, clients(id, full_name)").eq("registration", val).limit(1).maybeSingle();
      if (veh?.client_id) {
        const { data: ct2 } = await supabase.from("contracts")
          .select("*, clients(full_name), companies(name)")
          .eq("client_id", veh.client_id).order("end_date", { ascending: false }).limit(1).maybeSingle();
        ct = ct2;
      }
    }
    if (!ct) { toast.error("Aucune police trouvée"); return; }
    const { data: veh } = await supabase.from("vehicles")
      .select("brand, model, registration").eq("client_id", ct.client_id).limit(1).maybeSingle();
    setRes({
      contract_number: ct.contract_number,
      type: ct.type,
      status: ct.status,
      start_date: ct.start_date,
      end_date: ct.end_date,
      client_name: (ct as { clients?: { full_name?: string } }).clients?.full_name ?? "—",
      company_name: (ct as { companies?: { name?: string } }).companies?.name ?? "—",
      vehicle: veh ?? undefined,
    });
    sessionStorage.setItem("autorite_verifs",
      String(Number(sessionStorage.getItem("autorite_verifs") ?? 0) + 1));
  };

  const expired = res ? new Date(res.end_date) < new Date() : false;
  const valid = res?.status === "actif" && !expired;
  const suspended = res?.status === "suspendu";

  return (
    <div className="space-y-6">
      <PageHeader title="Vérification d'attestation"
        description="Contrôle de validité d'une police d'assurance." />
      <Card className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex gap-2">
          <Input placeholder="N° de police ou immatriculation"
            value={val} onChange={(e) => setVal(e.target.value)} />
          <Button onClick={verify} disabled={!val}>Vérifier</Button>
        </div>
        {searched && !res && (
          <p className="text-center text-muted-foreground py-4">Aucune police trouvée pour ce numéro.</p>
        )}
        {res && (
          <Card className="p-5 space-y-3">
            <div className="text-center">
              {valid ? (
                <Badge className="text-base py-2 px-4 bg-green-500/15 text-green-700">✅ ASSURANCE VALIDE</Badge>
              ) : suspended ? (
                <Badge className="text-base py-2 px-4 bg-amber-500/15 text-amber-700">⚠️ SUSPENDUE</Badge>
              ) : (
                <Badge className="text-base py-2 px-4" variant="destructive">❌ EXPIRÉE</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm pt-3">
              <p><strong>Titulaire :</strong> {res.client_name}</p>
              <p><strong>N° police :</strong> {res.contract_number}</p>
              <p><strong>Compagnie :</strong> {res.company_name}</p>
              <p><strong>Type :</strong> {res.type}</p>
              <p><strong>Effet :</strong> {res.start_date}</p>
              <p><strong>Expiration :</strong> {res.end_date}</p>
              {res.vehicle && (
                <p className="col-span-2"><strong>Véhicule :</strong> {res.vehicle.brand} {res.vehicle.model} — {res.vehicle.registration}</p>
              )}
            </div>
            <Button variant="outline" onClick={() => { setRes(null); setVal(""); setSearched(false); }} className="w-full">
              Nouvelle vérification
            </Button>
          </Card>
        )}
        <p className="text-xs text-muted-foreground italic text-center">
          Résultat indicatif. Toute contestation doit être confirmée auprès de la compagnie d'assurance concernée.
        </p>
      </Card>
    </div>
  );
}