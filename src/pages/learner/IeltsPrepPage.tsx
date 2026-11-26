import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Headphones,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Send,
  Volume2,
  XCircle,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  IELTS_TASK_CATALOG,
  IELTS_TRUTH_DISCLAIMER_BN,
  IELTS_TRUTH_DISCLAIMER_EN,
  countEnglishWords,
  type IeltsExamAttemptRecord,
  type IeltsExamTask,
  type IeltsModuleType,
} from '../../domain/ieltsExamEngine';
import {
  fetchIeltsAttempts,
  fetchIeltsCatalog,
  submitIeltsAttempt,
} from '../../services/prd61Api';

const MODULE_META: ReadonlyArray<{
  id: IeltsModuleType;
  labelEn: string;
  labelBn: string;
  icon: typeof Mic;
}> = [
  { id: 'speaking', labelEn: 'Speaking', labelBn: 'স্পিকিং', icon: Mic },
  { id: 'writing', labelEn: 'Writing', labelBn: 'রাইটিং', icon: FileText },
  { id: 'reading', labelEn: 'Reading', labelBn: 'রিডিং', icon: BookOpen },
  { id: 'listening', labelEn: 'Listening', labelBn: 'লিসেনিং', icon: Headphones },
];

export function IeltsPrepPage() {
  const { lang } = useLanguage();
  const [tasks, setTasks] = useState<readonly IeltsExamTask[]>(IELTS_TASK_CATALOG);
  const [disclaimerEn, setDisclaimerEn] = useState(IELTS_TRUTH_DISCLAIMER_EN);
  const [disclaimerBn, setDisclaimerBn] = useState(IELTS_TRUTH_DISCLAIMER_BN);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [activeModule, setActiveModule] = useState<IeltsModuleType>('speaking');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(IELTS_TASK_CATALOG[0].id);
  const [attempts, setAttempts] = useState<IeltsExamAttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<IeltsExamAttemptRecord | null>(null);

  // Active workspace inputs
  const [responseText, setResponseText] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchIeltsCatalog(), fetchIeltsAttempts()])
      .then(([cat, att]) => {
        if (!mounted) return;
        if (Array.isArray(cat.tasks) && cat.tasks.length > 0) setTasks(cat.tasks);
        setDisclaimerEn(cat.disclaimerEn || IELTS_TRUTH_DISCLAIMER_EN);
        setDisclaimerBn(cat.disclaimerBn || IELTS_TRUTH_DISCLAIMER_BN);
        setFeatureEnabled(cat.featureEnabled !== false);
        setAttempts(att.attempts ?? []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load examination catalog.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const moduleTasks = useMemo(
    () => tasks.filter((t) => t.module === activeModule),
    [tasks, activeModule]
  );

  const selectedTask = useMemo(
    () => moduleTasks.find((t) => t.id === selectedTaskId) ?? moduleTasks[0] ?? tasks[0],
    [moduleTasks, selectedTaskId, tasks]
  );

  useEffect(() => {
    if (moduleTasks.length > 0 && !moduleTasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(moduleTasks[0].id);
    }
  }, [moduleTasks, selectedTaskId]);

  useEffect(() => {
    setResponseText('');
    setSelectedAnswers({});
    setLatestResult(null);
    setError(null);
    setTimerRunning(false);
    setElapsedSeconds(0);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingAudio(false);
    }
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!timerRunning) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const wordCount = useMemo(() => countEnglishWords(responseText), [responseText]);
  const targetSeconds = (selectedTask?.targetMinutes ?? 5) * 60;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const formatClock = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handlePlayListeningAudio = () => {
    if (!selectedTask?.passageOrTranscriptEn || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    if (isSpeakingAudio) {
      setIsSpeakingAudio(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(selectedTask.passageOrTranscriptEn);
    utterance.lang = 'en-GB';
    utterance.rate = 0.94;
    utterance.onend = () => setIsSpeakingAudio(false);
    utterance.onerror = () => setIsSpeakingAudio(false);
    setIsSpeakingAudio(true);
    setTimerRunning(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || submitting) return;
    setError(null);
    setSubmitting(true);
    setTimerRunning(false);

    try {
      const payload =
        selectedTask.module === 'reading' || selectedTask.module === 'listening'
          ? {
              taskId: selectedTask.id,
              selectedAnswers,
              durationSeconds: elapsedSeconds,
            }
          : {
              taskId: selectedTask.id,
              responseText,
              durationSeconds: elapsedSeconds,
            };
      const res = await submitIeltsAttempt(payload);
      setLatestResult(res.attempt);
      setAttempts((prev) => [res.attempt, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to evaluate examination attempt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LearnerShell
      title={lang === 'bn' ? 'IELTS ও পরীক্ষা প্রস্তুতি ল্যাব' : 'IELTS & Examination Prep Lab'}
      subtitle={
        lang === 'bn'
          ? 'মৌলিক স্পিকিং (পার্ট ১–৩), রাইটিং (টাস্ক ১/২ ও লেটার), রিডিং ও লিসেনিং অনুশীলন — স্পষ্ট অনুশীলনমূলক মূল্যায়নসহ।'
          : 'Original timed IELTS-style Speaking (Parts 1–3), Writing (Task 1/2 & Letter), Reading, and Listening practice with honest rubric feedback.'
      }
    >
      <div className="space-y-6">
        {/* Strict Examination Truth Policy Banner (PRD §22.6) */}
        <section
          aria-label="Examination Truth Policy"
          className="rounded-2xl border border-amber-500/35 bg-amber-950/20 p-4 text-xs text-amber-100"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">
                {lang === 'bn'
                  ? 'পরীক্ষা প্রস্তুতি সততা নীতি (Practice Estimate Only)'
                  : 'Examination Truth Policy — Practice Estimate Only'}
              </p>
              <p className="leading-relaxed text-amber-100/90">
                {lang === 'bn' ? disclaimerBn : disclaimerEn}
              </p>
            </div>
          </div>
        </section>

        {!featureEnabled && (
          <div className="rounded-2xl border border-slate-700 bg-[#0A1334] p-5 text-sm text-slate-300">
            {lang === 'bn'
              ? 'অ্যাডমিন বর্তমানে IELTS পরীক্ষা প্রস্তুতি মডিউল সাময়িকভাবে বিরতিতে রেখেছেন।'
              : 'An administrator has temporarily paused IELTS Exam Prep via platform feature flags.'}
          </div>
        )}

        {/* Module Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="tablist" aria-label="IELTS Modules">
          {MODULE_META.map((mod) => {
            const Icon = mod.icon;
            const active = activeModule === mod.id;
            const count = tasks.filter((t) => t.module === mod.id).length;
            return (
              <button
                key={mod.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveModule(mod.id)}
                className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                  active
                    ? 'border-cyan-400/50 bg-[linear-gradient(135deg,rgba(0,217,255,0.14),rgba(124,58,237,0.14))] text-white'
                    : 'border-slate-800 bg-[#0A1334]/80 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                  <span>{lang === 'bn' ? mod.labelBn : mod.labelEn}</span>
                </span>
                <span className="font-mono text-xs text-slate-400 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Main Workspace Split */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Task Selector Column */}
          <aside className="space-y-3 lg:col-span-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {lang === 'bn' ? 'মৌলিক অনুশীলন টাস্ক' : 'Original Practice Tasks'}
            </h2>
            {loading ? (
              <div className="rounded-xl border border-slate-800 bg-[#0A1334]/70 p-6 text-center text-xs text-slate-400">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[#00D9FF]" />
                {lang === 'bn' ? 'টাস্ক লোড হচ্ছে...' : 'Loading exam tasks...'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {moduleTasks.map((task) => {
                  const selected = task.id === selectedTask?.id;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-cyan-400/45 bg-[#0E1A42] text-white'
                          : 'border-slate-800 bg-[#0A1334]/75 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                        <span>{task.subType}</span>
                        <span>{task.difficultyBand}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-white">
                        {lang === 'bn' ? task.titleBn : task.titleEn}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {task.targetMinutes} {lang === 'bn' ? 'মিনিট' : 'min'}
                        {task.minWordCount ? ` · ${task.minWordCount}+ words` : ''}
                        {task.questions ? ` · ${task.questions.length} Qs` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Active Exam Practice Stage */}
          <section className="space-y-5 lg:col-span-8">
            {selectedTask && (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6 space-y-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <p className="font-mono text-xs text-[#00D9FF]">{selectedTask.subType}</p>
                    <h2 className="font-portal mt-1 text-lg font-bold text-white">
                      {lang === 'bn' ? selectedTask.titleBn : selectedTask.titleEn}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {lang === 'bn' ? selectedTask.instructionsBn : selectedTask.instructionsEn}
                    </p>
                  </div>

                  {/* Timed Simulation Clock */}
                  <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#060C24] px-3 py-2">
                    <Clock className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                    <span className="font-mono text-sm font-bold text-white tabular-nums">
                      {formatClock(remainingSeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTimerRunning((r) => !r)}
                      className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-cyan-400/50 cursor-pointer"
                    >
                      {timerRunning
                        ? lang === 'bn'
                          ? 'বিরতি'
                          : 'Pause'
                        : lang === 'bn'
                          ? 'শুরু'
                          : 'Start'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimerRunning(false);
                        setElapsedSeconds(0);
                      }}
                      aria-label="Reset timer"
                      className="rounded-lg p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Task Prompt */}
                <div className="rounded-xl border border-cyan-400/20 bg-[#060C24] p-4 space-y-3">
                  <p className="text-sm leading-relaxed text-slate-100">{selectedTask.promptTextEn}</p>
                  {selectedTask.cueBulletsEn && selectedTask.cueBulletsEn.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
                      {selectedTask.cueBulletsEn.map((bullet, idx) => (
                        <li key={idx}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {selectedTask.followUpQuestionsEn && selectedTask.followUpQuestionsEn.length > 0 && (
                    <div className="border-t border-slate-800 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {lang === 'bn' ? 'অতিরিক্ত ফলো-আপ প্রশ্ন' : 'Follow-Up Prompts'}
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-slate-300">
                        {selectedTask.followUpQuestionsEn.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Reading Passage or Listening Script + Audio Playback */}
                {selectedTask.passageOrTranscriptEn && (
                  <div className="rounded-xl border border-slate-800 bg-[#060C24] p-4 space-y-3">
                    {selectedTask.module === 'listening' ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <Volume2 className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                          <span>
                            {lang === 'bn'
                              ? 'ব্রাউজার অডিও দিয়ে মূল লিসেনিং স্ক্রিপ্ট শুনুন (অথবা নিচে ট্রান্সক্রিপ্ট দেখুন)'
                              : 'Play original listening briefing via browser speech synthesis, or inspect script below'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handlePlayListeningAudio}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {isSpeakingAudio
                              ? lang === 'bn'
                                ? 'অডিও থামান'
                                : 'Stop Audio'
                              : lang === 'bn'
                                ? 'অডিও শুনুন'
                                : 'Play Audio Briefing'}
                          </span>
                        </button>
                      </div>
                    ) : null}

                    {selectedTask.module === 'reading' ? (
                      <div className="max-h-64 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-slate-200 pr-1">
                        {selectedTask.passageOrTranscriptEn}
                      </div>
                    ) : (
                      <details className="text-xs text-slate-400">
                        <summary className="cursor-pointer font-semibold text-slate-300 hover:text-white">
                          {lang === 'bn'
                            ? 'লিসেনিং ট্রান্সক্রিপ্ট দেখুন / লুকান'
                            : 'Show / Hide Listening Script (Accessibility Support)'}
                        </summary>
                        <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-300">
                          {selectedTask.passageOrTranscriptEn}
                        </p>
                      </details>
                    )}
                  </div>
                )}

                {/* Objective Questions (Reading & Listening) */}
                {(selectedTask.module === 'reading' || selectedTask.module === 'listening') &&
                selectedTask.questions ? (
                  <div className="space-y-4">
                    {selectedTask.questions.map((q, qIdx) => (
                      <fieldset
                        key={q.id}
                        className="rounded-xl border border-slate-800 bg-[#060C24]/90 p-4 space-y-2.5"
                      >
                        <legend className="text-sm font-semibold text-white">
                          Q{qIdx + 1}. {q.promptEn}
                        </legend>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {q.options.map((opt, optIdx) => {
                            const checked = selectedAnswers[q.id] === optIdx;
                            return (
                              <label
                                key={optIdx}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs cursor-pointer transition-colors ${
                                  checked
                                    ? 'border-cyan-400/50 bg-cyan-500/10 text-white'
                                    : 'border-slate-800 bg-[#0A1334]/60 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`ielts_${q.id}`}
                                  checked={checked}
                                  onChange={() =>
                                    setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                  }
                                  className="accent-[#00D9FF]"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                ) : (
                  /* Constructed Response (Speaking Transcript / Writing Draft) */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <label htmlFor="ielts-response-input" className="font-medium text-slate-200">
                        {selectedTask.module === 'speaking'
                          ? lang === 'bn'
                            ? 'আপনার স্পিকিং উত্তর লিখুন বা ডিক্টেট করুন'
                            : 'Your Spoken Response Transcript'
                          : lang === 'bn'
                            ? 'আপনার রাইটিং উত্তর লিখুন'
                            : 'Your Writing Response'}
                      </label>
                      <span className="font-mono tabular-nums">
                        {wordCount} {lang === 'bn' ? 'শব্দ' : 'words'}
                        {selectedTask.minWordCount ? ` / ${selectedTask.minWordCount} target` : ''}
                      </span>
                    </div>
                    <textarea
                      id="ielts-response-input"
                      rows={8}
                      value={responseText}
                      onChange={(e) => {
                        setResponseText(e.target.value);
                        if (!timerRunning && e.target.value.length > 0) setTimerRunning(true);
                      }}
                      placeholder={
                        selectedTask.module === 'speaking'
                          ? 'Type or dictate your natural spoken answer addressing all parts of the prompt...'
                          : 'Write a well-structured response with clear paragraphs, supporting examples, and precise grammar...'
                      }
                      className="w-full rounded-xl border border-slate-700 bg-[#060C24] p-4 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                    />
                  </div>
                )}

                {error && (
                  <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-400">
                    {selectedTask.module === 'reading' || selectedTask.module === 'listening'
                      ? lang === 'bn'
                        ? 'সঠিক উত্তর ও ব্যাখ্যাসহ তাৎক্ষণিক মূল্যায়ন।'
                        : 'Deterministic grading with full English + Bangla answer explanations.'
                      : lang === 'bn'
                        ? 'Gemini ৪-ক্রাইটেরিয়া রুব্রিক ফিডব্যাক (শুধুমাত্র অনুশীলনের জন্য)।'
                        : 'Gemini 4-descriptor practice rubric evaluation (non-official estimate).'}
                  </p>
                  <button
                    type="submit"
                    disabled={submitting || !featureEnabled}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {submitting
                        ? lang === 'bn'
                          ? 'মূল্যায়ন চলছে...'
                          : 'Evaluating...'
                        : lang === 'bn'
                          ? 'মূল্যায়ন জমা দিন'
                          : 'Submit for Practice Feedback'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* Latest Evaluation Result */}
            {latestResult && (
              <section
                aria-label="Practice Evaluation Result"
                className="rounded-2xl border border-cyan-400/35 bg-[#0A1334] p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-[#00D9FF]" aria-hidden="true" />
                    <h3 className="text-base font-bold text-white">
                      {lang === 'bn' ? 'অনুশীলন ফলাফল' : 'Practice Evaluation Result'}
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-400">{latestResult.modelUsed}</span>
                </div>

                {latestResult.objectiveScorePct !== null && latestResult.questionResults ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-3">
                      <p className="font-mono text-3xl font-bold text-[#00D9FF] tabular-nums">
                        {latestResult.objectiveScorePct}%
                      </p>
                      <p className="text-xs text-slate-300">
                        {latestResult.correctCount} / {latestResult.totalQuestions}{' '}
                        {lang === 'bn' ? 'সঠিক উত্তর' : 'correct answers'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {latestResult.questionResults.map((qr, i) => (
                        <div
                          key={qr.questionId}
                          className={`rounded-xl border p-3 text-xs ${
                            qr.isCorrect
                              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100'
                              : 'border-rose-500/30 bg-rose-950/20 text-rose-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            {qr.isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-400" />
                            )}
                            <span>
                              Q{i + 1}: {qr.isCorrect ? 'Correct' : 'Needs Review'}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-200">{qr.explanationEn}</p>
                          <p className="mt-0.5 text-slate-400">{qr.explanationBn}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : latestResult.rubricFeedback ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-cyan-400/25 bg-[#060C24] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#00D9FF]">
                        {lang === 'bn' ? 'অনুশীলনমূলক স্তর (Non-Official)' : 'Practice Signal (Non-Official)'}
                      </p>
                      <p className="mt-1 text-base font-bold text-white">
                        {latestResult.rubricFeedback.overallPracticeEstimate}
                      </p>
                      {latestResult.rubricFeedback.banglaSummary && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                          {latestResult.rubricFeedback.banglaSummary}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        {
                          label: 'Task Response / Achievement',
                          data: latestResult.rubricFeedback.taskResponseOrAchievement,
                        },
                        {
                          label: 'Coherence & Cohesion',
                          data: latestResult.rubricFeedback.coherenceAndCohesion,
                        },
                        {
                          label: 'Lexical Resource',
                          data: latestResult.rubricFeedback.lexicalResource,
                        },
                        {
                          label: 'Grammatical Range & Accuracy',
                          data: latestResult.rubricFeedback.grammaticalRangeAndAccuracy,
                        },
                      ].map((crit) => (
                        <div
                          key={crit.label}
                          className="rounded-xl border border-slate-800 bg-[#060C24] p-3.5 text-xs space-y-1"
                        >
                          <p className="font-semibold text-white">{crit.label}</p>
                          <p className="font-mono text-[11px] text-[#00D9FF]">
                            {crit.data.practiceSignal}
                          </p>
                          <p className="text-slate-300">{crit.data.feedbackEn}</p>
                          {crit.data.feedbackBn && (
                            <p className="text-slate-400">{crit.data.feedbackBn}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {latestResult.rubricFeedback.priorityFixesEn.length > 0 && (
                      <div className="rounded-xl border border-slate-800 bg-[#060C24] p-4 text-xs">
                        <p className="font-semibold text-white">
                          {lang === 'bn' ? 'অগ্রাধিকার সংশোধন' : 'Priority Fixes for Next Attempt'}
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                          {latestResult.rubricFeedback.priorityFixesEn.map((fix, idx) => (
                            <li key={idx}>{fix}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            )}

            {/* Persisted Attempt History */}
            <section className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6">
              <h3 className="text-sm font-bold text-white">
                {lang === 'bn' ? 'সংরক্ষিত পরীক্ষা অনুশীলন ইতিহাস' : 'Saved Examination Practice History'}
              </h3>
              {attempts.length === 0 ? (
                <p className="mt-3 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'এখনো কোনো IELTS অনুশীলন জমা দেওয়া হয়নি। উপরের যেকোনো মডিউল থেকে শুরু করুন।'
                    : 'No saved examination practice attempts yet. Complete any module above to build your evidence log.'}
                </p>
              ) : (
                <div className="mt-3 divide-y divide-slate-800/80">
                  {attempts.slice(0, 8).map((att) => (
                    <div
                      key={att.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold text-white">{att.taskTitleEn}</p>
                        <p className="mt-0.5 text-slate-400">
                          {att.module.toUpperCase()} · {att.createdAt.slice(0, 10)} ·{' '}
                          {att.wordCount > 0 ? `${att.wordCount} words` : `${att.totalQuestions ?? 0} questions`}
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-[#00D9FF] tabular-nums">
                        {att.objectiveScorePct !== null
                          ? `${att.objectiveScorePct}% (${att.correctCount}/${att.totalQuestions})`
                          : att.rubricFeedback?.overallPracticeEstimate || 'Evaluated'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </div>
    </LearnerShell>
  );
}
