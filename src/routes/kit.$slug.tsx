import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingCart, ArrowLeft, Package } from "lucide-react";
import { useQuoteCart } from "@/hooks/use-quote-cart";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/breadcrumbs";

const SITE_URL = "https://brinde-gallery.lovable.app";

export const Route = createFileRoute("/kit/$slug")({
  head: ({ params }) => {
    const url = `${SITE_URL}/kit/${params.slug}`;
    return {
      meta: [
        { title: `Kit ${params.slug} — BrindesHub` },
        {
          name: "description",
          content: `Kit temático de brindes corporativos "${params.slug}" — combinação curatorial pronta para orçamento.`,
        },
        { property: "og:title", content: `Kit ${params.slug} — BrindesHub` },
        {
          property: "og:description",
          content: "Combinação curatorial de brindes pronta para orçamento múltiplo.",
        },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: KitDetailPage,
});

type KitItem = {
  id: string;
  suggested_quantity: number | null;
  sort_order: number;
  product: {
    id: string;
    name: string;
    slug: string | null;
    short_description: string | null;
    price: number | null;
    price_on_request: boolean;
    promo_price: number | null;
    is_clearance: boolean | null;
    is_unusual: boolean | null;
    video_url: string | null;
    is_active: boolean;
    deleted_at: string | null;
    moderation_status: string;
    company: {
      id: string;
      slug: string;
      name: string;
      status: string;
      plan: string | null;
      featured_until: string | null;
    } | null;
    images: { url: string; sort_order: number }[] | null;
  } | null;
};

function KitDetailPage() {
  const { slug } = Route.useParams();
  const { add, has } = useQuoteCart();

  const { data, isLoading, error } = useQuery({
    queryKey: ["kit-detail", slug],
    queryFn: async () => {
      const { data: kit, error: kErr } = await supabase
        .from("kits")
        .select("id, slug, name, tagline, description, cover_url, is_active")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (kErr) throw kErr;
      if (!kit) throw notFound();

      const { data: items, error: iErr } = await supabase
        .from("kit_items")
        .select(
          `id, suggested_quantity, sort_order,
           product:products (
             id, name, slug, short_description, price, price_on_request,
             promo_price, is_clearance, is_unusual, video_url,
             price_tiers:product_price_tiers(min_qty, max_qty, unit_price),
             is_active, deleted_at, moderation_status,
             company:companies ( id, slug, name, status, plan, featured_until ),
             images:product_images ( url, sort_order )
           )`,
        )
        .eq("kit_id", kit.id)
        .order("sort_order", { ascending: true });
      if (iErr) throw iErr;

      const visible = ((items ?? []) as unknown as KitItem[]).filter(
        (i) =>
          i.product &&
          i.product.is_active &&
          !i.product.deleted_at &&
          i.product.moderation_status === "approved" &&
          i.product.company &&
          i.product.company.status === "approved",
      );

      return { kit, items: visible };
    },
  });

  const addAllToCart = () => {
    if (!data) return;
    let added = 0;
    let skipped = 0;
    for (const i of data.items) {
      const p = i.product!;
      if (has(p.id)) {
        skipped++;
        continue;
      }
      const before = has(p.id);
      add({
        product_id: p.id,
        product_name: p.name,
        company_id: p.company!.id,
        company_name: p.company!.name,
        image_url: p.images?.[0]?.url ?? null,
        quantity: i.suggested_quantity,
        notes: null,
      });
      if (!before) added++;
    }
    if (added === 0 && skipped > 0) {
      toast.info("Todos os itens do kit já estavam no seu orçamento.");
    } else {
      toast.success(`${added} item(ns) adicionado(s) ao orçamento.`, {
        description: skipped > 0 ? `${skipped} já estavam no carrinho.` : undefined,
        action: {
          label: "Ver orçamento",
          onClick: () => window.dispatchEvent(new CustomEvent("brindeshub:open-quote-cart")),
        },
      });
    }
  };

  if (error && !isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h1 className="text-2xl font-semibold">Kit não encontrado</h1>
            <p className="mt-2 text-muted-foreground">Este kit pode ter sido removido ou está inativo.</p>
            <Button asChild className="mt-6">
              <Link to="/kits">
                <ArrowLeft className="mr-2 h-4 w-4" /> Ver todos os kits
              </Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const kit = data?.kit;
  const items = data?.items ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: "Kits", href: "/kits" },
              { label: kit?.name ?? slug },
            ]}
          />

          <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Kit curatorial
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {isLoading ? "Carregando..." : kit?.name}
              </h1>
              {kit?.tagline && <p className="mt-2 text-lg text-muted-foreground">{kit.tagline}</p>}
              {kit?.description && (
                <p className="mt-4 whitespace-pre-line text-muted-foreground">{kit.description}</p>
              )}
            </div>

            <aside className="rounded-lg border bg-card p-5">
              <h2 className="text-sm font-semibold">Ação rápida</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione todos os {items.length} itens deste kit ao seu carrinho de orçamento.
              </p>
              <Button
                className="mt-4 w-full"
                onClick={addAllToCart}
                disabled={isLoading || items.length === 0}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Adicionar kit ao orçamento
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Você poderá revisar quantidades e observações antes de enviar.
              </p>
            </aside>
          </div>

          <h2 className="mt-10 text-xl font-semibold">Produtos do kit</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />
              ))}
            {!isLoading &&
              items.map((i) => (
                <ProductCard
                  key={i.id}
                  product={{
                    id: i.product!.id,
                    name: i.product!.name,
                    price: i.product!.price,
                    price_on_request: i.product!.price_on_request,
                    short_description: i.product!.short_description,
                    promo_price: i.product!.promo_price,
                    is_clearance: i.product!.is_clearance,
                    is_unusual: i.product!.is_unusual,
                    video_url: i.product!.video_url,
                    price_tiers: i.product!.price_tiers,

                    company: i.product!.company
                      ? {
                          id: i.product!.company.id,
                          slug: i.product!.company.slug,
                          name: i.product!.company.name,
                          plan: i.product!.company.plan as never,
                          featured_until: i.product!.company.featured_until,
                        }
                      : null,
                    images: i.product!.images ?? [],
                  }}
                />
              ))}
            {!isLoading && items.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed py-16 text-center">
                <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Este kit ainda não tem produtos disponíveis.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
