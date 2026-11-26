import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SPACED_REPETITION_INTERVALS } from '../../domain/spacedRepetition';
import type {
  CurriculumLesson,
  LessonAttemptRecord,
  LessonMasteryRecord,
  SpacedRepetitionPreset,
} from '../../types/domain';

interface LessonMasteryStageProps {
  mastery: LessonMasteryRecord | null;
  latestAttempt: LessonAttemptRecord | null;
  allLessonAttempts: LessonAttemptRecord[];
  schedulePreset: SpacedRepetitionPreset;
  onChangePreset: (preset: SpacedRepetitionPreset) => Promise<void>;
  onPracticeAgain: () => void;
  courseId?: string;
  nextLesson?: CurriculumLesson | null;
}

const PRESET_OPTIONS: {
  id: SpacedRepetitionPreset;
  labelEn: string;
  labelBn: string;
}[] = [
  { id: 'intensive', labelEn: 'Intensive (1, 2, 4, 7, 14d)', labelBn: 'দ্রুত (১, ২, ৪, ৭, ১৪ দিন)' },
  { id: 'standard', labelEn: 'Standard (1, 3, 7, 14, 30d)', labelBn: 'স্বাভাবিক (১, ৩, ৭, ১৪, ৩০ দিন)' },
  { id: 'relaxed', labelEn: 'Relaxed (2, 5, 10, 21, 45d)', labelBn: 'সহজ (২, ৫, ১০, ২১, ৪৫ দিন)' },
];

