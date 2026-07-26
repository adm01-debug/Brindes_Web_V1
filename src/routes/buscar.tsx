import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useCallback } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { ProductCardSkeleton } from "@/components/product-card-skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, ChevronLeft, ChevronRight, X, History } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchFacetFilter, MAX_SEARCH_FACETS } from "@/components/search-facet-filter";

/**
 * Todos os filtros são OPCIONAIS na URL. Aplicar `.default()` aqui faria o
 * router reescrever `/buscar` para `/buscar?q=&categoria=...` via redirect 307,
 * poluindo o histórico, divergindo do canonical e custando um round-trip extra.
 * Os padrões são aplicados em memória por `normalizeSearch`.
 */
const searchSchema = z.object({
  q: fallback(z.string(), "").optional(),
  categoria: fallback(z.string(), "").optional(),
  ordenar: fallback(z.string(), "relevance").optional(),
  min: fallback(z.number(), 0).optional(),
  max: fallback(z.number(), 0).optional(),
  material: fallback(z.string(), "").optional(),
  cor: fallback(z.string(), "").optional(),
  moq: fallback(z.number().int(), 0).optional(),
  prazo: fallback(z.number().int(), 0).optional(),
  uf: fallback(z.string(), "").optional(),
  video: fallback(z.boolean(), false).optional(),
  /** Slugs de vitrines (facetas) separados por vírgula. Ex.: "canecas,formatura". */
  facetas: fallback(z.string(), "").optional(),
  page: fallback(z.number().int(), 1).optional(),
});

type RawSearch = z.infer<typeof searchSchema>;

/** Valores considerados "vazios": nunca são serializados na URL. */
const SEARCH_DEFAULTS = {
  q: "",
  categoria: "",
  ordenar: "relevance",
  min: 0,
  max: 0,
  material: "",
  cor: "",
  moq: 0,
  prazo: 0,
  uf: "",
  video: false,
  facetas: "",
  page: 1,
} as const;

type SearchState = { -readonly [K in keyof typeof SEARCH_DEFAULTS]: (typeof SEARCH_DEFAULTS)[K] extends boolean
  ? boolean
  : (typeof SEARCH_DEFAULTS)[K] extends number
    ? number
    : string };

/** Preenche os padrões para que o componente trabalhe sempre com valores concretos. */
function normalizeSearch(raw: RawSearch): SearchState {
  const out = { ...SEARCH_DEFAULTS } as SearchState;
  for (const key of Object.keys(SEARCH_DEFAULTS) as (keyof SearchState)[]) {
    const value = raw[key];
    if (value !== undefined && value !== null) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

/** Remove da URL tudo que é igual ao padrão, mantendo links curtos e canônicos. */
function stripDefaults(state: SearchState): RawSearch {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(SEARCH_DEFAULTS) as (keyof SearchState)[]) {
    if (state[key] !== SEARCH_DEFAULTS[key]) out[key] = state[key];
  }
  return out as RawSearch;
}

/** Converte o parâmetro CSV da URL em lista de slugs limpa e sem duplicatas. */
function parseFacets(csv: string): string[] {
  return Array.from(
    new Set(
      csv
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0),
    ),
  ).slice(0, MAX_SEARCH_FACETS);
}



const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const PAGE_SIZE = 24;

const RECENT_KEY = "brindeshub:recent-searches";
const MAX_RECENT = 8;

const BUSCAR_URL = "https://brinde-gallery.lovable.app/buscar";

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Buscar brindes personalizados — BrindesHub" },
      {
        name: "description",
        content:
          "Encontre brindes personalizados por nome, categoria, preço ou empresa. Busca tolerante a acentos e erros de digitação.",
      },
      { property: "og:title", content: "Buscar brindes personalizados — BrindesHub" },
      {
        property: "og:description",
        content: "Catálogo completo de brindes corporativos com filtros por categoria, preço e mais.",
      },
      { property: "og:url", content: BUSCAR_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Buscar brindes personalizados — BrindesHub" },
      { name: "twitter:description", content: "Catálogo completo de brindes corporativos com filtros." },
    ],
    links: [{ rel: "canonical", href: BUSCAR_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SearchResultsPage",
          name: "Buscar brindes personalizados",
          url: BUSCAR_URL,
          isPartOf: { "@id": "https://brinde-gallery.lovable.app/#website" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: "https://brinde-gallery.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Buscar", item: BUSCAR_URL },
          ],
        }),
      },
    ],
  }),
  component: SearchPage,
});

