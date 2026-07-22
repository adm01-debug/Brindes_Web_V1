import { createIsomorphicFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

/**
 * Injeta headers de segurança na resposta HTML raiz.
 * - Server: usa setResponseHeader do runtime SSR.
 * - Client: no-op (headers HTTP não existem no browser).
 */
export const applySecurityHeaders = createIsomorphicFn()
  .client(() => {})
  .server(() => {
    try {
      setResponseHeader("X-Frame-Options", "SAMEORIGIN");
      setResponseHeader("X-Content-Type-Options", "nosniff");
      setResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      setResponseHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      );
      setResponseHeader("X-DNS-Prefetch-Control", "on");
      // HSTS: força HTTPS por 2 anos com preload (seguro: domínio já serve só HTTPS)
      setResponseHeader(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
      // Isola o processo do site de janelas cross-origin (mitiga Spectre/XS-Leaks)
      setResponseHeader("Cross-Origin-Opener-Policy", "same-origin");
      setResponseHeader("Cross-Origin-Resource-Policy", "same-site");
      // CSP em modo Report-Only: telemetria de violações sem bloquear recursos.
      setResponseHeader(
        "Content-Security-Policy-Report-Only",
        [
          "default-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https://fonts.gstatic.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.lovable.app https://*.lovable.dev",
          "media-src 'self' data: blob: https:",
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "upgrade-insecure-requests",
        ].join("; "),
      );
    } catch {
      /* fora de contexto de request SSR */
    }
  });

