import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { withRetry } from "@/lib/fetch-retry";


const schema = z.object({
  metric: z.enum(["LCP", "INP", "CLS", "TTFB", "FCP"]),
  value: z.number().min(0).max(100000),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  route: z.string().min(1).max(200),
  nav_type: z.string().max(32).optional(),
  ua_family: z.string().max(32).optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
};

// Rate limit em memória (best-effort por instância de worker).
// Janela deslizante simples: max N eventos por IP por minuto.
const RATE_MAX = 60;
const RATE_WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;
const buckets = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const h = request.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = buckets.get(ip) ?? [];
  const fresh = arr.filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX) {
    buckets.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  buckets.set(ip, fresh);
  // Poda defensiva do Map para evitar crescimento indefinido
  if (buckets.size > MAX_BUCKETS) {
    const cutoff = now - RATE_WINDOW_MS;
    for (const [k, v] of buckets) {
      const kept = v.filter((t) => t > cutoff);
      if (kept.length === 0) buckets.delete(k);
      else buckets.set(k, kept);
      if (buckets.size <= MAX_BUCKETS) break;
    }
  }
  return false;
}

export const Route = createFileRoute("/api/public/hooks/web-vitals")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          if (rateLimited(ip)) {
            return new Response(JSON.stringify({ error: "rate_limited" }), {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": "60",
                ...CORS,
              },
            });
          }

          const raw = await request.json();
          const parsed = schema.safeParse(raw);
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: "invalid" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
          );
          await supabase.from("web_vitals_events").insert(parsed.data);
          return new Response(null, { status: 204, headers: CORS });
        } catch {
          return new Response(null, { status: 204, headers: CORS });
        }
      },
    },
  },
});
