import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Flame, Target, BookOpenCheck, Activity } from 'lucide-react';
import type { TodayLearningSummary } from '../../domain/dashboardIntelligence';

interface TodayCommandWidgetProps {
  summary: TodayLearningSummary;
  lang: 'en' | 'bn';
}

export function TodayCommandWidget({ summary, lang }: TodayCommandWidgetProps) {
  const prefersReduced = Boolean(useReducedMotion());
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (summary.goalProgressPercent / 100) * circumference;

  return (
    <section
      aria-labelledby="today-learning-heading"
      className="rounded-2xl border border-cyan-400/20 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.55)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#00D9FF]">
            {lang === 'bn' ? 'আজকের কমান্ড সেন্টার' : "Today's Command"}
          </p>
          <h3 id="today-learning-heading" className="font-portal mt-1 text-lg font-bold text-white">
            {lang === 'bn' ? 'আজ আপনার শেখার অবস্থা' : 'Your Learning Today'}
          </h3>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {summary.goalMetToday
            ? lang === 'bn'
              ? 'দৈনিক লক্ষ্য পূর্ণ'
              : 'Daily target reached'
            : lang === 'bn'
              ? `${summary.remainingMinutesToday} মি. বাকি`
              : `${summary.remainingMinutesToday} min remaining`}
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {/* Row 1: Animated Daily Learning Goal Ring + Spacious Copy */}
        <div className="flex items-center gap-5">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id={`${uid}-goal-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D9FF" />
                  <stop offset="55%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
              <circle
                cx="54"
                cy="54"
                r={radius}
                fill="none"
                stroke="rgba(148, 163, 184, 0.16)"
                strokeWidth="8"
              />
              {summary.goalProgressPercent > 0 && (
                <motion.circle
                  cx="54"
                  cy="54"
                  r={radius}
                  fill="none"
                  stroke={`url(#${uid}-goal-ring)`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={prefersReduced ? false : { strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-lg font-bold text-white tabular-nums">
                {summary.completedMinutesToday}
              </span>
              <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                / {summary.dailyGoalMinutes} {lang === 'bn' ? 'মি.' : 'min'}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                {lang === 'bn' ? 'দৈনিক শেখার লক্ষ্য' : 'Daily Learning Goal'}
              </p>
              <span className="font-mono text-xs font-semibold text-cyan-300 tabular-nums">
                {summary.goalProgressPercent}% {lang === 'bn' ? 'সম্পন্ন' : 'complete'}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              {summary.completedMinutesToday === 0
                ? lang === 'bn'
                  ? 'আজ এখনো কোনো অনুশীলন রেকর্ড হয়নি। প্রথম সেশন শুরু করলে অগ্রগতি এখানে আপডেট হবে।'
                  : 'No practice logged yet today. Your first completed lesson, drill, or speaking session updates this ring.'
                : summary.goalMetToday
                  ? lang === 'bn'
                    ? 'আজকের লক্ষ্য সফলভাবে পূর্ণ করেছেন!'
                    : 'You reached your daily learning target today.'
                  : lang === 'bn'
                    ? `আজকের লক্ষ্য পূরণে আর ${summary.remainingMinutesToday} মিনিট প্রয়োজন।`
                    : `${summary.remainingMinutesToday} more minutes to reach today's target.`}
            </p>
          </div>
        </div>

        {/* Row 2: Real Activity Metrics Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800/90 bg-[#070D24] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <BookOpenCheck className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'আজকের লেসন' : 'Lessons'}</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {summary.lessonsCompletedToday}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {lang === 'bn' ? 'আজ সম্পন্ন' : 'completed today'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#070D24] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Activity className="h-3.5 w-3.5 text-[#8B5CF6]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'অনুশীলন' : 'Activities'}</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {summary.activitiesCompletedToday}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {lang === 'bn' ? 'যাচাইকৃত সেশন' : 'verified today'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/90 bg-[#070D24] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Flame className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'ধারাবাহিকতা' : 'Streak'}</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
              {summary.activeStreakDays}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {summary.activeStreakDays === 1
                ? lang === 'bn'
                  ? 'দিন সক্রিয়'
                  : 'active day'
                : lang === 'bn'
                  ? 'দিন সক্রিয়'
                  : 'active days'}
            </p>
          </div>
        </div>
      </div>

      {/* Today's Focus / Honest First-Day Guidance */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          {summary.goalMetToday ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16E58B]" aria-hidden="true" />
          ) : (
            <Target className="h-4 w-4 shrink-0 text-[#00D9FF]" aria-hidden="true" />
          )}
          <span className="font-semibold text-slate-400">
            {lang === 'bn' ? 'আজকের ফোকাস:' : "Today's Focus:"}
          </span>
          <span className="font-medium text-white">
            {lang === 'bn' ? summary.focusLabelBn : summary.focusLabelEn}
          </span>
        </div>
        {summary.isFirstDayEmpty && (
          <span className="text-slate-400">
            {lang === 'bn'
              ? 'প্রথম সেশন সম্পন্ন হলেই বাস্তব সময় ও স্ট্রিক যুক্ত হবে।'
              : 'Real minutes and streak start updating after your first completed session.'}
          </span>
        )}
      </div>
    </section>
  );
}
