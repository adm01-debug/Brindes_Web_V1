import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Tag } from "lucide-react";

const CATEGORIAS_URL = "https://brinde-gallery.lovable.app/categorias";

const categoriasQueryOptions = () =>
  queryOptions({
    queryKey: ["categorias-hub"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, description, icon")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const Route = createFileRoute("/categorias")({
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriasQueryOptions()),
  head: () => ({
    meta: [
      { title: "Categorias de brindes personalizados | BrindesHub" },
      {
        name: "description",
        content:
          "Explore todas as categorias de brindes corporativos personalizados: canecas, camisetas, ecobags, tecnologia, sustentáveis e muito mais.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Categorias de brindes personalizados | BrindesHub" },
      {
        property: "og:description",
        content: "Navegue por categorias e encontre o brinde ideal para seu evento ou campanha.",
      },
      { property: "og:url", content: CATEGORIAS_URL },
      { name: "twitter:title", content: "Categorias de brindes personalizados | BrindesHub" },
      { name: "twitter:description", content: "Todas as categorias de brindes em um só lugar." },
    ],
    links: [{ rel: "canonical", href: CATEGORIAS_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Categorias de brindes personalizados",
          url: CATEGORIAS_URL,
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
            { "@type": "ListItem", position: 2, name: "Categorias", item: CATEGORIAS_URL },
          ],
        }),
      },
    ],
  }),
  component: CategoriasHub,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-destructive">Erro: {error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p>Página não encontrada.</p>
    </div>
  ),
});

function CategoriasHub() {
  const { data: categorias } = useSuspenseQuery(categoriasQueryOptions());

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" items={[{ label: "Categorias" }]} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Explore por categoria
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Encontre rapidamente o tipo de brinde ideal para seu público, evento ou campanha.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {categorias.length === 0 ? (
            <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
              Nenhuma categoria cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categorias.map((cat) => (
                <Link
                  key={cat.id}
                  to="/categoria/$slug"
                  params={{ slug: cat.slug }}
                  className="group flex flex-col items-start gap-2 rounded-lg border bg-card p-5 transition hover:border-primary hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <Tag className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold group-hover:text-primary">{cat.name}</h2>
                  {cat.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{cat.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
