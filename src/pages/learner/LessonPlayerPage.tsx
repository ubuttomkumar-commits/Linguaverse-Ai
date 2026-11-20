import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { LessonExamplesStage } from '../../components/academy/LessonExamplesStage';
import {
  LessonGuidedStage,
  type GuidedOutcome,
} from '../../components/academy/LessonGuidedStage';
import {
  LessonIndependentStage,
  type IndependentOutcome,
} from '../../components/academy/LessonIndependentStage';
import {
  LessonAssessmentStage,
  type AssessmentOutcome,
} from '../../components/academy/LessonAssessmentStage';
import { LessonMasteryStage } from '../../components/academy/LessonMasteryStage';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getCourseById, getLessonById } from '../../domain/curriculumData';
import { evaluateAssessmentQuestion } from '../../domain/lessonEngine';
import { stopSpeaking } from '../../utils/speechSynthesis';
import type {
  ExplanationLanguage,
  GuidedExercise,
  IndependentExercise,
  LessonAttemptRecord,
  LessonStageKey,
  SpacedRepetitionPreset,
} from '../../types/domain';

const STAGE_ORDER: {
  key: LessonStageKey;
  num: string;
  labelEn: string;
  labelBn: string;
}[] = [
  { key: 'objective', num: '01', labelEn: 'Objective', labelBn: 'উদ্দেশ্য' },
  { key: 'explanation', num: '02', labelEn: 'Concept', labelBn: 'নিয়ম ও ব্যাখ্যা' },
  { key: 'examples', num: '03', labelEn: 'Examples', labelBn: 'উদাহরণ' },
  { key: 'guided', num: '04', labelEn: 'Guided', labelBn: 'নির্দেশিত' },
  { key: 'independent', num: '05', labelEn: 'Independent', labelBn: 'স্বাধীন' },
  { key: 'assessment', num: '06', labelEn: 'Assessment', labelBn: 'মূল্যায়ন' },
  { key: 'mastery', num: '07', labelEn: 'Mastery', labelBn: 'মাস্টারি' },
];

