/**
 * Pure Authentication Security & Validation Domain Engine
 * - Password strength scoring & live checklist (EN + বাংলা)
 * - Form field validators (email, name, password, confirm, terms)
 * - Cryptographically random reset token helpers & SHA-256 hashing
 * - Sliding-window rate limiting (pure, testable, zero external deps)
 * - Generic recovery copy preventing email enumeration
 */

export const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const RESET_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordCriterion {
  id: 'length' | 'upper' | 'lower' | 'number' | 'symbol';
  met: boolean;
  labelEn: string;
  labelBn: string;
}

export interface PasswordStrengthReport {
  score: 0 | 1 | 2 | 3 | 4;
  level: 'empty' | 'weak' | 'fair' | 'good' | 'strong';
  labelEn: string;
  labelBn: string;
  criteria: PasswordCriterion[];
  meetsMinimum: boolean;
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'letmein123',
  'admin123',
  'welcome123',
]);

export function evaluatePasswordStrength(password: string): PasswordStrengthReport {
  const hasLength = password.length >= MIN_PASSWORD_LENGTH;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isLongBonus = password.length >= 12;
  const isCommon = COMMON_WEAK_PASSWORDS.has(password.trim().toLowerCase());

  const criteria: PasswordCriterion[] = [
    {
      id: 'length',
      met: hasLength,
      labelEn: 'At least 8 characters',
      labelBn: 'কমপক্ষে ৮টি অক্ষর',
    },
    {
      id: 'upper',
      met: hasUpper,
      labelEn: 'One uppercase letter',
      labelBn: 'একটি বড় হাতের অক্ষর (A-Z)',
    },
    {
      id: 'lower',
      met: hasLower,
      labelEn: 'One lowercase letter',
      labelBn: 'একটি ছোট হাতের অক্ষর (a-z)',
    },
    {
      id: 'number',
      met: hasNumber,
      labelEn: 'One number (0-9)',
      labelBn: 'একটি সংখ্যা (0-9)',
    },
    {
      id: 'symbol',
      met: hasSymbol,
      labelEn: 'One symbol (!@#$)',
      labelBn: 'একটি বিশেষ চিহ্ন (!@#$)',
    },
  ];

  if (!password) {
    return {
      score: 0,
      level: 'empty',
      labelEn: 'Enter a password',
      labelBn: 'পাসওয়ার্ড লিখুন',
      criteria,
      meetsMinimum: false,
    };
  }

  let points = 0;
  if (hasLength) points += 1;
  if (hasUpper && hasLower) points += 1;
  if (hasNumber) points += 1;
  if (hasSymbol || isLongBonus) points += 1;
  if (isCommon) points = Math.min(points, 1);

  const clamped = Math.max(1, Math.min(4, points)) as 1 | 2 | 3 | 4;
  if (!hasLength || isCommon || clamped === 1) {
    return {
      score: 1,
      level: 'weak',
      labelEn: isCommon ? 'Too common' : 'Weak',
      labelBn: isCommon ? 'অতি সাধারণ পাসওয়ার্ড' : 'দুর্বল',
      criteria,
      meetsMinimum: false,
    };
  }
  if (clamped === 2) {
    return {
      score: 2,
      level: 'fair',
      labelEn: 'Fair',
      labelBn: 'মোটামুটি',
      criteria,
      meetsMinimum: true,
    };
  }
  if (clamped === 3) {
    return {
      score: 3,
      level: 'good',
      labelEn: 'Good',
      labelBn: 'ভালো',
      criteria,
      meetsMinimum: true,
    };
  }
  return {
    score: 4,
    level: 'strong',
    labelEn: 'Strong',
    labelBn: 'শক্তিশালী',
    criteria,
    meetsMinimum: true,
  };
}

export function isValidEmailAddress(email: string): boolean {
  const clean = email.trim();
  if (!clean || clean.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
}

export interface AuthValidationErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

export function validateLoginFields(
  fields: { email: string; password: string },
  lang: 'en' | 'bn' = 'en'
): AuthValidationErrors {
  const errors: AuthValidationErrors = {};
  if (!isValidEmailAddress(fields.email)) {
    errors.email =
      lang === 'bn'
        ? 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।'
        : 'Please enter a valid email address.';
  }
  if (!fields.password || fields.password.length < 1) {
    errors.password =
      lang === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন।' : 'Please enter your password.';
  }
  return errors;
}

export function validateRegistrationFields(
  fields: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
  },
  lang: 'en' | 'bn' = 'en'
): AuthValidationErrors {
  const errors: AuthValidationErrors = {};
  if (!fields.name.trim() || fields.name.trim().length < 2) {
    errors.name =
      lang === 'bn'
        ? 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (কমপক্ষে ২ অক্ষর)।'
        : 'Please enter your full name (at least 2 characters).';
  }
  if (!isValidEmailAddress(fields.email)) {
    errors.email =
      lang === 'bn'
        ? 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।'
        : 'Please enter a valid email address.';
  }
  const strength = evaluatePasswordStrength(fields.password);
  if (!fields.password || fields.password.length < MIN_PASSWORD_LENGTH) {
    errors.password =
      lang === 'bn'
        ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'
        : 'Password must be at least 8 characters long.';
  } else if (!strength.meetsMinimum) {
    errors.password =
      lang === 'bn'
        ? 'অনুগ্রহ করে আরও শক্তিশালী পাসওয়ার্ড বেছে নিন (অক্ষর ও সংখ্যা যুক্ত করুন)।'
        : 'Please choose a stronger password (combine letters and numbers).';
  }
  if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword =
      lang === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি।' : 'Passwords do not match.';
  }
  if (!fields.acceptedTerms) {
    errors.terms =
      lang === 'bn'
        ? 'এগিয়ে যেতে শর্তাবলি ও প্রাইভেসি নীতিমালায় সম্মতি দিন।'
        : 'Please accept the Terms of Service and Privacy Policy to continue.';
  }
  return errors;
}

