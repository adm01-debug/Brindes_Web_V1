import { createFileRoute } from "@tanstack/react-router";
import { FacetHubPage } from "@/components/facet-hub-page";
import { facetAxisQO } from "@/lib/facet-queries";

const SITE_URL = "https://brinde-gallery.lovable.app";
const TITLE = "Brindes por Público-Alvo — Clientes, Equipe, Executivos | BrindesHub";
const DESCRIPTION =
  "Escolha o brinde certo para cada público: clientes, colaboradores, executivos, equipes de vendas, estudantes e muito mais.";

export const Route = createFileRoute("/brindes-por-publico-alvo/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(facetAxisQO("publico")),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/brindes-por-publico-alvo` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/brindes-por-publico-alvo` }],
  }),
  component: () => (
    <FacetHubPage
      axisSlug="publico"
      basePath="/brindes-por-publico-alvo"
      termLinkTo="/brindes-por-publico-alvo/$slug"
      heading="Brindes por público-alvo"
      intro="O mesmo produto não agrada a todos. Selecione quem vai receber e encontre opções pensadas para esse perfil."
    />
  ),
});
