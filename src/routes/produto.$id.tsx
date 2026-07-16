import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSignedUrl, formatBRL } from "@/lib/portal";
import { MessageCircle, Building2, Package, ChevronLeft, Ruler, Palette, Boxes, Clock } from "lucide-react";
import { LeadForm } from "@/components/lead-form";

const productQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          company:companies!inner(id, slug, name, status, whatsapp, phone, email, logo_url),
          images:product_images(id, url, sort_order),
          variants:product_variants(id, name, attributes)
        `)
        .eq("id", id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("company.status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const Route = createFileRoute("/produto/$id")({
  component: ProductPage,
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData(productQueryOptions(params.id));
    if (!product) throw notFound();
    const priceLabel =
      product.price_on_request || product.price == null
        ? "sob consulta"
        : `R$ ${Number(product.price).toFixed(2).replace(".", ",")}`;
    const desc =
      product.short_description ??
      product.description?.slice(0, 155) ??
      `${product.name} por ${product.company?.name ?? "empresa parceira"} no BrindesHub.`;
    return {
      title: product.name,
      companyName: product.company?.name ?? "BrindesHub",
      companySlug: product.company?.slug ?? "",
      description: `${desc} · Preço: ${priceLabel}.`,
      price: product.price_on_request ? null : product.price,
      currency: product.currency ?? "BRL",
      priceOnRequest: product.price_on_request ?? false,
    };
  },
  head: ({ params, loaderData }) => {
    const url = `https://brinde-gallery.lovable.app/produto/${params.id}`;
    const title = loaderData
      ? `${loaderData.title} — ${loaderData.companyName}`
      : "Produto — BrindesHub";
    const description = loaderData?.description ?? "Produto não encontrado no BrindesHub.";
    const scripts = loaderData
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: loaderData.title,
              description,
              url,
              brand: { "@type": "Brand", name: loaderData.companyName },
              offers: {
                "@type": "Offer",
                url,
                priceCurrency: loaderData.currency,
                price: loaderData.price ?? undefined,
                availability: loaderData.priceOnRequest
                  ? "https://schema.org/PreOrder"
                  : "https://schema.org/InStock",
                seller: { "@type": "Organization", name: loaderData.companyName },
              },
            }),
          },
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Início", item: "https://brinde-gallery.lovable.app/" },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: loaderData.companyName,
                  item: `https://brinde-gallery.lovable.app/empresa/${loaderData.companySlug}`,
                },
                { "@type": "ListItem", position: 3, name: loaderData.title, item: url },
              ],
            }),
          },
        ]
      : [];
    const ogImage = `https://brinde-gallery.lovable.app/api/public/og/produto/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          company:companies!inner(id, slug, name, status, whatsapp, phone, email, logo_url),
          images:product_images(id, url, sort_order),
          variants:product_variants(id, name, attributes)
        `)
        .eq("id", id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("company.status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Log view
  useEffect(() => {
    if (product?.id) {
      supabase.from("product_views").insert({ product_id: product.id }).then(() => {});
    }
  }, [product?.id]);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    const images = product?.images?.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order) ?? [];
    Promise.all(images.map((i: { url: string }) => getSignedUrl("product-images", i.url))).then((urls) => {
      setImageUrls(urls.filter((u): u is string => !!u));
    });
  }, [product?.images]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 animate-pulse bg-muted/30" />
      </div>
    );
  }
  if (isError || !product) throw notFound();

  const priceLabel = product.price_on_request || product.price == null
    ? "Sob consulta"
    : formatBRL(Number(product.price));

  const whatsappLink = product.company?.whatsapp
    ? `https://wa.me/${product.company.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Tenho interesse no produto "${product.name}".`,
      )}`
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/empresa/$slug" params={{ slug: product.company!.slug }}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar para {product.company!.name}
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Gallery */}
            <div>
              <div className="aspect-square overflow-hidden rounded-2xl border bg-card">
                {imageUrls[selectedIdx] ? (
                  <img src={imageUrls[selectedIdx]} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Package className="h-16 w-16" />
                  </div>
                )}
              </div>
              {imageUrls.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {imageUrls.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedIdx(i)}
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        i === selectedIdx ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <Link
                to="/empresa/$slug"
                params={{ slug: product.company!.slug }}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Building2 className="h-4 w-4" />
                {product.company!.name}
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{product.name}</h1>
              {product.short_description && (
                <p className="mt-2 text-muted-foreground">{product.short_description}</p>
              )}

              <div className="mt-6 rounded-xl border bg-card p-5">
                <div className="text-3xl font-bold text-primary">{priceLabel}</div>
                {product.min_order_quantity && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pedido mínimo: {product.min_order_quantity} unidades
                  </p>
                )}
                {whatsappLink && (
                  <Button asChild size="lg" className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white">
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Solicitar orçamento
                    </a>
                  </Button>
                )}
              </div>

              {/* Attributes grid */}
              <dl className="mt-6 grid grid-cols-2 gap-3">
                {product.material && (
                  <AttrCard icon={<Boxes className="h-4 w-4" />} label="Material" value={product.material} />
                )}
                {product.dimensions && (
                  <AttrCard icon={<Ruler className="h-4 w-4" />} label="Dimensões" value={product.dimensions} />
                )}
                {product.colors && product.colors.length > 0 && (
                  <AttrCard icon={<Palette className="h-4 w-4" />} label="Cores" value={product.colors.join(", ")} />
                )}
                {product.production_time_days && (
                  <AttrCard icon={<Clock className="h-4 w-4" />} label="Produção" value={`${product.production_time_days} dias`} />
                )}
              </dl>

              {product.description && (
                <Card className="mt-6">
                  <CardContent className="p-5">
                    <h2 className="font-semibold">Descrição completa</h2>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {product.customization_options && (
                <Card className="mt-4">
                  <CardContent className="p-5">
                    <h2 className="font-semibold">Personalização</h2>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                      {product.customization_options}
                    </p>
                  </CardContent>
                </Card>
              )}

              {product.variants && product.variants.length > 0 && (
                <Card className="mt-4">
                  <CardContent className="p-5">
                    <h2 className="font-semibold">Variações disponíveis</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.variants.map((v: { id: string; name: string }) => (
                        <Badge key={v.id} variant="secondary">{v.name}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="mt-6">
                <LeadForm
                  companyId={product.company!.id}
                  productId={product.id}
                  productName={product.name}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function AttrCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
