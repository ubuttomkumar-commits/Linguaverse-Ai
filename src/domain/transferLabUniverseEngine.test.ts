import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSFER_CATEGORIES,
  TRANSFER_EIGHT_DIMENSIONS,
  TRANSFER_UNIVERSE_SCENARIOS,
  buildPersonalizedTransferAdaptation,
  buildScenarioUniverseModels,
  computeObjectiveProgressSummary,
  computeTransferDashboardMetrics,
  createInitialObjectives,
  filterAndSortTransferScenarios,
  getAllScenarioSkillTags,
  getTransferUniverseScenario,
  mergeObjectiveUpdates,
  normalizePart11SessionEvaluation,
} from './transferLabUniverseEngine';
import { getTransferScenario, TRANSFER_SCENARIOS } from './transferLabEngine';
import type {
  MistakeMemoryItem,
  TransferAttemptRecord,
  TransferConversationTurn,
  TransferSessionDraft,
} from '../types/domain';
import type { DnaSkillNode } from './communicationDnaLabEngine';

function makeAttempt(overrides: Partial<TransferAttemptRecord> = {}): TransferAttemptRecord {
  return {
    id: overrides.id ?? 'trf_1',
    userId: 'u_1',
    scenarioId: overrides.scenarioId ?? 'daily_restaurant_conversations',
    pressureLevel: overrides.pressureLevel ?? 'level_2_guided',
    targetSkillLabelEn: 'Polite Ordering',
    targetSkillLabelBn: 'ভদ্র অর্ডারিং',
    linkedSourceType: 'baseline',
    userResponse: 'Could I have a table for two, please?',
    inputChannel: 'text_fallback',
    durationSeconds: overrides.durationSeconds ?? 180,
    timedOut: false,
    evaluation: overrides.evaluation ?? {
      task_completion: { score: 80, feedbackEn: 'Done', feedbackBn: 'সম্পন্ন' },
      target_grammar_application: { score: 78, feedbackEn: 'Good', feedbackBn: 'ভালো' },
      contextual_appropriateness: { score: 82, feedbackEn: 'Polite', feedbackBn: 'ভদ্র' },
      response_relevance: { score: 80, feedbackEn: 'On topic', feedbackBn: 'প্রাসঙ্গিক' },
      overall_score: 80,
      passed: true,
      strengths: ['Clear request'],
      detected_mistakes: [],
      natural_model_response: 'Could we have a table for two, please?',
      coach_summary_en: 'Good job.',
      coach_summary_bn: 'ভালো হয়েছে।',
    },
    passed: overrides.passed ?? true,
    completedAt: overrides.completedAt ?? '2026-11-20T10:00:00.000Z',
  };
}

test('Scenario Universe contains all 6 categories and 30 structured scenarios with explicit objectives', () => {
  assert.equal(TRANSFER_CATEGORIES.length, 6);
  assert.equal(TRANSFER_UNIVERSE_SCENARIOS.length, 30);

  const expectedCounts: Record<string, number> = {
    daily_life: 6,
    travel_international: 5,
    professional: 6,
    customer_communication: 5,
    education: 4,
    emergency_practical: 4,
  };

  for (const [cat, count] of Object.entries(expectedCounts)) {
    const inCat = TRANSFER_UNIVERSE_SCENARIOS.filter((s) => s.category === cat);
    assert.equal(inCat.length, count, `Expected ${count} scenarios in ${cat}`);
  }

  for (const scenario of TRANSFER_UNIVERSE_SCENARIOS) {
    assert.ok(scenario.objectives.length >= 4, `${scenario.id} must have >= 4 measurable objectives`);
    for (const obj of scenario.objectives) {
      assert.ok(obj.criteriaEn.trim().length > 10, `${scenario.id}:${obj.id} missing explicit criteria`);
    }
    assert.ok(scenario.targetSkills.length >= 2);
    assert.ok(scenario.aiParticipantName.trim().length > 0);
    assert.ok(scenario.learnerRoleEn.trim().length > 0);
  }

  // Restaurant scenario must carry the 5 required measurable objectives
  const restaurant = getTransferUniverseScenario('daily_restaurant_conversations');
  assert.ok(restaurant);
  assert.equal(restaurant.objectives.length, 5);

  // Legacy Phase 5 array remains untouched (length 5) while getTransferScenario resolves both
  assert.equal(TRANSFER_SCENARIOS.length, 5);
  assert.equal(getTransferScenario('daily_restaurant_conversations').titleEn, 'Restaurant Conversations');
  assert.equal(getTransferScenario('job_interview_followup').id, 'job_interview_followup');
});

