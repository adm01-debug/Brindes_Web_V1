import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { withRetry } from "@/lib/fetch-retry";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

// Rate limit por IP (best-effort, por instância de worker).
// CSP reports podem vir em rajada — cap defensivo para não custar $$$.
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;
const buckets = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const h = request.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? "unknown";
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

type NormalizedReport = {
  disposition: "enforce" | "report";
  directive: string | null;
  blocked_uri: string | null;
  document_uri: string | null;
  source_file: string | null;
  line_number: number | null;
  column_number: number | null;
  original_policy: string | null;
  referrer: string | null;
};

// Suporta os dois formatos: `application/csp-report` (legado) e
// `application/reports+json` (Reporting API v1, array de reports).
function normalize(payload: unknown): NormalizedReport[] {
  const out: NormalizedReport[] = [];
  const truncate = (s: unknown, n = 500): string | null => {
    if (typeof s !== "string") return null;
    return s.slice(0, n);
  };
  const toInt = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;

  if (Array.isArray(payload)) {
    for (const item of payload as Array<Record<string, unknown>>) {
      const body = (item?.body ?? {}) as Record<string, unknown>;
      out.push({
        disposition: (body["disposition"] as string) === "report" ? "report" : "enforce",
        directive:
          truncate(body["effectiveDirective"] ?? body["violatedDirective"], 100),
        blocked_uri: truncate(body["blockedURL"] ?? body["blockedURI"]),
        document_uri: truncate(body["documentURL"] ?? body["documentURI"]),
        source_file: truncate(body["sourceFile"]),
        line_number: toInt(body["lineNumber"]),
        column_number: toInt(body["columnNumber"]),
        original_policy: truncate(body["originalPolicy"], 1000),
        referrer: truncate(body["referrer"]),
      });
    }
    return out;
  }

  const legacy =
    (payload as { "csp-report"?: Record<string, unknown> } | null)?.["csp-report"] ??
    (payload as Record<string, unknown> | null);
  if (legacy && typeof legacy === "object") {
    const r = legacy as Record<string, unknown>;
    out.push({
      disposition: (r["disposition"] as string) === "report" ? "report" : "enforce",
      directive: truncate(r["effective-directive"] ?? r["violated-directive"], 100),
      blocked_uri: truncate(r["blocked-uri"]),
      document_uri: truncate(r["document-uri"]),
      source_file: truncate(r["source-file"]),
      line_number: toInt(r["line-number"]),
      column_number: toInt(r["column-number"]),
      original_policy: truncate(r["original-policy"], 1000),
      referrer: truncate(r["referrer"]),
    });
  }
  return out;
}

export const Route = createFileRoute("/api/public/hooks/csp-report")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const ip = getClientIp(request);
          if (rateLimited(ip)) {
            return new Response(null, {
              status: 429,
              headers: { "Retry-After": "60", ...CORS },
            });
          }

          let raw: unknown = null;
          try {
            raw = await request.json();
          } catch {
            return new Response(null, { status: 204, headers: CORS });
          }
          const reports = normalize(raw);
          if (reports.length === 0) {
            return new Response(null, { status: 204, headers: CORS });
          }

          const ua = request.headers.get("user-agent")?.slice(0, 300) ?? null;
          const rows = reports.slice(0, 20).map((r) => ({
            event_type: `csp_violation:${r.disposition}`,
            subject: r.directive ?? "unknown",
            metadata: {
              disposition: r.disposition,
              directive: r.directive,
              blocked_uri: r.blocked_uri,
              document_uri: r.document_uri,
              source_file: r.source_file,
              line_number: r.line_number,
              column_number: r.column_number,
              referrer: r.referrer,
              ua,
            },
          }));

          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await withRetry(
              async () => {
                const { error } = await supabaseAdmin.from("security_events").insert(rows);
                if (error) throw error;
              },
              { retries: 1, timeoutMs: 3_000, totalBudgetMs: 6_000, label: "csp-report.insert" },
            );
          } catch {
            // Fallback silencioso: sem service role, tenta client publishable.
            try {
              const supabase = createClient(
                process.env.SUPABASE_URL!,
                process.env.SUPABASE_PUBLISHABLE_KEY!,
                { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
              );
              await supabase.from("security_events").insert(rows);
            } catch {
              /* best-effort */
            }
          }

          return new Response(null, { status: 204, headers: CORS });
        } catch {
          return new Response(null, { status: 204, headers: CORS });
        }
      },
    },
  },
});
