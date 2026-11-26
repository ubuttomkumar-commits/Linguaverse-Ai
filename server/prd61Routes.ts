import type express from 'express';
import {
  adminDeleteServerUser,
  adminUpdateServerUser,
  getServerAuthStats,
  listServerAdminUsers,
} from './authStore.ts';
import { appendServerAuditLog, getServerAuditLogs } from './cmsStore.ts';
import { getSystemConfigSettings } from './p3Store.ts';
import {
  appendSecurityEvent,
  createPersistedNotification,
  deleteUserHumanBridgeLog,
  getPrd61StoreHealthSummary,
  getServerAiRuntimeConfig,
  getServerFeatureFlags,
  getUserNotificationPreferences,
  listServerProviderStatuses,
  listUserExamAttempts,
  listUserHumanBridgeLogs,
  listUserNotifications,
  listUserWritingDiary,
  markPersistedNotificationRead,
  recordServerProviderHealth,
  resolveServerProviderSecret,
  rotateServerProviderSecret,
  saveServerAiRuntimeConfig,
  saveServerFeatureFlags,
  saveUserExamAttempt,
  saveUserHumanBridgeLog,
  saveUserNotificationPreferences,
  saveUserWritingDiary,
  updateUserWritingRewrite,
} from './prd61Store.ts';
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
        engine: 'local-json-store (Cloudflare D1 migrations 0001..0004 verified via SQLite parity tests)',
        status: 'healthy',
        migrationsReady: [
          '0001_initial_schema.sql',
          '0002_parts06_12_parity.sql',
          '0003_p3_community_vocab_billing.sql',
          '0004_prd61_examinations_labs_providers.sql',
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
    const result = adminUpdateServerUser(targetUserId, admin.id, body);
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
    const result = adminDeleteServerUser(targetUserId, admin.id);
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
    res.status(201).json({ notification });
  });
}
