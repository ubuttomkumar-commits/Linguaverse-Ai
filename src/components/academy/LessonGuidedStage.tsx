import { useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  evaluateGuidedExercise,
  type ExerciseEvaluationResult,
} from '../../domain/lessonEngine';
import type { ExplanationLanguage, GuidedExercise } from '../../types/domain';

export interface GuidedOutcome {
  exerciseId: string;
  isCorrect: boolean;
  userResponse: string;
  evaluation: ExerciseEvaluationResult;
}

interface LessonGuidedStageProps {
  exercises: GuidedExercise[];
  explanationPref: ExplanationLanguage;
  outcomes: Record<string, GuidedOutcome>;
  onRecordResult: (exercise: GuidedExercise, outcome: GuidedOutcome) => Promise<void>;
}

export function LessonGuidedStage({
  exercises,
  explanationPref,
  outcomes,
  onRecordResult,
}: LessonGuidedStageProps) {
  const { lang } = useLanguage();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [reorderTokens, setReorderTokens] = useState<Record<string, string[]>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleCheck = async (exercise: GuidedExercise) => {
    const response =
      exercise.type === 'reorder'
        ? (reorderTokens[exercise.id] ?? []).join(' ')
        : (drafts[exercise.id] ?? '');

    if (!response.trim()) return;

    setSubmittingId(exercise.id);
    try {
      const evaluation = evaluateGuidedExercise(exercise, response);
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

  const handleAddReorderWord = (exId: string, word: string) => {
    setReorderTokens((prev) => {
      const existing = prev[exId] ?? [];
      return { ...prev, [exId]: [...existing, word] };
    });
  };

  const handleRemoveReorderWord = (exId: string, idx: number) => {
    setReorderTokens((prev) => {
      const existing = prev[exId] ?? [];
      return { ...prev, [exId]: existing.filter((_, i) => i !== idx) };
    });
  };

  const handleClearReorder = (exId: string) => {
    setReorderTokens((prev) => ({ ...prev, [exId]: [] }));
  };

  const typeLabel = (type: GuidedExercise['type']) => {
    if (type === 'fill_blank') return lang === 'bn' ? 'শূন্যস্থান পূরণ' : 'Fill in the Blank';
    if (type === 'reorder') return lang === 'bn' ? 'বাক্য সাজানো' : 'Sentence Reordering';
    return lang === 'bn' ? 'ভুল শনাক্তকরণ' : 'Error Spotting';
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">
          {lang === 'bn' ? 'নির্দেশিত অনুশীলন (Guided Practice)' : 'Guided Practice'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {lang === 'bn'
            ? 'তিনটি ভিন্ন ধরনের অনুশীলন সম্পন্ন করুন। কোনো ভুল হলে তা স্বয়ংক্রিয়ভাবে Mistake Memory-তে যুক্ত হবে।'
            : 'Complete all 3 interactive drills below. Any mistake automatically logs to your Mistake Memory with a Bangla explanation.'}
        </p>
      </div>

      <div className="space-y-5">
        {exercises.map((exercise, index) => {
          const outcome = outcomes[exercise.id];
          const isChecked = Boolean(outcome);
          const tokens = reorderTokens[exercise.id] ?? [];
          const currentDraft =
            exercise.type === 'reorder' ? tokens.join(' ') : (drafts[exercise.id] ?? '');

          return (
            <div
              key={exercise.id}
              className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[#8B5CF6] tabular-nums">
                  0{index + 1} · {typeLabel(exercise.type)}
                </span>
                <span className="text-slate-400">{exercise.mistakeCategory}</span>
              </div>

              <p className="mt-2.5 text-sm font-semibold text-white sm:text-base">
                {lang === 'bn' ? exercise.promptBn : exercise.promptEn}
              </p>

              {/* Type 1: Fill in the Blank */}
              {exercise.type === 'fill_blank' && exercise.options && (
                <div className="mt-4 space-y-3">
                  {exercise.sentenceTemplate && (
                    <p className="rounded-lg border border-slate-800 bg-[#111827] px-4 py-3 text-sm font-medium text-slate-100">
                      {exercise.sentenceTemplate}
                    </p>
                  )}
                  <div
                    role="radiogroup"
                    aria-label={`Guided exercise ${index + 1} options`}
                    className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                  >
                    {exercise.options.map((opt) => {
                      const selected = drafts[exercise.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={isChecked}
                          onClick={() => setDrafts((prev) => ({ ...prev, [exercise.id]: opt }))}
                          className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                            selected
                              ? 'border-[#3B82F6] bg-[#3B82F6]/15 font-medium text-white'
                              : 'border-slate-800 bg-[#111827] text-slate-200 hover:border-slate-700'
                          } ${isChecked ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type 2: Sentence Reordering */}
              {exercise.type === 'reorder' && exercise.wordBank && (
                <div className="mt-4 space-y-4">
                  <div className="min-h-[58px] rounded-lg border border-slate-700 bg-[#111827] p-3">
                    {tokens.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {lang === 'bn'
                          ? 'নিচের শব্দগুলোতে ক্লিক করে বাক্য সাজান...'
                          : 'Click word tiles below in order to build the sentence...'}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tokens.map((tok, idx) => (
                          <button
                            key={`${tok}_${idx}`}
                            type="button"
                            disabled={isChecked}
                            onClick={() => handleRemoveReorderWord(exercise.id, idx)}
                            aria-label={`Remove "${tok}"`}
                            className="rounded-md border border-[#3B82F6] bg-[#3B82F6]/15 px-3 py-1.5 text-sm font-medium text-white cursor-pointer disabled:cursor-default"
                          >
                            {tok}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2" aria-label={`Word bank for drill ${index + 1}`}>
                    {exercise.wordBank.map((word) => {
                      const used = tokens.includes(word);
                      return (
                        <button
                          key={word}
                          type="button"
                          disabled={used || isChecked}
                          onClick={() => handleAddReorderWord(exercise.id, word)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                            used || isChecked
                              ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                              : 'border-slate-700 bg-[#111827] text-slate-100 hover:border-[#3B82F6] cursor-pointer'
                          }`}
                        >
                          {word}
                        </button>
                      );
                    })}
                  </div>

                  {!isChecked && tokens.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearReorder(exercise.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Reset tiles'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Type 3: Error Spotting */}
              {exercise.type === 'error_spot' && exercise.segments && (
                <div className="mt-4">
                  <div
                    role="radiogroup"
                    aria-label={`Error spotting segments for drill ${index + 1}`}
                    className="flex flex-wrap gap-2"
                  >
                    {exercise.segments.map((seg, segIdx) => {
                      const selected = drafts[exercise.id] === seg;
                      return (
                        <button
                          key={`${seg}_${segIdx}`}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={isChecked}
                          onClick={() => setDrafts((prev) => ({ ...prev, [exercise.id]: seg }))}
                          className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-amber-200'
                              : 'border-slate-700 bg-[#111827] text-slate-100 hover:border-slate-500'
                          } ${isChecked ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {seg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit / Immediate Explainable Feedback */}
              {!isChecked ? (
                <div className="mt-5">
                  <button
                    type="button"
                    disabled={!currentDraft.trim() || submittingId === exercise.id}
                    onClick={() => handleCheck(exercise)}
                    className="rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? 'উত্তর যাচাই করুন' : 'Check Answer'}
                  </button>
                </div>
              ) : (
                <div
                  className={`mt-5 rounded-lg border p-4 text-sm ${
                    outcome.isCorrect
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-[#F59E0B]/40 bg-[#F59E0B]/10'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        outcome.isCorrect ? 'text-emerald-400' : 'text-[#F59E0B]'
                      }`}
                    >
                      {outcome.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span>
                        {outcome.isCorrect
                          ? lang === 'bn'
                            ? 'সঠিক হয়েছে'
                            : 'Accurate'
                          : lang === 'bn'
                            ? 'Mistake Memory-তে সংরক্ষিত হয়েছে'
                            : 'Logged to Mistake Memory'}
                      </span>
                    </span>
                    <span className="text-slate-400">{exercise.mistakeCategory}</span>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-sm leading-relaxed">
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
