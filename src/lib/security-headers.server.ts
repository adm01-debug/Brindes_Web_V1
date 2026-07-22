import { setResponseHeader } from "@tanstack/react-start/server";

export function applySecurityHeaders(): void {
  try {
    setResponseHeader("X-Frame-Options", "SAMEORIGIN");
    setResponseHeader("X-Content-Type-Options", "nosniff");
    setResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    setResponseHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    );
    setResponseHeader("X-DNS-Prefetch-Control", "on");
  } catch {
    /* no-op — fora de contexto SSR */
  }
}
