import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  GitCompare,
  History,
  Lock,
  Mic,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { WorkspaceErrorBoundary } from '../../components/common/WorkspaceErrorBoundary';
import { ReplayLibrarySidebar } from '../../components/replay/ReplayLibrarySidebar';
import { ReplayAudioPlayer } from '../../components/replay/ReplayAudioPlayer';
import { ReplayTranscriptTimeline } from '../../components/replay/ReplayTranscriptTimeline';
import { ReplayMistakeAndDiffPanel } from '../../components/replay/ReplayMistakeAndDiffPanel';
import { ReplayPracticePanel } from '../../components/replay/ReplayPracticePanel';
import { ReplayAnalysisAndPracticePanel } from '../../components/replay/ReplayAnalysisAndPracticePanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  buildUnifiedReplaySessions,
  computeReplayLibraryMetrics,
  DEFAULT_REPLAY_FILTERS,
  filterReplaySessions,
  resolveRequestedReplaySession,
  selectRecommendedReplaySession,
  type ReplayLibraryFilterState,
} from '../../domain/communicationReplayEngine';
import {
  loadUserReplayState,
  recordLastReviewedTurn,
  saveReplayPracticeAttempt,
  saveReplaySessionReview,
  setLastOpenedReplaySession,
  toggleReplayComparisonReviewed,
  type UserReplayState,
} from '../../services/replayStateStore';
import type {
  ReplayPracticeAttemptRecord,
  ReplayReviewStatus,
  UnifiedReplaySession,
} from '../../types/domain';

type ReplayInspectorTab = 'transcript' | 'mistakes' | 'practice' | 'analysis';

