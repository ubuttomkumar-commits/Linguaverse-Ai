import { useCallback, useEffect, useMemo, useState } from 'react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { WorkspaceErrorBoundary } from '../../components/common/WorkspaceErrorBoundary';
import { LvIntelligenceCoreHero } from '../../components/dashboard/LvIntelligenceCoreHero';
import { TodayCommandWidget } from '../../components/dashboard/TodayCommandWidget';
import { CommunicationDnaWidget } from '../../components/dashboard/CommunicationDnaWidget';
import { CommunicationLoopWidget } from '../../components/dashboard/CommunicationLoopWidget';
import {
  AcademyPathWidget,
  CommunityAndAchievementsRow,
  MistakeMemoryPreviewWidget,
  NextBestMoveWidget,
  ProgressAnalyticsPreviewWidget,
  SpeakingStudioPreviewWidget,
  TransferLabPreviewWidget,
  VocabularySpacedPreviewWidget,
} from '../../components/dashboard/DashboardModulePreviews';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAllCourses, getAllLessons } from '../../domain/curriculumData';
import {
  buildAcademyPathPreview,
  buildCommunicationLoopStages,
  buildDashboardWeeklyAnalytics,
  computeDashboardNextBestMoves,
  computeTodayLearningSummary,
  resolvePrimaryContinueTarget,
} from '../../domain/dashboardIntelligence';
import { computeVerifiedAchievements } from '../../domain/gamificationEngine';
import { buildSpacedRetentionSeries } from '../../domain/personalIntelligenceEngine';
import { classifyMistakeCategory } from '../../domain/mistakeMemoryEngine';
import { TRANSFER_SCENARIOS } from '../../domain/transferLabEngine';
import {
  getNativeLanguageByCode,
  getTargetLanguageByCode,
} from '../../domain/onboardingCatalog';
import { fetchSpeakingHealth, type SpeakingHealthResponse } from '../../services/speakingApi';

