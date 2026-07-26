import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { formatDateLabel, type CommemorativeDate } from "./datas-comemorativas.index";

const SITE_URL = "https://brinde-gallery.lovable.app";

type ListedProduct = {
  id: string;
  name: string;
  price: number | null;
  price_on_request: boolean;
  short_description: string | null;
  company: { id: string; slug: string; name: string } | null;
  images: { url: string; sort_order: number }[] | null;
};

const dateQO = (slug: string) =>
  queryOptions({
    queryKey: ["commemorative-date", slug],
    queryFn: async (): Promise<CommemorativeDate | null> => {
      const { data, error } = await supabase
        .from("commemorative_dates")
        .select("id, slug, name, description, month, day, keywords")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

const dateProductsQO = (date: CommemorativeDate) =>
  queryOptions({
    queryKey: ["commemorative-date-products", date.id],
    queryFn: async (): Promise<ListedProduct[]> => {
      // 1) Produtos explicitamente marcados para esta data
      const { data: tagged, error: taggedError } = await supabase
        .from("product_commemorative_dates")
        .select(
          `product:products!inner(
            id, name, price, price_on_request, short_description, is_active, deleted_at, moderation_status,
            company:companies!inner(id, slug, name, status),
            images:product_images(url, sort_order)
          )`,
        )
        .eq("date_id", date.id)
        .limit(24);
      if (taggedError) throw taggedError;

      const explicit = (tagged ?? [])
        .map((row) => row.product as unknown as (ListedProduct & {
          is_active: boolean;
          deleted_at: string | null;
          moderation_status: string;
          company: { id: string; slug: string; name: string; status: string } | null;
        }) | null)
        .filter(
          (p): p is NonNullable<typeof p> =>
            !!p && p.is_active && !p.deleted_at && p.moderation_status === "approved" &&
            p.company?.status === "approved",
        );

      if (explicit.length > 0) return explicit as ListedProduct[];

      // 2) Fallback: busca por palavra-chave da data
      const term = date.keywords?.[0] ?? date.name;
      const { data, error } = await supabase.rpc("search_products", {
        _q: term,
        _sort: "relevance",
        _page: 1,
        _page_size: 12,
      });
      if (error) throw error;
      return (
        (data ?? []) as Array<{
          id: string;
          name: string;
          price: number | null;
          price_on_request: boolean;
          short_description: string | null;
          company_id: string;
          company_slug: string;
          company_name: string;
          primary_image_url: string | null;
        }>
      ).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        price_on_request: p.price_on_request,
        short_description: p.short_description,
        company: { id: p.company_id, slug: p.company_slug, name: p.company_name },
        images: p.primary_image_url ? [{ url: p.primary_image_url, sort_order: 0 }] : [],
      }));
    },
  });

export const Route = createFileRoute("/datas-comemorativas/$slug")({
  loader: async ({ params, context }) => {
    const date = await context.queryClient.ensureQueryData(dateQO(params.slug));
    if (!date) throw notFound();
    await context.queryClient.ensureQueryData(dateProductsQO(date));
    return { date };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/datas-comemorativas/${params.slug}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Data não encontrada | BrindesHub" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { date } = loaderData;
    const title = `${date.name} — Brindes Corporativos | BrindesHub`;
    const description =
      date.description ??
      `Encontre brindes corporativos personalizados para ${date.name} com fornecedores de todo o Brasil.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: "Datas comemorativas",
                item: `${SITE_URL}/datas-comemorativas`,
              },
              { "@type": "ListItem", position: 3, name: date.name, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `Com quanta antecedência devo encomendar brindes para ${date.name}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Recomendamos solicitar orçamentos com 30 a 60 dias de antecedência, considerando o prazo de produção e personalização informado por cada fornecedor.",
                },
              },
              {
                "@type": "Question",
                name: "É possível personalizar os brindes com a minha marca?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Sim. Praticamente todos os fornecedores do portal oferecem personalização com logotipo, cores e embalagens especiais. Consulte as opções na ficha de cada produto.",
                },
              },
              {
                "@type": "Question",
                name: "Qual a quantidade mínima de pedido?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Cada fornecedor define a própria quantidade mínima, exibida na ficha do produto. Use o carrinho de orçamento para consultar vários fornecedores de uma só vez.",
                },
              },
            ],
          }),
        },
      ],
    };
  },
  component: DatePage,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Data não encontrada</h1>
        <p className="mt-2 text-muted-foreground">Veja o calendário completo de datas.</p>
        <Button asChild className="mt-6">
          <Link to="/datas-comemorativas">Ver datas comemorativas</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  ),
});

function DatePage() {
  const { date } = Route.useLoaderData();
  const { data: products } = useSuspenseQuery(dateProductsQO(date));
  const label = formatDateLabel(date.month, date.day);
  const searchTerm = date.keywords?.[0] ?? date.name;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs
              className="mb-4"
              items={[
                { label: "Datas comemorativas", href: "/datas-comemorativas" },
                { label: date.name },
              ]}
            />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{date.name}</h1>
            {label && (
              <p className="mt-1 text-sm uppercase tracking-wide text-muted-foreground">{label}</p>
            )}
            {date.description && (
              <p className="mt-3 max-w-2xl text-muted-foreground">{date.description}</p>
            )}
            <Button asChild className="mt-5">
              <Link to="/buscar" search={{ q: searchTerm }}>
                Ver todos no catálogo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-semibold">Seleção para {date.name}</h2>
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhum produto disponível no momento. Explore o{" "}
              <Link to="/buscar" className="underline">
                catálogo completo
              </Link>
              .
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p as never} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
