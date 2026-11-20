import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type {
  CategoryRecurrencePoint,
  DailyPracticePoint,
  LessonCompletionPoint,
  SpacedRetentionPoint,
} from '../../domain/personalIntelligenceEngine';

interface IntelligenceChartsProps {
  dailyGoalMinutes: number;
  weeklyPractice: {
    points: DailyPracticePoint[];
    totalMinutes: number;
    hasData: boolean;
  };
  lessonCompletions: {
    points: LessonCompletionPoint[];
    totalAttemptedLessons: number;
    hasData: boolean;
  };
  mistakeRecurrence: {
    points: CategoryRecurrencePoint[];
    overallRecurrenceRatePercent: number | null;
    totalActive: number;
    totalPracticing: number;
    totalResolved: number;
    hasData: boolean;
  };
  spacedRetention: {
    points: SpacedRetentionPoint[];
    dueNowCount: number;
    averageRetentionPercent: number | null;
    hasData: boolean;
  };
}

function ChartEmptyState({
  titleEn,
  titleBn,
  stepEn,
  stepBn,
  ctaEn,
  ctaBn,
  to,
  lang,
}: {
  titleEn: string;
  titleBn: string;
  stepEn: string;
  stepBn: string;
  ctaEn: string;
  ctaBn: string;
  to: string;
  lang: 'en' | 'bn';
}) {
  return (
    <div className="mt-4 flex flex-col justify-between rounded-lg border border-dashed border-slate-800 bg-[#0A0F1C] p-5 min-h-[190px]">
      <div>
        <p className="font-mono text-xs text-slate-500">
          {lang === 'bn' ? 'এখনো ০টি ডেটা পয়েন্ট' : '0 data points recorded'}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-slate-200">
          {lang === 'bn' ? titleBn : titleEn}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {lang === 'bn' ? stepBn : stepEn}
        </p>
      </div>
      <div className="mt-4">
        <Link
          to={to}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
        >
          <span>{lang === 'bn' ? ctaBn : ctaEn}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function IntelligenceCharts({
  dailyGoalMinutes,
  weeklyPractice,
  lessonCompletions,
  mistakeRecurrence,
  spacedRetention,
}: IntelligenceChartsProps) {
  const { lang } = useLanguage();

  const maxWeeklyMinutes = Math.max(
    dailyGoalMinutes,
    ...weeklyPractice.points.map((p) => p.minutes),
    10
  );

  const maxCategoryOccurrences = Math.max(
    ...mistakeRecurrence.points.map((p) => p.totalOccurrences),
    1
  );

  return (
    <section aria-label="Personal Intelligence Analytics" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Chart 1: Weekly Practice Minutes (7-day rolling SVG Bar Chart) */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'bn' ? 'সাপ্তাহিক অনুশীলনের মিনিট' : 'Weekly Practice Minutes'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {lang === 'bn'
                ? `গত ৭ দিন · দৈনিক লক্ষ্য ${dailyGoalMinutes} মিনিট`
                : `Rolling 7 days · Daily goal ${dailyGoalMinutes} min`}
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-[#3B82F6] tabular-nums">
            {weeklyPractice.totalMinutes} {lang === 'bn' ? 'মিনিট' : 'min'}
          </span>
        </div>

        {!weeklyPractice.hasData ? (
          <ChartEmptyState
            lang={lang}
            titleEn="No practice minutes logged in the last 7 days"
            titleBn="গত ৭ দিনে কোনো অনুশীলনের মিনিট রেকর্ড হয়নি"
            stepEn="Complete an Academy lesson, a Speaking Studio turn, or a Mistake Memory drill to plot your real daily minutes."
            stepBn="আপনার দৈনিক অনুশীলনের সময় দেখতে একটি একাডেমি লেসন, স্পিকিং স্টুডিও সেশন বা মিস্টেক ড্রিল সম্পন্ন করুন।"
            ctaEn="Start Speaking or Academy Practice"
            ctaBn="অনুশীলন শুরু করুন"
            to="/app/speak"
          />
        ) : (
          <div className="mt-4">
            <svg
              viewBox="0 0 360 185"
              role="img"
              aria-label="Weekly practice minutes bar chart"
              className="h-48 w-full"
            >
              {/* Daily Goal Horizontal Reference Line */}
              {(() => {
                const chartHeight = 128;
                const topPad = 18;
                const goalY =
                  topPad + chartHeight - (dailyGoalMinutes / maxWeeklyMinutes) * chartHeight;
                return (
                  <g>
                    <line
                      x1="12"
                      x2="348"
                      y1={goalY}
                      y2={goalY}
                      stroke="#F59E0B"
                      strokeOpacity="0.45"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x="346"
                      y={Math.max(12, goalY - 4)}
                      textAnchor="end"
                      fill="#F59E0B"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {lang === 'bn' ? `লক্ষ্য ${dailyGoalMinutes}মি` : `Goal ${dailyGoalMinutes}m`}
                    </text>
                  </g>
                );
              })()}

              {/* Baseline */}
              <line x1="12" x2="348" y1="146" y2="146" stroke="#1E293B" strokeWidth="1" />

              {weeklyPractice.points.map((pt, idx) => {
                const slotWidth = 336 / 7;
                const barWidth = 28;
                const x = 12 + idx * slotWidth + (slotWidth - barWidth) / 2;
                const barHeight =
                  pt.minutes > 0 ? Math.max(6, (pt.minutes / maxWeeklyMinutes) * 128) : 2;
                const y = 146 - barHeight;
                const hitGoal = pt.minutes >= dailyGoalMinutes;

                return (
                  <g key={pt.dateKey}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill={pt.minutes === 0 ? '#1E293B' : hitGoal ? '#10B981' : '#3B82F6'}
                    >
                      <title>{`${pt.dateKey}: ${pt.minutes} min (${pt.sessionsCount} activities)`}</title>
                    </rect>
                    {pt.minutes > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        textAnchor="middle"
                        fill="#CBD5E1"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {pt.minutes}m
                      </text>
                    )}
                    <text
                      x={x + barWidth / 2}
                      y="165"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="10"
                    >
                      {lang === 'bn' ? pt.labelBn : pt.labelEn}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Chart 2: Lesson Completions & Verified Mastery (SVG Grouped Bars) */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'bn' ? 'লেসন সম্পন্ন ও প্রমাণিত মাস্টারি' : 'Lesson Completions & Mastery'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {lang === 'bn'
                ? 'সর্বশেষ নির্ভুলতা (নীল) বনাম প্রমাণিত মাস্টারি (বেগুনি)'
                : 'Last Accuracy (Blue) vs. Verified Mastery (Violet)'}
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-[#8B5CF6] tabular-nums">
            {lessonCompletions.totalAttemptedLessons}{' '}
            {lang === 'bn'
              ? 'টি লেসন'
              : lessonCompletions.totalAttemptedLessons === 1
                ? 'lesson'
                : 'lessons'}
          </span>
        </div>

        {!lessonCompletions.hasData ? (
          <ChartEmptyState
            lang={lang}
            titleEn="No Academy lessons completed yet"
            titleBn="এখনো কোনো একাডেমি লেসন সম্পন্ন হয়নি"
            stepEn="Finish any 7-stage lesson in The Academy to compare your attempt accuracy against verified spaced-repetition mastery."
            stepBn="আপনার নির্ভুলতা ও প্রমাণিত মাস্টারি দেখতে একাডেমির যেকোনো একটি ৭-ধাপের লেসন সম্পন্ন করুন।"
            ctaEn="Open The Academy"
            ctaBn="একাডেমিতে যান"
            to="/app/learn"
          />
        ) : (
          <div className="mt-4">
            <svg
              viewBox="0 0 360 185"
              role="img"
              aria-label="Lesson completions accuracy and mastery chart"
              className="h-48 w-full"
            >
              {[100, 50].map((tick) => {
                const y = 146 - (tick / 100) * 124;
                return (
                  <g key={tick}>
                    <line
                      x1="28"
                      x2="348"
                      y1={y}
                      y2={y}
                      stroke="#1E293B"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x="24"
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748B"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}
              <line x1="28" x2="348" y1="146" y2="146" stroke="#334155" strokeWidth="1" />

              {lessonCompletions.points.slice(0, 6).map((pt, idx) => {
                const visibleCount = Math.min(lessonCompletions.points.length, 6);
                const slotWidth = 316 / Math.max(visibleCount, 1);
                const groupWidth = Math.min(44, slotWidth - 10);
                const barW = Math.max(10, Math.floor((groupWidth - 4) / 2));
                const centerX = 30 + idx * slotWidth + slotWidth / 2;
                const accH = Math.max(4, (pt.lastAccuracyPercent / 100) * 124);
                const mastH = Math.max(4, (pt.masteryPercent / 100) * 124);

                return (
                  <g key={pt.lessonId}>
                    <rect
                      x={centerX - barW - 2}
                      y={146 - accH}
                      width={barW}
                      height={accH}
                      rx="3"
                      fill="#3B82F6"
                    >
                      <title>{`${pt.titleEn}: Last accuracy ${pt.lastAccuracyPercent}% (${pt.attempts} attempt(s))`}</title>
                    </rect>
                    <rect
                      x={centerX + 2}
                      y={146 - mastH}
                      width={barW}
                      height={mastH}
                      rx="3"
                      fill="#8B5CF6"
                    >
                      <title>{`${pt.titleEn}: Verified mastery ${pt.masteryPercent}%`}</title>
                    </rect>
                    <text
                      x={centerX}
                      y="164"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {pt.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
              {lessonCompletions.points.slice(0, 6).map((pt) => (
                <span key={pt.lessonId} className="truncate max-w-[200px]">
                  <strong className="font-mono text-slate-300">{pt.shortLabel}:</strong>{' '}
                  {lang === 'bn' ? pt.titleBn : pt.titleEn}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chart 3: Mistake Recurrence Rate by Category */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'bn' ? 'ভুলের পুনরাবৃত্তির হার' : 'Mistake Recurrence Rate'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {lang === 'bn'
                ? 'ক্যাটাগরি অনুযায়ী পুনরাবৃত্তি · সক্রিয় বনাম অনুশীলনরত বনাম সমাধানকৃত'
                : 'Occurrences by category · Active vs. Practicing vs. Resolved'}
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-[#F59E0B] tabular-nums">
            {mistakeRecurrence.overallRecurrenceRatePercent !== null
              ? `${mistakeRecurrence.overallRecurrenceRatePercent}% ${lang === 'bn' ? 'পুনরাবৃত্ত' : 'recurring'}`
              : '—'}
          </span>
        </div>

        {!mistakeRecurrence.hasData ? (
          <ChartEmptyState
            lang={lang}
            titleEn="No recurring mistake patterns recorded yet"
            titleBn="এখনো কোনো পুনরাবৃত্ত ভুল রেকর্ড হয়নি"
            stepEn="Speak in AI Speaking Studio or complete an Academy exercise so Mistake Memory can track which categories repeat most."
            stepBn="কোন ধরনের ভুল বেশি পুনরাবৃত্তি হচ্ছে তা দেখতে AI স্পিকিং স্টুডিও বা একাডেমি অনুশীলন সম্পন্ন করুন।"
            ctaEn="Open Mistake Memory"
            ctaBn="Mistake Memory দেখুন"
            to="/app/improve"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {mistakeRecurrence.points.map((pt) => {
              const widthPct = Math.max(
                8,
                Math.round((pt.totalOccurrences / maxCategoryOccurrences) * 100)
              );
              return (
                <div key={pt.category} className="space-y-1">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2 text-xs">
                    <span className="font-medium text-slate-200">
                      {lang === 'bn' ? pt.labelBn : pt.labelEn}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {pt.totalOccurrences}x · {pt.activeCount}{' '}
                      {lang === 'bn' ? 'সক্রিয়' : 'active'} / {pt.practicingCount}{' '}
                      {lang === 'bn' ? 'অনুশীলন' : 'practicing'} / {pt.resolvedCount}{' '}
                      {lang === 'bn' ? 'সমাধান' : 'resolved'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0A0F1C]">
                    <div
                      className="flex h-full overflow-hidden rounded-full"
                      style={{ width: `${widthPct}%` }}
                    >
                      {pt.activeCount > 0 && (
                        <div
                          className="h-full bg-rose-500"
                          style={{
                            flexGrow: pt.activeCount,
                          }}
                        />
                      )}
                      {pt.practicingCount > 0 && (
                        <div
                          className="h-full bg-[#F59E0B]"
                          style={{
                            flexGrow: pt.practicingCount,
                          }}
                        />
                      )}
                      {pt.resolvedCount > 0 && (
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            flexGrow: pt.resolvedCount,
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart 4: Spaced Repetition Retention */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'bn' ? 'স্পেসড রিপিটিশন রিটেনশন' : 'Spaced Repetition Retention'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {lang === 'bn'
                ? 'লেসন মাস্টারি ও ভুল সংশোধন ড্রিলের স্মৃতি-ধরে-রাখা অগ্রগতি'
                : 'Verified retention across scheduled lessons and mistake retests'}
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
            {spacedRetention.averageRetentionPercent !== null
              ? `${spacedRetention.averageRetentionPercent}% ${lang === 'bn' ? 'গড়' : 'avg'}`
              : '—'}
          </span>
        </div>

        {!spacedRetention.hasData ? (
          <ChartEmptyState
            lang={lang}
            titleEn="No spaced repetition schedules created yet"
            titleBn="এখনো কোনো স্পেসড রিভিউ সূচি তৈরি হয়নি"
            stepEn="Complete an Academy lesson or pass a Mistake Memory Fix Drill to activate your personalized retention schedule."
            stepBn="আপনার ব্যক্তিগত রিটেনশন সূচি চালু করতে একটি একাডেমি লেসন বা মিস্টেক ফিক্স ড্রিল সম্পন্ন করুন।"
            ctaEn="Start First Lesson or Drill"
            ctaBn="লেসন শুরু করুন"
            to="/app/learn"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {spacedRetention.points.map((pt) => (
              <div key={pt.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-slate-200">
                    {lang === 'bn' ? pt.labelBn : pt.labelEn}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums shrink-0">
                    <span className={pt.isDueNow ? 'font-semibold text-[#F59E0B]' : 'text-slate-400'}>
                      {pt.isDueNow
                        ? lang === 'bn'
                          ? 'এখন রিভিউ বাকি'
                          : 'Due now'
                        : lang === 'bn'
                          ? `${pt.intervalDays} দিন পর`
                          : `${pt.intervalDays}d interval`}
                    </span>
                    <span className="ml-2 font-semibold text-white">{pt.retentionPercent}%</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#0A0F1C]">
                  <div
                    className={`h-full rounded-full ${
                      pt.retentionPercent >= 80
                        ? 'bg-emerald-500'
                        : pt.retentionPercent >= 45
                          ? 'bg-[#3B82F6]'
                          : 'bg-[#8B5CF6]'
                    }`}
                    style={{ width: `${pt.retentionPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
