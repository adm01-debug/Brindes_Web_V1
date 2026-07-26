import { createFileRoute } from "@tanstack/react-router";
import { FacetHubPage } from "@/components/facet-hub-page";
import { facetAxisQO } from "@/lib/facet-queries";
import { facetHubHead } from "@/lib/facet-seo";

const HUB_PATH = "/brindes-por-publico-alvo";
const HEADING = "Brindes por público-alvo";
const TITLE = "Brindes por Público-Alvo — Clientes, Equipe, Executivos | BrindesHub";
const DESCRIPTION =
  "Escolha o brinde certo para cada público: clientes, colaboradores, executivos, equipes de vendas, estudantes e muito mais.";

export const Route = createFileRoute("/brindes-por-publico-alvo/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(facetAxisQO("publico")),
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
      axisSlug="publico"
      basePath={HUB_PATH}
      termLinkTo="/brindes-por-publico-alvo/$slug"
      heading={HEADING}
      intro="O mesmo produto não agrada a todos. Selecione quem vai receber e encontre opções pensadas para esse perfil."
    />
  ),
});
