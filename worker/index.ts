import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type {
  SessionJwtPayload,
  WorkerAdminRole,
  WorkerAuthUser,
  WorkerEnv,
} from './types';
import {
  generateRandomId,
  generateSaltHex,
  generateSixDigitOtp,
  hashOtp,
  hashPasswordPbkdf2,
  sha256Hex,
  signSessionJwt,
  verifyPasswordPbkdf2,
  verifySessionJwt,
} from './services/crypto';
import { sendWorkerOtpEmail } from './services/email';
import { callWorkerGeminiJson, resolveWorkerGeminiModels } from './services/gemini';
import {
  JwtSecretConfigError,
  resolveAllowedCorsOrigin,
  resolveWorkerJwtSecret,
  validateAudioUploadConstraints,
} from '../src/domain/securityPolicy';
import {
  buildSpeakingSystemInstruction,
  buildSpeakingTurnPrompt,
  normalizeSpeakingEvaluation,
  type SpeakingEvaluationRequest,
} from '../src/domain/speakingEvaluation';
import { isValidSpeakingModeId } from '../src/domain/speakingScenarios';
import { normalizePressureLevel } from '../src/domain/pressureLadder';
import type { SpeakingPressureLevel } from '../src/types/domain';
import { registerParts06To12Routes, type WorkerRouteDeps } from './routes/parts06To12Routes';
import { registerLearnerPersistenceRoutes } from './routes/learnerPersistenceRoutes';
import { registerP3CommunityVocabBillingRoutes } from './routes/p3CommunityVocabBillingRoutes';
import { registerWorkerPrd61Routes } from './routes/prd61Routes';

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_COOKIE_NAME = 'lv_session';

const ADMIN_ALLOWED_ROLES = new Set<WorkerAdminRole>([
  'super_admin',
  'admin',
  'content_manager',
  'ai_ops',
  'moderator',
]);

type AppContext = Context<{ Bindings: WorkerEnv; Variables: { authUser?: WorkerAuthUser } }>;
type AuthUserContext = WorkerAuthUser;

const app = new Hono<{ Bindings: WorkerEnv; Variables: { authUser?: WorkerAuthUser } }>();

app.onError((err, c) => {
  if (err instanceof JwtSecretConfigError) {
    return c.json(
      {
        error: 'Server authentication configuration error.',
        code: 'AUTH_CONFIG_ERROR',
      },
      500
    );
  }
  return c.json(
    {
      error: 'Internal server error.',
      code: 'INTERNAL_ERROR',
    },
    500
  );
});

// 1. Strict Allowlisted CORS & Security Headers (never reflects untrusted origins)
app.use('*', async (c, next) => {
  const middleware = cors({
    origin: (reqOrigin) =>
      resolveAllowedCorsOrigin(reqOrigin, c.env.CORS_ALLOWED_ORIGIN, c.env.APP_ENV) ?? '',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-Id',
      'X-CSRF-Token',
      'X-Requested-With',
    ],
  });
  return middleware(c, next);
});

app.use('*', async (c, next) => {
  const corrId = c.req.header('X-Correlation-Id') || c.req.header('X-Request-Id') || generateRandomId('req');
  c.header('X-Correlation-Id', corrId);
  c.header('X-Request-Id', corrId);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), geolocation=(), payment=()');
  await next();
});

// 2. Edge KV Rate Limiting Middleware
async function checkRateLimit(c: AppContext, bucket: string, maxPerMinute: number): Promise<boolean> {
  const kv = c.env.RATE_LIMIT_KV ?? c.env.LINGUAVERSE_KV;
  if (!kv) return true;
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const minuteWindow = Math.floor(Date.now() / 60_000);
  const key = `rl:${bucket}:${ip}:${minuteWindow}`;
  const current = Number((await kv.get(key)) || '0');
  if (current >= maxPerMinute) {
    c.header('Retry-After', '60');
    return false;
  }
  await kv.put(key, String(current + 1), { expirationTtl: 90 });
  return true;
}

// 3. Session Helpers (HTTP-only Cookie + Bearer Token; fail-closed JWT secret resolution)
function getJwtSecret(env: WorkerEnv): string {
  return resolveWorkerJwtSecret({
    JWT_SIGNING_SECRET: env.JWT_SIGNING_SECRET,
    APP_ENV: env.APP_ENV,
  });
}

function extractToken(c: AppContext): string | null {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = c.req.header('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(c: AppContext, token: string): void {
  const isProd = c.env.APP_ENV === 'production' || c.env.APP_ENV === 'staging';
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isProd) {
    attrs.push('Secure', 'Partitioned');
  }
  c.header('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(c: AppContext): void {
  const isProd = c.env.APP_ENV === 'production' || c.env.APP_ENV === 'staging';
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isProd) {
    attrs.push('Secure', 'Partitioned');
  }
  c.header('Set-Cookie', attrs.join('; '));
}

async function resolveAuthenticatedUser(c: AppContext): Promise<AuthUserContext | null> {
  const token = extractToken(c);
  if (!token) return null;

  const claims = await verifySessionJwt(token, getJwtSecret(c.env));
  if (!claims) return null;

  const sessionRow = await c.env.DB.prepare(
    `SELECT id, revoked_at, expires_at FROM sessions WHERE id = ? AND user_id = ? LIMIT 1`
  )
    .bind(claims.sid, claims.sub)
    .first<{ id: string; revoked_at: string | null; expires_at: string }>();

  if (!sessionRow || sessionRow.revoked_at || Date.now() > Date.parse(sessionRow.expires_at)) {
    return null;
  }

  const userRow = await c.env.DB.prepare(
    `SELECT id, name, email, plan, role, email_verified, account_status, created_at
     FROM users WHERE id = ? LIMIT 1`
  )
    .bind(claims.sub)
    .first<{
      id: string;
      name: string;
      email: string;
      plan: string;
      role: WorkerAdminRole;
      email_verified: number;
      account_status: 'active' | 'suspended';
      created_at: string;
    }>();

  if (!userRow || userRow.account_status === 'suspended') {
    return null;
  }

  return {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    plan: userRow.plan,
    role: userRow.role,
    emailVerified: Boolean(userRow.email_verified),
    accountStatus: userRow.account_status,
    createdAt: userRow.created_at,
    sessionId: claims.sid,
  };
}

async function requireAuth(c: AppContext, opts: { requireVerified?: boolean } = {}): Promise<AuthUserContext | Response> {
  const user = await resolveAuthenticatedUser(c);
  if (!user) {
    return c.json({ error: 'Authentication required.' }, 401);
  }
  if (opts.requireVerified && !user.emailVerified) {
    return c.json(
      { error: 'Please verify your email address before accessing this resource.', code: 'EMAIL_NOT_VERIFIED' },
      403
    );
  }
  return user;
}

async function requireAdmin(
  c: AppContext,
  allowedRoles: WorkerAdminRole[] = ['super_admin', 'admin', 'content_manager', 'ai_ops', 'moderator']
): Promise<AuthUserContext | Response> {
  const auth = await requireAuth(c, { requireVerified: true });
  if (auth instanceof Response) return auth;
  if (!ADMIN_ALLOWED_ROLES.has(auth.role) || !allowedRoles.includes(auth.role)) {
    return c.json({ error: 'Forbidden: insufficient administrative permissions.' }, 403);
  }
  return auth;
}

