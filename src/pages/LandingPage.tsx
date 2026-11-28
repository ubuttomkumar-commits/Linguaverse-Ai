import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Play, Rocket, ShieldCheck } from 'lucide-react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import { HeroCommunicationCore } from '../components/landing/HeroCommunicationCore';
import { LandingStorySections } from '../components/landing/LandingStorySections';
import { LandingIntelligenceSection } from '../components/landing/LandingIntelligenceSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { LanguagesPricingSection } from '../components/landing/LanguagesPricingSection';
import { LandingDemoSection } from '../components/landing/LandingDemoSection';
import { CommunityTestimonialsFaqSection } from '../components/landing/CommunityTestimonialsFaqSection';
import { MagneticWrap } from '../components/landing/MotionPrimitives';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCms } from '../context/CmsContext';
import { resolveLandingRoutes } from '../domain/suppliedLandingCopy';
import type { CmsSectionId } from '../domain/cmsEngine';
import { SafeFeatureBoundary } from '../components/common/RootErrorBoundary';

export function LandingPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { config, trackEvent } = useCms();
  const prefersReduced = useReducedMotion();

  const routes = resolveLandingRoutes(user, profile);

  // Record a real landing page visit once per mount
  useEffect(() => {
    trackEvent('page_view', { page: 'landing' });
  }, [trackEvent]);

  const orderedSections = useMemo(
    () =>
      [...config.sections]
        .filter((s) => s.enabled)
        .sort((a, b) => a.order - b.order),
    [config.sections]
  );

  const renderSection = (sectionId: CmsSectionId) => {
    switch (sectionId) {
      case 'hero':
        return (
          <section
            key="hero"
            className="relative overflow-x-clip pb-10 pt-8 sm:pb-14 sm:pt-12 lg:pb-16 lg:pt-14"
          >
            {/* Ambient Neon Glow Auras */}
            <div
              aria-hidden="true"
              className="lv-ambient-aura pointer-events-none absolute -top-20 right-[6%] h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.20)_0%,rgba(135,59,255,0.14)_48%,transparent_74%)] blur-3xl"
            />

            <div className="relative mx-auto grid max-w-[1260px] grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:gap-8">
              {/* LEFT COLUMN: Reference-Matched Editorial Typography & Neon CTAs */}
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Top Luminous Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#60a5fa]/35 bg-[#0A1642]/80 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#e0edff] shadow-[0_0_20px_rgba(8,123,255,0.22)]">
                  <Rocket className="h-3.5 w-3.5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? config.hero.badgeBn : config.hero.badgeEn}
                  </span>
                </div>

                {/* Main Hero H1 — Reference 2-Line Crisp Lockup */}
                <h1
                  className={`font-display mt-5 max-w-[660px] text-[36px] font-extrabold tracking-[-0.03em] text-white sm:text-[46px] lg:text-[48px] xl:text-[54px] ${
                    lang === 'bn' ? 'leading-[1.16]' : 'leading-[1.08]'
                  }`}
                >
                  <span className={lang === 'en' ? 'xl:whitespace-nowrap' : ''}>
                    {lang === 'bn' ? config.hero.headlineLine1Bn : config.hero.headlineLine1En}
                  </span>
                  <br />
                  <span
                    className={`bg-gradient-to-r from-[#00D9FF] via-[#38bdf8] via-55% to-[#E42BFF] bg-clip-text text-transparent ${
                      lang === 'en' ? 'xl:whitespace-nowrap' : ''
                    }`}
                  >
                    {lang === 'bn' ? config.hero.headlineLine2Bn : config.hero.headlineLine2En}
                  </span>
                </h1>

                {/* Supporting Subheadline with Curved Amber-Gold Accent Stroke */}
                <div className="mt-4 max-w-[520px]">
                  <p className="font-display text-[19px] font-bold leading-snug text-[#f2f6ff] sm:text-[21px]">
                    {lang === 'bn' ? config.hero.subheadlineBn : config.hero.subheadlineEn}
                  </p>
                  <svg
                    viewBox="0 0 320 12"
                    className="mt-1 h-2.5 w-64 sm:w-72"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 9 Q160 1 316 7"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Concise Value Description */}
                <p className="mt-3.5 max-w-[500px] text-[15px] leading-[1.62] text-[#b4c6e6] sm:text-[15.5px]">
                  {lang === 'bn' ? config.hero.descriptionBn : config.hero.descriptionEn}
                </p>

                {/* Primary Neon Pill CTA + Secondary Watch Demo Pill Button */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <MagneticWrap className="w-full sm:w-auto">
                    <Link
                      to={routes.primaryAuthRoute}
                      onClick={() => trackEvent('hero_cta_click', { location: 'hero' })}
                      className="lv-glow-cta inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-7 py-3 text-[14.5px] font-extrabold text-white active:scale-[0.99] sm:w-auto whitespace-nowrap"
                    >
                      <span>
                        {routes.isSignedIn
                          ? lang === 'bn'
                            ? 'ওয়ার্কস্পেস খুলুন'
                            : 'Open Workspace'
                          : lang === 'bn'
                            ? config.hero.primaryCtaBn
                            : config.hero.primaryCtaEn}
                      </span>
                      <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
                    </Link>
                  </MagneticWrap>

                  <a
                    href="#live-demo"
                    onClick={(e) => {
                      e.preventDefault();
                      trackEvent('watch_demo_click', { location: 'hero' });
                      document.getElementById('live-demo')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full border border-[#60a5fa]/40 bg-[#0A153E]/85 px-6 py-3 text-[14px] font-bold text-white transition-all duration-150 hover:-translate-y-0.5 hover:border-[#00D9FF] hover:shadow-[0_0_24px_rgba(0,217,255,0.22)] whitespace-nowrap"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full border border-[#60a5fa]/50 bg-white/10">
                      <Play className="ml-0.5 h-3 w-3 fill-current" aria-hidden="true" />
                    </span>
                    <span>
                      {lang === 'bn' ? config.hero.secondaryCtaBn : config.hero.secondaryCtaEn}
                    </span>
                  </a>
                </div>

                {/* Honest CMS Trust Strip (Zero Fabricated User Counts) */}
                <div className="mt-6 inline-flex items-center gap-2.5 text-[12.5px] font-medium text-[#b0c4e8]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#16E58B]/18 text-[#16E58B]">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span>
                    {lang === 'bn' ? config.hero.trustTextBn : config.hero.trustTextEn}
                  </span>
                </div>
              </motion.div>

              {/* RIGHT COLUMN: 3D Tilted Product Dashboard + Glowing Earth Globe */}
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <HeroCommunicationCore />
              </motion.div>
            </div>
          </section>
        );

      case 'problem_solution':
        return <LandingStorySections key="problem_solution" />;

      case 'features':
        return <LandingIntelligenceSection key="features" />;

      case 'how_it_works':
        return <HowItWorksSection key="how_it_works" />;

      case 'languages_pricing':
        return <LanguagesPricingSection key="languages_pricing" />;

      case 'live_demo':
        return config.settings.featureFlags.showLiveDemo ? (
          <LandingDemoSection key="live_demo" />
        ) : null;

      case 'community_testimonials_faq':
        return (
          <CommunityTestimonialsFaqSection
            key="community_testimonials_faq"
            showCommunityRow
            showFinalCta={false}
          />
        );

      case 'final_cta':
        return (
          <CommunityTestimonialsFaqSection
            key="final_cta"
            showCommunityRow={false}
            showFinalCta
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      id="home"
      className="relative min-h-screen overflow-x-clip bg-[radial-gradient(ellipse_78%_36%_at_72%_0%,rgba(0,217,255,0.16),rgba(8,123,255,0.12)_35%,rgba(135,59,255,0.09)_58%,transparent_80%),radial-gradient(ellipse_60%_30%_at_15%_52%,rgba(8,123,255,0.08),transparent_70%),#05091F] text-[#F4F7FF]"
    >
      {/* Optional Admin Maintenance Notice Banner */}
      {config.settings.featureFlags.maintenanceNotice && (
        <div className="border-b border-amber-400/30 bg-amber-500/15 px-4 py-2 text-center text-xs font-semibold text-amber-200">
          {config.settings.featureFlags.maintenanceNotice}
        </div>
      )}

      <PublicHeader />

      <main>
        {orderedSections.map((section) =>
          section.id === 'hero' ? (
            renderSection(section.id)
          ) : (
            <SafeFeatureBoundary key={section.id} fallback={null}>
              {renderSection(section.id)}
            </SafeFeatureBoundary>
          )
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
