import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, ArchiveRestore, Bell, BellOff, Inbox, MessageSquare, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  company: { id: string; name: string; slug: string; owner_id: string } | null;
};

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
        .select("id, subject, last_message_at, last_message_preview, buyer_id, buyer_archived_at, seller_archived_at, buyer_muted, seller_muted, company:companies!inner(id, name, slug, owner_id)")
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
  const isMuted = (c: Row) => (roleOf(c) === "buyer" ? c.buyer_muted : c.seller_muted);

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

  async function toggleMute(c: Row, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const role = roleOf(c);
    const col = role === "buyer" ? "buyer_muted" : "seller_muted";
    const value = !isMuted(c);
    const { error } = await supabase.from("conversations").update({ [col]: value }).eq("id", c.id);
    if (error) {
      toast.error("Não foi possível atualizar", { description: error.message });
      return;
    }
    toast.success(value ? "Notificações silenciadas" : "Notificações reativadas");
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
                      {muted && <BellOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="Silenciada" />}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => toggleMute(c, e)}
                    aria-label={muted ? "Reativar notificações" : "Silenciar"}
                    title={muted ? "Reativar notificações" : "Silenciar"}
                  >
                    {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </Button>
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
