import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Msg = {
  id: string; sender_id: string; recipient_id: string;
  subject: string | null; body: string;
  created_at: string; read_at: string | null;
};
type Profile = { user_id: string; full_name: string | null };

export default function Messagerie() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [allUsers, setAllUsers] = useState<Profile[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setMessages(data ?? []);
    const ids = Array.from(new Set((data ?? []).flatMap(m => [m.sender_id, m.recipient_id])));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, Profile> = {};
      ps?.forEach(p => { map[p.user_id] = p; });
      setProfiles(map);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("messages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const peers = Array.from(new Set(messages.map(m => m.sender_id === user?.id ? m.recipient_id : m.sender_id)));
  const conv = messages.filter(m =>
    activePeer && (m.sender_id === activePeer || m.recipient_id === activePeer)
  ).sort((a,b) => a.created_at.localeCompare(b.created_at));

  const send = async () => {
    if (!user || !activePeer || !draft.trim()) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, recipient_id: activePeer, body: draft.trim(),
    });
    if (error) return toast.error(error.message);
    setDraft("");
    load();
  };

  const markRead = async (id: string) => {
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  useEffect(() => {
    if (activePeer) {
      conv.filter(m => m.recipient_id === user?.id && !m.read_at).forEach(m => markRead(m.id));
    }
  }, [activePeer, conv.length]);

  const openNewDialog = async () => {
    setOpenNew(true);
    const { data } = await supabase.from("profiles").select("user_id, full_name").neq("user_id", user?.id ?? "").limit(100);
    setAllUsers(data ?? []);
  };

  const sendNew = async () => {
    if (!user || !newRecipient || !newBody.trim()) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, recipient_id: newRecipient,
      subject: newSubject || null, body: newBody.trim(),
    });
    if (error) return toast.error(error.message);
    toast.success("Message envoyé");
    setOpenNew(false); setNewBody(""); setNewSubject(""); setNewRecipient("");
    setActivePeer(newRecipient);
    load();
  };

  return (
    <div>
      <PageHeader title="Messagerie" description="Échanges avec clients, agents et compagnies"
        actions={
          <Dialog open={openNew} onOpenChange={(o) => o ? openNewDialog() : setOpenNew(false)}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouveau message</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau message</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Destinataire</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)}>
                    <option value="">Sélectionner…</option>
                    {allUsers.map(u => (
                      <option key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0,8)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Sujet</Label>
                  <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea rows={5} value={newBody} onChange={(e) => setNewBody(e.target.value)} />
                </div>
                <Button onClick={sendNew} className="w-full">Envoyer</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-base">Conversations</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {peers.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">Aucune conversation</p>
              )}
              {peers.map(pid => {
                const last = messages.find(m => m.sender_id === pid || m.recipient_id === pid);
                const unread = messages.filter(m => m.sender_id === pid && m.recipient_id === user?.id && !m.read_at).length;
                return (
                  <button key={pid} onClick={() => setActivePeer(pid)}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-accent ${activePeer === pid ? "bg-accent" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{profiles[pid]?.full_name || pid.slice(0,8)}</p>
                      {unread > 0 && <Badge>{unread}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{last?.body}</p>
                  </button>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {activePeer ? (profiles[activePeer]?.full_name || "Conversation") : "Sélectionnez une conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activePeer ? (
              <div className="h-[450px] flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-2 opacity-30" />
                <p>Choisissez une conversation ou créez-en une nouvelle</p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[400px] mb-3">
                  <div className="space-y-2 pr-3">
                    {conv.map(m => {
                      const mine = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {m.subject && <p className="text-xs font-semibold mb-1">{m.subject}</p>}
                            <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                            <p className="text-[10px] opacity-70 mt-1">
                              {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea rows={2} placeholder="Votre message…" value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}} />
                  <Button onClick={send} size="icon"><Send className="h-4 w-4" /></Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}