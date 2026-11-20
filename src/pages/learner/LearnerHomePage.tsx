import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAllLessons } from '../../domain/curriculumData';
import type { MistakeSource } from '../../types/domain';

function formatSourceLabel(source: MistakeSource, lang: 'en' | 'bn'): string {
  const labels: Record<MistakeSource, { en: string; bn: string }> = {
    diagnostic: { en: 'Diagnostic', bn: 'ডায়াগনস্টিক' },
    lesson_guided: { en: 'Lesson · Guided', bn: 'লেসন · নির্দেশিত' },
    lesson_independent: { en: 'Lesson · Independent', bn: 'লেসন · স্বাধীন' },
    lesson_assessment: { en: 'Lesson · Assessment', bn: 'লেসন · মূল্যায়ন' },
    speaking_studio: { en: 'AI Speaking Studio', bn: 'AI স্পিকিং স্টুডিও' },
  };
  return lang === 'bn' ? labels[source].bn : labels[source].en;
}

export function LearnerHomePage() {
  const { lang, t } = useLanguage();
  const { user, profile, latestDiagnostic, mistakes, activitySummary, totalVerifiedXp } =
    useAuth();
  const totalCurriculumLessons = getAllLessons().length;
  const activeMistakes = mistakes.filter(
    (m) => !m.falseCorrectionReported && m.status !== 'resolved'
  );

  const goalLabel = profile
    ? t.onboarding.steps.goal.options[profile.primaryGoal].label
    : '—';

  const explanationLabel =
    profile?.explanationLanguage === 'bn'
      ? t.onboarding.steps.expLang.bnLabel
      : profile?.explanationLanguage === 'en'
        ? t.onboarding.steps.expLang.enLabel
        : t.onboarding.steps.expLang.bothLabel;

  return (
    <LearnerShell title={t.learnerNav.home}>
      {/* Personalized Greeting & Honest Ledger Notice */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {t.workspace.welcome}, {user?.name ?? ''}
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400">
            {t.workspace.noFakeDataNotice}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start shrink-0">
          <Link
            to="/app/transfer-lab"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#111827] px-4 py-2.5 text-sm font-semibold text-slate-100 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'ট্রান্সফার ল্যাব' : 'Transfer Lab'}</span>
          </Link>
          <Link
            to="/app/speak"
            className="inline-flex items-center gap-2 rounded-lg border border-[#8B5CF6]/50 bg-[#8B5CF6]/15 px-4 py-2.5 text-sm font-semibold text-violet-100 hover:bg-[#8B5CF6]/25 transition-colors whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'স্পিকিং স্টুডিও' : 'Speaking Studio'}</span>
          </Link>
          <Link
            to="/app/learn"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'একাডেমি খুলুন' : 'Open The Academy'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Honest Evidence Ledger Strip (Zero fake streaks/XP) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
          <p className="text-xs text-slate-400">{t.workspace.stats.diagnosticBaseline}</p>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {latestDiagnostic
              ? `${latestDiagnostic.totalCorrect}/${latestDiagnostic.totalQuestions}`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {latestDiagnostic
              ? lang === 'bn'
                ? `${latestDiagnostic.confidenceCoveragePercent}% কভারেজ`
                : `${latestDiagnostic.confidenceCoveragePercent}% coverage`
              : t.workspace.stats.notTaken}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
          <p className="text-xs text-slate-400">{t.workspace.stats.activeMistakes}</p>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {activeMistakes.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'en' && activeMistakes.length === 1 ? 'pattern' : t.workspace.stats.patterns}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'সম্পন্ন লেসন' : 'Academy Lessons'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
            {activitySummary.completedLessons}/{totalCurriculumLessons}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t.workspace.stats.completed}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 sm:p-5">
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'যাচাইকৃত XP · ধারা' : 'Verified XP · Streak'}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold text-[#F59E0B] tabular-nums">
            {totalVerifiedXp} XP
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activitySummary.activeStreakDays}{' '}
            {lang === 'en' && activitySummary.activeStreakDays === 1
              ? 'day streak'
              : lang === 'en'
                ? 'days streak'
                : 'দিন সক্রিয়'}
          </p>
        </div>
      </div>

      {/* Main 2-column Evidence & Profile Layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Diagnostic Baseline Card */}
        <section className="rounded-xl border border-slate-800 bg-[#111827] p-6 lg:col-span-7">
          {!latestDiagnostic ? (
            <div>
              <p className="text-xs font-semibold text-[#F59E0B]">
                {t.diagnostic.kicker}
              </p>
              <h2 className="mt-2 text-xl font-bold text-white">
                {t.workspace.home.startDiagnosticTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t.workspace.home.startDiagnosticDesc}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/diagnostic"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors"
                >
                  <span>{t.workspace.home.startDiagnosticBtn}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/app/learn"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
                >
                  <span>{lang === 'bn' ? 'সরাসরি লেসন শুরু করুন' : 'Browse Curriculum'}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-white">
                  {t.workspace.home.diagnosticCardTitle}
                </h2>
                <Link
                  to="/diagnostic"
                  className="text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
                >
                  {t.workspace.home.retakeDiagnosticBtn}
                </Link>
              </div>

              <p className="mt-3 text-lg font-semibold text-[#3B82F6]">
                {lang === 'bn'
                  ? latestDiagnostic.estimatedStartingBandBn
                  : latestDiagnostic.estimatedStartingBand}
              </p>
              <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                {lang === 'bn'
                  ? latestDiagnostic.calibrationNoteBn
                  : latestDiagnostic.calibrationNoteEn}
              </p>

              <p className="mt-3 flex items-start gap-2 text-xs text-[#F59E0B]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? latestDiagnostic.confidenceLabelBn
                    : latestDiagnostic.confidenceLabelEn}
                </span>
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-800 pt-5 sm:grid-cols-4">
                {latestDiagnostic.domainBreakdown.map((item) => (
                  <div key={item.domain} className="flex flex-col justify-between gap-1.5">
                    <p className="text-xs leading-snug text-slate-400">
                      {t.diagnostic.domains[item.domain]}
                    </p>
                    <p className="font-mono text-base font-bold text-white tabular-nums">
                      {item.correct}/{item.total}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Learner Profile Summary */}
        <section className="rounded-xl border border-slate-800 bg-[#111827] p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white">
              {t.workspace.home.profileSummaryTitle}
            </h2>
            <Link
              to="/app/settings"
              className="text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
            >
              {t.workspace.home.editPreferences}
            </Link>
          </div>

          <dl className="mt-4 divide-y divide-slate-800 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-slate-400">{t.workspace.home.goalLabel}</dt>
              <dd className="text-right font-medium text-white">{goalLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-slate-400">{t.workspace.home.dailyTargetLabel}</dt>
              <dd className="font-mono font-medium text-white tabular-nums">
                {profile?.dailyTimeGoalMinutes ?? 15} {t.onboarding.steps.dailyTime.minutesLabel}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-slate-400">{t.workspace.home.selfLevelLabel}</dt>
              <dd className="font-mono font-medium text-white">
                {profile?.selfEstimatedLevel ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-slate-400">{t.workspace.home.explanationPrefLabel}</dt>
              <dd className="text-right font-medium text-slate-200">{explanationLabel}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Mistake Memory Starter Queue */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white">
            {t.workspace.home.recentMistakesTitle}
          </h2>
          <Link
            to="/app/improve"
            className="text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
          >
            {t.workspace.home.viewAllMistakes}
          </Link>
        </div>

        {activeMistakes.length === 0 ? (
          <div className="mt-4 flex items-start gap-2.5 text-sm leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <p>
              {latestDiagnostic ||
              activitySummary.completedLessons > 0 ||
              activitySummary.completedSpeakingSessions > 0
                ? t.workspace.home.noMistakesPerfect
                : t.workspace.home.noMistakesUntaken}
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-800">
            {activeMistakes.slice(0, 5).map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#8B5CF6]">{item.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400 tabular-nums">
                      {formatSourceLabel(item.source, lang)} · {item.occurrences}x
                    </span>
                    <Link
                      to={`/app/improve?focus=${encodeURIComponent(item.id)}`}
                      className="font-semibold text-[#3B82F6] hover:text-blue-400 whitespace-nowrap"
                    >
                      {lang === 'bn' ? 'ড্রিল করুন' : 'Fix'}
                    </Link>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-200">
                  <span className="text-rose-300 line-through">{item.userExample}</span>
                  <span aria-hidden="true" className="mx-2 text-slate-500">
                    →
                  </span>
                  <span className="font-semibold text-emerald-300">{item.correctedExample}</span>
                </p>
                <p className="font-bn mt-1.5 text-xs leading-relaxed text-slate-400">
                  {profile?.explanationLanguage === 'en' ? item.explanationEn : item.explanationBn}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </LearnerShell>
  );
}

