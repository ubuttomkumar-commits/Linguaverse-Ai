import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LanguageToggle } from '../common/LanguageToggle';

export function PublicHeader() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSectionLink = (hash: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/${hash}`);
      return;
    }
    const id = hash.replace('#', '');
    if (!id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const workspacePath = user
    ? !profile?.onboardingCompleted
      ? '/onboarding'
      : '/app'
    : '/register';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0A0F1C]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          onClick={() => handleSectionLink('')}
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6] text-xs font-bold text-white"
          >
            LV
          </span>
          <span>{t.brand}</span>
        </Link>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          <button
            type="button"
            onClick={() => handleSectionLink('')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.home}
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('#features')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.features}
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('#how-it-works')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.howItWorks}
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('#pricing')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.pricing}
          </button>
        </nav>

        {/* Zone 3: Language toggle + Auth / Primary CTA */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <LanguageToggle compact />
          {user ? (
            <Link
              to={workspacePath}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.openWorkspace}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {t.nav.login}
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
              >
                {t.nav.startLearning}
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2.5 md:hidden">
          <LanguageToggle compact />
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#111827] text-slate-200 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-800 bg-[#0A0F1C] px-4 py-4 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleSectionLink('')}
              className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-[#111827]"
            >
              {t.nav.home}
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('#features')}
              className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-[#111827]"
            >
              {t.nav.features}
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('#how-it-works')}
              className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-[#111827]"
            >
              {t.nav.howItWorks}
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('#pricing')}
              className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-[#111827]"
            >
              {t.nav.pricing}
            </button>
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3">
              {user ? (
                <Link
                  to={workspacePath}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {t.nav.openWorkspace}
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg border border-slate-700 px-4 py-2.5 text-center text-sm font-medium text-slate-200"
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    {t.nav.startLearning}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