type RpcRow = {
  id: string;
  name: string;
  slug: string | null;
  short_description: string | null;
  price: number | null;
  price_on_request: boolean;
  currency: string;
  views_count: number;
  created_at: string;
  company_id: string;
  company_slug: string;
  company_name: string;
  category_slug: string | null;
  category_name: string | null;
  primary_image_url: string | null;
  promo_price: number | null;
  is_clearance: boolean | null;
  is_unusual: boolean | null;
  video_url: string | null;
  total_count: number;
};

function SearchPage() {
  const rawSearch = Route.useSearch();
  const search = useMemo(() => normalizeSearch(rawSearch), [rawSearch]);
  const navigate = Route.useNavigate();
  /** Navega mantendo a URL enxuta: aplica o patch e remove valores padrão. */
  const applySearch = useCallback(
    (patch: Partial<SearchState>) => {
      navigate({
        search: (prev: RawSearch) => stripDefaults({ ...normalizeSearch(prev), ...patch }),
      });
    },
    [navigate],
  );

  const [term, setTerm] = useState(search.q);
  const [priceMin, setPriceMin] = useState(search.min ? String(search.min) : "");
  const [priceMax, setPriceMax] = useState(search.max ? String(search.max) : "");
  const [material, setMaterial] = useState(search.material);
  const [cor, setCor] = useState(search.cor);
  const [moq, setMoq] = useState(search.moq ? String(search.moq) : "");
  const [prazo, setPrazo] = useState(search.prazo ? String(search.prazo) : "");
  const [recent, setRecent] = useState<string[]>([]);

  // Buscas recentes: lidas apenas no cliente (evita mismatch de hidratação).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setRecent(parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENT));
      }
    } catch {
      /* storage indisponível/corrompido: degrada silenciosamente */
    }
  }, []);

  const pushRecent = useCallback((raw: string) => {
    const value = raw.trim().slice(0, 80);
    if (value.length < 2) return;
    setRecent((prev) => {
      const next = [value, ...prev.filter((v) => v.toLowerCase() !== value.toLowerCase())].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* quota cheia: mantém apenas em memória */
      }
      return next;
    });
  }, []);

  const clearRecent = () => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* noop */
    }
  };

  const { data: categories } = useQuery({
    queryKey: ["all-categories-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  /** Facetas normalizadas a partir da URL (fonte única para query e UI). */
  const selectedFacets = useMemo(() => parseFacets(search.facetas), [search.facetas]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "search-products-rpc",
      search.q,
      search.categoria,
      search.ordenar,
      search.min,
      search.max,
      search.material,
      search.cor,
      search.moq,
      search.prazo,
      search.uf,
      search.video,
      selectedFacets.join(","),
      search.page,
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_products", {
        _q: search.q || undefined,
        _category_slug: search.categoria || undefined,
        _price_min: search.min > 0 ? search.min : undefined,
        _price_max: search.max > 0 ? search.max : undefined,
        _sort: search.ordenar,
        _page: search.page,
        _page_size: PAGE_SIZE,
        _material: search.material || undefined,
        _color: search.cor || undefined,
        _max_moq: search.moq > 0 ? search.moq : undefined,
        _max_days: search.prazo > 0 ? search.prazo : undefined,
        _state: search.uf || undefined,
        _has_video: search.video ? true : undefined,
        _facets: selectedFacets.length > 0 ? selectedFacets : undefined,
      });
      if (error) throw error;
      return (data ?? []) as RpcRow[];
    },
  });

  const total = data?.[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));

  const isEmptyResult = !isLoading && Array.isArray(data) && data.length === 0;

  /** Sugestões alternativas exibidas apenas quando a busca não retorna nada. */
  const { data: fallbackSuggestions } = useQuery({
    queryKey: ["search-empty-suggestions", search.q],
    enabled: isEmptyResult && search.q.trim().length >= 2,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("suggest_search_terms", {
        _q: search.q.trim(),
        _limit: 6,
      });
      if (error) return [];
      return data ?? [];
    },
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushRecent(term);
    applySearch({
      q: term,
      min: priceMin ? Number(priceMin) : 0,
      max: priceMax ? Number(priceMax) : 0,
      material,
      cor,
      moq: moq ? Number(moq) : 0,
      prazo: prazo ? Number(prazo) : 0,
      page: 1,
    });
  };

  const clearAll = () => {
    setTerm(""); setPriceMin(""); setPriceMax(""); setMaterial(""); setCor(""); setMoq(""); setPrazo("");
    navigate({ search: () => ({}) });
  };

  const setFilter = <K extends keyof SearchState>(key: K, value: SearchState[K]) => {
    applySearch({ [key]: value, page: 1 } as Partial<SearchState>);
  };

  /** Aplica a nova seleção de vitrines na URL (fonte de verdade do filtro). */
  const setFacets = useCallback(
    (next: string[]) => {
      applySearch({ facetas: parseFacets(next.join(",")).join(","), page: 1 });
    },
    [applySearch],
  );


  /** Rótulos legíveis das vitrines selecionadas (para os chips de filtros ativos). */
  const { data: facetLabels } = useQuery({
    queryKey: ["search-facet-labels", selectedFacets.join(",")],
    enabled: selectedFacets.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facet_terms")
        .select("slug, name")
        .in("slug", selectedFacets);
      if (error) return {} as Record<string, string>;
      return Object.fromEntries((data ?? []).map((t) => [t.slug, t.name])) as Record<string, string>;
    },
  });

  /** Chips de filtros ativos: label legível + ação de remoção (URL + estado local). */
  const activeChips = useMemo(() => {
    const categoryName = categories?.find((c) => c.slug === search.categoria)?.name ?? search.categoria;
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];

    if (search.q) chips.push({ key: "q", label: `Termo: "${search.q}"`, clear: () => { setTerm(""); setFilter("q", ""); } });
    if (search.categoria) chips.push({ key: "categoria", label: `Categoria: ${categoryName}`, clear: () => setFilter("categoria", "") });
    if (search.min > 0) chips.push({ key: "min", label: `Mín: R$ ${search.min}`, clear: () => { setPriceMin(""); setFilter("min", 0); } });
    if (search.max > 0) chips.push({ key: "max", label: `Máx: R$ ${search.max}`, clear: () => { setPriceMax(""); setFilter("max", 0); } });
    if (search.material) chips.push({ key: "material", label: `Material: ${search.material}`, clear: () => { setMaterial(""); setFilter("material", ""); } });
    if (search.cor) chips.push({ key: "cor", label: `Cor: ${search.cor}`, clear: () => { setCor(""); setFilter("cor", ""); } });
    if (search.moq > 0) chips.push({ key: "moq", label: `Pedido até ${search.moq} un.`, clear: () => { setMoq(""); setFilter("moq", 0); } });
    if (search.prazo > 0) chips.push({ key: "prazo", label: `Prazo até ${search.prazo} dias`, clear: () => { setPrazo(""); setFilter("prazo", 0); } });
    if (search.uf) chips.push({ key: "uf", label: `Estado: ${search.uf}`, clear: () => setFilter("uf", "") });
    if (search.video) chips.push({ key: "video", label: "Somente com vídeo", clear: () => setFilter("video", false) });
    for (const slug of selectedFacets) {
      chips.push({
        key: `faceta:${slug}`,
        label: `Vitrine: ${facetLabels?.[slug] ?? slug}`,
        clear: () => setFacets(selectedFacets.filter((s) => s !== slug)),
      });
    }

    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categories, selectedFacets, facetLabels]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="conteudo" className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight">Buscar produtos</h1>

          <form onSubmit={submitSearch} className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
            <SearchAutocomplete
              value={term}
              onValueChange={setTerm}
              onSubmitTerm={(t) => {
                pushRecent(t);
                setFilter("q", t);
              }}
            />
            <Input
              type="number"
              inputMode="decimal"
              placeholder="R$ mín"
              className="md:w-28"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              aria-label="Preço mínimo"
            />
            <Input
              type="number"
              inputMode="decimal"
              placeholder="R$ máx"
              className="md:w-28"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              aria-label="Preço máximo"
            />
            <Button type="submit">Buscar</Button>
          </form>

          <details className="mt-4 rounded-lg border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">Filtros avançados</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                placeholder="Material (ex: algodão)"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                aria-label="Material"
              />
              <Input
                placeholder="Cor (ex: azul)"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                aria-label="Cor"
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Aceito pedir a partir de"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                aria-label="Quantidade mínima máxima que aceito"
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Prazo máx (dias)"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                aria-label="Prazo de produção máximo em dias"
              />
              <Select
                value={search.uf || "all"}
                onValueChange={(v) => setFilter("uf", v === "all" ? "" : v)}
              >
                <SelectTrigger aria-label="Filtrar por estado (UF)"><SelectValue placeholder="Estado (UF)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <Checkbox
                  checked={search.video}
                  onCheckedChange={(v) => setFilter("video", v === true)}
                  aria-label="Somente produtos com vídeo"
                />
                Somente com vídeo
              </label>
            </div>
            <div className="mt-5 border-t pt-4">
              <p className="mb-3 text-sm font-medium">Vitrines (evento, público, tipo e datas)</p>
              <SearchFacetFilter selected={selectedFacets} onChange={setFacets} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" onClick={(e) => submitSearch(e as unknown as React.FormEvent)}>
                Aplicar filtros
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
                Limpar tudo
              </Button>
            </div>
          </details>

          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remover filtro ${chip.label}`}
                >
                  {chip.label}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
                Limpar tudo
              </Button>
            </div>
          )}

          {recent.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Buscas recentes">
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <History className="h-3.5 w-3.5" aria-hidden="true" /> Recentes:
              </span>
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setTerm(r); pushRecent(r); setFilter("q", r); }}
                  className="rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {r}
                </button>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={clearRecent}>
                Limpar histórico
              </Button>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select
                value={search.categoria || "all"}
                onValueChange={(v) => setFilter("categoria", v === "all" ? "" : v)}
              >
                <SelectTrigger className="sm:w-64" aria-label="Filtrar por categoria">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={search.ordenar} onValueChange={(v) => setFilter("ordenar", v)}>
                <SelectTrigger className="sm:w-56" aria-label="Ordenar resultados">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Mais relevantes</SelectItem>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                  <SelectItem value="popular">Mais vistos</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                  <SelectItem value="discount">Maior desconto</SelectItem>
                  <SelectItem value="moq_asc">Menor pedido mínimo</SelectItem>
                  <SelectItem value="delivery_asc">Menor prazo de produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              {isLoading ? "Buscando..." : `${total} resultado(s)`}
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading && <ProductCardSkeleton count={8} />}
            {!isLoading &&
              data?.map((p, i) => (
                <ProductCard
                  key={p.id}
                  priority={i < 4}

                  product={{
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    price_on_request: p.price_on_request,
                    short_description: p.short_description,
                    company: {
                      id: p.company_id,
                      slug: p.company_slug,
                      name: p.company_name,
                    },
                    promo_price: p.promo_price,
                    is_clearance: p.is_clearance,
                    is_unusual: p.is_unusual,
                    video_url: p.video_url,
                    images: p.primary_image_url
                      ? [{ url: p.primary_image_url, sort_order: 0 }]
                      : [],
                  }}
                />
              ))}
            {isEmptyResult && (
              <div className="col-span-full rounded-lg border border-dashed px-4 py-12 text-center">
                <Package className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">Nenhum produto encontrado.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tente outros termos, remova filtros ou explore as sugestões abaixo.
                </p>

                {activeChips.filter((c) => c.key !== "q").length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setPriceMin(""); setPriceMax(""); setMaterial(""); setCor(""); setMoq(""); setPrazo("");
                      applySearch({
                        categoria: "", min: 0, max: 0, material: "", cor: "",
                        moq: 0, prazo: 0, uf: "", video: false, page: 1,
                      });

                    }}
                  >
                    Buscar apenas pelo termo (remover filtros)
                  </Button>
                )}

                {fallbackSuggestions && fallbackSuggestions.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-medium text-muted-foreground">Você quis dizer:</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {fallbackSuggestions.map((sug) => (
                        <Link
                          key={`${sug.kind}-${sug.slug}`}
                          to={
                            sug.kind === "product"
                              ? "/produto/$id"
                              : sug.kind === "company"
                                ? "/empresa/$slug"
                                : "/categoria/$slug"
                          }
                          params={(sug.kind === "product" ? { id: sug.slug } : { slug: sug.slug }) as never}
                          className="rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {sug.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {categories && categories.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-medium text-muted-foreground">Explore categorias:</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {categories.slice(0, 8).map((c) => (
                        <Link
                          key={c.id}
                          to="/categoria/$slug"
                          params={{ slug: c.slug }}
                          className="rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={search.page <= 1 || isFetching}
                onClick={() => setFilter("page", Math.max(1, search.page - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {search.page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={search.page >= totalPages || isFetching}
                onClick={() => setFilter("page", Math.min(totalPages, search.page + 1))}
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
