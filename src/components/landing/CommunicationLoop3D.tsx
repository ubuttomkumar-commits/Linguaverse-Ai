import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Compass,
  Mic,
  RefreshCw,
  ScanSearch,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { resolveLandingRoutes } from '../../domain/suppliedLandingCopy';
import {
  LANDING_3D_CONTENT,
  type OrbitalLoopStep,
} from '../../domain/landing3dContent';
import { RevealSection } from './RevealSection';

const STEP_ICONS: Record<
  OrbitalLoopStep['id'],
  React.ComponentType<{ className?: string }>
> = {
  detect: ScanSearch,
  explain: Sparkles,
  personalize: Brain,
  practice: Mic,
  transfer: Compass,
  retest: RefreshCw,
  improve: CheckCircle2,
};

// Precomputed 7-node orbital coordinates in percentage around a 460x460 stage
const ORBIT_COORDS = Array.from({ length: 7 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI * 2) / 7;
  const rx = 40;
  const ry = 39;
  return {
    leftPct: Number((50 + rx * Math.cos(angle)).toFixed(2)),
    topPct: Number((50 + ry * Math.sin(angle)).toFixed(2)),
  };
});

export function CommunicationLoop3D() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const prefersReduced = useReducedMotion();
  const loop = LANDING_3D_CONTENT[lang].loop;
  const routes = resolveLandingRoutes(user, profile);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = loop.steps[activeIndex] ?? loop.steps[0];
  const ActiveIcon = STEP_ICONS[activeStep.id];

  const resolveStepLink = (key: OrbitalLoopStep['routeKey']) => {
    switch (key) {
      case 'improve':
        return routes.isSignedIn ? { isRoute: true, to: routes.improveRoute } : { isRoute: false, to: '#live-demo' };
      case 'speaking':
        return routes.isSignedIn ? { isRoute: true, to: routes.speakingRoute } : { isRoute: false, to: '#speaking' };
      case 'transfer':
        return routes.isSignedIn ? { isRoute: true, to: routes.transferLabRoute } : { isRoute: false, to: '#scenarios' };
      case 'progress':
        return routes.isSignedIn ? { isRoute: true, to: routes.progressRoute } : { isRoute: false, to: '#intelligence' };
      case 'demo':
      default:
        return { isRoute: false, to: '#live-demo' };
    }
  };

  const target = resolveStepLink(activeStep.routeKey);

  return (
    <section
      id="improvement-loop"
      className="relative overflow-x-clip border-t border-[#b0c8ff]/[0.08] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(139,109,255,0.12),transparent_70%),#060b18] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <RevealSection>
          <div className="max-w-2xl">
            <p className="text-[13px] font-semibold text-[#38bdf8]">{loop.kicker}</p>
            <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
              {loop.title}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
              {loop.lead}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            {/* Desktop / Tablet Circular 3D Orbital Visualization */}
            <div
              role="region"
              aria-label={loop.orbitalAriaLabel}
              className="hidden md:block lg:col-span-7"
            >
              <div className="lv-perspective relative mx-auto h-[460px] w-full max-w-[540px]">
                {/* Soft radial illumination behind the orbital core */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(139,109,255,0.12)_45%,transparent_72%)] blur-2xl"
                />

                {/* SVG Orbital Track, Directional Arcs & Moving Light Particles */}
                <svg
                  viewBox="0 0 460 460"
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  <defs>
                    <linearGradient id="lv-loop-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#8b6dff" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0.8" />
                    </linearGradient>
                    <path
                      id="lv-orbital-track-path"
                      d="M 230,50 A 180,180 0 1,1 229.9,50 Z"
                    />
                  </defs>

                  {/* Outer 3D depth ring */}
                  <ellipse
                    cx="230"
                    cy="230"
                    rx="208"
                    ry="198"
                    fill="none"
                    stroke="rgba(176, 200, 255, 0.1)"
                    strokeDasharray="4 7"
                    strokeWidth="1"
                  />

                  {/* Main luminous circular path */}
                  <circle
                    cx="230"
                    cy="230"
                    r="180"
                    fill="none"
                    stroke="url(#lv-loop-ring-grad)"
                    strokeWidth="1.8"
                    strokeOpacity="0.5"
                  />

                  {/* Inner tilted 3D orbital ellipse */}
                  <ellipse
                    cx="230"
                    cy="230"
                    rx="118"
                    ry="62"
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.25)"
                    strokeWidth="1.2"
                    transform="rotate(-22 230 230)"
                  />
                  <ellipse
                    cx="230"
                    cy="230"
                    rx="118"
                    ry="62"
                    fill="none"
                    stroke="rgba(217, 70, 239, 0.22)"
                    strokeWidth="1.2"
                    transform="rotate(24 230 230)"
                  />

                  {/* Moving Light Particles along orbital loop (disabled under reduced motion) */}
                  {!prefersReduced && (
                    <>
                      <circle r="4.5" fill="#38bdf8">
                        <animateMotion dur="12s" repeatCount="indefinite">
                          <mpath href="#lv-orbital-track-path" />
                        </animateMotion>
                      </circle>
                      <circle r="3.5" fill="#d946ef">
                        <animateMotion dur="12s" begin="-4s" repeatCount="indefinite">
                          <mpath href="#lv-orbital-track-path" />
                        </animateMotion>
                      </circle>
                      <circle r="3" fill="#8b6dff">
                        <animateMotion dur="12s" begin="-8s" repeatCount="indefinite">
                          <mpath href="#lv-orbital-track-path" />
                        </animateMotion>
                      </circle>
                    </>
                  )}
                </svg>

                {/* Central 3D Core Hub reflecting active step */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 grid h-[156px] w-[156px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#38bdf8]/40 bg-[radial-gradient(circle_at_35%_28%,#1c3363_0%,#0d1730_58%,#060b18_100%)] text-center shadow-[0_0_48px_rgba(79,139,255,0.28),inset_0_0_24px_rgba(56,189,248,0.18)]">
                  <div className="px-3">
                    <span className="font-mono tabular-nums block text-[11px] font-bold tracking-[0.18em] text-[#38bdf8]">
                      {activeStep.stepNumber} / 07
                    </span>
                    <span className="font-display mt-1 block text-[15px] font-extrabold tracking-tight text-white">
                      {activeStep.code}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#b4c3df]">
                      {activeStep.label}
                    </span>
                  </div>
                </div>

                {/* 7 Steady Interactive Orbital Nodes */}
                {loop.steps.map((step, idx) => {
                  const Icon = STEP_ICONS[step.id];
                  const pos = ORBIT_COORDS[idx];
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveIndex(idx)}
                      style={{
                        left: `${pos.leftPct}%`,
                        top: `${pos.topPct}%`,
                      }}
                      className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2 rounded-[14px] border px-3 py-2 text-left transition-colors transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8] ${
                        isActive
                          ? 'z-20 border-[#38bdf8]/80 bg-[#122447] text-white shadow-[0_0_26px_rgba(56,189,248,0.34)]'
                          : 'z-10 border-[#b0c8ff]/[0.18] bg-[#0b1326]/95 text-[#c8d5ef] hover:border-[#8b6dff]/60 hover:text-white'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[#060b18]"
                      >
                        <Icon
                          className={`h-3.5 w-3.5 ${
                            isActive ? 'text-[#38bdf8]' : 'text-[#8ab4ff]'
                          }`}
                        />
                      </span>
                      <span className="leading-tight">
                        <span className="font-mono tabular-nums block text-[10px] font-bold tracking-wider text-[#7dd3fc]">
                          {step.stepNumber}
                        </span>
                        <span className="block text-[12px] font-bold whitespace-nowrap">
                          {step.code}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Responsive Connected Stepper (< md) */}
            <div className="md:hidden">
              <div className="grid grid-cols-2 gap-2">
                {loop.steps.map((step, idx) => {
                  const Icon = STEP_ICONS[step.id];
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveIndex(idx)}
                      className={`flex min-h-[52px] cursor-pointer items-center gap-2 rounded-[12px] border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? 'border-[#38bdf8]/75 bg-[#122447] text-white shadow-[0_0_18px_rgba(56,189,248,0.22)]'
                          : 'border-[#b0c8ff]/[0.14] bg-[#0c1428] text-[#c5d3ec]'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-[#38bdf8]' : 'text-[#89b5ff]'
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="font-mono tabular-nums block text-[10px] text-[#7dd3fc]">
                          {step.stepNumber}
                        </span>
                        <span className="block truncate text-[12px] font-bold">
                          {step.code}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Connected Stage Detail Panel */}
            <div className="lg:col-span-5">
              <div
                aria-live="polite"
                className="lv-glow-surface rounded-[22px] border border-[#b0c8ff]/[0.16] bg-[#0c1428] p-6 sm:p-7"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep.id}
                    initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono tabular-nums text-[12px] font-bold text-[#38bdf8]">
                        {loop.activeStageLabel} · {activeStep.stepNumber}
                      </span>
                      <span
                        aria-hidden="true"
                        className="grid h-9 w-9 place-items-center rounded-[11px] border border-[#38bdf8]/35 bg-[#081022] text-[#38bdf8]"
                      >
                        <ActiveIcon className="h-4 w-4" />
                      </span>
                    </div>

                    <h3 className="font-display mt-3 text-[24px] font-extrabold tracking-tight text-white">
                      {activeStep.code}{' '}
                      <span className="text-[18px] font-semibold text-[#9eb1d1]">
                        — {activeStep.label}
                      </span>
                    </h3>

                    <p className="mt-2.5 text-[15px] leading-relaxed text-[#dce5f7]">
                      {activeStep.howItWorks}
                    </p>

                    <div className="mt-6 space-y-3 border-t border-[#b0c8ff]/[0.12] pt-5 text-[13.5px]">
                      <div className="rounded-[12px] border border-[#b0c8ff]/[0.1] bg-[#080f20] p-3.5">
                        <p className="text-[11.5px] font-semibold text-[#8ea2c5]">
                          {loop.inputLabel}
                        </p>
                        <p className="mt-1 text-[#e2eaf9]">{activeStep.exampleInput}</p>
                      </div>
                      <div className="flex justify-center text-[#38bdf8]" aria-hidden="true">
                        <ArrowRight className="h-4 w-4 rotate-90" />
                      </div>
                      <div className="rounded-[12px] border border-[#34d399]/25 bg-[#091c22] p-3.5">
                        <p className="text-[11.5px] font-semibold text-[#34d399]">
                          {loop.outputLabel}
                        </p>
                        <p className="mt-1 font-medium text-[#d1fae5]">
                          {activeStep.exampleOutput}
                        </p>
                      </div>
                    </div>

                    {/* Step Navigation Controls */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#b0c8ff]/[0.1] pt-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveIndex(
                              (prev) => (prev - 1 + loop.steps.length) % loop.steps.length
                            )
                          }
                          className="min-h-[38px] cursor-pointer rounded-lg border border-[#b0c8ff]/[0.16] bg-[#080f20] px-3 text-[12.5px] font-semibold text-[#d2dff5] transition-colors hover:border-[#38bdf8]/55 hover:text-white"
                        >
                          ← Prev
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveIndex((prev) => (prev + 1) % loop.steps.length)
                          }
                          className="min-h-[38px] cursor-pointer rounded-lg border border-[#38bdf8]/45 bg-[#122447] px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#19305e]"
                        >
                          Next →
                        </button>
                      </div>

                      {target.isRoute ? (
                        <Link
                          to={target.to}
                          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#38bdf8] hover:text-white"
                        >
                          <span>{activeStep.label}</span>
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : (
                        <a
                          href={target.to}
                          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#38bdf8] hover:text-white"
                        >
                          <span>{activeStep.label}</span>
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <p className="mt-3.5 text-[12.5px] leading-relaxed text-[#8d9fbe]">
                {loop.cycleNote}
              </p>
            </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
