import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_COMMITMENT_OPTIONS,
  filterNativeLanguages,
  LEARNING_GOAL_OPTIONS,
  mapGoalsToPrimaryGoal,
  mapProficiencyChoiceToCefrEstimate,
  SELF_PROFICIENCY_OPTIONS,
  TARGET_LANGUAGE_OPTIONS,
  validateOnboardingStep,
  type OnboardingDraft,
} from './onboardingCatalog';
import {
  evaluateFiveSkillAssessment,
  getAllWrittenAssessmentQuestions,
  LISTENING_ASSESSMENT_QUESTIONS,
} from './initialAssessmentEngine';

function createBaseDraft(): OnboardingDraft {
  return {
    preferredUiLanguage: 'en',
    nativeLanguage: 'bn',
    targetLanguage: 'en',
    learningGoals: ['speak_confidently'],
    dailyTimeGoalMinutes: 15,
    explanationLanguage: 'bn',
    explanationDepth: 'beginner_friendly',
    learningFormat: 'mixed_practice',
    dailyReminderEnabled: true,
    dailyReminderTime: '20:00',
    selfProficiencyChoice: 'simple_sentences',
    microphonePermissionStatus: 'idle',
  };
}

test('onboarding catalog ships required goals, daily commitments, proficiency choices, and honest target support', () => {
  assert.equal(LEARNING_GOAL_OPTIONS.length, 11);
  assert.equal(DAILY_COMMITMENT_OPTIONS.length, 6);
  assert.equal(SELF_PROFICIENCY_OPTIONS.length, 7);

  const supportedTargets = TARGET_LANGUAGE_OPTIONS.filter((t) => t.supportedNow);
  assert.equal(supportedTargets.length, 1);
  assert.equal(supportedTargets[0].code, 'en');
});

test('filterNativeLanguages matches English names, native scripts, and codes', () => {
  const bnHits = filterNativeLanguages('বাংলা');
  assert.equal(bnHits.some((l) => l.code === 'bn'), true);

  const esHits = filterNativeLanguages('español');
  assert.equal(esHits.some((l) => l.code === 'es'), true);

  const jaHits = filterNativeLanguages('japanese');
  assert.equal(jaHits.some((l) => l.code === 'ja'), true);
});

test('validateOnboardingStep enforces supported target language and at least one goal', () => {
  const draft = createBaseDraft();
  assert.equal(validateOnboardingStep(4, { ...draft, targetLanguage: 'ja' }, 'en') !== null, true);
  assert.equal(validateOnboardingStep(4, { ...draft, targetLanguage: 'en' }, 'en'), null);
  assert.equal(validateOnboardingStep(5, { ...draft, learningGoals: [] }, 'en') !== null, true);
  assert.equal(validateOnboardingStep(5, draft, 'en'), null);
});

test('goal and proficiency helpers map cleanly to legacy domain keys', () => {
  assert.equal(mapGoalsToPrimaryGoal(['speak_confidently', 'prepare_interviews']), 'job_interview');
  assert.equal(mapGoalsToPrimaryGoal(['workplace_communication']), 'workplace');
  assert.equal(mapGoalsToPrimaryGoal(['prepare_exams']), 'academic_ielts');
  assert.equal(mapProficiencyChoiceToCefrEstimate('complete_beginner'), 'Pre-A1');
  assert.equal(mapProficiencyChoiceToCefrEstimate('unsure'), 'A2');
});

test('evaluateFiveSkillAssessment strictly avoids fabricating Listening or Speaking scores when skipped/unavailable', () => {
  const writtenAnswers = getAllWrittenAssessmentQuestions().map((q) => ({
    questionId: q.id,
    userResponse: q.correctAnswer,
  }));

  const { profile, mistakes } = evaluateFiveSkillAssessment({
    attemptId: 'assess_honest_1',
    userId: 'usr_1',
    selfEstimatedLevel: 'B1',
    dailyPracticeMinutes: 15,
    learningGoals: ['speak_confidently', 'prepare_interviews'],
    writtenAnswers,
    listeningAnswers: {},
    listeningMode: 'skipped',
    speakingInput: { mode: 'unavailable' },
  });

  assert.equal(profile.isCertifiedCefr, false);
  assert.equal(mistakes.length, 0);
  assert.ok(profile.fiveSkillSummary);
  assert.equal(profile.fiveSkillSummary.assessedSkillCount, 3);
  assert.equal(profile.fiveSkillSummary.hasSufficientRadarData, true);

  const listening = profile.fiveSkillSummary.skills.find((s) => s.skill === 'listening');
  const speaking = profile.fiveSkillSummary.skills.find((s) => s.skill === 'speaking');
  assert.equal(listening?.status, 'not_assessed');
  assert.equal(listening?.scorePercent, null);
  assert.equal(speaking?.status, 'unavailable');
  assert.equal(speaking?.scorePercent, null);
  assert.equal(profile.fiveSkillSummary.personalizedPath.dailyPracticeMinutes, 15);
  assert.ok(profile.fiveSkillSummary.personalizedPath.recommendedFirstLessonId.length > 0);
});

test('evaluateFiveSkillAssessment scores Listening and Speaking honestly when real evidence is submitted', () => {
  const writtenAnswers = getAllWrittenAssessmentQuestions().map((q) => ({
    questionId: q.id,
    userResponse: q.correctAnswer,
  }));

  const listeningAnswers: Record<string, string> = {};
  for (const lq of LISTENING_ASSESSMENT_QUESTIONS) {
    listeningAnswers[lq.id] = lq.correctAnswer;
  }

  const { profile } = evaluateFiveSkillAssessment({
    attemptId: 'assess_full_5',
    userId: 'usr_2',
    selfEstimatedLevel: 'B2',
    dailyPracticeMinutes: 30,
    writtenAnswers,
    listeningAnswers,
    listeningMode: 'speech_synthesis',
    speakingInput: {
      mode: 'ai_evaluated',
      transcript: 'Hello, I work as a software engineer and I want to speak clearly in client meetings.',
      aiMistakesCount: 1,
      aiCorrectElementsCount: 4,
      aiCoachNoteEn: 'Clear introduction with one minor article fix.',
    },
  });

  assert.ok(profile.fiveSkillSummary);
  assert.equal(profile.fiveSkillSummary.assessedSkillCount, 5);
  assert.equal(profile.confidenceCoveragePercent, 50);

  const listening = profile.fiveSkillSummary.skills.find((s) => s.skill === 'listening');
  const speaking = profile.fiveSkillSummary.skills.find((s) => s.skill === 'speaking');
  assert.equal(listening?.status, 'assessed');
  assert.equal(listening?.scorePercent, 100);
  assert.equal(speaking?.status, 'assessed');
  assert.equal(speaking?.scorePercent, 80);
});
