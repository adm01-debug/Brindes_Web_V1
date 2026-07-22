import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { ProductCardSkeleton } from "@/components/product-card-skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, ChevronLeft, ChevronRight } from "lucide-react";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  categoria: fallback(z.string(), "").default(""),
  ordenar: fallback(z.string(), "relevance").default("relevance"),
  min: fallback(z.number(), 0).default(0),
  max: fallback(z.number(), 0).default(0),
  page: fallback(z.number().int(), 1).default(1),
});

const PAGE_SIZE = 24;

const BUSCAR_URL = "https://brinde-gallery.lovable.app/buscar";

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Buscar brindes personalizados — BrindesHub" },
      {
        name: "description",
        content:
          "Encontre brindes personalizados por nome, categoria, preço ou empresa. Busca tolerante a acentos e erros de digitação.",
      },
      { property: "og:title", content: "Buscar brindes personalizados — BrindesHub" },
      {
        property: "og:description",
        content: "Catálogo completo de brindes corporativos com filtros por categoria, preço e mais.",
      },
      { property: "og:url", content: BUSCAR_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Buscar brindes personalizados — BrindesHub" },
      { name: "twitter:description", content: "Catálogo completo de brindes corporativos com filtros." },
    ],
    links: [{ rel: "canonical", href: BUSCAR_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SearchResultsPage",
          name: "Buscar brindes personalizados",
          url: BUSCAR_URL,
          isPartOf: { "@id": "https://brinde-gallery.lovable.app/#website" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: "https://brinde-gallery.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Buscar", item: BUSCAR_URL },
          ],
        }),
      },
    ],
  }),
  component: SearchPage,
});

type RpcRow = {
  id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  price: number | null;
  price_on_request: boolean;
  currency: string;
  views_count: number;
  created_at: string;
  company_id: string;
  company_slug: string;
  company_name: string;
  category_slug: string | null;
  category_name: string | null;
  primary_image_url: string | null;
  total_count: number;
};

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [term, setTerm] = useState(search.q);
  const [priceMin, setPriceMin] = useState(search.min ? String(search.min) : "");
  const [priceMax, setPriceMax] = useState(search.max ? String(search.max) : "");

  const { data: categories } = useQuery({
    queryKey: ["all-categories-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "search-products-rpc",
      search.q,
      search.categoria,
      search.ordenar,
      search.min,
      search.max,
      search.page,
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_products", {
        _q: search.q || undefined,
        _category_slug: search.categoria || undefined,
        _price_min: search.min > 0 ? search.min : undefined,
        _price_max: search.max > 0 ? search.max : undefined,
        _sort: search.ordenar,
        _page: search.page,
        _page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []) as RpcRow[];
    },
  });

  const total = data?.[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));

  type SearchState = typeof search;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev: SearchState) => ({
        ...prev,
        q: term,
        min: priceMin ? Number(priceMin) : 0,
        max: priceMax ? Number(priceMax) : 0,
        page: 1,
      }),
    });
  };

  const setFilter = <K extends keyof SearchState>(key: K, value: SearchState[K]) => {
    navigate({ search: (prev: SearchState) => ({ ...prev, [key]: value, page: 1 }) });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">Buscar produtos</h1>

          <form onSubmit={submitSearch} className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cor, material..."
                className="pl-9"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                aria-label="Termo de busca"
              />
            </div>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="R$ mín"
              className="md:w-28"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              aria-label="Preço mínimo"
            />
            <Input
              type="number"
              inputMode="decimal"
              placeholder="R$ máx"
              className="md:w-28"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              aria-label="Preço máximo"
            />
            <Button type="submit">Buscar</Button>
          </form>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                value={search.categoria || "all"}
                onValueChange={(v) => setFilter("categoria", v === "all" ? "" : v)}
              >
                <SelectTrigger className="sm:w-64">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={search.ordenar} onValueChange={(v) => setFilter("ordenar", v)}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Mais relevantes</SelectItem>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                  <SelectItem value="popular">Mais vistos</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              {isLoading ? "Buscando..." : `${total} resultado(s)`}
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading && <ProductCardSkeleton count={8} />}
            {!isLoading &&
              data?.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    price_on_request: p.price_on_request,
                    short_description: p.short_description,
                    company: {
                      id: p.company_id,
                      slug: p.company_slug,
                      name: p.company_name,
                    },
                    images: p.primary_image_url
                      ? [{ url: p.primary_image_url, sort_order: 0 }]
                      : [],
                  }}
                />
              ))}
            {data && data.length === 0 && !isLoading && (
              <div className="col-span-full rounded-lg border border-dashed py-16 text-center">
                <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tente outros termos ou remova filtros.
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={search.page <= 1 || isFetching}
                onClick={() => setFilter("page", Math.max(1, search.page - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {search.page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={search.page >= totalPages || isFetching}
                onClick={() => setFilter("page", Math.min(totalPages, search.page + 1))}
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
