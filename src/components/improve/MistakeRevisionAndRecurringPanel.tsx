import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Repeat2,
  Sparkles,
  Target,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  classifyExtendedMistakeCategory,
  getExtendedCategoryMeta,
  type SmartRevisionSchedule,
} from '../../domain/mistakeAnalyticsEngine';
import type { MistakeMemoryItem } from '../../types/domain';

interface MistakeRevisionAndRecurringPanelProps {
  schedule: SmartRevisionSchedule;
  onPracticeMistake: (mistakeId: string) => void;
  onGenerateAiExercise: (mistake: MistakeMemoryItem) => void;
}

export function MistakeRevisionAndRecurringPanel({
  schedule,
  onPracticeMistake,
  onGenerateAiExercise,
}: MistakeRevisionAndRecurringPanelProps) {
  const { lang } = useLanguage();

  const formatShortDate = (iso: string | null) => {
    if (!iso) return lang === 'bn' ? 'আজ' : 'Today';
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  const topRec = schedule.topRecommended;
  const topRecCat = topRec ? getExtendedCategoryMeta(topRec.category) : null;

  return (
    <section
      aria-label="Recurring mistakes and smart revision schedule"
      className="grid grid-cols-1 gap-6 xl:grid-cols-12"
    >
      {/* Left 7 Cols: Recurring Mistakes Spotlight */}
      <div
        data-testid="recurring-mistakes-panel"
        className="lv-glass-card rounded-2xl p-5 sm:p-6 xl:col-span-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
              <Repeat2 className="h-4 w-4 text-[#E42BFF]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'পুনরাবৃত্ত ভুল (Recurring)' : 'Recurring Mistakes'}</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {lang === 'bn'
                ? 'যে ভুলগুলো ২ বা তার বেশি বার ধরা পড়েছে — এগুলো ঠিক করলে দ্রুততম উন্নতি হবে'
                : 'Patterns observed 2+ times across your sessions — repairing these yields the fastest gains'}
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-fuchsia-300 tabular-nums">
            {schedule.recurringSpotlight.length}{' '}
            {lang === 'bn' ? 'টি শীর্ষ ধরন' : 'top patterns'}
          </span>
        </div>

        {schedule.recurringSpotlight.length === 0 ? (
          <div className="mt-5 rounded-xl border border-slate-800/80 bg-[#060C22]/80 p-5 text-center">
            <CheckCircle2
              className="mx-auto h-7 w-7 text-[#16E58B]/80"
              aria-hidden="true"
            />
            <p className="mt-2.5 text-sm font-semibold text-white">
              {lang === 'bn'
                ? 'এখনো কোনো পুনরাবৃত্ত ভুল শনাক্ত হয়নি'
                : 'No recurring mistake habits detected yet'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
              {lang === 'bn'
                ? 'কোনো নির্দিষ্ট ব্যাকরণ, শব্দভাণ্ডার বা বাক্য গঠনের ভুল ২ বারের বেশি ঘটলে সেটি স্বয়ংক্রিয়ভাবে এখানে অগ্রাধিকার তালিকায় আসবে।'
                : 'Whenever the same grammar, vocabulary, or sentence structure pattern recurs 2+ times, it surfaces here automatically.'}
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800/80">
            {schedule.recurringSpotlight.map((item) => {
              const cat = getExtendedCategoryMeta(classifyExtendedMistakeCategory(item));
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 py-3.5 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span
                        className="font-semibold"
                        style={{ color: cat.color }}
                      >
                        {lang === 'bn' ? cat.labelBn : cat.labelEn}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="font-mono font-bold text-[#E42BFF] tabular-nums">
                        {lang === 'bn'
                          ? `${item.occurrences} বার পুনরাবৃত্ত`
                          : `${item.occurrences}x repeated`}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span
                        className={
                          item.status === 'resolved'
                            ? 'text-emerald-400'
                            : item.status === 'practicing'
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }
                      >
                        {item.status === 'resolved'
                          ? lang === 'bn'
                            ? 'সমাধানকৃত'
                            : 'Resolved'
                          : item.status === 'practicing'
                            ? lang === 'bn'
                              ? 'অনুশীলনরত'
                              : 'Practicing'
                            : lang === 'bn'
                              ? 'সক্রিয়'
                              : 'Active'}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm font-semibold text-white">
                      {lang === 'bn' ? item.patternBn : item.patternEn}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      <span className="text-rose-300 line-through">{item.userExample}</span>
                      <span className="mx-1.5 text-slate-500">→</span>
                      <span className="font-medium text-emerald-300">
                        {item.correctedExample}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onGenerateAiExercise(item)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-cyan-400/35 bg-[#0A1640] px-2.5 py-1.5 text-xs font-semibold text-cyan-200 hover:border-cyan-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'AI ড্রিল' : 'AI Drill'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPracticeMistake(item.id)}
                      className="lv-portal-btn inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                    >
                      <span>{lang === 'bn' ? 'ঠিক করুন' : 'Fix Now'}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Right 5 Cols: Recommended Practice Card + Smart Revision Schedule */}
      <div className="flex flex-col gap-6 xl:col-span-5">
        {/* Recommended Next Practice Spotlight */}
        {topRec && topRecCat && (
          <div className="lv-glow-border-premium rounded-2xl">
            <div className="rounded-[15px] bg-[#08102D] p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00D9FF]">
                  <Flame className="h-3.5 w-3.5 text-[#E42BFF]" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? 'সর্বোচ্চ অগ্রাধিকার অনুশীলন' : 'Recommended Practice'}
                  </span>
                </p>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>~2 min</span>
                </span>
              </div>

              <h3 className="font-portal mt-2 text-base font-bold text-white">
                {lang === 'bn' ? topRec.mistake.patternBn : topRec.mistake.patternEn}
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                <span style={{ color: topRecCat.color }} className="font-semibold">
                  {lang === 'bn' ? topRecCat.labelBn : topRecCat.labelEn}
                </span>
                <span aria-hidden="true" className="mx-1.5 text-slate-600">
                  ·
                </span>
                <span className="font-mono tabular-nums">
                  {lang === 'bn'
                    ? `${topRec.mistake.occurrences} বার ধরা পড়েছে`
                    : `Observed ${topRec.mistake.occurrences}x`}
                </span>
              </p>

              <div className="mt-3 rounded-xl border border-slate-800 bg-[#050A21] px-3.5 py-2.5 text-xs">
                <p className="text-rose-300">{topRec.mistake.userExample}</p>
                <p className="mt-1 font-semibold text-emerald-300">
                  → {topRec.mistake.correctedExample}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onPracticeMistake(topRec.mistake.id)}
                  className="lv-glow-cta inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white whitespace-nowrap cursor-pointer"
                >
                  <Target className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? 'এখনই ২-ধাপের ড্রিল শুরু করুন' : 'Start 2-Step Repair Drill'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onGenerateAiExercise(topRec.mistake)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-cyan-400/35 bg-[#0C1844] px-3.5 py-2 text-xs font-semibold text-cyan-100 hover:border-cyan-300 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'নতুন AI চ্যালেঞ্জ' : 'Fresh AI Challenge'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Smart Spaced Revision Schedule */}
        <div
          data-testid="smart-revision-schedule"
          className="lv-glass-card flex-1 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
              <CalendarClock className="h-4 w-4 text-[#873BFF]" aria-hidden="true" />
              <span>
                {lang === 'bn' ? 'স্মার্ট রিভিশন সূচি' : 'Smart Revision Schedule'}
              </span>
            </h3>
            <span className="font-mono text-xs font-semibold text-[#00D9FF] tabular-nums">
              {schedule.dueNowTotal} {lang === 'bn' ? 'টি এখন বাকি' : 'due now'}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border border-rose-500/25 bg-[#060C22]/85 p-2.5">
              <dt className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Overdue'}
              </dt>
              <dd className="mt-1 font-mono text-lg font-extrabold text-rose-400 tabular-nums">
                {schedule.overdue.length}
              </dd>
            </div>
            <div className="rounded-xl border border-cyan-400/25 bg-[#060C22]/85 p-2.5">
              <dt className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'আজকের কিউ' : 'Due Today'}
              </dt>
              <dd className="mt-1 font-mono text-lg font-extrabold text-[#00D9FF] tabular-nums">
                {schedule.dueToday.length}
              </dd>
            </div>
            <div className="rounded-xl border border-violet-400/25 bg-[#060C22]/85 p-2.5">
              <dt className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'আগামী ৭ দিন' : 'Next 7 Days'}
              </dt>
              <dd className="mt-1 font-mono text-lg font-extrabold text-violet-300 tabular-nums">
                {schedule.upcomingWeek.length}
              </dd>
            </div>
          </dl>

          {/* Compact Next 3 Upcoming Check-ins */}
          {schedule.overdue.length + schedule.dueToday.length + schedule.upcomingWeek.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {[...schedule.overdue, ...schedule.dueToday, ...schedule.upcomingWeek]
                .slice(0, 3)
                .map((entry) => (
                  <li
                    key={entry.mistake.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#060C22]/75 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">
                        {lang === 'bn' ? entry.mistake.patternBn : entry.mistake.patternEn}
                      </p>
                      <p className="font-mono text-[10px] text-slate-400 tabular-nums">
                        {entry.bucket === 'overdue'
                          ? lang === 'bn'
                            ? 'অবিলম্বে রিভিউ প্রয়োজন'
                            : 'Overdue · Review now'
                          : entry.bucket === 'due_today'
                            ? lang === 'bn'
                              ? 'আজকের স্পেসড রিভিউ'
                              : 'Due today'
                            : `${lang === 'bn' ? 'রিভিউ' : 'Scheduled'}: ${formatShortDate(
                                entry.dueDateIso
                              )}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPracticeMistake(entry.mistake.id)}
                      className="shrink-0 rounded-lg border border-cyan-400/30 bg-[#0A1640] px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:border-cyan-300 hover:text-white cursor-pointer"
                    >
                      {lang === 'bn' ? 'রিভিউ' : 'Review'}
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-slate-400">
              {lang === 'bn'
                ? 'এই মুহূর্তে কোনো বকেয়া রিভিশন নেই। নতুন ভুল শনাক্ত হলে স্পেসড-রিপিটিশন সময়সূচি এখানে সাজানো থাকবে।'
                : 'No pending spaced reviews right now. Newly tracked patterns are automatically scheduled across 1, 3, and 7-day intervals.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
