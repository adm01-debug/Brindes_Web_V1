import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { getSignedUrl, formatBRL } from "@/lib/portal";
import { Card, CardContent } from "@/components/ui/card";

type Product = {
  id: string;
  name: string;
  price: number | null;
  price_on_request: boolean;
  short_description: string | null;
  company: { id: string; slug: string; name: string } | null;
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
    <Link to="/produto/$id" params={{ id: product.id }}>
      <Card className="group h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
        <div className="aspect-square overflow-hidden bg-muted">
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
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
      </Card>
    </Link>
  );
}
