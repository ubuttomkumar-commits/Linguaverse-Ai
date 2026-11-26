import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import workerApp from './index';
import type {
  D1Database,
  D1PreparedStatement,
  KVNamespace,
  R2Bucket,
  WorkerEnv,
} from './types';
import { wrapPcm16ToWavBase64 } from './services/gemini';
import { computeWebhookHmacHex } from '../src/domain/paymentWebhookEngine';

const ROOT = process.cwd();
const MIGRATION_0001 = fs.readFileSync(path.join(ROOT, 'migrations/0001_initial_schema.sql'), 'utf8');
const MIGRATION_0002 = fs.readFileSync(path.join(ROOT, 'migrations/0002_parts06_12_parity.sql'), 'utf8');
const ROLLBACK_0002 = fs.readFileSync(path.join(ROOT, 'migrations/ROLLBACK_0002_parts06_12_parity.sql'), 'utf8');
const MIGRATION_0003 = fs.readFileSync(path.join(ROOT, 'migrations/0003_p3_community_vocab_billing.sql'), 'utf8');
const ROLLBACK_0003 = fs.readFileSync(path.join(ROOT, 'migrations/ROLLBACK_0003_p3_community_vocab_billing.sql'), 'utf8');
const MIGRATION_0004 = fs.readFileSync(path.join(ROOT, 'migrations/0004_prd61_examinations_labs_providers.sql'), 'utf8');
const ROLLBACK_0004 = fs.readFileSync(path.join(ROOT, 'migrations/ROLLBACK_0004_prd61_examinations_labs_providers.sql'), 'utf8');
const CANONICAL_SCHEMA = fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8');

/**
 * Real SQLite-backed D1 adapter using Node 22 built-in `node:sqlite`.
 * Validates real SQL syntax, foreign keys, CHECK constraints, and UNIQUE indexes.
 */
function createSqliteD1(db: DatabaseSync): D1Database {
  const createStmt = (query: string, params: unknown[] = []): D1PreparedStatement => ({
    bind(...values: unknown[]) {
      return createStmt(query, values);
    },
    async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
      const stmt = db.prepare(query);
      const row = stmt.get(...(params as never[])) as Record<string, unknown> | undefined;
      if (!row) return null;
      if (colName) return (row[colName] as T) ?? null;
      return row as T;
    },
    async run<T = Record<string, unknown>>() {
      const stmt = db.prepare(query);
      const res = stmt.run(...(params as never[]));
      return { success: true, results: [] as T[], meta: res };
    },
    async all<T = Record<string, unknown>>() {
      const stmt = db.prepare(query);
      const rows = stmt.all(...(params as never[])) as T[];
      return { success: true, results: rows };
    },
  });

  return {
    prepare(query: string) {
      return createStmt(query);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]> {
      const results: T[] = [];
      for (const s of statements) {
        results.push((await s.run()) as unknown as T);
      }
      return results;
    },
    async exec(query: string) {
      db.exec(query);
      return { count: 1 };
    },
  };
}

function createMemoryKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

function createMemoryR2(): R2Bucket & { keys: () => string[]; deletedCalls: string[][] } {
  const objects = new Map<string, Uint8Array>();
  const deletedCalls: string[][] = [];
  return {
    keys: () => Array.from(objects.keys()),
    deletedCalls,
    async get(key) {
      const data = objects.get(key);
      if (!data) return null;
      return {
        key,
        size: data.byteLength,
        async arrayBuffer() {
          return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(data);
            controller.close();
          },
        }),
      };
    },
    async put(key, value) {
      let bytes: Uint8Array;
      if (value instanceof Uint8Array) bytes = value;
      else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
      else if (typeof value === 'string') bytes = new TextEncoder().encode(value);
      else bytes = new Uint8Array(0);
      objects.set(key, bytes);
      return { key, size: bytes.byteLength };
    },
    async delete(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      deletedCalls.push(list);
      for (const k of list) objects.delete(k);
    },
  };
}

function createTestWorkerEnv(): {
  db: DatabaseSync;
  r2: ReturnType<typeof createMemoryR2>;
  env: WorkerEnv;
} {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION_0001);
  db.exec(MIGRATION_0002);
  db.exec(MIGRATION_0003);
  db.exec(MIGRATION_0004);
  const r2 = createMemoryR2();
  const kv = createMemoryKv();
  const env: WorkerEnv = {
    DB: createSqliteD1(db),
    AUDIO_BUCKET: r2,
    LINGUAVERSE_KV: kv,
    RATE_LIMIT_KV: kv,
    APP_ENV: 'development',
    JWT_SIGNING_SECRET: 'test-worker-jwt-secret-32-chars-minimum-length!!',
    GEMINI_API_KEY: 'test-mock-gemini-key',
    GEMINI_PRIMARY_MODEL: 'gemini-4-hydrogen',
    GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash-lite',
    GEMINI_TRANSCRIBE_MODEL: 'gemini-3.5-transcribe',
    GEMINI_TTS_MODEL: 'gemini-3.8-flash-lite-tts',
    CORS_ALLOWED_ORIGIN: 'http://localhost:3000',
  };
  return { db, r2, env };
}

async function registerAndVerifyUser(
  env: WorkerEnv,
  email: string,
  name = 'Test Learner',
  password = 'Password123!'
): Promise<{ userId: string; token: string; email: string }> {
  const regRes = await workerApp.request(
    'http://localhost/api/v1/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    },
    env
  );
  assert.equal(regRes.status, 201, `register failed for ${email}`);
  const regBody = (await regRes.json()) as {
    user: { id: string; email: string };
    session: { token: string };
    otpDelivery: { devPreviewOtp?: string };
  };
  assert.ok(regBody.otpDelivery.devPreviewOtp, 'devPreviewOtp should be returned in development');

  const verifyRes = await workerApp.request(
    'http://localhost/api/v1/auth/verify-email',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regBody.session.token}`,
      },
      body: JSON.stringify({ code: regBody.otpDelivery.devPreviewOtp }),
    },
    env
  );
  assert.equal(verifyRes.status, 200, 'OTP verification should succeed');
  return { userId: regBody.user.id, token: regBody.session.token, email };
}

test('D1 Migrations 0001 -> 0002 -> 0003 -> 0004 -> ROLLBACK_0004 -> ROLLBACK_0003 -> ROLLBACK_0002 & canonical schema.sql match and preserve existing data', () => {
  const dbMigrated = new DatabaseSync(':memory:');
  dbMigrated.exec(MIGRATION_0001);
  dbMigrated.exec(MIGRATION_0002);
  dbMigrated.exec(MIGRATION_0003);
  dbMigrated.exec(MIGRATION_0004);

  const migratedTables = (
    dbMigrated
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      .all() as Array<{ name: string }>
  ).map((r) => r.name);

  const dbCanonical = new DatabaseSync(':memory:');
  dbCanonical.exec(CANONICAL_SCHEMA);
  const canonicalTables = (
    dbCanonical
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      .all() as Array<{ name: string }>
  ).map((r) => r.name);

  assert.deepEqual(
    migratedTables,
    canonicalTables,
    '0001 + 0002 + 0003 + 0004 must produce the exact table set as schema.sql'
  );

  const additive0002Tables = [
    'learner_academy_state',
    'learner_speaking_preferences',
    'transfer_session_drafts',
    'replay_reviews',
    'replay_practice_attempts',
  ];
  const additive0003Tables = [
    'vocabulary_items',
    'community_posts',
    'community_comments',
    'community_reports',
    'community_user_blocks',
    'community_user_restrictions',
    'subscription_invoices',
    'support_tickets',
    'learner_gamification_prefs',
  ];
  const additive0004Tables = [
    'examination_attempts',
    'writing_diary_entries',
    'human_bridge_logs',
    'user_notification_preferences',
    'user_notifications',
  ];
  for (const tbl of [...additive0002Tables, ...additive0003Tables, ...additive0004Tables]) {
    assert.ok(migratedTables.includes(tbl), `expected additive table ${tbl}`);
  }

  // Seed pre-existing user data, run ROLLBACK_0004 -> ROLLBACK_0003 -> ROLLBACK_0002, verify user row survives intact
  dbMigrated
    .prepare(
      `INSERT INTO users (id, name, email, password_salt, password_hash, created_at, updated_at)
       VALUES ('u1', 'Keep Me', 'keep@example.com', 'salt', 'hash', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
    )
    .run();

  dbMigrated.exec(ROLLBACK_0004);
  const afterRollback0004 = (
    dbMigrated
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .all() as Array<{ name: string }>
  ).map((r) => r.name);

  for (const tbl of additive0004Tables) {
    assert.ok(!afterRollback0004.includes(tbl), `ROLLBACK_0004 should drop ${tbl}`);
  }
  for (const tbl of additive0003Tables) {
    assert.ok(afterRollback0004.includes(tbl), `ROLLBACK_0004 must not drop 0003 table ${tbl}`);
  }

  dbMigrated.exec(ROLLBACK_0003);
  const afterRollback0003 = (
    dbMigrated
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .all() as Array<{ name: string }>
  ).map((r) => r.name);

  for (const tbl of additive0003Tables) {
    assert.ok(!afterRollback0003.includes(tbl), `ROLLBACK_0003 should drop ${tbl}`);
  }
  for (const tbl of additive0002Tables) {
    assert.ok(afterRollback0003.includes(tbl), `ROLLBACK_0003 must not drop 0002 table ${tbl}`);
  }

  dbMigrated.exec(ROLLBACK_0002);
  const afterRollback0002 = (
    dbMigrated
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .all() as Array<{ name: string }>
  ).map((r) => r.name);

  for (const tbl of additive0002Tables) {
    assert.ok(!afterRollback0002.includes(tbl), `ROLLBACK_0002 should drop ${tbl}`);
  }
  const survivingUser = dbMigrated.prepare(`SELECT email FROM users WHERE id = 'u1'`).get() as {
    email: string;
  };
  assert.equal(survivingUser.email, 'keep@example.com', 'rollbacks must preserve pre-existing user data');
});

