import { describe, expect, it } from "vitest";

/**
 * Contrato de preload de imagem.
 *
 * Um `<link rel="preload" as="image">` só acelera o LCP quando a URL é
 * BYTE-A-BYTE a mesma usada pelo `src`/`srcset` da imagem. Qualquer divergência
 * (um `?w=` a mais, um host absoluto em vez de relativo) transforma o preload
 * em download duplicado: pior do que não ter preload nenhum.
 *
 * Estes testes rodam contra o HTML de SSR real — o único lugar onde a
 * divergência aparece.
 */

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:8080";

const LINK_TAG = /<link\b[^>]*>/gi;
const IMG_TAG = /<img\b[^>]*>/gi;

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return match ? decodeHtml(match[1]) : null;
}

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
}

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "text/html" } });
  expect(res.status, `${path} deve responder 200`).toBe(200);
  return await res.text();
}

/** Todas as URLs de imagem realmente referenciadas pelo documento. */
function imageSources(html: string): Set<string> {
  const sources = new Set<string>();
  for (const tag of html.match(IMG_TAG) ?? []) {
    const src = attr(tag, "src");
    if (src) sources.add(src);
    const srcSet = attr(tag, "srcset");
    if (srcSet) {
      for (const candidate of srcSet.split(",")) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url) sources.add(url);
      }
    }
  }
  return sources;
}

function imagePreloads(html: string): string[] {
  return (html.match(LINK_TAG) ?? [])
    .filter((tag) => attr(tag, "rel") === "preload" && attr(tag, "as") === "image")
    .map((tag) => attr(tag, "href"))
    .filter((href): href is string => !!href);
}

/**
 * Descobre uma rota de detalhe real a partir do sitemap — evita hardcodar IDs
 * que somem quando o catálogo muda.
 */
async function firstUrlFrom(sitemapPath: string): Promise<string | null> {
  const res = await fetch(`${BASE}${sitemapPath}`);
  if (!res.ok) return null;
  const xml = await res.text();
  const match = xml.match(/<loc>([^<]+)<\/loc>/);
  if (!match) return null;
  return new URL(match[1]).pathname;
}

describe("Contrato de preload de imagem (LCP)", () => {
  it("home não desperdiça preload em imagem ausente do documento", async () => {
    const html = await fetchHtml("/");
    const sources = imageSources(html);
    for (const href of imagePreloads(html)) {
      expect(sources, `preload sem <img> correspondente: ${href}`).toContain(href);
    }
  });

  it("página de produto pré-carrega exatamente a URL renderizada", async () => {
    const path = await firstUrlFrom("/sitemap-produtos.1.xml");
    if (!path) return; // catálogo vazio: nada a validar.
    const html = await fetchHtml(path);
    const sources = imageSources(html);
    for (const href of imagePreloads(html)) {
      expect(sources, `preload divergente em ${path}: ${href}`).toContain(href);
    }
  });

  it("página de empresa pré-carrega exatamente a URL renderizada", async () => {
    const path = await firstUrlFrom("/sitemap-empresas.xml");
    if (!path) return;
    const html = await fetchHtml(path);
    const sources = imageSources(html);
    for (const href of imagePreloads(html)) {
      expect(sources, `preload divergente em ${path}: ${href}`).toContain(href);
    }
  });

  it("abre conexão antecipada com o host de storage", async () => {
    const html = await fetchHtml("/");
    const preconnects = (html.match(LINK_TAG) ?? []).filter(
      (tag) => attr(tag, "rel") === "preconnect",
    );
    const hosts = preconnects.map((tag) => attr(tag, "href") ?? "");
    expect(hosts.some((h) => h.includes(".supabase.co"))).toBe(true);
  });
});
