import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GitCompare,
  Loader2,
  PenLine,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ReplayApiError, requestReplayCorrectionDeepDive } from '../../services/replayApi';
import type {
  ExplanationLanguage,
  MistakeSeverity,
  MistakeStatus,
  ReplayComparisonItem,
  ReplayCorrectionDeepDive,
  UnifiedReplaySession,
} from '../../types/domain';

interface ReplayMistakeAndDiffPanelProps {
  session: UnifiedReplaySession;
  currentUserId: string;
  explanationPref: ExplanationLanguage;
  onJumpToTurn: (turnId: string) => void;
  onPracticeTurn: (turnId: string) => void;
  onToggleComparisonReviewed: (comparisonId: string) => void;
}

function severityText(severity: MistakeSeverity, lang: 'en' | 'bn'): string {
  if (severity === 'high') return lang === 'bn' ? 'উচ্চ গুরুত্ব' : 'High severity';
  if (severity === 'low') return lang === 'bn' ? 'সামান্য' : 'Low severity';
  return lang === 'bn' ? 'মাঝারি' : 'Medium severity';
}

function memoryStatusText(status: MistakeStatus | undefined, lang: 'en' | 'bn'): string {
  if (status === 'resolved') return lang === 'bn' ? 'সমাধান হয়েছে' : 'Resolved in Memory';
  if (status === 'practicing') return lang === 'bn' ? 'অনুশীলনরত' : 'Practicing in Memory';
  if (status === 'active') return lang === 'bn' ? 'সক্রিয় ভুল' : 'Active in Memory';
  return lang === 'bn' ? 'পরামর্শ' : 'Session note';
}

function memoryStatusColor(status: MistakeStatus | undefined): string {
  if (status === 'resolved') return 'text-[#16E58B]';
  if (status === 'practicing') return 'text-[#F59E0B]';
  if (status === 'active') return 'text-rose-300';
  return 'text-slate-400';
}

