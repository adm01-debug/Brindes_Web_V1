import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSignedUrl, formatBRL } from "@/lib/portal";
import { Plus, Package, Pencil, Trash2, Eye, EyeOff, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/produtos/")({
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, price_on_request, is_active, views_count, moderation_status, moderation_reason, product_images(url, sort_order)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const toggleActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("products").update({ is_active: !is_active }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(!is_active ? "Produto ativado" : "Produto desativado");
      qc.invalidateQueries({ queryKey: ["my-products"] });
    }
  };

  const softDelete = async (id: string) => {
    const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["my-products"] });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meus produtos</h1>
          <p className="mt-1 text-muted-foreground">{products?.length ?? 0} produto(s)</p>
        </div>
        <Button asChild>
          <Link to="/painel/produtos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
          </Link>
        </Button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-card" />}

      {products && products.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">Nenhum produto ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">Comece cadastrando seu primeiro produto.</p>
            <Button className="mt-4" asChild>
              <Link to="/painel/produtos/novo">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar produto
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {products?.map((p) => (
          <ProductRow key={p.id} product={p} onToggle={toggleActive} onDelete={softDelete} />
        ))}
      </div>
    </div>
  );
}

type ProductRowData = {
  id: string;
  name: string;
  price: number | null;
  price_on_request: boolean;
  is_active: boolean;
  views_count: number;
  product_images: { url: string; sort_order: number }[] | null;
};

function ProductRow({
  product,
  onToggle,
  onDelete,
}: {
  product: ProductRowData;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const rawUrl = product.product_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;

  useEffect(() => {
    if (rawUrl) getSignedUrl("product-images", rawUrl).then(setImgUrl);
  }, [rawUrl]);

  const priceLabel = product.price_on_request || product.price == null
    ? "Sob consulta"
    : formatBRL(Number(product.price));

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {imgUrl ? (
            <img src={imgUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{product.name}</h3>
            {product.is_active ? (
              <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" />Ativo</Badge>
            ) : (
              <Badge variant="outline" className="gap-1"><EyeOff className="h-3 w-3" />Inativo</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{priceLabel}</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Switch checked={product.is_active} onCheckedChange={() => onToggle(product.id, product.is_active)} />
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/painel/produtos/$id/editar" params={{ id: product.id }}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover produto?</AlertDialogTitle>
              <AlertDialogDescription>
                O produto será arquivado e não aparecerá mais no portal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(product.id)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
