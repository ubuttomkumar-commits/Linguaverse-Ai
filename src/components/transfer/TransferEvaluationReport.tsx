import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Dna,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTransferUniverseScenario } from '../../domain/transferLabUniverseEngine';
import { MISTAKE_MEMORY_MIN_CONFIDENCE } from '../../domain/speakingEvaluation';
import type {
  TransferConversationTurn,
  TransferObjectiveStatus,
  TransferSessionEvaluationReport,
  XpLedgerEntry,
} from '../../types/domain';

interface TransferEvaluationReportProps {
  report: TransferSessionEvaluationReport;
  transcript?: TransferConversationTurn[];
  newlyAwardedXp?: XpLedgerEntry[];
  onRetestScenario: (scenarioId: string) => void;
  onBackToUniverse: () => void;
}

const OBJECTIVE_STATUS_META: Record<
  TransferObjectiveStatus,
  { en: string; bn: string; color: string }
> = {
  achieved: { en: 'Achieved', bn: 'অর্জিত', color: 'text-emerald-300' },
  partially_achieved: { en: 'Partially Achieved', bn: 'আংশিক অর্জিত', color: 'text-amber-300' },
  in_progress: { en: 'In Progress', bn: 'চলমান', color: 'text-cyan-300' },
  not_achieved: { en: 'Not Achieved', bn: 'অর্জিত হয়নি', color: 'text-rose-300' },
  not_evaluated: { en: 'Not Evaluated', bn: 'মূল্যায়িত নয়', color: 'text-slate-400' },
  not_started: { en: 'Not Started', bn: 'শুরু হয়নি', color: 'text-slate-500' },
};

