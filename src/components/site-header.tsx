import { Link, useNavigate } from "@tanstack/react-router";
import { Package2, Search, LayoutDashboard, LogOut, User as UserIcon, Heart, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuoteCart } from "@/hooks/use-quote-cart";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuoteCartDrawer } from "@/components/quote-cart-drawer";
import { NotificationsBell } from "@/components/notifications-bell";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const { count, hydrated } = useQuoteCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [headerTerm, setHeaderTerm] = useState("");
  const navigate = useNavigate();

  /** Envia o termo digitado no cabeçalho para a página de busca. */
  const goToSearch = (raw: string) => {
    const q = raw.trim().slice(0, 80);
    if (!q) return;
    setHeaderTerm("");
    navigate({ to: "/buscar", search: { q, page: 1 } as never });
  };

  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener("brindeshub:open-quote-cart", open);
    return () => window.removeEventListener("brindeshub:open-quote-cart", open);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package2 className="h-5 w-5" />
          </div>
          <span className="hidden text-lg tracking-tight sm:inline">BrindesHub</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/empresas" className="text-muted-foreground transition-colors hover:text-foreground">
            Empresas
          </Link>
          <Link to="/buscar" className="text-muted-foreground transition-colors hover:text-foreground">
            Produtos
          </Link>
          <Link to="/kits" className="text-muted-foreground transition-colors hover:text-foreground">
            Kits
          </Link>
          <Link to="/ideias" className="text-muted-foreground transition-colors hover:text-foreground">
            Ideias
          </Link>
          <Link to="/datas-comemorativas" className="text-muted-foreground transition-colors hover:text-foreground">
            Datas
          </Link>

          <Link to="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            Blog
          </Link>
          <Link to="/planos" className="text-muted-foreground transition-colors hover:text-foreground">
            Planos
          </Link>
          <Link to="/vender" className="font-medium text-primary transition-colors hover:text-primary/80">
            Vender
          </Link>

        </nav>

        <form
          className="hidden flex-1 px-6 xl:block xl:max-w-sm"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            goToSearch(headerTerm);
          }}
        >
          <SearchAutocomplete
            value={headerTerm}
            onValueChange={setHeaderTerm}
            onSubmitTerm={goToSearch}
            placeholder="Buscar brindes, empresas..."
            inputClassName="h-9"
          />
        </form>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild className="xl:hidden">
            <Link to="/buscar" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/favoritos" aria-label="Favoritos">
              <Heart className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setCartOpen(true)}
            aria-label={`Orçamento (${count} ${count === 1 ? "item" : "itens"})`}
          >
            <ShoppingCart className="h-4 w-4" />
            {hydrated && count > 0 && (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>

          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <>
              <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Minha conta</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/painel" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Painel da empresa
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Anunciar
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
      <QuoteCartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
