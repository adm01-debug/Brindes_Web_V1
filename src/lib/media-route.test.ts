import { describe, expect, it } from "vitest";

/**
 * Contrato da rota de mídia `/i/<bucket>/<path>` (src/routes/i.$.ts).
 *
 * Ela existe para que as imagens do catálogo apareçam no HTML de SSR. Como é
 * um endpoint público que fala com o storage, os limites (allow-list de
 * buckets, ausência de path traversal) são parte do contrato — não detalhes.
 */
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:8080";

async function head(path: string) {
  return fetch(`${BASE}${path}`, { redirect: "manual" });
}

describe("rota de mídia /i/$", () => {
  it("rejeita bucket fora da allow-list", async () => {
    const res = await head("/i/bucket-inventado/arquivo.jpg");
    expect(res.status).toBe(403);
  });

  it("rejeita path traversal", async () => {
    const res = await head("/i/product-images/..%2Fsegredo.jpg");
    expect([400, 404]).toContain(res.status);
  });

  it("rejeita caminho sem objeto", async () => {
    const res = await head("/i/product-images");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("responde 404 para objeto inexistente em bucket permitido", async () => {
    const res = await head("/i/product-images/inexistente-para-teste.jpg");
    expect(res.status).toBe(404);
    // Erro nunca deve ser cacheado na borda.
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("aceita largura fora da allow-list sem quebrar (serve o original)", async () => {
    // Largura inválida não pode virar erro: uma imagem quebrada é pior que
    // uma imagem grande. Aqui só garantimos que o objeto inexistente continua
    // 404 — ou seja, o parâmetro não altera o fluxo de validação.
    const res = await head("/i/product-images/inexistente-para-teste.jpg?w=9999");
    expect(res.status).toBe(404);
  });

  it("mantém a allow-list de buckets mesmo com parâmetro de largura", async () => {
    const res = await head("/i/bucket-inventado/arquivo.jpg?w=400");
    expect(res.status).toBe(403);
  });

  it("não cacheia respostas de erro na borda", async () => {
    const res = await head("/i/bucket-inventado/arquivo.jpg");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});


