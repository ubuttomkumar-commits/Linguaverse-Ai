import type { DnaSynthesisPayload } from './dnaCoachApi';
import type { DnaTimeframe } from '../domain/communicationDnaLabEngine';

export interface PersistedDnaSynthesis {
  synthesis: DnaSynthesisPayload;
  model: string;
  generatedAt: string;
  timeframe: DnaTimeframe;
  measuredCountAtGeneration: number;
  totalSamplesAtGeneration: number;
}

function storageKey(userId: string): string {
  return `lv_dna_synthesis_v1:${userId}`;
}

export function loadPersistedDnaSynthesis(
  userId: string | undefined
): PersistedDnaSynthesis | null {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedDnaSynthesis>;
    if (
      !parsed ||
      !parsed.synthesis ||
      typeof parsed.synthesis.communicationStyleEn !== 'string' ||
      typeof parsed.generatedAt !== 'string'
    ) {
      return null;
    }
    return parsed as PersistedDnaSynthesis;
  } catch {
    return null;
  }
}

export function savePersistedDnaSynthesis(
  userId: string | undefined,
  record: PersistedDnaSynthesis
): void {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(record));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearUserDnaAnalysisState(userId: string): void {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // Ignore storage cleanup errors
  }
}
