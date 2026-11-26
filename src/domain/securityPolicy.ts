/**
 * Centralized P1 Security Policy Helpers (Pure, Zero-Side-Effect Domain Module)
 * Shared by Express server (`server.ts`), Cloudflare Worker (`worker/index.ts`),
 * media storage (`server/cmsStore.ts`), and automated security regression tests.
 */

export const ALLOWED_RASTER_MEDIA_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MAX_MEDIA_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export const ALLOWED_AUDIO_UPLOAD_MIME_TYPES = new Set<string>([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
]);

export const MAX_AUDIO_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const MIN_JWT_SECRET_LENGTH = 32;

const AUDIO_EXT_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
};

export class JwtSecretConfigError extends Error {
  readonly code = 'JWT_SECRET_NOT_CONFIGURED';

  constructor(message: string) {
    super(message);
    this.name = 'JwtSecretConfigError';
  }
}

/**
 * Verifies real binary magic-byte file signatures for uploaded raster images
 * and explicitly rejects SVG / XML / HTML script payloads even if renamed or
 * sent with a forged MIME header.
 */
export function verifyImageMagicBytes(
  bytes: Uint8Array,
  declaredMimeType: string
): { ok: true; extension: 'png' | 'jpg' | 'webp' } | { ok: false; error: string } {
  const mime = declaredMimeType.trim().toLowerCase();
  if (!ALLOWED_RASTER_MEDIA_MIME_TYPES.has(mime)) {
    return {
      ok: false,
      error: 'Unsupported image MIME type. Only PNG, JPEG, and WebP images are permitted.',
    };
  }
  if (!bytes || bytes.byteLength < 12) {
    return {
      ok: false,
      error: 'Uploaded file is empty or too small to be a valid image.',
    };
  }
  if (bytes.byteLength > MAX_MEDIA_FILE_BYTES) {
    return {
      ok: false,
      error: 'File exceeds the 2 MB maximum upload limit.',
    };
  }

  // Defense-in-depth: reject text/markup signatures (SVG, HTML, XML, script)
  const headText = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.subarray(0, Math.min(256, bytes.byteLength)))
    .trimStart()
    .toLowerCase();
  if (
    headText.startsWith('<svg') ||
    headText.startsWith('<?xml') ||
    headText.startsWith('<!doctype') ||
    headText.startsWith('<html') ||
    headText.includes('<script')
  ) {
    return {
      ok: false,
      error: 'SVG and markup files are not permitted for media uploads.',
    };
  }

  if (mime === 'image/png') {
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    return isPng
      ? { ok: true, extension: 'png' }
      : { ok: false, error: 'File contents do not match a valid PNG image signature.' };
  }

  if (mime === 'image/jpeg') {
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    return isJpeg
      ? { ok: true, extension: 'jpg' }
      : { ok: false, error: 'File contents do not match a valid JPEG image signature.' };
  }

  if (mime === 'image/webp') {
    const isRiff =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    const isWebp =
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    return isRiff && isWebp
      ? { ok: true, extension: 'webp' }
      : { ok: false, error: 'File contents do not match a valid WebP image signature.' };
  }

  return { ok: false, error: 'Unsupported image format.' };
}

/**
 * Strips codec parameters from Content-Type headers (e.g. "audio/webm;codecs=opus" -> "audio/webm").
 */
export function normalizeBaseMimeType(contentType: string | null | undefined): string {
  if (!contentType || typeof contentType !== 'string') return '';
  return contentType.split(';')[0].trim().toLowerCase();
}

export function audioExtensionForMime(mime: string): string {
  return AUDIO_EXT_BY_MIME[normalizeBaseMimeType(mime)] ?? 'webm';
}

/**
 * Enforces S10 audio upload controls:
 * 1. Explicit server-side learner recording consent (`store_mic_recordings === true`)
 * 2. Strict audio MIME allowlist
 * 3. Bounded file size (1 byte to 10 MB)
 */
export function validateAudioUploadConstraints(input: {
  contentType: string | null | undefined;
  sizeBytes: number;
  storeMicRecordingsConsent: boolean;
}):
  | { ok: true; normalizedMime: string; extension: string }
  | { ok: false; status: number; code: string; error: string } {
  if (!input.storeMicRecordingsConsent) {
    return {
      ok: false,
      status: 403,
      code: 'RECORDING_CONSENT_REQUIRED',
      error:
        'Microphone recording storage consent is disabled for this account. Enable recording consent in Settings before storing audio.',
    };
  }

  const normalizedMime = normalizeBaseMimeType(input.contentType);
  if (!normalizedMime || !ALLOWED_AUDIO_UPLOAD_MIME_TYPES.has(normalizedMime)) {
    return {
      ok: false,
      status: 415,
      code: 'UNSUPPORTED_AUDIO_TYPE',
      error:
        'Unsupported audio Content-Type. Allowed formats: audio/webm, audio/ogg, audio/mp4, audio/mpeg, audio/wav.',
    };
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_AUDIO_SIZE',
      error: 'Audio recording payload is empty.',
    };
  }

  if (input.sizeBytes > MAX_AUDIO_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 413,
      code: 'AUDIO_TOO_LARGE',
      error: 'Audio clip exceeds the 10 MB maximum file size limit.',
    };
  }

  return {
    ok: true,
    normalizedMime,
    extension: audioExtensionForMime(normalizedMime),
  };
}

let ephemeralLocalJwtSecret: string | null = null;