test('computeTransferDashboardMetrics returns honest zeros on cold start and real aggregates when populated', () => {
  const empty = computeTransferDashboardMetrics([]);
  assert.equal(empty.scenariosCompleted, 0);
  assert.equal(empty.totalAttempts, 0);
  assert.equal(empty.successfulTaskOutcomes, 0);
  assert.equal(empty.taskSuccessRatePercent, null);
  assert.equal(empty.practiceMinutes, 0);
  assert.equal(empty.skillsAppliedCount, 0);
  assert.equal(empty.recentImprovementDelta, null);
  assert.equal(empty.hasSufficientImprovementData, false);

  const attempts = [
    makeAttempt({
      id: 'trf_old',
      scenarioId: 'daily_restaurant_conversations',
      durationSeconds: 240,
      passed: false,
      completedAt: '2026-11-18T10:00:00.000Z',
      evaluation: {
        ...makeAttempt().evaluation,
        overall_score: 62,
        passed: false,
      },
    }),
    makeAttempt({
      id: 'trf_new',
      scenarioId: 'pro_job_interview',
      durationSeconds: 360,
      passed: true,
      completedAt: '2026-11-21T10:00:00.000Z',
      evaluation: {
        ...makeAttempt().evaluation,
        overall_score: 84,
        passed: true,
      },
    }),
  ];

  const filled = computeTransferDashboardMetrics(attempts);
  assert.equal(filled.scenariosCompleted, 2);
  assert.equal(filled.totalAttempts, 2);
  assert.equal(filled.successfulTaskOutcomes, 1);
  assert.equal(filled.taskSuccessRatePercent, 50);
  assert.equal(filled.practiceMinutes, 10);
  assert.ok(filled.skillsAppliedCount >= 4);
  assert.equal(filled.hasSufficientImprovementData, true);
  assert.equal(filled.recentImprovementDelta, 22);
});

test('buildPersonalizedTransferAdaptation follows Mistake Memory -> DNA -> Academy -> Honest Baseline priority', () => {
  // 1. Cold-start honest baseline
  const baseline = buildPersonalizedTransferAdaptation({
    mistakes: [],
    lessonMastery: {},
    transferAttempts: [],
    dnaSkills: [],
  });
  assert.equal(baseline.sourceType, 'baseline');
  assert.equal(baseline.recommendedScenario.id, 'daily_restaurant_conversations');

  // 2. Communication DNA weak skill
  const weakDna = [
    {
      id: 'vocabulary',
      group: 'core',
      titleEn: 'Vocabulary Application',
      titleBn: 'শব্দভাণ্ডার',
      shortLabelEn: 'Vocab',
      shortLabelBn: 'শব্দভাণ্ডার',
      scorePercent: 52,
      previousPeriodScorePercent: null,
      deltaPercent: null,
      sampleSize: 3,
      minSamplesRequired: 3,
      coverage: 'verified',
      visualState: 'needs_attention',
    } as DnaSkillNode,
  ];
  const dnaRec = buildPersonalizedTransferAdaptation({
    mistakes: [],
    lessonMastery: {},
    transferAttempts: [],
    dnaSkills: weakDna,
  });
  assert.equal(dnaRec.sourceType, 'communication_dna');
  assert.equal(dnaRec.weakDnaSkillLabelEn, 'Vocabulary Application');

  // 3. Mistake Memory overrides DNA
  const activeMistake: MistakeMemoryItem = {
    id: 'mm_1',
    userId: 'u_1',
    source: 'speaking_studio',
    domain: 'grammar',
    category: 'Verb Tense',
    userExample: 'Yesterday I go to office',
    correctedExample: 'Yesterday I went to the office',
    patternEn: 'Past Simple verb form',
    patternBn: 'Past Simple',
    explanationEn: 'Use went for past time.',
    explanationBn: 'অতীতে went ব্যবহার করুন।',
    occurrences: 4,
    severity: 'high',
    confidence: 0.92,
    status: 'active',
    createdAt: '2026-11-20T10:00:00.000Z',
    lastSeenAt: '2026-11-21T10:00:00.000Z',
  };
  const mistakeRec = buildPersonalizedTransferAdaptation({
    mistakes: [activeMistake],
    lessonMastery: {},
    transferAttempts: [],
    dnaSkills: weakDna,
  });
  assert.equal(mistakeRec.sourceType, 'mistake_memory');
  assert.equal(mistakeRec.sourceId, 'mm_1');
  assert.ok(mistakeRec.recommendedScenario.targetMistakeCategories.includes('verb_tense'));
});

