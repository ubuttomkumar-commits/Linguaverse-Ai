import type {
  ReplayPracticeAttemptRecord,
  ReplayReviewStatus,
  ReplaySessionReviewRecord,
  ReplaySourceType,
} from '../types/domain';

const STORAGE_PREFIX = 'linguaverse_replay_state_v1:';
const MAX_NOTE_LENGTH = 800;
const MAX_PRACTICE_ATTEMPTS = 120;

export interface UserReplayState {
  reviewsBySessionId: Record<string, ReplaySessionReviewRecord>;
  practiceAttempts: ReplayPracticeAttemptRecord[];
  lastOpenedSessionId: string | null;
}

const DEFAULT_STATE: UserReplayState = {
  reviewsBySessionId: {},
  practiceAttempts: [],
  lastOpenedSessionId: null,
};

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isValidStatus(value: unknown): value is ReplayReviewStatus {
  return value === 'unreviewed' || value === 'in_review' || value === 'reviewed';
}

function isValidSource(value: unknown): value is ReplaySourceType {
  return value === 'speaking_studio' || value === 'transfer_lab';
}

function writeState(userId: string | null | undefined, next: UserReplayState): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  } catch {
    // Gracefully ignore storage quota errors
  }
}

export function loadUserReplayState(userId: string | null | undefined): UserReplayState {
  if (!userId || typeof window === 'undefined') {
    return { reviewsBySessionId: {}, practiceAttempts: [], lastOpenedSessionId: null };
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return { ...DEFAULT_STATE, reviewsBySessionId: {}, practiceAttempts: [] };
    const parsed = JSON.parse(raw) as Partial<UserReplayState>;
    const sanitizedReviews: Record<string, ReplaySessionReviewRecord> = {};

    if (parsed.reviewsBySessionId && typeof parsed.reviewsBySessionId === 'object') {
      for (const [key, val] of Object.entries(parsed.reviewsBySessionId)) {
        if (!val || typeof val !== 'object') continue;
        if (!isValidStatus(val.status) || !isValidSource(val.source)) continue;
        sanitizedReviews[key] = {
          sessionId: typeof val.sessionId === 'string' ? val.sessionId : key,
          source: val.source,
          status: val.status,
          startedReviewAt:
            typeof val.startedReviewAt === 'string' ? val.startedReviewAt : undefined,
          updatedAt: typeof val.updatedAt === 'string' ? val.updatedAt : new Date().toISOString(),
          reviewedAt: typeof val.reviewedAt === 'string' ? val.reviewedAt : undefined,
          lastReviewedTurnId:
            typeof val.lastReviewedTurnId === 'string' ? val.lastReviewedTurnId : undefined,
          reviewedComparisonIds: Array.isArray(val.reviewedComparisonIds)
            ? Array.from(
                new Set(
                  val.reviewedComparisonIds.filter(
                    (id): id is string => typeof id === 'string' && id.trim().length > 0
                  )
                )
              )
            : [],
          learnerNote:
            typeof val.learnerNote === 'string'
              ? val.learnerNote.slice(0, MAX_NOTE_LENGTH)
              : undefined,
        };
      }
    }

    const sanitizedPractice: ReplayPracticeAttemptRecord[] = Array.isArray(parsed.practiceAttempts)
      ? parsed.practiceAttempts
          .filter(
            (item): item is ReplayPracticeAttemptRecord =>
              Boolean(item) &&
              typeof item === 'object' &&
              item.userId === userId &&
              typeof item.id === 'string' &&
              typeof item.sessionId === 'string' &&
              isValidSource(item.source) &&
              typeof item.turnId === 'string' &&
              typeof item.originalResponse === 'string' &&
              typeof item.learnerRetryText === 'string'
          )
          .slice(0, MAX_PRACTICE_ATTEMPTS)
      : [];

    return {
      reviewsBySessionId: sanitizedReviews,
      practiceAttempts: sanitizedPractice,
      lastOpenedSessionId:
        typeof parsed.lastOpenedSessionId === 'string' ? parsed.lastOpenedSessionId : null,
    };
  } catch {
    return { ...DEFAULT_STATE, reviewsBySessionId: {}, practiceAttempts: [] };
  }
}

/**
 * Idempotent update of per-user replay review metadata (status, note, position, checked corrections).
 * Strictly NEVER creates new assessment evidence, mistakes, or XP records.
 * Opening a session never auto-marks it as 'reviewed'.
 */
