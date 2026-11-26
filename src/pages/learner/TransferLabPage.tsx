import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Award, Compass, History } from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { VerifiedGamificationPanel } from '../../components/gamification/VerifiedGamificationPanel';
import { TransferDashboardHero } from '../../components/transfer/TransferDashboardHero';
import { ScenarioUniverseExplorer } from '../../components/transfer/ScenarioUniverseExplorer';
import { ImmersiveScenarioRoom } from '../../components/transfer/ImmersiveScenarioRoom';
import { TransferEvaluationReport } from '../../components/transfer/TransferEvaluationReport';
import type { TransferRealmSummary } from '../../components/transfer/TransferLabCanvas3D';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { buildCommunicationDnaLab } from '../../domain/communicationDnaLabEngine';
import {
  TRANSFER_CATEGORIES,
  buildPersonalizedTransferAdaptation,
  buildScenarioUniverseModels,
  computeTransferDashboardMetrics,
  createInitialObjectives,
  filterAndSortTransferScenarios,
  getTransferUniverseScenario,
  type ScenarioFilterState,
} from '../../domain/transferLabUniverseEngine';
import {
  clearTransferSessionDraft,
  loadUserTransferState,
  saveTransferSessionDraft,
  setTransferStagePreference,
} from '../../services/transferSessionStore';
import { fetchTransferHealth, type TransferHealthResponse } from '../../services/transferApi';
import type {
  PressureLadderLevelId,
  SpeakingInputChannel,
  TransferAttemptRecord,
  TransferConversationTurn,
  TransferRubricEvaluation,
  TransferScenarioCategory,
  TransferSessionDraft,
  TransferSessionEvaluationReport,
  XpLedgerEntry,
} from '../../types/domain';

type TransferTab = 'lab' | 'xp' | 'history';
type ActiveView = 'dashboard' | 'room' | 'report';

