import type {
  DiagnosticSkillDomain,
  MistakeFilterCategory,
  MistakeMemoryItem,
  MistakeStatus,
  SpacedRepetitionPreset,
} from '../types/domain';

export interface MistakeCategoryMeta {
  id: MistakeFilterCategory;
  labelEn: string;
  labelBn: string;
}

export const MISTAKE_FILTER_CATEGORIES: MistakeCategoryMeta[] = [
  { id: 'verb_tense', labelEn: 'Verb Tense', labelBn: 'ক্রিয়ার কাল (Verb Tense)' },
  { id: 'prepositions', labelEn: 'Prepositions', labelBn: 'প্রিপজিশন (Prepositions)' },
  { id: 'articles', labelEn: 'Articles', labelBn: 'আর্টিকেল (Articles)' },
  { id: 'word_order', labelEn: 'Word Order', labelBn: 'শব্দক্রম (Word Order)' },
  { id: 'vocabulary', labelEn: 'Vocabulary', labelBn: 'শব্দভাণ্ডার (Vocabulary)' },
  {
    id: 'sentence_structure',
    labelEn: 'Sentence Structure',
    labelBn: 'বাক্য গঠন (Sentence Structure)',
  },
];

export function getMistakeCategoryMeta(id: MistakeFilterCategory): MistakeCategoryMeta {
  return (
    MISTAKE_FILTER_CATEGORIES.find((c) => c.id === id) ?? MISTAKE_FILTER_CATEGORIES[5]
  );
}

/**
 * Deterministically maps raw diagnostic, Academy, or Gemini Speaking Studio mistake categories
 * into one of the 6 core Mistake Memory filter buckets.
 */
export function classifyMistakeCategory(
  rawCategory: string,
  domain?: DiagnosticSkillDomain
): MistakeFilterCategory {
  const lower = rawCategory.trim().toLowerCase();

  if (
    lower.includes('tense') ||
    lower.includes('past') ||
    lower.includes('future') ||
    lower.includes('present') ||
    lower.includes('verb') && !lower.includes('auxiliary')
  ) {
    return 'verb_tense';
  }
  if (lower.includes('preposition')) {
    return 'prepositions';
  }
  if (lower.includes('article') || lower.includes('determiner')) {
    return 'articles';
  }
  if (lower.includes('word order') || lower.includes('order')) {
    return 'word_order';
  }
  if (
    lower.includes('vocab') ||
    lower.includes('collocation') ||
    lower.includes('word choice') ||
    lower.includes('lexical') ||
    domain === 'vocabulary'
  ) {
    return 'vocabulary';
  }
  if (
    lower.includes('structure') ||
    lower.includes('sentence') ||
    lower.includes('auxiliary') ||
    lower.includes('grammar') ||
    lower.includes('agreement') ||
    lower.includes('subject') ||
    domain === 'sentence_construction'
  ) {
    return 'sentence_structure';
  }

  return 'sentence_structure';
}

export interface MistakeDrillOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface TargetedMistakeDrill {
  mistakeId: string;
  category: MistakeFilterCategory;
  recognitionPromptEn: string;
  recognitionPromptBn: string;
  options: MistakeDrillOption[];
  rewritePromptEn: string;
  rewritePromptBn: string;
  flawedOriginal: string;
  expectedCorrected: string;
  hintTokens: string[];
}

