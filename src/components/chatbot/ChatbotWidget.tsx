import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "📋 Mes contrats",
  "🚗 Déclarer un sinistre",
  "💰 Mes paiements",
  "📅 Mes renouvellements",
  "❓ Aide",
];

const STORAGE_KEY = "awa_chat_history_v1";
const MAX_MSGS = 50;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function loadHistory(): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { ts: number; messages: Msg[] };
    if (Date.now() - parsed.ts > MAX_AGE_MS) return [];
    return parsed.messages.slice(-MAX_MSGS);
  } catch { return []; }
}

function saveHistory(messages: Msg[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), messages: messages.slice(-MAX_MSGS) }));
  } catch { /* ignore */ }
}

export default function ChatbotWidget() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => loadHistory());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { saveHistory(messages); }, [messages]);

  if (role !== "client") return null;

  const send = async (content: string) => {
    if (!content.trim() || loading || !user) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      // Contexte assuré
      const [{ data: contracts }, { data: lastClaim }] = await Promise.all([
        supabase.from("contracts").select("id", { count: "exact" }),
        supabase.from("claims").select("status,claim_number").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const context = {
        nbContrats: contracts?.length ?? 0,
        dernierSinistre: lastClaim ? { status: lastClaim.status, numero: lastClaim.claim_number } : null,
      };

      const { data, error } = await supabase.functions.invoke("chatbot-client", {
        body: { messages: next, userId: user.id, context },
      });
      if (error) throw error;
      const reply = (data as { reply?: string; error?: string })?.reply ?? "Je n'ai pas pu répondre.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur du chatbot");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition"
        aria-label="Ouvrir l'assistant Awa"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 max-h-[70vh] flex flex-col bg-background border rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary-foreground text-primary flex items-center justify-center font-bold">A</div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Awa · Assistante InsureFlow</div>
          <div className="text-xs flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400 inline-block" /> En ligne
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100" aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
        {messages.length === 0 && (
          <>
            <div className="bg-muted rounded-2xl rounded-tl-none p-3 text-sm max-w-[85%]">
              Bonjour ! 👋 Je suis Awa. Comment puis-je vous aider aujourd'hui ?
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="group max-w-[85%] relative">
              <div className={`p-3 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
                  : "bg-muted rounded-2xl rounded-tl-none"
              }`}>
                {m.content}
              </div>
              {m.role === "assistant" && (
                <button
                  onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copié"); }}
                  className="opacity-0 group-hover:opacity-100 transition text-[10px] text-muted-foreground mt-1 hover:underline"
                >Copier</button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-none p-3 flex gap-1">
              <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce" />
              <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:120ms]" />
              <span className="h-2 w-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:240ms]" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="border-t p-2 flex items-center gap-2 bg-background"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question…"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}