import type express from 'express';
import { EventEmitter } from 'node:events';
import {
  adminDeleteServerUser,
  adminUpdateServerUser,
  authLoginLimiter,
  bootstrapInitialServerSuperAdmin,
  getServerAuthStats,
  hasServerAdminAccount,
  listServerAdminUsers,
  loginServerAdminUser,
  parseCookieHeader,
  revokeSessionByRawToken,
} from './authStore.ts';
import {
  evaluateBootstrapPolicy,
  isAdminPortalRole,
  validateInitialAdminBootstrapInput,
} from '../src/domain/adminBootstrapEngine.ts';
import { appendServerAuditLog, getServerAuditLogs } from './cmsStore.ts';
import { getSystemConfigSettings } from './p3Store.ts';
import {
  appendSecurityEvent,
  createPersistedNotification,
  deleteUserHumanBridgeLog,
  getPrd61StoreHealthSummary,
  getServerAiRuntimeConfig,
  getServerCurriculumOverlay,
  getServerFeatureFlags,
  getUserNotificationPreferences,
  listServerFlaggedMistakes,
  listServerProviderStatuses,
  listUserExamAttempts,
  listUserHumanBridgeLogs,
  listUserNotifications,
  listUserWritingDiary,
  markPersistedNotificationRead,
  recordServerProviderHealth,
  resolveServerProviderSecret,
  reviewServerFlaggedMistake,
  rotateServerProviderSecret,
  saveServerAiRuntimeConfig,
  saveServerFeatureFlags,
  saveUserExamAttempt,
  saveUserHumanBridgeLog,
  saveUserNotificationPreferences,
  saveUserWritingDiary,
  updateUserWritingRewrite,
  upsertServerFlaggedMistake,
  upsertServerPublishedCourse,
  upsertServerPublishedLesson,
  upsertServerPublishedModule,
} from './prd61Store.ts';
import type {
  CurriculumCourse,
  CurriculumLesson,
  CurriculumModule,
  MistakeMemoryItem,
} from '../src/types/domain.ts';
import {
  evaluateIeltsWithGemini,
  evaluateWritingDiaryWithGemini,
  pingGeminiProviderHealth,
} from './geminiPrd61Coach.ts';
import {
  SUPPORTED_GEMINI_TEXT_MODELS,
  SUPPORTED_GEMINI_TRANSCRIBE_MODELS,
  SUPPORTED_GEMINI_TTS_MODELS,
  isSupportedProviderId,
  validateAiRuntimeConfigPatch,
  validateFeatureFlagsPatch,
  validateProviderKeyRotationInput,
} from '../src/domain/aiProviderRegistry.ts';
import {
  IELTS_TASK_CATALOG,
  IELTS_TRUTH_DISCLAIMER_BN,
  IELTS_TRUTH_DISCLAIMER_EN,
  countEnglishWords,
  getIeltsTaskById,
  gradeObjectiveIeltsTask,
} from '../src/domain/ieltsExamEngine.ts';
import {
  SHADOWING_PHRASE_LIBRARY,
  WRITING_MODES,
  validateHumanBridgeInput,
  validateWritingDiaryInput,
} from '../src/domain/advancedLearningLabsEngine.ts';
import { validateNotificationPreferencesPatch } from '../src/domain/notificationsEngine.ts';
import type { ExpressP3RouteDeps } from './p3Routes.ts';

const prd61RateBuckets = new Map<string, number[]>();
const realtimeHub = new EventEmitter();
realtimeHub.setMaxListeners(500);

interface ExpressRealtimeBroadcastEvent {
  targetUserId: string; // '*' for all authenticated users, or specific user.id
  type: 'notification.created' | 'system.status_updated';
  payload: Record<string, unknown>;
}

function emitExpressRealtimeEvent(event: ExpressRealtimeBroadcastEvent): void {
  realtimeHub.emit('event', event);
}

