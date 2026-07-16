import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Package, Eye, Building2, Plus, ArrowRight, CheckCircle2, Clock, XCircle, AlertTriangle, MessageSquare, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/painel/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: company } = useQuery({
    queryKey: ["my-company"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [{ count: totalProducts }, { count: activeProducts }, { data: views }, { data: leads }, { count: newLeads }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", company!.id).is("deleted_at", null),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", company!.id).eq("is_active", true).is("deleted_at", null),
        supabase.from("product_views").select("viewed_at, products!inner(company_id)").eq("products.company_id", company!.id).gte("viewed_at", since).limit(5000),
        supabase.from("leads").select("created_at").eq("company_id", company!.id).gte("created_at", since).limit(2000),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", company!.id).eq("status", "new"),
      ]);
      // Build 30-day series
      const days: Record<string, { date: string; views: number; leads: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
        days[d] = { date: d, views: 0, leads: 0 };
      }
      views?.forEach((v: { viewed_at: string }) => {
        const d = v.viewed_at.slice(0, 10);
        if (days[d]) days[d].views++;
      });
      leads?.forEach((l: { created_at: string }) => {
        const d = l.created_at.slice(0, 10);
        if (days[d]) days[d].leads++;
      });
      return {
        totalProducts: totalProducts ?? 0,
        activeProducts: activeProducts ?? 0,
        totalViews: views?.length ?? 0,
        totalLeads: leads?.length ?? 0,
        newLeads: newLeads ?? 0,
        series: Object.values(days),
      };
    },
  });


  if (!company) return null;

  const statusBadge = {
    pending: { label: "Aguardando aprovação", variant: "secondary" as const, icon: Clock },
    approved: { label: "Aprovada e ativa", variant: "default" as const, icon: CheckCircle2 },
    rejected: { label: "Rejeitada", variant: "destructive" as const, icon: XCircle },
    suspended: { label: "Suspensa", variant: "destructive" as const, icon: XCircle },
  }[company.status];
  const StatusIcon = statusBadge.icon;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Olá, {company.name}!</h1>
        <p className="mt-1 text-muted-foreground">Bem-vindo ao painel da sua empresa.</p>
      </div>

      {/* Status banner */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status da empresa</p>
              <Badge variant={statusBadge.variant} className="mt-1 gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusBadge.label}
              </Badge>
            </div>
          </div>
          {company.status === "pending" && (
            <p className="text-sm text-muted-foreground sm:max-w-md sm:text-right">
              Sua empresa está em análise. Assim que aprovada, seu perfil e produtos ficarão visíveis no portal público.
            </p>
          )}
          {company.status === "approved" && (
            <Button variant="outline" asChild>
              <Link to="/empresa/$slug" params={{ slug: company.slug }}>
                Ver minha página <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Rejection reason banner */}
      {(company.status === "rejected" || company.status === "suspended") && company.rejection_reason && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {company.status === "rejected" ? "Cadastro rejeitado" : "Empresa suspensa"}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p><strong>Motivo:</strong> {company.rejection_reason}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/painel/perfil">Ajustar perfil e reenviar</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Produtos ativos" value={stats?.activeProducts ?? 0} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Visualizações (30d)" value={stats?.totalViews ?? 0} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Leads (30d)" value={stats?.totalLeads ?? 0} icon={<MessageSquare className="h-4 w-4" />} />
        <StatCard label="Leads não lidos" value={stats?.newLeads ?? 0} icon={<TrendingUp className="h-4 w-4" />} highlight={!!stats?.newLeads} />
      </div>

      {/* Chart */}
      {company.status === "approved" && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Desempenho dos últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                views: { label: "Visualizações", color: "hsl(var(--primary))" },
                leads: { label: "Leads", color: "hsl(var(--accent-foreground))" },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer>
                <AreaChart data={stats.series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5)}
                    className="text-xs"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis allowDecimals={false} className="text-xs" stroke="hsl(var(--muted-foreground))" width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#gv)" strokeWidth={2} />
                  <Area type="monotone" dataKey="leads" stroke="hsl(var(--accent-foreground))" fill="url(#gl)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}


      {/* Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" />
              Cadastrar novo produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Adicione produtos ao seu catálogo com fotos, preços e detalhes.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/painel/produtos/novo">Novo produto</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Complete seu perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Uma página de empresa completa converte muito mais. Adicione logo, banner, contatos e descrição.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/painel/perfil">Editar perfil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
