import type { FacetTerm } from "@/lib/facets";

export const SITE_URL = "https://brinde-gallery.lovable.app";

/** Item mínimo necessário para montar o ItemList de produtos da vitrine. */
export type FacetSeoProduct = { id: string; name: string };

/**
 * Monta o bloco `head()` de uma página de termo de faceta.
 * Centralizado para que os três eixos não divirjam em metadados.
 */
export function facetTermHead(params: {
  term: FacetTerm | null | undefined;
  slug: string;
  hubPath: string;
  hubLabel: string;
  fallbackTitle: string;
  /** Produtos já carregados no loader — vira ItemList para o Google. */
  products?: FacetSeoProduct[];
}) {

  const url = `${SITE_URL}${params.hubPath}/${params.slug}`;

  if (!params.term) {
    return {
      meta: [{ title: params.fallbackTitle }, { name: "robots", content: "noindex" }],
    };
  }

  const term = params.term;
  const title = term.seo_title ?? `${term.name} — Brindes Corporativos | BrindesHub`;
  const description =
    term.seo_description ??
    term.description ??
    `Encontre brindes corporativos personalizados para ${term.name} com fornecedores de todo o Brasil.`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
            {
              "@type": "ListItem",
              position: 2,
              name: params.hubLabel,
              item: `${SITE_URL}${params.hubPath}`,
            },
            { "@type": "ListItem", position: 3, name: term.name, item: url },
          ],
        }),
      },
    ],
  };
}