test('Auth recovery parity: providers, forgot-password, validate token, reset password & revoke all active sessions', async () => {
  const { env } = createTestWorkerEnv();

  const providersRes = await workerApp.request('http://localhost/api/v1/auth/providers', {}, env);
  assert.equal(providersRes.status, 200);
  const providers = (await providersRes.json()) as {
    google: { configured: boolean };
    emailDelivery: { mode: string };
  };
  assert.equal(providers.google.configured, false);
  assert.equal(providers.emailDelivery.mode, 'local_dev_preview');

  const user = await registerAndVerifyUser(env, 'reset.learner@example.com');

  const forgotRes = await workerApp.request(
    'http://localhost/api/v1/auth/forgot-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    },
    env
  );
  assert.equal(forgotRes.status, 200);
  const forgotBody = (await forgotRes.json()) as { ok: boolean; devPreviewToken?: string };
  assert.equal(forgotBody.ok, true);
  assert.ok(forgotBody.devPreviewToken);

  const validateRes = await workerApp.request(
    `http://localhost/api/v1/auth/reset-password/validate?token=${encodeURIComponent(forgotBody.devPreviewToken)}`,
    {},
    env
  );
  assert.equal(validateRes.status, 200);
  const validateBody = (await validateRes.json()) as { valid: boolean; emailMasked?: string };
  assert.equal(validateBody.valid, true);
  assert.ok(validateBody.emailMasked?.includes('@example.com'));

  const resetRes = await workerApp.request(
    'http://localhost/api/v1/auth/reset-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: forgotBody.devPreviewToken, newPassword: 'NewPassword999!' }),
    },
    env
  );
  assert.equal(resetRes.status, 200);
  const resetBody = (await resetRes.json()) as { ok: boolean; revokedSessionsCount: number };
  assert.equal(resetBody.ok, true);
  assert.ok(resetBody.revokedSessionsCount >= 1);

  // Prior session JWT must now be rejected
  const staleMeRes = await workerApp.request(
    'http://localhost/api/v1/auth/me',
    { headers: { Authorization: `Bearer ${user.token}` } },
    env
  );
  assert.equal(staleMeRes.status, 401);

  // Re-using the same token must fail
  const reuseRes = await workerApp.request(
    `http://localhost/api/v1/auth/reset-password/validate?token=${encodeURIComponent(forgotBody.devPreviewToken)}`,
    {},
    env
  );
  const reuseBody = (await reuseRes.json()) as { valid: boolean; reason: string };
  assert.equal(reuseBody.valid, false);
  assert.equal(reuseBody.reason, 'ALREADY_USED');

  // New password logs in cleanly
  const loginRes = await workerApp.request(
    'http://localhost/api/v1/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'NewPassword999!' }),
    },
    env
  );
  assert.equal(loginRes.status, 200);
});

test('Parts 06-12 health routes report gemini-4-hydrogen and replay cloudSyncActive=true', async () => {
  const { env } = createTestWorkerEnv();

  const paths = [
    '/api/v1/academy/assist/health',
    '/api/academy/assist/health',
    '/api/v1/speaking/health',
    '/api/speaking/health',
    '/api/v1/mistakes/coach/health',
    '/api/mistakes/coach/health',
    '/api/v1/dna/health',
    '/api/dna/health',
    '/api/v1/transfer/health',
    '/api/transfer/health',
    '/api/v1/replay/health',
  ];

  for (const p of paths) {
    const res = await workerApp.request(`http://localhost${p}`, {}, env);
    assert.equal(res.status, 200, `${p} should return 200`);
    const data = (await res.json()) as Record<string, unknown>;
    assert.equal(data.model, 'gemini-4-hydrogen', `${p} should use gemini-4-hydrogen`);
    if (p === '/api/v1/replay/health') {
      assert.equal(data.cloudSyncActive, true);
    }
  }
});

test('Auth (401), cross-user isolation (403), and allowlist validation (400/415) across Parts 06-12', async () => {
  const { env } = createTestWorkerEnv();
  const userA = await registerAndVerifyUser(env, 'user.a@example.com', 'User A');
  const userB = await registerAndVerifyUser(env, 'user.b@example.com', 'User B');

  // Unauthenticated rejection
  const unauthRes = await workerApp.request(
    'http://localhost/api/v1/academy/assist',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonTitleEn: 'Past Simple', question: 'Why went?' }),
    },
    env
  );
  assert.equal(unauthRes.status, 401);

  // Cross-user isolation on cloud state endpoints
  const crossPaths = [
    `/api/v1/learners/${userA.userId}/academy-state`,
    `/api/v1/learners/${userA.userId}/speaking-preferences`,
    `/api/v1/learners/${userA.userId}/transfer-drafts`,
    `/api/v1/learners/${userA.userId}/replay-state`,
    `/api/v1/learners/${userA.userId}/mistakes`,
  ];
  for (const p of crossPaths) {
    const res = await workerApp.request(
      `http://localhost${p}`,
      { headers: { Authorization: `Bearer ${userB.token}` } },
      env
    );
    assert.equal(res.status, 403, `User B must receive 403 on ${p}`);
  }

  // Invalid speaking modeId -> 400
  const badModeRes = await workerApp.request(
    'http://localhost/api/v1/speaking/evaluate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ modeId: 'nonexistent_mode_xyz', userTranscript: 'Hello' }),
    },
    env
  );
  assert.equal(badModeRes.status, 400);

  // Invalid transfer scenarioId -> 400
  const badScenarioRes = await workerApp.request(
    'http://localhost/api/v1/transfer/turn',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ scenarioId: 'invalid_scenario_id', learnerMessage: 'Hello' }),
    },
    env
  );
  assert.equal(badScenarioRes.status, 400);

  // Unsupported audio MIME on transfer transcribe -> 415
  const badMimeRes = await workerApp.request(
    'http://localhost/api/v1/transfer/transcribe',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({ audioBase64: 'AAAA', mimeType: 'image/svg+xml' }),
    },
    env
  );
  assert.equal(badMimeRes.status, 415);
});

