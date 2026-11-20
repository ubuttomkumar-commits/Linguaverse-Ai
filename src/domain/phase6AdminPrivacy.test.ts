import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateAiOpsMetrics,
  buildLearnerDataExportPayload,
  buildPublishedCourse,
  buildPublishedLesson,
  buildPublishedModule,
  createAuditLogEntry,
  hasAdminPermission,
} from './adminGovernanceEngine';
import { mergeCurriculumWithOverlay } from '../services/curriculumStore';
import { CURRICULUM_COURSES } from './curriculumData';
import { LocalPersistenceRepository } from '../services/storage/localRepository';
import type { AiTelemetryEvent, CustomCurriculumOverlay } from '../types/domain';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

describe('Phase 6: RBAC Permissions & Governance Engine', () => {
  it('blocks learner role from all admin capabilities while separating content_manager, ai_ops, and admin', () => {
    assert.equal(hasAdminPermission('learner', 'admin:access'), false);
    assert.equal(hasAdminPermission('learner', 'curriculum:write'), false);
    assert.equal(hasAdminPermission('learner', 'ai_ops:read'), false);

    assert.equal(hasAdminPermission('content_manager', 'admin:access'), true);
    assert.equal(hasAdminPermission('content_manager', 'curriculum:write'), true);
    assert.equal(hasAdminPermission('content_manager', 'ai_ops:read'), false);

    assert.equal(hasAdminPermission('ai_ops', 'admin:access'), true);
    assert.equal(hasAdminPermission('ai_ops', 'ai_ops:read'), true);
    assert.equal(hasAdminPermission('ai_ops', 'curriculum:write'), false);

    assert.equal(hasAdminPermission('admin', 'admin:access'), true);
    assert.equal(hasAdminPermission('admin', 'curriculum:write'), true);
    assert.equal(hasAdminPermission('admin', 'ai_ops:read'), true);
    assert.equal(hasAdminPermission('admin', 'mistakes:review'), true);
    assert.equal(hasAdminPermission('admin', 'audit:read'), true);
    assert.equal(hasAdminPermission('admin', 'rbac:manage'), true);
  });

  it('returns strict zeros for AI Ops metrics when zero calls have been recorded', () => {
    const metrics = aggregateAiOpsMetrics([]);
    assert.equal(metrics.totalCalls, 0);
    assert.equal(metrics.errorCalls, 0);
    assert.equal(metrics.avgLatencyMs, 0);
    assert.equal(metrics.p95LatencyMs, 0);
    assert.equal(metrics.totalInputTokens, 0);
    assert.equal(metrics.totalOutputTokens, 0);
    assert.equal(metrics.totalEstimatedCostUsd, 0);
    assert.equal(metrics.promptVersionsUsed.length, 0);
  });

  it('aggregates real AI telemetry events accurately across success and error calls', () => {
    const events: AiTelemetryEvent[] = [
      {
        id: 'tel_1',
        correlationId: 'ai_1',
        endpoint: 'speaking_evaluate',
        model: 'gemini-4-hydrogen',
        promptVersion: 'speaking-eval-v3.2',
        status: 'success',
        latencyMs: 920,
        estimatedInputTokens: 400,
        estimatedOutputTokens: 200,
        estimatedCostUsd: 0.00012,
        timestamp: '2026-06-01T10:00:00.000Z',
      },
      {
        id: 'tel_2',
        correlationId: 'ai_2',
        endpoint: 'transfer_evaluate',
        model: 'gemini-3.1-flash-lite',
        promptVersion: 'transfer-rubric-v5.1',
        status: 'error',
        latencyMs: 2400,
        estimatedInputTokens: 300,
        estimatedOutputTokens: 0,
        estimatedCostUsd: 0,
        errorCode: 'TIMEOUT',
        errorMessage: 'Timed out',
        timestamp: '2026-06-01T10:01:00.000Z',
      },
    ];

    const metrics = aggregateAiOpsMetrics(events);
    assert.equal(metrics.totalCalls, 2);
    assert.equal(metrics.successCalls, 1);
    assert.equal(metrics.errorCalls, 1);
    assert.equal(metrics.errorRatePercent, 50);
    assert.equal(metrics.avgLatencyMs, 1660);
    assert.equal(metrics.p95LatencyMs, 2400);
    assert.equal(metrics.totalInputTokens, 700);
    assert.equal(metrics.totalOutputTokens, 200);
    assert.equal(metrics.promptVersionsUsed.length, 2);
    assert.equal(metrics.recentErrors.length, 1);
  });

  it('merges Admin-published course, module, and playable 7-stage lesson cleanly with static curriculum', () => {
    const course = buildPublishedCourse({
      id: 'course_custom_ielts',
      order: 4,
      cefrRange: 'B1 – B2',
      titleEn: 'IELTS Speaking Part 2 Precision',
      titleBn: 'IELTS স্পিকিং পার্ট ২ নির্ভুলতা',
      subtitleEn: 'Organize 2-minute cue card answers naturally.',
      subtitleBn: '২ মিনিটের কিউ কার্ড উত্তর গুছিয়ে বলুন।',
      targetAudienceEn: 'IELTS candidates',
      targetAudienceBn: 'IELTS পরীক্ষার্থী',
    });
    const mod = buildPublishedModule({
      id: 'mod_custom_cue',
      courseId: course.id,
      order: 1,
      titleEn: 'Module 1: Story Transitions',
      titleBn: 'মডিউল ১: গল্পের সংযোগ',
      descriptionEn: 'Connect past events smoothly.',
      descriptionBn: 'অতীতের ঘটনাগুলো সাবলীলভাবে যুক্ত করুন।',
    });
    const lesson = buildPublishedLesson({
      id: 'les_custom_polite',
      courseId: course.id,
      moduleId: mod.id,
      order: 1,
      cefrBand: 'B1',
      estimatedMinutes: 8,
      titleEn: 'Polite Client Requests',
      titleBn: 'ক্লায়েন্টকে ভদ্র অনুরোধ',
      summaryEn: 'Replace blunt imperatives with Could you please.',
      summaryBn: 'সরাসরি আদেশের বদলে Could you please ব্যবহার করুন।',
      conceptRuleEn: 'Use Could you please + base verb for polite requests.',
      conceptRuleBn: 'ভদ্র অনুরোধে Could you please + base verb ব্যবহার করুন।',
      banglaInterferenceEn: 'Direct Bangla translation sounds abrupt in English.',
      banglaInterferenceBn: 'বাংলা থেকে সরাসরি অনুবাদ করলে কঠোর শোনায়।',
      commonTrap: 'Send me the report fast.',
      naturalEnglish: 'Could you please send me the report by 4 PM?',
      banglaExampleMeaning: 'বিকেল ৪টার মধ্যে রিপোর্টটি কি পাঠাতে পারবেন?',
      targetCategory: 'Collocation',
    });

    const overlay: CustomCurriculumOverlay = {
      schemaVersion: 1,
      catalogVersion: 4,
      customCourses: [course],
      customModules: [mod],
      customLessons: [lesson],
      updatedAt: '2026-06-01T12:00:00.000Z',
    };

    const merged = mergeCurriculumWithOverlay(CURRICULUM_COURSES, overlay);
    assert.equal(merged.length, CURRICULUM_COURSES.length + 1);
    const addedCourse = merged.find((c) => c.id === 'course_custom_ielts');
    assert.ok(addedCourse);
    assert.equal(addedCourse.modules.length, 1);
    assert.equal(addedCourse.modules[0].lessons.length, 1);
    const publishedLesson = addedCourse.modules[0].lessons[0];
    assert.equal(publishedLesson.guidedExercises.length, 1);
    assert.equal(publishedLesson.independentExercises.length, 1);
    assert.equal(publishedLesson.assessmentQuestions.length, 2);
  });

  it('creates immutable audit entries and structured JSON data export payloads', () => {
    const audit = createAuditLogEntry({
      actorUserId: 'usr_1',
      actorEmail: 'admin@linguaverse.ai',
      actorRole: 'admin',
      action: 'privacy.data_exported',
      resourceType: 'data_export',
      resourceId: 'usr_1',
      summaryEn: 'Exported JSON learning archive.',
      summaryBn: 'লার্নিং ডেটা এক্সপোর্ট করা হয়েছে।',
    });
    assert.ok(audit.correlationId.startsWith('aud_'));
    assert.ok(audit.id.startsWith('log_'));

    const exportPayload = buildLearnerDataExportPayload({
      account: {
        id: 'usr_1',
        name: 'Nadia Rahman',
        email: 'nadia@example.com',
        plan: 'free',
        role: 'learner',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      profile: null,
      activitySummary: {
        completedLessons: 0,
        completedSpeakingSessions: 0,
        completedTransferDrills: 0,
        activeStreakDays: 0,
        totalPracticeMinutes: 0,
      },
      latestDiagnostic: null,
      lessonMastery: {},
      lessonAttempts: [],
      exerciseAttempts: [],
      speakingSessions: [],
      mistakes: [],
      mistakeDrillAttempts: [],
      transferAttempts: [],
      xpLedger: [],
      storedAudioRecordingKeys: ['audio_sess_1_turn_1'],
    });
    assert.equal(exportPayload.schema, 'linguaverse-learner-export/v1');
    assert.equal(exportPayload.storedAudioRecordingKeys.length, 1);
    assert.ok(exportPayload.correlationId.startsWith('exp_'));
  });

  it('persists role, privacy consents, and admin triage of flagged mistakes in LocalPersistenceRepository', async () => {
    const repo = new LocalPersistenceRepository(createMemoryStorage());
    const auth = await repo.register({
      name: 'Arif Hasan',
      email: 'arif@example.com',
      password: 'Password123!',
    });

    assert.equal(auth.user.role, 'learner');
    assert.equal(auth.profile.privacyConsent?.storeMicRecordings, true);

    const updated = await repo.updateProfile(auth.user.id, {
      role: 'admin',
      privacyConsent: {
        storeMicRecordings: false,
        logAiEvaluations: false,
        updatedAt: '2026-06-01T12:00:00.000Z',
      },
    });
    assert.equal(updated.user.role, 'admin');
    assert.equal(updated.profile.privacyConsent?.storeMicRecordings, false);
    assert.equal(updated.profile.privacyConsent?.logAiEvaluations, false);

    const exRes = await repo.recordExerciseAttempt(auth.user.id, {
      lessonId: 'les_svo_order',
      stage: 'guided',
      exerciseId: 'ex_1',
      exerciseType: 'fill_blank',
      userResponse: 'I discuss about budget',
      expectedAnswer: 'I discuss the budget',
      isCorrect: false,
      mistakeCategory: 'Preposition',
      domain: 'grammar',
      patternEn: 'Redundant preposition after discuss',
      patternBn: 'discuss এর পর অপ্রয়োজনীয় preposition',
      explanationEn: 'Discuss takes a direct object.',
      explanationBn: 'Discuss এর পর সরাসরি object বসে।',
      mistakeSource: 'lesson_guided',
    });
    assert.ok(exRes.loggedMistake);

    await repo.reportFalseCorrection(auth.user.id, {
      mistakeId: exRes.loggedMistake.id,
      reported: true,
      reason: 'Colloquial context test',
    });

    const flagged = await repo.getFlaggedMistakes();
    assert.equal(flagged.length, 1);
    assert.equal(flagged[0].falseCorrectionReported, true);

    const reviewed = await repo.reviewFlaggedMistake({
      mistakeId: exRes.loggedMistake.id,
      decision: 'confirmed_accurate',
      note: 'Verified grammar rule applies here.',
      reviewerEmail: 'arif@example.com',
    });
    assert.equal(reviewed.updatedMistake.adminReviewStatus, 'confirmed_accurate');
    assert.equal(reviewed.updatedMistake.falseCorrectionReported, false);
  });
});
