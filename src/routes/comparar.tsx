import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GitCompare, X, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl, formatBRL } from "@/lib/portal";
import { useCompare } from "@/hooks/use-compare";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AddToQuoteCartButton } from "@/components/add-to-quote-cart-button";

type CompareProduct = {
  id: string;
  name: string;
  slug: string | null;
  price: number | null;
  price_on_request: boolean;
  short_description: string | null;
  min_order_quantity: number | null;
  production_time_days: number | null;
  material: string | null;
  dimensions: string | null;
  company: { id: string; slug: string; name: string; status: string } | null;
  category: { name: string } | null;
  images: { url: string; is_primary: boolean; sort_order: number }[] | null;
  variants: { id: string; name: string }[] | null;
};

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title: "Comparar produtos — BrindesHub" },
      { name: "description", content: "Compare até 4 brindes lado a lado: preço, prazo, quantidade mínima e variantes." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Comparador de brindes — BrindesHub" },
      { property: "og:description", content: "Escolha o melhor brinde comparando preço, prazo e variações." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://brinde-gallery.lovable.app/comparar" }],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { ids, hydrated, remove, clear } = useCompare();

  const { data: products, isLoading } = useQuery({
    queryKey: ["compare", ids],
    enabled: hydrated && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, price, price_on_request, short_description, min_order_quantity, production_time_days, material, dimensions, company:companies!inner(id, slug, name, status), category:categories(name), images:product_images(url, is_primary, sort_order), variants:product_variants(id, name)",
        )
        .in("id", ids)
        .eq("is_active", true)
        .eq("moderation_status", "approved");
      if (error) throw error;
      const rows = ((data ?? []) as unknown as CompareProduct[]).filter((p) => p.company?.status === "approved");
      // preserve ordem dos ids selecionados
      return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as CompareProduct[];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container mx-auto flex-1 px-4 py-8">
        <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Comparar produtos" }]} />
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <GitCompare className="h-7 w-7 text-primary" aria-hidden />
              Comparar produtos
            </h1>
            <p className="mt-2 text-muted-foreground">
              Compare até 4 brindes lado a lado. Adicione produtos pelo botão "Comparar" nas listagens.
            </p>
          </div>
          {hydrated && ids.length > 0 && (
            <Button variant="outline" onClick={clear} className="gap-2">
              <Trash2 className="h-4 w-4" /> Limpar tudo
            </Button>
          )}
        </header>

        {!hydrated || isLoading ? (
          <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
        ) : ids.length === 0 ? (
          <EmptyState />
        ) : !products || products.length === 0 ? (
          <EmptyState message="Os produtos selecionados não estão mais disponíveis." />
        ) : (
          <CompareTable products={products} onRemove={remove} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-12 text-center">
      <GitCompare className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
      <p className="mt-4 text-muted-foreground">
        {message ?? "Você ainda não adicionou produtos para comparar."}
      </p>
      <Button asChild className="mt-6">
        <Link to="/buscar">Explorar produtos</Link>
      </Button>
    </div>
  );
}

function CompareTable({ products, onRemove }: { products: CompareProduct[]; onRemove: (id: string) => void }) {
  const rows: { label: string; render: (p: CompareProduct) => React.ReactNode }[] = [
    {
      label: "Preço",
      render: (p) =>
        p.price_on_request || p.price == null ? (
          <span className="text-muted-foreground">Sob consulta</span>
        ) : (
          <span className="font-semibold text-primary">{formatBRL(p.price)}</span>
        ),
    },
    { label: "Empresa", render: (p) => p.company?.name ?? "—" },
    { label: "Categoria", render: (p) => p.category?.name ?? "—" },
    {
      label: "Quantidade mínima",
      render: (p) => (p.min_order_quantity ? `${p.min_order_quantity} un.` : "—"),
    },
    {
      label: "Prazo de produção",
      render: (p) => (p.production_time_days ? `${p.production_time_days} dias` : "—"),
    },
    { label: "Material", render: (p) => p.material ?? "—" },
    { label: "Dimensões", render: (p) => p.dimensions ?? "—" },
    {
      label: "Variantes",
      render: (p) =>
        p.variants && p.variants.length > 0
          ? p.variants.map((v) => v.name).join(", ")
          : "—",
    },
    {
      label: "Descrição",
      render: (p) => <span className="text-sm text-muted-foreground">{p.short_description ?? "—"}</span>,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* Header cards */}
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `minmax(140px, 180px) repeat(${products.length}, minmax(220px, 1fr))` }}
        >
          <div />
          {products.map((p) => (
            <ProductHeader key={p.id} product={p} onRemove={() => onRemove(p.id)} />
          ))}
        </div>

        {/* Attribute rows */}
        <div className="mt-6 overflow-hidden rounded-xl border">
          {rows.map((row, idx) => (
            <div
              key={row.label}
              className={`grid gap-4 px-4 py-3 ${idx % 2 === 0 ? "bg-muted/40" : ""}`}
              style={{ gridTemplateColumns: `minmax(140px, 180px) repeat(${products.length}, minmax(220px, 1fr))` }}
            >
              <div className="text-sm font-medium text-muted-foreground">{row.label}</div>
              {products.map((p) => (
                <div key={p.id} className="text-sm">
                  {row.render(p)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductHeader({ product, onRemove }: { product: CompareProduct; onRemove: () => void }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const primary =
    product.images?.slice().sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];

  useEffect(() => {
    let active = true;
    if (primary?.url) {
      getSignedUrl("product-images", primary.url).then((u) => {
        if (active) setImgUrl(u);
      });
    }
    return () => {
      active = false;
    };
  }, [primary?.url]);

  return (
    <Card className="relative overflow-hidden">
      <Button
        size="icon"
        variant="secondary"
        onClick={onRemove}
        aria-label={`Remover ${product.name} da comparação`}
        className="absolute right-2 top-2 z-10 h-7 w-7 rounded-full shadow-sm"
      >
        <X className="h-4 w-4" />
      </Button>
      <Link to="/produto/$id" params={{ id: product.id }} className="block">
        <div className="aspect-square bg-muted">
          {imgUrl ? (
            <img src={imgUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="h-10 w-10" aria-hidden />
            </div>
          )}
        </div>
        <div className="p-3">
          <h2 className="line-clamp-2 text-sm font-semibold hover:text-primary">{product.name}</h2>
        </div>
      </Link>
      {product.company && (
        <div className="border-t p-3">
          <AddToQuoteCartButton
            item={{
              product_id: product.id,
              product_name: product.name,
              company_id: product.company.id,
              company_name: product.company.name,
              image_url: primary?.url ?? null,
            }}
            variant="outline"
            size="sm"
            className="w-full"
          />
        </div>
      )}
    </Card>
  );
}
