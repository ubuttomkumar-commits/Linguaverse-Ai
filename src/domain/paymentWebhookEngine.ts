/**
 * Payment Webhook Verification & Safe System Configuration Engine
 * Pure WebCrypto-compatible module shared by Express dev server and Cloudflare Workers.
 * Never fabricates payments or exposes secrets.
 */

import type { SubscriptionPlan } from '../types/domain';

export type SupportedWebhookProvider = 'stripe' | 'sslcommerz' | 'paddle';

export type PaymentWebhookEventType =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'subscription_cancelled'
  | 'refund_issued';

export interface ValidatedPaymentWebhookEvent {
  eventId: string;
  provider: SupportedWebhookProvider;
  eventType: PaymentWebhookEventType;
  userId: string;
  invoiceId?: string;
  plan?: SubscriptionPlan;
  amountCents: number;
  currency: string;
  occurredAt: string;
}

export interface SystemConfigSettings {
  audioRetentionDays: number;
  aiRateLimitPerMinute: number;
  freeDailySpeakingLimit: number;
  communityDirectMessagingEnabled: false;
  maintenanceBannerEn: string;
  maintenanceBannerBn: string;
  allowNewRegistrations: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfigSettings = {
  audioRetentionDays: 30,
  aiRateLimitPerMinute: 30,
  freeDailySpeakingLimit: 3,
  communityDirectMessagingEnabled: false,
  maintenanceBannerEn: '',
  maintenanceBannerBn: '',
  allowNewRegistrations: true,
};

export const SUPPORTED_WEBHOOK_PROVIDERS = new Set<SupportedWebhookProvider>([
  'stripe',
  'sslcommerz',
  'paddle',
]);

const SUPPORTED_EVENT_TYPES = new Set<PaymentWebhookEventType>([
  'payment_succeeded',
  'payment_failed',
  'subscription_cancelled',
  'refund_issued',
]);

const VALID_PLANS = new Set<SubscriptionPlan>(['free', 'pro', 'institution']);

const WEBHOOK_REPLAY_WINDOW_SECONDS = 300;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function constantTimeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Computes HMAC-SHA256 hex signature over `${timestamp}.${rawBody}` using Web Crypto API.
 */
export async function computeWebhookHmacHex(
  secret: string,
  timestampSeconds: string,
  rawBody: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestampSeconds}.${rawBody}`));
  return toHex(new Uint8Array(sig));
}

export interface WebhookSignatureCheckResult {
  valid: boolean;
  reason?: 'MISSING_HEADERS' | 'INVALID_TIMESTAMP' | 'TIMESTAMP_EXPIRED' | 'SIGNATURE_MISMATCH';
}

/**
 * Verifies signed webhook headers (`X-LV-Webhook-Timestamp` & `X-LV-Webhook-Signature` or Stripe-style `t=...,v1=...`).
 */
export async function verifyPaymentWebhookSignature(params: {
  secret: string;
  rawBody: string;
  signatureHeader: string | null | undefined;
  timestampHeader?: string | null;
  nowMs?: number;
}): Promise<WebhookSignatureCheckResult> {
  const { secret, rawBody, signatureHeader, timestampHeader, nowMs = Date.now() } = params;
  if (!secret || !signatureHeader) {
    return { valid: false, reason: 'MISSING_HEADERS' };
  }

  let ts = (timestampHeader ?? '').trim();
  let providedSig = signatureHeader.trim();

  // Support Stripe-style "t=1700000000,v1=<hex>" header as well as direct hex header
  if (providedSig.includes('v1=')) {
    const parts = providedSig.split(',').map((p) => p.trim());
    const tPart = parts.find((p) => p.startsWith('t='));
    const v1Part = parts.find((p) => p.startsWith('v1='));
    if (tPart && !ts) ts = tPart.slice(2).trim();
    if (v1Part) providedSig = v1Part.slice(3).trim();
  }

  if (providedSig.startsWith('sha256=')) {
    providedSig = providedSig.slice(7).trim();
  }

  if (!ts || !/^\d{9,13}$/.test(ts) || !/^[a-fA-F0-9]{64}$/.test(providedSig)) {
    return { valid: false, reason: 'INVALID_TIMESTAMP' };
  }

  const tsNum = Number(ts);
  const nowSec = Math.floor(nowMs / 1000);
  if (Math.abs(nowSec - tsNum) > WEBHOOK_REPLAY_WINDOW_SECONDS) {
    return { valid: false, reason: 'TIMESTAMP_EXPIRED' };
  }

  const expected = await computeWebhookHmacHex(secret, ts, rawBody);
  if (!constantTimeEqualStrings(expected.toLowerCase(), providedSig.toLowerCase())) {
    return { valid: false, reason: 'SIGNATURE_MISMATCH' };
  }

  return { valid: true };
}

export function validatePaymentWebhookPayload(
  providerRaw: string,
  payload: unknown
): { ok: true; event: ValidatedPaymentWebhookEvent } | { ok: false; error: string } {
  const provider = providerRaw.trim().toLowerCase() as SupportedWebhookProvider;
  if (!SUPPORTED_WEBHOOK_PROVIDERS.has(provider)) {
    return { ok: false, error: 'Unsupported payment provider.' };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: 'Webhook body must be a JSON object.' };
  }
  const obj = payload as Record<string, unknown>;
  const eventId = typeof obj.eventId === 'string' ? obj.eventId.trim() : '';
  if (!eventId || eventId.length > 120 || !/^[a-zA-Z0-9._:-]+$/.test(eventId)) {
    return { ok: false, error: 'Invalid or missing eventId.' };
  }

  const eventType = obj.eventType as PaymentWebhookEventType;
  if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
    return { ok: false, error: 'Unsupported webhook eventType.' };
  }

  const userId = typeof obj.userId === 'string' ? obj.userId.trim() : '';
  if (!userId || userId.length > 100) {
    return { ok: false, error: 'Missing userId in webhook payload.' };
  }

  const invoiceId =
    typeof obj.invoiceId === 'string' && obj.invoiceId.trim().length > 0
      ? obj.invoiceId.trim().slice(0, 100)
      : undefined;

  const plan =
    typeof obj.plan === 'string' && VALID_PLANS.has(obj.plan as SubscriptionPlan)
      ? (obj.plan as SubscriptionPlan)
      : undefined;

  const amountCentsRaw = Number(obj.amountCents ?? 0);
  if (!Number.isFinite(amountCentsRaw) || amountCentsRaw < 0 || amountCentsRaw > 100_000_000) {
    return { ok: false, error: 'Invalid amountCents value.' };
  }

  const currency =
    typeof obj.currency === 'string' && /^[A-Z]{3}$/.test(obj.currency.trim().toUpperCase())
      ? obj.currency.trim().toUpperCase()
      : 'USD';

  const occurredAt =
    typeof obj.occurredAt === 'string' && !Number.isNaN(Date.parse(obj.occurredAt))
      ? new Date(obj.occurredAt).toISOString()
      : new Date().toISOString();

  return {
    ok: true,
    event: {
      eventId,
      provider,
      eventType,
      userId,
      invoiceId,
      plan,
      amountCents: Math.round(amountCentsRaw),
      currency,
      occurredAt,
    },
  };
}

/**
 * Strictly validates non-secret Admin System Configuration updates.
 * Rejects any attempt to store API keys, tokens, or enable unmoderated private DMs.
 */
export function validateSystemConfigPatch(
  patch: unknown,
  current: SystemConfigSettings = DEFAULT_SYSTEM_CONFIG
): { ok: true; next: SystemConfigSettings } | { ok: false; error: string } {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, error: 'Settings payload must be an object.' };
  }
  const body = patch as Record<string, unknown>;

  // Reject any unexpected secret-like keys explicitly
  const forbiddenKeyPattern = /(secret|api[_-]?key|token|password|jwt|private[_-]?key)/i;
  for (const key of Object.keys(body)) {
    if (forbiddenKeyPattern.test(key)) {
      return { ok: false, error: 'Secret credentials cannot be stored in system settings.' };
    }
  }

  let audioRetentionDays = current.audioRetentionDays;
  if (body.audioRetentionDays !== undefined) {
    const val = Number(body.audioRetentionDays);
    if (!Number.isInteger(val) || val < 1 || val > 365) {
      return { ok: false, error: 'audioRetentionDays must be an integer between 1 and 365.' };
    }
    audioRetentionDays = val;
  }

  let aiRateLimitPerMinute = current.aiRateLimitPerMinute;
  if (body.aiRateLimitPerMinute !== undefined) {
    const val = Number(body.aiRateLimitPerMinute);
    if (!Number.isInteger(val) || val < 5 || val > 120) {
      return { ok: false, error: 'aiRateLimitPerMinute must be an integer between 5 and 120.' };
    }
    aiRateLimitPerMinute = val;
  }

  let freeDailySpeakingLimit = current.freeDailySpeakingLimit;
  if (body.freeDailySpeakingLimit !== undefined) {
    const val = Number(body.freeDailySpeakingLimit);
    if (!Number.isInteger(val) || val < 1 || val > 20) {
      return { ok: false, error: 'freeDailySpeakingLimit must be an integer between 1 and 20.' };
    }
    freeDailySpeakingLimit = val;
  }

  if (body.communityDirectMessagingEnabled === true) {
    return {
      ok: false,
      error: 'Private direct messaging remains locked off per PRD safety policy.',
    };
  }

  const sanitizeBanner = (value: unknown, fallback: string): string => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string') return fallback;
    return value.replace(/[<>]/g, '').trim().slice(0, 220);
  };

  const maintenanceBannerEn = sanitizeBanner(body.maintenanceBannerEn, current.maintenanceBannerEn);
  const maintenanceBannerBn = sanitizeBanner(body.maintenanceBannerBn, current.maintenanceBannerBn);
  const allowNewRegistrations =
    typeof body.allowNewRegistrations === 'boolean'
      ? body.allowNewRegistrations
      : current.allowNewRegistrations;

  return {
    ok: true,
    next: {
      audioRetentionDays,
      aiRateLimitPerMinute,
      freeDailySpeakingLimit,
      communityDirectMessagingEnabled: false,
      maintenanceBannerEn,
      maintenanceBannerBn,
      allowNewRegistrations,
    },
  };
}
