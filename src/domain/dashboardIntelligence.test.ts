import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAcademyPathPreview,
  buildCommunicationLoopStages,
  buildDashboardWeeklyAnalytics,
  buildLearnerNotifications,
  computeDashboardNextBestMoves,
  computeTodayLearningSummary,
  resolvePrimaryContinueTarget,
  searchWorkspaceResources,
} from './dashboardIntelligence';
import { getAllCourses, getAllLessons } from './curriculumData';
import type {
  EvidenceStartingProfile,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeMemoryItem,
} from '../types/domain';

const NOW = new Date('2026-05-10T12:00:00.000Z');

const SAMPLE_PROFILE: LearnerProfile = {
  userId: 'u_1',
  primaryGoal: 'workplace',
  dailyTimeGoalMinutes: 20,
  selfEstimatedLevel: 'A2',
  explanationLanguage: 'both',
  preferredUiLanguage: 'en',
  spacedRepetitionPreset: 'standard',
  onboardingCompleted: true,
  diagnosticCompleted: true,
  dailyReminderEnabled: true,
  dailyReminderTime: '20:30',
  updatedAt: '2026-05-10T08:00:00.000Z',
};

const SAMPLE_DIAGNOSTIC: EvidenceStartingProfile = {
  attemptId: 'diag_1',
  userId: 'u_1',
  completedAt: '2026-05-09T10:00:00.000Z',
  totalQuestions: 10,
  totalCorrect: 7,
  accuracyPercent: 70,
  estimatedStartingBand: 'A2–B1 Developing Communicator',
  estimatedStartingBandBn: 'A2–B1 উন্নয়নশীল কমিউনিকেটর',
  recommendedTrackEn: 'Foundations Track',
  recommendedTrackBn: 'ফাউন্ডেশন ট্র্যাক',
  selfEstimatedLevel: 'A2',
  confidenceCoveragePercent: 80,
  confidenceLabelEn: 'Provisional baseline',
  confidenceLabelBn: 'প্রাথমিক ভিত্তি',
  calibrationNoteEn: 'Good reading & vocabulary foundation.',
  calibrationNoteBn: 'রিডিং ও শব্দভাণ্ডারের ভালো ভিত্তি রয়েছে।',
  isCertifiedCefr: false,
  domainBreakdown: [
    { domain: 'grammar', total: 3, correct: 2, accuracyPercent: 67 },
    { domain: 'vocabulary', total: 3, correct: 3, accuracyPercent: 100 },
    { domain: 'reading', total: 2, correct: 2, accuracyPercent: 100 },
    { domain: 'sentence_construction', total: 2, correct: 0, accuracyPercent: 0 },
  ],
  items: [],
  fiveSkillSummary: {
    skills: [
      {
        skill: 'vocabulary',
        status: 'assessed',
        scorePercent: 100,
        correctCount: 3,
        totalCount: 3,
        noteEn: 'Strong core vocabulary.',
        noteBn: 'শক্তিশালী মূল শব্দভাণ্ডার।',
      },
      {
        skill: 'grammar',
        status: 'assessed',
        scorePercent: 67,
        correctCount: 2,
        totalCount: 3,
        noteEn: 'Solid tense awareness with minor gaps.',
        noteBn: 'ভালো টেন্স ধারণা।',
      },
      {
        skill: 'reading',
        status: 'assessed',
        scorePercent: 100,
        correctCount: 2,
        totalCount: 2,
        noteEn: 'Clear reading comprehension.',
        noteBn: 'স্পষ্ট রিডিং বোধগম্যতা।',
      },
      {
        skill: 'listening',
        status: 'not_assessed',
        scorePercent: null,
        correctCount: 0,
        totalCount: 0,
        noteEn: 'Skipped.',
        noteBn: 'বাদ দেওয়া হয়েছে।',
      },
      {
        skill: 'speaking',
        status: 'not_assessed',
        scorePercent: null,
        correctCount: 0,
        totalCount: 0,
        noteEn: 'Not assessed yet.',
        noteBn: 'মূল্যায়িত নয়।',
      },
    ],
    assessedSkillCount: 3,
    hasSufficientRadarData: true,
    listeningMode: 'skipped',
    speakingMode: 'skipped',
    strengthsEn: ['Vocabulary', 'Reading'],
    strengthsBn: ['শব্দভাণ্ডার', 'রিডিং'],
    opportunitiesEn: ['Grammar'],
    opportunitiesBn: ['গ্রামার'],
    personalizedPath: {
      startingPointEn: 'A2–B1 Developing Track',
      startingPointBn: 'A2–B1 উন্নয়নশীল ট্র্যাক',
      strongestSkills: ['vocabulary', 'reading'],
      prioritySkills: ['grammar'],
      recommendedFirstLessonId: 'les_svo_order',
      recommendedFirstLessonTitleEn: 'English Word Order vs. Bangla SOV',
      recommendedFirstLessonTitleBn: 'ইংরেজি বাক্যের ক্রম বনাম বাংলা বাক্যগঠন',
      dailyPracticeMinutes: 20,
      nextStepsEn: ['Start with English Word Order vs. Bangla SOV'],
      nextStepsBn: ['ইংরেজি বাক্যের ক্রম লেসন দিয়ে শুরু করুন'],
    },
  },
};