async function writeAuditLog(
  env: WorkerEnv,
  entry: {
    actorUserId: string;
    actorEmail: string;
    actorRole: WorkerAdminRole;
    action: string;
    resourceType: string;
    resourceId: string;
    summaryEn: string;
    summaryBn: string;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const correlationId = generateRandomId('aud');
  await env.DB.prepare(
    `INSERT INTO audit_logs (
      id, correlation_id, actor_user_id, actor_email, actor_role, action,
      resource_type, resource_id, summary_en, summary_bn, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      generateRandomId('log'),
      correlationId,
      entry.actorUserId,
      entry.actorEmail,
      entry.actorRole,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.summaryEn,
      entry.summaryBn,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      new Date().toISOString()
    )
    .run();
  return correlationId;
}

async function buildHydratedAuthPayload(
  env: WorkerEnv,
  user: AuthUserContext,
  token: string
) {
  const profileRow = await env.DB.prepare(
    `SELECT * FROM learner_profiles WHERE user_id = ? LIMIT 1`
  )
    .bind(user.id)
    .first<Record<string, unknown>>();

  const mistakesRes = await env.DB.prepare(
    `SELECT * FROM learner_mistakes WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 200`
  )
    .bind(user.id)
    .all<Record<string, unknown>>();

  const lessonAttemptsRes = await env.DB.prepare(
    `SELECT * FROM lesson_attempts WHERE user_id = ? ORDER BY completed_at ASC LIMIT 200`
  )
    .bind(user.id)
    .all<Record<string, unknown>>();

  const speakingRes = await env.DB.prepare(
    `SELECT * FROM speaking_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`
  )
    .bind(user.id)
    .all<Record<string, unknown>>();

  const transferRes = await env.DB.prepare(
    `SELECT * FROM transfer_attempts WHERE user_id = ? ORDER BY completed_at DESC LIMIT 50`
  )
    .bind(user.id)
    .all<Record<string, unknown>>();

  const xpRes = await env.DB.prepare(
    `SELECT * FROM user_xp_events WHERE user_id = ? ORDER BY verified_at DESC LIMIT 200`
  )
    .bind(user.id)
    .all<Record<string, unknown>>();

  const lessonAttempts = lessonAttemptsRes.results.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    lessonId: String(r.lesson_id),
    startedAt: String(r.started_at),
    completedAt: String(r.completed_at),
    durationSeconds: Number(r.duration_seconds || 0),
    guidedCorrect: Number(r.guided_correct || 0),
    guidedTotal: Number(r.guided_total || 0),
    independentCorrect: Number(r.independent_correct || 0),
    independentTotal: Number(r.independent_total || 0),
    assessmentCorrect: Number(r.assessment_correct || 0),
    assessmentTotal: Number(r.assessment_total || 0),
    overallAccuracyPercent: Number(r.overall_accuracy_percent || 0),
    mistakesLoggedCount: Number(r.mistakes_logged_count || 0),
  }));

  const speakingSessions = speakingRes.results.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    modeId: String(r.mode_id),
    pressureLevel: String(r.pressure_level),
    startedAt: String(r.started_at),
    updatedAt: String(r.updated_at),
    durationSeconds: Number(r.duration_seconds || 0),
    turns: r.turns_json ? JSON.parse(String(r.turns_json)) : [],
    totalMistakesDetected: Number(r.total_mistakes_detected || 0),
  }));

  const transferAttempts = transferRes.results.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    scenarioId: String(r.scenario_id),
    pressureLevel: String(r.pressure_level),
    targetSkillLabelEn: String(r.target_skill_label_en),
    targetSkillLabelBn: String(r.target_skill_label_bn),
    linkedSourceType: String(r.linked_source_type),
    linkedSourceId: r.linked_source_id ? String(r.linked_source_id) : undefined,
    userResponse: String(r.user_response),
    twistPromptShown: r.twist_prompt_shown ? String(r.twist_prompt_shown) : undefined,
    twistResponse: r.twist_response ? String(r.twist_response) : undefined,
    inputChannel: String(r.input_channel),
    durationSeconds: Number(r.duration_seconds || 0),
    timedOut: Boolean(r.timed_out),
    evaluation: r.evaluation_json ? JSON.parse(String(r.evaluation_json)) : {},
    passed: Boolean(r.passed),
    completedAt: String(r.completed_at),
  }));

  const mistakes = mistakesRes.results.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    source: String(r.source),
    lessonId: r.lesson_id ? String(r.lesson_id) : undefined,
    speakingSessionId: r.speaking_session_id ? String(r.speaking_session_id) : undefined,
    domain: String(r.domain),
    category: String(r.category),
    userExample: String(r.user_example),
    correctedExample: String(r.corrected_example),
    patternEn: String(r.pattern_en),
    patternBn: String(r.pattern_bn),
    explanationEn: String(r.explanation_en),
    explanationBn: String(r.explanation_bn),
    occurrences: Number(r.occurrences || 1),
    severity: r.severity ? String(r.severity) : undefined,
    confidence: typeof r.confidence === 'number' ? r.confidence : undefined,
    status: String(r.status || 'active'),
    falseCorrectionReported: Boolean(r.false_correction_reported),
    falseCorrectionReason: r.false_correction_reason ? String(r.false_correction_reason) : undefined,
    falseCorrectionReportedAt: r.false_correction_reported_at
      ? String(r.false_correction_reported_at)
      : undefined,
    adminReviewStatus: r.admin_review_status ? String(r.admin_review_status) : undefined,
    adminReviewNote: r.admin_review_note ? String(r.admin_review_note) : undefined,
    adminReviewedAt: r.admin_reviewed_at ? String(r.admin_reviewed_at) : undefined,
    adminReviewedBy: r.admin_reviewed_by ? String(r.admin_reviewed_by) : undefined,
    createdAt: String(r.created_at),
    lastSeenAt: String(r.last_seen_at),
  }));

  const xpLedger = xpRes.results.map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    idempotencyKey: String(r.idempotency_key),
    sourceType: String(r.source_type),
    sourceId: String(r.source_id),
    titleEn: String(r.title_en),
    titleBn: String(r.title_bn),
    detailEn: String(r.detail_en),
    detailBn: String(r.detail_bn),
    xpEarned: Number(r.xp_earned || 0),
    verifiedAt: String(r.verified_at),
  }));

  const nowIso = new Date().toISOString();
  const profile = {
    userId: user.id,
    preferredUiLanguage: String(profileRow?.preferred_ui_language || 'en'),
    explanationLanguage: String(profileRow?.explanation_language || 'bn'),
    selfEstimatedLevel: String(profileRow?.self_estimated_level || 'A2'),
    primaryGoal: String(profileRow?.primary_goal || 'daily_speaking'),
    dailyTimeGoalMinutes: Number(profileRow?.daily_time_goal_minutes || 15),
    spacedRepetitionPreset: String(profileRow?.spaced_repetition_preset || 'standard'),
    privacyConsent: {
      storeMicRecordings: Boolean(profileRow?.store_mic_recordings ?? 1),
      logAiEvaluations: Boolean(profileRow?.log_ai_evaluations ?? 1),
      updatedAt: String(profileRow?.privacy_consent_updated_at || nowIso),
    },
    onboardingCompleted: Boolean(profileRow?.onboarding_completed ?? 0),
    diagnosticCompleted: Boolean(profileRow?.diagnostic_completed ?? 0),
    updatedAt: String(profileRow?.updated_at || nowIso),
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role,
      emailVerified: user.emailVerified,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
    },
    profile,
    session: {
      token,
      userId: user.id,
      createdAt: nowIso,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
    },
    latestDiagnostic: null,
    mistakes,
    lessonAttempts,
    exerciseAttempts: [],
    lessonMastery: {},
    speakingSessions,
    mistakeDrillAttempts: [],
    transferAttempts,
    xpLedger,
    activitySummary: {
      completedLessons: new Set(lessonAttempts.map((a) => a.lessonId)).size,
      completedSpeakingSessions: speakingSessions.filter((s) => s.turns.length > 0).length,
      completedTransferDrills: transferAttempts.filter((t) => t.passed).length,
      activeStreakDays: 0,
      totalPracticeMinutes: Math.round(
        (lessonAttempts.reduce((s, a) => s + a.durationSeconds, 0) +
          speakingSessions.reduce((s, a) => s + a.durationSeconds, 0)) /
          60
      ),
    },
  };
}

// ============================================================================
// Health & Public Endpoints
// ============================================================================
app.get('/api/v1/health', (c) =>
  c.json({
    ok: true,
    service: 'linguaverse-ai-worker',
    env: c.env.APP_ENV || 'development',
    aiConfigured: Boolean(c.env.GEMINI_API_KEY?.trim()),
    emailConfigured: Boolean(
      c.env.RESEND_API_KEY?.trim() || c.env.EMAIL_PROVIDER_API_KEY?.trim()
    ),
  })
);

app.get('/api/v1/speaking/health', (c) =>
  c.json({
    ok: true,
    configured: Boolean(c.env.GEMINI_API_KEY?.trim()),
    model: resolveWorkerGeminiModels(c.env).primary,
  })
);

// ============================================================================
// Authentication & Real Gmail 6-Digit OTP Verification
// ============================================================================
async function issueOtpAndSend(
  env: WorkerEnv,
  user: { id: string; name: string; email: string }
) {
  const nowMs = Date.now();
  const otpCode = generateSixDigitOtp();
  const otpHash = await hashOtp(user.email, otpCode);
  const expiresAt = new Date(nowMs + OTP_EXPIRY_MS).toISOString();
  const resendAvailableAt = new Date(nowMs + OTP_RESEND_COOLDOWN_MS).toISOString();

  await env.DB.prepare(
    `INSERT INTO email_verification_tokens (
      id, user_id, email, otp_hash, expires_at, attempts, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?)`
  )
    .bind(
      generateRandomId('otp'),
      user.id,
      user.email,
      otpHash,
      expiresAt,
      new Date(nowMs).toISOString()
    )
    .run();

  const kv = env.LINGUAVERSE_KV ?? env.RATE_LIMIT_KV;
  if (kv) {
    await kv.put(`otp_cd:${user.id}`, resendAvailableAt, { expirationTtl: 65 });
  }

  const emailRes = await sendWorkerOtpEmail(env, {
    toEmail: user.email,
    recipientName: user.name,
    otpCode,
  });

  const isDevPreview = !emailRes.delivered && env.APP_ENV !== 'production';

  return {
    email: user.email,
    expiresAt,
    resendAvailableAt,
    deliveryMode: emailRes.delivered ? 'email_provider' : 'local_dev_preview',
    ...(isDevPreview ? { devPreviewOtp: otpCode } : {}),
  };
}

app.post('/api/v1/auth/register', async (c) => {
  if (!(await checkRateLimit(c, 'auth_register', 10))) {
    return c.json({ error: 'Too many registration attempts. Please try again in a minute.' }, 429);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
    plan?: string;
  };
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const plan = 'free';

  if (name.length < 2) {
    return c.json({ error: 'Please enter your full name (at least 2 characters).' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters long.' }, 400);
  }

  const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`)
    .bind(email)
    .first();
  if (existing) {
    return c.json({ error: 'An account with this email already exists.' }, 409);
  }

  const nowIso = new Date().toISOString();
  const userId = generateRandomId('usr');
  const salt = generateSaltHex(16);
  const passwordHash = await hashPasswordPbkdf2(password, salt);

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO users (
        id, name, email, password_salt, password_hash, email_verified,
        account_status, plan, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 'active', ?, 'learner', ?, ?)`
    ).bind(userId, name, email, salt, passwordHash, plan, nowIso, nowIso),
    c.env.DB.prepare(
      `INSERT INTO learner_profiles (
        user_id, preferred_ui_language, explanation_language, self_estimated_level,
        primary_goal, daily_time_goal_minutes, spaced_repetition_preset,
        store_mic_recordings, log_ai_evaluations, privacy_consent_updated_at,
        onboarding_completed, diagnostic_completed, updated_at
      ) VALUES (?, 'en', 'bn', 'A2', 'daily_speaking', 15, 'standard', 1, 1, ?, 0, 0, ?)`
    ).bind(userId, nowIso, nowIso),
  ]);

  const sessionId = generateRandomId('ses');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_TTL_SECONDS;
  const jwt = await signSessionJwt(
    { sub: userId, sid: sessionId, email, role: 'learner', iat, exp },
    getJwtSecret(c.env)
  );
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      sessionId,
      userId,
      await sha256Hex(jwt),
      c.req.header('User-Agent') || null,
      new Date(exp * 1000).toISOString(),
      nowIso
    )
    .run();

  const otpDelivery = await issueOtpAndSend(c.env, { id: userId, name, email });
  setSessionCookie(c, jwt);

  const authUser: AuthUserContext = {
    id: userId,
    name,
    email,
    plan,
    role: 'learner',
    emailVerified: false,
    accountStatus: 'active',
    createdAt: nowIso,
    sessionId,
  };

  const payload = await buildHydratedAuthPayload(c.env, authUser, jwt);
  return c.json({ ...payload, otpDelivery }, 201);
});

app.post('/api/v1/auth/login', async (c) => {
  if (!(await checkRateLimit(c, 'auth_login', 15))) {
    return c.json({ error: 'Too many login attempts. Please wait a minute.' }, 429);
  }

  const body = (await c.req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) {
    return c.json({ error: 'Email and password are required.' }, 400);
  }

  const userRow = await c.env.DB.prepare(
    `SELECT id, name, email, password_salt, password_hash, plan, role,
            email_verified, account_status, created_at
     FROM users WHERE email = ? LIMIT 1`
  )
    .bind(email)
    .first<{
      id: string;
      name: string;
      email: string;
      password_salt: string;
      password_hash: string;
      plan: string;
      role: WorkerAdminRole;
      email_verified: number;
      account_status: 'active' | 'suspended';
      created_at: string;
    }>();

  if (!userRow) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }
  if (userRow.account_status === 'suspended') {
    return c.json({ error: 'This account has been suspended by an administrator.' }, 403);
  }

  const valid = await verifyPasswordPbkdf2(password, userRow.password_salt, userRow.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const nowIso = new Date().toISOString();
  const sessionId = generateRandomId('ses');
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_TTL_SECONDS;
  const jwt = await signSessionJwt(
    { sub: userRow.id, sid: sessionId, email: userRow.email, role: userRow.role, iat, exp },
    getJwtSecret(c.env)
  );
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      sessionId,
      userRow.id,
      await sha256Hex(jwt),
      c.req.header('User-Agent') || null,
      new Date(exp * 1000).toISOString(),
      nowIso
    )
    .run();

  setSessionCookie(c, jwt);
  const authUser: AuthUserContext = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    plan: userRow.plan,
    role: userRow.role,
    emailVerified: Boolean(userRow.email_verified),
    accountStatus: userRow.account_status,
    createdAt: userRow.created_at,
    sessionId,
  };

  const payload = await buildHydratedAuthPayload(c.env, authUser, jwt);
  return c.json(payload);
});

app.post('/api/v1/auth/logout', async (c) => {
  const user = await resolveAuthenticatedUser(c);
  if (user) {
    await c.env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), user.sessionId)
      .run();
  }
  clearSessionCookie(c);
  return c.body(null, 204);
});

app.get('/api/v1/auth/me', async (c) => {
  const user = await resolveAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Not authenticated.' }, 401);
  const token = extractToken(c) || '';
  return c.json(await buildHydratedAuthPayload(c.env, user, token));
});

app.post('/api/v1/auth/verify-email', async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;

  const body = (await c.req.json().catch(() => ({}))) as { code?: string };
  const code = (body.code || '').replace(/\D/g, '').slice(0, 6);
  if (code.length !== 6) {
    return c.json({ error: 'Please enter the 6-digit verification code.' }, 400);
  }

  const tokenRow = await c.env.DB.prepare(
    `SELECT id, email, otp_hash, expires_at, attempts, consumed_at
     FROM email_verification_tokens
     WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(auth.id)
    .first<{
      id: string;
      email: string;
      otp_hash: string;
      expires_at: string;
      attempts: number;
      consumed_at: string | null;
    }>();

  if (!tokenRow || tokenRow.consumed_at) {
    return c.json({ error: 'No active verification code. Please request a new code.' }, 400);
  }
  if (Date.now() > Date.parse(tokenRow.expires_at)) {
    return c.json({ error: 'Verification code expired. Please resend a new code.' }, 400);
  }
  if (tokenRow.attempts >= OTP_MAX_ATTEMPTS) {
    return c.json({ error: 'Maximum verification attempts reached. Request a new code.' }, 429);
  }

  const submittedHash = await hashOtp(tokenRow.email, code);
  if (submittedHash !== tokenRow.otp_hash) {
    await c.env.DB.prepare(
      `UPDATE email_verification_tokens SET attempts = attempts + 1 WHERE id = ?`
    )
      .bind(tokenRow.id)
      .run();
    const left = Math.max(0, OTP_MAX_ATTEMPTS - (tokenRow.attempts + 1));
    return c.json(
      { error: `Incorrect verification code. ${left} attempt(s) remaining.` },
      400
    );
  }

  const nowIso = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE email_verification_tokens SET consumed_at = ? WHERE id = ?`
    ).bind(nowIso, tokenRow.id),
    c.env.DB.prepare(
      `UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?`
    ).bind(nowIso, auth.id),
  ]);

  await writeAuditLog(c.env, {
    actorUserId: auth.id,
    actorEmail: auth.email,
    actorRole: auth.role,
    action: 'auth.email_verified',
    resourceType: 'email_verification',
    resourceId: auth.id,
    summaryEn: `Verified email address ${auth.email} via 6-digit OTP.`,
    summaryBn: `৬-সংখ্যার OTP দিয়ে ${auth.email} ইমেইল যাচাই সম্পন্ন হয়েছে।`,
  });

  return c.json({
    user: {
      id: auth.id,
      name: auth.name,
      email: auth.email,
      plan: auth.plan,
      role: auth.role,
      emailVerified: true,
      accountStatus: auth.accountStatus,
      createdAt: auth.createdAt,
    },
  });
});

app.post('/api/v1/auth/resend-otp', async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;

  const kv = c.env.LINGUAVERSE_KV ?? c.env.RATE_LIMIT_KV;
  if (kv) {
    const readyIso = await kv.get(`otp_cd:${auth.id}`);
    if (readyIso && Date.now() < Date.parse(readyIso)) {
      const waitSec = Math.ceil((Date.parse(readyIso) - Date.now()) / 1000);
      return c.json(
        { error: `Please wait ${waitSec} seconds before requesting another code.` },
        429
      );
    }
  }

  const delivery = await issueOtpAndSend(c.env, {
    id: auth.id,
    name: auth.name,
    email: auth.email,
  });
  return c.json(delivery);
});

// ============================================================================
// Learner Profile, Recordings (R2), & Privacy Endpoints
// ============================================================================
app.patch('/api/v1/learners/:userId/profile', async (c) => {
  const auth = await requireAuth(c, { requireVerified: true });
  if (auth instanceof Response) return auth;
  const userId = c.req.param('userId');
  if (auth.id !== userId && !['admin', 'super_admin'].includes(auth.role)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const patch = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const nowIso = new Date().toISOString();

  if (typeof patch.name === 'string' && patch.name.trim().length >= 2) {
    await c.env.DB.prepare(`UPDATE users SET name = ?, updated_at = ? WHERE id = ?`)
      .bind(patch.name.trim(), nowIso, userId)
      .run();
  }

  const existing = await c.env.DB.prepare(
    `SELECT * FROM learner_profiles WHERE user_id = ? LIMIT 1`
  )
    .bind(userId)
    .first<Record<string, unknown>>();

  const privacy = (patch.privacyConsent || {}) as {
    storeMicRecordings?: boolean;
    logAiEvaluations?: boolean;
  };

  await c.env.DB.prepare(
    `UPDATE learner_profiles SET
      preferred_ui_language = ?,
      explanation_language = ?,
      self_estimated_level = ?,
      primary_goal = ?,
      daily_time_goal_minutes = ?,
      spaced_repetition_preset = ?,
      store_mic_recordings = ?,
      log_ai_evaluations = ?,
      privacy_consent_updated_at = ?,
      onboarding_completed = ?,
      diagnostic_completed = ?,
      updated_at = ?
     WHERE user_id = ?`
  )
    .bind(
      patch.preferredUiLanguage ?? existing?.preferred_ui_language ?? 'en',
      patch.explanationLanguage ?? existing?.explanation_language ?? 'bn',
      patch.selfEstimatedLevel ?? existing?.self_estimated_level ?? 'A2',
      patch.primaryGoal ?? existing?.primary_goal ?? 'daily_speaking',
      patch.dailyTimeGoalMinutes ?? existing?.daily_time_goal_minutes ?? 15,
      patch.spacedRepetitionPreset ?? existing?.spaced_repetition_preset ?? 'standard',
      privacy.storeMicRecordings !== undefined
        ? privacy.storeMicRecordings
          ? 1
          : 0
        : (existing?.store_mic_recordings ?? 1),
      privacy.logAiEvaluations !== undefined
        ? privacy.logAiEvaluations
          ? 1
          : 0
        : (existing?.log_ai_evaluations ?? 1),
      nowIso,
      patch.onboardingCompleted !== undefined
        ? patch.onboardingCompleted
          ? 1
          : 0
        : (existing?.onboarding_completed ?? 0),
      patch.diagnosticCompleted !== undefined
        ? patch.diagnosticCompleted
          ? 1
          : 0
        : (existing?.diagnostic_completed ?? 0),
      nowIso,
      userId
    )
    .run();

  const token = extractToken(c) || '';
  const hydrated = await buildHydratedAuthPayload(c.env, auth, token);
  return c.json({
    user: hydrated.user,
    profile: hydrated.profile,
    lessonMastery: hydrated.lessonMastery,
  });
});

app.get('/api/v1/learners/:userId/recordings', async (c) => {
  const auth = await requireAuth(c, { requireVerified: true });
  if (auth instanceof Response) return auth;
  const userId = c.req.param('userId');
  if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

  const rows = await c.env.DB.prepare(
    `SELECT r2_object_key FROM audio_assets WHERE user_id = ? ORDER BY created_at DESC`
  )
    .bind(userId)
    .all<{ r2_object_key: string }>();
  return c.json(rows.results.map((r) => r.r2_object_key));
});

app.post('/api/v1/learners/:userId/recordings', async (c) => {
  const auth = await requireAuth(c, { requireVerified: true });
  if (auth instanceof Response) return auth;
  const userId = c.req.param('userId');
  if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);
  if (!c.env.AUDIO_BUCKET) {
    return c.json({ error: 'R2 AUDIO_BUCKET binding is not configured.' }, 503);
  }
  if (!(await checkRateLimit(c, 'audio_upload', 20))) {
    return c.json({ error: 'Too many audio uploads. Please try again shortly.' }, 429);
  }

  // Server-side recording consent check from D1 learner_profiles
  const profileRow = await c.env.DB.prepare(
    `SELECT store_mic_recordings FROM learner_profiles WHERE user_id = ? LIMIT 1`
  )
    .bind(userId)
    .first<{ store_mic_recordings: number | null }>();

  const declaredContentType = c.req.header('Content-Type') || '';
  const contentLengthHeader = Number(c.req.header('Content-Length') || '0');
  if (Number.isFinite(contentLengthHeader) && contentLengthHeader > 10 * 1024 * 1024) {
    return c.json(
      { error: 'Audio recording exceeds the 10 MB maximum upload limit.' },
      413
    );
  }

  const arrayBuffer = await c.req.arrayBuffer();
  const validation = validateAudioUploadConstraints({
    contentType: declaredContentType,
    sizeBytes: arrayBuffer.byteLength,
    storeMicRecordingsConsent: Boolean(profileRow?.store_mic_recordings),
  });
  if (!validation.ok) {
    return c.json(
      { error: validation.error },
      validation.status as 400 | 403 | 413 | 415
    );
  }

  const sessionId = c.req.query('sessionId') || null;
  const rawDuration = Number(c.req.query('durationSeconds') || '0');
  const durationSeconds =
    Number.isFinite(rawDuration) && rawDuration >= 0 ? Math.min(3600, rawDuration) : 0;
  const assetId = generateRandomId('aud');
  const objectKey = `users/${userId}/${assetId}.${validation.extension}`;

  await c.env.AUDIO_BUCKET.put(objectKey, arrayBuffer, {
    httpMetadata: { contentType: validation.normalizedMime },
    customMetadata: { userId, assetId },
  });

  const retentionDays = Number(c.env.AUDIO_RETENTION_DAYS || '30');
  const expiresAt = new Date(Date.now() + retentionDays * 86_400_000).toISOString();
  await c.env.DB.prepare(
    `INSERT INTO audio_assets (
      id, user_id, session_id, r2_object_key, mime_type, size_bytes, duration_seconds, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      assetId,
      userId,
      sessionId,
      objectKey,
      validation.normalizedMime,
      arrayBuffer.byteLength,
      durationSeconds,
      expiresAt,
      new Date().toISOString()
    )
    .run();

  return c.json(
    {
      assetId,
      objectKey,
      mimeType: validation.normalizedMime,
      sizeBytes: arrayBuffer.byteLength,
    },
    201
  );
});

