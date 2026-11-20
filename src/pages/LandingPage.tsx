import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import { HeroSamplePreview } from '../components/landing/HeroSamplePreview';
import { PainPointMatrixSection } from '../components/landing/PainPointMatrixSection';
import { LiveSandboxSection } from '../components/landing/LiveSandboxSection';
import { ImprovementLoopSection } from '../components/landing/ImprovementLoopSection';
import { SupportEcosystemSection } from '../components/landing/SupportEcosystemSection';
import { PricingSection } from '../components/landing/PricingSection';
import { FloatingGuideWidget } from '../components/landing/FloatingGuideWidget';
import { RevealBlock } from '../components/landing/TiltSpotlightCard';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LANDING_COPY } from '../domain/landingContent';

export function LandingPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const copy = LANDING_COPY[lang];

  const primaryCtaTarget = user
    ? !profile?.onboardingCompleted
      ? '/onboarding'
      : '/app'
    : '/register';

  const primaryCtaLabel = user ? copy.nav.openWorkspace : copy.hero.primaryCta;

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100">
      <PublicHeader />

      <main>
        {/* 1. Problem-Solving Hero Section with 3D Acoustic Core & Interactive Sample Preview */}
        <section className="relative overflow-hidden pb-16 pt-8 sm:pt-12 lg:pb-20 lg:pt-12">
          {/* Subtle atmospheric radial depth — disciplined 60-30-10 dark navy field */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[540px] bg-[radial-gradient(ellipse_70%_55%_at_68%_22%,rgba(59,130,246,0.14),rgba(124,58,237,0.06)_48%,transparent_75%)]"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
              {/* Left Editorial Copy Column */}
              <div className="flex flex-col justify-center lg:col-span-5 lg:pr-2">
                <p className="font-bn text-xs font-semibold tracking-wide text-[#F59E0B] sm:text-sm">
                  {copy.hero.badge}
                </p>

                <h1
                  className={`font-display mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.5rem] text-balance ${
                    lang === 'bn' ? 'leading-[1.24] lg:leading-[1.22]' : 'leading-[1.1] lg:leading-[1.08]'
                  }`}
                >
                  {copy.hero.headline}
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                  {copy.hero.subheadline}
                </p>

                {/* Dual CTAs */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <Link
                    to={primaryCtaTarget}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(59,130,246,0.35)] hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{primaryCtaLabel}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a
                    href="#live-demo"
                    className="inline-flex min-h-[48px] items-center rounded-xl border border-white/[0.12] bg-[#0E1526] px-5 py-3 text-sm font-semibold text-slate-200 hover:border-[#3B82F6]/60 hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    {copy.hero.secondaryCta}
                  </a>
                </div>

                {/* Radical Honesty Note */}
                <div className="mt-9 border-t border-white/[0.08] pt-5">
                  <p className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]"
                      aria-hidden="true"
                    />
                    <span>{copy.hero.honestyNote}</span>
                  </p>
                </div>
              </div>

              {/* Right 3D Acoustic Core + Interactive Scenario Sample Preview */}
              <div className="lg:col-span-7">
                <HeroSamplePreview />
              </div>
            </div>
          </div>
        </section>

        {/* 2. "Why You Still Can't Speak" — Pain-Point vs. Solution Matrix */}
        <PainPointMatrixSection />

        {/* 3. Interactive "Test Your English Sentence" Live Sandbox (Zero Signup Required) */}
        <LiveSandboxSection />

        {/* 4. Interactive 8-Step Loop Visualizer & 6 Differentiation Systems 3D Bento Grid */}
        <ImprovementLoopSection />

        {/* 5. Always-Supported Learner Ecosystem & Beginner FAQ */}
        <SupportEcosystemSection />

        {/* 6. Transparent Pricing (BDT ৳ / USD $ Toggle) */}
        <PricingSection />

        {/* 7. Bold Final CTA Banner */}
        <section className="border-t border-white/[0.06] bg-[#080E1D] py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <RevealBlock>
              <div className="relative overflow-hidden rounded-3xl border border-[#3B82F6]/30 bg-gradient-to-br from-[#0E1526] via-[#0B1325] to-[#13112B] p-8 text-center sm:p-14 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-[#3B82F6]/15 blur-3xl"
                />
                <div className="relative">
                  <h2 className="font-display mx-auto max-w-3xl text-2xl font-extrabold tracking-tight text-white sm:text-4xl text-balance">
                    {copy.finalCta.title}
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                    {copy.finalCta.subtitle}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                    <Link
                      to={primaryCtaTarget}
                      className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#3B82F6] px-7 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(59,130,246,0.35)] hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>{user ? copy.nav.openWorkspace : copy.finalCta.primaryBtn}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <a
                      href="#live-demo"
                      className="inline-flex min-h-[48px] items-center rounded-xl border border-white/[0.14] bg-[#050914]/80 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-[#3B82F6]/60 hover:text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      {copy.finalCta.secondaryBtn}
                    </a>
                  </div>
                </div>
              </div>
            </RevealBlock>
          </div>
        </section>
      </main>

      <PublicFooter />

      {/* Bottom-Right Floating Guide & 30-Second Level Finder */}
      <FloatingGuideWidget />
    </div>
  );
}
