import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin } from "lucide-react";

const SITE_URL = "https://brinde-gallery.lovable.app";
const TITLE = "Fornecedores de A a Z | Índice de empresas de brindes";
const DESCRIPTION =
  "Índice alfabético de fornecedores de brindes corporativos e personalizados no Brasil. Encontre empresas por nome, cidade e estado, de A a Z.";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const OTHER = "#";

export interface CompanyIndexItem {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly city: string | null;
  readonly state: string | null;
  readonly plan: string | null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function bucketOf(name: string): string {
  const first = normalize(name).charAt(0).toUpperCase();
  return LETTERS.includes(first) ? first : OTHER;
}

const companiesAZQueryOptions = queryOptions({
  queryKey: ["empresas-a-z"],
  queryFn: async (): Promise<CompanyIndexItem[]> => {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, slug, city, state, plan")
      .eq("status", "approved")
      .order("name", { ascending: true })
      .limit(3000);

    if (error) throw error;

    return (data ?? [])
      .filter((c): c is CompanyIndexItem => Boolean(c.slug))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },
});

export const Route = createFileRoute("/empresas-a-z")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(companiesAZQueryOptions);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/empresas-a-z` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/empresas-a-z` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: "Fornecedores de A a Z",
              item: `${SITE_URL}/empresas-a-z`,
            },
          ],
        }),
      },
    ],
  }),
  component: EmpresasAZPage,
});

function EmpresasAZPage() {
  const { data: companies } = useSuspenseQuery(companiesAZQueryOptions);
  const [term, setTerm] = useState("");
  const [uf, setUf] = useState<string>("");

  const states = useMemo(
    () =>
      [...new Set(companies.map((c) => c.state).filter((s): s is string => Boolean(s)))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [companies],
  );

  const filtered = useMemo(() => {
    const q = normalize(term);
    return companies.filter((c) => {
      if (uf && c.state !== uf) return false;
      if (!q) return true;
      return normalize(`${c.name} ${c.city ?? ""}`).includes(q);
    });
  }, [companies, term, uf]);

  const groups = useMemo(() => {
    const map = new Map<string, CompanyIndexItem[]>();
    for (const item of filtered) {
      const key = bucketOf(item.name);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [filtered]);

  const activeLetters = [...LETTERS, OTHER].filter((l) => (groups.get(l)?.length ?? 0) > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <section className="border-b bg-gradient-to-br from-accent/10 via-background to-primary/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" items={[{ label: "Fornecedores de A a Z" }]} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Fornecedores de A a Z
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {companies.length.toLocaleString("pt-BR")} empresas de brindes aprovadas, organizadas
              alfabeticamente. Filtre por nome, cidade ou estado.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Buscar fornecedor ou cidade..."
                  aria-label="Filtrar fornecedores por nome ou cidade"
                  className="pl-9"
                />
              </div>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                aria-label="Filtrar por estado"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-40"
              >
                <option value="">Todos os estados</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <nav
          aria-label="Navegação alfabética de fornecedores"
          className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 py-3 sm:px-6 lg:px-8">
            {[...LETTERS, OTHER].map((letter) => {
              const enabled = activeLetters.includes(letter);
              return enabled ? (
                <a
                  key={letter}
                  href={`#letra-${letter === OTHER ? "outros" : letter}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {letter}
                </a>
              ) : (
                <span
                  key={letter}
                  aria-disabled="true"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm text-muted-foreground/40"
                >
                  {letter}
                </span>
              );
            })}
          </div>
        </nav>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {activeLetters.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhum fornecedor encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="space-y-10">
              {activeLetters.map((letter) => (
                <div
                  key={letter}
                  id={`letra-${letter === OTHER ? "outros" : letter}`}
                  className="scroll-mt-20"
                >
                  <h2 className="mb-4 flex items-center gap-3 border-b pb-2 text-2xl font-bold">
                    <span className="text-primary">{letter}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {groups.get(letter)?.length} fornecedores
                    </span>
                  </h2>
                  <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.get(letter)?.map((c) => (
                      <li key={c.id} className="flex items-center gap-2">
                        <Link
                          to="/empresa/$slug"
                          params={{ slug: c.slug }}
                          className="truncate text-sm font-medium hover:text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                        {(c.city || c.state) && (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[c.city, c.state].filter(Boolean).join("/")}
                          </span>
                        )}
                        {c.plan && c.plan !== "free" && (
                          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                            {c.plan}
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
