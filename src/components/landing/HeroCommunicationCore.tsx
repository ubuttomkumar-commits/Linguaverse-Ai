import React, { Suspense, lazy, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BarChart3, Brain, Dna, Mic } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SUPPLIED_LANDING_COPY } from '../../domain/suppliedLandingCopy';
import { LANDING_3D_CONTENT, type HeroDeckViewId } from '../../domain/landing3dContent';
import { GlobeStaticFallback } from './GlobeStaticFallback';
import { InteractiveProgressRing } from './MotionPrimitives';

const ThreeLanguageGlobe = lazy(() => import('./ThreeLanguageGlobe'));

const PANEL_ICONS: Record<HeroDeckViewId, React.ComponentType<{ className?: string }>> = {
  speaking: Mic,
  mistake_memory: Brain,
  dna: Dna,
  progress: BarChart3,
};

const MINI_WAVE = [
  'h-[10px] [animation-delay:0s]',
  'h-[22px] [animation-delay:0.1s]',
  'h-[16px] [animation-delay:0.2s]',
  'h-[26px] [animation-delay:0.3s]',
  'h-[14px] [animation-delay:0.4s]',
  'h-[24px] [animation-delay:0.5s]',
  'h-[12px] [animation-delay:0.6s]',
  'h-[20px] [animation-delay:0.7s]',
  'h-[15px] [animation-delay:0.8s]',
];

const TONE_CLASSES: Record<'cyan' | 'emerald' | 'violet' | 'rose', string> = {
  cyan: 'text-[#7dd3fc]',
  emerald: 'text-[#6ee7b7]',
  violet: 'text-[#c4b5fd]',
  rose: 'text-[#fda4af]',
};

