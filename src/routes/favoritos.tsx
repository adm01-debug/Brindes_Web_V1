import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/use-favorites";
import { ProductCard } from "@/components/product-card";
import { ProductCardSkeleton } from "@/components/product-card-skeleton";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Meus favoritos — BrindesHub" },
      { name: "description", content: "Produtos que você salvou para consultar depois no BrindesHub." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Meus favoritos — BrindesHub" },
      { property: "og:description", content: "Seus produtos favoritos do BrindesHub." },
      { property: "og:url", content: "https://brinde-gallery.lovable.app/favoritos" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://brinde-gallery.lovable.app/favoritos" }],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { ids, hydrated } = useFavorites();
  const { data: userData } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: 60_000,
  });
  const user = userData ?? null;

  const { data: products, isLoading } = useQuery({
    queryKey: ["favorites", ids],
    enabled: hydrated && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, price, price_on_request, short_description, company:companies!inner(id, slug, name, status), images:product_images(url, sort_order)",
        )
        .in("id", ids)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []).filter((p: any) => p.company?.status === "approved");
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-10">
        <header className="mb-8">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Heart className="h-7 w-7 text-red-500" aria-hidden />
            Meus favoritos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Faça login para sincronizar seus favoritos entre dispositivos. Sem login, ficam salvos apenas neste navegador.
          </p>
        </header>

        {!hydrated || isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <ProductCardSkeleton count={8} />
          </div>
        ) : ids.length === 0 ? (
          <EmptyState />
        ) : !products || products.length === 0 ? (
          <EmptyState message="Os produtos favoritados não estão mais disponíveis." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-12 text-center">
      <Heart className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
      <p className="mt-4 text-muted-foreground">
        {message ?? "Você ainda não favoritou nenhum produto."}
      </p>
      <Button asChild className="mt-6">
        <Link to="/buscar">Explorar produtos</Link>
      </Button>
    </div>
  );
}
