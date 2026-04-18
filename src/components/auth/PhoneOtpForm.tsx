import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Smartphone } from "lucide-react";

export function PhoneOtpForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("provider")
        ? "L'envoi SMS n'est pas encore configuré côté Cloud (Twilio requis)."
        : error.message);
      return;
    }
    toast.success("Code envoyé par SMS.");
    setStep("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Connecté");
  };

  if (step === "code") {
    return (
      <form onSubmit={verify} className="space-y-3">
        <div className="space-y-2">
          <Label>Code reçu par SMS</Label>
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep("phone")}>
            Retour
          </Button>
          <Button type="submit" className="flex-1" disabled={busy || code.length < 6}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Valider le code
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="otp-phone">Téléphone</Label>
        <Input
          id="otp-phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+237…"
        />
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
        <span className="ml-2">Recevoir un code SMS</span>
      </Button>
    </form>
  );
}
