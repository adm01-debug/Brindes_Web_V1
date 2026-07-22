import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * Injeta headers de segurança na resposta HTML raiz.
 * - Server: usa setResponseHeader do runtime SSR.
 * - Client: no-op (headers HTTP não existem no browser).
 */
export const applySecurityHeaders = createIsomorphicFn()
  .client(() => {})
  .server(() => {
    // Import lazy dentro do handler server-only para não vazar no bundle cliente.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setResponseHeader } = require("@tanstack/react-start/server") as typeof import("@tanstack/react-start/server");
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
