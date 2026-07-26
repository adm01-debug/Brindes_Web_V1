import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { facetCountsQO } from "@/lib/facet-queries";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/** Limite espelhado da RPC `search_products` (v_facets é truncado em 6). */
export const MAX_SEARCH_FACETS = 6;

type AxisRow = { id: string; slug: string; name: string; sort_order: number | null };
type TermRow = { id: string; axis_id: string; slug: string; name: string; sort_order: number | null };

export type SearchFacetFilterProps = {
  /** Slugs de termos atualmente selecionados (vêm da URL). */
  selected: readonly string[];
  /** Recebe a nova lista de slugs após um toggle. */
  onChange: (next: string[]) => void;
  className?: string;
};

/**
 * Filtro multi-eixo (Evento, Público-alvo, Tipo, Data) para a busca.
 * Trabalha com slugs — a RPC resolve os termos e aplica AND entre eles.
 */
export function SearchFacetFilter({ selected, onChange, className }: SearchFacetFilterProps) {
  const { data } = useQuery({
    queryKey: ["search-facet-filter-taxonomy"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [axesRes, termsRes] = await Promise.all([
        supabase
          .from("facet_axes")
          .select("id, slug, name, sort_order")
          .eq("is_active", true)
          .neq("slug", "categoria")
          .order("sort_order", { ascending: true }),
        supabase
          .from("facet_terms")
          .select("id, axis_id, slug, name, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);
      if (axesRes.error) throw axesRes.error;
      if (termsRes.error) throw termsRes.error;
      return {
        axes: (axesRes.data ?? []) as AxisRow[],
        terms: (termsRes.data ?? []) as TermRow[],
      };
    },
  });

  const { data: counts } = useQuery(facetCountsQO());

  const groups = useMemo(() => {
    if (!data) return [];
    return data.axes
      .map((axis) => ({
        axis,
        terms: data.terms.filter(
          (t) =>
            t.axis_id === axis.id &&
            // Vitrines sem produto não ajudam a filtrar; só aparecem se já selecionadas.
            (!counts || (counts[t.slug] ?? 0) > 0 || selected.includes(t.slug)),
        ),
      }))
      .filter((g) => g.terms.length > 0);
  }, [data]);

  if (groups.length === 0) return null;

  const selectedSet = new Set(selected);
  const atLimit = selectedSet.size >= MAX_SEARCH_FACETS;

  const toggle = (slug: string) => {
    if (selectedSet.has(slug)) {
      onChange(selected.filter((s) => s !== slug));
      return;
    }
    if (atLimit) return;
    onChange([...selected, slug]);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {groups.map(({ axis, terms }) => (
        <fieldset key={axis.id} className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {axis.name}
          </legend>
          <div className="flex flex-wrap gap-2">
            {terms.map((term) => {
              const active = selectedSet.has(term.slug);
              return (
                <button
                  key={term.id}
                  type="button"
                  aria-pressed={active}
                  disabled={!active && atLimit}
                  onClick={() => toggle(term.slug)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent hover:text-accent-foreground",
                    !active && atLimit && "cursor-not-allowed opacity-50",
                  )}
                >
                  {active && <Check className="h-3 w-3" aria-hidden="true" />}
                  {term.name}
                  {typeof counts?.[term.slug] === "number" && counts[term.slug] > 0 && (
                    <span className={cn("tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                      ({counts[term.slug]})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {atLimit && (
        <p className="text-xs text-muted-foreground">
          Máximo de {MAX_SEARCH_FACETS} vitrines por busca.
        </p>
      )}
    </div>
  );
}
