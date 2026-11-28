/**
 * LINGUAVERSE AI — Lightweight Client Query Cache, In-Flight Deduplication,
 * Request Timeout & Optimistic Rollback Utility
 *
 * Eliminates redundant network waterfalls across route transitions (e.g. LearnerShell
 * remounts), deduplicates concurrent identical GETs, enforces bounded timeouts on
 * degraded mobile connections, and provides safe optimistic state transitions.
 */

export interface QueryCacheEntry<T> {
  value: T;
  fetchedAt: number;
  expiresAt: number;
}

export interface QueryFetchOptions {
  /** Freshness TTL in milliseconds. Cached values younger than TTL return immediately. */
  ttlMs: number;
  /** Optional stale-while-revalidate window after TTL where stale data can return immediately while refreshing. */
  staleWhileRevalidateMs?: number;
  /** Force bypass cache and fetch fresh data. */
  forceRefresh?: boolean;
  /** Optional custom clock for deterministic unit testing. */
  now?: () => number;
}

export class ClientQueryCache {
  private readonly entries = new Map<string, QueryCacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 128) {
    this.maxEntries = Math.max(8, maxEntries);
  }

  getFresh<T>(key: string, nowMs = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (nowMs <= entry.expiresAt) {
      return entry.value as T;
    }
    return undefined;
  }

  set<T>(key: string, value: T, ttlMs: number, nowMs = Date.now()): void {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }
    this.entries.set(key, {
      value,
      fetchedAt: nowMs,
      expiresAt: nowMs + Math.max(0, ttlMs),
    });
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }

  invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
  }

  size(): number {
    return this.entries.size;
  }

  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: QueryFetchOptions
  ): Promise<T> {
    const nowFn = options.now ?? Date.now;
    const nowMs = nowFn();
    const existing = this.entries.get(key);

    if (!options.forceRefresh && existing) {
      if (nowMs <= existing.expiresAt) {
        return existing.value as T;
      }
      const swrWindow = options.staleWhileRevalidateMs ?? 0;
      if (swrWindow > 0 && nowMs <= existing.expiresAt + swrWindow) {
        if (!this.inFlight.has(key)) {
          void this.runDedupedFetch(key, fetcher, options.ttlMs, nowFn).catch(() => {});
        }
        return existing.value as T;
      }
    }

    return this.runDedupedFetch(key, fetcher, options.ttlMs, nowFn);
  }

  private runDedupedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number,
    nowFn: () => number
  ): Promise<T> {
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = Promise.resolve()
      .then(() => fetcher())
      .then((value) => {
        this.set(key, value, ttlMs, nowFn());
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }
}

/**
 * Wraps fetch with an AbortController timeout so degraded global/mobile links
 * never hang the UI indefinitely.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12_000
): Promise<Response> {
  if (timeoutMs <= 0 || typeof AbortController === 'undefined') {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const externalSignal = init.signal;
  const onExternalAbort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please check your connection and retry.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Executes an optimistic UI mutation with guaranteed rollback if the server rejects
 * or the network fails.
 */
export async function runOptimisticMutation<TResult>(params: {
  applyOptimistic: () => void;
  rollback: () => void;
  commit: () => Promise<TResult>;
}): Promise<{ ok: true; result: TResult } | { ok: false; error: unknown }> {
  params.applyOptimistic();
  try {
    const result = await params.commit();
    return { ok: true, result };
  } catch (error) {
    params.rollback();
    return { ok: false, error };
  }
}

export const sharedQueryCache = new ClientQueryCache(128);
