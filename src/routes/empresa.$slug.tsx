import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSignedUrl } from "@/lib/portal";
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
    };
  },
  head: ({ params, loaderData }) => {
    const url = `https://brinde-gallery.lovable.app/empresa/${params.slug}`;
    const title = loaderData ? `${loaderData.title} — BrindesHub` : "Empresa — BrindesHub";
    const description = loaderData?.description ?? "Empresa não encontrada no BrindesHub.";
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
          company:companies!inner(id, slug, name, status),
          images:product_images(url, sort_order)
        `)
        .eq("company_id", company!.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (company?.banner_url) getSignedUrl("company-assets", company.banner_url).then(setBannerUrl);
    if (company?.logo_url) getSignedUrl("company-assets", company.logo_url).then(setLogoUrl);
  }, [company?.banner_url, company?.logo_url]);

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
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
