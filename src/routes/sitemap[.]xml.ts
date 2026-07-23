import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { INTENTS } from "@/lib/intents";

const SITE_URL = "https://brinde-gallery.lovable.app";
const STATIC_ROUTES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/buscar", changefreq: "daily", priority: "0.9" },
  { path: "/empresas", changefreq: "daily", priority: "0.9" },
  { path: "/categorias", changefreq: "weekly", priority: "0.8" },
  { path: "/kits", changefreq: "weekly", priority: "0.8" },
  { path: "/ideias", changefreq: "weekly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/planos", changefreq: "monthly", priority: "0.6" },
  { path: "/sobre", changefreq: "monthly", priority: "0.6" },
  { path: "/como-funciona", changefreq: "monthly", priority: "0.7" },
  { path: "/contato", changefreq: "monthly", priority: "0.5" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/termos", changefreq: "yearly", priority: "0.3" },
  { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : "",
    priority ? `    <priority>${priority}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const supabase = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );

          const [companiesRes, productsRes, categoriesRes] = await Promise.all([
            supabase
              .from("companies")
              .select("slug, updated_at")
              .eq("status", "approved")
              .order("updated_at", { ascending: false })
              .limit(5000),
            supabase
              .from("products")
              .select("id, updated_at, name, product_images(url, is_primary, sort_order)")
              .eq("is_active", true)
              .is("deleted_at", null)
              .eq("moderation_status", "approved")
              .order("updated_at", { ascending: false })
              .limit(10000),
            supabase
              .from("categories")
              .select("slug")
              .order("sort_order", { ascending: true })
              .limit(500),
          ]);

          const parts: string[] = [];
          parts.push('<?xml version="1.0" encoding="UTF-8"?>');
          parts.push(
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
          );

          for (const r of STATIC_ROUTES) {
            parts.push(urlEntry(`${SITE_URL}${r.path}`, undefined, r.changefreq, r.priority));
          }

          for (const c of companiesRes.data ?? []) {
            parts.push(
              urlEntry(
                `${SITE_URL}/empresa/${c.slug}`,
                c.updated_at ? new Date(c.updated_at).toISOString() : undefined,
                "weekly",
                "0.7",
              ),
            );
          }

          for (const p of productsRes.data ?? []) {
            const loc = `${SITE_URL}/produto/${p.id}`;
            const lastmod = p.updated_at ? new Date(p.updated_at).toISOString() : undefined;
            const images = (p.product_images ?? [])
              .slice()
              .sort(
                (a: { is_primary: boolean; sort_order: number }, b: { is_primary: boolean; sort_order: number }) =>
                  (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
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
            parts.push(
              [
                "  <url>",
                `    <loc>${escapeXml(loc)}</loc>`,
                lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
                "    <changefreq>weekly</changefreq>",
                "    <priority>0.6</priority>",
                imageXml,
                "  </url>",
              ]
                .filter(Boolean)
                .join("\n"),
            );
          }

          for (const c of categoriesRes.data ?? []) {
            parts.push(
              urlEntry(`${SITE_URL}/categoria/${c.slug}`, undefined, "weekly", "0.7"),
            );
          }

          for (const i of INTENTS) {
            parts.push(
              urlEntry(`${SITE_URL}/ideias/${i.slug}`, undefined, "weekly", "0.7"),
            );
          }



          parts.push("</urlset>");

          return new Response(parts.join("\n"), {
            status: 200,
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          const fallback = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...STATIC_ROUTES.map((r) =>
              urlEntry(`${SITE_URL}${r.path}`, undefined, r.changefreq, r.priority),
            ),
            "</urlset>",
          ].join("\n");
          return new Response(fallback, {
            status: 200,
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
      },
    },
  },
});
