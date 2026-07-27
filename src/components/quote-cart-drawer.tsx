import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { useQuoteCart } from "@/hooks/use-quote-cart";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mediaUrl } from "@/lib/portal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuoteCartDrawer({ open, onOpenChange }: Props) {
  const { items, remove, updateQuantity, clear, count } = useQuoteCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" aria-hidden />
            Orçamento ({count})
          </SheetTitle>
          <SheetDescription>
            Junte produtos de várias empresas. Ao enviar, cada empresa recebe seu pedido separadamente.
          </SheetDescription>
        </SheetHeader>

        <div className="-mx-6 mt-4 flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
              <ShoppingCart className="h-10 w-10 opacity-30" aria-hidden />
              <p>Seu orçamento está vazio.</p>
              <p className="text-xs">
                Adicione produtos pela lista ou pela página do produto.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.product_id}
                  className={cn(
                    "flex gap-3 rounded-lg border bg-card p-3",
                  )}
                >
                  <CartImage path={item.image_url} alt={item.product_name} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      to="/produto/$id"
                      params={{ id: item.product_id }}
                      onClick={() => onOpenChange(false)}
                      className="line-clamp-2 text-sm font-medium hover:text-primary"
                    >
                      {item.product_name}
                    </Link>
                    {item.company_name && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.company_name}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <label className="text-xs text-muted-foreground" htmlFor={`qty-${item.product_id}`}>
                        Qtd:
                      </label>
                      <Input
                        id={`qty-${item.product_id}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={1000000}
                        value={item.quantity ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const n = v === "" ? null : Math.max(1, Math.min(1_000_000, Number(v) || 0));
                          updateQuantity(item.product_id, n);
                        }}
                        className="h-8 w-24"
                        placeholder="—"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(item.product_id)}
                    aria-label={`Remover ${item.product_name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <SheetFooter className="mt-4 flex-col gap-2 sm:flex-col">
          {items.length > 0 && (
            <>
              <Button asChild className="w-full gap-2">
                <Link to="/orcamento" onClick={() => onOpenChange(false)}>
                  Finalizar orçamento
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={clear}
              >
                Esvaziar carrinho
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CartImage({ path, alt }: { path: string | null; alt: string }) {
  const url = mediaUrl("product-images", path);
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
      {url ? (
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Package className="h-5 w-5" aria-hidden />
        </div>
      )}
    </div>
  );
}
