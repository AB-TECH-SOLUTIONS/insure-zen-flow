import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email("Email invalide").max(200);

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = emailSchema.safeParse(email);
    if (!check.success) {
      toast.error(check.error.errors[0]?.message ?? "Email invalide");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Lien magique envoyé. Vérifiez votre boîte mail.");
  };

  if (sent) {
    return (
      <div className="rounded-lg border bg-muted/40 p-4 text-sm flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Email envoyé !</p>
          <p className="text-muted-foreground">
            Vérifiez votre boîte mail (et le dossier <strong>spams</strong>). Le lien expire dans 1 heure.
          </p>
          <button
            type="button"
            className="mt-2 text-xs underline text-muted-foreground hover:text-foreground"
            onClick={() => { setSent(false); setEmail(""); }}
          >
            Renvoyer à une autre adresse
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="ml-email">Email</Label>
        <Input
          id="ml-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          disabled={busy}
        />
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={busy || !email}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        <span className="ml-2">Recevoir un lien magique</span>
      </Button>
    </form>
  );
}
