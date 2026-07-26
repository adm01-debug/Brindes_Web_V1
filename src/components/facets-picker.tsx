import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MAX_FACETS_PER_PRODUCT } from "@/lib/facets";

/**
 * Eixos exibidos no painel. `categoria` fica de fora porque o produto já tem
 * `category_id` — duplicar o mesmo eixo confundiria o vendedor.
 */
const PANEL_AXES = ["tipo", "evento", "publico", "data"] as const;

type FacetTermOption = {
  id: string;
  slug: string;
  name: string;
  axis_id: string;
};

type FacetAxisOption = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type FacetsPickerProps = {
  /** IDs de termos atualmente selecionados. */
  value: string[];
  /** Recebe a nova seleção completa (o componente é controlado). */
  onChange: (next: string[]) => void;
  /** Desabilita interação enquanto o formulário salva. */
  disabled?: boolean;
};

/**
 * Seleção multi-eixo de facetas (Evento, Público-Alvo, Data Promocional).
 * Renderiza chips com estado toggle — sem dependência de biblioteca de
 * multi-select, mantendo o bundle enxuto e o teclado navegável.
 */
export function FacetsPicker({ value, onChange, disabled = false }: FacetsPickerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["facet-options"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [axesRes, termsRes] = await Promise.all([
        supabase
          .from("facet_axes")
          .select("id, slug, name, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("facet_terms")
          .select("id, slug, name, axis_id")
          .eq("is_active", true)
          .order("sort_order")
          .order("name"),
      ]);

      const axes = ((axesRes.data ?? []) as FacetAxisOption[]).filter((a) =>
        (PANEL_AXES as readonly string[]).includes(a.slug),
      );
      const terms = (termsRes.data ?? []) as FacetTermOption[];
      return { axes, terms };
    },
  });

  const selected = new Set(value);
  const atLimit = value.length >= MAX_FACETS_PER_PRODUCT;

  const toggle = (termId: string) => {
    if (disabled) return;
    if (selected.has(termId)) {
      onChange(value.filter((id) => id !== termId));
      return;
    }
    // Espelha o limite do banco no cliente para dar feedback imediato.
    if (atLimit) return;
    onChange([...value, termId]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>Navegação e descoberta</span>
          <Badge variant={atLimit ? "destructive" : "secondary"}>
            {value.length}/{MAX_FACETS_PER_PRODUCT}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Marque em quais vitrines este produto deve aparecer. Quanto mais preciso, mais
          compradores encontram o item nas buscas por evento, público e datas do calendário.
        </p>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {data?.axes.map((axis) => {
          const terms = data.terms.filter((t) => t.axis_id === axis.id);
          if (terms.length === 0) return null;
          return (
            <div key={axis.id} className="space-y-2">
              <h4 className="text-sm font-semibold">{axis.name}</h4>
              <div className="flex flex-wrap gap-2">
                {terms.map((term) => {
                  const isOn = selected.has(term.id);
                  return (
                    <button
                      key={term.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isOn}
                      disabled={disabled || (!isOn && atLimit)}
                      onClick={() => toggle(term.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isOn
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-foreground hover:border-primary hover:text-primary",
                        (disabled || (!isOn && atLimit)) && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {term.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {atLimit && (
          <p className="text-xs text-destructive">
            Limite de {MAX_FACETS_PER_PRODUCT} marcações atingido. Desmarque uma opção para
            escolher outra.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
