import type {
  LessonAttemptRecord,
  LessonMasteryRecord,
  MasteryStatus,
  SpacedRepetitionPreset,
} from '../types/domain';

export const SPACED_REPETITION_INTERVALS: Record<SpacedRepetitionPreset, readonly number[]> = {
  standard: [1, 3, 7, 14, 30],
  intensive: [1, 2, 4, 7, 14],
  relaxed: [2, 5, 10, 21, 45],
};

export const PASS_THRESHOLD_PERCENT = 75;
export const MASTERY_FINAL_THRESHOLD_PERCENT = 85;

/**
 * Honest Mastery Cap per consecutive passing attempt:
 * Attempt 1 CANNOT grant 100% mastery — single-session success only proves initial acquisition.
 * Learners progress through spaced reviews to unlock full verified retention:
 * - 1st pass: capped at 45% (Initial Acquisition)
 * - 2nd pass: capped at 70% (Reinforced)
 * - 3rd pass: capped at 88% (Consolidating)
 * - 4th+ pass (>= 85% accuracy): up to 100% (Mastered)
 */
const PASS_MASTERY_CAPS = [0, 45, 70, 88, 100] as const;

export function addDaysIso(baseIso: string, days: number): string {
  const baseMs = new Date(baseIso).getTime();
  const nextMs = baseMs + days * 24 * 60 * 60 * 1000;
  return new Date(nextMs).toISOString();
}

export function calculateLessonMastery(params: {
  userId: string;
  lessonId: string;
  attempts: LessonAttemptRecord[];
  schedulePreset: SpacedRepetitionPreset;
}): LessonMasteryRecord | null {
  const { userId, lessonId, schedulePreset } = params;
  const sorted = [...params.attempts]
    .filter((a) => a.lessonId === lessonId)
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

  if (sorted.length === 0) {
    return null;
  }

  let consecutivePassCount = 0;
  let bestAccuracyPercent = 0;

  for (const attempt of sorted) {
    if (attempt.overallAccuracyPercent > bestAccuracyPercent) {
      bestAccuracyPercent = attempt.overallAccuracyPercent;
    }
    if (attempt.overallAccuracyPercent >= PASS_THRESHOLD_PERCENT) {
      consecutivePassCount += 1;
    } else {
      consecutivePassCount = 0;
    }
  }

  const latest = sorted[sorted.length - 1];
  const intervals = SPACED_REPETITION_INTERVALS[schedulePreset];

  let masteryPercent: number;
  let status: MasteryStatus;
  let reviewIntervalDays: number;

  if (consecutivePassCount === 0) {
    // Did not reach pass threshold on latest attempt — honest low mastery & immediate reinforcement
    masteryPercent = Math.min(35, Math.round(latest.overallAccuracyPercent * 0.45));
    status = 'needs_review';
    reviewIntervalDays = intervals[0];
  } else {
    const cappedStage = Math.min(consecutivePassCount, 4);
    const stageCap = PASS_MASTERY_CAPS[cappedStage];

    // Scale within the stage cap by latest accuracy so 80% vs 100% shows honest differentiation,
    // while strictly enforcing the single-attempt ceiling (never 100% on attempt 1).
    const scaledMastery = Math.round(stageCap * (latest.overallAccuracyPercent / 100));

    if (cappedStage >= 4 && latest.overallAccuracyPercent >= MASTERY_FINAL_THRESHOLD_PERCENT) {
      masteryPercent = latest.overallAccuracyPercent >= 95 ? 100 : Math.min(96, scaledMastery);
      status = 'mastered';
    } else if (cappedStage === 3) {
      masteryPercent = Math.min(88, Math.max(72, scaledMastery));
      status = 'consolidating';
    } else if (cappedStage === 2) {
      masteryPercent = Math.min(70, Math.max(50, scaledMastery));
      status = 'reinforced';
    } else {
      masteryPercent = Math.min(45, Math.max(30, scaledMastery));
      status = 'initial_acquisition';
    }

    const intervalIndex = Math.min(consecutivePassCount - 1, intervals.length - 1);
    reviewIntervalDays = intervals[intervalIndex];
  }

  return {
    lessonId,
    userId,
    attemptCount: sorted.length,
    consecutivePassCount,
    bestAccuracyPercent,
    lastAccuracyPercent: latest.overallAccuracyPercent,
    masteryPercent,
    status,
    reviewIntervalDays,
    schedulePreset,
    lastAttemptAt: latest.completedAt,
    nextReviewAt: addDaysIso(latest.completedAt, reviewIntervalDays),
  };
}

export function isReviewDue(mastery: LessonMasteryRecord | null, nowIso?: string): boolean {
  if (!mastery) return false;
  if (mastery.status === 'needs_review') return true;
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  return new Date(mastery.nextReviewAt).getTime() <= nowMs;
}

export function computeActiveStreakDays(attemptTimestamps: string[], nowIso?: string): number {
  if (attemptTimestamps.length === 0) return 0;

  const uniqueDays = new Set<string>();
  for (const ts of attemptTimestamps) {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) {
      uniqueDays.add(d.toISOString().slice(0, 10));
    }
  }

  if (uniqueDays.size === 0) return 0;

  const refDate = nowIso ? new Date(nowIso) : new Date();
  const todayKey = refDate.toISOString().slice(0, 10);
  const yesterdayKey = new Date(refDate.getTime() - 86400000).toISOString().slice(0, 10);

  let cursorMs: number;
  if (uniqueDays.has(todayKey)) {
    cursorMs = new Date(`${todayKey}T00:00:00.000Z`).getTime();
  } else if (uniqueDays.has(yesterdayKey)) {
    cursorMs = new Date(`${yesterdayKey}T00:00:00.000Z`).getTime();
  } else {
    return 0;
  }

  let streak = 0;
  while (uniqueDays.has(new Date(cursorMs).toISOString().slice(0, 10))) {
    streak += 1;
    cursorMs -= 86400000;
  }

  return streak;
}
