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
  MessageSquare,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

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
  leadsTotal: number;
  leadsNew: number;
  leadsLast7d: number;
  series: { date: string; leads: number; products: number }[];
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
        table: "companies" | "products" | "categories" | "leads",
        filter: (q: any) => any,
      ) => {
        const q = supabase.from(table).select("id", { count: "exact", head: true });
        const { count } = await filter(q);
        return count ?? 0;
      };

      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

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
        leadsTotal,
        leadsNew,
        leadsLast7d,
        leadsSeriesRes,
        productsSeriesRes,
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
        countBy("leads", (q) => q),
        countBy("leads", (q) => q.eq("status", "new")),
        countBy("leads", (q) => q.gte("created_at", since)),
        supabase.from("leads").select("created_at").gte("created_at", since30).limit(5000),
        supabase.from("products").select("created_at").gte("created_at", since30).is("deleted_at", null).limit(5000),
      ]);

      const days: Record<string, { date: string; leads: number; products: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
        days[d] = { date: d, leads: 0, products: 0 };
      }
      (leadsSeriesRes.data ?? []).forEach((r: { created_at: string }) => {
        const d = r.created_at.slice(0, 10);
        if (days[d]) days[d].leads++;
      });
      (productsSeriesRes.data ?? []).forEach((r: { created_at: string }) => {
        const d = r.created_at.slice(0, 10);
        if (days[d]) days[d].products++;
      });

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
        leadsTotal,
        leadsNew,
        leadsLast7d,
        series: Object.values(days),
      };
    },
  });

  const { data: tops, isLoading: topsLoading } = useQuery({
    queryKey: ["admin-tops"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("leads")
        .select("company_id, product_id, company:companies(name, slug), product:products(name, slug, id)")
        .gte("created_at", since)
        .limit(5000);
      if (error) throw error;
      const companies = new Map<string, { name: string; slug: string; count: number }>();
      const products = new Map<string, { name: string; slug: string; id: string; count: number }>();
      (data ?? []).forEach((r: any) => {
        if (r.company_id && r.company) {
          const c = companies.get(r.company_id) ?? { name: r.company.name, slug: r.company.slug, count: 0 };
          c.count++;
          companies.set(r.company_id, c);
        }
        if (r.product_id && r.product) {
          const p = products.get(r.product_id) ?? { name: r.product.name, slug: r.product.slug, id: r.product.id, count: 0 };
          p.count++;
          products.set(r.product_id, p);
        }
      });
      return {
        topCompanies: [...companies.values()].sort((a, b) => b.count - a.count).slice(0, 10),
        topProducts: [...products.values()].sort((a, b) => b.count - a.count).slice(0, 10),
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
        <KpiCard
          title="Leads totais"
          value={kpi?.leadsTotal}
          icon={MessageSquare}
          tone="muted"
          to="/painel/admin"
          loading={kpiLoading}
        />
        <KpiCard
          title="Leads novos"
          value={kpi?.leadsNew}
          icon={Inbox}
          tone="warning"
          to="/painel/admin"
          loading={kpiLoading}
        />
      </section>

      {/* Gráfico global 30 dias */}
      {kpi && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Marketplace — últimos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                leads: { label: "Leads", color: "hsl(var(--primary))" },
                products: { label: "Produtos novos", color: "hsl(var(--accent-foreground))" },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer>
                <AreaChart data={kpi.series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="admLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="admProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} className="text-xs" stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} className="text-xs" stroke="hsl(var(--muted-foreground))" width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fill="url(#admLeads)" strokeWidth={2} />
                  <Area type="monotone" dataKey="products" stroke="hsl(var(--accent-foreground))" fill="url(#admProd)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Últimos 7 dias */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <Metric icon={Building2} label="Empresas" value={kpi?.companiesLast7d} loading={kpiLoading} />
            <Metric icon={Package} label="Produtos" value={kpi?.productsLast7d} loading={kpiLoading} />
            <Metric icon={MessageSquare} label="Leads" value={kpi?.leadsLast7d} loading={kpiLoading} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="outline" asChild>
              <Link to="/painel/admin/empresas">Empresas</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/painel/admin/produtos">Produtos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/painel/admin/categorias">Categorias</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/painel/admin/observabilidade">
                <Activity className="mr-2 h-4 w-4" /> Observabilidade
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Rankings top 10 */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Top empresas por leads (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {topsLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!topsLoading && (!tops || tops.topCompanies.length === 0) && (
              <p className="text-sm text-muted-foreground">Nenhum lead nos últimos 30 dias.</p>
            )}
            {tops?.topCompanies.map((c, i) => (
              <Link
                key={c.slug}
                to="/empresa/$slug"
                params={{ slug: c.slug }}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                  <span className="truncate">{c.name}</span>
                </span>
                <Badge variant="secondary" className="tabular-nums">{c.count}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Top produtos por leads (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {topsLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!topsLoading && (!tops || tops.topProducts.length === 0) && (
              <p className="text-sm text-muted-foreground">Nenhum lead nos últimos 30 dias.</p>
            )}
            {tops?.topProducts.map((p, i) => (
              <Link
                key={p.id}
                to="/produto/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                  <span className="truncate">{p.name}</span>
                </span>
                <Badge variant="secondary" className="tabular-nums">{p.count}</Badge>
              </Link>
            ))}
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
