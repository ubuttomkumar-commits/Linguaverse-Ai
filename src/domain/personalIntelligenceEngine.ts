import { getAllLessons, getLessonById } from './curriculumData';
import {
  classifyMistakeCategory,
  getMistakeCategoryMeta,
  MISTAKE_FILTER_CATEGORIES,
} from './mistakeMemoryEngine';
import { getSpeakingScenario } from './speakingScenarios';
import type { CommunicationDnaProfile } from './communicationDnaEngine';
import type {
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeDrillAttemptRecord,
  MistakeFilterCategory,
  MistakeMemoryItem,
  SpeakingSessionRecord,
  TransferAttemptRecord,
} from '../types/domain';

export interface DailyPracticePoint {
  dateKey: string;
  labelEn: string;
  labelBn: string;
  minutes: number;
  sessionsCount: number;
}

export interface LessonCompletionPoint {
  lessonId: string;
  shortLabel: string;
  titleEn: string;
  titleBn: string;
  attempts: number;
  lastAccuracyPercent: number;
  masteryPercent: number;
}

export interface CategoryRecurrencePoint {
  category: MistakeFilterCategory;
  labelEn: string;
  labelBn: string;
  activeCount: number;
  practicingCount: number;
  resolvedCount: number;
  totalOccurrences: number;
  recurrenceRatePercent: number;
}

export interface SpacedRetentionPoint {
  id: string;
  labelEn: string;
  labelBn: string;
  kind: 'lesson' | 'mistake';
  retentionPercent: number;
  intervalDays: number;
  isDueNow: boolean;
  nextReviewAt: string;
}

export interface NextBestActionItem {
  id: string;
  priority: 'high' | 'medium' | 'baseline';
  titleEn: string;
  titleBn: string;
  reasonEn: string;
  reasonBn: string;
  ctaLabelEn: string;
  ctaLabelBn: string;
  to: string;
}

function toLocalDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

/**
 * Computes honest 7-day rolling Weekly Practice Minutes strictly from real persisted
 * Academy lessons, Speaking Studio sessions, and Mistake Memory micro-drills.
 */
export function buildWeeklyPracticeSeries(
  lessonAttempts: LessonAttemptRecord[],
  speakingSessions: SpeakingSessionRecord[],
  drillAttempts: MistakeDrillAttemptRecord[],
  now: Date = new Date(),
  transferAttempts: TransferAttemptRecord[] = []
): { points: DailyPracticePoint[]; totalMinutes: number; hasData: boolean } {
  const secondsByDay = new Map<string, number>();
  const countByDay = new Map<string, number>();

  const addEntry = (iso: string, seconds: number) => {
    const key = toLocalDateKey(iso);
    secondsByDay.set(key, (secondsByDay.get(key) ?? 0) + Math.max(0, seconds));
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  };

  for (const la of lessonAttempts) {
    addEntry(la.completedAt, la.durationSeconds);
  }
  for (const sp of speakingSessions) {
    if (sp.turns.length > 0) {
      addEntry(sp.updatedAt, sp.durationSeconds);
    }
  }
  for (const dr of drillAttempts) {
    addEntry(dr.timestamp, dr.durationSeconds);
  }
  for (const tr of transferAttempts) {
    addEntry(tr.completedAt, tr.durationSeconds);
  }

  const points: DailyPracticePoint[] = [];
  let totalMinutes = 0;

  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(now);
    day.setDate(now.getDate() - offset);
    const key = toLocalDateKey(day);
    const sec = secondsByDay.get(key) ?? 0;
    const sessionsCount = countByDay.get(key) ?? 0;
    const minutes = sessionsCount > 0 ? Math.max(1, Math.round(sec / 60)) : 0;
    totalMinutes += minutes;

    points.push({
      dateKey: key,
      labelEn: DAY_NAMES_EN[day.getDay()],
      labelBn: DAY_NAMES_BN[day.getDay()],
      minutes,
      sessionsCount,
    });
  }

  return {
    points,
    totalMinutes,
    hasData: totalMinutes > 0,
  };
}

/**
 * Computes Lesson Completions & Mastery Progress across attempted Academy lessons.
 */
