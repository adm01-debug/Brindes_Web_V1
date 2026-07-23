import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, subject, last_message_at, last_message_preview, buyer_id, company:companies!inner(id, name, slug, owner_id)")
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  // Busca profunda: quando o usuário digita, procura também dentro dos corpos das mensagens.
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

  const filtered = useMemo(() => {
    if (debounced.length === 0) return data;
    const needle = normalize(debounced);
    return data.filter((c) => {
      const haystack = normalize(
        `${c.company?.name ?? ""} ${c.subject ?? ""} ${c.last_message_preview ?? ""}`,
      );
      if (haystack.includes(needle)) return true;
      if (deepMatches?.has(c.id)) return true;
      return false;
    });
  }, [data, debounced, deepMatches]);

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mensagens</h1>
        <p className="text-sm text-muted-foreground">Conversas diretas com compradores e vendedores.</p>
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
          {debounced ? "Nenhuma conversa encontrada para sua busca." : "Nenhuma conversa ainda."}
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to="/painel/mensagens/$id"
                params={{ id: c.id }}
                className="flex flex-col gap-1 p-4 transition hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{c.company?.name ?? "Empresa"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                {c.subject && <span className="text-sm text-muted-foreground">{c.subject}</span>}
                {c.last_message_preview && (
                  <span className="line-clamp-1 text-sm">{c.last_message_preview}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
