import type { SessionJwtPayload } from '../types';

/**
 * Pure Web Crypto API security primitives for Cloudflare Workers (zero Node-only dependencies)
 * - PBKDF2-SHA256 password hashing
 * - SHA-256 OTP & token hashing
 * - HMAC-SHA256 JWT signing & verification
 */

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.trim();
  const out = new Uint8Array(new ArrayBuffer(Math.floor(clean.length / 2)));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToString(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function generateRandomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function generateSaltHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function generateSixDigitOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1_000_000).toString().padStart(6, '0');
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(new Uint8Array(digest));
}

export async function hashOtp(email: string, code: string): Promise<string> {
  return sha256Hex(`${email.trim().toLowerCase()}::${code.trim()}::lv_otp_v5`);
}

export async function hashPasswordPbkdf2(
  password: string,
  saltHex: string,
  iterations = 100_000
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(saltHex),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return `pbkdf2_v1$${iterations}$${toHex(new Uint8Array(derived))}`;
}

export async function verifyPasswordPbkdf2(
  password: string,
  saltHex: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash.startsWith('pbkdf2_v1$')) {
    return false;
  }
  const parts = storedHash.split('$');
  const iterations = Number(parts[1]) || 100_000;
  const expected = await hashPasswordPbkdf2(password, saltHex, iterations);
  if (expected.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

export async function signSessionJwt(
  payload: SessionJwtPayload,
  secret: string
): Promise<string> {
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifySessionJwt(
  token: string,
  secret: string
): Promise<SessionJwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const expectedSig = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signingInput)
    );
    const expectedB64 = base64UrlEncode(new Uint8Array(expectedSig));
    if (expectedB64.length !== sigB64.length) return null;

    let diff = 0;
    for (let i = 0; i < expectedB64.length; i++) {
      diff |= expectedB64.charCodeAt(i) ^ sigB64.charCodeAt(i);
    }
    if (diff !== 0) return null;

    const parsed = JSON.parse(base64UrlDecodeToString(payloadB64)) as SessionJwtPayload;
    if (!parsed.sub || !parsed.sid || !parsed.exp) return null;
    if (Math.floor(Date.now() / 1000) >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
