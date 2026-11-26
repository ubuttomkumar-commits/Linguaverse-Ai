import type {
  TransferInteractionMode,
  TransferScenarioId,
  TransferSessionDraft,
} from '../types/domain';

export interface UserTransferUiState {
  activeDraft: TransferSessionDraft | null;
  lastScenarioId: TransferScenarioId | null;
  preferredMode: TransferInteractionMode;
  prefer2DStage: boolean;
}

const STORAGE_PREFIX = 'linguaverse_transfer_state_v1:';

const DEFAULT_STATE: UserTransferUiState = {
  activeDraft: null,
  lastScenarioId: null,
  preferredMode: 'text',
  prefer2DStage: false,
};

function getKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function writeState(userId: string | null | undefined, next: UserTransferUiState): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getKey(userId), JSON.stringify(next));
  } catch {
    // Gracefully ignore quota errors
  }
}

export function loadUserTransferState(userId: string | null | undefined): UserTransferUiState {
  if (!userId || typeof window === 'undefined') {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = window.localStorage.getItem(getKey(userId));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<UserTransferUiState>;
    const validDraft =
      parsed.activeDraft &&
      typeof parsed.activeDraft.sessionId === 'string' &&
      typeof parsed.activeDraft.scenarioId === 'string' &&
      Array.isArray(parsed.activeDraft.messages) &&
      parsed.activeDraft.messages.length > 0
        ? parsed.activeDraft
        : null;

    return {
      activeDraft: validDraft,
      lastScenarioId: typeof parsed.lastScenarioId === 'string' ? parsed.lastScenarioId : null,
      preferredMode: parsed.preferredMode === 'voice' ? 'voice' : 'text',
      prefer2DStage: Boolean(parsed.prefer2DStage),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveTransferSessionDraft(
  userId: string | null | undefined,
  draft: TransferSessionDraft
): UserTransferUiState {
  const prev = loadUserTransferState(userId);
  const next: UserTransferUiState = {
    ...prev,
    activeDraft: draft,
    lastScenarioId: draft.scenarioId,
    preferredMode: draft.interactionMode,
  };
  writeState(userId, next);
  return next;
}

export function clearTransferSessionDraft(
  userId: string | null | undefined,
  keepLastScenarioId?: TransferScenarioId | null
): UserTransferUiState {
  const prev = loadUserTransferState(userId);
  const next: UserTransferUiState = {
    ...prev,
    activeDraft: null,
    lastScenarioId: keepLastScenarioId ?? prev.lastScenarioId,
  };
  writeState(userId, next);
  return next;
}

export function setTransferStagePreference(
  userId: string | null | undefined,
  prefer2DStage: boolean
): UserTransferUiState {
  const prev = loadUserTransferState(userId);
  const next: UserTransferUiState = {
    ...prev,
    prefer2DStage,
  };
  writeState(userId, next);
  return next;
}

export function clearUserTransferState(userId: string | null | undefined): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getKey(userId));
  } catch {
    // Ignore storage cleanup errors
  }
}
