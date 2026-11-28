import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Mic, PencilLine, Sparkles, XCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCms } from '../../context/CmsContext';
import { GlobeStaticFallback } from './GlobeStaticFallback';
import { SafeFeatureBoundary } from '../common/RootErrorBoundary';

const ThreeLanguageGlobe = lazy(() => import('./ThreeLanguageGlobe'));

const WAVE_HEIGHTS = [
  16, 26, 20, 38, 28, 46, 32, 54, 36, 48, 24, 42, 30, 56, 40, 50, 28, 36, 22, 30, 18, 26, 14,
];

const SPARKLINE_BARS = [24, 32, 30, 44, 52, 64, 72, 86];

const SAMPLE_PROMPTS = [
  {
    feedbackEn: 'Great! Your pronunciation is excellent!',
    feedbackBn: 'দারুণ! আপনার উচ্চারণ খুব স্পষ্ট হয়েছে!',
    ringPercent: 78,
    deltaLabel: '+12%',
  },
  {
    feedbackEn: 'Clean past tense! Natural workplace phrasing.',
    feedbackBn: 'পাস্ট টেন্স একদম ঠিক আছে! স্বাভাবিক অফিস ইংরেজি।',
    ringPercent: 84,
    deltaLabel: '+16%',
  },
  {
    feedbackEn: 'Fixed "discuss about" → "discuss the plan".',
    feedbackBn: '"discuss about" ভুলটি ঠিক করে স্বাভাবিক বাক্য তৈরি হয়েছে।',
    ringPercent: 81,
    deltaLabel: '+14%',
  },
];

