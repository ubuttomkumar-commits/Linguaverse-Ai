import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LanguageProvider } from './i18n/LanguageContext';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import {
  fetchAdminAuthStatus,
  fetchAdminPortalMe,
  logoutAdminPortal,
  type AdminAuthStatusResponse,
  type AdminPortalUser,
} from './services/adminPortalApi';
import { notifyServiceWorkerLogout } from './utils/pwaRuntime';

const AuthenticatedAdminPortal = lazy(() =>
  import('./pages/admin/AuthenticatedAdminPortal').then((m) => ({
    default: m.AuthenticatedAdminPortal,
  }))
);

function SeparateAdminShell() {
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminPortalUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AdminAuthStatusResponse>({
    ok: true,
    hasAdminAccount: true,
    bootstrapAvailable: false,
    requiresBootstrapSecret: false,
  });

  const hydrateAdminPortal = useCallback(async () => {
    setLoading(true);
    setStatusError(null);
    try {
      const status = await fetchAdminAuthStatus();
      setAuthStatus(status);
      if (!status.hasAdminAccount) {
        setAdminUser(null);
      } else {
        try {
          const me = await fetchAdminPortalMe();
          setAdminUser(me.user);
        } catch {
          setAdminUser(null);
        }
      }
    } catch {
      setAdminUser(null);
      setStatusError(
        'Unable to reach the LINGUAVERSE AI API right now. Please check your network connection and retry.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateAdminPortal();
  }, [hydrateAdminPortal]);

  const handleSignOut = async () => {
    await logoutAdminPortal();
    notifyServiceWorkerLogout();
    setAdminUser(null);
    const status = await fetchAdminAuthStatus();
    setAuthStatus(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05091F] text-slate-200 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#0B122C] px-6 py-4 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#00D9FF]" aria-hidden="true" />
          <span>Verifying Administrator Session...</span>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <>
        {statusError && (
          <div
            role="alert"
            className="border-b border-amber-500/35 bg-amber-950/50 px-4 py-3 text-center text-xs text-amber-100"
          >
            <span>{statusError}</span>{' '}
            <button
              type="button"
              onClick={() => void hydrateAdminPortal()}
              className="ml-2 underline font-semibold text-cyan-300 hover:text-white cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}
        <AdminLoginPage
          authStatus={authStatus}
          onAuthenticated={(user) => {
            setStatusError(null);
            setAdminUser(user);
            setAuthStatus((prev) => ({
              ...prev,
              hasAdminAccount: true,
              bootstrapAvailable: false,
            }));
          }}
          onRefreshStatus={async () => {
            const status = await fetchAdminAuthStatus();
            setStatusError(null);
            setAuthStatus(status);
          }}
        />
      </>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05091F] text-slate-200 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#0B122C] px-6 py-4 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#00D9FF]" aria-hidden="true" />
            <span>Loading Admin Control Center...</span>
          </div>
        </div>
      }
    >
      <AuthenticatedAdminPortal adminUser={adminUser} onSignOut={handleSignOut} />
    </Suspense>
  );
}

export default function AdminApp() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <SeparateAdminShell />
      </BrowserRouter>
    </LanguageProvider>
  );
}
