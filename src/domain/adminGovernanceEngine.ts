import type {
  ActivityLedgerSummary,
  AdminPermission,
  AdminRole,
  AiTelemetryEvent,
  AuditLogEntry,
  AuditResourceType,
  CurriculumCourse,
  CurriculumLesson,
  CurriculumModule,
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeCategory,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  PrivacyConsentSettings,
  SpeakingSessionRecord,
  TransferAttemptRecord,
  UserAccount,
  XpLedgerEntry,
} from '../types/domain';

export const DEFAULT_PRIVACY_CONSENT: PrivacyConsentSettings = {
  storeMicRecordings: true,
  logAiEvaluations: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const ROLE_PERMISSION_MATRIX: Record<AdminRole, AdminPermission[]> = {
  learner: [],
  content_manager: ['admin:access', 'curriculum:write', 'mistakes:review', 'audit:read'],
  ai_ops: ['admin:access', 'ai_ops:read', 'mistakes:review', 'audit:read'],
  admin: [
    'admin:access',
    'curriculum:write',
    'ai_ops:read',
    'mistakes:review',
    'audit:read',
    'rbac:manage',
  ],
};

export const ADMIN_ROLE_LABELS: Record<
  AdminRole,
  { en: string; bn: string; descEn: string; descBn: string }
> = {
  admin: {
    en: 'Super Admin',
    bn: 'সুপার অ্যাডমিন',
    descEn: 'Full governance access across Curriculum Builder, AI Ops, Mistake Queue, and Audit Logs.',
    descBn: 'কারিকুলাম বিল্ডার, AI Ops, রিপোর্টকৃত ভুল ও অডিট লগের সম্পূর্ণ অনুমতি।',
  },
  content_manager: {
    en: 'Content Manager',
    bn: 'কন্টেন্ট ম্যানেজার',
    descEn: 'Can create, version, and publish courses/lessons and triage flagged corrections. No AI cost controls.',
    descBn: 'কোর্স ও লেসন তৈরি/প্রকাশ এবং ভুল যাচাই করতে পারবেন; AI খরচ মনিটরিং সীমাবদ্ধ।',
  },
  ai_ops: {
    en: 'AI Ops Engineer',
    bn: 'AI Ops ইঞ্জিনিয়ার',
    descEn: 'Can inspect AI latency, token cost, prompt versions, error logs, and flagged AI mistakes. Read-only curriculum.',
    descBn: 'AI ল্যাটেন্সি, টোকেন খরচ, প্রম্পট ভার্সন ও ভুল সংশোধন রিভিউ করতে পারবেন।',
  },
  learner: {
    en: 'Learner (No Admin Access)',
    bn: 'শিক্ষার্থী (অ্যাডমিন অনুমতি নেই)',
    descEn: 'Standard learner account — strictly blocked from all /admin write and ops controls.',
    descBn: 'সাধারণ শিক্ষার্থী অ্যাকাউন্ট — /admin প্যানেলের সব নিয়ন্ত্রণ থেকে সুরক্ষিতভাবে ব্লকড।',
  },
};

export function hasAdminPermission(
  role: AdminRole | undefined,
  permission: AdminPermission
): boolean {
  const effective: AdminRole = role ?? 'learner';
  return ROLE_PERMISSION_MATRIX[effective].includes(permission);
}

export function generateCorrelationId(prefix = 'corr'): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}`;
}

export function createAuditLogEntry(input: {
  actorUserId: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  resourceType: AuditResourceType;
  resourceId: string;
  summaryEn: string;
  summaryBn: string;
  metadata?: Record<string, string | number | boolean>;
  correlationId?: string;
  timestamp?: string;
}): AuditLogEntry {
  const correlationId = input.correlationId ?? generateCorrelationId('aud');
  return {
    id: generateCorrelationId('log'),
    correlationId,
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    summaryEn: input.summaryEn,
    summaryBn: input.summaryBn,
    metadata: input.metadata,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export interface AiOpsSummaryMetrics {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  errorRatePercent: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  promptVersionsUsed: Array<{ promptVersion: string; calls: number; model: string }>;
  recentErrors: AiTelemetryEvent[];
}

/**
 * Pure honest aggregator over real logged AI calls — returns strict 0s when empty.
 */
export function aggregateAiOpsMetrics(events: AiTelemetryEvent[]): AiOpsSummaryMetrics {
  if (events.length === 0) {
    return {
      totalCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      errorRatePercent: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCostUsd: 0,
      promptVersionsUsed: [],
      recentErrors: [],
    };
  }

  const totalCalls = events.length;
  const successCalls = events.filter((e) => e.status === 'success').length;
  const errorCalls = totalCalls - successCalls;
  const errorRatePercent = Math.round((errorCalls / totalCalls) * 100);

  const latencies = events.map((e) => Math.max(0, e.latencyMs)).sort((a, b) => a - b);
  const avgLatencyMs = Math.round(
    latencies.reduce((sum, l) => sum + l, 0) / latencies.length
  );
  const p95Index = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
  const p95LatencyMs = latencies[p95Index];

  const totalInputTokens = events.reduce((s, e) => s + Math.max(0, e.estimatedInputTokens), 0);
  const totalOutputTokens = events.reduce((s, e) => s + Math.max(0, e.estimatedOutputTokens), 0);
  const totalEstimatedCostUsd = Number(
    events.reduce((s, e) => s + Math.max(0, e.estimatedCostUsd), 0).toFixed(6)
  );

  const versionMap = new Map<string, { promptVersion: string; calls: number; model: string }>();
  for (const e of events) {
    const key = `${e.promptVersion}::${e.model}`;
    const existing = versionMap.get(key);
    versionMap.set(key, {
      promptVersion: e.promptVersion,
      model: e.model,
      calls: (existing?.calls ?? 0) + 1,
    });
  }

  return {
    totalCalls,
    successCalls,
    errorCalls,
    errorRatePercent,
    avgLatencyMs,
    p95LatencyMs,
    totalInputTokens,
    totalOutputTokens,
    totalEstimatedCostUsd,
    promptVersionsUsed: Array.from(versionMap.values()).sort((a, b) => b.calls - a.calls),
    recentErrors: events.filter((e) => e.status === 'error').slice(0, 10),
  };
}

export interface NewCourseDraftInput {
  id?: string;
  cefrRange: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  targetAudienceEn: string;
  targetAudienceBn: string;
  order: number;
  version?: number;
}

export function buildPublishedCourse(input: NewCourseDraftInput): CurriculumCourse {
  const now = new Date().toISOString();
  const id =
    input.id && input.id.trim()
      ? input.id.trim()
      : `course_custom_${Date.now().toString(36)}`;
  return {
    id,
    order: input.order,
    cefrRange: input.cefrRange.trim() || 'A2 – B1',
    titleEn: input.titleEn.trim(),
    titleBn: input.titleBn.trim() || input.titleEn.trim(),
    subtitleEn: input.subtitleEn.trim(),
    subtitleBn: input.subtitleBn.trim() || input.subtitleEn.trim(),
    targetAudienceEn:
      input.targetAudienceEn.trim() || 'Bangla-speaking learners advancing real-world English.',
    targetAudienceBn:
      input.targetAudienceBn.trim() || 'বাস্তব ইংরেজি দক্ষতা বাড়াতে আগ্রহী বাংলাভাষী শিক্ষার্থী।',
    modules: [],
    version: input.version ?? 1,
    publishedStatus: 'published',
    isCustom: true,
    updatedAt: now,
  };
}

export interface NewModuleDraftInput {
  id?: string;
  courseId: string;
  order: number;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
}

export function buildPublishedModule(input: NewModuleDraftInput): CurriculumModule {
  const id =
    input.id && input.id.trim()
      ? input.id.trim()
      : `mod_custom_${Date.now().toString(36)}`;
  return {
    id,
    courseId: input.courseId,
    order: input.order,
    titleEn: input.titleEn.trim(),
    titleBn: input.titleBn.trim() || input.titleEn.trim(),
    descriptionEn: input.descriptionEn.trim(),
    descriptionBn: input.descriptionBn.trim() || input.descriptionEn.trim(),
    lessons: [],
  };
}

export interface NewLessonDraftInput {
  id?: string;
  courseId: string;
  moduleId: string;
  order: number;
  cefrBand: string;
  estimatedMinutes: number;
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  conceptRuleEn: string;
  conceptRuleBn: string;
  banglaInterferenceEn: string;
  banglaInterferenceBn: string;
  commonTrap: string;
  naturalEnglish: string;
  banglaExampleMeaning: string;
  targetCategory: MistakeCategory;
  version?: number;
}

/**
 * Builds a fully functional 7-Stage CurriculumLesson (concept, contrast, examples,
 * guided fill-in-blank + error-spot, independent rewrite, and graded assessment)
 * so Admin-published lessons are immediately playable end-to-end in LessonPlayerPage.
 */
export function buildPublishedLesson(input: NewLessonDraftInput): CurriculumLesson {
  const now = new Date().toISOString();
  const id =
    input.id && input.id.trim()
      ? input.id.trim()
      : `les_custom_${Date.now().toString(36)}`;
  const trap = input.commonTrap.trim();
  const natural = input.naturalEnglish.trim();
  const bnMeaning = input.banglaExampleMeaning.trim() || input.summaryBn.trim();

  const words = natural.replace(/[.?!]+$/, '').split(/\s+/).filter(Boolean);
  const blankIndex = Math.min(words.length - 1, Math.max(1, Math.floor(words.length / 2)));
  const blankWord = words[blankIndex] ?? natural;
  const blankTemplate = words.map((w, idx) => (idx === blankIndex ? '_____' : w)).join(' ');

  return {
    id,
    courseId: input.courseId,
    moduleId: input.moduleId,
    order: input.order,
    cefrBand: input.cefrBand.trim() || 'A2 – B1',
    estimatedMinutes: Math.max(3, Math.min(45, input.estimatedMinutes || 6)),
    titleEn: input.titleEn.trim(),
    titleBn: input.titleBn.trim() || input.titleEn.trim(),
    summaryEn: input.summaryEn.trim(),
    summaryBn: input.summaryBn.trim() || input.summaryEn.trim(),
    objectivesEn: [
      `Apply "${natural}" accurately in real-world conversations.`,
      `Avoid the Bangla L1 interference pattern ("${trap}").`,
    ],
    objectivesBn: [
      `বাস্তব কথোপকথনে "${natural}" সঠিকভাবে প্রয়োগ করা।`,
      `বাংলা থেকে সরাসরি অনুবাদের ভুল ("${trap}") এড়িয়ে চলা।`,
    ],
    prerequisiteLessonIds: [],
    prerequisiteNoteEn: 'Published via Admin Curriculum Builder — ready for immediate practice.',
    prerequisiteNoteBn: 'অ্যাডমিন কারিকুলাম বিল্ডার থেকে প্রকাশিত — সরাসরি অনুশীলনের জন্য প্রস্তুত।',
    targetCategories: [input.targetCategory],
    conceptRuleTitleEn: `Core Rule: ${input.titleEn.trim()}`,
    conceptRuleTitleBn: `মূল নিয়ম: ${input.titleBn.trim() || input.titleEn.trim()}`,
    conceptRuleEn: input.conceptRuleEn.trim(),
    conceptRuleBn: input.conceptRuleBn.trim() || input.conceptRuleEn.trim(),
    banglaInterferenceTitleEn: 'Why Bangla speakers stumble here',
    banglaInterferenceTitleBn: 'বাংলাভাষীদের এখানে কেন ভুল হয়',
    banglaInterferenceEn: input.banglaInterferenceEn.trim(),
    banglaInterferenceBn: input.banglaInterferenceBn.trim() || input.banglaInterferenceEn.trim(),
    contrastRows: [
      {
        banglaThought: bnMeaning,
        commonTrap: trap,
        naturalEnglish: natural,
      },
    ],
    examples: [
      {
        id: `${id}_ex_1`,
        contextEn: 'Real-world model sentence',
        contextBn: 'বাস্তব আদর্শ বাক্য',
        englishSentence: natural,
        highlightPhrase: blankWord,
        banglaMeaning: bnMeaning,
      },
    ],
    guidedExercises: [
      {
        id: `${id}_g_1`,
        type: 'fill_blank',
        promptEn: 'Choose the accurate word to complete the natural English sentence:',
        promptBn: 'স্বাভাবিক ইংরেজি বাক্যটি সম্পূর্ণ করতে সঠিক শব্দটি বেছে নিন:',
        sentenceTemplate: `${blankTemplate}.`,
        options: Array.from(new Set([blankWord, 'about', 'did', 'making'])).slice(0, 4),
        correctAnswer: blankWord,
        mistakeCategory: input.targetCategory,
        domain: 'grammar',
        patternEn: `Accurate structure: ${natural}`,
        patternBn: `সঠিক গঠন: ${natural}`,
        explanationEn: input.conceptRuleEn.trim(),
        explanationBn: input.conceptRuleBn.trim() || input.conceptRuleEn.trim(),
      },
    ],
    independentExercises: [
      {
        id: `${id}_ind_1`,
        promptEn: `Rewrite this sentence naturally without the trap ("${trap}"):`,
        promptBn: `ভুলটি ("${trap}") বাদ দিয়ে বাক্যটি সঠিকভাবে ইংরেজিতে লিখুন:`,
        banglaCue: bnMeaning,
        hintWords: words.slice(0, 4),
        sampleCorrectAnswer: natural,
        acceptableAnswers: [natural, natural.replace(/[.?!]+$/, '')],
        mistakeCategory: input.targetCategory,
        domain: 'sentence_construction',
        patternEn: `Eliminating "${trap}"`,
        patternBn: `"${trap}" ভুলটি সংশোধন`,
        explanationEn: input.conceptRuleEn.trim(),
        explanationBn: input.conceptRuleBn.trim() || input.conceptRuleEn.trim(),
      },
    ],
    assessmentQuestions: [
      {
        id: `${id}_as_1`,
        type: 'mcq',
        promptEn: 'Which sentence is grammatically accurate and natural?',
        promptBn: 'কোন বাক্যটি ব্যাকরণগতভাবে নির্ভুল ও স্বাভাবিক?',
        options: [
          { id: 'a', label: trap },
          { id: 'b', label: natural },
        ],
        correctAnswer: 'b',
        mistakeCategory: input.targetCategory,
        domain: 'grammar',
        patternEn: `Choosing "${natural}" over "${trap}"`,
        patternBn: `"${trap}"-এর বদলে "${natural}" নির্বাচন`,
        explanationEn: input.conceptRuleEn.trim(),
        explanationBn: input.conceptRuleBn.trim() || input.conceptRuleEn.trim(),
      },
      {
        id: `${id}_as_2`,
        type: 'construct',
        promptEn: `Fix this sentence: "${trap}"`,
        promptBn: `বাক্যটি শুদ্ধ করে লিখুন: "${trap}"`,
        correctAnswer: natural,
        acceptableAnswers: [natural, natural.replace(/[.?!]+$/, '')],
        mistakeCategory: input.targetCategory,
        domain: 'sentence_construction',
        patternEn: `Active repair: ${natural}`,
        patternBn: `সক্রিয় সংশোধন: ${natural}`,
        explanationEn: input.conceptRuleEn.trim(),
        explanationBn: input.conceptRuleBn.trim() || input.conceptRuleEn.trim(),
      },
    ],
    version: input.version ?? 1,
    publishedStatus: 'published',
    isCustom: true,
    updatedAt: now,
  };
}

export interface LearnerDataExportPayload {
  schema: 'linguaverse-learner-export/v1';
  exportedAt: string;
  correlationId: string;
  account: UserAccount;
  profile: LearnerProfile | null;
  activitySummary: ActivityLedgerSummary;
  latestDiagnostic: EvidenceStartingProfile | null;
  lessonMastery: Record<string, LessonMasteryRecord>;
  lessonAttempts: LessonAttemptRecord[];
  exerciseAttempts: ExerciseAttemptRecord[];
  speakingSessions: SpeakingSessionRecord[];
  mistakes: MistakeMemoryItem[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
  transferAttempts: TransferAttemptRecord[];
  xpLedger: XpLedgerEntry[];
  storedAudioRecordingKeys: string[];
}

export function buildLearnerDataExportPayload(
  input: Omit<LearnerDataExportPayload, 'schema' | 'exportedAt' | 'correlationId'> & {
    exportedAt?: string;
    correlationId?: string;
  }
): LearnerDataExportPayload {
  return {
    schema: 'linguaverse-learner-export/v1',
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    correlationId: input.correlationId ?? generateCorrelationId('exp'),
    account: input.account,
    profile: input.profile,
    activitySummary: input.activitySummary,
    latestDiagnostic: input.latestDiagnostic,
    lessonMastery: input.lessonMastery,
    lessonAttempts: input.lessonAttempts,
    exerciseAttempts: input.exerciseAttempts,
    speakingSessions: input.speakingSessions,
    mistakes: input.mistakes,
    mistakeDrillAttempts: input.mistakeDrillAttempts,
    transferAttempts: input.transferAttempts,
    xpLedger: input.xpLedger,
    storedAudioRecordingKeys: input.storedAudioRecordingKeys,
  };
}
