import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWebhookHmacHex,
  DEFAULT_SYSTEM_CONFIG,
  validatePaymentWebhookPayload,
  validateSystemConfigPatch,
  verifyPaymentWebhookSignature,
} from './paymentWebhookEngine.ts';

test('verifyPaymentWebhookSignature accepts valid signed payload and rejects tampering/replay', async () => {
  const secret = 'whsec_test_verification_secret_32_bytes_long';
  const rawBody = JSON.stringify({
    eventId: 'evt_1001',
    eventType: 'payment_succeeded',
    userId: 'usr_1',
    plan: 'pro',
    amountCents: 1200,
    currency: 'USD',
  });
  const nowMs = 1_760_000_000_000;
  const ts = String(Math.floor(nowMs / 1000));
  const sig = await computeWebhookHmacHex(secret, ts, rawBody);

  const ok = await verifyPaymentWebhookSignature({
    secret,
    rawBody,
    signatureHeader: `t=${ts},v1=${sig}`,
    nowMs,
  });
  assert.equal(ok.valid, true);

  const tampered = await verifyPaymentWebhookSignature({
    secret,
    rawBody: rawBody.replace('1200', '100'),
    signatureHeader: `t=${ts},v1=${sig}`,
    nowMs,
  });
  assert.equal(tampered.valid, false);
  assert.equal(tampered.reason, 'SIGNATURE_MISMATCH');

  const expired = await verifyPaymentWebhookSignature({
    secret,
    rawBody,
    signatureHeader: `t=${ts},v1=${sig}`,
    nowMs: nowMs + 10 * 60 * 1000,
  });
  assert.equal(expired.valid, false);
  assert.equal(expired.reason, 'TIMESTAMP_EXPIRED');
});

test('validatePaymentWebhookPayload enforces provider and event allowlists', () => {
  const ok = validatePaymentWebhookPayload('stripe', {
    eventId: 'evt_paid_1',
    eventType: 'payment_succeeded',
    userId: 'usr_abc',
    invoiceId: 'inv_1',
    plan: 'pro',
    amountCents: 1200,
    currency: 'usd',
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.event.currency, 'USD');
    assert.equal(ok.event.provider, 'stripe');
  }

  const badProvider = validatePaymentWebhookPayload('unknown_pay', {
    eventId: 'evt_1',
    eventType: 'payment_succeeded',
    userId: 'usr_abc',
  });
  assert.equal(badProvider.ok, false);

  const badEvent = validatePaymentWebhookPayload('paddle', {
    eventId: 'evt_2',
    eventType: 'grant_admin',
    userId: 'usr_abc',
  });
  assert.equal(badEvent.ok, false);
});

test('validateSystemConfigPatch rejects secret keys, invalid bounds, and enabling DMs', () => {
  const valid = validateSystemConfigPatch(
    {
      audioRetentionDays: 14,
      aiRateLimitPerMinute: 25,
      freeDailySpeakingLimit: 4,
      maintenanceBannerEn: 'Scheduled maintenance Sunday 02:00 UTC',
    },
    DEFAULT_SYSTEM_CONFIG
  );
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.next.audioRetentionDays, 14);
    assert.equal(valid.next.communityDirectMessagingEnabled, false);
  }

  const secretAttempt = validateSystemConfigPatch({ GEMINI_API_KEY: 'AIzaFake' });
  assert.equal(secretAttempt.ok, false);

  const dmAttempt = validateSystemConfigPatch({ communityDirectMessagingEnabled: true });
  assert.equal(dmAttempt.ok, false);

  const outOfRange = validateSystemConfigPatch({ audioRetentionDays: 9999 });
  assert.equal(outOfRange.ok, false);
});