function generateEphemeralSecret(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new JwtSecretConfigError('CSPRNG unavailable to generate ephemeral local JWT secret.');
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Enforces S6: NEVER falls back to a hardcoded static JWT secret string.
 * - In production, staging, or any non-local environment, missing or short (< 32 char)
 *   JWT_SIGNING_SECRET throws JwtSecretConfigError (fail closed).
 * - In explicit local development (`development` / `local` / `test`), uses a
 *   per-process random CSPRNG secret when unset.
 */
export function resolveWorkerJwtSecret(env: {
  JWT_SIGNING_SECRET?: string;
  APP_ENV?: string;
}): string {
  const configured = env.JWT_SIGNING_SECRET?.trim() ?? '';
  const appEnv = (env.APP_ENV ?? 'production').trim().toLowerCase();
  const isLocalDev = appEnv === 'development' || appEnv === 'local' || appEnv === 'test';

  if (configured.length >= MIN_JWT_SECRET_LENGTH) {
    return configured;
  }

  if (configured.length > 0 && !isLocalDev) {
    throw new JwtSecretConfigError(
      'JWT_SIGNING_SECRET must be at least 32 characters in non-development environments.'
    );
  }

  if (!isLocalDev) {
    throw new JwtSecretConfigError(
      'JWT_SIGNING_SECRET is required in staging and production environments.'
    );
  }

  if (!ephemeralLocalJwtSecret) {
    ephemeralLocalJwtSecret = generateEphemeralSecret();
  }
  return ephemeralLocalJwtSecret;
}

const LOCAL_DEV_DEFAULT_ORIGINS = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function normalizeOrigin(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.origin.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Enforces S7: Strict credentialed CORS origin allowlisting.
 * - Never reflects arbitrary untrusted origins.
 * - Never treats "*" as a wildcard reflection rule for credentialed requests.
 * - Fails closed (returns null) when CORS_ALLOWED_ORIGIN is unset/wildcard in non-local envs.
 */
export function resolveAllowedCorsOrigin(
  requestOrigin: string | null | undefined,
  configuredOrigins: string | null | undefined,
  appEnv: string | null | undefined
): string | null {
  const normalizedReqOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedReqOrigin) return null;

  const allowlist = new Set<string>();
  if (typeof configuredOrigins === 'string' && configuredOrigins.trim().length > 0) {
    for (const entry of configuredOrigins.split(',')) {
      const trimmed = entry.trim();
      if (!trimmed || trimmed === '*') continue;
      const normalized = normalizeOrigin(trimmed);
      if (normalized) allowlist.add(normalized);
    }
  }

  if (allowlist.size > 0) {
    return allowlist.has(normalizedReqOrigin) ? normalizedReqOrigin : null;
  }

  const normalizedEnv = (appEnv ?? 'production').trim().toLowerCase();
  const isLocalDev =
    normalizedEnv === 'development' || normalizedEnv === 'local' || normalizedEnv === 'test';
  if (isLocalDev && LOCAL_DEV_DEFAULT_ORIGINS.has(normalizedReqOrigin)) {
    return normalizedReqOrigin;
  }

  return null;
}

/**
 * Enforces S8 Origin verification for cookie-authenticated state-changing requests.
 * If an Origin or Referer header is present, its host must match the request Host / X-Forwarded-Host
 * (or an explicitly allowlisted origin). Requests without Origin/Referer (e.g., direct curl/tests)
 * still must pass the double-submit CSRF token check separately.
 */
export function isTrustedMutationOrigin(input: {
  originHeader?: string | null;
  refererHeader?: string | null;
  hostHeader?: string | null;
  forwardedHostHeader?: string | null;
  allowedOrigins?: string | null;
}): boolean {
  const candidateRaw = input.originHeader?.trim() || input.refererHeader?.trim() || '';
  if (!candidateRaw) {
    return true;
  }

  let candidateUrl: URL;
  try {
    candidateUrl = new URL(candidateRaw);
  } catch {
    return false;
  }

  if (candidateUrl.protocol !== 'http:' && candidateUrl.protocol !== 'https:') {
    return false;
  }

  const candidateHost = candidateUrl.host.toLowerCase();
  const expectedHosts = new Set<string>();

  if (input.hostHeader) {
    expectedHosts.add(input.hostHeader.split(',')[0].trim().toLowerCase());
  }
  if (input.forwardedHostHeader) {
    expectedHosts.add(input.forwardedHostHeader.split(',')[0].trim().toLowerCase());
  }

  if (expectedHosts.has(candidateHost)) {
    return true;
  }

  if (input.allowedOrigins) {
    for (const entry of input.allowedOrigins.split(',')) {
      const norm = normalizeOrigin(entry);
      if (norm && norm === candidateUrl.origin.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves the client IP used as a rate-limit key.
 *
 * `X-Forwarded-For` is client-controlled unless a trusted reverse proxy overwrites it, so it is
 * ignored by default (otherwise rotating the header yields a fresh rate-limit bucket per request
 * and defeats login lockout). Set TRUST_PROXY=true only when the server sits behind a proxy that
 * sets the header. `CF-Connecting-IP` is likewise only honoured when proxy trust is enabled.
 */
export function resolveClientIp(input: {
  socketIp?: string | null;
  forwardedFor?: string | null;
  cfConnectingIp?: string | null;
  trustProxy: boolean;
}): string {
  const socketIp = input.socketIp?.trim() || 'local';
  if (!input.trustProxy) return socketIp;
  const cf = input.cfConnectingIp?.trim();
  if (cf) return cf;
  // The right-most entry is the one appended by our own trusted proxy; earlier entries are client-supplied.
  const parts = (input.forwardedFor ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : socketIp;
}

/**
 * Whether an OTP may be echoed back in an API response for local development.
 * Never true in production: returning the code to the requester would let anyone "verify" an
 * email address they do not own whenever the mail provider is unconfigured or failing.
 */
export function shouldExposeDevPreviewOtp(input: { delivered: boolean; isProduction: boolean }): boolean {
  return !input.delivered && !input.isProduction;
}
