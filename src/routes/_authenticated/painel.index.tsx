import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Package, Eye, Building2, Plus, ArrowRight, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";

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
      const [{ count: totalProducts }, { count: activeProducts }, { data: views }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", company!.id).is("deleted_at", null),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", company!.id).eq("is_active", true).is("deleted_at", null),
        supabase.from("product_views").select("id, product_id, products!inner(company_id)").eq("products.company_id", company!.id).limit(1000),
      ]);
      return {
        totalProducts: totalProducts ?? 0,
        activeProducts: activeProducts ?? 0,
        totalViews: views?.length ?? 0,
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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Produtos ativos" value={stats?.activeProducts ?? 0} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Total de produtos" value={stats?.totalProducts ?? 0} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Visualizações" value={stats?.totalViews ?? 0} icon={<Eye className="h-4 w-4" />} />
      </div>

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
