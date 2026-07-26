import { createFileRoute } from "@tanstack/react-router";
import { FacetHubPage } from "@/components/facet-hub-page";
import { facetAxisQO } from "@/lib/facet-queries";
import { facetHubHead } from "@/lib/facet-seo";

const HUB_PATH = "/brindes-por-data";
const HEADING = "Brindes por data comemorativa";
const TITLE = "Brindes por Data Comemorativa — Calendário Promocional | BrindesHub";
const DESCRIPTION =
  "Planeje suas campanhas com antecedência: brindes personalizados para as principais datas do calendário promocional brasileiro.";

export const Route = createFileRoute("/brindes-por-data/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(facetAxisQO("data")),
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
      axisSlug="data"
      basePath={HUB_PATH}
      termLinkTo="/brindes-por-data/$slug"
      heading={HEADING}
      intro="Antecipe-se ao calendário. Veja as datas que movimentam o mercado de brindes e os produtos indicados para cada uma."
    />
  ),
});
