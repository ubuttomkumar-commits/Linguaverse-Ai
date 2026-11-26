import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  PlayCircle,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAllCourses, getCourseById } from '../../domain/curriculumData';
import {
  buildCourseDetailViewModel,
  type UserAcademyState,
} from '../../domain/academyEngine';
import {
  enrollUserInCourse,
  readUserAcademyState,
  subscribeAcademyState,
  toggleCourseEnrollment,
  toggleLessonBookmark,
} from '../../services/academyStateStore';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { lang } = useLanguage();
  const { user, lessonAttempts, lessonMastery } = useAuth();

  const [academyState, setAcademyState] = useState<UserAcademyState>(() =>
    readUserAcademyState(user?.id)
  );
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAcademyState(readUserAcademyState(user?.id));
    return subscribeAcademyState(user?.id, setAcademyState);
  }, [user?.id]);

  const allCourses = useMemo(() => getAllCourses(), []);
  const course = useMemo(
    () => (courseId ? getCourseById(courseId) : undefined),
    [courseId]
  );

  const vm = useMemo(() => {
    if (!course) return null;
    return buildCourseDetailViewModel({
      course,
      allCourses,
      lessonAttempts,
      lessonMastery,
      academyState,
    });
  }, [course, allCourses, lessonAttempts, lessonMastery, academyState]);

  if (!course || !vm) {
    return (
      <LearnerShell title={lang === 'bn' ? 'কোর্স পাওয়া যায়নি' : 'Course Not Found'}>
        <div className="rounded-2xl border border-slate-800 bg-[#080F2E]/90 p-6 sm:p-8">
          <h1 className="font-portal text-xl font-bold text-white">
            {lang === 'bn'
              ? 'অনুরোধকৃত কোর্সটি পাওয়া যায়নি'
              : 'The requested course could not be found'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {lang === 'bn'
              ? 'একাডেমি ক্যাটালগে ফিরে গিয়ে উপলব্ধ যেকোনো কোর্স নির্বাচন করুন।'
              : 'Return to the Academy catalog to browse all published courses.'}
          </p>
          <div className="mt-5">
            <Link
              to="/app/learn"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'একাডেমিতে ফিরে যান' : 'Back to Academy'}</span>
            </Link>
          </div>
        </div>
      </LearnerShell>
    );
  }

  const { summary } = vm;

  const handleToggleEnroll = () => {
    if (!user?.id) return;
    setAcademyState(toggleCourseEnrollment(user.id, course.id));
  };

  const handleStartClick = () => {
    if (!user?.id) return;
    if (!summary.enrolled) {
      setAcademyState(enrollUserInCourse(user.id, course.id));
    }
  };

  const handleToggleBookmark = (lessonId: string) => {
    if (!user?.id) return;
    setAcademyState(toggleLessonBookmark(user.id, lessonId));
  };

  const ctaLabel =
    vm.ctaMode === 'continue'
      ? lang === 'bn'
        ? 'কোর্স চালিয়ে যান'
        : 'Continue Course'
      : vm.ctaMode === 'review'
        ? lang === 'bn'
          ? 'কোর্স রিভিউ করুন'
          : 'Review Course'
        : lang === 'bn'
          ? 'শেখা শুরু করুন'
          : 'Start Learning';

  return (
    <LearnerShell title={lang === 'bn' ? course.titleBn : course.titleEn}>
      <div className="space-y-6 pb-8">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Course breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs text-slate-400"
        >
          <Link
            to="/app/learn"
            className="inline-flex items-center gap-1.5 font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'একাডেমি' : 'Academy'}</span>
          </Link>
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span className="font-mono text-[#00D9FF]">{course.cefrRange}</span>
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span className="text-slate-200 font-medium">
            {lang === 'bn' ? course.titleBn : course.titleEn}
          </span>
        </nav>

        {/* Course Overview Hero Panel */}
        <section
          aria-labelledby="course-detail-heading"
          className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br from-[#070E2B] via-[#0B1438] to-[#11153B] p-6 sm:p-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#00D9FF]/12 blur-3xl"
          />

          <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <p className="text-xs text-slate-400">
                <span className="font-mono font-semibold text-[#00D9FF]">
                  {course.cefrRange}
                </span>
                <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
                <span>
                  {lang === 'bn' ? summary.difficultyLabelBn : summary.difficultyLabelEn}
                </span>
                <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
                <span>
                  {lang === 'bn' ? summary.languageLabelBn : summary.languageLabelEn}
                </span>
              </p>

              <h1
                id="course-detail-heading"
                className="font-portal mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl"
              >
                {lang === 'bn' ? course.titleBn : course.titleEn}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                {lang === 'bn' ? course.subtitleBn : course.subtitleEn}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {lang === 'bn' ? course.targetAudienceBn : course.targetAudienceEn}
              </p>

              {/* Fact Strip */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Layers className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
                  {summary.moduleCount} {lang === 'bn' ? 'মডিউল' : 'module'} ·{' '}
                  {summary.lessonCount} {lang === 'bn' ? 'লেসন' : 'lessons'}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Clock className="h-3.5 w-3.5 text-[#A78BFA]" aria-hidden="true" />~
                  {summary.totalMinutes} {lang === 'bn' ? 'মিনিট' : 'min total'}
                </span>
                <span className="font-mono tabular-nums">
                  {summary.totalExercises}{' '}
                  {lang === 'bn' ? 'ইন্টারঅ্যাক্টিভ অনুশীলন' : 'interactive exercises'}
                </span>
              </div>

              {/* Primary CTAs */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {vm.ctaLesson && (
                  <Link
                    to={`/app/learn/${vm.ctaLesson.id}`}
                    onClick={handleStartClick}
                    className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white whitespace-nowrap"
                  >
                    <PlayCircle className="h-4 w-4" aria-hidden="true" />
                    <span>{ctaLabel}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleToggleEnroll}
                  disabled={summary.completedLessonCount > 0}
                  aria-pressed={summary.enrolled}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    summary.enrolled
                      ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                      : 'border-slate-700 bg-[#05091F] text-slate-200 hover:border-[#00D9FF]/60 hover:text-white'
                  } ${summary.completedLessonCount > 0 ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                >
                  {summary.enrolled ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {lang === 'bn' ? 'কোর্সে যুক্ত আছেন' : 'Enrolled in Course'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'কোর্সে যুক্ত হোন' : 'Enroll in Course'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Verified Course Progress Card */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-800/90 bg-[#05091F]/80 p-5 flex flex-col justify-between space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {lang === 'bn' ? 'প্রমাণিত অগ্রগতি' : 'Verified Course Progress'}
                </p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-mono text-3xl font-bold text-white tabular-nums">
                    {summary.completionPercent}%
                  </span>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {summary.completedLessonCount}/{summary.lessonCount}{' '}
                    {lang === 'bn' ? 'লেসন সম্পন্ন' : 'lessons done'}
                  </span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] via-[#3B82F6] to-[#8B5CF6]"
                    style={{ width: `${summary.completionPercent}%` }}
                  />
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4 text-xs">
                <div>
                  <dt className="text-slate-400">
                    {lang === 'bn' ? 'গড় মাস্টারি' : 'Avg Mastery'}
                  </dt>
                  <dd className="mt-1 font-mono text-base font-bold text-[#A78BFA] tabular-nums">
                    {summary.averageMasteryPercent}%
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">
                    {lang === 'bn' ? 'বকেয়া রিভিউ' : 'Reviews Due'}
                  </dt>
                  <dd
                    className={`mt-1 font-mono text-base font-bold tabular-nums ${
                      summary.dueReviewCount > 0 ? 'text-amber-300' : 'text-emerald-400'
                    }`}
                  >
                    {summary.dueReviewCount}
                  </dd>
                </div>
              </dl>

              <p className="text-[11px] leading-relaxed text-slate-500">
                {lang === 'bn'
                  ? 'কেবল গ্রেডেড মূল্যায়ন জমা দিলেই লেসন সম্পন্ন হয়। একবারে সর্বোচ্চ ৪৫% এবং স্পেসড রিভিউয়ের মাধ্যমে ১০০% মাস্টারি অর্জিত হয়।'
                  : 'Lessons count as complete only after submitting the graded assessment. Long-term mastery grows across spaced reviews.'}
              </p>
            </div>
          </div>
        </section>

        {/* Objectives & Prerequisites */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-slate-800/90 bg-[#080F2E]/85 p-5 sm:p-6">
            <h2 className="font-portal text-base font-bold text-white">
              {lang === 'bn' ? 'এই কোর্স থেকে যা শিখবেন' : 'What You Will Master'}
            </h2>
            <ul className="mt-3.5 space-y-2.5">
              {(lang === 'bn' ? vm.aggregatedObjectivesBn : vm.aggregatedObjectivesEn).map(
                (obj, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-200">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#00D9FF]"
                      aria-hidden="true"
                    />
                    <span>{obj}</span>
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-800/90 bg-[#080F2E]/85 p-5 sm:p-6 space-y-3">
            <h2 className="font-portal text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-violet-300" aria-hidden="true" />
              <span>{lang === 'bn' ? 'পূর্বশর্ত ও কাঠামো' : 'Prerequisites & Structure'}</span>
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              {lang === 'bn' ? vm.prerequisiteNoteBn : vm.prerequisiteNoteEn}
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'প্রতিটি লেসনে ৭টি ধাপ আছে: উদ্দেশ্য, বাংলা-ইংরেজি নিয়ম বিশ্লেষণ, অডিও উদাহরণ, নির্দেশিত অনুশীলন, স্বাধীন বাক্য গঠন, গ্রেডেড মূল্যায়ন এবং স্পেসড রিপিটিশন মাস্টারি।'
                : 'Every lesson follows our 7-stage mastery loop: Objective, Bilingual Concept Contrast, Audio Examples, Guided Drills, Independent Construction, Graded Assessment, and Spaced Mastery.'}
            </p>
          </div>
        </section>

        {/* Vertical Curriculum Timeline */}
        <section aria-labelledby="curriculum-timeline-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="curriculum-timeline-heading"
                className="font-portal text-xl font-bold text-white"
              >
                {lang === 'bn' ? 'কোর্স কারিকুলাম ও মডিউল' : 'Course Curriculum Timeline'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {lang === 'bn'
                  ? 'প্রতিটি মডিউলের ভেতরের লেসন, অনুশীলনের সংখ্যা এবং আপনার বর্তমান অবস্থা দেখুন।'
                  : 'Expand modules to inspect lesson objectives, exercise counts, prerequisites, and verified mastery.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {vm.modules.map((group) => {
              const isCollapsed = Boolean(collapsedModules[group.module.id]);
              return (
                <div
                  key={group.module.id}
                  className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#080F2E]/85"
                >
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsedModules((prev) => ({
                        ...prev,
                        [group.module.id]: !prev[group.module.id],
                      }))
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#0C1742]/60 transition-colors cursor-pointer sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-[#00D9FF] tabular-nums">
                        {group.completedCount}/{group.lessons.length}{' '}
                        {lang === 'bn' ? 'সম্পন্ন' : 'completed'} · ~{group.totalMinutes}m
                      </p>
                      <h3 className="font-portal mt-1 text-base font-bold text-white sm:text-lg">
                        {lang === 'bn' ? group.module.titleBn : group.module.titleEn}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {lang === 'bn'
                          ? group.module.descriptionBn
                          : group.module.descriptionEn}
                      </p>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown
                        className="h-5 w-5 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronUp
                        className="h-5 w-5 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {!isCollapsed && (
                    <ol className="divide-y divide-slate-800/80 border-t border-slate-800/80">
                      {group.lessons.map((item, idx) => {
                        const statusText = item.isDueForReview
                          ? lang === 'bn'
                            ? 'রিভিউ বকেয়া'
                            : 'Review due'
                          : item.masteryStatus === 'mastered'
                            ? lang === 'bn'
                              ? 'প্রমাণিত মাস্টারি'
                              : 'Mastered'
                            : item.isCompleted
                              ? lang === 'bn'
                                ? `সম্পন্ন (${item.masteryPercent}% মাস্টারি)`
                                : `Completed (${item.masteryPercent}% mastery)`
                              : item.hasDraft
                                ? lang === 'bn'
                                  ? 'খসড়া সংরক্ষিত'
                                  : 'Saved draft'
                                : item.isCurrentFocus
                                  ? lang === 'bn'
                                    ? 'পরবর্তী প্রস্তাবিত'
                                    : 'Up next'
                                  : lang === 'bn'
                                    ? 'শুরু হয়নি'
                                    : 'Not started';

                        const statusColor = item.isDueForReview
                          ? 'text-amber-300'
                          : item.isCompleted
                            ? 'text-emerald-400'
                            : item.hasDraft || item.isCurrentFocus
                              ? 'text-[#00D9FF]'
                              : 'text-slate-400';

                        return (
                          <li
                            key={item.lesson.id}
                            className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                              item.isCurrentFocus ? 'bg-[#0C1742]/45' : ''
                            }`}
                          >
                            <div className="flex items-start gap-4 min-w-0 flex-1">
                              {/* Vertical timeline step indicator */}
                              <div
                                aria-hidden="true"
                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold tabular-nums ${
                                  item.isCompleted
                                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                                    : item.isCurrentFocus || item.hasDraft
                                      ? 'border-[#00D9FF]/60 bg-[#00D9FF]/15 text-[#00D9FF]'
                                      : 'border-slate-700 bg-[#05091F] text-slate-400'
                                }`}
                              >
                                {item.isCompleted ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  `0${idx + 1}`
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-400">
                                  <span className="font-mono text-slate-300">
                                    {item.lesson.cefrBand}
                                  </span>
                                  <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
                                  <span className="font-mono tabular-nums">
                                    {item.lesson.estimatedMinutes}m
                                  </span>
                                  <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
                                  <span className="font-mono tabular-nums">
                                    {item.exerciseCount}{' '}
                                    {lang === 'bn' ? 'অনুশীলন' : 'exercises'}
                                  </span>
                                  <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
                                  <span className={`font-semibold ${statusColor}`}>
                                    {statusText}
                                  </span>
                                </p>

                                <h4 className="mt-1 text-base font-bold text-white">
                                  {lang === 'bn'
                                    ? item.lesson.titleBn
                                    : item.lesson.titleEn}
                                </h4>

                                <p className="mt-1 text-sm text-slate-400">
                                  {lang === 'bn'
                                    ? item.lesson.summaryBn
                                    : item.lesson.summaryEn}
                                </p>

                                {!item.prerequisitesMet &&
                                  item.unmetPrerequisiteTitlesEn.length > 0 && (
                                    <p className="mt-2 text-xs text-amber-300/90">
                                      {lang === 'bn'
                                        ? `প্রস্তাবিত পূর্বশর্ত: ${item.unmetPrerequisiteTitlesBn.join(', ')}`
                                        : `Recommended prerequisite: ${item.unmetPrerequisiteTitlesEn.join(', ')}`}
                                    </p>
                                  )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 pl-12 sm:pl-0">
                              <button
                                type="button"
                                onClick={() => handleToggleBookmark(item.lesson.id)}
                                aria-pressed={item.isBookmarked}
                                aria-label={
                                  item.isBookmarked
                                    ? `Remove bookmark for ${item.lesson.titleEn}`
                                    : `Bookmark ${item.lesson.titleEn}`
                                }
                                className={`rounded-xl border p-2.5 transition-colors cursor-pointer ${
                                  item.isBookmarked
                                    ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                                    : 'border-slate-700 bg-[#05091F] text-slate-400 hover:text-white'
                                }`}
                              >
                                <Bookmark
                                  className={`h-4 w-4 ${item.isBookmarked ? 'fill-current' : ''}`}
                                  aria-hidden="true"
                                />
                              </button>

                              <Link
                                to={`/app/learn/${item.lesson.id}`}
                                onClick={handleStartClick}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                                  item.isCurrentFocus || item.hasDraft
                                    ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                                    : 'border border-slate-700 bg-[#05091F] text-slate-200 hover:border-[#00D9FF]/60 hover:text-white'
                                }`}
                              >
                                <span>
                                  {item.hasDraft
                                    ? lang === 'bn'
                                      ? 'চালিয়ে যান'
                                      : 'Resume'
                                    : item.isCompleted
                                      ? lang === 'bn'
                                        ? 'রিভিউ'
                                        : 'Review'
                                      : lang === 'bn'
                                        ? 'লেসন শুরু করুন'
                                        : 'Start Lesson'}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </LearnerShell>
  );
}
