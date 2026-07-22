import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { pgErrorMessage } from "@/lib/pg-errors";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldOff,
  Search,
  Building2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/admin/empresas")({
  component: AdminEmpresasPage,
});

type Status = "pending" | "approved" | "rejected" | "suspended";

const STATUS_META: Record<
  Status,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  approved: { label: "Aprovada", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejeitada", variant: "destructive", icon: XCircle },
  suspended: { label: "Suspensa", variant: "destructive", icon: ShieldOff },
};

function AdminEmpresasPage() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<
    | { id: string; name: string; action: Status; message: string }
    | null
  >(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies", statusFilter],
    enabled: !!isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("companies")
        .select("id, name, slug, email, phone, status, created_at, logo_url, city, state")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase
        .from("companies")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(`Empresa ${STATUS_META[vars.status].label.toLowerCase()} com sucesso.`);
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar a empresa."),
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
  const filtered = (companies ?? []).filter(
    (c) =>
      !term ||
      c.name.toLowerCase().includes(term) ||
      c.slug.toLowerCase().includes(term) ||
      (c.email ?? "").toLowerCase().includes(term),
  );

  const openConfirm = (id: string, name: string, action: Status) => {
    const messages: Record<Status, string> = {
      approved: "A empresa e seus produtos ativos ficarão visíveis no portal público.",
      rejected: "A empresa não será exibida no portal e o dono verá o status como rejeitada.",
      suspended: "A empresa será removida do portal público, mas o cadastro é mantido.",
      pending: "A empresa voltará para a fila de aprovação.",
    };
    setConfirm({ id, name, action, message: messages[action] });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Moderação de empresas</h1>
        <p className="mt-1 text-muted-foreground">
          Aprove, rejeite ou suspenda empresas cadastradas no portal.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, slug ou e-mail"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="rejected">Rejeitadas</SelectItem>
            <SelectItem value="suspended">Suspensas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Building2 className="h-8 w-8" />
            <p>Nenhuma empresa encontrada com esses filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const status = c.status as Status;
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            const location = [c.city, c.state].filter(Boolean).join(" / ");
            return (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{c.name}</h3>
                      <Badge variant={meta.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>/{c.slug}</span>
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                      {location && <span>{location}</span>}
                      <span>Cadastro: {new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {status === "approved" && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/empresa/$slug" params={{ slug: c.slug }} target="_blank">
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Ver
                        </Link>
                      </Button>
                    )}
                    {status !== "approved" && (
                      <Button
                        size="sm"
                        onClick={() => openConfirm(c.id, c.name, "approved")}
                        disabled={mutation.isPending}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Aprovar
                      </Button>
                    )}
                    {status !== "rejected" && status === "pending" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openConfirm(c.id, c.name, "rejected")}
                        disabled={mutation.isPending}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Rejeitar
                      </Button>
                    )}
                    {status === "approved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfirm(c.id, c.name, "suspended")}
                        disabled={mutation.isPending}
                      >
                        <ShieldOff className="mr-1 h-3.5 w-3.5" />
                        Suspender
                      </Button>
                    )}
                    {(status === "rejected" || status === "suspended") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfirm(c.id, c.name, "pending")}
                        disabled={mutation.isPending}
                      >
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        Reabrir análise
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm && `${STATUS_META[confirm.action].label} “${confirm.name}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirm?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                mutation.mutate({ id: confirm.id, status: confirm.action });
                setConfirm(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