app.delete('/api/v1/learners/:userId/recordings', async (c) => {
  const auth = await requireAuth(c, { requireVerified: true });
  if (auth instanceof Response) return auth;
  const userId = c.req.param('userId');
  if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

  const rows = await c.env.DB.prepare(
    `SELECT r2_object_key FROM audio_assets WHERE user_id = ?`
  )
    .bind(userId)
    .all<{ r2_object_key: string }>();
  const keys = rows.results.map((r) => r.r2_object_key);
  if (c.env.AUDIO_BUCKET && keys.length > 0) {
    await c.env.AUDIO_BUCKET.delete(keys);
  }
  await c.env.DB.prepare(`DELETE FROM audio_assets WHERE user_id = ?`).bind(userId).run();
  return c.json({ deletedCount: keys.length });
});

app.delete('/api/v1/learners/:userId', async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const userId = c.req.param('userId');
  if (auth.id !== userId && !['admin', 'super_admin'].includes(auth.role)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const rows = await c.env.DB.prepare(
    `SELECT r2_object_key FROM audio_assets WHERE user_id = ?`
  )
    .bind(userId)
    .all<{ r2_object_key: string }>();
  if (c.env.AUDIO_BUCKET && rows.results.length > 0) {
    await c.env.AUDIO_BUCKET.delete(rows.results.map((r) => r.r2_object_key));
  }
  await c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run();
  clearSessionCookie(c);
  return c.body(null, 204);
});

