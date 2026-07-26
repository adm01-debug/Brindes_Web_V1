import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL, STATIC_ROUTES, urlEntry, urlset, xmlResponse } from "@/lib/sitemap-xml";

/** Rotas institucionais e hubs: conteúdo estável, sem consulta ao banco. */
export const Route = createFileRoute("/sitemap-paginas.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const body = urlset(
          STATIC_ROUTES.map((r) =>
            urlEntry(`${SITE_URL}${r.path}`, undefined, r.changefreq, r.priority),
          ),
        );
        return xmlResponse(request, body);
      },
    },
  },
});
