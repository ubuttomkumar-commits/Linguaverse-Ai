import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import workerApp from './index.ts';
import { signSessionJwt } from './services/crypto.ts';
import type { WorkerEnv } from './types.ts';

const TEST_JWT_SECRET = 'p1-worker-test-signing-secret-with-more-than-32-chars!';

interface MockEnvOptions {
  appEnv?: string;
  jwtSecret?: string;
  corsAllowedOrigin?: string;
  storeMicRecordings?: number;
  rateLimitMax?: boolean;
}

function createMockWorkerEnv(options: MockEnvOptions = {}): {
  env: WorkerEnv;
  r2PutCalls: Array<{ key: string; contentType?: string }>;
} {
  const kvMap = new Map<string, string>();
  const r2PutCalls: Array<{ key: string; contentType?: string }> = [];

  const mockDb = {
    prepare(sql: string) {
      let boundArgs: unknown[] = [];
      const stmt = {
        bind(...args: unknown[]) {
          boundArgs = args;
          return stmt;
        },
        async first<T>() {
          if (sql.includes('FROM sessions')) {
            return {
              id: String(boundArgs[0] || 'ses_1'),
              revoked_at: null,
              expires_at: new Date(Date.now() + 3600_000).toISOString(),
            } as T;
          }
          if (sql.includes('FROM users WHERE id = ?')) {
            return {
              id: 'usr_1',
              name: 'Test Learner',
              email: 'learner@example.com',
              plan: 'free',
              role: 'learner',
              email_verified: 1,
              account_status: 'active',
              created_at: new Date().toISOString(),
            } as T;
          }
          if (sql.includes('SELECT store_mic_recordings FROM learner_profiles')) {
            return {
              store_mic_recordings: options.storeMicRecordings ?? 0,
            } as T;
          }
          if (sql.includes('SELECT id FROM users WHERE email = ?')) {
            return null as T;
          }
          return null as T;
        },
        async all<T>() {
          return { results: [] as T[] };
        },
        async run() {
          return { success: true };
        },
      };
      return stmt;
    },
    async batch() {
      return [];
    },
  };

  const mockKv = {
    async get(key: string) {
      return kvMap.get(key) ?? null;
    },
    async put(key: string, value: string) {
      kvMap.set(key, value);
    },
    async delete(key: string) {
      kvMap.delete(key);
    },
  };

  const mockR2 = {
    async put(key: string, _value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }) {
      r2PutCalls.push({ key, contentType: opts?.httpMetadata?.contentType });
    },
    async get() {
      return null;
    },
    async delete() {
      return undefined;
    },
  };

  const env: WorkerEnv = {
    DB: mockDb as unknown as WorkerEnv['DB'],
    RATE_LIMIT_KV: mockKv as unknown as WorkerEnv['RATE_LIMIT_KV'],
    AUDIO_BUCKET: mockR2 as unknown as WorkerEnv['AUDIO_BUCKET'],
    APP_ENV: options.appEnv ?? 'production',
    CORS_ALLOWED_ORIGIN: options.corsAllowedOrigin ?? 'https://app.linguaverse.ai',
    JWT_SIGNING_SECRET: options.jwtSecret,
    AUDIO_RETENTION_DAYS: '30',
  };

  return { env, r2PutCalls };
}

describe('P1 Worker Hardening — S6, S7, S10, S11 Integration', () => {
  it('S6: fails closed (500 AUTH_CONFIG_ERROR) when production JWT_SIGNING_SECRET is missing', async () => {
    const { env } = createMockWorkerEnv({
      appEnv: 'production',
      jwtSecret: undefined,
    });

    const res = await workerApp.request(
      'https://api.linguaverse.ai/api/v1/auth/me',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer fake.jwt.token' },
      },
      env
    );

    assert.equal(res.status, 500);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, 'AUTH_CONFIG_ERROR');
  });

  it('S7: reflects only allowlisted CORS origins and blocks untrusted origins', async () => {
    const { env } = createMockWorkerEnv({
      appEnv: 'production',
      jwtSecret: TEST_JWT_SECRET,
      corsAllowedOrigin: 'https://app.linguaverse.ai',
    });

    const evilRes = await workerApp.request(
      'https://api.linguaverse.ai/api/v1/health',
      {
        method: 'GET',
        headers: { Origin: 'https://attacker.evil' },
      },
      env
    );
    assert.equal(evilRes.headers.get('Access-Control-Allow-Origin'), null);

    const trustedRes = await workerApp.request(
      'https://api.linguaverse.ai/api/v1/health',
      {
        method: 'GET',
        headers: { Origin: 'https://app.linguaverse.ai' },
      },
      env
    );
    assert.equal(
      trustedRes.headers.get('Access-Control-Allow-Origin'),
      'https://app.linguaverse.ai'
    );
  });

  it('S10: enforces server-side D1 consent (403), MIME allowlist (415), and allows valid audio with consent (201)', async () => {
    const token = await signSessionJwt(
      {
        sub: 'usr_1',
        sid: 'ses_1',
        role: 'learner',
        email: 'learner@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      TEST_JWT_SECRET
    );

    // 1. Consent disabled -> 403 Forbidden
    const noConsent = createMockWorkerEnv({
      jwtSecret: TEST_JWT_SECRET,
      storeMicRecordings: 0,
    });
    const res403 = await workerApp.request(
      'https://api.linguaverse.ai/api/v1/learners/usr_1/recordings',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'audio/webm',
        },
        body: new Uint8Array([1, 2, 3, 4]),
      },
      noConsent.env
    );
    assert.equal(res403.status, 403);
    assert.equal(noConsent.r2PutCalls.length, 0);

    // 2. Consent enabled, invalid MIME -> 415 Unsupported Media Type
    const withConsent = createMockWorkerEnv({
      jwtSecret: TEST_JWT_SECRET,
      storeMicRecordings: 1,
    });
    const res415 = await workerApp.request(
      'https://api.linguaverse.ai/api/v1/learners/usr_1/recordings',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/html',
        },
        body: new TextEncoder().encode('<script>alert(1)</script>'),
      },
      withConsent.env
    );
    assert.equal(res415.status, 415);
    assert.equal(withConsent.r2PutCalls.length, 0);

    // 3. Consent enabled, valid audio/ogg -> 201 Created with .ogg extension
    const res201 = await workerApp.request(
      'https://api.linguaverse.ai/api/v1/learners/usr_1/recordings',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'audio/ogg; codecs=opus',
        },
        body: new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]),
      },
      withConsent.env
    );
    assert.equal(res201.status, 201);
    assert.equal(withConsent.r2PutCalls.length, 1);
    assert.ok(withConsent.r2PutCalls[0].key.endsWith('.ogg'));
    assert.equal(withConsent.r2PutCalls[0].contentType, 'audio/ogg');
  });

  it('S11: rate limits POST /api/v1/subscriptions/intent after 20 requests/min with Retry-After', async () => {
    const { env } = createMockWorkerEnv({
      jwtSecret: TEST_JWT_SECRET,
    });

    let lastRes: Response | null = null;
    for (let i = 0; i < 21; i += 1) {
      lastRes = await workerApp.request(
        'https://api.linguaverse.ai/api/v1/subscriptions/intent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '198.51.100.42',
          },
          body: JSON.stringify({ planSlug: 'pro', billingInterval: 'monthly' }),
        },
        env
      );
    }

    assert.ok(lastRes);
    assert.equal(lastRes.status, 429);
    assert.equal(lastRes.headers.get('Retry-After'), '60');
  });
});
