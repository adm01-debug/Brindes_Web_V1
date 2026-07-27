import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Proxy de mídia com URL estável: `/i/<bucket>/<path>`.
 *
 * Motivação: os buckets são privados, então até aqui cada imagem dependia de
 * `createSignedUrl` no cliente (useEffect). Isso significava:
 *   - nenhuma <img> no HTML de SSR → imagens invisíveis para crawlers;
 *   - LCP atrasado por um round-trip extra após a hidratação;
 *   - N chamadas de assinatura por grade renderizada.
 *
 * Com esta rota, o HTML já sai com `src="/i/product-images/…"`, o navegador
 * inicia o download no parser e a assinatura acontece no servidor (uma vez,
 * cacheável na borda). Nenhum privilégio extra é usado: a assinatura roda com
 * a chave publicável, exatamente com as mesmas permissões do navegador.
 */

// Allow-list rígida: impede que a rota vire um oráculo genérico de storage.
const ALLOWED_BUCKETS = new Set(["product-images", "company-assets"]);

/**
 * Larguras permitidas para redimensionamento (`?w=`). Uma allow-list evita
 * que crawlers/atacantes gerem infinitas variantes e destruam o cache de borda
 * (cache poisoning por cardinalidade).
 */
const ALLOWED_WIDTHS = new Set([160, 240, 320, 400, 640, 800, 1200, 1600]);
const DEFAULT_QUALITY = 72;

const SIGNED_TTL_SECONDS = 60 * 60 * 24; // 24h
// Cache do redirect abaixo do TTL da assinatura, com folga para revalidação.
const EDGE_CACHE_SECONDS = 60 * 60 * 6; // 6h

function badRequest(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}


export const Route = createFileRoute("/i/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        const slashIndex = splat.indexOf("/");
        if (slashIndex <= 0) return badRequest("Caminho de mídia inválido");

        const bucket = splat.slice(0, slashIndex);
        const objectPath = splat.slice(slashIndex + 1);

        if (!ALLOWED_BUCKETS.has(bucket)) return badRequest("Bucket não permitido", 403);
        // Path traversal e caminhos vazios não chegam ao storage.
        if (!objectPath || objectPath.includes("..")) return badRequest("Caminho de mídia inválido");

        // Redimensionamento opcional: `?w=400`. Fora da allow-list, ignoramos
        // silenciosamente (serve o original) em vez de responder erro — uma
        // imagem quebrada é pior que uma imagem grande.
        const requestUrl = new URL(request.url);
        const widthParam = Number(requestUrl.searchParams.get("w"));
        const width = ALLOWED_WIDTHS.has(widthParam) ? widthParam : undefined;

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return badRequest("Storage indisponível", 503);

        const supabase = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              // Chaves sb_ são opacas (não são JWT): enviar só como apikey.
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
                headers.delete("Authorization");
              }
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const decodedPath = decodeURIComponent(objectPath);

        // Tentativa 1: URL assinada com transformação (o render do storage
        // devolve WebP/AVIF automaticamente conforme o Accept do cliente).
        let signedUrl: string | null = null;
        if (width) {
          const { data } = await supabase.storage
            .from(bucket)
            .createSignedUrl(decodedPath, SIGNED_TTL_SECONDS, {
              transform: { width, resize: "contain", quality: DEFAULT_QUALITY },
            });
          signedUrl = data?.signedUrl ?? null;
        }

        // Tentativa 2 (fallback): original. Cobre o caso de transformação de
        // imagem indisponível no projeto — nunca degradamos para 404.
        if (!signedUrl) {
          const { data } = await supabase.storage
            .from(bucket)
            .createSignedUrl(decodedPath, SIGNED_TTL_SECONDS);
          signedUrl = data?.signedUrl ?? null;
        }

        if (!signedUrl) return badRequest("Imagem não encontrada", 404);

        return new Response(null, {
          status: 302,
          headers: {
            location: signedUrl,
            "cache-control": `public, max-age=${EDGE_CACHE_SECONDS}, s-maxage=${EDGE_CACHE_SECONDS}`,
            // A resposta varia conforme o formato aceito pelo cliente.
            vary: "Accept",
          },
        });
      },

    },
  },
});
