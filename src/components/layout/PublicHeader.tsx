import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LanguageToggle } from '../common/LanguageToggle';
import {
  SUPPLIED_LANDING_COPY,
  resolveLandingRoutes,
} from '../../domain/suppliedLandingCopy';

const TRACKED_SECTION_IDS = ['live-demo', 'improvement-loop', 'intelligence', 'privacy', 'pricing'] as const;

export function PublicHeader() {
  const { lang } = useLanguage();
  const copy = SUPPLIED_LANDING_COPY[lang];
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string>('');

  const routes = resolveLandingRoutes(user, profile);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Subtle active navigation tracking on landing page
  useEffect(() => {
    if (location.pathname !== '/' || typeof IntersectionObserver === 'undefined') {
      setActiveHash('');
      return;
    }

    const elements = TRACKED_SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          setActiveHash(`#${visible.target.id}`);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.1, 0.35] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  const handleSectionLink = (hash: string) => {
    setMobileMenuOpen(false);
    setActiveHash(hash);
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

  const navItems = [
    { hash: '#live-demo', label: copy.nav.liveDemo },
    { hash: '#improvement-loop', label: copy.nav.howItWorks },
    { hash: '#intelligence', label: copy.nav.intelligence },
    { hash: '#privacy', label: copy.nav.privacy },
    { hash: '#pricing', label: copy.nav.pricing },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#b0c8ff]/[0.12] bg-[#060b18]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:h-[72px] sm:gap-8 sm:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          onClick={() => handleSectionLink('')}
          className="group flex min-w-0 shrink-0 items-center gap-2.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8]"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[#38bdf8] via-[#4f8bff] to-[#d946ef] text-sm font-black text-[#060b18] shadow-[0_0_18px_rgba(79,139,255,0.4)] transition-transform duration-150 group-hover:scale-105"
          >
            L
          </span>
          <span className="font-display text-[15px] font-extrabold tracking-[-0.01em] text-[#f3f6ff] sm:text-[16px]">
            LINGUAVERSE AI
          </span>
        </Link>

        {/* Zone 2: Clean Single-Line Text Navigation with Luminous Active Indicator */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-[#b5c3dd]"
        >
          {navItems.map((item) => {
            const isActive = activeHash === item.hash;
            return (
              <a
                key={item.hash}
                href={item.hash}
                aria-current={isActive ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  handleSectionLink(item.hash);
                }}
                className={`relative py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8] ${
                  isActive ? 'text-white' : 'hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId={prefersReduced ? undefined : 'nav-active-glow'}
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-[#38bdf8] via-[#4f8bff] to-[#d946ef] shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Language Switcher + Account Actions */}
        <div className="hidden md:flex shrink-0 items-center gap-3">
          <LanguageToggle compact />
          {routes.isSignedIn ? (
            <Link
              to={routes.primaryAuthRoute}
              className="lv-glow-cta inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-bold text-[#060b18] active:scale-[0.99] whitespace-nowrap shrink-0"
            >
              <span>{copy.nav.openWorkspace}</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-2.5 py-2 text-[13px] font-semibold text-[#c9d5ec] transition-colors hover:text-white whitespace-nowrap shrink-0"
              >
                {copy.nav.login}
              </Link>
              <Link
                to="/register"
                className="lv-glow-cta inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-bold text-[#060b18] active:scale-[0.99] whitespace-nowrap shrink-0"
              >
                <span>{copy.nav.startFree}</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Controls (touch-safe 44px button, zero overflow at 360px) */}
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <LanguageToggle compact />
          <button
            type="button"
            aria-label={mobileMenuOpen ? copy.nav.closeMenu : copy.nav.openMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#b0c8ff]/[0.16] bg-[#0d1528] text-[#f3f6ff] transition-colors hover:border-[#38bdf8]/60 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Smooth Framer Motion Mobile Navigation Drawer */}
      <AnimatePresence initial={false}>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-nav-drawer"
            initial={prefersReduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[#b0c8ff]/[0.12] bg-[#091122] px-4 py-4 md:hidden"
          >
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.hash}
                  href={item.hash}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSectionLink(item.hash);
                  }}
                  className="flex min-h-[44px] items-center rounded-lg px-3 py-2 text-[15px] font-medium text-[#d5e0f7] transition-colors hover:bg-[#111b33] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2.5 border-t border-[#b0c8ff]/[0.12] pt-3.5">
                {routes.isSignedIn ? (
                  <Link
                    to={routes.primaryAuthRoute}
                    onClick={() => setMobileMenuOpen(false)}
                    className="lv-glow-cta inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 text-sm font-bold text-[#060b18]"
                  >
                    <span>{copy.nav.openWorkspace}</span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#b0c8ff]/[0.16] bg-[#0d1528] px-4 py-2.5 text-sm font-semibold text-[#f3f6ff]"
                    >
                      {copy.nav.login}
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="lv-glow-cta inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 text-sm font-bold text-[#060b18]"
                    >
                      <span>{copy.nav.startFree}</span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
