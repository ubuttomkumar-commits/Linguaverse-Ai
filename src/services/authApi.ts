/**
 * Frontend Client for LINGUAVERSE AI Backend Authentication Security APIs (/api/v1/auth/*)
 * - CSRF double-submit token negotiation (GET /api/v1/auth/csrf -> X-CSRF-Token header)
 * - Real Google OAuth provider availability detection (zero fake OAuth)
 * - Password Recovery & Reset Token Validation/Completion (single-use, 15m expiry, session revocation)
 * - Backend password hashing & rate-limit sync
 */

import {
  attachAuthBearerHeader,
  getApiCredentialsMode,
  getConfiguredApiBase,
  resolveApiUrl,
} from './apiBase';

export interface AuthProvidersInfo {
  google: {
    configured: boolean;
  };
  emailDelivery: {
    configured: boolean;
    mode: 'email_provider' | 'local_dev_preview';
  };
}

export interface PasswordResetRequestResult {
  ok: true;
  message: string;
  cooldownSeconds: number;
  deliveryMode: 'email_provider' | 'local_dev_preview';
  devPreviewResetUrl?: string;
  devPreviewToken?: string;
}

export interface ResetTokenValidationResult {
  valid: boolean;
  emailMasked?: string;
  expiresAt?: string;
  reason?: 'MISSING' | 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED';
  messageEn?: string;
  messageBn?: string;
}

export interface PasswordResetCompleteResult {
  ok: true;
  email: string;
  revokedSessionsCount: number;
  message: string;
}

let cachedCsrfToken: string | null = null;

export function resetCachedCsrfToken(): void {
  cachedCsrfToken = null;
}

export async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  // Cross-origin Cloudflare Worker API uses strict CORS allowlist + SameSite/Bearer auth
  if (getConfiguredApiBase()) return '';
  if (cachedCsrfToken && !forceRefresh) return cachedCsrfToken;
  try {
    const res = await fetch(resolveApiUrl('/api/v1/auth/csrf'), {
      method: 'GET',
      credentials: getApiCredentialsMode(),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as { csrfToken?: string };
    cachedCsrfToken = data.csrfToken ?? '';
    return cachedCsrfToken;
  } catch {
    return '';
  }
}

export async function buildCsrfHeaders(
  baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' },
  forceRefresh = false
): Promise<Record<string, string>> {
  const token = await ensureCsrfToken(forceRefresh);
  const headers: Record<string, string> = attachAuthBearerHeader({ ...baseHeaders });
  if (token) {
    headers['X-CSRF-Token'] = token;
  }
  return headers;
}

export async function fetchAuthProviders(): Promise<AuthProvidersInfo> {
  try {
    const res = await fetch(resolveApiUrl('/api/v1/auth/providers'), {
      method: 'GET',
      credentials: getApiCredentialsMode(),
    });
    if (!res.ok) {
      return {
        google: { configured: false },
        emailDelivery: { configured: false, mode: 'local_dev_preview' },
      };
    }
    return (await res.json()) as AuthProvidersInfo;
  } catch {
    return {
      google: { configured: false },
      emailDelivery: { configured: false, mode: 'local_dev_preview' },
    };
  }
}

async function postWithCsrf<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const sendRequest = async (forceRefresh: boolean) => {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, forceRefresh);
    return fetch(resolveApiUrl(url), {
      method: 'POST',
      credentials: getApiCredentialsMode(),
      headers,
      body: JSON.stringify(body),
    });
  };

  let res = await sendRequest(false);
  let data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 403 && data.code === 'INVALID_CSRF') {
    resetCachedCsrfToken();
    res = await sendRequest(true);
    data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  }

  if (!res.ok) {
    const msg =
      typeof data.error === 'string' && data.error.trim()
        ? data.error
        : `Authentication request failed (${res.status}).`;
    const err = new Error(msg) as Error & { status?: number; code?: string; retryAfterSeconds?: number };
    err.status = res.status;
    if (typeof data.code === 'string') err.code = data.code;
    if (typeof data.retryAfterSeconds === 'number') err.retryAfterSeconds = data.retryAfterSeconds;
    throw err;
  }
  return data as T;
}

export async function syncServerRegister(payload: {
  id?: string;
  name: string;
  email: string;
  password: string;
  plan?: 'free' | 'pro' | 'institution';
}): Promise<void> {
  try {
    await postWithCsrf('/api/v1/auth/register', payload);
  } catch (err) {
    // Allow 409 when user already mirrored; propagate rate-limit 429
    const status = (err as { status?: number })?.status;
    if (status === 429) throw err;
  }
}

export interface ServerAuthUser {
  id: string;
  name: string;
  email: string;
  role?: 'learner' | 'content_manager' | 'ai_ops' | 'admin';
  plan?: 'free' | 'pro';
  emailVerified?: boolean;
  createdAt?: string;
}

export async function syncServerLogin(payload: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<{ ok: boolean; status?: number; error?: string; user?: ServerAuthUser }> {
  try {
    const data = await postWithCsrf<{ user?: ServerAuthUser }>('/api/v1/auth/login', payload);
    return { ok: true, user: data.user };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    return {
      ok: false,
      status,
      error: err instanceof Error ? err.message : 'Login failed.',
    };
  }
}

export async function syncServerLogout(): Promise<void> {
  try {
    await postWithCsrf('/api/v1/auth/logout', {});
  } catch {
    // Non-blocking on local fallback
  } finally {
    resetCachedCsrfToken();
  }
}

export async function syncServerResendOtp(): Promise<{
  email: string;
  expiresAt: string;
  resendAvailableAt: string;
  deliveryMode: 'email_provider' | 'local_dev_preview';
  devPreviewOtp?: string;
}> {
  return postWithCsrf('/api/v1/auth/resend-otp', {});
}

export async function requestPasswordResetApi(email: string): Promise<PasswordResetRequestResult> {
  return postWithCsrf<PasswordResetRequestResult>('/api/v1/auth/forgot-password', { email });
}

export async function validateResetTokenApi(token: string): Promise<ResetTokenValidationResult> {
  if (!token.trim()) {
    return {
      valid: false,
      reason: 'MISSING',
      messageEn: 'No password reset token was provided.',
      messageBn: 'কোনো পাসওয়ার্ড রিসেট টোকেন পাওয়া যায়নি।',
    };
  }
  const res = await fetch(
    resolveApiUrl(`/api/v1/auth/reset-password/validate?token=${encodeURIComponent(token.trim())}`),
    {
      method: 'GET',
      credentials: getApiCredentialsMode(),
    }
  );
  return (await res.json()) as ResetTokenValidationResult;
}

export async function completePasswordResetApi(payload: {
  token: string;
  newPassword: string;
}): Promise<PasswordResetCompleteResult> {
  return postWithCsrf<PasswordResetCompleteResult>('/api/v1/auth/reset-password', payload);
}
