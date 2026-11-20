import { useState } from 'react';
import { CheckCircle2, Eye, XCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  evaluateIndependentExercise,
  type ExerciseEvaluationResult,
} from '../../domain/lessonEngine';
import type { ExplanationLanguage, IndependentExercise } from '../../types/domain';

export interface IndependentOutcome {
  exerciseId: string;
  isCorrect: boolean;
  userResponse: string;
  evaluation: ExerciseEvaluationResult;
}

interface LessonIndependentStageProps {
  exercises: IndependentExercise[];
  explanationPref: ExplanationLanguage;
  outcomes: Record<string, IndependentOutcome>;
  onRecordResult: (
    exercise: IndependentExercise,
    outcome: IndependentOutcome
  ) => Promise<void>;
}

export function LessonIndependentStage({
  exercises,
  explanationPref,
  outcomes,
  onRecordResult,
}: LessonIndependentStageProps) {
  const { lang } = useLanguage();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [shownHints, setShownHints] = useState<Record<string, boolean>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleSubmit = async (exercise: IndependentExercise) => {
    const response = (inputs[exercise.id] ?? '').trim();
    if (!response) return;

    setSubmittingId(exercise.id);
    try {
      const evaluation = evaluateIndependentExercise(exercise, response);
      await onRecordResult(exercise, {
        exerciseId: exercise.id,
        isCorrect: evaluation.isCorrect,
        userResponse: response,
        evaluation,
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">
          {lang === 'bn'
            ? 'স্বাধীন বাক্য গঠন (Independent Practice)'
            : 'Independent Sentence Construction'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {lang === 'bn'
            ? 'নিজে সম্পূর্ণ ইংরেজি বাক্য টাইপ করুন। বাংলা অনুবাদের সাধারণ ফাঁদগুলো স্বয়ংক্রিয়ভাবে যাচাই করা হবে।'
            : 'Type complete English sentences from the Bangla prompts below. Bangla-to-English interference traps are checked automatically.'}
        </p>
      </div>

      <div className="space-y-5">
        {exercises.map((exercise, idx) => {
          const outcome = outcomes[exercise.id];
          const isChecked = Boolean(outcome);
          const value = inputs[exercise.id] ?? '';
          const showHint = Boolean(shownHints[exercise.id]);

          return (
            <div
              key={exercise.id}
              className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[#3B82F6] tabular-nums">
                  Task 0{idx + 1} / 0{exercises.length}
                </span>
                <span className="text-slate-400">{exercise.mistakeCategory}</span>
              </div>

              <p className="mt-2.5 text-sm font-medium text-slate-300">
                {lang === 'bn' ? exercise.promptBn : exercise.promptEn}
              </p>

              <p className="font-bn mt-2 rounded-lg border border-slate-800 bg-[#111827] px-4 py-3 text-base font-semibold text-white">
                {exercise.banglaCue}
              </p>

              {/* Optional Hint Words Disclosure */}
              <div className="mt-3">
                {!showHint ? (
                  <button
                    type="button"
                    onClick={() => setShownHints((prev) => ({ ...prev, [exercise.id]: true }))}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#3B82F6] cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'সহায়ক শব্দ দেখুন' : 'Show key phrase hints'}</span>
                  </button>
                ) : (
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {lang === 'bn' ? 'সহায়ক শব্দ: ' : 'Key phrases: '}
                    </span>
                    {exercise.hintWords.join(' · ')}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label
                  htmlFor={`ind-input-${exercise.id}`}
                  className="block text-xs font-medium text-slate-400"
                >
                  {lang === 'bn' ? 'আপনার ইংরেজি বাক্য লিখুন' : 'Your English sentence'}
                </label>
                <input
                  id={`ind-input-${exercise.id}`}
                  type="text"
                  disabled={isChecked}
                  value={value}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [exercise.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isChecked && value.trim()) {
                      e.preventDefault();
                      handleSubmit(exercise);
                    }
                  }}
                  placeholder={
                    lang === 'bn'
                      ? 'এখানে সম্পূর্ণ ইংরেজি বাক্য টাইপ করুন...'
                      : 'Type your complete English sentence here...'
                  }
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none disabled:opacity-75"
                />
              </div>

              {!isChecked ? (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={!value.trim() || submittingId === exercise.id}
                    onClick={() => handleSubmit(exercise)}
                    className="rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? 'বাক্য যাচাই করুন' : 'Evaluate Sentence'}
                  </button>
                </div>
              ) : (
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
                          ? 'সঠিক বাক্য গঠন'
                          : 'Strong Natural Sentence'
                        : lang === 'bn'
                          ? 'Mistake Memory-তে সংরক্ষিত হয়েছে'
                          : 'Logged to Mistake Memory'}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5 leading-relaxed">
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
    </div>
  );
}
