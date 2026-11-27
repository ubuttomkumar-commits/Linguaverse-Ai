import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import {
  ExternalLink,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { CmsProvider } from './context/CmsContext';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminControlCenterPage } from './pages/admin/AdminControlCenterPage';
import {
  fetchAdminAuthStatus,
  fetchAdminPortalMe,
  logoutAdminPortal,
  type AdminAuthStatusResponse,
  type AdminPortalUser,
} from './services/adminPortalApi';
import { ADMIN_ROLE_LABELS } from './domain/adminGovernanceEngine';
import { notifyServiceWorkerLogout } from './utils/pwaRuntime';

function SeparateAdminShell() {
  const { lang, setLang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminPortalUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AdminAuthStatusResponse>({
    ok: true,
    hasAdminAccount: true,
    bootstrapAvailable: false,
    requiresBootstrapSecret: false,
  });
  const [signingOut, setSigningOut] = useState(false);

  const hydrateAdminPortal = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateAdminPortal();
  }, [hydrateAdminPortal]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logoutAdminPortal();
      notifyServiceWorkerLogout();
      setAdminUser(null);
      const status = await fetchAdminAuthStatus();
      setAuthStatus(status);
    } finally {
      setSigningOut(false);
    }
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
      <AdminLoginPage
        authStatus={authStatus}
        onAuthenticated={(user) => {
          setAdminUser(user);
          setAuthStatus((prev) => ({
            ...prev,
            hasAdminAccount: true,
            bootstrapAvailable: false,
          }));
        }}
        onRefreshStatus={async () => {
          const status = await fetchAdminAuthStatus();
          setAuthStatus(status);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#05091F] text-slate-100 flex flex-col">
      {/* Dedicated Standalone Admin Portal Header (Zero Learner Chrome) */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#070D24]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#6366F1] text-white shadow-lg shadow-blue-950/50">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  LINGUAVERSE AI
                </span>
                <span className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-cyan-300">
                  Admin App
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {adminUser.email} ·{' '}
                <span className="font-mono text-slate-200">
                  {lang === 'bn'
                    ? ADMIN_ROLE_LABELS[adminUser.role].bn
                    : ADMIN_ROLE_LABELS[adminUser.role].en}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 cursor-pointer"
            >
              {lang === 'en' ? 'বাংলা' : 'English'}
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B122C] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
            >
              <span>{lang === 'bn' ? 'লার্নার অ্যাপ' : 'User App'}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/35 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/45 disabled:opacity-60 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'সাইন আউট' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="admin-main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AdminControlCenterPage standaloneAdmin={adminUser} />
      </main>
    </div>
  );
}

export default function AdminApp() {
  return (
    <LanguageProvider>
      <CmsProvider skipDocumentSeo>
        <AuthProvider>
          <BrowserRouter>
            <SeparateAdminShell />
          </BrowserRouter>
        </AuthProvider>
      </CmsProvider>
    </LanguageProvider>
  );
}
