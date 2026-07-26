import { createFileRoute } from "@tanstack/react-router";
import { FacetHubPage } from "@/components/facet-hub-page";
import { facetAxisQO } from "@/lib/facet-queries";

const SITE_URL = "https://brinde-gallery.lovable.app";
const TITLE = "Tipos de Brindes Personalizados — Canecas, Camisetas, Canetas | BrindesHub";
const DESCRIPTION =
  "Navegue por tipo de brinde personalizado: canecas, camisetas, canetas, garrafas, mochilas, cadernos e muito mais, com fornecedores de todo o Brasil.";

export const Route = createFileRoute("/tipos-de-brinde/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(facetAxisQO("tipo")),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/tipos-de-brinde` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/tipos-de-brinde` }],
  }),
  component: () => (
    <FacetHubPage
      axisSlug="tipo"
      basePath="/tipos-de-brinde"
      termLinkTo="/tipos-de-brinde/$slug"
      heading="Tipos de brinde"
      intro="Já sabe o que quer? Vá direto ao tipo de produto e compare fornecedores, faixas de preço por quantidade e prazos de produção."
    />
  ),
});
