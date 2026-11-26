import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronDown, Menu, Search, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useCms } from '../../context/CmsContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { resolveLandingRoutes } from '../../domain/suppliedLandingCopy';
import { getPublishedFaqs } from '../../domain/cmsEngine';

const TRACKED_SECTION_IDS = [
  'home',
  'problem-solution',
  'features',
  'how-it-works',
  'pricing',
  'community',
] as const;

export function BrandLogoMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  return (
    <span
      aria-hidden="true"
      className={`relative grid ${dim} shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#00D9FF] via-[#087BFF] to-[#873BFF] p-[1.5px] shadow-[0_0_22px_rgba(0,217,255,0.45)]`}
    >
      <span className="grid h-full w-full place-items-center rounded-[9.5px] bg-[#060E2B]">
        <svg viewBox="0 0 28 28" className="h-5 w-5" fill="none">
          <defs>
            <linearGradient id="lv-logo-grad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00D9FF" />
              <stop offset="52%" stopColor="#087BFF" />
              <stop offset="100%" stopColor="#E42BFF" />
            </linearGradient>
          </defs>
          <path
            d="M7 5.5V19.5C7 21.2 8.3 22.5 10 22.5H21.5"
            stroke="url(#lv-logo-grad)"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12.5 6.5V16.5H19.5"
            stroke="#00D9FF"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </svg>
      </span>
    </span>
  );
}