test('filterAndSortTransferScenarios filters by category, difficulty, skill, duration, status, and search', () => {
  const draft: TransferSessionDraft = {
    sessionId: 'sess_1',
    scenarioId: 'pro_job_interview',
    pressureLevel: 'level_2_guided',
    interactionMode: 'text',
    startedAt: '2026-11-22T10:00:00.000Z',
    updatedAt: '2026-11-22T10:05:00.000Z',
    elapsedSeconds: 300,
    messages: [],
    objectives: [],
    currentPhaseLabel: 'Opening',
    draftInput: '',
    voiceConsentGranted: false,
    retainAudioConsent: false,
  };

  const models = buildScenarioUniverseModels({
    transferAttempts: [makeAttempt({ scenarioId: 'daily_restaurant_conversations' })],
    activeDraft: draft,
    mistakes: [],
  });

  const inProgress = filterAndSortTransferScenarios(models, {
    category: 'all',
    difficulty: 'all',
    skill: 'all',
    duration: 'all',
    status: 'in_progress',
    search: '',
    sortBy: 'recommended',
  });
  assert.equal(inProgress.length, 1);
  assert.equal(inProgress[0].scenario.id, 'pro_job_interview');

  const completed = filterAndSortTransferScenarios(models, {
    category: 'daily_life',
    difficulty: 'intermediate',
    skill: 'all',
    duration: 'extended',
    status: 'completed',
    search: 'restaurant',
    sortBy: 'title_asc',
  });
  assert.equal(completed.length, 1);
  assert.equal(completed[0].scenario.id, 'daily_restaurant_conversations');

  assert.ok(getAllScenarioSkillTags().length >= 25);
});

test('mergeObjectiveUpdates prevents unearned achieved status without learner turns or quote evidence', () => {
  const restaurant = getTransferUniverseScenario('daily_restaurant_conversations')!;
  const initial = createInitialObjectives(restaurant);
  assert.equal(initial.length, 5);
  assert.ok(initial.every((o) => o.status === 'not_started'));

  // Zero learner turns -> ignored completely
  const noTurns = mergeObjectiveUpdates(
    initial,
    [{ objectiveId: 'obj_1', status: 'achieved', evidenceQuote: 'Table for two please' }],
    0
  );
  assert.equal(noTurns[0].status, 'not_started');

  // Achieved without quote evidence -> downgraded to in_progress
  const missingQuote = mergeObjectiveUpdates(
    initial,
    [{ objectiveId: 'obj_1', status: 'achieved' }],
    1
  );
  assert.equal(missingQuote[0].status, 'in_progress');

  // Achieved WITH quote evidence -> accepted
  const withQuote = mergeObjectiveUpdates(
    initial,
    [
      {
        objectiveId: 'obj_1',
        status: 'achieved',
        evidenceQuote: 'Hi, could we get a table for two near the window?',
      },
    ],
    1
  );
  assert.equal(withQuote[0].status, 'achieved');
  assert.equal(computeObjectiveProgressSummary(withQuote).achieved, 1);
});

