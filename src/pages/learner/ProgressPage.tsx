import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, Compass } from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { CommunicationDnaSection } from '../../components/progress/CommunicationDnaSection';
import { IntelligenceCharts } from '../../components/progress/IntelligenceCharts';
import { VerifiedGamificationPanel } from '../../components/gamification/VerifiedGamificationPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getLessonById } from '../../domain/curriculumData';
import { computeCommunicationDna } from '../../domain/communicationDnaEngine';
import {
  buildLessonCompletionSeries,
  buildMistakeRecurrenceSeries,
  buildSpacedRetentionSeries,
  buildWeeklyPracticeSeries,
  generateNextBestActions,
} from '../../domain/personalIntelligenceEngine';
import { getSpeakingScenario } from '../../domain/speakingScenarios';

export function ProgressPage() {
  const { lang, t } = useLanguage();
  const {
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

  const dailyGoalMinutes = profile?.dailyTimeGoalMinutes ?? 15;

  const dnaProfile = useMemo(
    () =>
      computeCommunicationDna({
        latestDiagnostic,
        exerciseAttempts,
        lessonAttempts,
        speakingSessions,
        mistakes,
        mistakeDrillAttempts,
      }),
    [
      latestDiagnostic,
      exerciseAttempts,
      lessonAttempts,
      speakingSessions,
      mistakes,
      mistakeDrillAttempts,
    ]
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

  const nextBestActions = useMemo(
    () =>
      generateNextBestActions({
        latestDiagnostic,
        mistakes,
        lessonMastery,
        lessonAttempts,
        exerciseAttempts,
        speakingSessions,
        dnaProfile,
      }),
    [
      latestDiagnostic,
      mistakes,
      lessonMastery,
      lessonAttempts,
      exerciseAttempts,
      speakingSessions,
      dnaProfile,
    ]
  );

  const practicedLessons = useMemo(
    () =>
      Object.values(lessonMastery).sort(
        (a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime()
      ),
    [lessonMastery]
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

  return (
    <LearnerShell
      title={
        lang === 'bn'
          ? 'পার্সোনাল ইন্টেলিজেন্স ও অগ্রগতি'
          : 'Personal Intelligence & Progress'
      }
      subtitle={
        lang === 'bn'
          ? 'Communication DNA, প্রমাণভিত্তিক চার্ট এবং পরবর্তী সেরা করণীয় — প্রতিটি সংখ্যা আপনার বাস্তব অনুশীলন থেকে নির্ণীত।'
          : 'Communication DNA, real activity analytics, and evidence-based next best actions — zero fabricated scores.'
      }
    >
      <div className="space-y-6">
        {/* 1. Evidence-Based Next Best Action */}
        <section
          aria-label="Evidence-Based Next Best Actions"
          className="rounded-xl border border-[#3B82F6]/40 bg-[#111827] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-xs text-[#3B82F6]">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? 'প্রমাণভিত্তিক সুপারিশ (Next Best Action)'
                    : 'Evidence-Based Next Best Actions'}
                </span>
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">
                {lang === 'bn'
                  ? 'আপনার বাস্তব ডেটার ভিত্তিতে পরবর্তী সেরা পদক্ষেপ'
                  : 'What to Practice Next — With Explicit Reasons'}
              </h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {nextBestActions.map((action, idx) => (
              <div
                key={action.id}
                className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#0A0F1C] p-4"
              >
                <div>
                  <p className="font-mono text-[11px] text-slate-400">
                    {lang === 'bn'
                      ? `অগ্রাধিকার ০${idx + 1}`
                      : `Priority 0${idx + 1}`}{' '}
                    ·{' '}
                    <span
                      className={
                        action.priority === 'high'
                          ? 'text-[#F59E0B]'
                          : action.priority === 'medium'
                            ? 'text-[#8B5CF6]'
                            : 'text-[#3B82F6]'
                      }
                    >
                      {action.priority === 'high'
                        ? lang === 'bn'
                          ? 'তাৎক্ষণিক গুরুত্ব'
                          : 'High Impact'
                        : action.priority === 'medium'
                          ? lang === 'bn'
                            ? 'ধারাবাহিকতা'
                            : 'Reinforcement'
                          : lang === 'bn'
                            ? 'ভিত্তি তৈরি'
                            : 'Baseline'}
                    </span>
                  </p>
                  <h3 className="mt-1.5 text-sm font-bold text-white">
                    {lang === 'bn' ? action.titleBn : action.titleEn}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    {lang === 'bn' ? action.reasonBn : action.reasonEn}
                  </p>
                </div>

                <div className="mt-4 pt-2">
                  <Link
                    to={action.to}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
                  >
                    <span>{lang === 'bn' ? action.ctaLabelBn : action.ctaLabelEn}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Completed Activity Totals (Honest 0s when empty) */}
        <section
          aria-label="Completed Activity Totals"
          className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-white">
              {lang === 'bn' ? 'সম্পন্ন কার্যক্রমের বাস্তব খতিয়ান' : 'Verified Activity Totals'}
            </h2>
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
        </section>

        {/* 3. Communication DNA Profile (5 Separate Honest Dimensions) */}
        <CommunicationDnaSection profile={dnaProfile} />

        {/* 4. Personal Intelligence Analytics Charts (Real Data + Honest Empty States) */}
        <IntelligenceCharts
          dailyGoalMinutes={dailyGoalMinutes}
          weeklyPractice={weeklyPractice}
          lessonCompletions={lessonCompletions}
          mistakeRecurrence={mistakeRecurrence}
          spacedRetention={spacedRetention}
        />

        {/* 5. Verified Gamification & Auditable XP History Ledger */}
        <VerifiedGamificationPanel
          xpLedger={xpLedger}
          lessonMastery={lessonMastery}
          speakingSessions={speakingSessions}
          mistakes={mistakes}
          transferAttempts={transferAttempts}
          compact
        />

        {/* 5. Academy Mastery & Spaced Review Ledger */}
        {practicedLessons.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white">
                {lang === 'bn'
                  ? 'একাডেমি মাস্টারি ও স্পেসড রিভিউ সূচি'
                  : 'Academy Mastery & Spaced Review Ledger'}
              </h2>
              <Link
                to="/app/learn"
                className="text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
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
                            className="font-semibold text-white hover:text-[#3B82F6]"
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
                        <td className="py-3 pr-4 font-mono font-semibold text-[#3B82F6] tabular-nums">
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
          </section>
        )}

        {/* 6. Speaking Studio & Communication Replay History */}
        {speakingSessions.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white">
                {lang === 'bn'
                  ? 'AI স্পিকিং স্টুডিও সেশন ইতিহাস'
                  : 'AI Speaking Studio Session Ledger'}
              </h2>
              <Link
                to="/app/speak"
                className="text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
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
          </section>
        )}

        {/* 7. Diagnostic Breakdown (only if diagnostic was taken) */}
        {latestDiagnostic && (
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white">
                {t.diagnostic.results.domainTitle}
              </h2>
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
                  className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4"
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
          </section>
        )}
      </div>
    </LearnerShell>
  );
}
