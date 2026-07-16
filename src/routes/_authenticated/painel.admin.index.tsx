import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Package,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldOff,
  Activity,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/painel/admin/")({
  component: AdminDashboard,
});

type KPI = {
  companiesPending: number;
  companiesApproved: number;
  companiesRejected: number;
  companiesSuspended: number;
  productsPending: number;
  productsApproved: number;
  productsRejected: number;
  categoriesActive: number;
  companiesLast7d: number;
  productsLast7d: number;
};

type AuditRow = {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  reason: string | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
};

function AdminDashboard() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ["admin-kpi"],
    enabled: !!isAdmin,
    queryFn: async (): Promise<KPI> => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const countBy = async (
        table: "companies" | "products" | "categories",
        filter: (q: ReturnType<typeof supabase.from>) => any,
      ) => {
        const q = supabase.from(table).select("id", { count: "exact", head: true });
        const { count } = await filter(q);
        return count ?? 0;
      };

      const [
        companiesPending,
        companiesApproved,
        companiesRejected,
        companiesSuspended,
        productsPending,
        productsApproved,
        productsRejected,
        categoriesActive,
        companiesLast7d,
        productsLast7d,
      ] = await Promise.all([
        countBy("companies", (q) => q.eq("status", "pending")),
        countBy("companies", (q) => q.eq("status", "approved")),
        countBy("companies", (q) => q.eq("status", "rejected")),
        countBy("companies", (q) => q.eq("status", "suspended")),
        countBy("products", (q) => q.eq("moderation_status", "pending").is("deleted_at", null)),
        countBy("products", (q) => q.eq("moderation_status", "approved").is("deleted_at", null)),
        countBy("products", (q) => q.eq("moderation_status", "rejected").is("deleted_at", null)),
        countBy("categories", (q) => q.eq("is_active", true)),
        countBy("companies", (q) => q.gte("created_at", since)),
        countBy("products", (q) => q.gte("created_at", since).is("deleted_at", null)),
      ]);

      return {
        companiesPending,
        companiesApproved,
        companiesRejected,
        companiesSuspended,
        productsPending,
        productsApproved,
        productsRejected,
        categoriesActive,
        companiesLast7d,
        productsLast7d,
      };
    },
  });

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit"],
    enabled: !!isAdmin,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, actor_id, entity_type, entity_id, action, reason, new_value, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  if (adminLoading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/painel" />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Painel administrativo</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada da moderação, catálogo e atividade recente.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          title="Empresas pendentes"
          value={kpi?.companiesPending}
          icon={Clock}
          tone="warning"
          to="/painel/admin/empresas"
          loading={kpiLoading}
        />
        <KpiCard
          title="Produtos pendentes"
          value={kpi?.productsPending}
          icon={Clock}
          tone="warning"
          to="/painel/admin/produtos"
          loading={kpiLoading}
        />
        <KpiCard
          title="Empresas aprovadas"
          value={kpi?.companiesApproved}
          icon={CheckCircle2}
          tone="success"
          to="/painel/admin/empresas"
          loading={kpiLoading}
        />
        <KpiCard
          title="Produtos aprovados"
          value={kpi?.productsApproved}
          icon={CheckCircle2}
          tone="success"
          to="/painel/admin/produtos"
          loading={kpiLoading}
        />
        <KpiCard
          title="Empresas rejeitadas"
          value={kpi?.companiesRejected}
          icon={XCircle}
          tone="destructive"
          to="/painel/admin/empresas"
          loading={kpiLoading}
        />
        <KpiCard
          title="Produtos rejeitados"
          value={kpi?.productsRejected}
          icon={XCircle}
          tone="destructive"
          to="/painel/admin/produtos"
          loading={kpiLoading}
        />
        <KpiCard
          title="Suspensas"
          value={kpi?.companiesSuspended}
          icon={ShieldOff}
          tone="muted"
          to="/painel/admin/empresas"
          loading={kpiLoading}
        />
        <KpiCard
          title="Categorias ativas"
          value={kpi?.categoriesActive}
          icon={Tag}
          tone="muted"
          to="/painel/admin/categorias"
          loading={kpiLoading}
        />
      </section>

      {/* Últimos 7 dias */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Metric icon={Building2} label="Novas empresas" value={kpi?.companiesLast7d} loading={kpiLoading} />
            <Metric icon={Package} label="Novos produtos" value={kpi?.productsLast7d} loading={kpiLoading} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" asChild>
              <Link to="/painel/admin/empresas">Empresas</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/painel/admin/produtos">Produtos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/painel/admin/categorias">Categorias</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Trilha de auditoria */}
      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Atividade recente
            </CardTitle>
            <Badge variant="secondary">Últimos 30 eventos</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {auditLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!auditLoading && (!audit || audit.length === 0) && (
              <p className="text-sm text-muted-foreground">Sem atividade registrada ainda.</p>
            )}
            {audit?.map((row) => (
              <AuditItem key={row.id} row={row} />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  tone,
  to,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  tone: "warning" | "success" | "destructive" | "muted";
  to: string;
  loading: boolean;
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-600"
      : tone === "success"
        ? "text-emerald-600"
        : tone === "destructive"
          ? "text-destructive"
          : "text-muted-foreground";
  return (
    <Link to={to} className="group">
      <Card className="transition-colors group-hover:border-primary/40">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {loading ? "—" : (value ?? 0)}
            </p>
          </div>
          <Icon className={`h-8 w-8 ${toneClass}`} />
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{loading ? "—" : (value ?? 0)}</p>
      </div>
    </div>
  );
}

function AuditItem({ row }: { row: AuditRow }) {
  const isCompany = row.entity_type === "company";
  const name = (row.new_value?.name as string | undefined) ?? row.entity_id.slice(0, 8);
  const slug = row.new_value?.slug as string | undefined;
  const status =
    (row.new_value?.status as string | undefined) ??
    (row.new_value?.moderation_status as string | undefined) ??
    row.action.split(":")[1];

  const toneMap: Record<string, string> = {
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    suspended: "bg-muted text-muted-foreground border-border",
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    archived: "bg-muted text-muted-foreground border-border",
  };
  const badgeClass = toneMap[status ?? ""] ?? "bg-muted text-muted-foreground";

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          {isCompany ? <Building2 className="h-4 w-4" /> : <Package className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={badgeClass}>
              {isCompany ? "Empresa" : "Produto"} · {status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          {row.reason && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">Motivo: {row.reason}</p>
          )}
        </div>
      </div>
      {slug && (
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link
            to={isCompany ? "/empresa/$slug" : "/produto/$id"}
            params={isCompany ? { slug } : { id: row.entity_id }}
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
