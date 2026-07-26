import { describe, expect, it } from "vitest";
import { facetHubHead, facetTermHead } from "@/lib/facet-seo";
import type { FacetTerm } from "@/lib/facets";

const term = {
  id: "t1",
  slug: "dia-das-maes",
  name: "Dia das Mães",
  seo_title: null,
  seo_description: null,
  description: null,
} as unknown as FacetTerm;

const meta = (h: ReturnType<typeof facetTermHead>, key: string) =>
  (h.meta as unknown as Array<Record<string, string | undefined>>).find(
    (m) => m.name === key || m.property === key,
  );

const links = (h: ReturnType<typeof facetTermHead>) =>
  (h.links ?? []) as Array<{ rel: string; href: string }>;

describe("facetTermHead", () => {
  it("marca noindex quando o termo não existe (evita indexar 404 macio)", () => {
    const h = facetTermHead({
      term: null,
      slug: "inexistente",
      hubPath: "/brindes-por-data",
      hubLabel: "Datas",
      fallbackTitle: "Vitrine não encontrada",
    });
    expect(meta(h, "robots")?.content).toBe("noindex");
    expect(h.links).toBeUndefined();
  });

  it("canonical aponta para a própria página, sem prev na página 1", () => {
    const h = facetTermHead({
      term,
      slug: term.slug,
      hubPath: "/brindes-por-data",
      hubLabel: "Datas",
      fallbackTitle: "x",
      page: 1,
      pageCount: 3,
    });
    const l = links(h);
    expect(l.find((x) => x.rel === "canonical")?.href).toMatch(/\/brindes-por-data\/dia-das-maes$/);
    expect(l.find((x) => x.rel === "prev")).toBeUndefined();
    expect(l.find((x) => x.rel === "next")?.href).toMatch(/\?page=2$/);
  });

  it("página 2 aponta prev para a URL sem query (não ?page=1)", () => {
    const h = facetTermHead({
      term,
      slug: term.slug,
      hubPath: "/brindes-por-data",
      hubLabel: "Datas",
      fallbackTitle: "x",
      page: 2,
      pageCount: 3,
    });
    const l = links(h);
    expect(l.find((x) => x.rel === "prev")?.href).not.toMatch(/page=1/);
    expect(l.find((x) => x.rel === "canonical")?.href).toMatch(/\?page=2$/);
    expect((h.meta as Array<{ title?: string }>)[0].title).toMatch(/Página 2$/);
  });

  it("última página não emite rel=next", () => {
    const h = facetTermHead({
      term,
      slug: term.slug,
      hubPath: "/brindes-por-data",
      hubLabel: "Datas",
      fallbackTitle: "x",
      page: 3,
      pageCount: 3,
    });
    expect(links(h).find((x) => x.rel === "next")).toBeUndefined();
  });

  it("gera BreadcrumbList e ItemList limitado a 30 produtos", () => {
    const products = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, name: `Produto ${i}` }));
    const h = facetTermHead({
      term,
      slug: term.slug,
      hubPath: "/brindes-por-data",
      hubLabel: "Datas",
      fallbackTitle: "x",
      products,
    });
    const jsonld = (h.scripts ?? []).map((s) => JSON.parse((s as { children: string }).children));
    expect(jsonld[0]["@type"]).toBe("BreadcrumbList");
    expect(jsonld[0].itemListElement).toHaveLength(3);
    expect(jsonld[1]["@type"]).toBe("ItemList");
    expect(jsonld[1].itemListElement).toHaveLength(30);
    expect(jsonld[1].itemListElement[0].position).toBe(1);
  });

  it("prioriza seo_title/seo_description do banco", () => {
    const custom = { ...term, seo_title: "Título Custom", seo_description: "Desc custom" } as FacetTerm;
    const h = facetTermHead({
      term: custom,
      slug: term.slug,
      hubPath: "/brindes-por-data",
      hubLabel: "Datas",
      fallbackTitle: "x",
    });
    expect((h.meta as Array<{ title?: string }>)[0].title).toBe("Título Custom");
    expect(meta(h, "description")?.content).toBe("Desc custom");
  });
});

describe("facetHubHead", () => {
  it("omite ItemList quando não há vitrines publicadas", () => {
    const h = facetHubHead({
      hubPath: "/brindes-por-evento",
      title: "T",
      description: "D",
      heading: "Eventos",
    });
    expect(h.scripts).toHaveLength(1);
  });

  it("inclui ItemList com URLs absolutas das vitrines", () => {
    const h = facetHubHead({
      hubPath: "/brindes-por-evento",
      title: "T",
      description: "D",
      heading: "Eventos",
      terms: [{ slug: "feiras", name: "Feiras" }],
    });
    const itemList = JSON.parse((h.scripts![1] as { children: string }).children);
    expect(itemList.itemListElement[0].url).toBe(
      "https://brinde-gallery.lovable.app/brindes-por-evento/feiras",
    );
  });
});
