import { isReviewDue } from './spacedRepetition.ts';
import type {
  CurriculumCourse,
  CurriculumLesson,
  CurriculumModule,
  EvidenceStartingProfile,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  LessonStageKey,
  MistakeMemoryItem,
} from '../types/domain.ts';

export type AcademyCategoryKey =
  | 'grammar'
  | 'vocabulary'
  | 'reading'
  | 'listening'
  | 'speaking'
  | 'writing'
  | 'pronunciation'
  | 'practical_communication';

export type AcademyDifficultyFilter =
  | 'all'
  | 'beginner'
  | 'intermediate'
  | 'upper_intermediate';

export type AcademyStatusFilter =
  | 'all'
  | 'enrolled'
  | 'in_progress'
  | 'completed'
  | 'not_started'
  | 'due_review'
  | 'bookmarked';

export type AcademySortOption =
  | 'recommended'
  | 'level_asc'
  | 'duration_asc'
  | 'progress_desc';

export interface LessonDraftState {
  lessonId: string;
  courseId: string;
  stage: LessonStageKey;
  updatedAt: string;
  guidedDoneCount: number;
  independentDoneCount: number;
  guidedResponses?: Record<string, string>;
  independentResponses?: Record<string, string>;
}

export const LESSON_COMPLETION_MIN_ACCURACY = 60;

/**
 * Honest completion rule aligned with Dashboard (`dashboardIntelligence.ts`):
 * Opening a lesson or scoring below 60% (`needs_review`) does NOT mark it completed.
 */
export function isLessonCompletedHonestly(
  attemptsForLesson: LessonAttemptRecord[],
  mastery: LessonMasteryRecord | undefined
): boolean {
  if (mastery && mastery.attemptCount > 0) {
    return mastery.bestAccuracyPercent >= LESSON_COMPLETION_MIN_ACCURACY;
  }
  return attemptsForLesson.some(
    (attempt) => attempt.overallAccuracyPercent >= LESSON_COMPLETION_MIN_ACCURACY
  );
}

export interface UserAcademyState {
  enrolledCourseIds: string[];
  bookmarkedLessonIds: string[];
  lessonDrafts: Record<string, LessonDraftState>;
}

export const EMPTY_ACADEMY_STATE: UserAcademyState = {
  enrolledCourseIds: [],
  bookmarkedLessonIds: [],
  lessonDrafts: {},
};

export interface AcademyCourseSummary {
  course: CurriculumCourse;
  difficultyBand: Exclude<AcademyDifficultyFilter, 'all'>;
  difficultyLabelEn: string;
  difficultyLabelBn: string;
  languageCode: 'english_bn';
  languageLabelEn: string;
  languageLabelBn: string;
  categories: AcademyCategoryKey[];
  moduleCount: number;
  lessonCount: number;
  totalMinutes: number;
  totalExercises: number;
  completedLessonCount: number;
  masteredLessonCount: number;
  dueReviewCount: number;
  hasActiveDraft: boolean;
  bookmarkedLessonCount: number;
  enrolled: boolean;
  completionPercent: number;
  averageMasteryPercent: number;
  status: 'completed' | 'in_progress' | 'enrolled_not_started' | 'not_started';
  nextLesson: CurriculumLesson | null;
  lastActivityAt: string | null;
}

export interface AcademyCourseFilterState {
  searchQuery: string;
  category: AcademyCategoryKey | 'all';
  difficulty: AcademyDifficultyFilter;
  language: 'all' | 'english_bn';
  status: AcademyStatusFilter;
  sortBy: AcademySortOption;
}

export interface AcademyCategoryOverview {
  key: AcademyCategoryKey;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  lessonCount: number;
  courseCount: number;
  availability: 'playable_academy' | 'playable_module_link' | 'upcoming';
  targetRoute?: string;
  actionLabelEn: string;
  actionLabelBn: string;
}

export interface ContinueLearningTarget {
  mode: 'resume_draft' | 'continue_course' | 'start_enrolled' | 'recommended_start';
  course: CurriculumCourse;
  module: CurriculumModule;
  lesson: CurriculumLesson;
  draftStage?: LessonStageKey;
  completedLessonsInCourse: number;
  totalLessonsInCourse: number;
  courseCompletionPercent: number;
  lessonMasteryPercent: number;
  lastActivityAt: string | null;
  reasonEn: string;
  reasonBn: string;
}

export interface LearningPathStage {
  stageNumber: number;
  courseSummary: AcademyCourseSummary;
  state: 'completed' | 'current' | 'available';
  prerequisiteNoteEn: string;
  prerequisiteNoteBn: string;
}

export interface RecommendedLessonItem {
  lesson: CurriculumLesson;
  course: CurriculumCourse;
  module: CurriculumModule;
  priority: 'due_review' | 'mistake_memory' | 'diagnostic' | 'foundation';
  reasonEn: string;
  reasonBn: string;
  masteryPercent: number;
  isBookmarked: boolean;
}

export interface RecentlyCompletedLessonItem {
  lesson: CurriculumLesson;
  course: CurriculumCourse;
  latestAttempt: LessonAttemptRecord;
  attemptCount: number;
  masteryPercent: number;
  masteryStatus: LessonMasteryRecord['status'];
}

export interface CourseDetailLessonItem {
  lesson: CurriculumLesson;
  module: CurriculumModule;
  exerciseCount: number;
  attemptCount: number;
  latestAccuracyPercent: number | null;
  masteryPercent: number;
  masteryStatus: LessonMasteryRecord['status'];
  isDueForReview: boolean;
  isCompleted: boolean;
  hasDraft: boolean;
  draftStage: LessonStageKey | null;
  isBookmarked: boolean;
  isCurrentFocus: boolean;
  prerequisitesMet: boolean;
  unmetPrerequisiteTitlesEn: string[];
  unmetPrerequisiteTitlesBn: string[];
}

