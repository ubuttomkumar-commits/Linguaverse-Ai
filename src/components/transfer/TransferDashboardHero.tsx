import { lazy, Suspense } from 'react';
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  Compass,
  PlayCircle,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type {
  TransferAttemptRecord,
  TransferScenarioCategory,
  TransferSessionDraft,
} from '../../types/domain';
import {
  getTransferUniverseScenario,
  type PersonalizedAdaptationBrief,
  type TransferDashboardMetrics,
} from '../../domain/transferLabUniverseEngine';
import type { TransferRealmSummary } from './TransferLabCanvas3D';

const TransferLabCanvas3D = lazy(() => import('./TransferLabCanvas3D'));

interface TransferDashboardHeroProps {
  learnerName: string;
  targetLanguageLabel: string;
  currentObjectiveLabel: string;
  metrics: TransferDashboardMetrics;
  adaptation: PersonalizedAdaptationBrief;
  activeDraft: TransferSessionDraft | null;
  recentAttempts: TransferAttemptRecord[];
  realms: TransferRealmSummary[];
  selectedCategory: TransferScenarioCategory | 'all';
  prefer2DStage: boolean;
  onToggleStageMode: (prefer2D: boolean) => void;
  onSelectCategory: (category: TransferScenarioCategory | 'all') => void;
  onStartScenario: (scenarioId: string) => void;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
  onInspectAttempt: (attempt: TransferAttemptRecord) => void;
}

