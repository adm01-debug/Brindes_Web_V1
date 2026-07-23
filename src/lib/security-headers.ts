import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHost, setResponseHeader } from "@tanstack/react-start/server";
import { generateNonce, setServerNonce } from "./csp-nonce";

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

function baseDirectives(nonce: string): string[] {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    // style-src (fallback legado para browsers sem suporte a -elem/-attr).
    // Browsers modernos ignoram este quando -elem/-attr estão presentes.
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    // <style> blocks: sem 'unsafe-inline'. Nonce cobre o <style> do Recharts
    // (chart.tsx lê window.__CSP_NONCE__ e aplica). Fonts continuam via host.
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    // style="..." attrs: React/Framer aplicam dinamicamente; 'unsafe-hashes'
    // + 'unsafe-inline' é a única solução prática sem refatorar todo o código.
    // Ataque via style attr requer XSS prévio (superfície muito menor).
    "style-src-attr 'unsafe-inline'",
    `connect-src ${CONNECT_SRC}`,
    "media-src 'self' data: blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ];
}

// Política endurecida (produção): 'strict-dynamic' + hashes + nonce.
function hardenedCsp(nonce: string): string {
  return [
    ...baseDirectives(nonce),
    `script-src 'self' 'strict-dynamic' 'nonce-${nonce}' ${INLINE_SCRIPT_HASHES} 'unsafe-inline' https:`,
  ].join("; ");
}

// Política permissiva (preview do editor Lovable): mantém 'unsafe-inline'
// clássico em style-src-elem para não quebrar estilos injetados pelo iframe do editor.
function permissiveCsp(nonce: string): string {
  const base = baseDirectives(nonce).map((d) =>
    d.startsWith("style-src-elem")
      ? `style-src-elem 'self' 'unsafe-inline' 'nonce-${nonce}' https://fonts.googleapis.com`
      : d.startsWith("style-src ")
      ? `style-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://fonts.googleapis.com`
      : d,
  );
  return [...base, `script-src 'self' 'unsafe-inline' 'nonce-${nonce}'`].join("; ");
}

// Report-Only mais estrito, para telemetria da próxima remoção de fallback.
function reportOnlyCsp(nonce: string): string {
  return [
    ...baseDirectives(nonce),
    `script-src 'self' 'strict-dynamic' 'nonce-${nonce}' ${INLINE_SCRIPT_HASHES}`,
  ].join("; ");
}

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
 * - Server: usa setResponseHeader do runtime SSR e gera nonce por request.
 * - Client: no-op (headers HTTP não existem no browser).
 */
export const applySecurityHeaders = createIsomorphicFn()
  .client(() => {})
  .server(() => {
    try {
      const nonce = generateNonce();
      setServerNonce(nonce);

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
      const enforcedCsp = isPreviewHost(host) ? permissiveCsp(nonce) : hardenedCsp(nonce);

      setResponseHeader("Content-Security-Policy", enforcedCsp);
      setResponseHeader("Content-Security-Policy-Report-Only", reportOnlyCsp(nonce));
    } catch {
      /* fora de contexto de request SSR */
    }
  });