export function LessonMasteryStage({
  mastery,
  latestAttempt,
  allLessonAttempts,
  schedulePreset,
  onChangePreset,
  onPracticeAgain,
  courseId,
  nextLesson,
}: LessonMasteryStageProps) {
  const { lang } = useLanguage();

  const statusLabel = (status: LessonMasteryRecord['status']) => {
    const map: Record<LessonMasteryRecord['status'], { en: string; bn: string }> = {
      not_started: { en: 'Not Started', bn: 'শুরু হয়নি' },
      needs_review: { en: 'Needs Reinforcement', bn: 'পুনরায় অনুশীলন প্রয়োজন' },
      initial_acquisition: {
        en: 'Initial Acquisition (1st Pass)',
        bn: 'প্রাথমিক আয়ত্ত (১ম ধাপ)',
      },
      reinforced: { en: 'Reinforced (2nd Pass)', bn: 'দৃঢ় হচ্ছে (২য় ধাপ)' },
      consolidating: { en: 'Consolidating (3rd Pass)', bn: 'স্থায়ী হচ্ছে (৩য় ধাপ)' },
      mastered: { en: 'Verified Mastery', bn: 'প্রমাণিত দক্ষতা (মাস্টার্ড)' },
    };
    return lang === 'bn' ? map[status].bn : map[status].en;
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  if (!mastery || !latestAttempt) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-6 text-sm text-slate-400">
        {lang === 'bn'
          ? 'মাস্টারি এবং স্পেসড রিপিটিশন সূচি দেখতে ধাপ ৬-এর মূল্যায়ন সম্পন্ন করুন।'
          : 'Complete Stage 6 (Graded Assessment) to calculate honest mastery and schedule your next spaced review.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <p className="text-xs font-semibold text-[#3B82F6]">
          {lang === 'bn'
            ? 'মাস্টারি ও স্পেসড রিপিটিশন সূচি'
            : 'Mastery & Spaced Repetition Schedule'}
        </p>
        <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
          {statusLabel(mastery.status)}
        </h2>
      </div>

      {/* Honest Single-Attempt Mastery Policy Notice */}
      {mastery.attemptCount < 4 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-4 text-xs leading-relaxed text-amber-200 sm:text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <span>
            {lang === 'bn'
              ? 'সৎ মাস্টারি নীতি: মাত্র একবার লেসন শেষ করেই কখনো ১০০% মাস্টারি দেওয়া হয় না। দীর্ঘমেয়াদি স্মৃতি ও ব্যবহার নিশ্চিত করতে নির্ধারিত বিরতিতে পুনরায় অনুশীলন সম্পন্ন করলে মাস্টারি ৪৫% → ৭০% → ৮৮% → ১০০% পর্যন্ত বাড়ে।'
              : 'Honest Mastery Policy: A single attempt never grants 100% mastery. Long-term retention is proven across spaced reviews (45% → 70% → 88% → 100% across verified passes).'}
          </span>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'প্রমাণিত মাস্টারি' : 'Verified Mastery'}
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-[#3B82F6] tabular-nums">
            {mastery.masteryPercent}%
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-[#3B82F6]"
              style={{ width: `${mastery.masteryPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'এই প্রচেষ্টার নির্ভুলতা' : 'Attempt Accuracy'}
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
            {latestAttempt.overallAccuracyPercent}%
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
            {lang === 'bn' ? `চেষ্টা #${mastery.attemptCount}` : `Attempt #${mastery.attemptCount}`}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'পরবর্তী রিভিউ তারিখ' : 'Next Review Date'}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-white">
            <CalendarClock className="h-4 w-4 shrink-0 text-[#8B5CF6]" aria-hidden="true" />
            <span>{formatDate(mastery.nextReviewAt)}</span>
          </p>
          <p className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
            {lang === 'bn'
              ? `${mastery.reviewIntervalDays} দিন পর`
              : `In ${mastery.reviewIntervalDays} day${mastery.reviewIntervalDays === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'Mistake Memory-তে যুক্ত' : 'Mistakes Logged'}
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
            {latestAttempt.mistakesLoggedCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn' ? 'এই সেশনে' : 'this attempt'}
          </p>
        </div>
      </div>

      {/* Configurable Spaced Repetition Interval Selector */}
      <div className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5">
        <p className="text-xs font-semibold text-slate-300">
          {lang === 'bn'
            ? 'কনফিগারযোগ্য স্পেসড রিপিটিশন ব্যবধান (Spaced Repetition Interval)'
            : 'Configurable Spaced Repetition Cadence'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {lang === 'bn'
            ? 'আপনার পছন্দ অনুযায়ী রিভিউ বিরতি পরিবর্তন করলে পরবর্তী রিভিউ তারিখ সাথে সাথেই আপডেট হবে।'
            : 'Choose your review interval cadence — changing it recalculates your scheduled review date immediately.'}
        </p>

        <div
          role="group"
          aria-label="Spaced repetition cadence"
          className="mt-3 flex flex-wrap gap-2"
        >
          {PRESET_OPTIONS.map((opt) => {
            const active = schedulePreset === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChangePreset(opt.id)}
                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-white'
                    : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700'
                }`}
              >
                {lang === 'bn' ? opt.labelBn : opt.labelEn}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 font-mono text-[11px] text-slate-500 tabular-nums">
          Intervals ({schedulePreset}):{' '}
          {SPACED_REPETITION_INTERVALS[schedulePreset].map((d) => `${d}d`).join(' → ')}
        </p>
      </div>

      {/* Attempt History Ledger */}
      <div className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5">
        <h3 className="text-sm font-bold text-white">
          {lang === 'bn' ? 'প্রচেষ্টার ইতিহাস (Attempt History)' : 'Recorded Lesson Attempt History'}
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">
                  {lang === 'bn' ? 'সময়' : 'Completed'}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {lang === 'bn' ? 'নির্দেশিত' : 'Guided'}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {lang === 'bn' ? 'স্বাধীন' : 'Independent'}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {lang === 'bn' ? 'মূল্যায়ন' : 'Assessment'}
                </th>
                <th className="py-2 text-right font-medium">
                  {lang === 'bn' ? 'নির্ভুলতা' : 'Accuracy'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
              {allLessonAttempts.map((att, idx) => (
                <tr key={att.id} className="text-slate-200">
                  <td className="py-2.5 pr-4 text-slate-500">0{idx + 1}</td>
                  <td className="py-2.5 pr-4 font-sans">{formatDate(att.completedAt)}</td>
                  <td className="py-2.5 pr-4">
                    {att.guidedCorrect}/{att.guidedTotal}
                  </td>
                  <td className="py-2.5 pr-4">
                    {att.independentCorrect}/{att.independentTotal}
                  </td>
                  <td className="py-2.5 pr-4">
                    {att.assessmentCorrect}/{att.assessmentTotal}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-white">
                    {att.overallAccuracyPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Next Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPracticeAgain}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>{lang === 'bn' ? 'পুনরায় অনুশীলন করুন' : 'Practice Again'}</span>
          </button>

          {latestAttempt.mistakesLoggedCount > 0 && (
            <Link
              to="/app/improve"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#8B5CF6]/50 bg-[#8B5CF6]/10 px-4 py-2.5 text-sm font-semibold text-violet-200 hover:bg-[#8B5CF6]/20 transition-colors"
            >
              <span>
                {lang === 'bn'
                  ? 'Mistake Memory দেখুন'
                  : 'Inspect Logged Mistakes'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {courseId && (
            <Link
              to={`/app/learn/course/${courseId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#05091F] px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-[#00D9FF]/60 hover:text-white transition-colors"
            >
              <span>{lang === 'bn' ? 'কোর্স কারিকুলাম' : 'Course Outline'}</span>
            </Link>
          )}

          {nextLesson ? (
            <Link
              to={`/app/learn/${nextLesson.id}`}
              className="lv-portal-btn inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <span>
                {lang === 'bn'
                  ? `পরবর্তী লেসন: ${nextLesson.titleBn}`
                  : `Next Lesson: ${nextLesson.titleEn}`}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              to="/app/learn"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors"
            >
              <span>{lang === 'bn' ? 'একাডেমিতে ফিরে যান' : 'Return to Academy'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
