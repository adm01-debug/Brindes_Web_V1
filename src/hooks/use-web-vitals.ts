import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { onLCP, onINP, onCLS, onTTFB, onFCP, type Metric } from "web-vitals";

const ENDPOINT = "/api/public/hooks/web-vitals";
const sent = new Set<string>();

function detectUAFamily(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

function send(metric: Metric, route: string) {
  const key = `${metric.name}:${metric.id}`;
  if (sent.has(key)) return;
  sent.add(key);
  const payload = JSON.stringify({
    metric: metric.name,
    value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating,
    route: route.slice(0, 200),
    nav_type: metric.navigationType,
    ua_family: detectUAFamily(),
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    /* silent */
  }
}

export function useWebVitals() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Não coletar em painel interno
    if (pathname.startsWith("/painel") || pathname.startsWith("/api")) return;
    const routePattern = pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
      .replace(/\/\d+/g, "/:n");
    const cb = (m: Metric) => send(m, routePattern);
    onLCP(cb);
    onINP(cb);
    onCLS(cb);
    onTTFB(cb);
    onFCP(cb);
  }, [pathname]);
}
