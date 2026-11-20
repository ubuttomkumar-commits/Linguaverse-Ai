import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Flag,
  Mic,
  Target,
  Undo2,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { MistakeMicroDrillPanel } from '../../components/improve/MistakeMicroDrillPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getLessonById } from '../../domain/curriculumData';
import {
  classifyMistakeCategory,
  getMistakeCategoryMeta,
  MISTAKE_FILTER_CATEGORIES,
} from '../../domain/mistakeMemoryEngine';
import type {
  MistakeFilterCategory,
  MistakeSeverity,
  MistakeSource,
  MistakeStatus,
} from '../../types/domain';

function formatMistakeSource(source: MistakeSource, lang: 'en' | 'bn'): string {
  const map: Record<MistakeSource, { en: string; bn: string }> = {
    diagnostic: { en: 'Diagnostic', bn: 'ডায়াগনস্টিক' },
    lesson_guided: { en: 'Lesson · Guided Practice', bn: 'লেসন · নির্দেশিত অনুশীলন' },
    lesson_independent: { en: 'Lesson · Independent Practice', bn: 'লেসন · স্বাধীন অনুশীলন' },
    lesson_assessment: { en: 'Lesson · Assessment', bn: 'লেসন · মূল্যায়ন' },
    speaking_studio: { en: 'AI Speaking Studio', bn: 'AI স্পিকিং স্টুডিও' },
  };
  return lang === 'bn' ? map[source].bn : map[source].en;
}

function formatSeverity(severity: MistakeSeverity, lang: 'en' | 'bn'): string {
  if (severity === 'high') return lang === 'bn' ? 'উচ্চ গুরুত্ব' : 'High severity';
  if (severity === 'low') return lang === 'bn' ? 'সামান্য' : 'Low severity';
  return lang === 'bn' ? 'মাঝারি' : 'Medium severity';
}

function formatStatusLabel(status: MistakeStatus, lang: 'en' | 'bn'): string {
  if (status === 'resolved') return lang === 'bn' ? 'সমাধান হয়েছে' : 'Resolved';
  if (status === 'practicing') return lang === 'bn' ? 'অনুশীলনরত' : 'Practicing';
  return lang === 'bn' ? 'সক্রিয়' : 'Active';
}

function statusColorClass(status: MistakeStatus): string {
  if (status === 'resolved') return 'text-emerald-400';
  if (status === 'practicing') return 'text-[#F59E0B]';
  return 'text-rose-400';
}

const FALSE_CORRECTION_REASONS = [
  {
    id: 'natural_in_context',
    en: 'My phrasing was already natural in this context',
    bn: 'এই প্রসঙ্গে আমার বাক্যটি ইতিমধ্যেই স্বাভাবিক ছিল',
  },
  {
    id: 'stt_misheard',
    en: 'Speech-to-text misheard what I actually said',
    bn: 'স্পিচ-টু-টেক্সট আমার কথা ভুলভাবে লিখেছে',
  },
  {
    id: 'explanation_inaccurate',
    en: 'The grammar rule or Bangla explanation seems inaccurate',
    bn: 'ব্যাকরণের নিয়ম বা বাংলা ব্যাখ্যাটি সঠিক মনে হয়নি',
  },
];

