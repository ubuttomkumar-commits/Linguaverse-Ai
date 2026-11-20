import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { DIAGNOSTIC_QUESTIONS } from '../domain/diagnosticData';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import type { EvidenceStartingProfile } from '../types/domain';

export function DiagnosticPage() {
  const { lang, t } = useLanguage();
  const { profile, submitDiagnostic } = useAuth();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sentenceTokens, setSentenceTokens] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvidenceStartingProfile | null>(null);

  const currentQuestion = DIAGNOSTIC_QUESTIONS[currentIndex];
  const explanationPref = profile?.explanationLanguage ?? 'both';

  const handleSelectMcq = (questionId: string, optionId: string) => {
    setWarning(null);
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleAddWordToken = (word: string) => {
    setWarning(null);
    setSentenceTokens((prev) => {
      const next = [...prev, word];
      setAnswers((ans) => ({ ...ans, [currentQuestion.id]: next.join(' ') }));
      return next;
    });
  };

  const handleRemoveWordToken = (indexToRemove: number) => {
    setSentenceTokens((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      setAnswers((ans) => ({ ...ans, [currentQuestion.id]: next.join(' ') }));
      return next;
    });
  };

  const handleClearSentence = () => {
    setSentenceTokens([]);
    setAnswers((ans) => ({ ...ans, [currentQuestion.id]: '' }));
  };

  const currentAnswer = (answers[currentQuestion.id] ?? '').trim();

  const handleNext = () => {
    if (!currentAnswer) {
      setWarning(t.diagnostic.unansweredWarning);
      return;
    }
    setWarning(null);
    setCurrentIndex((idx) => Math.min(DIAGNOSTIC_QUESTIONS.length - 1, idx + 1));
  };

  const handleSubmit = async () => {
    if (!currentAnswer) {
      setWarning(t.diagnostic.unansweredWarning);
      return;
    }
    setWarning(null);
    setIsSubmitting(true);
    try {
      const formatted = DIAGNOSTIC_QUESTIONS.map((q) => ({
        questionId: q.id,
        userResponse: answers[q.id] ?? '',
      }));
      const computed = await submitDiagnostic(formatted);
      setResult(computed);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setCurrentIndex(0);
    setAnswers({});
    setSentenceTokens([]);
    setWarning(null);
  };

  // Used word indices for sentence builder so duplicate words (if any) are tracked accurately by bank index
  const usedCounts = new Map<string, number>();
  for (const token of sentenceTokens) {
    usedCounts.set(token, (usedCounts.get(token) ?? 0) + 1);
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-[#0A0F1C]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6] text-xs font-bold text-white"
            >
              LV
            </span>
            <span>{t.brand}</span>
          </div>
          <LanguageToggle compact />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {!result ? (
          <div>
            {/* Diagnostic Intro & Honesty Notice */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-[#3B82F6]">{t.diagnostic.kicker}</p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {t.diagnostic.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">{t.diagnostic.subtitle}</p>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#F59E0B]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.diagnostic.honestyBanner}</span>
              </p>
            </div>

            {/* Step Progress Bar */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-[#3B82F6] transition-all duration-200"
                  style={{
                    width: `${((currentIndex + 1) / DIAGNOSTIC_QUESTIONS.length) * 100}%`,
                  }}
                />
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                {t.diagnostic.questionLabel} {currentIndex + 1} / {DIAGNOSTIC_QUESTIONS.length}
              </span>
            </div>

            {/* Question Card */}
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <span className="font-semibold text-[#8B5CF6]">
                  {t.diagnostic.domains[currentQuestion.domain]}
                </span>
                <span className="font-mono tabular-nums">0{currentQuestion.order} / 05</span>
              </div>

              {/* Optional Reading Passage */}
              {currentQuestion.passageEn && (
                <div className="mt-5 rounded-lg border border-slate-800 bg-[#0A0F1C] p-4 sm:p-5">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
                    {currentQuestion.passageEn}
                  </p>
                  {lang === 'bn' && currentQuestion.passageBnHint && (
                    <p className="font-bn mt-3 border-t border-slate-800 pt-2.5 text-xs text-slate-400">
                      {currentQuestion.passageBnHint}
                    </p>
                  )}
                </div>
              )}

              {/* Question Prompt */}
              <h2 className="mt-5 whitespace-pre-line text-lg font-semibold leading-relaxed text-white sm:text-xl">
                {lang === 'bn' ? currentQuestion.promptBn : currentQuestion.promptEn}
              </h2>

              {/* MCQ Options */}
              {currentQuestion.type === 'mcq' && currentQuestion.options && (
                <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answer options">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = answers[currentQuestion.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelectMcq(currentQuestion.id, opt.id)}
                        className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white font-medium'
                            : 'border-slate-800 bg-[#0A0F1C] text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 rounded-full border ${
                            isSelected
                              ? 'border-[#3B82F6] bg-[#3B82F6]'
                              : 'border-slate-600 bg-transparent'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Interactive Sentence Construction Builder */}
              {currentQuestion.type === 'sentence_builder' && currentQuestion.wordBank && (
                <div className="mt-6 space-y-5">
                  <p className="text-xs text-slate-400">{t.diagnostic.sentenceBuilderHint}</p>

                  {/* Constructed Sentence Tray */}
                  <div className="min-h-[68px] rounded-xl border border-slate-700 bg-[#0A0F1C] p-3.5">
                    {sentenceTokens.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        {t.diagnostic.sentenceEmptyPlaceholder}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {sentenceTokens.map((token, idx) => (
                          <button
                            key={`${token}_${idx}`}
                            type="button"
                            onClick={() => handleRemoveWordToken(idx)}
                            aria-label={`Remove word "${token}"`}
                            className="rounded-lg border border-[#3B82F6] bg-[#3B82F6]/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500/20 hover:border-rose-400 transition-colors cursor-pointer"
                          >
                            {token}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Word Bank */}
                  <div className="flex flex-wrap gap-2" aria-label="Word bank">
                    {currentQuestion.wordBank.map((word) => {
                      const isUsed = sentenceTokens.includes(word);
                      return (
                        <button
                          key={word}
                          type="button"
                          disabled={isUsed}
                          onClick={() => handleAddWordToken(word)}
                          className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                            isUsed
                              ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                              : 'border-slate-700 bg-[#0A0F1C] text-slate-100 hover:border-[#3B82F6] hover:text-white cursor-pointer'
                          }`}
                        >
                          {word}
                        </button>
                      );
                    })}
                  </div>

                  {sentenceTokens.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSentence}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.diagnostic.sentenceClearBtn}</span>
                    </button>
                  )}
                </div>
              )}

              {warning && (
                <p role="alert" className="mt-4 text-sm font-medium text-[#F59E0B]">
                  {warning}
                </p>
              )}

              {/* Footer Controls */}
              <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    setWarning(null);
                    setCurrentIndex((idx) => Math.max(0, idx - 1));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>{t.diagnostic.prevBtn}</span>
                </button>

                {currentIndex < DIAGNOSTIC_QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
                  >
                    <span>{t.diagnostic.nextBtn}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <span>{t.diagnostic.submitBtn}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Evidence-Based Starting Profile Result View */
          <div className="space-y-8">
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
              <p className="text-xs font-semibold text-[#3B82F6]">
                {t.diagnostic.results.kicker}
              </p>
              <h1 className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">
                {t.diagnostic.results.title}
              </h1>

              {/* Explicit Non-Certified Confidence Warning */}
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3.5 text-xs leading-relaxed text-amber-200 sm:text-sm">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]"
                  aria-hidden="true"
                />
                <span>
                  {lang === 'bn' ? result.confidenceLabelBn : result.confidenceLabelEn}
                </span>
              </div>

              {/* Primary Evidence Metrics */}
              <div className="mt-6 grid grid-cols-1 gap-4 border-y border-slate-800 py-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">{t.diagnostic.results.scoreLabel}</p>
                  <p className="mt-1 font-mono text-3xl font-bold text-white tabular-nums">
                    {result.totalCorrect} / {result.totalQuestions}
                    <span className="ml-2 text-base font-medium text-slate-400">
                      ({result.accuracyPercent}%)
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">{t.diagnostic.results.bandLabel}</p>
                  <p className="mt-1 text-base font-semibold text-[#3B82F6]">
                    {lang === 'bn' ? result.estimatedStartingBandBn : result.estimatedStartingBand}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">{t.diagnostic.results.coverageLabel}</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#F59E0B] tabular-nums">
                    {result.confidenceCoveragePercent}%
                  </p>
                </div>
              </div>

              {/* Recommended Track & Self-Calibration */}
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {t.diagnostic.results.trackLabel}
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-white leading-relaxed">
                    {lang === 'bn' ? result.recommendedTrackBn : result.recommendedTrackEn}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {t.diagnostic.results.calibrationTitle}
                  </p>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                    {lang === 'bn' ? result.calibrationNoteBn : result.calibrationNoteEn}
                  </p>
                </div>
              </div>

              {/* Domain Breakdown */}
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-slate-200">
                  {t.diagnostic.results.domainTitle}
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {result.domainBreakdown.map((item) => (
                    <div
                      key={item.domain}
                      className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5"
                    >
                      <p className="text-xs text-slate-400">{t.diagnostic.domains[item.domain]}</p>
                      <p className="mt-1.5 font-mono text-lg font-bold text-white tabular-nums">
                        {item.correct} / {item.total}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full ${
                            item.accuracyPercent === 100
                              ? 'bg-emerald-500'
                              : item.accuracyPercent > 0
                                ? 'bg-[#F59E0B]'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(item.accuracyPercent, 6)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>{t.diagnostic.results.retakeBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app', { replace: true })}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
                >
                  <span>{t.diagnostic.results.enterWorkspaceBtn}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Item-by-Item Review with Bangla & English Explanations */}
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
              <h2 className="text-lg font-bold text-white">{t.diagnostic.results.reviewTitle}</h2>

              <div className="mt-5 divide-y divide-slate-800">
                {result.items.map((item, idx) => (
                  <div key={item.questionId} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-slate-400 tabular-nums">
                        Q0{idx + 1} · {t.diagnostic.domains[item.domain]}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          item.isCorrect ? 'text-emerald-400' : 'text-[#F59E0B]'
                        }`}
                      >
                        {item.isCorrect ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {item.isCorrect
                            ? t.diagnostic.results.correctBadge
                            : t.diagnostic.results.needsFixBadge}
                        </span>
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3">
                        <p className="text-xs text-slate-400">{t.diagnostic.results.yourAnswer}</p>
                        <p
                          className={`mt-1 font-medium ${
                            item.isCorrect ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {item.userResponse}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3">
                        <p className="text-xs text-slate-400">
                          {t.diagnostic.results.correctAnswer}
                        </p>
                        <p className="mt-1 font-medium text-emerald-300">{item.correctAnswer}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm leading-relaxed">
                      {(explanationPref === 'bn' || explanationPref === 'both') && (
                        <p className="font-bn text-slate-200">
                          <span className="font-semibold text-[#8B5CF6]">বাংলা ব্যাখ্যা: </span>
                          {item.explanationBn}
                        </p>
                      )}
                      {(explanationPref === 'en' || explanationPref === 'both') && (
                        <p className="text-slate-300">
                          <span className="font-semibold text-[#3B82F6]">English: </span>
                          {item.explanationEn}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
