import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, Building2, Package, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { CategoryPill } from "@/components/category-pill";
import { PlanBadge } from "@/components/plan-badge";
import { RecentlyViewed } from "@/components/recently-viewed";

const SITE_URL = "https://brinde-gallery.lovable.app";
const HOME_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "BrindesHub",
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.ico`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "BrindesHub",
      description:
        "Portal de empresas de brindes corporativos, promocionais e personalizados no Brasil.",
      inLanguage: "pt-BR",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/buscar?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "BrindesHub — Portal de Empresas de Brindes Corporativos no Brasil" },
      {
        name: "description",
        content:
          "Descubra empresas de brindes personalizados, promocionais e ecológicos em um só portal. Compare fornecedores, veja catálogos e peça orçamentos direto com a empresa.",
      },
      { property: "og:title", content: "BrindesHub — Portal de Empresas de Brindes Corporativos no Brasil" },
      {
        property: "og:description",
        content: "Descubra empresas de brindes personalizados, promocionais e ecológicos em um só portal. Compare fornecedores, veja catálogos e peça orçamentos direto com a empresa.",
      },
      { property: "og:url", content: "https://brinde-gallery.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://brinde-gallery.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(HOME_JSONLD),
      },
    ],
  }),
});

function HomePage() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name, icon")
        .is("parent_id", null)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: featuredCompanies } = useQuery({
    queryKey: ["featured-companies"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("companies")
        .select("id, slug, name, tagline, city, state, logo_url, banner_url, plan, featured_until")
        .eq("status", "approved")
        .or(`plan.eq.premium,plan.eq.pro,featured_until.gt.${nowIso}`)
        .order("plan", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);
      if (data && data.length > 0) return data;
      // Fallback: nenhum destaque cadastrado — mostra recentes
      const { data: recent } = await supabase
        .from("companies")
        .select("id, slug, name, tagline, city, state, logo_url, banner_url, plan, featured_until")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(6);
      return recent ?? [];
    },
  });

  const { data: recentProducts } = useQuery({
    queryKey: ["recent-products"],
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
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("company.status", "approved")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-4 gap-1">
                <Sparkles className="h-3 w-3" />
                Centenas de empresas cadastradas
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                O portal dos melhores{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  brindes corporativos
                </span>{" "}
                do Brasil
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Descubra empresas de brindes personalizados, compare produtos e fale direto com
                fornecedores. Tudo em um só lugar.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/buscar">
                    <Search className="mr-2 h-4 w-4" />
                    Buscar produtos
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Cadastrar minha empresa
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-b bg-background">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight">Explore por categoria</h2>
            <p className="mt-1 text-muted-foreground">Encontre exatamente o brinde que você procura</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {(categories ?? []).map((cat) => (
                <CategoryPill key={cat.id} slug={cat.slug} name={cat.name} />
              ))}
              {!categories && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 w-32 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          </div>
        </section>

        {/* Featured Companies */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Empresas em destaque</h2>
                <p className="mt-1 text-muted-foreground">
                  Fornecedores selecionados para o seu próximo projeto
                </p>
              </div>
              <Button variant="ghost" asChild>
                <Link to="/empresas">
                  Ver todas <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(featuredCompanies ?? []).map((c) => (
                <Link key={c.id} to="/empresa/$slug" params={{ slug: c.slug }}>
                  <Card className="group relative h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
                    <div className="relative aspect-[3/1] bg-gradient-to-br from-primary/20 to-accent/20">
                      <div className="absolute left-2 top-2">
                        <PlanBadge plan={c.plan} featuredUntil={c.featured_until} />
                      </div>
                    </div>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold group-hover:text-primary">{c.name}</h3>
                          {c.tagline && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.tagline}</p>
                          )}
                          {(c.city || c.state) && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {[c.city, c.state].filter(Boolean).join(" — ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {featuredCompanies && featuredCompanies.length === 0 && (
                <EmptyBox
                  icon={<Building2 className="h-8 w-8" />}
                  title="Nenhuma empresa cadastrada ainda"
                  description="Seja um dos primeiros a divulgar sua empresa!"
                  cta={{ label: "Cadastrar empresa", to: "/auth" }}
                />
              )}
            </div>
          </div>
        </section>

        {/* Recent Products */}
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Novidades no catálogo</h2>
                <p className="mt-1 text-muted-foreground">Produtos adicionados recentemente</p>
              </div>
              <Button variant="ghost" asChild>
                <Link to="/buscar">
                  Ver tudo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(recentProducts ?? []).map((p, i) => (
                // Só os 4 primeiros disputam LCP: acima da dobra na maioria dos viewports.
                <ProductCard key={p.id} product={p as never} priority={i < 4} />
              ))}

              {recentProducts && recentProducts.length === 0 && (
                <div className="col-span-full">
                  <EmptyBox
                    icon={<Package className="h-8 w-8" />}
                    title="Nenhum produto ainda"
                    description="Assim que empresas cadastrarem produtos, eles aparecerão aqui."
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        <RecentlyViewed />

        {/* CTA */}
        <section className="border-t bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight">É uma empresa de brindes?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/90">
              Divulgue seus produtos gratuitamente para milhares de compradores corporativos.
              Cadastro em menos de 2 minutos.
            </p>
            <Button size="lg" variant="secondary" className="mt-6" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Cadastrar minha empresa
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function EmptyBox({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <div className="mb-3 text-muted-foreground">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {cta && (
        <Button className="mt-4" asChild>
          <Link to={cta.to}>{cta.label}</Link>
        </Button>
      )}
    </div>
  );
}