function normalizeComparable(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[“”"'`]/g, "'")
    .replace(/[.,!?;:]+/g, '')
    .replace(/\s+/g, ' ');
}

function buildPlausibleDistractor(original: string, corrected: string, variant: number): string {
  const cleanOrig = original.trim();
  const cleanCorr = corrected.trim();
  const words = cleanCorr.split(/\s+/);

  if (variant === 0) {
    // Subtle Bangla-L1 trap distractor: drop auxiliary/preposition or duplicate preposition
    if (/\bdiscussed\b/i.test(cleanCorr)) {
      return cleanCorr.replace(/\bdiscussed\b/i, 'discussed about');
    }
    if (/\bwent\b/i.test(cleanCorr)) {
      return cleanCorr.replace(/\bwent\b/i, 'was go');
    }
    if (/\bdid\b/i.test(cleanCorr)) {
      return cleanCorr.replace(/\bdid\s+you\b/i, 'was you');
    }
    if (/\bhave been\b/i.test(cleanCorr)) {
      return cleanCorr.replace(/\bhave been\b/i, 'am being');
    }
    if (/\bdoes not\b|\bdoesn't\b/i.test(cleanCorr)) {
      return cleanCorr.replace(/\b(does not|doesn't)\b/i, 'do not');
    }
    if (words.length >= 3) {
      return `${words[0]} is ${words.slice(1).join(' ')}`;
    }
    return `${cleanOrig} already`;
  }

  // Variant 1: reversed/broken phrasing distinct from both original and corrected
  if (/\bthe\b/i.test(cleanCorr)) {
    const dropped = cleanCorr.replace(/\bthe\s+/i, '');
    if (normalizeComparable(dropped) !== normalizeComparable(cleanOrig)) {
      return dropped;
    }
  }
  if (/\bto\b/i.test(cleanCorr)) {
    const swapped = cleanCorr.replace(/\bto\b/i, 'for');
    if (
      normalizeComparable(swapped) !== normalizeComparable(cleanOrig) &&
      normalizeComparable(swapped) !== normalizeComparable(cleanCorr)
    ) {
      return swapped;
    }
  }
  if (words.length >= 2) {
    const swapped = [words[1], words[0], ...words.slice(2)].join(' ');
    if (
      normalizeComparable(swapped) !== normalizeComparable(cleanOrig) &&
      normalizeComparable(swapped) !== normalizeComparable(cleanCorr)
    ) {
      return swapped;
    }
  }
  return `very ${cleanOrig}`;
}

/**
 * Generates an instant 2-step targeted micro-drill specifically testing the exact
 * mistake pattern captured from the learner's Academy lesson or Speaking Studio session.
 */
export function generateMistakeMicroDrill(mistake: MistakeMemoryItem): TargetedMistakeDrill {
  const category = classifyMistakeCategory(mistake.category, mistake.domain);
  const meta = getMistakeCategoryMeta(category);
  const original = mistake.userExample.trim();
  const corrected = mistake.correctedExample.trim();

  const d1 = buildPlausibleDistractor(original, corrected, 0);
  const d2 = buildPlausibleDistractor(original, corrected, 1);

  const uniqueCandidates: MistakeDrillOption[] = [
    { id: 'opt_correct', text: corrected, isCorrect: true },
  ];

  const seen = new Set<string>([normalizeComparable(corrected)]);
  const distractorPool = [original, d1, d2];
  let idx = 1;
  for (const candidate of distractorPool) {
    const key = normalizeComparable(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueCandidates.push({
      id: `opt_wrong_${idx}`,
      text: candidate,
      isCorrect: false,
    });
    idx++;
    if (uniqueCandidates.length >= 3) break;
  }

  // Deterministic rotation based on mistake id so the correct answer is not always first
  const seed = mistake.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const shift = seed % uniqueCandidates.length;
  const rotatedOptions = [
    ...uniqueCandidates.slice(shift),
    ...uniqueCandidates.slice(0, shift),
  ];

  const hintTokens = corrected
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .slice(0, 8);

  return {
    mistakeId: mistake.id,
    category,
    recognitionPromptEn: `Choose the accurate natural English fix for this ${meta.labelEn} pattern:`,
    recognitionPromptBn: `এই ${meta.labelBn} ভুলটির সঠিক ও স্বাভাবিক ইংরেজি রূপটি বেছে নিন:`,
    options: rotatedOptions,
    rewritePromptEn: `Now repair the flawed phrase from memory without copying the error:`,
    rewritePromptBn: `এবার ভুল বাক্যাংশটি নিজে সঠিকভাবে লিখে সংশোধন করুন:`,
    flawedOriginal: original,
    expectedCorrected: corrected,
    hintTokens,
  };
}

export function evaluateMistakeRewrite(
  userRewrite: string,
  expectedCorrected: string
): { isCorrect: boolean; feedbackEn: string; feedbackBn: string } {
  const normUser = normalizeComparable(userRewrite);
  const normExpected = normalizeComparable(expectedCorrected);

  if (!normUser) {
    return {
      isCorrect: false,
      feedbackEn: 'Type the corrected English phrase before checking.',
      feedbackBn: 'যাচাই করার আগে সঠিক ইংরেজি বাক্যাংশটি লিখুন।',
    };
  }

  const isCorrect = normUser === normExpected;
  if (isCorrect) {
    return {
      isCorrect: true,
      feedbackEn: 'Accurate repair! Your review schedule and pattern status have been updated.',
      feedbackBn: 'সঠিক সংশোধন! আপনার রিভিউ সূচি এবং ভুলের অবস্থা হালনাগাদ করা হয়েছে।',
    };
  }

  return {
    isCorrect: false,
    feedbackEn: `Not quite yet. Target form: "${expectedCorrected}". Compare your tense, preposition, or word order and try once more.`,
    feedbackBn: `এখনো পুরোপুরি মেলেনি। সঠিক রূপ: "${expectedCorrected}"। ক্রিয়ার কাল, প্রিপজিশন বা শব্দক্রম মিলিয়ে আরেকবার চেষ্টা করুন।`,
  };
}

const MISTAKE_REVIEW_INTERVALS: Record<SpacedRepetitionPreset, [number, number, number]> = {
  intensive: [1, 2, 5],
  standard: [1, 3, 7],
  relaxed: [2, 5, 12],
};

function addDaysIso(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

/**
 * Updates a mistake's status (`active` -> `practicing` -> `resolved`) and spaced review schedule
 * based on verified retesting—never resolving on a single unverified pass.
 * - Pass #1: moves to `practicing` with short retention review interval.
 * - Pass #2+: moves to `resolved` with expanded long-term check-in interval.
 * - Failed retest: returns to `active` with immediate 1-day review.
 */
export function computeNextMistakeReview(
  item: MistakeMemoryItem,
  passed: boolean,
  preset: SpacedRepetitionPreset,
  nowIso: string = new Date().toISOString()
): {
  status: MistakeStatus;
  practiceAttemptsCount: number;
  practicePassCount: number;
  reviewIntervalDays: number;
  lastPracticedAt: string;
  nextReviewAt: string;
} {
  const intervals = MISTAKE_REVIEW_INTERVALS[preset];
  const prevAttempts = item.practiceAttemptsCount ?? 0;
  const prevPasses = item.practicePassCount ?? 0;

  if (!passed) {
    const interval = intervals[0];
    return {
      status: 'active',
      practiceAttemptsCount: prevAttempts + 1,
      practicePassCount: 0,
      reviewIntervalDays: interval,
      lastPracticedAt: nowIso,
      nextReviewAt: addDaysIso(nowIso, interval),
    };
  }

  const nextPasses = prevPasses + 1;
  if (nextPasses === 1) {
    const interval = intervals[1];
    return {
      status: 'practicing',
      practiceAttemptsCount: prevAttempts + 1,
      practicePassCount: nextPasses,
      reviewIntervalDays: interval,
      lastPracticedAt: nowIso,
      nextReviewAt: addDaysIso(nowIso, interval),
    };
  }

  const interval = intervals[2];
  return {
    status: 'resolved',
    practiceAttemptsCount: prevAttempts + 1,
    practicePassCount: nextPasses,
    reviewIntervalDays: interval,
    lastPracticedAt: nowIso,
    nextReviewAt: addDaysIso(nowIso, interval),
  };
}