test('Gemini primary -> fallback failover, honest pronunciation stripping, transcribe & WAV TTS', async () => {
  const { db, env } = createTestWorkerEnv();
  const user = await registerAndVerifyUser(env, 'ai.tester@example.com');

  const originalFetch = globalThis.fetch;
  const calledUrls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calledUrls.push(url);

    // Simulate primary model 503 failover on speaking_evaluate
    if (url.includes('gemini-4-hydrogen')) {
      return new Response('Service temporarily unavailable', { status: 503 });
    }
    if (url.includes('gemini-3.1-flash-lite')) {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      ai_reply: 'That sounds like a productive week!',
                      ai_reply_bn_hint: 'সপ্তাহটি বেশ কাজের ছিল মনে হচ্ছে!',
                      corrected_transcript: 'Yesterday I went to the office.',
                      correct_elements: ['Clear time marker'],
                      mistakes: [
                        {
                          category: 'Verb Tense',
                          original: 'Yesterday I go to office',
                          corrected: 'Yesterday I went to the office',
                          explanation_en: 'Use Past Simple with yesterday.',
                          explanation_bn: 'yesterday থাকলে Past Simple ব্যবহার করতে হয়।',
                          confidence: 0.92,
                          severity: 'high',
                        },
                      ],
                      natural_alternative: 'I headed into the office yesterday.',
                      pronunciation_note: 'Great 92% pronunciation score!',
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 80 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('gemini-3.5-transcribe')) {
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'I would like to book an aisle seat.' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('gemini-3.8-flash-lite-tts')) {
      // 8 bytes of raw PCM16 silence
      const pcmBase64 = btoa('\x00\x00\x00\x00\x00\x00\x00\x00');
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: 'audio/pcm', data: pcmBase64 } }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not mocked', { status: 500 });
  }) as typeof fetch;

  try {
    // 1. Speaking evaluate: fails over from gemini-4-hydrogen -> gemini-3.1-flash-lite AND strips "92%" fake score
    const evalRes = await workerApp.request(
      'http://localhost/api/speaking/evaluate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          modeId: 'daily_conversations',
          pressureLevel: 'level_2_guided',
          userTranscript: 'Yesterday I go to office.',
          inputChannel: 'text_fallback',
          learnerLevel: 'A2',
          explanationLanguage: 'bn',
          history: [],
        }),
      },
      env
    );
    assert.equal(evalRes.status, 200);
    const evalBody = (await evalRes.json()) as {
      model: string;
      evaluation: { pronunciation_note: string; mistakes: unknown[] };
    };
    assert.equal(evalBody.model, 'gemini-3.1-flash-lite');
    assert.ok(!evalBody.evaluation.pronunciation_note.includes('92%'), 'must strip fabricated % score');
    assert.equal(evalBody.evaluation.mistakes.length, 1);

    // Telemetry recorded both primary failure + fallback success
    const telRows = db
      .prepare(`SELECT model, status FROM ai_telemetry_events WHERE endpoint = 'speaking_evaluate'`)
      .all() as Array<{ model: string; status: string }>;
    assert.equal(telRows.length, 2);

    // 2. Transfer transcribe
    const transRes = await workerApp.request(
      'http://localhost/api/transfer/transcribe',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ audioBase64: btoa('fake-webm-bytes'), mimeType: 'audio/webm' }),
      },
      env
    );
    assert.equal(transRes.status, 200);
    const transBody = (await transRes.json()) as { transcript: string; model: string };
    assert.equal(transBody.transcript, 'I would like to book an aisle seat.');
    assert.equal(transBody.model, 'gemini-3.5-transcribe');

    // 3. Transfer TTS WAV framing
    const ttsRes = await workerApp.request(
      'http://localhost/api/transfer/tts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ text: 'Welcome to the airport check-in desk.' }),
      },
      env
    );
    assert.equal(ttsRes.status, 200);
    const ttsBody = (await ttsRes.json()) as { audioBase64: string; mimeType: string };
    assert.equal(ttsBody.mimeType, 'audio/wav');
    const wavHeader = atob(ttsBody.audioBase64).slice(0, 12);
    assert.ok(wavHeader.startsWith('RIFF') && wavHeader.includes('WAVE'), 'TTS must return valid RIFF/WAVE');

    // Unit check on wrapPcm16ToWavBase64
    const directWav = atob(wrapPcm16ToWavBase64(btoa('\x01\x02\x03\x04')));
    assert.equal(directWav.length, 48);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Cloud state CRUD (Parts 06/08/11/12), Replay immutability, and owner-scoped R2 deletion', async () => {
  const { db, r2, env } = createTestWorkerEnv();
  const userA = await registerAndVerifyUser(env, 'cloud.a@example.com', 'Cloud A');
  const userB = await registerAndVerifyUser(env, 'cloud.b@example.com', 'Cloud B');

  // Part 06 Academy state
  const putAcad = await workerApp.request(
    `http://localhost/api/v1/learners/${userA.userId}/academy-state`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        enrolledCourseIds: ['course_foundation'],
        bookmarkedLessonIds: ['les_past_simple_stories'],
        lessonDrafts: { les_past_simple_stories: { stage: 'guided' } },
      }),
    },
    env
  );
  assert.equal(putAcad.status, 200);
  const getAcad = await workerApp.request(
    `http://localhost/api/v1/learners/${userA.userId}/academy-state`,
    { headers: { Authorization: `Bearer ${userA.token}` } },
    env
  );
  const acadBody = (await getAcad.json()) as { enrolledCourseIds: string[]; bookmarkedLessonIds: string[] };
  assert.deepEqual(acadBody.enrolledCourseIds, ['course_foundation']);
  assert.deepEqual(acadBody.bookmarkedLessonIds, ['les_past_simple_stories']);

  // Part 08 Speaking preferences
  const putPref = await workerApp.request(
    `http://localhost/api/v1/learners/${userA.userId}/speaking-preferences`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        correctionStyle: 'detailed',
        savedVocabulary: [{ word: 'unwind', meaningBn: 'বিশ্রাম নেওয়া' }],
      }),
    },
    env
  );
  assert.equal(putPref.status, 200);
  const getPref = await workerApp.request(
    `http://localhost/api/v1/learners/${userA.userId}/speaking-preferences`,
    { headers: { Authorization: `Bearer ${userA.token}` } },
    env
  );
  const prefBody = (await getPref.json()) as { correctionStyle: string; savedVocabulary: unknown[] };
  assert.equal(prefBody.correctionStyle, 'detailed');
  assert.equal(prefBody.savedVocabulary.length, 1);

  // Part 11 Transfer drafts
  const putDraft = await workerApp.request(
    `http://localhost/api/v1/learners/${userA.userId}/transfer-drafts/draft_1`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        scenarioId: 'travel_hotel_checkin',
        pressureLevel: 'level_2_guided',
        transcript: [{ id: 't1', role: 'learner', text: 'I have a reservation.' }],
        elapsedSeconds: 45,
      }),
    },
    env
  );
  assert.equal(putDraft.status, 200);
  const listDrafts = await workerApp.request(
    `http://localhost/api/v1/learners/${userA.userId}/transfer-drafts`,
    { headers: { Authorization: `Bearer ${userA.token}` } },
    env
  );
  const draftsBody = (await listDrafts.json()) as { drafts: Array<{ id: string }> };
  assert.equal(draftsBody.drafts.length, 1);
  assert.equal(draftsBody.drafts[0].id, 'draft_1');

  const delDraft = await workerApp.request(
    `http://localhost/api/v1/learners/${userA.userId}/transfer-drafts/draft_1`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${userA.token}` } },
    env
  );
  assert.equal(delDraft.status, 200);

  // Part 12 Replay review + practice immutability + owner-scoped R2 recording deletion
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    improved: true,
                    verdictEn: 'Much clearer!',
                    verdictBn: 'অনেক পরিষ্কার হয়েছে!',
                    refinedVersion: 'Yesterday I discussed the report with my manager.',
                    praiseEn: 'Fixed past tense and removed redundant preposition.',
                    remainingIssueEn: null,
                    remainingIssueBn: null,
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  try {
    const putReview = await workerApp.request(
      `http://localhost/api/v1/learners/${userA.userId}/replay-reviews/ses_replay_1`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
        body: JSON.stringify({
          sessionSource: 'speaking_studio',
          status: 'reviewed',
          learnerNote: 'Remember no about after discuss.',
        }),
      },
      env
    );
    assert.equal(putReview.status, 200);

    const practiceRes = await workerApp.request(
      'http://localhost/api/v1/replay/practice-attempts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
        body: JSON.stringify({
          sessionId: 'ses_replay_1',
          turnId: 'turn_1',
          scenarioTitle: 'Workplace Meeting',
          originalResponse: 'Yesterday I discuss about report.',
          correctedReference: 'Yesterday I discussed the report.',
          learnerRetryText: 'Yesterday I discussed the report with my manager.',
          explanationLanguage: 'bn',
        }),
      },
      env
    );
    assert.equal(practiceRes.status, 200);

    // Verify replay state persisted AND zero XP / zero mistakes were fabricated
    const replayStateRes = await workerApp.request(
      `http://localhost/api/v1/learners/${userA.userId}/replay-state`,
      { headers: { Authorization: `Bearer ${userA.token}` } },
      env
    );
    const replayState = (await replayStateRes.json()) as {
      reviews: unknown[];
      practiceAttempts: unknown[];
    };
    assert.equal(replayState.reviews.length, 1);
    assert.equal(replayState.practiceAttempts.length, 1);

    const xpCount = (
      db.prepare(`SELECT COUNT(*) AS cnt FROM user_xp_events WHERE user_id = ?`).get(userA.userId) as {
        cnt: number;
      }
    ).cnt;
    const mistakeCount = (
      db.prepare(`SELECT COUNT(*) AS cnt FROM learner_mistakes WHERE user_id = ?`).get(userA.userId) as {
        cnt: number;
      }
    ).cnt;
    assert.equal(xpCount, 0, 'Communication Replay must never award duplicate XP');
    assert.equal(mistakeCount, 0, 'Communication Replay must never inject duplicate mistakes');

    // Seed R2 audio objects for User A (ses_replay_1) and User B (ses_replay_1)
    await r2.put('users/a/rec1.webm', new Uint8Array([1, 2, 3]));
    await r2.put('users/b/rec1.webm', new Uint8Array([4, 5, 6]));
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO speaking_sessions (id, user_id, mode_id, pressure_level, started_at, updated_at, duration_seconds, turns_json)
       VALUES ('ses_replay_1', ?, 'daily_conversations', 'level_2_guided', ?, ?, 30, '[]')`
    ).run(userA.userId, now, now);
    db.prepare(
      `INSERT INTO audio_assets (id, user_id, session_id, r2_object_key, mime_type, size_bytes, duration_seconds, created_at)
       VALUES ('aud_a', ?, 'ses_replay_1', 'users/a/rec1.webm', 'audio/webm', 3, 5, ?)`
    ).run(userA.userId, now);
    db.prepare(
      `INSERT INTO audio_assets (id, user_id, session_id, r2_object_key, mime_type, size_bytes, duration_seconds, created_at)
       VALUES ('aud_b', ?, 'ses_replay_1', 'users/b/rec1.webm', 'audio/webm', 3, 5, ?)`
    ).run(userB.userId, now);

    const delRecRes = await workerApp.request(
      'http://localhost/api/v1/replay/sessions/ses_replay_1/recording',
      { method: 'DELETE', headers: { Authorization: `Bearer ${userA.token}` } },
      env
    );
    assert.equal(delRecRes.status, 200);
    const delRecBody = (await delRecRes.json()) as {
      ok: boolean;
      storageScope: string;
      cloudStorageDeleted: boolean;
      deletedCloudObjectCount: number;
    };
    assert.equal(delRecBody.ok, true);
    assert.equal(delRecBody.storageScope, 'cloudflare_r2');
    assert.equal(delRecBody.cloudStorageDeleted, true);
    assert.equal(delRecBody.deletedCloudObjectCount, 1);

    // User A's object is deleted; User B's object remains untouched!
    assert.deepEqual(r2.keys(), ['users/b/rec1.webm']);
    const auditRow = db
      .prepare(`SELECT action FROM audit_logs WHERE action = 'replay.recording_deleted' AND actor_user_id = ?`)
      .get(userA.userId) as { action: string } | undefined;
    assert.equal(auditRow?.action, 'replay.recording_deleted');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Core learner persistence routes (d1ApiRepository parity): diagnostic, lessons, speaking, mistakes, transfer & admin modules', async () => {
  const { db, env } = createTestWorkerEnv();
  const user = await registerAndVerifyUser(env, 'learner.persist@example.com');

  // 1. Diagnostic
  const diagRes = await workerApp.request(
    `http://localhost/api/v1/learners/${user.userId}/diagnostic`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({
        answers: [{ questionId: 'diag_q1', userResponse: 'wrong' }],
      }),
    },
    env
  );
  assert.equal(diagRes.status, 200);
  const diagBody = (await diagRes.json()) as {
    profile: { diagnosticCompleted: boolean };
    mistakes: Array<{ id: string }>;
  };
  assert.equal(diagBody.profile.diagnosticCompleted, true);
  assert.ok(diagBody.mistakes.length >= 1);

  // 2. Lesson attempt + idempotent XP
  const lessonPayload = {
    lessonId: 'les_past_simple_stories',
    startedAt: new Date().toISOString(),
    durationSeconds: 180,
    guidedCorrect: 2,
    guidedTotal: 2,
    independentCorrect: 2,
    independentTotal: 2,
    assessmentCorrect: 2,
    assessmentTotal: 2,
    mistakesLoggedCount: 0,
  };
  const les1 = await workerApp.request(
    `http://localhost/api/v1/learners/${user.userId}/lesson-attempts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify(lessonPayload),
    },
    env
  );
  assert.equal(les1.status, 200);
  const les1Body = (await les1.json()) as { newlyAwardedXp: unknown[]; lessonMastery: Record<string, unknown> };
  assert.equal(les1Body.newlyAwardedXp.length, 1);
  assert.ok(les1Body.lessonMastery.les_past_simple_stories);

  // 3. Speaking session + high-confidence mistake logging
  const spkRes = await workerApp.request(
    `http://localhost/api/v1/learners/${user.userId}/speaking-sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({
        sessionId: 'ses_p2_1',
        modeId: 'daily_conversations',
        pressureLevel: 'level_2_guided',
        startedAt: new Date().toISOString(),
        durationSeconds: 60,
        newlyEvaluatedTurnId: 'turn_1',
        turns: [
          {
            id: 'turn_1',
            timestamp: new Date().toISOString(),
            inputChannel: 'text_fallback',
            userTranscript: 'We discussed about the schedule',
            evaluation: {
              ai_reply: 'Got it!',
              ai_reply_bn_hint: 'বুঝেছি!',
              corrected_transcript: 'We discussed the schedule.',
              correct_elements: [],
              mistakes: [
                {
                  category: 'Prepositions',
                  original: 'discussed about the schedule',
                  corrected: 'discussed the schedule',
                  explanation_en: 'No about after discuss.',
                  explanation_bn: 'discuss-এর পরে about বসে না।',
                  confidence: 0.9,
                  severity: 'high',
                },
              ],
              natural_alternative: 'We went over the schedule.',
              pronunciation_note: 'Typed fallback mode.',
            },
          },
        ],
      }),
    },
    env
  );
  assert.equal(spkRes.status, 200);
  const spkBody = (await spkRes.json()) as { mistakes: Array<{ id: string; category: string }> };
  const prepMistake = spkBody.mistakes.find((m) => m.category === 'Prepositions');
  assert.ok(prepMistake, 'high-confidence speaking mistake should be saved');

  // 4. Two passing mistake drill attempts resolve the mistake + award idempotent XP
  const drill1 = await workerApp.request(
    `http://localhost/api/v1/learners/${user.userId}/mistakes/${prepMistake.id}/drill-attempts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({
        mistakeId: prepMistake.id,
        passed: true,
        userRewrite: 'discussed the schedule',
        expectedAnswer: 'discussed the schedule',
        durationSeconds: 12,
      }),
    },
    env
  );
  assert.equal(drill1.status, 200);
  assert.equal(((await drill1.json()) as { updatedMistake: { status: string } }).updatedMistake.status, 'practicing');

  const drill2 = await workerApp.request(
    `http://localhost/api/v1/learners/${user.userId}/mistakes/${prepMistake.id}/drill-attempts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({
        mistakeId: prepMistake.id,
        passed: true,
        userRewrite: 'discussed the schedule',
        expectedAnswer: 'discussed the schedule',
        durationSeconds: 10,
      }),
    },
    env
  );
  assert.equal(drill2.status, 200);
  const drill2Body = (await drill2.json()) as {
    updatedMistake: { status: string };
    newlyAwardedXp: unknown[];
  };
  assert.equal(drill2Body.updatedMistake.status, 'resolved');
  assert.equal(drill2Body.newlyAwardedXp.length, 1);

  // 5. Report false correction
  const flagRes = await workerApp.request(
    `http://localhost/api/v1/learners/${user.userId}/mistakes/${prepMistake.id}/false-correction`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ mistakeId: prepMistake.id, reported: true, reason: 'Context check' }),
    },
    env
  );
  assert.equal(flagRes.status, 200);

  // 6. Transfer attempt
  const trRes = await workerApp.request(
    `http://localhost/api/v1/learners/${user.userId}/transfer-attempts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({
        scenarioId: 'travel_hotel_checkin',
        pressureLevel: 'level_3_open',
        targetSkillLabelEn: 'Polite Requests',
        targetSkillLabelBn: 'ভদ্র অনুরোধ',
        linkedSourceType: 'baseline',
        userResponse: 'I have a reservation for three nights.',
        inputChannel: 'text_fallback',
        durationSeconds: 45,
        timedOut: false,
        evaluation: {
          task_completion: { score: 85, feedbackEn: 'Clear', feedbackBn: 'স্পষ্ট' },
          target_grammar_application: { score: 82, feedbackEn: 'Good', feedbackBn: 'ভালো' },
          contextual_appropriateness: { score: 88, feedbackEn: 'Polite', feedbackBn: 'ভদ্র' },
          response_relevance: { score: 84, feedbackEn: 'Relevant', feedbackBn: 'প্রাসঙ্গিক' },
          overall_score: 85,
          passed: true,
          strengths: ['Clear request'],
          detected_mistakes: [],
          natural_model_response: 'I have a reservation under my name.',
          coach_summary_en: 'Great job.',
          coach_summary_bn: 'দারুণ হয়েছে।',
        },
      }),
    },
    env
  );
  assert.equal(trRes.status, 200);
  const trBody = (await trRes.json()) as { transferAttempt: { passed: boolean }; newlyAwardedXp: unknown[] };
  assert.equal(trBody.transferAttempt.passed, true);
  assert.equal(trBody.newlyAwardedXp.length, 1);

  // 7. Admin curriculum module RBAC (403 for learner, 200 for admin)
  const forbiddenMod = await workerApp.request(
    'http://localhost/api/v1/admin/curriculum/modules',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ courseId: 'c1', titleEn: 'Unauthorized' }),
    },
    env
  );
  assert.equal(forbiddenMod.status, 403);

  // Promote user to admin directly in D1 and seed parent course, then publish module
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(user.userId);
  db.prepare(
    `INSERT INTO courses (id, sort_order, cefr_range, title_en, title_bn, subtitle_en, subtitle_bn, target_audience_en, target_audience_bn, updated_at)
     VALUES ('c1', 1, 'A2', 'Core', 'মূল', 'Sub', 'সাব', 'All', 'সবাই', '2026-01-01T00:00:00Z')`
  ).run();

  const okMod = await workerApp.request(
    'http://localhost/api/v1/admin/curriculum/modules',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ courseId: 'c1', titleEn: 'Module 1', titleBn: 'মডিউল ১' }),
    },
    env
  );
  assert.equal(okMod.status, 200);
});

test('P3 Worker parity: Vocabulary SRS, Community & Moderation RBAC, Subscriptions & Honest Finance, Gamification', async () => {
  const { db, env } = createTestWorkerEnv();
  const learnerA = await registerAndVerifyUser(env, 'p3.alpha@example.com', 'Alpha Learner');
  const learnerB = await registerAndVerifyUser(env, 'p3.beta@example.com', 'Beta Learner');

  // 1. Unauthenticated vocabulary request -> 401
  const unauthVocab = await workerApp.request('http://localhost/api/v1/vocabulary', {}, env);
  assert.equal(unauthVocab.status, 401);

  // 2. Vocabulary CRUD + SRS review
  const addCardRes = await workerApp.request(
    'http://localhost/api/v1/vocabulary',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerA.token}` },
      body: JSON.stringify({
        word: 'clarify',
        meaningEn: 'Make a statement easier to understand',
        meaningBn: 'বিষয়টি স্পষ্ট করা',
        exampleSentence: 'Could you clarify the deadline for this project?',
        difficulty: 'medium',
      }),
    },
    env
  );
  assert.equal(addCardRes.status, 201);
  const addCardBody = (await addCardRes.json()) as {
    card: { id: string; word: string };
    summary: { totalCards: number };
  };
  assert.equal(addCardBody.card.word, 'clarify');
  assert.equal(addCardBody.summary.totalCards, 1);

  const reviewRes = await workerApp.request(
    `http://localhost/api/v1/vocabulary/${addCardBody.card.id}/review`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerA.token}` },
      body: JSON.stringify({ rating: 'good', preset: 'standard' }),
    },
    env
  );
  assert.equal(reviewRes.status, 200);
  const reviewBody = (await reviewRes.json()) as { card: { intervalDays: number; consecutivePasses: number } };
  assert.ok(reviewBody.card.intervalDays >= 1);
  assert.equal(reviewBody.card.consecutivePasses, 1);

  // 3. Community post + spam rejection + comment + reaction + report + moderation RBAC
  const spamRes = await workerApp.request(
    'http://localhost/api/v1/community/posts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerA.token}` },
      body: JSON.stringify({
        category: 'discussion',
        title: 'Buy cheap followers now!!!',
        body: 'Visit https://spam1.example https://spam2.example https://spam3.example buy followers free crypto!',
        tags: ['spam'],
      }),
    },
    env
  );
  assert.equal(spamRes.status, 400);

  const postRes = await workerApp.request(
    'http://localhost/api/v1/community/posts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerA.token}` },
      body: JSON.stringify({
        category: 'practice_challenge',
        title: '3-sentence standup challenge',
        body: 'Share yesterday, today, and one blocker in clear English.',
        tags: ['workplace', 'speaking'],
        authorLevel: 'B1',
      }),
    },
    env
  );
  assert.equal(postRes.status, 201);
  const postBody = (await postRes.json()) as { post: { id: string } };

  const commentRes = await workerApp.request(
    `http://localhost/api/v1/community/posts/${postBody.post.id}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerB.token}` },
      body: JSON.stringify({ body: 'Yesterday I fixed the API bug and today I am writing tests.' }),
    },
    env
  );
  assert.equal(commentRes.status, 201);

  const reportRes = await workerApp.request(
    'http://localhost/api/v1/community/reports',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerB.token}` },
      body: JSON.stringify({
        targetType: 'post',
        targetId: postBody.post.id,
        reason: 'other',
        details: 'Testing moderation workflow',
      }),
    },
    env
  );
  assert.equal(reportRes.status, 201);
  const reportBody = (await reportRes.json()) as { report: { id: string } };

  // Non-admin learner receives 403 on admin moderation & subscription queues
  const forbiddenModQueue = await workerApp.request(
    'http://localhost/api/v1/admin/moderation/reports',
    { headers: { Authorization: `Bearer ${learnerB.token}` } },
    env
  );
  assert.equal(forbiddenModQueue.status, 403);

  const forbiddenSubAdmin = await workerApp.request(
    'http://localhost/api/v1/admin/subscriptions',
    { headers: { Authorization: `Bearer ${learnerB.token}` } },
    env
  );
  assert.equal(forbiddenSubAdmin.status, 403);

  // Promote learnerB to admin and resolve report -> restrict learnerA -> learnerA appeals -> admin approves
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(learnerB.userId);
  const resolveRes = await workerApp.request(
    `http://localhost/api/v1/admin/moderation/reports/${reportBody.report.id}/resolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerB.token}` },
      body: JSON.stringify({
        action: 'restrict_user',
        reviewerNote: 'Temporary mute for test verification',
        restrictionLevel: 'muted_24h',
      }),
    },
    env
  );
  assert.equal(resolveRes.status, 200);

  const appealRes = await workerApp.request(
    'http://localhost/api/v1/community/appeals',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerA.token}` },
      body: JSON.stringify({ appealText: 'Please review — this was a legitimate practice prompt.' }),
    },
    env
  );
  assert.equal(appealRes.status, 200);

  const approveAppealRes = await workerApp.request(
    `http://localhost/api/v1/admin/moderation/appeals/${learnerA.userId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerB.token}` },
      body: JSON.stringify({ decision: 'approved' }),
    },
    env
  );
  assert.equal(approveAppealRes.status, 200);

  // 4. Subscriptions, pending_provider honesty, support tickets & real $0 net revenue
  const checkoutRes = await workerApp.request(
    'http://localhost/api/v1/subscriptions/checkout-request',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerA.token}` },
      body: JSON.stringify({ planSlug: 'pro', billingInterval: 'monthly' }),
    },
    env
  );
  assert.equal(checkoutRes.status, 201);
  const checkoutBody = (await checkoutRes.json()) as {
    subscription: { status: string };
    providerConfigured: boolean;
  };
  assert.equal(checkoutBody.subscription.status, 'pending_provider');
  assert.equal(checkoutBody.providerConfigured, false);

  const ticketRes = await workerApp.request(
    'http://localhost/api/v1/support/tickets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerA.token}` },
      body: JSON.stringify({
        category: 'billing',
        subject: 'Pro plan question',
        message: 'When will SSLCommerz billing be enabled for Bangladesh cards?',
      }),
    },
    env
  );
  assert.equal(ticketRes.status, 201);

  const adminFinanceRes = await workerApp.request(
    'http://localhost/api/v1/admin/subscriptions?totalUsers=2&totalAiCostUsd=0.05',
    { headers: { Authorization: `Bearer ${learnerB.token}` } },
    env
  );
  assert.equal(adminFinanceRes.status, 200);
  const adminFinance = (await adminFinanceRes.json()) as {
    financialMetrics: { actualTotalCollectedUsd: number; pendingProviderRequests: number; activePaidSubscriptions: number };
    supportTickets: Array<{ id: string }>;
  };
  assert.equal(
    adminFinance.financialMetrics.actualTotalCollectedUsd,
    0,
    'pending_provider must never count as revenue'
  );
  assert.equal(adminFinance.financialMetrics.activePaidSubscriptions, 0);
  assert.equal(adminFinance.financialMetrics.pendingProviderRequests, 1);
  assert.equal(adminFinance.supportTickets.length, 1);

  // 5. Gamification opt-in leaderboard & reminder preferences (XP computed strictly from server D1 user_xp_events)
  db.prepare(
    `INSERT INTO user_xp_events (id, user_id, idempotency_key, source_type, source_id, xp_earned, title_en, title_bn, detail_en, detail_bn, verified_at)
     VALUES ('xp_p3_1', ?, 'idem_p3_1', 'lesson_completed', 'les_1', 420, 'Lesson Completed', 'লেসন সম্পন্ন', 'Verified test XP', 'যাচাইকৃত XP', '2026-01-01T00:00:00Z')`
  ).run(learnerA.userId);

  const prefRes = await workerApp.request(
    'http://localhost/api/v1/gamification/preferences',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerA.token}` },
      body: JSON.stringify({
        leaderboardOptIn: true,
        displayAlias: 'AlphaSpeaker',
        reminderEnabled: true,
        reminderTimeLocal: '20:30',
        totalVerifiedXp: 99999, // Worker must ignore forged client XP and use D1 user_xp_events (420)
      }),
    },
    env
  );
  assert.equal(prefRes.status, 200);
  const prefBody = (await prefRes.json()) as {
    prefs: { leaderboardOptIn: boolean; displayAlias: string };
    leaderboard: Array<{ displayAlias: string; totalVerifiedXp: number }>;
  };
  assert.equal(prefBody.prefs.leaderboardOptIn, true);
  assert.equal(prefBody.leaderboard.length, 1);
  assert.equal(prefBody.leaderboard[0].displayAlias, 'AlphaSpeaker');
  assert.equal(prefBody.leaderboard[0].totalVerifiedXp, 420);
});

test('PRD v6.1 Parity: Admin System Configuration RBAC + Signed HMAC-SHA256 Payment Webhooks', async () => {
  const { db, env } = createTestWorkerEnv();
  const learner = await registerAndVerifyUser(env, 'webhook.learner@example.com', 'Webhook Learner');
  const admin = await registerAndVerifyUser(env, 'sysadmin@example.com', 'Sys Admin');
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(admin.userId);

  // 1. Learner receives 403 on GET/PUT /api/v1/admin/system-settings
  const learnerGet = await workerApp.request(
    'http://localhost/api/v1/admin/system-settings',
    { headers: { Authorization: `Bearer ${learner.token}` } },
    env
  );
  assert.equal(learnerGet.status, 403);

  const learnerPut = await workerApp.request(
    'http://localhost/api/v1/admin/system-settings',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learner.token}` },
      body: JSON.stringify({ audioRetentionDays: 60 }),
    },
    env
  );
  assert.equal(learnerPut.status, 403);

  // 2. Admin can read and update non-secret system settings, while secret keys are rejected with 400
  const adminGet = await workerApp.request(
    'http://localhost/api/v1/admin/system-settings',
    { headers: { Authorization: `Bearer ${admin.token}` } },
    env
  );
  assert.equal(adminGet.status, 200);
  const adminGetBody = (await adminGet.json()) as {
    settings: { allowNewRegistrations: boolean; communityDirectMessagingEnabled: boolean; audioRetentionDays: number };
    webhookProvidersConfigured: { stripe: boolean; sslcommerz: boolean; paddle: boolean };
  };
  assert.equal(adminGetBody.settings.allowNewRegistrations, true);
  assert.equal(adminGetBody.settings.communityDirectMessagingEnabled, false);
  assert.equal(adminGetBody.webhookProvidersConfigured.stripe, false);

  const badSecretPut = await workerApp.request(
    'http://localhost/api/v1/admin/system-settings',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ stripeSecretKey: 'sk_live_forged' }),
    },
    env
  );
  assert.equal(badSecretPut.status, 400);

  const dmEnablePut = await workerApp.request(
    'http://localhost/api/v1/admin/system-settings',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ communityDirectMessagingEnabled: true }),
    },
    env
  );
  assert.equal(dmEnablePut.status, 400);

  const goodPut = await workerApp.request(
    'http://localhost/api/v1/admin/system-settings',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        maintenanceBannerEn: 'Scheduled upgrade Sunday 02:00 UTC',
        audioRetentionDays: 60,
      }),
    },
    env
  );
  assert.equal(goodPut.status, 200);
  const goodPutBody = (await goodPut.json()) as {
    settings: { maintenanceBannerEn: string; audioRetentionDays: number; communityDirectMessagingEnabled: boolean };
  };
  assert.equal(goodPutBody.settings.maintenanceBannerEn, 'Scheduled upgrade Sunday 02:00 UTC');
  assert.equal(goodPutBody.settings.audioRetentionDays, 60);
  assert.equal(goodPutBody.settings.communityDirectMessagingEnabled, false);

  // 3. Payment Webhook: fail closed (503) when STRIPE_WEBHOOK_SECRET is not configured
  const webhookPayload = JSON.stringify({
    eventId: 'evt_stripe_pro_001',
    eventType: 'payment_succeeded',
    userId: learner.userId,
    plan: 'pro',
    amountCents: 1200,
    currency: 'USD',
  });
  const unconfiguredRes = await workerApp.request(
    'http://localhost/api/v1/billing/webhooks/stripe',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: webhookPayload,
    },
    env
  );
  assert.equal(unconfiguredRes.status, 503);

  // 4. Configure STRIPE_WEBHOOK_SECRET -> tampered signature rejected (401)
  const webhookSecret = 'whsec_test_worker_secret_42';
  const signedEnv: WorkerEnv = { ...env, STRIPE_WEBHOOK_SECRET: webhookSecret };
  const ts = String(Math.floor(Date.now() / 1000));
  const badSigRes = await workerApp.request(
    'http://localhost/api/v1/billing/webhooks/stripe',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LV-Webhook-Timestamp': ts,
        'X-LV-Webhook-Signature': '0'.repeat(64),
      },
      body: webhookPayload,
    },
    signedEnv
  );
  assert.equal(badSigRes.status, 401);

  // 5. Valid HMAC-SHA256 signature activates subscription + writes paid invoice; replay is idempotent
  const validSig = await computeWebhookHmacHex(webhookSecret, ts, webhookPayload);
  const okRes = await workerApp.request(
    'http://localhost/api/v1/billing/webhooks/stripe',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LV-Webhook-Timestamp': ts,
        'X-LV-Webhook-Signature': validSig,
      },
      body: webhookPayload,
    },
    signedEnv
  );
  assert.equal(okRes.status, 200);
  const okBody = (await okRes.json()) as {
    received: boolean;
    duplicate: boolean;
    statusApplied: string;
    eventId: string;
  };
  assert.equal(okBody.received, true);
  assert.equal(okBody.duplicate, false);
  assert.equal(okBody.statusApplied, 'subscription_active');

  // Verify D1 rows updated cleanly
  const subRow = db
    .prepare(`SELECT plan_slug, status FROM subscriptions WHERE user_id = ?`)
    .get(learner.userId) as { plan_slug: string; status: string };
  assert.equal(subRow.plan_slug, 'pro');
  assert.equal(subRow.status, 'active');

  const invRow = db
    .prepare(`SELECT status, amount_cents FROM subscription_invoices WHERE user_id = ?`)
    .get(learner.userId) as { status: string; amount_cents: number };
  assert.equal(invRow.status, 'paid');
  assert.equal(invRow.amount_cents, 1200);

  // Replay same eventId -> idempotent duplicate=true (no duplicate invoice)
  const replayRes = await workerApp.request(
    'http://localhost/api/v1/billing/webhooks/stripe',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LV-Webhook-Timestamp': ts,
        'X-LV-Webhook-Signature': validSig,
      },
      body: webhookPayload,
    },
    signedEnv
  );
  assert.equal(replayRes.status, 200);
  const replayBody = (await replayRes.json()) as { duplicate: boolean; statusApplied: string };
  assert.equal(replayBody.duplicate, true);
  assert.equal(replayBody.statusApplied, 'already_processed');

  const invCount = db
    .prepare(`SELECT COUNT(*) AS cnt FROM subscription_invoices WHERE user_id = ?`)
    .get(learner.userId) as { cnt: number };
  assert.equal(invCount.cnt, 1, 'replayed webhook must not create duplicate invoices');
});

