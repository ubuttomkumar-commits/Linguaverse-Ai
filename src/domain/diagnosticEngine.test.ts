import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDiagnosticAttempt } from './diagnosticEngine';
import { DIAGNOSTIC_QUESTIONS } from './diagnosticData';

test('evaluateDiagnosticAttempt scores 5/5 with zero mistakes and non-certified CEFR flag', () => {
  const answers = DIAGNOSTIC_QUESTIONS.map((q) => ({
    questionId: q.id,
    userResponse: q.correctAnswer,
  }));

  const { profile, mistakes } = evaluateDiagnosticAttempt({
    attemptId: 'attempt_perfect',
    userId: 'usr_1',
    selfEstimatedLevel: 'B2',
    answers,
    completedAt: '2026-11-19T08:00:00.000Z',
  });

  assert.equal(profile.totalCorrect, 5);
  assert.equal(profile.totalQuestions, 5);
  assert.equal(profile.accuracyPercent, 100);
  assert.equal(profile.isCertifiedCefr, false);
  assert.equal(profile.confidenceCoveragePercent, 20);
  assert.equal(mistakes.length, 0);
  assert.equal(profile.domainBreakdown.length, 4);
});

test('evaluateDiagnosticAttempt accepts alternative natural sentence construction order', () => {
  const answers = [
    { questionId: 'diag_q1_vocab', userResponse: 'make' },
    { questionId: 'diag_q2_grammar_tense', userResponse: 'am_working' },
    { questionId: 'diag_q3_grammar_prep', userResponse: 'opt_a' },
    {
      questionId: 'diag_q4_sentence',
      userResponse: "Yesterday I couldn't go to the office because of the rain.",
    },
    { questionId: 'diag_q5_reading', userResponse: 'r_b' },
  ];

  const { profile, mistakes } = evaluateDiagnosticAttempt({
    attemptId: 'attempt_partial',
    userId: 'usr_2',
    selfEstimatedLevel: 'B1',
    answers,
  });

  assert.equal(profile.totalCorrect, 3);
  assert.equal(profile.accuracyPercent, 60);
  assert.equal(mistakes.length, 2);
  assert.equal(mistakes[0].domain, 'grammar');
  assert.equal(mistakes[0].userExample, 'am working');
  assert.equal(mistakes[0].correctedExample, 'have been working');
  assert.equal(profile.isCertifiedCefr, false);
});

test('evaluateDiagnosticAttempt flags divergence when self-estimate exceeds observed baseline', () => {
  const answers = DIAGNOSTIC_QUESTIONS.map((q) => ({
    questionId: q.id,
    userResponse: 'wrong_value',
  }));

  const { profile, mistakes } = evaluateDiagnosticAttempt({
    attemptId: 'attempt_zero',
    userId: 'usr_3',
    selfEstimatedLevel: 'C1',
    answers,
  });

  assert.equal(profile.totalCorrect, 0);
  assert.equal(profile.accuracyPercent, 0);
  assert.equal(mistakes.length, 5);
  assert.match(profile.calibrationNoteEn, /C1/);
  assert.match(profile.confidenceLabelEn, /Not a certified CEFR score/i);
});