export interface CourseDetailModuleGroup {
  module: CurriculumModule;
  lessons: CourseDetailLessonItem[];
  completedCount: number;
  totalMinutes: number;
}

export interface CourseDetailViewModel {
  summary: AcademyCourseSummary;
  modules: CourseDetailModuleGroup[];
  aggregatedObjectivesEn: string[];
  aggregatedObjectivesBn: string[];
  prerequisiteNoteEn: string;
  prerequisiteNoteBn: string;
  ctaLesson: CurriculumLesson | null;
  ctaMode: 'start' | 'continue' | 'review';
}

export interface LessonNeighbors {
  course: CurriculumCourse | null;
  module: CurriculumModule | null;
  prevLesson: CurriculumLesson | null;
  nextLesson: CurriculumLesson | null;
  orderedCourseLessons: Array<{
    lesson: CurriculumLesson;
    moduleTitleEn: string;
    moduleTitleBn: string;
    moduleOrder: number;
  }>;
  currentIndex: number;
  totalInCourse: number;
}

export function getCourseLessons(course: CurriculumCourse): CurriculumLesson[] {
  return [...course.modules]
    .sort((a, b) => a.order - b.order)
    .flatMap((mod) => [...mod.lessons].sort((a, b) => a.order - b.order));
}

export function countLessonExercises(lesson: CurriculumLesson): number {
  return (
    lesson.guidedExercises.length +
    lesson.independentExercises.length +
    lesson.assessmentQuestions.length
  );
}

export function inferCourseDifficultyBand(
  cefrRange: string
): {
  band: Exclude<AcademyDifficultyFilter, 'all'>;
  labelEn: string;
  labelBn: string;
} {
  const upper = cefrRange.toUpperCase();
  if (upper.includes('C1') || upper.includes('C2') || upper.includes('B2')) {
    return {
      band: 'upper_intermediate',
      labelEn: 'Upper-Intermediate',
      labelBn: 'উচ্চ-মধ্যম স্তর',
    };
  }
  if (upper.includes('B1')) {
    return {
      band: 'intermediate',
      labelEn: 'Intermediate',
      labelBn: 'মধ্যম স্তর',
    };
  }
  return {
    band: 'beginner',
    labelEn: 'Foundational',
    labelBn: 'মৌলিক স্তর',
  };
}

export function mapLessonCategoriesToAcademyKeys(
  lesson: CurriculumLesson,
  courseId?: string
): AcademyCategoryKey[] {
  const keys = new Set<AcademyCategoryKey>();
  for (const cat of lesson.targetCategories) {
    if (
      cat === 'Grammar' ||
      cat === 'Word Order' ||
      cat === 'Tense' ||
      cat === 'Auxiliary Verb' ||
      cat === 'Preposition' ||
      cat === 'Article'
    ) {
      keys.add('grammar');
    }
    if (cat === 'Vocabulary' || cat === 'Collocation') {
      keys.add('vocabulary');
    }
  }

  // Reading comprehension courses/lessons
  if (
    courseId === 'course_reading_listening' ||
    lesson.id.includes('reading') ||
    lesson.titleEn.toLowerCase().includes('reading')
  ) {
    keys.add('reading');
  }

  // Dedicated listening lessons or lessons with spoken TTS examples
  if (
    courseId === 'course_reading_listening' ||
    lesson.id.includes('listening') ||
    lesson.examples.length > 0
  ) {
    keys.add('listening');
  }

  // Structured writing courses/lessons
  if (
    courseId === 'course_writing_workplace' ||
    lesson.id.includes('writing') ||
    lesson.titleEn.toLowerCase().includes('writing') ||
    lesson.titleEn.toLowerCase().includes('email')
  ) {
    keys.add('writing');
  }

  // Workplace / real-world communication courses belong to practical communication
  if (
    courseId === 'course_workplace' ||
    courseId === 'course_writing_workplace' ||
    lesson.id.includes('interview') ||
    lesson.titleEn.toLowerCase().includes('interview') ||
    lesson.titleEn.toLowerCase().includes('workplace') ||
    lesson.titleEn.toLowerCase().includes('question')
  ) {
    keys.add('practical_communication');
  }

  if (keys.size === 0) {
    keys.add('grammar');
  }

  return Array.from(keys);
}

