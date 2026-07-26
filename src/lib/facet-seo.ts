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
  /** Página atual e total, para canonical paginado e rel prev/next. */
  page?: number;
  pageCount?: number;
}) {
  const base = `${SITE_URL}${params.hubPath}/${params.slug}`;
  const page = params.page && params.page > 1 ? params.page : 1;
  const pageCount = params.pageCount ?? 1;
  const url = page > 1 ? `${base}?page=${page}` : base;


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
      ...(params.products && params.products.length > 0
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: title,
                numberOfItems: params.products.length,
                itemListElement: params.products.slice(0, 30).map((p, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: p.name,
                  url: `${SITE_URL}/produto/${p.id}`,
                })),
              }),
            },
          ]
        : []),
    ],
  };
}

/**
 * Monta o bloco `head()` de um hub de eixo (lista de vitrines), incluindo
 * BreadcrumbList e ItemList das vitrines publicadas.
 */
export function facetHubHead(params: {
  hubPath: string;
  title: string;
  description: string;
  heading: string;
  terms?: { slug: string; name: string }[];
}) {
  const url = `${SITE_URL}${params.hubPath}`;
  const terms = params.terms ?? [];

  return {
    meta: [
      { title: params.title },
      { name: "description", content: params.description },
      { property: "og:type", content: "website" },
      { property: "og:title", content: params.title },
      { property: "og:description", content: params.description },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: params.title },
      { name: "twitter:description", content: params.description },
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
            { "@type": "ListItem", position: 2, name: params.heading, item: url },
          ],
        }),
      },
      ...(terms.length > 0
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: params.heading,
                numberOfItems: terms.length,
                itemListElement: terms.map((t, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: t.name,
                  url: `${url}/${t.slug}`,
                })),
              }),
            },
          ]
        : []),
    ],
  };
}

