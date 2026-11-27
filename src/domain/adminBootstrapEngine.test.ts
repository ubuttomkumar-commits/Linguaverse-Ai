import test from 'node:test';
import assert from 'node:assert/strict';
import {
  constantTimeSecretMatch,
  evaluateBootstrapPolicy,
  isAdminPortalRole,
  validateInitialAdminBootstrapInput,
} from './adminBootstrapEngine';

test('isAdminPortalRole permits only authorized governance roles and blocks learner', () => {
  assert.equal(isAdminPortalRole('super_admin'), true);
  assert.equal(isAdminPortalRole('admin'), true);
  assert.equal(isAdminPortalRole('content_manager'), true);
  assert.equal(isAdminPortalRole('ai_ops'), true);
  assert.equal(isAdminPortalRole('moderator'), true);
  assert.equal(isAdminPortalRole('learner'), false);
  assert.equal(isAdminPortalRole(''), false);
  assert.equal(isAdminPortalRole(undefined), false);
});

test('validateInitialAdminBootstrapInput enforces strong admin credentials', () => {
  const weak = validateInitialAdminBootstrapInput({
    name: 'Root Admin',
    email: 'admin@linguaverse.ai',
    password: 'password123',
  });
  assert.equal(weak.ok, false);

  const short = validateInitialAdminBootstrapInput({
    name: 'Root Admin',
    email: 'admin@linguaverse.ai',
    password: 'Abc12345',
  });
  assert.equal(short.ok, false);

  const valid = validateInitialAdminBootstrapInput({
    name: '  Super   Admin  ',
    email: 'Admin@LinguaVerse.AI ',
    password: 'AdminPassword2026!',
    bootstrapSecret: 'my-secret-token-1234',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.name, 'Super Admin');
    assert.equal(valid.data.email, 'admin@linguaverse.ai');
  }
});

test('evaluateBootstrapPolicy locks permanently once any admin exists (409)', () => {
  const decision = evaluateBootstrapPolicy({
    hasExistingAdmin: true,
    isProduction: false,
    configuredSecret: '',
    providedSecret: '',
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) {
    assert.equal(decision.status, 409);
    assert.equal(decision.code, 'ADMIN_ALREADY_PROVISIONED');
  }
});

test('evaluateBootstrapPolicy fails closed in production when ADMIN_BOOTSTRAP_SECRET is unset (503)', () => {
  const decision = evaluateBootstrapPolicy({
    hasExistingAdmin: false,
    isProduction: true,
    configuredSecret: '',
    providedSecret: '',
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) {
    assert.equal(decision.status, 503);
    assert.equal(decision.code, 'BOOTSTRAP_SECRET_UNCONFIGURED');
  }
});

test('evaluateBootstrapPolicy enforces constant-time secret match when configured', () => {
  const wrong = evaluateBootstrapPolicy({
    hasExistingAdmin: false,
    isProduction: true,
    configuredSecret: 'super-secret-bootstrap-token-9999',
    providedSecret: 'wrong-token',
  });
  assert.equal(wrong.allowed, false);
  if (!wrong.allowed) {
    assert.equal(wrong.status, 403);
    assert.equal(wrong.code, 'INVALID_BOOTSTRAP_SECRET');
  }

  const right = evaluateBootstrapPolicy({
    hasExistingAdmin: false,
    isProduction: true,
    configuredSecret: 'super-secret-bootstrap-token-9999',
    providedSecret: 'super-secret-bootstrap-token-9999',
  });
  assert.equal(right.allowed, true);
  assert.equal(constantTimeSecretMatch('abc123', 'abc123'), true);
  assert.equal(constantTimeSecretMatch('abc123', 'abc124'), false);
  assert.equal(constantTimeSecretMatch('', ''), false);
});
