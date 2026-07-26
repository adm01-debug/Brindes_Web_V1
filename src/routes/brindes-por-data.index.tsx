import { createFileRoute } from "@tanstack/react-router";
import { FacetHubPage } from "@/components/facet-hub-page";
import { facetAxisQO } from "@/lib/facet-queries";

const SITE_URL = "https://brinde-gallery.lovable.app";
const TITLE = "Brindes por Data Comemorativa — Calendário Promocional | BrindesHub";
const DESCRIPTION =
  "Planeje suas campanhas com antecedência: brindes personalizados para as principais datas do calendário promocional brasileiro.";

export const Route = createFileRoute("/brindes-por-data/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(facetAxisQO("data")),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/brindes-por-data` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/brindes-por-data` }],
  }),
  component: () => (
    <FacetHubPage
      axisSlug="data"
      basePath="/brindes-por-data"
      termLinkTo="/brindes-por-data/$slug"
      heading="Brindes por data comemorativa"
      intro="Antecipe-se ao calendário. Veja as datas que movimentam o mercado de brindes e os produtos indicados para cada uma."
    />
  ),
});
