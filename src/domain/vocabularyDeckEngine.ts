import type { SpacedRepetitionPreset } from '../types/domain';

export const VOCAB_SRS_ALGORITHM_VERSION = 'srs-v2.0-sm2-lite';

export type VocabSourceType = 'manual' | 'lesson' | 'speaking_studio' | 'mistake_memory';
export type VocabDifficulty = 'easy' | 'medium' | 'hard';
export type VocabRecallRating = 'again' | 'hard' | 'good' | 'easy';
export type VocabMasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface VocabReviewHistoryEntry {
  reviewedAt: string;
  rating: VocabRecallRating;
  intervalDays: number;
  algorithmVersion: string;
}

export interface VocabularyCardRecord {
  id: string;
  userId: string;
  word: string;
  wordNormalized: string;
  phoneticHint: string;
  meaningEn: string;
  meaningBn: string;
  exampleSentence: string;
  sourceType: VocabSourceType;
  sourceId?: string;
  difficulty: VocabDifficulty;
  reviewCount: number;
  passCount: number;
  consecutivePasses: number;
  intervalDays: number;
  masteryStatus: VocabMasteryStatus;
  algorithmVersion: string;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  reviewHistory: VocabReviewHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface VocabDeckSummary {
  totalCards: number;
  dueNowCount: number;
  masteredCount: number;
  learningCount: number;
  retentionRatePercent: number | null;
  algorithmVersion: string;
}

const PRESET_MULTIPLIER: Record<SpacedRepetitionPreset, number> = {
  intensive: 0.75,
  standard: 1,
  relaxed: 1.35,
};

export function normalizeVocabWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
}

export function validateVocabularyInput(input: {
  word?: unknown;
  meaningEn?: unknown;
  meaningBn?: unknown;
  exampleSentence?: unknown;
  phoneticHint?: unknown;
  difficulty?: unknown;
  sourceType?: unknown;
}): {
  ok: boolean;
  error?: string;
  cleaned?: {
    word: string;
    wordNormalized: string;
    meaningEn: string;
    meaningBn: string;
    exampleSentence: string;
    phoneticHint: string;
    difficulty: VocabDifficulty;
    sourceType: VocabSourceType;
  };
} {
  const word = typeof input.word === 'string' ? input.word.trim().slice(0, 80) : '';
  const wordNormalized = normalizeVocabWord(word);
  if (wordNormalized.length < 2) {
    return { ok: false, error: 'Please enter a valid English word or expression (at least 2 characters).' };
  }
  const meaningEn = typeof input.meaningEn === 'string' ? input.meaningEn.trim().slice(0, 220) : '';
  if (meaningEn.length < 2) {
    return { ok: false, error: 'Please provide a clear English meaning.' };
  }
  const meaningBn =
    typeof input.meaningBn === 'string' && input.meaningBn.trim().length > 0
      ? input.meaningBn.trim().slice(0, 220)
      : meaningEn;
  const exampleSentence =
    typeof input.exampleSentence === 'string' ? input.exampleSentence.trim().slice(0, 320) : '';
  if (exampleSentence.length < 4) {
    return { ok: false, error: 'Please include a real example sentence for context.' };
  }
  const phoneticHint =
    typeof input.phoneticHint === 'string' ? input.phoneticHint.trim().slice(0, 80) : '';
  const difficulty: VocabDifficulty =
    input.difficulty === 'easy' || input.difficulty === 'hard' ? input.difficulty : 'medium';
  const sourceType: VocabSourceType =
    input.sourceType === 'lesson' ||
    input.sourceType === 'speaking_studio' ||
    input.sourceType === 'mistake_memory'
      ? input.sourceType
      : 'manual';

  return {
    ok: true,
    cleaned: {
      word,
      wordNormalized,
      meaningEn,
      meaningBn,
      exampleSentence,
      phoneticHint,
      difficulty,
      sourceType,
    },
  };
}

/**
 * PRD v5.0 Sections 8.5 & 8.6:
 * Configurable, versioned spaced-repetition scheduler.
 * Mastery is NEVER granted after a single review; requires >= 3 consecutive
 * passes and an achieved review interval >= 14 days (delayed recall).
 */
