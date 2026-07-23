import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { findIntent, INTENTS, type Intent } from "@/lib/intents";
import { ArrowRight } from "lucide-react";

const SITE_URL = "https://brinde-gallery.lovable.app";

type RpcRow = {
  id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  price: number | null;
  price_on_request: boolean;
  currency: string;
  views_count: number;
  created_at: string;
  company_id: string;
  company_slug: string;
  company_name: string;
  category_slug: string | null;
  category_name: string | null;
  primary_image_url: string | null;
  total_count: number;
};

const intentProductsQO = (intent: Intent) =>
  queryOptions({
    queryKey: ["intent-products", intent.slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_products", {
        _q: intent.query || undefined,
        _category_slug: intent.categoria || undefined,
        _price_max: intent.max && intent.max > 0 ? intent.max : undefined,
        _sort: "relevance",
        _page: 1,
        _page_size: 12,
        _material: intent.material || undefined,
        _color: intent.cor || undefined,
        _max_moq: intent.moq && intent.moq > 0 ? intent.moq : undefined,
      });
      if (error) throw error;
      return (data ?? []) as RpcRow[];
    },
  });

export const Route = createFileRoute("/ideias/$slug")({
  loader: async ({ params, context }) => {
    const intent = findIntent(params.slug);
    if (!intent) throw notFound();
    await context.queryClient.ensureQueryData(intentProductsQO(intent));
    return { intent };
  },
  head: ({ params, loaderData }) => {
    const intent = loaderData?.intent ?? findIntent(params.slug);
    const url = `${SITE_URL}/ideias/${params.slug}`;
    if (!intent) {
      return { meta: [{ title: "Ideia não encontrada | BrindesHub" }] };
    }
    return {
      meta: [
        { title: intent.title },
        { name: "description", content: intent.description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: intent.title },
        { property: "og:description", content: intent.description },
        { property: "og:url", content: url },
        { name: "twitter:title", content: intent.title },
        { name: "twitter:description", content: intent.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: intent.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Ideias", item: `${SITE_URL}/ideias` },
              { "@type": "ListItem", position: 3, name: intent.h1, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: IntentPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-destructive">Erro: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Ideia não encontrada</h1>
        <p className="mt-2 text-muted-foreground">Confira nossos guias disponíveis.</p>
        <Button asChild className="mt-6"><Link to="/ideias">Ver ideias</Link></Button>
      </main>
      <SiteFooter />
    </div>
  ),
});

function IntentPage() {
  const { intent } = Route.useLoaderData();
  const { data: products } = useSuspenseQuery(intentProductsQO(intent));

  const searchParams: Record<string, string | number> = {};
  if (intent.query) searchParams.q = intent.query;
  if (intent.categoria) searchParams.categoria = intent.categoria;
  if (intent.material) searchParams.material = intent.material;
  if (intent.cor) searchParams.cor = intent.cor;
  if (intent.max) searchParams.max = intent.max;
  if (intent.moq) searchParams.moq = intent.moq;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs
              className="mb-4"
              items={[{ label: "Ideias", to: "/ideias" }, { label: intent.h1 }]}
            />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{intent.h1}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{intent.intro}</p>
            <Button asChild className="mt-4">
              <Link to="/buscar" search={searchParams}>
                Ver todos no catálogo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-semibold">Seleção em destaque</h2>
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhum produto disponível no momento. Explore o{" "}
              <Link to="/buscar" className="underline">catálogo completo</Link>.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    price_on_request: p.price_on_request,
                    short_description: p.short_description,
                    company: {
                      id: p.company_id,
                      slug: p.company_slug,
                      name: p.company_name,
                    },
                    images: p.primary_image_url
                      ? [{ url: p.primary_image_url, sort_order: 0 }]
                      : [],
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-xl font-semibold">Perguntas frequentes</h2>
          <div className="space-y-3">
            {intent.faqs.map((f) => (
              <details key={f.q} className="rounded-lg border bg-card p-4">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-lg border bg-card p-6">
            <h3 className="font-semibold">Outros guias</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {INTENTS.filter((i) => i.slug !== intent.slug).map((i) => (
                <li key={i.slug}>
                  <Link
                    to="/ideias/$slug"
                    params={{ slug: i.slug }}
                    className="text-sm text-primary hover:underline"
                  >
                    {i.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
