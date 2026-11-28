import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ClientQueryCache,
  fetchWithTimeout,
  runOptimisticMutation,
} from '../services/queryCache';

test('ClientQueryCache returns fresh cached value within TTL without calling fetcher again', async () => {
  const cache = new ClientQueryCache(16);
  let now = 1_000;
  let calls = 0;

  const first = await cache.fetchWithCache(
    'system:status',
    async () => {
      calls += 1;
      return { ok: true, count: calls };
    },
    { ttlMs: 30_000, now: () => now }
  );

  now += 10_000;
  const second = await cache.fetchWithCache(
    'system:status',
    async () => {
      calls += 1;
      return { ok: true, count: calls };
    },
    { ttlMs: 30_000, now: () => now }
  );

  assert.equal(calls, 1);
  assert.deepEqual(first, { ok: true, count: 1 });
  assert.deepEqual(second, { ok: true, count: 1 });
});

test('ClientQueryCache deduplicates concurrent in-flight requests for the same key', async () => {
  const cache = new ClientQueryCache(16);
  let calls = 0;

  const fetcher = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 15));
    return { value: 'shared-response' };
  };

  const [a, b, c] = await Promise.all([
    cache.fetchWithCache('notif:list', fetcher, { ttlMs: 15_000 }),
    cache.fetchWithCache('notif:list', fetcher, { ttlMs: 15_000 }),
    cache.fetchWithCache('notif:list', fetcher, { ttlMs: 15_000 }),
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
});

test('ClientQueryCache supports stale-while-revalidate and prefix invalidation', async () => {
  const cache = new ClientQueryCache(16);
  let now = 1_000;
  let version = 0;

  const fetcher = async () => {
    version += 1;
    return { version };
  };

  const initial = await cache.fetchWithCache('user:notifications', fetcher, {
    ttlMs: 5_000,
    staleWhileRevalidateMs: 10_000,
    now: () => now,
  });
  assert.equal(initial.version, 1);

  // Move into SWR window (expired by 2s, within 10s SWR)
  now = 8_000;
  const stale = await cache.fetchWithCache('user:notifications', fetcher, {
    ttlMs: 5_000,
    staleWhileRevalidateMs: 10_000,
    now: () => now,
  });
  assert.equal(stale.version, 1);

  // Allow background revalidation microtask to settle
  await new Promise((r) => setTimeout(r, 10));
  const refreshed = cache.getFresh<{ version: number }>('user:notifications', now);
  assert.equal(refreshed?.version, 2);

  cache.set('user:profile', { name: 'Amina' }, 5_000, now);
  cache.set('public:status', { ok: true }, 5_000, now);
  const removed = cache.invalidatePrefix('user:');
  assert.equal(removed, 2);
  assert.equal(cache.getFresh('user:notifications', now), undefined);
  assert.deepEqual(cache.getFresh('public:status', now), { ok: true });
});

test('runOptimisticMutation commits cleanly on success and rolls back on failure', async () => {
  let state = ['n1'];
  const okResult = await runOptimisticMutation({
    applyOptimistic: () => {
      state = [...state, 'n2'];
    },
    rollback: () => {
      state = state.filter((id) => id !== 'n2');
    },
    commit: async () => 'saved',
  });
  assert.equal(okResult.ok, true);
  assert.deepEqual(state, ['n1', 'n2']);

  const failResult = await runOptimisticMutation({
    applyOptimistic: () => {
      state = [...state, 'n3'];
    },
    rollback: () => {
      state = state.filter((id) => id !== 'n3');
    },
    commit: async () => {
      throw new Error('Network unavailable');
    },
  });
  assert.equal(failResult.ok, false);
  assert.deepEqual(state, ['n1', 'n2']);
});

test('fetchWithTimeout aborts hanging requests cleanly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_url: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => fetchWithTimeout('http://localhost/slow', {}, 25),
      /Request timed out/i
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
