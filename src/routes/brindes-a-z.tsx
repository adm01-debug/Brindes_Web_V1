import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const SITE_URL = "https://brinde-gallery.lovable.app";
const TITLE = "Brindes de A a Z | Índice completo de brindes corporativos";
const DESCRIPTION =
  "Índice alfabético completo de brindes corporativos e personalizados: encontre rapidamente o produto ou a categoria que você procura, de A a Z.";

/** Letras exibidas no índice. `#` agrupa itens que começam com número ou símbolo. */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const OTHER = "#";

export interface IndexItem {
  readonly kind: "product" | "category";
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

/** Normaliza para comparação: remove acentos, caixa e espaços nas pontas. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/** Retorna a letra de agrupamento (A-Z) ou `#` quando não é uma letra latina. */
function bucketOf(name: string): string {
  const first = normalize(name).charAt(0).toUpperCase();
  return LETTERS.includes(first) ? first : OTHER;
}

const azQueryOptions = queryOptions({
  queryKey: ["brindes-a-z"],
  queryFn: async (): Promise<IndexItem[]> => {
    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug")
        .eq("is_active", true)
        .is("deleted_at", null)
        .eq("moderation_status", "approved")
        .order("name", { ascending: true })
        .limit(3000),
      supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(500),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;

    const items: IndexItem[] = [
      ...(categoriesRes.data ?? []).map((c) => ({
        kind: "category" as const,
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
      ...(productsRes.data ?? []).map((p) => ({
        kind: "product" as const,
        id: p.id,
        name: p.name,
        slug: p.slug ?? p.id,
      })),
    ];

    return items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },
});

export const Route = createFileRoute("/brindes-a-z")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(azQueryOptions);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/brindes-a-z` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/brindes-a-z` }],
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
              name: "Brindes de A a Z",
              item: `${SITE_URL}/brindes-a-z`,
            },
          ],
        }),
      },
    ],
  }),
  component: BrindesAZPage,
});

function BrindesAZPage() {
  const { data: items } = useSuspenseQuery(azQueryOptions);
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(term);
    if (!q) return items;
    return items.filter((i) => normalize(i.name).includes(q));
  }, [items, term]);

  const groups = useMemo(() => {
    const map = new Map<string, IndexItem[]>();
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
        <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Breadcrumbs className="mb-4" items={[{ label: "Brindes de A a Z" }]} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Brindes de A a Z</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Índice alfabético com {items.length.toLocaleString("pt-BR")} categorias e brindes
              corporativos. Navegue pela letra ou busque diretamente pelo nome.
            </p>

            <div className="relative mt-6 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Filtrar no índice (ex.: caneca, mochila...)"
                aria-label="Filtrar itens do índice alfabético"
                className="pl-9"
              />
            </div>
          </div>
        </section>

        <nav
          aria-label="Navegação alfabética"
          className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 py-3 sm:px-6 lg:px-8">
            {[...LETTERS, OTHER].map((letter) => {
              const enabled = activeLetters.includes(letter);
              return enabled ? (
                <a
                  key={letter}
                  href={`#letra-${letter === OTHER ? "outros" : letter}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              Nenhum item encontrado para “{term}”.
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
                      {groups.get(letter)?.length} itens
                    </span>
                  </h2>
                  <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.get(letter)?.map((item) => (
                      <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2">
                        {item.kind === "category" ? (
                          <Link
                            to="/categoria/$slug"
                            params={{ slug: item.slug }}
                            className="truncate text-sm font-medium hover:text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <Link
                            to="/produto/$id"
                            params={{ id: item.id }}
                            className="truncate text-sm text-muted-foreground hover:text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                        )}
                        {item.kind === "category" && (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            categoria
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
