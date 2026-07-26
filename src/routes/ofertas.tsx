import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ShowcaseGrid, type ShowcaseProduct } from "@/components/showcase-grid";
import { Tag } from "lucide-react";

const SITE_URL = "https://brinde-gallery.lovable.app";
const TITLE = "Ofertas e ponta de estoque | Brindes com desconto";
const DESCRIPTION =
  "Brindes corporativos com preço promocional e ponta de estoque de fornecedores verificados. Aproveite condições especiais e peça seu orçamento.";

const SELECT = `
  id, name, price, price_on_request, short_description,
  promo_price, is_clearance, is_unusual, video_url,
  price_tiers:product_price_tiers(min_qty, max_qty, unit_price),
  company:companies!inner(id, slug, name, plan, featured_until, status),
  images:product_images(url, sort_order)
`;

const offersQueryOptions = queryOptions({
  queryKey: ["showcase", "ofertas"],
  queryFn: async (): Promise<ShowcaseProduct[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(SELECT)
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("moderation_status", "approved")
      .eq("company.status", "approved")
      .or("is_clearance.eq.true,promo_price.not.is.null")
      .order("created_at", { ascending: false })
      .limit(96);

    if (error) throw error;
    return (data ?? []) as unknown as ShowcaseProduct[];
  },
});

export const Route = createFileRoute("/ofertas")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(offersQueryOptions);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/ofertas` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/ofertas` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Ofertas", item: `${SITE_URL}/ofertas` },
          ],
        }),
      },
    ],
  }),
  component: OfertasPage,
  errorComponent: () => (
    <main className="container py-16 text-center text-muted-foreground">
      Não foi possível carregar as ofertas agora. Tente novamente em instantes.
    </main>
  ),
});

function OfertasPage() {
  const { data: products } = useSuspenseQuery(offersQueryOptions);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 py-8">
        <Breadcrumbs items={[{ label: "Ofertas" }]} />
        <header className="mt-4 mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <Tag className="h-6 w-6 text-primary" aria-hidden="true" />
            Ofertas e ponta de estoque
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {DESCRIPTION}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {products.length} {products.length === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>
        </header>
        <ShowcaseGrid
          products={products}
          emptyMessage="Nenhuma oferta ativa no momento. Volte em breve — novos lotes são publicados toda semana."
        />
      </main>
      <SiteFooter />
    </div>
  );
}
