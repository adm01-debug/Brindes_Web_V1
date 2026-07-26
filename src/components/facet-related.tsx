import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { facetCountsQO } from "@/lib/facet-queries";
import { FACET_AXIS_HUB, type FacetAxisSlug } from "@/lib/facets";
import { cn } from "@/lib/utils";

type TermRow = {
  id: string;
  slug: string;
  name: string;
  axis: { slug: string; name: string; is_active: boolean } | null;
};

export type FacetRelatedProps = {
  /** Termo atual, excluído da lista. */
  currentTermId: string;
  /** Eixo atual: seus termos aparecem primeiro. */
  currentAxisSlug: FacetAxisSlug;
  className?: string;
  limit?: number;
};

/**
 * Cross-sell de navegação: sugere outras vitrines com acervo, priorizando o
 * mesmo eixo e completando com eixos vizinhos. Reforça links internos (SEO)
 * e dá saída ao usuário quando a vitrine atual não convence.
 */
export function FacetRelated({
  currentTermId,
  currentAxisSlug,
  className,
  limit = 12,
}: FacetRelatedProps) {
  const { data: counts } = useQuery(facetCountsQO());

  const { data: terms } = useQuery({
    queryKey: ["facet-related-terms"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TermRow[]> => {
      const { data, error } = await supabase
        .from("facet_terms")
        .select("id, slug, name, axis:facet_axes!inner(slug, name, is_active)")
        .eq("is_active", true)
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as TermRow[];
    },
  });

  if (!terms || !counts) return null;

  const items = terms
    .filter((t) => {
      if (t.id === currentTermId) return false;
      if (!t.axis?.is_active) return false;
      if (!FACET_AXIS_HUB[t.axis.slug as FacetAxisSlug]) return false;
      // Só sugerimos vitrines que realmente têm produtos.
      return (counts[t.slug] ?? 0) > 0;
    })
    .sort((a, b) => {
      const sameA = a.axis!.slug === currentAxisSlug ? 0 : 1;
      const sameB = b.axis!.slug === currentAxisSlug ? 0 : 1;
      return (
        sameA - sameB ||
        (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0) ||
        a.name.localeCompare(b.name, "pt-BR")
      );
    })
    .slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="vitrines-relacionadas" className={cn("mt-4", className)}>
      <h2 id="vitrines-relacionadas" className="text-xl font-semibold tracking-tight">
        Vitrines relacionadas
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((t) => (
          <Link
            key={t.id}
            to={`${FACET_AXIS_HUB[t.axis!.slug as FacetAxisSlug]}/${t.slug}` as never}
            className="rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t.name}
            <span className="ml-1.5 text-xs text-muted-foreground">({counts[t.slug]})</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
