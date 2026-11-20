import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { ExerciseEvaluationResult } from '../../domain/lessonEngine';
import type { AssessmentQuestion, ExplanationLanguage } from '../../types/domain';

export interface AssessmentOutcome {
  questionId: string;
  isCorrect: boolean;
  userResponse: string;
  evaluation: ExerciseEvaluationResult;
}

interface LessonAssessmentStageProps {
  questions: AssessmentQuestion[];
  explanationPref: ExplanationLanguage;
  outcomes: Record<string, AssessmentOutcome> | null;
  isSubmitting: boolean;
  onSubmitAssessment: (responses: Record<string, string>) => Promise<void>;
}

export function LessonAssessmentStage({
  questions,
  explanationPref,
  outcomes,
  isSubmitting,
  onSubmitAssessment,
}: LessonAssessmentStageProps) {
  const { lang } = useLanguage();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const isGraded = outcomes !== null;

  const handleGrade = async () => {
    const missing = questions.some((q) => !(responses[q.id] ?? '').trim());
    if (missing) {
      setValidationError(
        lang === 'bn'
          ? 'জমা দেওয়ার আগে অনুগ্রহ করে ৩টি প্রশ্নেরই উত্তর দিন।'
          : 'Please answer all assessment questions before grading.'
      );
      return;
    }
    setValidationError(null);
    await onSubmitAssessment(responses);
  };

  const correctCount = outcomes
    ? Object.values(outcomes).filter((o) => o.isCorrect).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white sm:text-xl">
            {lang === 'bn'
              ? 'লেসন মূল্যায়ন (Graded Assessment)'
              : 'Graded Lesson Assessment'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {lang === 'bn'
              ? 'কোনো হিন্ট ছাড়া ৩টি প্রশ্নের উত্তর দিন। সাথে সাথেই ব্যাখ্যাসহ ফলাফল ও পরবর্তী রিভিউ তারিখ নির্ধারিত হবে।'
              : 'Answer all 3 items without hints. Your responses are graded immediately with bilingual explanations and saved to your evidence log.'}
          </p>
        </div>

        {isGraded && (
          <div className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2 text-right">
            <p className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'মূল্যায়ন স্কোর' : 'Assessment Score'}
            </p>
            <p className="font-mono text-lg font-bold text-white tabular-nums">
              {correctCount} / {questions.length}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {questions.map((q, idx) => {
          const outcome = outcomes?.[q.id];
          return (
            <div
              key={q.id}
              className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <span className="font-mono text-[#8B5CF6] tabular-nums">
                  Q0{idx + 1} / 0{questions.length}
                </span>
                <span>{q.mistakeCategory}</span>
              </div>

              <p className="mt-2.5 text-sm font-semibold text-white sm:text-base">
                {lang === 'bn' ? q.promptBn : q.promptEn}
              </p>

              {q.type === 'mcq' && q.options && (
                <div
                  role="radiogroup"
                  aria-label={`Assessment question ${idx + 1}`}
                  className="mt-4 space-y-2.5"
                >
                  {q.options.map((opt) => {
                    const selected = responses[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={isGraded}
                        onClick={() =>
                          setResponses((prev) => ({ ...prev, [q.id]: opt.id }))
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          selected
                            ? 'border-[#3B82F6] bg-[#3B82F6]/15 font-medium text-white'
                            : 'border-slate-800 bg-[#111827] text-slate-200 hover:border-slate-700'
                        } ${isGraded ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'construct' && (
                <div className="mt-4">
                  <label
                    htmlFor={`assess-input-${q.id}`}
                    className="block text-xs font-medium text-slate-400"
                  >
                    {lang === 'bn' ? 'শুদ্ধ বাক্যটি লিখুন' : 'Write the corrected sentence'}
                  </label>
                  <input
                    id={`assess-input-${q.id}`}
                    type="text"
                    disabled={isGraded}
                    value={responses[q.id] ?? ''}
                    onChange={(e) =>
                      setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder={
                      lang === 'bn'
                        ? 'শুদ্ধ ইংরেজি বাক্যটি এখানে লিখুন...'
                        : 'Type the corrected English sentence...'
                    }
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none disabled:opacity-75"
                  />
                </div>
              )}

              {outcome && (
                <div
                  className={`mt-4 rounded-lg border p-4 text-sm ${
                    outcome.isCorrect
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-[#F59E0B]/40 bg-[#F59E0B]/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {outcome.isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
                    )}
                    <span className={outcome.isCorrect ? 'text-emerald-400' : 'text-[#F59E0B]'}>
                      {outcome.isCorrect
                        ? lang === 'bn'
                          ? 'সঠিক উত্তর'
                          : 'Correct'
                        : lang === 'bn'
                          ? 'Mistake Memory-তে যুক্ত হয়েছে'
                          : 'Logged to Mistake Memory'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 leading-relaxed">
                    {(explanationPref === 'bn' || explanationPref === 'both') && (
                      <p className="font-bn text-slate-100">{outcome.evaluation.feedbackBn}</p>
                    )}
                    {(explanationPref === 'en' || explanationPref === 'both') && (
                      <p className="text-slate-300">{outcome.evaluation.feedbackEn}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {validationError && (
        <p role="alert" className="text-sm font-medium text-[#F59E0B]">
          {validationError}
        </p>
      )}

      {!isGraded && (
        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGrade}
            className="rounded-lg bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {lang === 'bn'
              ? 'মূল্যায়ন জমা দিন ও মাস্টারি হিসাব করুন'
              : 'Grade Assessment & Schedule Review'}
          </button>
        </div>
      )}
    </div>
  );
}
