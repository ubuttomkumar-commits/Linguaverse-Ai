import React, { useState } from 'react';
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { AuthProvider } from '../../context/AuthContext';
import { CmsProvider } from '../../context/CmsContext';
import { AdminControlCenterPage } from './AdminControlCenterPage';
import { ADMIN_ROLE_LABELS } from '../../domain/adminGovernanceEngine';
import type { AdminPortalUser } from '../../services/adminPortalApi';

interface AuthenticatedAdminPortalProps {
  adminUser: AdminPortalUser;
  onSignOut: () => Promise<void>;
}

export function AuthenticatedAdminPortal({
  adminUser,
  onSignOut,
}: AuthenticatedAdminPortalProps) {
  const { lang, setLang } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <CmsProvider skipDocumentSeo>
      <AuthProvider>
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

          <main
            id="admin-main-content"
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
          >
            <AdminControlCenterPage standaloneAdmin={adminUser} />
          </main>
        </div>
      </AuthProvider>
    </CmsProvider>
  );
}
