import { createFileRoute } from "@tanstack/react-router";
import {
  FACET_AXIS_PATH,
  FACET_PAGE_SIZE,
  MAX_FACET_PAGES,
  SITE_URL,
  sitemapSupabase,
  urlEntry,
  urlset,
  xmlFallback,
  xmlResponse,
} from "@/lib/sitemap-xml";

/**
 * Vitrines: categorias, datas comemorativas e termos de faceta.
 * Vitrines sem nenhum produto publicado ficam de fora (thin content).
 */
export const Route = createFileRoute("/sitemap-vitrines.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const supabase = sitemapSupabase();
          const [categoriesRes, datesRes, facetsRes, countsRes] = await Promise.all([
            supabase.from("categories").select("slug").order("sort_order").limit(500),
            supabase
              .from("commemorative_dates")
              .select("slug, updated_at")
              .eq("is_active", true)
              .order("sort_order")
              .limit(200),
            supabase
              .from("facet_terms")
              .select("slug, updated_at, axis:facet_axes!inner(slug, is_active)")
              .eq("is_active", true)
              .limit(1000),
            supabase.rpc("facet_term_counts", { _axis_slug: undefined }),
          ]);

          const entries: string[] = [];

          for (const c of categoriesRes.data ?? []) {
            entries.push(urlEntry(`${SITE_URL}/categoria/${c.slug}`, undefined, "weekly", "0.7"));
            entries.push(
              urlEntry(`${SITE_URL}/fornecedores/${c.slug}`, undefined, "weekly", "0.6"),
            );
          }

          for (const d of datesRes.data ?? []) {
            entries.push(
              urlEntry(
                `${SITE_URL}/datas-comemorativas/${d.slug}`,
                d.updated_at ? new Date(d.updated_at).toISOString() : undefined,
                "monthly",
                "0.7",
              ),
            );
          }

          const counts = new Map<string, number>(
            ((countsRes.data ?? []) as Array<{ term_slug: string; products_count: number }>).map(
              (r) => [r.term_slug, Number(r.products_count) || 0],
            ),
          );

          for (const t of facetsRes.data ?? []) {
            const axis = (t as { axis: { slug: string } | null }).axis;
            const base = axis ? FACET_AXIS_PATH[axis.slug] : undefined;
            if (!base) continue;
            const count = counts.get(t.slug) ?? 0;
            if (count === 0) continue;

            const lastmod = t.updated_at ? new Date(t.updated_at).toISOString() : undefined;
            entries.push(
              urlEntry(
                `${SITE_URL}${base}/${t.slug}`,
                lastmod,
                "weekly",
                count >= 20 ? "0.8" : count >= 5 ? "0.7" : "0.6",
              ),
            );

            // Páginas 2..N têm canonical próprio, então precisam ser descobertas.
            const pageCount = Math.min(
              MAX_FACET_PAGES,
              Math.max(1, Math.ceil(count / FACET_PAGE_SIZE)),
            );
            for (let p = 2; p <= pageCount; p++) {
              entries.push(
                urlEntry(`${SITE_URL}${base}/${t.slug}?page=${p}`, lastmod, "weekly", "0.5"),
              );
            }
          }

          return xmlResponse(request, urlset(entries));
        } catch {
          return xmlFallback(urlset([]));
        }
      },
    },
  },
});
