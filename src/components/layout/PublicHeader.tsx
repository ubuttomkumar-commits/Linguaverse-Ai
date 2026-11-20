import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { LANDING_COPY } from '../../domain/landingContent';

export function PublicHeader() {
  const { lang } = useLanguage();
  const copy = LANDING_COPY[lang];
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

  const navItems = [
    { hash: '#why-it-works', label: copy.nav.whyItWorks },
    { hash: '#live-demo', label: copy.nav.liveDemo },
    { hash: '#how-it-works', label: copy.nav.loop },
    { hash: '#support', label: copy.nav.support },
    { hash: '#pricing', label: copy.nav.pricing },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050914]/82 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          onClick={() => handleSectionLink('')}
          className="font-display flex items-center gap-2.5 text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] text-xs font-extrabold text-white shadow-[0_0_16px_rgba(59,130,246,0.35)]"
          >
            LV
          </span>
          <span>LINGUAVERSE AI</span>
        </Link>

        {/* Zone 2: 5 Clean Single-Line Anchor Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          {navItems.map((item) => (
            <a
              key={item.hash}
              href={item.hash}
              onClick={(e) => {
                e.preventDefault();
                handleSectionLink(item.hash);
              }}
              className="relative py-1 hover:text-white transition-colors whitespace-nowrap shrink-0 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#3B82F6] after:transition-all hover:after:w-full"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Language Switcher + Login + Primary CTA */}
        <div className="hidden md:flex items-center gap-3.5 shrink-0">
          <LanguageToggle compact />
          {user ? (
            <Link
              to={workspacePath}
              className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
            >
              {copy.nav.openWorkspace}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-2 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                {copy.nav.login}
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
              >
                {copy.nav.startFree}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-2.5 md:hidden">
          <LanguageToggle compact />
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[#0E1526] text-slate-200 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-white/[0.08] bg-[#050914]/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.hash}
                href={item.hash}
                onClick={(e) => {
                  e.preventDefault();
                  handleSectionLink(item.hash);
                }}
                className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-[#0E1526]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2.5 border-t border-white/[0.08] pt-3">
              {user ? (
                <Link
                  to={workspacePath}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {copy.nav.openWorkspace}
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200"
                  >
                    {copy.nav.login}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {copy.nav.startFree}
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
