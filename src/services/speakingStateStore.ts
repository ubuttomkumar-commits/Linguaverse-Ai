import type {
  ConversationCorrectionStyle,
  SavedConversationVocabItem,
  SpeakingModeId,
  SpeakingPressureLevel,
  SpeakingTurnRecord,
} from '../types/domain';
import { isValidCorrectionStyle } from '../domain/conversationContextEngine';

export interface SpeakingSessionDraft {
  sessionId: string;
  modeId: SpeakingModeId;
  pressureLevel: SpeakingPressureLevel;
  startedAt: string;
  savedAt: string;
  turns: SpeakingTurnRecord[];
  draftTranscript: string;
}

export interface UserSpeakingUiState {
  draftSession: SpeakingSessionDraft | null;
  lastPracticedModeId: SpeakingModeId | null;
  correctionStyle: ConversationCorrectionStyle;
  savedVocabulary: SavedConversationVocabItem[];
}

const STORAGE_PREFIX = 'linguaverse_speaking_state_v1:';
const MAX_SAVED_VOCAB = 60;

const DEFAULT_STATE: UserSpeakingUiState = {
  draftSession: null,
  lastPracticedModeId: null,
  correctionStyle: 'gentle',
  savedVocabulary: [],
};

function getKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function writeState(userId: string | null | undefined, next: UserSpeakingUiState): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getKey(userId), JSON.stringify(next));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadUserSpeakingState(userId: string | null | undefined): UserSpeakingUiState {
  if (!userId || typeof window === 'undefined') {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = window.localStorage.getItem(getKey(userId));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<UserSpeakingUiState>;
    const savedVocabulary = Array.isArray(parsed.savedVocabulary)
      ? parsed.savedVocabulary.filter(
          (item): item is SavedConversationVocabItem =>
            Boolean(item) &&
            typeof item.phrase === 'string' &&
            item.phrase.trim().length > 0 &&
            typeof item.scenarioId === 'string'
        )
      : [];
    return {
      draftSession: parsed.draftSession ?? null,
      lastPracticedModeId: parsed.lastPracticedModeId ?? null,
      correctionStyle: isValidCorrectionStyle(parsed.correctionStyle)
        ? parsed.correctionStyle
        : 'gentle',
      savedVocabulary,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveSpeakingSessionDraft(
  userId: string | null | undefined,
  draft: SpeakingSessionDraft
): UserSpeakingUiState {
  const prev = loadUserSpeakingState(userId);
  const next: UserSpeakingUiState = {
    ...prev,
    draftSession: draft,
    lastPracticedModeId: draft.modeId,
  };
  writeState(userId, next);
  return next;
}

export function clearSpeakingSessionDraft(
  userId: string | null | undefined,
  keepLastModeId?: SpeakingModeId | null
): UserSpeakingUiState {
  const prev = loadUserSpeakingState(userId);
  const next: UserSpeakingUiState = {
    ...prev,
    draftSession: null,
    lastPracticedModeId: keepLastModeId ?? prev.lastPracticedModeId,
  };
  writeState(userId, next);
  return next;
}

export function setUserCorrectionStyle(
  userId: string | null | undefined,
  correctionStyle: ConversationCorrectionStyle
): UserSpeakingUiState {
  const prev = loadUserSpeakingState(userId);
  const next: UserSpeakingUiState = {
    ...prev,
    correctionStyle: isValidCorrectionStyle(correctionStyle) ? correctionStyle : 'gentle',
  };
  writeState(userId, next);
  return next;
}

export function saveConversationVocabulary(
  userId: string | null | undefined,
  item: { phrase: string; contextSentence: string; scenarioId: SpeakingModeId }
): UserSpeakingUiState {
  const prev = loadUserSpeakingState(userId);
  const normalized = item.phrase.trim().slice(0, 120);
  if (!normalized) return prev;

  const existingIdx = prev.savedVocabulary.findIndex(
    (entry) => entry.phrase.toLowerCase() === normalized.toLowerCase()
  );

  let nextVocab: SavedConversationVocabItem[];
  if (existingIdx >= 0) {
    const existing = prev.savedVocabulary[existingIdx];
    const updated: SavedConversationVocabItem = {
      ...existing,
      contextSentence: item.contextSentence.trim().slice(0, 260) || existing.contextSentence,
      savedAt: new Date().toISOString(),
    };
    nextVocab = [updated, ...prev.savedVocabulary.filter((_, idx) => idx !== existingIdx)];
  } else {
    const created: SavedConversationVocabItem = {
      id: `vocab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      phrase: normalized,
      contextSentence: item.contextSentence.trim().slice(0, 260),
      scenarioId: item.scenarioId,
      savedAt: new Date().toISOString(),
    };
    nextVocab = [created, ...prev.savedVocabulary].slice(0, MAX_SAVED_VOCAB);
  }

  const next: UserSpeakingUiState = {
    ...prev,
    savedVocabulary: nextVocab,
  };
  writeState(userId, next);
  return next;
}

export function removeConversationVocabulary(
  userId: string | null | undefined,
  phraseOrId: string
): UserSpeakingUiState {
  const prev = loadUserSpeakingState(userId);
  const target = phraseOrId.trim().toLowerCase();
  const next: UserSpeakingUiState = {
    ...prev,
    savedVocabulary: prev.savedVocabulary.filter(
      (entry) => entry.id !== phraseOrId && entry.phrase.toLowerCase() !== target
    ),
  };
  writeState(userId, next);
  return next;
}

export function clearUserSpeakingState(userId: string | null | undefined): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getKey(userId));
  } catch {
    // Ignore storage errors
  }
}
