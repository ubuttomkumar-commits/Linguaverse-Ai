import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CmsProvider } from './context/CmsContext';
import { LandingPage } from './pages/LandingPage';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { WorkspaceRouteSkeleton } from './components/common/WorkspaceSkeleton';
import { registerRouteChunkLoaders } from './utils/routePrefetch';

const routeChunkLoaders = {
  '/login': () => import('./pages/AuthPage'),
  '/register': () => import('./pages/AuthPage'),
  '/verify-email': () => import('./pages/VerifyEmailPage'),
  '/forgot-password': () => import('./pages/ForgotPasswordPage'),
  '/reset-password': () => import('./pages/ResetPasswordPage'),
  '/auth/success': () => import('./pages/AuthSuccessPage'),
  '/onboarding': () => import('./pages/OnboardingPage'),
  '/diagnostic': () => import('./pages/DiagnosticPage'),
  '/app': () => import('./pages/learner/LearnerHomePage'),
  '/app/learn': () => import('./pages/learner/AcademyPage'),
  '/app/learn/course': () => import('./pages/learner/CourseDetailPage'),
  '/app/learn/lesson': () => import('./pages/learner/LessonPlayerPage'),
  '/app/speak': () => import('./pages/learner/SpeakStudioPage'),
  '/app/improve': () => import('./pages/learner/ImprovePage'),
  '/app/progress': () => import('./pages/learner/ProgressPage'),
  '/app/transfer-lab': () => import('./pages/learner/TransferLabPage'),
  '/app/replay': () => import('./pages/learner/CommunicationReplayPage'),
  '/app/vocabulary': () => import('./pages/learner/VocabularyPage'),
  '/app/community': () => import('./pages/learner/CommunityPage'),
  '/app/achievements': () => import('./pages/learner/AchievementsPage'),
  '/app/subscription': () => import('./pages/learner/SubscriptionPage'),
  '/app/settings': () => import('./pages/learner/SettingsPage'),
  '/app/ielts': () => import('./pages/learner/IeltsPrepPage'),
  '/app/writing': () => import('./pages/learner/WritingAndLabsPage'),
  '/admin': () => import('./pages/admin/AdminControlCenterPage'),
} as const;

registerRouteChunkLoaders(routeChunkLoaders);

const AuthPage = lazy(() => routeChunkLoaders['/login']().then((m) => ({ default: m.AuthPage })));
const VerifyEmailPage = lazy(() =>
  routeChunkLoaders['/verify-email']().then((m) => ({ default: m.VerifyEmailPage }))
);
const ForgotPasswordPage = lazy(() =>
  routeChunkLoaders['/forgot-password']().then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  routeChunkLoaders['/reset-password']().then((m) => ({ default: m.ResetPasswordPage }))
);
const AuthSuccessPage = lazy(() =>
  routeChunkLoaders['/auth/success']().then((m) => ({ default: m.AuthSuccessPage }))
);
const OnboardingPage = lazy(() =>
  routeChunkLoaders['/onboarding']().then((m) => ({ default: m.OnboardingPage }))
);
const DiagnosticPage = lazy(() =>
  routeChunkLoaders['/diagnostic']().then((m) => ({ default: m.DiagnosticPage }))
);
const LearnerHomePage = lazy(() =>
  routeChunkLoaders['/app']().then((m) => ({ default: m.LearnerHomePage }))
);
const AcademyPage = lazy(() =>
  routeChunkLoaders['/app/learn']().then((m) => ({ default: m.AcademyPage }))
);
const CourseDetailPage = lazy(() =>
  routeChunkLoaders['/app/learn/course']().then((m) => ({ default: m.CourseDetailPage }))
);
const LessonPlayerPage = lazy(() =>
  routeChunkLoaders['/app/learn/lesson']().then((m) => ({ default: m.LessonPlayerPage }))
);
const SpeakStudioPage = lazy(() =>
  routeChunkLoaders['/app/speak']().then((m) => ({ default: m.SpeakStudioPage }))
);
const ImprovePage = lazy(() =>
  routeChunkLoaders['/app/improve']().then((m) => ({ default: m.ImprovePage }))
);
const ProgressPage = lazy(() =>
  routeChunkLoaders['/app/progress']().then((m) => ({ default: m.ProgressPage }))
);
const TransferLabPage = lazy(() =>
  routeChunkLoaders['/app/transfer-lab']().then((m) => ({ default: m.TransferLabPage }))
);
const CommunicationReplayPage = lazy(() =>
  routeChunkLoaders['/app/replay']().then((m) => ({
    default: m.CommunicationReplayPage,
  }))
);
const VocabularyPage = lazy(() =>
  routeChunkLoaders['/app/vocabulary']().then((m) => ({ default: m.VocabularyPage }))
);
const CommunityPage = lazy(() =>
  routeChunkLoaders['/app/community']().then((m) => ({ default: m.CommunityPage }))
);
const AchievementsPage = lazy(() =>
  routeChunkLoaders['/app/achievements']().then((m) => ({ default: m.AchievementsPage }))
);
const SubscriptionPage = lazy(() =>
  routeChunkLoaders['/app/subscription']().then((m) => ({ default: m.SubscriptionPage }))
);
const SettingsPage = lazy(() =>
  routeChunkLoaders['/app/settings']().then((m) => ({ default: m.SettingsPage }))
);
const IeltsPrepPage = lazy(() =>
  routeChunkLoaders['/app/ielts']().then((m) => ({ default: m.IeltsPrepPage }))
);
const WritingAndLabsPage = lazy(() =>
  routeChunkLoaders['/app/writing']().then((m) => ({ default: m.WritingAndLabsPage }))
);
const AdminControlCenterPage = lazy(() =>
  routeChunkLoaders['/admin']().then((m) => ({
    default: m.AdminControlCenterPage,
  }))
);

