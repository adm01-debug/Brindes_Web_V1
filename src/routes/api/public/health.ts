import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { withRetry } from "@/lib/fetch-retry";


const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

// Endpoint público de health-check — usado por uptime monitors (UptimeRobot,
// BetterStack, Pingdom) para verificar app + banco em uma chamada.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      HEAD: () => new Response(null, { status: 200, headers: CORS }),
      GET: async () => {
        const started = Date.now();
        const result: Record<string, unknown> = {
          status: "ok",
          service: "brindeshub",
          time: new Date().toISOString(),
        };

        try {
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
          );
          await withRetry(
            async () => {
              const { error } = await supabase
                .from("companies")
                .select("id", { count: "exact", head: true })
                .limit(1);
              if (error) throw error;
            },
            { retries: 1, timeoutMs: 3_000, totalBudgetMs: 7_000, label: "health.db" },
          );
          result.db = "ok";
        } catch {
          result.db = "down";
          result.status = "degraded";
        }

        result.latency_ms = Date.now() - started;

        return new Response(JSON.stringify(result), {
          status: result.status === "ok" ? 200 : 503,
          headers: { "Content-Type": "application/json", ...CORS },
        });
      },
    },
  },
});
