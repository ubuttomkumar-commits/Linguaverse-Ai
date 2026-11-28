/**
 * Persistent Server-Side Authentication & Security Store (.data/auth-store.json)
 * - Real Node.js crypto.scrypt password hashing with random per-user 16-byte salt & timingSafeEqual
 * - Secure session tokens (HttpOnly cookie support + Bearer fallback), Remember Me TTL (30d vs 24h)
 * - Session revocation on logout and on password reset (revokes ALL active sessions for that account)
 * - Single-use SHA-256 hashed password reset tokens (15-min expiry, 60s resend cooldown)
 * - Generic anti-enumeration recovery responses
 * - Sliding-window rate limiting per IP/email
 * - Real Google OAuth configuration status detection (never simulates OAuth success)
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluatePasswordStrength,
  evaluateResetTokenRecord,
  GENERIC_RECOVERY_MESSAGE_EN,
  generateSecureHexToken,
  hashSecretToken,
  isValidEmailAddress,
  RESET_RESEND_COOLDOWN_MS,
  RESET_TOKEN_EXPIRY_MS,
  SlidingWindowRateLimiter,
  type StoredPasswordResetToken,
} from '../src/domain/authSecurityEngine.ts';
import {
  generateSixDigitOtp,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  verifyOtpSubmission,
  type StoredOtpTokenRecord,
} from '../src/domain/otpVerification.ts';

export interface ServerAuthUser {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'institution';
  role: 'super_admin' | 'admin' | 'content_manager' | 'ai_ops' | 'moderator' | 'learner';
  emailVerified: boolean;
  accountStatus: 'active' | 'suspended';
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerAuthSession {
  id: string;
  tokenHash: string;
  userId: string;
  rememberMe: boolean;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

interface FailedLoginBucket {
  attempts: number;
  lockedUntil?: string;
}

interface AuthStoreFile {
  version: 1;
  users: Record<string, ServerAuthUser>;
  sessions: Record<string, ServerAuthSession>;
  resetTokens: StoredPasswordResetToken[];
  otpTokens: Record<string, StoredOtpTokenRecord[]>;
  resetCooldownByEmail: Record<string, string>;
  failedLogins: Record<string, FailedLoginBucket>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const AUTH_STORE_FILE = path.join(DATA_DIR, 'auth-store.json');

const SESSION_SHORT_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACCOUNT_LOCKOUT_MAX_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Dedicated sliding-window rate limiters
export const authLoginLimiter = new SlidingWindowRateLimiter(12, 15 * 60 * 1000);
export const authRegisterLimiter = new SlidingWindowRateLimiter(8, 15 * 60 * 1000);
export const authRecoveryLimiter = new SlidingWindowRateLimiter(6, 15 * 60 * 1000);
export const authOtpLimiter = new SlidingWindowRateLimiter(10, 15 * 60 * 1000);

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function emptyStore(): AuthStoreFile {
  return {
    version: 1,
    users: {},
    sessions: {},
    resetTokens: [],
    otpTokens: {},
    resetCooldownByEmail: {},
    failedLogins: {},
  };
}

function readStore(): AuthStoreFile {
  ensureDir();
  if (!fs.existsSync(AUTH_STORE_FILE)) {
    return emptyStore();
  }
  try {
    const raw = fs.readFileSync(AUTH_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AuthStoreFile>;
    return {
      version: 1,
      users: parsed.users ?? {},
      sessions: parsed.sessions ?? {},
      resetTokens: Array.isArray(parsed.resetTokens) ? parsed.resetTokens : [],
      otpTokens: parsed.otpTokens ?? {},
      resetCooldownByEmail: parsed.resetCooldownByEmail ?? {},
      failedLogins: parsed.failedLogins ?? {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: AuthStoreFile): void {
  ensureDir();
  fs.writeFileSync(AUTH_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

export function hashPasswordScrypt(password: string, salt?: string): {
  salt: string;
  hash: string;
} {
  const actualSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64, { N: 16384, r: 8, p: 1 });
  return {
    salt: actualSalt,
    hash: derived.toString('hex'),
  };
}

export function verifyPasswordScrypt(password: string, salt: string, expectedHex: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sanitizeUser(user: ServerAuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    role: user.role,
    emailVerified: user.emailVerified,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
  };
}

export function getAuthProviderStatus() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY?.trim() || process.env.EMAIL_PROVIDER_API_KEY?.trim()
  );

  return {
    google: {
      configured: Boolean(googleClientId && googleClientSecret),
    },
    emailDelivery: {
      configured: emailConfigured,
      mode: emailConfigured ? 'email_provider' : 'local_dev_preview',
    },
  };
}

export function issueCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    out[key] = val;
  }
  return out;
}

export function createServerSession(userId: string, rememberMe: boolean): {
  rawToken: string;
  session: ServerAuthSession;
} {
  const store = readStore();
  const rawToken = `lvs_${crypto.randomBytes(32).toString('hex')}`;
  const now = Date.now();
  const ttl = rememberMe ? SESSION_REMEMBER_MS : SESSION_SHORT_MS;
  const session: ServerAuthSession = {
    id: `sess_${crypto.randomBytes(8).toString('hex')}`,
    tokenHash: sha256Hex(rawToken),
    userId,
    rememberMe,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl).toISOString(),
  };
  store.sessions[session.id] = session;
  writeStore(store);
  return { rawToken, session };
}

export function resolveSessionByRawToken(rawToken: string | undefined): {
  user: ReturnType<typeof sanitizeUser>;
  session: ServerAuthSession;
} | null {
  if (!rawToken) return null;
  const store = readStore();
  const targetHash = sha256Hex(rawToken);
  const session = Object.values(store.sessions).find((s) => s.tokenHash === targetHash);
  if (!session || session.revokedAt) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }
  const user = store.users[session.userId];
  if (!user || user.accountStatus === 'suspended') return null;
  return { user: sanitizeUser(user), session };
}

export function revokeSessionByRawToken(rawToken: string | undefined): boolean {
  if (!rawToken) return false;
  const store = readStore();
  const targetHash = sha256Hex(rawToken);
  const session = Object.values(store.sessions).find((s) => s.tokenHash === targetHash);
  if (!session) return false;
  session.revokedAt = new Date().toISOString();
  writeStore(store);
  return true;
}

export function revokeAllUserSessions(userId: string): number {
  const store = readStore();
  const nowIso = new Date().toISOString();
  let count = 0;
  for (const session of Object.values(store.sessions)) {
    if (session.userId === userId && !session.revokedAt) {
      session.revokedAt = nowIso;
      count += 1;
    }
  }
  writeStore(store);
  return count;
}

export async function registerServerUser(payload: {
  name: string;
  email: string;
  password: string;
  plan?: 'free' | 'pro';
}): Promise<
  | {
      ok: true;
      user: ReturnType<typeof sanitizeUser>;
      rawSessionToken: string;
      session: ServerAuthSession;
      otpCode: string;
      otpExpiresAt: string;
      otpResendAvailableAt: string;
    }
  | { ok: false; status: number; error: string }
> {
  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;

  if (name.length < 2) {
    return { ok: false, status: 400, error: 'Please enter your full name (at least 2 characters).' };
  }
  if (!isValidEmailAddress(email)) {
    return { ok: false, status: 400, error: 'Please enter a valid email address.' };
  }
  const strength = evaluatePasswordStrength(password);
  if (password.length < 8 || !strength.meetsMinimum) {
    return {
      ok: false,
      status: 400,
      error: 'Password must be at least 8 characters and combine letters and numbers.',
    };
  }

  const store = readStore();
  const duplicate = Object.values(store.users).find((u) => u.email === email);
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      error: 'An account with this email already exists. Please sign in instead.',
    };
  }

  const nowIso = new Date().toISOString();
  const { salt, hash } = hashPasswordScrypt(password);
  const userId = `usr_${crypto.randomBytes(7).toString('hex')}`;
  const user: ServerAuthUser = {
    id: userId,
    name,
    email,
    // Always start self-registered accounts on the free tier with learner role
    plan: 'free',
    role: 'learner',
    emailVerified: false,
    accountStatus: 'active',
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Issue initial 6-digit SHA-256 OTP
  const nowMs = Date.now();
  const otpCode = generateSixDigitOtp();
  const otpHash = await hashOtpCode(email, otpCode);
  const otpExpiresAt = new Date(nowMs + OTP_EXPIRY_MS).toISOString();
  const otpResendAvailableAt = new Date(nowMs + OTP_RESEND_COOLDOWN_MS).toISOString();
  const otpRecord: StoredOtpTokenRecord = {
    id: `otp_${crypto.randomBytes(6).toString('hex')}`,
    userId,
    email,
    otpHash,
    expiresAt: otpExpiresAt,
    resendAvailableAt: otpResendAvailableAt,
    attempts: 0,
    createdAt: nowIso,
  };

  store.users[userId] = user;
  store.otpTokens[userId] = [otpRecord];
  writeStore(store);

  const { rawToken, session } = createServerSession(userId, true);
  return {
    ok: true,
    user: sanitizeUser(user),
    rawSessionToken: rawToken,
    session,
    otpCode,
    otpExpiresAt,
    otpResendAvailableAt,
  };
}

function checkStoreLockout(
  store: AuthStoreFile,
  key: string
): { locked: boolean; retryAfterSeconds: number } {
  const bucket = store.failedLogins[key];
  if (!bucket?.lockedUntil) return { locked: false, retryAfterSeconds: 0 };
  const remainingMs = Date.parse(bucket.lockedUntil) - Date.now();
  if (remainingMs > 0) {
    return { locked: true, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
  }
  delete store.failedLogins[key];
  return { locked: false, retryAfterSeconds: 0 };
}

function recordStoreFailedLogin(
  store: AuthStoreFile,
  key: string
): { locked: boolean; retryAfterSeconds: number } {
  const prev = store.failedLogins[key];
  const attempts = (prev?.attempts ?? 0) + 1;
  if (attempts >= ACCOUNT_LOCKOUT_MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + ACCOUNT_LOCKOUT_DURATION_MS).toISOString();
    store.failedLogins[key] = { attempts, lockedUntil };
    writeStore(store);
    return { locked: true, retryAfterSeconds: Math.ceil(ACCOUNT_LOCKOUT_DURATION_MS / 1000) };
  }
  store.failedLogins[key] = { attempts };
  writeStore(store);
  return { locked: false, retryAfterSeconds: 0 };
}

export function loginServerUser(payload: {
  email: string;
  password: string;
  rememberMe?: boolean;
}):
  | {
      ok: true;
      user: ReturnType<typeof sanitizeUser>;
      rawSessionToken: string;
      session: ServerAuthSession;
    }
  | { ok: false; status: number; error: string; code?: string; retryAfterSeconds?: number } {
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;

  if (!isValidEmailAddress(email) || !password) {
    return { ok: false, status: 400, error: 'Please enter a valid email and password.' };
  }

  const store = readStore();
  const lockKey = `learner:${sha256Hex(email)}`;
  const lockStatus = checkStoreLockout(store, lockKey);
  if (lockStatus.locked) {
    return {
      ok: false,
      status: 429,
      code: 'ACCOUNT_LOCKED',
      retryAfterSeconds: lockStatus.retryAfterSeconds,
      error: 'Too many failed sign-in attempts for this account. Please wait before trying again.',
    };
  }

  const user = Object.values(store.users).find((u) => u.email === email);
  if (!user || !verifyPasswordScrypt(password, user.passwordSalt, user.passwordHash)) {
    const failOutcome = recordStoreFailedLogin(store, lockKey);
    if (failOutcome.locked) {
      return {
        ok: false,
        status: 429,
        code: 'ACCOUNT_LOCKED',
        retryAfterSeconds: failOutcome.retryAfterSeconds,
        error: 'Too many failed sign-in attempts for this account. Please wait before trying again.',
      };
    }
    // Generic error message prevents user enumeration
    return {
      ok: false,
      status: 401,
      error: 'Invalid email or password. Please check your credentials and try again.',
    };
  }

  if (store.failedLogins[lockKey]) {
    delete store.failedLogins[lockKey];
    writeStore(store);
  }

  if (user.accountStatus === 'suspended') {
    return {
      ok: false,
      status: 403,
      error: 'This account is currently suspended. Please contact support.',
    };
  }

  const { rawToken, session } = createServerSession(user.id, Boolean(payload.rememberMe));
  return {
    ok: true,
    user: sanitizeUser(user),
    rawSessionToken: rawToken,
    session,
  };
}

export async function verifyServerEmailOtp(
  userId: string,
  code: string
): Promise<
  | { ok: true; user: ReturnType<typeof sanitizeUser> }
  | { ok: false; status: number; error: string }
> {
  const store = readStore();
  const user = store.users[userId];
  if (!user) {
    return { ok: false, status: 404, error: 'Account not found.' };
  }
  const tokens = store.otpTokens[userId] ?? [];
  const latest = tokens[0];
  const outcome = await verifyOtpSubmission({ token: latest, submittedCode: code });
  if (!outcome.ok) {
    if (latest && outcome.code === 'MISMATCH') {
      latest.attempts = Math.min(OTP_MAX_ATTEMPTS, latest.attempts + 1);
      writeStore(store);
    }
    return { ok: false, status: 400, error: outcome.messageEn };
  }

  latest.consumedAt = new Date().toISOString();
  user.emailVerified = true;
  user.updatedAt = new Date().toISOString();
  writeStore(store);
  return { ok: true, user: sanitizeUser(user) };
}

export async function resendServerEmailOtp(userId: string): Promise<
  | {
      ok: true;
      email: string;
      name: string;
      otpCode: string;
      otpExpiresAt: string;
      otpResendAvailableAt: string;
    }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number }
> {
  const store = readStore();
  const user = store.users[userId];
  if (!user) {
    return { ok: false, status: 404, error: 'Account not found.' };
  }
  if (user.emailVerified) {
    return { ok: false, status: 400, error: 'Email address is already verified.' };
  }

  const nowMs = Date.now();
  const existing = store.otpTokens[userId] ?? [];
  const latest = existing[0];
  if (latest?.resendAvailableAt) {
    const waitMs = Date.parse(latest.resendAvailableAt) - nowMs;
    if (waitMs > 0) {
      const retryAfterSeconds = Math.ceil(waitMs / 1000);
      return {
        ok: false,
        status: 429,
        error: `Please wait ${retryAfterSeconds}s before requesting a new verification code.`,
        retryAfterSeconds,
      };
    }
  }

  const otpCode = generateSixDigitOtp();
  const otpHash = await hashOtpCode(user.email, otpCode);
  const nowIso = new Date(nowMs).toISOString();
  const otpExpiresAt = new Date(nowMs + OTP_EXPIRY_MS).toISOString();
  const otpResendAvailableAt = new Date(nowMs + OTP_RESEND_COOLDOWN_MS).toISOString();

  const record: StoredOtpTokenRecord = {
    id: `otp_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    email: user.email,
    otpHash,
    expiresAt: otpExpiresAt,
    resendAvailableAt: otpResendAvailableAt,
    attempts: 0,
    createdAt: nowIso,
  };

  store.otpTokens[userId] = [record, ...existing].slice(0, 5);
  writeStore(store);

  return {
    ok: true,
    email: user.email,
    name: user.name,
    otpCode,
    otpExpiresAt,
    otpResendAvailableAt,
  };
}

export async function createPasswordResetRequest(payload: {
  email: string;
}): Promise<{
  ok: true;
  message: string;
  cooldownSeconds: number;
  resetEmailPayload?: {
    email: string;
    name: string;
    rawToken: string;
    expiresAt: string;
  };
}> {
  const email = payload.email.trim().toLowerCase();
  const store = readStore();
  const nowMs = Date.now();

  const lastCooldown = store.resetCooldownByEmail[email];
  if (lastCooldown && Date.parse(lastCooldown) > nowMs) {
    const wait = Math.max(1, Math.ceil((Date.parse(lastCooldown) - nowMs) / 1000));
    return {
      ok: true,
      message: GENERIC_RECOVERY_MESSAGE_EN,
      cooldownSeconds: wait,
    };
  }

  store.resetCooldownByEmail[email] = new Date(nowMs + RESET_RESEND_COOLDOWN_MS).toISOString();

  const user = Object.values(store.users).find((u) => u.email === email);
  if (!user) {
    // Still write cooldown so attackers cannot distinguish registered vs unregistered emails
    writeStore(store);
    return {
      ok: true,
      message: GENERIC_RECOVERY_MESSAGE_EN,
      cooldownSeconds: Math.ceil(RESET_RESEND_COOLDOWN_MS / 1000),
    };
  }

  // Invalidate any prior unconsumed reset tokens for this user
  for (const t of store.resetTokens) {
    if (t.userId === user.id && !t.consumedAt) {
      t.consumedAt = new Date(nowMs).toISOString();
    }
  }

  const rawToken = generateSecureHexToken(32);
  const tokenHash = await hashSecretToken(rawToken);
  const expiresAt = new Date(nowMs + RESET_TOKEN_EXPIRY_MS).toISOString();

  store.resetTokens.unshift({
    id: `rst_${crypto.randomBytes(6).toString('hex')}`,
    userId: user.id,
    email: user.email,
    tokenHash,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt,
  });
  store.resetTokens = store.resetTokens.slice(0, 100);
  writeStore(store);

  return {
    ok: true,
    message: GENERIC_RECOVERY_MESSAGE_EN,
    cooldownSeconds: Math.ceil(RESET_RESEND_COOLDOWN_MS / 1000),
    resetEmailPayload: {
      email: user.email,
      name: user.name,
      rawToken,
      expiresAt,
    },
  };
}

/**
 * Ensures a browser-local registered user is mirrored into the server auth store
 * strictly as a least-privilege unverified free learner account (never granting
 * pro plan, privileged roles, or bypassing email verification from client input).
 */
