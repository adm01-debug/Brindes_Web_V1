import { createFileRoute } from "@tanstack/react-router";
import { FacetHubPage } from "@/components/facet-hub-page";
import { facetAxisQO } from "@/lib/facet-queries";

const SITE_URL = "https://brinde-gallery.lovable.app";
const TITLE = "Brindes por Evento — Formatura, Feiras, Confraternizações | BrindesHub";
const DESCRIPTION =
  "Encontre brindes corporativos personalizados para cada tipo de evento: formaturas, feiras, congressos, confraternizações e campanhas internas.";

export const Route = createFileRoute("/brindes-por-evento/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(facetAxisQO("evento")),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/brindes-por-evento` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/brindes-por-evento` }],
  }),
  component: () => (
    <FacetHubPage
      axisSlug="evento"
      basePath="/brindes-por-evento"
      termLinkTo="/brindes-por-evento/$slug"
      heading="Brindes por evento"
      intro="Cada ocasião pede um brinde diferente. Escolha o evento e veja uma seleção curada de fornecedores prontos para orçar."
    />
  ),
});
