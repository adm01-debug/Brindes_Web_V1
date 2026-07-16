import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/product-form";
import type { ProductInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/produtos/$id/editar")({
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["edit-product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-card" />;
  if (isError || !product) throw notFound();

  const initial: Partial<ProductInput> = {
    ...product,
    price: product.price != null ? Number(product.price) : null,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/painel/produtos"><ChevronLeft className="mr-1 h-4 w-4" />Voltar</Link>
      </Button>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Editar produto</h1>
      <div className="mt-6">
        <ProductForm companyId={product.company_id} productId={product.id} initial={initial} />
      </div>
    </div>
  );
}