export function PublicHeader() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { config, trackEvent } = useCms();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHash, setActiveHash] = useState<string>('#home');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const routes = resolveLandingRoutes(user, profile);

  const enabledNavItems = useMemo(
    () =>
      [...config.navigation]
        .filter((item) => item.enabled)
        .sort((a, b) => a.order - b.order),
    [config.navigation]
  );

  // Close menus on ESC or outside click
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setCommunityOpen(false);
        setSearchOpen(false);
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCommunityOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  // Active section highlight via IntersectionObserver
  useEffect(() => {
    if (location.pathname !== '/' || typeof IntersectionObserver === 'undefined') {
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
      { rootMargin: '-22% 0px -58% 0px', threshold: [0.05, 0.25] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  const handleNavTarget = (href: string) => {
    setMobileMenuOpen(false);
    setCommunityOpen(false);
    setSearchOpen(false);

    if (href.startsWith('/')) {
      navigate(href);
      return;
    }
    if (href.startsWith('http://') || href.startsWith('https://')) {
      window.location.href = href;
      return;
    }
    setActiveHash(href || '#home');
    if (location.pathname !== '/') {
      navigate(`/${href}`);
      return;
    }
    const id = href.replace('#', '');
    if (!id || id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Search index across CMS Features, Languages, Steps, and FAQs
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const items: Array<{ id: string; group: string; title: string; subtitle: string; href: string }> = [
      ...config.features
        .filter((f) => f.enabled)
        .map((f) => ({
          id: f.id,
          group: lang === 'bn' ? 'ফিচার' : 'Feature',
          title: lang === 'bn' ? f.titleBn : f.titleEn,
          subtitle: lang === 'bn' ? f.summaryBn : f.summaryEn,
          href: '#features',
        })),
      ...config.languages
        .filter((l) => l.enabled)
        .map((l) => ({
          id: l.id,
          group: lang === 'bn' ? 'ভাষা' : 'Language',
          title: `${l.name} (${l.nativeLabel})`,
          subtitle: l.status === 'live' ? 'Live Now' : 'Coming Soon',
          href: '#languages',
        })),
      ...getPublishedFaqs(config).map((faq) => ({
        id: faq.id,
        group: 'FAQ',
        title: lang === 'bn' ? faq.questionBn : faq.questionEn,
        subtitle: (lang === 'bn' ? faq.answerBn : faq.answerEn).slice(0, 96) + '...',
        href: '#faq',
      })),
    ];

    if (!q) return items.slice(0, 6);
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [config, lang, searchQuery]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#60a5fa]/[0.16] bg-[#05091F]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-2 px-3 sm:h-[76px] sm:gap-3 sm:px-6">
          {/* Left: 3D LINGUAVERSE AI Logo + Tagline */}
          <Link
            to="/"
            onClick={() => handleNavTarget('#home')}
            className="group flex min-w-0 shrink items-center gap-2 sm:gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00D9FF]"
          >
            <BrandLogoMark />
            <div className="min-w-0">
              <span className="font-display block truncate text-[13.5px] font-extrabold tracking-[0.02em] text-white sm:text-[16px]">
                {config.settings.brandName}
              </span>
              <span className="hidden truncate text-[10.5px] font-medium tracking-[0.01em] text-[#9eb4dc] sm:block">
                {lang === 'bn' ? config.settings.taglineBn : config.settings.taglineEn}
              </span>
            </div>
          </Link>

          {/* Center: Reference-Matched Nav Links + Active Neon Pill + Community Dropdown */}
          <nav
            aria-label="Primary navigation"
            className="hidden xl:flex items-center gap-1.5 text-[13.5px] font-medium text-[#c5d4f1]"
          >
            {enabledNavItems.map((item) => {
              const label = lang === 'bn' ? item.labelBn : item.labelEn;
              const isActive = activeHash === item.href;

              if (item.type === 'dropdown') {
                return (
                  <div key={item.id} className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      aria-expanded={communityOpen}
                      aria-haspopup="menu"
                      onClick={() => setCommunityOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 transition-colors cursor-pointer ${
                        communityOpen || isActive
                          ? 'bg-[#087BFF]/20 text-white border border-[#00D9FF]/45 shadow-[0_0_16px_rgba(0,217,255,0.22)]'
                          : 'border border-transparent hover:text-white'
                      }`}
                    >
                      <span>{label}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-150 ${
                          communityOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    <AnimatePresence>
                      {communityOpen && (
                        <motion.div
                          role="menu"
                          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.16 }}
                          className="lv-glass-card absolute right-0 mt-2.5 w-64 rounded-2xl p-2 backdrop-blur-2xl"
                        >
                          {(item.dropdownItems ?? []).map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              role="menuitem"
                              onClick={() => handleNavTarget(sub.href)}
                              className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#087BFF]/20 cursor-pointer"
                            >
                              <span className="text-[13px] font-semibold text-white">
                                {lang === 'bn' ? sub.labelBn : sub.labelEn}
                              </span>
                              {(sub.descriptionEn || sub.descriptionBn) && (
                                <span className="mt-0.5 text-[11px] text-[#9eb4dc]">
                                  {lang === 'bn' ? sub.descriptionBn : sub.descriptionEn}
                                </span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <a
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavTarget(item.href);
                  }}
                  className={`relative rounded-full px-3.5 py-1.5 whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'border border-[#00D9FF]/55 bg-[#087BFF]/22 text-white shadow-[0_0_18px_rgba(0,217,255,0.28)]'
                      : 'border border-transparent hover:text-white'
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </nav>

          {/* Right: Search Icon, EN/BN Switcher, Login, Neon Start Learning CTA */}
          <div className="hidden md:flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              aria-label={lang === 'bn' ? 'প্ল্যাটফর্ম অনুসন্ধান করুন' : 'Search platform'}
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#60a5fa]/25 bg-[#0A1438]/80 text-[#c9daf8] transition-colors hover:border-[#00D9FF]/60 hover:text-white cursor-pointer"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>

            <LanguageToggle compact />

            {routes.isSignedIn ? (
              <Link
                to={routes.primaryAuthRoute}
                className="lv-glow-cta inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full px-4.5 py-2 text-[13px] font-bold text-white whitespace-nowrap shrink-0"
              >
                <span>{lang === 'bn' ? 'ওয়ার্কস্পেস' : 'Workspace'}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-[#60a5fa]/35 bg-[#0A1438]/80 px-4 py-1.5 text-[13px] font-semibold text-[#e6efff] transition-colors hover:border-[#00D9FF]/65 hover:text-white whitespace-nowrap shrink-0"
                >
                  {lang === 'bn' ? 'লগইন' : 'Login'}
                </Link>
                <Link
                  to="/register"
                  onClick={() => trackEvent('hero_cta_click', { location: 'navbar' })}
                  className="lv-glow-cta inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full px-4.5 py-2 text-[13px] font-bold text-white whitespace-nowrap shrink-0"
                >
                  <span>
                    {lang === 'bn' ? config.hero.primaryCtaBn : config.hero.primaryCtaEn}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Controls (zero overflow at 360px) */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 md:hidden">
            <button
              type="button"
              aria-label={lang === 'bn' ? 'অনুসন্ধান' : 'Search'}
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#60a5fa]/25 bg-[#0A1438]/80 text-[#d8e6ff] cursor-pointer sm:h-10 sm:w-10"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
            <LanguageToggle compact />
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#60a5fa]/25 bg-[#0A1438]/90 text-white cursor-pointer sm:h-10 sm:w-10"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-nav-drawer"
              initial={prefersReduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-[#60a5fa]/20 bg-[#070E2A]/95 px-4 py-4 md:hidden"
            >
              <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
                {enabledNavItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavTarget(item.href);
                    }}
                    className="flex min-h-[44px] items-center rounded-xl px-3 py-2 text-[15px] font-medium text-[#d8e6ff] hover:bg-[#087BFF]/15 hover:text-white"
                  >
                    {lang === 'bn' ? item.labelBn : item.labelEn}
                  </a>
                ))}

                <div className="mt-3 flex flex-col gap-2.5 border-t border-[#60a5fa]/15 pt-3.5">
                  {routes.isSignedIn ? (
                    <Link
                      to={routes.primaryAuthRoute}
                      onClick={() => setMobileMenuOpen(false)}
                      className="lv-glow-cta inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white"
                    >
                      <span>{lang === 'bn' ? 'ওয়ার্কস্পেস খুলুন' : 'Open Workspace'}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#60a5fa]/35 bg-[#0A1438] px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        {lang === 'bn' ? 'লগইন' : 'Login'}
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          trackEvent('hero_cta_click', { location: 'mobile_drawer' });
                        }}
                        className="lv-glow-cta inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white"
                      >
                        <span>
                          {lang === 'bn' ? config.hero.primaryCtaBn : config.hero.primaryCtaEn}
                        </span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Interactive Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-[#030616]/80 px-4 pt-20 backdrop-blur-md"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={lang === 'bn' ? 'প্ল্যাটফর্ম অনুসন্ধান' : 'Search LINGUAVERSE AI'}
              initial={prefersReduced ? false : { opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="lv-glass-card w-full max-w-xl rounded-2xl p-4 sm:p-5"
            >
              <div className="flex items-center gap-3 border-b border-[#60a5fa]/20 pb-3">
                <Search className="h-4.5 w-4.5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'ফিচার, ভাষা বা প্রশ্ন খুঁজুন...'
                      : 'Search features, languages, or FAQs...'
                  }
                  className="w-full bg-transparent text-sm text-white placeholder-[#7f97c4] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="rounded-lg p-1.5 text-[#9eb4dc] hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 max-h-[340px] space-y-1.5 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[#9eb4dc]">
                    {lang === 'bn'
                      ? 'কোনো ফলাফল পাওয়া যায়নি।'
                      : 'No matching features, languages, or FAQs found.'}
                  </p>
                ) : (
                  searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleNavTarget(res.href)}
                      className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#087BFF]/20 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-[#00D9FF]/30 bg-[#00D9FF]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#00D9FF]">
                            {res.group}
                          </span>
                          <span className="truncate text-sm font-semibold text-white">
                            {res.title}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[#9eb4dc]">{res.subtitle}</p>
                      </div>
                      <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-[#873BFF]" aria-hidden="true" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
