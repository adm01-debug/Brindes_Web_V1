import { createFileRoute } from "@tanstack/react-router";

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
      "Cache-Control": "public, max-age=300",
    },
  });
}

export const Route = createFileRoute("/api/public/og/empresa/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: company } = await supabaseAdmin
            .from("companies")
            .select("banner_url, logo_url, status")
            .eq("slug", params.slug)
            .maybeSingle();

          if (!company || company.status !== "approved") return placeholderResponse();
          const path = company.banner_url ?? company.logo_url;
          if (!path) return placeholderResponse();

          const { data: file, error } = await supabaseAdmin.storage
            .from("company-assets")
            .download(path);
          if (error || !file) return placeholderResponse();

          const bytes = new Uint8Array(await file.arrayBuffer());
          const type = file.type || "image/jpeg";
          return new Response(bytes, {
            status: 200,
            headers: {
              "Content-Type": type,
              "Cache-Control": "public, max-age=86400, s-maxage=86400",
            },
          });
        } catch {
          return placeholderResponse();
        }
      },
    },
  },
});
