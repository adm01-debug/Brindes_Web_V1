import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

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
};

export const Route = createFileRoute("/api/public/hooks/web-vitals")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
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