export function ensureServerUserMirror(payload: {
  id?: string;
  name: string;
  email: string;
  password: string;
}): void {
  const email = payload.email.trim().toLowerCase();
  if (!isValidEmailAddress(email)) return;
  const store = readStore();
  const existing = Object.values(store.users).find((u) => u.email === email);
  if (existing) return;

  const nowIso = new Date().toISOString();
  const { salt, hash } = hashPasswordScrypt(payload.password);
  const userId = payload.id || `usr_${crypto.randomBytes(7).toString('hex')}`;
  store.users[userId] = {
    id: userId,
    name: payload.name.trim() || 'Learner',
    email,
    plan: 'free',
    role: 'learner',
    emailVerified: false,
    accountStatus: 'active',
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  writeStore(store);
}

export async function validateServerResetToken(rawToken: string) {
  if (!rawToken || rawToken.trim().length < 16) {
    return evaluateResetTokenRecord(null);
  }
  const store = readStore();
  const targetHash = await hashSecretToken(rawToken);
  const record = store.resetTokens.find((t) => t.tokenHash === targetHash);
  return evaluateResetTokenRecord(record);
}

export async function completeServerPasswordReset(payload: {
  token: string;
  newPassword: string;
}): Promise<
  | {
      ok: true;
      email: string;
      revokedSessionsCount: number;
    }
  | { ok: false; status: number; reason?: string; error: string }
> {
  const strength = evaluatePasswordStrength(payload.newPassword);
  if (!payload.newPassword || payload.newPassword.length < 8 || !strength.meetsMinimum) {
    return {
      ok: false,
      status: 400,
      error: 'New password must be at least 8 characters and combine letters and numbers.',
    };
  }

  const store = readStore();
  const targetHash = await hashSecretToken(payload.token);
  const record = store.resetTokens.find((t) => t.tokenHash === targetHash);
  const check = evaluateResetTokenRecord(record);
  if (!check.valid || !record) {
    return {
      ok: false,
      status: 400,
      reason: check.valid ? 'NOT_FOUND' : check.reason,
      error: check.valid ? 'Invalid reset token.' : check.messageEn,
    };
  }

  const user = store.users[record.userId];
  if (!user) {
    return { ok: false, status: 404, error: 'Associated account was not found.' };
  }

  const { salt, hash } = hashPasswordScrypt(payload.newPassword);
  const nowIso = new Date().toISOString();
  user.passwordSalt = salt;
  user.passwordHash = hash;
  user.emailVerified = true;
  user.updatedAt = nowIso;

  // Single-use token consumption
  record.consumedAt = nowIso;

  // Security Policy: revoke ALL active sessions for this user upon password reset
  let revokedSessionsCount = 0;
  for (const sess of Object.values(store.sessions)) {
    if (sess.userId === user.id && !sess.revokedAt) {
      sess.revokedAt = nowIso;
      revokedSessionsCount += 1;
    }
  }

  writeStore(store);

  return {
    ok: true,
    email: user.email,
    revokedSessionsCount,
  };
}

const VALID_SERVER_ADMIN_ROLES = new Set([
  'learner',
  'moderator',
  'content_manager',
  'ai_ops',
  'admin',
  'super_admin',
]);

export function listServerAdminUsers(search?: string) {
  const store = readStore();
  const q = (search ?? '').trim().toLowerCase();
  return Object.values(store.users)
    .filter((u) => {
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((u) => sanitizeUser(u));
}

export function adminUpdateServerUser(
  targetUserId: string,
  actorUserId: string,
  patch: { role?: string; accountStatus?: 'active' | 'suspended'; plan?: 'free' | 'pro' | 'institution' },
  actorRole: string = 'admin'
):
  | { ok: true; user: ReturnType<typeof sanitizeUser>; revokedSessions: number }
  | { ok: false; status: number; error: string } {
  const store = readStore();
  const user = store.users[targetUserId];
  if (!user) {
    return { ok: false, status: 404, error: 'Target user account not found.' };
  }
  if (patch.role !== undefined && !VALID_SERVER_ADMIN_ROLES.has(patch.role)) {
    return { ok: false, status: 400, error: 'Invalid RBAC role.' };
  }
  if (patch.accountStatus !== undefined && patch.accountStatus !== 'active' && patch.accountStatus !== 'suspended') {
    return { ok: false, status: 400, error: 'Invalid accountStatus.' };
  }
  if (patch.plan !== undefined && patch.plan !== 'free' && patch.plan !== 'pro' && patch.plan !== 'institution') {
    return { ok: false, status: 400, error: 'Invalid subscription plan.' };
  }

  // Prevent vertical privilege escalation and unauthorized super_admin mutations
  if (actorRole !== 'super_admin') {
    if (user.role === 'super_admin') {
      return { ok: false, status: 403, error: 'Only a Super Admin can modify a Super Admin account.' };
    }
    if (patch.role === 'super_admin') {
      return { ok: false, status: 403, error: 'Only a Super Admin can assign the super_admin role.' };
    }
  }

  if (targetUserId === actorUserId) {
    if (patch.accountStatus === 'suspended') {
      return { ok: false, status: 400, error: 'Cannot suspend your own active admin account.' };
    }
    if (patch.role !== undefined && patch.role !== user.role) {
      return { ok: false, status: 400, error: 'Cannot change your own administrator role.' };
    }
  }

  const previousRole = user.role;
  if (patch.role !== undefined) {
    user.role = patch.role as typeof user.role;
  }
  let revokedSessions = 0;
  if (patch.accountStatus !== undefined) {
    user.accountStatus = patch.accountStatus;
  }
  if (patch.plan !== undefined) {
    user.plan = patch.plan;
  }
  const demotedToLearner = previousRole !== 'learner' && user.role === 'learner';
  if (user.accountStatus === 'suspended' || demotedToLearner) {
    const nowIso = new Date().toISOString();
    for (const s of Object.values(store.sessions)) {
      if (s.userId === targetUserId && !s.revokedAt) {
        s.revokedAt = nowIso;
        revokedSessions += 1;
      }
    }
  }
  user.updatedAt = new Date().toISOString();
  writeStore(store);
  return { ok: true, user: sanitizeUser(user), revokedSessions };
}

export function adminDeleteServerUser(
  targetUserId: string,
  actorUserId: string,
  actorRole: string = 'admin'
): { ok: true; email: string } | { ok: false; status: number; error: string } {
  if (targetUserId === actorUserId) {
    return { ok: false, status: 400, error: 'Cannot delete your own active admin account.' };
  }
  const store = readStore();
  const user = store.users[targetUserId];
  if (!user) {
    return { ok: false, status: 404, error: 'Target user account not found.' };
  }
  if (user.role === 'super_admin' && actorRole !== 'super_admin') {
    return { ok: false, status: 403, error: 'Only a Super Admin can delete a Super Admin account.' };
  }
  const email = user.email;
  delete store.users[targetUserId];
  for (const [sid, sess] of Object.entries(store.sessions)) {
    if (sess.userId === targetUserId) delete store.sessions[sid];
  }
  delete store.otpTokens[targetUserId];
  store.resetTokens = store.resetTokens.filter((t) => t.userId !== targetUserId);
  writeStore(store);
  return { ok: true, email };
}

export function getServerAuthStats() {
  const store = readStore();
  const users = Object.values(store.users);
  const now = Date.now();
  const activeSessions = Object.values(store.sessions).filter(
    (s) => !s.revokedAt && Date.parse(s.expiresAt) > now
  ).length;
  return {
    totalUsers: users.length,
    verifiedUsers: users.filter((u) => u.emailVerified).length,
    suspendedUsers: users.filter((u) => u.accountStatus === 'suspended').length,
    activeSessions,
  };
}

export function hasServerAdminAccount(): boolean {
  const store = readStore();
  return Object.values(store.users).some(
    (u) => u.role === 'admin' || u.role === 'super_admin'
  );
}

export function bootstrapInitialServerSuperAdmin(input: {
  name: string;
  email: string;
  password: string;
}):
  | {
      ok: true;
      user: ReturnType<typeof sanitizeUser>;
      rawToken: string;
      session: ServerAuthSession;
    }
  | { ok: false; status: number; code: string; error: string } {
  const store = readStore();
  const existingAdmin = Object.values(store.users).some(
    (u) => u.role === 'admin' || u.role === 'super_admin'
  );
  if (existingAdmin) {
    return {
      ok: false,
      status: 409,
      code: 'ADMIN_ALREADY_PROVISIONED',
      error: 'Initial administrator has already been provisioned. Sign in with an existing admin account.',
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const duplicate = Object.values(store.users).find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      code: 'EMAIL_EXISTS',
      error: 'An account with this email already exists.',
    };
  }

  const nowIso = new Date().toISOString();
  const { salt, hash } = hashPasswordScrypt(input.password);
  const user: ServerAuthUser = {
    id: `usr_${crypto.randomBytes(8).toString('hex')}`,
    name: input.name.trim(),
    email: normalizedEmail,
    plan: 'institution',
    role: 'super_admin',
    emailVerified: true,
    accountStatus: 'active',
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  store.users[user.id] = user;
  writeStore(store);

  const { rawToken, session } = createServerSession(user.id, true);
  return {
    ok: true,
    user: sanitizeUser(user),
    rawToken,
    session,
  };
}

export function loginServerAdminUser(input: {
  email: string;
  password: string;
  rememberMe?: boolean;
}):
  | {
      ok: true;
      user: ReturnType<typeof sanitizeUser>;
      rawToken: string;
      session: ServerAuthSession;
    }
  | { ok: false; status: number; code: string; error: string; retryAfterSeconds?: number } {
  const normalizedEmail = input.email.trim().toLowerCase();
  const store = readStore();
  const lockKey = `admin:${sha256Hex(normalizedEmail)}`;
  const lockStatus = checkStoreLockout(store, lockKey);
  if (lockStatus.locked) {
    return {
      ok: false,
      status: 429,
      code: 'ACCOUNT_LOCKED',
      retryAfterSeconds: lockStatus.retryAfterSeconds,
      error: 'Too many failed administrator login attempts. Please wait before trying again.',
    };
  }

  const user = Object.values(store.users).find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );
  if (!user || !verifyPasswordScrypt(input.password, user.passwordSalt, user.passwordHash)) {
    const failOutcome = recordStoreFailedLogin(store, lockKey);
    if (failOutcome.locked) {
      return {
        ok: false,
        status: 429,
        code: 'ACCOUNT_LOCKED',
        retryAfterSeconds: failOutcome.retryAfterSeconds,
        error: 'Too many failed administrator login attempts. Please wait before trying again.',
      };
    }
    return {
      ok: false,
      status: 401,
      code: 'INVALID_CREDENTIALS',
      error: 'Invalid administrator email or password.',
    };
  }
  if (store.failedLogins[lockKey]) {
    delete store.failedLogins[lockKey];
    writeStore(store);
  }
  if (user.accountStatus === 'suspended') {
    return {
      ok: false,
      status: 403,
      code: 'ACCOUNT_SUSPENDED',
      error: 'This administrator account is suspended.',
    };
  }
  if (user.role === 'learner') {
    return {
      ok: false,
      status: 403,
      code: 'ADMIN_ROLE_REQUIRED',
      error: 'Administrator privileges are required to sign into the Admin Application.',
    };
  }
  const { rawToken, session } = createServerSession(user.id, Boolean(input.rememberMe));
  return {
    ok: true,
    user: sanitizeUser(user),
    rawToken,
    session,
  };
}


