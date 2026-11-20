import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyMistakeCategory,
  computeNextMistakeReview,
  evaluateMistakeRewrite,
  generateMistakeMicroDrill,
} from './mistakeMemoryEngine';
import { computeCommunicationDna } from './communicationDnaEngine';
import {
  buildLessonCompletionSeries,
  buildMistakeRecurrenceSeries,
  buildSpacedRetentionSeries,
  buildWeeklyPracticeSeries,
  generateNextBestActions,
} from './personalIntelligenceEngine';
import type {
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeMemoryItem,
  SpeakingSessionRecord,
} from '../types/domain';

function makeMistake(overrides: Partial<MistakeMemoryItem> = {}): MistakeMemoryItem {
  return {
    id: 'm_tense_1',
    userId: 'u_1',
    source: 'speaking_studio',
    category: 'Verb Tense',
    domain: 'grammar',
    userExample: 'Yesterday I go to office',
    correctedExample: 'Yesterday I went to the office',
    patternEn: 'Past Simple Tense with Yesterday',
    patternBn: 'Yesterday-এর সাথে Past Simple Tense',
    explanationEn: 'Use past simple "went" with "yesterday".',
    explanationBn: '"Yesterday" এর সাথে past simple "went" বসবে।',
    severity: 'high',
    confidence: 0.95,
    occurrences: 2,
    status: 'active',
    createdAt: '2026-05-01T10:00:00.000Z',
    lastSeenAt: '2026-05-02T10:00:00.000Z',
    speakingSessionId: 'spk_job_1',
    ...overrides,
  };
}

function makeSpeakingSession(overrides: Partial<SpeakingSessionRecord> = {}): SpeakingSessionRecord {
  return {
    id: 'spk_job_1',
    userId: 'u_1',
    modeId: 'job_interviews',
    pressureLevel: 'open_ended',
    startedAt: '2026-05-02T09:50:00.000Z',
    updatedAt: '2026-05-02T10:00:00.000Z',
    durationSeconds: 300,
    totalMistakesDetected: 2,
    turns: [
      {
        id: 't_1',
        turnNumber: 1,
        promptShown: 'Tell me about a project you completed recently.',
        userTranscript:
          'Yesterday I go to office and discuss about the new project with my manager because it was urgent.',
        inputChannel: 'text_fallback',
        responseTimeSeconds: 25,
        timedOut: false,
        createdAt: '2026-05-02T09:55:00.000Z',
        evaluation: {
          ai_reply: 'That sounds important. What was your role?',
          ai_reply_bn_hint: 'আপনার ভূমিকা কী ছিল তা বলুন।',
          corrected_transcript:
            'Yesterday I went to the office and discussed the new project with my manager because it was urgent.',
          correct_elements: ['Clear timeline and stakeholder reference'],
          mistakes: [
            {
              category: 'Verb Tense',
              original: 'Yesterday I go to office',
              corrected: 'Yesterday I went to the office',
              explanation_en: 'Past simple required with yesterday.',
              explanation_bn: 'Yesterday এর সাথে past simple হবে।',
              confidence: 0.94,
              severity: 'high',
            },
            {
              category: 'Preposition',
              original: 'discuss about the new project',
              corrected: 'discussed the new project',
              explanation_en: 'Discuss does not take about.',
              explanation_bn: 'Discuss এর পর about বসে না।',
              confidence: 0.91,
              severity: 'medium',
            },
          ],
          natural_alternative:
            'Yesterday I went to the office to discuss the urgent project with my manager.',
          pronunciation_note: 'Text fallback used; acoustic pronunciation is not evaluated.',
        },
      },
    ],
    ...overrides,
  };
}

test('classifyMistakeCategory maps raw categories into all 6 canonical Mistake Memory buckets', () => {
  assert.equal(classifyMistakeCategory('Verb Tense'), 'verb_tense');
  assert.equal(classifyMistakeCategory('Past Simple Error'), 'verb_tense');
  assert.equal(classifyMistakeCategory('Preposition Redundancy'), 'prepositions');
  assert.equal(classifyMistakeCategory('Article Omission'), 'articles');
  assert.equal(classifyMistakeCategory('Question Word Order'), 'word_order');
  assert.equal(classifyMistakeCategory('Vocabulary Choice'), 'vocabulary');
  assert.equal(classifyMistakeCategory('Auxiliary Verb Agreement'), 'sentence_structure');
});

