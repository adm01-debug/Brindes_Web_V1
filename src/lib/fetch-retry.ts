/**
 * Utilidades de resiliência HTTP para endpoints públicos.
 *
 * - `withRetry(fn, opts)`: envolve qualquer operação assíncrona com timeout
 *   por tentativa, backoff exponencial com jitter e budget total.
 * - `fetchWithRetry(url, init?, opts?)`: variante para `fetch` com política
 *   de retry baseada em status HTTP transitórios (408/429/5xx) e respeito
 *   ao header `Retry-After`.
 *
 * Design goals:
 * - Nunca ultrapassar `totalBudgetMs` (protege CPU limit do Worker).
 * - Nunca retry em 4xx (exceto 408 e 429).
 * - Jitter para evitar thundering herd.
 * - Logs curtos em `console.warn` com correlation id para debug.
 */

export type RetryOn = readonly number[];

export interface WithRetryOptions {
  /** Número máximo de tentativas extras (default 2 = até 3 execuções). */
  retries?: number;
  /** Timeout absoluto por tentativa em ms (default 5000). */
  timeoutMs?: number;
  /** Budget total do processo em ms (default 10000). */
  totalBudgetMs?: number;
  /** Base do backoff em ms (default 100 → 100/300/800). */
  baseDelayMs?: number;
  /** Rótulo curto para logs. */
  label?: string;
  /** Sinal externo para cancelar. */
  signal?: AbortSignal;
}

export interface FetchWithRetryOptions extends WithRetryOptions {
  /** HTTP status que devem gerar retry. Default: 408, 429, 502, 503, 504. */
  retryOn?: RetryOn;
}

const DEFAULT_RETRY_ON: RetryOn = [408, 429, 502, 503, 504];

function backoffDelay(attempt: number, base: number): number {
  // attempt: 0 → base, 1 → 3*base, 2 → 7*base, com jitter [0, base).
  const expo = base * (Math.pow(2, attempt + 1) - 1);
  const jitter = Math.random() * base;
  return Math.min(expo + jitter, 5_000);
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || /aborted/i.test(err.message));
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Executa `fn` com timeout por tentativa e retry com backoff.
 * A função recebe um `AbortSignal` — deve propagá-lo se possível.
 * `shouldRetry` decide se um erro é transitório (default: qualquer erro que
 * não seja abort externo).
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: WithRetryOptions & { shouldRetry?: (err: unknown) => boolean } = {},
): Promise<T> {
  const {
    retries = 2,
    timeoutMs = 5_000,
    totalBudgetMs = 10_000,
    baseDelayMs = 100,
    label = "op",
    signal: externalSignal,
    shouldRetry = () => true,
  } = opts;

  const cid = shortId();
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (externalSignal?.aborted) throw new Error("aborted");
    const elapsed = Date.now() - startedAt;
    const remaining = totalBudgetMs - elapsed;
    if (remaining <= 0) break;

    const perAttemptTimeout = Math.min(timeoutMs, remaining);
    const ac = new AbortController();
    const onExternalAbort = () => ac.abort();
    externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
    const timer = setTimeout(() => ac.abort(), perAttemptTimeout);

    try {
      const result = await fn(ac.signal);
      return result;
    } catch (err) {
      lastError = err;
      const externallyAborted = externalSignal?.aborted === true;
      if (externallyAborted) throw err;

      const transient = isAbortError(err) || shouldRetry(err);
      if (!transient || attempt === retries) break;

      const delay = backoffDelay(attempt, baseDelayMs);
      const budgetLeft = totalBudgetMs - (Date.now() - startedAt);
      if (delay >= budgetLeft) break;

      console.warn(
        `[retry:${cid}] ${label} attempt=${attempt + 1}/${retries + 1} failed; retrying in ${delay}ms`,
      );
      await sleep(delay);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }

  throw lastError ?? new Error(`${label} failed`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Envolve `fetch` com retry em falhas de rede/timeout e status transitórios.
 * Respeita `Retry-After` (segundos ou HTTP-date) em 429/503.
 */
export async function fetchWithRetry(
  url: string | URL,
  init: RequestInit = {},
  opts: FetchWithRetryOptions = {},
): Promise<Response> {
  const retryOn = opts.retryOn ?? DEFAULT_RETRY_ON;
  const {
    retries = 2,
    timeoutMs = 5_000,
    totalBudgetMs = 10_000,
    baseDelayMs = 100,
    label = `fetch ${typeof url === "string" ? url : url.toString()}`,
    signal: externalSignal,
  } = opts;

  const cid = shortId();
  const startedAt = Date.now();
  let lastError: unknown;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (externalSignal?.aborted) throw new Error("aborted");
    const elapsed = Date.now() - startedAt;
    const remaining = totalBudgetMs - elapsed;
    if (remaining <= 0) break;

    const perAttemptTimeout = Math.min(timeoutMs, remaining);
    const ac = new AbortController();
    const onExternalAbort = () => ac.abort();
    externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
    const timer = setTimeout(() => ac.abort(), perAttemptTimeout);

    try {
      const res = await fetch(url, { ...init, signal: ac.signal });
      if (!retryOn.includes(res.status) || attempt === retries) return res;
      lastResponse = res;
      // consume body para liberar conexão
      try { await res.arrayBuffer(); } catch { /* ignore */ }

      const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
      const backoff = retryAfter ?? backoffDelay(attempt, baseDelayMs);
      const budgetLeft = totalBudgetMs - (Date.now() - startedAt);
      if (backoff >= budgetLeft) return res;

      console.warn(
        `[retry:${cid}] ${label} status=${res.status} attempt=${attempt + 1}/${retries + 1}; retrying in ${backoff}ms`,
      );
      await sleep(backoff);
    } catch (err) {
      lastError = err;
      if (externalSignal?.aborted) throw err;
      if (attempt === retries) break;

      const delay = backoffDelay(attempt, baseDelayMs);
      const budgetLeft = totalBudgetMs - (Date.now() - startedAt);
      if (delay >= budgetLeft) break;

      console.warn(
        `[retry:${cid}] ${label} error=${(err as Error).message} attempt=${attempt + 1}/${retries + 1}; retrying in ${delay}ms`,
      );
      await sleep(delay);
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error(`${label} failed`);
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, Math.min(secs * 1000, 5_000));
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, Math.min(date - Date.now(), 5_000));
  return null;
}
