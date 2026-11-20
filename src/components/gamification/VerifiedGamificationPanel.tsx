import { Award, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import {
  computeTotalVerifiedXp,
  computeVerifiedAchievements,
} from '../../domain/gamificationEngine';
import { useLanguage } from '../../i18n/LanguageContext';
import type {
  LessonMasteryRecord,
  MistakeMemoryItem,
  SpeakingSessionRecord,
  TransferAttemptRecord,
  XpActionSourceType,
  XpLedgerEntry,
} from '../../types/domain';

interface VerifiedGamificationPanelProps {
  xpLedger: XpLedgerEntry[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  speakingSessions: SpeakingSessionRecord[];
  mistakes: MistakeMemoryItem[];
  transferAttempts: TransferAttemptRecord[];
  compact?: boolean;
}

function formatSourceType(sourceType: XpActionSourceType, lang: 'en' | 'bn'): string {
  const map: Record<XpActionSourceType, { en: string; bn: string }> = {
    lesson_completed: { en: 'Academy Lesson', bn: 'একাডেমি লেসন' },
    lesson_mastery_tier: { en: 'Spaced Review', bn: 'স্পেসড রিভিউ' },
    speaking_session_completed: { en: 'Speaking Studio', bn: 'স্পিকিং স্টুডিও' },
    mistake_resolved: { en: 'Mistake Resolved', bn: 'ভুল সমাধান' },
    transfer_lab_passed: { en: 'Transfer Lab', bn: 'ট্রান্সফার ল্যাব' },
  };
  return lang === 'bn' ? map[sourceType].bn : map[sourceType].en;
}

export function VerifiedGamificationPanel({
  xpLedger,
  lessonMastery,
  speakingSessions,
  mistakes,
  transferAttempts,
  compact = false,
}: VerifiedGamificationPanelProps) {
  const { lang } = useLanguage();
  const totalXp = computeTotalVerifiedXp(xpLedger);
  const achievements = computeVerifiedAchievements({
    xpLedger,
    lessonMastery,
    speakingSessions,
    mistakes,
    transferAttempts,
  });
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const formatTimestamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 16);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Strip */}
      <section
        aria-label="Verified XP and Gamification Integrity"
        className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs text-[#F59E0B]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'যাচাইকৃত XP ও অর্জন (Idempotent Ledger)'
                  : 'Verified Gamification · Auditable XP Ledger'}
              </span>
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              {lang === 'bn'
                ? 'শুধুমাত্র প্রমাণিত কার্যক্রমে অর্জিত XP'
                : 'Evidence-Only XP & Achievements'}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'পেজ রিফ্রেশ বা একই কাজ বারবার জমা দিয়ে কোনো ডুপ্লিকেট XP পাওয়া যায় না। প্রতিটি XP এন্ট্রি নির্দিষ্ট idempotency কী ও সময়সহ সংরক্ষিত।'
                : 'XP is awarded strictly for verified completions (assessed lessons, Speaking sessions, resolved recurring mistakes, and passed Transfer Lab rubrics). Duplicate farming on refresh or resubmission is blocked.'}
            </p>
          </div>

          <div className="flex items-baseline gap-6 shrink-0">
            <div>
              <p className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'মোট যাচাইকৃত XP' : 'Verified Total XP'}
              </p>
              <p
                data-testid="verified-total-xp"
                className="mt-0.5 font-mono text-2xl font-bold text-[#F59E0B] tabular-nums"
              >
                {totalXp} XP
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'অর্জিত ব্যাজ' : 'Achievements'}
              </p>
              <p className="mt-0.5 font-mono text-2xl font-bold text-white tabular-nums">
                {unlockedCount}/{achievements.length}
              </p>
            </div>
          </div>
        </div>

        {/* Verified Achievements Grid */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {lang === 'bn' ? 'প্রমাণিত অর্জনসমূহ' : 'Verified Milestones'}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3.5 ${
                  item.unlocked
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-slate-800 bg-[#0A0F1C]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.unlocked ? (
                      <Award className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                    )}
                    <h4 className="text-xs font-bold text-white sm:text-sm">
                      {lang === 'bn' ? item.titleBn : item.titleEn}
                    </h4>
                  </div>
                  <span
                    className={`font-mono text-[11px] tabular-nums whitespace-nowrap ${
                      item.unlocked ? 'font-semibold text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {lang === 'bn' ? item.progressTextBn : item.progressTextEn}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {lang === 'bn' ? item.criteriaBn : item.criteriaEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auditable XP History Ledger */}
      <section
        aria-label="Auditable XP History Ledger"
        className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-3.5">
          <div>
            <h3 className="text-base font-bold text-white">
              {lang === 'bn' ? 'XP ইতিহাস লেজার (Auditable XP Ledger)' : 'XP History Ledger'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {lang === 'bn'
                ? 'প্রতিটি অর্জিত XP-এর উৎস, সময় ও ডুপ্লিকেট-নিরোধী প্রমাণ।'
                : 'Every verified XP award with exact timestamp, action source, and idempotent verification.'}
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {lang === 'bn'
              ? `${xpLedger.length}টি যাচাইকৃত এন্ট্রি`
              : `${xpLedger.length} verified ${xpLedger.length === 1 ? 'entry' : 'entries'}`}
          </span>
        </div>

        {xpLedger.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-5 text-sm text-slate-400">
            <p className="font-semibold text-slate-200">
              {lang === 'bn'
                ? 'এখনো ০ XP অর্জিত হয়েছে — কোনো ভুয়া XP যোগ করা হয়নি।'
                : '0 Verified XP earned yet — no starter bonus or fabricated XP.'}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'প্রথমবার XP অর্জন করতে যেকোনো একটি যাচাইকৃত ধাপ সম্পন্ন করুন: মূল্যায়িত একাডেমি লেসন (+50 XP), স্পিকিং স্টুডিও সেশন (+40 XP), পুনরাবৃত্ত ভুল সমাধান (+35 XP), অথবা ট্রান্সফার ল্যাব রুব্রিক পাস (+60 থেকে +100 XP)।'
                : 'Earn audited XP by completing real activities: an assessed Academy lesson (+50 XP), a Speaking Studio session (+40 XP), resolving a recurring mistake (+35 XP), or passing a Transfer Lab rubric challenge (+60 to +100 XP).'}
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">
                    {lang === 'bn' ? 'সময়' : 'Verified At'}
                  </th>
                  <th className="py-2.5 pr-4 font-medium">
                    {lang === 'bn' ? 'উৎস' : 'Action Source'}
                  </th>
                  <th className="py-2.5 pr-4 font-medium">
                    {lang === 'bn' ? 'বিবরণ' : 'Verified Action'}
                  </th>
                  <th className="py-2.5 text-right font-medium">
                    {lang === 'bn' ? 'অর্জিত XP' : 'XP Earned'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {(compact ? xpLedger.slice(0, 8) : xpLedger).map((entry) => (
                  <tr key={entry.id} className="align-top text-slate-200">
                    <td className="py-3 pr-4 font-mono text-slate-400 whitespace-nowrap tabular-nums">
                      {formatTimestamp(entry.verifiedAt)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-medium text-[#3B82F6]">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{formatSourceType(entry.sourceType, lang)}</span>
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-white">
                        {lang === 'bn' ? entry.titleBn : entry.titleEn}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                        {lang === 'bn' ? entry.detailBn : entry.detailEn}
                      </p>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#F59E0B] whitespace-nowrap tabular-nums">
                      +{entry.xpEarned} XP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
