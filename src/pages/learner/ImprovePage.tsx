import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Compass,
  Flag,
  Mic,
  Repeat2,
  Search,
  Sparkles,
  Target,
  Undo2,
  Volume2,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { MistakeMicroDrillPanel } from '../../components/improve/MistakeMicroDrillPanel';
import { MistakeBrainHero } from '../../components/improve/MistakeBrainHero';
import { MistakeAnalyticsVisuals } from '../../components/improve/MistakeAnalyticsVisuals';
import { MistakeRevisionAndRecurringPanel } from '../../components/improve/MistakeRevisionAndRecurringPanel';
import { MistakeAiCoachPanel } from '../../components/improve/MistakeAiCoachPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getLessonById } from '../../domain/curriculumData';
import {
  buildMistakeCategoryDonut,
  buildMistakeMemoryOverview,
  buildMistakeTrendSeries,
  buildNeuralRelationshipMap,
  buildSmartRevisionSchedule,
  classifyExtendedMistakeCategory,
  EXTENDED_MISTAKE_CATEGORIES,
  filterAndSearchMistakes,
  getExtendedCategoryMeta,
  type ExtendedMistakeCategory,
  type MistakeSortMode,
} from '../../domain/mistakeAnalyticsEngine';
import { speakEnglishExample } from '../../utils/speechSynthesis';
import type {
  MistakeMemoryItem,
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
  const entry = map[source];
  if (!entry) {
    return lang === 'bn' ? 'অনুশীলন সেশন' : 'Practice Session';
  }
  return lang === 'bn' ? entry.bn : entry.en;
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
  if (status === 'resolved') return 'text-[#16E58B]';
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
    user,
    mistakes,
    mistakeDrillAttempts,
    profile,
    latestDiagnostic,
    recordMistakeDrillAttempt,
    reportFalseCorrection,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const expPref = profile?.explanationLanguage ?? 'both';
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ExtendedMistakeCategory>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | MistakeStatus>('all');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [showReported, setShowReported] = useState(false);
  const [sortBy, setSortBy] = useState<MistakeSortMode>('priority');

  const [activeDrillMistakeId, setActiveDrillMistakeId] = useState<string | null>(null);
  const [flaggingMistakeId, setFlaggingMistakeId] = useState<string | null>(null);
  const [selectedFlagReason, setSelectedFlagReason] = useState<string>(
    FALSE_CORRECTION_REASONS[0].en
  );

  // AI Coach interactive linkage
  const [coachTab, setCoachTab] = useState<'coach' | 'exercise'>('coach');
  const [coachFocusedMistake, setCoachFocusedMistake] = useState<MistakeMemoryItem | null>(null);
  const [autoGenSignal, setAutoGenSignal] = useState(0);

  const drillWorkbenchRef = useRef<HTMLDivElement | null>(null);
  const historySectionRef = useRef<HTMLElement | null>(null);

  // Allow deep-linking directly into a specific mistake drill via ?focus=<mistakeId>
  useEffect(() => {
    const focusId = searchParams.get('focus');
    if (focusId && mistakes.some((m) => m.id === focusId)) {
      setActiveDrillMistakeId(focusId);
    }
  }, [searchParams, mistakes]);

  const overview = useMemo(
    () => buildMistakeMemoryOverview(mistakes, mistakeDrillAttempts),
    [mistakes, mistakeDrillAttempts]
  );

  const donut = useMemo(
    () => buildMistakeCategoryDonut(mistakes, showReported),
    [mistakes, showReported]
  );

  const trend7d = useMemo(
    () => buildMistakeTrendSeries(mistakes, mistakeDrillAttempts, 7),
    [mistakes, mistakeDrillAttempts]
  );

  const trend30d = useMemo(
    () => buildMistakeTrendSeries(mistakes, mistakeDrillAttempts, 30),
    [mistakes, mistakeDrillAttempts]
  );

  const neuralGraph = useMemo(() => buildNeuralRelationshipMap(mistakes), [mistakes]);

  const revisionSchedule = useMemo(() => buildSmartRevisionSchedule(mistakes), [mistakes]);

  const activeDrillMistake = useMemo(
    () => mistakes.find((m) => m.id === activeDrillMistakeId) ?? null,
    [mistakes, activeDrillMistakeId]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<ExtendedMistakeCategory, number> = {
      verb_tense: 0,
      prepositions: 0,
      articles: 0,
      word_order: 0,
      vocabulary: 0,
      sentence_structure: 0,
      pronunciation: 0,
    };
    for (const m of mistakes) {
      if (m.falseCorrectionReported && !showReported) continue;
      const cat = classifyExtendedMistakeCategory(m);
      counts[cat]++;
    }
    return counts;
  }, [mistakes, showReported]);

  const filteredMistakes = useMemo(
    () =>
      filterAndSearchMistakes(mistakes, {
        searchText,
        status: selectedStatus,
        category: selectedCategory,
        recurringOnly,
        showReported,
        sortBy,
      }),
    [mistakes, searchText, selectedStatus, selectedCategory, recurringOnly, showReported, sortBy]
  );

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

  const scrollToElement = (el: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenDrill = (mistakeId: string) => {
    setActiveDrillMistakeId(mistakeId);
    window.setTimeout(() => {
      scrollToElement(drillWorkbenchRef.current);
    }, 60);
  };

  const handleCloseDrill = () => {
    setActiveDrillMistakeId(null);
    if (searchParams.has('focus')) {
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
  };

  const handleAskCoachAboutMistake = (mistake: MistakeMemoryItem | null) => {
    setCoachFocusedMistake(mistake);
    setCoachTab('coach');
    window.setTimeout(() => {
      scrollToElement(document.getElementById('mistake-ai-coach'));
    }, 60);
  };

  const handleGenerateAiExerciseForMistake = (mistake: MistakeMemoryItem) => {
    setCoachFocusedMistake(mistake);
    setCoachTab('exercise');
    setAutoGenSignal((n) => n + 1);
    window.setTimeout(() => {
      scrollToElement(document.getElementById('mistake-ai-coach'));
    }, 60);
  };

  const handleSelectHeroPillar = (pillar: 'grammar' | 'vocabulary' | 'speaking') => {
    if (mistakes.length === 0) return;
    if (pillar === 'vocabulary') {
      setSelectedCategory('vocabulary');
    } else if (pillar === 'speaking') {
      setSelectedCategory(categoryCounts.pronunciation > 0 ? 'pronunciation' : 'all');
    } else {
      const grammarCats: ExtendedMistakeCategory[] = [
        'verb_tense',
        'prepositions',
        'articles',
        'word_order',
        'sentence_structure',
      ];
      const topGrammarCat = grammarCats.sort(
        (a, b) => categoryCounts[b] - categoryCounts[a]
      )[0];
      setSelectedCategory(categoryCounts[topGrammarCat] > 0 ? topGrammarCat : 'all');
    }
    window.setTimeout(() => {
      scrollToElement(historySectionRef.current);
    }, 60);
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

  const learnerLevelLabel =
    latestDiagnostic?.estimatedStartingBand ?? profile?.selfEstimatedLevel ?? 'Intermediate';

  return (
    <LearnerShell
      title={t.workspace.modules.improveTitle}
      subtitle={
        lang === 'bn'
          ? 'নিউরাল মিস্টেক মেমোরি ইঞ্জিন — পুনরাবৃত্ত ভুল শনাক্তকরণ, স্মার্ট স্পেসড রিভিশন ও ব্যক্তিগত AI লার্নিং কোচ।'
          : 'Neural Mistake Memory Engine — real error analytics, recurring habit detection, spaced revision, and live AI coaching.'
      }
    >
      <div className="space-y-7">
        {/* 1. SIGNATURE 3D GLOWING NEURAL BRAIN HERO */}
        <MistakeBrainHero
          overview={overview}
          topRecommendedMistake={revisionSchedule.topRecommended?.mistake ?? null}
          onStartPracticing={() => {
            if (revisionSchedule.topRecommended) {
              handleOpenDrill(revisionSchedule.topRecommended.mistake.id);
            }
          }}
          onOpenCoach={() => handleAskCoachAboutMistake(revisionSchedule.topRecommended?.mistake ?? null)}
          onSelectPillar={handleSelectHeroPillar}
        />

        {/* 2. ACTIVE 2-STEP TARGETED MICRO-DRILL WORKBENCH */}
        <div ref={drillWorkbenchRef}>
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
        </div>

        {/* 3. EMPTY STATE GUIDANCE OR FULL REAL-DATA ANALYTICS SUITE */}
        {mistakes.length === 0 ? (
          <section
            aria-label="Empty Mistake Memory Onboarding"
            className="lv-glass-card rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-[#16E58B]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? '০টি সংরক্ষিত ভুল — সম্পূর্ণ বাস্তব ডেটা-চালিত মেমোরি'
                  : '0 mistake patterns recorded yet — 100% real activity powered'}
              </span>
            </div>
            <h2 className="font-portal mt-2 text-xl font-bold text-white">
              {t.workspace.modules.improveEmptyTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              {t.workspace.modules.improveEmptyDesc}
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link
                to="/app/speak"
                className="lv-glow-card-hover flex items-center justify-between gap-3 rounded-xl border border-cyan-400/30 bg-[#081236] p-4 text-left"
              >
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold text-[#00D9FF]">
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'AI স্পিকিং স্টুডিও' : 'AI Speaking Studio'}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'কথা বলুন বা লিখুন — AI বাস্তব ভুল শনাক্ত করবে'
                      : 'Speak or write turns to capture live grammar & vocabulary patterns'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
              </Link>

              <Link
                to="/app/learn"
                className="lv-glow-card-hover flex items-center justify-between gap-3 rounded-xl border border-violet-400/30 bg-[#081236] p-4 text-left"
              >
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold text-violet-300">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'একাডেমি লেসন' : 'Academy Lessons'}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'গাইডেড ও অ্যাসেসমেন্ট ড্রিল থেকে ভুলগুলো স্বয়ংক্রিয়ভাবে যুক্ত হবে'
                      : 'Guided & assessment errors sync automatically to your memory'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-violet-300" aria-hidden="true" />
              </Link>

              <Link
                to="/diagnostic"
                className="lv-glow-card-hover flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-[#081236] p-4 text-left"
              >
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold text-[#16E58B]">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    <span>{lang === 'bn' ? '৫-দক্ষতা মূল্যায়ন' : '5-Skill Diagnostic'}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'প্রাথমিক বেসলাইন তৈরি করে আপনার প্রথম প্যাটার্ন ম্যাপ করুন'
                      : 'Establish your communication baseline and first pattern map'}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* 4. REAL-DATA ANALYTICS VISUALIZATIONS (KPIs, Trend Ring/Lines, Donut, Neural Map) */}
            <MistakeAnalyticsVisuals
              overview={overview}
              donut={donut}
              trend7d={trend7d}
              trend30d={trend30d}
              neuralGraph={neuralGraph}
              mistakes={mistakes}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
              }}
              onPracticeMistake={handleOpenDrill}
              onAskCoachAboutMistake={(m) => handleAskCoachAboutMistake(m)}
            />

            {/* 5. RECURRING MISTAKES SPOTLIGHT + RECOMMENDED PRACTICE + SMART REVISION SCHEDULE */}
            <MistakeRevisionAndRecurringPanel
              schedule={revisionSchedule}
              onPracticeMistake={handleOpenDrill}
              onGenerateAiExercise={handleGenerateAiExerciseForMistake}
            />
          </>
        )}

        {/* 6. FUTURISTIC AI LEARNING COACH + AI PERSONALIZED EXERCISE GENERATOR (Always live) */}
        <MistakeAiCoachPanel
          mistakes={mistakes}
          focusedMistake={coachFocusedMistake}
          activeTab={coachTab}
          onChangeTab={setCoachTab}
          onSelectFocusedMistake={setCoachFocusedMistake}
          explanationPref={expPref}
          learnerLevel={learnerLevelLabel}
          userId={user?.id}
          allowTelemetry={profile?.privacyConsent?.logAiEvaluations !== false}
          autoGenerateSignal={autoGenSignal}
          onRecordDrillResult={async (result) => {
            const res = await recordMistakeDrillAttempt(result);
            return res.updatedMistake;
          }}
        />

        {/* 7. SEARCHABLE & SORTABLE MISTAKE HISTORY & RECORDS EXPLORER */}
        {mistakes.length > 0 && (
          <section
            ref={historySectionRef}
            aria-label="Searchable Mistake History and Records"
            data-testid="mistake-history-explorer"
            className="space-y-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-portal text-lg font-bold text-white sm:text-xl">
                  {lang === 'bn'
                    ? 'সংরক্ষিত ভুলের ইতিহাস ও রেকর্ড'
                    : 'Mistake History & Pattern Records'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'কীওয়ার্ড দিয়ে খুঁজুন, ক্যাটাগরি ও স্ট্যাটাস অনুযায়ী ফিল্টার করুন, এবং সরাসরি সংশোধন অনুশীলন শুরু করুন।'
                    : 'Search by keyword, filter by category or mastery status, run targeted 2-step drills, or generate custom AI practice.'}
                </p>
              </div>
              <p className="font-mono text-xs text-slate-400 tabular-nums">
                {lang === 'bn'
                  ? `${filteredMistakes.length} / ${mistakes.length} টি রেকর্ড প্রদর্শিত`
                  : `Showing ${filteredMistakes.length} of ${mistakes.length} records`}
              </p>
            </div>

            {/* Search + Status + Sort + Category Filter Toolbar */}
            <div className="lv-glass-card space-y-3.5 rounded-2xl p-4 sm:p-5">
              {/* Row 1: Search Input + Sort Dropdown */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <label htmlFor="mistake-history-search" className="sr-only">
                    {lang === 'bn' ? 'ভুলের ইতিহাস খুঁজুন' : 'Search mistake history'}
                  </label>
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="mistake-history-search"
                    type="search"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    data-testid="mistake-search-input"
                    placeholder={
                      lang === 'bn'
                        ? 'ভুল বাক্য, সঠিক রূপ বা বাংলা ব্যাখ্যা দিয়ে খুঁজুন...'
                        : 'Search phrases, corrections, patterns, or explanations...'
                    }
                    className="lv-auth-input min-h-[42px] w-full rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none sm:text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="mistake-sort-select" className="sr-only">
                    {lang === 'bn' ? 'সাজানোর ক্রম' : 'Sort mistakes'}
                  </label>
                  <select
                    id="mistake-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as MistakeSortMode)}
                    className="lv-auth-input min-h-[42px] rounded-xl px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none"
                  >
                    <option value="priority">
                      {lang === 'bn' ? 'ক্রম: সর্বোচ্চ অগ্রাধিকার' : 'Sort: Smart Priority'}
                    </option>
                    <option value="recurring">
                      {lang === 'bn' ? 'ক্রম: সবচেয়ে পুনরাবৃত্ত' : 'Sort: Most Recurring'}
                    </option>
                    <option value="recent">
                      {lang === 'bn' ? 'ক্রম: সর্বশেষ দেখা' : 'Sort: Most Recent'}
                    </option>
                    <option value="review_due">
                      {lang === 'bn' ? 'ক্রম: রিভিউ সময়সূচি' : 'Sort: Review Due Soonest'}
                    </option>
                  </select>

                  <button
                    type="button"
                    aria-pressed={recurringOnly}
                    onClick={() => setRecurringOnly((v) => !v)}
                    data-testid="filter-recurring-toggle"
                    className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      recurringOnly
                        ? 'border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200'
                        : 'border-slate-800 bg-[#060C22] text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'শুধু পুনরাবৃত্ত (২+)' : 'Recurring Only (2+)'}</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Status Segmented Control + Show Reported Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
                <div
                  role="group"
                  aria-label="Filter mistakes by status"
                  className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-[#060C22] p-1"
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
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedStatus === st.id
                          ? 'bg-[#087BFF] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang === 'bn' ? st.bn : st.en}
                    </button>
                  ))}
                </div>

                {overview.reportedCount > 0 && (
                  <button
                    type="button"
                    aria-pressed={showReported}
                    onClick={() => setShowReported((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      showReported
                        ? 'border-[#F59E0B]/60 bg-[#F59E0B]/10 text-amber-200'
                        : 'border-slate-800 bg-[#060C22] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {lang === 'bn'
                        ? `রিপোর্টকৃত ভুল সংশোধন (${overview.reportedCount})`
                        : `Show Reported False Corrections (${overview.reportedCount})`}
                    </span>
                  </button>
                )}
              </div>

              {/* Row 3: 7 Category Filter Buttons (6 Core + Pronunciation & Clarity) */}
              <div
                role="group"
                aria-label="Filter mistakes by category"
                className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3"
              >
                <button
                  type="button"
                  aria-pressed={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'border-[#00D9FF] bg-[#00D9FF]/15 text-white'
                      : 'border-slate-800 bg-[#060C22] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {lang === 'bn'
                    ? `সব ধরন (${overview.totalValid + (showReported ? overview.reportedCount : 0)})`
                    : `All Categories (${
                        overview.totalValid + (showReported ? overview.reportedCount : 0)
                      })`}
                </button>

                {EXTENDED_MISTAKE_CATEGORIES.map((cat) => {
                  const count = categoryCounts[cat.id];
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected
                          ? 'border-[#873BFF] bg-[#873BFF]/25 text-white'
                          : 'border-slate-800 bg-[#060C22] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{lang === 'bn' ? cat.labelBn : cat.labelEn}</span>
                      <span className="ml-1.5 font-mono opacity-80 tabular-nums">({count})</span>
                    </button>
                  );
                })}
              </div>

              {selectedCategory === 'pronunciation' && (
                <p className="text-[11px] text-amber-200/90">
                  {lang === 'bn'
                    ? 'স্বচ্ছতা নোট: এখানে স্পিকিং স্টুডিও থেকে সংরক্ষিত উচ্চারণ/স্পষ্টতার টেক্সট নোট দেখানো হয় — কোনো ভুয়া ফোনিম অ্যাকুস্টিক স্কোর তৈরি করা হয় না।'
                    : 'Honesty note: Pronunciation & Clarity tracks text/transcript clarity notes captured in Speaking Studio — no acoustic phoneme score is fabricated.'}
                </p>
              )}
            </div>

            {/* Filtered Mistake Cards */}
            {filteredMistakes.length === 0 ? (
              <div className="lv-glass-card rounded-2xl p-6 text-center">
                <p className="text-sm font-medium text-slate-200">
                  {lang === 'bn'
                    ? 'আপনার সার্চ বা ফিল্টারের সাথে কোনো ভুল মেলেনি।'
                    : 'No mistake records match your current search and filter criteria.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                    setRecurringOnly(false);
                  }}
                  className="mt-3 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 cursor-pointer"
                >
                  {lang === 'bn' ? 'সব ফিল্টার রিসেট করুন' : 'Reset all filters'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMistakes.map((item) => {
                  const extCat = classifyExtendedMistakeCategory(item);
                  const catMeta = getExtendedCategoryMeta(extCat);
                  const sourceLesson = item.lessonId ? getLessonById(item.lessonId) : undefined;
                  const isAiDetected = item.source === 'speaking_studio';
                  const nextReviewFormatted = formatDate(item.nextReviewAt);
                  const isFlagPanelOpen = flaggingMistakeId === item.id;

                  return (
                    <article
                      key={item.id}
                      className={`lv-glass-card rounded-2xl p-5 sm:p-6 transition-colors ${
                        item.falseCorrectionReported
                          ? 'border-amber-500/40 opacity-85'
                          : activeDrillMistakeId === item.id
                            ? 'border-[#00D9FF]/70 shadow-[0_0_32px_rgba(0,217,255,0.16)]'
                            : ''
                      }`}
                    >
                      {/* Clean Metadata Line */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold" style={{ color: catMeta.color }}>
                            {lang === 'bn' ? catMeta.labelBn : catMeta.labelEn}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className={`font-semibold ${statusColorClass(item.status)}`}>
                            {formatStatusLabel(item.status, lang)}
                          </span>
                          {item.occurrences >= 2 && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="font-semibold text-[#E42BFF]">
                                {lang === 'bn' ? 'পুনরাবৃত্ত' : 'Recurring'}
                              </span>
                            </>
                          )}
                          {item.falseCorrectionReported && (
                            <>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="font-semibold text-[#F59E0B]">
                                {lang === 'bn'
                                  ? 'ভুল সংশোধন হিসেবে রিপোর্টকৃত'
                                  : 'Reported False Correction'}
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
                              <span className="inline-flex items-center gap-1 text-violet-300">
                                <CalendarClock className="h-3 w-3" aria-hidden="true" />
                                {lang === 'bn'
                                  ? `রিভিউ: ${nextReviewFormatted}`
                                  : `Review ${nextReviewFormatted}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <h3 className="font-portal mt-2.5 text-base font-bold text-white">
                        {lang === 'bn' ? item.patternBn : item.patternEn}
                      </h3>

                      {/* Wrong vs Corrected Side-by-Side Comparison */}
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-rose-500/25 bg-[#060C22]/90 p-3.5">
                          <p className="text-xs text-slate-400">
                            {t.diagnostic.results.yourAnswer}
                          </p>
                          <p className="mt-1 text-sm font-medium text-rose-300">
                            {item.userExample}
                          </p>
                        </div>
                        <div className="flex items-start justify-between gap-2 rounded-xl border border-cyan-400/35 bg-[#060C22]/90 p-3.5">
                          <div>
                            <p className="text-xs text-[#00D9FF]">
                              {t.diagnostic.results.correctAnswer}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#16E58B]">
                              {item.correctedExample}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              speakEnglishExample({ text: item.correctedExample, rate: 1.0 })
                            }
                            aria-label={`Listen to ${item.correctedExample}`}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-cyan-300 hover:border-cyan-400 hover:text-white cursor-pointer"
                          >
                            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Bilingual Explanations */}
                      <div className="mt-4 space-y-1.5 text-sm leading-relaxed">
                        {(expPref === 'bn' || expPref === 'both') && (
                          <p className="font-bn text-slate-200">
                            <span className="font-semibold text-violet-300">বাংলা ব্যাখ্যা: </span>
                            {item.explanationBn}
                          </p>
                        )}
                        {(expPref === 'en' || expPref === 'both') && (
                          <p className="text-slate-300">
                            <span className="font-semibold text-[#00D9FF]">English: </span>
                            {item.explanationEn}
                          </p>
                        )}
                      </div>

                      {item.falseCorrectionReported && item.falseCorrectionReason && (
                        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                          <span className="font-semibold">
                            {lang === 'bn' ? 'রিপোর্টের কারণ: ' : 'Reported reason: '}
                          </span>
                          {item.falseCorrectionReason}
                        </div>
                      )}

                      {/* Inline Report False Correction Selector */}
                      {isFlagPanelOpen && !item.falseCorrectionReported && (
                        <div className="mt-4 space-y-3 rounded-xl border border-amber-500/40 bg-[#060C22] p-4">
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
                              className="rounded-lg bg-[#F59E0B] px-3.5 py-1.5 text-xs font-semibold text-[#05091F] hover:bg-amber-400 transition-colors cursor-pointer"
                            >
                              {lang === 'bn'
                                ? 'রিপোর্ট নিশ্চিত করুন'
                                : 'Confirm False Correction Flag'}
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

                      {/* Action Row */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {!item.falseCorrectionReported && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDrill(item.id)}
                                className="lv-portal-btn inline-flex min-h-[38px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
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

                              <button
                                type="button"
                                onClick={() => handleGenerateAiExerciseForMistake(item)}
                                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-violet-400/35 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
                                <span>{lang === 'bn' ? 'AI চ্যালেঞ্জ' : 'AI Exercise'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAskCoachAboutMistake(item)}
                                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#060C22] px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <span>{lang === 'bn' ? 'কোচকে জিজ্ঞাসা' : 'Ask Coach'}</span>
                              </button>
                            </>
                          )}

                          {sourceLesson && (
                            <Link
                              to={`/app/learn/${sourceLesson.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200"
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
          </section>
        )}
      </div>
    </LearnerShell>
  );
}