function formatDateTimeFull(iso: string, lang: 'en' | 'bn'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

export function CommunicationReplayPage() {
  const { lang } = useLanguage();
  const { user, profile, speakingSessions, transferAttempts, mistakes } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const userId = user?.id ?? '';
  const userEmail = user?.email ?? '';
  const userRole = user?.role ?? 'learner';
  const explanationPref = profile?.explanationLanguage ?? 'both';
  const requestedSessionId = searchParams.get('session');

  const [replayState, setReplayState] = useState<UserReplayState>(() =>
    loadUserReplayState(userId)
  );
  const [activeTab, setActiveTab] = useState<ReplayInspectorTab>('transcript');
  const [focusedTurnId, setFocusedTurnId] = useState<string | null>(null);
  const [activeAudioTurnId, setActiveAudioTurnId] = useState<string | null>(null);
  const [practiceTurnId, setPracticeTurnId] = useState<string | null>(null);
  const [audioRevision, setAudioRevision] = useState(0);
  const [filters, setFilters] = useState<ReplayLibraryFilterState>({
    ...DEFAULT_REPLAY_FILTERS,
  });

  useEffect(() => {
    setReplayState(loadUserReplayState(userId));
  }, [userId]);

  // Build owner lookup map across available records strictly to distinguish unauthorized vs not-found IDs
  const allSessionOwnersById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of speakingSessions) map[s.id] = s.userId;
    for (const t of transferAttempts) map[t.id] = t.userId;
    return map;
  }, [speakingSessions, transferAttempts]);

  // Strictly read-only unification of owned Part 08 Speaking + Part 11 Transfer sessions
  const ownedSessions = useMemo(
    () =>
      buildUnifiedReplaySessions({
        userId,
        speakingSessions,
        transferAttempts,
        mistakes,
        reviewRecords: replayState.reviewsBySessionId,
      }),
    [userId, speakingSessions, transferAttempts, mistakes, replayState.reviewsBySessionId]
  );

  const filteredSessions = useMemo(
    () => filterReplaySessions(ownedSessions, filters),
    [ownedSessions, filters]
  );

  const metrics = useMemo(
    () => computeReplayLibraryMetrics(ownedSessions),
    [ownedSessions]
  );

  const recommended = useMemo(
    () => selectRecommendedReplaySession(ownedSessions),
    [ownedSessions]
  );

  const recentReviewedSessions = useMemo(
    () =>
      ownedSessions
        .filter((s) => Boolean(s.reviewedAt))
        .sort((a, b) => Date.parse(b.reviewedAt ?? '') - Date.parse(a.reviewedAt ?? ''))
        .slice(0, 2),
    [ownedSessions]
  );

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const resolvedRequest = useMemo(
    () =>
      resolveRequestedReplaySession({
        ownedSessions,
        requestedSessionId,
        currentUserId: userId,
        allSessionOwnersById,
      }),
    [ownedSessions, requestedSessionId, userId, allSessionOwnersById]
  );

  const activeSession = useMemo(() => {
    if (requestedSessionId) {
      return resolvedRequest.session;
    }
    if (selectedSessionId) {
      const found = ownedSessions.find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    if (replayState.lastOpenedSessionId) {
      const remembered = ownedSessions.find((s) => s.id === replayState.lastOpenedSessionId);
      if (remembered) return remembered;
    }
    return filteredSessions[0] ?? ownedSessions[0] ?? null;
  }, [
    requestedSessionId,
    resolvedRequest.session,
    selectedSessionId,
    ownedSessions,
    replayState.lastOpenedSessionId,
    filteredSessions,
  ]);

  const activeSessionPracticeAttempts = useMemo(
    () =>
      activeSession
        ? replayState.practiceAttempts.filter((a) => a.sessionId === activeSession.id)
        : [],
    [activeSession, replayState.practiceAttempts]
  );

  // Reset per-session selections when switching active session
  useEffect(() => {
    setFocusedTurnId(null);
    setActiveAudioTurnId(null);
    setPracticeTurnId(null);
  }, [activeSession?.id]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setSelectedSessionId(sessionId);
      setFocusedTurnId(null);
      setActiveAudioTurnId(null);
      setPracticeTurnId(null);
      if (requestedSessionId) {
        setSearchParams({ session: sessionId }, { replace: true });
      }
      const next = setLastOpenedReplaySession(userId, sessionId);
      setReplayState(next);
    },
    [requestedSessionId, setSearchParams, userId]
  );

  const handleClearRequestedSession = useCallback(() => {
    setSearchParams({}, { replace: true });
    setSelectedSessionId(ownedSessions[0]?.id ?? null);
  }, [setSearchParams, ownedSessions]);

  const handleUpdateReview = useCallback(
    (payload: { status: ReplayReviewStatus; learnerNote?: string }) => {
      if (!activeSession || !userId) return;
      const next = saveReplaySessionReview(userId, {
        sessionId: activeSession.id,
        source: activeSession.source,
        status: payload.status,
        learnerNote: payload.learnerNote,
      });
      setReplayState(next);
    },
    [activeSession, userId]
  );

  const handleToggleComparisonReviewed = useCallback(
    (comparisonId: string) => {
      if (!activeSession || !userId) return;
      const next = toggleReplayComparisonReviewed(userId, {
        sessionId: activeSession.id,
        source: activeSession.source,
        comparisonId,
      });
      setReplayState(next);
    },
    [activeSession, userId]
  );

  const handleInspectTurn = useCallback(
    (turnId: string) => {
      if (!activeSession || !userId) return;
      if (activeSession.lastReviewedTurnId === turnId) return;
      const next = recordLastReviewedTurn(userId, {
        sessionId: activeSession.id,
        source: activeSession.source,
        turnId,
      });
      setReplayState(next);
    },
    [activeSession, userId]
  );

  const handleSavePracticeAttempt = useCallback(
    (attempt: {
      sessionId: string;
      source: UnifiedReplaySession['source'];
      turnId: string;
      originalResponse: string;
      correctedReference?: string;
      learnerRetryText: string;
      correctionHiddenDuringAttempt: boolean;
      aiFeedback?: ReplayPracticeAttemptRecord['aiFeedback'];
    }) => {
      if (!userId) return;
      const { state } = saveReplayPracticeAttempt(userId, attempt);
      setReplayState(state);
    },
    [userId]
  );

  const handleJumpToTurn = useCallback((turnId: string) => {
    setActiveTab('transcript');
    setFocusedTurnId(turnId);
  }, []);

  const handleSelectTurnForMistakes = useCallback((turnId: string) => {
    setFocusedTurnId(turnId);
    setActiveTab('mistakes');
  }, []);

  const handleJumpToAudioTurn = useCallback((turnId: string) => {
    setActiveAudioTurnId(turnId);
    setFocusedTurnId(turnId);
  }, []);

  const handlePracticeTurn = useCallback((turnId: string) => {
    setPracticeTurnId(turnId);
    setActiveTab('practice');
  }, []);

  const handleRecordingsDeleted = useCallback(() => {
    setAudioRevision((rev) => rev + 1);
  }, []);

  return (
    <LearnerShell
      title={lang === 'bn' ? 'কমিউনিকেশন রিপ্লে' : 'Communication Replay'}
      subtitle={
        lang === 'bn'
          ? 'প্রতিটি কথোপকথনই উন্নতির একটি সুযোগ — সংরক্ষিত সেশন, অডিও, সংশোধন ও প্র্যাকটিস একসাথে পর্যালোচনা করুন।'
          : 'Every Conversation Is an Opportunity to Improve — revisit saved sessions, inspect real corrections, and practice stronger responses.'
      }
    >
      <WorkspaceErrorBoundary lang={lang}>
        <div className="space-y-6">
          {/* Production Hero Header */}
          <section
            aria-label={lang === 'bn' ? 'রিপ্লে পরিচিতি' : 'Communication Replay Overview'}
            className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-[radial-gradient(ellipse_at_top_right,rgba(0,217,255,0.14)_0%,rgba(124,58,237,0.1)_42%,rgba(8,16,49,0.96)_100%)] p-5 sm:p-7"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  {lang === 'bn'
                    ? 'প্রতিটি কথোপকথনই উন্নতির একটি সুযোগ'
                    : 'Every Conversation Is an Opportunity to Improve.'}
                </p>
                <h2
                  data-testid="replay-hero-title"
                  className="font-portal mt-1.5 text-xl font-extrabold tracking-tight text-white sm:text-2xl lg:text-[28px]"
                >
                  {lang === 'bn'
                    ? 'আপনার কথোপকথন। আপনার অগ্রগতি। আপনার পরবর্তী সাফল্য।'
                    : 'Your Conversations. Your Progress. Your Next Breakthrough.'}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {lang === 'bn'
                    ? 'আপনার সংরক্ষিত যোগাযোগ সেশনগুলো পুনরায় দেখুন, অর্থবহ প্যাটার্ন আবিষ্কার করুন এবং প্রতিটি ভুলকে আরও ভালো উত্তরে পরিণত করুন।'
                    : 'Revisit your communication sessions, discover meaningful patterns, and turn every mistake into a better response.'}
                </p>
              </div>

              {/* Recommended Session Quick-Open (Strictly from Real Owned Sessions) */}
              {recommended && (
                <div
                  data-testid="replay-recommended-card"
                  className="w-full max-w-sm rounded-xl border border-cyan-400/25 bg-[#050A22]/85 p-3.5"
                >
                  <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'পর্যালোচনার জন্য প্রস্তাবিত' : 'Recommended to Review'}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs font-bold text-white">
                    {lang === 'bn' ? recommended.session.titleBn : recommended.session.titleEn}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {lang === 'bn' ? recommended.reasonBn : recommended.reasonEn}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectSession(recommended.session.id)}
                    data-testid="replay-open-recommended-btn"
                    className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                  >
                    <span>
                      {activeSession?.id === recommended.session.id
                        ? lang === 'bn'
                          ? 'এখন খোলা আছে'
                          : 'Currently open'
                        : lang === 'bn'
                          ? 'এই সেশনটি খুলুন'
                          : 'Open recommended session'}
                    </span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 4 Strictly Real-Data KPI Cards (Zero Fabricated Metrics) */}
          <section
            aria-label={lang === 'bn' ? 'রিপ্লে পরিসংখ্যান' : 'Replay Statistics'}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <div className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-4">
              <p className="text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? 'মোট সংরক্ষিত সেশন' : 'Total Eligible Sessions'}
              </p>
              <p
                data-testid="replay-kpi-total"
                className="mt-1 font-mono text-2xl font-bold text-white tabular-nums"
              >
                {metrics.totalSessions}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                {metrics.speakingCount} {lang === 'bn' ? 'স্পিকিং' : 'Speaking'} ·{' '}
                {metrics.transferCount} {lang === 'bn' ? 'ট্রান্সফার' : 'Transfer'}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-4">
              <p className="text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? 'অডিও রেকর্ডিংসহ সেশন' : 'With Available Recordings'}
              </p>
              <p
                data-testid="replay-kpi-recordings"
                className="mt-1 font-mono text-2xl font-bold text-cyan-300 tabular-nums"
              >
                {metrics.sessionsWithAudioMetadata}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {lang === 'bn' ? 'এই ব্রাউজারের অডিও রেফ' : 'Audio refs on this device'}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-4">
              <p className="text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? 'ট্রান্সক্রিপ্টসহ সেশন' : 'With Transcripts'}
              </p>
              <p
                data-testid="replay-kpi-transcripts"
                className="mt-1 font-mono text-2xl font-bold text-violet-300 tabular-nums"
              >
                {metrics.sessionsWithTranscripts}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                {metrics.sessionsEvaluated} {lang === 'bn' ? 'টি মূল্যায়িত' : 'evaluated'} ·{' '}
                {metrics.totalDetectedMistakes} {lang === 'bn' ? 'ভুল' : 'mistakes'}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-4">
              <p className="text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? 'পর্যালোচিত সেশন' : 'Sessions Reviewed'}
              </p>
              <p
                data-testid="replay-kpi-reviewed"
                className="mt-1 font-mono text-2xl font-bold text-[#16E58B] tabular-nums"
              >
                {metrics.reviewedCount}
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                {metrics.inReviewCount} {lang === 'bn' ? 'চলমান' : 'in progress'} ·{' '}
                {metrics.unreviewedCount} {lang === 'bn' ? 'বাকি' : 'remaining'}
              </p>
            </div>
          </section>

          {/* Recent Replay Activity Strip (Only Rendered When Real Reviews Exist) */}
          {recentReviewedSessions.length > 0 && (
            <section
              aria-label={lang === 'bn' ? 'সাম্প্রতিক পর্যালোচনা কার্যক্রম' : 'Recent Replay Activity'}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#070E2A]/90 px-4 py-2.5 text-xs"
            >
              <span className="font-mono text-[11px] text-slate-400">
                {lang === 'bn' ? 'সাম্প্রতিক পর্যালোচনা:' : 'Recently reviewed:'}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {recentReviewedSessions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSession(item.id)}
                    className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    <span className="font-medium">
                      {lang === 'bn' ? item.titleBn : item.titleEn}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Deep-link Unauthorized / Not Found Guard */}
          {requestedSessionId &&
            (resolvedRequest.status === 'unauthorized' ||
              resolvedRequest.status === 'not_found') && (
              <div
                role="alert"
                data-testid="replay-access-guard"
                className="flex flex-col justify-between gap-4 rounded-2xl border border-rose-500/35 bg-rose-950/20 p-5 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  {resolvedRequest.status === 'unauthorized' ? (
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
                  ) : (
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {resolvedRequest.status === 'unauthorized'
                        ? lang === 'bn'
                          ? 'এই সেশনে প্রবেশাধিকার নেই'
                          : 'Access Restricted — Session Belongs to Another Account'
                        : lang === 'bn'
                          ? 'অনুরোধকৃত সেশনটি পাওয়া যায়নি'
                          : 'Requested Replay Session Not Found'}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {resolvedRequest.status === 'unauthorized'
                        ? lang === 'bn'
                          ? 'নিরাপত্তার কারণে আপনি শুধুমাত্র আপনার নিজের সংরক্ষিত কথোপকথন ও অডিও রেকর্ডিং দেখতে পারবেন।'
                          : 'For account privacy, Communication Replay only loads transcripts and audio belonging strictly to your signed-in account.'
                        : lang === 'bn'
                          ? 'এই সেশন আইডিটি আপনার এই ব্রাউজারের সংরক্ষিত লাইব্রেরিতে পাওয়া যায়নি।'
                          : 'This session ID was not found in your saved browser-local replay library.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearRequestedSession}
                  className="shrink-0 rounded-xl border border-slate-700 bg-[#081031] px-4 py-2 text-xs font-semibold text-white hover:border-cyan-400/50 cursor-pointer"
                >
                  {lang === 'bn' ? 'আমার লাইব্রেরিতে ফিরুন' : 'Return to My Library'}
                </button>
              </div>
            )}

          {/* Honest Empty State (0 Real Sessions) */}
          {ownedSessions.length === 0 ? (
            <section
              data-testid="replay-empty-state"
              className="rounded-2xl border border-cyan-400/20 bg-[#081031]/90 p-6 sm:p-10"
            >
              <div className="max-w-2xl">
                <p className="font-mono text-xs text-cyan-300 tabular-nums">
                  {lang === 'bn'
                    ? '০টি সংরক্ষিত সেশন · সৎ প্রাথমিক অবস্থা'
                    : '0 saved communication sessions · Honest empty state'}
                </p>
                <h2 className="font-portal mt-2 text-xl font-bold text-white sm:text-2xl">
                  {lang === 'bn'
                    ? 'আপনার Communication Replay লাইব্রেরি এখনো খালি'
                    : 'Your Communication Replay library is ready'}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                  {lang === 'bn'
                    ? 'কোনো কাল্পনিক ইতিহাস বা নকল রেকর্ডিং দেখানো হয় না। AI Speaking Studio বা Transfer Lab-এ অন্তত একটি সেশন সম্পন্ন করলে এখানে আপনার সম্পূর্ণ ট্রান্সক্রিপ্ট, বাস্তব অডিও প্লেয়ার, কারেকশন ল্যাব, প্র্যাকটিস মোড এবং Communication DNA প্রমাণ স্বয়ংক্রিয়ভাবে যুক্ত হবে।'
                    : 'No fabricated transcripts or fake audio waveforms are shown. Complete a session in AI Speaking Studio or Transfer Lab, and your speaker-separated transcript, real audio waveform player, Correction Lab, Response Replay Practice, and Communication DNA trace will appear here automatically.'}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    to="/app/speak"
                    className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white whitespace-nowrap"
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'AI Speaking Studio শুরু করুন' : 'Start Speaking Studio'}
                    </span>
                  </Link>
                  <Link
                    to="/app/transfer-lab"
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-5 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors whitespace-nowrap"
                  >
                    <FlaskConical className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'Transfer Lab সিনারিও খুলুন' : 'Explore Transfer Lab'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            /* Main Split Replay Workspace */
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Saved Session Library */}
              <div className="lg:col-span-4">
                <ReplayLibrarySidebar
                  sessions={filteredSessions}
                  allOwnedSessions={ownedSessions}
                  selectedSessionId={activeSession?.id ?? null}
                  filters={filters}
                  onChangeFilters={setFilters}
                  onSelectSession={handleSelectSession}
                />
              </div>

              {/* Right Column: Active Session Replay Inspector */}
              <div className="space-y-5 lg:col-span-8 min-w-0">
                {activeSession ? (
                  <>
                    {/* Active Session Header + Docked Audio Player + 4-Tab Bar */}
                    <section className="rounded-2xl border border-cyan-400/20 bg-[#081031]/95 p-5 sm:p-6 space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <span className="inline-flex items-center gap-1 font-semibold text-cyan-300">
                              <History className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>
                                {lang === 'bn'
                                  ? activeSession.categoryLabelBn
                                  : activeSession.categoryLabelEn}
                              </span>
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-300">{activeSession.scenarioCategory}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-300">
                              {lang === 'bn'
                                ? activeSession.pressureLabelBn
                                : activeSession.pressureLabelEn}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span className="font-mono text-slate-400 tabular-nums">
                              {formatDateTimeFull(activeSession.completedAt, lang)}
                            </span>
                          </div>

                          <h2
                            data-testid="replay-active-title"
                            className="font-portal mt-2 text-lg font-bold text-white sm:text-xl"
                          >
                            {lang === 'bn' ? activeSession.titleBn : activeSession.titleEn}
                          </h2>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {lang === 'bn' ? activeSession.subtitleBn : activeSession.subtitleEn}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-slate-300 tabular-nums">
                            {activeSession.durationSeconds > 0 && (
                              <>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                  {Math.floor(activeSession.durationSeconds / 60)}m{' '}
                                  {activeSession.durationSeconds % 60}s
                                </span>
                                <span className="text-slate-600">·</span>
                              </>
                            )}
                            <span>
                              {activeSession.learnerTurnCount}{' '}
                              {lang === 'bn'
                                ? 'টি আপনার উত্তর'
                                : activeSession.learnerTurnCount === 1
                                  ? 'learner turn'
                                  : 'learner turns'}
                            </span>
                            <span className="text-slate-600">·</span>
                            <span
                              className={
                                activeSession.mistakes.length > 0
                                  ? 'text-amber-300'
                                  : 'text-emerald-300'
                              }
                            >
                              {activeSession.mistakes.length}{' '}
                              {lang === 'bn'
                                ? 'টি ভুল শনাক্ত'
                                : activeSession.mistakes.length === 1
                                  ? 'mistake detected'
                                  : 'mistakes detected'}
                            </span>
                            {activeSession.analysis.overallScore !== null && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="font-semibold text-cyan-200">
                                  {lang === 'bn' ? 'স্কোর' : 'Score'}{' '}
                                  {activeSession.analysis.overallScore}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quick Mark Reviewed Toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateReview({
                              status:
                                activeSession.reviewStatus === 'reviewed'
                                  ? 'unreviewed'
                                  : 'reviewed',
                            })
                          }
                          data-testid="quick-mark-reviewed-btn"
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            activeSession.reviewStatus === 'reviewed'
                              ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                              : 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {activeSession.reviewStatus === 'reviewed'
                              ? lang === 'bn'
                                ? 'পর্যালোচিত ✓'
                                : 'Reviewed'
                              : lang === 'bn'
                                ? 'পর্যালোচিত চিহ্নিত করুন'
                                : 'Mark Reviewed'}
                          </span>
                        </button>
                      </div>

                      {/* Docked Real-Waveform Audio Replay Player */}
                      <ReplayAudioPlayer
                        session={activeSession}
                        currentUserId={userId}
                        activeAudioTurnId={activeAudioTurnId}
                        audioRevision={audioRevision}
                        onSelectAudioTurn={handleJumpToAudioTurn}
                      />

                      {/* 4-Tab Inspector Navigation */}
                      <div
                        role="tablist"
                        aria-label={lang === 'bn' ? 'রিপ্লে বিভাগ' : 'Replay sections'}
                        className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800/90 bg-[#050A22] p-1 sm:grid-cols-4"
                      >
                        {(
                          [
                            {
                              id: 'transcript',
                              en: `Transcript (${activeSession.turns.length})`,
                              bn: `ট্রান্সক্রিপ্ট (${activeSession.turns.length})`,
                              icon: FileText,
                            },
                            {
                              id: 'mistakes',
                              en: `Correction Lab (${activeSession.mistakes.length})`,
                              bn: `কারেকশন ল্যাব (${activeSession.mistakes.length})`,
                              icon: GitCompare,
                            },
                            {
                              id: 'practice',
                              en: `Practice (${activeSessionPracticeAttempts.length})`,
                              bn: `প্র্যাকটিস (${activeSessionPracticeAttempts.length})`,
                              icon: PenLine,
                            },
                            {
                              id: 'analysis',
                              en: 'Analysis & Privacy',
                              bn: 'বিশ্লেষণ ও গোপনীয়তা',
                              icon: Activity,
                            },
                          ] as const
                        ).map((tab) => {
                          const Icon = tab.icon;
                          const selected = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              role="tab"
                              type="button"
                              aria-selected={selected}
                              data-testid={`replay-tab-${tab.id}`}
                              onClick={() => setActiveTab(tab.id)}
                              className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-[linear-gradient(90deg,rgba(0,217,255,0.2)_0%,rgba(124,58,237,0.2)_100%)] text-white border border-cyan-400/35'
                                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">
                                {lang === 'bn' ? tab.bn : tab.en}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Active Inspector Tab Panel */}
                    {activeTab === 'transcript' && (
                      <ReplayTranscriptTimeline
                        session={activeSession}
                        explanationPref={explanationPref}
                        focusedTurnId={focusedTurnId}
                        activeAudioTurnId={activeAudioTurnId}
                        onSelectTurnForMistakes={handleSelectTurnForMistakes}
                        onJumpToAudioTurn={handleJumpToAudioTurn}
                        onPracticeTurn={handlePracticeTurn}
                        onInspectTurn={handleInspectTurn}
                      />
                    )}

                    {activeTab === 'mistakes' && (
                      <ReplayMistakeAndDiffPanel
                        session={activeSession}
                        currentUserId={userId}
                        explanationPref={explanationPref}
                        onJumpToTurn={handleJumpToTurn}
                        onPracticeTurn={handlePracticeTurn}
                        onToggleComparisonReviewed={handleToggleComparisonReviewed}
                      />
                    )}

                    {activeTab === 'practice' && (
                      <ReplayPracticePanel
                        session={activeSession}
                        explanationPref={explanationPref}
                        selectedTurnId={practiceTurnId}
                        practiceAttempts={activeSessionPracticeAttempts}
                        onSavePracticeAttempt={handleSavePracticeAttempt}
                      />
                    )}

                    {activeTab === 'analysis' && (
                      <ReplayAnalysisAndPracticePanel
                        session={activeSession}
                        currentUserId={userId}
                        currentUserEmail={userEmail}
                        currentUserRole={userRole}
                        explanationPref={explanationPref}
                        privacyConsent={profile?.privacyConsent}
                        practiceAttempts={activeSessionPracticeAttempts}
                        onUpdateReview={handleUpdateReview}
                        onRecordingsDeleted={handleRecordingsDeleted}
                      />
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-[#081031]/80 p-8 text-center text-sm text-slate-400">
                    {lang === 'bn'
                      ? 'পর্যালোচনার জন্য বাম পাশের তালিকা থেকে একটি সেশন নির্বাচন করুন।'
                      : 'Select a saved session from the library to inspect its transcript and analysis.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </WorkspaceErrorBoundary>
    </LearnerShell>
  );
}