// ============================================================================
// Server-Side Gemini AI Evaluation Endpoints
// ============================================================================
app.post('/api/v1/landing/analyze', async (c) => {
  if (!(await checkRateLimit(c, 'landing_analyze', 20))) {
    return c.json({ error: 'Rate limit exceeded. Please try again shortly.' }, 429);
  }
  const body = (await c.req.json().catch(() => ({}))) as { sentence?: string };
  const sentence = (body.sentence || '').trim().slice(0, 300);
  if (!sentence) return c.json({ error: 'Please enter a sentence to analyze.' }, 400);

  const result = await callWorkerGeminiJson<Record<string, unknown>>(c.env, {
    endpoint: 'landing_analyze',
    promptVersion: 'landing-sandbox-v5.0',
    systemInstruction:
      'You are an English communication coach for Bangla-speaking learners. Return strict JSON with keys: input, hasDetectedMistake (boolean), mistakeTagEn, mistakeTagBn, correctedSentence, naturalAlternative, explanationEn, explanationBn.',
    userPrompt: `Analyze this English sentence spoken by a Bangla speaker: "${sentence}"`,
  });

  return c.json({ analysis: result.data, correlationId: result.correlationId });
});

const speakingEvaluateHandler = async (c: AppContext) => {
  const auth = await requireAuth(c, { requireVerified: true });
  if (auth instanceof Response) return auth;
  if (!(await checkRateLimit(c, 'speaking_eval', 25))) {
    return c.json({ error: 'Rate limit exceeded.' }, 429);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    userTranscript?: unknown;
    modeId?: unknown;
    pressureLevel?: unknown;
    learnerLevel?: unknown;
    inputChannel?: unknown;
    explanationLanguage?: unknown;
    history?: unknown;
    timedOut?: unknown;
    correctionStyle?: unknown;
    contextSummary?: unknown;
  };
  const transcript = typeof body.userTranscript === 'string' ? body.userTranscript.trim().slice(0, 2000) : '';
  if (!transcript) {
    return c.json({ error: 'Please speak or type a response first.', code: 'EMPTY_TRANSCRIPT' }, 400);
  }

  if (body.modeId !== undefined && !isValidSpeakingModeId(body.modeId)) {
    return c.json({ error: 'Invalid speaking scenario modeId.', code: 'INVALID_MODE' }, 400);
  }

  const modeId = isValidSpeakingModeId(body.modeId) ? body.modeId : 'daily_conversations';
  const pressureLevel = normalizePressureLevel(
    (typeof body.pressureLevel === 'string' ? body.pressureLevel : 'level_2_guided') as SpeakingPressureLevel
  );
  const inputChannel =
    body.inputChannel === 'voice_stt' || body.inputChannel === 'voice_with_manual_edit'
      ? body.inputChannel
      : 'text_fallback';
  const correctionStyle =
    body.correctionStyle === 'detailed' || body.correctionStyle === 'conversation_first'
      ? body.correctionStyle
      : 'gentle';
  const explanationLanguage =
    body.explanationLanguage === 'en' || body.explanationLanguage === 'both'
      ? body.explanationLanguage
      : 'bn';
  const learnerLevel =
    body.learnerLevel === 'Pre-A1' ||
    body.learnerLevel === 'A1' ||
    body.learnerLevel === 'A2' ||
    body.learnerLevel === 'B1' ||
    body.learnerLevel === 'B2' ||
    body.learnerLevel === 'C1'
      ? body.learnerLevel
      : 'A2';

  const safeHistory = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is { role: 'ai' | 'user'; text: string } =>
            Boolean(
              item &&
                typeof item === 'object' &&
                ((item as { role?: unknown }).role === 'ai' ||
                  (item as { role?: unknown }).role === 'user') &&
                typeof (item as { text?: unknown }).text === 'string'
            )
        )
        .slice(-8)
    : [];

  const evalRequest: SpeakingEvaluationRequest = {
    modeId,
    pressureLevel,
    userTranscript: transcript,
    inputChannel,
    learnerLevel,
    explanationLanguage,
    history: safeHistory,
    timedOut: Boolean(body.timedOut),
    correctionStyle,
    contextSummary: typeof body.contextSummary === 'string' ? body.contextSummary.slice(0, 800) : undefined,
  };

  try {
    const result = await callWorkerGeminiJson<Record<string, unknown>>(c.env, {
      endpoint: 'speaking_evaluate',
      promptVersion: c.env.SPEAKING_PROMPT_VERSION || 'speaking-eval-v5.0',
      userId: auth.id,
      systemInstruction: buildSpeakingSystemInstruction(evalRequest),
      userPrompt: buildSpeakingTurnPrompt(evalRequest),
    });

    const evaluation = normalizeSpeakingEvaluation(result.data, transcript, inputChannel);

    return c.json({
      evaluation,
      model: result.model,
      correlationId: result.correlationId,
      telemetry: result.telemetry,
    });
  } catch (err) {
    return c.json(
      {
        error: err instanceof Error ? err.message : 'Unable to evaluate speaking response.',
        code: 'SPEAKING_EVAL_UNAVAILABLE',
      },
      503
    );
  }
};
app.post('/api/v1/speaking/evaluate', speakingEvaluateHandler);
app.post('/api/speaking/evaluate', speakingEvaluateHandler);

