import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAllCourses, getAllLessons } from '../../domain/curriculumData';
import { isReviewDue } from '../../domain/spacedRepetition';
import type { LessonMasteryRecord, SpacedRepetitionPreset } from '../../types/domain';

type AcademyFilter = 'all' | 'Pre-A1 – A2' | 'A2 – B1' | 'B1 – B2' | 'due';

const PRESET_LABELS: Record<SpacedRepetitionPreset, { en: string; bn: string }> = {
  intensive: { en: 'Intensive (1–14d)', bn: 'দ্রুত (১–১৪ দিন)' },
  standard: { en: 'Standard (1–30d)', bn: 'স্বাভাবিক (১–৩০ দিন)' },
  relaxed: { en: 'Relaxed (2–45d)', bn: 'সহজ (২–৪৫ দিন)' },
};

export function AcademyPage() {
  const { lang, t } = useLanguage();
  const {
    profile,
    latestDiagnostic,
    lessonAttempts,
    lessonMastery,
    activitySummary,
    updateProfile,
  } = useAuth();

  const [filter, setFilter] = useState<AcademyFilter>('all');
  const [updatingPreset, setUpdatingPreset] = useState(false);

  const allCourses = useMemo(() => getAllCourses(), []);
  const allLessons = useMemo(() => getAllLessons(), []);
  const currentPreset: SpacedRepetitionPreset =
    profile?.spacedRepetitionPreset ?? 'standard';

  const dueCount = useMemo(
    () =>
      allLessons.filter((lesson) => isReviewDue(lessonMastery[lesson.id] ?? null)).length,
    [allLessons, lessonMastery]
  );

  const handlePresetChange = async (preset: SpacedRepetitionPreset) => {
    setUpdatingPreset(true);
    try {
      await updateProfile({ spacedRepetitionPreset: preset });
    } finally {
      setUpdatingPreset(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  const getStatusLabel = (mastery: LessonMasteryRecord | null) => {
    if (!mastery) return lang === 'bn' ? 'শুরু হয়নি' : 'Not Started';
    const labels: Record<LessonMasteryRecord['status'], { en: string; bn: string }> = {
      not_started: { en: 'Not Started', bn: 'শুরু হয়নি' },
      needs_review: { en: 'Needs Reinforcement', bn: 'পুনরায় অনুশীলন প্রয়োজন' },
      initial_acquisition: { en: 'Initial Acquisition', bn: 'প্রাথমিক আয়ত্ত' },
      reinforced: { en: 'Reinforced', bn: 'দৃঢ় হচ্ছে' },
      consolidating: { en: 'Consolidating', bn: 'স্থায়ী হচ্ছে' },
      mastered: { en: 'Verified Mastery', bn: 'প্রমাণিত দক্ষতা' },
    };
    return lang === 'bn' ? labels[mastery.status].bn : labels[mastery.status].en;
  };

  const filteredCourses = useMemo(() => {
    return allCourses.map((course) => {
      if (filter !== 'all' && filter !== 'due' && course.cefrRange !== filter) {
        return null;
      }

      const modules = course.modules
        .map((mod) => {
          const lessons =
            filter === 'due'
              ? mod.lessons.filter((l) => isReviewDue(lessonMastery[l.id] ?? null))
              : mod.lessons;
          return lessons.length > 0 ? { ...mod, lessons } : null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      return modules.length > 0 ? { ...course, modules } : null;
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [allCourses, filter, lessonMastery]);

  return (
    <LearnerShell
      title={t.workspace.modules.learnTitle}
      subtitle={
        lang === 'bn'
          ? 'Pre-A1 থেকে B2 পর্যন্ত কাঠামোগত ৭-ধাপের লেসন ও স্পেসড রিপিটিশন সূচি'
          : 'Structured Pre-A1 to B2 7-stage lessons tailored for Bangla speakers, backed by spaced repetition'
      }
    >
      {/* Honest Academy Telemetry Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'সম্পন্ন লেসন' : 'Lessons Completed'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {activitySummary.completedLessons} / {allLessons.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activitySummary.completedLessons === 0
              ? lang === 'bn'
                ? 'সৎ প্রাথমিক অবস্থা'
                : 'Honest starting state'
              : lang === 'bn'
                ? 'প্রমাণিত প্রচেষ্টা'
                : 'Evidence-backed'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'রিভিউয়ের জন্য নির্ধারিত' : 'Due for Review'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {dueCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {dueCount > 0
              ? lang === 'bn'
                ? 'স্পেসড রিভিউ বাকি'
                : 'Spaced review pending'
              : lang === 'bn'
                ? 'সব হালনাগাদ আছে'
                : 'None overdue'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'মোট লেসন প্রচেষ্টা' : 'Recorded Attempts'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {lessonAttempts.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn'
              ? `${activitySummary.totalPracticeMinutes} মিনিট নথিভুক্ত`
              : `${activitySummary.totalPracticeMinutes} min logged`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
          <label
            htmlFor="academy-srs-preset"
            className="block text-xs text-slate-400"
          >
            {lang === 'bn' ? 'রিপিটিশন ব্যবধান' : 'Review Cadence'}
          </label>
          <select
            id="academy-srs-preset"
            value={currentPreset}
            disabled={updatingPreset}
            onChange={(e) => handlePresetChange(e.target.value as SpacedRepetitionPreset)}
            className="mt-2 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-2.5 py-2 text-xs leading-normal font-semibold text-white focus:border-[#3B82F6] focus:outline-none"
          >
            {(Object.keys(PRESET_LABELS) as SpacedRepetitionPreset[]).map((key) => (
              <option key={key} value={key}>
                {lang === 'bn' ? PRESET_LABELS[key].bn : PRESET_LABELS[key].en}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {lang === 'bn' ? 'মাস্টারি সূচি নির্ধারক' : 'Controls next review dates'}
          </p>
        </div>
      </div>

      {/* Diagnostic Recommended Track Banner (only when diagnostic actually taken) */}
      {latestDiagnostic && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#3B82F6]/35 bg-[#111827] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#3B82F6]">
              {lang === 'bn'
                ? 'ডায়াগনস্টিক-ভিত্তিক প্রস্তাবিত ট্র্যাক'
                : 'Diagnostic-Recommended Starting Track'}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {lang === 'bn'
                ? latestDiagnostic.recommendedTrackBn
                : latestDiagnostic.recommendedTrackEn}
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
            {lang === 'bn'
              ? `বেসলাইন: ${latestDiagnostic.totalCorrect}/${latestDiagnostic.totalQuestions}`
              : `Baseline: ${latestDiagnostic.totalCorrect}/${latestDiagnostic.totalQuestions}`}
          </span>
        </div>
      )}

      {/* Course Filter Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter curriculum courses"
          className="flex flex-wrap items-center gap-2"
        >
          {(
            [
              {
                id: 'all',
                en: `All Courses (${allCourses.length})`,
                bn: `সব কোর্স (${allCourses.length})`,
              },
              { id: 'Pre-A1 – A2', en: 'Pre-A1 – A2', bn: 'Pre-A1 – A2' },
              { id: 'A2 – B1', en: 'A2 – B1', bn: 'A2 – B1' },
              { id: 'B1 – B2', en: 'B1 – B2', bn: 'B1 – B2' },
              {
                id: 'due',
                en: `Due for Review (${dueCount})`,
                bn: `রিভিউ বাকি (${dueCount})`,
              },
            ] as { id: AcademyFilter; en: string; bn: string }[]
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                    : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {lang === 'bn' ? tab.bn : tab.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Courses & Modules List */}
      <div className="mt-6 space-y-6">
        {filteredCourses.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
            <p className="text-sm font-semibold text-white">
              {lang === 'bn'
                ? 'এই মুহূর্তে কোনো রিভিউ বাকি নেই'
                : 'No lessons are currently due for spaced review'}
            </p>
            <p className="mt-1.5 text-sm text-slate-400">
              {lang === 'bn'
                ? 'সব কোর্স দেখে নতুন একটি লেসন শুরু করুন অথবা পূর্বের কোনো লেসন পুনরায় অনুশীলন করুন।'
                : 'Switch back to All Courses to start a new lesson or reinforce an existing topic.'}
            </p>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-4 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
            >
              {lang === 'bn' ? 'সব কোর্স দেখুন' : 'Show All Courses'}
            </button>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const courseLessons = course.modules.flatMap((m) => m.lessons);
            const completedInCourse = courseLessons.filter(
              (l) => Boolean(lessonMastery[l.id])
            ).length;

            return (
              <section
                key={course.id}
                className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6"
              >
                {/* Course Header */}
                <div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#3B82F6]">
                        {lang === 'bn' ? `কোর্স ০${course.order}` : `Course 0${course.order}`}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="font-mono text-slate-300">{course.cefrRange}</span>
                    </div>
                    <h2 className="mt-1.5 text-lg font-bold text-white sm:text-xl">
                      {lang === 'bn' ? course.titleBn : course.titleEn}
                    </h2>
                    <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">
                      {lang === 'bn' ? course.subtitleBn : course.subtitleEn}
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="font-mono text-sm font-bold text-white tabular-nums">
                      {completedInCourse} / {courseLessons.length}
                    </p>
                    <p className="text-xs text-slate-400">
                      {lang === 'bn' ? 'লেসন অনুশীলনকৃত' : 'lessons practiced'}
                    </p>
                  </div>
                </div>

                {/* Modules & Lessons */}
                <div className="mt-5 space-y-5">
                  {course.modules.map((mod) => (
                    <div key={mod.id}>
                      <div className="mb-3 flex items-start gap-2">
                        <GraduationCap
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5CF6]"
                          aria-hidden="true"
                        />
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">
                            {lang === 'bn' ? mod.titleBn : mod.titleEn}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {lang === 'bn' ? mod.descriptionBn : mod.descriptionEn}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {mod.lessons.map((lesson) => {
                          const mastery = lessonMastery[lesson.id] ?? null;
                          const due = isReviewDue(mastery);

                          return (
                            <article
                              key={lesson.id}
                              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0A0F1C] p-5 transition-colors hover:border-slate-700"
                            >
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className="font-mono text-slate-400 tabular-nums">
                                    {lesson.cefrBand} ·{' '}
                                    <Clock
                                      className="inline h-3 w-3 align-[-2px] text-slate-500"
                                      aria-hidden="true"
                                    />{' '}
                                    {lesson.estimatedMinutes}m
                                  </span>
                                  <span
                                    className={`font-mono text-xs font-semibold tabular-nums ${
                                      due
                                        ? 'text-[#F59E0B]'
                                        : mastery
                                          ? 'text-[#3B82F6]'
                                          : 'text-slate-500'
                                    }`}
                                  >
                                    {mastery
                                      ? `${mastery.masteryPercent}% · ${getStatusLabel(mastery)}`
                                      : getStatusLabel(null)}
                                  </span>
                                </div>

                                <h4 className="mt-2.5 text-base font-bold text-white">
                                  {lang === 'bn' ? lesson.titleBn : lesson.titleEn}
                                </h4>
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                                  {lang === 'bn' ? lesson.summaryBn : lesson.summaryEn}
                                </p>

                                <p className="mt-3 text-[11px] text-slate-500">
                                  {lesson.targetCategories.join(' · ')}
                                </p>
                              </div>

                              <div className="mt-4 border-t border-slate-800/80 pt-4">
                                {/* Honest Mastery Bar + Next Review Date */}
                                {mastery ? (
                                  <div className="mb-3 space-y-1.5">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                      <div
                                        className="h-full bg-[#3B82F6]"
                                        style={{ width: `${mastery.masteryPercent}%` }}
                                      />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
                                      <span className="font-mono tabular-nums">
                                        {lang === 'bn'
                                          ? `${mastery.attemptCount} বার অনুশীলন · সর্বশেষ ${mastery.lastAccuracyPercent}%`
                                          : `${mastery.attemptCount} attempt${mastery.attemptCount === 1 ? '' : 's'} · Last ${mastery.lastAccuracyPercent}%`}
                                      </span>
                                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                                        <CalendarClock
                                          className="h-3 w-3 shrink-0 text-[#8B5CF6]"
                                          aria-hidden="true"
                                        />
                                        {due
                                          ? lang === 'bn'
                                            ? 'রিভিউ এখন বাকি'
                                            : 'Review due'
                                          : lang === 'bn'
                                            ? `পরবর্তী: ${formatDate(mastery.nextReviewAt)}`
                                            : `Next: ${formatDate(mastery.nextReviewAt)}`}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mb-3 font-mono text-[11px] text-slate-500 tabular-nums">
                                    {lang === 'bn'
                                      ? '০ বার চেষ্টা · ৭টি ধাপ (অডিও + মূল্যায়ন)'
                                      : '0 attempts · 7-stage interactive lesson'}
                                  </p>
                                )}

                                <Link
                                  to={`/app/learn/${lesson.id}`}
                                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
                                    due
                                      ? 'bg-[#F59E0B] text-[#0A0F1C] hover:bg-amber-400'
                                      : mastery?.status === 'mastered'
                                        ? 'border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40'
                                        : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                                  }`}
                                >
                                  {mastery?.status === 'mastered' && (
                                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  <span>
                                    {due
                                      ? lang === 'bn'
                                        ? 'স্পেসড রিভিউ শুরু করুন'
                                        : 'Start Spaced Review'
                                      : mastery
                                        ? lang === 'bn'
                                          ? 'পুনরায় অনুশীলন করুন'
                                          : 'Practice Lesson Again'
                                        : lang === 'bn'
                                          ? 'লেসন শুরু করুন'
                                          : 'Start Lesson'}
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </Link>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </LearnerShell>
  );
}