export function ImprovePage() {
  const { lang, t } = useLanguage();
  const {
    mistakes,
    profile,
    recordMistakeDrillAttempt,
    reportFalseCorrection,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const expPref = profile?.explanationLanguage ?? 'both';
  const [selectedCategory, setSelectedCategory] = useState<'all' | MistakeFilterCategory>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | MistakeStatus>('all');
  const [showReported, setShowReported] = useState(false);

  const [activeDrillMistakeId, setActiveDrillMistakeId] = useState<string | null>(null);
  const [flaggingMistakeId, setFlaggingMistakeId] = useState<string | null>(null);
  const [selectedFlagReason, setSelectedFlagReason] = useState<string>(
    FALSE_CORRECTION_REASONS[0].en
  );

  // Allow deep-linking directly into a specific mistake drill via ?focus=<mistakeId>
  useEffect(() => {
    const focusId = searchParams.get('focus');
    if (focusId && mistakes.some((m) => m.id === focusId)) {
      setActiveDrillMistakeId(focusId);
    }
  }, [searchParams, mistakes]);

  const activeDrillMistake = useMemo(
    () => mistakes.find((m) => m.id === activeDrillMistakeId) ?? null,
    [mistakes, activeDrillMistakeId]
  );

  const summaryCounts = useMemo(() => {
    const valid = mistakes.filter((m) => !m.falseCorrectionReported);
    return {
      total: valid.length,
      active: valid.filter((m) => m.status === 'active').length,
      practicing: valid.filter((m) => m.status === 'practicing').length,
      resolved: valid.filter((m) => m.status === 'resolved').length,
      reported: mistakes.filter((m) => Boolean(m.falseCorrectionReported)).length,
    };
  }, [mistakes]);

  const categoryCounts = useMemo(() => {
    const counts: Record<MistakeFilterCategory, number> = {
      verb_tense: 0,
      prepositions: 0,
      articles: 0,
      word_order: 0,
      vocabulary: 0,
      sentence_structure: 0,
    };
    for (const m of mistakes) {
      if (m.falseCorrectionReported && !showReported) continue;
      const cat = classifyMistakeCategory(m.category, m.domain);
      counts[cat]++;
    }
    return counts;
  }, [mistakes, showReported]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter((item) => {
      if (!showReported && item.falseCorrectionReported) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (selectedCategory !== 'all') {
        const canonical = classifyMistakeCategory(item.category, item.domain);
        if (canonical !== selectedCategory) return false;
      }
      return true;
    });
  }, [mistakes, showReported, selectedStatus, selectedCategory]);

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  const handleCloseDrill = () => {
    setActiveDrillMistakeId(null);
    if (searchParams.has('focus')) {
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
  };

  const handleSubmitFlag = async (mistakeId: string) => {
    await reportFalseCorrection({
      mistakeId,
      reported: true,
      reason: selectedFlagReason,
    });
    setFlaggingMistakeId(null);
    if (activeDrillMistakeId === mistakeId) {
      handleCloseDrill();
    }
  };

  const handleUndoFlag = async (mistakeId: string) => {
    await reportFalseCorrection({
      mistakeId,
      reported: false,
    });
  };

  return (
    <LearnerShell
      title={t.workspace.modules.improveTitle}
      subtitle={
        lang === 'bn'
          ? 'একাডেমি ও AI স্পিকিং স্টুডিও থেকে সংরক্ষিত প্রতিটি ভুলের পুনরাবৃত্তি, বাংলা ব্যাখ্যা এবং টার্গেটেড ফিক্স ড্রিল।'
          : 'Real error patterns from Academy lessons and AI Speaking Studio, with targeted micro-drills and false-correction reporting.'
      }
    >
      {mistakes.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{lang === 'bn' ? '০টি সংরক্ষিত ভুলের ধরন' : '0 mistake patterns recorded yet'}</span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-white">
            {t.workspace.modules.improveEmptyTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t.workspace.modules.improveEmptyDesc}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/app/speak"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'AI স্পিকিং স্টুডিও শুরু করুন' : 'Practice in AI Speaking Studio'}</span>
            </Link>
            <Link
              to="/app/learn"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap"
            >
              <span>{lang === 'bn' ? 'একাডেমি লেসন শুরু করুন' : 'Start an Academy Lesson'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Summary Ledger (Single-elevation, zero pills, tabular figures) */}
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-[#111827] p-5 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-400">
                {lang === 'bn' ? 'সক্রিয় ভুল (Active)' : 'Active Patterns'}
              </dt>
              <dd className="mt-1 font-mono text-2xl font-bold text-rose-400 tabular-nums">
                {summaryCounts.active}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">
                {lang === 'bn' ? 'অনুশীলনরত (Practicing)' : 'Practicing'}
              </dt>
              <dd className="mt-1 font-mono text-2xl font-bold text-[#F59E0B] tabular-nums">
                {summaryCounts.practicing}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">
                {lang === 'bn' ? 'সমাধান হয়েছে (Resolved)' : 'Resolved'}
              </dt>
              <dd className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                {summaryCounts.resolved}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">
                {lang === 'bn' ? 'ভুল সংশোধন রিপোর্ট' : 'False Flags Reported'}
              </dt>
              <dd className="mt-1 font-mono text-2xl font-bold text-slate-300 tabular-nums">
                {summaryCounts.reported}
              </dd>
            </div>
          </dl>

          {/* Active Targeted Micro-Drill Workbench (renders immediately when user clicks Fix This Mistake) */}
          {activeDrillMistake && (
            <MistakeMicroDrillPanel
              key={activeDrillMistake.id}
              mistake={activeDrillMistake}
              explanationPref={expPref}
              onCompleteDrill={async (result) => {
                const res = await recordMistakeDrillAttempt(result);
                return res.updatedMistake;
              }}
              onClose={handleCloseDrill}
            />
          )}

          {/* Filter Toolbar: Status Segmented Control + 6 Canonical Categories */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Status Filter */}
              <div
                role="group"
                aria-label="Filter mistakes by status"
                className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-[#0A0F1C] p-1"
              >
                {(
                  [
                    { id: 'all', en: 'All', bn: 'সব' },
                    { id: 'active', en: 'Active', bn: 'সক্রিয়' },
                    { id: 'practicing', en: 'Practicing', bn: 'অনুশীলনরত' },
                    { id: 'resolved', en: 'Resolved', bn: 'সমাধানকৃত' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    aria-pressed={selectedStatus === st.id}
                    onClick={() => setSelectedStatus(st.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedStatus === st.id
                        ? 'bg-[#3B82F6] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'bn' ? st.bn : st.en}
                  </button>
                ))}
              </div>

              {/* Show Reported False Corrections Toggle */}
              {summaryCounts.reported > 0 && (
                <button
                  type="button"
                  aria-pressed={showReported}
                  onClick={() => setShowReported((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    showReported
                      ? 'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-amber-200'
                      : 'border-slate-800 bg-[#0A0F1C] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {lang === 'bn'
                      ? `রিপোর্টকৃত ভুল সংশোধন দেখুন (${summaryCounts.reported})`
                      : `Show Reported False Corrections (${summaryCounts.reported})`}
                  </span>
                </button>
              )}
            </div>

            {/* 6 Core Category Filter Buttons */}
            <div
              role="group"
              aria-label="Filter mistakes by category"
              className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3"
            >
              <button
                type="button"
                aria-pressed={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'border-[#8B5CF6] bg-[#8B5CF6] text-white'
                    : 'border-slate-800 bg-[#0A0F1C] text-slate-300 hover:border-slate-700'
                }`}
              >
                {lang === 'bn'
                  ? `সব ধরন (${summaryCounts.total + (showReported ? summaryCounts.reported : 0)})`
                  : `All Categories (${summaryCounts.total + (showReported ? summaryCounts.reported : 0)})`}
              </button>

              {MISTAKE_FILTER_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id];
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'border-[#8B5CF6] bg-[#8B5CF6] text-white'
                        : 'border-slate-800 bg-[#0A0F1C] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{lang === 'bn' ? cat.labelBn : cat.labelEn}</span>
                    <span className="ml-1.5 font-mono opacity-80 tabular-nums">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtered Mistake Cards */}
          {filteredMistakes.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 text-center">
              <p className="text-sm font-medium text-slate-300">
                {lang === 'bn'
                  ? 'নির্বাচিত ফিল্টারে কোনো ভুল পাওয়া যায়নি।'
                  : 'No mistake patterns match the selected category and status filter.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="mt-3 text-xs font-semibold text-[#3B82F6] hover:text-blue-400 cursor-pointer"
              >
                {lang === 'bn' ? 'সব ফিল্টার রিসেট করুন' : 'Reset all filters'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMistakes.map((item) => {
                const canonicalCat = classifyMistakeCategory(item.category, item.domain);
                const catMeta = getMistakeCategoryMeta(canonicalCat);
                const sourceLesson = item.lessonId ? getLessonById(item.lessonId) : undefined;
                const isAiDetected = item.source === 'speaking_studio';
                const nextReviewFormatted = formatDate(item.nextReviewAt);
                const isFlagPanelOpen = flaggingMistakeId === item.id;

                return (
                  <article
                    key={item.id}
                    className={`rounded-xl border bg-[#111827] p-5 sm:p-6 ${
                      item.falseCorrectionReported
                        ? 'border-amber-500/40 opacity-85'
                        : activeDrillMistakeId === item.id
                          ? 'border-[#3B82F6]'
                          : 'border-slate-800'
                    }`}
                  >
                    {/* Clean Unboxed Metadata Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-[#8B5CF6]">
                          {lang === 'bn' ? catMeta.labelBn : catMeta.labelEn}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className={`font-semibold ${statusColorClass(item.status)}`}>
                          {formatStatusLabel(item.status, lang)}
                        </span>
                        {item.falseCorrectionReported && (
                          <>
                            <span aria-hidden="true" className="text-slate-600">
                              ·
                            </span>
                            <span className="font-semibold text-[#F59E0B]">
                              {lang === 'bn' ? 'ভুল সংশোধন হিসেবে রিপোর্টকৃত' : 'Reported False Correction'}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-slate-400 tabular-nums">
                        <span>
                          {lang === 'bn'
                            ? `${item.occurrences} বার পুনরাবৃত্ত`
                            : `Observed ${item.occurrences}x`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatMistakeSource(item.source, lang)}</span>
                        {item.severity && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{formatSeverity(item.severity, lang)}</span>
                          </>
                        )}
                        {nextReviewFormatted && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-[#8B5CF6]">
                              <CalendarClock className="h-3 w-3" aria-hidden="true" />
                              {lang === 'bn'
                                ? `রিভিউ: ${nextReviewFormatted}`
                                : `Review ${nextReviewFormatted}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <h2 className="mt-2.5 text-base font-semibold text-white">
                      {lang === 'bn' ? item.patternBn : item.patternEn}
                    </h2>

                    {/* Original vs Corrected Side-by-Side Comparison */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
                        <p className="text-xs text-slate-400">{t.diagnostic.results.yourAnswer}</p>
                        <p className="mt-1 text-sm font-medium text-rose-300">{item.userExample}</p>
                      </div>
                      <div className="rounded-lg border border-[#3B82F6]/40 bg-[#0A0F1C] p-3.5">
                        <p className="text-xs text-[#3B82F6]">
                          {t.diagnostic.results.correctAnswer}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-emerald-300">
                          {item.correctedExample}
                        </p>
                      </div>
                    </div>

                    {/* Bilingual Bangla + English Explanation */}
                    <div className="mt-4 space-y-1.5 text-sm leading-relaxed">
                      {(expPref === 'bn' || expPref === 'both') && (
                        <p className="font-bn text-slate-200">
                          <span className="font-semibold text-[#8B5CF6]">বাংলা ব্যাখ্যা: </span>
                          {item.explanationBn}
                        </p>
                      )}
                      {(expPref === 'en' || expPref === 'both') && (
                        <p className="text-slate-300">
                          <span className="font-semibold text-[#3B82F6]">English: </span>
                          {item.explanationEn}
                        </p>
                      )}
                    </div>

                    {item.falseCorrectionReported && item.falseCorrectionReason && (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                        <span className="font-semibold">
                          {lang === 'bn' ? 'রিপোর্টের কারণ: ' : 'Reported reason: '}
                        </span>
                        {item.falseCorrectionReason}
                      </div>
                    )}

                    {/* Inline Report False Correction Selector */}
                    {isFlagPanelOpen && !item.falseCorrectionReported && (
                      <div className="mt-4 space-y-3 rounded-lg border border-amber-500/40 bg-[#0A0F1C] p-4">
                        <p className="text-xs font-semibold text-amber-200">
                          {lang === 'bn'
                            ? 'কেন এই AI সংশোধনটি সঠিক নয়? একটি কারণ বেছে নিন:'
                            : 'Why do you think this AI correction is inaccurate?'}
                        </p>
                        <div className="space-y-2">
                          {FALSE_CORRECTION_REASONS.map((r) => (
                            <label
                              key={r.id}
                              className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={`flag-reason-${item.id}`}
                                checked={selectedFlagReason === r.en}
                                onChange={() => setSelectedFlagReason(r.en)}
                                className="accent-[#F59E0B]"
                              />
                              <span>{lang === 'bn' ? r.bn : r.en}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => void handleSubmitFlag(item.id)}
                            className="rounded-lg bg-[#F59E0B] px-3.5 py-1.5 text-xs font-semibold text-[#0A0F1C] hover:bg-amber-400 transition-colors cursor-pointer"
                          >
                            {lang === 'bn' ? 'রিপোর্ট নিশ্চিত করুন' : 'Confirm False Correction Flag'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setFlaggingMistakeId(null)}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Row: Fix This Mistake + Related Lesson + Report False Correction */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {!item.falseCorrectionReported && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDrillMistakeId(item.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Target className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {item.status === 'resolved'
                                ? lang === 'bn'
                                  ? 'আবার অনুশীলন করুন'
                                  : 'Retest Pattern'
                                : lang === 'bn'
                                  ? 'এই ভুলটি ঠিক করুন'
                                  : 'Fix This Mistake'}
                            </span>
                          </button>
                        )}

                        {sourceLesson && (
                          <Link
                            to={`/app/learn/${sourceLesson.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
                          >
                            <span>
                              {lang === 'bn'
                                ? `সম্পর্কিত লেসন: ${sourceLesson.titleBn}`
                                : `Lesson: ${sourceLesson.titleEn}`}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        )}
                      </div>

                      {/* Report False Correction on AI-detected mistakes */}
                      {isAiDetected && (
                        <div>
                          {item.falseCorrectionReported ? (
                            <button
                              type="button"
                              onClick={() => void handleUndoFlag(item.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>
                                {lang === 'bn' ? 'রিপোর্ট প্রত্যাহার করুন' : 'Undo False Flag'}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFlagReason(FALSE_CORRECTION_REASONS[0].en);
                                setFlaggingMistakeId(isFlagPanelOpen ? null : item.id);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>
                                {lang === 'bn'
                                  ? 'ভুল সংশোধন রিপোর্ট করুন'
                                  : 'Report False Correction'}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </LearnerShell>
  );
}