export function TransferDashboardHero({
  learnerName,
  targetLanguageLabel,
  currentObjectiveLabel,
  metrics,
  adaptation,
  activeDraft,
  recentAttempts,
  realms,
  selectedCategory,
  prefer2DStage,
  onToggleStageMode,
  onSelectCategory,
  onStartScenario,
  onResumeDraft,
  onDiscardDraft,
  onInspectAttempt,
}: TransferDashboardHeroProps) {
  const { lang } = useLanguage();

  const draftScenario = activeDraft ? getTransferUniverseScenario(activeDraft.scenarioId) : null;
  const draftLearnerTurns = activeDraft
    ? activeDraft.messages.filter((t) => t.role === 'learner').length
    : 0;

  return (
    <section className="space-y-6">
      {/* Main Futuristic Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#08102F] via-[#060C24] to-[#0B1130] p-6 shadow-2xl sm:p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Hero Narrative & Orientation */}
          <div className="space-y-5 lg:col-span-6">
            <div className="text-xs font-medium tracking-wide text-cyan-300">
              <span>{lang === 'bn' ? `স্বাগতম, ${learnerName}` : `Welcome back, ${learnerName}`}</span>
              <span className="mx-2 text-slate-600">·</span>
              <span className="text-slate-300">
                {lang === 'bn' ? `লক্ষ্য ভাষা: ${targetLanguageLabel}` : `Target Language: ${targetLanguageLabel}`}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {lang === 'bn'
                  ? 'আপনার শেখা জ্ঞানকে বাস্তব যোগাযোগে রূপান্তর করুন।'
                  : 'Turn Your Knowledge Into Real Communication.'}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                {lang === 'bn'
                  ? 'বাস্তব জীবনের কথোপকথন অনুশীলন করুন, ব্যবহারিক যোগাযোগের চ্যালেঞ্জ সমাধান করুন এবং আপনি যা শিখেছেন তা কতটা কার্যকরভাবে প্রয়োগ করতে পারেন তা যাচাই করুন।'
                  : "Practice real-world conversations, solve practical communication challenges, and discover how effectively you can use what you've learned."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-[#091233]/80 p-4">
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {lang === 'bn' ? 'বর্তমান শেখার লক্ষ্য' : 'Current Learning Objective'}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{currentObjectiveLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onStartScenario(adaptation.recommendedScenario.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#087BFF] to-[#00C2FF] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:brightness-110"
              >
                <PlayCircle className="h-4 w-4" />
                {lang === 'bn'
                  ? `শুরু করুন: ${adaptation.recommendedScenario.titleBn}`
                  : `Launch: ${adaptation.recommendedScenario.titleEn}`}
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                href="#scenario-universe"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
              >
                <Compass className="h-4 w-4 text-cyan-300" />
                {lang === 'bn' ? '৩০টি সিনারিও দেখুন' : 'Explore All 30 Scenarios'}
              </a>
            </div>
          </div>

          {/* Right Interactive 3D / 2D Communication Transfer Hub */}
          <div className="lg:col-span-6">
            {prefer2DStage ? (
              <div
                data-testid="transfer-hub-2d"
                className="rounded-2xl border border-cyan-500/20 bg-[#060D28] p-4 sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {lang === 'bn' ? '2D ট্রান্সফার সিনারিও ম্যাপ' : '2D Scenario Transfer Map'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {lang === 'bn'
                        ? 'ফিল্টার করতে যেকোনো ক্যাটাগরি নির্বাচন করুন'
                        : 'Select any communication domain to filter scenarios'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleStageMode(false)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-cyan-300 transition hover:border-cyan-400/60"
                  >
                    <Box className="h-3.5 w-3.5" />
                    {lang === 'bn' ? '3D ভিউ' : '3D View'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {realms.map((realm) => {
                    const active = selectedCategory === realm.id;
                    const pct =
                      realm.totalScenarios > 0
                        ? Math.round((realm.completedScenarios / realm.totalScenarios) * 100)
                        : 0;
                    return (
                      <button
                        key={realm.id}
                        type="button"
                        onClick={() => onSelectCategory(active ? 'all' : realm.id)}
                        aria-pressed={active}
                        className={`rounded-xl border p-3 text-left transition ${
                          active
                            ? 'border-cyan-400/70 bg-cyan-500/10'
                            : 'border-slate-800 bg-[#091233]/80 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-100">
                            {lang === 'bn' ? realm.labelBn : realm.labelEn}
                          </span>
                          <span
                            className="font-mono text-xs font-semibold tabular-nums"
                            style={{ color: realm.accentHex }}
                          >
                            {realm.completedScenarios}/{realm.totalScenarios}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: realm.accentHex,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="flex h-[320px] items-center justify-center rounded-2xl border border-cyan-500/20 bg-[#05091F] text-sm text-slate-400 sm:h-[360px]">
                    {lang === 'bn' ? '3D ট্রান্সফার হাব লোড হচ্ছে...' : 'Loading 3D Transfer Hub...'}
                  </div>
                }
              >
                <TransferLabCanvas3D
                  realms={realms}
                  selectedCategory={selectedCategory}
                  onSelectCategory={onSelectCategory}
                  onSwitchTo2D={() => onToggleStageMode(true)}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* Resume Previous Session Banner — ONLY shown when a valid saved session exists */}
      {activeDraft && draftScenario && (
        <div
          data-testid="resume-session-banner"
          className="flex flex-col justify-between gap-4 rounded-2xl border border-cyan-400/35 bg-gradient-to-r from-[#0A1842] to-[#0E1338] p-4 sm:flex-row sm:items-center sm:px-6"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              {lang === 'bn' ? 'অসমাপ্ত সেশন সংরক্ষিত আছে' : 'Saved In-Progress Session'}
            </p>
            <h2 className="text-base font-semibold text-white">
              {lang === 'bn' ? draftScenario.titleBn : draftScenario.titleEn}
            </h2>
            <p className="text-xs text-slate-300 tabular-nums">
              {draftLearnerTurns} {lang === 'bn' ? 'টি উত্তর পাঠানো হয়েছে' : 'learner turns sent'} ·{' '}
              {Math.max(1, Math.round(activeDraft.elapsedSeconds / 60))}{' '}
              {lang === 'bn' ? 'মিনিট অতিবাহিত' : 'min elapsed'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onResumeDraft}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              <PlayCircle className="h-4 w-4" />
              {lang === 'bn' ? 'পূর্ববর্তী সেশন চালিয়ে যান' : 'Resume Previous Session'}
            </button>
            <button
              type="button"
              onClick={onDiscardDraft}
              aria-label={lang === 'bn' ? 'সংরক্ষিত সেশন মুছুন' : 'Discard saved session'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-xs font-medium text-slate-300 transition hover:border-rose-400/50 hover:text-rose-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'বাতিল করুন' : 'Discard'}
            </button>
          </div>
        </div>
      )}

      {/* 5 Strictly Real-Data KPI Cards (Zero Fabricated Numbers) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">
              {lang === 'bn' ? 'সম্পন্ন সিনারিও' : 'Scenarios Completed'}
            </span>
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {metrics.scenariosCompleted}
            <span className="ml-1 text-sm font-normal text-slate-500">/ 30</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {metrics.scenariosCompleted === 0
              ? lang === 'bn'
                ? 'এখনো কোনো সিনারিও মূল্যায়িত হয়নি'
                : 'No evaluated scenarios yet'
              : lang === 'bn'
                ? `মোট ${metrics.totalAttempts}টি যাচাইকৃত প্রচেষ্টা`
                : `${metrics.totalAttempts} verified attempt${metrics.totalAttempts === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">
              {lang === 'bn' ? 'সফল টাস্ক ফলাফল' : 'Successful Task Outcomes'}
            </span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {metrics.totalAttempts > 0 ? metrics.successfulTaskOutcomes : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {metrics.taskSuccessRatePercent === null
              ? lang === 'bn'
                ? 'মূল্যায়নের পর হিসাব হবে'
                : 'Available after first evaluation'
              : lang === 'bn'
                ? `${metrics.taskSuccessRatePercent}% সফলতার হার`
                : `${metrics.taskSuccessRatePercent}% verified pass rate`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">
              {lang === 'bn' ? 'অনুশীলনের সময়' : 'Communication Practice Time'}
            </span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {metrics.practiceMinutes > 0 ? `${metrics.practiceMinutes}m` : '0m'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {metrics.practiceMinutes === 0
              ? lang === 'bn'
                ? 'কোনো সেশন এখনো রেকর্ড হয়নি'
                : 'No timed sessions logged yet'
              : lang === 'bn'
                ? 'যাচাইকৃত সিমুলেশন সময়'
                : 'Verified simulation minutes'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">
              {lang === 'bn' ? 'প্রয়োগকৃত দক্ষতা' : 'Skills Applied'}
            </span>
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {metrics.skillsAppliedCount}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {metrics.skillsAppliedCount === 0
              ? lang === 'bn'
                ? 'সিনারিও সম্পন্ন হলে যুক্ত হবে'
                : 'Tracked from evaluated scenarios'
              : metrics.appliedSkillLabels.slice(0, 2).join(' · ')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">
              {lang === 'bn' ? 'সাম্প্রতিক উন্নতি' : 'Recent Improvement'}
            </span>
            <TrendingUp className="h-4 w-4 text-cyan-300" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {metrics.hasSufficientImprovementData && metrics.recentImprovementDelta !== null
              ? `${metrics.recentImprovementDelta >= 0 ? '+' : ''}${metrics.recentImprovementDelta}%`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {metrics.hasSufficientImprovementData
              ? lang === 'bn'
                ? 'পূর্ববর্তী সেশনের সাথে তুলনা'
                : 'Recent vs. earlier evaluations'
              : lang === 'bn'
                ? 'তুলনার জন্য কমপক্ষে ২টি সেশন প্রয়োজন'
                : 'Requires ≥ 2 evaluated sessions'}
          </p>
        </div>
      </div>

      {/* Personalized Next Recommendation + Recent Verified Practice Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-blue-500/25 bg-[#081031]/90 p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              {lang === 'bn' ? 'পরবর্তী প্রস্তাবিত সিনারিও' : 'Recommended Next Scenario'}
            </p>
            <span className="text-xs font-medium text-slate-400">
              {adaptation.sourceType === 'mistake_memory'
                ? lang === 'bn'
                  ? 'সূত্র: Mistake Memory'
                  : 'Driven by Mistake Memory'
                : adaptation.sourceType === 'communication_dna'
                  ? lang === 'bn'
                    ? 'সূত্র: Communication DNA'
                    : 'Driven by Communication DNA'
                  : adaptation.sourceType === 'academy_lesson'
                    ? lang === 'bn'
                      ? 'সূত্র: Academy Mastery'
                      : 'Driven by Academy Mastery'
                    : lang === 'bn'
                      ? 'সূত্র: প্রারম্ভিক বেসলাইন'
                      : 'Verified Starting Baseline'}
            </span>
          </div>

          <h2 className="mt-2 text-lg font-bold text-white">
            {lang === 'bn'
              ? adaptation.recommendedScenario.titleBn
              : adaptation.recommendedScenario.titleEn}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {lang === 'bn' ? adaptation.rationaleBn : adaptation.rationaleEn}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                {lang === 'bn' ? adaptation.targetSkillLabelBn : adaptation.targetSkillLabelEn}
              </span>
              <span className="mx-2 text-slate-600">·</span>
              <span className="tabular-nums">
                ~{adaptation.recommendedScenario.estimatedMinutes}{' '}
                {lang === 'bn' ? 'মিনিট' : 'min'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onStartScenario(adaptation.recommendedScenario.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              {lang === 'bn' ? 'সিনারিও রুমে প্রবেশ করুন' : 'Enter Scenario Room'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              {lang === 'bn' ? 'সাম্প্রতিক যাচাইকৃত অনুশীলন' : 'Recent Practice Activity'}
            </h2>
            <span className="text-xs text-slate-400 tabular-nums">
              {recentAttempts.length}{' '}
              {lang === 'bn' ? 'টি রেকর্ড' : `record${recentAttempts.length === 1 ? '' : 's'}`}
            </span>
          </div>

          {recentAttempts.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'কোনো ট্রান্সফার ল্যাব সেশন এখনো সম্পন্ন হয়নি। নিচ থেকে যেকোনো একটি বাস্তব সিনারিও শুরু করে আপনার প্রথম প্রমাণভিত্তিক মূল্যায়ন তৈরি করুন।'
                : 'No Transfer Lab evaluations recorded yet. Complete any scenario below to generate your first evidence-based communication report.'}
            </div>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {recentAttempts.slice(0, 3).map((attempt) => {
                const sc = getTransferUniverseScenario(attempt.scenarioId);
                return (
                  <li key={attempt.id}>
                    <button
                      type="button"
                      onClick={() => onInspectAttempt(attempt)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-2.5 text-left transition hover:border-cyan-500/40 hover:bg-slate-900/80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {sc
                            ? lang === 'bn'
                              ? sc.titleBn
                              : sc.titleEn
                            : attempt.scenarioId}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(attempt.completedAt).toLocaleDateString()} ·{' '}
                          {attempt.passed
                            ? lang === 'bn'
                              ? 'উত্তীর্ণ'
                              : 'Task Achieved'
                            : lang === 'bn'
                              ? 'আরও অনুশীলন প্রয়োজন'
                              : 'Needs Retest'}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-sm font-bold tabular-nums ${
                          attempt.passed ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {attempt.evaluation.overall_score}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
