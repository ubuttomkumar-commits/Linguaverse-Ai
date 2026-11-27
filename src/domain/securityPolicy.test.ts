import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  JwtSecretConfigError,
  MAX_AUDIO_UPLOAD_BYTES,
  isTrustedMutationOrigin,
  resolveClientIp,
  shouldExposeDevPreviewOtp,
  resolveAllowedCorsOrigin,
  resolveWorkerJwtSecret,
  validateAudioUploadConstraints,
  verifyImageMagicBytes,
} from './securityPolicy.ts';
import { saveUploadedMedia, resolveUploadedMediaFile } from '../../server/cmsStore.ts';

describe('P1 Security Policy — S3 Raster Image Signature & SVG XSS Defense', () => {
  it('accepts genuine PNG, JPEG, and WebP magic-byte headers', () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x20,
    ]);

    assert.equal(verifyImageMagicBytes(pngBytes, 'image/png').ok, true);
    assert.equal(verifyImageMagicBytes(jpegBytes, 'image/jpeg').ok, true);
    assert.equal(verifyImageMagicBytes(webpBytes, 'image/webp').ok, true);
  });

  it('rejects SVG markup even when disguised with an image/png MIME type', () => {
    const svgPayload = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>'
    );
    const asSvg = verifyImageMagicBytes(svgPayload, 'image/svg+xml');
    assert.equal(asSvg.ok, false);

    const spoofedAsPng = verifyImageMagicBytes(svgPayload, 'image/png');
    assert.equal(spoofedAsPng.ok, false);

    const pngHeaderWithEmbeddedScript = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ...new TextEncoder().encode('<script>alert(1)</script>'),
    ]);
    assert.equal(verifyImageMagicBytes(pngHeaderWithEmbeddedScript, 'image/png').ok, false);
  });

  it('rejects spoofed SVG payloads in server saveUploadedMedia and blocks .svg resolution', () => {
    const svgBase64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    const result = saveUploadedMedia({
      filename: 'fake-logo.png',
      mimeType: 'image/png',
      dataBase64: svgBase64,
      actor: { email: 'admin@linguaverse.ai', role: 'admin' },
    });
    assert.equal(result.ok, false);

    assert.equal(resolveUploadedMediaFile('malicious.svg'), null);
    assert.equal(resolveUploadedMediaFile('../auth-store.json'), null);
  });
});

describe('P1 Security Policy — S6 Fail-Closed JWT Signing Secret', () => {
  it('throws JwtSecretConfigError in production and staging when secret is missing or too short', () => {
    assert.throws(
      () => resolveWorkerJwtSecret({ APP_ENV: 'production' }),
      JwtSecretConfigError
    );
    assert.throws(
      () => resolveWorkerJwtSecret({ APP_ENV: 'staging', JWT_SIGNING_SECRET: 'short-secret' }),
      JwtSecretConfigError
    );
    assert.throws(
      () => resolveWorkerJwtSecret({ APP_ENV: undefined, JWT_SIGNING_SECRET: '' }),
      JwtSecretConfigError
    );
  });

  it('accepts strong >= 32-char secret in production and never falls back to a static literal in dev', () => {
    const strongSecret = 'a'.repeat(48);
    assert.equal(
      resolveWorkerJwtSecret({ APP_ENV: 'production', JWT_SIGNING_SECRET: strongSecret }),
      strongSecret
    );

    const devSecret = resolveWorkerJwtSecret({ APP_ENV: 'development' });
    assert.ok(devSecret.length >= 32);
    assert.notEqual(devSecret, 'dev-local-jwt-secret-change-in-production');
  });
});

describe('P1 Security Policy — S7 Strict Production CORS Allowlisting', () => {
  it('allows exact allowlisted origins and rejects untrusted origins', () => {
    const allowed = 'https://linguaverse.ai, https://app.linguaverse.ai';
    assert.equal(
      resolveAllowedCorsOrigin('https://linguaverse.ai', allowed, 'production'),
      'https://linguaverse.ai'
    );
    assert.equal(
      resolveAllowedCorsOrigin('https://evil.example.com', allowed, 'production'),
      null
    );
  });

  it('never reflects arbitrary origins even if wildcard * is misconfigured', () => {
    assert.equal(
      resolveAllowedCorsOrigin('https://evil.example.com', '*', 'production'),
      null
    );
    assert.equal(
      resolveAllowedCorsOrigin('https://evil.example.com', undefined, 'production'),
      null
    );
    assert.equal(
      resolveAllowedCorsOrigin('http://localhost:3000', undefined, 'development'),
      'http://localhost:3000'
    );
  });
});

