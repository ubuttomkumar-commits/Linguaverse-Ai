import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUpRight, Check } from 'lucide-react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import { HeroCommunicationCore } from '../components/landing/HeroCommunicationCore';
import { LandingStorySections } from '../components/landing/LandingStorySections';
import { LandingDemoSection } from '../components/landing/LandingDemoSection';
import { CommunicationLoop3D } from '../components/landing/CommunicationLoop3D';
import { LandingIntelligenceSection } from '../components/landing/LandingIntelligenceSection';
import { LandingPracticeSection } from '../components/landing/LandingPracticeSection';
import { LandingJourneyTrustSection } from '../components/landing/LandingJourneyTrustSection';
import { LandingConversionSection } from '../components/landing/LandingConversionSection';
import { MagneticWrap } from '../components/landing/MotionPrimitives';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  SUPPLIED_LANDING_COPY,
  resolveLandingRoutes,
} from '../domain/suppliedLandingCopy';

export function LandingPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const prefersReduced = useReducedMotion();
  const { hero } = SUPPLIED_LANDING_COPY[lang];
  const routes = resolveLandingRoutes(user, profile);

  return (
    <div
      id="home"
      className="relative min-h-screen bg-[radial-gradient(ellipse_70%_42%_at_76%_0%,rgba(56,189,248,0.14),rgba(139,109,255,0.08)_44%,rgba(217,70,239,0.04)_64%,transparent_80%),#060b18] text-[#f3f6ff]"
    >
      <PublicHeader />

      <main>
        {/* SECTION A — CINEMATIC 3D HERO PRODUCT EXPERIENCE */}
        <section className="relative overflow-x-clip pb-16 pt-10 sm:pb-24 sm:pt-14 lg:pb-24 lg:pt-[64px]">
          {/* Soft ambient illumination aura (purely decorative, pointer-events-none) */}
          <div
            aria-hidden="true"
            className="lv-ambient-aura pointer-events-none absolute -top-24 right-[8%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.16)_0%,rgba(139,109,255,0.1)_46%,transparent_72%)] blur-3xl"
          />

          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
            {/* Left Editorial Value Column (Framer Motion staggered entrance) */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="flex flex-col gap-y-0.5 text-[13px] font-medium text-[#8ab4ff] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                <span className="font-semibold text-[#38bdf8]">
                  {hero.categoryLabel}
                </span>
                <span aria-hidden="true" className="hidden text-[#4f648c] sm:inline">
                  ·
                </span>
                <span className="text-[#a8b8d6]">{hero.audienceLabel}</span>
              </p>

              <h1
                className={`font-display mt-5 max-w-[640px] text-[38px] font-extrabold tracking-[-0.04em] text-[#f3f6ff] sm:text-[52px] lg:text-[62px] text-balance ${
                  lang === 'bn' ? 'leading-[1.18]' : 'leading-[1.04]'
                }`}
              >
                {hero.headlineLine1}
                <br />
                <span className="bg-gradient-to-r from-[#38bdf8] via-[#8b6dff] to-[#e879f9] bg-clip-text text-transparent">
                  {hero.headlineAccent}
                </span>
              </h1>

              <p className="mt-5 max-w-[540px] text-[17px] font-medium leading-relaxed text-[#dbe5f9]">
                {hero.positioningQuote}
              </p>

              <p className="mt-2.5 max-w-[540px] text-[15px] leading-[1.65] text-[#a5b5d4] sm:text-[16px]">
                {hero.subcopy}
              </p>

              {/* Magnetic Glowing Primary CTA + Secondary Experience CTA */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <MagneticWrap className="w-full sm:w-auto">
                  <Link
                    to={routes.primaryAuthRoute}
                    className="lv-glow-cta inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] px-6 py-3 text-[14px] font-bold text-[#060b18] active:scale-[0.99] sm:w-auto whitespace-nowrap"
                  >
                    <span>
                      {routes.isSignedIn ? hero.primaryCtaSignedIn : hero.primaryCta}
                    </span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </MagneticWrap>

                <a
                  href="#live-demo"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] border border-[#b0c8ff]/[0.18] bg-[#0d1528]/85 px-5 py-3 text-[14px] font-semibold text-[#f3f6ff] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#38bdf8]/60 hover:shadow-[0_0_24px_rgba(56,189,248,0.16)] whitespace-nowrap"
                >
                  <span>{hero.secondaryCta}</span>
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              {/* Honest Trust & Privacy Microcopy */}
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#98aac9]">
                {hero.trustItems.map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[#34d399]"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Right Interactive 3D Product Experience (Three.js Globe + Layered Workspace Deck) */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <HeroCommunicationCore />
            </motion.div>
          </div>
        </section>

        {/* SECTION B & C — The Real Problem & The Transformation */}
        <LandingStorySections />

        {/* SECTION D — Interactive Product Dashboard Demonstration */}
        <LandingDemoSection />

        {/* SECTION E — 3D Orbital Communication Improvement Loop (7 Connected Stages) */}
        <CommunicationLoop3D />

        {/* SECTION F — Six Interactive 3D Intelligence Feature Cards */}
        <LandingIntelligenceSection />

        {/* SECTION G & H — Speaking Studio Preview & Real-World Transfer Lab */}
        <LandingPracticeSection />

        {/* SECTION I, J & K — Bangla-First Advantage, Learning Journey & Trust/Privacy */}
        <LandingJourneyTrustSection />

        {/* SECTION L, M & N — 3D Illuminated Pricing, Smooth FAQ & Final Conversion */}
        <LandingConversionSection />
      </main>

      {/* Quiet Structured Footer */}
      <PublicFooter />
    </div>
  );
}