export function validatePasswordUpdateFields(
  fields: { password: string; confirmPassword: string },
  lang: 'en' | 'bn' = 'en'
): AuthValidationErrors {
  const errors: AuthValidationErrors = {};
  const strength = evaluatePasswordStrength(fields.password);
  if (!fields.password || fields.password.length < MIN_PASSWORD_LENGTH) {
    errors.password =
      lang === 'bn'
        ? 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'
        : 'New password must be at least 8 characters long.';
  } else if (!strength.meetsMinimum) {
    errors.password =
      lang === 'bn'
        ? 'অনুগ্রহ করে আরও শক্তিশালী পাসওয়ার্ড বেছে নিন (অক্ষর ও সংখ্যা যুক্ত করুন)।'
        : 'Please choose a stronger password (combine letters and numbers).';
  }
  if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword =
      lang === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি।' : 'Passwords do not match.';
  }
  return errors;
}

export function generateSecureHexToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashSecretToken(rawToken: string): Promise<string> {
  const normalized = `${rawToken.trim()}::linguaverse_reset_v1`;
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

export interface StoredPasswordResetToken {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  consumedAt?: string;
}

export type ResetTokenCheckResult =
  | { valid: true; emailMasked: string; expiresAt: string }
  | {
      valid: false;
      reason: 'MISSING' | 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED';
      messageEn: string;
      messageBn: string;
    };

export function maskEmailAddress(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, local.length <= 2 ? 1 : 2);
  return `${visible}***@${domain}`;
}

export function evaluateResetTokenRecord(
  record: StoredPasswordResetToken | null | undefined,
  nowMs: number = Date.now()
): ResetTokenCheckResult {
  if (!record) {
    return {
      valid: false,
      reason: 'NOT_FOUND',
      messageEn: 'This password reset link is invalid. Please request a new recovery link.',
      messageBn: 'এই পাসওয়ার্ড রিসেট লিংকটি সঠিক নয়। অনুগ্রহ করে নতুন লিংক অনুরোধ করুন।',
    };
  }
  if (record.consumedAt) {
    return {
      valid: false,
      reason: 'ALREADY_USED',
      messageEn: 'This password reset link has already been used. Request a fresh link if needed.',
      messageBn: 'এই রিসেট লিংকটি ইতিমধ্যে ব্যবহৃত হয়েছে। প্রয়োজনে নতুন লিংক অনুরোধ করুন।',
    };
  }
  if (nowMs > Date.parse(record.expiresAt)) {
    return {
      valid: false,
      reason: 'EXPIRED',
      messageEn: 'This password reset link has expired (15-minute limit). Please request a new one.',
      messageBn: 'এই রিসেট লিংকটির মেয়াদ (১৫ মিনিট) শেষ হয়ে গেছে। নতুন লিংক অনুরোধ করুন।',
    };
  }
  return {
    valid: true,
    emailMasked: maskEmailAddress(record.email),
    expiresAt: record.expiresAt,
  };
}

/**
 * Pure sliding-window rate limiter used on Express & Cloudflare Workers
 */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  consume(
    key: string,
    nowMs: number = Date.now()
  ): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const cutoff = nowMs - this.windowMs;
    const prev = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);

    if (prev.length >= this.maxRequests) {
      const oldest = prev[0] ?? nowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - nowMs) / 1000));
      this.hits.set(key, prev);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    prev.push(nowMs);
    this.hits.set(key, prev);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - prev.length),
      retryAfterSeconds: 0,
    };
  }

  reset(key?: string): void {
    if (key) {
      this.hits.delete(key);
    } else {
      this.hits.clear();
    }
  }
}

export const GENERIC_RECOVERY_MESSAGE_EN =
  'If an account exists for that email address, we have sent a single-use password reset link valid for 15 minutes.';
export const GENERIC_RECOVERY_MESSAGE_BN =
  'এই ইমেইল ঠিকানায় কোনো অ্যাকাউন্ট থাকলে, ১৫ মিনিটের জন্য কার্যকর একটি পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।';
