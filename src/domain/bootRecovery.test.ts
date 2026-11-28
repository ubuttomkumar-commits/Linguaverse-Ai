import test from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeChunkLoadError,
  shouldAttemptAutoRecoveryReload,
  RELOAD_GUARD_COOLDOWN_MS,
} from './bootRecovery';

test('looksLikeChunkLoadError identifies dynamic import, CSS preload, and chunk mismatch errors', () => {
  assert.equal(
    looksLikeChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/Foo.js')),
    true
  );
  assert.equal(
    looksLikeChunkLoadError(new Error('Importing a module script failed.')),
    true
  );
  assert.equal(
    looksLikeChunkLoadError(new Error('ChunkLoadError: Loading chunk 42 failed')),
    true
  );
  assert.equal(
    looksLikeChunkLoadError('Unable to preload CSS for /assets/App.css'),
    true
  );
  assert.equal(
    looksLikeChunkLoadError({ message: 'Chunk version mismatch' }),
    true
  );
  assert.equal(
    looksLikeChunkLoadError(new TypeError('Cannot read properties of undefined (reading foo)')),
    false
  );
  assert.equal(looksLikeChunkLoadError(null), false);
});

test('shouldAttemptAutoRecoveryReload allows one-shot recovery and blocks tight reload loops', () => {
  const now = 1_700_000_100_000;
  assert.equal(shouldAttemptAutoRecoveryReload(null, now), true);
  assert.equal(shouldAttemptAutoRecoveryReload(undefined, now), true);
  assert.equal(shouldAttemptAutoRecoveryReload(String(now - 5_000), now), false);
  assert.equal(
    shouldAttemptAutoRecoveryReload(String(now - RELOAD_GUARD_COOLDOWN_MS - 1), now),
    true
  );
  assert.equal(shouldAttemptAutoRecoveryReload('invalid-ts', now), false);
});
