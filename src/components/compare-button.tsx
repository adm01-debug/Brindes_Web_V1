import { Button } from "@/components/ui/button";
import { GitCompare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompare, MAX_COMPARE } from "@/hooks/use-compare";

interface CompareButtonProps {
  productId: string;
  productName?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function CompareButton({
  productId,
  productName,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true,
}: CompareButtonProps) {
  const { isInCompare, toggle, hydrated } = useCompare();
  const active = hydrated && isInCompare(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const res = toggle(productId);
    if (res.full) {
      toast.error(`Limite de ${MAX_COMPARE} produtos na comparação. Remova um para adicionar outro.`);
      return;
    }
    toast.success(
      res.added
        ? `${productName ?? "Produto"} adicionado à comparação`
        : `${productName ?? "Produto"} removido da comparação`,
    );
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? "Remover da comparação" : "Adicionar à comparação"}
      className={cn(className, active && "border-primary text-primary")}
    >
      <GitCompare className={cn("h-4 w-4", showLabel && "mr-2")} />
      {showLabel && (active ? "Comparando" : "Comparar")}
    </Button>
  );
}
