import { describe, expect, it } from "vitest";

/**
 * Contrato de estabilidade visual (CLS).
 *
 * Toda <img> presente no HTML de SSR das rotas públicas precisa declarar
 * dimensões intrínsecas (width/height) e um `alt` explícito. Sem width/height
 * o navegador reserva 0px antes do download e o layout "pula" — o principal
 * gerador de CLS em catálogos com grade de imagens.
 */

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:8080";

const ROUTES = ["/", "/empresas", "/produtos", "/kits", "/comparar"];

const IMG_TAG = /<img\b[^>]*>/gi;

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return match ? match[1] : null;
}

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "text/html" } });
  expect(res.status, `${path} deve responder 200`).toBe(200);
  return await res.text();
}

describe("Contrato de CLS — imagens do SSR", () => {
  for (const route of ROUTES) {
    it(`${route} entrega imagens com dimensões e alt`, async () => {
      const html = await fetchHtml(route);
      const tags = html.match(IMG_TAG) ?? [];

      const semDimensao = tags.filter(
        (tag) => attr(tag, "width") === null || attr(tag, "height") === null,
      );
      expect(semDimensao, `imagens sem width/height em ${route}`).toEqual([]);

      const semAlt = tags.filter((tag) => attr(tag, "alt") === null);
      expect(semAlt, `imagens sem alt em ${route}`).toEqual([]);
    }, 20_000);
  }
});
