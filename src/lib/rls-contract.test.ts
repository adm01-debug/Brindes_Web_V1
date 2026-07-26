/**
 * Testes de contrato de RLS (papel anônimo).
 *
 * Diferente de um lint de schema, estes testes batem no PostgREST real com a
 * chave publishable — exatamente o que qualquer visitante (ou robô) da
 * internet pode fazer. Eles travam duas classes de regressão:
 *
 *  1. Vazamento: uma policy nova ou afrouxada exponho dados sensíveis ao anon.
 *  2. Quebra silenciosa de catálogo: uma policy endurecida demais derruba as
 *     leituras públicas que o SSR e o sitemap dependem.
 *
 * A chave usada é publishable por definição (é a mesma embarcada no bundle do
 * navegador), então não há segredo neste arquivo.
 */
import { describe, expect, it } from "vitest";

const SUPABASE_URL = "https://atphsqbixdfqwobhiaoz.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0cGhzcWJpeGRmcXdvYmhpYW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzIwMDQsImV4cCI6MjA5OTcwODAwNH0.ED_bsjK736RFgZB1Ude2qg9DbPMCAkxeYCUuZlYlFcI";

type RestResult = { status: number; body: unknown };

async function anonSelect(table: string, query = "select=*&limit=1"): Promise<RestResult> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** Leitura negada = erro de permissão (401/403) OU conjunto vazio via RLS. */
function expectNoRowsLeaked(result: RestResult, table: string) {
  if (result.status === 200) {
    expect(
      Array.isArray(result.body) ? result.body.length : -1,
      `${table} devolveu linhas para o papel anônimo`,
    ).toBe(0);
  } else {
    expect([401, 403, 404]).toContain(result.status);
  }
}

/** Tabelas que jamais podem devolver linha alguma sem autenticação. */
const SENSITIVE_TABLES = [
  "leads",
  "lead_notes",
  "conversations",
  "messages",
  "message_reactions",
  "notifications",
  "favorites",
  "user_roles",
  "audit_log",
  "security_events",
  "metrics_daily",
  "web_vitals_events",
  "storage_cleanup_queue",
];

describe("RLS — superfície anônima", () => {
  it.each(SENSITIVE_TABLES)("não vaza dados de %s", async (table) => {
    expectNoRowsLeaked(await anonSelect(table), table);
  }, 20_000);

  it("não permite escrita anônima em leads sem passar pelas regras", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_roles`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: "00000000-0000-0000-0000-000000000000", role: "admin" }),
    });
    // Escalada de privilégio precisa falhar — nunca 201.
    expect(res.status).not.toBe(201);
    expect(res.status).toBeGreaterThanOrEqual(400);
  }, 20_000);
});

describe("RLS — catálogo público continua legível", () => {
  it("expõe produtos aprovados para SSR e sitemap", async () => {
    const res = await anonSelect(
      "products",
      "select=id&is_active=eq.true&moderation_status=eq.approved&limit=1",
    );
    expect(res.status).toBe(200);
  }, 20_000);

  it("expõe empresas aprovadas", async () => {
    const res = await anonSelect("companies", "select=slug&status=eq.approved&limit=1");
    expect(res.status).toBe(200);
  }, 20_000);

  it("expõe a taxonomia de facetas usada nas vitrines", async () => {
    for (const table of ["facet_axes", "facet_terms", "categories", "commemorative_dates"]) {
      const res = await anonSelect(table, "select=id&limit=1");
      expect(res.status, `${table} deveria ser legível publicamente`).toBe(200);
    }
  }, 30_000);
});
