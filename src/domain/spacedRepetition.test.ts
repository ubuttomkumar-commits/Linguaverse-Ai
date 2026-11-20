import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLessonMastery,
  computeActiveStreakDays,
  isReviewDue,
} from './spacedRepetition';
import type { LessonAttemptRecord } from '../types/domain';

function makeAttempt(overrides: Partial<LessonAttemptRecord>): LessonAttemptRecord {
  return {
    id: overrides.id ?? 'la_1',
    userId: overrides.userId ?? 'usr_1',
    lessonId: overrides.lessonId ?? 'les_past_simple_markers',
    startedAt: overrides.startedAt ?? '2026-11-19T08:00:00.000Z',
    completedAt: overrides.completedAt ?? '2026-11-19T08:08:00.000Z',
    durationSeconds: overrides.durationSeconds ?? 480,
    guidedCorrect: overrides.guidedCorrect ?? 3,
    guidedTotal: overrides.guidedTotal ?? 3,
    independentCorrect: overrides.independentCorrect ?? 2,
    independentTotal: overrides.independentTotal ?? 2,
    assessmentCorrect: overrides.assessmentCorrect ?? 3,
    assessmentTotal: overrides.assessmentTotal ?? 3,
    overallAccuracyPercent: overrides.overallAccuracyPercent ?? 100,
    mistakesLoggedCount: overrides.mistakesLoggedCount ?? 0,
  };
}

test('single 100% attempt NEVER grants 100% mastery (caps at 45% Initial Acquisition)', () => {
  const mastery = calculateLessonMastery({
    userId: 'usr_1',
    lessonId: 'les_past_simple_markers',
    attempts: [makeAttempt({ overallAccuracyPercent: 100 })],
    schedulePreset: 'standard',
  });

  assert.ok(mastery);
  assert.equal(mastery.attemptCount, 1);
  assert.equal(mastery.consecutivePassCount, 1);
  assert.equal(mastery.masteryPercent, 45);
  assert.equal(mastery.status, 'initial_acquisition');
  assert.equal(mastery.reviewIntervalDays, 1);
  assert.equal(mastery.nextReviewAt, '2026-11-20T08:08:00.000Z');
});

test('progressive passing attempts climb 45% -> 70% -> 88% -> 100% with expanding intervals', () => {
  const attempts: LessonAttemptRecord[] = [
    makeAttempt({ id: 'la_1', completedAt: '2026-11-10T08:00:00.000Z', overallAccuracyPercent: 100 }),
    makeAttempt({ id: 'la_2', completedAt: '2026-11-11T08:00:00.000Z', overallAccuracyPercent: 100 }),
    makeAttempt({ id: 'la_3', completedAt: '2026-11-14T08:00:00.000Z', overallAccuracyPercent: 100 }),
    makeAttempt({ id: 'la_4', completedAt: '2026-11-21T08:00:00.000Z', overallAccuracyPercent: 100 }),
  ];

  const after2 = calculateLessonMastery({
    userId: 'usr_1',
    lessonId: 'les_past_simple_markers',
    attempts: attempts.slice(0, 2),
    schedulePreset: 'standard',
  });
  assert.equal(after2?.masteryPercent, 70);
  assert.equal(after2?.status, 'reinforced');
  assert.equal(after2?.reviewIntervalDays, 3);

  const after3 = calculateLessonMastery({
    userId: 'usr_1',
    lessonId: 'les_past_simple_markers',
    attempts: attempts.slice(0, 3),
    schedulePreset: 'standard',
  });
  assert.equal(after3?.masteryPercent, 88);
  assert.equal(after3?.status, 'consolidating');
  assert.equal(after3?.reviewIntervalDays, 7);

  const after4 = calculateLessonMastery({
    userId: 'usr_1',
    lessonId: 'les_past_simple_markers',
    attempts,
    schedulePreset: 'standard',
  });
  assert.equal(after4?.masteryPercent, 100);
  assert.equal(after4?.status, 'mastered');
  assert.equal(after4?.reviewIntervalDays, 14);
});

test('configurable spaced repetition presets adjust next review intervals accurately', () => {
  const attempts = [
    makeAttempt({ id: 'la_1', completedAt: '2026-11-10T08:00:00.000Z', overallAccuracyPercent: 90 }),
    makeAttempt({ id: 'la_2', completedAt: '2026-11-11T08:00:00.000Z', overallAccuracyPercent: 90 }),
  ];

  const intensive = calculateLessonMastery({
    userId: 'usr_1',
    lessonId: 'les_past_simple_markers',
    attempts,
    schedulePreset: 'intensive',
  });
  const relaxed = calculateLessonMastery({
    userId: 'usr_1',
    lessonId: 'les_past_simple_markers',
    attempts,
    schedulePreset: 'relaxed',
  });

  assert.equal(intensive?.reviewIntervalDays, 2);
  assert.equal(relaxed?.reviewIntervalDays, 5);
});

test('low accuracy attempt resets consecutive passes and marks lesson as needs_review', () => {
  const mastery = calculateLessonMastery({
    userId: 'usr_1',
    lessonId: 'les_past_simple_markers',
    attempts: [makeAttempt({ overallAccuracyPercent: 50 })],
    schedulePreset: 'standard',
  });

  assert.ok(mastery);
  assert.equal(mastery.status, 'needs_review');
  assert.equal(mastery.consecutivePassCount, 0);
  assert.ok(mastery.masteryPercent <= 35);
  assert.equal(isReviewDue(mastery, '2026-11-19T08:09:00.000Z'), true);
});

test('computeActiveStreakDays calculates real consecutive calendar days honestly', () => {
  assert.equal(computeActiveStreakDays([], '2026-11-19T10:00:00.000Z'), 0);
  assert.equal(
    computeActiveStreakDays(
      ['2026-11-17T10:00:00.000Z', '2026-11-18T12:00:00.000Z', '2026-11-19T09:00:00.000Z'],
      '2026-11-19T15:00:00.000Z'
    ),
    3
  );
  // Gap breaks streak
  assert.equal(
    computeActiveStreakDays(
      ['2026-11-15T10:00:00.000Z', '2026-11-19T09:00:00.000Z'],
      '2026-11-19T15:00:00.000Z'
    ),
    1
  );
});
