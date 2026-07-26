/**
 * Helpers compartilhados pelos sitemaps segmentados.
 *
 * Um único arquivo XML deixa de escalar quando o catálogo cresce: o limite do
 * protocolo é 50.000 URLs / 50 MB por arquivo, e crawlers reprocessam tudo a
 * cada mudança. Aqui o índice (`/sitemap.xml`) aponta para seções pequenas e
 * independentes, cada uma com o próprio ETag — uma alteração em produtos não
 * invalida o cache das demais seções.
 *
 * Módulo server-only: só é importado pelas rotas de sitemap.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const SITE_URL = "https://brinde-gallery.lovable.app";

/** Limite do protocolo sitemaps.org. Mantido como guarda-corpo explícito. */
export const SITEMAP_MAX_URLS = 50000;

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function urlEntry(
  loc: string,
  lastmod?: string,
  changefreq?: string,
  priority?: string,
  extra?: string,
): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : "",
    priority ? `    <priority>${priority}</priority>` : "",
    extra ?? "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function urlset(entries: string[], withImages = false): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    withImages
      ? '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
      : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.slice(0, SITEMAP_MAX_URLS),
    "</urlset>",
  ].join("\n");
}

/** Cliente publishable server-side: leituras públicas, sem sessão. */
export function sitemapSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Resposta com ETag forte derivado do conteúdo + suporte a 304.
 * Aceita listas e a forma fraca (`W/"..."`) conforme RFC 9110.
 */
export async function xmlResponse(request: Request, body: string): Promise<Response> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const etag = `"${Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}"`;

  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
    ETag: etag,
    Vary: "Accept-Encoding",
  };

  const inm = request.headers.get("if-none-match");
  if (
    inm &&
    inm
      .split(",")
      .map((v) => v.trim().replace(/^W\//, ""))
      .includes(etag)
  ) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(body, { status: 200, headers });
}

/** Fallback curto: nunca devolvemos 5xx a um crawler. */
export function xmlFallback(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const STATIC_ROUTES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/buscar", changefreq: "daily", priority: "0.9" },
  { path: "/empresas", changefreq: "daily", priority: "0.9" },
  { path: "/categorias", changefreq: "weekly", priority: "0.8" },
  { path: "/kits", changefreq: "weekly", priority: "0.8" },
  { path: "/ideias", changefreq: "weekly", priority: "0.8" },
  { path: "/datas-comemorativas", changefreq: "weekly", priority: "0.8" },
  { path: "/brindes-a-z", changefreq: "weekly", priority: "0.8" },
  { path: "/empresas-a-z", changefreq: "weekly", priority: "0.8" },
  { path: "/ofertas", changefreq: "daily", priority: "0.8" },
  { path: "/inusitados", changefreq: "weekly", priority: "0.7" },
  { path: "/brindes-por-evento", changefreq: "weekly", priority: "0.8" },
  { path: "/brindes-por-publico-alvo", changefreq: "weekly", priority: "0.8" },
  { path: "/brindes-por-data", changefreq: "weekly", priority: "0.8" },
  { path: "/tipos-de-brinde", changefreq: "weekly", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/planos", changefreq: "monthly", priority: "0.6" },
  { path: "/vender", changefreq: "monthly", priority: "0.8" },
  { path: "/sobre", changefreq: "monthly", priority: "0.6" },
  { path: "/como-funciona", changefreq: "monthly", priority: "0.7" },
  { path: "/contato", changefreq: "monthly", priority: "0.5" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/termos", changefreq: "yearly", priority: "0.3" },
  { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
];

/**
 * Mapa eixo -> hub público. Um eixo novo só entra no sitemap depois de
 * ganhar rota, evitando 404 indexado.
 */
export const FACET_AXIS_PATH: Record<string, string> = {
  evento: "/brindes-por-evento",
  publico: "/brindes-por-publico-alvo",
  data: "/brindes-por-data",
  tipo: "/tipos-de-brinde",
};

/** Espelha FACET_PAGE_SIZE de src/lib/facet-queries.ts (24 itens/página). */
export const FACET_PAGE_SIZE = 24;
/** Teto de páginas por vitrine: evita séries longas de baixo valor. */
export const MAX_FACET_PAGES = 20;
