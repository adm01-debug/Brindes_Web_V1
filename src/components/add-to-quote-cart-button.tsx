import { Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuoteCart, type QuoteCartItem } from "@/hooks/use-quote-cart";
import { formatBRL } from "@/lib/portal";
import { normalizeTiers, tierForQuantity } from "@/lib/price-tiers";

type Props = {
  item: Omit<QuoteCartItem, "added_at" | "quantity" | "notes"> & {
    quantity?: number | null;
    notes?: string | null;
  };
  /** Faixas do produto: com quantidade informada, sugerimos o unitário da faixa. */
  priceTiers?: { min_qty: number; max_qty: number | null; unit_price: number }[] | null;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost";
  showLabel?: boolean;
  className?: string;
  onAdded?: () => void;
};


export function AddToQuoteCartButton({
  item,
  priceTiers,
  size = "sm",
  variant = "secondary",
  showLabel = true,
  className,
  onAdded,
}: Props) {
  const { has, add, maxItems, items } = useQuoteCart();
  const already = has(item.product_id);


  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (already) {
      toast.info("Produto já está no orçamento", {
        action: { label: "Ver", onClick: () => window.dispatchEvent(new CustomEvent("brindeshub:open-quote-cart")) },
      });
      return;
    }
    if (items.length >= maxItems) {
      toast.error(`Limite de ${maxItems} itens por orçamento atingido.`);
      return;
    }
    add({
      product_id: item.product_id,
      product_name: item.product_name,
      company_id: item.company_id,
      company_name: item.company_name ?? null,
      image_url: item.image_url ?? null,
      quantity: item.quantity ?? null,
      notes: item.notes ?? null,
    });
    toast.success("Adicionado ao orçamento", {
      action: { label: "Ver carrinho", onClick: () => window.dispatchEvent(new CustomEvent("brindeshub:open-quote-cart")) },
    });
    onAdded?.();
  };

  const Icon = already ? Check : ShoppingCart;

  return (
    <Button
      type="button"
      size={size}
      variant={already ? "outline" : variant}
      onClick={handleClick}
      aria-pressed={already}
      aria-label={already ? "Produto no orçamento" : "Adicionar ao orçamento"}
      className={cn("gap-2", className)}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {showLabel && (already ? "No orçamento" : "Adicionar ao orçamento")}
    </Button>
  );
}
