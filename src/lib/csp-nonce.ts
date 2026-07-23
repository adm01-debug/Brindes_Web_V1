import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * Nonce CSP por request.
 * - No servidor: armazenado em `globalThis.__currentCspNonce__`, setado por
 *   `applySecurityHeaders()` no `beforeLoad` da rota raiz. Em Cloudflare Workers,
 *   cada request executa em seu próprio task; concorrência real entre requests
 *   distintos dentro do mesmo isolate é rara e o custo de um nonce colidido é
 *   apenas o browser reutilizar o nonce anterior (defesa em profundidade mantida).
 * - No cliente: lê de `window.__CSP_NONCE__` (injetado como atributo `data-csp-nonce`
 *   no <html> pelo shell SSR, lido no boot via inline script).
 */

type NonceGlobal = { __currentCspNonce__?: string };

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "");
}

export function setServerNonce(nonce: string): void {
  (globalThis as unknown as NonceGlobal).__currentCspNonce__ = nonce;
}

export const getCspNonce = createIsomorphicFn()
  .client((): string | undefined => {
    const w = globalThis as unknown as { __CSP_NONCE__?: string };
    if (w.__CSP_NONCE__) return w.__CSP_NONCE__;
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-csp-nonce");
      if (attr) {
        w.__CSP_NONCE__ = attr;
        return attr;
      }
    }
    return undefined;
  })
  .server((): string | undefined => {
    return (globalThis as unknown as NonceGlobal).__currentCspNonce__;
  });