export function LessonPlayerPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { lang } = useLanguage();
  const {
    profile,
    lessonAttempts,
    lessonMastery,
    recordExerciseAttempt,
    recordLessonAttempt,
    updateProfile,
  } = useAuth();

  const lesson = lessonId ? getLessonById(lessonId) : undefined;
  const course = lesson ? getCourseById(lesson.courseId) : undefined;

  const [activeStage, setActiveStage] = useState<LessonStageKey>('objective');
  const [attemptSessionKey, setAttemptSessionKey] = useState(0);
  const [explanationView, setExplanationView] = useState<ExplanationLanguage>(
    profile?.explanationLanguage ?? 'both'
  );

  const [guidedOutcomes, setGuidedOutcomes] = useState<Record<string, GuidedOutcome>>({});
  const [independentOutcomes, setIndependentOutcomes] = useState<
    Record<string, IndependentOutcome>
  >({});
  const [assessmentOutcomes, setAssessmentOutcomes] = useState<
    Record<string, AssessmentOutcome> | null
  >(null);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [latestCompletedAttempt, setLatestCompletedAttempt] =
    useState<LessonAttemptRecord | null>(null);
  const [stageHint, setStageHint] = useState<string | null>(null);

  const startedAtRef = useRef<string>(new Date().toISOString());
  const sessionMistakesRef = useRef<number>(0);

  // Reset local player state cleanly whenever switching to another lesson
  useEffect(() => {
    stopSpeaking();
    setActiveStage('objective');
    setGuidedOutcomes({});
    setIndependentOutcomes({});
    setAssessmentOutcomes(null);
    setLatestCompletedAttempt(null);
    setStageHint(null);
    startedAtRef.current = new Date().toISOString();
    sessionMistakesRef.current = 0;
  }, [lessonId]);

  useEffect(() => {
    if (profile?.explanationLanguage) {
      setExplanationView(profile.explanationLanguage);
    }
  }, [profile?.explanationLanguage]);

  useEffect(() => {
    if (activeStage !== 'examples') {
      stopSpeaking();
    }
    setStageHint(null);
  }, [activeStage]);

  const allAttemptsForLesson = useMemo(() => {
    if (!lesson) return [];
    return lessonAttempts
      .filter((a) => a.lessonId === lesson.id)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
  }, [lesson, lessonAttempts]);

  const currentMastery = lesson ? (lessonMastery[lesson.id] ?? null) : null;
  const displayLatestAttempt =
    latestCompletedAttempt ??
    (allAttemptsForLesson.length > 0
      ? allAttemptsForLesson[allAttemptsForLesson.length - 1]
      : null);

  if (!lesson) {
    return (
      <LearnerShell title={lang === 'bn' ? 'লেসন পাওয়া যায়নি' : 'Lesson Not Found'}>
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white">
            {lang === 'bn'
              ? 'অনুরোধকৃত লেসনটি পাওয়া যায়নি'
              : 'The requested lesson could not be found'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {lang === 'bn'
              ? 'একাডেমি থেকে আপনার উপযোগী একটি লেসন নির্বাচন করুন।'
              : 'Return to The Academy to select a structured lesson from your track.'}
          </p>
          <div className="mt-5">
            <Link
              to="/app/learn"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'একাডেমিতে ফিরে যান' : 'Back to Academy'}</span>
            </Link>
          </div>
        </div>
      </LearnerShell>
    );
  }

  const stageIndex = STAGE_ORDER.findIndex((s) => s.key === activeStage);
  const guidedDoneCount = Object.keys(guidedOutcomes).length;
  const guidedTotal = lesson.guidedExercises.length;
  const independentDoneCount = Object.keys(independentOutcomes).length;
  const independentTotal = lesson.independentExercises.length;
  const masteryUnlocked = assessmentOutcomes !== null || allAttemptsForLesson.length > 0;
  const schedulePreset: SpacedRepetitionPreset =
    profile?.spacedRepetitionPreset ?? 'standard';

  const handleRecordGuided = async (exercise: GuidedExercise, outcome: GuidedOutcome) => {
    setGuidedOutcomes((prev) => ({ ...prev, [exercise.id]: outcome }));
    if (!outcome.isCorrect) {
      sessionMistakesRef.current += 1;
    }
    await recordExerciseAttempt({
      lessonId: lesson.id,
      stage: 'guided',
      exerciseId: exercise.id,
      exerciseType: exercise.type,
      userResponse: outcome.userResponse,
      expectedAnswer: outcome.evaluation.expectedAnswer,
      isCorrect: outcome.isCorrect,
      mistakeCategory: exercise.mistakeCategory,
      domain: exercise.domain,
      patternEn: exercise.patternEn,
      patternBn: exercise.patternBn,
      explanationEn: exercise.explanationEn,
      explanationBn: exercise.explanationBn,
      mistakeSource: 'lesson_guided',
    });
  };

  const handleRecordIndependent = async (
    exercise: IndependentExercise,
    outcome: IndependentOutcome
  ) => {
    setIndependentOutcomes((prev) => ({ ...prev, [exercise.id]: outcome }));
    if (!outcome.isCorrect) {
      sessionMistakesRef.current += 1;
    }
    await recordExerciseAttempt({
      lessonId: lesson.id,
      stage: 'independent',
      exerciseId: exercise.id,
      exerciseType: 'sentence_construction',
      userResponse: outcome.userResponse,
      expectedAnswer: outcome.evaluation.expectedAnswer,
      isCorrect: outcome.isCorrect,
      mistakeCategory: exercise.mistakeCategory,
      domain: exercise.domain,
      patternEn: exercise.patternEn,
      patternBn: exercise.patternBn,
      explanationEn: exercise.explanationEn,
      explanationBn: exercise.explanationBn,
      mistakeSource: 'lesson_independent',
    });
  };

  const handleSubmitAssessment = async (responses: Record<string, string>) => {
    setIsSubmittingAssessment(true);
    try {
      const gradedMap: Record<string, AssessmentOutcome> = {};
      let assessmentCorrect = 0;

      for (const question of lesson.assessmentQuestions) {
        const userResp = responses[question.id] ?? '';
        const evaluation = evaluateAssessmentQuestion(question, userResp);
        if (evaluation.isCorrect) {
          assessmentCorrect += 1;
        } else {
          sessionMistakesRef.current += 1;
        }

        gradedMap[question.id] = {
          questionId: question.id,
          isCorrect: evaluation.isCorrect,
          userResponse: userResp,
          evaluation,
        };

        await recordExerciseAttempt({
          lessonId: lesson.id,
          stage: 'assessment',
          exerciseId: question.id,
          exerciseType: question.type,
          userResponse: evaluation.normalizedUserAnswer,
          expectedAnswer: evaluation.expectedAnswer,
          isCorrect: evaluation.isCorrect,
          mistakeCategory: question.mistakeCategory,
          domain: question.domain,
          patternEn: question.patternEn,
          patternBn: question.patternBn,
          explanationEn: question.explanationEn,
          explanationBn: question.explanationBn,
          mistakeSource: 'lesson_assessment',
        });
      }

      setAssessmentOutcomes(gradedMap);

      const guidedCorrect = Object.values(guidedOutcomes).filter((o) => o.isCorrect).length;
      const independentCorrect = Object.values(independentOutcomes).filter(
        (o) => o.isCorrect
      ).length;
      const elapsedSeconds = Math.max(
        15,
        Math.round((Date.now() - new Date(startedAtRef.current).getTime()) / 1000)
      );

      const result = await recordLessonAttempt({
        lessonId: lesson.id,
        startedAt: startedAtRef.current,
        completedAt: new Date().toISOString(),
        durationSeconds: elapsedSeconds,
        guidedCorrect,
        guidedTotal,
        independentCorrect,
        independentTotal,
        assessmentCorrect,
        assessmentTotal: lesson.assessmentQuestions.length,
        mistakesLoggedCount: sessionMistakesRef.current,
      });

      setLatestCompletedAttempt(result.lessonAttempt);
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const handleChangePreset = async (preset: SpacedRepetitionPreset) => {
    await updateProfile({ spacedRepetitionPreset: preset });
  };

  const handlePracticeAgain = () => {
    stopSpeaking();
    setGuidedOutcomes({});
    setIndependentOutcomes({});
    setAssessmentOutcomes(null);
    setLatestCompletedAttempt(null);
    setStageHint(null);
    startedAtRef.current = new Date().toISOString();
    sessionMistakesRef.current = 0;
    setAttemptSessionKey((k) => k + 1);
    setActiveStage('objective');
  };

  const handleNextStage = () => {
    if (activeStage === 'guided' && guidedDoneCount < guidedTotal) {
      setStageHint(
        lang === 'bn'
          ? `পরবর্তী ধাপে যাওয়ার আগে সবগুলো নির্দেশিত অনুশীলন যাচাই করুন (${guidedDoneCount}/${guidedTotal} সম্পন্ন)।`
          : `Check all guided drills before moving forward (${guidedDoneCount}/${guidedTotal} completed).`
      );
      return;
    }

    if (activeStage === 'independent' && independentDoneCount < independentTotal) {
      setStageHint(
        lang === 'bn'
          ? `মূল্যায়নে যাওয়ার আগে স্বাধীন বাক্য গঠনের সব কাজ জমা দিন (${independentDoneCount}/${independentTotal} সম্পন্ন)।`
          : `Submit all independent sentence tasks before starting the assessment (${independentDoneCount}/${independentTotal} completed).`
      );
      return;
    }

    if (activeStage === 'assessment' && !masteryUnlocked) {
      setStageHint(
        lang === 'bn'
          ? 'মাস্টারি ও পরবর্তী রিভিউ তারিখ দেখতে মূল্যায়নটি জমা দিন।'
          : 'Grade the assessment above to unlock your Mastery & Spaced Review stage.'
      );
      return;
    }

    if (stageIndex < STAGE_ORDER.length - 1) {
      setActiveStage(STAGE_ORDER[stageIndex + 1].key);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevStage = () => {
    if (stageIndex > 0) {
      setActiveStage(STAGE_ORDER[stageIndex - 1].key);
      window.scrollTo(0, 0);
    }
  };

  return (
    <LearnerShell title={lang === 'bn' ? 'একাডেমি লেসন' : 'Academy Lesson'}>
      {/* Breadcrumb & Lesson Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/learn"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{lang === 'bn' ? 'একাডেমিতে ফিরে যান' : 'Back to Academy'}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="font-mono text-[#3B82F6]">{lesson.cefrBand}</span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            {lesson.estimatedMinutes} {lang === 'bn' ? 'মিনিট' : 'min'}
          </span>
          {currentMastery && (
            <>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-mono font-semibold text-slate-200 tabular-nums">
                {lang === 'bn'
                  ? `মাস্টারি ${currentMastery.masteryPercent}%`
                  : `Mastery ${currentMastery.masteryPercent}%`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Lesson Title Block */}
      <div className="mb-6">
        {course && (
          <p className="text-xs font-medium text-slate-400">
            {lang === 'bn' ? course.titleBn : course.titleEn}
          </p>
        )}
        <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
          {lang === 'bn' ? lesson.titleBn : lesson.titleEn}
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">
          {lang === 'bn' ? lesson.summaryBn : lesson.summaryEn}
        </p>
      </div>

      {/* 7-Stage Interactive Stepper */}
      <nav
        aria-label="Lesson stages"
        className="mb-6 overflow-x-auto rounded-xl border border-slate-800 bg-[#111827] p-2"
      >
        <ol className="flex min-w-max items-center gap-1.5">
          {STAGE_ORDER.map((stage, idx) => {
            const isActive = stage.key === activeStage;
            const isLocked = stage.key === 'mastery' && !masteryUnlocked;
            const isDone =
              (stage.key === 'guided' && guidedDoneCount === guidedTotal) ||
              (stage.key === 'independent' && independentDoneCount === independentTotal) ||
              (stage.key === 'assessment' && assessmentOutcomes !== null) ||
              (stage.key === 'mastery' && allAttemptsForLesson.length > 0) ||
              idx < stageIndex;

            return (
              <li key={stage.key}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setActiveStage(stage.key)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#3B82F6] text-white'
                      : isLocked
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-3 w-3" aria-hidden="true" />
                  ) : isDone && !isActive ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <span className="font-mono text-[11px] opacity-80 tabular-nums">
                      {stage.num}
                    </span>
                  )}
                  <span>{lang === 'bn' ? stage.labelBn : stage.labelEn}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Active Stage Workspace Container */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-7">
        {/* STAGE 1: Learning Objective & Prerequisites */}
        {activeStage === 'objective' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <p className="font-mono text-xs text-[#3B82F6]">
                {lang === 'bn' ? 'ধাপ ০১ · শিক্ষণ উদ্দেশ্য ও পূর্বশর্ত' : 'Stage 01 · Learning Objective & Prerequisites'}
              </p>
              <h3 className="mt-1 text-lg font-bold text-white sm:text-xl">
                {lang === 'bn'
                  ? 'এই লেসন শেষে আপনি যা আয়ত্ত করবেন'
                  : 'What You Will Master in This Lesson'}
              </h3>
            </div>

            <ul className="space-y-3">
              {(lang === 'bn' ? lesson.objectivesBn : lesson.objectivesEn).map((obj, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-slate-800 bg-[#0A0F1C] p-4 text-sm leading-relaxed text-slate-200"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]"
                    aria-hidden="true"
                  />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>

            {/* Prerequisites & Target Mistake Categories */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Layers className="h-4 w-4 text-[#8B5CF6]" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'পূর্বশর্ত (Prerequisites)' : 'Prerequisites'}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {lang === 'bn' ? lesson.prerequisiteNoteBn : lesson.prerequisiteNoteEn}
                </p>

                {lesson.prerequisiteLessonIds.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                    {lesson.prerequisiteLessonIds.map((prereqId) => {
                      const prereqLesson = getLessonById(prereqId);
                      const prereqMastery = lessonMastery[prereqId];
                      if (!prereqLesson) return null;
                      return (
                        <div
                          key={prereqId}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <Link
                            to={`/app/learn/${prereqLesson.id}`}
                            className="font-medium text-[#3B82F6] hover:text-blue-400 underline underline-offset-2"
                          >
                            {lang === 'bn' ? prereqLesson.titleBn : prereqLesson.titleEn}
                          </Link>
                          <span
                            className={`font-mono tabular-nums ${
                              prereqMastery ? 'text-emerald-400' : 'text-[#F59E0B]'
                            }`}
                          >
                            {prereqMastery
                              ? lang === 'bn'
                                ? `${prereqMastery.masteryPercent}% সম্পন্ন`
                                : `${prereqMastery.masteryPercent}% observed`
                              : lang === 'bn'
                                ? 'এখনো করা হয়নি'
                                : 'Not yet attempted'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <BookOpen className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />
                  <span>
                    {lang === 'bn'
                      ? 'লক্ষ্যকৃত Mistake Memory ক্যাটাগরি'
                      : 'Target Mistake Memory Categories'}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-white">
                  {lesson.targetCategories.join(' · ')}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {lang === 'bn'
                    ? 'অনুশীলন বা মূল্যায়নে কোনো ভুল হলে তা এই ক্যাটাগরিতে স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।'
                    : 'Any recurring slip during practice or assessment is automatically captured under these categories with Bangla explanations.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: Bilingual Concept Explanation */}
        {activeStage === 'explanation' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs text-[#3B82F6]">
                  {lang === 'bn'
                    ? 'ধাপ ০২ · দ্বিভাষিক নিয়ম ও বাংলা প্রভাব বিশ্লেষণ'
                    : 'Stage 02 · Bilingual Concept Explanation'}
                </p>
                <h3 className="mt-1 text-lg font-bold text-white sm:text-xl">
                  {lang === 'bn' ? lesson.conceptRuleTitleBn : lesson.conceptRuleTitleEn}
                </h3>
              </div>

              {/* Inline Explanation View Switcher */}
              <div
                role="group"
                aria-label="Explanation display language"
                className="inline-flex items-center rounded-lg border border-slate-800 bg-[#0A0F1C] p-0.5 self-start shrink-0"
              >
                {(
                  [
                    { id: 'bn', label: 'বাংলা' },
                    { id: 'both', label: lang === 'bn' ? 'উভয়' : 'Both' },
                    { id: 'en', label: 'EN' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={explanationView === opt.id}
                    onClick={() => setExplanationView(opt.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      explanationView === opt.id
                        ? 'bg-[#3B82F6] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* English Core Rule */}
            <div className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5 space-y-3">
              <p className="text-xs font-semibold text-[#3B82F6]">
                {lang === 'bn' ? 'ইংরেজি গঠনের মূল নিয়ম' : 'Core English Structure'}
              </p>
              {(explanationView === 'en' || explanationView === 'both') && (
                <p className="text-sm leading-relaxed text-slate-200">{lesson.conceptRuleEn}</p>
              )}
              {(explanationView === 'bn' || explanationView === 'both') && (
                <p className="font-bn text-sm leading-relaxed text-slate-200">
                  {lesson.conceptRuleBn}
                </p>
              )}
            </div>

            {/* Why Bangla Speakers Make This Mistake */}
            <div className="rounded-xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 p-5 space-y-3">
              <p className="text-xs font-semibold text-violet-300">
                {lang === 'bn'
                  ? lesson.banglaInterferenceTitleBn
                  : lesson.banglaInterferenceTitleEn}
              </p>
              {(explanationView === 'bn' || explanationView === 'both') && (
                <p className="font-bn text-sm leading-relaxed text-slate-100">
                  {lesson.banglaInterferenceBn}
                </p>
              )}
              {(explanationView === 'en' || explanationView === 'both') && (
                <p className="text-sm leading-relaxed text-slate-300">
                  {lesson.banglaInterferenceEn}
                </p>
              )}
            </div>

            {/* Contrast Table */}
            <div className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-5">
              <h4 className="text-sm font-bold text-white">
                {lang === 'bn'
                  ? 'বাংলা চিন্তা বনাম স্বাভাবিক ইংরেজি তুলনা'
                  : 'Bangla Thought vs. Common Trap vs. Natural English'}
              </h4>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400">
                      <th className="py-2.5 pr-4 font-medium">
                        {lang === 'bn' ? 'বাংলা চিন্তা' : 'Bangla Thought'}
                      </th>
                      <th className="py-2.5 pr-4 font-medium">
                        {lang === 'bn' ? 'সাধারণ ভুল (Trap)' : 'Common Bangla-L1 Trap'}
                      </th>
                      <th className="py-2.5 font-medium">
                        {lang === 'bn' ? 'স্বাভাবিক ইংরেজি' : 'Natural English'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {lesson.contrastRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="font-bn py-3 pr-4 text-slate-200">{row.banglaThought}</td>
                        <td className="py-3 pr-4 text-rose-300 line-through">{row.commonTrap}</td>
                        <td className="py-3 font-semibold text-emerald-300">
                          {row.naturalEnglish}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: Real-World Examples with TTS Audio */}
        {activeStage === 'examples' && <LessonExamplesStage examples={lesson.examples} />}

        {/* STAGE 4: Guided Practice */}
        {activeStage === 'guided' && (
          <LessonGuidedStage
            key={`guided-${lesson.id}-${attemptSessionKey}`}
            exercises={lesson.guidedExercises}
            explanationPref={explanationView}
            outcomes={guidedOutcomes}
            onRecordResult={handleRecordGuided}
          />
        )}

        {/* STAGE 5: Independent Practice */}
        {activeStage === 'independent' && (
          <LessonIndependentStage
            key={`ind-${lesson.id}-${attemptSessionKey}`}
            exercises={lesson.independentExercises}
            explanationPref={explanationView}
            outcomes={independentOutcomes}
            onRecordResult={handleRecordIndependent}
          />
        )}

        {/* STAGE 6: Graded Lesson Assessment */}
        {activeStage === 'assessment' && (
          <LessonAssessmentStage
            key={`assess-${lesson.id}-${attemptSessionKey}`}
            questions={lesson.assessmentQuestions}
            explanationPref={explanationView}
            outcomes={assessmentOutcomes}
            isSubmitting={isSubmittingAssessment}
            onSubmitAssessment={handleSubmitAssessment}
          />
        )}

        {/* STAGE 7: Mastery & Spaced Repetition Scheduling */}
        {activeStage === 'mastery' && (
          <LessonMasteryStage
            mastery={currentMastery}
            latestAttempt={displayLatestAttempt}
            allLessonAttempts={allAttemptsForLesson}
            schedulePreset={schedulePreset}
            onChangePreset={handleChangePreset}
            onPracticeAgain={handlePracticeAgain}
          />
        )}

        {/* Stage Hint & Bottom Stage Navigation */}
        {stageHint && (
          <p role="alert" className="mt-5 text-xs font-medium text-[#F59E0B] sm:text-sm">
            {stageHint}
          </p>
        )}

        {activeStage !== 'mastery' && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
            <button
              type="button"
              disabled={stageIndex === 0}
              onClick={handlePrevStage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'পূর্ববর্তী ধাপ' : 'Previous Stage'}</span>
            </button>

            <button
              type="button"
              onClick={handleNextStage}
              disabled={activeStage === 'assessment' && !masteryUnlocked}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <span>
                {activeStage === 'assessment'
                  ? lang === 'bn'
                    ? 'মাস্টারি ও রিভিউ সূচি দেখুন'
                    : 'View Mastery & Schedule'
                  : lang === 'bn'
                    ? `পরবর্তী: ${STAGE_ORDER[stageIndex + 1].labelBn}`
                    : `Next: ${STAGE_ORDER[stageIndex + 1].labelEn}`}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
    </LearnerShell>
  );
}