export function saveReplaySessionReview(
  userId: string | null | undefined,
  payload: {
    sessionId: string;
    source: ReplaySourceType;
    status: ReplayReviewStatus;
    learnerNote?: string;
    lastReviewedTurnId?: string;
    reviewedComparisonIds?: string[];
  }
): UserReplayState {
  const prev = loadUserReplayState(userId);
  const existing = prev.reviewsBySessionId[payload.sessionId];
  const nowIso = new Date().toISOString();
  const cleanNote =
    payload.learnerNote !== undefined
      ? payload.learnerNote.trim().slice(0, MAX_NOTE_LENGTH) || undefined
      : existing?.learnerNote;

  const reviewedComparisonIds =
    payload.reviewedComparisonIds !== undefined
      ? Array.from(new Set(payload.reviewedComparisonIds))
      : existing?.reviewedComparisonIds ?? [];

  const startedReviewAt =
    existing?.startedReviewAt ??
    (payload.status === 'in_review' || payload.status === 'reviewed' ? nowIso : undefined);

  // Idempotent reviewedAt: preserve original completion timestamp if already reviewed
  const reviewedAt =
    payload.status === 'reviewed'
      ? existing?.status === 'reviewed' && existing.reviewedAt
        ? existing.reviewedAt
        : nowIso
      : payload.status === 'unreviewed'
        ? undefined
        : existing?.reviewedAt;

  const record: ReplaySessionReviewRecord = {
    sessionId: payload.sessionId,
    source: payload.source,
    status: payload.status,
    startedReviewAt,
    updatedAt: nowIso,
    reviewedAt,
    lastReviewedTurnId: payload.lastReviewedTurnId ?? existing?.lastReviewedTurnId,
    reviewedComparisonIds,
    learnerNote: cleanNote,
  };

  const next: UserReplayState = {
    ...prev,
    reviewsBySessionId: {
      ...prev.reviewsBySessionId,
      [payload.sessionId]: record,
    },
    lastOpenedSessionId: payload.sessionId,
  };
  writeState(userId, next);
  return next;
}

/**
 * Idempotently toggles a Correction Lab item as reviewed without mutating the original transcript.
 */
export function toggleReplayComparisonReviewed(
  userId: string | null | undefined,
  payload: {
    sessionId: string;
    source: ReplaySourceType;
    comparisonId: string;
  }
): UserReplayState {
  const prev = loadUserReplayState(userId);
  const existing = prev.reviewsBySessionId[payload.sessionId];
  const currentIds = new Set(existing?.reviewedComparisonIds ?? []);
  if (currentIds.has(payload.comparisonId)) {
    currentIds.delete(payload.comparisonId);
  } else {
    currentIds.add(payload.comparisonId);
  }
  const currentStatus = existing?.status ?? 'unreviewed';
  const nextStatus: ReplayReviewStatus =
    currentStatus === 'unreviewed' && currentIds.size > 0 ? 'in_review' : currentStatus;

  return saveReplaySessionReview(userId, {
    sessionId: payload.sessionId,
    source: payload.source,
    status: nextStatus,
    reviewedComparisonIds: Array.from(currentIds),
  });
}

/**
 * Records the learner's last reviewed transcript turn without auto-completing review status.
 */
export function recordLastReviewedTurn(
  userId: string | null | undefined,
  payload: {
    sessionId: string;
    source: ReplaySourceType;
    turnId: string;
  }
): UserReplayState {
  const prev = loadUserReplayState(userId);
  const existing = prev.reviewsBySessionId[payload.sessionId];
  const status = existing?.status ?? 'unreviewed';
  return saveReplaySessionReview(userId, {
    sessionId: payload.sessionId,
    source: payload.source,
    status,
    lastReviewedTurnId: payload.turnId,
  });
}

/**
 * Persists a Response Replay Practice attempt strictly separate from historical session records.
 */
export function saveReplayPracticeAttempt(
  userId: string | null | undefined,
  attempt: Omit<ReplayPracticeAttemptRecord, 'id' | 'userId' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
  }
): { state: UserReplayState; saved: ReplayPracticeAttemptRecord | null } {
  if (!userId) {
    return { state: loadUserReplayState(userId), saved: null };
  }
  const prev = loadUserReplayState(userId);
  const record: ReplayPracticeAttemptRecord = {
    id: attempt.id ?? `rpa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    sessionId: attempt.sessionId,
    source: attempt.source,
    turnId: attempt.turnId,
    originalResponse: attempt.originalResponse,
    correctedReference: attempt.correctedReference,
    learnerRetryText: attempt.learnerRetryText.trim().slice(0, 1500),
    correctionHiddenDuringAttempt: Boolean(attempt.correctionHiddenDuringAttempt),
    createdAt: attempt.createdAt ?? new Date().toISOString(),
    aiFeedback: attempt.aiFeedback,
  };

  const next: UserReplayState = {
    ...prev,
    practiceAttempts: [record, ...prev.practiceAttempts].slice(0, MAX_PRACTICE_ATTEMPTS),
  };
  writeState(userId, next);
  return { state: next, saved: record };
}

export function setLastOpenedReplaySession(
  userId: string | null | undefined,
  sessionId: string | null
): UserReplayState {
  const prev = loadUserReplayState(userId);
  const next: UserReplayState = {
    ...prev,
    lastOpenedSessionId: sessionId,
  };
  writeState(userId, next);
  return next;
}

export function clearUserReplayState(userId: string | null | undefined): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getStorageKey(userId));
  } catch {
    // Ignore storage cleanup errors
  }
}
