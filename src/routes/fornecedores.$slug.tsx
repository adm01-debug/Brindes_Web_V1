import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PlanBadge } from "@/components/plan-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Package, ArrowRight, Trophy } from "lucide-react";

const BASE = "https://brinde-gallery.lovable.app";

const categoryQO = (slug: string) =>
  queryOptions({
    queryKey: ["category-meta", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, description")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

const suppliersQO = (slug: string) =>
  queryOptions({
    queryKey: ["compare-suppliers", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("compare_suppliers_by_category", {
        _category_slug: slug,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        company_id: string;
        slug: string;
        name: string;
        tagline: string | null;
        city: string | null;
        state: string | null;
        plan: string;
        featured_until: string | null;
        product_count: number;
        avg_rating: number;
        review_count: number;
        min_price: number | null;
        logo_url: string | null;
      }>;
    },
  });

export const Route = createFileRoute("/fornecedores/$slug")({
  loader: async ({ params, context }) => {
    const cat = await context.queryClient.ensureQueryData(categoryQO(params.slug));
    if (!cat) throw notFound();
    await context.queryClient.ensureQueryData(suppliersQO(params.slug));
    return { name: cat.name, description: cat.description };
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE}/fornecedores/${params.slug}`;
    const title = loaderData
      ? `Melhores fornecedores de ${loaderData.name} — Comparativo | BrindesHub`
      : "Fornecedores — BrindesHub";
    const description = loaderData
      ? `Compare os melhores fornecedores de ${loaderData.name.toLowerCase()}: avaliação, portfólio, localização e planos. Escolha com dados reais no BrindesHub.`
      : "Comparativo de fornecedores.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SuppliersComparePage,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center p-10">
        <p className="text-muted-foreground">Categoria não encontrada.</p>
      </main>
      <SiteFooter />
    </div>
  ),
  errorComponent: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center p-10">
        <p className="text-muted-foreground">Não foi possível carregar o comparativo.</p>
      </main>
      <SiteFooter />
    </div>
  ),
});

function SuppliersComparePage() {
  const { slug } = Route.useParams();
  const { data: cat } = useSuspenseQuery(categoryQO(slug));
  const { data: suppliers } = useSuspenseQuery(suppliersQO(slug));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: "Categorias", href: "/categorias" },
              { label: cat?.name ?? "", href: `/categoria/${slug}` },
              { label: "Fornecedores" },
            ]}
          />
          <header className="mt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              Comparativo público — {suppliers.length} fornecedor{suppliers.length === 1 ? "" : "es"}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Melhores fornecedores de {cat?.name}
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Compare por avaliação real de clientes, tamanho de portfólio, planos e localização.
              Ordenado priorizando fornecedores verificados (Premium/Pro) com melhor reputação.
            </p>
          </header>

          {suppliers.length === 0 ? (
            <Card className="mt-8 p-10 text-center">
              <p className="text-muted-foreground">
                Nenhum fornecedor cadastrado nesta categoria ainda.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/categorias">Ver outras categorias</Link>
              </Button>
            </Card>
          ) : (
            <>
              {/* Tabela desktop */}
              <div className="mt-8 hidden overflow-hidden rounded-lg border bg-card md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Fornecedor</th>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3">Localização</th>
                      <th className="px-4 py-3 text-right">Produtos</th>
                      <th className="px-4 py-3 text-right">Avaliação</th>
                      <th className="px-4 py-3 text-right">A partir de</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s, i) => (
                      <tr key={s.company_id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{i + 1}º</td>
                        <td className="px-4 py-3">
                          <Link
                            to="/empresa/$slug"
                            params={{ slug: s.slug }}
                            className="font-semibold hover:text-primary"
                          >
                            {s.name}
                          </Link>
                          {s.tagline && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {s.tagline}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <PlanBadge plan={s.plan as "free" | "pro" | "premium"} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.city && s.state ? `${s.city}/${s.state}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{s.product_count}</td>
                        <td className="px-4 py-3 text-right">
                          {s.review_count > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              {Number(s.avg_rating).toFixed(1)}
                              <span className="text-xs text-muted-foreground">({s.review_count})</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem avaliações</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {s.min_price
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(Number(s.min_price))
                            : "Sob consulta"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/empresa/$slug" params={{ slug: s.slug }}>
                              Ver <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards mobile */}
              <div className="mt-6 grid gap-3 md:hidden">
                {suppliers.map((s, i) => (
                  <Card key={s.company_id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{i + 1}º lugar</div>
                        <Link
                          to="/empresa/$slug"
                          params={{ slug: s.slug }}
                          className="mt-0.5 block truncate text-base font-semibold"
                        >
                          {s.name}
                        </Link>
                        {s.city && s.state && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {s.city}/{s.state}
                          </p>
                        )}
                      </div>
                      <PlanBadge plan={s.plan as "free" | "pro" | "premium"} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Produtos</div>
                        <div className="mt-0.5 flex items-center gap-1 font-medium">
                          <Package className="h-3 w-3" />
                          {s.product_count}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avaliação</div>
                        <div className="mt-0.5 flex items-center gap-1 font-medium">
                          {s.review_count > 0 ? (
                            <>
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {Number(s.avg_rating).toFixed(1)}
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Desde</div>
                        <div className="mt-0.5 font-medium">
                          {s.min_price
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                                maximumFractionDigits: 0,
                              }).format(Number(s.min_price))
                            : "Consulta"}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="mt-8">
            <Button asChild variant="outline">
              <Link to="/categoria/$slug" params={{ slug }}>
                Ver todos os produtos de {cat?.name}
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
