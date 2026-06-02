import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Search, FileCheck, Users, AlertTriangle } from "lucide-react";

type ClientHit = { id: string; full_name: string; phone: string | null };
type ContractHit = { id: string; contract_number: string; type: string };
type ClaimHit = { id: string; claim_number: string; status: string };

const basePathFor = (role: string | null) =>
  role === "client" ? "/client"
    : role === "agent" ? "/agent"
    : role === "courtier" ? "/courtier"
    : role === "assureur" ? "/assureur"
    : role === "super_admin" ? "/admin"
    : "";

export function GlobalSearch() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<ClientHit[]>([]);
  const [contracts, setContracts] = useState<ContractHit[]>([]);
  const [claims, setClaims] = useState<ClaimHit[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || q.length < 2) { setClients([]); setContracts([]); setClaims([]); return; }
    const handle = setTimeout(async () => {
      const term = `%${q}%`;
      const [cl, ct, cm] = await Promise.all([
        supabase.from("clients").select("id,full_name,phone").or(`full_name.ilike.${term},phone.ilike.${term}`).limit(6),
        supabase.from("contracts").select("id,contract_number,type").ilike("contract_number", term).limit(6),
        supabase.from("claims").select("id,claim_number,status").ilike("claim_number", term).limit(6),
      ]);
      setClients((cl.data as ClientHit[]) || []);
      setContracts((ct.data as ContractHit[]) || []);
      setClaims((cm.data as ClaimHit[]) || []);
    }, 200);
    return () => clearTimeout(handle);
  }, [q, open]);

  const base = basePathFor(role);
  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="hidden md:inline ml-2 text-[10px] border rounded px-1">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher un client, contrat ou sinistre..." value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{q.length < 2 ? "Tapez au moins 2 caractères" : "Aucun résultat"}</CommandEmpty>
          {clients.length > 0 && (
            <CommandGroup heading="Clients">
              {clients.map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`${base}/clients/${c.id}`)}>
                  <Users className="h-4 w-4 mr-2" />{c.full_name}<span className="ml-auto text-xs text-muted-foreground">{c.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {contracts.length > 0 && (
            <CommandGroup heading="Contrats">
              {contracts.map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`${base}/contrats/${c.id}`)}>
                  <FileCheck className="h-4 w-4 mr-2" />{c.contract_number}<span className="ml-auto text-xs text-muted-foreground">{c.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {claims.length > 0 && (
            <CommandGroup heading="Sinistres">
              {claims.map((c) => (
                <CommandItem key={c.id} onSelect={() => go(`${base}/sinistres/${c.id}`)}>
                  <AlertTriangle className="h-4 w-4 mr-2" />{c.claim_number}<span className="ml-auto text-xs text-muted-foreground">{c.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
