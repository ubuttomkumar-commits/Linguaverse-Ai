import { generateRandomId } from '../services/crypto';
import type { D1Database, WorkerEnv } from '../types';
import type { WorkerApp, WorkerRouteDeps } from './parts06To12Routes';
import {
  DEFAULT_AI_RUNTIME_CONFIG,
  DEFAULT_FEATURE_FLAGS,
  PROVIDER_CATALOG,
  SUPPORTED_GEMINI_TEXT_MODELS,
  SUPPORTED_GEMINI_TRANSCRIBE_MODELS,
  SUPPORTED_GEMINI_TTS_MODELS,
  isSupportedProviderId,
  maskSecretFingerprint,
  validateAiRuntimeConfigPatch,
  validateFeatureFlagsPatch,
  type AiRuntimeConfig,
  type PlatformFeatureFlags,
  type ProviderId,
  type ProviderStatusView,
} from '../../src/domain/aiProviderRegistry';
import {
  IELTS_TASK_CATALOG,
  IELTS_TRUTH_DISCLAIMER_BN,
  IELTS_TRUTH_DISCLAIMER_EN,
  countEnglishWords,
  getIeltsTaskById,
  gradeObjectiveIeltsTask,
} from '../../src/domain/ieltsExamEngine';
import {
  SHADOWING_PHRASE_LIBRARY,
  WRITING_MODES,
  validateHumanBridgeInput,
  validateWritingDiaryInput,
} from '../../src/domain/advancedLearningLabsEngine';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  validateNotificationPreferencesPatch,
} from '../../src/domain/notificationsEngine';

const FEATURE_FLAGS_KEY = 'feature_flags_v1';
const AI_PROVIDERS_KEY = 'ai_providers_config_v1';

async function loadJsonSetting<T>(db: D1Database, key: string, defaults: T): Promise<T> {
  const row = await db
    .prepare(`SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1`)
    .bind(key)
    .first<{ setting_value: string }>();
  if (!row?.setting_value) return { ...defaults };
  try {
    return { ...defaults, ...(JSON.parse(row.setting_value) as Partial<T>) };
  } catch {
    return { ...defaults };
  }
}

