import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { FacetTermPage } from "@/components/facet-term-page";
import { facetTermQO, facetProductsQO } from "@/lib/facet-queries";
import { facetTermHead } from "@/lib/facet-seo";

const HUB_PATH = "/brindes-por-evento";
const HUB_LABEL = "Brindes por evento";

export const Route = createFileRoute("/brindes-por-evento/$slug")({
  loader: async ({ params, context }) => {
    const found = await context.queryClient.ensureQueryData(facetTermQO("evento", params.slug));
    if (!found) throw notFound();
    await context.queryClient.ensureQueryData(facetProductsQO(found.term.id));
    return found;
  },
  head: ({ params, loaderData }) =>
    facetTermHead({
      term: loaderData?.term,
      slug: params.slug,
      hubPath: HUB_PATH,
      hubLabel: HUB_LABEL,
      fallbackTitle: "Evento não encontrado | BrindesHub",
    }),
  component: EventFacetPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Evento não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Veja todos os eventos disponíveis.</p>
        <Button asChild className="mt-6">
          <Link to={HUB_PATH}>Ver eventos</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  ),
});

function EventFacetPage() {
  const { axis, term } = Route.useLoaderData();
  return (
    <FacetTermPage term={term} axisName={axis.name} hubPath={HUB_PATH} hubLabel={HUB_LABEL} />
  );
}