export function buildLessonCompletionSeries(
  lessonMastery: Record<string, LessonMasteryRecord>
): { points: LessonCompletionPoint[]; totalAttemptedLessons: number; hasData: boolean } {
  const records = Object.values(lessonMastery).sort(
    (a, b) => new Date(a.lastAttemptAt).getTime() - new Date(b.lastAttemptAt).getTime()
  );

  const points: LessonCompletionPoint[] = records.map((rec, idx) => {
    const lesson = getLessonById(rec.lessonId);
    return {
      lessonId: rec.lessonId,
      shortLabel: `L${idx + 1}`,
      titleEn: lesson?.titleEn ?? rec.lessonId,
      titleBn: lesson?.titleBn ?? rec.lessonId,
      attempts: rec.attemptCount,
      lastAccuracyPercent: rec.lastAccuracyPercent,
      masteryPercent: rec.masteryPercent,
    };
  });

  return {
    points,
    totalAttemptedLessons: points.length,
    hasData: points.length > 0,
  };
}

/**
 * Computes real Mistake Recurrence Rate across the 6 canonical Mistake Memory categories
 * (excluding learner-reported false AI corrections).
 */
export function buildMistakeRecurrenceSeries(
  mistakes: MistakeMemoryItem[]
): {
  points: CategoryRecurrencePoint[];
  overallRecurrenceRatePercent: number | null;
  totalActive: number;
  totalPracticing: number;
  totalResolved: number;
  hasData: boolean;
} {
  const validMistakes = mistakes.filter((m) => !m.falseCorrectionReported);
  if (validMistakes.length === 0) {
    return {
      points: [],
      overallRecurrenceRatePercent: null,
      totalActive: 0,
      totalPracticing: 0,
      totalResolved: 0,
      hasData: false,
    };
  }

  const buckets = new Map<MistakeFilterCategory, MistakeMemoryItem[]>();
  for (const cat of MISTAKE_FILTER_CATEGORIES) {
    buckets.set(cat.id, []);
  }
  for (const item of validMistakes) {
    const cat = classifyMistakeCategory(item.category, item.domain);
    buckets.get(cat)?.push(item);
  }

  const points: CategoryRecurrencePoint[] = [];
  let recurringPatterns = 0;
  let totalActive = 0;
  let totalPracticing = 0;
  let totalResolved = 0;

  for (const cat of MISTAKE_FILTER_CATEGORIES) {
    const items = buckets.get(cat.id) ?? [];
    if (items.length === 0) continue;

    const activeCount = items.filter((m) => m.status === 'active').length;
    const practicingCount = items.filter((m) => m.status === 'practicing').length;
    const resolvedCount = items.filter((m) => m.status === 'resolved').length;
    const totalOccurrences = items.reduce((sum, m) => sum + Math.max(1, m.occurrences), 0);
    const repeatedCount = items.filter((m) => m.occurrences > 1).length;
    recurringPatterns += repeatedCount;
    totalActive += activeCount;
    totalPracticing += practicingCount;
    totalResolved += resolvedCount;

    points.push({
      category: cat.id,
      labelEn: cat.labelEn,
      labelBn: cat.labelBn,
      activeCount,
      practicingCount,
      resolvedCount,
      totalOccurrences,
      recurrenceRatePercent: Math.round((repeatedCount / items.length) * 100),
    });
  }

  points.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

  return {
    points,
    overallRecurrenceRatePercent: Math.round((recurringPatterns / validMistakes.length) * 100),
    totalActive,
    totalPracticing,
    totalResolved,
    hasData: true,
  };
}

/**
 * Computes Spaced Repetition Retention across real practiced Academy lessons and
 * practiced Mistake Memory patterns.
 */