export function HeroCommunicationCore() {
  const { lang } = useLanguage();
  const { config } = useCms();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Defer heavy WebGL Three.js chunk (~600 kB) until after first paint on desktop,
  // and keep the crisp static SVG fallback on narrow mobile / Save-Data connections.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData || window.innerWidth < 768) {
      setGlobeReady(false);
      return;
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setGlobeReady(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => setGlobeReady(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !stageRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    stageRef.current.style.setProperty('--px', `${(nx * 5.5).toFixed(2)}deg`);
    stageRef.current.style.setProperty('--py', `${(-ny * 4.2).toFixed(2)}deg`);
  };

  const handlePointerLeave = () => {
    if (!stageRef.current) return;
    stageRef.current.style.setProperty('--px', '0deg');
    stageRef.current.style.setProperty('--py', '0deg');
  };

  const activeSample = SAMPLE_PROMPTS[promptIndex % SAMPLE_PROMPTS.length];
  const ringCircumference = 2 * Math.PI * 24;
  const ringDashOffset = ringCircumference * (1 - activeSample.ringPercent / 100);
  const showThree = globeReady && config.settings.featureFlags.showThreeGlobe && !reducedMotion;

  return (
    <div
      className="relative mx-auto w-full max-w-[600px] select-none"
      aria-label={
        lang === 'bn'
          ? 'LINGUAVERSE AI থ্রিডি স্পিকিং স্টুডিও, মিস্টেক মেমোরি ও প্রোগ্রেস প্রিভিউ'
          : 'LINGUAVERSE AI 3D Speaking Studio, Mistake Memory, and Progress interactive preview'
      }
    >
      {/* Ambient Neon Halo behind 3D Product Scene */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 rounded-[40px] bg-[radial-gradient(circle_at_58%_32%,rgba(0,217,255,0.28),rgba(8,123,255,0.2)_40%,rgba(228,43,255,0.16)_68%,transparent_80%)] blur-2xl"
      />

      {/* Glowing 3D Three.js Earth/Language Globe Backdrop (Zero backdrop-filter over canvas!) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-5 right-4 z-0 h-[250px] w-[250px] opacity-95 sm:right-6 sm:h-[290px] sm:w-[290px]"
      >
        {showThree ? (
          <SafeFeatureBoundary fallback={<GlobeStaticFallback ariaLabel="3D Language Globe" />}>
            <Suspense fallback={<GlobeStaticFallback ariaLabel="3D Language Globe" />}>
              <ThreeLanguageGlobe
                activeFocusIndex={promptIndex % 3}
                pointerX={0}
                pointerY={0}
                ariaLabel="Interactive 3D Language Globe"
              />
            </Suspense>
          </SafeFeatureBoundary>
        ) : (
          <GlobeStaticFallback ariaLabel="3D Language Globe" />
        )}
      </div>

      {/* Glowing Neon Orbital Rings wrapping the Dashboard */}
      <div
        aria-hidden="true"
        className="lv-perspective pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
      >
        <div className="lv-orbit-ring-outer h-[320px] w-[440px] rounded-full border border-[#00D9FF]/30 shadow-[0_0_26px_rgba(0,217,255,0.22)] sm:w-[520px]" />
        <div className="lv-orbit-ring-rev absolute h-[240px] w-[360px] rounded-full border border-[#E42BFF]/30 shadow-[0_0_24px_rgba(228,43,255,0.22)] sm:w-[440px]" />
      </div>

      {/* Main 3D Perspective Product Stage */}
      <div
        ref={stageRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="lv-parallax-stage relative z-10 pt-8 pb-6 sm:pt-10"
      >
        {/* Tilted Luminous Glass Workspace Tablet */}
        <div className="rounded-[26px] bg-gradient-to-br from-[#00D9FF]/65 via-[#087BFF]/45 to-[#E42BFF]/60 p-[1.5px] shadow-[0_28px_72px_rgba(3,7,26,0.88),0_0_44px_rgba(8,123,255,0.3)] lg:[transform:rotateY(-8deg)_rotateX(4deg)]">
          <div className="rounded-[24.5px] bg-[linear-gradient(155deg,rgba(12,26,78,0.92)_0%,rgba(6,13,42,0.96)_100%)] p-3.5 sm:p-4">
            {/* Top Honest Interactive Sample Label */}
            {config.hero.showInteractivePreviewLabel && (
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7dd3fc]">
                  <Sparkles className="h-3 w-3 text-[#00D9FF]" aria-hidden="true" />
                  <span>
                    {lang === 'bn'
                      ? 'ইন্টারঅ্যাক্টিভ স্যাম্পল প্রিভিউ'
                      : 'Interactive Sample Preview'}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-[#9eb4dc]">
                  EN ⇄ বাংলা · AI Coach
                </span>
              </div>
            )}

            {/* Reference 2-Column Dashboard Grid: Left = Speaking Studio | Right = Mistake Memory + Your Progress */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.08fr_0.92fr]">
              {/* LEFT PANEL: Speaking Studio */}
              <div className="flex flex-col justify-between rounded-[18px] border border-[#38bdf8]/30 bg-[linear-gradient(160deg,rgba(15,36,104,0.8)_0%,rgba(8,18,56,0.9)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#00D9FF]/55 bg-[#087BFF]/25 text-[#00D9FF] shadow-[0_0_18px_rgba(0,217,255,0.38)]">
                      <Mic className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <h2 className="font-display text-[15px] font-bold text-white">
                      {lang === 'bn' ? 'স্পিকিং স্টুডিও' : 'Speaking Studio'}
                    </h2>
                  </div>

                  {/* Luminous Audio Frequency Waveform */}
                  <div
                    aria-hidden="true"
                    className="mt-4 flex h-[64px] items-center justify-between gap-[3px] rounded-xl border border-[#00D9FF]/18 bg-[#050C28]/70 px-3 py-2"
                  >
                    {WAVE_HEIGHTS.map((height, idx) => (
                      <span
                        key={idx}
                        className="lv-wave-bar w-[3px] rounded-full bg-gradient-to-t from-[#087BFF] via-[#00D9FF] to-[#e0f2fe] shadow-[0_0_8px_rgba(0,217,255,0.55)]"
                        style={{
                          height: `${height}px`,
                          animationDelay: `${(idx % 7) * 110}ms`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Instant Positive Feedback Row */}
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#16E58B]/25 bg-[#071836]/80 p-2.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#16E58B]/20 text-[#16E58B] shadow-[0_0_14px_rgba(22,229,139,0.4)]">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="text-[12px] font-medium leading-snug text-[#e2eeff]">
                      {lang === 'bn' ? activeSample.feedbackBn : activeSample.feedbackEn}
                    </p>
                  </div>
                </div>

                {/* Interactive Continue Button (cycles live preview prompt) */}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPromptIndex((prev) => prev + 1)}
                    className="inline-flex min-h-[34px] items-center justify-center rounded-full bg-gradient-to-r from-[#00D9FF] to-[#087BFF] px-5 py-1.5 text-[12px] font-bold text-white shadow-[0_0_18px_rgba(0,217,255,0.45)] transition-transform hover:scale-[1.03] cursor-pointer"
                  >
                    {lang === 'bn' ? 'পরবর্তী' : 'Continue'}
                  </button>
                </div>
              </div>

              {/* RIGHT STACK: Mistake Memory + Your Progress */}
              <div className="flex flex-col gap-3">
                {/* Mistake Memory Card */}
                <div className="rounded-[18px] border border-[#873BFF]/38 bg-[linear-gradient(160deg,rgba(22,26,88,0.84)_0%,rgba(11,16,52,0.92)_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#873BFF]/30 text-[#d8b4fe]">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <h2 className="font-display text-[13.5px] font-bold text-white">
                      {lang === 'bn' ? 'মিস্টেক মেমোরি' : 'Mistake Memory'}
                    </h2>
                  </div>

                  <ul className="mt-2.5 space-y-1.5 text-[11.5px]">
                    <li className="flex items-center gap-2 rounded-lg border border-rose-400/20 bg-[#081030]/85 px-2.5 py-1.5 text-[#edf2ff]">
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden="true" />
                      <span className="truncate">Grammar: Past Tense</span>
                    </li>
                    <li className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-[#081030]/85 px-2.5 py-1.5 text-[#edf2ff]">
                      <PencilLine className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                      <span className="truncate">Vocabulary: Business</span>
                    </li>
                    <li className="flex items-center gap-2 rounded-lg border border-fuchsia-400/20 bg-[#081030]/85 px-2.5 py-1.5 text-[#edf2ff]">
                      <Mic className="h-3.5 w-3.5 shrink-0 text-fuchsia-400" aria-hidden="true" />
                      <span className="truncate">Pronunciation: Vowel</span>
                    </li>
                  </ul>

                  <div className="mt-2.5 flex justify-end">
                    <a
                      href="#live-demo"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7dd3fc] hover:text-white"
                    >
                      <span>{lang === 'bn' ? 'রিভিউ করুন' : 'Review Now'}</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                {/* Your Progress Card */}
                <div className="rounded-[18px] border border-[#00D9FF]/32 bg-[linear-gradient(160deg,rgba(12,32,88,0.85)_0%,rgba(8,17,52,0.94)_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-[13.5px] font-bold text-white">
                      {lang === 'bn' ? 'আপনার অগ্রগতি' : 'Your Progress'}
                    </h2>
                    <span className="font-mono text-[10px] text-[#7dd3fc]">Sample</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    {/* Circular Neon Progress Ring */}
                    <div className="relative grid h-[60px] w-[60px] shrink-0 place-items-center">
                      <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
                        <defs>
                          <linearGradient id="lv-hero-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00D9FF" />
                            <stop offset="55%" stopColor="#16E58B" />
                            <stop offset="100%" stopColor="#FACC15" />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          stroke="rgba(148,163,184,0.18)"
                          strokeWidth="5"
                          fill="none"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="24"
                          stroke="url(#lv-hero-ring)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringDashOffset}
                          fill="none"
                        />
                      </svg>
                      <span className="absolute font-mono text-[13px] font-extrabold text-white tabular-nums">
                        {activeSample.ringPercent}%
                      </span>
                    </div>

                    {/* Rising Sparkline Chart */}
                    <div className="flex flex-1 flex-col items-end">
                      <div className="flex h-[38px] w-full items-end justify-end gap-1.5">
                        {SPARKLINE_BARS.map((val, i) => (
                          <span
                            key={i}
                            className="w-2 rounded-t-sm bg-gradient-to-t from-[#087BFF]/70 to-[#00D9FF] shadow-[0_0_8px_rgba(0,217,255,0.45)]"
                            style={{ height: `${Math.round((val / 100) * 38)}px` }}
                          />
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="font-mono text-[12px] font-bold text-[#16E58B] tabular-nums">
                          {activeSample.deltaLabel}
                        </span>
                        <span className="text-[10px] text-[#9eb4dc]">
                          {lang === 'bn' ? 'এই সপ্তাহে' : 'This Week'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bottom-Left Glowing A⇄文 Language Emblem (matching reference) */}
        <Link
          to="/app/speak"
          aria-label="Open Bilingual Speaking Studio"
          className="lv-float-slow absolute -bottom-1 left-2 z-20 inline-flex items-center gap-1.5 rounded-2xl border border-[#00D9FF]/60 bg-[linear-gradient(135deg,#087BFF_0%,#5B3BFF_100%)] px-4 py-2.5 text-white shadow-[0_12px_34px_rgba(8,123,255,0.55),0_0_26px_rgba(0,217,255,0.4)] sm:left-4"
        >
          <span className="font-display text-[20px] font-black leading-none">A</span>
          <span className="text-[14px] font-bold text-[#7dd3fc]">⇄</span>
          <span className="font-bn text-[19px] font-bold leading-none">文</span>
        </Link>
      </div>
    </div>
  );
}
