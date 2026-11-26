import { getInMemorySessionToken } from './sessionTokenMemory';

/**
 * Unified Frontend API Base Resolver for Local Express + Cloudflare Workers Parity.
 * - When `VITE_API_BASE_URL` is unset/empty: resolves to same-origin relative paths (Express dev).
 * - When `VITE_API_BASE_URL` is configured (e.g. https://api.linguaverse.ai): routes all API
 *   clients to the Cloudflare Worker origin with `credentials: 'include'` and ephemeral
 *   in-memory Bearer token fallback (S9 compliant — never reads localStorage).
 */
export function getConfiguredApiBase(): string {
  const raw =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_API_BASE_URL === 'string'
      ? import.meta.env.VITE_API_BASE_URL.trim()
      : '';
  return raw.replace(/\/+$/, '');
}

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getConfiguredApiBase();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export function getApiCredentialsMode(): RequestCredentials {
  return getConfiguredApiBase() ? 'include' : 'same-origin';
}

export function attachAuthBearerHeader(headers: Record<string, string>): Record<string, string> {
  const token = getInMemorySessionToken();
  if (token && !headers.Authorization) {
    return { ...headers, Authorization: `Bearer ${token}` };
  }
  return headers;
}
