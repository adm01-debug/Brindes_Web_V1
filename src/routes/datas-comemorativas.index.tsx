import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, ArrowRight } from "lucide-react";

const SITE_URL = "https://brinde-gallery.lovable.app";
const TITLE = "Brindes por Data Comemorativa | BrindesHub";
const DESCRIPTION =
  "Natal, Dia das Mães, Dia do Cliente, Black Friday e mais: encontre brindes corporativos ideais para cada data comemorativa do calendário.";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export type CommemorativeDate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  month: number | null;
  day: number | null;
  keywords: string[] | null;
};

export const datesQueryOptions = queryOptions({
  queryKey: ["commemorative-dates"],
  queryFn: async (): Promise<CommemorativeDate[]> => {
    const { data, error } = await supabase
      .from("commemorative_dates")
      .select("id, slug, name, description, month, day, keywords")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export function formatDateLabel(month: number | null, day: number | null): string | null {
  if (!month) return null;
  const m = MONTHS[month - 1];
  if (!m) return null;
  return day ? `${day} de ${m}` : m;
}

export const Route = createFileRoute("/datas-comemorativas/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(datesQueryOptions);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/datas-comemorativas` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/datas-comemorativas` }],
  }),
  component: DatesHubPage,
});

function DatesHubPage() {
  const { data: dates } = useSuspenseQuery(datesQueryOptions);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" items={[{ label: "Datas comemorativas" }]} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Brindes por data comemorativa
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Planeje suas campanhas do ano inteiro. Selecionamos brindes corporativos para cada
              data importante do calendário brasileiro.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dates.map((d) => {
              const label = formatDateLabel(d.month, d.day);
              return (
                <Link key={d.id} to="/datas-comemorativas/$slug" params={{ slug: d.slug }}>
                  <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md">
                    <CardContent className="flex gap-4 p-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold group-hover:text-primary">{d.name}</h2>
                        {label && (
                          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                        )}
                        {d.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {d.description}
                          </p>
                        )}
                        <span className="mt-3 inline-flex items-center text-sm font-medium text-primary">
                          Ver brindes <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          {dates.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhuma data cadastrada no momento.
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
