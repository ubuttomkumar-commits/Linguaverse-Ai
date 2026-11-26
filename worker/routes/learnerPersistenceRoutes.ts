import type { WorkerEnv } from '../types';
import type { WorkerApp, WorkerRouteDeps } from './parts06To12Routes';
import { generateRandomId } from '../services/crypto';
import { evaluateDiagnosticAttempt } from '../../src/domain/diagnosticEngine';
import { getLessonById } from '../../src/domain/curriculumData';
import { calculateLessonMastery, computeActiveStreakDays } from '../../src/domain/spacedRepetition';
import {
  buildLessonCompletionXpAward,
  buildLessonMasteryTierXpAward,
  buildMistakeResolvedXpAward,
  buildSpeakingSessionXpAward,
  buildTransferPassXpAward,
  type PendingXpAward,
} from '../../src/domain/gamificationEngine';
import { computeNextMistakeReview } from '../../src/domain/mistakeMemoryEngine';
import { MISTAKE_MEMORY_MIN_CONFIDENCE, mapMistakeCategoryToDomain } from '../../src/domain/speakingEvaluation';
import { getSpeakingScenario } from '../../src/domain/speakingScenarios';
import { getTransferUniverseScenario } from '../../src/domain/transferLabUniverseEngine';
import type {
  ActivityLedgerSummary,
  DiagnosticUserAnswer,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  SelfEstimatedLevel,
  SpacedRepetitionPreset,
  SpeakingSessionRecord,
  TransferAttemptRecord,
  XpLedgerEntry,
} from '../../src/types/domain';
import type {
  RecordExerciseAttemptPayload,
  RecordLessonAttemptPayload,
  RecordMistakeDrillPayload,
  RecordTransferAttemptPayload,
  ReportFalseCorrectionPayload,
  SaveSpeakingSessionPayload,
} from '../../src/services/storage/repository';

function mapMistakeRow(r: Record<string, unknown>): MistakeMemoryItem {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    source: String(r.source) as MistakeMemoryItem['source'],
    lessonId: r.lesson_id ? String(r.lesson_id) : undefined,
    speakingSessionId: r.speaking_session_id ? String(r.speaking_session_id) : undefined,
    domain: String(r.domain) as MistakeMemoryItem['domain'],
    category: String(r.category),
    userExample: String(r.user_example),
    correctedExample: String(r.corrected_example),
    patternEn: String(r.pattern_en),
    patternBn: String(r.pattern_bn),
    explanationEn: String(r.explanation_en),
    explanationBn: String(r.explanation_bn),
    occurrences: Number(r.occurrences || 1),
    severity: r.severity ? (String(r.severity) as MistakeMemoryItem['severity']) : undefined,
    confidence: typeof r.confidence === 'number' ? r.confidence : undefined,
    status: String(r.status || 'active') as MistakeMemoryItem['status'],
    practiceAttemptsCount: Number(r.practice_attempts || 0),
    practicePassCount: Number(r.consecutive_passes || 0),
    lastPracticedAt: r.last_practiced_at ? String(r.last_practiced_at) : undefined,
    nextReviewAt: r.next_review_at ? String(r.next_review_at) : undefined,
    falseCorrectionReported: Boolean(r.false_correction_reported),
    falseCorrectionReason: r.false_correction_reason ? String(r.false_correction_reason) : undefined,
    falseCorrectionReportedAt: r.false_correction_reported_at
      ? String(r.false_correction_reported_at)
      : undefined,
    adminReviewStatus: r.admin_review_status
      ? (String(r.admin_review_status) as MistakeMemoryItem['adminReviewStatus'])
      : undefined,
    adminReviewNote: r.admin_review_note ? String(r.admin_review_note) : undefined,
    adminReviewedAt: r.admin_reviewed_at ? String(r.admin_reviewed_at) : undefined,
    adminReviewedBy: r.admin_reviewed_by ? String(r.admin_reviewed_by) : undefined,
    createdAt: String(r.created_at),
    lastSeenAt: String(r.last_seen_at),
  };
}

function mapLessonAttemptRow(r: Record<string, unknown>): LessonAttemptRecord {
  return {
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
  };
}

function mapSpeakingSessionRow(r: Record<string, unknown>): SpeakingSessionRecord {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    modeId: String(r.mode_id) as SpeakingSessionRecord['modeId'],
    pressureLevel: String(r.pressure_level) as SpeakingSessionRecord['pressureLevel'],
    startedAt: String(r.started_at),
    updatedAt: String(r.updated_at),
    durationSeconds: Number(r.duration_seconds || 0),
    turns: r.turns_json ? JSON.parse(String(r.turns_json)) : [],
    totalMistakesDetected: Number(r.total_mistakes_detected || 0),
  };
}

