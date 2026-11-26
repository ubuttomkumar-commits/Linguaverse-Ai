import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  OnboardingSceneVisuals,
  type OnboardingSceneVariant,
} from './OnboardingSceneVisuals';

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  stepTitleEn: string;
  stepTitleBn: string;
  sceneVariant: OnboardingSceneVariant;
  sceneCaptionEn: string;
  sceneCaptionBn: string;
  micActive?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function OnboardingShell({
  step,
  totalSteps,
  stepTitleEn,
  stepTitleBn,
  sceneVariant,
  sceneCaptionEn,
  sceneCaptionBn,
  micActive = false,
  children,
  footer,
}: OnboardingShellProps) {
  const { lang, setLang } = useLanguage();
  const prefersReduced = Boolean(useReducedMotion());
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const progressPercent = Math.round((step / totalSteps) * 100);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: nx * 12, y: ny * 10 });
  };

  const handleMouseLeave = () => setParallax({ x: 0, y: 0 });

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#05091F] text-slate-100"
    >
      {/* Atmospheric Deep Midnight Radial Illumination (Cohesive with Auth Portal) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 top-1/4 h-[460px] w-[460px] rounded-full bg-[#00D9FF]/10 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-[500px] w-[500px] rounded-full bg-[#7C3AED]/14 blur-[130px]" />
        <div className="absolute bottom-[-180px] left-1/2 h-[320px] w-[760px] -translate-x-1/2 rounded-full bg-[#3B82F6]/12 blur-[110px]" />
      </div>

      {/* Top Navigation Bar (Strict Clean 3-Zone Header) */}
      <header className="relative z-20 border-b border-cyan-400/10 bg-[#05091F]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 text-sm font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/40 bg-gradient-to-br from-[#00D9FF]/25 via-[#3B82F6]/30 to-[#7C3AED]/40 text-xs font-extrabold text-white shadow-[0_0_18px_rgba(0,217,255,0.28)]"
            >
              LV
            </span>
            <span className="font-portal tracking-wide">
              LINGUAVERSE <span className="text-[#00D9FF]">AI</span>
            </span>
          </Link>

          <div
            className="hidden items-center gap-2 text-xs text-slate-300 sm:flex"
            aria-live="polite"
          >
            <span className="font-mono font-semibold text-[#7DD3FC] tabular-nums">
              {String(step).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="truncate max-w-[260px] text-slate-300">
              {lang === 'bn' ? stepTitleBn : stepTitleEn}
            </span>
          </div>

          <div
            role="group"
            aria-label="Interface language switcher"
            className="inline-flex items-center rounded-lg border border-cyan-400/20 bg-[#091233]/85 p-0.5 text-xs shrink-0"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`rounded-md px-2.5 py-1.5 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                lang === 'en'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('bn')}
              aria-pressed={lang === 'bn'}
              className={`font-bn rounded-md px-2.5 py-1.5 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                lang === 'bn'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>

        {/* Continuous Luminous Progress Track */}
        <div
          role="progressbar"
          aria-label={lang === 'bn' ? 'অনবোর্ডিং অগ্রগতি' : 'Onboarding progress'}
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-[3px] w-full bg-slate-900/90"
        >
          <div
            className="h-full bg-gradient-to-r from-[#00D9FF] via-[#3B82F6] to-[#A855F7] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-6 pb-24 sm:px-6 sm:py-10 sm:pb-10">
        {/* Compact Mobile Step Header + Scene */}
        <div className="mb-5 flex flex-col items-center text-center lg:hidden">
          <p className="font-mono text-xs font-semibold text-[#7DD3FC] tabular-nums">
            {lang === 'bn'
              ? `ধাপ ${step} / ${totalSteps} · ${stepTitleBn}`
              : `Step ${step} of ${totalSteps} · ${stepTitleEn}`}
          </p>
          <div className="mt-2">
            <OnboardingSceneVisuals
              variant={sceneVariant}
              compact
              micActive={micActive}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Desktop Left 3D Visual Column */}
          <aside
            aria-label="LINGUAVERSE AI visual companion"
            className="hidden flex-col items-center text-center lg:col-span-5 lg:flex"
          >
            <div
              style={{
                transform: prefersReduced
                  ? undefined
                  : `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
              }}
              className="w-full transition-transform duration-200 ease-out"
            >
              <OnboardingSceneVisuals variant={sceneVariant} micActive={micActive} />
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300/90">
              {lang === 'bn' ? sceneCaptionBn : sceneCaptionEn}
            </p>
          </aside>

          {/* Primary Glassmorphic Step Panel */}
          <section className="lv-portal-panel rounded-2xl p-5 sm:p-8 lg:col-span-7">
            {children}

            {/* Desktop/Tablet Inline Footer */}
            {footer && (
              <div className="mt-7 hidden border-t border-cyan-400/15 pt-5 sm:block">
                {footer}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Mobile Sticky Bottom Action Bar (Strictly compact <= 10% viewport height) */}
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cyan-400/20 bg-[#05091F]/95 px-4 py-3 backdrop-blur-lg sm:hidden">
          {footer}
        </div>
      )}
    </div>
  );
}