export function ReplayMistakeAndDiffPanel({
  session,
  currentUserId,
  explanationPref,
  onJumpToTurn,
  onPracticeTurn,
  onToggleComparisonReviewed,
}: ReplayMistakeAndDiffPanelProps) {
  const { lang } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deepDivesById, setDeepDivesById] = useState<Record<string, ReplayCorrectionDeepDive>>({});
  const [loadingDeepDiveId, setLoadingDeepDiveId] = useState<string | null>(null);
  const [deepDiveErrorById, setDeepDiveErrorById] = useState<Record<string, string>>({});

  const mistakeCategories = useMemo(
    () => Array.from(new Set(session.mistakes.map((m) => m.category).filter(Boolean))).sort(),
    [session.mistakes]
  );

  const visibleMistakes = useMemo(() => {
    if (selectedCategory === 'all') return session.mistakes;
    return session.mistakes.filter((m) => m.category === selectedCategory);
  }, [session.mistakes, selectedCategory]);

  const reviewedSet = useMemo(
    () => new Set(session.reviewedComparisonIds ?? []),
    [session.reviewedComparisonIds]
  );

  const handleRequestDeepDive = async (cmp: ReplayComparisonItem) => {
    setLoadingDeepDiveId(cmp.id);
    setDeepDiveErrorById((prev) => {
      const next = { ...prev };
      delete next[cmp.id];
      return next;
    });

    try {
      const deepDive = await requestReplayCorrectionDeepDive({
        sessionId: session.id,
        scenarioTitle: session.titleEn,
        originalResponse: cmp.original,
        correctedResponse: cmp.corrected,
        category: cmp.mistakeCategories[0],
        explanationLanguage: explanationPref,
        userId: currentUserId,
      });
      setDeepDivesById((prev) => ({ ...prev, [cmp.id]: deepDive }));
    } catch (err) {
      const msg =
        err instanceof ReplayApiError
          ? err.message
          : lang === 'bn'
            ? 'AI গভীর ব্যাখ্যা তৈরি করা যায়নি। পরে আবার চেষ্টা করুন।'
            : 'Unable to generate AI correction deep-dive right now.';
      setDeepDiveErrorById((prev) => ({ ...prev, [cmp.id]: msg }));
    } finally {
      setLoadingDeepDiveId((prev) => (prev === cmp.id ? null : prev));
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Intelligent Mistake Timeline */}
      <section
        aria-label={lang === 'bn' ? 'বুদ্ধিমত্তাপূর্ণ ভুলের টাইমলাইন' : 'Intelligent Mistake Timeline'}
        className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
              <AlertCircle className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'বুদ্ধিমত্তাপূর্ণ ভুলের টাইমলাইন (Mistake Timeline)'
                  : 'Intelligent Mistake Timeline'}
              </span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'এই সেশনে শনাক্ত হওয়া প্রতিটি ভুল সরাসরি পার্ট ০৯ Mistake Memory-র সাথে যুক্ত (কোনো ডুপ্লিকেট তৈরি হয় না)।'
                : 'Chronological view of real mistakes detected in this session, linked directly to Part 09 Mistake Memory with zero duplication.'}
            </p>
          </div>
          <Link
            to="/app/improve"
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'Mistake Memory খুলুন' : 'Open Mistake Memory'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Category Filter Bar */}
        {mistakeCategories.length > 1 && (
          <div
            role="group"
            aria-label={lang === 'bn' ? 'ভুলের ক্যাটাগরি ফিল্টার' : 'Filter mistakes by category'}
            className="mt-4 flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              aria-pressed={selectedCategory === 'all'}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-800 bg-[#050A22] text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? `সব (${session.mistakes.length})` : `All (${session.mistakes.length})`}
            </button>
            {mistakeCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'border-violet-400/45 bg-violet-500/20 text-violet-200'
                    : 'border-slate-800 bg-[#050A22] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {session.mistakes.length === 0 ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4 text-xs text-slate-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-emerald-200">
                {lang === 'bn'
                  ? 'এই সেশনে কোনো ভুল রেকর্ড হয়নি'
                  : 'No detected mistakes recorded for this session'}
              </p>
              <p className="mt-1 text-slate-400">
                {session.analysis.hasEvaluation
                  ? lang === 'bn'
                    ? 'মূল্যায়নে কোনো নিশ্চিত ব্যাকরণ বা বাক্যগঠনের ভুল পাওয়া যায়নি।'
                    : 'The saved historical evaluation did not flag any confirmed grammar or phrasing mistakes.'
                  : lang === 'bn'
                    ? 'এই সেশনের মূল্যায়ন অনুপলব্ধ থাকায় কোনো ভুলের তালিকা তৈরি করা হয়নি।'
                    : 'No mistake timeline is shown because no saved evaluation exists for this session.'}
              </p>
            </div>
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {visibleMistakes.map((m, idx) => (
              <li
                key={m.id}
                data-testid={`replay-mistake-item-${idx}`}
                className="rounded-xl border border-slate-800/90 bg-[#050A22] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                      {m.turnIndex
                        ? lang === 'bn'
                          ? `ধাপ #${String(m.turnIndex).padStart(2, '0')}`
                          : `Turn #${String(m.turnIndex).padStart(2, '0')}`
                        : `#${idx + 1}`}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="font-semibold text-violet-300">{m.category}</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {severityText(m.severity, lang)} · {Math.round(m.confidence * 100)}%
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-[11px] text-slate-500">
                      {lang === 'bn' ? m.detectionSourceBn : m.detectionSourceEn}
                    </span>
                  </div>

                  <span className={`font-medium ${memoryStatusColor(m.memoryStatus)}`}>
                    {memoryStatusText(m.memoryStatus, lang)}
                    {m.memoryOccurrences && m.memoryOccurrences > 1
                      ? ` (${m.memoryOccurrences}×)`
                      : ''}
                  </span>
                </div>

                {/* Original vs Corrected inline diff */}
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden="true" />
                  <span className="text-rose-300 line-through">{m.original}</span>
                  <span aria-hidden="true" className="text-slate-500">
                    →
                  </span>
                  <span className="font-semibold text-emerald-300">{m.corrected}</span>
                </div>

                {/* Bilingual explanation */}
                <div className="mt-2.5 space-y-1 text-xs leading-relaxed">
                  {(explanationPref === 'bn' || explanationPref === 'both') && m.explanationBn && (
                    <p className="font-bn text-slate-200">
                      <span className="font-semibold text-violet-300">বাংলা: </span>
                      {m.explanationBn}
                    </p>
                  )}
                  {(explanationPref === 'en' || explanationPref === 'both') && m.explanationEn && (
                    <p className="text-slate-300">
                      <span className="font-semibold text-cyan-300">Explanation: </span>
                      {m.explanationEn}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-800/70 pt-3 text-xs">
                  {m.turnId && (
                    <button
                      type="button"
                      onClick={() => onJumpToTurn(m.turnId!)}
                      className="font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                    >
                      {lang === 'bn' ? 'ট্রান্সক্রিপ্টে যান' : 'Jump to turn in transcript'}
                    </button>
                  )}
                  {m.turnId && (
                    <button
                      type="button"
                      onClick={() => onPracticeTurn(m.turnId!)}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                    >
                      <PenLine className="h-3 w-3" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'উত্তরটি পুনরায় অনুশীলন করুন' : 'Practice response'}</span>
                    </button>
                  )}
                  <Link
                    to={m.practiceLink}
                    className="inline-flex items-center gap-1 font-semibold text-violet-300 hover:text-violet-200"
                  >
                    <span>
                      {lang === 'bn'
                        ? 'Mistake Memory-তে অনুশীলন করুন'
                        : 'Practice in Mistake Memory'}
                    </span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Section 2: Correction Lab */}
      <section
        aria-label={lang === 'bn' ? 'কারেকশন ল্যাব' : 'Correction Lab'}
        className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
              <GitCompare className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'কারেকশন ল্যাব (Original vs. Corrected Response)'
                  : 'Correction Lab — Original vs. Corrected Response'}
              </span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'আপনার মূল উত্তর অপরিবর্তিত থাকে। সংশোধিত উত্তর ও স্বাভাবিক বিকল্পগুলো শুধুমাত্র প্রস্তাবিত উন্নতি হিসেবে দেখানো হয়।'
                : 'Your original response is strictly immutable. Corrections, natural alternatives, and on-demand AI deep-dives are clearly marked as suggestions.'}
            </p>
          </div>
          {session.comparisons.length > 0 && (
            <span
              data-testid="correction-lab-reviewed-count"
              className="font-mono text-xs text-cyan-300 tabular-nums"
            >
              {reviewedSet.size}/{session.comparisons.length}{' '}
              {lang === 'bn' ? 'পর্যালোচিত' : 'reviewed'}
            </span>
          )}
        </div>

        {session.comparisons.length === 0 ? (
          <p className="mt-4 text-xs text-slate-400">
            {lang === 'bn'
              ? 'এই সেশনের জন্য কোনো সংরক্ষিত সংশোধন তুলনা পাওয়া যায়নি।'
              : 'No saved response comparisons are available for this session.'}
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {session.comparisons.map((cmp) => {
              const isReviewed = reviewedSet.has(cmp.id);
              const deepDive = deepDivesById[cmp.id];
              const isLoadingDive = loadingDeepDiveId === cmp.id;
              const diveError = deepDiveErrorById[cmp.id];

              return (
                <article
                  key={cmp.id}
                  data-testid={`replay-comparison-${cmp.id}`}
                  className="rounded-xl border border-slate-800/90 bg-[#050A22] p-4 sm:p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                      {lang === 'bn'
                        ? `ধাপ #${String(cmp.turnIndex).padStart(2, '0')}`
                        : `Turn #${String(cmp.turnIndex).padStart(2, '0')}`}
                      {cmp.mistakeCategories.length > 0
                        ? ` · ${cmp.mistakeCategories.join(', ')}`
                        : ''}
                    </span>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={cmp.hasChanges ? 'text-amber-300' : 'text-emerald-300'}>
                        {cmp.hasChanges
                          ? lang === 'bn'
                            ? 'সংশোধন প্রস্তাবিত'
                            : 'Suggested correction'
                          : lang === 'bn'
                            ? 'ব্যাকরণগতভাবে সঠিক'
                            : 'Grammatically solid'}
                      </span>

                      <button
                        type="button"
                        onClick={() => onToggleComparisonReviewed(cmp.id)}
                        aria-pressed={isReviewed}
                        data-testid={`mark-correction-reviewed-${cmp.id}`}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          isReviewed
                            ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                            : 'border-slate-700 bg-[#081031] text-slate-300 hover:border-cyan-400/45 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {isReviewed
                            ? lang === 'bn'
                              ? 'সংশোধন পর্যালোচিত ✓'
                              : 'Correction Reviewed'
                            : lang === 'bn'
                              ? 'পর্যালোচিত চিহ্নিত করুন'
                              : 'Mark Reviewed'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Immutable Original vs Suggested Corrected */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-rose-500/20 bg-rose-950/10 p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                        {lang === 'bn'
                          ? 'মূল উত্তর (অপরিবর্তনীয় ইতিহাস)'
                          : 'ORIGINAL RESPONSE (Immutable Historical)'}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
                        {cmp.original}
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/10 p-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                        {lang === 'bn'
                          ? 'শুদ্ধ উত্তর (প্রস্তাবিত সংশোধন)'
                          : 'CORRECTED RESPONSE (Suggested Improvement)'}
                      </p>
                      <p className="mt-1.5 text-sm font-medium leading-relaxed text-emerald-100">
                        {cmp.corrected}
                      </p>
                    </div>
                  </div>

                  {/* Why It Needed Improvement */}
                  {(cmp.explanationEn || cmp.explanationBn) && (
                    <div className="rounded-lg border border-slate-800 bg-[#081031]/70 p-3.5 text-xs leading-relaxed">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                        {lang === 'bn' ? 'কেন সংশোধন প্রয়োজন' : 'WHY IT NEEDED IMPROVEMENT'}
                      </p>
                      {(explanationPref === 'en' || explanationPref === 'both') &&
                        cmp.explanationEn && (
                          <p className="mt-1.5 text-slate-200">{cmp.explanationEn}</p>
                        )}
                      {(explanationPref === 'bn' || explanationPref === 'both') &&
                        cmp.explanationBn && (
                          <p className="font-bn mt-1 text-slate-300">{cmp.explanationBn}</p>
                        )}
                    </div>
                  )}

                  {/* More Natural Alternative (Explicitly Suggested, Not Historical) */}
                  {cmp.naturalAlternative && (
                    <div className="rounded-lg border border-violet-400/25 bg-violet-950/15 p-3.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {lang === 'bn'
                            ? 'আরও স্বাভাবিক বিকল্প (প্রস্তাবিত)'
                            : 'MORE NATURAL ALTERNATIVE (Suggested)'}
                        </span>
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-100">
                        {cmp.naturalAlternative}
                      </p>
                    </div>
                  )}

                  {/* Action Row: AI Deep-Dive + Practice This Response */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-3">
                    <button
                      type="button"
                      disabled={isLoadingDive}
                      onClick={() => void handleRequestDeepDive(cmp)}
                      data-testid={`ai-deep-dive-btn-${cmp.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isLoadingDive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {deepDive
                          ? lang === 'bn'
                            ? 'AI ব্যাখ্যা পুনরায় তৈরি করুন'
                            : 'Regenerate AI Deep-Dive'
                          : lang === 'bn'
                            ? 'AI গভীর ব্যাখ্যা দেখুন (Formal / Informal / Vocab)'
                            : 'AI Deep-Dive (Formal / Informal / Vocab)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPracticeTurn(cmp.turnId)}
                      data-testid={`practice-comparison-btn-${cmp.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20 transition-colors cursor-pointer"
                    >
                      <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {lang === 'bn' ? 'এই উত্তর প্র্যাকটিস করুন' : 'Practice This Response'}
                      </span>
                    </button>
                  </div>

                  {/* Honest Error Notice if AI Deep-Dive Fails */}
                  {diveError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200"
                    >
                      {diveError}
                    </div>
                  )}

                  {/* Newly Generated On-Demand AI Deep-Dive Card */}
                  {deepDive && (
                    <div
                      data-testid={`ai-deep-dive-result-${cmp.id}`}
                      className="rounded-xl border border-cyan-400/30 bg-[#08133A] p-4 space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <span className="font-semibold text-cyan-200">
                          {lang === 'bn'
                            ? 'নতুন তৈরি AI ব্যাখ্যা (অন-ডিমান্ড · ঐতিহাসিক মূল্যায়ন নয়)'
                            : 'Newly Generated AI Explanation (On-Demand · Not Saved Historical Evidence)'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {deepDive.model}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-800 bg-[#050A22] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                            {lang === 'bn' ? 'আনুষ্ঠানিক রূপ (Formal)' : 'Formal Version'}
                          </p>
                          <p className="mt-1 text-slate-100 leading-relaxed">
                            {deepDive.formalVersionEn}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#050A22] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                            {lang === 'bn' ? 'অনানুষ্ঠানিক রূপ (Informal)' : 'Informal Version'}
                          </p>
                          <p className="mt-1 text-slate-100 leading-relaxed">
                            {deepDive.informalVersionEn}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 text-slate-200 leading-relaxed">
                        {deepDive.grammarExplanationEn && (
                          <p>
                            <span className="font-semibold text-cyan-300">
                              {lang === 'bn' ? 'ব্যাকরণ ব্যাখ্যা: ' : 'Grammar Note: '}
                            </span>
                            {deepDive.grammarExplanationEn}
                          </p>
                        )}
                        <p>
                          <span className="font-semibold text-emerald-300">
                            {lang === 'bn' ? 'শব্দভাণ্ডার উন্নতি: ' : 'Vocabulary Improvement: '}
                          </span>
                          {deepDive.vocabularyImprovementEn}
                        </p>
                        <p>
                          <span className="font-semibold text-cyan-300">
                            {lang === 'bn' ? 'প্রাসঙ্গিক বিকল্প: ' : 'Contextual Alternative: '}
                          </span>
                          {deepDive.contextualAlternativeEn}
                        </p>
                        <p>
                          <span className="font-semibold text-violet-300">
                            {lang === 'bn' ? 'নতুন প্রসঙ্গে উদাহরণ: ' : 'Example in New Context: '}
                          </span>
                          {deepDive.newContextExampleEn}
                        </p>
                        <p>
                          <span className="font-semibold text-amber-300">
                            {lang === 'bn' ? 'প্র্যাকটিস চ্যালেঞ্জ: ' : 'Practice Challenge: '}
                          </span>
                          {lang === 'bn' && deepDive.practiceChallengeBn
                            ? deepDive.practiceChallengeBn
                            : deepDive.practiceChallengeEn}
                        </p>
                        {(explanationPref === 'bn' || explanationPref === 'both') &&
                          deepDive.grammarExplanationBn && (
                            <p className="font-bn text-slate-300 pt-1 border-t border-slate-800/70">
                              {deepDive.grammarExplanationBn}
                            </p>
                          )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
