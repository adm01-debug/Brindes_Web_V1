import { createFileRoute } from "@tanstack/react-router";
import {
  SITE_URL,
  sitemapSupabase,
  urlEntry,
  urlset,
  xmlFallback,
  xmlResponse,
} from "@/lib/sitemap-xml";

/** Perfis de fornecedores aprovados. */
export const Route = createFileRoute("/sitemap-empresas.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const supabase = sitemapSupabase();
          const { data } = await supabase
            .from("companies")
            .select("slug, updated_at")
            .eq("status", "approved")
            .order("updated_at", { ascending: false })
            .limit(5000);

          const body = urlset(
            (data ?? []).map((c) =>
              urlEntry(
                `${SITE_URL}/empresa/${c.slug}`,
                c.updated_at ? new Date(c.updated_at).toISOString() : undefined,
                "weekly",
                "0.7",
              ),
            ),
          );
          return xmlResponse(request, body);
        } catch {
          return xmlFallback(urlset([]));
        }
      },
    },
  },
});
