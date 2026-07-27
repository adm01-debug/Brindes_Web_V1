import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mediaUrl, formatBRL } from "@/lib/portal";
import { MessageCircle, Building2, Package, ChevronLeft, Ruler, Palette, Boxes, Clock, Expand } from "lucide-react";
import { LeadForm } from "@/components/lead-form";
import { SampleRequestForm } from "@/components/sample-request-form";
import { AddToQuoteCartButton } from "@/components/add-to-quote-cart-button";
import { ShareButton } from "@/components/share-button";
import { FavoriteButton } from "@/components/favorite-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { RecentlyViewed } from "@/components/recently-viewed";
import { ImageLightbox } from "@/components/image-lightbox";
import { ProductQA } from "@/components/product-qa";
import { MessageSellerButton } from "@/components/message-seller-button";
import { ProductVideo } from "@/components/product-video";
import { PriceTiersTable } from "@/components/price-tiers-table";
import { ProductFacetLinks } from "@/components/product-facet-links";
import { normalizeTiers, lowestTierPrice, highestTierPrice } from "@/lib/price-tiers";

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
          variants:product_variants(id, name, attributes),
          tiers:product_price_tiers(id, min_qty, max_qty, unit_price)
        `)

        .eq("id", id)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
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
    const tiers = normalizeTiers((product as { tiers?: unknown }).tiers);
    const tierLow = lowestTierPrice(tiers);
    const tierHigh = highestTierPrice(tiers);
    const priceLabel =
      tierLow != null
        ? `a partir de R$ ${tierLow.toFixed(2).replace(".", ",")}`
        : product.price_on_request || product.price == null
          ? "sob consulta"
          : `R$ ${Number(product.price).toFixed(2).replace(".", ",")}`;
    const desc =
      product.short_description ??
      product.description?.slice(0, 155) ??
      `${product.name} por ${product.company?.name ?? "empresa parceira"} no BrindesHub.`;
    // Imagens absolutas para o JSON-LD: rich results de Product exigem
    // `image`. Usamos o proxy de mídia (/i/...) porque o bucket é privado e
    // uma signed URL expiraria — o crawler precisa de URL estável.
    const images = ((product as { images?: { url: string; sort_order: number }[] }).images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => mediaUrl("product-images", i.url))
      .filter((u): u is string => !!u)
      .slice(0, 5)
      .map((u) => `https://brinde-gallery.lovable.app${u}`);
    return {
      title: product.name,
      companyName: product.company?.name ?? "BrindesHub",
      companySlug: product.company?.slug ?? "",
      description: `${desc} · Preço: ${priceLabel}.`,
      price: product.price_on_request ? null : product.price,
      currency: product.currency ?? "BRL",
      priceOnRequest: product.price_on_request ?? false,
      videoUrl: product.video_url ?? null,
      uploadDate: product.created_at ?? null,
      sku: (product as { sku?: string | null }).sku ?? null,
      images,
      tierLow,
      tierHigh,
      tierCount: tiers.length,
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
              // `image` é obrigatório para rich results; cai no OG gerado
              // quando o produto ainda não tem foto cadastrada.
              image:
                loaderData.images.length > 0
                  ? loaderData.images
                  : [`https://brinde-gallery.lovable.app/api/public/og/produto/${params.id}`],
              ...(loaderData.sku ? { sku: loaderData.sku } : {}),
              brand: { "@type": "Brand", name: loaderData.companyName },
              // Com faixas de preço, o schema correto é AggregateOffer
              // (intervalo de preços), não um Offer de valor único.
              offers:
                loaderData.tierCount > 0 && loaderData.tierLow != null
                  ? {
                      "@type": "AggregateOffer",
                      url,
                      priceCurrency: loaderData.currency,
                      lowPrice: loaderData.tierLow,
                      highPrice: loaderData.tierHigh ?? loaderData.tierLow,
                      offerCount: loaderData.tierCount,
                      availability: "https://schema.org/InStock",
                      seller: { "@type": "Organization", name: loaderData.companyName },
                    }
                  : {
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
          ...(loaderData.videoUrl
            ? [
                {
                  type: "application/ld+json",
                  children: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "VideoObject",
                    name: `Vídeo — ${loaderData.title}`,
                    description,
                    contentUrl: loaderData.videoUrl,
                    thumbnailUrl: [
                      `https://brinde-gallery.lovable.app/api/public/og/produto/${params.id}`,
                    ],
                    uploadDate: loaderData.uploadDate ?? undefined,
                  }),
                },
              ]
            : []),
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
        .eq("moderation_status", "approved")
        .is("deleted_at", null)
        .eq("company.status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { track } = useRecentlyViewed();

  // Log view + histórico (dedupe por sessão)
  useEffect(() => {
    if (!product?.id) return;
    const key = `pv:${product.id}`;
    if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      supabase.from("product_views").insert({ product_id: product.id }).then(
        () => {},
        () => {},
      );
    }
    track(product.id);
  }, [product?.id, track]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // URLs estáveis (rota /i/...): a galeria já sai no HTML de SSR, sem
  // round-trip de assinatura após a hidratação.
  const imageUrls = ((product?.images ?? []) as { url: string; sort_order: number }[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => mediaUrl("product-images", i.url))
    .filter((u): u is string => !!u);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="conteudo" className="flex-1 animate-pulse bg-muted/30" />
      </div>
    );
  }
  if (isError || !product) throw notFound();

  const tiers = normalizeTiers((product as { tiers?: unknown }).tiers);
  const tierLow = lowestTierPrice(tiers);

  const priceLabel =
    tierLow != null
      ? `A partir de ${formatBRL(tierLow)}`
      : product.price_on_request || product.price == null
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
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: "Empresas", href: "/empresas" },
              { label: product.company!.name, href: `/empresa/${product.company!.slug}` },
              { label: product.name },
            ]}
          />
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/empresa/$slug" params={{ slug: product.company!.slug }}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar para {product.company!.name}
            </Link>
          </Button>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Gallery */}
            <div>
              <div className="group relative aspect-square overflow-hidden rounded-2xl border bg-card">
                {imageUrls[selectedIdx] ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label="Ampliar imagem"
                      className="block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <img loading="eager" decoding="async" fetchPriority="high" width={800} height={800} src={imageUrls[selectedIdx]} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </button>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur opacity-0 transition group-hover:opacity-100"
                    >
                      <Expand className="h-3.5 w-3.5" /> Ampliar
                    </span>
                  </>
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
                      <img loading="lazy" decoding="async" width={80} height={80} src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <ImageLightbox
                images={imageUrls}
                index={selectedIdx}
                alt={product.name}
                open={lightboxOpen}
                onOpenChange={setLightboxOpen}
                onIndexChange={setSelectedIdx}
              />
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
              <div className="mt-2 flex items-start justify-between gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
                <div className="flex shrink-0 items-center gap-2">
                  <FavoriteButton productId={product.id} productName={product.name} showLabel={false} size="icon" />
                  <ShareButton
                    title={product.name}
                    text={product.short_description ?? `${product.name} — ${product.company!.name}`}
                  />
                </div>
              </div>
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
                <MessageSellerButton
                  companyId={product.company!.id}
                  companyName={product.company!.name}
                  productId={product.id}
                  productName={product.name}
                  className="mt-2 w-full"
                />

              </div>

              <PriceTiersTable tiers={tiers} minOrderQuantity={product.min_order_quantity} />



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

              {product.video_url && (
                <div className="mt-4">
                  <ProductVideo url={product.video_url} title={product.name} />
                </div>
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

              <div className="mt-6 space-y-3">
                <AddToQuoteCartButton
                  item={{
                    product_id: product.id,
                    product_name: product.name,
                    company_id: product.company!.id,
                    company_name: product.company!.name,
                    image_url: product.images?.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)[0]?.url ?? null,
                    quantity: product.min_order_quantity ?? null,
                  }}
                  priceTiers={tiers}
                  variant="default"

                  size="lg"
                  className="w-full"
                />
                <LeadForm
                  companyId={product.company!.id}
                  productId={product.id}
                  productName={product.name}
                />
                <SampleRequestForm
                  companyId={product.company!.id}
                  productId={product.id}
                  productName={product.name}
                />
              </div>
            </div>
          </div>

          <RelatedProducts
            currentId={product.id}
            categoryId={product.category_id}
            companyId={product.company!.id}
          />

          <ProductFacetLinks productId={product.id} />

          <ProductQA
            productId={product.id}
            companyId={product.company!.id}
            productName={product.name}
          />

          <RecentlyViewed excludeId={product.id} className="mt-12" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function RelatedProducts({
  currentId,
  categoryId,
  companyId,
}: {
  currentId: string;
  categoryId: string | null;
  companyId: string;
}) {
  const { data } = useQuery({
    queryKey: ["related-products", currentId, categoryId, companyId],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, slug, price, price_on_request, product_images(url, is_primary, sort_order)")
        .neq("id", currentId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("moderation_status", "approved")
        .limit(4);
      if (categoryId) q = q.eq("category_id", categoryId);
      else q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Miniatura por produto resolvida de forma síncrona (SSR-safe).
  const urls: Record<string, string> = {};
  for (const p of data ?? []) {
    const imgs = (p.product_images ?? []) as Array<{ url: string; is_primary: boolean; sort_order: number }>;
    const primary =
      imgs.find((i) => i.is_primary) ?? [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0];
    const u = primary ? mediaUrl("product-images", primary.url) : null;
    if (u) urls[p.id] = u;
  }


  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="related" className="mt-12">
      <h2 id="related" className="text-xl font-semibold tracking-tight">
        Produtos relacionados
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((p) => (
          <Link
            key={p.id}
            to="/produto/$id"
            params={{ id: p.id }}
            className="group overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary"
          >
            <div className="aspect-square overflow-hidden bg-muted">
              {urls[p.id] ? (
                <img
                  loading="lazy"
                  decoding="async"
                  width={300}
                  height={300}
                  src={urls[p.id]}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Package className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="line-clamp-2 text-sm font-medium">{p.name}</h3>
              <p className="mt-1 text-sm text-primary">
                {p.price_on_request || p.price == null ? "Sob consulta" : formatBRL(Number(p.price))}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
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
