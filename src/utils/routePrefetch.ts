/**
 * LINGUAVERSE AI — Deduplicated Route Chunk Prefetcher (Inversion-of-Control Registry)
 *
 * App.tsx registers its lazy route dynamic import() loaders once at boot so
 * LearnerShell can prefetch any target route on hover/focus/touch WITHOUT
 * creating import edges back to Learner pages when LearnerShell is bundled
 * inside the Separate Admin App (`dist-admin/`).
 */

export type RouteChunkLoader = () => Promise<unknown>;

const registeredLoaders = new Map<string, RouteChunkLoader>();
const prefetchedKeys = new Set<string>();

export function registerRouteChunkLoaders(loaders: Record<string, RouteChunkLoader>): void {
  for (const [key, loader] of Object.entries(loaders)) {
    registeredLoaders.set(key, loader);
  }
}

function resolveLoaderKey(path: string): string | null {
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  if (registeredLoaders.has(clean)) {
    return clean;
  }
  if (clean.startsWith('/app/learn/course/') && registeredLoaders.has('/app/learn/course')) {
    return '/app/learn/course';
  }
  if (clean.startsWith('/app/learn/') && registeredLoaders.has('/app/learn/lesson')) {
    return '/app/learn/lesson';
  }
  if (clean === '/app/admin' && registeredLoaders.has('/admin')) {
    return '/admin';
  }
  return null;
}

/**
 * Prefetches the lazy JS chunk for a target route at most once per session.
 * Respects Save-Data / slow-2g connections to avoid wasting mobile bandwidth.
 */
export function prefetchRouteChunk(path: string): void {
  if (typeof navigator !== 'undefined') {
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (conn?.saveData || conn?.effectiveType === 'slow-2g') {
      return;
    }
  }

  const key = resolveLoaderKey(path);
  if (!key || prefetchedKeys.has(key)) return;
  const loader = registeredLoaders.get(key);
  if (!loader) return;

  prefetchedKeys.add(key);
  void loader().catch(() => {
    // Allow retry if transient offline/network error occurred
    prefetchedKeys.delete(key);
  });
}
