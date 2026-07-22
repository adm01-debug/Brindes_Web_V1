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
    } catch {
      /* fora de contexto de request SSR */
    }
  });

