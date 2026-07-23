import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, ArchiveRestore, Bell, BellOff, Inbox, MessageSquare, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/painel/mensagens/")({
  component: MessagesListPage,
  head: () => ({ meta: [{ title: "Mensagens — BrindesHub" }] }),
});

type Row = {
  id: string;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  buyer_id: string;
  buyer_archived_at: string | null;
  seller_archived_at: string | null;
  buyer_muted: boolean;
  seller_muted: boolean;
  buyer_muted_until: string | null;
  seller_muted_until: string | null;
  company: { id: string; name: string; slug: string; owner_id: string } | null;
};

const MUTE_PRESETS: Array<{ label: string; minutes: number | null }> = [
  { label: "15 minutos", minutes: 15 },
  { label: "1 hora", minutes: 60 },
  { label: "8 horas", minutes: 60 * 8 },
  { label: "24 horas", minutes: 60 * 24 },
  { label: "7 dias", minutes: 60 * 24 * 7 },
  { label: "Até eu reativar", minutes: null },
];

function normalize(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function MessagesListPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tab, setTab] = useState<"ativas" | "arquivadas">("ativas");
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, subject, last_message_at, last_message_preview, buyer_id, buyer_archived_at, seller_archived_at, buyer_muted, seller_muted, buyer_muted_until, seller_muted_until, company:companies!inner(id, name, slug, owner_id)")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const { data: deepMatches } = useQuery({
    queryKey: ["conversations-deep-search", debounced],
    enabled: debounced.length >= 2,
    staleTime: 15_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("messages")
        .select("conversation_id")
        .ilike("body", `%${debounced}%`)
        .limit(200);
      if (error) throw error;
      return new Set((data ?? []).map((m) => m.conversation_id as string));
    },
  });

  const roleOf = (c: Row): "buyer" | "seller" => (me && c.buyer_id === me ? "buyer" : "seller");
  const isArchived = (c: Row) => (roleOf(c) === "buyer" ? !!c.buyer_archived_at : !!c.seller_archived_at);
  const mutedUntil = (c: Row): string | null =>
    roleOf(c) === "buyer" ? c.buyer_muted_until : c.seller_muted_until;
  const isMuted = (c: Row) => {
    const base = roleOf(c) === "buyer" ? c.buyer_muted : c.seller_muted;
    if (!base) return false;
    const until = mutedUntil(c);
    if (until && new Date(until).getTime() <= Date.now()) return false;
    return true;
  };

  const filtered = useMemo(() => {
    const base = data.filter((c) => (tab === "arquivadas" ? isArchived(c) : !isArchived(c)));
    if (debounced.length === 0) return base;
    const needle = normalize(debounced);
    return base.filter((c) => {
      const haystack = normalize(
        `${c.company?.name ?? ""} ${c.subject ?? ""} ${c.last_message_preview ?? ""}`,
      );
      if (haystack.includes(needle)) return true;
      if (deepMatches?.has(c.id)) return true;
      return false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, debounced, deepMatches, tab, me]);

  const activeCount = data.filter((c) => !isArchived(c)).length;
  const archivedCount = data.filter((c) => isArchived(c)).length;

  useEffect(() => {
    const ch = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () =>
        qc.invalidateQueries({ queryKey: ["conversations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  async function toggleArchive(c: Row, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const role = roleOf(c);
    const currentlyArchived = isArchived(c);
    const value = currentlyArchived ? null : new Date().toISOString();
    const patch = role === "buyer" ? { buyer_archived_at: value } : { seller_archived_at: value };
    const { error } = await supabase.from("conversations").update(patch).eq("id", c.id);
    if (error) {
      toast.error("Não foi possível atualizar", { description: error.message });
      return;
    }
    toast.success(currentlyArchived ? "Conversa restaurada" : "Conversa arquivada");
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  async function applyMute(c: Row, minutes: number | null, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const role = roleOf(c);
    const until = minutes == null ? null : new Date(Date.now() + minutes * 60_000).toISOString();
    const patch =
      role === "buyer"
        ? { buyer_muted: true, buyer_muted_until: until }
        : { seller_muted: true, seller_muted_until: until };
    const { error } = await supabase.from("conversations").update(patch).eq("id", c.id);
    if (error) {
      toast.error("Não foi possível silenciar", { description: error.message });
      return;
    }
    toast.success(
      minutes == null ? "Silenciada até você reativar" : `Silenciada por ${formatMinutes(minutes)}`,
    );
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  async function unmute(c: Row, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const role = roleOf(c);
    const patch =
      role === "buyer"
        ? { buyer_muted: false, buyer_muted_until: null }
        : { seller_muted: false, seller_muted_until: null };
    const { error } = await supabase.from("conversations").update(patch).eq("id", c.id);
    if (error) {
      toast.error("Não foi possível atualizar", { description: error.message });
      return;
    }
    toast.success("Notificações reativadas");
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">Conversas diretas com compradores e vendedores.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("ativas")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              tab === "ativas" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Inbox className="h-3.5 w-3.5" /> Ativas
            <span className="ml-1 rounded bg-background/20 px-1.5 text-[10px]">{activeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("arquivadas")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              tab === "arquivadas" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Archive className="h-3.5 w-3.5" /> Arquivadas
            <span className="ml-1 rounded bg-background/20 px-1.5 text-[10px]">{archivedCount}</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por empresa, assunto ou conteúdo…"
          className="pl-9 pr-9"
          aria-label="Buscar em conversas"
        />
        {q && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setQ("")}
            aria-label="Limpar busca"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-8 w-8" />
          {debounced
            ? "Nenhuma conversa encontrada para sua busca."
            : tab === "arquivadas"
              ? "Nenhuma conversa arquivada."
              : "Nenhuma conversa ativa."}
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {filtered.map((c) => {
            const muted = isMuted(c);
            const archived = isArchived(c);
            const until = muted ? mutedUntil(c) : null;
            return (
              <li key={c.id} className="group relative">
                <Link
                  to="/painel/mensagens/$id"
                  params={{ id: c.id }}
                  className="flex flex-col gap-1 p-4 pr-24 transition hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-medium">
                      {c.company?.name ?? "Empresa"}
                      {muted && (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                          title={until ? `Silenciada até ${new Date(until).toLocaleString("pt-BR")}` : "Silenciada"}
                        >
                          <BellOff className="h-3.5 w-3.5" aria-label="Silenciada" />
                          {until && (
                            <span className="hidden sm:inline">
                              {formatDistanceToNow(new Date(until), { addSuffix: true, locale: ptBR })}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  {c.subject && <span className="text-sm text-muted-foreground">{c.subject}</span>}
                  {c.last_message_preview && (
                    <span className="line-clamp-1 text-sm">{c.last_message_preview}</span>
                  )}
                </Link>
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  {muted ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => unmute(c, e)}
                      aria-label="Reativar notificações"
                      title="Reativar notificações"
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          aria-label="Silenciar por…"
                          title="Silenciar por…"
                        >
                          <BellOff className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {MUTE_PRESETS.map((p, i) => (
                          <div key={p.label}>
                            {i === MUTE_PRESETS.length - 1 && <DropdownMenuSeparator />}
                            <DropdownMenuItem onClick={(e) => applyMute(c, p.minutes, e)}>
                              {p.label}
                            </DropdownMenuItem>
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => toggleArchive(c, e)}
                    aria-label={archived ? "Restaurar" : "Arquivar"}
                    title={archived ? "Restaurar" : "Arquivar"}
                  >
                    {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / (60 * 24))}d`;
}
