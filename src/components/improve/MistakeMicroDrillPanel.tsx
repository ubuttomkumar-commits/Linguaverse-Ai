import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  RotateCcw,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  evaluateMistakeRewrite,
  generateMistakeMicroDrill,
  getMistakeCategoryMeta,
} from '../../domain/mistakeMemoryEngine';
import { speakEnglishExample } from '../../utils/speechSynthesis';
import type { ExplanationLanguage, MistakeMemoryItem } from '../../types/domain';

interface MistakeMicroDrillPanelProps {
  mistake: MistakeMemoryItem;
  explanationPref: ExplanationLanguage;
  onCompleteDrill: (result: {
    mistakeId: string;
    passed: boolean;
    userRewrite: string;
    expectedAnswer: string;
    durationSeconds: number;
  }) => Promise<MistakeMemoryItem>;
  onClose: () => void;
}

export function MistakeMicroDrillPanel({
  mistake,
  explanationPref,
  onCompleteDrill,
  onClose,
}: MistakeMicroDrillPanelProps) {
  const { lang } = useLanguage();
  const drill = useMemo(() => generateMistakeMicroDrill(mistake), [mistake]);
  const catMeta = getMistakeCategoryMeta(drill.category);

  const startedAtRef = useRef<number>(Date.now());
  const [step, setStep] = useState<'recognize' | 'rewrite' | 'summary'>('recognize');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [recognitionChecked, setRecognitionChecked] = useState(false);
  const [recognitionPassed, setRecognitionPassed] = useState(false);

  const [rewriteInput, setRewriteInput] = useState('');
  const [rewriteFeedback, setRewriteFeedback] = useState<{
    isCorrect: boolean;
    feedbackEn: string;
    feedbackBn: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updatedMistake, setUpdatedMistake] = useState<MistakeMemoryItem | null>(null);

  const selectedOption = drill.options.find((o) => o.id === selectedOptionId);

  const handleCheckRecognition = () => {
    if (!selectedOption) return;
    setRecognitionChecked(true);
    setRecognitionPassed(selectedOption.isCorrect);
  };

  const handleProceedToRewrite = () => {
    setStep('rewrite');
  };

  const handleSubmitRewrite = async () => {
    const check = evaluateMistakeRewrite(rewriteInput, drill.expectedCorrected);
    setRewriteFeedback(check);

    setIsSaving(true);
    try {
      const durationSeconds = Math.max(
        5,
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );
      const passedBoth = recognitionPassed && check.isCorrect;
      const updated = await onCompleteDrill({
        mistakeId: mistake.id,
        passed: passedBoth,
        userRewrite: rewriteInput,
        expectedAnswer: drill.expectedCorrected,
        durationSeconds,
      });
      setUpdatedMistake(updated);
      if (check.isCorrect) {
        setStep('summary');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetryDrill = () => {
    startedAtRef.current = Date.now();
    setStep('recognize');
    setSelectedOptionId(null);
    setRecognitionChecked(false);
    setRecognitionPassed(false);
    setRewriteInput('');
    setRewriteFeedback(null);
    setUpdatedMistake(null);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  const statusText = (status: MistakeMemoryItem['status']) => {
    if (status === 'resolved') return lang === 'bn' ? 'সমাধান হয়েছে (Resolved)' : 'Resolved';
    if (status === 'practicing') return lang === 'bn' ? 'অনুশীলনরত (Practicing)' : 'Practicing';
    return lang === 'bn' ? 'সক্রিয় (Active)' : 'Active';
  };

  return (
    <section
      aria-label="Targeted mistake fix drill"
      className="rounded-xl border border-[#3B82F6]/60 bg-[#111827] p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <p className="font-mono text-xs text-[#3B82F6]">
            {lang === 'bn'
              ? `টার্গেটেড মাইক্রো-ড্রিল · ${catMeta.labelBn}`
              : `Targeted Micro-Drill · ${catMeta.labelEn}`}
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">
            {lang === 'bn' ? 'এই ভুলটি ঠিক করুন (২-ধাপের যাচাই)' : 'Fix This Mistake (2-Step Pattern Retest)'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn'
              ? 'ধাপ ১: সঠিক রূপ শনাক্ত করুন → ধাপ ২: নিজে লিখে সংশোধন করুন। সফল পুনরায় যাচাইয়ে স্ট্যাটাস ও রিভিউ সূচি হালনাগাদ হবে।'
              : 'Step 1: Spot the accurate form → Step 2: Repair it from memory. Verified retesting updates status and spaced review.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close targeted drill"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{lang === 'bn' ? 'বন্ধ করুন' : 'Close'}</span>
        </button>
      </div>

      {/* Step Indicator */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono">
        <span className={step === 'recognize' ? 'font-semibold text-[#3B82F6]' : 'text-slate-400'}>
          {lang === 'bn' ? '০১. শনাক্তকরণ' : '01. Spot & Select'}
        </span>
        <span aria-hidden="true" className="text-slate-600">
          /
        </span>
        <span className={step === 'rewrite' ? 'font-semibold text-[#3B82F6]' : 'text-slate-400'}>
          {lang === 'bn' ? '০২. নিজে সংশোধন' : '02. Active Repair'}
        </span>
        <span aria-hidden="true" className="text-slate-600">
          /
        </span>
        <span className={step === 'summary' ? 'font-semibold text-emerald-400' : 'text-slate-400'}>
          {lang === 'bn' ? '০৩. রিভিউ সূচি' : '03. Review Updated'}
        </span>
      </div>

      {/* Step 1: Recognition */}
      {step === 'recognize' && (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'আপনার পূর্বের ভুল বাক্যাংশ' : 'Original flawed phrase observed'}
            </p>
            <p className="mt-1 text-sm font-semibold text-rose-300">{drill.flawedOriginal}</p>
          </div>

          <p className="text-sm font-medium text-slate-200">
            {lang === 'bn' ? drill.recognitionPromptBn : drill.recognitionPromptEn}
          </p>

          <div role="radiogroup" aria-label="Correction options" className="space-y-2.5">
            {drill.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let borderClass = 'border-slate-800 bg-[#0A0F1C] hover:border-slate-700';
              if (recognitionChecked) {
                if (opt.isCorrect) {
                  borderClass = 'border-emerald-500/60 bg-emerald-500/10';
                } else if (isSelected && !opt.isCorrect) {
                  borderClass = 'border-rose-500/60 bg-rose-500/10';
                }
              } else if (isSelected) {
                borderClass = 'border-[#3B82F6] bg-[#3B82F6]/15';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={recognitionChecked}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors cursor-pointer disabled:cursor-default ${borderClass}`}
                >
                  <span className="text-slate-100">{opt.text}</span>
                  {recognitionChecked && opt.isCorrect && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  )}
                  {recognitionChecked && isSelected && !opt.isCorrect && (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {recognitionChecked && (
            <div className="space-y-2 rounded-lg border border-slate-800 bg-[#0A0F1C] p-4 text-sm">
              <p className={recognitionPassed ? 'font-semibold text-emerald-400' : 'font-semibold text-amber-300'}>
                {recognitionPassed
                  ? lang === 'bn'
                    ? 'সঠিক উত্তর বেছে নিয়েছেন! এবার ধাপ ২-এ নিজে লিখে যাচাই করুন।'
                    : 'Correct choice! Now reinforce it in Step 2 by writing it yourself.'
                  : lang === 'bn'
                    ? 'এটি সঠিক ছিল না। নিচের বাংলা ও ইংরেজি ব্যাখ্যা দেখে ধাপ ২-এ সঠিকভাবে লিখুন।'
                    : 'Not quite. Review the rule below, then write the corrected form in Step 2.'}
              </p>
              {(explanationPref === 'bn' || explanationPref === 'both') && (
                <p className="font-bn text-slate-200">
                  <span className="font-semibold text-[#8B5CF6]">বাংলা ব্যাখ্যা: </span>
                  {mistake.explanationBn}
                </p>
              )}
              {(explanationPref === 'en' || explanationPref === 'both') && (
                <p className="text-slate-300">
                  <span className="font-semibold text-[#3B82F6]">Rule: </span>
                  {mistake.explanationEn}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => speakEnglishExample({ text: drill.expectedCorrected, rate: 1.0 })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'সঠিক উচ্চারণ শুনুন' : 'Listen to Target Form'}</span>
            </button>

            {!recognitionChecked ? (
              <button
                type="button"
                disabled={!selectedOptionId}
                onClick={handleCheckRecognition}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{lang === 'bn' ? 'উত্তর যাচাই করুন' : 'Check Selection'}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProceedToRewrite}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{lang === 'bn' ? 'ধাপ ২-এ যান (সংশোধন লিখুন)' : 'Continue to Step 2 (Active Repair)'}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Active Rewrite */}
      {step === 'rewrite' && (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'সংশোধন করার জন্য ভুল বাক্যাংশ' : 'Repair this error'}
            </p>
            <p className="mt-1 text-sm font-medium text-rose-300">{drill.flawedOriginal}</p>
            <p className="mt-2 font-bn text-xs text-slate-300">{mistake.explanationBn}</p>
          </div>

          <div>
            <label
              htmlFor="mistake-drill-rewrite"
              className="block text-sm font-medium text-slate-200"
            >
              {lang === 'bn' ? drill.rewritePromptBn : drill.rewritePromptEn}
            </label>
            <input
              id="mistake-drill-rewrite"
              type="text"
              value={rewriteInput}
              onChange={(e) => setRewriteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && rewriteInput.trim() && !isSaving) {
                  void handleSubmitRewrite();
                }
              }}
              placeholder={
                lang === 'bn'
                  ? 'সঠিক ইংরেজি রূপটি এখানে লিখুন...'
                  : 'Type the corrected English phrase here...'
              }
              className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
            />
          </div>

          {rewriteFeedback && !rewriteFeedback.isCorrect && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-200">
              {lang === 'bn' ? rewriteFeedback.feedbackBn : rewriteFeedback.feedbackEn}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep('recognize')}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {lang === 'bn' ? '← ধাপ ১-এ ফিরুন' : '← Back to Step 1'}
            </button>

            <button
              type="button"
              disabled={!rewriteInput.trim() || isSaving}
              onClick={() => void handleSubmitRewrite()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>
                {isSaving
                  ? lang === 'bn'
                    ? 'সংরক্ষণ হচ্ছে...'
                    : 'Saving...'
                  : lang === 'bn'
                    ? 'সংশোধন যাচাই ও সংরক্ষণ করুন'
                    : 'Verify Repair & Update Schedule'}
              </span>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Updated Status & Spaced Review Summary */}
      {step === 'summary' && updatedMistake && (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {updatedMistake.status === 'resolved'
                  ? lang === 'bn'
                    ? 'প্যাটার্নটি সমাধান হিসেবে যাচাই হয়েছে!'
                    : 'Pattern Verified as Resolved!'
                  : lang === 'bn'
                    ? 'সফল পুনরায় যাচাই — স্ট্যাটাস "অনুশীলনরত (Practicing)"-এ উন্নীত হয়েছে'
                    : 'Successful Retest — Status Updated to Practicing'}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-200">
              {updatedMistake.status === 'resolved'
                ? lang === 'bn'
                  ? 'আপনি পরপর সফলভাবে এই ভুলটি সংশোধন করেছেন। দীর্ঘমেয়াদি স্মৃতিতে ধরে রাখতে পরবর্তী চেক-ইন নির্ধারিত হয়েছে।'
                  : 'You passed consecutive targeted retests on this exact pattern. A long-term check-in has been scheduled.'
                : lang === 'bn'
                  ? 'একবার সফল হলেই সম্পূর্ণ সমাধান ঘোষণা করা হয় না — আরও একটি সফল রিভিউয়ে এটি Resolved হবে।'
                  : 'We never declare full resolution from a single pass — one more successful retest will mark this pattern Resolved.'}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
              <dt className="text-xs text-slate-400">
                {lang === 'bn' ? 'বর্তমান অবস্থা' : 'Updated Status'}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-white">
                {statusText(updatedMistake.status)}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
              <dt className="text-xs text-slate-400">
                {lang === 'bn' ? 'সফল পুনরায় যাচাই' : 'Verified Passes'}
              </dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-[#3B82F6] tabular-nums">
                {updatedMistake.practicePassCount ?? 0} / 2
              </dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
              <dt className="text-xs text-slate-400">
                {lang === 'bn' ? 'পরবর্তী রিভিউ' : 'Next Spaced Review'}
              </dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[#8B5CF6] tabular-nums">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{formatDate(updatedMistake.nextReviewAt)}</span>
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {updatedMistake.status !== 'resolved' && (
              <button
                type="button"
                onClick={handleRetryDrill}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'দ্বিতীয়বার যাচাই করুন' : 'Run Confirmation Retest'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>{lang === 'bn' ? 'Mistake Memory-তে ফিরুন' : 'Done'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