test('generateMistakeMicroDrill, evaluateMistakeRewrite & computeNextMistakeReview follow honest 2-pass resolution', () => {
  const mistake = makeMistake();
  const drill = generateMistakeMicroDrill(mistake);

  assert.equal(drill.mistakeId, mistake.id);
  assert.equal(drill.category, 'verb_tense');
  assert.ok(drill.options.length >= 2);
  assert.equal(drill.options.filter((o) => o.isCorrect).length, 1);

  const goodCheck = evaluateMistakeRewrite(
    'yesterday i went to the office.',
    mistake.correctedExample
  );
  assert.equal(goodCheck.isCorrect, true);

  const badCheck = evaluateMistakeRewrite('Yesterday I go to office', mistake.correctedExample);
  assert.equal(badCheck.isCorrect, false);

  const nowIso = '2026-05-03T12:00:00.000Z';
  // Pass #1 -> moves from active to practicing (never instant resolved on 1 pass)
  const pass1 = computeNextMistakeReview(mistake, true, 'standard', nowIso);
  assert.equal(pass1.status, 'practicing');
  assert.equal(pass1.practiceAttemptsCount, 1);
  assert.equal(pass1.practicePassCount, 1);
  assert.equal(pass1.reviewIntervalDays, 3);
  assert.equal(pass1.nextReviewAt, '2026-05-06T12:00:00.000Z');

  // Pass #2 -> resolves with expanded 7-day interval
  const pass2 = computeNextMistakeReview(
    { ...mistake, ...pass1 },
    true,
    'standard',
    '2026-05-06T12:00:00.000Z'
  );
  assert.equal(pass2.status, 'resolved');
  assert.equal(pass2.practicePassCount, 2);
  assert.equal(pass2.reviewIntervalDays, 7);

  // Failed retest -> resets to active with 1-day review
  const failReset = computeNextMistakeReview(
    { ...mistake, ...pass1 },
    false,
    'standard',
    '2026-05-06T12:00:00.000Z'
  );
  assert.equal(failReset.status, 'active');
  assert.equal(failReset.practicePassCount, 0);
  assert.equal(failReset.reviewIntervalDays, 1);
});

test('computeCommunicationDna keeps all 5 dimensions separate and strictly gates scores on sampleSize >= 3', () => {
  // Cold start: 0 observations -> every dimension null & insufficient_data
  const emptyProfile = computeCommunicationDna({
    latestDiagnostic: null,
    exerciseAttempts: [],
    lessonAttempts: [],
    speakingSessions: [],
    mistakes: [],
    mistakeDrillAttempts: [],
  });

  assert.equal(emptyProfile.totalDimensions, 5);
  assert.equal(emptyProfile.measuredCount, 0);
  for (const dim of emptyProfile.dimensions) {
    assert.equal(dim.scorePercent, null);
    assert.equal(dim.sampleSize, 0);
    assert.equal(dim.coverage, 'insufficient_data');
  }

  // Add 1 speaking session (1 turn) + 3 grammar exercises -> Grammar Accuracy unlocks (low_confidence),
  // while Speaking Task Completion stays null because sampleSize === 1 < 3 (never faked from written work)
  const session = makeSpeakingSession();
  const grammarExercises: ExerciseAttemptRecord[] = [1, 2, 3].map((idx) => ({
    id: `ex_${idx}`,
    userId: 'u_1',
    lessonId: 'c1-m1-l1',
    exerciseId: `item_${idx}`,
    stage: 'guided',
    exerciseType: 'fill_blank',
    mistakeCategory: 'Verb Tense',
    userResponse: 'went',
    expectedAnswer: 'went',
    isCorrect: true,
    timestamp: `2026-05-02T11:0${idx}:00.000Z`,
  }));

  const partialProfile = computeCommunicationDna({
    latestDiagnostic: null,
    exerciseAttempts: grammarExercises,
    lessonAttempts: [],
    speakingSessions: [session],
    mistakes: [makeMistake()],
    mistakeDrillAttempts: [],
  });

  const grammarDim = partialProfile.dimensions.find((d) => d.id === 'grammar_accuracy')!;
  const speakingDim = partialProfile.dimensions.find((d) => d.id === 'speaking_task_completion')!;

  assert.equal(grammarDim.sampleSize, 4); // 3 exercises + 1 speaking turn
  assert.equal(grammarDim.coverage, 'low_confidence');
  assert.notEqual(grammarDim.scorePercent, null);

  assert.equal(speakingDim.sampleSize, 1);
  assert.equal(speakingDim.coverage, 'insufficient_data');
  assert.equal(speakingDim.scorePercent, null);

  // Flagging false AI corrections removes their negative penalty from Grammar Accuracy
  const flaggedProfile = computeCommunicationDna({
    latestDiagnostic: null,
    exerciseAttempts: grammarExercises,
    lessonAttempts: [],
    speakingSessions: [session],
    mistakes: [
      makeMistake({
        userExample: 'Yesterday I go to office',
        falseCorrectionReported: true,
      }),
      makeMistake({
        id: 'm_prep_1',
        category: 'Preposition',
        userExample: 'discuss about the new project',
        correctedExample: 'discussed the new project',
        falseCorrectionReported: true,
      }),
    ],
    mistakeDrillAttempts: [],
  });

  const grammarDimFlagged = flaggedProfile.dimensions.find((d) => d.id === 'grammar_accuracy')!;
  assert.equal(grammarDimFlagged.scorePercent, 100);
  assert.ok(grammarDimFlagged.scorePercent! > grammarDim.scorePercent!);
});

