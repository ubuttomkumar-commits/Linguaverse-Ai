import type {
  LessonMasteryRecord,
  MistakeMemoryItem,
  PressureLadderLevelId,
  SpeakingSessionRecord,
  TransferAttemptRecord,
  TransferScenarioId,
  XpActionSourceType,
  XpLedgerEntry,
} from '../types/domain';
import { getPressureLadderTier } from './pressureLadder';

export const VERIFIED_XP_RULES = {
  LESSON_FIRST_COMPLETION: 50,
  LESSON_MASTERY_TIER_UP: 25,
  SPEAKING_SESSION_COMPLETED: 40,
  MISTAKE_RESOLVED: 35,
} as const;

export interface PendingXpAward {
  idempotencyKey: string;
  sourceType: XpActionSourceType;
  sourceId: string;
  titleEn: string;
  titleBn: string;
  detailEn: string;
  detailBn: string;
  xpEarned: number;
}

export function buildLessonCompletionXpAward(
  lessonId: string,
  lessonTitleEn: string,
  lessonTitleBn: string,
  accuracyPercent: number
): PendingXpAward | null {
  // Only verified passing lesson completions (>= 60% overall accuracy) earn XP
  if (accuracyPercent < 60) return null;
  return {
    idempotencyKey: `lesson_complete:${lessonId}`,
    sourceType: 'lesson_completed',
    sourceId: lessonId,
    titleEn: `Assessed Lesson Completed: ${lessonTitleEn}`,
    titleBn: `মূল্যায়িত লেসন সম্পন্ন: ${lessonTitleBn}`,
    detailEn: `Verified completion with ${accuracyPercent}% accuracy (awarded once per lesson).`,
    detailBn: `${accuracyPercent}% নির্ভুলতাসহ প্রমাণিত লেসন সমাপ্তি (প্রতি লেসনে একবারই প্রদেয়)।`,
    xpEarned: VERIFIED_XP_RULES.LESSON_FIRST_COMPLETION,
  };
}

export function buildLessonMasteryTierXpAward(
  lessonId: string,
  lessonTitleEn: string,
  lessonTitleBn: string,
  masteryStatus: LessonMasteryRecord['status'],
  masteryPercent: number
): PendingXpAward | null {
  if (
    masteryStatus !== 'reinforced' &&
    masteryStatus !== 'consolidating' &&
    masteryStatus !== 'mastered'
  ) {
    return null;
  }
  const tierLabels: Record<'reinforced' | 'consolidating' | 'mastered', { en: string; bn: string }> = {
    reinforced: { en: 'Reinforced (70%)', bn: 'সুদৃঢ় (৭০%)' },
    consolidating: { en: 'Consolidating (88%)', bn: 'সংহত (৮৮%)' },
    mastered: { en: 'Verified Mastery (100%)', bn: 'প্রমাণিত মাস্টারি (১০০%)' },
  };
  return {
    idempotencyKey: `lesson_mastery_tier:${lessonId}:${masteryStatus}`,
    sourceType: 'lesson_mastery_tier',
    sourceId: lessonId,
    titleEn: `Spaced Review Milestone: ${lessonTitleEn}`,
    titleBn: `স্পেসড রিভিউ মাইলফলক: ${lessonTitleBn}`,
    detailEn: `Advanced to ${tierLabels[masteryStatus].en} (${masteryPercent}% verified mastery).`,
    detailBn: `${tierLabels[masteryStatus].bn} ধাপে উন্নীত (${masteryPercent}% প্রমাণিত মাস্টারি)।`,
    xpEarned: VERIFIED_XP_RULES.LESSON_MASTERY_TIER_UP,
  };
}

export function buildSpeakingSessionXpAward(
  sessionId: string,
  modeTitleEn: string,
  modeTitleBn: string,
  turnCount: number
): PendingXpAward | null {
  if (turnCount < 1) return null;
  return {
    idempotencyKey: `speaking_session:${sessionId}`,
    sourceType: 'speaking_session_completed',
    sourceId: sessionId,
    titleEn: `Speaking Studio Session: ${modeTitleEn}`,
    titleBn: `স্পিকিং স্টুডিও সেশন: ${modeTitleBn}`,
    detailEn: `Verified AI-evaluated conversation session (idempotent per session ID).`,
    detailBn: `AI মূল্যায়িত বাস্তব কথোপকথন সেশন (প্রতি সেশনে একবারই XP যুক্ত হয়)।`,
    xpEarned: VERIFIED_XP_RULES.SPEAKING_SESSION_COMPLETED,
  };
}

