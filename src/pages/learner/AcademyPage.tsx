import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  Filter,
  Headphones,
  Layers,
  MessageSquare,
  Mic,
  PenTool,
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { AcademyUniverseHero } from '../../components/academy/AcademyUniverseHero';
import { CourseArtworkCard } from '../../components/academy/CourseArtworkCard';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAllCourses } from '../../domain/curriculumData';
import {
  buildCourseSummaries,
  buildLearningCategories,
  buildLearningPathStages,
  buildRecentlyCompletedLessons,
  buildRecommendedLessons,
  filterAndSortCourses,
  resolveContinueLearning,
  type AcademyCategoryKey,
  type AcademyCourseFilterState,
  type AcademyDifficultyFilter,
  type AcademySortOption,
  type AcademyStatusFilter,
  type UserAcademyState,
} from '../../domain/academyEngine';
import {
  readUserAcademyState,
  subscribeAcademyState,
  toggleCourseEnrollment,
  toggleLessonBookmark,
} from '../../services/academyStateStore';
import { SPACED_REPETITION_INTERVALS } from '../../domain/spacedRepetition';
import type { SpacedRepetitionPreset } from '../../types/domain';

const DEFAULT_FILTERS: AcademyCourseFilterState = {
  searchQuery: '',
  category: 'all',
  difficulty: 'all',
  language: 'all',
  status: 'all',
  sortBy: 'recommended',
};

const STAGE_LABELS: Record<string, { en: string; bn: string }> = {
  objective: { en: 'Stage 1 · Objective', bn: 'ধাপ ১ · উদ্দেশ্য' },
  explanation: { en: 'Stage 2 · Concept', bn: 'ধাপ ২ · নিয়ম ও ব্যাখ্যা' },
  examples: { en: 'Stage 3 · Examples', bn: 'ধাপ ৩ · উদাহরণ' },
  guided: { en: 'Stage 4 · Guided Practice', bn: 'ধাপ ৪ · নির্দেশিত অনুশীলন' },
  independent: { en: 'Stage 5 · Independent', bn: 'ধাপ ৫ · স্বাধীন অনুশীলন' },
  assessment: { en: 'Stage 6 · Assessment', bn: 'ধাপ ৬ · মূল্যায়ন' },
  mastery: { en: 'Stage 7 · Mastery', bn: 'ধাপ ৭ · মাস্টারি' },
};

function CategoryIcon({ categoryKey }: { categoryKey: AcademyCategoryKey }) {
  switch (categoryKey) {
    case 'grammar':
      return <Layers className="h-4 w-4" aria-hidden="true" />;
    case 'vocabulary':
      return <BookOpen className="h-4 w-4" aria-hidden="true" />;
    case 'listening':
      return <Headphones className="h-4 w-4" aria-hidden="true" />;
    case 'speaking':
      return <Mic className="h-4 w-4" aria-hidden="true" />;
    case 'practical_communication':
      return <MessageSquare className="h-4 w-4" aria-hidden="true" />;
    case 'reading':
      return <Compass className="h-4 w-4" aria-hidden="true" />;
    case 'writing':
      return <PenTool className="h-4 w-4" aria-hidden="true" />;
    case 'pronunciation':
      return <Volume2 className="h-4 w-4" aria-hidden="true" />;
  }
}