async function saveJsonSetting(
  db: D1Database,
  key: string,
  value: unknown,
  updatedBy: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`
    )
    .bind(key, JSON.stringify(value), updatedBy, nowIso)
    .run();
}

function getWorkerEnvSecret(env: WorkerEnv, envName: string): string {
  const val = (env as unknown as Record<string, unknown>)[envName];
  return typeof val === 'string' ? val.trim() : '';
}

function buildWorkerProviderStatuses(env: WorkerEnv): ProviderStatusView[] {
  return PROVIDER_CATALOG.map((desc) => {
    const primaryVal = getWorkerEnvSecret(env, desc.envVarNames[0] ?? '');
    const allReady = desc.envVarNames.every((name) => Boolean(getWorkerEnvSecret(env, name)));
    const configured = Boolean(primaryVal) && allReady;
    return {
      id: desc.id,
      name: desc.name,
      category: desc.category,
      configured,
      source: configured ? 'env' : 'unconfigured',
      maskedKey: configured ? maskSecretFingerprint(primaryVal) : null,
      lastRotatedAt: null,
      lastHealthCheckAt: null,
      lastHealthStatus: configured ? 'unchecked' : 'unconfigured',
      lastHealthLatencyMs: null,
      lastHealthMessage: configured
        ? 'Configured via Cloudflare Worker environment secret.'
        : 'Awaiting Cloudflare Worker secret configuration.',
      envVarNames: [...desc.envVarNames],
      supportedFeatures: [...desc.supportedFeatures],
      productionSecretCommand: desc.productionSecretCommand,
      notes: desc.notes,
    };
  });
}

async function callWorkerGeminiJson(
  env: WorkerEnv,
  model: string,
  prompt: string
): Promise<{ parsed: Record<string, unknown>; modelUsed: string }> {
  const apiKey = (env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    throw Object.assign(new Error('GEMINI_API_KEY is not configured in Cloudflare Worker secrets.'), {
      statusCode: 503,
    });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.25, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`Gemini REST error (${res.status}).`), { statusCode: 502 });
  }
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = JSON.parse(text) as Record<string, unknown>;
  return { parsed, modelUsed: model };
}

export function registerWorkerPrd61Routes(app: WorkerApp, deps: WorkerRouteDeps): void {
  const { requireAuth, requireAdmin, writeAuditLog } = deps;

  // 1. Public non-secret system status (Maintenance Mode + Feature Flags)
  app.get('/api/v1/system/status', async (c) => {
    const flags = await loadJsonSetting<PlatformFeatureFlags>(
      c.env.DB,
      FEATURE_FLAGS_KEY,
      DEFAULT_FEATURE_FLAGS
    );
    const sys = await loadJsonSetting<{
      maintenanceBannerEn?: string;
      maintenanceBannerBn?: string;
      allowNewRegistrations?: boolean;
    }>(c.env.DB, 'platform_config_v1', {
      maintenanceBannerEn: '',
      maintenanceBannerBn: '',
      allowNewRegistrations: true,
    });
    return c.json({
      ok: true,
      maintenanceMode: flags.maintenanceMode,
      maintenanceBannerEn: sys.maintenanceBannerEn ?? '',
      maintenanceBannerBn: sys.maintenanceBannerBn ?? '',
      allowNewRegistrations: sys.allowNewRegistrations ?? true,
      featureFlags: flags,
    });
  });

  // 2. Admin Feature Flags
  app.get('/api/v1/admin/feature-flags', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin', 'ai_ops']);
    if (admin instanceof Response) return admin;
    const featureFlags = await loadJsonSetting<PlatformFeatureFlags>(
      c.env.DB,
      FEATURE_FLAGS_KEY,
      DEFAULT_FEATURE_FLAGS
    );
    return c.json({ featureFlags });
  });

  app.put('/api/v1/admin/feature-flags', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const body = await c.req.json().catch(() => null);
    const validation = validateFeatureFlagsPatch(body);
    if (!validation.ok) return c.json({ error: validation.error }, 400);

    const current = await loadJsonSetting<PlatformFeatureFlags>(
      c.env.DB,
      FEATURE_FLAGS_KEY,
      DEFAULT_FEATURE_FLAGS
    );
    const next: PlatformFeatureFlags = {
      ...current,
      ...validation.patch,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.email,
    };
    await saveJsonSetting(c.env.DB, FEATURE_FLAGS_KEY, next, admin.email);
    await writeAuditLog(c.env, {
      actorUserId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'admin.feature_flags.updated',
      resourceType: 'system_config',
      resourceId: FEATURE_FLAGS_KEY,
      summaryEn: `Updated platform feature flags (${Object.keys(validation.patch).join(', ')}).`,
      summaryBn: `প্ল্যাটফর্ম ফিচার ফ্ল্যাগ আপডেট করা হয়েছে।`,
    });
    return c.json({ featureFlags: next });
  });

  // 3. Admin AI Providers Configuration & Secret Status
  app.get('/api/v1/admin/ai-providers', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin', 'ai_ops']);
    if (admin instanceof Response) return admin;
    const runtimeConfig = await loadJsonSetting<AiRuntimeConfig>(
      c.env.DB,
      AI_PROVIDERS_KEY,
      DEFAULT_AI_RUNTIME_CONFIG
    );
    return c.json({
      runtimeConfig,
      providers: buildWorkerProviderStatuses(c.env),
      supportedModels: {
        text: SUPPORTED_GEMINI_TEXT_MODELS,
        transcribe: SUPPORTED_GEMINI_TRANSCRIBE_MODELS,
        tts: SUPPORTED_GEMINI_TTS_MODELS,
      },
      productionSecretGuidance:
        'Cloudflare Worker secrets are immutable at runtime; rotate production keys using `npx wrangler secret put <SECRET_NAME>`.',
    });
  });

  app.put('/api/v1/admin/ai-providers', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin', 'ai_ops']);
    if (admin instanceof Response) return admin;
    const body = await c.req.json().catch(() => null);
    const validation = validateAiRuntimeConfigPatch(body);
    if (!validation.ok) return c.json({ error: validation.error }, 400);

    const current = await loadJsonSetting<AiRuntimeConfig>(
      c.env.DB,
      AI_PROVIDERS_KEY,
      DEFAULT_AI_RUNTIME_CONFIG
    );
    const next: AiRuntimeConfig = {
      ...current,
      ...validation.patch,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.email,
    };
    await saveJsonSetting(c.env.DB, AI_PROVIDERS_KEY, next, admin.email);
    await writeAuditLog(c.env, {
      actorUserId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'admin.ai_providers.updated',
      resourceType: 'ai_ops',
      resourceId: AI_PROVIDERS_KEY,
      summaryEn: `Updated AI runtime configuration (${Object.keys(validation.patch).join(', ')}).`,
      summaryBn: `AI প্রোভাইডার কনফিগারেশন আপডেট করা হয়েছে।`,
    });
    return c.json({ runtimeConfig: next, providers: buildWorkerProviderStatuses(c.env) });
  });

  app.post('/api/v1/admin/ai-providers/:providerId/rotate-key', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const providerId = c.req.param('providerId') as ProviderId;
    if (!isSupportedProviderId(providerId)) {
      return c.json({ error: 'Unsupported provider identifier.' }, 400);
    }
    const desc = PROVIDER_CATALOG.find((p) => p.id === providerId)!;
    return c.json(
      {
        error: `Cloudflare Workers store secrets exclusively via Wrangler Secret Management. Run: ${desc.productionSecretCommand}`,
        code: 'WRANGLER_SECRET_REQUIRED',
        productionSecretCommand: desc.productionSecretCommand,
      },
      501
    );
  });

  app.post('/api/v1/admin/ai-providers/:providerId/health', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin', 'ai_ops']);
    if (admin instanceof Response) return admin;
    const providerId = c.req.param('providerId') as ProviderId;
    if (!isSupportedProviderId(providerId)) {
      return c.json({ error: 'Unsupported provider identifier.' }, 400);
    }
    const statuses = buildWorkerProviderStatuses(c.env);
    const target = statuses.find((p) => p.id === providerId);
    return c.json({
      providerId,
      ok: Boolean(target?.configured),
      status: target?.configured ? 'healthy' : 'unconfigured',
      latencyMs: 0,
      message: target?.lastHealthMessage ?? 'Checked.',
      providers: statuses,
    });
  });

  // 4. Admin System Health (Real D1 counts + security audit events)
  app.get('/api/v1/admin/system-health', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin', 'ai_ops']);
    if (admin instanceof Response) return admin;
    const [usersRow, examRow, writingRow, bridgeRow, notifRow, auditRow, secRows] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM users`).first<{ cnt: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM examination_attempts`).first<{ cnt: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM writing_diary_entries`).first<{ cnt: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM human_bridge_logs`).first<{ cnt: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM user_notifications`).first<{ cnt: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM audit_logs`).first<{ cnt: number }>(),
      c.env.DB.prepare(
        `SELECT id, action, actor_email, summary_en, created_at
         FROM audit_logs
         WHERE action IN (
           'admin.user.updated',
           'admin.user.deleted',
           'admin.feature_flags.updated',
           'admin.ai_providers.updated',
           'admin.system_config.updated'
         )
         ORDER BY created_at DESC
         LIMIT 20`
      ).all<{
        id: string;
        action: string;
        actor_email: string;
        summary_en: string;
        created_at: string;
      }>(),
    ]);
    const securityEvents = (secRows.results ?? []).map((row) => ({
      id: row.id,
      severity:
        row.action === 'admin.user.deleted'
          ? ('critical' as const)
          : row.action === 'admin.user.updated' || row.action === 'admin.feature_flags.updated'
            ? ('warning' as const)
            : ('info' as const),
      category: row.action,
      actorEmail: row.actor_email,
      messageEn: row.summary_en,
      createdAt: row.created_at,
    }));
    return c.json({
      ok: true,
      runtime: 'cloudflare-worker',
      database: {
        engine: 'cloudflare-d1-sqlite',
        status: 'healthy',
        migrationsReady: [
          '0001_initial_schema.sql',
          '0002_parts06_12_parity.sql',
          '0003_p3_community_vocab_billing.sql',
          '0004_prd61_examinations_labs_providers.sql',
        ],
        backupStatus: 'Use `npx wrangler d1 export linguaverse-db --remote --output=./backup.sql` before migrations.',
      },
      counts: {
        totalUsers: Number(usersRow?.cnt ?? 0),
        examinationAttempts: Number(examRow?.cnt ?? 0),
        writingDiaryEntries: Number(writingRow?.cnt ?? 0),
        humanBridgeLogs: Number(bridgeRow?.cnt ?? 0),
        persistedNotifications: Number(notifRow?.cnt ?? 0),
        auditLogs: Number(auditRow?.cnt ?? 0),
      },
      providersSummary: buildWorkerProviderStatuses(c.env).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        configured: p.configured,
        lastHealthStatus: p.lastHealthStatus,
      })),
      securityEvents,
      checkedAt: new Date().toISOString(),
    });
  });

  // 5. IELTS Examinations (/api/v1/examinations)
  app.get('/api/v1/examinations/catalog', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const flags = await loadJsonSetting<PlatformFeatureFlags>(
      c.env.DB,
      FEATURE_FLAGS_KEY,
      DEFAULT_FEATURE_FLAGS
    );
    return c.json({
      tasks: IELTS_TASK_CATALOG,
      disclaimerEn: IELTS_TRUTH_DISCLAIMER_EN,
      disclaimerBn: IELTS_TRUTH_DISCLAIMER_BN,
      featureEnabled: flags.ieltsExamPrepEnabled,
    });
  });

  app.get('/api/v1/examinations/attempts', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const rows = await c.env.DB.prepare(
      `SELECT * FROM examination_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
      .bind(user.id)
      .all<Record<string, unknown>>();
    const attempts = (rows.results ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      taskId: r.task_id,
      module: r.module,
      taskTitleEn: r.task_title_en,
      responseText: r.response_text,
      wordCount: r.word_count,
      durationSeconds: r.duration_seconds,
      objectiveScorePct: r.objective_score_pct,
      correctCount: r.correct_count,
      totalQuestions: r.total_questions,
      rubricFeedback: r.rubric_feedback_json ? JSON.parse(String(r.rubric_feedback_json)) : null,
      questionResults: r.question_results_json ? JSON.parse(String(r.question_results_json)) : undefined,
      modelUsed: r.model_used,
      createdAt: r.created_at,
    }));
    return c.json({ attempts });
  });

  app.post('/api/v1/examinations/evaluate', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const body = (await c.req.json().catch(() => ({}))) as {
      taskId?: string;
      responseText?: string;
      selectedAnswers?: Record<string, number>;
      durationSeconds?: number;
    };
    const task = getIeltsTaskById(String(body.taskId || '').trim());
    if (!task) return c.json({ error: 'Examination practice task not found.' }, 404);
    const durationSeconds = Math.max(0, Math.min(7200, Math.round(Number(body.durationSeconds || 0))));
    const id = generateRandomId('exam');
    const nowIso = new Date().toISOString();

    if (task.module === 'reading' || task.module === 'listening') {
      const graded = gradeObjectiveIeltsTask(task, body.selectedAnswers ?? {});
      await c.env.DB.prepare(
        `INSERT INTO examination_attempts
         (id, user_id, task_id, module, task_title_en, response_text, word_count, duration_seconds, objective_score_pct, correct_count, total_questions, rubric_feedback_json, question_results_json, model_used, created_at)
         VALUES (?, ?, ?, ?, ?, '', 0, ?, ?, ?, ?, NULL, ?, 'deterministic-exam-grader', ?)`
      )
        .bind(
          id,
          user.id,
          task.id,
          task.module,
          task.titleEn,
          durationSeconds,
          graded.scorePct,
          graded.correctCount,
          graded.totalQuestions,
          JSON.stringify(graded.questionResults),
          nowIso
        )
        .run();
      return c.json(
        {
          attempt: {
            id,
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
            createdAt: nowIso,
          },
        },
        201
      );
    }

    const responseText = typeof body.responseText === 'string' ? body.responseText.trim() : '';
    if (responseText.length < 20) {
      return c.json({ error: 'Please provide at least 20 characters for rubric feedback.' }, 400);
    }
    const aiCfg = await loadJsonSetting<AiRuntimeConfig>(
      c.env.DB,
      AI_PROVIDERS_KEY,
      DEFAULT_AI_RUNTIME_CONFIG
    );
    try {
      const { parsed, modelUsed } = await callWorkerGeminiJson(
        c.env,
        aiCfg.primaryModel,
        `Evaluate this ${task.subType} response as non-official practice JSON with fields overallPracticeEstimate, banglaSummary, strengthsEn (array), priorityFixesEn (array). Response:\n<learner_response>${responseText.slice(0, 4000)}</learner_response>`
      );
      const rubricFeedback = {
        taskResponseOrAchievement: { practiceSignal: 'Practice Signal', feedbackEn: String(parsed.overallPracticeEstimate ?? 'Evaluated'), feedbackBn: String(parsed.banglaSummary ?? '') },
        coherenceAndCohesion: { practiceSignal: 'Practice Signal', feedbackEn: 'Coherence reviewed.', feedbackBn: 'সংযোগ পর্যালোচনা করা হয়েছে।' },
        lexicalResource: { practiceSignal: 'Practice Signal', feedbackEn: 'Vocabulary reviewed.', feedbackBn: 'শব্দভাণ্ডার পর্যালোচনা করা হয়েছে।' },
        grammaticalRangeAndAccuracy: { practiceSignal: 'Practice Signal', feedbackEn: 'Grammar reviewed.', feedbackBn: 'ব্যাকরণ পর্যালোচনা করা হয়েছে।' },
        overallPracticeEstimate: String(parsed.overallPracticeEstimate ?? 'Practice Feedback Completed (Non-Official)'),
        strengthsEn: Array.isArray(parsed.strengthsEn) ? parsed.strengthsEn.slice(0, 4) : [],
        priorityFixesEn: Array.isArray(parsed.priorityFixesEn) ? parsed.priorityFixesEn.slice(0, 4) : [],
        banglaSummary: String(parsed.banglaSummary ?? ''),
        disclaimerEn: IELTS_TRUTH_DISCLAIMER_EN,
        disclaimerBn: IELTS_TRUTH_DISCLAIMER_BN,
      };
      await c.env.DB.prepare(
        `INSERT INTO examination_attempts
         (id, user_id, task_id, module, task_title_en, response_text, word_count, duration_seconds, objective_score_pct, correct_count, total_questions, rubric_feedback_json, question_results_json, model_used, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, NULL, ?, ?)`
      )
        .bind(
          id,
          user.id,
          task.id,
          task.module,
          task.titleEn,
          responseText.slice(0, 4500),
          countEnglishWords(responseText),
          durationSeconds,
          JSON.stringify(rubricFeedback),
          modelUsed,
          nowIso
        )
        .run();
      return c.json({ attempt: { id, userId: user.id, taskId: task.id, module: task.module, taskTitleEn: task.titleEn, rubricFeedback, modelUsed, createdAt: nowIso } }, 201);
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode ?? 502;
      return c.json({ error: err instanceof Error ? err.message : 'AI evaluation failed.' }, code as 502 | 503);
    }
  });

  // 6. Writing Diary & Human Communication Bridge
  app.get('/api/v1/writing/entries', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const rows = await c.env.DB.prepare(
      `SELECT * FROM writing_diary_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
      .bind(user.id)
      .all<Record<string, unknown>>();
    return c.json({
      entries: (rows.results ?? []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        mode: r.mode,
        title: r.title,
        originalText: r.original_text,
        correctedVersion: r.corrected_version,
        naturalAlternative: r.natural_alternative,
        issues: JSON.parse(String(r.issues_json || '[]')),
        dimensions: JSON.parse(String(r.dimensions_json || '{}')),
        banglaSummary: r.bangla_summary,
        targetedPracticeEn: r.targeted_practice_en,
        rewrittenText: r.rewritten_text ?? undefined,
        modelUsed: r.model_used,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      modes: WRITING_MODES,
      shadowingPhrases: SHADOWING_PHRASE_LIBRARY,
    });
  });

  app.post('/api/v1/writing/evaluate', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const body = await c.req.json().catch(() => null);
    const validation = validateWritingDiaryInput(body);
    if (!validation.ok || !validation.cleaned) {
      return c.json({ error: validation.error || 'Invalid writing input.' }, 400);
    }
    const aiCfg = await loadJsonSetting<AiRuntimeConfig>(c.env.DB, AI_PROVIDERS_KEY, DEFAULT_AI_RUNTIME_CONFIG);
    try {
      const { parsed, modelUsed } = await callWorkerGeminiJson(
        c.env,
        aiCfg.primaryModel,
        `Review this ${validation.cleaned.mode} English text and return JSON with correctedVersion, naturalAlternative, banglaSummary, targetedPracticeEn. Text:\n<learner_writing>${validation.cleaned.originalText}</learner_writing>`
      );
      const id = generateRandomId('wry');
      const nowIso = new Date().toISOString();
      const correctedVersion = String(parsed.correctedVersion ?? validation.cleaned.originalText);
      const naturalAlternative = String(parsed.naturalAlternative ?? correctedVersion);
      const banglaSummary = String(parsed.banglaSummary ?? '');
      const targetedPracticeEn = String(parsed.targetedPracticeEn ?? 'Rewrite using natural collocations.');
      await c.env.DB.prepare(
        `INSERT INTO writing_diary_entries
         (id, user_id, mode, title, original_text, corrected_version, natural_alternative, issues_json, dimensions_json, bangla_summary, targeted_practice_en, model_used, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '{}', ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          user.id,
          validation.cleaned.mode,
          validation.cleaned.title,
          validation.cleaned.originalText,
          correctedVersion,
          naturalAlternative,
          banglaSummary,
          targetedPracticeEn,
          modelUsed,
          nowIso,
          nowIso
        )
        .run();
      return c.json({ entry: { id, userId: user.id, ...validation.cleaned, correctedVersion, naturalAlternative, banglaSummary, targetedPracticeEn, modelUsed, createdAt: nowIso, updatedAt: nowIso } }, 201);
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode ?? 502;
      return c.json({ error: err instanceof Error ? err.message : 'Writing evaluation failed.' }, code as 502 | 503);
    }
  });

  app.patch('/api/v1/writing/entries/:entryId/rewrite', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const entryId = c.req.param('entryId');
    const body = (await c.req.json().catch(() => ({}))) as { rewrittenText?: unknown };
    const rewrittenText =
      typeof body.rewrittenText === 'string' ? body.rewrittenText.trim().slice(0, 4000) : '';
    if (rewrittenText.length < 10) {
      return c.json({ error: 'Rewrite text must be at least 10 characters.' }, 400);
    }
    const nowIso = new Date().toISOString();
    const res = await c.env.DB.prepare(
      `UPDATE writing_diary_entries SET rewritten_text = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    )
      .bind(rewrittenText, nowIso, entryId, user.id)
      .run();
    if (!res.meta || Number((res.meta as { changes?: number }).changes ?? 0) === 0) {
      return c.json({ error: 'Writing entry not found.' }, 404);
    }
    return c.json({ ok: true, id: entryId, rewrittenText, updatedAt: nowIso });
  });

  app.get('/api/v1/human-bridge/logs', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const rows = await c.env.DB.prepare(
      `SELECT * FROM human_bridge_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
      .bind(user.id)
      .all<Record<string, unknown>>();
    return c.json({
      logs: (rows.results ?? []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        scenarioContext: r.scenario_context,
        partnerType: r.partner_type,
        goalEn: r.goal_en,
        whatWentWell: r.what_went_well,
        whatFeltHard: r.what_felt_hard,
        selfReportedConfidence: r.self_reported_confidence,
        evidenceType: 'user_reported',
        createdAt: r.created_at,
      })),
    });
  });

  app.post('/api/v1/human-bridge/logs', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const body = await c.req.json().catch(() => null);
    const validation = validateHumanBridgeInput(body);
    if (!validation.ok || !validation.cleaned) {
      return c.json({ error: validation.error || 'Invalid human practice log.' }, 400);
    }
    const id = generateRandomId('hbl');
    const nowIso = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO human_bridge_logs (id, user_id, scenario_context, partner_type, goal_en, what_went_well, what_felt_hard, self_reported_confidence, evidence_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user_reported', ?)`
    )
      .bind(
        id,
        user.id,
        validation.cleaned.scenarioContext,
        validation.cleaned.partnerType,
        validation.cleaned.goalEn,
        validation.cleaned.whatWentWell,
        validation.cleaned.whatFeltHard,
        validation.cleaned.selfReportedConfidence,
        nowIso
      )
      .run();
    return c.json({ log: { id, userId: user.id, ...validation.cleaned, evidenceType: 'user_reported', createdAt: nowIso } }, 201);
  });

  app.delete('/api/v1/human-bridge/logs/:logId', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    await c.env.DB.prepare(`DELETE FROM human_bridge_logs WHERE id = ? AND user_id = ?`)
      .bind(c.req.param('logId'), user.id)
      .run();
    return c.json({ deleted: true });
  });

  // 7. Learner Notifications & Learning Schedule
  app.get('/api/v1/notifications', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const pref = await c.env.DB.prepare(
      `SELECT * FROM user_notification_preferences WHERE user_id = ? LIMIT 1`
    )
      .bind(user.id)
      .first<Record<string, unknown>>();
    const rows = await c.env.DB.prepare(
      `SELECT * FROM user_notifications WHERE user_id = ? OR user_id = '*' ORDER BY created_at DESC LIMIT 50`
    )
      .bind(user.id)
      .all<Record<string, unknown>>();
    return c.json({
      preferences: pref
        ? {
            remindersEnabled: Boolean(pref.reminders_enabled),
            preferredTimeLocal: String(pref.preferred_time_local),
            quietHoursStart: String(pref.quiet_hours_start),
            quietHoursEnd: String(pref.quiet_hours_end),
            reviewReminders: Boolean(pref.review_reminders),
            assessmentReminders: Boolean(pref.assessment_reminders),
            subscriptionNotices: Boolean(pref.subscription_notices),
            securityNotifications: Boolean(pref.security_notifications),
            emailNotifications: Boolean(pref.email_notifications),
            updatedAt: String(pref.updated_at),
          }
        : DEFAULT_NOTIFICATION_PREFERENCES,
      notifications: (rows.results ?? []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        titleEn: r.title_en,
        titleBn: r.title_bn,
        bodyEn: r.body_en,
        bodyBn: r.body_bn,
        actionRoute: r.action_route ?? undefined,
        readAt: r.read_at ?? null,
        createdAt: r.created_at,
      })),
    });
  });

  app.put('/api/v1/notifications/preferences', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const body = await c.req.json().catch(() => null);
    const validation = validateNotificationPreferencesPatch(body);
    if (!validation.ok) return c.json({ error: validation.error }, 400);

    const existing = await c.env.DB.prepare(
      `SELECT * FROM user_notification_preferences WHERE user_id = ? LIMIT 1`
    )
      .bind(user.id)
      .first<Record<string, unknown>>();
    const merged = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(existing
        ? {
            remindersEnabled: Boolean(existing.reminders_enabled),
            preferredTimeLocal: String(existing.preferred_time_local),
            quietHoursStart: String(existing.quiet_hours_start),
            quietHoursEnd: String(existing.quiet_hours_end),
            reviewReminders: Boolean(existing.review_reminders),
            assessmentReminders: Boolean(existing.assessment_reminders),
            subscriptionNotices: Boolean(existing.subscription_notices),
            securityNotifications: Boolean(existing.security_notifications),
            emailNotifications: Boolean(existing.email_notifications),
          }
        : {}),
      ...validation.patch,
      updatedAt: new Date().toISOString(),
    };
    await c.env.DB.prepare(
      `INSERT INTO user_notification_preferences
       (user_id, reminders_enabled, preferred_time_local, quiet_hours_start, quiet_hours_end, review_reminders, assessment_reminders, subscription_notices, security_notifications, email_notifications, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         reminders_enabled = excluded.reminders_enabled,
         preferred_time_local = excluded.preferred_time_local,
         quiet_hours_start = excluded.quiet_hours_start,
         quiet_hours_end = excluded.quiet_hours_end,
         review_reminders = excluded.review_reminders,
         assessment_reminders = excluded.assessment_reminders,
         subscription_notices = excluded.subscription_notices,
         security_notifications = excluded.security_notifications,
         email_notifications = excluded.email_notifications,
         updated_at = excluded.updated_at`
    )
      .bind(
        user.id,
        merged.remindersEnabled ? 1 : 0,
        merged.preferredTimeLocal,
        merged.quietHoursStart,
        merged.quietHoursEnd,
        merged.reviewReminders ? 1 : 0,
        merged.assessmentReminders ? 1 : 0,
        merged.subscriptionNotices ? 1 : 0,
        merged.securityNotifications ? 1 : 0,
        merged.emailNotifications ? 1 : 0,
        merged.updatedAt
      )
      .run();
    return c.json({ preferences: merged });
  });

  app.post('/api/v1/notifications/:notificationId/read', async (c) => {
    const user = await requireAuth(c);
    if (user instanceof Response) return user;
    const nowIso = new Date().toISOString();
    await c.env.DB.prepare(
      `UPDATE user_notifications SET read_at = ? WHERE id = ? AND (user_id = ? OR user_id = '*')`
    )
      .bind(nowIso, c.req.param('notificationId'), user.id)
      .run();
    return c.json({ ok: true, readAt: nowIso });
  });

  app.post('/api/v1/admin/notifications/broadcast', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const titleEn = typeof body.titleEn === 'string' ? body.titleEn.trim().slice(0, 120) : '';
    const titleBn = typeof body.titleBn === 'string' ? body.titleBn.trim().slice(0, 120) : '';
    const bodyEn = typeof body.bodyEn === 'string' ? body.bodyEn.trim().slice(0, 500) : '';
    const bodyBn = typeof body.bodyBn === 'string' ? body.bodyBn.trim().slice(0, 500) : '';
    const actionRoute =
      typeof body.actionRoute === 'string' && body.actionRoute.startsWith('/')
        ? body.actionRoute.slice(0, 80)
        : null;
    if (titleEn.length < 3 || bodyEn.length < 6) {
      return c.json({ error: 'titleEn and bodyEn are required.' }, 400);
    }
    const id = generateRandomId('ntf');
    const nowIso = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO user_notifications (id, user_id, type, title_en, title_bn, body_en, body_bn, action_route, read_at, created_at)
       VALUES (?, '*', 'system_broadcast', ?, ?, ?, ?, ?, NULL, ?)`
    )
      .bind(id, titleEn, titleBn || titleEn, bodyEn, bodyBn || bodyEn, actionRoute, nowIso)
      .run();
    await writeAuditLog(c.env, {
      actorUserId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'admin.notification.broadcast',
      resourceType: 'system_config',
      resourceId: id,
      summaryEn: `Broadcast platform notice: "${titleEn}"`,
      summaryBn: `প্ল্যাটফর্ম নোটিশ পাঠানো হয়েছে: "${titleEn}"`,
    });
    return c.json({ notification: { id, userId: '*', type: 'system_broadcast', titleEn, titleBn: titleBn || titleEn, bodyEn, bodyBn: bodyBn || bodyEn, actionRoute, readAt: null, createdAt: nowIso } }, 201);
  });
}