describe('P1 Security Policy — S8 Mutation Origin Verification', () => {
  it('accepts matching host origin and rejects cross-site attacker origin', () => {
    assert.equal(
      isTrustedMutationOrigin({
        originHeader: 'http://localhost:3000',
        hostHeader: 'localhost:3000',
      }),
      true
    );
    assert.equal(
      isTrustedMutationOrigin({
        originHeader: 'https://attacker.example',
        hostHeader: 'localhost:3000',
      }),
      false
    );
    assert.equal(
      isTrustedMutationOrigin({
        refererHeader: 'https://attacker.example/csrf.html',
        hostHeader: 'localhost:3000',
      }),
      false
    );
  });
});

describe('P1 Security Policy — S10 Audio MIME, Size, and Consent Validation', () => {
  it('blocks uploads without server-side recording consent with 403', () => {
    const result = validateAudioUploadConstraints({
      contentType: 'audio/webm;codecs=opus',
      sizeBytes: 2048,
      storeMicRecordingsConsent: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 403);
    }
  });

  it('rejects non-audio MIME types with 415 and oversized files with 413', () => {
    const badMime = validateAudioUploadConstraints({
      contentType: 'text/html',
      sizeBytes: 1024,
      storeMicRecordingsConsent: true,
    });
    assert.equal(badMime.ok, false);
    if (!badMime.ok) assert.equal(badMime.status, 415);

    const tooLarge = validateAudioUploadConstraints({
      contentType: 'audio/webm',
      sizeBytes: MAX_AUDIO_UPLOAD_BYTES + 1,
      storeMicRecordingsConsent: true,
    });
    assert.equal(tooLarge.ok, false);
    if (!tooLarge.ok) assert.equal(tooLarge.status, 413);

    const empty = validateAudioUploadConstraints({
      contentType: 'audio/webm',
      sizeBytes: 0,
      storeMicRecordingsConsent: true,
    });
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.status, 400);
  });

  it('accepts allowlisted audio formats with codecs suffix and returns normalized extension', () => {
    const ok = validateAudioUploadConstraints({
      contentType: 'audio/webm; codecs=opus',
      sizeBytes: 4096,
      storeMicRecordingsConsent: true,
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.normalizedMime, 'audio/webm');
      assert.equal(ok.extension, 'webm');
    }
  });
});

describe('resolveClientIp (rate-limit key integrity)', () => {
  it('ignores spoofable X-Forwarded-For / CF-Connecting-IP unless proxy trust is enabled', () => {
    assert.equal(
      resolveClientIp({ socketIp: '203.0.113.5', forwardedFor: '1.2.3.4', cfConnectingIp: '9.9.9.9', trustProxy: false }),
      '203.0.113.5'
    );
  });

  it('uses the right-most forwarded entry (added by the trusted proxy) when trusted', () => {
    assert.equal(
      resolveClientIp({ socketIp: '10.0.0.1', forwardedFor: '6.6.6.6, 198.51.100.7', trustProxy: true }),
      '198.51.100.7'
    );
  });

  it('prefers CF-Connecting-IP when trusted and falls back to the socket address', () => {
    assert.equal(resolveClientIp({ socketIp: '10.0.0.1', cfConnectingIp: '198.51.100.9', trustProxy: true }), '198.51.100.9');
    assert.equal(resolveClientIp({ socketIp: '10.0.0.1', trustProxy: true }), '10.0.0.1');
    assert.equal(resolveClientIp({ trustProxy: false }), 'local');
  });
});

describe('shouldExposeDevPreviewOtp (OTP leak guard)', () => {
  it('never exposes the OTP in production, even when email delivery failed', () => {
    assert.equal(shouldExposeDevPreviewOtp({ delivered: false, isProduction: true }), false);
    assert.equal(shouldExposeDevPreviewOtp({ delivered: true, isProduction: true }), false);
  });

  it('exposes it only for undelivered mail in non-production', () => {
    assert.equal(shouldExposeDevPreviewOtp({ delivered: false, isProduction: false }), true);
    assert.equal(shouldExposeDevPreviewOtp({ delivered: true, isProduction: false }), false);
  });
});

