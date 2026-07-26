import { createFileRoute } from "@tanstack/react-router";
import {
  SITE_URL,
  escapeXml,
  sitemapSupabase,
  urlEntry,
  urlset,
  xmlFallback,
  xmlResponse,
} from "@/lib/sitemap-xml";

/** Fichas de produto publicadas, com até 5 imagens cada (image sitemap). */
export const Route = createFileRoute("/sitemap-produtos.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const supabase = sitemapSupabase();
          const { data } = await supabase
            .from("products")
            .select("id, updated_at, name, product_images(url, is_primary, sort_order)")
            .eq("is_active", true)
            .is("deleted_at", null)
            .eq("moderation_status", "approved")
            .order("updated_at", { ascending: false })
            .limit(10000);

          const entries = (data ?? []).map((p) => {
            const images = (p.product_images ?? [])
              .slice()
              .sort(
                (
                  a: { is_primary: boolean; sort_order: number },
                  b: { is_primary: boolean; sort_order: number },
                ) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
              )
              .slice(0, 5);
            const imageXml = images
              .map(
                (img: { url: string }) =>
                  `    <image:image><image:loc>${escapeXml(img.url)}</image:loc>${
                    p.name ? `<image:title>${escapeXml(p.name)}</image:title>` : ""
                  }</image:image>`,
              )
              .join("\n");
            return urlEntry(
              `${SITE_URL}/produto/${p.id}`,
              p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
              "weekly",
              "0.6",
              imageXml || undefined,
            );
          });

          return xmlResponse(request, urlset(entries, true));
        } catch {
          return xmlFallback(urlset([], true));
        }
      },
    },
  },
});