const transferEvaluateHandler = async (c: AppContext) => {
  const auth = await requireAuth(c, { requireVerified: true });
  if (auth instanceof Response) return auth;
  if (!(await checkRateLimit(c, 'transfer_eval', 25))) {
    return c.json({ error: 'Rate limit exceeded.' }, 429);
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    userResponse?: string;
    scenarioId?: string;
    pressureLevel?: string;
    targetSkillLabelEn?: string;
  };
  const userResponse = (body.userResponse || '').trim().slice(0, 2500);
  if (!userResponse) return c.json({ error: 'Please provide a response.' }, 400);

  try {
    const result = await callWorkerGeminiJson<Record<string, unknown>>(c.env, {
      endpoint: 'transfer_evaluate',
      promptVersion: c.env.TRANSFER_PROMPT_VERSION || 'transfer-rubric-v5.1',
      userId: auth.id,
      systemInstruction:
        'You are LINGUAVERSE AI Transfer Lab Evaluator. Grade across 4 rubrics (0-100): task_completion, target_grammar_application, contextual_appropriateness, response_relevance. Return strict JSON with overall_score, passed (boolean >= 70), strengths, detected_mistakes, natural_model_response, coach_summary_en, coach_summary_bn.',
      userPrompt: `Scenario: ${body.scenarioId || 'job_interview_followup'} | Pressure: ${body.pressureLevel || 'level_3_open'} | Target skill: ${body.targetSkillLabelEn || 'Real-world English accuracy'}\n<learner_response>\n${userResponse}\n</learner_response>`,
    });

    return c.json({
      evaluation: result.data,
      model: result.model,
      correlationId: result.correlationId,
      telemetry: result.telemetry,
    });
  } catch (err) {
    return c.json(
      {
        error: err instanceof Error ? err.message : 'Unable to evaluate transfer response.',
        code: 'TRANSFER_EVAL_UNAVAILABLE',
      },
      503
    );
  }
};
app.post('/api/v1/transfer/evaluate', transferEvaluateHandler);
app.post('/api/transfer/evaluate', transferEvaluateHandler);

