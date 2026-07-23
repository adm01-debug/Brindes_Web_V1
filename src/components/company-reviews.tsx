import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { pgErrorMessage } from "@/lib/pg-errors";

type Review = {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  comment: string;
  status: string;
  created_at: string;
  author_id: string;
};

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Escolha uma nota").max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(10, "Escreva ao menos 10 caracteres").max(2000),
});

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const px = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const display = hover || value;
  return (
    <div className="flex items-center gap-0.5" role={readOnly ? "img" : "radiogroup"} aria-label={`Nota ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={cn(
            "transition-transform",
            !readOnly && "hover:scale-110 cursor-pointer",
            readOnly && "cursor-default",
          )}
          aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
        >
          <Star
            className={cn(
              px,
              n <= display ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function CompanyRatingSummary({ companyId }: { companyId: string }) {
  const { data } = useQuery({
    queryKey: ["company-rating", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_company_rating", { _company_id: companyId });
      if (error) throw error;
      return data?.[0] ?? { average: 0, total: 0 };
    },
    staleTime: 60_000,
  });
  const avg = Number(data?.average ?? 0);
  const total = Number(data?.total ?? 0);
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <StarRating value={Math.round(avg)} readOnly size="sm" />
      <span className="font-medium">{avg.toFixed(1)}</span>
      <span className="text-muted-foreground">({total} {total === 1 ? "avaliação" : "avaliações"})</span>
    </div>
  );
}

export function CompanyReviews({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<{ id: string; email?: string | null; name?: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: (data.user.user_metadata?.full_name as string) ?? data.user.email?.split("@")[0] ?? "Cliente",
        });
      } else {
        setUser(null);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: (session.user.user_metadata?.full_name as string) ?? session.user.email?.split("@")[0] ?? "Cliente",
        });
      } else setUser(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: reviews } = useQuery({
    queryKey: ["company-reviews", companyId, user?.id ?? "anon"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_reviews")
        .select("id, author_name, rating, title, comment, status, created_at, author_id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const myReview = useMemo(
    () => reviews?.find((r) => r.author_id === user?.id),
    [reviews, user?.id],
  );
  const approved = useMemo(() => reviews?.filter((r) => r.status === "approved") ?? [], [reviews]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Faça login para avaliar.");
      const parsed = reviewSchema.parse({ rating, title: title || undefined, comment });
      const { error } = await supabase.from("company_reviews").insert({
        company_id: companyId,
        author_id: user.id,
        author_name: user.name ?? "Cliente",
        rating: parsed.rating,
        title: parsed.title ?? null,
        comment: parsed.comment,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação enviada! Ficará visível após moderação.");
      setRating(0); setTitle(""); setComment("");
      qc.invalidateQueries({ queryKey: ["company-reviews", companyId] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof z.ZodError ? e.issues[0]?.message ?? "Dados inválidos" : pgErrorMessage(e);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação removida.");
      qc.invalidateQueries({ queryKey: ["company-reviews", companyId] });
      qc.invalidateQueries({ queryKey: ["company-rating", companyId] });
    },
    onError: (e) => toast.error(pgErrorMessage(e)),
  });

  return (
    <section aria-labelledby="reviews-title" className="mt-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="reviews-title" className="text-xl font-bold tracking-tight">Avaliações</h2>
          <div className="mt-1"><CompanyRatingSummary companyId={companyId} /></div>
        </div>
      </div>

      {/* Formulário */}
      <Card className="mt-4">
        <CardContent className="p-5">
          {!user ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Faça login para avaliar esta empresa e ajudar outros compradores.
              </p>
              <Button asChild size="sm"><Link to="/auth" search={{ next: typeof window !== "undefined" ? window.location.pathname : "/" } as never}>Entrar para avaliar</Link></Button>
            </div>
          ) : myReview ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarRating value={myReview.rating} readOnly size="sm" />
                  <Badge variant={
                    myReview.status === "approved" ? "default"
                    : myReview.status === "rejected" ? "destructive" : "secondary"
                  }>
                    {myReview.status === "approved" ? "Publicada"
                     : myReview.status === "rejected" ? "Rejeitada" : "Em moderação"}
                  </Badge>
                </div>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => { if (confirm("Remover sua avaliação?")) deleteMutation.mutate(myReview.id); }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remover
                </Button>
              </div>
              {myReview.title && <p className="text-sm font-medium">{myReview.title}</p>}
              <p className="text-sm text-muted-foreground whitespace-pre-line">{myReview.comment}</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
              className="space-y-4"
            >
              <div>
                <Label className="mb-2 block">Sua nota</Label>
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>
              <div>
                <Label htmlFor="review-title">Título (opcional)</Label>
                <Input
                  id="review-title" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120} placeholder="Ex.: Atendimento excelente"
                />
              </div>
              <div>
                <Label htmlFor="review-comment">Comentário</Label>
                <Textarea
                  id="review-comment" value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4} maxLength={2000}
                  placeholder="Compartilhe sua experiência com esta empresa..."
                  required
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending || rating === 0}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar avaliação
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="mt-6 space-y-4">
        {approved.length === 0 && (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma avaliação ainda. Seja o primeiro a avaliar!
            </p>
          </div>
        )}
        {approved.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {r.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.author_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <StarRating value={r.rating} readOnly size="sm" />
              </div>
              {r.title && <h3 className="mt-3 font-semibold">{r.title}</h3>}
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.comment}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
