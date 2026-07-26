/**
 * Etapa 29 — Performance budget no quality gate.
 *
 * Orçamento de performance é um contrato: cada rota crítica tem um teto de
 * peso de HTML SSR e um conjunto de invariantes de renderização (um único H1,
 * JSON-LD parseável, canonical presente, sem `<script src>` de terceiros
 * bloqueando o parser). Sem esse teto, a degradação acontece por acúmulo —
 * cada feature adiciona "só mais alguns KB" até o LCP quebrar em 3G.
 *
 * O teste roda contra o servidor local (dev), cujo HTML é *maior* que o de
 * produção (inclui runtime do Vite e styles de dev). Portanto o teto abaixo é
 * um teto de dev: se ele passa, produção passa com folga.
 */
import { describe, expect, it } from "vitest";

const BASE = process.env.CRAWL_BASE_URL ?? "http://localhost:8080";

/** Teto de HTML SSR por rota, em bytes (medido em dev, com ~35% de folga). */
const HTML_BUDGET_BYTES = 90_000;

/** Rotas críticas de entrada orgânica. */
const ROUTES = [
  "/",
  "/categorias",
  "/empresas",
  "/buscar",
  "/brindes-por-evento",
  "/brindes-por-publico-alvo",
  "/ofertas",
  "/inusitados",
  "/kits",
];

/** Hosts cujo script pode entrar no HTML inicial (mesma origem / bundler). */
function isFirstParty(src: string): boolean {
  return src.startsWith("/") || src.startsWith("./") || src.startsWith(BASE);
}

async function load(path: string): Promise<{ status: number; html: string; bytes: number }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": "lovable-perf-budget/1.0" },
  });
  const buf = await res.arrayBuffer();
  return { status: res.status, html: new TextDecoder().decode(buf), bytes: buf.byteLength };
}

describe("orçamento de performance das rotas críticas", () => {
  for (const path of ROUTES) {
    it(`${path} respeita o budget e as invariantes de render`, async () => {
      const { status, html, bytes } = await load(path);

      // 1. A rota precisa responder direto, sem redirect intermediário.
      expect(status, `${path} deveria responder 200`).toBe(200);

      // 2. Teto de peso do documento.
      expect(bytes, `${path} excedeu o budget de HTML (${bytes} bytes)`).toBeLessThanOrEqual(
        HTML_BUDGET_BYTES,
      );

      // 3. Exatamente um H1 — hierarquia semântica e sinal de tópico único.
      const h1 = html.match(/<h1[\s>]/g) ?? [];
      expect(h1.length, `${path} deve ter exatamente um <h1>`).toBe(1);

      // 4. Canonical e description presentes (evita canibalização/duplicidade).
      expect(html, `${path} sem canonical`).toContain('rel="canonical"');
      expect(html, `${path} sem meta description`).toMatch(/name="description"/);

      // 5. Todo JSON-LD embutido precisa ser JSON válido — schema quebrado é
      //    pior que schema ausente (o Google desconfia do domínio inteiro).
      const blocks = [
        ...html.matchAll(
          /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
        ),
      ].map((m) => m[1]);
      expect(blocks.length, `${path} sem dados estruturados`).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(() => JSON.parse(block) as unknown, `${path} JSON-LD inválido`).not.toThrow();
      }

      // 6. Nenhum script de terceiro render-blocking no HTML inicial.
      const blocking = [...html.matchAll(/<script\b([^>]*)>/g)]
        .map((m) => m[1])
        .filter((attrs) => /\ssrc=/.test(attrs))
        .filter((attrs) => !/\b(async|defer|type="module")/.test(attrs))
        .map((attrs) => /src="([^"]+)"/.exec(attrs)?.[1] ?? "")
        .filter((src) => src && !isFirstParty(src));
      expect(blocking, `${path} tem script de terceiro bloqueante`).toEqual([]);
    }, 30_000);
  }
});
