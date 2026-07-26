import { createFileRoute } from "@tanstack/react-router";
import { FacetHubPage } from "@/components/facet-hub-page";
import { facetAxisQO } from "@/lib/facet-queries";
import { facetHubHead } from "@/lib/facet-seo";

const HUB_PATH = "/brindes-por-evento";
const HEADING = "Brindes por evento";
const TITLE = "Brindes por Evento — Formatura, Feiras, Confraternizações | BrindesHub";
const DESCRIPTION =
  "Encontre brindes corporativos personalizados para cada tipo de evento: formaturas, feiras, congressos, confraternizações e campanhas internas.";

export const Route = createFileRoute("/brindes-por-evento/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(facetAxisQO("evento")),
  head: ({ loaderData }) =>
    facetHubHead({
      hubPath: HUB_PATH,
      title: TITLE,
      description: DESCRIPTION,
      heading: HEADING,
      terms: loaderData?.terms,
    }),
  component: () => (
    <FacetHubPage
      axisSlug="evento"
      basePath={HUB_PATH}
      termLinkTo="/brindes-por-evento/$slug"
      heading={HEADING}
      intro="Cada ocasião pede um brinde diferente. Escolha o evento e veja uma seleção curada de fornecedores prontos para orçar."
    />
  ),
});