export function computeNextVocabReview(
  card: VocabularyCardRecord,
  rating: VocabRecallRating,
  preset: SpacedRepetitionPreset = 'standard',
  nowIso: string = new Date().toISOString()
): VocabularyCardRecord {
  const passed = rating === 'good' || rating === 'easy';
  const reviewCount = card.reviewCount + 1;
  const passCount = card.passCount + (passed ? 1 : 0);
  const consecutivePasses = passed ? card.consecutivePasses + 1 : 0;

  let baseIntervalDays: number;
  if (rating === 'again') {
    baseIntervalDays = 1;
  } else if (rating === 'hard') {
    baseIntervalDays = Math.max(1, Math.min(3, Math.round(card.intervalDays * 0.8)));
  } else if (rating === 'good') {
    if (consecutivePasses <= 1) baseIntervalDays = 2;
    else if (consecutivePasses === 2) baseIntervalDays = 6;
    else baseIntervalDays = Math.min(45, Math.round(card.intervalDays * 2.4));
  } else {
    // easy
    if (consecutivePasses <= 1) baseIntervalDays = 4;
    else if (consecutivePasses === 2) baseIntervalDays = 10;
    else baseIntervalDays = Math.min(60, Math.round(card.intervalDays * 2.8));
  }

  const multiplier = PRESET_MULTIPLIER[preset] ?? 1;
  const intervalDays = Math.max(1, Math.round(baseIntervalDays * multiplier));

  let masteryStatus: VocabMasteryStatus;
  if (!passed) {
    masteryStatus = 'learning';
  } else if (consecutivePasses >= 3 && intervalDays >= 14) {
    masteryStatus = 'mastered';
  } else if (consecutivePasses >= 2) {
    masteryStatus = 'reviewing';
  } else {
    masteryStatus = 'learning';
  }

  const difficulty: VocabDifficulty =
    rating === 'again' || rating === 'hard'
      ? 'hard'
      : rating === 'easy'
        ? 'easy'
        : 'medium';

  const nowMs = Date.parse(nowIso) || Date.now();
  const nextReviewAt = new Date(nowMs + intervalDays * 24 * 60 * 60 * 1000).toISOString();

  const historyEntry: VocabReviewHistoryEntry = {
    reviewedAt: nowIso,
    rating,
    intervalDays,
    algorithmVersion: VOCAB_SRS_ALGORITHM_VERSION,
  };

  return {
    ...card,
    difficulty,
    reviewCount,
    passCount,
    consecutivePasses,
    intervalDays,
    masteryStatus,
    algorithmVersion: VOCAB_SRS_ALGORITHM_VERSION,
    lastReviewedAt: nowIso,
    nextReviewAt,
    reviewHistory: [historyEntry, ...card.reviewHistory].slice(0, 30),
    updatedAt: nowIso,
  };
}

export function isVocabCardDue(card: VocabularyCardRecord, nowMs: number = Date.now()): boolean {
  const dueMs = Date.parse(card.nextReviewAt);
  if (Number.isNaN(dueMs)) return true;
  return dueMs <= nowMs;
}

export function summarizeVocabDeck(
  cards: VocabularyCardRecord[],
  nowMs: number = Date.now()
): VocabDeckSummary {
  const totalCards = cards.length;
  const dueNowCount = cards.filter((c) => isVocabCardDue(c, nowMs)).length;
  const masteredCount = cards.filter((c) => c.masteryStatus === 'mastered').length;
  const learningCount = totalCards - masteredCount;
  const totalReviews = cards.reduce((sum, c) => sum + c.reviewCount, 0);
  const totalPasses = cards.reduce((sum, c) => sum + c.passCount, 0);
  const retentionRatePercent =
    totalReviews > 0 ? Math.round((totalPasses / totalReviews) * 100) : null;

  return {
    totalCards,
    dueNowCount,
    masteredCount,
    learningCount,
    retentionRatePercent,
    algorithmVersion: VOCAB_SRS_ALGORITHM_VERSION,
  };
}
