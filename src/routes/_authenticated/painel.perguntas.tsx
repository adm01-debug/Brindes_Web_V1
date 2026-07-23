import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Send, XCircle, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/painel/perguntas")({
  head: () => ({
    meta: [
      { title: "Perguntas dos clientes — Painel BrindesHub" },
      { name: "description", content: "Responda às perguntas dos clientes sobre seus produtos." },
    ],
  }),
  component: PerguntasPage,
});

type Status = "pending" | "answered" | "rejected" | "all";

interface QuestionRow {
  id: string;
  product_id: string;
  company_id: string;
  asker_name: string;
  question: string;
  answer: string | null;
  status: string;
  created_at: string;
  answered_at: string | null;
  product: { id: string; name: string; slug: string | null } | null;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200" },
  answered: { label: "Respondida", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" },
  rejected: { label: "Rejeitada", className: "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200" },
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function PerguntasPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status>("pending");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["painel-questions", user?.id, filter],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("product_questions")
        .select("id, product_id, company_id, asker_name, question, answer, status, created_at, answered_at, product:products(id, name, slug)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as QuestionRow[];
    },
  });

  const mutate = useMutation({
    mutationFn: async ({ id, action, answer }: { id: string; action: "answer" | "reject"; answer?: string }) => {
      if (!user) throw new Error("Sessão expirada.");
      const patch = action === "answer"
        ? { answer: (answer ?? "").trim(), status: "answered" as const, answered_at: new Date().toISOString(), answered_by: user.id }
        : { status: "rejected" as const, answered_at: new Date().toISOString(), answered_by: user.id };
      const { error } = await supabase.from("product_questions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "answer" ? "Resposta publicada." : "Pergunta rejeitada.");
      setAnswers((prev) => { const n = { ...prev }; delete n[vars.id]; return n; });
      qc.invalidateQueries({ queryKey: ["painel-questions"] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao processar."),
  });

  const pendingCount = questions.filter((q) => q.status === "pending").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Perguntas dos clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Responda para que a resposta seja publicada na página do produto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filter === "pending" && pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pendente{pendingCount === 1 ? "" : "s"}</Badge>
          )}
          <Select value={filter} onValueChange={(v) => setFilter(v as Status)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="answered">Respondidas</SelectItem>
              <SelectItem value="rejected">Rejeitadas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : questions.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">
          Nenhuma pergunta {filter === "pending" ? "pendente" : filter === "answered" ? "respondida" : filter === "rejected" ? "rejeitada" : ""} no momento.
        </CardContent></Card>
      ) : (
        <ul className="space-y-4">
          {questions.map((q) => {
            const meta = STATUS_META[q.status] ?? STATUS_META.pending;
            const draft = answers[q.id] ?? "";
            const canSubmit = draft.trim().length >= 1 && draft.trim().length <= 2000;
            return (
              <li key={q.id}>
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {fmt(q.created_at)} · <strong className="text-foreground">{q.asker_name}</strong>
                        </p>
                        {q.product && (
                          <Link
                            to="/produto/$id"
                            params={{ id: q.product.id }}
                            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            {q.product.name}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    </div>

                    <p className="text-sm text-foreground whitespace-pre-line rounded-md border bg-muted/40 p-3">
                      {q.question}
                    </p>

                    {q.status === "answered" && q.answer && (
                      <div className="rounded-md border-l-2 border-primary bg-primary/5 p-3">
                        <p className="text-xs font-medium text-primary mb-1">Sua resposta {q.answered_at && `— ${fmt(q.answered_at)}`}</p>
                        <p className="text-sm whitespace-pre-line">{q.answer}</p>
                      </div>
                    )}

                    {q.status === "pending" && (
                      <div className="space-y-2">
                        <Textarea
                          value={draft}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value.slice(0, 2000) }))}
                          rows={3}
                          placeholder="Escreva sua resposta pública..."
                          disabled={mutate.isPending}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{draft.trim().length}/2000</span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => mutate.mutate({ id: q.id, action: "reject" })}
                              disabled={mutate.isPending}
                            >
                              <XCircle className="mr-1 h-4 w-4" /> Rejeitar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => mutate.mutate({ id: q.id, action: "answer", answer: draft })}
                              disabled={!canSubmit || mutate.isPending}
                            >
                              <Send className="mr-1 h-4 w-4" /> Publicar resposta
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
