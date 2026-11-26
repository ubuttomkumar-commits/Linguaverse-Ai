import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  History,
  Info,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { evaluateReplayPracticeAttempt, ReplayApiError } from '../../services/replayApi';
import type {
  ExplanationLanguage,
  ReplayPracticeAttemptRecord,
  UnifiedReplaySession,
} from '../../types/domain';

interface ReplayPracticePanelProps {
  session: UnifiedReplaySession;
  explanationPref: ExplanationLanguage;
  selectedTurnId: string | null;
  practiceAttempts: ReplayPracticeAttemptRecord[];
  onSavePracticeAttempt: (attempt: {
    sessionId: string;
    source: UnifiedReplaySession['source'];
    turnId: string;
    originalResponse: string;
    correctedReference?: string;
    learnerRetryText: string;
    correctionHiddenDuringAttempt: boolean;
    aiFeedback?: ReplayPracticeAttemptRecord['aiFeedback'];
  }) => void;
}

export function ReplayPracticePanel({
  session,
  explanationPref,
  selectedTurnId,
  practiceAttempts,
  onSavePracticeAttempt,
}: ReplayPracticePanelProps) {
  const { lang } = useLanguage();

  const learnerTurns = useMemo(
    () => session.turns.filter((t) => t.speaker === 'learner' && t.text.trim().length > 0),
    [session.turns]
  );

  const [activeTurnId, setActiveTurnId] = useState<string>(
    () => selectedTurnId || learnerTurns[0]?.id || ''
  );
  const [hideCorrection, setHideCorrection] = useState(false);
  const [retryDraft, setRetryDraft] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [latestFeedback, setLatestFeedback] = useState<ReplayPracticeAttemptRecord['aiFeedback'] | null>(
    null
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (selectedTurnId && learnerTurns.some((t) => t.id === selectedTurnId)) {
      setActiveTurnId(selectedTurnId);
    } else if (!learnerTurns.some((t) => t.id === activeTurnId)) {
      setActiveTurnId(learnerTurns[0]?.id ?? '');
    }
  }, [selectedTurnId, learnerTurns, activeTurnId]);

  useEffect(() => {
    setRetryDraft('');
    setEvalError(null);
    setLatestFeedback(null);
    setSavedNotice(false);
  }, [session.id, activeTurnId]);

  const activeTurn = useMemo(
    () => learnerTurns.find((t) => t.id === activeTurnId) ?? learnerTurns[0] ?? null,
    [learnerTurns, activeTurnId]
  );

  const matchingComparison = useMemo(
    () =>
      activeTurn
        ? session.comparisons.find((c) => c.turnId === activeTurn.id) ??
          session.comparisons.find((c) => c.turnIndex === activeTurn.turnIndex)
        : undefined,
    [session.comparisons, activeTurn]
  );

  const correctedReference =
    activeTurn?.correctedText || matchingComparison?.corrected || undefined;

  const sessionPracticeHistory = useMemo(
    () => practiceAttempts.filter((a) => a.sessionId === session.id),
    [practiceAttempts, session.id]
  );

  const handleSaveOfflinePractice = () => {
    if (!activeTurn || !retryDraft.trim()) return;
    onSavePracticeAttempt({
      sessionId: session.id,
      source: session.source,
      turnId: activeTurn.id,
      originalResponse: activeTurn.text,
      correctedReference,
      learnerRetryText: retryDraft.trim(),
      correctionHiddenDuringAttempt: hideCorrection,
      aiFeedback: latestFeedback ?? undefined,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleEvaluateWithAi = async () => {
    if (!activeTurn || !retryDraft.trim()) return;
    setIsEvaluating(true);
    setEvalError(null);
    setLatestFeedback(null);

    try {
      const feedback = await evaluateReplayPracticeAttempt({
        sessionId: session.id,
        turnId: activeTurn.id,
        scenarioTitle: session.titleEn,
        originalResponse: activeTurn.text,
        correctedReference,
        learnerRetryText: retryDraft.trim(),
        explanationLanguage: explanationPref,
      });
      setLatestFeedback(feedback);
      onSavePracticeAttempt({
        sessionId: session.id,
        source: session.source,
        turnId: activeTurn.id,
        originalResponse: activeTurn.text,
        correctedReference,
        learnerRetryText: retryDraft.trim(),
        correctionHiddenDuringAttempt: hideCorrection,
        aiFeedback: feedback,
      });
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      if (err instanceof ReplayApiError) {
        setEvalError(err.message);
      } else {
        setEvalError(
          lang === 'bn'
            ? 'এই মুহূর্তে AI ফিডব্যাক পাওয়া যায়নি। আপনি এখনো আপনার নতুন উত্তরটি আলাদা প্র্যাকটিস হিসেবে সংরক্ষণ করতে পারবেন।'
            : 'Live AI feedback is unavailable right now. You can still save your separate text practice attempt locally.'
        );
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  if (learnerTurns.length === 0 || !activeTurn) {
    return (
      <section
        aria-label={lang === 'bn' ? 'রেসপন্স রিপ্লে প্র্যাকটিস' : 'Response Replay Practice'}
        className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-6 text-center"
      >
        <p className="text-sm font-semibold text-white">
          {lang === 'bn'
            ? 'এই সেশনে প্র্যাকটিস করার মতো কোনো সংরক্ষিত উত্তর পাওয়া যায়নি'
            : 'No saved learner responses available to practice in this session'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {lang === 'bn'
            ? 'কোনো কাল্পনিক উত্তর তৈরি করা হয়নি।'
            : 'No placeholder learner responses are fabricated when a transcript is missing.'}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section
        aria-label={lang === 'bn' ? 'রেসপন্স রিপ্লে প্র্যাকটিস' : 'Response Replay Practice'}
        data-testid="replay-practice-panel"
        className="rounded-2xl border border-cyan-400/20 bg-[#081031]/95 p-5 sm:p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
              <RotateCcw className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'রেসপন্স রিপ্লে প্র্যাকটিস (Response Replay Practice)'
                  : 'Response Replay Practice'}
              </span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'আপনার মূল উত্তর নির্বাচন করুন, সংশোধন লুকিয়ে নিজে আবার চেষ্টা করুন এবং আলাদা প্র্যাকটিস রেকর্ড হিসেবে সংরক্ষণ করুন। এটি কখনোই মূল ইতিহাস পরিবর্তন করে না।'
                : 'Select an original response, optionally hide the correction for active recall, write a cleaner version, and store it strictly separately from historical session records.'}
            </p>
          </div>

          {correctedReference && (
            <button
              type="button"
              onClick={() => setHideCorrection((v) => !v)}
              data-testid="toggle-hide-correction-btn"
              aria-pressed={hideCorrection}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/25 transition-colors whitespace-nowrap cursor-pointer"
            >
              {hideCorrection ? (
                <>
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'শুদ্ধ রূপ দেখান' : 'Show Correction'}</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'শুদ্ধ রূপ লুকান' : 'Hide Correction'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Turn Selector */}
        {learnerTurns.length > 1 && (
          <div className="space-y-1.5">
            <label htmlFor="replay-practice-turn-select" className="block text-xs font-medium text-slate-300">
              {lang === 'bn' ? 'অনুশীলনের জন্য মূল উত্তর নির্বাচন করুন' : 'Select original learner response to retry'}
            </label>
            <select
              id="replay-practice-turn-select"
              value={activeTurn.id}
              onChange={(e) => setActiveTurnId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#050A22] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400/60 focus:outline-none"
            >
              {learnerTurns.map((t) => (
                <option key={t.id} value={t.id}>
                  #{String(t.turnIndex).padStart(2, '0')} — {t.text.slice(0, 90)}
                  {t.text.length > 90 ? '…' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Immutable Original vs Optional Hidden Reference */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-[#050A22] p-4">
            <p className="text-[11px] font-semibold text-slate-400">
              {lang === 'bn'
                ? 'মূল উত্তর (অপরিবর্তনযোগ্য ঐতিহাসিক রেকর্ড)'
                : 'Original Response · Immutable historical record'}
            </p>
            <p data-testid="practice-original-text" className="mt-2 text-sm leading-relaxed text-slate-100">
              {activeTurn.text}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-[#050A22] p-4">
            <p className="text-[11px] font-semibold text-emerald-300">
              {lang === 'bn' ? 'সংশোধিত রেফারেন্স' : 'Corrected Reference'}
            </p>
            {!correctedReference ? (
              <p className="mt-2 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'এই উত্তরের জন্য কোনো আলাদা সংশোধিত রেফারেন্স সংরক্ষিত নেই — আপনি আরও স্পষ্ট বা স্বাভাবিক ভঙ্গিতে চেষ্টা করতে পারেন।'
                  : 'No separate correction was recorded for this turn — practice phrasing it even more clearly or naturally.'}
              </p>
            ) : hideCorrection ? (
              <p
                data-testid="practice-correction-hidden"
                className="mt-2 text-xs italic text-violet-300"
              >
                {lang === 'bn'
                  ? 'সক্রিয় অনুশীলনের জন্য সংশোধন লুকানো রয়েছে। চেষ্টা শেষে "শুদ্ধ রূপ দেখান" চাপুন।'
                  : 'Correction hidden for active recall. Write your improved response below, then reveal to compare.'}
              </p>
            ) : (
              <p data-testid="practice-correction-visible" className="mt-2 text-sm leading-relaxed text-emerald-100">
                {correctedReference}
              </p>
            )}
          </div>
        </div>

        {/* Practice Composer */}
        <div className="space-y-2.5">
          <label htmlFor="replay-practice-input" className="block text-xs font-semibold text-white">
            {lang === 'bn'
              ? 'আপনার নতুন ও উন্নত উত্তর লিখুন (টেক্সট প্র্যাকটিস)'
              : 'Write Your Improved Attempt (Text Practice)'}
          </label>
          <textarea
            id="replay-practice-input"
            data-testid="replay-practice-input"
            rows={3}
            maxLength={1200}
            value={retryDraft}
            onChange={(e) => setRetryDraft(e.target.value)}
            placeholder={
              lang === 'bn'
                ? 'আগের উত্তরটি আরও শুদ্ধ ও স্বাভাবিক ইংরেজিতে পুনরায় লিখুন...'
                : 'Rewrite your response with clearer grammar, vocabulary, and natural phrasing...'
            }
            className="w-full rounded-xl border border-slate-800 bg-[#050A22] px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {retryDraft.length}/1200 ·{' '}
              {lang === 'bn'
                ? 'পৃথক প্র্যাকটিস রেকর্ড হিসেবে সংরক্ষিত'
                : 'Stored separately from historical session'}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!retryDraft.trim() || isEvaluating}
                onClick={handleSaveOfflinePractice}
                data-testid="save-practice-attempt-btn"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#050A22] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-white disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {savedNotice
                    ? lang === 'bn'
                      ? 'সংরক্ষিত হয়েছে'
                      : 'Saved'
                    : lang === 'bn'
                      ? 'প্র্যাকটিস সংরক্ষণ করুন'
                      : 'Save Practice Attempt'}
                </span>
              </button>

              <button
                type="button"
                disabled={!retryDraft.trim() || isEvaluating}
                onClick={() => void handleEvaluateWithAi()}
                data-testid="evaluate-practice-ai-btn"
                className="lv-portal-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                {isEvaluating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {isEvaluating
                    ? lang === 'bn'
                      ? 'মূল্যায়ন চলছে...'
                      : 'Evaluating...'
                    : lang === 'bn'
                      ? 'AI ফিডব্যাক নিন'
                      : 'Get AI Practice Feedback'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {evalError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>{evalError}</span>
          </div>
        )}

        {/* Newly Generated AI Practice Feedback (Clearly Separated from Historical Evaluation) */}
        {latestFeedback && (
          <div
            data-testid="practice-ai-feedback-card"
            className="rounded-xl border border-cyan-400/35 bg-[#050C2B] p-4 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? 'নতুন প্র্যাকটিস ফিডব্যাক (ঐতিহাসিক স্কোর অপরিবর্তিত)'
                    : 'Newly Generated Practice Feedback · Historical record unchanged'}
                </span>
              </span>
              <span className="font-mono text-slate-400">
                {latestFeedback.model} · {latestFeedback.promptVersion}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-100">
              {lang === 'bn' && latestFeedback.feedbackBn
                ? latestFeedback.feedbackBn
                : latestFeedback.feedbackEn}
            </p>
            {explanationPref === 'both' && latestFeedback.feedbackBn && (
              <p className="font-bn text-xs leading-relaxed text-slate-300">
                {latestFeedback.feedbackBn}
              </p>
            )}

            <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/15 px-3 py-2 text-xs">
              <span className="font-semibold text-emerald-300">
                {lang === 'bn' ? 'আরও পরিমার্জিত রূপ: ' : 'Polished version: '}
              </span>
              <span className="text-emerald-100">{latestFeedback.improvedVersionEn}</span>
            </div>

            <p className="text-[11px] text-slate-400">{latestFeedback.nonAcousticNoteEn}</p>
          </div>
        )}

        {/* Non-acoustic honesty notice */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-[#050A22]/80 p-3 text-[11px] text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
          <p>
            {lang === 'bn'
              ? 'টেক্সট-ভিত্তিক অনুশীলন: এখানে কণ্ঠের মিল বা অ্যাকোস্টিক উচ্চারণ স্কোর দাবি করা হয় না। সব প্র্যাকটিস চেষ্টা মূল কথোপকথন থেকে আলাদাভাবে সংরক্ষিত হয়।'
              : 'Text-first practice mode: voice similarity and acoustic pronunciation improvement are not claimed without an acoustic engine. Practice attempts never alter historical transcripts or evaluations.'}
          </p>
        </div>
      </section>

      {/* Separate Practice Attempt History for This Session */}
      <section
        aria-label={lang === 'bn' ? 'আলাদা প্র্যাকটিস ইতিহাস' : 'Separate Practice Attempt History'}
        data-testid="replay-practice-history"
        className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h4 className="font-portal flex items-center gap-2 text-sm font-bold text-white">
            <History className="h-4 w-4 text-violet-400" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? `এই সেশনের আলাদা প্র্যাকটিস চেষ্টাসমূহ (${sessionPracticeHistory.length})`
                : `Separate Practice Attempts (${sessionPracticeHistory.length})`}
            </span>
          </h4>
        </div>

        {sessionPracticeHistory.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            {lang === 'bn'
              ? 'এই সেশনের জন্য এখনো কোনো আলাদা রিপ্লে প্র্যাকটিস সংরক্ষণ করা হয়নি।'
              : 'No separate replay practice attempts saved for this session yet.'}
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {sessionPracticeHistory.map((item) => (
              <li
                key={item.id}
                data-testid={`practice-attempt-item-${item.id}`}
                className="rounded-xl border border-slate-800 bg-[#050A22] p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-400 tabular-nums">
                  <span>
                    {new Date(item.createdAt).toLocaleString()}
                    {item.correctionHiddenDuringAttempt
                      ? lang === 'bn'
                        ? ' · সংশোধন লুকিয়ে চেষ্টা'
                        : ' · Blind recall attempt'
                      : ''}
                  </span>
                  {item.aiFeedback && (
                    <span className="font-sans font-semibold text-cyan-300">
                      {item.aiFeedback.improvedClarity
                        ? lang === 'bn'
                          ? 'AI: স্পষ্টতা উন্নত হয়েছে'
                          : 'AI: Improved clarity'
                        : lang === 'bn'
                          ? 'AI: আরও অনুশীলন প্রয়োজন'
                          : 'AI: Keep refining'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 text-xs">
                  <div className="rounded-lg border border-slate-800/80 bg-[#070E2B] p-3">
                    <p className="text-[11px] font-semibold text-slate-400">
                      {lang === 'bn' ? 'মূল উত্তর' : 'Original'}
                    </p>
                    <p className="mt-1 text-slate-300">{item.originalResponse}</p>
                  </div>
                  <div className="rounded-lg border border-cyan-400/25 bg-cyan-950/15 p-3">
                    <p className="text-[11px] font-semibold text-cyan-300">
                      {lang === 'bn' ? 'নতুন প্র্যাকটিস উত্তর' : 'New Practice Attempt'}
                    </p>
                    <p className="mt-1 text-white">{item.learnerRetryText}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