function mapTransferAttemptRow(r: Record<string, unknown>): TransferAttemptRecord {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    scenarioId: String(r.scenario_id) as TransferAttemptRecord['scenarioId'],
    pressureLevel: String(r.pressure_level) as TransferAttemptRecord['pressureLevel'],
    targetSkillLabelEn: String(r.target_skill_label_en),
    targetSkillLabelBn: String(r.target_skill_label_bn),
    linkedSourceType: String(r.linked_source_type) as TransferAttemptRecord['linkedSourceType'],
    linkedSourceId: r.linked_source_id ? String(r.linked_source_id) : undefined,
    userResponse: String(r.user_response),
    twistPromptShown: r.twist_prompt_shown ? String(r.twist_prompt_shown) : undefined,
    twistResponse: r.twist_response ? String(r.twist_response) : undefined,
    inputChannel: String(r.input_channel) as TransferAttemptRecord['inputChannel'],
    durationSeconds: Number(r.duration_seconds || 0),
    timedOut: Boolean(r.timed_out),
    evaluation: r.evaluation_json ? JSON.parse(String(r.evaluation_json)) : {},
    passed: Boolean(r.passed),
    completedAt: String(r.completed_at),
  };
}

function mapXpRow(r: Record<string, unknown>): XpLedgerEntry {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    idempotencyKey: String(r.idempotency_key),
    sourceType: String(r.source_type) as XpLedgerEntry['sourceType'],
    sourceId: String(r.source_id),
    titleEn: String(r.title_en),
    titleBn: String(r.title_bn),
    detailEn: String(r.detail_en),
    detailBn: String(r.detail_bn),
    xpEarned: Number(r.xp_earned || 0),
    verifiedAt: String(r.verified_at),
  };
}

async function fetchUserMistakes(env: WorkerEnv, userId: string): Promise<MistakeMemoryItem[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM learner_mistakes WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 250`
  )
    .bind(userId)
    .all<Record<string, unknown>>();
  return res.results.map(mapMistakeRow);
}

async function fetchUserXpLedger(env: WorkerEnv, userId: string): Promise<XpLedgerEntry[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM user_xp_events WHERE user_id = ? ORDER BY verified_at DESC LIMIT 250`
  )
    .bind(userId)
    .all<Record<string, unknown>>();
  return res.results.map(mapXpRow);
}