export function buildCourseSummaries(params: {
  courses: CurriculumCourse[];
  lessonAttempts: LessonAttemptRecord[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  academyState: UserAcademyState;
  now?: Date;
}): AcademyCourseSummary[] {
  const { courses, lessonAttempts, lessonMastery, academyState, now = new Date() } = params;
  const enrolledSet = new Set(academyState.enrolledCourseIds);
  const bookmarkedSet = new Set(academyState.bookmarkedLessonIds);

  return [...courses]
    .sort((a, b) => a.order - b.order)
    .map((course) => {
      const lessons = getCourseLessons(course);
      const lessonIds = new Set(lessons.map((l) => l.id));
      const difficulty = inferCourseDifficultyBand(course.cefrRange);
      const categorySet = new Set<AcademyCategoryKey>();

      let totalMinutes = 0;
      let totalExercises = 0;
      let completedLessonCount = 0;
      let masteredLessonCount = 0;
      let dueReviewCount = 0;
      let masterySum = 0;
      let hasActiveDraft = false;
      let bookmarkedLessonCount = 0;

      for (const lesson of lessons) {
        totalMinutes += lesson.estimatedMinutes;
        totalExercises += countLessonExercises(lesson);
        for (const catKey of mapLessonCategoriesToAcademyKeys(lesson, course.id)) {
          categorySet.add(catKey);
        }

        const mastery = lessonMastery[lesson.id];
        const attemptsForLesson = lessonAttempts.filter((a) => a.lessonId === lesson.id);
        // Honest completion: strictly requires a graded passing attempt (>= 60%)
        const isCompleted = isLessonCompletedHonestly(attemptsForLesson, mastery);
        if (isCompleted) {
          completedLessonCount += 1;
        }
        if (mastery?.status === 'mastered') {
          masteredLessonCount += 1;
        }
        if (mastery && isReviewDue(mastery, now.toISOString())) {
          dueReviewCount += 1;
        }
        masterySum += mastery?.masteryPercent ?? 0;

        if (academyState.lessonDrafts[lesson.id]) {
          hasActiveDraft = true;
        }
        if (bookmarkedSet.has(lesson.id)) {
          bookmarkedLessonCount += 1;
        }
      }

      const courseAttempts = lessonAttempts
        .filter((a) => lessonIds.has(a.lessonId))
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

      const latestDraftAt = lessons
        .map((l) => academyState.lessonDrafts[l.id]?.updatedAt)
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      const latestAttemptAt = courseAttempts[0]?.completedAt ?? null;
      const lastActivityAt =
        latestDraftAt && latestAttemptAt
          ? new Date(latestDraftAt).getTime() > new Date(latestAttemptAt).getTime()
            ? latestDraftAt
            : latestAttemptAt
          : latestDraftAt ?? latestAttemptAt ?? null;

      const hasAnyAttempt =
        courseAttempts.length > 0 ||
        lessons.some((l) => (lessonMastery[l.id]?.attemptCount ?? 0) > 0);
      const enrolled =
        enrolledSet.has(course.id) || completedLessonCount > 0 || hasActiveDraft || hasAnyAttempt;
      const lessonCount = lessons.length;
      const completionPercent =
        lessonCount > 0 ? Math.round((completedLessonCount / lessonCount) * 100) : 0;
      const averageMasteryPercent =
        lessonCount > 0 ? Math.round(masterySum / lessonCount) : 0;

      const status: AcademyCourseSummary['status'] =
        lessonCount > 0 && completedLessonCount === lessonCount
          ? 'completed'
          : completedLessonCount > 0 || hasActiveDraft || hasAnyAttempt
            ? 'in_progress'
            : enrolled
              ? 'enrolled_not_started'
              : 'not_started';

      // Next lesson priority: active draft -> due for review -> first uncompleted -> first lesson
      const nextLesson =
        lessons.find((l) => Boolean(academyState.lessonDrafts[l.id])) ??
        lessons.find((l) => {
          const m = lessonMastery[l.id] ?? null;
          return isReviewDue(m, now.toISOString());
        }) ??
        lessons.find(
          (l) =>
            !isLessonCompletedHonestly(
              lessonAttempts.filter((a) => a.lessonId === l.id),
              lessonMastery[l.id]
            )
        ) ??
        lessons[0] ??
        null;

      return {
        course,
        difficultyBand: difficulty.band,
        difficultyLabelEn: difficulty.labelEn,
        difficultyLabelBn: difficulty.labelBn,
        languageCode: 'english_bn',
        languageLabelEn: 'English (Bangla-Guided)',
        languageLabelBn: 'ইংরেজি (বাংলা নির্দেশিত)',
        categories: Array.from(categorySet),
        moduleCount: course.modules.length,
        lessonCount,
        totalMinutes,
        totalExercises,
        completedLessonCount,
        masteredLessonCount,
        dueReviewCount,
        hasActiveDraft,
        bookmarkedLessonCount,
        enrolled,
        completionPercent,
        averageMasteryPercent,
        status,
        nextLesson,
        lastActivityAt,
      };
    });
}

export function filterAndSortCourses(
  summaries: AcademyCourseSummary[],
  filters: AcademyCourseFilterState,
  recommendedCourseIds: string[] = []
): AcademyCourseSummary[] {
  const q = filters.searchQuery.trim().toLowerCase();

  const filtered = summaries.filter((item) => {
    if (filters.category !== 'all' && !item.categories.includes(filters.category)) {
      return false;
    }
    if (filters.difficulty !== 'all' && item.difficultyBand !== filters.difficulty) {
      return false;
    }
    if (filters.language !== 'all' && item.languageCode !== filters.language) {
      return false;
    }
    if (filters.status === 'enrolled' && !item.enrolled) {
      return false;
    }
    if (filters.status === 'in_progress' && item.status !== 'in_progress') {
      return false;
    }
    if (filters.status === 'completed' && item.status !== 'completed') {
      return false;
    }
    if (filters.status === 'not_started' && item.status !== 'not_started') {
      return false;
    }
    if (filters.status === 'due_review' && item.dueReviewCount === 0) {
      return false;
    }
    if (filters.status === 'bookmarked' && item.bookmarkedLessonCount === 0) {
      return false;
    }

    if (q) {
      const lessons = getCourseLessons(item.course);
      const haystack = [
        item.course.titleEn,
        item.course.titleBn,
        item.course.subtitleEn,
        item.course.subtitleBn,
        item.course.cefrRange,
        item.difficultyLabelEn,
        item.difficultyLabelBn,
        ...item.course.modules.flatMap((m) => [m.titleEn, m.titleBn]),
        ...lessons.flatMap((l) => [
          l.titleEn,
          l.titleBn,
          l.summaryEn,
          l.summaryBn,
          ...l.targetCategories,
        ]),
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const recRank = new Map(recommendedCourseIds.map((id, idx) => [id, idx]));

  return [...filtered].sort((a, b) => {
    if (filters.sortBy === 'duration_asc') {
      return a.totalMinutes - b.totalMinutes || a.course.order - b.course.order;
    }
    if (filters.sortBy === 'progress_desc') {
      return (
        b.completionPercent - a.completionPercent ||
        b.averageMasteryPercent - a.averageMasteryPercent ||
        a.course.order - b.course.order
      );
    }
    if (filters.sortBy === 'level_asc') {
      return a.course.order - b.course.order;
    }
    // 'recommended': active drafts/due reviews first, then recommended courses, then curriculum order
    const aScore =
      (a.hasActiveDraft ? -100 : 0) +
      (a.dueReviewCount > 0 ? -50 : 0) +
      (recRank.has(a.course.id) ? (recRank.get(a.course.id) ?? 0) - 20 : 0) +
      a.course.order;
    const bScore =
      (b.hasActiveDraft ? -100 : 0) +
      (b.dueReviewCount > 0 ? -50 : 0) +
      (recRank.has(b.course.id) ? (recRank.get(b.course.id) ?? 0) - 20 : 0) +
      b.course.order;
    return aScore - bScore;
  });
}

export function buildLearningCategories(
  courses: CurriculumCourse[]
): AcademyCategoryOverview[] {
  const allLessons = courses.flatMap((c) =>
    getCourseLessons(c).map((lesson) => ({ courseId: c.id, lesson }))
  );

  const countFor = (cat: AcademyCategoryKey) => {
    const matching = allLessons.filter(({ courseId, lesson }) =>
      mapLessonCategoriesToAcademyKeys(lesson, courseId).includes(cat)
    );
    const courseIds = new Set(matching.map((m) => m.courseId));
    return { lessonCount: matching.length, courseCount: courseIds.size };
  };

  const grammar = countFor('grammar');
  const vocabulary = countFor('vocabulary');
  const reading = countFor('reading');
  const listening = countFor('listening');
  const writing = countFor('writing');
  const practical = countFor('practical_communication');

  return [
    {
      key: 'grammar',
      titleEn: 'Grammar & Structure',
      titleBn: 'ব্যাকরণ ও বাক্য গঠন',
      descriptionEn: 'Word order, auxiliary control, tense precision, and Bangla L1 contrast drills.',
      descriptionBn: 'ইংরেজি বাক্যক্রম, Auxiliary Verb, Tense এবং বাংলা অনুবাদ-ফাঁদ সমাধান।',
      lessonCount: grammar.lessonCount,
      courseCount: grammar.courseCount,
      availability: grammar.lessonCount > 0 ? 'playable_academy' : 'upcoming',
      actionLabelEn: 'Filter Grammar',
      actionLabelBn: 'ব্যাকরণ দেখুন',
    },
    {
      key: 'vocabulary',
      titleEn: 'Vocabulary & Collocations',
      titleBn: 'শব্দভাণ্ডার ও Collocation',
      descriptionEn: 'Natural prepositions, workplace verbs, and high-impact English pairings.',
      descriptionBn: 'স্বাভাবিক Preposition, অফিসিয়াল শব্দচয়ন ও সঠিক ইংরেজি বাক্যাংশ।',
      lessonCount: vocabulary.lessonCount,
      courseCount: vocabulary.courseCount,
      availability: vocabulary.lessonCount > 0 ? 'playable_academy' : 'upcoming',
      actionLabelEn: 'Filter Vocabulary',
      actionLabelBn: 'শব্দভাণ্ডার দেখুন',
    },
    {
      key: 'practical_communication',
      titleEn: 'Practical Communication',
      titleBn: 'বাস্তব যোগাযোগ ও কর্মক্ষেত্র',
      descriptionEn: 'Interview answers, workplace updates, and clear everyday questioning.',
      descriptionBn: 'ইন্টারভিউ উত্তর, অফিসিয়াল ইমেইল ও দৈনন্দিন প্রশ্ন করার দক্ষতা।',
      lessonCount: practical.lessonCount,
      courseCount: practical.courseCount,
      availability: practical.lessonCount > 0 ? 'playable_academy' : 'upcoming',
      actionLabelEn: 'Filter Practical',
      actionLabelBn: 'যোগাযোগ দেখুন',
    },
    {
      key: 'listening',
      titleEn: 'Listening & Audio Rhythm',
      titleBn: 'লিসেনিং ও অডিও অনুশীলন',
      descriptionEn: 'Spoken schedule comprehension plus 0.75x and 1.0x spoken examples across Academy lessons.',
      descriptionBn: 'কথ্য সময়সূচি বোধগম্যতা এবং প্রতিটি লেসনে ০.৭৫x ও ১.০x অডিও অনুশীলন।',
      lessonCount: listening.lessonCount,
      courseCount: listening.courseCount,
      availability: listening.lessonCount > 0 ? 'playable_academy' : 'upcoming',
      actionLabelEn: 'Filter Listening',
      actionLabelBn: 'লিসেনিং দেখুন',
    },
    {
      key: 'speaking',
      titleEn: 'AI Speaking Practice',
      titleBn: 'AI স্পিকিং অনুশীলন',
      descriptionEn: 'Live interactive speaking simulations with real-time bilingual coaching.',
      descriptionBn: 'রিয়েল-টাইম বাংলা ও ইংরেজি ফিডব্যাকসহ সরাসরি স্পিকিং অনুশীলন।',
      lessonCount: 4,
      courseCount: 1,
      availability: 'playable_module_link',
      targetRoute: '/app/speak',
      actionLabelEn: 'Open Speaking Studio',
      actionLabelBn: 'স্পিকিং স্টুডিও খুলুন',
    },
    {
      key: 'reading',
      titleEn: 'Reading Intelligence',
      titleBn: 'রিডিং ও বোধগম্যতা',
      descriptionEn: 'Decode workplace briefs, implied deadlines, and contrast markers without word-by-word translation.',
      descriptionBn: 'অফিসিয়াল মেসেজ, সময়সীমা ও শর্তযুক্ত বাক্য দ্রুত ও নির্ভুলভাবে পড়ার অনুশীলন।',
      lessonCount: reading.lessonCount,
      courseCount: reading.courseCount,
      availability: reading.lessonCount > 0 ? 'playable_academy' : 'upcoming',
      actionLabelEn: reading.lessonCount > 0 ? 'Filter Reading' : 'No courses yet',
      actionLabelBn: reading.lessonCount > 0 ? 'রিডিং দেখুন' : 'শীঘ্রই আসছে',
    },
    {
      key: 'writing',
      titleEn: 'Writing Intelligence',
      titleBn: 'রাইটিং ও অফিসিয়াল ইমেইল',
      descriptionEn: 'Draft clear workplace requests, polite follow-ups, and structured sentences without literal translation traps.',
      descriptionBn: 'আক্ষরিক অনুবাদ এড়িয়ে স্পষ্ট, ভদ্র ও কার্যকর অফিসিয়াল ইমেইল ও বাক্য রচনা।',
      lessonCount: writing.lessonCount,
      courseCount: writing.courseCount,
      availability: writing.lessonCount > 0 ? 'playable_academy' : 'upcoming',
      actionLabelEn: writing.lessonCount > 0 ? 'Filter Writing' : 'No courses yet',
      actionLabelBn: writing.lessonCount > 0 ? 'রাইটিং দেখুন' : 'শীঘ্রই আসছে',
    },
    {
      key: 'pronunciation',
      titleEn: 'Acoustic Pronunciation',
      titleBn: 'ধ্বনিতাত্ত্বিক উচ্চারণ',
      descriptionEn: 'Phoneme-level acoustic scoring is not enabled yet. Practice transcript-level articulation in Speaking Studio.',
      descriptionBn: 'ফোনিম-ভিত্তিক অ্যাকোস্টিক স্কোরিং এখনো সক্রিয় নয়। স্পিকিং স্টুডিওতে উচ্চারণ ও স্পষ্টতা অনুশীলন করুন।',
      lessonCount: 0,
      courseCount: 0,
      availability: 'playable_module_link',
      targetRoute: '/app/speak',
      actionLabelEn: 'Open Speaking Lab',
      actionLabelBn: 'স্পিকিং ল্যাব খুলুন',
    },
  ];
}

export function resolveContinueLearning(params: {
  courses: CurriculumCourse[];
  summaries: AcademyCourseSummary[];
  lessonAttempts: LessonAttemptRecord[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  academyState: UserAcademyState;
  diagnostic: EvidenceStartingProfile | null;
}): ContinueLearningTarget | null {
  const { courses, summaries, lessonAttempts, lessonMastery, academyState, diagnostic } = params;
  if (courses.length === 0) return null;

  const findTuple = (lessonId: string) => {
    for (const course of courses) {
      for (const module of course.modules) {
        const lesson = module.lessons.find((l) => l.id === lessonId);
        if (lesson) {
          const summary = summaries.find((s) => s.course.id === course.id);
          if (summary) return { course, module, lesson, summary };
        }
      }
    }
    return null;
  };

  // 1. Most recently saved in-progress lesson draft
  const drafts = Object.values(academyState.lessonDrafts).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  for (const draft of drafts) {
    const match = findTuple(draft.lessonId);
    if (match) {
      return {
        mode: 'resume_draft',
        course: match.course,
        module: match.module,
        lesson: match.lesson,
        draftStage: draft.stage,
        completedLessonsInCourse: match.summary.completedLessonCount,
        totalLessonsInCourse: match.summary.lessonCount,
        courseCompletionPercent: match.summary.completionPercent,
        lessonMasteryPercent: lessonMastery[match.lesson.id]?.masteryPercent ?? 0,
        lastActivityAt: draft.updatedAt,
        reasonEn: 'Saved progress ready to resume right where you left off.',
        reasonBn: 'আপনার সংরক্ষিত লেসনটি ঠিক যেখান থেকে থেমেছিলেন সেখান থেকেই চালু করতে পারবেন।',
      };
    }
  }

  // 2. Most recently attempted course -> next unfinished or due lesson in that course
  const sortedAttempts = [...lessonAttempts].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  if (sortedAttempts.length > 0) {
    const latest = sortedAttempts[0];
    const latestTuple = findTuple(latest.lessonId);
    if (latestTuple && latestTuple.summary.nextLesson) {
      const nextTuple = findTuple(latestTuple.summary.nextLesson.id) ?? latestTuple;
      return {
        mode: 'continue_course',
        course: nextTuple.course,
        module: nextTuple.module,
        lesson: nextTuple.lesson,
        completedLessonsInCourse: nextTuple.summary.completedLessonCount,
        totalLessonsInCourse: nextTuple.summary.lessonCount,
        courseCompletionPercent: nextTuple.summary.completionPercent,
        lessonMasteryPercent: lessonMastery[nextTuple.lesson.id]?.masteryPercent ?? 0,
        lastActivityAt: latest.completedAt,
        reasonEn: 'Continue your active course with the next recommended lesson.',
        reasonBn: 'আপনার চলমান কোর্সের পরবর্তী লেসন দিয়ে অনুশীলন এগিয়ে নিন।',
      };
    }
  }

  // 3. Explicitly enrolled course
  for (const courseId of academyState.enrolledCourseIds) {
    const summary = summaries.find((s) => s.course.id === courseId);
    if (summary?.nextLesson) {
      const match = findTuple(summary.nextLesson.id);
      if (match) {
        return {
          mode: 'start_enrolled',
          course: match.course,
          module: match.module,
          lesson: match.lesson,
          completedLessonsInCourse: summary.completedLessonCount,
          totalLessonsInCourse: summary.lessonCount,
          courseCompletionPercent: summary.completionPercent,
          lessonMasteryPercent: lessonMastery[match.lesson.id]?.masteryPercent ?? 0,
          lastActivityAt: null,
          reasonEn: 'You enrolled in this course — begin Lesson 1 to build verified progress.',
          reasonBn: 'আপনি এই কোর্সে যুক্ত হয়েছেন — প্রথম লেসন দিয়ে আপনার অগ্রগতি শুরু করুন।',
        };
      }
    }
  }

  // 4. Diagnostic-matched or foundational starting lesson
  const diagLessonId = diagnostic?.fiveSkillSummary?.personalizedPath?.recommendedFirstLessonId;
  if (diagLessonId) {
    const match = findTuple(diagLessonId);
    if (match) {
      return {
        mode: 'recommended_start',
        course: match.course,
        module: match.module,
        lesson: match.lesson,
        completedLessonsInCourse: match.summary.completedLessonCount,
        totalLessonsInCourse: match.summary.lessonCount,
        courseCompletionPercent: match.summary.completionPercent,
        lessonMasteryPercent: lessonMastery[match.lesson.id]?.masteryPercent ?? 0,
        lastActivityAt: diagnostic.completedAt,
        reasonEn: 'Recommended directly from your initial diagnostic assessment.',
        reasonBn: 'আপনার প্রাথমিক মূল্যায়নের (Diagnostic) ফলাফল অনুযায়ী নির্বাচিত লেসন।',
      };
    }
  }

  // Default: first lesson of first course
  const firstSummary = summaries[0];
  if (firstSummary?.nextLesson) {
    const match = findTuple(firstSummary.nextLesson.id);
    if (match) {
      return {
        mode: 'recommended_start',
        course: match.course,
        module: match.module,
        lesson: match.lesson,
        completedLessonsInCourse: match.summary.completedLessonCount,
        totalLessonsInCourse: match.summary.lessonCount,
        courseCompletionPercent: match.summary.completionPercent,
        lessonMasteryPercent: lessonMastery[match.lesson.id]?.masteryPercent ?? 0,
        lastActivityAt: null,
        reasonEn: 'Recommended starting lesson in your Foundations track.',
        reasonBn: 'মৌলিক ভিত্তি মজবুত করার জন্য প্রথম প্রস্তাবিত লেসন।',
      };
    }
  }

  return null;
}

export function buildLearningPathStages(
  summaries: AcademyCourseSummary[]
): LearningPathStage[] {
  let assignedCurrent = false;
  return summaries.map((summary, idx) => {
    let state: LearningPathStage['state'] = 'available';
    if (summary.status === 'completed') {
      state = 'completed';
    } else if (!assignedCurrent) {
      state = 'current';
      assignedCurrent = true;
    }

    const prevSummary = idx > 0 ? summaries[idx - 1] : null;
    const prerequisiteNoteEn = prevSummary
      ? prevSummary.status === 'completed'
        ? `Previous track (${prevSummary.course.titleEn}) completed.`
        : `Recommended after completing ${prevSummary.course.titleEn} (${prevSummary.completedLessonCount}/${prevSummary.lessonCount} lessons done).`
      : 'Open entry track — no prerequisites required.';
    const prerequisiteNoteBn = prevSummary
      ? prevSummary.status === 'completed'
        ? `পূর্ববর্তী ট্র্যাক (${prevSummary.course.titleBn}) সম্পন্ন হয়েছে।`
        : `${prevSummary.course.titleBn} (${prevSummary.completedLessonCount}/${prevSummary.lessonCount} সম্পন্ন)-এর পর অনুসরণ করা ভালো।`
      : 'শুরুর ট্র্যাক — কোনো পূর্বশর্ত প্রয়োজন নেই।';

    return {
      stageNumber: idx + 1,
      courseSummary: summary,
      state,
      prerequisiteNoteEn,
      prerequisiteNoteBn,
    };
  });
}

export function buildRecommendedLessons(params: {
  courses: CurriculumCourse[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  mistakes: MistakeMemoryItem[];
  diagnostic: EvidenceStartingProfile | null;
  profile: LearnerProfile | null;
  bookmarkedLessonIds: string[];
  now?: Date;
  limit?: number;
}): RecommendedLessonItem[] {
  const {
    courses,
    lessonMastery,
    mistakes,
    diagnostic,
    profile,
    bookmarkedLessonIds,
    now = new Date(),
    limit = 4,
  } = params;

  const bookmarkedSet = new Set(bookmarkedLessonIds);
  const allTuples: Array<{
    course: CurriculumCourse;
    module: CurriculumModule;
    lesson: CurriculumLesson;
  }> = [];

  for (const course of [...courses].sort((a, b) => a.order - b.order)) {
    for (const module of [...course.modules].sort((a, b) => a.order - b.order)) {
      for (const lesson of [...module.lessons].sort((a, b) => a.order - b.order)) {
        allTuples.push({ course, module, lesson });
      }
    }
  }

  const results: RecommendedLessonItem[] = [];
  const added = new Set<string>();

  const pushUnique = (item: RecommendedLessonItem) => {
    if (added.has(item.lesson.id) || results.length >= limit) return;
    added.add(item.lesson.id);
    results.push(item);
  };

  // 1. Spaced Repetition Due Reviews
  for (const tuple of allTuples) {
    const mastery = lessonMastery[tuple.lesson.id] ?? null;
    if (mastery && isReviewDue(mastery, now.toISOString())) {
      pushUnique({
        ...tuple,
        priority: 'due_review',
        reasonEn: `Scheduled spaced review is due (${mastery.masteryPercent}% verified mastery).`,
        reasonBn: `স্পেসড রিপিটিশন রিভিউয়ের সময় হয়েছে (বর্তমান মাস্টারি ${mastery.masteryPercent}%)।`,
        masteryPercent: mastery.masteryPercent,
        isBookmarked: bookmarkedSet.has(tuple.lesson.id),
      });
    }
  }

  // 2. Active Mistake Memory patterns
  const unresolvedCategoryCounts = new Map<string, number>();
  for (const m of mistakes) {
    if (m.status !== 'resolved') {
      unresolvedCategoryCounts.set(
        m.category,
        (unresolvedCategoryCounts.get(m.category) ?? 0) + Math.max(1, m.occurrences)
      );
    }
  }
  const topCategories = Array.from(unresolvedCategoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  for (const category of topCategories) {
    for (const tuple of allTuples) {
      if (tuple.lesson.targetCategories.some((tc) => tc.toLowerCase() === category.toLowerCase())) {
        const mastery = lessonMastery[tuple.lesson.id];
        pushUnique({
          ...tuple,
          priority: 'mistake_memory',
          reasonEn: `Targets your active "${category}" pattern in Mistake Memory.`,
          reasonBn: `আপনার Mistake Memory-তে থাকা "${category}" ভুলের ধরন সংশোধনের জন্য নির্বাচিত।`,
          masteryPercent: mastery?.masteryPercent ?? 0,
          isBookmarked: bookmarkedSet.has(tuple.lesson.id),
        });
      }
    }
  }

  // 3. Diagnostic recommended first lesson
  if (diagnostic) {
    const recId = diagnostic.fiveSkillSummary?.personalizedPath?.recommendedFirstLessonId;
    if (recId) {
      const tuple = allTuples.find((t) => t.lesson.id === recId);
      if (tuple) {
        const mastery = lessonMastery[tuple.lesson.id];
        pushUnique({
          ...tuple,
          priority: 'diagnostic',
          reasonEn: `Matched to your diagnostic placement (${diagnostic.estimatedStartingBand}).`,
          reasonBn: `আপনার প্রাথমিক মূল্যায়নের স্তর (${diagnostic.estimatedStartingBandBn}) অনুযায়ী সুপারিশকৃত।`,
          masteryPercent: mastery?.masteryPercent ?? 0,
          isBookmarked: bookmarkedSet.has(tuple.lesson.id),
        });
      }
    }
  }

  // 4. Unstarted foundational / goal-aligned lessons
  const goalPref = profile?.primaryGoal ?? 'daily_speaking';
  const sortedFallbacks = [...allTuples].sort((a, b) => {
    const aWork = a.course.id === 'course_workplace' ? 1 : 0;
    const bWork = b.course.id === 'course_workplace' ? 1 : 0;
    if (goalPref === 'job_interview' || goalPref === 'workplace') {
      if (aWork !== bWork) return bWork - aWork;
    }
    const aAtt = lessonMastery[a.lesson.id]?.attemptCount ?? 0;
    const bAtt = lessonMastery[b.lesson.id]?.attemptCount ?? 0;
    return aAtt - bAtt || a.course.order - b.course.order || a.lesson.order - b.lesson.order;
  });

  for (const tuple of sortedFallbacks) {
    const mastery = lessonMastery[tuple.lesson.id];
    pushUnique({
      ...tuple,
      priority: 'foundation',
      reasonEn:
        goalPref === 'job_interview' || goalPref === 'workplace'
          ? 'Aligned with your career & workplace communication goal.'
          : 'Core curriculum lesson to strengthen natural English construction.',
      reasonBn:
        goalPref === 'job_interview' || goalPref === 'workplace'
          ? 'আপনার ক্যারিয়ার ও কর্মক্ষেত্রের ইংরেজি লক্ষ্যের সাথে সামঞ্জস্যপূর্ণ।'
          : 'স্বাভাবিক ইংরেজি বাক্য গঠনের ভিত্তি দৃঢ় করার মূল লেসন।',
      masteryPercent: mastery?.masteryPercent ?? 0,
      isBookmarked: bookmarkedSet.has(tuple.lesson.id),
    });
  }

  return results;
}

export function buildRecentlyCompletedLessons(params: {
  courses: CurriculumCourse[];
  lessonAttempts: LessonAttemptRecord[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  limit?: number;
}): RecentlyCompletedLessonItem[] {
  const { courses, lessonAttempts, lessonMastery, limit = 6 } = params;
  if (lessonAttempts.length === 0) return [];

  const lessonIndex = new Map<
    string,
    { lesson: CurriculumLesson; course: CurriculumCourse }
  >();
  for (const course of courses) {
    for (const lesson of getCourseLessons(course)) {
      lessonIndex.set(lesson.id, { lesson, course });
    }
  }

  const attemptsByLesson = new Map<string, LessonAttemptRecord[]>();
  for (const att of lessonAttempts) {
    const list = attemptsByLesson.get(att.lessonId) ?? [];
    list.push(att);
    attemptsByLesson.set(att.lessonId, list);
  }

  const items: RecentlyCompletedLessonItem[] = [];
  for (const [lessonId, list] of attemptsByLesson.entries()) {
    const ref = lessonIndex.get(lessonId);
    if (!ref) continue;
    const sorted = [...list].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    const latest = sorted[0];
    const mastery = lessonMastery[lessonId];
    if (!isLessonCompletedHonestly(sorted, mastery)) {
      continue;
    }
    items.push({
      lesson: ref.lesson,
      course: ref.course,
      latestAttempt: latest,
      attemptCount: sorted.length,
      masteryPercent: mastery?.masteryPercent ?? 0,
      masteryStatus: mastery?.status ?? 'initial_acquisition',
    });
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.latestAttempt.completedAt).getTime() -
        new Date(a.latestAttempt.completedAt).getTime()
    )
    .slice(0, limit);
}

export function buildCourseDetailViewModel(params: {
  course: CurriculumCourse;
  allCourses: CurriculumCourse[];
  lessonAttempts: LessonAttemptRecord[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  academyState: UserAcademyState;
  now?: Date;
}): CourseDetailViewModel {
  const { course, allCourses, lessonAttempts, lessonMastery, academyState, now = new Date() } =
    params;

  const summary = buildCourseSummaries({
    courses: [course],
    lessonAttempts,
    lessonMastery,
    academyState,
    now,
  })[0];

  const allLessonsMap = new Map<string, CurriculumLesson>();
  for (const c of allCourses) {
    for (const l of getCourseLessons(c)) {
      allLessonsMap.set(l.id, l);
    }
  }

  const completedLessonIds = new Set<string>();
  for (const lessonId of allLessonsMap.keys()) {
    const lessonAtts = lessonAttempts.filter((a) => a.lessonId === lessonId);
    if (isLessonCompletedHonestly(lessonAtts, lessonMastery[lessonId])) {
      completedLessonIds.add(lessonId);
    }
  }

  const bookmarkedSet = new Set(academyState.bookmarkedLessonIds);
  const focusLessonId = summary.nextLesson?.id ?? null;

  const modules: CourseDetailModuleGroup[] = [...course.modules]
    .sort((a, b) => a.order - b.order)
    .map((module) => {
      const sortedLessons = [...module.lessons].sort((a, b) => a.order - b.order);
      let completedCount = 0;
      let totalMinutes = 0;

      const items: CourseDetailLessonItem[] = sortedLessons.map((lesson) => {
        totalMinutes += lesson.estimatedMinutes;
        const attempts = lessonAttempts
          .filter((a) => a.lessonId === lesson.id)
          .sort(
            (a, b) =>
              new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          );
        const mastery = lessonMastery[lesson.id];
        const isCompleted = isLessonCompletedHonestly(attempts, mastery);
        if (isCompleted) completedCount += 1;

        const draft = academyState.lessonDrafts[lesson.id];
        const unmetPrereqs = lesson.prerequisiteLessonIds
          .filter((pid) => !completedLessonIds.has(pid))
          .map((pid) => allLessonsMap.get(pid))
          .filter((l): l is CurriculumLesson => Boolean(l));

        return {
          lesson,
          module,
          exerciseCount: countLessonExercises(lesson),
          attemptCount: Math.max(attempts.length, mastery?.attemptCount ?? 0),
          latestAccuracyPercent: attempts[0]?.overallAccuracyPercent ?? null,
          masteryPercent: mastery?.masteryPercent ?? 0,
          masteryStatus: mastery?.status ?? 'not_started',
          isDueForReview: isReviewDue(mastery ?? null, now.toISOString()),
          isCompleted,
          hasDraft: Boolean(draft),
          draftStage: draft?.stage ?? null,
          isBookmarked: bookmarkedSet.has(lesson.id),
          isCurrentFocus: focusLessonId === lesson.id,
          prerequisitesMet: unmetPrereqs.length === 0,
          unmetPrerequisiteTitlesEn: unmetPrereqs.map((l) => l.titleEn),
          unmetPrerequisiteTitlesBn: unmetPrereqs.map((l) => l.titleBn),
        };
      });

      return {
        module,
        lessons: items,
        completedCount,
        totalMinutes,
      };
    });

  const objectivesEn: string[] = [];
  const objectivesBn: string[] = [];
  for (const mod of modules) {
    for (const item of mod.lessons) {
      if (item.lesson.objectivesEn[0] && objectivesEn.length < 6) {
        objectivesEn.push(item.lesson.objectivesEn[0]);
      }
      if (item.lesson.objectivesBn[0] && objectivesBn.length < 6) {
        objectivesBn.push(item.lesson.objectivesBn[0]);
      }
    }
  }

  const orderedCourses = [...allCourses].sort((a, b) => a.order - b.order);
  const courseIdx = orderedCourses.findIndex((c) => c.id === course.id);
  const prevCourse = courseIdx > 0 ? orderedCourses[courseIdx - 1] : null;

  const prerequisiteNoteEn = prevCourse
    ? `Recommended after "${prevCourse.titleEn}" (${prevCourse.cefrRange}), though you may explore lessons freely.`
    : 'No prerequisites — designed as an open entry point for Bangla-speaking learners.';
  const prerequisiteNoteBn = prevCourse
    ? `"${prevCourse.titleBn}" (${prevCourse.cefrRange}) শেষ করার পর এটি অনুসরণ করা সবচেয়ে কার্যকর, তবে আপনি যেকোনো লেসন সরাসরি শুরু করতে পারবেন।`
    : 'কোনো পূর্বশর্ত নেই — বাংলাভাষী শিক্ষার্থীদের জন্য সরাসরি শুরু করার উপযোগী কোর্স।';

  const ctaMode: CourseDetailViewModel['ctaMode'] =
    summary.status === 'completed'
      ? 'review'
      : summary.completedLessonCount > 0 || summary.hasActiveDraft
        ? 'continue'
        : 'start';

  return {
    summary,
    modules,
    aggregatedObjectivesEn: objectivesEn,
    aggregatedObjectivesBn: objectivesBn,
    prerequisiteNoteEn,
    prerequisiteNoteBn,
    ctaLesson: summary.nextLesson,
    ctaMode,
  };
}

export function resolveLessonNeighbors(
  courses: CurriculumCourse[],
  lessonId: string
): LessonNeighbors {
  for (const course of courses) {
    const orderedCourseLessons: LessonNeighbors['orderedCourseLessons'] = [];
    let matchedModule: CurriculumModule | null = null;

    for (const mod of [...course.modules].sort((a, b) => a.order - b.order)) {
      for (const les of [...mod.lessons].sort((a, b) => a.order - b.order)) {
        if (les.id === lessonId) {
          matchedModule = mod;
        }
        orderedCourseLessons.push({
          lesson: les,
          moduleTitleEn: mod.titleEn,
          moduleTitleBn: mod.titleBn,
          moduleOrder: mod.order,
        });
      }
    }

    const idx = orderedCourseLessons.findIndex((x) => x.lesson.id === lessonId);
    if (idx !== -1) {
      return {
        course,
        module: matchedModule,
        prevLesson: idx > 0 ? orderedCourseLessons[idx - 1].lesson : null,
        nextLesson:
          idx < orderedCourseLessons.length - 1
            ? orderedCourseLessons[idx + 1].lesson
            : null,
        orderedCourseLessons,
        currentIndex: idx,
        totalInCourse: orderedCourseLessons.length,
      };
    }
  }

  return {
    course: null,
    module: null,
    prevLesson: null,
    nextLesson: null,
    orderedCourseLessons: [],
    currentIndex: -1,
    totalInCourse: 0,
  };
}
