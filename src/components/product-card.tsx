import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { getSignedUrl, formatBRL } from "@/lib/portal";
import { Card, CardContent } from "@/components/ui/card";
import { FavoriteButton } from "@/components/favorite-button";
import { CompareButton } from "@/components/compare-button";
import { AddToQuoteCartButton } from "@/components/add-to-quote-cart-button";
import { PlanBadge, type CompanyPlan } from "@/components/plan-badge";

type Product = {
  id: string;
  name: string;
  price: number | null;
  price_on_request: boolean;
  short_description: string | null;
  /** Preço promocional vigente (ponta de estoque / oferta). Deve ser menor que `price`. */
  promo_price?: number | null;
  /** Sinaliza item de ponta de estoque / liquidação. */
  is_clearance?: boolean | null;
  /** Sinaliza brinde curado como inusitado/diferente. */
  is_unusual?: boolean | null;
  company:
    | { id: string; slug: string; name: string; plan?: CompanyPlan | null; featured_until?: string | null }
    | null;
  images: { url: string; sort_order: number }[] | null;
};

export function ProductCard({ product }: { product: Product }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const rawUrl = product.images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;

  useEffect(() => {
    let active = true;
    if (rawUrl) {
      getSignedUrl("product-images", rawUrl).then((u) => {
        if (active) setImgUrl(u);
      });
    }
    return () => {
      active = false;
    };
  }, [rawUrl]);

  const priceLabel = product.price_on_request || product.price == null
    ? "Sob consulta"
    : formatBRL(product.price);

  return (
    <Card className="group relative h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
      <Link to="/produto/$id" params={{ id: product.id }} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="h-10 w-10" />
            </div>
          )}
          <div className="absolute right-2 top-2">
            <FavoriteButton
              productId={product.id}
              productName={product.name}
              showLabel={false}
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full shadow-sm backdrop-blur"
            />
          </div>
          {product.company && (
            <div className="absolute left-2 top-2">
              <PlanBadge plan={product.company.plan} featuredUntil={product.company.featured_until} />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold group-hover:text-primary">
            {product.name}
          </h3>
          {product.company && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{product.company.name}</p>
          )}
          <p className="mt-2 text-sm font-semibold text-primary">{priceLabel}</p>
        </CardContent>
      </Link>
      {product.company && (
        <div className="space-y-2 px-4 pb-4">
          <AddToQuoteCartButton
            item={{
              product_id: product.id,
              product_name: product.name,
              company_id: product.company.id,
              company_name: product.company.name,
              image_url: rawUrl ?? null,
            }}
            variant="outline"
            size="sm"
            className="w-full"
          />
          <CompareButton
            productId={product.id}
            productName={product.name}
            variant="ghost"
            size="sm"
            className="w-full"
          />
        </div>
      )}
    </Card>
  );
}
