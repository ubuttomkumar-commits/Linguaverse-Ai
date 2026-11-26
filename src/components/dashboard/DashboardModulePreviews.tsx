import { Link } from 'react-router-dom';
import {
  ArrowRight,
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  FlaskConical,
  Layers,
  Mic,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Users,
  WifiOff,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type {
  AcademyPathPreviewItem,
  DashboardNextMove,
  DashboardWeeklyAnalytics,
} from '../../domain/dashboardIntelligence';
import type { VerifiedAchievement } from '../../domain/gamificationEngine';
import type { TransferScenarioDefinition } from '../../domain/transferLabEngine';
import type { MistakeMemoryItem, MistakeSource, SpeakingSessionRecord } from '../../types/domain';
import type { SpeakingHealthResponse } from '../../services/speakingApi';

function formatMistakeSource(source: MistakeSource, lang: 'en' | 'bn'): string {
  const map: Record<MistakeSource, { en: string; bn: string }> = {
    diagnostic: { en: 'Diagnostic', bn: 'ডায়াগনস্টিক' },
    lesson_guided: { en: 'Academy', bn: 'একাডেমি' },
    lesson_independent: { en: 'Academy', bn: 'একাডেমি' },
    lesson_assessment: { en: 'Assessment', bn: 'মূল্যায়ন' },
    speaking_studio: { en: 'Speaking Studio', bn: 'স্পিকিং স্টুডিও' },
  };
  return lang === 'bn' ? map[source].bn : map[source].en;
}

/* -------------------------------------------------------------------------- */
/* 1. Personalized Next Best Move                                             */
/* -------------------------------------------------------------------------- */
export function NextBestMoveWidget({
  primaryMove,
  secondaryMoves,
  lang,
}: {
  primaryMove: DashboardNextMove;
  secondaryMoves: DashboardNextMove[];
  lang: 'en' | 'bn';
}) {
  return (
    <section
      aria-labelledby="next-move-heading"
      className="rounded-2xl border border-cyan-400/25 bg-[linear-gradient(155deg,rgba(12,26,70,0.9)_0%,rgba(8,14,40,0.92)_100%)] p-6 shadow-[0_18px_46px_rgba(2,6,22,0.55)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00D9FF]">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'bn' ? 'প্রমাণ-ভিত্তিক সুপারিশ' : 'Evidence-Based Recommendation'}
          </p>
          <h3 id="next-move-heading" className="font-portal mt-1 text-lg font-bold text-white">
            {lang === 'bn' ? 'আপনার পরবর্তী সেরা পদক্ষেপ' : 'Your Next Best Move'}
          </h3>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          ~{primaryMove.estimatedMinutes} {lang === 'bn' ? 'মিনিট' : 'min'} ·{' '}
          {lang === 'bn' ? primaryMove.skillLabelBn : primaryMove.skillLabelEn}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-400/20 bg-[#070E28]/90 p-5">
        <h4 className="text-base font-bold text-white">
          {lang === 'bn' ? primaryMove.titleBn : primaryMove.titleEn}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {lang === 'bn' ? primaryMove.reasonBn : primaryMove.reasonEn}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? primaryMove.ruleBasisBn : primaryMove.ruleBasisEn}
          </p>
          <Link
            to={primaryMove.to}
            className="lv-portal-btn-violet inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap shrink-0"
          >
            <span>{lang === 'bn' ? primaryMove.ctaLabelBn : primaryMove.ctaLabelEn}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {secondaryMoves.length > 0 && (
        <div className="mt-4 divide-y divide-slate-800/80">
          {secondaryMoves.map((move) => (
            <div
              key={move.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">
                  {lang === 'bn' ? move.titleBn : move.titleEn}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {lang === 'bn' ? move.skillLabelBn : move.skillLabelEn} · ~{move.estimatedMinutes}{' '}
                  {lang === 'bn' ? 'মি.' : 'min'}
                </p>
              </div>
              <Link
                to={move.to}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap shrink-0"
              >
                <span>{lang === 'bn' ? move.ctaLabelBn : move.ctaLabelEn}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Learning Path & Academy Preview                                         */
/* -------------------------------------------------------------------------- */
export function AcademyPathWidget({
  items,
  completedCount,
  totalCount,
  currentCourseTitleEn,
  currentCourseTitleBn,
  lang,
}: {
  items: AcademyPathPreviewItem[];
  completedCount: number;
  totalCount: number;
  currentCourseTitleEn: string;
  currentCourseTitleBn: string;
  lang: 'en' | 'bn';
}) {
  return (
    <section
      aria-labelledby="academy-path-heading"
      className="rounded-2xl border border-slate-800/90 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.5)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'bn' ? currentCourseTitleBn : currentCourseTitleEn}
          </p>
          <h3 id="academy-path-heading" className="font-portal mt-1 text-lg font-bold text-white">
            {lang === 'bn' ? 'শেখার পথ ও একাডেমি' : 'Learning Path & Academy'}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {completedCount}/{totalCount} {lang === 'bn' ? 'সম্পন্ন' : 'completed'}
          </span>
          <Link
            to="/app/learn"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'একাডেমি দেখুন' : 'Explore Academy'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Horizontal/Vertical Progression Timeline */}
      <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, idx) => {
          const isCompleted = item.status === 'completed';
          const isDue = item.status === 'due_review';
          const isActive = item.status === 'in_progress' || item.isRecommendedStart;

          return (
            <li
              key={item.lesson.id}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                isDue
                  ? 'border-amber-400/40 bg-amber-500/5'
                  : isActive
                    ? 'border-cyan-400/40 bg-[#0D1A44]/80'
                    : 'border-slate-800 bg-[#070D24]/85'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-slate-400 tabular-nums">
                    {String(idx + 1).padStart(2, '0')} · {item.lesson.cefrBand}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-[#16E58B]" aria-label="Completed" />
                  ) : (
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {item.lesson.estimatedMinutes}m
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-sm font-semibold leading-snug text-white">
                  {lang === 'bn' ? item.lesson.titleBn : item.lesson.titleEn}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {isDue
                    ? lang === 'bn'
                      ? `রিভিউ সময় হয়েছে · ${item.masteryPercent}%`
                      : `Review due · ${item.masteryPercent}% mastery`
                    : isCompleted
                      ? lang === 'bn'
                        ? `${item.masteryPercent}% প্রমাণিত মাস্টারি`
                        : `${item.masteryPercent}% verified mastery`
                      : item.isRecommendedStart
                        ? lang === 'bn'
                          ? 'মূল্যায়ন প্রস্তাবিত শুরু'
                          : 'Assessment recommended'
                        : lang === 'bn'
                          ? 'শুরু করার জন্য প্রস্তুত'
                          : 'Ready to start'}
                </p>
              </div>

              <Link
                to={`/app/learn/${encodeURIComponent(item.lesson.id)}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200"
              >
                <span>
                  {isDue
                    ? lang === 'bn'
                      ? 'রিভিউ করুন'
                      : 'Review Now'
                    : isCompleted
                      ? lang === 'bn'
                        ? 'আবার দেখুন'
                        : 'Revisit'
                      : lang === 'bn'
                        ? 'লেসন খুলুন'
                        : 'Open Lesson'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Mistake Memory Preview ("Your Learning Patterns")                       */
/* -------------------------------------------------------------------------- */
export function MistakeMemoryPreviewWidget({
  mistakes,
  explanationLanguage,
  hasAnyActivity,
  lang,
}: {
  mistakes: MistakeMemoryItem[];
  explanationLanguage: 'en' | 'bn' | 'both';
  hasAnyActivity: boolean;
  lang: 'en' | 'bn';
}) {
  const visibleMistakes = mistakes.filter((m) => !m.falseCorrectionReported);
  const activeQueue = visibleMistakes.filter((m) => m.status !== 'resolved');
  const resolvedCount = visibleMistakes.filter((m) => m.status === 'resolved').length;

  return (
    <section
      aria-labelledby="mistake-preview-heading"
      className="rounded-2xl border border-slate-800/90 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.5)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'bn' ? 'মিস্টেক মেমোরি' : 'Mistake Memory'}
          </p>
          <h3 id="mistake-preview-heading" className="font-portal mt-1 text-lg font-bold text-white">
            {lang === 'bn' ? 'আপনার শেখার প্যাটার্ন' : 'Your Learning Patterns'}
          </h3>
        </div>
        <Link
          to="/app/improve"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap"
        >
          <span>{lang === 'bn' ? 'সব ভুল পর্যালোচনা করুন' : 'Review My Mistakes'}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-2 font-mono text-xs text-slate-400 tabular-nums">
        {activeQueue.length} {lang === 'bn' ? 'সক্রিয়' : 'active'} · {resolvedCount}{' '}
        {lang === 'bn' ? 'সমাধানকৃত' : 'resolved'}
      </p>

      {activeQueue.length === 0 ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-800 bg-[#070D24]/80 p-4 text-sm text-slate-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16E58B]" aria-hidden="true" />
          <p className="leading-relaxed">
            {hasAnyActivity
              ? lang === 'bn'
                ? 'এই মুহূর্তে কোনো অমীমাংসিত পুনরাবৃত্ত ভুল নেই। নতুন অনুশীলন বা স্পিকিং সেশনে ভুল ধরা পড়লে এখানে স্বয়ংক্রিয়ভাবে যুক্ত হবে।'
                : 'No unresolved recurring mistakes right now. New patterns from lessons or Speaking Studio will appear here automatically.'
              : lang === 'bn'
                ? 'এখনো কোনো ভুল রেকর্ড হয়নি। মূল্যায়ন, একাডেমি লেসন বা স্পিকিং স্টুডিও শুরু করলে আপনার ব্যক্তিগত ভুলের প্যাটার্ন এখানে সংরক্ষিত হবে।'
                : 'No mistake patterns logged yet. Complete an assessment, lesson, or speaking session to start building your personal Mistake Memory.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-slate-800/80">
          {activeQueue.slice(0, 3).map((item) => (
            <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-violet-300">{item.category}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 tabular-nums">
                    {formatMistakeSource(item.source, lang)} · {item.occurrences}x · {item.status}
                  </span>
                  <Link
                    to={`/app/improve?focus=${encodeURIComponent(item.id)}`}
                    className="font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap"
                  >
                    {lang === 'bn' ? 'সংশোধন' : 'Fix'}
                  </Link>
                </div>
              </div>
              <p className="mt-1.5 text-sm text-slate-200">
                <span className="text-rose-300 line-through">{item.userExample}</span>
                <span aria-hidden="true" className="mx-2 text-slate-500">
                  →
                </span>
                <span className="font-semibold text-emerald-300">{item.correctedExample}</span>
              </p>
              <p className="font-bn mt-1 text-xs leading-relaxed text-slate-400">
                {explanationLanguage === 'en' ? item.explanationEn : item.explanationBn}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Speaking Studio Preview (Never auto-activates mic or fakes scores)      */
/* -------------------------------------------------------------------------- */
export function SpeakingStudioPreviewWidget({
  speakingSessions,
  speakingHealth,
  speakingHealthError,
  onRetrySpeakingHealth,
  lang,
}: {
  speakingSessions: SpeakingSessionRecord[];
  speakingHealth: SpeakingHealthResponse | null;
  speakingHealthError?: boolean;
  onRetrySpeakingHealth?: () => void;
  lang: 'en' | 'bn';
}) {
  const prefersReduced = Boolean(useReducedMotion());
  const completedSessions = speakingSessions.filter((s) => s.turns.length > 0);
  const totalTurns = completedSessions.reduce((sum, s) => sum + s.turns.length, 0);
  const waveHeights = [26, 44, 62, 38, 76, 54, 84, 48, 66, 36, 52, 30];

  return (
    <section
      aria-labelledby="speaking-preview-heading"
      className="flex flex-col justify-between rounded-2xl border border-cyan-400/20 bg-[linear-gradient(155deg,rgba(10,22,58,0.9)_0%,rgba(8,13,38,0.95)_100%)] p-6 shadow-[0_18px_46px_rgba(2,6,22,0.5)]"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00D9FF]">
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'bn' ? 'এআই স্পিকিং স্টুডিও' : 'AI Speaking Studio'}
            </p>
            <h3
              id="speaking-preview-heading"
              className="font-portal mt-1 text-lg font-bold text-white"
            >
              {lang === 'bn' ? 'কণ্ঠে অনুশীলন ও ফিডব্যাক' : 'Live Voice & Conversation Practice'}
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {completedSessions.length} {lang === 'bn' ? 'সেশন' : 'sessions'}
          </span>
        </div>

        {/* Stylized lightweight waveform (pure visual, zero mic capture) */}
        <div
          aria-hidden="true"
          className="mt-5 flex h-20 items-center justify-center gap-2 rounded-xl border border-cyan-400/15 bg-[#060B22]/90 px-4"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/15 text-[#00D9FF] shadow-[0_0_24px_rgba(0,217,255,0.28)]">
            <Mic className="h-5 w-5" />
          </div>
          <div className="flex h-12 flex-1 items-center justify-center gap-1.5">
            {waveHeights.map((h, i) => (
              <span
                key={i}
                className={`w-1.5 rounded-full bg-gradient-to-t from-[#3B82F6] via-[#00D9FF] to-[#A855F7] ${
                  prefersReduced ? '' : 'lv-wave-bar'
                }`}
                style={{
                  height: `${Math.round((h / 100) * 44)}px`,
                  animationDelay: prefersReduced ? undefined : `${(i % 6) * 140}ms`,
                }}
              />
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {completedSessions.length > 0
            ? lang === 'bn'
              ? `এখন পর্যন্ত ${completedSessions.length}টি স্পিকিং সেশনে ${totalTurns}টি কথোপকথন ধাপ সংরক্ষিত হয়েছে।`
              : `${completedSessions.length} speaking session${completedSessions.length === 1 ? '' : 's'} (${totalTurns} turns) recorded so far.`
            : lang === 'bn'
              ? 'দৈনন্দিন ও কর্মক্ষেত্রের বাস্তব কথোপকথন অনুশীলন করুন। মাইক্রোফোন কেবল আপনি স্টুডিওতে অনুমতি দিলেই চালু হবে।'
              : 'Practice structured real-world conversations with instant error logging. Your microphone is never activated from this preview.'}
        </p>

        {/* Honest Live API Loading / Error / Unconfigured State */}
        {speakingHealth === null && !speakingHealthError && (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 flex items-center gap-2.5 rounded-lg border border-slate-800 bg-[#070D24]/90 px-3 py-2.5 text-xs text-slate-400"
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full bg-cyan-400 ${prefersReduced ? '' : 'animate-pulse'}`}
            />
            <span>
              {lang === 'bn'
                ? 'এআই স্পিকিং সার্ভিসের অবস্থা যাচাই হচ্ছে...'
                : 'Checking AI Speaking Studio availability...'}
            </span>
          </div>
        )}

        {speakingHealthError && (
          <div
            role="alert"
            className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-rose-500/35 bg-rose-950/35 px-3 py-2.5 text-xs text-rose-200"
          >
            <div className="flex items-start gap-2">
              <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'স্পিকিং স্টুডিও সার্ভারে সংযোগ পাওয়া যায়নি। নেটওয়ার্ক পরীক্ষা করে আবার চেষ্টা করুন।'
                  : 'Unable to reach the Speaking Studio service. Check your connection and retry.'}
              </span>
            </div>
            {onRetrySpeakingHealth && (
              <button
                type="button"
                onClick={onRetrySpeakingHealth}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-400/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-100 hover:bg-rose-500/25 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>{lang === 'bn' ? 'আবার চেষ্টা' : 'Retry'}</span>
              </button>
            )}
          </div>
        )}

        {!speakingHealthError && speakingHealth && !speakingHealth.configured && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
            <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? 'সার্ভারে AI স্পিকিং মূল্যায়ন কী বর্তমানে কনফিগার করা নেই — স্টুডিও খোলা যাবে তবে লাইভ AI মূল্যায়ন সাময়িকভাবে অনুপলব্ধ।'
                : 'AI Speaking evaluation service is currently not configured on the server. You can open the studio, but live AI evaluation is unavailable until configured.'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
        <span className="text-xs text-slate-400">
          {speakingHealthError
            ? lang === 'bn'
              ? 'সংযোগ ত্রুটি'
              : 'Connection error'
            : speakingHealth === null
              ? lang === 'bn'
                ? 'সার্ভিস যাচাই হচ্ছে...'
                : 'Checking studio availability...'
              : speakingHealth.configured
                ? lang === 'bn'
                  ? 'ভয়েস + টাইপ মোড প্রস্তুত'
                  : 'Voice + typed modes ready'
                : lang === 'bn'
                  ? 'লাইভ AI অফলাইন'
                  : 'Live AI evaluator offline'}
        </span>
        <Link
          to="/app/speak"
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25 transition-colors whitespace-nowrap shrink-0"
        >
          <span>{lang === 'bn' ? 'স্পিকিং স্টুডিও খুলুন' : 'Open Speaking Studio'}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Transfer Lab Preview                                                    */
/* -------------------------------------------------------------------------- */
export function TransferLabPreviewWidget({
  scenarios,
  completedTransfersCount,
  lang,
}: {
  scenarios: TransferScenarioDefinition[];
  completedTransfersCount: number;
  lang: 'en' | 'bn';
}) {
  return (
    <section
      aria-labelledby="transfer-preview-heading"
      className="rounded-2xl border border-slate-800/90 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.5)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'bn' ? 'বাস্তব প্রয়োগ সিমুলেশন' : 'Real-World Pressure Simulation'}
          </p>
          <h3 id="transfer-preview-heading" className="font-portal mt-1 text-lg font-bold text-white">
            {lang === 'bn' ? 'ট্রান্সফার ল্যাব' : 'Transfer Lab'}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {completedTransfersCount} {lang === 'bn' ? 'উত্তীর্ণ' : 'completed'}
          </span>
          <Link
            to="/app/transfer-lab"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'ট্রান্সফার ল্যাবে প্রবেশ করুন' : 'Enter Transfer Lab'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {scenarios.slice(0, 3).map((scenario) => (
          <div
            key={scenario.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#070D24]/90 p-4 hover:border-cyan-400/35 transition-colors"
          >
            <div>
              <p className="text-[11px] font-semibold text-fuchsia-300">
                {lang === 'bn' ? scenario.contextTagBn : scenario.contextTagEn}
              </p>
              <h4 className="mt-1.5 text-sm font-bold text-white">
                {lang === 'bn' ? scenario.titleBn : scenario.titleEn}
              </h4>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                {lang === 'bn' ? scenario.briefBn : scenario.briefEn}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
              <span className="truncate text-[11px] text-slate-500">
                {lang === 'bn' ? scenario.defaultTargetGrammarBn : scenario.defaultTargetGrammarEn}
              </span>
              <Link
                to={`/app/transfer-lab?scenario=${encodeURIComponent(scenario.id)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap shrink-0"
              >
                <span>{lang === 'bn' ? 'প্র্যাকটিস' : 'Start'}</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Vocabulary & Spaced Repetition Preview (Strict Honesty)                 */
/* -------------------------------------------------------------------------- */
export function VocabularySpacedPreviewWidget({
  dueReviewsCount,
  vocabMistakesCount,
  lang,
}: {
  dueReviewsCount: number;
  vocabMistakesCount: number;
  lang: 'en' | 'bn';
}) {
  return (
    <section
      aria-labelledby="vocab-sr-heading"
      className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.5)]"
    >
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          {lang === 'bn' ? 'শব্দভাণ্ডার ও স্পেসড রিপিটিশন' : 'Vocabulary & Spaced Repetition'}
        </p>
        <h3 id="vocab-sr-heading" className="font-portal mt-1 text-lg font-bold text-white">
          {lang === 'bn' ? 'স্মৃতি ধরে রাখার কিউ' : 'Retention & Review Queue'}
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-[#070D24] p-3.5">
            <p className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'নির্ধারিত রিভিউ' : 'Due Lesson Reviews'}
            </p>
            <p className="mt-1.5 font-mono text-xl font-bold text-white tabular-nums">
              {dueReviewsCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#070D24] p-3.5">
            <p className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'শব্দভাণ্ডার প্যাটার্ন' : 'Vocab Mistakes'}
            </p>
            <p className="mt-1.5 font-mono text-xl font-bold text-white tabular-nums">
              {vocabMistakesCount}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          {lang === 'bn'
            ? 'একাডেমি লেসন, মিস্টেক মেমোরি এবং ইন্টারেক্টিভ ভোকাবুলারি স্পেসড রিপিটিশন ডেকে (SM-2) আপনার বাস্তব রিভিউ সংরক্ষিত থাকে।'
            : 'Spaced repetition is live across Academy lessons, Mistake Memory drills, and your dedicated SM-2 Vocabulary Deck — zero fabricated counts.'}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-800/80 pt-4 text-xs">
        <Link
          to="/app/vocabulary"
          className="inline-flex items-center gap-1 font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap"
        >
          <span>{lang === 'bn' ? 'ভোকাবুলারি ডেক খুলুন' : 'Open Vocabulary Deck'}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link
          to="/app/learn"
          className="inline-flex items-center gap-1 font-semibold text-slate-300 hover:text-white whitespace-nowrap"
        >
          <span>{lang === 'bn' ? 'লেসন রিভিউ' : 'Lesson Reviews'}</span>
        </Link>
        {vocabMistakesCount > 0 && (
          <Link
            to="/app/improve"
            className="inline-flex items-center gap-1 font-semibold text-violet-300 hover:text-violet-200 whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'ভোকাব ড্রিল' : 'Drill Vocabulary'}</span>
          </Link>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Progress & Analytics Preview (Zero fake trend lines)                    */
/* -------------------------------------------------------------------------- */
export function ProgressAnalyticsPreviewWidget({
  analytics,
  lang,
}: {
  analytics: DashboardWeeklyAnalytics;
  lang: 'en' | 'bn';
}) {
  const maxMinutes = Math.max(10, ...analytics.points.map((p) => p.minutes));

  return (
    <section
      aria-labelledby="analytics-preview-heading"
      className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.5)]"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'bn' ? '৭ দিনের বাস্তব কার্যকলাপ' : '7-Day Real Activity'}
            </p>
            <h3
              id="analytics-preview-heading"
              className="font-portal mt-1 text-lg font-bold text-white"
            >
              {lang === 'bn' ? 'অগ্রগতি ও অ্যানালিটিক্স' : 'Progress & Analytics'}
            </h3>
          </div>
          <Link
            to="/app/progress"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'সম্পূর্ণ অগ্রগতি দেখুন' : 'View Full Progress'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {!analytics.hasSufficientTrendData ? (
          <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/90 bg-[#070D24]/75 px-5 py-7 text-center">
            <Clock className="h-5 w-5 text-slate-400" aria-hidden="true" />
            <p className="mt-2.5 text-sm font-semibold text-white">
              {lang === 'bn'
                ? 'প্রবণতা দেখানোর মতো পর্যাপ্ত দিনের ডেটা এখনো নেই'
                : 'Not enough activity days yet to chart a trend'}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
              {analytics.totalMinutes7d > 0
                ? lang === 'bn'
                  ? `গত ৭ দিনে ১ দিন অনুশীলন (${analytics.totalMinutes7d} মি.) রেকর্ড হয়েছে। অন্তত ২টি ভিন্ন দিনে অনুশীলন করলে তুলনামূলক চার্ট দেখাবে।`
                  : `${analytics.totalMinutes7d} min logged across 1 day so far. Complete sessions on at least 2 days to see an honest trend.`
                : lang === 'bn'
                  ? 'আমরা কখনো কাল্পনিক গ্রাফ দেখাই না। অন্তত ২ দিন অনুশীলন করলে এখানে বাস্তব ৭-দিনের বার চার্ট দেখাবে।'
                  : 'We never fabricate growth curves. Practice across 2 or more days to unlock your real 7-day bar chart.'}
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-xs text-slate-400">
              <span>
                {lang === 'bn' ? 'মোট অনুশীলন (৭ দিন)' : 'Total verified practice (7 days)'}
              </span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {analytics.totalMinutes7d} {lang === 'bn' ? 'মিনিট' : 'min'} ·{' '}
                {analytics.activeDaysCount}/7 {lang === 'bn' ? 'দিন' : 'days'}
              </span>
            </div>

            <div
              className="mt-4 grid h-32 grid-cols-7 items-end gap-2 rounded-xl border border-slate-800 bg-[#070D24]/90 px-3 pb-3 pt-4"
              role="img"
              aria-label={
                lang === 'bn'
                  ? 'গত ৭ দিনের বাস্তব অনুশীলনের বার চার্ট'
                  : '7-day verified practice minutes bar chart'
              }
            >
              {analytics.points.map((pt) => {
                const heightPct = pt.minutes > 0 ? Math.max(12, Math.round((pt.minutes / maxMinutes) * 100)) : 4;
                return (
                  <div key={pt.dateKey} className="flex h-full flex-col items-center justify-end gap-1.5">
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                      {pt.minutes > 0 ? `${pt.minutes}m` : ''}
                    </span>
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className={`w-full max-w-[26px] rounded-t-md ${
                          pt.minutes > 0
                            ? 'bg-gradient-to-t from-[#3B82F6] via-[#00D9FF] to-[#8B5CF6]'
                            : 'bg-slate-800/80'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">
                      {lang === 'bn' ? pt.labelBn : pt.labelEn}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Compact Community (Honest Unavailable) & Verified Achievements Row      */
/* -------------------------------------------------------------------------- */
export function CommunityAndAchievementsRow({
  totalVerifiedXp,
  achievements,
  lang,
}: {
  totalVerifiedXp: number;
  achievements: VerifiedAchievement[];
  lang: 'en' | 'bn';
}) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Verified Achievements */}
      <section
        aria-labelledby="achievements-preview-heading"
        className="rounded-2xl border border-slate-800/90 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.5)] lg:col-span-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'bn' ? 'যাচাইকৃত মাইলফলক' : 'Verified Milestones'}
            </p>
            <h3
              id="achievements-preview-heading"
              className="font-portal mt-1 text-lg font-bold text-white"
            >
              {lang === 'bn' ? 'অর্জন ও প্রমাণিত XP' : 'Achievements & Verified XP'}
            </h3>
          </div>
          <div className="text-right font-mono text-xs tabular-nums">
            <p className="font-bold text-[#F59E0B]">{totalVerifiedXp} XP</p>
            <p className="text-slate-400">
              {unlockedCount}/{achievements.length} {lang === 'bn' ? 'অর্জিত' : 'unlocked'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {achievements.slice(0, 4).map((ach) => (
            <div
              key={ach.id}
              className={`rounded-xl border p-3.5 ${
                ach.unlocked
                  ? 'border-emerald-400/35 bg-emerald-500/5'
                  : 'border-slate-800 bg-[#070D24]/85'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-white">
                  {lang === 'bn' ? ach.titleBn : ach.titleEn}
                </p>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    ach.unlocked ? 'text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  {lang === 'bn' ? ach.progressTextBn : ach.progressTextEn}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {lang === 'bn' ? ach.criteriaBn : ach.criteriaEn}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end border-t border-slate-800/80 pt-3.5 text-xs">
          <Link
            to="/app/achievements"
            className="inline-flex items-center gap-1 font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'সব অর্জন ও চ্যালেঞ্জ দেখুন' : 'View All Achievements'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Learner Community (Live Moderated Workspace — Zero Private DMs) */}
      <section
        aria-labelledby="community-preview-heading"
        className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.5)] lg:col-span-5"
      >
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-300">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'bn' ? 'মডারেটেড কমিউনিটি' : 'Moderated Community'}
          </p>
          <h3
            id="community-preview-heading"
            className="font-portal mt-1 text-lg font-bold text-white"
          >
            {lang === 'bn' ? 'লার্নার কমিউনিটি' : 'Learner Community'}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {lang === 'bn'
              ? 'সাপ্তাহিক চ্যালেঞ্জ, গ্রামার ও ইন্টারভিউ আলোচনা, এবং রিপোর্ট-সুরক্ষিত পাবলিক কমিউনিটি থ্রেডে যুক্ত হোন। নিরাপত্তার জন্য প্রাইভেট ডিরেক্ট মেসেজ (DM) বন্ধ রাখা হয়েছে।'
              : 'Join moderated learner threads for grammar Q&A, interview prep, and weekly challenges. Private direct messaging stays disabled by design for learner safety.'}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4 text-xs">
          <Link
            to="/app/community"
            className="inline-flex items-center gap-1 font-semibold text-[#00D9FF] hover:text-cyan-200 whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'কমিউনিটি খুলুন' : 'Open Learner Community'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link
            to="/app/speak"
            className="font-semibold text-slate-300 hover:text-white whitespace-nowrap"
          >
            {lang === 'bn' ? 'AI-এর সাথে প্র্যাকটিস' : 'AI Speaking Studio'}
          </Link>
        </div>
      </section>
    </div>
  );
}