export function buildSpacedRetentionSeries(
  lessonMastery: Record<string, LessonMasteryRecord>,
  mistakes: MistakeMemoryItem[],
  now: Date = new Date()
): {
  points: SpacedRetentionPoint[];
  dueNowCount: number;
  averageRetentionPercent: number | null;
  hasData: boolean;
} {
  const nowMs = now.getTime();
  const points: SpacedRetentionPoint[] = [];

  for (const rec of Object.values(lessonMastery)) {
    const lesson = getLessonById(rec.lessonId);
    const isDueNow = new Date(rec.nextReviewAt).getTime() <= nowMs;
    points.push({
      id: `lesson_${rec.lessonId}`,
      labelEn: lesson?.titleEn ?? rec.lessonId,
      labelBn: lesson?.titleBn ?? rec.lessonId,
      kind: 'lesson',
      retentionPercent: rec.masteryPercent,
      intervalDays: rec.reviewIntervalDays,
      isDueNow,
      nextReviewAt: rec.nextReviewAt,
    });
  }

  const practicedMistakes = mistakes.filter(
    (m) => !m.falseCorrectionReported && Boolean(m.nextReviewAt)
  );
  for (const m of practicedMistakes) {
    const isDueNow = m.nextReviewAt ? new Date(m.nextReviewAt).getTime() <= nowMs : false;
    const retentionPercent =
      m.status === 'resolved' ? 100 : m.status === 'practicing' ? 55 : 20;
    const catMeta = getMistakeCategoryMeta(classifyMistakeCategory(m.category, m.domain));
    points.push({
      id: `mistake_${m.id}`,
      labelEn: `${catMeta.labelEn} drill`,
      labelBn: `${catMeta.labelBn} ড্রিল`,
      kind: 'mistake',
      retentionPercent,
      intervalDays: m.reviewIntervalDays ?? 1,
      isDueNow,
      nextReviewAt: m.nextReviewAt!,
    });
  }

  points.sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());

  const dueNowCount = points.filter((p) => p.isDueNow).length;
  const averageRetentionPercent =
    points.length > 0
      ? Math.round(points.reduce((sum, p) => sum + p.retentionPercent, 0) / points.length)
      : null;

  return {
    points: points.slice(0, 8),
    dueNowCount,
    averageRetentionPercent,
    hasData: points.length > 0,
  };
}