export function LearnerHomePage() {
  const { lang } = useLanguage();
  const {
    user,
    profile,
    latestDiagnostic,
    mistakes,
    lessonMastery,
    lessonAttempts,
    exerciseAttempts,
    speakingSessions,
    mistakeDrillAttempts,
    transferAttempts,
    xpLedger,
    activitySummary,
    totalVerifiedXp,
  } = useAuth();

  const [speakingHealth, setSpeakingHealth] = useState<SpeakingHealthResponse | null>(null);
  const [speakingHealthError, setSpeakingHealthError] = useState(false);

  const loadSpeakingHealth = useCallback(() => {
    setSpeakingHealth(null);
    setSpeakingHealthError(false);
    return fetchSpeakingHealth()
      .then((res) => {
        setSpeakingHealth(res);
      })
      .catch(() => {
        setSpeakingHealth(null);
        setSpeakingHealthError(true);
      });
  }, []);

  useEffect(() => {
    let active = true;
    fetchSpeakingHealth()
      .then((res) => {
        if (active) {
          setSpeakingHealth(res);
          setSpeakingHealthError(false);
        }
      })
      .catch(() => {
        if (active) {
          setSpeakingHealth(null);
          setSpeakingHealthError(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const allCourses = useMemo(() => getAllCourses(), []);
  const allLessons = useMemo(() => getAllLessons(), []);

  const nativeLangOpt = getNativeLanguageByCode(profile?.nativeLanguage);
  const targetLangOpt = getTargetLanguageByCode(profile?.targetLanguage);
  const languagePairLabel = `${nativeLangOpt.nativeName} → ${targetLangOpt.englishName}`;

  const todaySummary = useMemo(
    () =>
      computeTodayLearningSummary({
        profile,
        latestDiagnostic,
        lessonAttempts,
        exerciseAttempts,
        speakingSessions,
        mistakeDrillAttempts,
        transferAttempts,
        mistakes,
        activeStreakDays: activitySummary.activeStreakDays,
      }),
    [
      profile,
      latestDiagnostic,
      lessonAttempts,
      exerciseAttempts,
      speakingSessions,
      mistakeDrillAttempts,
      transferAttempts,
      mistakes,
      activitySummary.activeStreakDays,
    ]
  );

  const continueTarget = useMemo(
    () =>
      resolvePrimaryContinueTarget({
        latestDiagnostic,
        lessonMastery,
        allLessons,
        mistakes,
      }),
    [latestDiagnostic, lessonMastery, allLessons, mistakes]
  );

  const { primaryMove, secondaryMoves, dnaProfile } = useMemo(
    () =>
      computeDashboardNextBestMoves({
        latestDiagnostic,
        mistakes,
        lessonMastery,
        lessonAttempts,
        exerciseAttempts,
        speakingSessions,
        mistakeDrillAttempts,
        allLessons,
      }),
    [
      latestDiagnostic,
      mistakes,
      lessonMastery,
      lessonAttempts,
      exerciseAttempts,
      speakingSessions,
      mistakeDrillAttempts,
      allLessons,
    ]
  );

  const academyPath = useMemo(
    () =>
      buildAcademyPathPreview({
        courses: allCourses,
        lessonMastery,
        recommendedFirstLessonId:
          latestDiagnostic?.fiveSkillSummary?.personalizedPath?.recommendedFirstLessonId ?? null,
      }),
    [allCourses, lessonMastery, latestDiagnostic]
  );

  const spacedRetention = useMemo(
    () => buildSpacedRetentionSeries(lessonMastery, mistakes),
    [lessonMastery, mistakes]
  );

  const vocabMistakesCount = useMemo(
    () =>
      mistakes.filter(
        (m) =>
          !m.falseCorrectionReported &&
          m.status !== 'resolved' &&
          classifyMistakeCategory(m.category, m.domain) === 'vocabulary'
      ).length,
    [mistakes]
  );

  const weeklyAnalytics = useMemo(
    () =>
      buildDashboardWeeklyAnalytics({
        lessonAttempts,
        speakingSessions,
        mistakeDrillAttempts,
        transferAttempts,
      }),
    [lessonAttempts, speakingSessions, mistakeDrillAttempts, transferAttempts]
  );

  const verifiedAchievements = useMemo(
    () =>
      computeVerifiedAchievements({
        xpLedger,
        lessonMastery,
        speakingSessions,
        mistakes,
        transferAttempts,
      }),
    [xpLedger, lessonMastery, speakingSessions, mistakes, transferAttempts]
  );

  const communicationLoopStages = useMemo(
    () =>
      buildCommunicationLoopStages({
        latestDiagnostic,
        mistakes,
        lessonMastery,
        speakingSessions,
        transferAttempts,
        mistakeDrillAttempts,
        dnaMeasuredCount: dnaProfile.measuredCount,
      }),
    [
      latestDiagnostic,
      mistakes,
      lessonMastery,
      speakingSessions,
      transferAttempts,
      mistakeDrillAttempts,
      dnaProfile.measuredCount,
    ]
  );

  const assessedSkillCount =
    latestDiagnostic?.fiveSkillSummary?.assessedSkillCount ?? dnaProfile.measuredCount;

  const hasAnyActivity =
    Boolean(latestDiagnostic) ||
    activitySummary.completedLessons > 0 ||
    activitySummary.completedSpeakingSessions > 0 ||
    activitySummary.completedTransferDrills > 0;

  return (
    <LearnerShell title={lang === 'bn' ? 'কমান্ড সেন্টার' : 'Dashboard'}>
      <WorkspaceErrorBoundary lang={lang}>
        <div className="space-y-6">
        {/* 1. Signature Hero — LV Intelligence Core */}
        <LvIntelligenceCoreHero
          userName={user?.name ?? ''}
          lang={lang}
          languagePairLabel={languagePairLabel}
          dailyGoalMinutes={todaySummary.dailyGoalMinutes}
          assessedSkillCount={assessedSkillCount}
          totalSkillsCount={5}
          continueTarget={continueTarget}
        />

        {/* 2. Today's Learning Command + Personalized Next Best Move */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-6">
            <TodayCommandWidget summary={todaySummary} lang={lang} />
          </div>
          <div className="xl:col-span-6">
            <NextBestMoveWidget
              primaryMove={primaryMove}
              secondaryMoves={secondaryMoves}
              lang={lang}
            />
          </div>
        </div>

        {/* 3. Communication DNA — Personal Intelligence Profile */}
        <CommunicationDnaWidget
          profile={profile}
          latestDiagnostic={latestDiagnostic}
          dnaProfile={dnaProfile}
          lang={lang}
        />

        {/* 3b. 8-Step Communication Improvement Loop */}
        <CommunicationLoopWidget stages={communicationLoopStages} lang={lang} />

        {/* 4. Learning Path & Academy Preview */}
        <AcademyPathWidget
          items={academyPath.items}
          completedCount={academyPath.completedCount}
          totalCount={academyPath.totalCount}
          currentCourseTitleEn={academyPath.currentCourseTitleEn}
          currentCourseTitleBn={academyPath.currentCourseTitleBn}
          lang={lang}
        />

        {/* 5. Mistake Memory + Speaking Studio Previews */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <MistakeMemoryPreviewWidget
              mistakes={mistakes}
              explanationLanguage={profile?.explanationLanguage ?? 'both'}
              hasAnyActivity={hasAnyActivity}
              lang={lang}
            />
          </div>
          <div className="lg:col-span-5">
            <SpeakingStudioPreviewWidget
              speakingSessions={speakingSessions}
              speakingHealth={speakingHealth}
              speakingHealthError={speakingHealthError}
              onRetrySpeakingHealth={() => void loadSpeakingHealth()}
              lang={lang}
            />
          </div>
        </div>

        {/* 6. Transfer Lab Preview */}
        <TransferLabPreviewWidget
          scenarios={TRANSFER_SCENARIOS}
          completedTransfersCount={activitySummary.completedTransferDrills}
          lang={lang}
        />

        {/* 7. Progress & Analytics + Vocabulary & Spaced Repetition */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ProgressAnalyticsPreviewWidget analytics={weeklyAnalytics} lang={lang} />
          </div>
          <div className="lg:col-span-5">
            <VocabularySpacedPreviewWidget
              dueReviewsCount={spacedRetention.dueNowCount}
              vocabMistakesCount={vocabMistakesCount}
              lang={lang}
            />
          </div>
        </div>

        {/* 8. Compact Achievements & Community (Honest States) */}
        <CommunityAndAchievementsRow
          totalVerifiedXp={totalVerifiedXp}
          achievements={verifiedAchievements}
          lang={lang}
        />
        </div>
      </WorkspaceErrorBoundary>
    </LearnerShell>
  );
}
