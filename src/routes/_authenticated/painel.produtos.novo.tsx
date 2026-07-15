import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/product-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel/produtos/novo")({
  component: NewProductPage,
});

function NewProductPage() {
  const { data: company } = useQuery({
    queryKey: ["my-company"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id").maybeSingle();
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/painel/produtos"><ChevronLeft className="mr-1 h-4 w-4" />Voltar</Link>
      </Button>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Novo produto</h1>
      <p className="mt-1 text-muted-foreground">Preencha os detalhes do produto para publicar em seu catálogo.</p>
      <div className="mt-6">
        {company?.id ? (
          <ProductForm companyId={company.id} />
        ) : (
          <div className="h-64 animate-pulse rounded-lg bg-card" />
        )}
      </div>
    </div>
  );
}
