import { z } from "zod";

/**
 * Limite espelhado do trigger `product_facets_limit` no banco.
 * Mantido em um único lugar para cliente e validação não divergirem.
 */
export const MAX_FACETS_PER_PRODUCT = 24;

/** Eixos canônicos da taxonomia multi-eixo. */
export const FACET_AXES = ["categoria", "evento", "publico", "data"] as const;
export type FacetAxisSlug = (typeof FACET_AXES)[number];

/** Mapa eixo -> rota de hub pública. */
export const FACET_AXIS_HUB: Record<FacetAxisSlug, string> = {
  categoria: "/categorias",
  evento: "/brindes-por-evento",
  publico: "/brindes-por-publico-alvo",
  data: "/brindes-por-data",
};

export type FacetTerm = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  cover_url: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

/** Seleção de facetas de um produto, validada antes de ir ao banco. */
export const facetSelectionSchema = z
  .array(z.string().uuid("Faceta inválida."))
  .max(MAX_FACETS_PER_PRODUCT, `Máximo de ${MAX_FACETS_PER_PRODUCT} marcações por produto.`);

export type FacetSelection = z.infer<typeof facetSelectionSchema>;

/**
 * Remove duplicatas preservando a ordem de seleção.
 * O par (product_id, term_id) é PK no banco — enviar duplicata gera erro 23505.
 */
export function dedupeFacetIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids));
}
