import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { facetProductsQO } from "@/lib/facet-queries";
import { FacetRelated } from "@/components/facet-related";
import { FACET_AXIS_HUB, type FacetAxisSlug, type FacetTerm } from "@/lib/facets";
import { cn } from "@/lib/utils";

export type FacetTermPageProps = {
  term: FacetTerm;
  axisName: string;
  /** Rota do hub do eixo, usada no breadcrumb. */
  hubPath: string;
  hubLabel: string;
  /** Página atual (1-based), vinda do search param da rota. */
  page?: number;
};

/**
 * Listagem paginada de produtos de um termo de faceta. Compartilhada pelos três
 * eixos públicos para manter layout, SEO visual e estados vazios consistentes.
 */
export function FacetTermPage({ term, hubPath, hubLabel, page = 1 }: FacetTermPageProps) {
  const { data } = useSuspenseQuery(facetProductsQO(term.id, page));
  const products = data.items;
  // Deriva o eixo a partir do hub para priorizar vitrines irmãs nas sugestões.
  const currentAxisSlug = (Object.keys(FACET_AXIS_HUB) as FacetAxisSlug[]).find(
    (a) => FACET_AXIS_HUB[a] === hubPath,
  );
  const termPath = `${hubPath}/${term.slug}`;

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
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">Seleção para {term.name}</h2>
            {data.total > 0 && (
              <p className="text-sm text-muted-foreground">
                {data.total} produto{data.total === 1 ? "" : "s"} · página {data.page} de{" "}
                {data.pageCount}
              </p>
            )}
          </div>

          {products.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              {data.page > 1 ? (
                <>
                  Não há produtos nesta página.{" "}
                  <PageLink to={termPath} page={1} className="underline">
                    Voltar ao início da vitrine
                  </PageLink>
                  .
                </>
              ) : (
                <>
                  Ainda não há produtos marcados nesta vitrine. Explore o{" "}
                  <Link to="/buscar" className="underline">
                    catálogo completo
                  </Link>
                  .
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p as never} />
              ))}
            </div>
          )}

          {data.pageCount > 1 && (
            <nav
              aria-label="Paginação da vitrine"
              className="mt-10 flex items-center justify-center gap-2"
            >
              <PageLink
                to={termPath}
                page={data.page - 1}
                disabled={data.page <= 1}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-sm"
                rel="prev"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </PageLink>
              <span className="px-2 text-sm text-muted-foreground">
                {data.page} / {data.pageCount}
              </span>
              <PageLink
                to={termPath}
                page={data.page + 1}
                disabled={data.page >= data.pageCount}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-sm"
                rel="next"
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </PageLink>
            </nav>
          )}

          {currentAxisSlug && (
            <FacetRelated
              className="mt-12"
              currentTermId={term.id}
              currentAxisSlug={currentAxisSlug}
            />
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

type PageLinkProps = {
  to: string;
  page: number;
  disabled?: boolean;
  className?: string;
  rel?: string;
  children: React.ReactNode;
};

/**
 * Link de paginação. O destino é montado dinamicamente a partir do hub, por
 * isso o cast — as três rotas de termo existem e são estáticas no route tree.
 */
function PageLink({ to, page, disabled, className, rel, children }: PageLinkProps) {
  if (disabled) {
    return (
      <span aria-disabled className={cn(className, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link
      to={to as never}
      search={{ page: page > 1 ? page : undefined } as never}
      rel={rel}
      className={className}
    >
      {children}
    </Link>
  );
}
