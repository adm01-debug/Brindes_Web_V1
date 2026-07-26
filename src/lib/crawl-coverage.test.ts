/**
 * Monitoramento de cobertura de crawl.
 *
 * O sitemap é uma promessa ao Google: "estas URLs existem e valem indexação".
 * Quebrar essa promessa (404, 500, ou `noindex` numa URL listada) queima
 * orçamento de rastreio e derruba a confiança do crawler no arquivo inteiro.
 *
 * Este teste percorre o sitemapindex -> sitemaps filhos -> amostra de URLs,
 * reescreve o host público para o servidor local e valida cada resposta.
 * É amostral por desenho: o objetivo é detectar regressão de rota/render, não
 * varrer o catálogo inteiro a cada commit.
 */
import { describe, expect, it } from "vitest";

const BASE = process.env.CRAWL_BASE_URL ?? "http://localhost:8080";
/** Quantas URLs checar por sitemap filho. */
const SAMPLE_PER_SITEMAP = 4;

function extract(tag: "loc", xml: string): string[] {
  const re = new RegExp(`<${tag}>([^<]+)</${tag}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[1].trim());
}

/** Converte a URL canônica pública para o host sob teste. */
function toLocal(url: string): string {
  try {
    const u = new URL(url);
    return `${BASE}${u.pathname}${u.search}`;
  } catch {
    return `${BASE}${url}`;
  }
}

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { headers: { "user-agent": "lovable-crawl-coverage/1.0" } });
  return { status: res.status, text: await res.text() };
}

/** Amostra determinística (primeiras N) para manter o ETag/cache previsível. */
function sample<T>(items: T[], n: number): T[] {
  return items.slice(0, n);
}

describe("Cobertura de crawl — sitemap x rotas reais", () => {
  it("índice de sitemaps é XML válido e aponta para filhos acessíveis", async () => {
    const index = await fetchText(`${BASE}/sitemap.xml`);
    expect(index.status).toBe(200);
    expect(index.text).toContain("<sitemapindex");

    const children = extract("loc", index.text);
    expect(children.length).toBeGreaterThan(0);

    for (const child of children) {
      const res = await fetchText(toLocal(child));
      expect(res.status, `${child} deveria responder 200`).toBe(200);
      expect(res.text, `${child} deveria ser um urlset`).toContain("<urlset");
    }
  }, 120_000);

  it("URLs listadas renderizam sem erro e sem noindex", async () => {
    const index = await fetchText(`${BASE}/sitemap.xml`);
    const children = extract("loc", index.text);

    const failures: string[] = [];

    for (const child of children) {
      const childXml = await fetchText(toLocal(child));
      const urls = sample(extract("loc", childXml.text), SAMPLE_PER_SITEMAP);

      for (const url of urls) {
        const page = await fetchText(toLocal(url));
        if (page.status !== 200) {
          failures.push(`${url} -> HTTP ${page.status}`);
          continue;
        }
        // Uma URL no sitemap marcada como noindex é sinal contraditório para o crawler.
        if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(page.text)) {
          failures.push(`${url} -> listada no sitemap mas marcada noindex`);
        }
      }
    }

    expect(failures, `Falhas de cobertura:\n${failures.join("\n")}`).toEqual([]);
  }, 180_000);

  it("não lista URLs duplicadas entre os sitemaps filhos", async () => {
    const index = await fetchText(`${BASE}/sitemap.xml`);
    const children = extract("loc", index.text);

    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const child of children) {
      const childXml = await fetchText(toLocal(child));
      for (const url of extract("loc", childXml.text)) {
        const prev = seen.get(url);
        if (prev && prev !== child) duplicates.push(`${url} (em ${prev} e ${child})`);
        else seen.set(url, child);
      }
    }

    expect(duplicates, `URLs duplicadas:\n${duplicates.join("\n")}`).toEqual([]);
  }, 180_000);

  it("respeita robots.txt — nada listado no sitemap está bloqueado", async () => {
    const robots = await fetchText(`${BASE}/robots.txt`);
    expect(robots.status).toBe(200);

    const disallowed = robots.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^disallow:/i.test(l))
      .map((l) => l.replace(/^disallow:\s*/i, "").trim())
      .filter((p) => p.length > 1);

    const index = await fetchText(`${BASE}/sitemap.xml`);
    const children = extract("loc", index.text);

    const conflicts: string[] = [];
    for (const child of children) {
      const childXml = await fetchText(toLocal(child));
      for (const url of sample(extract("loc", childXml.text), SAMPLE_PER_SITEMAP)) {
        const path = new URL(toLocal(url)).pathname;
        for (const rule of disallowed) {
          if (path.startsWith(rule)) conflicts.push(`${path} bloqueado por "Disallow: ${rule}"`);
        }
      }
    }

    expect(conflicts, `Conflitos sitemap/robots:\n${conflicts.join("\n")}`).toEqual([]);
  }, 180_000);
});
