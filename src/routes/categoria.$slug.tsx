import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Tag, ArrowRight } from "lucide-react";

const categoryQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, description, icon")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

const categoryProductsQueryOptions = (categoryId: string | undefined) =>
  queryOptions({
    queryKey: ["category-products", categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      if (!categoryId) return [];
      const { data } = await supabase
        .from("products")
        .select(`
          id, name, price, price_on_request, short_description,
          promo_price, is_clearance, is_unusual, video_url,
          price_tiers:product_price_tiers(min_qty, max_qty, unit_price),
          company:companies!inner(id, slug, name, status, plan, featured_until),
          images:product_images(url, sort_order)
        `)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("moderation_status", "approved")
        .eq("company.status", "approved")
        .order("created_at", { ascending: false })
        .limit(48);
      return data ?? [];
    },
  });

export const Route = createFileRoute("/categoria/$slug")({
  loader: async ({ params, context }) => {
    const cat = await context.queryClient.ensureQueryData(categoryQueryOptions(params.slug));
    if (!cat) throw notFound();
    await context.queryClient.ensureQueryData(categoryProductsQueryOptions(cat.id));
    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
    };
  },
  head: ({ params, loaderData }) => {
    const url = `https://brinde-gallery.lovable.app/categoria/${params.slug}`;
    const title = loaderData
      ? `${loaderData.name} — Brindes personalizados | BrindesHub`
      : "Categoria — BrindesHub";
    const description = loaderData
      ? (loaderData.description ??
          `Encontre fornecedores e produtos de ${loaderData.name.toLowerCase()} no BrindesHub.`)
      : "Categoria não encontrada.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                name: loaderData.name,
                description,
                url,
                isPartOf: { "@id": "https://brinde-gallery.lovable.app/#website" },
              }),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Início", item: "https://brinde-gallery.lovable.app/" },
                  { "@type": "ListItem", position: 2, name: "Buscar", item: "https://brinde-gallery.lovable.app/buscar" },
                  { "@type": "ListItem", position: 3, name: loaderData.name, item: url },
                ],
              }),
            },
          ]
        : [],
    };
  },
  component: CategoryPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-destructive">Erro ao carregar categoria: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="text-center">
          <Tag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold">Categoria não encontrada</h1>
          <p className="mt-2 text-muted-foreground">O endereço acessado não existe ou foi removido.</p>
          <Button asChild className="mt-6">
            <Link to="/buscar">Ver todos os produtos</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: category } = useSuspenseQuery(categoryQueryOptions(slug));
  const { data: products = [] } = useSuspenseQuery(categoryProductsQueryOptions(category?.id));

  if (!category) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs
              className="mb-4"
              items={[
                { label: "Buscar", href: "/buscar" },
                { label: category.name },
              ]}
            />
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
                {category.description && (
                  <p className="mt-1 max-w-2xl text-muted-foreground">{category.description}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/buscar" search={{ categoria: slug }}>
                  Filtros avançados <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/fornecedores/$slug" params={{ slug }}>
                  Comparar fornecedores
                </Link>
              </Button>
            </div>

          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {products.length === 0 ? (
            <div className="rounded-lg border bg-card p-10 text-center">
              <p className="text-muted-foreground">
                Ainda não há produtos aprovados nesta categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}

            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
