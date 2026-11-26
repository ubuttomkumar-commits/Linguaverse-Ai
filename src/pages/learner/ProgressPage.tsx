import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, CalendarClock, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { DnaHeroSection } from '../../components/progress/dna/DnaHeroSection';
import { CommunicationDnaCanvas3D } from '../../components/progress/dna/CommunicationDnaCanvas3D';
import { CommunicationDnaMap2D } from '../../components/progress/dna/CommunicationDnaMap2D';
import { DnaSkillInspector } from '../../components/progress/dna/DnaSkillInspector';
import { DnaSkillMatrix } from '../../components/progress/dna/DnaSkillMatrix';
import { DnaAnalyticsSuite } from '../../components/progress/dna/DnaAnalyticsSuite';
import { DnaAiIntelligencePanel } from '../../components/progress/dna/DnaAiIntelligencePanel';
import { DnaEvidenceLedger } from '../../components/progress/dna/DnaEvidenceLedger';
import { IntelligenceCharts } from '../../components/progress/IntelligenceCharts';
import { VerifiedGamificationPanel } from '../../components/gamification/VerifiedGamificationPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getLessonById } from '../../domain/curriculumData';
import {
  buildCommunicationDnaLab,
  type DnaSkillId,
  type DnaSkillNode,
  type DnaTimeframe,
} from '../../domain/communicationDnaLabEngine';
import {
  buildLessonCompletionSeries,
  buildMistakeRecurrenceSeries,
  buildSpacedRetentionSeries,
  buildWeeklyPracticeSeries,
} from '../../domain/personalIntelligenceEngine';
import { getSpeakingScenario } from '../../domain/speakingScenarios';
import {
  computeCommunicationReadiness,
  detectLearningPlateau,
} from '../../domain/advancedLearningLabsEngine';
import { fetchIeltsAttempts, fetchWritingDiaryEntries } from '../../services/prd61Api';

