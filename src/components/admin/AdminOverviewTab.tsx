import React from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Database,
  Flag,
  Mic,
  ShieldAlert,
  Target,
  Users,
} from 'lucide-react';
import type { AdminOverviewStats, UILanguage } from '../../types/domain';

interface AdminOverviewTabProps {
  lang: UILanguage;
  stats: AdminOverviewStats | null;
  coursesCount: number;
  modulesCount: number;
  lessonsCount: number;
  storageMode: 'local' | 'cloudflare-d1';
}

export function AdminOverviewTab({
  lang,
  stats,
  coursesCount,
  modulesCount,
  lessonsCount,
  storageMode,
}: AdminOverviewTabProps) {
  const safeStats: AdminOverviewStats = stats ?? {
    totalUsers: 0,
    verifiedUsers: 0,
    suspendedUsers: 0,
    lessonsCompleted: 0,
    speakingSessions: 0,
    transferAttempts: 0,
    aiCalls: 0,
    activeMistakes: 0,
    flaggedMistakes: 0,
  };

  const verificationRate =
    safeStats.totalUsers > 0
      ? Math.round((safeStats.verifiedUsers / safeStats.totalUsers) * 100)
      : 0;

  const kpiCards = [
    {
      labelEn: 'Registered Accounts',
      labelBn: 'নিবন্ধিত অ্যাকাউন্ট',
      value: safeStats.totalUsers,
      subEn: `${safeStats.verifiedUsers} email-verified (${verificationRate}%)`,
      subBn: `${safeStats.verifiedUsers} ইমেইল যাচাইকৃত (${verificationRate}%)`,
      icon: Users,
      accent: 'text-[#3B82F6]',
    },
    {
      labelEn: 'Verified Accounts',
      labelBn: 'যাচাইকৃত অ্যাকাউন্ট',
      value: safeStats.verifiedUsers,
      subEn: `${safeStats.suspendedUsers} suspended`,
      subBn: `${safeStats.suspendedUsers} স্থগিত`,
      icon: CheckCircle2,
      accent: 'text-emerald-400',
    },
    {
      labelEn: 'Lesson Attempts Logged',
      labelBn: 'সম্পন্ন লেসন অ্যাটempt',
      value: safeStats.lessonsCompleted,
      subEn: `${lessonsCount} playable lessons across ${coursesCount} courses`,
      subBn: `${coursesCount}টি কোর্সে ${lessonsCount}টি লেসন`,
      icon: BookOpen,
      accent: 'text-indigo-400',
    },
    {
      labelEn: 'Speaking Sessions',
      labelBn: 'স্পিকিং সেশন',
      value: safeStats.speakingSessions,
      subEn: `${safeStats.transferAttempts} Transfer Lab attempts`,
      subBn: `${safeStats.transferAttempts}টি ট্রান্সফার ল্যাব চেষ্টা`,
      icon: Mic,
      accent: 'text-violet-400',
    },
    {
      labelEn: 'Real AI Calls Logged',
      labelBn: 'বাস্তব AI কল লগ',
      value: safeStats.aiCalls,
      subEn: 'Strictly zero fabricated metrics',
      subBn: 'সম্পূর্ণ বাস্তব লগ (কোনো ভুয়া ডেটা নেই)',
      icon: Activity,
      accent: 'text-sky-400',
    },
    {
      labelEn: 'Active Mistake Patterns',
      labelBn: 'সক্রিয় ভুলের প্যাটার্ন',
      value: safeStats.activeMistakes,
      subEn: `${safeStats.flaggedMistakes} flagged for admin review`,
      subBn: `${safeStats.flaggedMistakes}টি রিভিউয়ের জন্য রিপোর্টকৃত`,
      icon: AlertTriangle,
      accent: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              {lang === 'bn'
                ? 'বাস্তব প্ল্যাটফর্ম ওভারভিউ (ডাটাবেস রেকর্ড)'
                : 'Live Platform Overview (Real Database Counts)'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'সব সংখ্যা সরাসরি প্রকৃত ব্যবহারকারী ও অনুশীলন রেকর্ড থেকে গণনা করা হয়েছে — কোনো অনুমান বা ডামি চার্ট নেই।'
                : 'Every metric below is computed directly from persisted accounts, attempts, and telemetry — zero synthetic charts or fake counts.'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-1.5 font-mono text-[11px] text-slate-300">
            <Database className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
            {storageMode === 'cloudflare-d1' ? 'Cloudflare D1 Live' : 'Local D1-Schema Store'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.labelEn}
                className="rounded-xl border border-slate-800/90 bg-[#0A0F1C] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    {lang === 'bn' ? card.labelBn : card.labelEn}
                  </span>
                  <Icon className={`h-4 w-4 ${card.accent}`} aria-hidden="true" />
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                  {card.value}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {lang === 'bn' ? card.subBn : card.subEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
            <Target className="h-4 w-4" aria-hidden="true" />
            <span>
              {lang === 'bn' ? 'সক্রিয় কারিকুলাম স্ট্রাকচার' : 'Live Curriculum Footprint'}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3">
              <dt className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'কোর্স' : 'Courses'}
              </dt>
              <dd className="mt-1 font-mono text-lg font-bold text-white">{coursesCount}</dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3">
              <dt className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'মডিউল' : 'Modules'}
              </dt>
              <dd className="mt-1 font-mono text-lg font-bold text-white">{modulesCount}</dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3">
              <dt className="text-[11px] text-slate-400">
                {lang === 'bn' ? '৭-ধাপের লেসন' : 'Lessons'}
              </dt>
              <dd className="mt-1 font-mono text-lg font-bold text-white">{lessonsCount}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            <span>
              {lang === 'bn' ? 'গভর্ন্যান্স ও কোয়ালিটি চেকলিস্ট' : 'Governance & Quality Status'}
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            <li className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0A0F1C] px-3 py-2">
              <span className="inline-flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                {lang === 'bn' ? 'রিপোর্টকৃত AI ভুল সংশোধন' : 'Flagged AI Corrections Queue'}
              </span>
              <span className="font-mono font-semibold text-white">
                {safeStats.flaggedMistakes}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0A0F1C] px-3 py-2">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                {lang === 'bn' ? 'OTP ইমেইল যাচাইকরণ হার' : 'Email OTP Verification Rate'}
              </span>
              <span className="font-mono font-semibold text-white">{verificationRate}%</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
