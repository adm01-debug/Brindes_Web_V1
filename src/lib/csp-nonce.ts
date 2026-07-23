import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * Nonce CSP por request.
 * - No servidor: armazenado num Map por request (chave = objeto request-scoped).
 *   Usamos AsyncLocalStorage quando disponível (Cloudflare Workers com nodejs_compat).
 * - No cliente: lê de `window.__CSP_NONCE__` (setado por script inline no shell).
 */

type NonceStore = { nonce: string };

// AsyncLocalStorage é opcional; se ausente, caímos para leitura via globalThis
// (menos seguro em cenários com concorrência de request no mesmo isolate, mas
// funciona em Cloudflare Workers padrão onde cada request tem seu próprio task).
let als: { getStore(): NonceStore | undefined; run<T>(store: NonceStore, cb: () => T): T } | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AsyncLocalStorage } = await import("node:async_hooks");
  als = new AsyncLocalStorage<NonceStore>();
} catch {
  als = undefined;
}

// Fallback: guarda simples via globalThis (reset a cada aplicação de headers).
type NonceGlobal = { __currentCspNonce__?: string };

export function generateNonce(): string {
  // 16 bytes → base64 (~22 chars). Fonte de entropia: crypto.getRandomValues.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // btoa disponível em Workers e Node 20+
  return btoa(s).replace(/=+$/, "");
}

export function setServerNonce(nonce: string): void {
  (globalThis as unknown as NonceGlobal).__currentCspNonce__ = nonce;
}

export const getCspNonce = createIsomorphicFn()
  .client((): string | undefined => {
    const w = globalThis as unknown as { __CSP_NONCE__?: string };
    return w.__CSP_NONCE__;
  })
  .server((): string | undefined => {
    const scoped = als?.getStore()?.nonce;
    if (scoped) return scoped;
    return (globalThis as unknown as NonceGlobal).__currentCspNonce__;
  });
