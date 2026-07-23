import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Star, CheckCircle2, XCircle, Trash2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { pgErrorMessage } from "@/lib/pg-errors";

export const Route = createFileRoute("/_authenticated/painel/admin/avaliacoes")({
  component: AdminReviewsPage,
  head: () => ({
    meta: [
      { title: "Moderação de avaliações — Painel Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type ReviewRow = {
  id: string;
  company_id: string;
  author_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  moderation_reason: string | null;
  created_at: string;
  company: { name: string; slug: string } | null;
};

type StatusFilter = "pending" | "approved" | "rejected";

function AdminReviewsPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [tab, setTab] = useState<StatusFilter>("pending");

  if (adminLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/painel" />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Moderação de avaliações</h1>
        <p className="text-sm text-muted-foreground">
          Aprove, rejeite ou remova avaliações enviadas pelos usuários.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="approved">Aprovadas</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <ReviewList status="pending" />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <ReviewList status="approved" />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <ReviewList status="rejected" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewList({ status }: { status: StatusFilter }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", status],
    queryFn: async (): Promise<ReviewRow[]> => {
      const { data, error } = await supabase
        .from("company_reviews")
        .select(
          "id, company_id, author_id, author_name, rating, title, comment, status, moderation_reason, created_at, company:companies(name, slug)",
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReviewRow[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["company-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["company-rating"] });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Nenhuma avaliação {status === "pending" ? "pendente" : status === "approved" ? "aprovada" : "rejeitada"}.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((review) => (
        <ReviewCard key={review.id} review={review} onChange={invalidateAll} />
      ))}
    </div>
  );
}

function ReviewCard({ review, onChange }: { review: ReviewRow; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(review.moderation_reason ?? "");
  const [showReason, setShowReason] = useState(false);

  async function updateStatus(newStatus: "approved" | "rejected", modReason?: string) {
    setBusy(true);
    const { error } = await supabase
      .from("company_reviews")
      .update({
        status: newStatus,
        moderation_reason: modReason?.trim() ? modReason.trim() : null,
      })
      .eq("id", review.id);
    setBusy(false);
    if (error) {
      toast.error(pgErrorMessage(error));
      return;
    }
    toast.success(
      newStatus === "approved" ? "Avaliação aprovada e publicada." : "Avaliação rejeitada.",
    );
    onChange();
  }

  async function remove() {
    if (!confirm("Excluir definitivamente esta avaliação? Esta ação não pode ser desfeita.")) return;
    setBusy(true);
    const { error } = await supabase.from("company_reviews").delete().eq("id", review.id);
    setBusy(false);
    if (error) {
      toast.error(pgErrorMessage(error));
      return;
    }
    toast.success("Avaliação removida.");
    onChange();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">
              {review.title || <span className="text-muted-foreground italic">Sem título</span>}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-0.5" aria-label={`Nota ${review.rating} de 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                      i < review.rating
                        ? "h-3.5 w-3.5 fill-amber-500 text-amber-500"
                        : "h-3.5 w-3.5 text-muted-foreground/40"
                    }
                  />
                ))}
              </div>
              <span>·</span>
              <span>{review.author_name}</span>
              <span>·</span>
              {review.company ? (
                <Link
                  to="/empresa/$slug"
                  params={{ slug: review.company.slug }}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {review.company.name}
                </Link>
              ) : (
                <span className="italic">Empresa removida</span>
              )}
              <span>·</span>
              <span>
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>
          <StatusBadge status={review.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {review.comment ? (
          <p className="whitespace-pre-wrap text-sm">{review.comment}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">Sem comentário.</p>
        )}

        {review.moderation_reason && (
          <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <strong className="font-medium">Motivo registrado:</strong> {review.moderation_reason}
          </p>
        )}

        {showReason && (
          <Textarea
            placeholder="Motivo da rejeição (opcional, visível ao autor)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={280}
            rows={2}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {review.status !== "approved" && (
            <Button
              size="sm"
              onClick={() => updateStatus("approved")}
              disabled={busy}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Aprovar
            </Button>
          )}
          {review.status !== "rejected" && (
            <>
              {!showReason ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowReason(true)}
                  disabled={busy}
                >
                  <XCircle className="mr-1.5 h-4 w-4" /> Rejeitar
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatus("rejected", reason)}
                    disabled={busy}
                  >
                    Confirmar rejeição
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowReason(false)}
                    disabled={busy}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={remove}
            disabled={busy}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: ReviewRow["status"] }) {
  if (status === "approved")
    return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">Publicada</Badge>;
  if (status === "rejected")
    return <Badge variant="destructive">Rejeitada</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}