// ============================================================================
// Public Curriculum Catalog
// ============================================================================
app.get('/api/v1/curriculum/courses', async (c) => {
  const coursesRes = await c.env.DB.prepare(
    `SELECT * FROM courses WHERE published_status = 'published' ORDER BY sort_order ASC`
  ).all<Record<string, unknown>>();
  return c.json(coursesRes.results);
});

// ============================================================================
// Strict Server-Side RBAC Admin Control Center Endpoints (/api/v1/admin/*)
// ============================================================================
app.get('/api/v1/admin/overview', async (c) => {
  const admin = await requireAdmin(c);
  if (admin instanceof Response) return admin;

  const [
    usersRow,
    verifiedRow,
    suspendedRow,
    lessonsRow,
    speakingRow,
    transferRow,
    aiCallsRow,
    activeMistakesRow,
    flaggedMistakesRow,
  ] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM users`).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM users WHERE email_verified = 1`).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM users WHERE account_status = 'suspended'`).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM lesson_attempts`).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM speaking_sessions`).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM transfer_attempts`).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM ai_telemetry_events`).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM learner_mistakes WHERE status != 'resolved'`).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM learner_mistakes WHERE false_correction_reported = 1`).first<{ cnt: number }>(),
  ]);

  return c.json({
    totalUsers: Number(usersRow?.cnt || 0),
    verifiedUsers: Number(verifiedRow?.cnt || 0),
    suspendedUsers: Number(suspendedRow?.cnt || 0),
    lessonsCompleted: Number(lessonsRow?.cnt || 0),
    speakingSessions: Number(speakingRow?.cnt || 0),
    transferAttempts: Number(transferRow?.cnt || 0),
    aiCalls: Number(aiCallsRow?.cnt || 0),
    activeMistakes: Number(activeMistakesRow?.cnt || 0),
    flaggedMistakes: Number(flaggedMistakesRow?.cnt || 0),
  });
});

app.get('/api/v1/admin/users', async (c) => {
  const admin = await requireAdmin(c, ['super_admin', 'admin']);
  if (admin instanceof Response) return admin;

  const q = (c.req.query('q') || '').trim().toLowerCase();
  const res = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.plan, u.email_verified, u.account_status, u.created_at,
            (SELECT COUNT(*) FROM lesson_attempts la WHERE la.user_id = u.id) AS lessons_completed,
            (SELECT COUNT(*) FROM speaking_sessions ss WHERE ss.user_id = u.id) AS speaking_sessions,
            (SELECT COUNT(*) FROM learner_mistakes lm WHERE lm.user_id = u.id AND lm.status != 'resolved') AS active_mistakes
     FROM users u
     ORDER BY u.created_at DESC LIMIT 200`
  ).all<Record<string, unknown>>();

  const mapped = res.results
    .map((r) => ({
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      role: String(r.role) as WorkerAdminRole,
      plan: String(r.plan),
      emailVerified: Boolean(r.email_verified),
      accountStatus: String(r.account_status || 'active'),
      lessonsCompleted: Number(r.lessons_completed || 0),
      speakingSessions: Number(r.speaking_sessions || 0),
      activeMistakes: Number(r.active_mistakes || 0),
      createdAt: String(r.created_at),
    }))
    .filter(
      (u) =>
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );

  return c.json(mapped);
});

