import test from 'node:test';
import assert from 'node:assert/strict';
import {
  maskSecretFingerprint,
  validateAiRuntimeConfigPatch,
  validateFeatureFlagsPatch,
  validateProviderKeyRotationInput,
  PROVIDER_CATALOG,
} from './aiProviderRegistry.ts';

test('aiProviderRegistry: masks secrets without exposing raw values', () => {
  assert.equal(maskSecretFingerprint(undefined), null);
  assert.equal(maskSecretFingerprint(''), null);
  assert.equal(maskSecretFingerprint('short'), '****');
  assert.equal(maskSecretFingerprint('AIzaSyFakeExample123456'), 'AI****3456');
});

test('aiProviderRegistry: validates Gemini models, timeout/retry bounds, and rejects secret injection', () => {
  const valid = validateAiRuntimeConfigPatch({
    primaryModel: 'gemini-4-hydrogen',
    fallbackModel: 'gemini-3.1-flash-lite',
    requestTimeoutMs: 20_000,
    maxRetries: 2,
    dailyCostCeilingUsd: 50,
  });
  assert.equal(valid.ok, true);

  const badModel = validateAiRuntimeConfigPatch({ primaryModel: 'invented-model-99' });
  assert.equal(badModel.ok, false);

  const badSecretField = validateAiRuntimeConfigPatch({ geminiApiKey: 'AIzaTest123456789' });
  assert.equal(badSecretField.ok, false);

  const badTimeout = validateAiRuntimeConfigPatch({ requestTimeoutMs: 500 });
  assert.equal(badTimeout.ok, false);
});

test('aiProviderRegistry: validates feature flags and rejects unknown flags', () => {
  const ok = validateFeatureFlagsPatch({ maintenanceMode: true, ieltsExamPrepEnabled: false });
  assert.equal(ok.ok, true);
  const bad = validateFeatureFlagsPatch({ communityDirectMessagingEnabled: true });
  assert.equal(bad.ok, false);
});

test('aiProviderRegistry: validates key rotation input and supports clearing overrides', () => {
  assert.equal(validateProviderKeyRotationInput({ apiKey: 'short' }).ok, false);
  assert.equal(validateProviderKeyRotationInput({ apiKey: 'has whitespace inside' }).ok, false);
  const ok = validateProviderKeyRotationInput({ apiKey: 'test-rotated-key-987654', note: 'Scheduled Q4 rotation' });
  assert.equal(ok.ok, true);
  const cleared = validateProviderKeyRotationInput({ clearOverride: true });
  assert.equal(cleared.ok, true);
  if (cleared.ok) assert.equal(cleared.secretValue, null);
  assert.ok(PROVIDER_CATALOG.some((p) => p.id === 'gemini'));
  assert.ok(PROVIDER_CATALOG.some((p) => p.id === 'azure_pronunciation'));
});
