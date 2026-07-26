import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL, escapeXml, xmlResponse } from "@/lib/sitemap-xml";

/**
 * Índice de sitemaps.
 *
 * Trocamos o arquivo monolítico por um `sitemapindex`: cada seção tem seu
 * próprio ETag e ciclo de cache, então uma alteração no catálogo de produtos
 * não invalida o sitemap de páginas institucionais. Também respeita com folga
 * o teto de 50.000 URLs por arquivo do protocolo.
 */
const SECTIONS = [
  "/sitemap-paginas.xml",
  "/sitemap-vitrines.xml",
  "/sitemap-empresas.xml",
  "/sitemap-produtos.xml",
  "/sitemap-conteudo.xml",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Sem <lastmod>: não existe timestamp autoritativo por seção aqui, e
        // um valor derivado de "agora" mentiria para os crawlers.
        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...SECTIONS.map((p) =>
            ["  <sitemap>", `    <loc>${escapeXml(`${SITE_URL}${p}`)}</loc>`, "  </sitemap>"].join(
              "\n",
            ),
          ),
          "</sitemapindex>",
        ].join("\n");

        return xmlResponse(request, body);
      },
    },
  },
});