app.patch('/api/v1/admin/users/:targetUserId', async (c) => {
  const admin = await requireAdmin(c, ['super_admin', 'admin']);
  if (admin instanceof Response) return admin;

  const targetUserId = c.req.param('targetUserId');
  const patch = (await c.req.json().catch(() => ({}))) as {
    role?: WorkerAdminRole;
    accountStatus?: 'active' | 'suspended';
    emailVerified?: boolean;
  };

  const target = await c.env.DB.prepare(
    `SELECT id, name, email, role, plan, email_verified, account_status, created_at
     FROM users WHERE id = ? LIMIT 1`
  )
    .bind(targetUserId)
    .first<Record<string, unknown>>();
  if (!target) return c.json({ error: 'Target user not found.' }, 404);

  const nextRole = patch.role ?? (String(target.role) as WorkerAdminRole);
  const nextStatus = patch.accountStatus ?? String(target.account_status || 'active');
  const nextVerified =
    patch.emailVerified !== undefined
      ? patch.emailVerified
        ? 1
        : 0
      : Number(target.email_verified || 0);

  await c.env.DB.prepare(
    `UPDATE users SET role = ?, account_status = ?, email_verified = ?, updated_at = ? WHERE id = ?`
  )
    .bind(nextRole, nextStatus, nextVerified, new Date().toISOString(), targetUserId)
    .run();

  if (nextStatus === 'suspended') {
    await c.env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`)
      .bind(new Date().toISOString(), targetUserId)
      .run();
  }

  await writeAuditLog(c.env, {
    actorUserId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: patch.accountStatus ? `user.status_${nextStatus}` : 'user.role_updated',
    resourceType: 'user_account',
    resourceId: targetUserId,
    summaryEn: `Updated ${String(target.email)}: role=${nextRole}, status=${nextStatus}.`,
    summaryBn: `${String(target.email)} আপডেট করা হয়েছে: role=${nextRole}, status=${nextStatus}।`,
    metadata: { nextRole, nextStatus },
  });

  return c.json({
    id: String(target.id),
    name: String(target.name),
    email: String(target.email),
    role: nextRole,
    plan: String(target.plan),
    emailVerified: Boolean(nextVerified),
    accountStatus: nextStatus,
    lessonsCompleted: 0,
    speakingSessions: 0,
    activeMistakes: 0,
    createdAt: String(target.created_at),
  });
});

app.delete('/api/v1/admin/users/:targetUserId', async (c) => {
  const admin = await requireAdmin(c, ['super_admin', 'admin']);
  if (admin instanceof Response) return admin;
  const targetUserId = c.req.param('targetUserId');
  if (targetUserId === admin.id) {
    return c.json({ error: 'You cannot delete your own administrator account.' }, 400);
  }
  const target = await c.env.DB.prepare(`SELECT id, email FROM users WHERE id = ? LIMIT 1`)
    .bind(targetUserId)
    .first<{ id: string; email: string }>();
  if (!target) return c.json({ error: 'Target user not found.' }, 404);
  await c.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(targetUserId).run();
  await c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(targetUserId).run();
  await writeAuditLog(c.env, {
    actorUserId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: 'user.deleted',
    resourceType: 'user_account',
    resourceId: targetUserId,
    summaryEn: `Deleted user account ${target.email}.`,
    summaryBn: `ব্যবহারকারীর অ্যাকাউন্ট মুছে ফেলা হয়েছে (${target.email})।`,
  });
  return c.json({ deleted: true, id: targetUserId });
});

app.post('/api/v1/admin/curriculum/courses', async (c) => {
  const admin = await requireAdmin(c, ['super_admin', 'admin', 'content_manager']);
  if (admin instanceof Response) return admin;

  const course = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(course.id || generateRandomId('course'));
  const nowIso = new Date().toISOString();
  const version = Number(course.version || 1);

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO courses (
      id, sort_order, cefr_range, title_en, title_bn, subtitle_en, subtitle_bn,
      target_audience_en, target_audience_bn, version, published_status, is_custom, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  )
    .bind(
      id,
      Number(course.order || 1),
      String(course.cefrRange || 'A2 – B1'),
      String(course.titleEn || ''),
      String(course.titleBn || ''),
      String(course.subtitleEn || ''),
      String(course.subtitleBn || ''),
      String(course.targetAudienceEn || ''),
      String(course.targetAudienceBn || ''),
      version,
      String(course.publishedStatus || 'published'),
      nowIso
    )
    .run();

  await writeAuditLog(c.env, {
    actorUserId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: 'curriculum.course_published',
    resourceType: 'curriculum',
    resourceId: id,
    summaryEn: `Published course "${String(course.titleEn || id)}" (v${version}).`,
    summaryBn: `"${String(course.titleBn || id)}" কোর্স প্রকাশ করা হয়েছে (v${version})।`,
  });

  return c.json({ id, catalogVersion: version });
});

app.post('/api/v1/admin/curriculum/lessons', async (c) => {
  const admin = await requireAdmin(c, ['super_admin', 'admin', 'content_manager']);
  if (admin instanceof Response) return admin;

  const lesson = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(lesson.id || generateRandomId('les'));
  const nowIso = new Date().toISOString();
  const version = Number(lesson.version || 1);

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO lessons (
      id, course_id, module_id, sort_order, cefr_band, estimated_minutes,
      title_en, title_bn, summary_en, summary_bn, payload_json, version,
      published_status, is_custom, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  )
    .bind(
      id,
      String(lesson.courseId || ''),
      String(lesson.moduleId || ''),
      Number(lesson.order || 1),
      String(lesson.cefrBand || 'A2'),
      Number(lesson.estimatedMinutes || 7),
      String(lesson.titleEn || ''),
      String(lesson.titleBn || ''),
      String(lesson.summaryEn || ''),
      String(lesson.summaryBn || ''),
      JSON.stringify(lesson),
      version,
      String(lesson.publishedStatus || 'published'),
      nowIso
    )
    .run();

  await writeAuditLog(c.env, {
    actorUserId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: 'curriculum.lesson_published',
    resourceType: 'curriculum',
    resourceId: id,
    summaryEn: `Published 7-stage lesson "${String(lesson.titleEn || id)}" (v${version}).`,
    summaryBn: `"${String(lesson.titleBn || id)}" লেসন প্রকাশ করা হয়েছে (v${version})।`,
  });

  return c.json({ id, catalogVersion: version });
});

app.get('/api/v1/admin/ai-telemetry', async (c) => {
  const admin = await requireAdmin(c, ['super_admin', 'admin', 'ai_ops']);
  if (admin instanceof Response) return admin;

  const rows = await c.env.DB.prepare(
    `SELECT * FROM ai_telemetry_events ORDER BY created_at DESC LIMIT 200`
  ).all<Record<string, unknown>>();

  return c.json(
    rows.results.map((r) => ({
      id: String(r.id),
      correlationId: String(r.correlation_id),
      userId: r.user_id ? String(r.user_id) : undefined,
      endpoint: String(r.endpoint),
      model: String(r.model),
      promptVersion: String(r.prompt_version),
      status: String(r.status),
      latencyMs: Number(r.latency_ms || 0),
      estimatedInputTokens: Number(r.estimated_input_tokens || 0),
      estimatedOutputTokens: Number(r.estimated_output_tokens || 0),
      estimatedCostUsd: Number(r.estimated_cost_usd || 0),
      errorCode: r.error_code ? String(r.error_code) : undefined,
      errorMessage: r.error_message ? String(r.error_message) : undefined,
      timestamp: String(r.created_at),
    }))
  );
});

app.get('/api/v1/admin/flagged-mistakes', async (c) => {
  const admin = await requireAdmin(c);
  if (admin instanceof Response) return admin;

  const rows = await c.env.DB.prepare(
    `SELECT * FROM learner_mistakes
     WHERE false_correction_reported = 1 OR admin_review_status IS NOT NULL
     ORDER BY COALESCE(false_correction_reported_at, last_seen_at) DESC LIMIT 200`
  ).all<Record<string, unknown>>();

  return c.json(rows.results);
});

app.post('/api/v1/admin/flagged-mistakes/:mistakeId/review', async (c) => {
  const admin = await requireAdmin(c);
  if (admin instanceof Response) return admin;

  const mistakeId = c.req.param('mistakeId');
  const body = (await c.req.json().catch(() => ({}))) as {
    decision?: 'upheld_false_positive' | 'confirmed_accurate';
    note?: string;
  };
  const decision =
    body.decision === 'upheld_false_positive' ? 'upheld_false_positive' : 'confirmed_accurate';
  const nowIso = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE learner_mistakes
     SET false_correction_reported = ?, admin_review_status = ?, admin_review_note = ?,
         admin_reviewed_at = ?, admin_reviewed_by = ?
     WHERE id = ?`
  )
    .bind(
      decision === 'upheld_false_positive' ? 1 : 0,
      decision,
      body.note?.trim() || null,
      nowIso,
      admin.email,
      mistakeId
    )
    .run();

  await writeAuditLog(c.env, {
    actorUserId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: `mistakes.${decision}`,
    resourceType: 'mistake_review',
    resourceId: mistakeId,
    summaryEn: `Reviewed flagged mistake ${mistakeId} as ${decision}.`,
    summaryBn: `রিপোর্টকৃত ভুল ${mistakeId} যাচাই করা হয়েছে (${decision})।`,
  });

  return c.json({ ok: true, mistakeId, decision });
});

app.get('/api/v1/admin/audit-logs', async (c) => {
  const admin = await requireAdmin(c);
  if (admin instanceof Response) return admin;

  const rows = await c.env.DB.prepare(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300`
  ).all<Record<string, unknown>>();

  return c.json(
    rows.results.map((r) => ({
      id: String(r.id),
      correlationId: String(r.correlation_id),
      actorUserId: String(r.actor_user_id),
      actorEmail: String(r.actor_email),
      actorRole: String(r.actor_role),
      action: String(r.action),
      resourceType: String(r.resource_type),
      resourceId: String(r.resource_id),
      summaryEn: String(r.summary_en),
      summaryBn: String(r.summary_bn),
      metadata: r.metadata_json ? JSON.parse(String(r.metadata_json)) : undefined,
      timestamp: String(r.created_at),
    }))
  );
});

// ============================================================================
// Public & Admin CMS, Analytics, and Honest Subscription Endpoints (D1 + R2)
// ============================================================================
app.get('/api/v1/cms/public', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT payload_json FROM cms_documents WHERE doc_key = 'published' LIMIT 1`
  ).first<{ payload_json: string }>();

  if (row?.payload_json) {
    return c.json({ config: JSON.parse(row.payload_json) });
  }
  return c.json({ config: null }, 200);
});

