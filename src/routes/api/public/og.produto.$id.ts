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
    Brindes corporativos personalizados
  </text>
</svg>`;

function placeholderResponse(status = 200): Response {
  return new Response(PLACEHOLDER_SVG, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
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

export const Route = createFileRoute("/api/public/og/produto/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: img } = await supabaseAdmin
            .from("product_images")
            .select("url, product:products!inner(id, is_active, deleted_at, moderation_status)")
            .eq("product_id", params.id)
            .eq("is_primary", true)
            .maybeSingle();

          let path = (img as { url?: string } | null)?.url ?? null;
          const prod = (img as { product?: { is_active: boolean; deleted_at: string | null; moderation_status: string } } | null)?.product;

          if (!path) {
            const { data: any1 } = await supabaseAdmin
              .from("product_images")
              .select("url")
              .eq("product_id", params.id)
              .order("sort_order", { ascending: true })
              .limit(1)
              .maybeSingle();
            path = (any1 as { url?: string } | null)?.url ?? null;
          }

          if (!path || !prod || !prod.is_active || prod.deleted_at || prod.moderation_status !== "approved") {
            return placeholderResponse();
          }

          const { data: file, error } = await supabaseAdmin.storage
            .from("product-images")
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
