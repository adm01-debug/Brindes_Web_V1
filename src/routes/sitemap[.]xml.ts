import { createFileRoute } from "@tanstack/react-router";
import { ARTICLES } from "@/lib/articles";
import { countProductChunks } from "@/lib/sitemap-products";
import { SITE_URL, escapeXml, sitemapSupabase, xmlFallback, xmlResponse } from "@/lib/sitemap-xml";

/**
 * Índice de sitemaps.
 *
 * Trocamos o arquivo monolítico por um `sitemapindex`: cada seção tem seu
 * próprio ETag e ciclo de cache, então uma alteração no catálogo de produtos
 * não invalida o sitemap de páginas institucionais. Também respeita com folga
 * o teto de 50.000 URLs por arquivo do protocolo.
 *
 * `<lastmod>` é emitido apenas onde existe um timestamp autoritativo da seção
 * (o maior `updated_at` do conjunto). Seções estáticas — páginas
 * institucionais — não têm fonte confiável e ficam sem o campo, em vez de
 * receberem um "agora" que mentiria para o crawler.
 */
const SECTIONS_WITHOUT_LASTMOD = ["/sitemap-paginas.xml"];

/** Maior `updated_at` de uma tabela, já em ISO. */
async function maxUpdatedAt(
  supabase: ReturnType<typeof sitemapSupabase>,
  table: "companies" | "products" | "facet_terms" | "commemorative_dates",
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from(table)
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.updated_at) return undefined;
  return new Date(data.updated_at).toISOString();
}

function newest(...values: Array<string | undefined>): string | undefined {
  const valid = values.filter((v): v is string => !!v);
  if (valid.length === 0) return undefined;
  return valid.reduce((a, b) => (a > b ? a : b));
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const build = (entries: Array<{ path: string; lastmod?: string }>) =>
          [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...entries.map((e) =>
              [
                "  <sitemap>",
                `    <loc>${escapeXml(`${SITE_URL}${e.path}`)}</loc>`,
                e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : "",
                "  </sitemap>",
              ]
                .filter(Boolean)
                .join("\n"),
            ),
            "</sitemapindex>",
          ].join("\n");

        // Conteúdo editorial é estático no bundle: o lastmod vem dos artigos.
        const conteudoLastmod = newest(
          ...ARTICLES.map((a) => new Date(a.updatedAt).toISOString()),
        );

        try {
          const supabase = sitemapSupabase();
          const [companies, products, terms, dates, productChunks] = await Promise.all([
            maxUpdatedAt(supabase, "companies"),
            maxUpdatedAt(supabase, "products"),
            maxUpdatedAt(supabase, "facet_terms"),
            maxUpdatedAt(supabase, "commemorative_dates"),
            countProductChunks(),
          ]);

          // Fatia 1 mantém a URL histórica; as demais são numeradas.
          const productSections = Array.from({ length: productChunks }, (_, i) => ({
            path: i === 0 ? "/sitemap-produtos.xml" : `/sitemap-produtos/${i + 1}.xml`,
            lastmod: products,
          }));

          return xmlResponse(
            request,
            build([
              { path: SECTIONS_WITHOUT_LASTMOD[0] },
              // Vitrines derivam de termos + datas comemorativas.
              { path: "/sitemap-vitrines.xml", lastmod: newest(terms, dates) },
              { path: "/sitemap-empresas.xml", lastmod: companies },
              ...productSections,
              { path: "/sitemap-conteudo.xml", lastmod: conteudoLastmod },
            ]),
          );
        } catch {
          // Sem banco: ainda entregamos o índice, só sem os lastmod dinâmicos.
          return xmlFallback(
            build([
              { path: "/sitemap-paginas.xml" },
              { path: "/sitemap-vitrines.xml" },
              { path: "/sitemap-empresas.xml" },
              { path: "/sitemap-produtos.xml" },
              { path: "/sitemap-conteudo.xml", lastmod: conteudoLastmod },
            ]),
          );
        }
      },
    },
  },
});
