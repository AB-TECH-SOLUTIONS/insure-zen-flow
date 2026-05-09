import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Doc = {
  id: string; created_at: string; document_type: string; reference_number: string | null;
  claim_id: string | null; contract_id: string | null; file_url: string | null;
  claim_number?: string; contract_number?: string;
};

export default function MesDocuments() {
  const { user } = useAuth();
  const [list, setList] = useState<Doc[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("official_documents").select("*")
        .eq("deposited_by", user.id).order("created_at", { ascending: false });
      const docs = (data ?? []) as Doc[];
      const enriched = await Promise.all(docs.map(async (d) => {
        let claim_number: string | undefined;
        let contract_number: string | undefined;
        if (d.claim_id) {
          const { data: c } = await supabase.from("claims").select("claim_number").eq("id", d.claim_id).maybeSingle();
          claim_number = c?.claim_number;
        }
        if (d.contract_id) {
          const { data: ct } = await supabase.from("contracts").select("contract_number").eq("id", d.contract_id).maybeSingle();
          contract_number = ct?.contract_number;
        }
        return { ...d, claim_number, contract_number };
      }));
      setList(enriched);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((d) =>
      d.claim_number?.toLowerCase().includes(s) || d.contract_number?.toLowerCase().includes(s)
    );
  }, [list, search]);

  const dl = async (path: string) => {
    const { data, error } = await supabase.storage.from("autorite-documents").download(path);
    if (error) { toast.error(error.message); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = path.split("/").pop() ?? "document"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Mes documents déposés"
        actions={<Input placeholder="Rechercher N° sinistre ou police"
          value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />} />
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Sinistre</TableHead>
              <TableHead>Police</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{new Date(d.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>{d.document_type}</TableCell>
                <TableCell>{d.reference_number ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{d.claim_number ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{d.contract_number ?? "—"}</TableCell>
                <TableCell>
                  {d.file_url && (
                    <Button size="icon" variant="ghost" onClick={() => dl(d.file_url!)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Aucun document.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}