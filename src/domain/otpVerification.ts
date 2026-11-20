/**
 * Pure Email Verification OTP Domain Logic (PRD v5.0)
 * - Cryptographically random 6-digit numeric OTP
 * - SHA-256 salted hashing via Web Crypto API (works in Browser, Node 22, and Cloudflare Workers)
 * - 10-minute expiry, max 5 failed attempts, 60-second resend cooldown
 */

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const OTP_MAX_ATTEMPTS = 5;

export interface StoredOtpTokenRecord {
  id: string;
  userId: string;
  email: string;
  otpHash: string;
  expiresAt: string;
  attempts: number;
  consumedAt?: string;
  createdAt: string;
  resendAvailableAt: string;
}

export function generateSixDigitOtp(): string {
  const buf = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buf);
    const num = buf[0] % 1_000_000;
    return num.toString().padStart(6, '0');
  }
  const fallback = Math.floor(Math.random() * 1_000_000);
  return fallback.toString().padStart(6, '0');
}

export async function hashOtpCode(email: string, code: string): Promise<string> {
  const normalized = `${email.trim().toLowerCase()}::${code.trim()}::lv_otp_v5`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

export function normalizeOtpInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}

export function canResendOtp(
  latestToken: StoredOtpTokenRecord | null | undefined,
  nowMs: number = Date.now()
): { allowed: boolean; waitSeconds: number } {
  if (!latestToken) return { allowed: true, waitSeconds: 0 };
  const readyAtMs = new Date(latestToken.resendAvailableAt).getTime();
  if (Number.isNaN(readyAtMs) || nowMs >= readyAtMs) {
    return { allowed: true, waitSeconds: 0 };
  }
  return {
    allowed: false,
    waitSeconds: Math.max(1, Math.ceil((readyAtMs - nowMs) / 1000)),
  };
}

export type OtpVerifyOutcome =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'INVALID_FORMAT'
        | 'NO_ACTIVE_TOKEN'
        | 'EXPIRED'
        | 'TOO_MANY_ATTEMPTS'
        | 'MISMATCH';
      remainingAttempts: number;
      messageEn: string;
      messageBn: string;
    };

export async function verifyOtpSubmission(params: {
  token: StoredOtpTokenRecord | null | undefined;
  submittedCode: string;
  nowMs?: number;
}): Promise<OtpVerifyOutcome> {
  const code = normalizeOtpInput(params.submittedCode);
  if (code.length !== 6) {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      remainingAttempts: params.token
        ? Math.max(0, OTP_MAX_ATTEMPTS - params.token.attempts)
        : 0,
      messageEn: 'Please enter the 6-digit verification code sent to your email.',
      messageBn: 'অনুগ্রহ করে আপনার ইমেইলে পাঠানো ৬-সংখ্যার যাচাইকরণ কোডটি লিখুন।',
    };
  }

  const token = params.token;
  if (!token || token.consumedAt) {
    return {
      ok: false,
      code: 'NO_ACTIVE_TOKEN',
      remainingAttempts: 0,
      messageEn: 'No active verification code found. Please request a new code.',
      messageBn: 'কোনো সক্রিয় যাচাইকরণ কোড পাওয়া যায়নি। অনুগ্রহ করে নতুন কোড অনুরোধ করুন।',
    };
  }

  const nowMs = params.nowMs ?? Date.now();
  if (nowMs > new Date(token.expiresAt).getTime()) {
    return {
      ok: false,
      code: 'EXPIRED',
      remainingAttempts: 0,
      messageEn: 'This verification code has expired (10-minute limit). Please click Resend Code.',
      messageBn: 'এই যাচাইকরণ কোডটির মেয়াদ (১০ মিনিট) শেষ হয়ে গেছে। নতুন কোড পাঠান।',
    };
  }

  if (token.attempts >= OTP_MAX_ATTEMPTS) {
    return {
      ok: false,
      code: 'TOO_MANY_ATTEMPTS',
      remainingAttempts: 0,
      messageEn: 'Maximum 5 verification attempts exceeded. Please request a new code.',
      messageBn: 'সর্বোচ্চ ৫ বার চেষ্টা সম্পন্ন হয়েছে। অনুগ্রহ করে নতুন কোড অনুরোধ করুন।',
    };
  }

  const submittedHash = await hashOtpCode(token.email, code);
  if (submittedHash !== token.otpHash) {
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - (token.attempts + 1));
    return {
      ok: false,
      code: 'MISMATCH',
      remainingAttempts: remaining,
      messageEn:
        remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. Maximum attempts reached — please request a new code.',
      messageBn:
        remaining > 0
          ? `ভুল কোড। আরও ${remaining} বার চেষ্টা করতে পারবেন।`
          : 'ভুল কোড। সর্বোচ্চ চেষ্টা শেষ — অনুগ্রহ করে নতুন কোড অনুরোধ করুন।',
    };
  }

  return { ok: true };
}
