import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CmsProvider } from './context/CmsContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AuthSuccessPage } from './pages/AuthSuccessPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DiagnosticPage } from './pages/DiagnosticPage';
import { LearnerHomePage } from './pages/learner/LearnerHomePage';
import { AcademyPage } from './pages/learner/AcademyPage';
import { CourseDetailPage } from './pages/learner/CourseDetailPage';
import { LessonPlayerPage } from './pages/learner/LessonPlayerPage';
import { SpeakStudioPage } from './pages/learner/SpeakStudioPage';
import { ImprovePage } from './pages/learner/ImprovePage';
import { ProgressPage } from './pages/learner/ProgressPage';
import { TransferLabPage } from './pages/learner/TransferLabPage';
import { CommunicationReplayPage } from './pages/learner/CommunicationReplayPage';
import { VocabularyPage } from './pages/learner/VocabularyPage';
import { CommunityPage } from './pages/learner/CommunityPage';
import { AchievementsPage } from './pages/learner/AchievementsPage';
import { SubscriptionPage } from './pages/learner/SubscriptionPage';
import { SettingsPage } from './pages/learner/SettingsPage';
import { IeltsPrepPage } from './pages/learner/IeltsPrepPage';
import { WritingAndLabsPage } from './pages/learner/WritingAndLabsPage';
import { AdminControlCenterPage } from './pages/admin/AdminControlCenterPage';
import { OfflineIndicator } from './components/common/OfflineIndicator';

function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05091F] text-sm text-slate-300"
    >
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-violet-500/25" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#00D9FF] border-r-[#7C3AED]" />
      </div>
      <p className="font-portal text-sm font-medium tracking-wide text-slate-300">
        Loading LINGUAVERSE AI...
      </p>
    </div>
  );
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
