import type {
  CurriculumCourse,
  CurriculumLesson,
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  SpeakingSessionRecord,
  TransferAttemptRecord,
} from '../types/domain';
import {
  computeCommunicationDna,
  type CommunicationDnaProfile,
} from './communicationDnaEngine';
import {
  buildWeeklyPracticeSeries,
  generateNextBestActions,
  type DailyPracticePoint,
  type NextBestActionItem,
} from './personalIntelligenceEngine';
import { isReviewDue } from './spacedRepetition';
import { TRANSFER_SCENARIOS, type TransferScenarioDefinition } from './transferLabEngine';

export interface TodayLearningSummary {
  dailyGoalMinutes: number;
  completedMinutesToday: number;
  remainingMinutesToday: number;
  goalProgressPercent: number;
  goalMetToday: boolean;
  lessonsCompletedToday: number;
  activitiesCompletedToday: number;
  activeStreakDays: number;
  isFirstDayEmpty: boolean;
  focusLabelEn: string;
  focusLabelBn: string;
}

export interface DashboardNextMove {
  id: string;
  priority: 'high' | 'medium' | 'baseline';
  titleEn: string;
  titleBn: string;
  reasonEn: string;
  reasonBn: string;
  skillLabelEn: string;
  skillLabelBn: string;
  estimatedMinutes: number;
  ctaLabelEn: string;
  ctaLabelBn: string;
  to: string;
  ruleBasisEn: string;
  ruleBasisBn: string;
}

export interface PrimaryContinueTarget {
  labelEn: string;
  labelBn: string;
  contextLineEn: string;
  contextLineBn: string;
  to: string;
}

export interface LearnerNotificationItem {
  id: string;
  category: 'assessment' | 'review' | 'mistake' | 'reminder';
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  to: string;
  createdAt: string;
}

export interface DashboardWeeklyAnalytics {
  points: DailyPracticePoint[];
  totalMinutes7d: number;
  activeDaysCount: number;
  hasSufficientTrendData: boolean;
}

export interface WorkspaceSearchResult {
  id: string;
  kind: 'lesson' | 'transfer' | 'mistake';
  titleEn: string;
  titleBn: string;
  metaEn: string;
  metaBn: string;
  to: string;
}

export interface AcademyPathPreviewItem {
  lesson: CurriculumLesson;
  courseTitleEn: string;
  courseTitleBn: string;
  status: 'completed' | 'in_progress' | 'due_review' | 'up_next' | 'locked';
  masteryPercent: number;
  isRecommendedStart: boolean;
}

function toLocalDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes strictly real today-only learning metrics from recorded timestamps.
 * Never fabricates minutes, streaks, or completed activities.
 */
