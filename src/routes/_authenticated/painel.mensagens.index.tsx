import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare } from "lucide-react";

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

function MessagesListPage() {
  const qc = useQueryClient();
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
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-8 w-8" />
          Nenhuma conversa ainda.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {data.map((c) => (
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
