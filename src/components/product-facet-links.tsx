import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { FACET_AXIS_HUB, type FacetAxisSlug } from "@/lib/facets";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";

type Row = {
  term: {
    slug: string;
    name: string;
    is_active: boolean;
    axis: { slug: string; name: string; is_active: boolean } | null;
  } | null;
};

export type ProductFacetLinksProps = {
  productId: string;
  className?: string;
};

/**
 * Navegação cruzada: mostra em quais vitrines (evento, público, tipo, data)
 * o produto aparece, gerando links internos que reforçam o SEO de cauda longa.
 */
export function ProductFacetLinks({ productId, className }: ProductFacetLinksProps) {
  const { data } = useQuery({
    queryKey: ["product-facet-links", productId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_facets")
        .select("term:facet_terms!inner(slug, name, is_active, axis:facet_axes!inner(slug, name, is_active))")
        .eq("product_id", productId);
      if (error) throw error;

      const groups = new Map<string, { axisName: string; hub: string; terms: { slug: string; name: string }[] }>();
      for (const row of (data ?? []) as unknown as Row[]) {
        const term = row.term;
        const axis = term?.axis;
        if (!term?.is_active || !axis?.is_active) continue;
        const hub = FACET_AXIS_HUB[axis.slug as FacetAxisSlug];
        // Eixos sem hub público (ou desconhecidos ao cliente) são ignorados.
        if (!hub) continue;
        const group = groups.get(axis.slug) ?? { axisName: axis.name, hub, terms: [] };
        group.terms.push({ slug: term.slug, name: term.name });
        groups.set(axis.slug, group);
      }
      return Array.from(groups.entries()).map(([axisSlug, g]) => ({
        axisSlug,
        ...g,
        terms: g.terms.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      }));
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="vitrines-produto" className={cn("mt-12", className)}>
      <h2 id="vitrines-produto" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Tag className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        Também aparece nestas vitrines
      </h2>
      <div className="mt-4 space-y-4 rounded-lg border bg-card p-4">
        {data.map((group) => (
          <div key={group.axisSlug}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.axisName}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.terms.map((term) => (
                <Link
                  key={term.slug}
                  to={`${group.hub}/${term.slug}`}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {term.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
