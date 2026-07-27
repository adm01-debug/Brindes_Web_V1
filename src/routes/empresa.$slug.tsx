import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyReviews, CompanyRatingSummary } from "@/components/company-reviews";
import { mediaUrl } from "@/lib/portal";
import {
  Building2, MapPin, Phone, Mail, Globe, MessageCircle, Instagram, Facebook, Linkedin, Package,
} from "lucide-react";

const companyQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["company", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const Route = createFileRoute("/empresa/$slug")({
  component: CompanyPage,
  loader: async ({ params, context }) => {
    const company = await context.queryClient.ensureQueryData(companyQueryOptions(params.slug));
    if (!company) throw notFound();
    return {
      title: company.name,
      description:
        company.tagline ??
        company.description?.slice(0, 155) ??
        `Conheça o catálogo de brindes de ${company.name} no BrindesHub.`,
      city: company.city ?? null,
      state: company.state ?? null,
      website: company.website ?? null,
      phone: company.phone ?? null,
      email: company.email ?? null,
      // Caminhos crus do storage: viram URLs absolutas estáveis no head().
      logoPath: company.logo_url ?? null,
      bannerPath: company.banner_url ?? null,
    };
  },
  head: ({ params, loaderData }) => {
    const url = `https://brinde-gallery.lovable.app/empresa/${params.slug}`;
    const title = loaderData ? `${loaderData.title} — BrindesHub` : "Empresa — BrindesHub";
    const description = loaderData?.description ?? "Empresa não encontrada no BrindesHub.";
    const SITE = "https://brinde-gallery.lovable.app";
    const abs = (p: string | null | undefined) => {
      const rel = mediaUrl("company-assets", p);
      return rel ? `${SITE}${rel}` : null;
    };
    const logoAbs = abs(loaderData?.logoPath);
    const bannerAbs = abs(loaderData?.bannerPath);
    const scripts = loaderData
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: loaderData.title,
              description,
              url,
              // Rich results de LocalBusiness exigem imagem; logo é sinal de marca.
              ...(logoAbs ? { logo: logoAbs } : {}),
              ...(bannerAbs || logoAbs
                ? { image: [bannerAbs, logoAbs].filter(Boolean) as string[] }
                : {}),
              ...(loaderData.website ? { sameAs: [loaderData.website] } : {}),
              ...(loaderData.phone ? { telephone: loaderData.phone } : {}),
              ...(loaderData.email ? { email: loaderData.email } : {}),
              ...(loaderData.city || loaderData.state
                ? {
                    address: {
                      "@type": "PostalAddress",
                      addressLocality: loaderData.city ?? undefined,
                      addressRegion: loaderData.state ?? undefined,
                      addressCountry: "BR",
                    },
                  }
                : {}),
            }),
          },
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Início", item: "https://brinde-gallery.lovable.app/" },
                { "@type": "ListItem", position: 2, name: "Empresas", item: "https://brinde-gallery.lovable.app/empresas" },
                { "@type": "ListItem", position: 3, name: loaderData.title, item: url },
              ],
            }),
          },
        ]
      : [];
    const ogImage = `https://brinde-gallery.lovable.app/api/public/og/empresa/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "profile" },
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

function CompanyPage() {
  const { slug } = Route.useParams();
  const { data: company, isLoading, isError } = useQuery({
    queryKey: ["company", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["company-products", company?.id],
    enabled: !!company?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(`
          id, name, price, price_on_request, short_description,
          promo_price, is_clearance, is_unusual, video_url,
          price_tiers:product_price_tiers(min_qty, max_qty, unit_price),
          company:companies!inner(id, slug, name, status, plan, featured_until),
          images:product_images(url, sort_order)
        `)
        .eq("company_id", company!.id)
        .eq("is_active", true)
        .eq("moderation_status", "approved")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // URLs estáveis resolvidas no servidor: banner/logo já saem no HTML de SSR.
  const bannerUrl = mediaUrl("company-assets", company?.banner_url);
  const logoUrl = mediaUrl("company-assets", company?.logo_url);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="conteudo" className="flex-1 animate-pulse bg-muted/30" />
      </div>
    );
  }

  if (isError || !company) {
    throw notFound();
  }

  const whatsappLink = company.whatsapp
    ? `https://wa.me/${company.whatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/30 to-accent/30">
          {bannerUrl && (
            <img loading="lazy" decoding="async" src={bannerUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            className="pt-4"
            items={[
              { label: "Empresas", href: "/empresas" },
              { label: company.name },
            ]}
          />
          {/* Company header */}
          <div className="-mt-16 flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-primary/10 text-primary shadow-sm">
              {logoUrl ? (
                <img loading="lazy" decoding="async" src={logoUrl} alt={company.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{company.name}</h1>
              {company.tagline && <p className="mt-1 text-muted-foreground">{company.tagline}</p>}
              {(company.city || company.state) && (
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {[company.city, company.state].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="mt-2"><CompanyRatingSummary companyId={company.id} /></div>
            </div>
            {whatsappLink && (
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            )}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Products */}
            <section>
              <h2 className="text-xl font-bold tracking-tight">Catálogo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {products?.length ?? 0} {products?.length === 1 ? "produto" : "produtos"}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products?.map((p) => <ProductCard key={p.id} product={p as never} />)}
                {products && products.length === 0 && (
                  <div className="col-span-full rounded-lg border border-dashed py-16 text-center">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Esta empresa ainda não cadastrou produtos.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Sidebar: contact + about */}
            <aside className="space-y-6">
              {company.description && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold">Sobre</h3>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                      {company.description}
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold">Contato</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {company.email && (
                      <li className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${company.email}`} className="hover:text-primary">
                          {company.email}
                        </a>
                      </li>
                    )}
                    {company.phone && (
                      <li className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${company.phone}`} className="hover:text-primary">{company.phone}</a>
                      </li>
                    )}
                    {company.website && (
                      <li className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">
                          {company.website.replace(/^https?:\/\//, "")}
                        </a>
                      </li>
                    )}
                  </ul>
                  {(company.instagram || company.facebook || company.linkedin) && (
                    <div className="mt-4 flex gap-2">
                      {company.instagram && (
                        <Button variant="outline" size="icon" asChild>
                          <a href={company.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <Instagram className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {company.facebook && (
                        <Button variant="outline" size="icon" asChild>
                          <a href={company.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <Facebook className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {company.linkedin && (
                        <Button variant="outline" size="icon" asChild>
                          <a href={company.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                            <Linkedin className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>

          <CompanyReviews companyId={company.id} />
          <RelatedCompanies currentId={company.id} state={company.state} city={company.city} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function RelatedCompanies({
  currentId,
  state,
  city,
}: {
  currentId: string;
  state: string | null;
  city: string | null;
}) {
  const { data } = useQuery({
    queryKey: ["related-companies", currentId, state, city],
    queryFn: async () => {
      let q = supabase
        .from("companies")
        .select("id, slug, name, tagline, city, state, logo_url")
        .neq("id", currentId)
        .eq("status", "approved")
        .limit(4);
      if (city) q = q.eq("city", city);
      else if (state) q = q.eq("state", state);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Logos resolvidos de forma síncrona (SSR-safe) via rota de mídia.


  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="related-companies" className="mt-12">
      <h2 id="related-companies" className="text-xl font-semibold tracking-tight">
        Outras empresas {city ? `em ${city}` : state ? `em ${state}` : "parceiras"}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((c) => (
          <Link
            key={c.id}
            to="/empresa/$slug"
            params={{ slug: c.slug }}
            className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {mediaUrl("company-assets", c.logo_url) ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={mediaUrl("company-assets", c.logo_url)!}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium group-hover:text-primary">{c.name}</h3>
              {c.tagline && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.tagline}</p>}
              {(c.city || c.state) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[c.city, c.state].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
