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

const REPORT_ENDPOINT = "/api/public/hooks/csp-report";
const REPORT_TO_GROUP = "csp-endpoint";

function baseDirectives(nonce: string): string[] {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    // Embeds de vídeo do produto: allowlist explícita (nunca host arbitrário).
    "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
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
    `report-uri ${REPORT_ENDPOINT}`,
    `report-to ${REPORT_TO_GROUP}`,
  ];
}

// ---------------------------------------------------------------------------
// Política ENFORCED (aplicada de fato pelo browser).
//
// Contexto crítico: o TanStack Start injeta scripts inline de bootstrap
// (`window.$_TSR`, dados serializados do SSR) cujo conteúdo varia por request
// e para os quais o framework ainda NÃO expõe um ponto de extensão de nonce.
// Pela especificação de CSP, a presença de qualquer nonce ou hash em
// `script-src` faz o browser IGNORAR `'unsafe-inline'` — e `'strict-dynamic'`
// invalida ainda `'self'` e as allowlists de host. O resultado prático de uma
// política nonce/strict-dynamic aqui é: bootstrap bloqueado -> hidratação
// falha -> o React remove o <head> renderizado no servidor (título e meta
// somem) e a página vira HTML estático sem interatividade.
//
// Portanto a política aplicada não carrega nonce nem hash em `script-src`.
// Ela continua bloqueando o que mais importa: origens de script de terceiros
// (`'self' https:` sem hosts arbitrários de dados), `eval` (ausência de
// 'unsafe-eval'), `object-src 'none'`, `base-uri`/`form-action` travados e
// frames restritos. A política nonce completa permanece em Report-Only, de
// onde colhemos telemetria e para onde migramos assim que o framework
// suportar nonce nos scripts de bootstrap.
// ---------------------------------------------------------------------------
function enforcedCsp(nonce: string): string {
  const base = baseDirectives(nonce).map((d) =>
    d.startsWith("style-src-elem")
      ? "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com"
      : d.startsWith("style-src ")
      ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
      : d,
  );
  return [...base, "script-src 'self' 'unsafe-inline'"].join("; ");
}

// Report-Only: alvo de migração (nonce + strict-dynamic + hashes conhecidos).
// Não bloqueia nada; alimenta /api/public/hooks/csp-report.
function reportOnlyCsp(nonce: string): string {
  return [
    ...baseDirectives(nonce),
    `script-src 'self' 'strict-dynamic' 'nonce-${nonce}' ${INLINE_SCRIPT_HASHES}`,
  ].join("; ");
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

      // A mesma política vale para preview, produção e domínio próprio: a
      // divergência anterior escondia em preview a quebra de hidratação que
      // acontecia em produção.
      setResponseHeader("Content-Security-Policy", enforcedCsp(nonce));
      setResponseHeader("Content-Security-Policy-Report-Only", reportOnlyCsp(nonce));


      // Reporting API v1 (Chrome/Edge) — grupo referenciado por `report-to` no CSP.
      setResponseHeader(
        "Reporting-Endpoints",
        `${REPORT_TO_GROUP}="${REPORT_ENDPOINT}"`,
      );
      // Report-To (legado, ainda usado por Chrome estável).
      setResponseHeader(
        "Report-To",
        JSON.stringify({
          group: REPORT_TO_GROUP,
          max_age: 10886400,
          endpoints: [{ url: REPORT_ENDPOINT }],
          include_subdomains: true,
        }),
      );
    } catch {
      /* fora de contexto de request SSR */
    }
  });
