import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package } from "lucide-react";

const searchSchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Buscar produtos — BrindesHub" },
      { name: "description", content: "Encontre brindes personalizados por categoria, cor, material ou empresa." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [term, setTerm] = useState(search.q ?? "");

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, slug, name").order("name");
      return data ?? [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["search-products", search.q, search.categoria],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          id, name, price, price_on_request, short_description, category_id,
          company:companies!inner(id, slug, name, status),
          images:product_images(url, sort_order),
          category:categories(slug)
        `)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("company.status", "approved")
        .order("created_at", { ascending: false })
        .limit(60);
      if (search.q) query = query.ilike("name", `%${search.q}%`);
      const { data } = await query;
      let filtered = data ?? [];
      if (search.categoria) {
        filtered = filtered.filter((p: { category: { slug: string } | null }) => p.category?.slug === search.categoria);
      }
      return filtered;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (prev) => ({ ...prev, q: term || undefined }) });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">Buscar produtos</h1>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nome do produto..."
                className="pl-9"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </form>
            <Select
              value={search.categoria ?? "all"}
              onValueChange={(v) =>
                navigate({ search: (prev) => ({ ...prev, categoria: v === "all" ? undefined : v }) })
              }
            >
              <SelectTrigger className="sm:w-64">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            {isLoading ? "Buscando..." : `${products?.length ?? 0} resultado(s)`}
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-card" />
              ))}
            {products?.map((p) => <ProductCard key={p.id} product={p as never} />)}
            {products && products.length === 0 && !isLoading && (
              <div className="col-span-full rounded-lg border border-dashed py-16 text-center">
                <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
