/**
 * S9 Secure In-Memory Session Token Store
 *
 * Keeps optional short-lived Bearer tokens strictly in JS memory (never persisted
 * to window.localStorage or window.sessionStorage) while relying on server-issued
 * HttpOnly session cookies for cross-reload session persistence.
 */

const LEGACY_LOCAL_STORAGE_TOKEN_KEYS = [
  'linguaverse_cf_token_v1',
  'linguaverse_session_token_v1',
] as const;

let inMemorySessionToken: string | null = null;
let legacyCleaned = false;

/**
 * Removes any legacy persisted JWT keys from window.localStorage once per runtime.
 */
export function purgeLegacyStoredTokens(): void {
  if (legacyCleaned || typeof window === 'undefined') return;
  legacyCleaned = true;
  try {
    for (const key of LEGACY_LOCAL_STORAGE_TOKEN_KEYS) {
      if (window.localStorage.getItem(key) !== null) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore restricted storage environments
  }
}

export function getInMemorySessionToken(): string | null {
  purgeLegacyStoredTokens();
  return inMemorySessionToken;
}

export function setInMemorySessionToken(token: string | null): void {
  purgeLegacyStoredTokens();
  const trimmed = typeof token === 'string' ? token.trim() : '';
  inMemorySessionToken = trimmed.length > 0 ? trimmed : null;
}

export function clearInMemorySessionToken(): void {
  purgeLegacyStoredTokens();
  inMemorySessionToken = null;
}
