import { createFileRoute } from "@tanstack/react-router";
import { withRetry } from "@/lib/fetch-retry";


const PLACEHOLDER_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f172a"/>
  <text x="600" y="315" text-anchor="middle" dominant-baseline="middle"
        fill="#f8fafc" font-family="system-ui, sans-serif" font-size="64" font-weight="700">
    BrindesHub
  </text>
  <text x="600" y="390" text-anchor="middle" fill="#94a3b8"
        font-family="system-ui, sans-serif" font-size="28">
    Empresas de brindes corporativos
  </text>
</svg>`;

function placeholderResponse(status = 200): Response {
  return new Response(PLACEHOLDER_SVG, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const buf = bytes.slice().buffer as ArrayBuffer;
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/public/og/empresa/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const company = await withRetry(
            async () => {
              const { data, error } = await supabaseAdmin
                .from("companies")
                .select("banner_url, logo_url, status")
                .eq("slug", params.slug)
                .maybeSingle();
              if (error) throw error;
              return data;
            },
            { retries: 1, timeoutMs: 3_000, totalBudgetMs: 6_000, label: "og.empresa.select" },
          );

          if (!company || company.status !== "approved") return placeholderResponse();
          const path = company.banner_url ?? company.logo_url;
          if (!path) return placeholderResponse();

          const file = await withRetry(
            async () => {
              const { data, error } = await supabaseAdmin.storage
                .from("company-assets")
                .download(path);
              if (error || !data) throw error ?? new Error("no file");
              return data;
            },
            { retries: 2, timeoutMs: 4_000, totalBudgetMs: 9_000, label: "og.empresa.download" },
          );


          const bytes = new Uint8Array(await file.arrayBuffer());
          const type = file.type || "image/jpeg";
          const etag = `"${await sha1Hex(bytes)}"`;
          const inm = request.headers.get("if-none-match");
          if (inm && inm === etag) {
            return new Response(null, {
              status: 304,
              headers: {
                ETag: etag,
                "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
                "X-Robots-Tag": "noindex",
              },
            });
          }
          return new Response(bytes, {
            status: 200,
            headers: {
              "Content-Type": type,
              "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
              "X-Content-Type-Options": "nosniff",
              "X-Robots-Tag": "noindex",
              ETag: etag,
            },
          });
        } catch {
          return placeholderResponse();
        }
      },
    },
  },
});
