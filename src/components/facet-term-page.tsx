import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { facetProductsQO } from "@/lib/facet-queries";
import { FacetRelated } from "@/components/facet-related";
import { FACET_AXIS_HUB, type FacetAxisSlug, type FacetTerm } from "@/lib/facets";

export type FacetTermPageProps = {
  term: FacetTerm;
  axisName: string;
  /** Rota do hub do eixo, usada no breadcrumb. */
  hubPath: string;
  hubLabel: string;
};

/**
 * Listagem de produtos de um termo de faceta. Compartilhada pelos três eixos
 * públicos para manter layout, SEO visual e estados vazios consistentes.
 */
export function FacetTermPage({ term, hubPath, hubLabel }: FacetTermPageProps) {
  const { data: products } = useSuspenseQuery(facetProductsQO(term.id));
  // Deriva o eixo a partir do hub para priorizar vitrines irmãs nas sugestões.
  const currentAxisSlug = (Object.keys(FACET_AXIS_HUB) as FacetAxisSlug[]).find(
    (a) => FACET_AXIS_HUB[a] === hubPath,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs
              className="mb-4"
              items={[{ label: hubLabel, href: hubPath }, { label: term.name }]}
            />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{term.name}</h1>
            {term.description && (
              <p className="mt-3 max-w-2xl text-muted-foreground">{term.description}</p>
            )}
            <Button asChild className="mt-5">
              <Link to="/buscar" search={{ q: term.name }}>
                Ver no catálogo completo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-xl font-semibold">Seleção para {term.name}</h2>
          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Ainda não há produtos marcados nesta vitrine. Explore o{" "}
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