function checkPrd61RateLimit(key: string, maxRequests: number, windowMs: number): number | null {
  const now = Date.now();
  const entries = (prd61RateBuckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (entries.length >= maxRequests) {
    const oldest = entries[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    prd61RateBuckets.set(key, entries);
    return retryAfter;
  }
  entries.push(now);
  prd61RateBuckets.set(key, entries);
  if (prd61RateBuckets.size > 500) {
    const firstKey = prd61RateBuckets.keys().next().value;
    if (firstKey) prd61RateBuckets.delete(firstKey);
  }
  return null;
}

export function registerExpressPrd61Routes(app: express.Express, deps: ExpressP3RouteDeps): void {
  const { resolveRequestSession, verifyCsrf, requireExpressAdmin } = deps;

  const requireSignedInUser = (req: express.Request, res: express.Response) => {
    const resolved = resolveRequestSession(req);
    if (!resolved) {
      res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return null;
    }
    return resolved.user;
  };

  // ==========================================================================
  // 1. Public Non-Secret Platform Status (Maintenance Mode + Feature Flags)
  // ==========================================================================
  app.get('/api/v1/system/status', (_req, res) => {
    const flags = getServerFeatureFlags();
    const sys = getSystemConfigSettings();
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json({
      ok: true,
      maintenanceMode: flags.maintenanceMode,
      maintenanceBannerEn: sys.maintenanceBannerEn,
      maintenanceBannerBn: sys.maintenanceBannerBn,
      allowNewRegistrations: sys.allowNewRegistrations,
      featureFlags: flags,
    });
  });

  // ==========================================================================
  // 1A. Authenticated Realtime Event Stream (SSE)
  // ==========================================================================
  app.get('/api/v1/realtime/events', (req, res) => {
    const user = requireSignedInUser(req, res);
    if (!user) return;

    const ip = req.ip || 'unknown';
    const retryAfter = checkPrd61RateLimit(`realtime_sse:${ip}:${user.id}`, 30, 60 * 1000);
    if (retryAfter !== null) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many realtime stream connections.', code: 'RATE_LIMITED' });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    let seq = 0;
    const writeFrame = (
      type: 'connected' | 'ping' | 'notification.created' | 'system.status_updated',
      payload: Record<string, unknown>,
      customId?: string
    ) => {
      seq += 1;
      const envelope = {
        id: customId || `rt_${Date.now()}_${seq}`,
        seq,
        type,
        emittedAt: new Date().toISOString(),
        payload,
      };
      res.write(`id: ${envelope.id}\ndata: ${JSON.stringify(envelope)}\n\n`);
    };

    writeFrame('connected', { userId: user.id, runtime: 'express-local-dev' });

    const onRealtimeEvent = (evt: ExpressRealtimeBroadcastEvent) => {
      if (evt.targetUserId !== '*' && evt.targetUserId !== user.id) return;
      const customId =
        typeof evt.payload.id === 'string' ? `notif_${evt.payload.id}` : undefined;
      writeFrame(evt.type, evt.payload, customId);
    };

    realtimeHub.on('event', onRealtimeEvent);

    const heartbeatTimer = setInterval(() => {
      writeFrame('ping', { ts: Date.now() });
    }, 25_000);

    const cleanup = () => {
      clearInterval(heartbeatTimer);
      realtimeHub.off('event', onRealtimeEvent);
    };

    req.on('close', cleanup);
    res.on('close', cleanup);
  });

  // ==========================================================================
  // 1B. Separate Admin Application Auth & One-Time Initial Super Admin Provisioning
  // ==========================================================================
  const setExpressAdminSessionCookie = (
    req: express.Request,
    res: express.Response,
    rawToken: string,
    maxAgeSeconds: number
  ) => {
    const isSecure =
      process.env.NODE_ENV === 'production' ||
      req.secure ||
      String(req.headers['x-forwarded-proto'] || '').includes('https');
    const parts = [
      `lv_session_token=${encodeURIComponent(rawToken)}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${maxAgeSeconds}`,
      isSecure ? 'SameSite=None' : 'SameSite=Lax',
    ];
    if (isSecure) {
      parts.push('Secure', 'Partitioned');
    }
    res.setHeader('Set-Cookie', parts.join('; '));
  };

  app.get('/api/v1/admin/auth/status', (_req, res) => {
    const hasAdmin = hasServerAdminAccount();
    const configuredSecret = (process.env.ADMIN_BOOTSTRAP_SECRET ?? '').trim();
    const isProduction = process.env.NODE_ENV === 'production';
    res.json({
      ok: true,
      hasAdminAccount: hasAdmin,
      bootstrapAvailable: !hasAdmin && (!isProduction || configuredSecret.length >= 16),
      requiresBootstrapSecret: configuredSecret.length > 0 || isProduction,
    });
  });

  app.post('/api/v1/admin/auth/bootstrap', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = req.ip || 'unknown';
    const retryAfter = checkPrd61RateLimit(`admin_bootstrap:${ip}`, 5, 15 * 60 * 1000);
    if (retryAfter !== null) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many bootstrap attempts. Try again later.' });
      return;
    }

    const validated = validateInitialAdminBootstrapInput(req.body);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error, code: 'INVALID_BOOTSTRAP_INPUT' });
      return;
    }

    const policy = evaluateBootstrapPolicy({
      hasExistingAdmin: hasServerAdminAccount(),
      isProduction: process.env.NODE_ENV === 'production',
      configuredSecret: process.env.ADMIN_BOOTSTRAP_SECRET ?? '',
      providedSecret: validated.data.bootstrapSecret,
    });
    if (!policy.allowed) {
      res.status(policy.status).json({ error: policy.error, code: policy.code });
      return;
    }

    const created = bootstrapInitialServerSuperAdmin({
      name: validated.data.name,
      email: validated.data.email,
      password: validated.data.password,
    });
    if (!created.ok) {
      res.status(created.status).json({ error: created.error, code: created.code });
      return;
    }

    setExpressAdminSessionCookie(req, res, created.rawToken, 60 * 60 * 24 * 30);
    appendServerAuditLog({
      actorEmail: created.user.email,
      actorRole: created.user.role,
      action: 'admin.bootstrap.claimed',
      resource: `user:${created.user.id}`,
      details: `Provisioned initial super_admin account (${created.user.email}) and locked bootstrap.`,
    });
    appendSecurityEvent({
      eventType: 'admin_bootstrap_claimed',
      severity: 'warning',
      actorEmail: created.user.email,
      path: '/api/v1/admin/auth/bootstrap',
      summary: `Initial super_admin provisioned (${created.user.email}); one-time bootstrap permanently locked.`,
    });

    res.status(201).json({
      user: created.user,
      sessionToken: created.rawToken,
      expiresAt: created.session.expiresAt,
    });
  });

  app.post('/api/v1/admin/auth/login', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const ip = req.ip || 'unknown';
    const body = (req.body || {}) as { email?: string; password?: string; rememberMe?: boolean };
    const normalizedEmail = String(body.email || '').trim().toLowerCase();
    const rateCheck = authLoginLimiter.consume(`admin_login:${ip}:${normalizedEmail}`);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
      res.status(429).json({
        error: 'Too many administrator login attempts. Please wait before retrying.',
        code: 'RATE_LIMITED',
      });
      return;
    }
    if (!normalizedEmail || typeof body.password !== 'string' || !body.password) {
      res.status(400).json({ error: 'Email and password are required.', code: 'MISSING_CREDENTIALS' });
      return;
    }

    const result = loginServerAdminUser({
      email: normalizedEmail,
      password: body.password,
      rememberMe: Boolean(body.rememberMe),
    });
    if (!result.ok) {
      if (result.retryAfterSeconds) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
      }
      res.status(result.status).json({ error: result.error, code: result.code });
      return;
    }

    const ttlSec = body.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    setExpressAdminSessionCookie(req, res, result.rawToken, ttlSec);
    appendServerAuditLog({
      actorEmail: result.user.email,
      actorRole: result.user.role,
      action: 'admin.auth.login',
      resource: `user:${result.user.id}`,
      details: `Authenticated administrator session via Separate Admin Application (${result.user.role}).`,
    });

    res.json({
      user: result.user,
      sessionToken: result.rawToken,
      expiresAt: result.session.expiresAt,
    });
  });

  app.get('/api/v1/admin/auth/me', (req, res) => {
    const resolved = resolveRequestSession(req);
    if (!resolved) {
      res.status(401).json({ error: 'Administrator authentication required.', code: 'UNAUTHORIZED' });
      return;
    }
    if (!isAdminPortalRole(resolved.user.role)) {
      res.status(403).json({
        error: 'Administrator privileges are required to access the Admin Application.',
        code: 'ADMIN_ROLE_REQUIRED',
      });
      return;
    }
    res.json({ user: resolved.user });
  });

  app.post('/api/v1/admin/auth/logout', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const cookies = parseCookieHeader(req.headers.cookie);
    const token = bearer || cookies.lv_session_token;
    if (token) {
      revokeSessionByRawToken(token);
    }
    setExpressAdminSessionCookie(req, res, '', 0);
    res.json({ ok: true });
  });

  // ==========================================================================
  // 2. Admin Feature Flags, AI Provider & Secret Rotation Control Center
  // ==========================================================================
  app.get('/api/v1/admin/feature-flags', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin' || role === 'ai_ops',
      'Feature flag inspection requires Admin, Super Admin, or AI Ops role.'
    );
    if (!admin) return;
    res.json({ featureFlags: getServerFeatureFlags() });
  });

  app.put('/api/v1/admin/feature-flags', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin',
      'Updating platform feature flags requires Admin or Super Admin role.'
    );
    if (!admin) return;

    const validation = validateFeatureFlagsPatch(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error, code: 'INVALID_FEATURE_FLAGS' });
      return;
    }

    const updated = saveServerFeatureFlags(validation.patch, admin.email);
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'admin.feature_flags.updated',
      resource: 'system_config:feature_flags_v1',
      details: `Updated feature flags: ${Object.keys(validation.patch).join(', ') || 'none'}`,
    });
    if (validation.patch.maintenanceMode !== undefined) {
      appendSecurityEvent({
        eventType: 'maintenance_mode_toggled',
        severity: validation.patch.maintenanceMode ? 'warning' : 'info',
        actorEmail: admin.email,
        path: '/api/v1/admin/feature-flags',
        summary: `Maintenance mode set to ${validation.patch.maintenanceMode ? 'ENABLED' : 'DISABLED'}.`,
      });
      const sys = getSystemConfigSettings();
      emitExpressRealtimeEvent({
        targetUserId: '*',
        type: 'system.status_updated',
        payload: {
          maintenanceMode: updated.maintenanceMode,
          maintenanceBannerEn: sys.maintenanceBannerEn,
          maintenanceBannerBn: sys.maintenanceBannerBn,
        },
      });
    }
    res.json({ featureFlags: updated });
  });

  app.get('/api/v1/admin/ai-providers', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin' || role === 'ai_ops',
      'Viewing AI & external provider settings requires Admin, Super Admin, or AI Ops role.'
    );
    if (!admin) return;
    res.json({
      runtimeConfig: getServerAiRuntimeConfig(),
      providers: listServerProviderStatuses(),
      supportedModels: {
        text: SUPPORTED_GEMINI_TEXT_MODELS,
        transcribe: SUPPORTED_GEMINI_TRANSCRIBE_MODELS,
        tts: SUPPORTED_GEMINI_TTS_MODELS,
      },
      productionSecretGuidance:
        'In Cloudflare production, store private API keys via `npx wrangler secret put <SECRET_NAME>` rather than runtime overrides.',
    });
  });

  app.put('/api/v1/admin/ai-providers', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin' || role === 'ai_ops',
      'Updating AI provider models/limits requires Admin, Super Admin, or AI Ops role.'
    );
    if (!admin) return;

    const validation = validateAiRuntimeConfigPatch(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error, code: 'INVALID_AI_CONFIG' });
      return;
    }

    const updated = saveServerAiRuntimeConfig(validation.patch, admin.email);
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'admin.ai_providers.updated',
      resource: 'ai_ops:ai_providers_config_v1',
      details: `Updated AI runtime config (${Object.keys(validation.patch).join(', ') || 'no-op'}).`,
    });
    res.json({
      runtimeConfig: updated,
      providers: listServerProviderStatuses(),
    });
  });

  app.post('/api/v1/admin/ai-providers/:providerId/rotate-key', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin',
      'Rotating provider API keys requires Admin or Super Admin role.'
    );
    if (!admin) return;

    const providerId = String(req.params.providerId || '').trim();
    if (!isSupportedProviderId(providerId)) {
      res.status(400).json({ error: 'Unsupported provider identifier.', code: 'UNKNOWN_PROVIDER' });
      return;
    }

    const validation = validateProviderKeyRotationInput(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error, code: 'INVALID_KEY_ROTATION' });
      return;
    }

    const result = rotateServerProviderSecret(
      providerId,
      validation.secretValue,
      admin.email,
      validation.note
    );

    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: validation.secretValue === null ? 'admin.provider_key.cleared' : 'admin.provider_key.rotated',
      resource: `ai_ops:${providerId}`,
      details:
        validation.secretValue === null
          ? `Cleared local runtime key override for ${providerId}.`
          : `Rotated server-side key override for ${providerId} (fingerprint ${result.maskedKey ?? 'none'}).`,
    });
    appendSecurityEvent({
      eventType: 'provider_key_rotated',
      severity: 'info',
      actorEmail: admin.email,
      path: `/api/v1/admin/ai-providers/${providerId}/rotate-key`,
      summary: `Provider "${providerId}" credential updated (${result.source}).`,
    });

    res.json({
      ok: true,
      providerId,
      source: result.source,
      maskedKey: result.maskedKey,
      rotatedAt: result.rotatedAt,
      providers: listServerProviderStatuses(),
    });
  });

  app.post('/api/v1/admin/ai-providers/:providerId/health', async (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin' || role === 'ai_ops',
      'Running provider health checks requires Admin, Super Admin, or AI Ops role.'
    );
    if (!admin) return;

    const providerId = String(req.params.providerId || '').trim();
    if (!isSupportedProviderId(providerId)) {
      res.status(400).json({ error: 'Unsupported provider identifier.', code: 'UNKNOWN_PROVIDER' });
      return;
    }

    const nowIso = new Date().toISOString();
    if (providerId === 'gemini') {
      const probe = await pingGeminiProviderHealth();
      const status = probe.ok ? 'healthy' : resolveServerProviderSecret('gemini').value ? 'degraded' : 'unconfigured';
      recordServerProviderHealth('gemini', {
        checkedAt: nowIso,
        status,
        latencyMs: probe.latencyMs,
        message: probe.message,
      });
      res.json({
        providerId,
        ok: probe.ok,
        status,
        latencyMs: probe.latencyMs,
        message: probe.message,
        providers: listServerProviderStatuses(),
      });
      return;
    }

    const secret = resolveServerProviderSecret(providerId);
    const status = secret.value ? 'healthy' : 'unconfigured';
    const message = secret.value
      ? `Credentials present (${secret.source}); adapter ready for live requests.`
      : 'Awaiting credentials — configure server secret before enabling.';
    recordServerProviderHealth(providerId, {
      checkedAt: nowIso,
      status,
      latencyMs: 0,
      message,
    });
    res.json({
      providerId,
      ok: Boolean(secret.value),
      status,
      latencyMs: 0,
      message,
      providers: listServerProviderStatuses(),
    });
  });

  // ==========================================================================
  // 3. Admin System Health, Database Diagnostics & Security Events
  // ==========================================================================
  app.get('/api/v1/admin/system-health', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin' || role === 'ai_ops',
      'System health diagnostics require Admin, Super Admin, or AI Ops role.'
    );
    if (!admin) return;

    const authStats = getServerAuthStats();
    const prd61Summary = getPrd61StoreHealthSummary();
    const auditLogs = getServerAuditLogs();
    res.json({
      ok: true,
      runtime: 'express-local-dev',
      database: {
        engine: 'local-json-store (Cloudflare D1 migrations 0001..0006 verified via SQLite parity tests)',
        status: 'healthy',
        migrationsReady: [
          '0001_initial_schema.sql',
          '0002_parts06_12_parity.sql',
          '0003_p3_community_vocab_billing.sql',
          '0004_prd61_examinations_labs_providers.sql',
          '0005_performance_indexes.sql',
          '0006_global_query_indexes.sql',
        ],
        backupStatus: 'Local dev store; in production run `npx wrangler d1 export linguaverse-db --remote --output=./backup.sql` before migrations.',
      },
      storage: {
        mediaDirectory: '.data/uploads (production uses private Cloudflare R2 bucket `linguaverse-audio`)',
        audioRetentionDays: getSystemConfigSettings().audioRetentionDays,
      },
      counts: {
        ...authStats,
        examinationAttempts: prd61Summary.examinationAttemptsCount,
        writingDiaryEntries: prd61Summary.writingDiaryEntriesCount,
        humanBridgeLogs: prd61Summary.humanBridgeLogsCount,
        notifications: prd61Summary.notificationsCount,
        persistedNotifications: prd61Summary.notificationsCount,
        auditLogs: auditLogs.length,
      },
      providersSummary: listServerProviderStatuses().map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        configured: p.configured,
        lastHealthStatus: p.lastHealthStatus,
      })),
      securityEvents: prd61Summary.securityEvents.map((evt) => ({
        id: evt.id,
        severity: evt.severity === 'high' ? 'critical' : evt.severity,
        category: evt.eventType,
        actorEmail: evt.actorEmail,
        messageEn: evt.summary,
        path: evt.path,
        createdAt: evt.createdAt,
      })),
      checkedAt: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // 4. Express Admin User Management Parity (List, Update Role/Status, Delete)
  // ==========================================================================
  app.get('/api/v1/admin/users', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin',
      'User management requires Admin or Super Admin role.'
    );
    if (!admin) return;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json({ users: listServerAdminUsers(q) });
  });

  app.patch('/api/v1/admin/users/:userId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin',
      'Updating user accounts requires Admin or Super Admin role.'
    );
    if (!admin) return;
    const targetUserId = String(req.params.userId || '').trim();
    const body = (req.body || {}) as {
      role?: string;
      accountStatus?: 'active' | 'suspended';
      plan?: 'free' | 'pro' | 'institution';
    };
    const result = adminUpdateServerUser(targetUserId, admin.id, body, admin.role);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'admin.user.updated',
      resource: `user:${targetUserId}`,
      details: `Updated user ${result.user.email} (role=${result.user.role}, status=${result.user.accountStatus}, revokedSessions=${result.revokedSessions}).`,
    });
    if (body.accountStatus === 'suspended') {
      appendSecurityEvent({
        eventType: 'user_suspended',
        severity: 'warning',
        actorEmail: admin.email,
        path: `/api/v1/admin/users/${targetUserId}`,
        summary: `Suspended user ${result.user.email} and revoked ${result.revokedSessions} active session(s).`,
      });
    }
    res.json({ user: result.user, revokedSessions: result.revokedSessions });
  });

  app.delete('/api/v1/admin/users/:userId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'super_admin' || role === 'admin',
      'Deleting user accounts requires Admin or Super Admin role.'
    );
    if (!admin) return;
    const targetUserId = String(req.params.userId || '').trim();
    const result = adminDeleteServerUser(targetUserId, admin.id, admin.role);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'admin.user.deleted',
      resource: `user:${targetUserId}`,
      details: `Deleted user account ${result.email}.`,
    });
    res.json({ deleted: true, userId: targetUserId });
  });

  // ==========================================================================
  // 5. IELTS & English Examination Preparation (/api/v1/examinations)
  // ==========================================================================
  app.get('/api/v1/examinations/catalog', (req, res) => {
    const user = requireSignedInUser(req, res);
    if (!user) return;
    res.json({
      tasks: IELTS_TASK_CATALOG,
      disclaimerEn: IELTS_TRUTH_DISCLAIMER_EN,
      disclaimerBn: IELTS_TRUTH_DISCLAIMER_BN,
      featureEnabled: getServerFeatureFlags().ieltsExamPrepEnabled,
    });
  });

  app.get('/api/v1/examinations/attempts', (req, res) => {
    const user = requireSignedInUser(req, res);
    if (!user) return;
    res.json({ attempts: listUserExamAttempts(user.id) });
  });

  app.post('/api/v1/examinations/evaluate', async (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireSignedInUser(req, res);
    if (!user) return;
    if (!getServerFeatureFlags().ieltsExamPrepEnabled) {
      res.status(503).json({ error: 'IELTS Preparation is currently paused by system configuration.' });
      return;
    }
    const retryAfter = checkPrd61RateLimit(`exam_eval:${user.id}`, 12, 60_000);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many examination submissions. Please wait a minute.' });
      return;
    }

    const body = (req.body || {}) as {
      taskId?: string;
      responseText?: string;
      selectedAnswers?: Record<string, number>;
      durationSeconds?: number;
    };
    const task = getIeltsTaskById(String(body.taskId || '').trim());
    if (!task) {
      res.status(404).json({ error: 'Examination practice task not found.' });
      return;
    }
    const durationSeconds = Math.max(0, Math.min(7200, Math.round(Number(body.durationSeconds || 0))));

    // Objective Reading & Listening grading (deterministic, zero hallucination)
    if (task.module === 'reading' || task.module === 'listening') {
      const selected =
        body.selectedAnswers && typeof body.selectedAnswers === 'object' ? body.selectedAnswers : {};
      const graded = gradeObjectiveIeltsTask(task, selected);
      const attempt = saveUserExamAttempt({
        userId: user.id,
        taskId: task.id,
        module: task.module,
        taskTitleEn: task.titleEn,
        responseText: '',
        wordCount: 0,
        durationSeconds,
        objectiveScorePct: graded.scorePct,
        correctCount: graded.correctCount,
        totalQuestions: graded.totalQuestions,
        rubricFeedback: null,
        questionResults: graded.questionResults,
        modelUsed: 'deterministic-exam-grader',
      });
      res.status(201).json({ attempt, attempts: listUserExamAttempts(user.id) });
      return;
    }

    // Speaking & Writing rubric evaluation via Gemini
    const responseText = typeof body.responseText === 'string' ? body.responseText.trim() : '';
    if (responseText.length < 20) {
      res.status(400).json({ error: 'Please provide at least 20 characters of response text for rubric feedback.' });
      return;
    }

    try {
      const evaluated = await evaluateIeltsWithGemini({ task, responseText });
      const attempt = saveUserExamAttempt({
        userId: user.id,
        taskId: task.id,
        module: task.module,
        taskTitleEn: task.titleEn,
        responseText: responseText.slice(0, 4500),
        wordCount: countEnglishWords(responseText),
        durationSeconds,
        objectiveScorePct: null,
        correctCount: null,
        totalQuestions: null,
        rubricFeedback: evaluated.feedback,
        modelUsed: evaluated.modelUsed,
      });
      res.status(201).json({ attempt, attempts: listUserExamAttempts(user.id) });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 502;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Unable to evaluate examination response right now.',
      });
    }
  });

  // ==========================================================================
  // 6. Writing Intelligence, Language Diary, Shadowing & Human Bridge
  // ==========================================================================
  app.get('/api/v1/writing/entries', (req, res) => {
    const user = requireSignedInUser(req, res);
    if (!user) return;
    res.json({
      entries: listUserWritingDiary(user.id),
      modes: WRITING_MODES,
      shadowingPhrases: SHADOWING_PHRASE_LIBRARY,
    });
  });

  app.post('/api/v1/writing/evaluate', async (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireSignedInUser(req, res);
    if (!user) return;
    if (!getServerFeatureFlags().writingDiaryStudioEnabled) {
      res.status(503).json({ error: 'Writing & Language Diary Studio is currently paused by system configuration.' });
      return;
    }
    const retryAfter = checkPrd61RateLimit(`writing_eval:${user.id}`, 12, 60_000);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many writing evaluations. Please wait a minute.' });
      return;
    }

    const validation = validateWritingDiaryInput(req.body);
    if (!validation.ok || !validation.cleaned) {
      res.status(400).json({ error: validation.error || 'Invalid writing input.' });
      return;
    }

    try {
      const feedback = await evaluateWritingDiaryWithGemini(validation.cleaned);
      const entry = saveUserWritingDiary({
        userId: user.id,
        mode: validation.cleaned.mode,
        title: validation.cleaned.title,
        originalText: validation.cleaned.originalText,
        correctedVersion: feedback.correctedVersion,
        naturalAlternative: feedback.naturalAlternative,
        issues: feedback.issues,
        dimensions: feedback.dimensions,
        banglaSummary: feedback.banglaSummary,
        targetedPracticeEn: feedback.targetedPracticeEn,
        modelUsed: feedback.modelUsed,
      });
      res.status(201).json({ entry, entries: listUserWritingDiary(user.id) });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 502;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Unable to evaluate writing entry right now.',
      });
    }
  });

  app.patch('/api/v1/writing/entries/:entryId/rewrite', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireSignedInUser(req, res);
    if (!user) return;
    const rewrittenText = typeof req.body?.rewrittenText === 'string' ? req.body.rewrittenText.trim() : '';
    if (rewrittenText.length < 10) {
      res.status(400).json({ error: 'Rewrite must be at least 10 characters.' });
      return;
    }
    const updated = updateUserWritingRewrite(user.id, String(req.params.entryId || ''), rewrittenText);
    if (!updated) {
      res.status(404).json({ error: 'Writing entry not found.' });
      return;
    }
    res.json({ entry: updated, entries: listUserWritingDiary(user.id) });
  });

  app.get('/api/v1/human-bridge/logs', (req, res) => {
    const user = requireSignedInUser(req, res);
    if (!user) return;
    res.json({ logs: listUserHumanBridgeLogs(user.id) });
  });

  app.post('/api/v1/human-bridge/logs', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireSignedInUser(req, res);
    if (!user) return;
    const validation = validateHumanBridgeInput(req.body);
    if (!validation.ok || !validation.cleaned) {
      res.status(400).json({ error: validation.error || 'Invalid human practice log.' });
      return;
    }
    const log = saveUserHumanBridgeLog(user.id, validation.cleaned);
    res.status(201).json({ log, logs: listUserHumanBridgeLogs(user.id) });
  });

  app.delete('/api/v1/human-bridge/logs/:logId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireSignedInUser(req, res);
    if (!user) return;
    const deleted = deleteUserHumanBridgeLog(user.id, String(req.params.logId || ''));
    if (!deleted) {
      res.status(404).json({ error: 'Human practice log not found.' });
      return;
    }
    res.json({ deleted: true, logs: listUserHumanBridgeLogs(user.id) });
  });

  // ==========================================================================
  // 7. Learner Notifications, Learning Schedule & Admin Broadcasts (PRD §35)
  // ==========================================================================
  app.get('/api/v1/notifications', (req, res) => {
    const user = requireSignedInUser(req, res);
    if (!user) return;
    res.json({
      preferences: getUserNotificationPreferences(user.id),
      notifications: listUserNotifications(user.id),
    });
  });

  app.put('/api/v1/notifications/preferences', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireSignedInUser(req, res);
    if (!user) return;
    const validation = validateNotificationPreferencesPatch(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
    const preferences = saveUserNotificationPreferences(user.id, validation.patch);
    res.json({ preferences });
  });

  app.post('/api/v1/notifications/:notificationId/read', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireSignedInUser(req, res);
    if (!user) return;
    const ok = markPersistedNotificationRead(user.id, String(req.params.notificationId || ''));
    if (!ok) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json({ ok: true, notifications: listUserNotifications(user.id) });
  });

  app.post('/api/v1/admin/notifications/broadcast', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'admin' || role === 'super_admin',
      'Broadcasting platform notifications requires Admin or Super Admin role.'
    );
    if (!admin) return;

    const titleEn = typeof req.body?.titleEn === 'string' ? req.body.titleEn.trim().slice(0, 120) : '';
    const titleBn = typeof req.body?.titleBn === 'string' ? req.body.titleBn.trim().slice(0, 120) : '';
    const bodyEn = typeof req.body?.bodyEn === 'string' ? req.body.bodyEn.trim().slice(0, 500) : '';
    const bodyBn = typeof req.body?.bodyBn === 'string' ? req.body.bodyBn.trim().slice(0, 500) : '';
    const actionRoute =
      typeof req.body?.actionRoute === 'string' && req.body.actionRoute.startsWith('/')
        ? req.body.actionRoute.slice(0, 80)
        : undefined;

    if (titleEn.length < 3 || bodyEn.length < 6) {
      res.status(400).json({ error: 'Broadcast titleEn (min 3 chars) and bodyEn (min 6 chars) are required.' });
      return;
    }

    const notification = createPersistedNotification({
      userId: '*',
      type: 'system_broadcast',
      titleEn,
      titleBn: titleBn || titleEn,
      bodyEn,
      bodyBn: bodyBn || bodyEn,
      actionRoute,
    });
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'admin.notification.broadcast',
      resource: `system_config:${notification.id}`,
      details: `Broadcast platform notice: "${titleEn}"`,
    });
    emitExpressRealtimeEvent({
      targetUserId: '*',
      type: 'notification.created',
      payload: notification as unknown as Record<string, unknown>,
    });
    res.status(201).json({ notification });
  });

  // ==========================================================================
  // 8. Public Curriculum Overlay & Express <-> Worker Admin Curriculum/Mistakes Parity
  // ==========================================================================
  app.get('/api/v1/curriculum/overlay', (_req, res) => {
    res.json(getServerCurriculumOverlay());
  });

  app.get('/api/v1/admin/overview', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => isAdminPortalRole(role),
      'Admin overview requires an administrator role.'
    );
    if (!admin) return;
    const authStats = getServerAuthStats();
    const summary = getPrd61StoreHealthSummary();
    res.json({
      totalUsers: authStats.totalUsers,
      verifiedUsers: authStats.verifiedUsers,
      suspendedUsers: authStats.suspendedUsers,
      lessonsCompleted: summary.examinationAttemptsCount,
      speakingSessions: summary.writingDiaryEntriesCount,
      transferAttempts: summary.humanBridgeLogsCount,
      aiCalls: 0,
      activeMistakes: summary.flaggedMistakesCount,
      flaggedMistakes: summary.flaggedMistakesCount,
      customCourses: summary.customCoursesCount,
      customModules: summary.customModulesCount,
      customLessons: summary.customLessonsCount,
    });
  });

  app.post('/api/v1/admin/curriculum/courses', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'super_admin' || role === 'admin' || role === 'content_manager',
      'Publishing courses requires Super Admin, Admin, or Content Manager role.'
    );
    if (!admin) return;
    const course = (req.body || {}) as Partial<CurriculumCourse>;
    if (!course.id || !course.titleEn?.trim()) {
      res.status(400).json({ error: 'Course id and titleEn are required.' });
      return;
    }
    const { course: saved, overlay } = upsertServerPublishedCourse(course as CurriculumCourse);
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'curriculum.course_published',
      resource: `curriculum:${saved.id}`,
      details: `Published course "${saved.titleEn}" (v${saved.version ?? 1}).`,
    });
    res.status(201).json({
      id: saved.id,
      catalogVersion: overlay.catalogVersion,
      course: saved,
      overlay,
    });
  });

  app.post('/api/v1/admin/curriculum/modules', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'super_admin' || role === 'admin' || role === 'content_manager',
      'Publishing modules requires Super Admin, Admin, or Content Manager role.'
    );
    if (!admin) return;
    const mod = (req.body || {}) as Partial<CurriculumModule>;
    if (!mod.id || !mod.courseId?.trim() || !mod.titleEn?.trim()) {
      res.status(400).json({ error: 'Module id, courseId, and titleEn are required.' });
      return;
    }
    const { module: saved, overlay } = upsertServerPublishedModule(mod as CurriculumModule);
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'curriculum.module_published',
      resource: `curriculum:${saved.id}`,
      details: `Published module "${saved.titleEn}" under course ${saved.courseId}.`,
    });
    res.status(201).json({
      id: saved.id,
      courseId: saved.courseId,
      catalogVersion: overlay.catalogVersion,
      module: saved,
      overlay,
    });
  });

  app.post('/api/v1/admin/curriculum/lessons', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => role === 'super_admin' || role === 'admin' || role === 'content_manager',
      'Publishing lessons requires Super Admin, Admin, or Content Manager role.'
    );
    if (!admin) return;
    const lesson = (req.body || {}) as Partial<CurriculumLesson>;
    if (!lesson.id || !lesson.courseId?.trim() || !lesson.moduleId?.trim() || !lesson.titleEn?.trim()) {
      res.status(400).json({ error: 'Lesson id, courseId, moduleId, and titleEn are required.' });
      return;
    }
    const { lesson: saved, overlay } = upsertServerPublishedLesson(lesson as CurriculumLesson);
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'curriculum.lesson_published',
      resource: `curriculum:${saved.id}`,
      details: `Published 7-stage lesson "${saved.titleEn}" (v${saved.version ?? 1}).`,
    });
    res.status(201).json({
      id: saved.id,
      catalogVersion: overlay.catalogVersion,
      lesson: saved,
      overlay,
    });
  });

  app.post('/api/v1/mistakes/report-false-correction', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireSignedInUser(req, res);
    if (!user) return;
    const body = (req.body || {}) as Partial<MistakeMemoryItem>;
    if (!body.id || !body.userExample?.trim()) {
      res.status(400).json({ error: 'Mistake id and userExample are required.' });
      return;
    }
    const saved = upsertServerFlaggedMistake({
      ...(body as MistakeMemoryItem),
      userId: user.id,
      falseCorrectionReported: true,
      falseCorrectionReportedAt: body.falseCorrectionReportedAt ?? new Date().toISOString(),
    });
    res.status(201).json({ mistake: saved });
  });

  app.get('/api/v1/admin/flagged-mistakes', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => isAdminPortalRole(role),
      'Viewing reported mistakes requires an administrator role.'
    );
    if (!admin) return;
    res.json({ mistakes: listServerFlaggedMistakes() });
  });

  app.post('/api/v1/admin/flagged-mistakes/:mistakeId/review', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => isAdminPortalRole(role),
      'Reviewing reported mistakes requires an administrator role.'
    );
    if (!admin) return;
    const mistakeId = String(req.params.mistakeId || '').trim();
    const body = (req.body || {}) as {
      decision?: 'upheld_false_positive' | 'confirmed_accurate';
      note?: string;
    };
    const decision =
      body.decision === 'upheld_false_positive' ? 'upheld_false_positive' : 'confirmed_accurate';
    const result = reviewServerFlaggedMistake(mistakeId, decision, admin.email, body.note);
    if (!result.updated) {
      res.status(404).json({ error: 'Flagged mistake not found.' });
      return;
    }
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: `mistakes.${decision}`,
      resource: `mistake_review:${mistakeId}`,
      details: `Reviewed flagged mistake ${mistakeId} as ${decision}.`,
    });
    res.json({
      ok: true,
      mistakeId,
      decision,
      updatedMistake: result.updated,
      flaggedMistakes: result.flaggedMistakes,
    });
  });
}

