import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DiagnosticPage } from './pages/DiagnosticPage';
import { LearnerHomePage } from './pages/learner/LearnerHomePage';
import { AcademyPage } from './pages/learner/AcademyPage';
import { LessonPlayerPage } from './pages/learner/LessonPlayerPage';
import { SpeakStudioPage } from './pages/learner/SpeakStudioPage';
import { ImprovePage } from './pages/learner/ImprovePage';
import { ProgressPage } from './pages/learner/ProgressPage';
import { TransferLabPage } from './pages/learner/TransferLabPage';
import { SettingsPage } from './pages/learner/SettingsPage';
import { AdminControlCenterPage } from './pages/admin/AdminControlCenterPage';

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0F1C] text-sm text-slate-400">
      Loading LINGUAVERSE AI...
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
  const { isHydrating, user, profile } = useAuth();

  if (isHydrating) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (requireOnboarding && profile && !profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyAuth({ children }: { children: React.ReactNode }) {
  const { isHydrating, user, profile } = useAuth();

  if (isHydrating) return <LoadingScreen />;
  if (user) {
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
      <Route
        path="/login"
        element={
          <PublicOnlyAuth>
            <AuthPage mode="login" />
          </PublicOnlyAuth>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyAuth>
            <AuthPage mode="register" />
          </PublicOnlyAuth>
        }
      />

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
        path="/app/settings"
        element={
          <RequireAuth requireOnboarding>
            <SettingsPage />
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
      <Route path="/improve" element={<Navigate to="/app/improve" replace />} />
      <Route path="/progress" element={<Navigate to="/app/progress" replace />} />
      <Route path="/transfer-lab" element={<Navigate to="/app/transfer-lab" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