export function computeTodayLearningSummary(input: {
  profile: LearnerProfile | null;
  latestDiagnostic: EvidenceStartingProfile | null;
  lessonAttempts: LessonAttemptRecord[];
  exerciseAttempts: ExerciseAttemptRecord[];
  speakingSessions: SpeakingSessionRecord[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
  transferAttempts: TransferAttemptRecord[];
  mistakes: MistakeMemoryItem[];
  activeStreakDays: number;
  now?: Date;
}): TodayLearningSummary {
  const {
    profile,
    latestDiagnostic,
    lessonAttempts,
    exerciseAttempts,
    speakingSessions,
    mistakeDrillAttempts,
    transferAttempts,
    mistakes,
    activeStreakDays,
    now = new Date(),
  } = input;

  const todayKey = toLocalDateKey(now);
  const dailyGoalMinutes = Math.max(5, profile?.dailyTimeGoalMinutes ?? 15);

  const todayLessons = lessonAttempts.filter((a) => toLocalDateKey(a.completedAt) === todayKey);
  const todayExercises = exerciseAttempts.filter((e) => toLocalDateKey(e.timestamp) === todayKey);
  const todaySpeaking = speakingSessions.filter(
    (s) => s.turns.length > 0 && toLocalDateKey(s.updatedAt) === todayKey
  );
  const todayDrills = mistakeDrillAttempts.filter((d) => toLocalDateKey(d.timestamp) === todayKey);
  const todayTransfers = transferAttempts.filter((t) => toLocalDateKey(t.completedAt) === todayKey);
  const diagnosticToday =
    latestDiagnostic && toLocalDateKey(latestDiagnostic.completedAt) === todayKey;

  let totalSecondsToday = 0;
  for (const la of todayLessons) totalSecondsToday += Math.max(0, la.durationSeconds);
  for (const sp of todaySpeaking) totalSecondsToday += Math.max(0, sp.durationSeconds);
  for (const dr of todayDrills) totalSecondsToday += Math.max(0, dr.durationSeconds);
  for (const tr of todayTransfers) totalSecondsToday += Math.max(0, tr.durationSeconds);
  if (diagnosticToday) {
    // Only add conservative real elapsed baseline if diagnostic has recorded items today
    totalSecondsToday += Math.min(300, (latestDiagnostic?.items.length ?? 0) * 20);
  }

  const activitiesCompletedToday =
    todayLessons.length +
    todaySpeaking.length +
    todayDrills.length +
    todayTransfers.length +
    (diagnosticToday ? 1 : 0);

  const completedMinutesToday =
    totalSecondsToday > 0 ? Math.max(1, Math.round(totalSecondsToday / 60)) : 0;
  const remainingMinutesToday = Math.max(0, dailyGoalMinutes - completedMinutesToday);
  const goalProgressPercent = Math.min(
    100,
    Math.round((completedMinutesToday / dailyGoalMinutes) * 100)
  );

  const totalEverActivity =
    lessonAttempts.length +
    exerciseAttempts.length +
    speakingSessions.filter((s) => s.turns.length > 0).length +
    mistakeDrillAttempts.length +
    transferAttempts.length +
    (latestDiagnostic ? 1 : 0);

  const activeMistakes = mistakes.filter(
    (m) => !m.falseCorrectionReported && m.status !== 'resolved'
  );

  let focusLabelEn = 'Complete your initial 5-skill assessment';
  let focusLabelBn = 'প্রাথমিক ৫-দক্ষতা মূল্যায়ন সম্পন্ন করুন';

  if (latestDiagnostic) {
    if (activeMistakes.length > 0) {
      focusLabelEn = `Fix ${activeMistakes[0].category} pattern in Mistake Memory`;
      focusLabelBn = `মিস্টেক মেমোরিতে ${activeMistakes[0].category} ভুল সংশোধন করুন`;
    } else if (latestDiagnostic.fiveSkillSummary?.personalizedPath) {
      focusLabelEn =
        latestDiagnostic.fiveSkillSummary.personalizedPath.recommendedFirstLessonTitleEn;
      focusLabelBn =
        latestDiagnostic.fiveSkillSummary.personalizedPath.recommendedFirstLessonTitleBn;
    } else {
      focusLabelEn = 'Build fluency with an Academy lesson & Speaking session';
      focusLabelBn = 'একাডেমি লেসন ও স্পিকিং সেশনের মাধ্যমে দক্ষতা বাড়ান';
    }
  } else if (todayLessons.length > 0 || todayExercises.length > 0) {
    focusLabelEn = 'Continue your active Academy track';
    focusLabelBn = 'আপনার চলমান একাডেমি ট্র্যাক এগিয়ে নিন';
  }

  return {
    dailyGoalMinutes,
    completedMinutesToday,
    remainingMinutesToday,
    goalProgressPercent,
    goalMetToday: completedMinutesToday >= dailyGoalMinutes,
    lessonsCompletedToday: todayLessons.length,
    activitiesCompletedToday,
    activeStreakDays,
    isFirstDayEmpty: totalEverActivity === 0 && activitiesCompletedToday === 0,
    focusLabelEn,
    focusLabelBn,
  };
}

/**
 * Resolves the single, honest primary "Continue Learning" action for the Hero section.
 */
export function resolvePrimaryContinueTarget(input: {
  latestDiagnostic: EvidenceStartingProfile | null;
  lessonMastery: Record<string, LessonMasteryRecord>;
  allLessons: CurriculumLesson[];
  mistakes: MistakeMemoryItem[];
  now?: Date;
}): PrimaryContinueTarget {
  const { latestDiagnostic, lessonMastery, allLessons, mistakes, now = new Date() } = input;
  const nowIso = now.toISOString();

  // 1. If diagnostic has not been completed yet and no lessons started, invite baseline assessment
  if (!latestDiagnostic && Object.keys(lessonMastery).length === 0) {
    return {
      labelEn: 'Continue Learning',
      labelBn: 'শেখা শুরু করুন',
      contextLineEn:
        'Start your 5-skill Initial Assessment to map your Communication DNA and unlock a personalized lesson path.',
      contextLineBn:
        'আপনার Communication DNA ম্যাপ করতে এবং ব্যক্তিগত লেসন পাথ পেতে ৫-দক্ষতা প্রাথমিক মূল্যায়ন শুরু করুন।',
      to: '/diagnostic',
    };
  }

  // 2. If a lesson has a due spaced review, resume it directly
  const dueReview = Object.values(lessonMastery)
    .filter((m) => isReviewDue(m, nowIso))
    .sort((a, b) => a.masteryPercent - b.masteryPercent)[0];
  if (dueReview) {
    const lesson = allLessons.find((l) => l.id === dueReview.lessonId);
    if (lesson) {
      return {
        labelEn: 'Continue Learning',
        labelBn: 'শেখা চালিয়ে যান',
        contextLineEn: `Spaced review due: ${lesson.titleEn} (${dueReview.masteryPercent}% verified mastery).`,
        contextLineBn: `নির্ধারিত রিভিউ বাকি: ${lesson.titleBn} (${dueReview.masteryPercent}% প্রমাণিত মাস্টারি)।`,
        to: `/app/learn/${encodeURIComponent(lesson.id)}`,
      };
    }
  }

  // 3. Recommended first lesson from Part 04 assessment if not yet completed
  const recommendedId =
    latestDiagnostic?.fiveSkillSummary?.personalizedPath?.recommendedFirstLessonId;
  if (recommendedId && !lessonMastery[recommendedId]) {
    const recLesson = allLessons.find((l) => l.id === recommendedId);
    if (recLesson) {
      return {
        labelEn: 'Continue Learning',
        labelBn: 'শেখা চালিয়ে যান',
        contextLineEn: `Recommended next lesson from your assessment: ${recLesson.titleEn} (~${recLesson.estimatedMinutes} min).`,
        contextLineBn: `আপনার মূল্যায়ন অনুযায়ী পরবর্তী প্রস্তাবিত লেসন: ${recLesson.titleBn} (~${recLesson.estimatedMinutes} মিনিট)।`,
        to: `/app/learn/${encodeURIComponent(recLesson.id)}`,
      };
    }
  }

  // 4. Next unstarted Academy lesson
  const nextUnstarted = allLessons.find((l) => !lessonMastery[l.id]);
  if (nextUnstarted) {
    const activeMistakesCount = mistakes.filter(
      (m) => !m.falseCorrectionReported && m.status !== 'resolved'
    ).length;
    return {
      labelEn: 'Continue Learning',
      labelBn: 'শেখা চালিয়ে যান',
      contextLineEn:
        activeMistakesCount > 0
          ? `Next in Academy: ${nextUnstarted.titleEn} · ${activeMistakesCount} active pattern${activeMistakesCount === 1 ? '' : 's'} queued in Mistake Memory.`
          : `Next up in Academy: ${nextUnstarted.titleEn} (~${nextUnstarted.estimatedMinutes} min).`,
      contextLineBn:
        activeMistakesCount > 0
          ? `একাডেমির পরবর্তী লেসন: ${nextUnstarted.titleBn} · মিস্টেক মেমোরিতে ${activeMistakesCount}টি প্যাটার্ন অপেক্ষমাণ।`
          : `একাডেমির পরবর্তী লেসন: ${nextUnstarted.titleBn} (~${nextUnstarted.estimatedMinutes} মিনিট)।`,
      to: `/app/learn/${encodeURIComponent(nextUnstarted.id)}`,
    };
  }

  // 5. All lessons started -> Transfer Lab or Speaking Studio
  return {
    labelEn: 'Continue Learning',
    labelBn: 'শেখা চালিয়ে যান',
    contextLineEn:
      'All core Academy lessons have been practiced — test real-world fluency in Transfer Lab.',
    contextLineBn:
      'সব মূল একাডেমি লেসন অনুশীলন সম্পন্ন — এখন ট্রান্সফার ল্যাবে বাস্তব প্রয়োগ যাচাই করুন।',
    to: '/app/transfer-lab',
  };
}

/**
 * Deterministic, transparent "Your Next Best Move" engine built on real learner records.
 * Clearly exposes why the recommendation was chosen without claiming a live black-box AI model.
 */
export function computeDashboardNextBestMoves(input: {
  latestDiagnostic: EvidenceStartingProfile | null;
  mistakes: MistakeMemoryItem[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  lessonAttempts: LessonAttemptRecord[];
  exerciseAttempts: ExerciseAttemptRecord[];
  speakingSessions: SpeakingSessionRecord[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
  allLessons: CurriculumLesson[];
  now?: Date;
}): { primaryMove: DashboardNextMove; secondaryMoves: DashboardNextMove[]; dnaProfile: CommunicationDnaProfile } {
  const dnaProfile = computeCommunicationDna({
    latestDiagnostic: input.latestDiagnostic,
    exerciseAttempts: input.exerciseAttempts,
    lessonAttempts: input.lessonAttempts,
    speakingSessions: input.speakingSessions,
    mistakes: input.mistakes,
    mistakeDrillAttempts: input.mistakeDrillAttempts,
  });

  const rawActions: NextBestActionItem[] = generateNextBestActions({
    latestDiagnostic: input.latestDiagnostic,
    mistakes: input.mistakes,
    lessonMastery: input.lessonMastery,
    lessonAttempts: input.lessonAttempts,
    exerciseAttempts: input.exerciseAttempts,
    speakingSessions: input.speakingSessions,
    dnaProfile,
    now: input.now,
  });

  const enrichAction = (action: NextBestActionItem): DashboardNextMove => {
    if (action.to.startsWith('/app/improve')) {
      return {
        ...action,
        skillLabelEn: 'Mistake Memory · Accuracy',
        skillLabelBn: 'মিস্টেক মেমোরি · নির্ভুলতা',
        estimatedMinutes: 5,
        ruleBasisEn: 'Selected by deterministic Mistake Memory recurrence rules',
        ruleBasisBn: 'পুনরাবৃত্ত ভুলের সংখ্যার ভিত্তিতে স্বয়ংক্রিয়ভাবে নির্বাচিত',
      };
    }
    if (action.to.startsWith('/app/speak')) {
      return {
        ...action,
        skillLabelEn: 'Speaking Fluency',
        skillLabelBn: 'স্পিকিং সাবলীলতা',
        estimatedMinutes: 6,
        ruleBasisEn: 'Selected because Speaking DNA needs >= 3 real conversation turns',
        ruleBasisBn: 'স্পিকিং DNA পরিমাপের জন্য ন্যূনতম ৩টি বাস্তব ধাপ প্রয়োজন',
      };
    }
    if (action.to.startsWith('/diagnostic')) {
      return {
        ...action,
        skillLabelEn: '5-Skill Baseline',
        skillLabelBn: '৫-দক্ষতা বেসলাইন',
        estimatedMinutes: 6,
        ruleBasisEn: 'Selected because no baseline assessment is saved yet',
        ruleBasisBn: 'এখনো কোনো প্রাথমিক মূল্যায়ন সংরক্ষিত না থাকায় নির্বাচিত',
      };
    }
    const lessonId = action.to.replace('/app/learn/', '');
    const matchedLesson = input.allLessons.find((l) => l.id === lessonId);
    return {
      ...action,
      skillLabelEn: matchedLesson?.targetCategories[0] ?? 'Structured Curriculum',
      skillLabelBn: 'কাঠামোবদ্ধ পাঠ্যক্রম',
      estimatedMinutes: matchedLesson?.estimatedMinutes ?? 8,
      ruleBasisEn: 'Selected from your curriculum mastery & spaced-review schedule',
      ruleBasisBn: 'আপনার লেসন মাস্টারি ও স্পেসড রিভিউ সূচি অনুযায়ী নির্বাচিত',
    };
  };

  // Prioritize assessment first when zero evidence exists
  const hasAnyEvidence =
    Boolean(input.latestDiagnostic) ||
    input.lessonAttempts.length > 0 ||
    input.speakingSessions.some((s) => s.turns.length > 0);

  let moves = rawActions.map(enrichAction);

  if (!hasAnyEvidence) {
    const diagIdx = moves.findIndex((m) => m.to === '/diagnostic');
    if (diagIdx > 0) {
      const [diagMove] = moves.splice(diagIdx, 1);
      moves = [diagMove, ...moves];
    }
  }

  const fallbackMove: DashboardNextMove = {
    id: 'nba_fallback_academy',
    priority: 'baseline',
    titleEn: 'Explore Structured Academy Track',
    titleBn: 'কাঠামোবদ্ধ একাডেমি ট্র্যাক দেখুন',
    reasonEn: 'Start your first structured Bangla-to-English communication lesson.',
    reasonBn: 'আপনার প্রথম কাঠামোবদ্ধ ইংরেজি যোগাযোগ লেসন শুরু করুন।',
    skillLabelEn: 'Foundations',
    skillLabelBn: 'মূল ভিত্তি',
    estimatedMinutes: 8,
    ctaLabelEn: 'Open Academy',
    ctaLabelBn: 'একাডেমি খুলুন',
    to: '/app/learn',
    ruleBasisEn: 'Default starting recommendation for new accounts',
    ruleBasisBn: 'নতুন অ্যাকাউন্টের জন্য প্রাথমিক সুপারিশ',
  };

  const primaryMove = moves[0] ?? fallbackMove;
  const secondaryMoves = moves.slice(1, 3);

  return { primaryMove, secondaryMoves, dnaProfile };
}

/**
 * Builds honest, strictly real notifications from current learner state.
 * Zero fake unread counts or invented system messages.
 */
export function buildLearnerNotifications(input: {
  profile: LearnerProfile | null;
  latestDiagnostic: EvidenceStartingProfile | null;
  lessonMastery: Record<string, LessonMasteryRecord>;
  mistakes: MistakeMemoryItem[];
  allLessons: CurriculumLesson[];
  now?: Date;
}): LearnerNotificationItem[] {
  const { profile, latestDiagnostic, lessonMastery, mistakes, allLessons, now = new Date() } =
    input;
  const nowIso = now.toISOString();
  const items: LearnerNotificationItem[] = [];

  // 1. Assessment not taken yet
  if (!latestDiagnostic) {
    items.push({
      id: 'notif_diagnostic_pending',
      category: 'assessment',
      titleEn: 'Initial Assessment Ready',
      titleBn: 'প্রাথমিক মূল্যায়ন প্রস্তুত',
      bodyEn: 'Take the 5-skill baseline assessment to map your real strengths and gaps.',
      bodyBn: 'আপনার প্রকৃত দক্ষতা ও দুর্বলতা জানতে ৫-দক্ষতা প্রাথমিক মূল্যায়ন দিন।',
      to: '/diagnostic',
      createdAt: profile?.updatedAt ?? nowIso,
    });
  }

  // 2. Due spaced-repetition lessons
  const dueMasteries = Object.values(lessonMastery).filter((m) => isReviewDue(m, nowIso));
  for (const rec of dueMasteries.slice(0, 2)) {
    const lesson = allLessons.find((l) => l.id === rec.lessonId);
    items.push({
      id: `notif_review_due_${rec.lessonId}_${rec.nextReviewAt.slice(0, 10)}`,
      category: 'review',
      titleEn: `Review Due: ${lesson?.titleEn ?? rec.lessonId}`,
      titleBn: `রিভিউ সময় হয়েছে: ${lesson?.titleBn ?? rec.lessonId}`,
      bodyEn: `Current mastery is ${rec.masteryPercent}%. Complete a review pass to strengthen retention.`,
      bodyBn: `বর্তমান মাস্টারি ${rec.masteryPercent}%। স্মৃতিতে ধরে রাখতে রিভিউ সম্পন্ন করুন।`,
      to: `/app/learn/${encodeURIComponent(rec.lessonId)}`,
      createdAt: rec.nextReviewAt,
    });
  }

  // 3. Active Mistake Memory queue
  const activeMistakes = mistakes.filter(
    (m) => !m.falseCorrectionReported && m.status !== 'resolved'
  );
  if (activeMistakes.length > 0) {
    const top = [...activeMistakes].sort((a, b) => b.occurrences - a.occurrences)[0];
    items.push({
      id: `notif_mistake_queue_${top.id}_${top.occurrences}`,
      category: 'mistake',
      titleEn: `${activeMistakes.length} Active Mistake Pattern${activeMistakes.length === 1 ? '' : 's'}`,
      titleBn: `${activeMistakes.length}টি সক্রিয় ভুলের প্যাটার্ন`,
      bodyEn: `Top focus: "${top.userExample}" → "${top.correctedExample}" (${top.category}).`,
      bodyBn: `সর্বোচ্চ গুরুত্ব: "${top.userExample}" → "${top.correctedExample}" (${top.category})।`,
      to: `/app/improve?focus=${encodeURIComponent(top.id)}`,
      createdAt: top.lastSeenAt ?? top.createdAt,
    });
  }

  // 4. Saved study reminder preference (only if user opted in during onboarding/settings)
  if (profile?.dailyReminderEnabled && profile.dailyReminderTime) {
    items.push({
      id: `notif_reminder_pref_${profile.dailyReminderTime}`,
      category: 'reminder',
      titleEn: `Daily Study Reminder: ${profile.dailyReminderTime}`,
      titleBn: `দৈনিক অনুশীলন রিমাইন্ডার: ${profile.dailyReminderTime}`,
      bodyEn: `Your daily goal is ${profile.dailyTimeGoalMinutes} min/day. In-app reminder schedule saved.`,
      bodyBn: `আপনার দৈনিক লক্ষ্য ${profile.dailyTimeGoalMinutes} মিনিট। রিমাইন্ডার সময় সংরক্ষিত আছে।`,
      to: '/app/settings',
      createdAt: profile.updatedAt,
    });
  }

  return items;
}

/**
 * Builds the 7-day activity series and explicitly flags whether there are >= 2 active days
 * so the dashboard shows an honest insufficient-data state instead of a fake trend.
 */
export function buildDashboardWeeklyAnalytics(input: {
  lessonAttempts: LessonAttemptRecord[];
  speakingSessions: SpeakingSessionRecord[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
  transferAttempts: TransferAttemptRecord[];
  now?: Date;
}): DashboardWeeklyAnalytics {
  const series = buildWeeklyPracticeSeries(
    input.lessonAttempts,
    input.speakingSessions,
    input.mistakeDrillAttempts,
    input.now,
    input.transferAttempts
  );

  const activeDaysCount = series.points.filter((p) => p.sessionsCount > 0).length;

  return {
    points: series.points,
    totalMinutes7d: series.totalMinutes,
    activeDaysCount,
    hasSufficientTrendData: activeDaysCount >= 2,
  };
}

/**
 * Builds the Learning Path & Academy preview timeline from real curriculum courses & mastery.
 */
export function buildAcademyPathPreview(input: {
  courses: CurriculumCourse[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  recommendedFirstLessonId?: string | null;
  now?: Date;
}): {
  items: AcademyPathPreviewItem[];
  completedCount: number;
  totalCount: number;
  currentCourseTitleEn: string;
  currentCourseTitleBn: string;
} {
  const nowIso = (input.now ?? new Date()).toISOString();
  const flat: Array<{ lesson: CurriculumLesson; course: CurriculumCourse }> = [];
  for (const course of input.courses) {
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        flat.push({ lesson, course });
      }
    }
  }

  let completedCount = 0;
  let assignedNext = false;

  const allItems: AcademyPathPreviewItem[] = flat.map(({ lesson, course }) => {
    const mastery = input.lessonMastery[lesson.id];
    const isRecommendedStart = Boolean(
      input.recommendedFirstLessonId && lesson.id === input.recommendedFirstLessonId
    );

    if (mastery && mastery.bestAccuracyPercent >= 60) {
      completedCount += 1;
      const due = isReviewDue(mastery, nowIso);
      return {
        lesson,
        courseTitleEn: course.titleEn,
        courseTitleBn: course.titleBn,
        status: due ? 'due_review' : 'completed',
        masteryPercent: mastery.masteryPercent,
        isRecommendedStart,
      };
    }

    if (mastery) {
      assignedNext = true;
      return {
        lesson,
        courseTitleEn: course.titleEn,
        courseTitleBn: course.titleBn,
        status: 'in_progress',
        masteryPercent: mastery.masteryPercent,
        isRecommendedStart,
      };
    }

    if (!assignedNext) {
      assignedNext = true;
      return {
        lesson,
        courseTitleEn: course.titleEn,
        courseTitleBn: course.titleBn,
        status: 'up_next',
        masteryPercent: 0,
        isRecommendedStart,
      };
    }

    return {
      lesson,
      courseTitleEn: course.titleEn,
      courseTitleBn: course.titleBn,
      status: 'up_next',
      masteryPercent: 0,
      isRecommendedStart,
    };
  });

  // Order preview window around the active / recommended lesson so the learner sees immediate context
  const focusIndex = Math.max(
    0,
    allItems.findIndex(
      (it) =>
        it.status === 'due_review' ||
        it.status === 'in_progress' ||
        (it.isRecommendedStart && it.status !== 'completed')
    )
  );
  const startIdx = Math.max(0, Math.min(focusIndex, Math.max(0, allItems.length - 4)));
  const previewSlice = allItems.slice(startIdx, startIdx + 4);
  const activeCourse = previewSlice[0] ?? allItems[0];

  return {
    items: previewSlice,
    completedCount,
    totalCount: flat.length,
    currentCourseTitleEn: activeCourse?.courseTitleEn ?? 'Core Communication Track',
    currentCourseTitleBn: activeCourse?.courseTitleBn ?? 'মূল যোগাযোগ ট্র্যাক',
  };
}

/**
 * Live search across real Academy lessons, Transfer Lab scenarios, and Mistake Memory patterns.
 */
export function searchWorkspaceResources(input: {
  query: string;
  lessons: CurriculumLesson[];
  mistakes: MistakeMemoryItem[];
  scenarios?: TransferScenarioDefinition[];
}): WorkspaceSearchResult[] {
  const q = input.query.trim().toLowerCase();
  if (!q) return [];

  const scenarios = input.scenarios ?? TRANSFER_SCENARIOS;
  const results: WorkspaceSearchResult[] = [];

  for (const lesson of input.lessons) {
    const haystack = [
      lesson.titleEn,
      lesson.titleBn,
      lesson.summaryEn,
      lesson.cefrBand,
      ...lesson.targetCategories,
    ]
      .join(' ')
      .toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: `lesson:${lesson.id}`,
        kind: 'lesson',
        titleEn: lesson.titleEn,
        titleBn: lesson.titleBn,
        metaEn: `Academy · ${lesson.cefrBand} · ${lesson.estimatedMinutes} min`,
        metaBn: `একাডেমি · ${lesson.cefrBand} · ${lesson.estimatedMinutes} মিনিট`,
        to: `/app/learn/${encodeURIComponent(lesson.id)}`,
      });
    }
  }

  for (const sc of scenarios) {
    const haystack = [sc.titleEn, sc.titleBn, sc.contextTagEn, sc.briefEn, sc.defaultTargetGrammarEn]
      .join(' ')
      .toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: `transfer:${sc.id}`,
        kind: 'transfer',
        titleEn: sc.titleEn,
        titleBn: sc.titleBn,
        metaEn: `Transfer Lab · ${sc.contextTagEn}`,
        metaBn: `ট্রান্সফার ল্যাব · ${sc.contextTagBn}`,
        to: `/app/transfer-lab?scenario=${encodeURIComponent(sc.id)}`,
      });
    }
  }

  for (const m of input.mistakes) {
    if (m.falseCorrectionReported) continue;
    const haystack = [m.category, m.userExample, m.correctedExample, m.patternEn]
      .join(' ')
      .toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: `mistake:${m.id}`,
        kind: 'mistake',
        titleEn: `${m.category}: ${m.correctedExample}`,
        titleBn: `${m.category}: ${m.correctedExample}`,
        metaEn: `Mistake Memory · ${m.status} · ${m.occurrences}x`,
        metaBn: `মিস্টেক মেমোরি · ${m.status} · ${m.occurrences} বার`,
        to: `/app/improve?focus=${encodeURIComponent(m.id)}`,
      });
    }
  }

  return results.slice(0, 8);
}

