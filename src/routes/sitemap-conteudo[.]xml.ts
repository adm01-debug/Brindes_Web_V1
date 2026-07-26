import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL, urlEntry, urlset, xmlResponse } from "@/lib/sitemap-xml";
import { INTENTS } from "@/lib/intents";
import { ARTICLES } from "@/lib/articles";

/** Conteúdo editorial: landing pages de intenção e artigos do blog. */
export const Route = createFileRoute("/sitemap-conteudo.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const entries: string[] = [
          ...INTENTS.map((i) => urlEntry(`${SITE_URL}/ideias/${i.slug}`, undefined, "weekly", "0.7")),
          ...ARTICLES.map((a) =>
            urlEntry(
              `${SITE_URL}/blog/${a.slug}`,
              new Date(a.updatedAt).toISOString(),
              "monthly",
              "0.6",
            ),
          ),
        ];
        return xmlResponse(request, urlset(entries));
      },
    },
  },
});
