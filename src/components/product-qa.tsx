import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, CheckCircle2 } from "lucide-react";

interface Question {
  id: string;
  asker_name: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  status: string;
}

interface Props {
  productId: string;
  companyId: string;
  productName: string;
}

const MAX_QUESTION = 1000;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function ProductQA({ productId, companyId, productName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["product-qa", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_questions")
        .select("id, asker_name, question, answer, answered_at, created_at, status")
        .eq("product_id", productId)
        .eq("status", "answered")
        .order("answered_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!user) throw new Error("Faça login para perguntar.");
      const askerName = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Usuário";
      const { error } = await supabase.from("product_questions").insert({
        product_id: productId,
        company_id: companyId,
        asker_user_id: user.id,
        asker_name: askerName,
        question: question.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      toast.success("Pergunta enviada! Ela aparecerá após aprovação do vendedor.");
      qc.invalidateQueries({ queryKey: ["product-qa", productId] });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao enviar pergunta."),
  });

  const canSubmit = text.trim().length >= 5 && text.trim().length <= MAX_QUESTION;

  return (
    <section className="mt-12" aria-labelledby="qa-title">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 id="qa-title" className="text-xl font-semibold">Perguntas e respostas</h2>
        {questions.length > 0 && (
          <span className="text-sm text-muted-foreground">({questions.length})</span>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-3">
          <label htmlFor="qa-input" className="text-sm font-medium">
            Faça uma pergunta sobre {productName}
          </label>
          {user ? (
            <>
              <Textarea
                id="qa-input"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_QUESTION))}
                placeholder="Ex.: Vocês personalizam com logotipo em cores? Qual o prazo mínimo?"
                rows={3}
                disabled={askMutation.isPending}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{text.trim().length}/{MAX_QUESTION} caracteres</span>
                <Button
                  size="sm"
                  onClick={() => askMutation.mutate(text)}
                  disabled={!canSubmit || askMutation.isPending}
                >
                  {askMutation.isPending ? "Enviando..." : "Enviar pergunta"}
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <p className="text-muted-foreground mb-2">Faça login para enviar uma pergunta ao vendedor.</p>
              <Button asChild size="sm" variant="outline">
                <Link to="/auth" search={{ redirect: `/produto/${productId}` }}>Entrar</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando perguntas...</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há perguntas respondidas. Seja o primeiro a perguntar!
        </p>
      ) : (
        <ol className="space-y-4">
          {questions.map((q) => (
            <li key={q.id}>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">P: {q.question}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {q.asker_name} — {fmt(q.created_at)}
                    </p>
                  </div>
                  {q.answer && (
                    <div className="rounded-md border-l-2 border-primary bg-primary/5 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resposta do vendedor
                        {q.answered_at && <span className="text-muted-foreground font-normal">— {fmt(q.answered_at)}</span>}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-line">{q.answer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
