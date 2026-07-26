import { describe, it, expect } from "vitest";

const BASE = "http://localhost:8080";

/**
 * Regressão: `/buscar` não pode responder 3xx normalizando parâmetros padrão.
 * Um redirect para `?q=&categoria=&...` divergiria do canonical, poluiria o
 * histórico do navegador e custaria um round-trip extra em toda entrada.
 */
describe("URL de busca — canônica e sem redirect", () => {
  const urls = [
    "/buscar",
    "/buscar?q=caneca",
    "/buscar?q=caneca&page=2&uf=SP",
    "/buscar?ordenar=price_asc",
  ];

  for (const url of urls) {
    it(`responde 200 direto em ${url}`, async () => {
      const res = await fetch(`${BASE}${url}`, { redirect: "manual" });
      expect(res.status, `esperado 200 em ${url}`).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });
  }

  it("mantém o canonical estável para a página de busca", async () => {
    const html = await fetch(`${BASE}/buscar?q=caneca`).then((r) => r.text());
    expect(html).toContain('rel="canonical"');
    expect(html).not.toContain("/buscar?q=&categoria=");
  });
});
