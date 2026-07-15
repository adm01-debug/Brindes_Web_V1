import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { getSignedUrl, formatBRL } from "@/lib/portal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Package,
  ExternalLink,
  ShieldAlert,
  EyeOff,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/admin/produtos")({
  component: AdminProdutosPage,
});

type ModStatus = "pending" | "approved" | "rejected";

const STATUS_META: Record<
  ModStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; icon: React.ElementType }
> = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  approved: { label: "Aprovado", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", variant: "destructive", icon: XCircle },
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  price_on_request: boolean;
  is_active: boolean;
  moderation_status: ModStatus;
  moderation_reason: string | null;
  created_at: string;
  company: { name: string; slug: string; status: string } | null;
  cover: { url: string } | null;
};

function AdminProdutosPage() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ModStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products", statusFilter],
    enabled: !!isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select(
          "id, name, slug, price, price_on_request, is_active, moderation_status, moderation_reason, created_at, company:companies!inner(name, slug, status), cover:product_images(url)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("moderation_status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        cover: Array.isArray(p.cover) ? p.cover[0] ?? null : p.cover,
      })) as ProductRow[];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
      is_active,
    }: {
      id: string;
      status?: ModStatus;
      reason?: string | null;
      is_active?: boolean;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const updates: Record<string, unknown> = {};
      if (status) {
        updates.moderation_status = status;
        updates.moderation_reason = reason ?? null;
        updates.moderated_at = new Date().toISOString();
        updates.moderated_by = userRes.user?.id ?? null;
      }
      if (typeof is_active === "boolean") updates.is_active = is_active;
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar."),
  });

  if (checkingAdmin) {
    return <div className="mx-auto max-w-6xl h-64 animate-pulse rounded-lg bg-muted" />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold">Acesso restrito</h1>
            <p className="text-sm text-muted-foreground">
              Esta área é exclusiva para administradores do portal.
            </p>
            <Button variant="outline" asChild>
              <Link to="/painel">Voltar ao painel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = (products ?? []).filter(
    (p) =>
      !term ||
      p.name.toLowerCase().includes(term) ||
      (p.company?.name ?? "").toLowerCase().includes(term),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Moderação de produtos</h1>
        <p className="mt-1 text-muted-foreground">
          Aprove ou rejeite produtos e controle a visibilidade pública.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produto ou empresa"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ModStatus | "all")}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Package className="h-8 w-8" />
            <p>Nenhum produto encontrado com esses filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProductRowCard
              key={p.id}
              product={p}
              busy={mutation.isPending}
              onApprove={() => mutation.mutate({ id: p.id, status: "approved", reason: null })}
              onReject={() => {
                setRejectTarget({ id: p.id, name: p.name });
                setReason(p.moderation_reason ?? "");
              }}
              onToggleActive={() =>
                mutation.mutate({ id: p.id, is_active: !p.is_active })
              }
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar “{rejectTarget?.name}”</DialogTitle>
            <DialogDescription>
              O produto ficará invisível no portal público. Informe o motivo — a empresa poderá vê-lo no painel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da rejeição</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: fotos de baixa qualidade, descrição incompleta, produto fora do escopo do portal."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || mutation.isPending}
              onClick={() => {
                if (!rejectTarget) return;
                mutation.mutate({
                  id: rejectTarget.id,
                  status: "rejected",
                  reason: reason.trim(),
                });
                setRejectTarget(null);
                setReason("");
              }}
            >
              Rejeitar produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductRowCard({
  product,
  busy,
  onApprove,
  onReject,
  onToggleActive,
}: {
  product: ProductRow;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onToggleActive: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (product.cover?.url) {
      getSignedUrl("product-images", product.cover.url).then(setThumb);
    }
  }, [product.cover?.url]);

  const meta = STATUS_META[product.moderation_status];
  const Icon = meta.icon;
  const price = product.price_on_request
    ? "Sob consulta"
    : formatBRL(product.price) ?? "—";
  const companyPending = product.company?.status !== "approved";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {thumb ? (
            <img src={thumb} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{product.name}</h3>
            <Badge variant={meta.variant} className="gap-1">
              <Icon className="h-3 w-3" />
              {meta.label}
            </Badge>
            {!product.is_active && (
              <Badge variant="outline" className="gap-1">
                <EyeOff className="h-3 w-3" /> Inativo
              </Badge>
            )}
            {companyPending && (
              <Badge variant="outline" className="gap-1">
                Empresa: {product.company?.status}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.company?.name} · {price} · Cadastro:{" "}
            {new Date(product.created_at).toLocaleDateString("pt-BR")}
          </p>
          {product.moderation_status === "rejected" && product.moderation_reason && (
            <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              Motivo: {product.moderation_reason}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/produto/$id" params={{ id: product.id }} target="_blank">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Ver
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleActive} disabled={busy}>
            {product.is_active ? (
              <>
                <EyeOff className="mr-1 h-3.5 w-3.5" /> Desativar
              </>
            ) : (
              <>
                <Eye className="mr-1 h-3.5 w-3.5" /> Ativar
              </>
            )}
          </Button>
          {product.moderation_status !== "approved" && (
            <Button size="sm" onClick={onApprove} disabled={busy}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Aprovar
            </Button>
          )}
          {product.moderation_status !== "rejected" && (
            <Button variant="destructive" size="sm" onClick={onReject} disabled={busy}>
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Rejeitar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
