import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  fetchMistakeCoachHealth,
  MistakeCoachClientError,
  requestMistakeCoachReply,
  requestPersonalizedMistakeExercise,
  type MistakeCoachApiResponse,
  type MistakeCoachChatTurn,
  type MistakeCoachHealthStatus,
  type MistakeSummaryPayload,
  type PersonalizedExerciseApiResponse,
} from '../../services/mistakeCoachApi';
import { speakEnglishExample } from '../../utils/speechSynthesis';
import type { ExplanationLanguage, MistakeMemoryItem } from '../../types/domain';

interface MistakeAiCoachPanelProps {
  mistakes: MistakeMemoryItem[];
  focusedMistake: MistakeMemoryItem | null;
  activeTab: 'coach' | 'exercise';
  onChangeTab: (tab: 'coach' | 'exercise') => void;
  onSelectFocusedMistake: (mistake: MistakeMemoryItem | null) => void;
  explanationPref: ExplanationLanguage;
  learnerLevel?: string;
  userId?: string;
  allowTelemetry?: boolean;
  autoGenerateSignal?: number;
  onRecordDrillResult: (result: {
    mistakeId: string;
    passed: boolean;
    userRewrite: string;
    expectedAnswer: string;
    durationSeconds: number;
  }) => Promise<MistakeMemoryItem>;
}

interface CoachMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  structured?: MistakeCoachApiResponse['coach'];
  model?: string;
}

function toMistakeSummary(m: MistakeMemoryItem): MistakeSummaryPayload {
  return {
    id: m.id,
    category: m.category,
    patternEn: m.patternEn,
    patternBn: m.patternBn,
    userExample: m.userExample,
    correctedExample: m.correctedExample,
    occurrences: m.occurrences,
    status: m.status,
  };
}

function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[“”"'`]/g, "'")
    .replace(/[.,!?;:]+/g, '')
    .replace(/\s+/g, ' ');
}

