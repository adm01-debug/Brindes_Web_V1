import { Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";

/**
 * Forma mínima de produto consumida pela vitrine. Mantida propositalmente
 * compatível com o `ProductCard` para evitar duplicação de tipos.
 */
export interface ShowcaseProduct {
  readonly id: string;
  readonly name: string;
  readonly price: number | null;
  readonly price_on_request: boolean;
  readonly short_description: string | null;
  readonly promo_price?: number | null;
  readonly is_clearance?: boolean | null;
  readonly is_unusual?: boolean | null;
  readonly company:
    | { id: string; slug: string; name: string; plan?: string | null; featured_until?: string | null }
    | null;
  readonly images: { url: string; sort_order: number }[] | null;
}

export interface ShowcaseGridProps {
  readonly products: readonly ShowcaseProduct[];
  /** Mensagem exibida quando não há nenhum produto para a vitrine. */
  readonly emptyMessage: string;
}

export function ShowcaseGrid({ products, emptyMessage }: ShowcaseGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/buscar">Explorar todos os brindes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape validada acima
        <ProductCard key={p.id} product={p as any} />
      ))}
    </div>
  );
}