test('computeTodayLearningSummary returns honest zeros on fresh first-day account', () => {
  const summary = computeTodayLearningSummary({
    profile: SAMPLE_PROFILE,
    latestDiagnostic: null,
    lessonAttempts: [],
    exerciseAttempts: [],
    speakingSessions: [],
    mistakeDrillAttempts: [],
    transferAttempts: [],
    mistakes: [],
    activeStreakDays: 0,
    now: NOW,
  });

  assert.equal(summary.dailyGoalMinutes, 20);
  assert.equal(summary.completedMinutesToday, 0);
  assert.equal(summary.remainingMinutesToday, 20);
  assert.equal(summary.goalProgressPercent, 0);
  assert.equal(summary.lessonsCompletedToday, 0);
  assert.equal(summary.activitiesCompletedToday, 0);
  assert.equal(summary.activeStreakDays, 0);
  assert.equal(summary.isFirstDayEmpty, true);
});

test('computeTodayLearningSummary counts only today activities accurately', () => {
  const todayAttempt: LessonAttemptRecord = {
    id: 'la_1',
    userId: 'u_1',
    lessonId: 'les_svo_order',
    startedAt: '2026-05-10T09:07:00.000Z',
    completedAt: '2026-05-10T09:15:00.000Z',
    guidedCorrect: 3,
    guidedTotal: 3,
    independentCorrect: 2,
    independentTotal: 2,
    assessmentCorrect: 3,
    assessmentTotal: 3,
    overallAccuracyPercent: 100,
    mistakesLoggedCount: 0,
    durationSeconds: 480,
  };
  const yesterdayAttempt: LessonAttemptRecord = {
    ...todayAttempt,
    id: 'la_old',
    completedAt: '2026-05-09T09:15:00.000Z',
    durationSeconds: 900,
  };

  const summary = computeTodayLearningSummary({
    profile: SAMPLE_PROFILE,
    latestDiagnostic: SAMPLE_DIAGNOSTIC,
    lessonAttempts: [todayAttempt, yesterdayAttempt],
    exerciseAttempts: [],
    speakingSessions: [],
    mistakeDrillAttempts: [],
    transferAttempts: [],
    mistakes: [],
    activeStreakDays: 2,
    now: NOW,
  });

  assert.equal(summary.completedMinutesToday, 8);
  assert.equal(summary.remainingMinutesToday, 12);
  assert.equal(summary.goalProgressPercent, 40);
  assert.equal(summary.lessonsCompletedToday, 1);
  assert.equal(summary.activitiesCompletedToday, 1);
  assert.equal(summary.isFirstDayEmpty, false);
});

