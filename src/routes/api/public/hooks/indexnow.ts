import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL, sitemapSupabase } from "@/lib/sitemap-xml";

/**
 * Notificação de indexação (IndexNow) para conteúdo novo ou atualizado.
 *
 * Contexto: o antigo "sitemap ping" do Google foi desativado em 2023, e o
 * Bing/Yandex/Seznam padronizaram o IndexNow. Em vez de esperar o recrawl
 * natural (dias a semanas para catálogos grandes), empurramos as URLs que
 * mudaram na janela recente.
 *
 * Chamado por pg_cron. Roda sob `/api/public/*`, que não passa pelo gate de
 * autenticação do site publicado — por isso o handler é deliberadamente
 * inofensivo: só faz leituras públicas (mesmos filtros do sitemap) e dispara
 * uma chamada externa idempotente. Não escreve nada e não devolve PII.
 */
const INDEXNOW_KEY = "9031f15c6939ccf1aea65b92be27ee3c";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/** Teto por requisição do protocolo é 10.000; usamos folga. */
const MAX_URLS = 5000;
/** Janela padrão em horas — deve cobrir o intervalo do agendamento. */
const DEFAULT_WINDOW_HOURS = 25;

const HOST = new URL(SITE_URL).host;

export const Route = createFileRoute("/api/public/hooks/indexnow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = (payload: unknown, status = 200) =>
          new Response(JSON.stringify(payload), {
            status,
            headers: { "Content-Type": "application/json" },
          });

        let windowHours = DEFAULT_WINDOW_HOURS;
        try {
          const body = (await request.json()) as { windowHours?: number };
          if (typeof body?.windowHours === "number" && body.windowHours > 0) {
            // Limite superior evita reenviar o catálogo inteiro por engano.
            windowHours = Math.min(body.windowHours, 24 * 30);
          }
        } catch {
          // Corpo vazio ou inválido: seguimos com a janela padrão.
        }

        const since = new Date(Date.now() - windowHours * 3600_000).toISOString();

        try {
          const supabase = sitemapSupabase();

          // Mesmos filtros do sitemap: nada que não seja indexável entra aqui.
          const [products, companies] = await Promise.all([
            supabase
              .from("products")
              .select("id")
              .eq("is_active", true)
              .is("deleted_at", null)
              .eq("moderation_status", "approved")
              .gte("updated_at", since)
              .limit(MAX_URLS),
            supabase
              .from("companies")
              .select("slug")
              .eq("is_active", true)
              .eq("moderation_status", "approved")
              .gte("updated_at", since)
              .limit(MAX_URLS),
          ]);

          const urlList = [
            ...(products.data ?? []).map((p) => `${SITE_URL}/produto/${p.id}`),
            ...(companies.data ?? [])
              .filter((c) => !!c.slug)
              .map((c) => `${SITE_URL}/empresa/${c.slug}`),
          ].slice(0, MAX_URLS);

          if (urlList.length === 0) {
            return json({ ok: true, submitted: 0, reason: "nenhuma alteração na janela" });
          }

          const res = await fetch(INDEXNOW_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({
              host: HOST,
              key: INDEXNOW_KEY,
              keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
              urlList,
            }),
          });

          // 200/202 = aceito; 429 = throttle (tentaremos no próximo ciclo).
          return json({ ok: res.ok, status: res.status, submitted: urlList.length });
        } catch (err) {
          // Nunca propagamos 5xx para o agendador: ele apenas repetiria o ciclo.
          return json({ ok: false, error: (err as Error).message }, 200);
        }
      },
    },
  },
});
