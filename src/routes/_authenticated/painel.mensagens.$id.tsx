import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/painel/mensagens/$id")({
  component: MessageThreadPage,
  head: () => ({ meta: [{ title: "Conversa — BrindesHub" }] }),
});

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

type Message = {
  id: string;
  body: string | null;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
};
type Conversation = {
  id: string;
  subject: string | null;
  buyer_id: string;
  company: { id: string; name: string; slug: string; owner_id: string } | null;
};

function MessageThreadPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const { data: conv } = useQuery({
    queryKey: ["conversation", id],
    queryFn: async (): Promise<Conversation | null> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, subject, buyer_id, company:companies!inner(id, name, slug, owner_id)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Conversation | null;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at, read_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`conv-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // marca as mensagens do outro como lidas
  useEffect(() => {
    if (!me || messages.length === 0) return;
    const unread = messages.filter((m) => m.sender_id !== me && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread)
      .then(() => qc.invalidateQueries({ queryKey: ["messages", id] }));
  }, [me, messages, id, qc]);

  // Indicador "digitando…" via Realtime broadcast
  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel(`typing-${id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "typing" }, (payload) => {
      const from = (payload.payload as { user_id?: string } | undefined)?.user_id;
      if (!from || from === me) return;
      setOtherTyping(true);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      typingClearRef.current = setTimeout(() => setOtherTyping(false), 3500);
    }).subscribe();
    typingChannelRef.current = ch;
    return () => {
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
    };
  }, [id, me]);

  function emitTyping() {
    if (!me || !typingChannelRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: me } });
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (trimmed.length < 1 || !me) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: me,
      body: trimmed,
    });
    setBusy(false);
    if (error) {
      toast.error("Falha ao enviar", { description: error.message });
      return;
    }
    setBody("");
    qc.invalidateQueries({ queryKey: ["messages", id] });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="mb-3 flex items-center gap-3 border-b pb-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/painel/mensagens">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="truncate font-semibold">{conv?.company?.name ?? "Conversa"}</div>
          {conv?.subject && <div className="truncate text-xs text-muted-foreground">{conv.subject}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border bg-muted/20 p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Sem mensagens ainda.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender_id === me;
              return (
                <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <div className={cn("mt-1 text-[10px] opacity-70", mine ? "text-right" : "")}>
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </li>
              );
            })}
            <div ref={bottomRef} />
          </ul>
        )}
      </div>

      <div className="mt-2 h-5 text-xs text-muted-foreground" aria-live="polite">
        {otherTyping && (
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </span>
            digitando…
          </span>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-3 flex items-end gap-2"
      >
        <Textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            emitTyping();
          }}
          placeholder="Escreva sua mensagem…"
          rows={2}
          maxLength={4000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button type="submit" disabled={busy || body.trim().length === 0}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
