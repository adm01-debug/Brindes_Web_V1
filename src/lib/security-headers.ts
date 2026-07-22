import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHost, setResponseHeader } from "@tanstack/react-start/server";

// Hashes SHA-256 (base64) dos scripts inline conhecidos do __root.tsx.
// Se qualquer um dos scripts mudar, o CSP Report-Only sinaliza a violação
// e atualizamos os hashes abaixo (recalcular com sha256 + base64).
const INLINE_SCRIPT_HASHES = [
  // snippet anti-FOUC de tema
  "'sha256-XvA8A6mBO2g/n+D/Z6fzuk+pB4BRqMEJ3x9AU/oTQcc='",
  // JSON-LD (Organization + WebSite)
  "'sha256-HPnO0rIIA3R1Q4tIc79pFjqs3OQhKucnSq+i/bOJhN8='",
].join(" ");

const CONNECT_SRC =
  "'self' https://*.supabase.co wss://*.supabase.co https://*.lovable.app https://*.lovable.dev";

const BASE_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `connect-src ${CONNECT_SRC}`,
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
];

// Política endurecida (produção): 'strict-dynamic' + hashes.
// Browsers modernos ignoram 'unsafe-inline' e host-lists quando 'strict-dynamic'
// está presente; mantemos 'unsafe-inline' apenas como fallback legado.
const HARDENED_CSP = [
  ...BASE_DIRECTIVES,
  `script-src 'self' 'strict-dynamic' ${INLINE_SCRIPT_HASHES} 'unsafe-inline' https:`,
].join("; ");

// Política permissiva (preview do editor Lovable): mantém 'unsafe-inline'
// clássico para não quebrar scripts injetados pelo iframe do editor.
const PERMISSIVE_CSP = [
  ...BASE_DIRECTIVES,
  "script-src 'self' 'unsafe-inline'",
].join("; ");

// Report-Only mais estrito, para telemetria do próximo passo (remover fallback legado).
const REPORT_ONLY_CSP = [
  ...BASE_DIRECTIVES,
  `script-src 'self' 'strict-dynamic' ${INLINE_SCRIPT_HASHES}`,
].join("; ");

function isPreviewHost(host: string | undefined): boolean {
  if (!host) return false;
  return (
    host.includes("lovable.dev") ||
    host.startsWith("id-preview") ||
    host.includes("-preview--")
  );
}

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
      setResponseHeader(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
      setResponseHeader("Cross-Origin-Opener-Policy", "same-origin");
      setResponseHeader("Cross-Origin-Resource-Policy", "same-site");

      let host: string | undefined;
      try {
        host = getRequestHost();
      } catch {
        host = undefined;
      }
      const enforcedCsp = isPreviewHost(host) ? PERMISSIVE_CSP : HARDENED_CSP;

      setResponseHeader("Content-Security-Policy", enforcedCsp);
      setResponseHeader("Content-Security-Policy-Report-Only", REPORT_ONLY_CSP);
    } catch {
      /* fora de contexto de request SSR */
    }
  });
