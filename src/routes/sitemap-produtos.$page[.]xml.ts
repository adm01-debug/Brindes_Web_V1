import { createFileRoute } from "@tanstack/react-router";
import { buildProductsSitemap } from "@/lib/sitemap-products";
import { urlset, xmlFallback, xmlResponse } from "@/lib/sitemap-xml";

/** Fatias adicionais do catálogo: `/sitemap-produtos/2.xml`, `/3.xml`, ... */
export const Route = createFileRoute("/sitemap-produtos/$page.xml")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const page = Number.parseInt(String(params.page), 10);
        try {
          return await xmlResponse(request, await buildProductsSitemap(page));
        } catch {
          return xmlFallback(urlset([], true));
        }
      },
    },
  },
});
