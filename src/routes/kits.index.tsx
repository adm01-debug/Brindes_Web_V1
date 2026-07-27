import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

const SITE_URL = "https://brinde-gallery.lovable.app";
const KITS_URL = `${SITE_URL}/kits`;

export const Route = createFileRoute("/kits/")({
  head: () => ({
    meta: [
      { title: "Kits temáticos de brindes personalizados — BrindesHub" },
      {
        name: "description",
        content:
          "Kits curatoriais de brindes corporativos prontos para orçamento: boas-vindas, eventos, sustentáveis e fim de ano.",
      },
      { property: "og:title", content: "Kits temáticos de brindes personalizados — BrindesHub" },
      {
        property: "og:description",
        content: "Combinações curatoriais de brindes corporativos prontas para orçamento.",
      },
      { property: "og:url", content: KITS_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Kits temáticos — BrindesHub" },
      { name: "twitter:description", content: "Kits curatoriais prontos para orçamento." },
    ],
    links: [{ rel: "canonical", href: KITS_URL }],
  }),
  component: KitsListPage,
});

type KitRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  cover_url: string | null;
  sort_order: number;
};

function KitsListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["kits-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kits")
        .select("id, slug, name, tagline, cover_url, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as KitRow[];
    },
    staleTime: 60_000,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Curadoria BrindesHub
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Kits temáticos</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Combinações prontas para você acelerar decisões. Adicione o kit inteiro ao orçamento com um clique.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-lg bg-muted" />
              ))}
            {!isLoading &&
              data?.map((k) => (
                <Link key={k.id} to="/kit/$slug" params={{ slug: k.slug }} className="group">
                  <Card className="h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
                    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-muted">
                      {k.cover_url && (
                        <img
                          src={k.cover_url}
                          alt={k.name}
                          width={640}
                          height={360}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      )}
                      {!k.cover_url && (
                        <div className="flex h-full w-full items-center justify-center text-primary/40">
                          <Sparkles className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h2 className="text-lg font-semibold group-hover:text-primary">{k.name}</h2>
                      {k.tagline && <p className="mt-1 text-sm text-muted-foreground">{k.tagline}</p>}
                      <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Ver kit <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            {!isLoading && data && data.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                Nenhum kit disponível no momento.
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
