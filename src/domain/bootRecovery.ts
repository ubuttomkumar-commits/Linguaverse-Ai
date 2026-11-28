/**
 * Pure, side-effect-free runtime recovery & stale-chunk classification helpers.
 * Used by RootErrorBoundary, Vite preload error listeners, and unit tests.
 */

export const CHUNK_RELOAD_GUARD_KEY = 'lv_chunk_reload_once_v1';
export const BOOT_RELOAD_GUARD_KEY = 'lv_boot_reload_once_v1';
export const RELOAD_GUARD_COOLDOWN_MS = 30_000;

export function looksLikeChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';

  return /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Chunk version mismatch/i.test(
    message
  );
}

/**
 * Decides whether an automatic one-shot cache-bust reload is safe to trigger.
 * Prevents infinite reload loops while allowing fresh recovery after the cooldown.
 */
export function shouldAttemptAutoRecoveryReload(
  lastAttemptRaw: string | null | undefined,
  nowMs: number = Date.now(),
  cooldownMs: number = RELOAD_GUARD_COOLDOWN_MS
): boolean {
  if (!lastAttemptRaw) return true;
  const parsed = Number(lastAttemptRaw);
  if (!Number.isFinite(parsed) || parsed <= 0) return false;
  return nowMs - parsed >= cooldownMs;
}
