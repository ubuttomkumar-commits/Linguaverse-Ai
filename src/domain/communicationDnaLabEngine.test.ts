import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommunicationDnaLab,
  DNA_CALCULATION_VERSION,
  MIN_DNA_SAMPLES,
} from './communicationDnaLabEngine';
import type {
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  SpeakingSessionRecord,
  TransferAttemptRecord,
} from '../types/domain';

const BASE_PROFILE: LearnerProfile = {
  userId: 'u_dna_1',
  nativeLanguage: 'bn',
  targetLanguage: 'en',
  preferredUiLanguage: 'en',
  explanationLanguage: 'both',
  primaryGoal: 'workplace',
  learningGoals: ['workplace_communication', 'speak_confidently'],
  dailyTimeGoalMinutes: 20,
  spacedRepetitionPreset: 'standard',
  selfEstimatedLevel: 'B1',
  selfProficiencyChoice: 'basic_conversations',
  onboardingCompleted: true,
  diagnosticCompleted: false,
  updatedAt: '2026-11-20T10:00:00.000Z',
};

function makeSpeakingSession(
  id: string,
  timestamp: string,
  turnCount = 3
): SpeakingSessionRecord {
  const turns = Array.from({ length: turnCount }, (_, idx) => ({
    id: `${id}_t_${idx + 1}`,
    turnNumber: idx + 1,
    promptShown: 'Explain your recent project milestone.',
    userTranscript:
      'We delivered the dashboard update yesterday because our engineering team collaborated closely with product managers.',
    inputChannel: 'text_fallback' as const,
    responseTimeSeconds: 18,
    timedOut: false,
    createdAt: timestamp,
    evaluation: {
      ai_reply: 'That sounds well coordinated. What was the hardest challenge?',
      ai_reply_bn_hint: 'সবচেয়ে কঠিন চ্যালেঞ্জ কী ছিল তা বলুন।',
      corrected_transcript:
        'We delivered the dashboard update yesterday because our engineering team collaborated closely with product managers.',
      correct_elements: ['Clear past tense', 'Effective causal connector'],
      mistakes: [],
      natural_alternative:
        'Yesterday we shipped the dashboard update after closely collaborating with our product team.',
      pronunciation_note: 'Text fallback used; acoustic pronunciation not scored.',
    },
  }));

  return {
    id,
    userId: 'u_dna_1',
    modeId: 'job_interviews',
    pressureLevel: 'open_ended',
    startedAt: timestamp,
    updatedAt: timestamp,
    durationSeconds: 240,
    totalMistakesDetected: 0,
    turns,
  };
}

test('cold-start Communication DNA Lab never fabricates scores or unsupported strengths', () => {
  const model = buildCommunicationDnaLab({
    profile: BASE_PROFILE,
    latestDiagnostic: null,
    exerciseAttempts: [],
    lessonAttempts: [],
    lessonMastery: {},
    speakingSessions: [],
    mistakes: [],
    mistakeDrillAttempts: [],
    transferAttempts: [],
    timeframe: 'all',
    now: new Date('2026-11-22T12:00:00.000Z'),
  });

  assert.equal(model.calculationVersion, DNA_CALCULATION_VERSION);
  assert.equal(model.totalDimensions, 10);
  assert.equal(model.coreSkills.length, 6);
  assert.equal(model.extendedSkills.length, 4);
  assert.equal(model.measuredCount, 0);
  assert.equal(model.totalVerifiedSamples, 0);
  assert.equal(model.lastAssessmentDate, null);
  assert.equal(model.hasHistoricalComparison, false);
  assert.equal(model.trendSeries.hasSufficientData, false);
  assert.equal(model.strengths.length, 0);
  assert.equal(model.evidenceLedger.length, 0);
  assert.equal(model.profileSeparation.aiInterpretationEligibility.eligible, false);
  assert.equal(model.profileSeparation.selfReported.hasSelfReport, true);

  for (const skill of model.skills) {
    assert.equal(skill.scorePercent, null);
    assert.equal(skill.sampleSize, 0);
    assert.equal(skill.visualState, 'insufficient');
    assert.equal(skill.coverage, 'insufficient_data');
  }
});

