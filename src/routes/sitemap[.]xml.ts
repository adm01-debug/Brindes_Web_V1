import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://brinde-gallery.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/empresas", changefreq: "daily", priority: "0.9" },
          { path: "/buscar", changefreq: "daily", priority: "0.7" },
        ];

        if (supabaseUrl && supabaseKey) {
          const isNewKey = supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("sb_secret_");
          const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
            global: {
              fetch: (input, init) => {
                const headers = new Headers(init?.headers);
                if (isNewKey && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
                  headers.delete("Authorization");
                }
                headers.set("apikey", supabaseKey);
                return fetch(input, { ...init, headers });
              },
            },
          });

          try {
            const [companies, products] = await Promise.all([
              supabase
                .from("companies")
                .select("slug, updated_at")
                .eq("status", "approved")
                .order("updated_at", { ascending: false })
                .limit(5000),
              supabase
                .from("products")
                .select("id, updated_at, company:companies!inner(status)")
                .eq("is_active", true)
                .eq("moderation_status", "approved")
                .is("deleted_at", null)
                .eq("company.status", "approved")
                .order("updated_at", { ascending: false })
                .limit(10000),
            ]);

            for (const c of companies.data ?? []) {
              entries.push({
                path: `/empresa/${c.slug}`,
                lastmod: c.updated_at ?? undefined,
                changefreq: "weekly",
                priority: "0.8",
              });
            }
            for (const p of products.data ?? []) {
              entries.push({
                path: `/produto/${p.id}`,
                lastmod: p.updated_at ?? undefined,
                changefreq: "weekly",
                priority: "0.6",
              });
            }
          } catch (err) {
            console.error("[sitemap] Failed to load dynamic entries", err);
          }
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
