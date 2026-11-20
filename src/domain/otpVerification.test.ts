import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canResendOtp,
  generateSixDigitOtp,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  verifyOtpSubmission,
  type StoredOtpTokenRecord,
} from './otpVerification.ts';

describe('PRD v5.0 Email Verification OTP Engine', () => {
  it('generates 6-digit numeric OTP codes and deterministic SHA-256 hashes', async () => {
    const code = generateSixDigitOtp();
    assert.match(code, /^\d{6}$/);
    const hash1 = await hashOtpCode('User@Gmail.com', code);
    const hash2 = await hashOtpCode('user@gmail.com', code);
    const hashOther = await hashOtpCode('user@gmail.com', '000000');
    assert.equal(hash1, hash2);
    assert.ok(hash1.length >= 32);
    if (code !== '000000') {
      assert.notEqual(hash1, hashOther);
    }
  });

  it('verifies matching OTP within 10-minute window and rejects expired, wrong, or over-limit attempts', async () => {
    const now = Date.parse('2026-06-15T10:00:00.000Z');
    const code = '482913';
    const token: StoredOtpTokenRecord = {
      id: 'otp_1',
      userId: 'usr_1',
      email: 'learner@gmail.com',
      otpHash: await hashOtpCode('learner@gmail.com', code),
      expiresAt: new Date(now + OTP_EXPIRY_MS).toISOString(),
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString(),
      attempts: 0,
      createdAt: new Date(now).toISOString(),
    };

    const okRes = await verifyOtpSubmission({
      token,
      submittedCode: '482913',
      nowMs: now + 60_000,
    });
    assert.equal(okRes.ok, true);

    const wrongRes = await verifyOtpSubmission({
      token,
      submittedCode: '111111',
      nowMs: now + 60_000,
    });
    assert.equal(wrongRes.ok, false);
    if (!wrongRes.ok) {
      assert.equal(wrongRes.code, 'MISMATCH');
      assert.equal(wrongRes.remainingAttempts, OTP_MAX_ATTEMPTS - 1);
    }

    const expiredRes = await verifyOtpSubmission({
      token,
      submittedCode: code,
      nowMs: now + OTP_EXPIRY_MS + 1000,
    });
    assert.equal(expiredRes.ok, false);
    if (!expiredRes.ok) {
      assert.equal(expiredRes.code, 'EXPIRED');
    }

    const lockedRes = await verifyOtpSubmission({
      token: { ...token, attempts: OTP_MAX_ATTEMPTS },
      submittedCode: code,
      nowMs: now + 30_000,
    });
    assert.equal(lockedRes.ok, false);
    if (!lockedRes.ok) {
      assert.equal(lockedRes.code, 'TOO_MANY_ATTEMPTS');
    }
  });

  it('enforces 60-second resend cooldown accurately', () => {
    const now = Date.parse('2026-06-15T10:00:00.000Z');
    const token: StoredOtpTokenRecord = {
      id: 'otp_2',
      userId: 'usr_1',
      email: 'learner@gmail.com',
      otpHash: 'abc',
      expiresAt: new Date(now + OTP_EXPIRY_MS).toISOString(),
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString(),
      attempts: 0,
      createdAt: new Date(now).toISOString(),
    };

    const tooSoon = canResendOtp(token, now + 20_000);
    assert.equal(tooSoon.allowed, false);
    assert.equal(tooSoon.waitSeconds, 40);

    const ready = canResendOtp(token, now + 61_000);
    assert.equal(ready.allowed, true);
    assert.equal(ready.waitSeconds, 0);
  });
});
