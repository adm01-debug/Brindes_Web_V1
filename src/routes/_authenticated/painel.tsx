import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package2, User, LogOut, Package, ArrowLeft, ShieldCheck, Tag, Gauge, Inbox, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/painel")({
  component: PainelLayout,
});


type NavItem = { to: string; label: string; icon: React.ElementType; exact?: boolean };
const BASE_NAV: NavItem[] = [
  { to: "/painel", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/painel/produtos", label: "Produtos", icon: Package },
  { to: "/painel/leads", label: "Pedidos de orçamento", icon: Inbox },
  { to: "/painel/perfil", label: "Perfil da empresa", icon: User },
];
const ADMIN_NAV: NavItem[] = [
  { to: "/painel/admin", label: "Admin: dashboard", icon: Gauge, exact: true },
  { to: "/painel/admin/empresas", label: "Admin: empresas", icon: ShieldCheck },
  { to: "/painel/admin/produtos", label: "Admin: produtos", icon: Package },
  { to: "/painel/admin/categorias", label: "Admin: categorias", icon: Tag },
  { to: "/painel/admin/observabilidade", label: "Admin: observabilidade", icon: Activity },
];

function PainelLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();
  const NAV = isAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;
  const queryClient = useQueryClient();

  const { data: unreadLeads = 0 } = useQuery({
    queryKey: ["leads-unread-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });


  useEffect(() => {
    const channel = supabase
      .channel("leads-nav")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["leads-unread-count"] });
          const lead = payload.new as { name?: string } | null;
          toast.success("Novo pedido de orçamento", {
            description: lead?.name ? `De ${lead.name}` : "Confira em Pedidos de orçamento.",
            action: {
              label: "Abrir",
              onClick: () => navigate({ to: "/painel/leads" }),
            },
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        () => queryClient.invalidateQueries({ queryKey: ["leads-unread-count"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, navigate]);


  const badgeFor = (to: string) =>
    to === "/painel/leads" && unreadLeads > 0 ? unreadLeads : null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };


  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <Link to="/" className="flex items-center gap-2 border-b p-4 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package2 className="h-5 w-5" />
          </div>
          <span>BrindesHub</span>
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            const badge = badgeFor(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {badge !== null && (
                  <span className={cn(
                    "ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground",
                  )}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}

        </nav>
        <div className="border-t p-3 space-y-1">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver portal
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b bg-card p-4 md:hidden">
          <Link to="/painel" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Package2 className="h-4 w-4" />
            </div>
            Painel
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-card md:hidden">
          {NAV.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            const badge = badgeFor(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label.split(" ")[0]}
                {badge !== null && (
                  <span className="absolute right-3 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}

        </nav>

        <div className="p-4 pb-20 sm:p-6 md:pb-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