/* -------------------------------------------------------------------------- */
/* 8-Step Communication Improvement Loop (Real Evidence -> Live Routes)       */
/* DETECT -> EXPLAIN -> PERSONALIZE -> PRACTICE -> TRANSFER -> RETEST ->      */
/* UPDATE -> REPEAT                                                           */
/* -------------------------------------------------------------------------- */
export interface CommunicationLoopStage {
  id: 'detect' | 'explain' | 'personalize' | 'practice' | 'transfer' | 'retest' | 'update' | 'repeat';
  stepNumber: number;
  labelEn: string;
  labelBn: string;
  summaryEn: string;
  summaryBn: string;
  evidenceEn: string;
  evidenceBn: string;
  status: 'completed' | 'active' | 'pending';
  to: string;
}

export function buildCommunicationLoopStages(input: {
  latestDiagnostic: EvidenceStartingProfile | null;
  mistakes: MistakeMemoryItem[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  speakingSessions: SpeakingSessionRecord[];
  transferAttempts: TransferAttemptRecord[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
  dnaMeasuredCount: number;
}): CommunicationLoopStage[] {
  const validMistakes = input.mistakes.filter((m) => !m.falseCorrectionReported);
  const activeMistakes = validMistakes.filter((m) => m.status !== 'resolved');
  const resolvedMistakes = validMistakes.filter((m) => m.status === 'resolved');
  const completedLessons = Object.values(input.lessonMastery).filter(
    (m) => m.bestAccuracyPercent >= 60
  ).length;
  const dueReviews = Object.values(input.lessonMastery).filter((m) => isReviewDue(m)).length;
  const completedSpeaking = input.speakingSessions.filter((s) => s.turns.length > 0).length;
  const passedTransfers = input.transferAttempts.filter((t) => t.passed).length;

  const stages: Array<Omit<CommunicationLoopStage, 'status'> & { done: boolean }> = [
    {
      id: 'detect',
      stepNumber: 1,
      labelEn: 'DETECT',
      labelBn: 'শনাক্ত',
      summaryEn: 'Capture real errors from baseline diagnostic and speaking turns.',
      summaryBn: 'ডায়াগনস্টিক ও স্পিকিং থেকে বাস্তব ভুল শনাক্ত করুন।',
      evidenceEn: input.latestDiagnostic
        ? `${validMistakes.length} pattern${validMistakes.length === 1 ? '' : 's'} detected`
        : 'Diagnostic not taken yet',
      evidenceBn: input.latestDiagnostic
        ? `${validMistakes.length}টি ভুলের প্যাটার্ন শনাক্ত`
        : 'ডায়াগনস্টিক এখনো হয়নি',
      to: input.latestDiagnostic ? '/app/improve' : '/diagnostic',
      done: Boolean(input.latestDiagnostic) || validMistakes.length > 0,
    },
    {
      id: 'explain',
      stepNumber: 2,
      labelEn: 'EXPLAIN',
      labelBn: 'ব্যাখ্যা',
      summaryEn: 'Study Bangla L1 contrast rules inside structured Academy lessons.',
      summaryBn: 'একাডেমি লেসনে বাংলা বনাম ইংরেজি গঠনের পার্থক্য বুঝুন।',
      evidenceEn: `${completedLessons} lesson${completedLessons === 1 ? '' : 's'} completed`,
      evidenceBn: `${completedLessons}টি লেসন সম্পন্ন`,
      to: '/app/learn',
      done: completedLessons > 0,
    },
    {
      id: 'personalize',
      stepNumber: 3,
      labelEn: 'PERSONALIZE',
      labelBn: 'ব্যক্তিগতকরণ',
      summaryEn: 'Target your recurring Mistake Memory habits and review priorities.',
      summaryBn: 'আপনার পুনরাবৃত্ত ভুলের প্যাটার্ন অনুযায়ী অনুশীলন সাজান।',
      evidenceEn:
        activeMistakes.length > 0
          ? `${activeMistakes.length} active focus item${activeMistakes.length === 1 ? '' : 's'}`
          : validMistakes.length > 0
            ? 'All tracked patterns resolved'
            : 'Builds as you practice',
      evidenceBn:
        activeMistakes.length > 0
          ? `${activeMistakes.length}টি সক্রিয় অনুশীলন প্যাটার্ন`
          : validMistakes.length > 0
            ? 'সব চিহ্নিত ভুল সমাধান হয়েছে'
            : 'অনুশীলনের সাথে তৈরি হবে',
      to: '/app/improve',
      done: validMistakes.length > 0 || completedLessons > 0,
    },
    {
      id: 'practice',
      stepNumber: 4,
      labelEn: 'PRACTICE',
      labelBn: 'অনুশীলন',
      summaryEn: 'Speak naturally with AI Conversation Studio and targeted drills.',
      summaryBn: 'AI স্পিকিং স্টুডিওতে বাস্তব কথোপকথন অনুশীলন করুন।',
      evidenceEn: `${completedSpeaking} speaking session${completedSpeaking === 1 ? '' : 's'}`,
      evidenceBn: `${completedSpeaking}টি স্পিকিং সেশন`,
      to: '/app/speak',
      done: completedSpeaking > 0,
    },
    {
      id: 'transfer',
      stepNumber: 5,
      labelEn: 'TRANSFER',
      labelBn: 'প্রয়োগ',
      summaryEn: 'Apply skills under real-world pressure inside Transfer Lab.',
      summaryBn: 'ট্রান্সফার ল্যাবে বাস্তব পরিস্থিতির চাপে দক্ষতা প্রয়োগ করুন।',
      evidenceEn: `${input.transferAttempts.length} attempt${input.transferAttempts.length === 1 ? '' : 's'} (${passedTransfers} passed)`,
      evidenceBn: `${input.transferAttempts.length}টি প্রচেষ্টা (${passedTransfers} উত্তীর্ণ)`,
      to: '/app/transfer-lab',
      done: input.transferAttempts.length > 0,
    },
    {
      id: 'retest',
      stepNumber: 6,
      labelEn: 'RETEST',
      labelBn: 'পুনঃপরীক্ষা',
      summaryEn: 'Verify retention through Mistake Drills and Communication Replay.',
      summaryBn: 'মিস্টেক ড্রিল ও কমিউনিকেশন রিপ্লের মাধ্যমে স্থায়িত্ব যাচাই করুন।',
      evidenceEn: `${input.mistakeDrillAttempts.length} drill${input.mistakeDrillAttempts.length === 1 ? '' : 's'} · ${resolvedMistakes.length} resolved`,
      evidenceBn: `${input.mistakeDrillAttempts.length}টি ড্রিল · ${resolvedMistakes.length} সমাধান`,
      to: completedSpeaking > 0 || input.transferAttempts.length > 0 ? '/app/replay' : '/app/improve',
      done: input.mistakeDrillAttempts.length > 0 || resolvedMistakes.length > 0,
    },
    {
      id: 'update',
      stepNumber: 7,
      labelEn: 'UPDATE',
      labelBn: 'হালনাগাদ',
      summaryEn: 'Track evidence-backed Communication DNA growth across dimensions.',
      summaryBn: 'প্রমাণ-ভিত্তিক কমিউনিকেশন ডিএনএ অগ্রগতি পর্যবেক্ষণ করুন।',
      evidenceEn: `${input.dnaMeasuredCount}/5 DNA dimensions measured`,
      evidenceBn: `${input.dnaMeasuredCount}/৫টি ডিএনএ মাত্রা পরিমাপকৃত`,
      to: '/app/progress',
      done: input.dnaMeasuredCount > 0,
    },
    {
      id: 'repeat',
      stepNumber: 8,
      labelEn: 'REPEAT',
      labelBn: 'পুনরাবৃত্তি',
      summaryEn: 'Lock in long-term recall with spaced vocabulary & lesson reviews.',
      summaryBn: 'স্পেসড ভোকাবুলারি ও লেসন রিভিউ দিয়ে দীর্ঘমেয়াদি দক্ষতা গড়ুন।',
      evidenceEn:
        dueReviews > 0 ? `${dueReviews} review${dueReviews === 1 ? '' : 's'} due now` : 'Spaced deck ready',
      evidenceBn: dueReviews > 0 ? `${dueReviews}টি রিভিউ বাকি` : 'স্পেসড ডেক প্রস্তুত',
      to: '/app/vocabulary',
      done: completedLessons > 0 && dueReviews === 0 && input.mistakeDrillAttempts.length > 0,
    },
  ];

  let foundActive = false;
  return stages.map(({ done, ...rest }) => {
    if (done) {
      return { ...rest, status: 'completed' as const };
    }
    if (!foundActive) {
      foundActive = true;
      return { ...rest, status: 'active' as const };
    }
    return { ...rest, status: 'pending' as const };
  });
}