test('resolvePrimaryContinueTarget guides brand-new user to /diagnostic and post-assessment user to recommended lesson', () => {
  const allLessons = getAllLessons();

  const freshTarget = resolvePrimaryContinueTarget({
    latestDiagnostic: null,
    lessonMastery: {},
    allLessons,
    mistakes: [],
    now: NOW,
  });
  assert.equal(freshTarget.to, '/diagnostic');

  const postDiagTarget = resolvePrimaryContinueTarget({
    latestDiagnostic: SAMPLE_DIAGNOSTIC,
    lessonMastery: {},
    allLessons,
    mistakes: [],
    now: NOW,
  });
  assert.equal(postDiagTarget.to, '/app/learn/les_svo_order');
});

test('computeDashboardNextBestMoves prioritizes recurring Mistake Memory items deterministically', () => {
  const allLessons = getAllLessons();
  const activeMistake: MistakeMemoryItem = {
    id: 'm_1',
    userId: 'u_1',
    domain: 'grammar',
    category: 'Prepositions',
    patternEn: 'Avoid redundant preposition after discuss',
    patternBn: 'discuss-এর পর about বসাবে না',
    userExample: 'We discussed about the project.',
    correctedExample: 'We discussed the project.',
    explanationEn: 'Discuss takes a direct object without about.',
    explanationBn: 'Discuss-এর পর সরাসরি object বসে।',
    source: 'diagnostic',
    occurrences: 3,
    status: 'active',
    createdAt: '2026-05-08T10:00:00.000Z',
    lastSeenAt: '2026-05-10T10:00:00.000Z',
  };

  const { primaryMove } = computeDashboardNextBestMoves({
    latestDiagnostic: SAMPLE_DIAGNOSTIC,
    mistakes: [activeMistake],
    lessonMastery: {},
    lessonAttempts: [],
    exerciseAttempts: [],
    speakingSessions: [],
    mistakeDrillAttempts: [],
    allLessons,
    now: NOW,
  });

  assert.equal(primaryMove.to, '/app/improve?focus=m_1');
  assert.equal(primaryMove.priority, 'high');
});

test('buildLearnerNotifications derives real events only (never invents fake notifications)', () => {
  const allLessons = getAllLessons();
  const dueMastery: Record<string, LessonMasteryRecord> = {
    les_svo_order: {
      lessonId: 'les_svo_order',
      userId: 'u_1',
      attemptCount: 1,
      consecutivePassCount: 1,
      bestAccuracyPercent: 85,
      lastAccuracyPercent: 85,
      masteryPercent: 40,
      status: 'initial_acquisition',
      reviewIntervalDays: 1,
      schedulePreset: 'standard',
      lastAttemptAt: '2026-05-08T10:00:00.000Z',
      nextReviewAt: '2026-05-09T10:00:00.000Z',
    },
  };

  const notifs = buildLearnerNotifications({
    profile: SAMPLE_PROFILE,
    latestDiagnostic: SAMPLE_DIAGNOSTIC,
    lessonMastery: dueMastery,
    mistakes: [],
    allLessons,
    now: NOW,
  });

  assert.equal(notifs.some((n) => n.category === 'review'), true);
  assert.equal(notifs.some((n) => n.category === 'reminder'), true);
  assert.equal(notifs.some((n) => n.category === 'assessment'), false);
});