test('Pronunciation stays strictly unmeasured without acoustic engine while other verified skills unlock at >= 3 samples', () => {
  const now = new Date('2026-11-22T12:00:00.000Z');
  const spkRecent = makeSpeakingSession('spk_recent', '2026-11-21T10:00:00.000Z', 3);

  const exercises: ExerciseAttemptRecord[] = [1, 2, 3, 4].map((n) => ({
    id: `ex_${n}`,
    userId: 'u_dna_1',
    lessonId: 'c1-m1-l1',
    exerciseId: `item_${n}`,
    stage: n <= 2 ? 'guided' : 'independent',
    exerciseType: n <= 2 ? 'mcq' : 'construct',
    mistakeCategory: 'Verb Tense',
    userResponse: 'Yesterday I went to Dhaka.',
    expectedAnswer: 'Yesterday I went to Dhaka.',
    isCorrect: n !== 4,
    timestamp: `2026-11-20T09:0${n}:00.000Z`,
  }));

  const drillAttempts: MistakeDrillAttemptRecord[] = [
    {
      id: 'dr_1',
      userId: 'u_dna_1',
      mistakeId: 'm_1',
      passed: true,
      userRewrite: 'Yesterday I went to the office.',
      expectedAnswer: 'Yesterday I went to the office.',
      durationSeconds: 45,
      timestamp: '2026-11-21T14:00:00.000Z',
    },
  ];

  const mistakes: MistakeMemoryItem[] = [
    {
      id: 'm_1',
      userId: 'u_dna_1',
      source: 'speaking_studio',
      category: 'Verb Tense',
      domain: 'grammar',
      userExample: 'Yesterday I go to office.',
      correctedExample: 'Yesterday I went to the office.',
      patternEn: 'Past Simple with Yesterday',
      patternBn: 'Yesterday-এর সাথে Past Simple',
      explanationEn: 'Use past simple with finished past time.',
      explanationBn: 'অতীতের নির্দিষ্ট সময়ের সাথে past simple ব্যবহার করুন।',
      severity: 'high',
      confidence: 0.94,
      occurrences: 3,
      status: 'practicing',
      createdAt: '2026-11-19T10:00:00.000Z',
      lastSeenAt: '2026-11-21T10:00:00.000Z',
    },
  ];

  const transferAttempts: TransferAttemptRecord[] = [
    {
      id: 'tr_1',
      userId: 'u_dna_1',
      scenarioId: 'workplace_project_delay',
      pressureLevel: 'level_2_guided',
      targetSkillLabelEn: 'Past Simple & Status Updates',
      targetSkillLabelBn: 'অতীত কাল ও প্রজেক্ট আপডেট',
      linkedSourceType: 'academy_lesson',
      linkedSourceId: 'c1-m1-l1',
      userResponse: 'We completed the API migration on schedule and verified all endpoints.',
      inputChannel: 'text_fallback',
      durationSeconds: 90,
      timedOut: false,
      passed: true,
      completedAt: '2026-11-22T08:00:00.000Z',
      evaluation: {
        task_completion: {
          score: 88,
          feedbackEn: 'Clearly addressed the milestone status.',
          feedbackBn: 'মাইলস্টোন অবস্থা স্পষ্টভাবে ব্যাখ্যা করা হয়েছে।',
        },
        target_grammar_application: {
          score: 84,
          feedbackEn: 'Accurate past simple verbs.',
          feedbackBn: 'সঠিক past simple ক্রিয়া ব্যবহৃত হয়েছে।',
        },
        contextual_appropriateness: {
          score: 90,
          feedbackEn: 'Professional workplace register.',
          feedbackBn: 'পেশাদার কর্মক্ষেত্রের ভাষা।',
        },
        response_relevance: {
          score: 86,
          feedbackEn: 'Directly answered the stakeholder prompt.',
          feedbackBn: 'সরাসরি প্রাসঙ্গিক উত্তর।',
        },
        overall_score: 87,
        passed: true,
        strengths: ['Clear status update', 'Accurate past tense'],
        detected_mistakes: [],
        natural_model_response:
          'We wrapped up the API migration on schedule and verified every endpoint.',
        coach_summary_en: 'Clear workplace update.',
        coach_summary_bn: 'স্পষ্ট কর্মক্ষেত্র আপডেট।',
      },
    },
  ];

  const lessonAttempts: LessonAttemptRecord[] = [
    {
      id: 'la_1',
      userId: 'u_dna_1',
      lessonId: 'c1-m1-l1',
      startedAt: '2026-11-20T08:50:00.000Z',
      completedAt: '2026-11-20T09:10:00.000Z',
      durationSeconds: 600,
      guidedCorrect: 2,
      guidedTotal: 2,
      independentCorrect: 1,
      independentTotal: 2,
      assessmentCorrect: 3,
      assessmentTotal: 4,
      overallAccuracyPercent: 75,
      mistakesLoggedCount: 1,
    },
  ];

  const model = buildCommunicationDnaLab({
    profile: BASE_PROFILE,
    latestDiagnostic: null,
    exerciseAttempts: exercises,
    lessonAttempts,
    lessonMastery: {} as Record<string, LessonMasteryRecord>,
    speakingSessions: [spkRecent],
    mistakes,
    mistakeDrillAttempts: drillAttempts,
    transferAttempts,
    timeframe: 'all',
    now,
  });

  const pronunciation = model.skills.find((s) => s.id === 'pronunciation')!;
  assert.equal(pronunciation.scorePercent, null);
  assert.equal(pronunciation.sampleSize, 0);
  assert.equal(pronunciation.visualState, 'insufficient');
  assert.match(pronunciation.limitationEn, /acoustic/i);

  const grammar = model.skills.find((s) => s.id === 'grammar')!;
  const speaking = model.skills.find((s) => s.id === 'speaking')!;
  const writing = model.skills.find((s) => s.id === 'writing')!;
  const functional = model.skills.find((s) => s.id === 'functional_communication')!;

  assert.ok(grammar.sampleSize >= MIN_DNA_SAMPLES);
  assert.notEqual(grammar.scorePercent, null);
  assert.equal(speaking.sampleSize, 3);
  assert.notEqual(speaking.scorePercent, null);
  assert.ok(writing.sampleSize >= 3); // 2 independent exercises + 1 drill + 1 transfer
  assert.notEqual(writing.scorePercent, null);
  assert.equal(functional.sampleSize, 4); // 3 speaking turns + 1 transfer
  assert.notEqual(functional.scorePercent, null);

  // Trend series has >= 2 distinct days (Nov 20, Nov 21, Nov 22)
  assert.equal(model.trendSeries.hasSufficientData, true);
  assert.ok(model.trendSeries.points.length >= 2);

  // Traceable evidence ledger populated
  assert.ok(model.evidenceLedger.length >= 3);
  assert.equal(model.profileSeparation.aiInterpretationEligibility.eligible, true);
  assert.ok(model.nextBestPractice.routeTo.startsWith('/app/'));
});

