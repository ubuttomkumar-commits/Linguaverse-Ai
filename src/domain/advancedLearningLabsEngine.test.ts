import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCommunicationReadiness,
  computeTranscriptShadowingMatch,
  detectLearningPlateau,
  validateHumanBridgeInput,
  validateWritingDiaryInput,
} from './advancedLearningLabsEngine.ts';

test('advancedLearningLabsEngine: validates writing diary and human bridge inputs', () => {
  assert.equal(validateWritingDiaryInput({ originalText: 'short' }).ok, false);
  const okWrite = validateWritingDiaryInput({
    mode: 'daily_diary',
    title: 'My Tuesday reflection',
    originalText: 'Today I attended a team meeting and explained our project progress clearly.',
  });
  assert.equal(okWrite.ok, true);

  assert.equal(
    validateHumanBridgeInput({ scenarioContext: 'Standup', whatWentWell: 'Spoke calmly', selfReportedConfidence: 9 }).ok,
    false
  );
  const okBridge = validateHumanBridgeInput({
    scenarioContext: 'Weekly engineering standup',
    partnerType: 'colleague',
    whatWentWell: 'Explained my blocker clearly in English',
    whatFeltHard: 'Follow-up technical question',
    selfReportedConfidence: 4,
  });
  assert.equal(okBridge.ok, true);
});

test('advancedLearningLabsEngine: shadowing computes honest text-overlap only', () => {
  const res = computeTranscriptShadowingMatch(
    'Could you say that one more time?',
    'Could you say that one time'
  );
  assert.equal(res.matchedWords, 6);
  assert.equal(res.totalReferenceWords, 7);
  assert.deepEqual(res.missingWords, ['more']);
  assert.match(res.honestDisclosureEn, /not measured without an acoustic assessment engine/i);
});

test('advancedLearningLabsEngine: detects insufficient data, plateau, and progressing trends honestly', () => {
  const insufficient = detectLearningPlateau({
    recentScoresPct: [62, 65],
    recurringMistakeCount: 1,
    completedLessonsCount: 1,
  });
  assert.equal(insufficient.status, 'insufficient_data');

  const stalled = detectLearningPlateau({
    recentScoresPct: [64, 66, 65, 65],
    recurringMistakeCount: 3,
    completedLessonsCount: 2,
  });
  assert.equal(stalled.status, 'possible_plateau');
  assert.ok(stalled.recoveryActionsEn.length >= 2);

  const progressing = detectLearningPlateau({
    recentScoresPct: [55, 62, 74, 82],
    recurringMistakeCount: 1,
    completedLessonsCount: 4,
  });
  assert.equal(progressing.status, 'progressing');
});

test('advancedLearningLabsEngine: readiness estimator reports missing contexts and limitations', () => {
  const readiness = computeCommunicationReadiness({
    diagnosticCompleted: true,
    completedLessonsCount: 2,
    speakingSessionsCount: 1,
    transferAttemptsCount: 0,
    examOrWritingAttemptsCount: 0,
  });
  assert.equal(readiness.coveragePct, 60);
  assert.equal(readiness.contextsCovered.length, 3);
  assert.equal(readiness.contextsMissing.length, 2);
  assert.match(readiness.limitationsEn, /NOT official CEFR or IELTS certification/i);
});
