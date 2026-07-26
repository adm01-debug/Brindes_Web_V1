import { describe, expect, it } from "vitest";

/**
 * Regressão crítica: um erro lançado durante o SSR (ex.: hook exigindo
 * contexto indisponível no servidor) faz o React abortar a árvore e trocar
 * para client-rendering. O HTML fica sem conteúdo indexável, mas a resposta
 * ainda é 200 — falha silenciosa. Este gate detecta o marcador do React.
 */

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:8080";

const ROUTES = [
  "/",
  "/empresas",
  "/categorias",
  "/buscar",
  "/ofertas",
  "/inusitados",
  "/brindes-por-evento",
  "/brindes-por-publico-alvo",
  "/tipos-de-brinde",
];

describe("Integridade do SSR", () => {
  for (const route of ROUTES) {
    it(`${route} renderiza no servidor sem cair para client-rendering`, async () => {
      const res = await fetch(`${BASE}${route}`);
      expect(res.status).toBe(200);
      const html = await res.text();

      expect(html).not.toContain("Switched to client rendering");
      // <!--$!--> é o marcador de boundary de suspense em estado de erro.
      expect(html).not.toContain("<!--$!-->");
      // Conteúdo real precisa existir no HTML entregue ao crawler.
      expect(/<h1[\s>]/.test(html)).toBe(true);
      expect(html).toContain("</main>");
    }, 20_000);
  }
});