export function buildMistakeResolvedXpAward(
  mistake: MistakeMemoryItem
): PendingXpAward | null {
  if (mistake.status !== 'resolved' || mistake.falseCorrectionReported) return null;
  return {
    idempotencyKey: `mistake_resolved:${mistake.id}`,
    sourceType: 'mistake_resolved',
    sourceId: mistake.id,
    titleEn: `Recurring Mistake Resolved (${mistake.category})`,
    titleBn: `পুনরাবৃত্ত ভুল সমাধান হয়েছে (${mistake.category})`,
    detailEn: `Verified across 2+ targeted retests: "${mistake.userExample}" → "${mistake.correctedExample}".`,
    detailBn: `২+ বার সফল পুনরায় যাচাইয়ে সমাধানকৃত: "${mistake.userExample}" → "${mistake.correctedExample}"।`,
    xpEarned: VERIFIED_XP_RULES.MISTAKE_RESOLVED,
  };
}

export function buildTransferPassXpAward(
  scenarioId: TransferScenarioId,
  scenarioTitleEn: string,
  scenarioTitleBn: string,
  pressureLevel: PressureLadderLevelId,
  overallScore: number,
  passed: boolean
): PendingXpAward | null {
  if (!passed) return null;
  const tier = getPressureLadderTier(pressureLevel);
  return {
    idempotencyKey: `transfer_pass:${scenarioId}:${pressureLevel}`,
    sourceType: 'transfer_lab_passed',
    sourceId: `${scenarioId}:${pressureLevel}`,
    titleEn: `Transfer Lab Passed: ${scenarioTitleEn} (${tier.shortLabelEn})`,
    titleBn: `ট্রান্সফার ল্যাব উত্তীর্ণ: ${scenarioTitleBn} (${tier.shortLabelBn})`,
    detailEn: `Rubric score ${overallScore}% at ${tier.titleEn} (idempotent per scenario & pressure tier).`,
    detailBn: `${tier.titleBn} ধাপে রুব্রিক স্কোর ${overallScore}% (প্রতি সিনারিও ও লেভেলে একবারই XP)।`,
    xpEarned: tier.transferXpReward,
  };
}

/**
 * Pure idempotent ledger append: NEVER adds duplicate XP if an entry with the same
 * `idempotencyKey` already exists for this user.
 */
export function appendIdempotentXpAward(
  existingLedger: XpLedgerEntry[],
  userId: string,
  award: PendingXpAward | null,
  verifiedAt: string,
  entryId: string
): { ledger: XpLedgerEntry[]; newlyAwarded: XpLedgerEntry | null } {
  if (!award || award.xpEarned <= 0) {
    return { ledger: existingLedger, newlyAwarded: null };
  }

  const alreadyAwarded = existingLedger.some(
    (entry) => entry.idempotencyKey === award.idempotencyKey
  );
  if (alreadyAwarded) {
    return { ledger: existingLedger, newlyAwarded: null };
  }

  const newEntry: XpLedgerEntry = {
    id: entryId,
    userId,
    idempotencyKey: award.idempotencyKey,
    sourceType: award.sourceType,
    sourceId: award.sourceId,
    titleEn: award.titleEn,
    titleBn: award.titleBn,
    detailEn: award.detailEn,
    detailBn: award.detailBn,
    xpEarned: award.xpEarned,
    verifiedAt,
  };

  return {
    ledger: [newEntry, ...existingLedger],
    newlyAwarded: newEntry,
  };
}

export function computeTotalVerifiedXp(ledger: XpLedgerEntry[]): number {
  return ledger.reduce((sum, entry) => sum + Math.max(0, entry.xpEarned), 0);
}

export interface VerifiedAchievement {
  id: string;
  titleEn: string;
  titleBn: string;
  criteriaEn: string;
  criteriaBn: string;
  unlocked: boolean;
  progressTextEn: string;
  progressTextBn: string;
  unlockedAt: string | null;
}

