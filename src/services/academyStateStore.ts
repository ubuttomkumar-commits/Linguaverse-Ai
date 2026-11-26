import {
  EMPTY_ACADEMY_STATE,
  type LessonDraftState,
  type UserAcademyState,
} from '../domain/academyEngine';
import type { LessonStageKey } from '../types/domain';

const STORAGE_PREFIX = 'linguaverse_academy_state_v1:';
const ACADEMY_STATE_EVENT = 'linguaverse:academy-state-changed';

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readUserAcademyState(userId: string | null | undefined): UserAcademyState {
  if (!userId || typeof window === 'undefined') {
    return { ...EMPTY_ACADEMY_STATE, lessonDrafts: {} };
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return { ...EMPTY_ACADEMY_STATE, lessonDrafts: {} };
    const parsed = JSON.parse(raw) as Partial<UserAcademyState>;
    return {
      enrolledCourseIds: Array.isArray(parsed.enrolledCourseIds)
        ? parsed.enrolledCourseIds.filter((v): v is string => typeof v === 'string')
        : [],
      bookmarkedLessonIds: Array.isArray(parsed.bookmarkedLessonIds)
        ? parsed.bookmarkedLessonIds.filter((v): v is string => typeof v === 'string')
        : [],
      lessonDrafts:
        parsed.lessonDrafts && typeof parsed.lessonDrafts === 'object'
          ? (parsed.lessonDrafts as Record<string, LessonDraftState>)
          : {},
    };
  } catch {
    return { ...EMPTY_ACADEMY_STATE, lessonDrafts: {} };
  }
}

function writeUserAcademyState(userId: string, state: UserAcademyState): UserAcademyState {
  if (typeof window === 'undefined') return state;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(ACADEMY_STATE_EVENT, { detail: { userId } }));
  } catch {
    // Ignore storage quota errors cleanly
  }
  return state;
}

export function subscribeAcademyState(
  userId: string | null | undefined,
  onChange: (next: UserAcademyState) => void
): () => void {
  if (!userId || typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ userId?: string }>;
    if (!custom.detail?.userId || custom.detail.userId === userId) {
      onChange(readUserAcademyState(userId));
    }
  };
  const storageHandler = (event: StorageEvent) => {
    if (event.key === getStorageKey(userId)) {
      onChange(readUserAcademyState(userId));
    }
  };
  window.addEventListener(ACADEMY_STATE_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(ACADEMY_STATE_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export function enrollUserInCourse(userId: string, courseId: string): UserAcademyState {
  const current = readUserAcademyState(userId);
  if (current.enrolledCourseIds.includes(courseId)) return current;
  return writeUserAcademyState(userId, {
    ...current,
    enrolledCourseIds: [...current.enrolledCourseIds, courseId],
  });
}

export function toggleCourseEnrollment(userId: string, courseId: string): UserAcademyState {
  const current = readUserAcademyState(userId);
  const exists = current.enrolledCourseIds.includes(courseId);
  return writeUserAcademyState(userId, {
    ...current,
    enrolledCourseIds: exists
      ? current.enrolledCourseIds.filter((id) => id !== courseId)
      : [...current.enrolledCourseIds, courseId],
  });
}

export function toggleLessonBookmark(userId: string, lessonId: string): UserAcademyState {
  const current = readUserAcademyState(userId);
  const exists = current.bookmarkedLessonIds.includes(lessonId);
  return writeUserAcademyState(userId, {
    ...current,
    bookmarkedLessonIds: exists
      ? current.bookmarkedLessonIds.filter((id) => id !== lessonId)
      : [...current.bookmarkedLessonIds, lessonId],
  });
}

export function saveLessonDraft(
  userId: string,
  draft: {
    lessonId: string;
    courseId: string;
    stage: LessonStageKey;
    guidedDoneCount: number;
    independentDoneCount: number;
    guidedResponses?: Record<string, string>;
    independentResponses?: Record<string, string>;
  }
): UserAcademyState {
  const current = readUserAcademyState(userId);
  const enrolledCourseIds = current.enrolledCourseIds.includes(draft.courseId)
    ? current.enrolledCourseIds
    : [...current.enrolledCourseIds, draft.courseId];
  return writeUserAcademyState(userId, {
    ...current,
    enrolledCourseIds,
    lessonDrafts: {
      ...current.lessonDrafts,
      [draft.lessonId]: {
        ...draft,
        updatedAt: new Date().toISOString(),
      },
    },
  });
}

export function clearLessonDraft(userId: string, lessonId: string): UserAcademyState {
  const current = readUserAcademyState(userId);
  if (!current.lessonDrafts[lessonId]) return current;
  const nextDrafts = { ...current.lessonDrafts };
  delete nextDrafts[lessonId];
  return writeUserAcademyState(userId, {
    ...current,
    lessonDrafts: nextDrafts,
  });
}

export function clearUserAcademyState(userId: string): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getStorageKey(userId));
    window.dispatchEvent(new CustomEvent(ACADEMY_STATE_EVENT, { detail: { userId } }));
  } catch {
    // Ignore storage access errors cleanly
  }
}
