import { createFileRoute } from "@tanstack/react-router";
import { buildProductsSitemap } from "@/lib/sitemap-products";
import { urlset, xmlFallback, xmlResponse } from "@/lib/sitemap-xml";

/**
 * Primeira fatia do catálogo (compatibilidade com a URL histórica).
 * As demais ficam em `/sitemap-produtos/N.xml`.
 */
export const Route = createFileRoute("/sitemap-produtos.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await xmlResponse(request, await buildProductsSitemap(1));
        } catch {
          return xmlFallback(urlset([], true));
        }
      },
    },
  },
});