test('timeframe window filtering computes honest previous-period delta when prior period has >= 3 samples', () => {
  const now = new Date('2026-11-22T12:00:00.000Z');
  // Prior 7d window: Nov 8 - Nov 15
  const spkPrior = makeSpeakingSession('spk_prior', '2026-11-11T10:00:00.000Z', 3);
  // Current 7d window: Nov 15 - Nov 22
  const spkCurrent = makeSpeakingSession('spk_curr', '2026-11-20T10:00:00.000Z', 3);

  const model7d = buildCommunicationDnaLab({
    profile: BASE_PROFILE,
    latestDiagnostic: null as EvidenceStartingProfile | null,
    exerciseAttempts: [],
    lessonAttempts: [],
    lessonMastery: {},
    speakingSessions: [spkPrior, spkCurrent],
    mistakes: [],
    mistakeDrillAttempts: [],
    transferAttempts: [],
    timeframe: '7d',
    now,
  });

  const speaking = model7d.skills.find((s) => s.id === 'speaking')!;
  assert.equal(speaking.sampleSize, 3);
  assert.notEqual(speaking.scorePercent, null);
  assert.notEqual(speaking.previousPeriodScorePercent, null);
  assert.equal(typeof speaking.deltaPercent, 'number');
  assert.equal(model7d.hasHistoricalComparison, true);
});