export function ProgressPage() {
  const { lang, t } = useLanguage();
  const {
    user,
    profile,
    latestDiagnostic,
    mistakes,
    activitySummary,
    lessonMastery,
    lessonAttempts,
    exerciseAttempts,
    speakingSessions,
    mistakeDrillAttempts,
    transferAttempts,
    xpLedger,
    totalVerifiedXp,
  } = useAuth();

  const [timeframe, setTimeframe] = useState<DnaTimeframe>('all');
  const [selectedSkillId, setSelectedSkillId] = useState<DnaSkillId>('grammar');
  const [mapMode, setMapMode] = useState<'3d' | '2d'>(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return '2d';
    }
    return '3d';
  });
  const [coachTriggerPrompt, setCoachTriggerPrompt] = useState<string | null>(null);
  const [analyzeTriggerCount, setAnalyzeTriggerCount] = useState(0);
  const [showLegacyLedgers, setShowLegacyLedgers] = useState(true);
  const [examWritingCount, setExamWritingCount] = useState(0);

  const labStageRef = useRef<HTMLElement | null>(null);
  const aiPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchIeltsAttempts().catch(() => ({ attempts: [] })),
      fetchWritingDiaryEntries().catch(() => ({ entries: [] })),
    ]).then(([ex, wr]) => {
      if (!active) return;
      setExamWritingCount((ex.attempts?.length ?? 0) + (wr.entries?.length ?? 0));
    });
    return () => {
      active = false;
    };
  }, []);

  const dailyGoalMinutes = profile?.dailyTimeGoalMinutes ?? 15;

  const dnaModel = useMemo(
    () =>
      buildCommunicationDnaLab({
        profile,
        latestDiagnostic,
        exerciseAttempts,
        lessonAttempts,
        lessonMastery,
        speakingSessions,
        mistakes,
        mistakeDrillAttempts,
        transferAttempts,
        activitySummary,
        timeframe,
      }),
    [
      profile,
      latestDiagnostic,
      exerciseAttempts,
      lessonAttempts,
      lessonMastery,
      speakingSessions,
      mistakes,
      mistakeDrillAttempts,
      transferAttempts,
      activitySummary,
      timeframe,
    ]
  );

  const selectedSkill: DnaSkillNode = useMemo(
    () => dnaModel.skills.find((s) => s.id === selectedSkillId) ?? dnaModel.skills[0],
    [dnaModel.skills, selectedSkillId]
  );

  const weeklyPractice = useMemo(
    () =>
      buildWeeklyPracticeSeries(
        lessonAttempts,
        speakingSessions,
        mistakeDrillAttempts,
        new Date(),
        transferAttempts
      ),
    [lessonAttempts, speakingSessions, mistakeDrillAttempts, transferAttempts]
  );

  const lessonCompletions = useMemo(
    () => buildLessonCompletionSeries(lessonMastery),
    [lessonMastery]
  );

  const mistakeRecurrence = useMemo(
    () => buildMistakeRecurrenceSeries(mistakes),
    [mistakes]
  );

  const spacedRetention = useMemo(
    () => buildSpacedRetentionSeries(lessonMastery, mistakes),
    [lessonMastery, mistakes]
  );

  const practicedLessons = useMemo(
    () =>
      Object.values(lessonMastery).sort(
        (a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime()
      ),
    [lessonMastery]
  );

  const plateauSignal = useMemo(() => {
    const scoredTimeline: Array<{ ts: number; score: number }> = [];
    for (const la of lessonAttempts) {
      if (typeof la.overallAccuracyPercent === 'number') {
        scoredTimeline.push({ ts: Date.parse(la.completedAt) || 0, score: la.overallAccuracyPercent });
      }
    }
    for (const ta of transferAttempts) {
      if (typeof ta.evaluation?.overall_score === 'number') {
        scoredTimeline.push({ ts: Date.parse(ta.completedAt) || 0, score: ta.evaluation.overall_score });
      }
    }
    scoredTimeline.sort((a, b) => a.ts - b.ts);
    const recurringMistakeCount = mistakes.filter(
      (m) => m.status !== 'resolved' && m.occurrences >= 2
    ).length;
    return detectLearningPlateau({
      recentScoresPct: scoredTimeline.map((x) => x.score),
      recurringMistakeCount,
      completedLessonsCount: activitySummary.completedLessons,
    });
  }, [lessonAttempts, transferAttempts, mistakes, activitySummary.completedLessons]);

  const communicationReadiness = useMemo(
    () =>
      computeCommunicationReadiness({
        diagnosticCompleted: Boolean(latestDiagnostic),
        completedLessonsCount: activitySummary.completedLessons,
        speakingSessionsCount: speakingSessions.length,
        transferAttemptsCount: transferAttempts.length,
        examOrWritingAttemptsCount: examWritingCount,
      }),
    [
      latestDiagnostic,
      activitySummary.completedLessons,
      speakingSessions.length,
      transferAttempts.length,
      examWritingCount,
    ]
  );

  const formatDate = (iso: string) => {
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

  const handleExploreDna = () => {
    labStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAnalyzeCommunication = () => {
    aiPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (dnaModel.profileSeparation.aiInterpretationEligibility.eligible) {
      setAnalyzeTriggerCount((c) => c + 1);
    }
  };

  const handleAskCoachAboutSkill = (skill: DnaSkillNode) => {
    const prompt =
      lang === 'bn'
        ? `আমার ${skill.titleBn} দক্ষতা সম্পর্কে বিস্তারিত বিশ্লেষণ এবং পরবর্তী অনুশীলন পরামর্শ দিন।`
        : `Analyze my ${skill.titleEn} evidence (${
            skill.scorePercent !== null ? `${skill.scorePercent}%` : 'unmeasured'
          }, ${skill.sampleSize} samples) and tell me what to practice next.`;
    setCoachTriggerPrompt(prompt);
    aiPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <LearnerShell
      title={lang === 'bn' ? 'কমিউনিকেশন DNA ল্যাব ও অগ্রগতি' : 'Communication DNA & Progress'}
      subtitle={
        lang === 'bn'
          ? '৩ডি নিউরাল কমিউনিকেশন DNA, প্রমাণভিত্তিক দক্ষতা মানচিত্র, রাডার অ্যানালিটিক্স এবং AI কোচ — কোনো কাল্পনিক স্কোর ছাড়া।'
          : 'Interactive 3D Communication DNA neural map, evidence-based skill profiling, radar analytics, and AI coaching — zero fabricated scores.'
      }
    >
      <div className="space-y-8">
        {/* 1. Cinematic Communication DNA Hero */}
        <DnaHeroSection
          learnerName={user?.name ?? ''}
          model={dnaModel}
          selectedSkillId={selectedSkillId}
          onSelectSkill={(id) => {
            setSelectedSkillId(id);
            labStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }}
          onExploreDna={handleExploreDna}
          onAnalyzeCommunication={handleAnalyzeCommunication}
        />

        {/* 2. Signature Interactive 3D Neural DNA + Accessible 2D Map & Skill Intelligence Inspector */}
        <section
          ref={labStageRef}
          aria-label={
            lang === 'bn'
              ? 'ইন্টারেক্টিভ ৩ডি নিউরাল কমিউনিকেশন DNA ম্যাপ ও ইন্সপেক্টর'
              : 'Interactive 3D Communication DNA Neural Network and Skill Inspector'
          }
          className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-stretch"
        >
          <div className="xl:col-span-7">
            {mapMode === '3d' ? (
              <CommunicationDnaCanvas3D
                skills={dnaModel.skills}
                selectedSkillId={selectedSkillId}
                onSelectSkill={setSelectedSkillId}
                onSwitchTo2D={() => setMapMode('2d')}
              />
            ) : (
              <CommunicationDnaMap2D
                skills={dnaModel.skills}
                selectedSkillId={selectedSkillId}
                onSelectSkill={setSelectedSkillId}
                onSwitchTo3D={() => setMapMode('3d')}
              />
            )}
          </div>

          <div className="xl:col-span-5">
            <DnaSkillInspector
              skill={selectedSkill}
              onAskCoachAboutSkill={handleAskCoachAboutSkill}
            />
          </div>
        </section>

        {/* 3. Six Core Communication Skills + Four Extended Dimensions Selector Matrix */}
        <DnaSkillMatrix
          coreSkills={dnaModel.coreSkills}
          extendedSkills={dnaModel.extendedSkills}
          selectedSkillId={selectedSkillId}
          onSelectSkill={setSelectedSkillId}
        />

        {/* 4. Interactive Communication Radar, Growth Timeline, Evidence Balance & Opportunities */}
        <DnaAnalyticsSuite
          model={dnaModel}
          timeframe={timeframe}
          onChangeTimeframe={setTimeframe}
          selectedSkillId={selectedSkillId}
          onSelectSkill={setSelectedSkillId}
        />

        {/* 5. Profile Separation (Measured vs Self-Reported vs AI Synthesis) + AI Communication Coach */}
        <div ref={aiPanelRef}>
          <DnaAiIntelligencePanel
            model={dnaModel}
            selectedSkill={selectedSkill}
            coachTriggerPrompt={coachTriggerPrompt}
            onConsumeCoachTrigger={() => setCoachTriggerPrompt(null)}
            analyzeTriggerCount={analyzeTriggerCount}
          />
        </div>

        {/* 6. Traceable Assessment Evidence Ledger */}
        <DnaEvidenceLedger records={dnaModel.evidenceLedger} />

        {/* 6B. PRD v6.1 §33 Learning Plateau & Recovery + §34 Independent Communication Readiness */}
        <section
          aria-label={
            lang === 'bn'
              ? 'শেখার স্থবিরতা সংকেত ও স্বাধীন যোগাযোগ প্রস্তুতি'
              : 'Learning Plateau Signal and Independent Communication Readiness'
          }
          className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                <h2 className="text-sm font-bold text-white">
                  {lang === 'bn'
                    ? 'শেখার গতি ও পুনরুদ্ধার সংকেত'
                    : 'Learning Plateau & Recovery Signal'}
                </h2>
              </div>
              <span
                className={`font-mono text-[11px] font-semibold uppercase ${
                  plateauSignal.status === 'possible_plateau'
                    ? 'text-amber-300'
                    : plateauSignal.status === 'progressing'
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                }`}
              >
                {plateauSignal.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {lang === 'bn' ? plateauSignal.evidenceSummaryBn : plateauSignal.evidenceSummaryEn}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
              {(lang === 'bn' ? plateauSignal.recoveryActionsBn : plateauSignal.recoveryActionsEn).map(
                (action, idx) => (
                  <li key={idx}>{action}</li>
                )
              )}
            </ul>
            <p className="border-t border-slate-800 pt-2.5 text-[11px] text-slate-500">
              {plateauSignal.limitationsEn}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-[#8B5CF6]" aria-hidden="true" />
                <h2 className="text-sm font-bold text-white">
                  {lang === 'bn'
                    ? 'স্বাধীন যোগাযোগ প্রস্তুতি সূচক'
                    : 'Independent Communication Readiness'}
                </h2>
              </div>
              <span className="font-mono text-xs font-bold text-[#00D9FF] tabular-nums">
                {communicationReadiness.coveragePct}% contexts
              </span>
            </div>
            <p className="text-sm font-semibold text-white">
              {lang === 'bn'
                ? communicationReadiness.bandLabelBn
                : communicationReadiness.bandLabelEn}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-800 bg-[#060C24] p-3">
                <p className="font-semibold text-emerald-300">
                  {lang === 'bn' ? 'প্রমাণিত প্রেক্ষাপট' : 'Contexts Covered'} (
                  {communicationReadiness.contextsCovered.length})
                </p>
                <ul className="mt-1.5 space-y-1 text-slate-300">
                  {communicationReadiness.contextsCovered.length === 0 ? (
                    <li className="text-slate-500">None recorded yet</li>
                  ) : (
                    communicationReadiness.contextsCovered.map((c) => <li key={c}>• {c}</li>)
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#060C24] p-3">
                <p className="font-semibold text-slate-300">
                  {lang === 'bn' ? 'বাকি প্রেক্ষাপট' : 'Next Contexts to Evidence'} (
                  {communicationReadiness.contextsMissing.length})
                </p>
                <ul className="mt-1.5 space-y-1 text-slate-400">
                  {communicationReadiness.contextsMissing.length === 0 ? (
                    <li className="text-emerald-300">All 5 practice contexts sampled</li>
                  ) : (
                    communicationReadiness.contextsMissing.map((c) => <li key={c}>• {c}</li>)
                  )}
                </ul>
              </div>
            </div>
            <p className="border-t border-slate-800 pt-2.5 text-[11px] text-slate-500">
              {communicationReadiness.limitationsEn}
            </p>
          </div>
        </section>

        {/* 7. Preserved Workspace Activity Totals, Charts, Verified XP & Session Ledgers */}
        <section
          aria-label={
            lang === 'bn'
              ? 'কার্যক্রম, যাচাইকৃত XP ও সেশন ইতিহাস'
              : 'Verified Activity Totals, XP and Session Ledgers'
          }
          className="space-y-6 border-t border-slate-800/80 pt-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-400">
                {lang === 'bn'
                  ? 'সম্পূর্ণ ওয়ার্কস্পেস খতিয়ান'
                  : 'Complete Workspace Records'}
              </p>
              <h2 className="font-portal mt-0.5 text-lg font-bold text-white">
                {lang === 'bn'
                  ? 'কার্যক্রমের খতিয়ান, যাচাইকৃত XP এবং সেশন লেজার'
                  : 'Verified Activity Totals, XP Ledger & Session History'}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowLegacyLedgers((prev) => !prev)}
              aria-expanded={showLegacyLedgers}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0A1334] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-white whitespace-nowrap cursor-pointer"
            >
              {showLegacyLedgers ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'সংকুচিত করুন' : 'Collapse Ledgers'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'বিস্তারিত দেখুন' : 'Expand Ledgers'}</span>
                </>
              )}
            </button>
          </div>

          {showLegacyLedgers && (
            <div className="space-y-6">
              {/* Completed Activity Totals (Honest 0s when empty) */}
              <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'bn' ? 'সম্পন্ন কার্যক্রমের বাস্তব খতিয়ান' : 'Verified Activity Totals'}
                  </h3>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {lang === 'bn'
                      ? `সক্রিয় ধারা: ${activitySummary.activeStreakDays} দিন`
                      : `Active streak: ${activitySummary.activeStreakDays} ${
                          activitySummary.activeStreakDays === 1 ? 'day' : 'days'
                        }`}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'যাচাইকৃত XP' : 'Verified XP'}
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-[#F59E0B] tabular-nums">
                      {totalVerifiedXp}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'সম্পন্ন লেসন' : 'Lessons Completed'}
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                      {activitySummary.completedLessons}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'ভয়েস সেশন' : 'Speaking Sessions'}
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                      {activitySummary.completedSpeakingSessions}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'ট্রান্সফার ল্যাব' : 'Transfer Drills'}
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                      {activitySummary.completedTransferDrills}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'মিস্টেক ড্রিল' : 'Mistake Drills'}
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                      {mistakeDrillAttempts.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'মোট অনুশীলন' : 'Practice Minutes'}
                    </dt>
                    <dd className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                      {activitySummary.totalPracticeMinutes}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Personal Intelligence Weekly Consistency & Retention Charts */}
              <IntelligenceCharts
                dailyGoalMinutes={dailyGoalMinutes}
                weeklyPractice={weeklyPractice}
                lessonCompletions={lessonCompletions}
                mistakeRecurrence={mistakeRecurrence}
                spacedRetention={spacedRetention}
              />

              {/* Verified Gamification & Auditable XP History Ledger */}
              <VerifiedGamificationPanel
                xpLedger={xpLedger}
                lessonMastery={lessonMastery}
                speakingSessions={speakingSessions}
                mistakes={mistakes}
                transferAttempts={transferAttempts}
                compact
              />

              {/* Academy Mastery & Spaced Review Ledger */}
              {practicedLessons.length > 0 && (
                <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">
                      {lang === 'bn'
                        ? 'একাডেমি মাস্টারি ও স্পেসড রিভিউ সূচি'
                        : 'Academy Mastery & Spaced Review Ledger'}
                    </h3>
                    <Link
                      to="/app/learn"
                      className="text-xs font-semibold text-[#00D9FF] hover:text-cyan-200"
                    >
                      {lang === 'bn' ? 'একাডেমিতে যান' : 'Go to Academy'}
                    </Link>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-2.5 pr-4 font-medium">
                            {lang === 'bn' ? 'লেসন' : 'Lesson'}
                          </th>
                          <th className="py-2.5 pr-4 font-medium">
                            {lang === 'bn' ? 'প্রচেষ্টা' : 'Attempts'}
                          </th>
                          <th className="py-2.5 pr-4 font-medium">
                            {lang === 'bn' ? 'সর্বোচ্চ নির্ভুলতা' : 'Best Accuracy'}
                          </th>
                          <th className="py-2.5 pr-4 font-medium">
                            {lang === 'bn' ? 'প্রমাণিত মাস্টারি' : 'Verified Mastery'}
                          </th>
                          <th className="py-2.5 text-right font-medium">
                            {lang === 'bn' ? 'পরবর্তী রিভিউ' : 'Next Review'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {practicedLessons.map((rec) => {
                          const lesson = getLessonById(rec.lessonId);
                          return (
                            <tr key={rec.lessonId} className="text-slate-200">
                              <td className="py-3 pr-4">
                                <Link
                                  to={`/app/learn/${rec.lessonId}`}
                                  className="font-semibold text-white hover:text-[#00D9FF]"
                                >
                                  {lesson
                                    ? lang === 'bn'
                                      ? lesson.titleBn
                                      : lesson.titleEn
                                    : rec.lessonId}
                                </Link>
                              </td>
                              <td className="py-3 pr-4 font-mono tabular-nums">{rec.attemptCount}</td>
                              <td className="py-3 pr-4 font-mono tabular-nums">
                                {rec.bestAccuracyPercent}%
                              </td>
                              <td className="py-3 pr-4 font-mono font-semibold text-[#00D9FF] tabular-nums">
                                {rec.masteryPercent}%
                              </td>
                              <td className="py-3 text-right font-mono tabular-nums text-slate-300">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarClock
                                    className="h-3.5 w-3.5 text-[#8B5CF6]"
                                    aria-hidden="true"
                                  />
                                  {formatDate(rec.nextReviewAt)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Speaking Studio & Communication Replay History */}
              {speakingSessions.length > 0 && (
                <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">
                      {lang === 'bn'
                        ? 'AI স্পিকিং স্টুডিও সেশন ইতিহাস'
                        : 'AI Speaking Studio Session Ledger'}
                    </h3>
                    <Link
                      to="/app/speak"
                      className="text-xs font-semibold text-[#00D9FF] hover:text-cyan-200"
                    >
                      {lang === 'bn' ? 'Communication Replay খুলুন' : 'Open Communication Replay'}
                    </Link>
                  </div>
                  <div className="mt-4 divide-y divide-slate-800/70">
                    {speakingSessions.slice(0, 6).map((session) => {
                      const scenario = getSpeakingScenario(session.modeId);
                      return (
                        <div
                          key={session.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs first:pt-0 last:pb-0"
                        >
                          <div>
                            <p className="font-semibold text-white">
                              {lang === 'bn' ? scenario.titleBn : scenario.titleEn}
                            </p>
                            <p className="mt-0.5 text-slate-400">
                              {formatDate(session.updatedAt)} · {session.turns.length}{' '}
                              {lang === 'bn'
                                ? 'ধাপ'
                                : session.turns.length === 1
                                  ? 'turn'
                                  : 'turns'}
                            </p>
                          </div>
                          <span className="font-mono text-slate-300 tabular-nums">
                            {session.totalMistakesDetected}{' '}
                            {lang === 'bn'
                              ? 'টি ভুল শনাক্ত'
                              : session.totalMistakesDetected === 1
                                ? 'mistake detected'
                                : 'mistakes detected'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Diagnostic Breakdown (only if diagnostic was taken) */}
              {latestDiagnostic && (
                <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">
                      {t.diagnostic.results.domainTitle}
                    </h3>
                    <span className="font-mono text-xs text-[#F59E0B] tabular-nums">
                      {lang === 'bn'
                        ? `কভারেজ: ${latestDiagnostic.confidenceCoveragePercent}% (শুধু লিখিত ডায়াগনস্টিক)`
                        : `Coverage: ${latestDiagnostic.confidenceCoveragePercent}% (Written Diagnostic Only)`}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]"
                      aria-hidden="true"
                    />
                    <span>
                      {lang === 'bn'
                        ? latestDiagnostic.confidenceLabelBn
                        : latestDiagnostic.confidenceLabelEn}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {latestDiagnostic.domainBreakdown.map((item) => (
                      <div
                        key={item.domain}
                        className="rounded-xl border border-slate-800 bg-[#060C24] p-4"
                      >
                        <p className="text-xs text-slate-400">{t.diagnostic.domains[item.domain]}</p>
                        <p className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
                          {item.accuracyPercent}%
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                          {item.correct} / {item.total}{' '}
                          {lang === 'bn' ? 'প্রশ্ন পর্যবেক্ষিত' : 'items observed'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </LearnerShell>
  );
}