async function awardIdempotentXp(
  env: WorkerEnv,
  userId: string,
  awards: Array<PendingXpAward | null>,
  verifiedAt: string
): Promise<{ xpLedger: XpLedgerEntry[]; newlyAwardedXp: XpLedgerEntry[] }> {
  const newlyAwardedXp: XpLedgerEntry[] = [];

  for (const award of awards) {
    if (!award || award.xpEarned <= 0) continue;
    const existing = await env.DB.prepare(
      `SELECT id FROM user_xp_events WHERE user_id = ? AND idempotency_key = ? LIMIT 1`
    )
      .bind(userId, award.idempotencyKey)
      .first<{ id: string }>();
    if (existing) continue;

    const id = generateRandomId('xp');
    await env.DB.prepare(
      `INSERT OR IGNORE INTO user_xp_events (
        id, user_id, idempotency_key, source_type, source_id, xp_earned,
        title_en, title_bn, detail_en, detail_bn, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        userId,
        award.idempotencyKey,
        award.sourceType,
        award.sourceId,
        award.xpEarned,
        award.titleEn,
        award.titleBn,
        award.detailEn,
        award.detailBn,
        verifiedAt
      )
      .run();

    newlyAwardedXp.push({
      id,
      userId,
      idempotencyKey: award.idempotencyKey,
      sourceType: award.sourceType,
      sourceId: award.sourceId,
      titleEn: award.titleEn,
      titleBn: award.titleBn,
      detailEn: award.detailEn,
      detailBn: award.detailBn,
      xpEarned: award.xpEarned,
      verifiedAt,
    });
  }

  const xpLedger = await fetchUserXpLedger(env, userId);
  return { xpLedger, newlyAwardedXp };
}

async function computeActivitySummary(
  env: WorkerEnv,
  userId: string
): Promise<{
  lessonAttempts: LessonAttemptRecord[];
  speakingSessions: SpeakingSessionRecord[];
  transferAttempts: TransferAttemptRecord[];
  activitySummary: ActivityLedgerSummary;
}> {
  const [lessonsRes, speakingRes, transferRes] = await Promise.all([
    env.DB.prepare(
      `SELECT * FROM lesson_attempts WHERE user_id = ? ORDER BY completed_at ASC LIMIT 250`
    )
      .bind(userId)
      .all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT * FROM speaking_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100`
    )
      .bind(userId)
      .all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT * FROM transfer_attempts WHERE user_id = ? ORDER BY completed_at DESC LIMIT 100`
    )
      .bind(userId)
      .all<Record<string, unknown>>(),
  ]);

  const lessonAttempts = lessonsRes.results.map(mapLessonAttemptRow);
  const speakingSessions = speakingRes.results.map(mapSpeakingSessionRow);
  const transferAttempts = transferRes.results.map(mapTransferAttemptRow);

  const timestamps = [
    ...lessonAttempts.map((a) => a.completedAt),
    ...speakingSessions.map((s) => s.updatedAt),
    ...transferAttempts.map((t) => t.completedAt),
  ];

  const totalSeconds =
    lessonAttempts.reduce((sum, a) => sum + a.durationSeconds, 0) +
    speakingSessions.reduce((sum, s) => sum + s.durationSeconds, 0) +
    transferAttempts.reduce((sum, t) => sum + t.durationSeconds, 0);

  const activitySummary: ActivityLedgerSummary = {
    completedLessons: new Set(lessonAttempts.map((a) => a.lessonId)).size,
    completedSpeakingSessions: speakingSessions.filter((s) => s.turns.length > 0).length,
    completedTransferDrills: transferAttempts.filter((t) => t.passed).length,
    activeStreakDays: computeActiveStreakDays(timestamps),
    totalPracticeMinutes: Math.round(totalSeconds / 60),
  };

  return { lessonAttempts, speakingSessions, transferAttempts, activitySummary };
}

async function upsertLearnerMistake(
  env: WorkerEnv,
  item: {
    userId: string;
    source: MistakeMemoryItem['source'];
    lessonId?: string;
    speakingSessionId?: string;
    domain: string;
    category: string;
    userExample: string;
    correctedExample: string;
    patternEn: string;
    patternBn: string;
    explanationEn: string;
    explanationBn: string;
    severity?: string;
    confidence?: number;
    timestamp: string;
  }
): Promise<MistakeMemoryItem> {
  const existing = await env.DB.prepare(
    `SELECT * FROM learner_mistakes
     WHERE user_id = ? AND LOWER(category) = LOWER(?) AND LOWER(user_example) = LOWER(?)
     LIMIT 1`
  )
    .bind(item.userId, item.category, item.userExample)
    .first<Record<string, unknown>>();

  if (existing) {
    const nextOccurrences = Number(existing.occurrences || 1) + 1;
    await env.DB.prepare(
      `UPDATE learner_mistakes
       SET occurrences = ?, status = 'active', last_seen_at = ?
       WHERE id = ? AND user_id = ?`
    )
      .bind(nextOccurrences, item.timestamp, String(existing.id), item.userId)
      .run();

    const updated = await env.DB.prepare(
      `SELECT * FROM learner_mistakes WHERE id = ? LIMIT 1`
    )
      .bind(String(existing.id))
      .first<Record<string, unknown>>();
    return mapMistakeRow(updated ?? { ...existing, occurrences: nextOccurrences, last_seen_at: item.timestamp });
  }

  const id = generateRandomId('mst');
  await env.DB.prepare(
    `INSERT INTO learner_mistakes (
      id, user_id, source, lesson_id, speaking_session_id, domain, category,
      user_example, corrected_example, pattern_en, pattern_bn, explanation_en,
      explanation_bn, occurrences, severity, confidence, status,
      practice_attempts, consecutive_passes, created_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'active', 0, 0, ?, ?)`
  )
    .bind(
      id,
      item.userId,
      item.source,
      item.lessonId ?? null,
      item.speakingSessionId ?? null,
      item.domain,
      item.category,
      item.userExample,
      item.correctedExample,
      item.patternEn,
      item.patternBn,
      item.explanationEn,
      item.explanationBn,
      item.severity ?? 'medium',
      item.confidence ?? 0.85,
      item.timestamp,
      item.timestamp
    )
    .run();

  return {
    id,
    userId: item.userId,
    source: item.source,
    lessonId: item.lessonId,
    speakingSessionId: item.speakingSessionId,
    domain: item.domain as MistakeMemoryItem['domain'],
    category: item.category,
    userExample: item.userExample,
    correctedExample: item.correctedExample,
    patternEn: item.patternEn,
    patternBn: item.patternBn,
    explanationEn: item.explanationEn,
    explanationBn: item.explanationBn,
    occurrences: 1,
    severity: (item.severity as MistakeMemoryItem['severity']) ?? 'medium',
    confidence: item.confidence ?? 0.85,
    status: 'active',
    practiceAttemptsCount: 0,
    practicePassCount: 0,
    createdAt: item.timestamp,
    lastSeenAt: item.timestamp,
  };
}

export function registerLearnerPersistenceRoutes(app: WorkerApp, deps: WorkerRouteDeps): void {
  const { requireAuth, requireAdmin, writeAuditLog } = deps;

  // 1. POST /api/v1/learners/:userId/diagnostic
  app.post('/api/v1/learners/:userId/diagnostic', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

    const body = (await c.req.json().catch(() => ({}))) as {
      answers?: DiagnosticUserAnswer[];
    };
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return c.json({ error: 'Diagnostic answers array is required.' }, 400);
    }

    const profileRow = await c.env.DB.prepare(
      `SELECT * FROM learner_profiles WHERE user_id = ? LIMIT 1`
    )
      .bind(userId)
      .first<Record<string, unknown>>();

    const selfLevel = (String(profileRow?.self_estimated_level || 'A2') as SelfEstimatedLevel);
    const attemptId = generateRandomId('diag');
    const nowIso = new Date().toISOString();

    const evaluated = evaluateDiagnosticAttempt({
      attemptId,
      userId,
      selfEstimatedLevel: selfLevel,
      answers: body.answers,
      completedAt: nowIso,
    });

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO diagnostic_attempts (
          id, user_id, self_estimated_level, observed_starting_band, total_correct,
          total_questions, recommended_track_en, recommended_track_bn,
          domain_breakdown_json, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        attemptId,
        userId,
        selfLevel,
        evaluated.profile.estimatedStartingBand,
        evaluated.profile.totalCorrect,
        evaluated.profile.totalQuestions,
        evaluated.profile.recommendedTrackEn,
        evaluated.profile.recommendedTrackBn,
        JSON.stringify(evaluated.profile.domainBreakdown),
        nowIso
      ),
      c.env.DB.prepare(
        `UPDATE learner_profiles SET diagnostic_completed = 1, updated_at = ? WHERE user_id = ?`
      ).bind(nowIso, userId),
    ]);

    for (const m of evaluated.mistakes) {
      await upsertLearnerMistake(c.env, {
        userId,
        source: 'diagnostic',
        domain: m.domain,
        category: m.category,
        userExample: m.userExample,
        correctedExample: m.correctedExample,
        patternEn: m.patternEn,
        patternBn: m.patternBn,
        explanationEn: m.explanationEn,
        explanationBn: m.explanationBn,
        severity: m.severity,
        confidence: m.confidence,
        timestamp: nowIso,
      });
    }

    const mistakes = await fetchUserMistakes(c.env, userId);
    const profile = {
      userId,
      preferredUiLanguage: String(profileRow?.preferred_ui_language || 'en'),
      explanationLanguage: String(profileRow?.explanation_language || 'bn'),
      selfEstimatedLevel: selfLevel,
      primaryGoal: String(profileRow?.primary_goal || 'daily_speaking'),
      dailyTimeGoalMinutes: Number(profileRow?.daily_time_goal_minutes || 15),
      spacedRepetitionPreset: String(profileRow?.spaced_repetition_preset || 'standard'),
      privacyConsent: {
        storeMicRecordings: Boolean(profileRow?.store_mic_recordings ?? 1),
        logAiEvaluations: Boolean(profileRow?.log_ai_evaluations ?? 1),
        updatedAt: String(profileRow?.privacy_consent_updated_at || nowIso),
      },
      onboardingCompleted: Boolean(profileRow?.onboarding_completed ?? 0),
      diagnosticCompleted: true,
      updatedAt: nowIso,
    };

    return c.json({
      profile,
      diagnostic: evaluated.profile,
      mistakes,
    });
  });

  // 2. POST /api/v1/learners/:userId/exercise-attempts
  app.post('/api/v1/learners/:userId/exercise-attempts', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

    const payload = (await c.req.json().catch(() => ({}))) as Partial<RecordExerciseAttemptPayload>;
    if (!payload.lessonId || !payload.exerciseId || !payload.stage) {
      return c.json({ error: 'lessonId, stage, and exerciseId are required.' }, 400);
    }

    const id = generateRandomId('exa');
    const createdAt = payload.timestamp || new Date().toISOString();
    const isCorrect = Boolean(payload.isCorrect);

    await c.env.DB.prepare(
      `INSERT INTO exercise_attempts (
        id, user_id, lesson_id, stage, exercise_id, exercise_type,
        user_response, expected_answer, is_correct, mistake_category, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        userId,
        payload.lessonId,
        payload.stage,
        payload.exerciseId,
        payload.exerciseType || 'mcq',
        payload.userResponse || '',
        payload.expectedAnswer || '',
        isCorrect ? 1 : 0,
        payload.mistakeCategory || 'Grammar',
        createdAt
      )
      .run();

    let loggedMistake: MistakeMemoryItem | null = null;
    if (!isCorrect && payload.userResponse && payload.expectedAnswer) {
      loggedMistake = await upsertLearnerMistake(c.env, {
        userId,
        source: payload.mistakeSource || 'lesson_assessment',
        lessonId: payload.lessonId,
        domain: payload.domain || 'grammar',
        category: payload.mistakeCategory || 'Grammar',
        userExample: payload.userResponse,
        correctedExample: payload.expectedAnswer,
        patternEn: payload.patternEn || payload.mistakeCategory || 'Grammar Pattern',
        patternBn: payload.patternBn || 'ব্যাকরণগত ভুল',
        explanationEn: payload.explanationEn || 'Review this sentence pattern.',
        explanationBn: payload.explanationBn || 'এই বাক্য গঠনটি পুনরায় অনুশীলন করুন।',
        timestamp: createdAt,
      });
    }

    const mistakes = await fetchUserMistakes(c.env, userId);
    return c.json({
      exerciseAttempt: {
        id,
        userId,
        lessonId: payload.lessonId,
        stage: payload.stage,
        exerciseId: payload.exerciseId,
        exerciseType: payload.exerciseType || 'mcq',
        userResponse: payload.userResponse || '',
        expectedAnswer: payload.expectedAnswer || '',
        isCorrect,
        mistakeCategory: payload.mistakeCategory || 'Grammar',
        timestamp: createdAt,
      },
      mistakes,
      loggedMistake,
    });
  });

  // 3. POST /api/v1/learners/:userId/lesson-attempts
  app.post('/api/v1/learners/:userId/lesson-attempts', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

    const payload = (await c.req.json().catch(() => ({}))) as Partial<RecordLessonAttemptPayload>;
    if (!payload.lessonId) {
      return c.json({ error: 'lessonId is required.' }, 400);
    }

    const id = generateRandomId('la');
    const completedAt = payload.completedAt || new Date().toISOString();
    const startedAt = payload.startedAt || completedAt;
    const guidedCorrect = Number(payload.guidedCorrect || 0);
    const guidedTotal = Number(payload.guidedTotal || 0);
    const independentCorrect = Number(payload.independentCorrect || 0);
    const independentTotal = Number(payload.independentTotal || 0);
    const assessmentCorrect = Number(payload.assessmentCorrect || 0);
    const assessmentTotal = Number(payload.assessmentTotal || 0);
    const totalItems = guidedTotal + independentTotal + assessmentTotal;
    const totalCorrect = guidedCorrect + independentCorrect + assessmentCorrect;
    const overallAccuracyPercent =
      totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

    await c.env.DB.prepare(
      `INSERT INTO lesson_attempts (
        id, user_id, lesson_id, started_at, completed_at, duration_seconds,
        guided_correct, guided_total, independent_correct, independent_total,
        assessment_correct, assessment_total, overall_accuracy_percent, mistakes_logged_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        userId,
        payload.lessonId,
        startedAt,
        completedAt,
        Math.max(0, Math.round(Number(payload.durationSeconds || 0))),
        guidedCorrect,
        guidedTotal,
        independentCorrect,
        independentTotal,
        assessmentCorrect,
        assessmentTotal,
        overallAccuracyPercent,
        Number(payload.mistakesLoggedCount || 0)
      )
      .run();

    const profileRow = await c.env.DB.prepare(
      `SELECT spaced_repetition_preset FROM learner_profiles WHERE user_id = ? LIMIT 1`
    )
      .bind(userId)
      .first<{ spaced_repetition_preset: string }>();
    const preset = (profileRow?.spaced_repetition_preset || 'standard') as SpacedRepetitionPreset;

    const { lessonAttempts, activitySummary } = await computeActivitySummary(c.env, userId);

    const lessonMastery: Record<string, LessonMasteryRecord> = {};
    const uniqueLessonIds = Array.from(new Set(lessonAttempts.map((a) => a.lessonId)));
    for (const lid of uniqueLessonIds) {
      const m = calculateLessonMastery({
        userId,
        lessonId: lid,
        attempts: lessonAttempts,
        schedulePreset: preset,
      });
      if (m) lessonMastery[lid] = m;
    }

    const lessonMeta = getLessonById(payload.lessonId);
    const titleEn = lessonMeta?.titleEn ?? payload.lessonId;
    const titleBn = lessonMeta?.titleBn ?? payload.lessonId;
    const activeMastery = lessonMastery[payload.lessonId];

    const { xpLedger, newlyAwardedXp } = await awardIdempotentXp(
      c.env,
      userId,
      [
        buildLessonCompletionXpAward(payload.lessonId, titleEn, titleBn, overallAccuracyPercent),
        activeMastery
          ? buildLessonMasteryTierXpAward(
              payload.lessonId,
              titleEn,
              titleBn,
              activeMastery.status,
              activeMastery.masteryPercent
            )
          : null,
      ],
      completedAt
    );

    const lessonAttempt: LessonAttemptRecord = {
      id,
      userId,
      lessonId: payload.lessonId,
      startedAt,
      completedAt,
      durationSeconds: Math.max(0, Math.round(Number(payload.durationSeconds || 0))),
      guidedCorrect,
      guidedTotal,
      independentCorrect,
      independentTotal,
      assessmentCorrect,
      assessmentTotal,
      overallAccuracyPercent,
      mistakesLoggedCount: Number(payload.mistakesLoggedCount || 0),
    };

    return c.json({
      lessonAttempt,
      lessonAttempts,
      lessonMastery,
      xpLedger,
      newlyAwardedXp,
      activitySummary,
    });
  });

  // 4. POST /api/v1/learners/:userId/speaking-sessions
  app.post('/api/v1/learners/:userId/speaking-sessions', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

    const payload = (await c.req.json().catch(() => ({}))) as Partial<SaveSpeakingSessionPayload>;
    if (!payload.sessionId || !payload.modeId || !Array.isArray(payload.turns)) {
      return c.json({ error: 'sessionId, modeId, and turns are required.' }, 400);
    }

    const updatedAt = payload.updatedAt || new Date().toISOString();
    const startedAt = payload.startedAt || updatedAt;
    const totalMistakesDetected = payload.turns.reduce(
      (sum, t) => sum + (t.evaluation?.mistakes?.length ?? 0),
      0
    );

    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO speaking_sessions (
        id, user_id, mode_id, pressure_level, started_at, updated_at,
        duration_seconds, turns_json, total_mistakes_detected
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        payload.sessionId,
        userId,
        payload.modeId,
        payload.pressureLevel || 'level_2_guided',
        startedAt,
        updatedAt,
        Math.max(0, Math.round(Number(payload.durationSeconds || 0))),
        JSON.stringify(payload.turns),
        totalMistakesDetected
      )
      .run();

    // Only log mistakes from the newlyEvaluatedTurnId to prevent double-counting on updates
    if (payload.newlyEvaluatedTurnId) {
      const targetTurn = payload.turns.find((t) => t.id === payload.newlyEvaluatedTurnId);
      const detected = targetTurn?.evaluation?.mistakes ?? [];
      for (const m of detected) {
        if ((m.confidence ?? 0) < MISTAKE_MEMORY_MIN_CONFIDENCE) continue;
        await upsertLearnerMistake(c.env, {
          userId,
          source: 'speaking_studio',
          speakingSessionId: payload.sessionId,
          domain: mapMistakeCategoryToDomain(m.category),
          category: m.category,
          userExample: m.original,
          correctedExample: m.corrected,
          patternEn: `${m.category}: "${m.original}" → "${m.corrected}"`,
          patternBn: `${m.category}: "${m.original}" → "${m.corrected}"`,
          explanationEn: m.explanation_en,
          explanationBn: m.explanation_bn,
          severity: m.severity,
          confidence: m.confidence,
          timestamp: updatedAt,
        });
      }
    }

    const scenario = getSpeakingScenario(payload.modeId);
    const { speakingSessions, activitySummary } = await computeActivitySummary(c.env, userId);
    const mistakes = await fetchUserMistakes(c.env, userId);
    const { xpLedger, newlyAwardedXp } = await awardIdempotentXp(
      c.env,
      userId,
      [
        buildSpeakingSessionXpAward(
          payload.sessionId,
          scenario.titleEn,
          scenario.titleBn,
          payload.turns.length
        ),
      ],
      updatedAt
    );

    const session: SpeakingSessionRecord = {
      id: payload.sessionId,
      userId,
      modeId: payload.modeId,
      pressureLevel: payload.pressureLevel || 'level_2_guided',
      startedAt,
      updatedAt,
      durationSeconds: Math.max(0, Math.round(Number(payload.durationSeconds || 0))),
      turns: payload.turns,
      totalMistakesDetected,
    };

    return c.json({
      session,
      speakingSessions,
      mistakes,
      xpLedger,
      newlyAwardedXp,
      activitySummary,
    });
  });

  // 5. GET /api/v1/learners/:userId/mistakes
  app.get('/api/v1/learners/:userId/mistakes', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

    const mistakes = await fetchUserMistakes(c.env, userId);
    return c.json(mistakes);
  });

  // 6. POST /api/v1/learners/:userId/mistakes/:mistakeId/drill-attempts
  app.post('/api/v1/learners/:userId/mistakes/:mistakeId/drill-attempts', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    const mistakeId = c.req.param('mistakeId');
    if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

    const payload = (await c.req.json().catch(() => ({}))) as Partial<RecordMistakeDrillPayload>;
    const existingRow = await c.env.DB.prepare(
      `SELECT * FROM learner_mistakes WHERE id = ? AND user_id = ? LIMIT 1`
    )
      .bind(mistakeId, userId)
      .first<Record<string, unknown>>();
    if (!existingRow) {
      return c.json({ error: 'Mistake record not found.' }, 404);
    }

    const profileRow = await c.env.DB.prepare(
      `SELECT spaced_repetition_preset FROM learner_profiles WHERE user_id = ? LIMIT 1`
    )
      .bind(userId)
      .first<{ spaced_repetition_preset: string }>();
    const preset = (profileRow?.spaced_repetition_preset || 'standard') as SpacedRepetitionPreset;

    const nowIso = payload.timestamp || new Date().toISOString();
    const existingMistake = mapMistakeRow(existingRow);
    const passed = Boolean(payload.passed);
    const nextReview = computeNextMistakeReview(existingMistake, passed, preset, nowIso);

    const drillId = generateRandomId('mdr');
    const reviewId = generateRandomId('mrv');

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO mistake_drill_attempts (
          id, user_id, mistake_id, passed, user_rewrite, expected_answer, duration_seconds, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        drillId,
        userId,
        mistakeId,
        passed ? 1 : 0,
        payload.userRewrite || '',
        payload.expectedAnswer || existingMistake.correctedExample,
        Math.max(0, Math.round(Number(payload.durationSeconds || 0))),
        nowIso
      ),
      c.env.DB.prepare(
        `INSERT INTO mistake_reviews (
          id, user_id, mistake_id, passed, interval_days, next_review_at, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        reviewId,
        userId,
        mistakeId,
        passed ? 1 : 0,
        nextReview.reviewIntervalDays,
        nextReview.nextReviewAt,
        nowIso
      ),
      c.env.DB.prepare(
        `UPDATE learner_mistakes
         SET status = ?, practice_attempts = ?, consecutive_passes = ?,
             last_practiced_at = ?, next_review_at = ?
         WHERE id = ? AND user_id = ?`
      ).bind(
        nextReview.status,
        nextReview.practiceAttemptsCount,
        nextReview.practicePassCount,
        nextReview.lastPracticedAt,
        nextReview.nextReviewAt,
        mistakeId,
        userId
      ),
    ]);

    const updatedMistake: MistakeMemoryItem = {
      ...existingMistake,
      status: nextReview.status,
      practiceAttemptsCount: nextReview.practiceAttemptsCount,
      practicePassCount: nextReview.practicePassCount,
      reviewIntervalDays: nextReview.reviewIntervalDays,
      lastPracticedAt: nextReview.lastPracticedAt,
      nextReviewAt: nextReview.nextReviewAt,
    };

    const drillsRes = await c.env.DB.prepare(
      `SELECT * FROM mistake_drill_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`
    )
      .bind(userId)
      .all<Record<string, unknown>>();

    const mistakeDrillAttempts: MistakeDrillAttemptRecord[] = drillsRes.results.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      mistakeId: String(r.mistake_id),
      passed: Boolean(r.passed),
      userRewrite: String(r.user_rewrite),
      expectedAnswer: String(r.expected_answer),
      durationSeconds: Number(r.duration_seconds || 0),
      timestamp: String(r.created_at),
    }));

    const mistakes = await fetchUserMistakes(c.env, userId);
    const { activitySummary } = await computeActivitySummary(c.env, userId);
    const { xpLedger, newlyAwardedXp } = await awardIdempotentXp(
      c.env,
      userId,
      [buildMistakeResolvedXpAward(updatedMistake)],
      nowIso
    );

    return c.json({
      drillAttempt: {
        id: drillId,
        userId,
        mistakeId,
        passed,
        userRewrite: payload.userRewrite || '',
        expectedAnswer: payload.expectedAnswer || existingMistake.correctedExample,
        durationSeconds: Math.max(0, Math.round(Number(payload.durationSeconds || 0))),
        timestamp: nowIso,
      },
      mistakeDrillAttempts,
      updatedMistake,
      mistakes,
      xpLedger,
      newlyAwardedXp,
      activitySummary,
    });
  });

  // 7. POST /api/v1/learners/:userId/mistakes/:mistakeId/false-correction
  app.post('/api/v1/learners/:userId/mistakes/:mistakeId/false-correction', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    const mistakeId = c.req.param('mistakeId');
    if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

    const payload = (await c.req.json().catch(() => ({}))) as Partial<ReportFalseCorrectionPayload>;
    const existingRow = await c.env.DB.prepare(
      `SELECT * FROM learner_mistakes WHERE id = ? AND user_id = ? LIMIT 1`
    )
      .bind(mistakeId, userId)
      .first<Record<string, unknown>>();
    if (!existingRow) {
      return c.json({ error: 'Mistake record not found.' }, 404);
    }

    const nowIso = payload.timestamp || new Date().toISOString();
    const reported = payload.reported !== false;
    const reason = (payload.reason || 'Learner flagged as false correction').trim().slice(0, 500);

    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE learner_mistakes
         SET false_correction_reported = ?, false_correction_reason = ?,
             false_correction_reported_at = ?, admin_review_status = ?
         WHERE id = ? AND user_id = ?`
      ).bind(
        reported ? 1 : 0,
        reported ? reason : null,
        reported ? nowIso : null,
        reported ? 'pending' : null,
        mistakeId,
        userId
      ),
      ...(reported
        ? [
            c.env.DB.prepare(
              `INSERT INTO reported_mistakes (
                id, mistake_id, reporter_user_id, reason, review_status, created_at
              ) VALUES (?, ?, ?, ?, 'pending', ?)`
            ).bind(generateRandomId('rpt'), mistakeId, userId, reason, nowIso),
          ]
        : []),
    ]);

    const updatedRow = await c.env.DB.prepare(
      `SELECT * FROM learner_mistakes WHERE id = ? LIMIT 1`
    )
      .bind(mistakeId)
      .first<Record<string, unknown>>();

    const mistakes = await fetchUserMistakes(c.env, userId);
    return c.json({
      updatedMistake: mapMistakeRow(updatedRow ?? existingRow),
      mistakes,
    });
  });

  // 8. POST /api/v1/learners/:userId/transfer-attempts
  app.post('/api/v1/learners/:userId/transfer-attempts', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');
    if (auth.id !== userId) return c.json({ error: 'Forbidden' }, 403);

    const payload = (await c.req.json().catch(() => ({}))) as Partial<RecordTransferAttemptPayload>;
    if (!payload.scenarioId || !payload.evaluation) {
      return c.json({ error: 'scenarioId and evaluation are required.' }, 400);
    }

    const id = generateRandomId('tra');
    const completedAt = payload.completedAt || new Date().toISOString();
    const passed = Boolean(payload.evaluation.passed);
    const overallScore = Number(payload.evaluation.overall_score || 0);

    // Store transcript inside evaluation_json if present so Communication Replay has full history
    const persistedEvaluation = {
      ...payload.evaluation,
      ...(Array.isArray(payload.transcript) ? { transcript: payload.transcript } : {}),
    };

    await c.env.DB.prepare(
      `INSERT INTO transfer_attempts (
        id, user_id, scenario_id, pressure_level, target_skill_label_en, target_skill_label_bn,
        linked_source_type, linked_source_id, user_response, twist_prompt_shown, twist_response,
        input_channel, duration_seconds, timed_out, overall_score, evaluation_json, passed, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        userId,
        payload.scenarioId,
        payload.pressureLevel || 'level_3_open',
        payload.targetSkillLabelEn || 'Real-world English Transfer',
        payload.targetSkillLabelBn || 'বাস্তব ইংরেজি প্রয়োগ',
        payload.linkedSourceType || 'baseline',
        payload.linkedSourceId ?? null,
        payload.userResponse || '',
        payload.twistPromptShown ?? null,
        payload.twistResponse ?? null,
        payload.inputChannel || 'text_fallback',
        Math.max(0, Math.round(Number(payload.durationSeconds || 0))),
        payload.timedOut ? 1 : 0,
        overallScore,
        JSON.stringify(persistedEvaluation),
        passed ? 1 : 0,
        completedAt
      )
      .run();

    for (const m of payload.evaluation.detected_mistakes ?? []) {
      if ((m.confidence ?? 0) < MISTAKE_MEMORY_MIN_CONFIDENCE) continue;
      await upsertLearnerMistake(c.env, {
        userId,
        source: 'speaking_studio',
        domain: mapMistakeCategoryToDomain(m.category),
        category: m.category,
        userExample: m.original,
        correctedExample: m.corrected,
        patternEn: `${m.category}: "${m.original}" → "${m.corrected}"`,
        patternBn: `${m.category}: "${m.original}" → "${m.corrected}"`,
        explanationEn: m.explanation_en,
        explanationBn: m.explanation_bn,
        severity: m.severity,
        confidence: m.confidence,
        timestamp: completedAt,
      });
    }

    const scenario = getTransferUniverseScenario(payload.scenarioId);
    const { transferAttempts, activitySummary } = await computeActivitySummary(c.env, userId);
    const mistakes = await fetchUserMistakes(c.env, userId);
    const { xpLedger, newlyAwardedXp } = await awardIdempotentXp(
      c.env,
      userId,
      [
        buildTransferPassXpAward(
          payload.scenarioId,
          scenario?.titleEn ?? payload.scenarioId,
          scenario?.titleBn ?? payload.scenarioId,
          payload.pressureLevel || 'level_3_open',
          overallScore,
          passed
        ),
      ],
      completedAt
    );

    const transferAttempt: TransferAttemptRecord = {
      id,
      userId,
      scenarioId: payload.scenarioId,
      pressureLevel: payload.pressureLevel || 'level_3_open',
      targetSkillLabelEn: payload.targetSkillLabelEn || 'Real-world English Transfer',
      targetSkillLabelBn: payload.targetSkillLabelBn || 'বাস্তব ইংরেজি প্রয়োগ',
      linkedSourceType: payload.linkedSourceType || 'baseline',
      linkedSourceId: payload.linkedSourceId,
      userResponse: payload.userResponse || '',
      twistPromptShown: payload.twistPromptShown,
      twistResponse: payload.twistResponse,
      inputChannel: payload.inputChannel || 'text_fallback',
      durationSeconds: Math.max(0, Math.round(Number(payload.durationSeconds || 0))),
      timedOut: Boolean(payload.timedOut),
      evaluation: payload.evaluation,
      transcript: payload.transcript,
      passed,
      completedAt,
    };

    return c.json({
      transferAttempt,
      transferAttempts,
      mistakes,
      xpLedger,
      newlyAwardedXp,
      activitySummary,
    });
  });

  // 9. POST /api/v1/admin/curriculum/modules
  app.post('/api/v1/admin/curriculum/modules', async (c) => {
    const admin = await requireAdmin(c, ['super_admin', 'admin', 'content_manager']);
    if (admin instanceof Response) return admin;

    const mod = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const courseId = String(mod.courseId || '').trim();
    if (!courseId) {
      return c.json({ error: 'courseId is required.' }, 400);
    }

    const id = String(mod.id || generateRandomId('mod'));
    const nowIso = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO modules (
        id, course_id, sort_order, title_en, title_bn, description_en, description_bn, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        courseId,
        Number(mod.order || 1),
        String(mod.titleEn || ''),
        String(mod.titleBn || ''),
        String(mod.descriptionEn || ''),
        String(mod.descriptionBn || ''),
        nowIso
      )
      .run();

    await writeAuditLog(c.env, {
      actorUserId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'curriculum.module_published',
      resourceType: 'curriculum',
      resourceId: id,
      summaryEn: `Published module "${String(mod.titleEn || id)}" under course ${courseId}.`,
      summaryBn: `${courseId} কোর্সে "${String(mod.titleBn || id)}" মডিউল প্রকাশ করা হয়েছে।`,
    });

    return c.json({ id, courseId });
  });
}
