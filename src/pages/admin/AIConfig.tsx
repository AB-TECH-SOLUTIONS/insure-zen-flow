import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DEFAULT_PROMPT = `Tu es Awa, assistante virtuelle d'InsureZen Flow.
Tu aides les clients assurés à comprendre leurs contrats, déclarer des sinistres et
suivre leurs paiements. Réponds toujours en français, de manière concise et bienveillante.`;

type Param = { key: string; value: string };

export default function AIConfig() {
  const [enabled, setEnabled] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ calls: number; lastDay: number }>({ calls: 0, lastDay: 0 });

  useEffect(() => {
    void (async () => {
      // Lecture des paramètres
      const { data } = await supabase.from("parametres" as never).select("key, value").in("key", ["awa_enabled", "awa_system_prompt"]);
      const rows = (data ?? []) as Param[];
      const en = rows.find((r) => r.key === "awa_enabled")?.value;
      const sp = rows.find((r) => r.key === "awa_system_prompt")?.value;
      if (en) setEnabled(en === "true");
      if (sp) setSystemPrompt(sp);

      // Stats d'usage approximatives via audit_logs (si dispo) — sinon 0
      const { count } = await supabase.from("audit_logs").select("id", { count: "exact", head: true }).like("action", "chatbot.%");
      setStats({ calls: count ?? 0, lastDay: 0 });
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const upserts = [
        { key: "awa_enabled", value: String(enabled) },
        { key: "awa_system_prompt", value: systemPrompt },
      ];
      const { error } = await supabase.from("parametres" as never).upsert(upserts, { onConflict: "key" });
      if (error) throw error;
      toast.success("Configuration enregistrée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Configuration IA — Chatbot Awa" description="Réservé super administrateur" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">Appels IA enregistrés</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{stats.calls}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Coût mensuel estimé</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">~ 5–10 €</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Activation du chatbot</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">Awa visible côté client</p>
            <p className="text-sm text-muted-foreground">Désactive pour masquer le widget partout.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>System prompt</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label>Instructions à Awa</Label>
          <Textarea rows={10} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
          <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}