export interface NextBestActionInput {
  latestDiagnostic: EvidenceStartingProfile | null;
  mistakes: MistakeMemoryItem[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  lessonAttempts: LessonAttemptRecord[];
  exerciseAttempts: ExerciseAttemptRecord[];
  speakingSessions: SpeakingSessionRecord[];
  dnaProfile: CommunicationDnaProfile;
  now?: Date;
}

/**
 * Generates evidence-based, explainable Next Best Actions with explicit causal reasons
 * citing the learner's real sessions, mistakes, due reviews, or coverage gaps.
 */
export function generateNextBestActions(input: NextBestActionInput): NextBestActionItem[] {
  const {
    latestDiagnostic,
    mistakes,
    lessonMastery,
    speakingSessions,
    dnaProfile,
    now = new Date(),
  } = input;

  const actions: NextBestActionItem[] = [];
  const validMistakes = mistakes.filter((m) => !m.falseCorrectionReported);
  const activeMistakes = validMistakes.filter((m) => m.status !== 'resolved');

  // 1. Check most recent Speaking Studio session with active errors
  const latestSpeaking = speakingSessions.find((s) => s.turns.length > 0);
  if (latestSpeaking && latestSpeaking.totalMistakesDetected > 0) {
    const scenario = getSpeakingScenario(latestSpeaking.modeId);
    const sessionMistakes = activeMistakes.filter(
      (m) => m.speakingSessionId === latestSpeaking.id
    );
    if (sessionMistakes.length > 0) {
      // Find top category in that session
      const catCounts = new Map<MistakeFilterCategory, { count: number; sample: MistakeMemoryItem }>();
      for (const sm of sessionMistakes) {
        const cat = classifyMistakeCategory(sm.category, sm.domain);
        const existing = catCounts.get(cat);
        catCounts.set(cat, {
          count: (existing?.count ?? 0) + sm.occurrences,
          sample: existing?.sample ?? sm,
        });
      }
      const [topCat, topInfo] = Array.from(catCounts.entries()).sort(
        (a, b) => b[1].count - a[1].count
      )[0];
      const catMeta = getMistakeCategoryMeta(topCat);

      actions.push({
        id: `nba_speaking_mistake_${topInfo.sample.id}`,
        priority: 'high',
        titleEn: `Fix ${catMeta.labelEn} errors from ${scenario.titleEn}`,
        titleBn: `${scenario.titleBn} সেশনের ${catMeta.labelBn} ভুল সংশোধন করুন`,
        reasonEn: `Recommended because you made ${topInfo.count} ${catMeta.labelEn} ${
          topInfo.count === 1 ? 'error' : 'errors'
        } in your last ${scenario.titleEn} speaking session.`,
        reasonBn: `সুপারিশের কারণ: আপনার সর্বশেষ ${scenario.titleBn} স্পিকিং সেশনে ${topInfo.count}টি ${catMeta.labelBn} ভুল শনাক্ত হয়েছে।`,
        ctaLabelEn: 'Launch Targeted Fix Drill',
        ctaLabelBn: 'টার্গেটেড ড্রিল শুরু করুন',
        to: `/app/improve?focus=${encodeURIComponent(topInfo.sample.id)}`,
      });
    }
  }

  // 2. Check highest-frequency active mistake across Academy / Diagnostic if not already added
  if (actions.length === 0 && activeMistakes.length > 0) {
    const topMistake = [...activeMistakes].sort((a, b) => b.occurrences - a.occurrences)[0];
    const catMeta = getMistakeCategoryMeta(
      classifyMistakeCategory(topMistake.category, topMistake.domain)
    );
    actions.push({
      id: `nba_top_mistake_${topMistake.id}`,
      priority: 'high',
      titleEn: `Drill your recurring ${catMeta.labelEn} pattern`,
      titleBn: `আপনার পুনরাবৃত্ত ${catMeta.labelBn} ভুলটি অনুশীলন করুন`,
      reasonEn: `Recommended because "${topMistake.userExample}" → "${topMistake.correctedExample}" has occurred ${topMistake.occurrences}x and is still ${topMistake.status}.`,
      reasonBn: `সুপারিশের কারণ: "${topMistake.userExample}" → "${topMistake.correctedExample}" ভুলটি ${topMistake.occurrences} বার দেখা গেছে এবং এখনো সংশোধনের পর্যায়ে আছে।`,
      ctaLabelEn: 'Fix This Mistake',
      ctaLabelBn: 'এই ভুলটি ঠিক করুন',
      to: `/app/improve?focus=${encodeURIComponent(topMistake.id)}`,
    });
  }

  // 3. Check overdue or low-mastery spaced repetition lesson review
  const nowMs = now.getTime();
  const masteryList = Object.values(lessonMastery);
  const dueOrWeakLesson = masteryList
    .filter((rec) => new Date(rec.nextReviewAt).getTime() <= nowMs || rec.masteryPercent < 70)
    .sort((a, b) => a.masteryPercent - b.masteryPercent)[0];

  if (dueOrWeakLesson) {
    const lesson = getLessonById(dueOrWeakLesson.lessonId);
    const isDue = new Date(dueOrWeakLesson.nextReviewAt).getTime() <= nowMs;
    actions.push({
      id: `nba_lesson_review_${dueOrWeakLesson.lessonId}`,
      priority: isDue ? 'high' : 'medium',
      titleEn: isDue
        ? `Complete spaced review: ${lesson?.titleEn ?? dueOrWeakLesson.lessonId}`
        : `Reinforce mastery: ${lesson?.titleEn ?? dueOrWeakLesson.lessonId}`,
      titleBn: isDue
        ? `নির্ধারিত রিভিউ সম্পন্ন করুন: ${lesson?.titleBn ?? dueOrWeakLesson.lessonId}`
        : `মাস্টারি আরও শক্ত করুন: ${lesson?.titleBn ?? dueOrWeakLesson.lessonId}`,
      reasonEn: isDue
        ? `Recommended because your spaced repetition window is due (current verified mastery: ${dueOrWeakLesson.masteryPercent}% across ${dueOrWeakLesson.attemptCount} ${dueOrWeakLesson.attemptCount === 1 ? 'attempt' : 'attempts'}).`
        : `Recommended because this lesson is at ${dueOrWeakLesson.masteryPercent}% mastery after ${dueOrWeakLesson.attemptCount} ${dueOrWeakLesson.attemptCount === 1 ? 'attempt' : 'attempts'} — another pass advances retention.`,
      reasonBn: isDue
        ? `সুপারিশের কারণ: এই লেসনের স্পেসড রিভিউ সময় হয়ে গেছে (বর্তমান প্রমাণিত মাস্টারি: ${dueOrWeakLesson.masteryPercent}%)।`
        : `সুপারিশের কারণ: ${dueOrWeakLesson.attemptCount} বারের অনুশীলনে এই লেসনের মাস্টারি ${dueOrWeakLesson.masteryPercent}% — আরেকটি রিভিউ স্মৃতিতে ধরে রাখতে সাহায্য করবে।`,
      ctaLabelEn: 'Open Lesson Review',
      ctaLabelBn: 'লেসন রিভিউ খুলুন',
      to: `/app/learn/${dueOrWeakLesson.lessonId}`,
    });
  }

  // 4. Check Speaking DNA coverage gap
  const speakingDim = dnaProfile.dimensions.find((d) => d.id === 'speaking_task_completion');
  if (speakingDim && speakingDim.sampleSize < 3 && actions.length < 3) {
    const remaining = 3 - speakingDim.sampleSize;
    actions.push({
      id: 'nba_unlock_speaking_dna',
      priority: 'medium',
      titleEn: 'Unlock Speaking Task Completion in Communication DNA',
      titleBn: 'Communication DNA-তে স্পিকিং দক্ষতা আনলক করুন',
      reasonEn: `Recommended because you currently have ${speakingDim.sampleSize} speaking ${
        speakingDim.sampleSize === 1 ? 'turn' : 'turns'
      } recorded — ${remaining} more ${
        remaining === 1 ? 'turn is' : 'turns are'
      } needed to measure Speaking Task Completion honestly.`,
      reasonBn: `সুপারিশের কারণ: এখন পর্যন্ত ${speakingDim.sampleSize}টি স্পিকিং ধাপ সংরক্ষিত আছে — সঠিকভাবে স্পিকিং দক্ষতা পরিমাপ করতে আরও ${remaining}টি ধাপ প্রয়োজন।`,
      ctaLabelEn: 'Start Speaking Studio',
      ctaLabelBn: 'স্পিকিং স্টুডিও খুলুন',
      to: '/app/speak',
    });
  }

  // 5. Cold-start honest baseline recommendations when user has not completed Academy or Diagnostic yet
  if (actions.length < 3) {
    const allLessons = getAllLessons();
    const nextUnstarted = allLessons.find((l) => !lessonMastery[l.id]);
    if (nextUnstarted) {
      actions.push({
        id: `nba_next_lesson_${nextUnstarted.id}`,
        priority: 'baseline',
        titleEn: `Start Academy Lesson: ${nextUnstarted.titleEn}`,
        titleBn: `একাডেমি লেসন শুরু করুন: ${nextUnstarted.titleBn}`,
        reasonEn:
          masteryList.length === 0
            ? 'Recommended because you have 0 completed Academy lessons — finishing this 7-stage lesson starts your verified Grammar & Sentence Complexity evidence.'
            : `Recommended as your next unstarted curriculum lesson (${masteryList.length} of ${allLessons.length} lessons practiced so far).`,
        reasonBn:
          masteryList.length === 0
            ? 'সুপারিশের কারণ: এখনো ০টি একাডেমি লেসন সম্পন্ন হয়েছে — এই ৭-ধাপের লেসনটি আপনার ব্যাকরণ ও বাক্য গঠনের প্রমাণিত ডেটা তৈরি শুরু করবে।'
            : `সুপারিশের কারণ: এটি আপনার পরবর্তী নতুন লেসন (এখন পর্যন্ত ${allLessons.length}টির মধ্যে ${masteryList.length}টি অনুশীলন করেছেন)।`,
        ctaLabelEn: 'Start Lesson',
        ctaLabelBn: 'লেসন শুরু করুন',
        to: `/app/learn/${nextUnstarted.id}`,
      });
    }
  }

  if (!latestDiagnostic && actions.length < 3) {
    actions.push({
      id: 'nba_take_diagnostic',
      priority: 'baseline',
      titleEn: 'Complete the 5-Question Baseline Diagnostic',
      titleBn: '৫-প্রশ্নের ডায়াগনস্টিক মূল্যায়ন সম্পন্ন করুন',
      reasonEn:
        'Recommended because no baseline diagnostic is on record yet — completing it seeds your Reading, Vocabulary, and Grammar DNA.',
      reasonBn:
        'সুপারিশের কারণ: এখনো কোনো বেসলাইন ডায়াগনস্টিক সম্পন্ন হয়নি — এটি আপনার রিডিং, শব্দভাণ্ডার ও ব্যাকরণের প্রাথমিক প্রমাণ তৈরি করবে।',
      ctaLabelEn: 'Take Diagnostic',
      ctaLabelBn: 'ডায়াগনস্টিক দিন',
      to: '/diagnostic',
    });
  }

  return actions.slice(0, 3);
}