export function MistakeAiCoachPanel({
  mistakes,
  focusedMistake,
  activeTab,
  onChangeTab,
  onSelectFocusedMistake,
  explanationPref,
  learnerLevel,
  userId,
  allowTelemetry,
  autoGenerateSignal,
  onRecordDrillResult,
}: MistakeAiCoachPanelProps) {
  const { lang } = useLanguage();
  const validMistakes = useMemo(
    () => mistakes.filter((m) => !m.falseCorrectionReported),
    [mistakes]
  );

  const [health, setHealth] = useState<MistakeCoachHealthStatus | null>(null);
  const [messages, setMessages] = useState<CoachMessageItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Personalized AI Exercise state
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [generatedExercise, setGeneratedExercise] = useState<{
    mistakeId: string;
    payload: PersonalizedExerciseApiResponse['exercise'];
    model: string;
  } | null>(null);
  const [selectedMcqId, setSelectedMcqId] = useState<string | null>(null);
  const [mcqChecked, setMcqChecked] = useState(false);
  const [rewriteValue, setRewriteValue] = useState('');
  const [rewriteResult, setRewriteResult] = useState<{
    checked: boolean;
    passed: boolean;
    savedStatus?: string;
  } | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const exerciseStartRef = useRef<number>(Date.now());
  const lastSignalRef = useRef<number>(0);

  useEffect(() => {
    let active = true;
    void fetchMistakeCoachHealth().then((status) => {
      if (active) setHealth(status);
    });
    return () => {
      active = false;
    };
  }, []);

  const targetMistakeForExercise = focusedMistake ?? validMistakes[0] ?? null;

  const quickPrompts = useMemo(() => {
    if (focusedMistake) {
      return lang === 'bn'
        ? [
            `"${focusedMistake.userExample}" কেন ভুল হলো সহজ বাংলায় বুঝিয়ে দিন`,
            'এই ভুলটি বলা বা লেখার সময় যেন আর না হয় তার একটি কৌশল দিন',
            'অফিস বা বাস্তব কথাবার্তায় সঠিক রূপটি দিয়ে ৩টি নতুন উদাহরণ দিন',
          ]
        : [
            `Why is "${focusedMistake.userExample}" unnatural in English?`,
            'Give me a memory trick so I stop repeating this mistake',
            'Show 3 real-life workplace examples using the corrected pattern',
          ];
    }
    if (validMistakes.length > 0) {
      return lang === 'bn'
        ? [
            'আমার সবচেয়ে পুনরাবৃত্ত ভুল কোনটি এবং আজ কোনটা আগে ঠিক করব?',
            'বাংলা থেকে ইংরেজিতে ভাবার কারণে আমার কোন ভুলগুলো বারবার হচ্ছে?',
            'আমার বর্তমান ভুলগুলো দূর করতে ১০ মিনিটের অনুশীলন পরিকল্পনা দিন',
          ]
        : [
            'Which recurring mistake should I fix first today?',
            'Which of my errors come from translating directly from Bangla?',
            'Build a focused 10-minute practice plan from my recorded mistakes',
          ];
    }
    return lang === 'bn'
      ? [
          'বাংলাভাষী শিক্ষার্থীদের সবচেয়ে সাধারণ ৩টি ইংরেজি ভুল কী কী?',
          'স্পিকিং প্র্যাকটিসের সময় নিজেই নিজের ভুল কীভাবে ধরব?',
          'সঠিক প্রিপজিশন (in/on/at/about) মনে রাখার সহজ নিয়ম কী?',
        ]
      : [
          'What are the top 3 Bangla-to-English mistakes to watch out for?',
          'How can I self-correct grammar while speaking aloud?',
          'Give me a quick rule for natural prepositions like discuss vs talk about',
        ];
  }, [focusedMistake, validMistakes.length, lang]);

  const handleSendCoachMessage = async (textOverride?: string) => {
    const clean = (textOverride ?? inputValue).trim();
    if (!clean || isSending) return;

    setCoachError(null);
    const userMsg: CoachMessageItem = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: clean,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInputValue('');
    setIsSending(true);

    try {
      const history: MistakeCoachChatTurn[] = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.role === 'assistant' ? m.structured?.replyEn ?? m.text : m.text,
      }));

      const res = await requestMistakeCoachReply({
        message: clean,
        explanationLanguage: explanationPref,
        learnerLevel,
        focusedMistake: focusedMistake ? toMistakeSummary(focusedMistake) : null,
        topMistakes: validMistakes.slice(0, 6).map(toMistakeSummary),
        history,
        userId,
        allowTelemetry,
      });

      const assistantMsg: CoachMessageItem = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: res.coach.replyEn,
        structured: res.coach,
        model: res.model,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg =
        err instanceof MistakeCoachClientError
          ? err.message
          : 'Unable to contact the AI Learning Coach right now. Please retry.';
      setCoachError(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateExercise = async (overrideMistake?: MistakeMemoryItem) => {
    const target = overrideMistake ?? targetMistakeForExercise;
    if (!target || exerciseLoading) return;

    setExerciseError(null);
    setExerciseLoading(true);
    setGeneratedExercise(null);
    setSelectedMcqId(null);
    setMcqChecked(false);
    setRewriteValue('');
    setRewriteResult(null);
    exerciseStartRef.current = Date.now();

    try {
      const res = await requestPersonalizedMistakeExercise({
        mistake: toMistakeSummary(target),
        explanationLanguage: explanationPref,
        learnerLevel,
        userId,
        allowTelemetry,
      });
      setGeneratedExercise({
        mistakeId: target.id,
        payload: res.exercise,
        model: res.model,
      });
    } catch (err) {
      const msg =
        err instanceof MistakeCoachClientError
          ? err.message
          : 'Could not generate a personalized AI exercise right now.';
      setExerciseError(msg);
    } finally {
      setExerciseLoading(false);
    }
  };

  // Trigger AI exercise generation when user clicks "AI Drill" / "Fresh AI Challenge" from another section
  useEffect(() => {
    if (
      autoGenerateSignal &&
      autoGenerateSignal !== lastSignalRef.current &&
      activeTab === 'exercise' &&
      targetMistakeForExercise
    ) {
      lastSignalRef.current = autoGenerateSignal;
      void handleGenerateExercise(targetMistakeForExercise);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerateSignal, activeTab, targetMistakeForExercise?.id]);

  const handleVerifyAiRewrite = async () => {
    if (!generatedExercise || !rewriteValue.trim() || savingResult) return;

    const normUser = normalizeAnswer(rewriteValue);
    const acceptable = generatedExercise.payload.rewriteAcceptableAnswers.map(normalizeAnswer);
    const rewriteCorrect = acceptable.includes(normUser);
    const selectedOpt = generatedExercise.payload.mcqOptions.find(
      (o) => o.id === selectedMcqId
    );
    const mcqPassed = Boolean(selectedOpt?.isCorrect);
    const passedBoth = rewriteCorrect && (mcqChecked ? mcqPassed : true);

    setSavingResult(true);
    try {
      const durationSeconds = Math.max(
        6,
        Math.round((Date.now() - exerciseStartRef.current) / 1000)
      );
      const updated = await onRecordDrillResult({
        mistakeId: generatedExercise.mistakeId,
        passed: passedBoth,
        userRewrite: rewriteValue.trim(),
        expectedAnswer: generatedExercise.payload.rewriteExpectedAnswer,
        durationSeconds,
      });
      setRewriteResult({
        checked: true,
        passed: rewriteCorrect,
        savedStatus: updated.status,
      });
    } finally {
      setSavingResult(false);
    }
  };

  return (
    <section
      id="mistake-ai-coach"
      aria-label="Futuristic AI Learning Coach"
      data-testid="mistake-ai-coach-panel"
      className="lv-portal-panel relative overflow-hidden rounded-3xl p-5 sm:p-6 lg:p-7"
    >
      {/* Subtle Holographic Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#00D9FF]/12 blur-3xl"
      />

      {/* Coach Header with Animated Holographic AI Avatar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-400/15 pb-5">
        <div className="flex items-center gap-4">
          {/* Holographic AI Coach Avatar */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <div
              aria-hidden="true"
              className="lv-holo-orbit-slow absolute inset-0 rounded-full border border-cyan-400/50 border-t-[#E42BFF]"
            />
            <div
              aria-hidden="true"
              className="lv-holo-pulse absolute inset-1.5 rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.45)_0%,rgba(135,59,255,0.28)_62%,rgba(5,9,31,0.9)_100%)]"
            />
            <Bot className="relative z-10 h-6 w-6 text-white" aria-hidden="true" />
          </div>

          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00D9FF]">
              {lang === 'bn' ? 'ফিউচারিস্টিক AI লার্নিং কোচ' : 'Futuristic AI Learning Coach'}
            </p>
            <h3 className="font-portal mt-0.5 text-lg font-bold text-white sm:text-xl">
              {lang === 'bn'
                ? 'ব্যক্তিগত ভুল বিশ্লেষণ ও কাস্টম অনুশীলন স্টুডিও'
                : 'Personal Error Mentor & Custom Exercise Generator'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {health?.configured === false
                ? lang === 'bn'
                  ? 'সার্ভারে GEMINI_API_KEY কনফিগার করা নেই — লাইভ AI কোচ বর্তমানে বন্ধ আছে।'
                  : 'GEMINI_API_KEY is not configured on the server — live AI responses are unavailable.'
                : lang === 'bn'
                  ? 'আপনার সংরক্ষিত বাস্তব ভুলের উপর ভিত্তি করে তাৎক্ষণিক ইংরেজি ও বাংলা গাইড এবং নতুন অনুশীলন তৈরি করুন।'
                  : 'Grounded in your real tracked mistakes — ask why an error happens or generate fresh custom repair exercises.'}
            </p>
          </div>
        </div>

        {/* Mode Switcher: AI Coach Chat vs Personalized AI Exercise */}
        <div
          role="tablist"
          aria-label="AI Coach workspace mode"
          className="inline-flex rounded-xl border border-cyan-400/25 bg-[#060C22] p-1 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'coach'}
            onClick={() => onChangeTab('coach')}
            data-testid="coach-tab-chat"
            className={`rounded-lg px-3.5 py-2 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'coach'
                ? 'bg-[#087BFF] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'AI কোচ চ্যাট' : 'AI Coach Q&A'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'exercise'}
            onClick={() => onChangeTab('exercise')}
            data-testid="coach-tab-exercise"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'exercise'
                ? 'bg-[#873BFF] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'কাস্টম AI অনুশীলন' : 'AI Custom Exercise'}</span>
          </button>
        </div>
      </div>

      {/* Focused Mistake Selector Strip */}
      {validMistakes.length > 0 && (
        <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-[#060C22]/85 px-4 py-2.5 text-xs">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <label htmlFor="coach-focus-mistake-select" className="shrink-0 font-semibold text-slate-300">
              {lang === 'bn' ? 'ফোকাস প্যাটার্ন:' : 'Focused Pattern:'}
            </label>
            <select
              id="coach-focus-mistake-select"
              value={focusedMistake?.id ?? ''}
              onChange={(e) => {
                const found = validMistakes.find((m) => m.id === e.target.value) ?? null;
                onSelectFocusedMistake(found);
              }}
              className="lv-auth-input max-w-full min-w-[200px] flex-1 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none sm:max-w-md"
            >
              <option value="">
                {lang === 'bn'
                  ? `সব শীর্ষ ভুল (${Math.min(6, validMistakes.length)}টি)`
                  : `All top recorded patterns (${Math.min(6, validMistakes.length)})`}
              </option>
              {validMistakes.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.occurrences}x] {lang === 'bn' ? m.patternBn : m.patternEn}
                </option>
              ))}
            </select>
          </div>
          {focusedMistake && (
            <span className="truncate font-mono text-[11px] text-cyan-200">
              "{focusedMistake.userExample}" → "{focusedMistake.correctedExample}"
            </span>
          )}
        </div>
      )}

      {/* TAB 1: AI LEARNING COACH CONVERSATION */}
      {activeTab === 'coach' && (
        <div className="relative z-10 mt-5 space-y-4">
          {/* Quick Context Prompts */}
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isSending}
                onClick={() => void handleSendCoachMessage(prompt)}
                className="rounded-xl border border-cyan-400/25 bg-[#09143B]/80 px-3 py-1.5 text-left text-xs text-slate-200 hover:border-cyan-400/60 hover:bg-[#0F2058] hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Conversation Transcript */}
          {messages.length > 0 && (
            <div
              aria-live="polite"
              className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-slate-800/80 bg-[#050A20]/90 p-4"
            >
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-cyan-400/35 bg-[#0E2460] px-4 py-2.5 text-xs leading-relaxed text-white sm:text-sm">
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div
                    key={msg.id}
                    className="space-y-3 rounded-2xl rounded-bl-sm border border-violet-400/30 bg-[#0A1233] p-4 text-xs leading-relaxed sm:text-sm"
                  >
                    {(explanationPref === 'en' || explanationPref === 'both') &&
                      msg.structured?.replyEn && (
                        <p className="text-slate-100">{msg.structured.replyEn}</p>
                      )}
                    {(explanationPref === 'bn' || explanationPref === 'both') &&
                      msg.structured?.replyBn && (
                        <p className="font-bn text-cyan-100/95">{msg.structured.replyBn}</p>
                      )}

                    {msg.structured && (
                      <div className="rounded-xl border border-cyan-400/20 bg-[#060C22] p-3">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#00D9FF]">
                          {lang === 'bn' ? 'মনে রাখার মূল নিয়ম' : 'Core Memory Rule'}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-white">
                          {lang === 'bn'
                            ? msg.structured.focusedRuleBn
                            : msg.structured.focusedRuleEn}
                        </p>
                      </div>
                    )}

                    {msg.structured?.examplePairs && msg.structured.examplePairs.length > 0 && (
                      <div className="space-y-2">
                        {msg.structured.examplePairs.map((pair, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-800 bg-[#060C22]/90 px-3 py-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="text-rose-300 line-through">{pair.wrong}</span>
                                <span className="mx-1.5 text-slate-500">→</span>
                                <span className="font-semibold text-emerald-300">
                                  {pair.right}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  speakEnglishExample({ text: pair.right, rate: 1.0 })
                                }
                                aria-label={`Listen to ${pair.right}`}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-300 hover:text-white cursor-pointer"
                              >
                                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                            <p className="mt-1 font-bn text-[11px] text-slate-400">{pair.whyBn}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.structured?.suggestedFollowUps &&
                      msg.structured.suggestedFollowUps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.structured.suggestedFollowUps.map((followUp) => (
                            <button
                              key={followUp}
                              type="button"
                              disabled={isSending}
                              onClick={() => void handleSendCoachMessage(followUp)}
                              className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-200 hover:bg-violet-500/20 hover:text-white cursor-pointer"
                            >
                              {followUp}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )
              )}

              {isSending && (
                <div className="flex items-center gap-2 text-xs text-cyan-300">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>
                    {lang === 'bn'
                      ? 'AI কোচ আপনার ভুলের ধরন বিশ্লেষণ করছে...'
                      : 'AI Coach is analyzing your patterns...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {coachError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{coachError}</span>
            </div>
          )}

          {/* Coach Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendCoachMessage();
            }}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <label htmlFor="mistake-coach-input" className="sr-only">
              {lang === 'bn' ? 'AI কোচকে প্রশ্ন করুন' : 'Ask the AI Learning Coach'}
            </label>
            <input
              id="mistake-coach-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSending}
              placeholder={
                lang === 'bn'
                  ? 'আপনার যেকোনো ভুল বা ইংরেজি নিয়ম সম্পর্কে বাংলা বা ইংরেজিতে জিজ্ঞাসা করুন...'
                  : 'Ask why a mistake happened or how to speak naturally in Bangla or English...'
              }
              className="lv-auth-input min-h-[44px] flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              data-testid="coach-send-btn"
              className="lv-portal-btn inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white disabled:opacity-45 whitespace-nowrap cursor-pointer"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{lang === 'bn' ? 'জিজ্ঞাসা করুন' : 'Ask Coach'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: REAL AI-GENERATED PERSONALIZED EXERCISE */}
      {activeTab === 'exercise' && (
        <div className="relative z-10 mt-5 space-y-4">
          {!targetMistakeForExercise ? (
            <div className="rounded-2xl border border-slate-800 bg-[#060C22]/85 p-6 text-center">
              <p className="text-sm font-semibold text-white">
                {lang === 'bn'
                  ? 'কাস্টম AI অনুশীলনের জন্য অন্তত ১টি সংরক্ষিত ভুল প্রয়োজন'
                  : 'Record at least 1 mistake pattern to generate custom AI exercises'}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
                {lang === 'bn'
                  ? 'AI স্পিকিং স্টুডিও বা একাডেমি লেসনে অনুশীলন করুন — আপনার ভুলগুলো শনাক্ত হলেই এখানে তাৎক্ষণিক কাস্টম ড্রিল তৈরি করতে পারবেন।'
                  : 'Complete a Diagnostic, Academy exercise, or AI Speaking Studio turn first — then return here to generate fresh personalized exercises.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-400/25 bg-[#060C22]/85 p-4">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-violet-300">
                    {lang === 'bn' ? 'টার্গেট ভুলের ধরন' : 'Target Mistake Pattern'}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {lang === 'bn'
                      ? targetMistakeForExercise.patternBn
                      : targetMistakeForExercise.patternEn}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exerciseLoading}
                  onClick={() => void handleGenerateExercise(targetMistakeForExercise)}
                  data-testid="generate-ai-exercise-btn"
                  className="lv-portal-btn-violet inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  {exerciseLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {exerciseLoading
                      ? lang === 'bn'
                        ? 'নতুন চ্যালেঞ্জ তৈরি হচ্ছে...'
                        : 'Generating Exercise...'
                      : generatedExercise
                        ? lang === 'bn'
                          ? 'আরেকটি নতুন AI চ্যালেঞ্জ বানান'
                          : 'Generate Another AI Exercise'
                        : lang === 'bn'
                          ? 'ব্যক্তিগত AI অনুশীলন তৈরি করুন'
                          : 'Generate Personalized AI Exercise'}
                  </span>
                </button>
              </div>

              {exerciseError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                    aria-hidden="true"
                  />
                  <span>{exerciseError}</span>
                </div>
              )}

              {generatedExercise && (
                <div
                  data-testid="generated-ai-exercise-card"
                  className="space-y-5 rounded-2xl border border-cyan-400/30 bg-[#060C24] p-5"
                >
                  <div className="border-b border-slate-800 pb-3.5">
                    <h4 className="font-portal text-base font-bold text-white">
                      {lang === 'bn'
                        ? generatedExercise.payload.titleBn
                        : generatedExercise.payload.titleEn}
                    </h4>
                    <p className="mt-1 text-xs text-slate-300">
                      {lang === 'bn'
                        ? generatedExercise.payload.contextSituationBn
                        : generatedExercise.payload.contextSituationEn}
                    </p>
                  </div>

                  {/* Challenge Part A: Spot the Accurate Sentence */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-[#00D9FF]">
                      {lang === 'bn'
                        ? `অংশ ১: ${generatedExercise.payload.mcqPromptBn}`
                        : `Part 1: ${generatedExercise.payload.mcqPromptEn}`}
                    </p>
                    <div role="radiogroup" aria-label="AI Exercise options" className="space-y-2">
                      {generatedExercise.payload.mcqOptions.map((opt) => {
                        const isSelected = selectedMcqId === opt.id;
                        let style =
                          'border-slate-800 bg-[#0A1334] hover:border-cyan-400/40 text-slate-100';
                        if (mcqChecked) {
                          if (opt.isCorrect) {
                            style = 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
                          } else if (isSelected && !opt.isCorrect) {
                            style = 'border-rose-400/60 bg-rose-500/15 text-rose-100';
                          }
                        } else if (isSelected) {
                          style = 'border-[#00D9FF] bg-[#00D9FF]/15 text-white';
                        }
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            disabled={mcqChecked}
                            onClick={() => setSelectedMcqId(opt.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-xs transition-colors sm:text-sm cursor-pointer disabled:cursor-default ${style}`}
                          >
                            <span>{opt.text}</span>
                            {mcqChecked && opt.isCorrect && (
                              <CheckCircle2
                                className="h-4 w-4 shrink-0 text-emerald-400"
                                aria-hidden="true"
                              />
                            )}
                            {mcqChecked && isSelected && !opt.isCorrect && (
                              <XCircle
                                className="h-4 w-4 shrink-0 text-rose-400"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {!mcqChecked && (
                      <button
                        type="button"
                        disabled={!selectedMcqId}
                        onClick={() => setMcqChecked(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#087BFF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 cursor-pointer"
                      >
                        <span>{lang === 'bn' ? 'অংশ ১ যাচাই করুন' : 'Check Part 1'}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* Challenge Part B: Fresh Active Rewrite */}
                  <div className="space-y-3 border-t border-slate-800 pt-4">
                    <p className="text-xs font-semibold text-[#C084FC]">
                      {lang === 'bn'
                        ? `অংশ ২: ${generatedExercise.payload.rewritePromptBn}`
                        : `Part 2: ${generatedExercise.payload.rewritePromptEn}`}
                    </p>
                    <div className="rounded-xl border border-rose-400/25 bg-rose-500/5 p-3.5 text-xs">
                      <p className="text-slate-400">
                        {lang === 'bn' ? 'এই নতুন বাক্যটি সংশোধন করুন:' : 'Repair this fresh sentence:'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-rose-300">
                        {generatedExercise.payload.rewriteFlawedSentence}
                      </p>
                      <p className="mt-1.5 font-bn text-xs text-cyan-200">
                        {lang === 'bn' ? 'বাংলা সংকেত: ' : 'Bangla Hint: '}
                        {generatedExercise.payload.banglaHint}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 sm:flex-row">
                      <label htmlFor="ai-exercise-rewrite-input" className="sr-only">
                        {lang === 'bn' ? 'সংশোধিত বাক্য লিখুন' : 'Write corrected sentence'}
                      </label>
                      <input
                        id="ai-exercise-rewrite-input"
                        type="text"
                        value={rewriteValue}
                        onChange={(e) => setRewriteValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && rewriteValue.trim() && !savingResult) {
                            void handleVerifyAiRewrite();
                          }
                        }}
                        placeholder={
                          lang === 'bn'
                            ? 'সঠিক ইংরেজি বাক্যটি এখানে লিখুন...'
                            : 'Type the corrected English sentence...'
                        }
                        className="lv-auth-input min-h-[42px] flex-1 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={!rewriteValue.trim() || savingResult}
                        onClick={() => void handleVerifyAiRewrite()}
                        className="lv-glow-cta inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-40 whitespace-nowrap cursor-pointer"
                      >
                        <span>
                          {savingResult
                            ? lang === 'bn'
                              ? 'সংরক্ষণ হচ্ছে...'
                              : 'Saving...'
                            : lang === 'bn'
                              ? 'যাচাই ও প্রগ্রেস সংরক্ষণ'
                              : 'Verify & Save Progress'}
                        </span>
                      </button>
                    </div>

                    {rewriteResult?.checked && (
                      <div
                        className={`space-y-2 rounded-xl border p-4 text-xs ${
                          rewriteResult.passed
                            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                            : 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold">
                            {rewriteResult.passed
                              ? lang === 'bn'
                                ? 'চমৎকার! সঠিক সংশোধন এবং স্পেসড রিভিউ হালনাগাদ হয়েছে।'
                                : 'Spot on! Your repair was verified and spaced review updated.'
                              : lang === 'bn'
                                ? `প্রত্যাশিত সঠিক রূপ: "${generatedExercise.payload.rewriteExpectedAnswer}"`
                                : `Target form: "${generatedExercise.payload.rewriteExpectedAnswer}"`}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              speakEnglishExample({
                                text: generatedExercise.payload.rewriteExpectedAnswer,
                                rate: 1.0,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/10 cursor-pointer"
                          >
                            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{lang === 'bn' ? 'শুনুন' : 'Listen'}</span>
                          </button>
                        </div>
                        {(explanationPref === 'bn' || explanationPref === 'both') && (
                          <p className="font-bn text-slate-200">
                            {generatedExercise.payload.explanationBn}
                          </p>
                        )}
                        {(explanationPref === 'en' || explanationPref === 'both') && (
                          <p className="text-slate-300">
                            {generatedExercise.payload.explanationEn}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