export function TransferLabPage() {
  const { lang } = useLanguage();
  const {
    user,
    profile,
    latestDiagnostic,
    mistakes,
    lessonAttempts,
    exerciseAttempts,
    lessonMastery,
    speakingSessions,
    mistakeDrillAttempts,
    transferAttempts,
    xpLedger,
    activitySummary,
    recordTransferAttempt,
  } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const consumedScenarioParamRef = useRef<string | null>(null);
  const userId = user?.id ?? 'anonymous';
  const learnerName = user?.name?.trim() || (lang === 'bn' ? 'শিক্ষার্থী' : 'Learner');
  const learnerLevel = profile?.selfEstimatedLevel ?? 'A2';
  const explanationPref = profile?.explanationLanguage ?? 'both';
  const allowMicStorage = profile?.privacyConsent?.storeMicRecordings !== false;
  const allowTelemetry = profile?.privacyConsent?.logAiEvaluations !== false;

  const [activeTab, setActiveTab] = useState<TransferTab>('lab');
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [health, setHealth] = useState<TransferHealthResponse | null>(null);

  // Persisted user-scoped draft & 2D/3D preference
  const [activeDraft, setActiveDraft] = useState<TransferSessionDraft | null>(null);
  const [prefer2DStage, setPrefer2DStage] = useState<boolean>(false);

  // Active room / report view state
  const [roomDraft, setRoomDraft] = useState<TransferSessionDraft | null>(null);
  const [activeReport, setActiveReport] = useState<TransferSessionEvaluationReport | null>(null);
  const [activeReportTranscript, setActiveReportTranscript] = useState<TransferConversationTurn[]>([]);
  const [activeReportXp, setActiveReportXp] = useState<XpLedgerEntry[]>([]);

  // Scenario Universe filter state
  const [filters, setFilters] = useState<ScenarioFilterState>({
    category: 'all',
    difficulty: 'all',
    skill: 'all',
    duration: 'all',
    status: 'all',
    search: '',
    sortBy: 'recommended',
  });

  // Load persisted draft & preferences for this user
  useEffect(() => {
    const saved = loadUserTransferState(userId);
    setActiveDraft(saved.activeDraft);
    setPrefer2DStage(saved.prefer2DStage);
  }, [userId]);

  // Check real server-side AI / STT / TTS availability
  useEffect(() => {
    let active = true;
    void fetchTransferHealth().then((res) => {
      if (active) setHealth(res);
    });
    return () => {
      active = false;
    };
  }, []);

  // Connect Part 10 Communication DNA directly into Part 11 personalization
  const dnaModel = useMemo(
    () =>
      buildCommunicationDnaLab({
        profile,
        latestDiagnostic,
        mistakes,
        lessonAttempts,
        exerciseAttempts,
        lessonMastery,
        speakingSessions,
        mistakeDrillAttempts,
        transferAttempts,
        timeframe: '30d',
      }),
    [
      profile,
      latestDiagnostic,
      mistakes,
      lessonAttempts,
      exerciseAttempts,
      lessonMastery,
      speakingSessions,
      mistakeDrillAttempts,
      transferAttempts,
    ]
  );

  // Real-data KPIs (never fabricated)
  const metrics = useMemo(
    () => computeTransferDashboardMetrics(transferAttempts),
    [transferAttempts]
  );

  // Personalized adaptation connected to Part 09 Mistake Memory + Part 10 DNA + Academy
  const adaptation = useMemo(
    () =>
      buildPersonalizedTransferAdaptation({
        mistakes,
        lessonMastery,
        transferAttempts,
        dnaSkills: dnaModel.skills,
      }),
    [mistakes, lessonMastery, transferAttempts, dnaModel.skills]
  );

  const universeModels = useMemo(
    () =>
      buildScenarioUniverseModels({
        transferAttempts,
        activeDraft,
        mistakes,
      }),
    [transferAttempts, activeDraft, mistakes]
  );

  const filteredModels = useMemo(
    () => filterAndSortTransferScenarios(universeModels, filters),
    [universeModels, filters]
  );

  const realmSummaries = useMemo<TransferRealmSummary[]>(() => {
    return TRANSFER_CATEGORIES.map((cat) => {
      const items = universeModels.filter((m) => m.scenario.category === cat.id);
      return {
        id: cat.id,
        labelEn: cat.labelEn,
        labelBn: cat.labelBn,
        accentHex: cat.accentHex,
        totalScenarios: items.length,
        completedScenarios: items.filter((m) => m.status === 'completed').length,
        inProgressCount: items.filter((m) => m.status === 'in_progress').length,
      };
    });
  }, [universeModels]);

  const currentObjectiveLabel = useMemo(() => {
    if (profile?.primaryGoal) {
      const goalMap: Record<string, { en: string; bn: string }> = {
        career: {
          en: 'Professional & Interview Communication',
          bn: 'পেশাগত ও ইন্টারভিউ যোগাযোগ দক্ষতা',
        },
        travel: {
          en: 'International Travel & Practical Independence',
          bn: 'আন্তর্জাতিক ভ্রমণ ও বাস্তব যোগাযোগ',
        },
        academic: {
          en: 'Academic Discussions & Presentations',
          bn: 'একাডেমিক আলোচনা ও প্রেজেন্টেশন',
        },
        daily_fluency: {
          en: 'Confident Everyday Communication',
          bn: 'দৈনন্দিন সাবলীল ইংরেজি যোগাযোগ',
        },
      };
      const matched = goalMap[profile.primaryGoal];
      if (matched) return lang === 'bn' ? matched.bn : matched.en;
    }
    return lang === 'bn' ? adaptation.headlineBn : adaptation.headlineEn;
  }, [profile?.primaryGoal, adaptation.headlineBn, adaptation.headlineEn, lang]);

  const handleToggleStageMode = (prefer2D: boolean) => {
    setPrefer2DStage(prefer2D);
    setTransferStagePreference(userId, prefer2D);
  };

  const handleSelectCategory = (category: TransferScenarioCategory | 'all') => {
    setFilters((prev) => ({ ...prev, category }));
  };

  const handleStartScenario = useCallback(
    (scenarioId: string) => {
      const scenario = getTransferUniverseScenario(scenarioId);
      if (!scenario) return;

      // Resume existing saved draft if it matches the selected scenario
      if (activeDraft && activeDraft.scenarioId === scenario.id) {
        setRoomDraft(activeDraft);
        setActiveTab('lab');
        setActiveView('room');
        return;
      }

      const nowIso = new Date().toISOString();
      const freshDraft: TransferSessionDraft = {
        sessionId: `trf_sess_${Date.now()}`,
        scenarioId: scenario.id,
        pressureLevel: adaptation.recommendedPressure,
        interactionMode: 'text',
        startedAt: nowIso,
        updatedAt: nowIso,
        elapsedSeconds: 0,
        messages: [
          {
            id: `turn_open_${Date.now()}`,
            role: 'ai',
            text: scenario.openingMessageEn,
            hintBn: scenario.openingMessageBn,
            timestamp: nowIso,
          },
        ],
        objectives: createInitialObjectives(scenario),
        currentPhaseLabel: lang === 'bn' ? 'সিনারিও সূচনা' : 'Opening Exchange',
        draftInput: '',
        voiceConsentGranted: false,
        retainAudioConsent: false,
        adaptationSummaryEn: adaptation.headlineEn,
        adaptationSummaryBn: adaptation.headlineBn,
      };

      saveTransferSessionDraft(userId, freshDraft);
      setActiveDraft(freshDraft);
      setRoomDraft(freshDraft);
      setActiveTab('lab');
      setActiveView('room');
    },
    [activeDraft, adaptation, lang, userId]
  );

  // Honor ?scenario=<id> deep link from Communication Replay retry action
  useEffect(() => {
    const scenarioParam = searchParams.get('scenario');
    if (!scenarioParam || consumedScenarioParamRef.current === scenarioParam) return;
    if (!getTransferUniverseScenario(scenarioParam)) return;
    consumedScenarioParamRef.current = scenarioParam;
    handleStartScenario(scenarioParam);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, handleStartScenario]);

  const handleResumeDraft = () => {
    if (!activeDraft) return;
    setRoomDraft(activeDraft);
    setActiveTab('lab');
    setActiveView('room');
  };

  const handleDiscardDraft = () => {
    clearTransferSessionDraft(userId);
    setActiveDraft(null);
    if (activeView === 'room') {
      setRoomDraft(null);
      setActiveView('dashboard');
    }
  };

  const handleDraftChange = useCallback(
    (updated: TransferSessionDraft) => {
      saveTransferSessionDraft(userId, updated);
      setActiveDraft(updated);
    },
    [userId]
  );

  const handleSaveAndExit = (draft: TransferSessionDraft) => {
    saveTransferSessionDraft(userId, draft);
    setActiveDraft(draft);
    setRoomDraft(null);
    setActiveView('dashboard');
  };

  const handleSessionEvaluated = async (payload: {
    report: TransferSessionEvaluationReport;
    rubricEvaluation: TransferRubricEvaluation;
    transcript: TransferConversationTurn[];
    pressureLevel: PressureLadderLevelId;
    durationSeconds: number;
    inputChannel: SpeakingInputChannel;
  }) => {
    const scenario = getTransferUniverseScenario(payload.report.scenarioId);
    const learnerCombinedText = payload.transcript
      .filter((t) => t.role === 'learner')
      .map((t) => t.text.trim())
      .join(' | ');

    const linkedSourceType: 'mistake_memory' | 'academy_lesson' | 'baseline' =
      adaptation.sourceType === 'mistake_memory'
        ? 'mistake_memory'
        : adaptation.sourceType === 'academy_lesson'
          ? 'academy_lesson'
          : 'baseline';

    const recorded = await recordTransferAttempt({
      scenarioId: payload.report.scenarioId,
      pressureLevel: payload.pressureLevel,
      targetSkillLabelEn: scenario
        ? scenario.targetSkills.slice(0, 2).join(' · ')
        : adaptation.targetSkillLabelEn,
      targetSkillLabelBn: scenario ? scenario.titleBn : adaptation.targetSkillLabelBn,
      linkedSourceType,
      linkedSourceId: adaptation.sourceId,
      userResponse: learnerCombinedText || 'Multi-turn scenario response',
      inputChannel: payload.inputChannel,
      durationSeconds: payload.durationSeconds,
      timedOut: false,
      evaluation: payload.rubricEvaluation,
      transcript: payload.transcript,
      completedAt: payload.report.evaluatedAt,
    });

    clearTransferSessionDraft(userId);
    setActiveDraft(null);
    setRoomDraft(null);
    setActiveReport(payload.report);
    setActiveReportTranscript(payload.transcript);
    setActiveReportXp(recorded.newlyAwardedXp);
    setActiveView('report');
  };

  const handleInspectAttempt = (attempt: TransferAttemptRecord) => {
    if (attempt.evaluation.part11Report) {
      setActiveReport(attempt.evaluation.part11Report);
      setActiveReportTranscript(attempt.transcript ?? []);
      setActiveReportXp([]);
      setActiveTab('lab');
      setActiveView('report');
      return;
    }
    setActiveTab('history');
    setActiveView('dashboard');
  };

  const activeRoomScenario = roomDraft ? getTransferUniverseScenario(roomDraft.scenarioId) : null;

  return (
    <LearnerShell title={lang === 'bn' ? 'ট্রান্সফার ল্যাব' : 'Transfer Lab'}>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        {/* Top Navigation Bar (Transfer Lab / Verified XP / History) — hidden inside focused room */}
        {activeView !== 'room' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {lang === 'bn'
                  ? 'ট্রান্সফার ল্যাব · বাস্তব যোগাযোগ সিমুলেশন'
                  : 'Transfer Lab · Real-World Communication Simulation'}
              </p>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'শুধু ভাষা শিখবেন না — বাস্তব জীবনে ব্যবহার করুন।'
                  : "Don't Just Learn a Language. Use It in Real Life."}
              </p>
            </div>

            <div
              role="tablist"
              aria-label={lang === 'bn' ? 'ট্রান্সফার ল্যাব সেকশন' : 'Transfer Lab sections'}
              className="inline-flex rounded-xl border border-slate-800 bg-[#080F2D] p-1 text-xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'lab'}
                onClick={() => {
                  setActiveTab('lab');
                  if (activeView === 'report') setActiveView('dashboard');
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
                  activeTab === 'lab'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'সিনারিও ল্যাব' : 'Transfer Lab'}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'xp'}
                onClick={() => {
                  setActiveTab('xp');
                  setActiveView('dashboard');
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
                  activeTab === 'xp'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'যাচাইকৃত XP' : 'Verified XP'}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'history'}
                onClick={() => {
                  setActiveTab('history');
                  setActiveView('dashboard');
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                {lang === 'bn' ? 'ইতিহাস' : 'History'}{' '}
                <span className="font-mono text-[11px] opacity-75 tabular-nums">
                  ({transferAttempts.length})
                </span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: Immersive Scenario Room */}
        {activeView === 'room' && roomDraft && activeRoomScenario && (
          <ImmersiveScenarioRoom
            userId={userId}
            scenario={activeRoomScenario}
            initialDraft={roomDraft}
            learnerLevel={learnerLevel}
            explanationLanguage={explanationPref}
            adaptation={adaptation}
            health={health}
            allowMicStorageByProfile={allowMicStorage}
            allowTelemetry={allowTelemetry}
            onDraftChange={handleDraftChange}
            onSaveAndExit={handleSaveAndExit}
            onSessionEvaluated={handleSessionEvaluated}
          />
        )}

        {/* VIEW 2: Evidence-Based 8-Dimension Evaluation Report */}
        {activeView === 'report' && activeReport && (
          <TransferEvaluationReport
            report={activeReport}
            transcript={activeReportTranscript}
            newlyAwardedXp={activeReportXp}
            onRetestScenario={(scenarioId) => handleStartScenario(scenarioId)}
            onBackToUniverse={() => {
              setActiveView('dashboard');
              setActiveTab('lab');
            }}
          />
        )}

        {/* VIEW 3: Main Transfer Lab Dashboard + Scenario Universe */}
        {activeView === 'dashboard' && activeTab === 'lab' && (
          <div className="space-y-8">
            <TransferDashboardHero
              learnerName={learnerName}
              targetLanguageLabel={lang === 'bn' ? 'ইংরেজি (English)' : 'English'}
              currentObjectiveLabel={currentObjectiveLabel}
              metrics={metrics}
              adaptation={adaptation}
              activeDraft={activeDraft}
              recentAttempts={transferAttempts}
              realms={realmSummaries}
              selectedCategory={filters.category}
              prefer2DStage={prefer2DStage}
              onToggleStageMode={handleToggleStageMode}
              onSelectCategory={handleSelectCategory}
              onStartScenario={handleStartScenario}
              onResumeDraft={handleResumeDraft}
              onDiscardDraft={handleDiscardDraft}
              onInspectAttempt={handleInspectAttempt}
            />

            <ScenarioUniverseExplorer
              models={universeModels}
              filteredModels={filteredModels}
              filters={filters}
              health={health}
              onChangeFilters={setFilters}
              onLaunchScenario={handleStartScenario}
            />
          </div>
        )}

        {/* TAB: Verified Gamification & XP Ledger (preserved existing component) */}
        {activeView === 'dashboard' && activeTab === 'xp' && (
          <VerifiedGamificationPanel
            xpLedger={xpLedger}
            lessonMastery={lessonMastery}
            speakingSessions={speakingSessions}
            mistakes={mistakes}
            transferAttempts={transferAttempts}
          />
        )}

        {/* TAB: Attempt History with Part 11 8-Dimension Report Inspection */}
        {activeView === 'dashboard' && activeTab === 'history' && (
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                {lang === 'bn'
                  ? 'ট্রান্সফার সেশনের ইতিহাস (Session History)'
                  : 'Verified Transfer Session History'}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'আপনার প্রতিটি মূল্যায়িত সিনারিও, স্কোর এবং সংরক্ষিত ৮-মাত্রার রিপোর্ট এখান থেকে পর্যালোচনা করুন।'
                  : 'Review every evaluated scenario attempt, outcome, and saved 8-dimension evidence report.'}
              </p>
            </div>

            {transferAttempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-[#080F2D] p-8 text-center text-sm text-slate-400">
                {lang === 'bn'
                  ? 'এখনো কোনো ট্রান্সফার সেশন সম্পন্ন হয়নি। প্রথম সিনারিও সম্পন্ন হলে এখানে ইতিহাস যুক্ত হবে।'
                  : 'No Transfer Lab sessions completed yet. Finish any scenario to record verified history here.'}
              </div>
            ) : (
              <div className="space-y-3">
                {transferAttempts.map((attempt) => {
                  const sc = getTransferUniverseScenario(attempt.scenarioId);
                  const hasPart11 = Boolean(attempt.evaluation.part11Report);
                  return (
                    <article
                      key={attempt.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-5 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-white">
                            {sc
                              ? lang === 'bn'
                                ? sc.titleBn
                                : sc.titleEn
                              : attempt.scenarioId}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className={attempt.passed ? 'text-emerald-300' : 'text-amber-300'}>
                            {attempt.passed
                              ? lang === 'bn'
                                ? 'উত্তীর্ণ'
                                : 'Passed'
                              : lang === 'bn'
                                ? 'পুনরায় অনুশীলন প্রয়োজন'
                                : 'Needs Retest'}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 tabular-nums">
                            {new Date(attempt.completedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {lang === 'bn'
                            ? attempt.evaluation.coach_summary_bn
                            : attempt.evaluation.coach_summary_en}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                        <span
                          className={`font-mono text-xl font-bold tabular-nums ${
                            attempt.passed ? 'text-emerald-300' : 'text-amber-300'
                          }`}
                        >
                          {attempt.evaluation.overall_score}%
                        </span>
                        <Link
                          to={`/app/replay?session=${encodeURIComponent(attempt.id)}`}
                          className="rounded-xl border border-violet-400/45 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/25 whitespace-nowrap"
                        >
                          {lang === 'bn' ? 'রিপ্লে খুলুন' : 'Open in Replay'}
                        </Link>
                        {hasPart11 && (
                          <button
                            type="button"
                            onClick={() => handleInspectAttempt(attempt)}
                            className="rounded-xl border border-cyan-400/50 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 cursor-pointer"
                          >
                            {lang === 'bn' ? '৮-মাত্রার রিপোর্ট দেখুন' : 'Inspect 8D Report'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </LearnerShell>
  );
}
