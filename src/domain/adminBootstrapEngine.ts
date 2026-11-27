/**
 * Pure Domain Engine for Separate Admin Application Authentication & One-Time Initial Provisioning
 * - Enforces zero public admin registration and zero hardcoded production credentials.
 * - Permanently locks bootstrap once any admin or super_admin account exists.
 * - Fails closed in production if ADMIN_BOOTSTRAP_SECRET is unset.
 */

import { isValidEmailAddress } from './authSecurityEngine.ts';

export const ADMIN_PORTAL_ROLES = [
  'super_admin',
  'admin',
  'content_manager',
  'ai_ops',
  'moderator',
] as const;

export type AdminPortalRole = (typeof ADMIN_PORTAL_ROLES)[number];

export function isAdminPortalRole(role: string | undefined | null): role is AdminPortalRole {
  if (!role) return false;
  return (ADMIN_PORTAL_ROLES as readonly string[]).includes(role);
}

/**
 * Constant-time string comparison safe in both Node.js and Cloudflare Workers.
 */
export function constantTimeSecretMatch(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bytesA = enc.encode(a);
  const bytesB = enc.encode(b);
  const maxLen = Math.max(bytesA.length, bytesB.length);
  if (maxLen === 0) return false;
  let diff = bytesA.length ^ bytesB.length;
  for (let i = 0; i < maxLen; i += 1) {
    diff |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  }
  return diff === 0;
}

export interface ValidatedBootstrapPayload {
  name: string;
  email: string;
  password: string;
  bootstrapSecret: string;
}

export function validateInitialAdminBootstrapInput(
  input: unknown
): { ok: true; data: ValidatedBootstrapPayload } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Invalid request payload.' };
  }
  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';
  const bootstrapSecret =
    typeof raw.bootstrapSecret === 'string' ? raw.bootstrapSecret.trim() : '';

  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: 'Administrator name must be between 2 and 80 characters.' };
  }
  if (!isValidEmailAddress(email)) {
    return { ok: false, error: 'Enter a valid administrator email address.' };
  }
  if (password.length < 10 || password.length > 128) {
    return { ok: false, error: 'Administrator password must be at least 10 characters long.' };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      error: 'Administrator password must include uppercase, lowercase, and numeric characters.',
    };
  }
  return {
    ok: true,
    data: { name, email, password, bootstrapSecret },
  };
}

export interface BootstrapPolicyInput {
  hasExistingAdmin: boolean;
  isProduction: boolean;
  configuredSecret: string;
  providedSecret: string;
}

export type BootstrapPolicyDecision =
  | { allowed: true }
  | { allowed: false; status: 403 | 409 | 503; code: string; error: string };

export function evaluateBootstrapPolicy(input: BootstrapPolicyInput): BootstrapPolicyDecision {
  if (input.hasExistingAdmin) {
    return {
      allowed: false,
      status: 409,
      code: 'ADMIN_ALREADY_PROVISIONED',
      error: 'Initial administrator has already been provisioned. Sign in with an existing admin account.',
    };
  }

  const secret = input.configuredSecret.trim();
  if (input.isProduction && secret.length < 16) {
    return {
      allowed: false,
      status: 503,
      code: 'BOOTSTRAP_SECRET_UNCONFIGURED',
      error: 'Production admin bootstrap requires ADMIN_BOOTSTRAP_SECRET (min 16 chars) configured on the server.',
    };
  }

  if (secret.length > 0) {
    if (!constantTimeSecretMatch(secret, input.providedSecret.trim())) {
      return {
        allowed: false,
        status: 403,
        code: 'INVALID_BOOTSTRAP_SECRET',
        error: 'Invalid initial provisioning secret.',
      };
    }
  }

  return { allowed: true };
}
