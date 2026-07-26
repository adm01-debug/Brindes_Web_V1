import { Link } from "@tanstack/react-router";
import { Package, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getSignedUrl, formatBRL } from "@/lib/portal";
import { Card, CardContent } from "@/components/ui/card";
import { FavoriteButton } from "@/components/favorite-button";
import { CompareButton } from "@/components/compare-button";
import { AddToQuoteCartButton } from "@/components/add-to-quote-cart-button";
import { PlanBadge, type CompanyPlan } from "@/components/plan-badge";
import { lowestTierPrice, normalizeTiers } from "@/lib/price-tiers";


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
  /** URL de vídeo do produto (apenas para exibir o selo "Vídeo"). */
  video_url?: string | null;
  /** Faixas de preço por quantidade — quando existem, o card mostra "a partir de". */
  price_tiers?: { min_qty: number; max_qty: number | null; unit_price: number }[] | null;
  company:
    | { id: string; slug: string; name: string; plan?: CompanyPlan | null; featured_until?: string | null }
    | null;
  images: { url: string; sort_order: number }[] | null;
};


/**
 * @param priority Marca o card como candidato a LCP (primeiras posições da
 * grade, acima da dobra): carrega a imagem com prioridade alta em vez de lazy.
 * Use em no máximo ~4 cards por página — prioridade em tudo é prioridade em nada.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  // `toSorted`/cópia: `.sort()` mutaria o array vindo do cache do TanStack
  // Query, reordenando dados compartilhados por outros componentes.
  const rawUrl = product.images
    ? [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.url
    : undefined;

  useEffect(() => {
    let active = true;
    if (rawUrl) {
      getSignedUrlCached("product-images", rawUrl).then((u) => {
        if (active) setImgUrl(u);
      });
    } else {
      setImgUrl(null);
    }
    return () => {
      active = false;
    };
  }, [rawUrl]);


  // Preço promocional só é considerado válido quando existe, é positivo e
  // realmente menor que o preço base — evita "descontos" negativos por dado sujo.
  const hasPromo =
    !product.price_on_request &&
    product.promo_price != null &&
    product.promo_price > 0 &&
    product.price != null &&
    product.promo_price < product.price;

  const discountPct = hasPromo
    ? Math.round(((product.price! - product.promo_price!) / product.price!) * 100)
    : 0;

  // Faixas por quantidade têm precedência de exibição: o comprador precisa
  // enxergar o menor unitário possível ("a partir de"), não o preço cheio.
  const tierLow = lowestTierPrice(normalizeTiers(product.price_tiers));

  const priceLabel =
    tierLow != null
      ? `A partir de ${formatBRL(tierLow)}`
      : product.price_on_request || product.price == null
        ? "Sob consulta"
        : formatBRL(hasPromo ? product.promo_price! : product.price);


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
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {hasPromo && (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground shadow-sm">
                -{discountPct}%
              </span>
            )}
            {product.is_clearance && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                Ponta de estoque
              </span>
            )}
            {product.is_unusual && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground shadow-sm">
                Inusitado
              </span>
            )}
            {product.video_url && (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground shadow-sm">
                <PlayCircle className="h-3 w-3" aria-hidden />
                Vídeo
              </span>
            )}
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold group-hover:text-primary">
            {product.name}
          </h3>
          {product.company && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{product.company.name}</p>
          )}
          <p className="mt-2 flex items-baseline gap-2 text-sm font-semibold text-primary">
            {priceLabel}
            {hasPromo && (
              <span className="text-xs font-normal text-muted-foreground line-through">
                {formatBRL(product.price!)}
              </span>
            )}
          </p>
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
