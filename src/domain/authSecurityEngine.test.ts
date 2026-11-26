import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordStrength,
  evaluateResetTokenRecord,
  generateSecureHexToken,
  hashSecretToken,
  maskEmailAddress,
  RESET_TOKEN_EXPIRY_MS,
  SlidingWindowRateLimiter,
  validateLoginFields,
  validatePasswordUpdateFields,
  validateRegistrationFields,
} from './authSecurityEngine';

test('evaluatePasswordStrength scores empty, weak/common, fair, good, and strong passwords accurately', () => {
  assert.equal(evaluatePasswordStrength('').score, 0);
  assert.equal(evaluatePasswordStrength('short').meetsMinimum, false);
  assert.equal(evaluatePasswordStrength('password123').level, 'weak');
  assert.equal(evaluatePasswordStrength('password123').meetsMinimum, false);
  assert.equal(evaluatePasswordStrength('Linguaverse1').score >= 3, true);
  assert.equal(evaluatePasswordStrength('LinguaVerse#2026!').score, 4);
  assert.equal(evaluatePasswordStrength('LinguaVerse#2026!').level, 'strong');
});

test('validateRegistrationFields enforces name, email, strong password, confirmation match, and terms acceptance', () => {
  const invalid = validateRegistrationFields({
    name: 'A',
    email: 'not-an-email',
    password: 'password',
    confirmPassword: 'other',
    acceptedTerms: false,
  });
  assert.ok(invalid.name);
  assert.ok(invalid.email);
  assert.ok(invalid.password);
  assert.ok(invalid.confirmPassword);
  assert.ok(invalid.terms);

  const valid = validateRegistrationFields({
    name: 'Nusrat Jahan',
    email: 'nusrat@example.com',
    password: 'LinguaVerse#2026',
    confirmPassword: 'LinguaVerse#2026',
    acceptedTerms: true,
  });
  assert.deepEqual(valid, {});
});

test('validateLoginFields and validatePasswordUpdateFields reject malformed input cleanly', () => {
  assert.ok(validateLoginFields({ email: 'bad', password: '' }).email);
  assert.ok(validateLoginFields({ email: 'bad', password: '' }).password);
  assert.deepEqual(validateLoginFields({ email: 'a@b.co', password: 'secret' }), {});

  assert.ok(
    validatePasswordUpdateFields({ password: 'LinguaVerse#2026', confirmPassword: 'mismatch' })
      .confirmPassword
  );
  assert.deepEqual(
    validatePasswordUpdateFields({
      password: 'LinguaVerse#2026',
      confirmPassword: 'LinguaVerse#2026',
    }),
    {}
  );
});

test('reset tokens hash deterministically and reject expired or already-used records', async () => {
  const raw = generateSecureHexToken(24);
  assert.equal(raw.length, 48);
  const hashA = await hashSecretToken(raw);
  const hashB = await hashSecretToken(raw);
  assert.equal(hashA, hashB);

  const now = Date.now();
  const active = evaluateResetTokenRecord(
    {
      id: 'rst_1',
      userId: 'usr_1',
      email: 'learner@linguaverse.ai',
      tokenHash: hashA,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + RESET_TOKEN_EXPIRY_MS).toISOString(),
    },
    now + 5_000
  );
  assert.equal(active.valid, true);
  if (active.valid) {
    assert.equal(active.emailMasked, maskEmailAddress('learner@linguaverse.ai'));
  }

  const expired = evaluateResetTokenRecord(
    {
      id: 'rst_2',
      userId: 'usr_1',
      email: 'learner@linguaverse.ai',
      tokenHash: hashA,
      createdAt: new Date(now - RESET_TOKEN_EXPIRY_MS - 5000).toISOString(),
      expiresAt: new Date(now - 1000).toISOString(),
    },
    now
  );
  assert.equal(expired.valid, false);
  if (!expired.valid) assert.equal(expired.reason, 'EXPIRED');

  const used = evaluateResetTokenRecord(
    {
      id: 'rst_3',
      userId: 'usr_1',
      email: 'learner@linguaverse.ai',
      tokenHash: hashA,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + RESET_TOKEN_EXPIRY_MS).toISOString(),
      consumedAt: new Date(now + 1000).toISOString(),
    },
    now + 2000
  );
  assert.equal(used.valid, false);
  if (!used.valid) assert.equal(used.reason, 'ALREADY_USED');
});

test('SlidingWindowRateLimiter enforces per-window limit and resets after window passes', () => {
  const limiter = new SlidingWindowRateLimiter(3, 60_000);
  const t0 = 1_000_000;
  assert.equal(limiter.consume('ip:1', t0).allowed, true);
  assert.equal(limiter.consume('ip:1', t0 + 1000).allowed, true);
  assert.equal(limiter.consume('ip:1', t0 + 2000).allowed, true);

  const blocked = limiter.consume('ip:1', t0 + 3000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds > 0, true);

  // After 60 seconds window elapses, requests are permitted again
  const reopened = limiter.consume('ip:1', t0 + 61_000);
  assert.equal(reopened.allowed, true);
});