export function TransferEvaluationReport({
  report,
  transcript = [],
  newlyAwardedXp = [],
  onRetestScenario,
  onBackToUniverse,
}: TransferEvaluationReportProps) {
  const { lang } = useLanguage();
  const [showMethodology, setShowMethodology] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const scenario = getTransferUniverseScenario(report.scenarioId);
  const loggedMistakes = report.detectedMistakes.filter(
    (m) => m.confidence >= MISTAKE_MEMORY_MIN_CONFIDENCE
  );
  const lowConfidenceHints = report.detectedMistakes.filter(
    (m) => m.confidence < MISTAKE_MEMORY_MIN_CONFIDENCE
  );

  const totalXp = newlyAwardedXp.reduce((sum, entry) => sum + entry.xpEarned, 0);

  return (
    <section data-testid="transfer-evaluation-report" className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToUniverse}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === 'bn' ? 'সিনারিও ইউনিভার্সে ফিরুন' : 'Back to Scenario Universe'}
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onRetestScenario(report.scenarioId)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {lang === 'bn' ? 'আবার পরীক্ষা দিন (Retest)' : 'Retest Scenario'}
          </button>
          <Link
            to="/app/improve"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/50"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            {lang === 'bn' ? 'Mistake Memory' : 'Mistake Memory'}
          </Link>
          <Link
            to="/app/progress"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-violet-400/50"
          >
            <Dna className="h-3.5 w-3.5 text-violet-300" />
            {lang === 'bn' ? 'Communication DNA' : 'Communication DNA'}
          </Link>
        </div>
      </div>

      {/* Verdict & Overall Summary Banner */}
      <div className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-[#081234] via-[#060D26] to-[#0C1232] p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              {lang === 'bn'
                ? 'প্রমাণভিত্তিক ৮-মাত্রার ট্রান্সফার মূল্যায়ন'
                : 'Evidence-Based 8-Dimension Transfer Evaluation'}
            </p>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {scenario
                ? lang === 'bn'
                  ? scenario.titleBn
                  : scenario.titleEn
                : report.scenarioId}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              {lang === 'bn' ? report.coachSummaryBn : report.coachSummaryEn}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-4">
            <div className="rounded-2xl border border-slate-700/80 bg-[#050A22] px-5 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'মূল্যায়িত গড়' : 'Evaluated Mean'}
              </p>
              <p
                className={`mt-1 font-mono text-3xl font-bold tabular-nums ${
                  report.overallScore === null
                    ? 'text-slate-400'
                    : report.passed
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                }`}
              >
                {report.overallScore !== null ? `${report.overallScore}%` : '—'}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
                {report.evaluatedDimensionCount} / 8{' '}
                {lang === 'bn' ? 'মাত্রা মূল্যায়িত' : 'dimensions evaluated'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-[#050A22] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'টাস্ক ফলাফল' : 'Task Outcome'}
              </p>
              <p
                className={`mt-1 flex items-center gap-1.5 text-base font-bold ${
                  report.taskOutcomeStatus === 'achieved'
                    ? 'text-emerald-300'
                    : report.taskOutcomeStatus === 'partially_achieved'
                      ? 'text-amber-300'
                      : 'text-rose-300'
                }`}
              >
                {report.taskOutcomeStatus === 'achieved' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : report.taskOutcomeStatus === 'partially_achieved' ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                {report.taskOutcomeStatus === 'achieved'
                  ? lang === 'bn'
                    ? 'লক্ষ্য অর্জিত'
                    : 'Achieved'
                  : report.taskOutcomeStatus === 'partially_achieved'
                    ? lang === 'bn'
                      ? 'আংশিক অর্জিত'
                      : 'Partially Achieved'
                    : lang === 'bn'
                      ? 'অর্জিত হয়নি'
                      : 'Not Achieved'}
              </p>
              {totalXp > 0 && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 tabular-nums">
                  <Award className="h-3.5 w-3.5" />+{totalXp} Verified XP
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Explicit Distinction: Task Completion vs Language Correctness */}
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800/90 pt-5 md:grid-cols-2">
          <div className="rounded-xl border border-blue-500/20 bg-[#071030] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
              {lang === 'bn'
                ? 'টাস্ক সম্পন্নতা বনাম ভাষার নির্ভুলতা'
                : 'Task Completion vs. Language Correctness'}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {lang === 'bn'
                ? report.taskVsLanguageDistinctionBn
                : report.taskVsLanguageDistinctionEn}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#071030] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              {lang === 'bn' ? 'ভাষার নির্ভুলতা নোট' : 'Language Correctness Note'}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {lang === 'bn' ? report.languageCorrectnessNoteBn : report.languageCorrectnessNoteEn}
            </p>
          </div>
        </div>

        {/* Documented Scoring Methodology Disclosure */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowMethodology((s) => !s)}
            aria-expanded={showMethodology}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-300"
          >
            <Info className="h-3.5 w-3.5" />
            {lang === 'bn' ? 'স্কোরিং পদ্ধতি ও সীমাবদ্ধতা দেখুন' : 'View documented scoring methodology & limitations'}
            {showMethodology ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showMethodology && (
            <p className="mt-2 rounded-xl border border-slate-800 bg-[#050A22] p-3 text-xs leading-relaxed text-slate-300">
              {lang === 'bn' ? report.scoringMethodologyBn : report.scoringMethodologyEn}
            </p>
          )}
        </div>
      </div>

      {/* Per-Objective Criteria Evaluation */}
      <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-5 sm:p-6">
        <h2 className="text-base font-bold text-white">
          {lang === 'bn'
            ? 'সিনারিও লক্ষ্য ও মানদণ্ড যাচাই (Objective Criteria)'
            : 'Objective & Criteria Verification'}
        </h2>
        <div className="mt-4 divide-y divide-slate-800/80">
          {report.objectives.map((obj, idx) => {
            const st = OBJECTIVE_STATUS_META[obj.status] ?? OBJECTIVE_STATUS_META.not_evaluated;
            return (
              <div key={obj.objectiveId} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      <span className="mr-2 font-mono text-xs text-slate-500">0{idx + 1}</span>
                      {lang === 'bn' ? obj.labelBn : obj.labelEn}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {lang === 'bn' ? 'মানদণ্ড: ' : 'Criteria: '}
                      {obj.criteriaEn}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${st.color}`}>
                    {lang === 'bn' ? st.bn : st.en}
                  </span>
                </div>

                {obj.evidenceQuote && (
                  <p className="mt-2 rounded-lg border border-slate-800 bg-[#050A22] px-3 py-2 text-xs text-cyan-200">
                    <span className="font-semibold text-slate-400">
                      {lang === 'bn' ? 'প্রমাণ উদ্ধৃতি: ' : 'Evidence quote: '}
                    </span>
                    “{obj.evidenceQuote}”
                  </p>
                )}

                {(obj.rationaleEn || obj.rationaleBn) && (
                  <p className="mt-1.5 text-xs text-slate-300">
                    {lang === 'bn' ? obj.rationaleBn ?? obj.rationaleEn : obj.rationaleEn}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 8-Dimension Evidence Cards */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-white">
            {lang === 'bn'
              ? '৮-মাত্রার প্রমাণভিত্তিক বিশ্লেষণ (8-Dimension Evaluation)'
              : '8-Dimension Evidence Breakdown'}
          </h2>
          <p className="text-xs text-slate-400">
            {lang === 'bn'
              ? 'প্রতিটি স্কোর কথোপকথনের সরাসরি উদ্ধৃতির সাথে যুক্ত; পর্যাপ্ত প্রমাণ না থাকলে "মূল্যায়িত নয়" দেখানো হয়েছে।'
              : 'Every score is grounded in transcript evidence; dimensions lacking sufficient evidence are honestly marked Not Evaluated.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {report.dimensions.map((dim) => (
            <article
              key={dim.dimension}
              className={`rounded-2xl border p-5 ${
                dim.evaluated
                  ? 'border-slate-800 bg-[#080F2D]/90'
                  : 'border-dashed border-slate-800 bg-[#060B22]/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'bn' ? dim.labelBn : dim.labelEn}
                  </h3>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    {dim.evaluated
                      ? `${lang === 'bn' ? 'আত্মবিশ্বাস' : 'Confidence'}: ${Math.round(dim.confidence * 100)}%`
                      : lang === 'bn'
                        ? 'পর্যাপ্ত প্রমাণ নেই'
                        : 'Insufficient transcript evidence'}
                  </p>
                </div>
                <span
                  className={`font-mono text-lg font-bold tabular-nums ${
                    !dim.evaluated || dim.score === null
                      ? 'text-slate-500'
                      : dim.score >= 80
                        ? 'text-emerald-300'
                        : dim.score >= 65
                          ? 'text-cyan-300'
                          : 'text-amber-300'
                  }`}
                >
                  {dim.evaluated && dim.score !== null
                    ? `${dim.score}%`
                    : lang === 'bn'
                      ? 'মূল্যায়িত নয়'
                      : 'Not Evaluated'}
                </span>
              </div>

              <div className="mt-3 space-y-2.5 text-xs">
                <div>
                  <p className="font-semibold text-slate-400">
                    {lang === 'bn' ? 'কথোপকথনের প্রমাণ' : 'Conversation Evidence'}
                  </p>
                  <p className="mt-0.5 text-slate-200">{dim.evidenceFromConversation}</p>
                </div>

                {dim.supportingLearnerResponse && (
                  <p className="rounded-lg border border-slate-800 bg-[#050A22] px-3 py-2 text-cyan-200">
                    <span className="font-semibold text-slate-400">
                      {lang === 'bn' ? 'আপনার উত্তর: ' : 'Your response: '}
                    </span>
                    “{dim.supportingLearnerResponse}”
                  </p>
                )}

                <div>
                  <p className="font-semibold text-slate-400">
                    {lang === 'bn' ? 'শনাক্তকৃত দিক' : 'Identified Point'}
                  </p>
                  <p className="mt-0.5 text-slate-300">
                    {lang === 'bn' ? dim.identifiedProblemBn : dim.identifiedProblemEn}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-400">
                    {lang === 'bn' ? 'ব্যাখ্যা' : 'Explanation'}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-slate-300">
                    {lang === 'bn' ? dim.explanationBn : dim.explanationEn}
                  </p>
                </div>

                {(dim.suggestedCorrection || dim.betterExample) && (
                  <div className="grid grid-cols-1 gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                    {dim.suggestedCorrection && (
                      <p className="text-emerald-200">
                        <span className="font-semibold text-emerald-400">
                          {lang === 'bn' ? 'সংশোধিত রূপ: ' : 'Suggested correction: '}
                        </span>
                        {dim.suggestedCorrection}
                      </p>
                    )}
                    {dim.betterExample && (
                      <p className="text-slate-200">
                        <span className="font-semibold text-cyan-300">
                          {lang === 'bn' ? 'আরও ভালো উদাহরণ: ' : 'Better example: '}
                        </span>
                        “{dim.betterExample}”
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  {lang === 'bn' ? dim.limitationsNoteBn : dim.limitationsNoteEn}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Natural Model Response + Mistake Memory & Communication DNA Sync */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-5 lg:col-span-6">
          <h3 className="text-sm font-bold text-white">
            {lang === 'bn' ? 'স্বাভাবিক মডেল উত্তর ও পরবর্তী পদক্ষেপ' : 'Natural Model Response & Next Step'}
          </h3>
          <p className="mt-2.5 rounded-xl border border-cyan-500/20 bg-[#050A22] p-3.5 text-sm leading-relaxed text-cyan-100">
            “{report.naturalModelResponse}”
          </p>

          {report.strengths.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                {lang === 'bn' ? 'যাচাইকৃত শক্তি' : 'Verified Strengths'}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-slate-300">
                {report.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-300">
            <span className="font-semibold text-cyan-300">
              {lang === 'bn' ? 'পরবর্তী পরামর্শ: ' : 'Next step: '}
            </span>
            {lang === 'bn' ? report.nextRecommendedActionBn : report.nextRecommendedActionEn}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-5 lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">
              {lang === 'bn'
                ? 'Mistake Memory ও Communication DNA সিঙ্ক'
                : 'Mistake Memory & Communication DNA Sync'}
            </h3>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>

          <p className="mt-1.5 text-xs text-slate-400">
            {lang === 'bn'
              ? '৭০%+ কনফিডেন্সযুক্ত ভুলগুলো স্বয়ংক্রিয়ভাবে Mistake Memory-তে যুক্ত হয়েছে এবং আপনার Communication DNA আপডেট হয়েছে।'
              : 'Mistakes meeting the ≥70% confidence bar are automatically synced to Mistake Memory and reflected in your Communication DNA.'}
          </p>

          {loggedMistakes.length === 0 ? (
            <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-200">
              {lang === 'bn'
                ? 'এই সেশনে উচ্চ-কনফিডেন্স কোনো ব্যাকরণগত ভুল শনাক্ত হয়নি।'
                : 'No high-confidence mistakes logged from this session.'}
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {loggedMistakes.map((m, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-[#050A22] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-300">{m.category}</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {Math.round(m.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-1 text-rose-300 line-through">{m.original}</p>
                  <p className="text-emerald-300">{m.corrected}</p>
                  <p className="mt-1 text-slate-400">
                    {lang === 'bn' ? m.explanation_bn : m.explanation_en}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {lowConfidenceHints.length > 0 && (
            <p className="mt-3 text-[11px] text-slate-400">
              {lang === 'bn'
                ? `+ ${lowConfidenceHints.length}টি কম-কনফিডেন্স স্টাইল পরামর্শ (Mistake Memory-তে যুক্ত করা হয়নি)।`
                : `+ ${lowConfidenceHints.length} optional low-confidence style hint(s) withheld from Mistake Memory.`}
            </p>
          )}
        </div>
      </div>

      {/* Optional Saved Transcript Disclosure (ready for Part 12 Communication Replay) */}
      {transcript.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-5">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            aria-expanded={showTranscript}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-200"
          >
            <span>
              {lang === 'bn'
                ? `সম্পূর্ণ কথোপকথনের ট্রান্সক্রিপ্ট (${transcript.length}টি বার্তা)`
                : `Full Session Transcript (${transcript.length} messages)`}
            </span>
            {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showTranscript && (
            <div className="mt-4 space-y-2.5 border-t border-slate-800 pt-4">
              {transcript.map((turn) => (
                <div
                  key={turn.id}
                  className={`rounded-xl p-3 text-xs ${
                    turn.role === 'learner'
                      ? 'ml-auto max-w-2xl border border-blue-500/30 bg-blue-950/35 text-blue-100'
                      : 'mr-auto max-w-2xl border border-slate-800 bg-[#050A22] text-slate-200'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold">
                      {turn.role === 'learner'
                        ? lang === 'bn'
                          ? 'আপনি'
                          : 'You'
                        : scenario?.aiParticipantName ?? 'AI Participant'}
                    </span>
                    <span className="tabular-nums">
                      {new Date(turn.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="leading-relaxed">{turn.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
