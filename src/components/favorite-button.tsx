import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  productName?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function FavoriteButton({
  productId,
  productName,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true,
}: FavoriteButtonProps) {
  const { isFavorite, toggle, hydrated } = useFavorites();
  const active = hydrated && isFavorite(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowActive = toggle(productId);
    toast.success(
      nowActive
        ? `${productName ?? "Produto"} adicionado aos favoritos`
        : `${productName ?? "Produto"} removido dos favoritos`,
    );
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn(className, active && "text-red-500 border-red-200 hover:text-red-600")}
    >
      <Heart className={cn("h-4 w-4", showLabel && "mr-2", active && "fill-current")} />
      {showLabel && (active ? "Favoritado" : "Favoritar")}
    </Button>
  );
}
