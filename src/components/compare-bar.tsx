import { Link } from "@tanstack/react-router";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/hooks/use-compare";

/** Barra flutuante que aparece quando há >= 2 produtos na comparação. */
export function CompareBar() {
  const { count, hydrated, clear } = useCompare();
  if (!hydrated || count < 2) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
        <GitCompare className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-sm font-medium">
          {count} {count === 1 ? "produto" : "produtos"} para comparar
        </span>
        <Button size="sm" asChild>
          <Link to="/comparar">Comparar</Link>
        </Button>
        <Button size="icon" variant="ghost" onClick={clear} aria-label="Limpar comparação">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
