import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, CheckCheck, ChevronDown, ChevronUp, FileText, Loader2, Paperclip, Search, Send, SmilePlus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [matchIdx, setMatchIdx] = useState(0);

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
        .select("id, body, sender_id, created_at, read_at, attachment_url, attachment_type, attachment_name, attachment_size")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);

  const { data: reactions = [] } = useQuery({
    queryKey: ["message-reactions", id, messageIds.length],
    enabled: messageIds.length > 0,
    queryFn: async (): Promise<Array<{ message_id: string; user_id: string; emoji: string }>> => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("message_id, user_id, emoji")
        .in("message_id", messageIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, Map<string, string[]>>();
    for (const r of reactions) {
      if (!map.has(r.message_id)) map.set(r.message_id, new Map());
      const em = map.get(r.message_id)!;
      if (!em.has(r.emoji)) em.set(r.emoji, []);
      em.get(r.emoji)!.push(r.user_id);
    }
    return map;
  }, [reactions]);

  useEffect(() => {
    const ch = supabase
      .channel(`conv-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => qc.invalidateQueries({ queryKey: ["message-reactions", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  async function toggleReaction(messageId: string, emoji: string) {
    if (!me) return;
    const existing = reactionsByMessage.get(messageId)?.get(emoji)?.includes(me);
    if (existing) {
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", me)
        .eq("emoji", emoji);
      if (error) toast.error("Falha ao remover reação", { description: error.message });
    } else {
      const { error } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: me, emoji });
      if (error) toast.error("Falha ao reagir", { description: error.message });
    }
    qc.invalidateQueries({ queryKey: ["message-reactions", id] });
  }

  const normalizedSearch = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (normalizedSearch.length < 1) return [] as string[];
    return messages
      .filter((m) => (m.body ?? "").toLowerCase().includes(normalizedSearch))
      .map((m) => m.id);
  }, [messages, normalizedSearch]);
  const activeMatchId = matches[matchIdx];

  useEffect(() => {
    setMatchIdx(0);
  }, [normalizedSearch]);

  useEffect(() => {
    if (!activeMatchId) return;
    messageRefs.current.get(activeMatchId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchId]);

  useEffect(() => {
    if (matches.length > 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, matches.length]);

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

  function handlePickFile(file: File | null) {
    if (!file) {
      setPendingFile(null);
      return;
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      toast.error("Formato não suportado", { description: "Envie JPG, PNG, WebP, GIF ou PDF." });
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Arquivo muito grande", { description: "Limite de 10 MB por anexo." });
      return;
    }
    setPendingFile(file);
  }

  async function handleSend() {
    const trimmed = body.trim();
    if (!me) return;
    if (trimmed.length === 0 && !pendingFile) return;
    setBusy(true);
    let attachment: {
      attachment_url: string;
      attachment_type: string;
      attachment_name: string;
      attachment_size: number;
    } | null = null;
    if (pendingFile) {
      const ext = pendingFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${id}/${me}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-attachments")
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
      if (upErr) {
        setBusy(false);
        toast.error("Falha ao enviar anexo", { description: upErr.message });
        return;
      }
      attachment = {
        attachment_url: path,
        attachment_type: pendingFile.type,
        attachment_name: pendingFile.name.slice(0, 200),
        attachment_size: pendingFile.size,
      };
    }
    const payload = {
      conversation_id: id,
      sender_id: me,
      body: trimmed.length > 0 ? trimmed : "",
      ...(attachment ?? {}),
    };
    const { error } = await supabase.from("messages").insert(payload);
    setBusy(false);
    if (error) {
      toast.error("Falha ao enviar", { description: error.message });
      return;
    }
    setBody("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{conv?.company?.name ?? "Conversa"}</div>
          {conv?.subject && <div className="truncate text-xs text-muted-foreground">{conv.subject}</div>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setShowSearch((v) => {
              if (v) setSearch("");
              return !v;
            });
          }}
          aria-label={showSearch ? "Fechar busca" : "Buscar mensagens"}
          aria-pressed={showSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {showSearch && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nesta conversa…"
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            aria-label="Buscar na conversa"
          />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {normalizedSearch.length > 0 ? `${matches.length === 0 ? 0 : matchIdx + 1}/${matches.length}` : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={matches.length === 0}
            onClick={() => setMatchIdx((i) => (i - 1 + matches.length) % matches.length)}
            aria-label="Resultado anterior"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={matches.length === 0}
            onClick={() => setMatchIdx((i) => (i + 1) % matches.length)}
            aria-label="Próximo resultado"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setSearch("");
              setShowSearch(false);
            }}
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-xl border bg-muted/20 p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Sem mensagens ainda.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender_id === me;
              const isMatch = normalizedSearch.length > 0 && matches.includes(m.id);
              const isActive = m.id === activeMatchId;
              return (
                <li
                  key={m.id}
                  ref={(el) => {
                    messageRefs.current.set(m.id, el);
                  }}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm transition",
                      mine ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border",
                      isMatch && "ring-2 ring-yellow-400/70",
                      isActive && "ring-yellow-500 ring-offset-2 ring-offset-background",
                    )}
                  >
                    {m.attachment_url && (
                      <MessageAttachment
                        path={m.attachment_url}
                        type={m.attachment_type}
                        name={m.attachment_name}
                        size={m.attachment_size}
                        mine={mine}
                      />
                    )}
                    {m.body && m.body.length > 0 && (
                      <p className="whitespace-pre-wrap break-words">
                        {normalizedSearch.length > 0 ? highlight(m.body, normalizedSearch) : m.body}
                      </p>
                    )}
                    <div className={cn("mt-1 flex items-center gap-1 text-[10px] opacity-70", mine ? "justify-end" : "")}>
                      <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR })}</span>
                      {mine && (
                        m.read_at ? (
                          <CheckCheck className="h-3 w-3" aria-label="Visto" />
                        ) : (
                          <Check className="h-3 w-3" aria-label="Enviado" />
                        )
                      )}
                    </div>
                    <MessageReactions
                      messageId={m.id}
                      reactions={reactionsByMessage.get(m.id)}
                      me={me}
                      mine={mine}
                      onToggle={toggleReaction}
                    />
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

      {pendingFile && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{pendingFile.name}</span>
          <span className="shrink-0 text-muted-foreground">
            {(pendingFile.size / 1024).toFixed(0)} KB
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={() => handlePickFile(null)}
            aria-label="Remover anexo"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-3 flex items-end gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_ATTACHMENT_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
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
        <Button type="submit" disabled={busy || (body.trim().length === 0 && !pendingFile)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, needle: string) {
  if (!needle) return text;
  const re = new RegExp(`(${escapeRegExp(needle)})`, "ig");
  const parts = text.split(re);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-yellow-300 px-0.5 text-black">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

function MessageReactions({
  messageId,
  reactions,
  me,
  mine,
  onToggle,
}: {
  messageId: string;
  reactions: Map<string, string[]> | undefined;
  me: string | null;
  mine: boolean;
  onToggle: (messageId: string, emoji: string) => void;
}) {
  const entries = reactions ? Array.from(reactions.entries()) : [];
  return (
    <div className={cn("mt-1.5 flex flex-wrap items-center gap-1", mine ? "justify-end" : "justify-start")}>
      {entries.map(([emoji, users]) => {
        const reacted = me ? users.includes(me) : false;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(messageId, emoji)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition",
              reacted
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-background/70 text-foreground hover:bg-muted",
            )}
            aria-pressed={reacted}
            aria-label={`${emoji} ${users.length}`}
          >
            <span>{emoji}</span>
            <span className="tabular-nums">{users.length}</span>
          </button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground opacity-0 transition hover:bg-muted group-hover:opacity-100",
              entries.length > 0 && "opacity-100",
            )}
            aria-label="Adicionar reação"
          >
            <SmilePlus className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1.5" align={mine ? "end" : "start"}>
          <div className="flex gap-0.5">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggle(messageId, emoji)}
                className="rounded p-1 text-lg leading-none transition hover:bg-muted"
                aria-label={`Reagir com ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}


function MessageAttachment({
  path,
  type,
  name,
  size,
  mine,
}: {
  path: string;
  type: string | null;
  name: string | null;
  size: number | null;
  mine: boolean;
}) {
  const { data: signedUrl } = useQuery({
    queryKey: ["chat-attach-url", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 55 * 60 * 1000,
  });
  const isImage = type?.startsWith("image/") ?? false;
  if (!signedUrl) {
    return (
      <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando anexo…
      </div>
    );
  }
  if (isImage) {
    return (
      <a href={signedUrl} target="_blank" rel="noreferrer" className="mb-1 block">
        <img
          src={signedUrl}
          alt={name ?? "anexo"}
          loading="lazy"
          className="max-h-64 rounded-lg object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "mb-1 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs hover:underline",
        mine ? "border-primary-foreground/30" : "border-border bg-muted/40",
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{name ?? "arquivo.pdf"}</span>
      {size ? <span className="shrink-0 opacity-70">{(size / 1024).toFixed(0)} KB</span> : null}
    </a>
  );
}