export function HeroCommunicationCore() {
  const { lang } = useLanguage();
  const prefersReduced = useReducedMotion();
  const hero = SUPPLIED_LANDING_COPY[lang].hero;
  const deck = LANDING_3D_CONTENT[lang].heroDeck;

  const [activeIndex, setActiveIndex] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const activePanel = deck.panels[activeIndex] ?? deck.panels[0];

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setPointer({ x: relX * 2, y: relY * 2 });
  };

  const handlePointerLeave = () => {
    setPointer({ x: 0, y: 0 });
  };

  return (
    <div
      className="relative mx-auto w-full max-w-[560px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Layered 3D Product Experience Shell */}
      <div className="lv-glow-surface relative overflow-hidden rounded-[24px] border border-[#b0c8ff]/[0.16] bg-[radial-gradient(ellipse_75%_60%_at_50%_18%,rgba(56,189,248,0.16),rgba(139,109,255,0.09)_50%,rgba(6,11,24,0.96)_86%)] p-4 sm:p-5">
        {/* Quiet Unboxed Transparency Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#b0c8ff]/[0.1] pb-3 text-[12px]">
          <span className="font-semibold text-[#38bdf8]">{deck.globeCaption}</span>
          <span className="text-[#98aac9]">{deck.previewDisclaimer}</span>
        </div>

        {/* Unobstructed 3D Language Globe Stage (Zero backdrop-blur over WebGL) */}
        <div
          role="region"
          aria-label={hero.visualAriaLabel}
          className="relative h-[228px] w-full overflow-hidden sm:h-[268px]"
        >
          {/* Glowing Bilingual Linguistic Resonance Symbols (Corners only, never blocking globe) */}
          <span
            aria-hidden="true"
            className="font-bn pointer-events-none absolute left-3 top-3 text-[15px] font-bold text-[#38bdf8]/75 drop-shadow-[0_0_12px_rgba(56,189,248,0.65)]"
          >
            ক
          </span>
          <span
            aria-hidden="true"
            className="font-display pointer-events-none absolute right-3 top-3 text-[12px] font-extrabold tracking-widest text-[#a78bfa]/80 drop-shadow-[0_0_12px_rgba(139,109,255,0.65)]"
          >
            EN
          </span>
          <span
            aria-hidden="true"
            className="font-bn pointer-events-none absolute bottom-3 left-4 text-[14px] font-bold text-[#e879f9]/70 drop-shadow-[0_0_12px_rgba(217,70,239,0.55)]"
          >
            অ
          </span>
          <span
            aria-hidden="true"
            className="font-mono pointer-events-none absolute bottom-3 right-3 text-[11px] font-semibold text-[#60a5fa]/75"
          >
            Aa · বাংলা
          </span>

          {/* Lazy-Loaded Three.js Rotating 3D Globe */}
          <Suspense fallback={<GlobeStaticFallback ariaLabel={hero.visualAriaLabel} />}>
            <ThreeLanguageGlobe
              activeFocusIndex={activeIndex}
              pointerX={pointer.x}
              pointerY={pointer.y}
              ariaLabel={hero.visualAriaLabel}
            />
          </Suspense>
        </div>

        {/* Interactive Layered Product Module Selector (Crisp 2x2 Grid — Zero Truncation) */}
        <div
          role="tablist"
          aria-label={deck.globeCaption}
          className="grid grid-cols-2 gap-2.5"
        >
          {deck.panels.map((panel, idx) => {
            const Icon = PANEL_ICONS[panel.id];
            const isActive = idx === activeIndex;
            return (
              <button
                key={panel.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-pressed={isActive}
                onClick={() => setActiveIndex(idx)}
                className={`flex min-h-[54px] cursor-pointer flex-col justify-between rounded-[12px] border px-2.5 py-2 text-left transition-colors transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8] ${
                  isActive
                    ? 'border-[#38bdf8]/65 bg-[#122242] shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                    : 'border-[#b0c8ff]/[0.14] bg-[#0b1326] hover:border-[#6ca4ff]/45'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? 'text-[#38bdf8]' : 'text-[#89b5ff]'
                    }`}
                  />
                  <span className="truncate text-[12px] font-bold text-[#f3f6ff]">
                    {panel.tabLabel}
                  </span>
                </span>
                <span className="mt-0.5 truncate text-[10.5px] text-[#9eb1d1]">
                  {panel.shortSubtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active 3D Product Interface Readout (Speaking / Mistake Memory / DNA / Progress) */}
        <div
          aria-live="polite"
          className="mt-3 rounded-[16px] border border-[#b0c8ff]/[0.14] bg-[#091021] p-4"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel.id}
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[12px] font-bold text-[#f3f6ff]">
                    {activePanel.panelTitle}
                  </p>
                  <p className="text-[11px] text-[#8fa3c6]">
                    {activePanel.headlineMetricLabel}:{' '}
                    <span className="font-semibold text-[#38bdf8]">
                      {activePanel.headlineMetricValue}
                    </span>
                  </p>
                </div>

                {/* Live Animated Waveform for Speaking Studio tab */}
                {activePanel.id === 'speaking' ? (
                  <div className="flex h-[28px] items-center gap-1" aria-hidden="true">
                    {MINI_WAVE.map((cls, i) => (
                      <span
                        key={i}
                        className={`lv-wave-bar w-[2.5px] rounded-full bg-gradient-to-b from-[#38bdf8] via-[#8b6dff] to-[#d946ef] ${cls}`}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] font-medium text-[#c084fc]">
                    {activePanel.previewBadge}
                  </span>
                )}
              </div>

              <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#b4c3df]">
                {activePanel.summary}
              </p>

              {/* Structured Feedback Lines */}
              <div className="mt-3 space-y-1.5 border-t border-[#b0c8ff]/[0.1] pt-2.5">
                {activePanel.lines.map((line) => (
                  <div
                    key={line.label}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px]"
                  >
                    <span className="text-[#8d9fbe]">{line.label}</span>
                    <span className={`font-medium ${TONE_CLASSES[line.tone]}`}>
                      {line.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sample Interactive Progress Rings for DNA & Progress Analytics views */}
              {activePanel.ringSegments && (
                <div className="mt-3.5 flex items-center justify-around border-t border-[#b0c8ff]/[0.1] pt-3">
                  {activePanel.ringSegments.map((seg) => (
                    <InteractiveProgressRing
                      key={seg.label}
                      value={seg.sampleLevel}
                      label={seg.label}
                      color={seg.color}
                      size={56}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
