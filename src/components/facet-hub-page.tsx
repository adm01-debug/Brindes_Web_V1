import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { facetAxisQO, facetCountsQO } from "@/lib/facet-queries";
import type { FacetAxisSlug } from "@/lib/facets";

export type FacetHubPageProps = {
  axisSlug: FacetAxisSlug;
  /** Caminho base das páginas de termo, ex.: "/brindes-por-evento". */
  basePath: string;
  heading: string;
  intro: string;
  /** Rota tipada usada pelos links de termo. */
  termLinkTo: string;
};

/**
 * Página de hub de um eixo de faceta: lista todos os termos ativos como cards
 * navegáveis. Compartilhada pelos eixos Evento, Público-Alvo e Data.
 */
export function FacetHubPage({ axisSlug, heading, intro, termLinkTo }: FacetHubPageProps) {
  const { data } = useSuspenseQuery(facetAxisQO(axisSlug));
  const terms = data?.terms ?? [];
  const { data: counts } = useQuery(facetCountsQO(axisSlug));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" items={[{ label: heading }]} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{intro}</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {terms.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhuma vitrine publicada ainda. Explore o{" "}
              <Link to="/buscar" className="underline">
                catálogo completo
              </Link>
              .
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {terms.map((term) => (
                <Link
                  key={term.id}
                  to={termLinkTo}
                  params={{ slug: term.slug }}
                  className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="h-full transition-colors group-hover:border-primary">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold group-hover:text-primary">{term.name}</h2>
                        {typeof counts?.[term.slug] === "number" && (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {counts[term.slug]} {counts[term.slug] === 1 ? "produto" : "produtos"}
                          </span>
                        )}
                      </div>
                      {term.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {term.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
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