app.post('/api/v1/analytics/event', async (c) => {
  if (!(await checkRateLimit(c, 'analytics', 60))) {
    return c.json({ error: 'Rate limit exceeded.' }, 429);
  }
  const body = (await c.req.json().catch(() => ({}))) as {
    eventType?: string;
    path?: string;
    metadata?: Record<string, unknown>;
  };
  if (!body.eventType) return c.json({ error: 'eventType is required.' }, 400);
  await c.env.DB.prepare(
    `INSERT INTO cms_analytics_events (id, event_type, path, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      generateRandomId('evt'),
      body.eventType.slice(0, 60),
      (body.path || '/').slice(0, 160),
      body.metadata ? JSON.stringify(body.metadata) : null,
      new Date().toISOString()
    )
    .run();
  return c.json({ ok: true }, 202);
});

app.post('/api/v1/subscriptions/intent', async (c) => {
  if (!(await checkRateLimit(c, 'sub_intent', 20))) {
    return c.json({ error: 'Too many checkout requests. Please try again shortly.' }, 429);
  }
  const body = (await c.req.json().catch(() => ({}))) as {
    planSlug?: string;
    billingInterval?: string;
  };
  return c.json({
    status: 'payment_provider_not_configured',
    planSlug: body.planSlug || 'premium',
    billingInterval: body.billingInterval === 'yearly' ? 'yearly' : 'monthly',
    message:
      'Live payment checkout is not configured yet in this Cloudflare environment. No payment was charged.',
  });
});

app.get('/api/v1/admin/cms', async (c) => {
  const admin = await requireAdmin(c);
  if (admin instanceof Response) return admin;

  const docs = await c.env.DB.prepare(
    `SELECT doc_key, payload_json FROM cms_documents`
  ).all<{ doc_key: string; payload_json: string }>();
  const publishedRow = docs.results.find((d) => d.doc_key === 'published');
  const draftRow = docs.results.find((d) => d.doc_key === 'draft');

  const eventsRes = await c.env.DB.prepare(
    `SELECT id, event_type, path, metadata_json, created_at
     FROM cms_analytics_events ORDER BY created_at DESC LIMIT 200`
  ).all<Record<string, unknown>>();

  return c.json({
    published: publishedRow ? JSON.parse(publishedRow.payload_json) : null,
    draft: draftRow
      ? JSON.parse(draftRow.payload_json)
      : publishedRow
        ? JSON.parse(publishedRow.payload_json)
        : null,
    analytics: {
      totalPageViews: eventsRes.results.filter((e) => e.event_type === 'page_view').length,
      heroCtaClicks: eventsRes.results.filter((e) => e.event_type === 'hero_cta_click').length,
      watchDemoClicks: eventsRes.results.filter((e) => e.event_type === 'watch_demo_click').length,
      pricingClicks: eventsRes.results.filter((e) => e.event_type === 'pricing_click').length,
      liveDemoSubmissions: eventsRes.results.filter((e) => e.event_type === 'live_demo_analyze').length,
      upgradeModalOpens: eventsRes.results.filter((e) => e.event_type === 'upgrade_modal_open').length,
      recentEvents: eventsRes.results.slice(0, 25).map((e) => ({
        id: String(e.id),
        eventType: String(e.event_type),
        path: String(e.path),
        createdAt: String(e.created_at),
      })),
    },
  });
});

app.put('/api/v1/admin/cms/draft', async (c) => {
  const admin = await requireAdmin(c, ['super_admin', 'admin', 'content_manager']);
  if (admin instanceof Response) return admin;

  const body = (await c.req.json().catch(() => ({}))) as {
    patch?: Record<string, unknown>;
    summary?: string;
  };
  if (!body.patch) return c.json({ error: 'CMS patch is required.' }, 400);

  const nowIso = new Date().toISOString();
  const existing = await c.env.DB.prepare(
    `SELECT version, payload_json FROM cms_documents WHERE doc_key = 'draft' LIMIT 1`
  ).first<{ version: number; payload_json: string }>();

  const merged = {
    ...(existing?.payload_json ? JSON.parse(existing.payload_json) : {}),
    ...body.patch,
    updatedAt: nowIso,
    updatedBy: admin.email,
  };

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO cms_documents (doc_key, version, payload_json, updated_by, updated_at)
     VALUES ('draft', ?, ?, ?, ?)`
  )
    .bind(existing?.version || 1, JSON.stringify(merged), admin.email, nowIso)
    .run();

  await writeAuditLog(c.env, {
    actorUserId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: 'cms.draft_saved',
    resourceType: 'cms',
    resourceId: 'draft',
    summaryEn: body.summary || 'Saved CMS draft configuration.',
    summaryBn: 'CMS ড্রাফট সংরক্ষণ করা হয়েছে।',
  });

  return c.json({ draft: merged });
});

app.post('/api/v1/admin/cms/publish', async (c) => {
  const admin = await requireAdmin(c, ['super_admin', 'admin', 'content_manager']);
  if (admin instanceof Response) return admin;

  const body = (await c.req.json().catch(() => ({}))) as {
    patch?: Record<string, unknown>;
  };
  const nowIso = new Date().toISOString();

  const currentPub = await c.env.DB.prepare(
    `SELECT version, payload_json FROM cms_documents WHERE doc_key = 'published' LIMIT 1`
  ).first<{ version: number; payload_json: string }>();
  const currentDraft = await c.env.DB.prepare(
    `SELECT payload_json FROM cms_documents WHERE doc_key = 'draft' LIMIT 1`
  ).first<{ payload_json: string }>();

  const nextVersion = Number(currentPub?.version || 0) + 1;
  const basePayload = currentDraft?.payload_json
    ? JSON.parse(currentDraft.payload_json)
    : currentPub?.payload_json
      ? JSON.parse(currentPub.payload_json)
      : {};

  const publishedPayload = {
    ...basePayload,
    ...(body.patch || {}),
    version: nextVersion,
    publishedAt: nowIso,
    updatedAt: nowIso,
    updatedBy: admin.email,
  };

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT OR REPLACE INTO cms_documents (doc_key, version, payload_json, updated_by, updated_at)
       VALUES ('published', ?, ?, ?, ?)`
    ).bind(nextVersion, JSON.stringify(publishedPayload), admin.email, nowIso),
    c.env.DB.prepare(
      `INSERT OR REPLACE INTO cms_documents (doc_key, version, payload_json, updated_by, updated_at)
       VALUES ('draft', ?, ?, ?, ?)`
    ).bind(nextVersion, JSON.stringify(publishedPayload), admin.email, nowIso),
  ]);

  await writeAuditLog(c.env, {
    actorUserId: admin.id,
    actorEmail: admin.email,
    actorRole: admin.role,
    action: 'cms.published',
    resourceType: 'cms',
    resourceId: `v${nextVersion}`,
    summaryEn: `Published CMS configuration v${nextVersion}.`,
    summaryBn: `CMS কনফিগারেশন v${nextVersion} লাইভ প্রকাশ করা হয়েছে।`,
  });

  return c.json({ published: publishedPayload, draft: publishedPayload });
});

const routeDeps: WorkerRouteDeps = {
  requireAuth,
  requireAdmin,
  checkRateLimit,
  writeAuditLog,
  clearSessionCookie,
};

registerLearnerPersistenceRoutes(app, routeDeps);
registerParts06To12Routes(app, routeDeps);
registerP3CommunityVocabBillingRoutes(app, routeDeps);
registerWorkerPrd61Routes(app, routeDeps);

export default app;