export function AcademyPage() {
  const { lang } = useLanguage();
  const {
    user,
    profile,
    latestDiagnostic: diagnostic,
    lessonAttempts,
    lessonMastery,
    mistakes,
    updateProfile,
  } = useAuth();

  const catalogRef = useRef<HTMLElement | null>(null);
  const [filters, setFilters] = useState<AcademyCourseFilterState>(DEFAULT_FILTERS);
  const [academyState, setAcademyState] = useState<UserAcademyState>(() =>
    readUserAcademyState(user?.id)
  );
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    setAcademyState(readUserAcademyState(user?.id));
    return subscribeAcademyState(user?.id, setAcademyState);
  }, [user?.id]);

  const courses = useMemo(() => getAllCourses(), []);
  const currentPreset: SpacedRepetitionPreset =
    profile?.spacedRepetitionPreset ?? 'standard';

  const courseSummaries = useMemo(
    () =>
      buildCourseSummaries({
        courses,
        lessonAttempts,
        lessonMastery,
        academyState,
      }),
    [courses, lessonAttempts, lessonMastery, academyState]
  );

  const recommendedLessons = useMemo(
    () =>
      buildRecommendedLessons({
        courses,
        lessonMastery,
        mistakes,
        diagnostic,
        profile,
        bookmarkedLessonIds: academyState.bookmarkedLessonIds,
        limit: 4,
      }),
    [courses, lessonMastery, mistakes, diagnostic, profile, academyState.bookmarkedLessonIds]
  );

  const recommendedCourseIds = useMemo(
    () => Array.from(new Set(recommendedLessons.map((item) => item.course.id))),
    [recommendedLessons]
  );

  const filteredCourses = useMemo(
    () => filterAndSortCourses(courseSummaries, filters, recommendedCourseIds),
    [courseSummaries, filters, recommendedCourseIds]
  );

  const continueTarget = useMemo(
    () =>
      resolveContinueLearning({
        courses,
        summaries: courseSummaries,
        lessonAttempts,
        lessonMastery,
        academyState,
        diagnostic,
      }),
    [courses, courseSummaries, lessonAttempts, lessonMastery, academyState, diagnostic]
  );

  const learningPathStages = useMemo(
    () => buildLearningPathStages(courseSummaries),
    [courseSummaries]
  );

  const categories = useMemo(() => buildLearningCategories(courses), [courses]);

  const recentlyCompleted = useMemo(
    () =>
      buildRecentlyCompletedLessons({
        courses,
        lessonAttempts,
        lessonMastery,
        limit: 6,
      }),
    [courses, lessonAttempts, lessonMastery]
  );

  const aggregateStats = useMemo(() => {
    const totalLessonsCount = courseSummaries.reduce((acc, s) => acc + s.lessonCount, 0);
    const completedLessonsCount = courseSummaries.reduce(
      (acc, s) => acc + s.completedLessonCount,
      0
    );
    const enrolledCoursesCount = courseSummaries.filter((s) => s.enrolled).length;
    const dueReviewCount = courseSummaries.reduce((acc, s) => acc + s.dueReviewCount, 0);
    const masteryValues = Object.values(lessonMastery).map((m) => m.masteryPercent);
    const averageMasteryPercent =
      masteryValues.length > 0
        ? Math.round(masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length)
        : 0;
    return {
      totalLessonsCount,
      completedLessonsCount,
      enrolledCoursesCount,
      dueReviewCount,
      averageMasteryPercent,
    };
  }, [courseSummaries, lessonMastery]);

  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.category !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.language !== 'all' ||
    filters.status !== 'all' ||
    filters.sortBy !== 'recommended';

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleEnroll = (courseId: string) => {
    if (!user?.id) return;
    const next = toggleCourseEnrollment(user.id, courseId);
    setAcademyState(next);
  };

  const handleToggleBookmark = (lessonId: string) => {
    if (!user?.id) return;
    const next = toggleLessonBookmark(user.id, lessonId);
    setAcademyState(next);
  };

  const handlePresetChange = async (preset: SpacedRepetitionPreset) => {
    setSavingPreset(true);
    try {
      await updateProfile({ spacedRepetitionPreset: preset });
    } finally {
      setSavingPreset(false);
    }
  };

  const formatShortDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <LearnerShell title={lang === 'bn' ? 'একাডেমি' : 'Academy'}>
      <div className="space-y-8 pb-6">
        {/* 1. Signature Academy Hero */}
        <AcademyUniverseHero
          continueTarget={continueTarget}
          totalCourses={courses.length}
          enrolledCoursesCount={aggregateStats.enrolledCoursesCount}
          completedLessonsCount={aggregateStats.completedLessonsCount}
          totalLessonsCount={aggregateStats.totalLessonsCount}
          dueReviewCount={aggregateStats.dueReviewCount}
          averageMasteryPercent={aggregateStats.averageMasteryPercent}
          onExploreCourses={scrollToCatalog}
        />

        {/* 2. Continue Learning Spotlight */}
        {continueTarget && (
          <section
            aria-labelledby="continue-learning-heading"
            className="rounded-2xl border border-[#3B82F6]/35 bg-gradient-to-r from-[#091234] via-[#0B153B] to-[#11153B] p-5 sm:p-6"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00D9FF]">
                  {continueTarget.mode === 'resume_draft'
                    ? lang === 'bn'
                      ? 'সংরক্ষিত লেসন চালিয়ে যান'
                      : 'Resume Saved Progress'
                    : continueTarget.mode === 'continue_course'
                      ? lang === 'bn'
                        ? 'চলমান কোর্স'
                        : 'Continue Learning'
                      : lang === 'bn'
                        ? 'আপনার পরবর্তী প্রস্তাবিত ধাপ'
                        : 'Recommended Next Lesson'}
                </p>

                <h2
                  id="continue-learning-heading"
                  className="font-portal mt-1.5 text-xl font-bold text-white sm:text-2xl"
                >
                  {lang === 'bn' ? continueTarget.lesson.titleBn : continueTarget.lesson.titleEn}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  <Link
                    to={`/app/learn/course/${continueTarget.course.id}`}
                    className="font-medium text-slate-200 hover:text-[#00D9FF] transition-colors"
                  >
                    {lang === 'bn'
                      ? continueTarget.course.titleBn
                      : continueTarget.course.titleEn}
                  </Link>
                  <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
                  <span>
                    {lang === 'bn'
                      ? continueTarget.module.titleBn
                      : continueTarget.module.titleEn}
                  </span>
                  {continueTarget.draftStage && (
                    <>
                      <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
                      <span className="font-medium text-violet-300">
                        {lang === 'bn'
                          ? STAGE_LABELS[continueTarget.draftStage]?.bn
                          : STAGE_LABELS[continueTarget.draftStage]?.en}
                      </span>
                    </>
                  )}
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  {lang === 'bn' ? continueTarget.reasonBn : continueTarget.reasonEn}
                </p>

                <div className="mt-4 max-w-md">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {lang === 'bn' ? 'কোর্স অগ্রগতি' : 'Course completion'}
                    </span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {continueTarget.completedLessonsInCourse}/{continueTarget.totalLessonsInCourse}{' '}
                      ({continueTarget.courseCompletionPercent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6]"
                      style={{ width: `${continueTarget.courseCompletionPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  to={`/app/learn/course/${continueTarget.course.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#05091F]/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap"
                >
                  <span>{lang === 'bn' ? 'কারিকুলাম দেখুন' : 'Course Outline'}</span>
                </Link>
                <Link
                  to={`/app/learn/${continueTarget.lesson.id}`}
                  className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white whitespace-nowrap"
                >
                  <span>
                    {continueTarget.mode === 'resume_draft'
                      ? lang === 'bn'
                        ? 'যেখানে থেমেছিলেন সেখান থেকে শুরু'
                        : 'Resume Lesson'
                      : lang === 'bn'
                        ? 'লেসন খুলুন'
                        : 'Open Lesson'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 3. My Learning Path Progression */}
        <section aria-labelledby="learning-path-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="learning-path-heading"
                className="font-portal text-xl font-bold text-white"
              >
                {lang === 'bn' ? 'আমার লার্নিং পাথ' : 'My Learning Path'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {lang === 'bn'
                  ? 'Pre-A1 মৌলিক বাক্যগঠন থেকে B2 কর্মক্ষেত্রের সাবলীল ইংরেজি পর্যন্ত ধাপে ধাপে অগ্রগতি।'
                  : 'Structured progression from Pre-A1 sentence foundations to B2 workplace clarity.'}
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {learningPathStages.filter((s) => s.state === 'completed').length}/
              {learningPathStages.length} {lang === 'bn' ? 'ট্র্যাক সম্পন্ন' : 'tracks completed'}
            </span>
          </div>

          <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {learningPathStages.map((stage) => {
              const s = stage.courseSummary;
              const borderClass =
                stage.state === 'completed'
                  ? 'border-emerald-500/45 bg-[#08162E]/85'
                  : stage.state === 'current'
                    ? 'border-[#00D9FF]/50 bg-[#0A143A]/90'
                    : 'border-slate-800/90 bg-[#080F2E]/75';

              return (
                <li
                  key={s.course.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-colors ${borderClass}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#00D9FF] tabular-nums">
                        {lang === 'bn'
                          ? `ধাপ ০${stage.stageNumber}`
                          : `STAGE 0${stage.stageNumber}`}{' '}
                        · {s.course.cefrRange}
                      </span>
                      <span
                        className={`font-semibold ${
                          stage.state === 'completed'
                            ? 'text-emerald-400'
                            : stage.state === 'current'
                              ? 'text-[#00D9FF]'
                              : 'text-slate-400'
                        }`}
                      >
                        {stage.state === 'completed'
                          ? lang === 'bn'
                            ? 'সম্পন্ন'
                            : 'Completed'
                          : stage.state === 'current'
                            ? lang === 'bn'
                              ? 'বর্তমান ফোকাস'
                              : 'Active Focus'
                            : lang === 'bn'
                              ? 'উপলব্ধ'
                              : 'Available'}
                      </span>
                    </div>

                    <h3 className="font-portal mt-2.5 text-base font-bold text-white">
                      {lang === 'bn' ? s.course.titleBn : s.course.titleEn}
                    </h3>

                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                      {lang === 'bn' ? stage.prerequisiteNoteBn : stage.prerequisiteNoteEn}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300 tabular-nums">
                        {s.completedLessonCount}/{s.lessonCount}{' '}
                        {lang === 'bn' ? 'লেসন' : 'lessons'} · ~{s.totalMinutes}m
                      </span>
                      <Link
                        to={`/app/learn/course/${s.course.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-[#7DD3FC] hover:text-white transition-colors"
                      >
                        <span>{lang === 'bn' ? 'খুলুন' : 'Open Track'}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 4. Explore Courses — Real Search, Filters, Sorting & Catalog Grid */}
        <section
          id="academy-catalog"
          ref={catalogRef}
          aria-labelledby="explore-courses-heading"
          className="space-y-5 scroll-mt-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="explore-courses-heading"
                className="font-portal text-xl font-bold text-white"
              >
                {lang === 'bn' ? 'সব কোর্স অন্বেষণ করুন' : 'Explore Courses'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {lang === 'bn'
                  ? 'কোর্স, দক্ষতা বা CEFR স্তর অনুযায়ী খুঁজুন এবং যেকোনো কোর্সের সম্পূর্ণ কারিকুলাম দেখুন।'
                  : 'Search and filter every published course by skill focus, CEFR difficulty, enrollment status, or duration.'}
              </p>
            </div>
            <p className="font-mono text-xs text-slate-400 tabular-nums">
              {filteredCourses.length} / {courseSummaries.length}{' '}
              {lang === 'bn' ? 'কোর্স প্রদর্শিত' : 'courses shown'}
            </p>
          </div>

          {/* Search + Multi-Facet Filter Bar */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#080F2E]/85 p-4 space-y-3.5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              {/* Search */}
              <div className="relative md:col-span-5">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <label htmlFor="academy-course-search" className="sr-only">
                  {lang === 'bn' ? 'কোর্স বা লেসন খুঁজুন' : 'Search courses or lessons'}
                </label>
                <input
                  id="academy-course-search"
                  type="search"
                  value={filters.searchQuery}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                  }
                  placeholder={
                    lang === 'bn'
                      ? 'কোর্স, টপিক বা ব্যাকরণ খুঁজুন (যেমন: Tense, Interview)...'
                      : 'Search courses, lessons, or skills (e.g. Tense, Preposition, Interview)...'
                  }
                  className="w-full rounded-xl border border-slate-700/90 bg-[#05091F] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                />
              </div>

              {/* Difficulty */}
              <div className="md:col-span-2">
                <label htmlFor="academy-filter-difficulty" className="sr-only">
                  {lang === 'bn' ? 'স্তর' : 'Difficulty'}
                </label>
                <select
                  id="academy-filter-difficulty"
                  value={filters.difficulty}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      difficulty: e.target.value as AcademyDifficultyFilter,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700/90 bg-[#05091F] px-3 py-2.5 text-xs font-medium text-slate-200 focus:border-[#00D9FF] focus:outline-none"
                >
                  <option value="all">{lang === 'bn' ? 'সব স্তর (CEFR)' : 'All Levels'}</option>
                  <option value="beginner">Pre-A1 – A2</option>
                  <option value="intermediate">A2 – B1</option>
                  <option value="upper_intermediate">B1 – B2</option>
                </select>
              </div>

              {/* Language */}
              <div className="md:col-span-2">
                <label htmlFor="academy-filter-language" className="sr-only">
                  {lang === 'bn' ? 'ভাষা' : 'Language'}
                </label>
                <select
                  id="academy-filter-language"
                  value={filters.language}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      language: e.target.value as 'all' | 'english_bn',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700/90 bg-[#05091F] px-3 py-2.5 text-xs font-medium text-slate-200 focus:border-[#00D9FF] focus:outline-none"
                >
                  <option value="all">{lang === 'bn' ? 'সব ভাষা' : 'All Languages'}</option>
                  <option value="english_bn">
                    {lang === 'bn' ? 'ইংরেজি (বাংলা-নির্দেশিত)' : 'English (Bangla-Guided)'}
                  </option>
                </select>
              </div>

              {/* Sort */}
              <div className="md:col-span-3">
                <label htmlFor="academy-sort" className="sr-only">
                  {lang === 'bn' ? 'সাজানোর ক্রম' : 'Sort courses'}
                </label>
                <select
                  id="academy-sort"
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortBy: e.target.value as AcademySortOption,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700/90 bg-[#05091F] px-3 py-2.5 text-xs font-medium text-slate-200 focus:border-[#00D9FF] focus:outline-none"
                >
                  <option value="recommended">
                    {lang === 'bn' ? 'সাজানো: প্রস্তাবিত' : 'Sort: Recommended'}
                  </option>
                  <option value="level_asc">
                    {lang === 'bn' ? 'সাজানো: মৌলিক → উচ্চতর' : 'Sort: Level (Pre-A1 → B2)'}
                  </option>
                  <option value="duration_asc">
                    {lang === 'bn' ? 'সাজানো: সময় (কম → বেশি)' : 'Sort: Shortest Duration'}
                  </option>
                  <option value="progress_desc">
                    {lang === 'bn' ? 'সাজানো: সর্বাধিক অগ্রগতি' : 'Sort: Most Progress'}
                  </option>
                </select>
              </div>
            </div>

            {/* Interactive Status & Category Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div
                role="group"
                aria-label={lang === 'bn' ? 'কোর্স স্ট্যাটাস ফিল্টার' : 'Filter courses by status'}
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'অবস্থা:' : 'Status:'}</span>
                </span>
                {(
                  [
                    { id: 'all', en: 'All', bn: 'সব' },
                    { id: 'enrolled', en: 'Enrolled', bn: 'যুক্ত' },
                    { id: 'in_progress', en: 'In Progress', bn: 'চলমান' },
                    { id: 'completed', en: 'Completed', bn: 'সম্পন্ন' },
                    { id: 'not_started', en: 'Not Started', bn: 'নতুন' },
                    { id: 'due_review', en: 'Reviews Due', bn: 'বকেয়া রিভিউ' },
                    { id: 'bookmarked', en: 'Bookmarked', bn: 'সংরক্ষিত' },
                  ] as Array<{ id: AcademyStatusFilter; en: string; bn: string }>
                ).map((item) => {
                  const active = filters.status === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, status: item.id }))
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'border-[#00D9FF]/60 bg-[#00D9FF]/15 text-white'
                          : 'border-slate-800 bg-[#05091F] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {lang === 'bn' ? item.bn : item.en}
                    </button>
                  );
                })}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'ফিল্টার রিসেট' : 'Reset filters'}</span>
                </button>
              )}
            </div>

            {filters.category !== 'all' && (
              <div className="flex items-center justify-between rounded-xl border border-violet-500/35 bg-violet-500/10 px-3.5 py-2 text-xs text-violet-200">
                <span>
                  {lang === 'bn' ? 'সক্রিয় ক্যাটাগরি ফিল্টার: ' : 'Active category filter: '}
                  <strong className="text-white">
                    {
                      categories.find((c) => c.key === filters.category)?.[
                        lang === 'bn' ? 'titleBn' : 'titleEn'
                      ]
                    }
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, category: 'all' }))}
                  className="font-semibold text-white underline cursor-pointer"
                >
                  {lang === 'bn' ? 'মুছুন' : 'Clear'}
                </button>
              </div>
            )}
          </div>

          {/* Course Catalog Grid or Honest Empty State */}
          {filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#080F2E]/80 p-8 text-center">
              <p className="font-portal text-base font-bold text-white">
                {lang === 'bn'
                  ? 'আপনার ফিল্টার অনুযায়ী কোনো কোর্স পাওয়া যায়নি'
                  : 'No courses match your current filters'}
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                {lang === 'bn'
                  ? 'অনুসন্ধানের শব্দ পরিবর্তন করুন অথবা সব কোর্স দেখতে ফিল্টার রিসেট করুন।'
                  : 'Try adjusting your search keywords or reset filters to browse all published Academy courses.'}
              </p>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'সব কোর্স দেখুন' : 'Show All Courses'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredCourses.map((summary) => (
                <CourseArtworkCard
                  key={summary.course.id}
                  summary={summary}
                  onToggleEnroll={handleToggleEnroll}
                />
              ))}
            </div>
          )}
        </section>

        {/* 5. Learning Categories Matrix (Strictly Honest Availability) */}
        <section aria-labelledby="categories-heading" className="space-y-4">
          <div>
            <h2
              id="categories-heading"
              className="font-portal text-xl font-bold text-white"
            >
              {lang === 'bn' ? 'দক্ষতাভিত্তিক বিভাগসমূহ' : 'Learning Categories'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {lang === 'bn'
                ? 'বর্তমানে উপলব্ধ ইন্টারঅ্যাক্টিভ ট্র্যাকগুলো থেকে সরাসরি বেছে নিন। যে বিভাগগুলো এখনো তৈরি হচ্ছে তা স্পষ্টভাবে উল্লেখ করা হয়েছে।'
                : 'Jump straight into live playable skill tracks. Categories without standalone courses yet are transparently marked.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => {
              const isSelected = filters.category === cat.key;
              const isUpcoming = cat.availability === 'upcoming';

              return (
                <div
                  key={cat.key}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                    isSelected
                      ? 'border-[#00D9FF]/60 bg-[#0A173F]'
                      : isUpcoming
                        ? 'border-slate-800/60 bg-[#060C24]/60 opacity-80'
                        : 'border-slate-800/90 bg-[#080F2E]/85 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                          isUpcoming
                            ? 'border-slate-800 bg-slate-900/70 text-slate-500'
                            : cat.availability === 'playable_module_link'
                              ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                              : 'border-[#00D9FF]/35 bg-[#00D9FF]/10 text-[#00D9FF]'
                        }`}
                      >
                        <CategoryIcon categoryKey={cat.key} />
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {cat.availability === 'playable_module_link'
                          ? lang === 'bn'
                            ? '৪টি মোড'
                            : '4 live modes'
                          : isUpcoming
                            ? lang === 'bn'
                              ? '০ কোর্স'
                              : '0 courses'
                            : `${cat.lessonCount} ${lang === 'bn' ? 'লেসন' : 'lessons'}`}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-white">
                      {lang === 'bn' ? cat.titleBn : cat.titleEn}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {lang === 'bn' ? cat.descriptionBn : cat.descriptionEn}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/70">
                    {cat.availability === 'playable_academy' && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            category: prev.category === cat.key ? 'all' : cat.key,
                          }));
                          scrollToCatalog();
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#7DD3FC] hover:text-white transition-colors cursor-pointer"
                      >
                        <span>
                          {isSelected
                            ? lang === 'bn'
                              ? 'ফিল্টার সরান'
                              : 'Clear filter'
                            : lang === 'bn'
                              ? cat.actionLabelBn
                              : cat.actionLabelEn}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}

                    {cat.availability === 'playable_module_link' && cat.targetRoute && (
                      <Link
                        to={cat.targetRoute}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-white transition-colors"
                      >
                        <span>{lang === 'bn' ? cat.actionLabelBn : cat.actionLabelEn}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}

                    {isUpcoming && (
                      <span className="text-xs font-medium text-slate-500">
                        {lang === 'bn' ? cat.actionLabelBn : cat.actionLabelEn}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. Evidence-Based Recommended Learning + Recently Completed Split */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Recommended Learning */}
          <section
            aria-labelledby="recommended-learning-heading"
            className="lg:col-span-7 rounded-2xl border border-slate-800/90 bg-[#080F2E]/85 p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  id="recommended-learning-heading"
                  className="font-portal text-lg font-bold text-white flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? 'আপনার জন্য সুপারিশকৃত' : 'Recommended for You'}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'আপনার ডায়াগনস্টিক, Mistake Memory এবং স্পেসড রিভিউ সূচি থেকে সরাসরি নির্ধারিত।'
                    : 'Prioritized directly from your due reviews, Mistake Memory patterns, and diagnostic placement.'}
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {recommendedLessons.map((item) => {
                const priorityLabel =
                  item.priority === 'due_review'
                    ? lang === 'bn'
                      ? 'রিভিউ বকেয়া'
                      : 'Review Due'
                    : item.priority === 'mistake_memory'
                      ? lang === 'bn'
                        ? 'Mistake Memory লক্ষ্য'
                        : 'Mistake Target'
                      : item.priority === 'diagnostic'
                        ? lang === 'bn'
                          ? 'ডায়াগনস্টিক ম্যাচ'
                          : 'Diagnostic Match'
                        : lang === 'bn'
                          ? 'মূল ভিত্তি'
                          : 'Core Track';

                const priorityColor =
                  item.priority === 'due_review'
                    ? 'text-amber-300'
                    : item.priority === 'mistake_memory'
                      ? 'text-violet-300'
                      : 'text-[#00D9FF]';

                return (
                  <div
                    key={item.lesson.id}
                    className="flex flex-col gap-3 py-4 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-400">
                        <span className={`font-semibold ${priorityColor}`}>
                          {priorityLabel}
                        </span>
                        <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
                        <span className="font-mono">{item.lesson.cefrBand}</span>
                        <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
                        <span className="font-mono tabular-nums">
                          {item.lesson.estimatedMinutes}m
                        </span>
                      </p>
                      <h3 className="mt-1 text-sm font-bold text-white">
                        {lang === 'bn' ? item.lesson.titleBn : item.lesson.titleEn}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {lang === 'bn' ? item.reasonBn : item.reasonEn}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(item.lesson.id)}
                        aria-pressed={item.isBookmarked}
                        aria-label={
                          item.isBookmarked
                            ? `Remove bookmark for ${item.lesson.titleEn}`
                            : `Bookmark ${item.lesson.titleEn}`
                        }
                        className={`rounded-lg border p-2 transition-colors cursor-pointer ${
                          item.isBookmarked
                            ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                            : 'border-slate-700 bg-[#05091F] text-slate-400 hover:text-white'
                        }`}
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${item.isBookmarked ? 'fill-current' : ''}`}
                          aria-hidden="true"
                        />
                      </button>

                      <Link
                        to={`/app/learn/${item.lesson.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B82F6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap"
                      >
                        <span>
                          {item.masteryPercent > 0
                            ? lang === 'bn'
                              ? 'রিভিউ করুন'
                              : 'Review'
                            : lang === 'bn'
                              ? 'শুরু করুন'
                              : 'Start'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recently Completed (Strictly Verified) */}
          <section
            aria-labelledby="recently-completed-heading"
            className="lg:col-span-5 rounded-2xl border border-slate-800/90 bg-[#080F2E]/85 p-5 sm:p-6 flex flex-col justify-between gap-4"
          >
            <div className="space-y-4">
              <div>
                <h2
                  id="recently-completed-heading"
                  className="font-portal text-lg font-bold text-white flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? 'সম্প্রতি সম্পন্ন লেসন' : 'Recently Completed'}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'কেবল গ্রেডেড মূল্যায়ন সম্পন্ন করা প্রমাণিত লেসনগুলো এখানে দেখানো হয়।'
                    : 'Only lessons verified through a completed graded assessment appear here.'}
                </p>
              </div>

              {recentlyCompleted.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-[#05091F]/70 p-5 text-center">
                  <Clock
                    className="mx-auto h-6 w-6 text-slate-600"
                    aria-hidden="true"
                  />
                  <p className="mt-2.5 text-sm font-semibold text-slate-200">
                    {lang === 'bn'
                      ? 'এখনো কোনো লেসন মূল্যায়ন সম্পন্ন হয়নি'
                      : 'No completed lessons yet'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {lang === 'bn'
                      ? 'শুধু লেসন খুললেই তা সম্পন্ন ধরা হয় না। ধাপ ৬-এর মূল্যায়ন জমা দিলে আপনার প্রমাণিত ইতিহাস এখানে তৈরি হবে।'
                      : 'Opening a lesson never marks it complete. Finish Stage 6 (Graded Assessment) in any lesson to log verified completion here.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-800/80">
                  {recentlyCompleted.map((item) => (
                    <li
                      key={item.lesson.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/app/learn/${item.lesson.id}`}
                          className="block truncate text-sm font-semibold text-white hover:text-[#7DD3FC] transition-colors"
                        >
                          {lang === 'bn' ? item.lesson.titleBn : item.lesson.titleEn}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
                          {formatShortDate(item.latestAttempt.completedAt)} ·{' '}
                          {item.latestAttempt.overallAccuracyPercent}%{' '}
                          {lang === 'bn' ? 'সঠিক' : 'accuracy'} · {item.masteryPercent}%{' '}
                          {lang === 'bn' ? 'মাস্টারি' : 'mastery'}
                        </p>
                      </div>
                      <Link
                        to={`/app/learn/${item.lesson.id}`}
                        className="shrink-0 rounded-lg border border-slate-700 bg-[#05091F] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#00D9FF]/60 hover:text-white transition-colors"
                      >
                        {lang === 'bn' ? 'রিভিউ' : 'Review'}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Spaced Repetition Cadence Compact Selector */}
            <div className="border-t border-slate-800/80 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <CalendarClock className="h-3.5 w-3.5 text-[#A78BFA]" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? 'স্পেসড রিপিটিশন রিভিউ বিরতি'
                    : 'Spaced Repetition Cadence'}
                </span>
              </div>
              <div
                role="group"
                aria-label="Spaced repetition review preset"
                className="mt-2.5 flex flex-wrap gap-1.5"
              >
                {(['intensive', 'standard', 'relaxed'] as SpacedRepetitionPreset[]).map(
                  (preset) => {
                    const active = currentPreset === preset;
                    const label =
                      preset === 'intensive'
                        ? lang === 'bn'
                          ? 'দ্রুত'
                          : 'Intensive'
                        : preset === 'standard'
                          ? lang === 'bn'
                            ? 'স্বাভাবিক'
                            : 'Standard'
                          : lang === 'bn'
                            ? 'সহজ'
                            : 'Relaxed';
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={savingPreset}
                        aria-pressed={active}
                        onClick={() => void handlePresetChange(preset)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-violet-500/60 bg-violet-500/15 text-white'
                            : 'border-slate-800 bg-[#05091F] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>
              <p className="mt-2 font-mono text-[11px] text-slate-500 tabular-nums">
                {SPACED_REPETITION_INTERVALS[currentPreset].map((d) => `${d}d`).join(' → ')}
              </p>
            </div>
          </section>
        </div>
      </div>
    </LearnerShell>
  );
}