export function computeVerifiedAchievements(input: {
  xpLedger: XpLedgerEntry[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  speakingSessions: SpeakingSessionRecord[];
  mistakes: MistakeMemoryItem[];
  transferAttempts: TransferAttemptRecord[];
}): VerifiedAchievement[] {
  const { xpLedger, lessonMastery, speakingSessions, mistakes, transferAttempts } = input;

  const completedLessonsCount = Object.values(lessonMastery).filter(
    (m) => m.bestAccuracyPercent >= 60
  ).length;
  const speakingCount = speakingSessions.filter((s) => s.turns.length > 0).length;
  const resolvedMistakesCount = mistakes.filter(
    (m) => m.status === 'resolved' && !m.falseCorrectionReported
  ).length;
  const passedTransfers = transferAttempts.filter((a) => a.passed);
  const highPressurePasses = passedTransfers.filter(
    (a) =>
      a.pressureLevel === 'level_4_twist' || a.pressureLevel === 'level_5_timed_high_stakes'
  );
  const totalXp = computeTotalVerifiedXp(xpLedger);

  const firstMatchTime = (sourceType: XpActionSourceType): string | null => {
    const matches = xpLedger.filter((e) => e.sourceType === sourceType);
    return matches.length > 0 ? matches[matches.length - 1].verifiedAt : null;
  };

  return [
    {
      id: 'first_lesson_verified',
      titleEn: 'Academy Foundation',
      titleBn: 'একাডেমি ভিত্তি অর্জন',
      criteriaEn: 'Pass at least 1 assessed Academy lesson (>= 60% accuracy).',
      criteriaBn: 'ন্যূনতম ১টি মূল্যায়িত একাডেমি লেসনে উত্তীর্ণ হন (৬০%+ নির্ভুলতা)।',
      unlocked: completedLessonsCount >= 1,
      progressTextEn: `${Math.min(1, completedLessonsCount)}/1 lesson`,
      progressTextBn: `${Math.min(1, completedLessonsCount)}/১ লেসন`,
      unlockedAt: firstMatchTime('lesson_completed'),
    },
    {
      id: 'first_speaking_verified',
      titleEn: 'Voice-First Initiator',
      titleBn: 'প্রথম স্পিকিং সেশন',
      criteriaEn: 'Complete 1 AI-evaluated Speaking Studio conversation.',
      criteriaBn: '১টি AI মূল্যায়িত স্পিকিং স্টুডিও সেশন সম্পন্ন করুন।',
      unlocked: speakingCount >= 1,
      progressTextEn: `${Math.min(1, speakingCount)}/1 session`,
      progressTextBn: `${Math.min(1, speakingCount)}/১ সেশন`,
      unlockedAt: firstMatchTime('speaking_session_completed'),
    },
    {
      id: 'mistake_resolver',
      titleEn: 'Pattern Repairer',
      titleBn: 'ভুল সংশোধনকারী',
      criteriaEn: 'Resolve 1 recurring mistake via verified 2-pass retesting.',
      criteriaBn: '২-ধাপের সফল পুনরায় যাচাইয়ে ১টি ভুল Resolved করুন।',
      unlocked: resolvedMistakesCount >= 1,
      progressTextEn: `${Math.min(1, resolvedMistakesCount)}/1 resolved`,
      progressTextBn: `${Math.min(1, resolvedMistakesCount)}/১ সমাধান`,
      unlockedAt: firstMatchTime('mistake_resolved'),
    },
    {
      id: 'transfer_pioneer',
      titleEn: 'Real-World Transfer',
      titleBn: 'বাস্তব প্রয়োগ দক্ষতা',
      criteriaEn: 'Pass 1 Transfer Lab scenario on all 4 AI grading rubrics.',
      criteriaBn: '৪টি AI রুব্রিকে ১টি ট্রান্সফার ল্যাব সিনারিওতে উত্তীর্ণ হন।',
      unlocked: passedTransfers.length >= 1,
      progressTextEn: `${Math.min(1, passedTransfers.length)}/1 transfer`,
      progressTextBn: `${Math.min(1, passedTransfers.length)}/১ ট্রান্সফার`,
      unlockedAt: firstMatchTime('transfer_lab_passed'),
    },
    {
      id: 'pressure_climber',
      titleEn: 'Under Pressure',
      titleBn: 'উচ্চচাপে সাবলীলতা',
      criteriaEn: 'Pass a Level 4 (Twist) or Level 5 (Timed High-Stakes) Transfer Lab challenge.',
      criteriaBn: 'লেভেল ৪ (টুইস্ট) বা লেভেল ৫ (সময়সীমা) ট্রান্সফার চ্যালেঞ্জে উত্তীর্ণ হন।',
      unlocked: highPressurePasses.length >= 1,
      progressTextEn: `${Math.min(1, highPressurePasses.length)}/1 high-pressure`,
      progressTextBn: `${Math.min(1, highPressurePasses.length)}/১ উচ্চচাপ`,
      unlockedAt: highPressurePasses.length > 0 ? highPressurePasses[0].completedAt : null,
    },
    {
      id: 'xp_250_verified',
      titleEn: 'Verified 250 XP Ledger',
      titleBn: '২৫০ প্রমাণিত XP মাইলফলক',
      criteriaEn: 'Earn 250+ audited XP strictly from verified actions.',
      criteriaBn: 'শুধুমাত্র প্রমাণিত কার্যক্রমের মাধ্যমে ২৫০+ XP অর্জন করুন।',
      unlocked: totalXp >= 250,
      progressTextEn: `${Math.min(250, totalXp)}/250 XP`,
      progressTextBn: `${Math.min(250, totalXp)}/২৫০ XP`,
      unlockedAt: totalXp >= 250 && xpLedger.length > 0 ? xpLedger[0].verifiedAt : null,
    },
  ];
}