test('PRD v6.1 Full Parity: Security Headers, Feature Flags, AI Providers, Admin Delete/Suspend, IELTS, Human Bridge & Notifications', async () => {
  const { db, env } = createTestWorkerEnv();
  const learner = await registerAndVerifyUser(env, 'prd61.learner@example.com', 'PRD61 Learner');
  const targetUser = await registerAndVerifyUser(env, 'prd61.target@example.com', 'Target User');
  const admin = await registerAndVerifyUser(env, 'prd61.admin@example.com', 'PRD61 Admin');
  db.prepare(`UPDATE users SET role = 'admin' WHERE id = ?`).run(admin.userId);

  // 1. Public system status + security headers
  const statusRes = await workerApp.request('http://localhost/api/v1/system/status', {}, env);
  assert.equal(statusRes.status, 200);
  assert.ok(statusRes.headers.get('X-Request-Id'), 'X-Request-Id header must be present');
  assert.equal(statusRes.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.ok(statusRes.headers.get('Permissions-Policy')?.includes('camera=()'));
  const statusBody = (await statusRes.json()) as {
    maintenanceMode: boolean;
    featureFlags: { ieltsExamPrepEnabled: boolean; writingDiaryStudioEnabled: boolean };
  };
  assert.equal(statusBody.maintenanceMode, false);
  assert.equal(statusBody.featureFlags.ieltsExamPrepEnabled, true);

  // 2. Learner gets 403 on PRD v6.1 admin endpoints
  for (const adminPath of [
    '/api/v1/admin/feature-flags',
    '/api/v1/admin/ai-providers',
    '/api/v1/admin/system-health',
  ]) {
    const res = await workerApp.request(
      `http://localhost${adminPath}`,
      { headers: { Authorization: `Bearer ${learner.token}` } },
      env
    );
    assert.equal(res.status, 403, `learner must be blocked from ${adminPath}`);
  }

  // 3. Admin reads/updates feature flags, checks AI providers & system health, and receives 501 on Worker rotate-key
  const flagPut = await workerApp.request(
    'http://localhost/api/v1/admin/feature-flags',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ maintenanceMode: true }),
    },
    env
  );
  assert.equal(flagPut.status, 200);

  const statusAfterFlag = await workerApp.request('http://localhost/api/v1/system/status', {}, env);
  const statusAfterFlagBody = (await statusAfterFlag.json()) as {
    maintenanceMode: boolean;
  };
  assert.equal(statusAfterFlagBody.maintenanceMode, true);

  const providersRes = await workerApp.request(
    'http://localhost/api/v1/admin/ai-providers',
    { headers: { Authorization: `Bearer ${admin.token}` } },
    env
  );
  assert.equal(providersRes.status, 200);
  const providersBody = (await providersRes.json()) as {
    providers: Array<{ id: string; configured: boolean; maskedFingerprint: string | null }>;
  };
  const gemini = providersBody.providers.find((p) => p.id === 'gemini');
  assert.ok(gemini?.configured, 'Gemini should report configured when GEMINI_API_KEY is present');
  assert.ok(
    !JSON.stringify(providersBody).includes('test-mock-gemini-key'),
    'raw GEMINI_API_KEY must never leak in provider responses'
  );

  const rotateRes = await workerApp.request(
    'http://localhost/api/v1/admin/ai-providers/gemini/rotate-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ apiKey: 'AIzaTestNewKeyValue12345' }),
    },
    env
  );
  assert.equal(rotateRes.status, 501);

  const healthRes = await workerApp.request(
    'http://localhost/api/v1/admin/system-health',
    { headers: { Authorization: `Bearer ${admin.token}` } },
    env
  );
  assert.equal(healthRes.status, 200);
  const healthBody = (await healthRes.json()) as {
    runtime: string;
    database: { status: string; migrationsReady: string[] };
  };
  assert.equal(healthBody.runtime, 'cloudflare-worker');
  assert.equal(healthBody.database.status, 'healthy');
  assert.equal(healthBody.database.migrationsReady.length, 4);

  // 4. Suspend user revokes active sessions; DELETE removes user cleanly
  const suspendRes = await workerApp.request(
    `http://localhost/api/v1/admin/users/${targetUser.userId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ accountStatus: 'suspended' }),
    },
    env
  );
  assert.equal(suspendRes.status, 200);

  const suspendedMeRes = await workerApp.request(
    'http://localhost/api/v1/auth/me',
    { headers: { Authorization: `Bearer ${targetUser.token}` } },
    env
  );
  assert.equal(suspendedMeRes.status, 401, 'suspended user session must be revoked');

  const deleteRes = await workerApp.request(
    `http://localhost/api/v1/admin/users/${targetUser.userId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${admin.token}` },
    },
    env
  );
  assert.equal(deleteRes.status, 200);

  // 5. IELTS catalog + deterministic Reading evaluation + persisted history
  const catalogRes = await workerApp.request(
    'http://localhost/api/v1/examinations/catalog',
    { headers: { Authorization: `Bearer ${learner.token}` } },
    env
  );
  assert.equal(catalogRes.status, 200);
  const catalogBody = (await catalogRes.json()) as {
    disclaimerEn: string;
    tasks: Array<{ id: string; module: string; questions?: Array<{ id: string; correctOptionIndex: number }> }>;
  };
  assert.ok(catalogBody.disclaimerEn.toLowerCase().includes('practice'));
  const readingTask = catalogBody.tasks.find((t) => t.module === 'reading' && t.questions?.length);
  assert.ok(readingTask, 'expected at least one reading exam task');

  const selectedAnswers: Record<string, number> = {};
  for (const q of readingTask.questions ?? []) {
    selectedAnswers[q.id] = q.correctOptionIndex;
  }
  const evalRes = await workerApp.request(
    'http://localhost/api/v1/examinations/evaluate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learner.token}` },
      body: JSON.stringify({
        taskId: readingTask.id,
        selectedAnswers,
        durationSeconds: 180,
      }),
    },
    env
  );
  assert.equal(evalRes.status, 201);
  const evalBody = (await evalRes.json()) as {
    attempt: { id: string; objectiveScorePct: number; modelUsed: string };
  };
  assert.equal(evalBody.attempt.objectiveScorePct, 100);
  assert.equal(evalBody.attempt.modelUsed, 'deterministic-exam-grader');

  const historyRes = await workerApp.request(
    'http://localhost/api/v1/examinations/attempts',
    { headers: { Authorization: `Bearer ${learner.token}` } },
    env
  );
  assert.equal(historyRes.status, 200);
  const historyBody = (await historyRes.json()) as { attempts: Array<{ id: string }> };
  assert.equal(historyBody.attempts.length, 1);

  // 6. Human Communication Bridge CRUD (strictly tagged user_reported)
  const bridgeCreate = await workerApp.request(
    'http://localhost/api/v1/human-bridge/logs',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learner.token}` },
      body: JSON.stringify({
        scenarioContext: 'Office Standup',
        partnerType: 'colleague',
        goalEn: 'Explain deployment schedule clearly without switching to Bangla.',
        whatWentWell: 'Spoke steadily and clarified timeline milestones.',
        whatFeltHard: 'Hesitated on past perfect once.',
        selfReportedConfidence: 4,
      }),
    },
    env
  );
  assert.equal(bridgeCreate.status, 201);
  const bridgeBody = (await bridgeCreate.json()) as {
    log: { id: string; evidenceType: string };
  };
  assert.equal(bridgeBody.log.evidenceType, 'user_reported');

  const bridgeDelete = await workerApp.request(
    `http://localhost/api/v1/human-bridge/logs/${bridgeBody.log.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${learner.token}` },
    },
    env
  );
  assert.equal(bridgeDelete.status, 200);

  // 7. Notifications preferences + admin broadcast + learner mark read
  const prefPut = await workerApp.request(
    'http://localhost/api/v1/notifications/preferences',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${learner.token}` },
      body: JSON.stringify({
        remindersEnabled: true,
        preferredTimeLocal: '21:15',
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        reviewReminders: true,
        assessmentReminders: true,
        subscriptionNotices: true,
        securityNotifications: true,
        emailNotifications: true,
      }),
    },
    env
  );
  assert.equal(prefPut.status, 200);

  const broadcastRes = await workerApp.request(
    'http://localhost/api/v1/admin/notifications/broadcast',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        titleEn: 'IELTS Module Live',
        titleBn: 'IELTS মডিউল চালু হয়েছে',
        bodyEn: 'Try the new IELTS practice suite today.',
        bodyBn: 'আজই নতুন IELTS অনুশীলন চেষ্টা করুন।',
        actionRoute: '/app/ielts',
      }),
    },
    env
  );
  assert.equal(broadcastRes.status, 201);

  const notifListRes = await workerApp.request(
    'http://localhost/api/v1/notifications',
    { headers: { Authorization: `Bearer ${learner.token}` } },
    env
  );
  assert.equal(notifListRes.status, 200);
  const notifListBody = (await notifListRes.json()) as {
    preferences: { preferredTimeLocal: string };
    notifications: Array<{ id: string; readAt: string | null }>;
  };
  assert.equal(notifListBody.preferences.preferredTimeLocal, '21:15');
  assert.ok(notifListBody.notifications.length >= 1);

  const readRes = await workerApp.request(
    `http://localhost/api/v1/notifications/${notifListBody.notifications[0].id}/read`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${learner.token}` },
    },
    env
  );
  assert.equal(readRes.status, 200);
});