function LoadingScreen() {
  return <WorkspaceRouteSkeleton />;
}

function RequireAuth({
  children,
  requireOnboarding = false,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}) {
  const { isHydrating, hydrationError, retryHydration, user, profile } = useAuth();

  if (isHydrating) return <LoadingScreen />;
  if (hydrationError && !user) {
    return (
      <div
        role="alert"
        className="flex min-h-screen items-center justify-center bg-[#05091F] px-4 text-slate-200"
      >
        <div className="lv-portal-panel w-full max-w-md rounded-2xl p-6 text-center">
          <h1 className="font-portal text-lg font-bold text-white">
            Unable to load your workspace
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{hydrationError}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void retryHydration()}
              className="lv-portal-btn rounded-xl px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              Retry
            </button>
            <a
              href="/login"
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified === false) {
    return <Navigate to="/verify-email" replace />;
  }
  if (requireOnboarding && profile && !profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyAuth({ children }: { children: React.ReactNode }) {
  const { isHydrating, user, profile } = useAuth();

  if (isHydrating) return <LoadingScreen />;
  if (user) {
    if (user.emailVerified === false) {
      return <Navigate to="/verify-email" replace />;
    }
    if (profile && !profile.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyAuth>
            <ForgotPasswordPage />
          </PublicOnlyAuth>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/success" element={<AuthSuccessPage />} />

      {/* Authenticated Onboarding & Diagnostic */}
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/diagnostic"
        element={
          <RequireAuth requireOnboarding>
            <DiagnosticPage />
          </RequireAuth>
        }
      />

      {/* Authenticated Learner Workspace (All 7 Navigation Routes + Lesson Player) */}
      <Route
        path="/app"
        element={
          <RequireAuth requireOnboarding>
            <LearnerHomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/learn"
        element={
          <RequireAuth requireOnboarding>
            <AcademyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/learn/course/:courseId"
        element={
          <RequireAuth requireOnboarding>
            <CourseDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/learn/:lessonId"
        element={
          <RequireAuth requireOnboarding>
            <LessonPlayerPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/speak"
        element={
          <RequireAuth requireOnboarding>
            <SpeakStudioPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/improve"
        element={
          <RequireAuth requireOnboarding>
            <ImprovePage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/progress"
        element={
          <RequireAuth requireOnboarding>
            <ProgressPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/transfer-lab"
        element={
          <RequireAuth requireOnboarding>
            <TransferLabPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/replay"
        element={
          <RequireAuth requireOnboarding>
            <CommunicationReplayPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/vocabulary"
        element={
          <RequireAuth requireOnboarding>
            <VocabularyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/community"
        element={
          <RequireAuth requireOnboarding>
            <CommunityPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/achievements"
        element={
          <RequireAuth requireOnboarding>
            <AchievementsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/subscription"
        element={
          <RequireAuth requireOnboarding>
            <SubscriptionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/settings"
        element={
          <RequireAuth requireOnboarding>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/ielts"
        element={
          <RequireAuth requireOnboarding>
            <IeltsPrepPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/writing"
        element={
          <RequireAuth requireOnboarding>
            <WritingAndLabsPage />
          </RequireAuth>
        }
      />

      {/* Protected Admin Control Center */}
      <Route
        path="/admin"
        element={
          <RequireAuth requireOnboarding>
            <AdminControlCenterPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/admin"
        element={
          <RequireAuth requireOnboarding>
            <AdminControlCenterPage />
          </RequireAuth>
        }
      />

      {/* Convenience route aliases */}
      <Route path="/academy" element={<Navigate to="/app/learn" replace />} />
      <Route path="/assessment" element={<Navigate to="/diagnostic" replace />} />
      <Route path="/improve" element={<Navigate to="/app/improve" replace />} />
      <Route path="/progress" element={<Navigate to="/app/progress" replace />} />
      <Route path="/transfer-lab" element={<Navigate to="/app/transfer-lab" replace />} />
      <Route path="/replay" element={<Navigate to="/app/replay" replace />} />
      <Route path="/vocabulary" element={<Navigate to="/app/vocabulary" replace />} />
      <Route path="/community" element={<Navigate to="/app/community" replace />} />
      <Route path="/achievements" element={<Navigate to="/app/achievements" replace />} />
      <Route path="/subscription" element={<Navigate to="/app/subscription" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
      <Route path="/ielts" element={<Navigate to="/app/ielts" replace />} />
      <Route path="/writing" element={<Navigate to="/app/writing" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <CmsProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <OfflineIndicator />
          </BrowserRouter>
        </AuthProvider>
      </CmsProvider>
    </LanguageProvider>
  );
}