test('buildDashboardWeeklyAnalytics requires >= 2 active days for trend sufficiency', () => {
  const empty = buildDashboardWeeklyAnalytics({
    lessonAttempts: [],
    speakingSessions: [],
    mistakeDrillAttempts: [],
    transferAttempts: [],
    now: NOW,
  });
  assert.equal(empty.hasSufficientTrendData, false);
  assert.equal(empty.totalMinutes7d, 0);

  const twoDays = buildDashboardWeeklyAnalytics({
    lessonAttempts: [
      {
        id: 'la_1',
        userId: 'u_1',
        lessonId: 'les_svo_order',
        startedAt: '2026-05-10T08:55:00.000Z',
        completedAt: '2026-05-10T09:00:00.000Z',
        guidedCorrect: 3,
        guidedTotal: 3,
        independentCorrect: 2,
        independentTotal: 2,
        assessmentCorrect: 3,
        assessmentTotal: 3,
        overallAccuracyPercent: 100,
        mistakesLoggedCount: 0,
        durationSeconds: 300,
      },
      {
        id: 'la_2',
        userId: 'u_1',
        lessonId: 'les_svo_order',
        startedAt: '2026-05-08T08:54:00.000Z',
        completedAt: '2026-05-08T09:00:00.000Z',
        guidedCorrect: 3,
        guidedTotal: 3,
        independentCorrect: 2,
        independentTotal: 2,
        assessmentCorrect: 3,
        assessmentTotal: 3,
        overallAccuracyPercent: 100,
        mistakesLoggedCount: 0,
        durationSeconds: 360,
      },
    ],
    speakingSessions: [],
    mistakeDrillAttempts: [],
    transferAttempts: [],
    now: NOW,
  });
  assert.equal(twoDays.hasSufficientTrendData, true);
  assert.equal(twoDays.activeDaysCount, 2);
  assert.equal(twoDays.totalMinutes7d, 11);
});

test('buildAcademyPathPreview and searchWorkspaceResources match real curriculum and scenarios', () => {
  const courses = getAllCourses();
  const lessons = getAllLessons();

  const path = buildAcademyPathPreview({
    courses,
    lessonMastery: {},
    recommendedFirstLessonId: 'les_svo_order',
    now: NOW,
  });
  assert.ok(path.totalCount > 0);
  assert.ok(path.items.length > 0);
  assert.equal(path.completedCount, 0);

  const searchHits = searchWorkspaceResources({
    query: 'Word Order',
    lessons,
    mistakes: [],
  });
  assert.equal(searchHits.some((r) => r.kind === 'lesson' && r.to.includes('les_svo_order')), true);

  const scenarioHits = searchWorkspaceResources({
    query: 'Interview',
    lessons,
    mistakes: [],
  });
  assert.equal(scenarioHits.some((r) => r.kind === 'transfer'), true);
});

test('buildCommunicationLoopStages returns all 8 stages with honest active/completed transitions', () => {
  const fresh = buildCommunicationLoopStages({
    latestDiagnostic: null,
    mistakes: [],
    lessonMastery: {},
    speakingSessions: [],
    transferAttempts: [],
    mistakeDrillAttempts: [],
    dnaMeasuredCount: 0,
  });

  assert.equal(fresh.length, 8);
  assert.deepEqual(
    fresh.map((s) => s.id),
    ['detect', 'explain', 'personalize', 'practice', 'transfer', 'retest', 'update', 'repeat']
  );
  assert.equal(fresh[0].status, 'active');
  assert.equal(fresh[0].to, '/diagnostic');
  assert.equal(fresh.slice(1).every((s) => s.status === 'pending'), true);

  const progressed = buildCommunicationLoopStages({
    latestDiagnostic: SAMPLE_DIAGNOSTIC,
    mistakes: [],
    lessonMastery: {
      les_svo_order: {
        lessonId: 'les_svo_order',
        userId: 'u_1',
        attemptCount: 1,
        consecutivePassCount: 1,
        bestAccuracyPercent: 90,
        lastAccuracyPercent: 90,
        masteryPercent: 45,
        status: 'initial_acquisition',
        reviewIntervalDays: 3,
        schedulePreset: 'standard',
        lastAttemptAt: '2026-05-10T10:00:00.000Z',
        nextReviewAt: '2026-05-15T10:00:00.000Z',
      },
    },
    speakingSessions: [],
    transferAttempts: [],
    mistakeDrillAttempts: [],
    dnaMeasuredCount: 3,
  });

  assert.equal(progressed[0].status, 'completed'); // detect
  assert.equal(progressed[1].status, 'completed'); // explain
  assert.equal(progressed[2].status, 'completed'); // personalize
  assert.equal(progressed[3].status, 'active'); // practice (no speaking sessions yet)
  assert.equal(progressed[6].status, 'completed'); // update (dnaMeasuredCount > 0)
});