test('personalIntelligenceEngine builds honest chart series and causal Next Best Actions', () => {
  const now = new Date('2026-05-03T12:00:00.000Z');

  // Empty data -> hasData false across all 4 charts
  const emptyWeekly = buildWeeklyPracticeSeries([], [], [], now);
  const emptyLessons = buildLessonCompletionSeries({});
  const emptyRecurrence = buildMistakeRecurrenceSeries([]);
  const emptyRetention = buildSpacedRetentionSeries({}, [], now);

  assert.equal(emptyWeekly.hasData, false);
  assert.equal(emptyWeekly.totalMinutes, 0);
  assert.equal(emptyLessons.hasData, false);
  assert.equal(emptyRecurrence.hasData, false);
  assert.equal(emptyRetention.hasData, false);

  // Populated activity
  const session = makeSpeakingSession({
    updatedAt: '2026-05-02T10:00:00.000Z',
    durationSeconds: 300,
  });
  const lessonAttempt: LessonAttemptRecord = {
    id: 'la_1',
    userId: 'u_1',
    lessonId: 'c1-m1-l1',
    startedAt: '2026-05-03T08:53:00.000Z',
    completedAt: '2026-05-03T09:00:00.000Z',
    durationSeconds: 420,
    guidedCorrect: 3,
    guidedTotal: 3,
    independentCorrect: 1,
    independentTotal: 1,
    assessmentCorrect: 3,
    assessmentTotal: 4,
    overallAccuracyPercent: 88,
    mistakesLoggedCount: 1,
  };
  const lessonMastery: Record<string, LessonMasteryRecord> = {
    'c1-m1-l1': {
      lessonId: 'c1-m1-l1',
      userId: 'u_1',
      attemptCount: 1,
      consecutivePassCount: 1,
      bestAccuracyPercent: 88,
      lastAccuracyPercent: 88,
      masteryPercent: 45,
      reviewIntervalDays: 1,
      schedulePreset: 'standard',
      lastAttemptAt: '2026-05-03T09:00:00.000Z',
      nextReviewAt: '2026-05-03T08:00:00.000Z', // overdue
      status: 'initial_acquisition',
    },
  };

  const activeMistake = makeMistake({
    occurrences: 2,
    status: 'practicing',
    nextReviewAt: '2026-05-06T12:00:00.000Z',
    reviewIntervalDays: 3,
  });
  const falseFlaggedMistake = makeMistake({
    id: 'm_false',
    category: 'Articles',
    falseCorrectionReported: true,
    occurrences: 5,
  });

  const weekly = buildWeeklyPracticeSeries([lessonAttempt], [session], [], now);
  assert.equal(weekly.hasData, true);
  assert.equal(weekly.totalMinutes, 12); // 7 min + 5 min

  const recurrence = buildMistakeRecurrenceSeries([activeMistake, falseFlaggedMistake]);
  assert.equal(recurrence.hasData, true);
  assert.equal(recurrence.points.length, 1); // false-flagged article excluded
  assert.equal(recurrence.overallRecurrenceRatePercent, 100);

  const retention = buildSpacedRetentionSeries(lessonMastery, [activeMistake], now);
  assert.equal(retention.hasData, true);
  assert.equal(retention.dueNowCount, 1);

  const dna = computeCommunicationDna({
    latestDiagnostic: null as EvidenceStartingProfile | null,
    exerciseAttempts: [],
    lessonAttempts: [lessonAttempt],
    speakingSessions: [session],
    mistakes: [activeMistake],
    mistakeDrillAttempts: [],
  });

  const actions = generateNextBestActions({
    latestDiagnostic: null,
    mistakes: [activeMistake],
    lessonMastery,
    lessonAttempts: [lessonAttempt],
    exerciseAttempts: [],
    speakingSessions: [session],
    dnaProfile: dna,
    now,
  });

  assert.ok(actions.length >= 2);
  assert.match(actions[0].reasonEn, /Job Interviews/i);
  assert.match(actions[0].reasonEn, /Verb Tense/i);
  assert.ok(actions[0].to.startsWith('/app/improve?focus='));
});