test('normalizePart11SessionEvaluation marks missing-evidence dimensions as not_evaluated and separates task vs grammar', () => {
  const restaurant = getTransferUniverseScenario('daily_restaurant_conversations')!;
  const initialObjectives = createInitialObjectives(restaurant);
  const transcript: TransferConversationTurn[] = [
    {
      id: 't1',
      role: 'ai',
      text: 'Welcome to Bistro Lumiere! How can I help you?',
      timestamp: '2026-11-22T10:00:00.000Z',
    },
    {
      id: 't2',
      role: 'learner',
      text: 'I want table for two please. Also I order pasta.',
      timestamp: '2026-11-22T10:00:30.000Z',
      inputChannel: 'text_fallback',
    },
  ];

  // Provide only 4 evaluated dimensions and leave 4 missing/unevaluated
  const rawEvaluation = {
    objectives: [
      {
        objectiveId: 'obj_1',
        status: 'achieved',
        evidenceQuote: 'I want table for two please.',
        rationaleEn: 'Requested table for two.',
      },
      {
        objectiveId: 'obj_2',
        status: 'achieved',
        evidenceQuote: 'Also I order pasta.',
        rationaleEn: 'Ordered pasta.',
      },
      {
        objectiveId: 'obj_3',
        status: 'not_achieved',
        rationaleEn: 'Did not ask about ingredients.',
      },
    ],
    dimensions: [
      {
        dimension: 'task_completion',
        evaluated: true,
        score: 70,
        evidenceFromConversation: 'Learner requested a table and ordered food.',
        supportingLearnerResponse: 'I want table for two please. Also I order pasta.',
      },
      {
        dimension: 'grammar_application',
        evaluated: true,
        score: 55,
        evidenceFromConversation: 'Missing article before "table" and abrupt tense.',
        supportingLearnerResponse: 'I want table for two please.',
        suggestedCorrection: 'Could I have a table for two, please?',
        betterExample: 'Good evening, could we have a table for two, please?',
      },
      {
        dimension: 'communication_clarity',
        evaluated: true,
        score: 80,
        evidenceFromConversation: 'Meaning was immediately clear.',
        supportingLearnerResponse: 'I want table for two please.',
      },
      {
        dimension: 'problem_solving_communication',
        evaluated: true,
        score: 95,
        // Missing evidence -> MUST be forced to not_evaluated (score: null)
        evidenceFromConversation: '',
        supportingLearnerResponse: '',
      },
    ],
    detectedMistakes: [
      {
        category: 'Articles',
        original: 'I want table for two',
        corrected: 'I would like a table for two',
        explanation_en: 'Use indefinite article "a" before singular countable noun "table".',
        explanation_bn: 'একবচন noun "table"-এর আগে "a" ব্যবহার করুন।',
        confidence: 0.91,
        severity: 'medium',
      },
    ],
  };

  const { report, rubricEvaluation } = normalizePart11SessionEvaluation({
    raw: rawEvaluation,
    sessionId: 'sess_eval_1',
    scenario: restaurant,
    transcript,
    currentObjectives: initialObjectives,
  });

  assert.equal(report.dimensions.length, TRANSFER_EIGHT_DIMENSIONS.length);
  // Only 3 dimensions actually had valid evidence (problem_solving lacked evidence so was forced to not_evaluated)
  assert.equal(report.evaluatedDimensionCount, 3);
  const problemDim = report.dimensions.find((d) => d.dimension === 'problem_solving_communication');
  assert.equal(problemDim?.evaluated, false);
  assert.equal(problemDim?.score, null);
  assert.equal(problemDim?.verdict, 'not_evaluated');

  // Arithmetic mean of 70, 55, 80 = 68.33 -> 68
  assert.equal(report.overallScore, 68);
  // Failed pass bar because overall < 70 and grammar < 60
  assert.equal(report.passed, false);
  assert.equal(report.taskOutcomeStatus, 'partially_achieved');
  assert.equal(rubricEvaluation.overall_score, 68);
  assert.equal(rubricEvaluation.part11Report?.sessionId, 'sess_eval_1');
  assert.equal(report.detectedMistakes.length, 1);
});
