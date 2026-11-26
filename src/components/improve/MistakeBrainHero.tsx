import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Brain,
  MessageSquareText,
  Mic,
  Sparkles,
  Target,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { MistakeMemoryOverview } from '../../domain/mistakeAnalyticsEngine';
import type { MistakeMemoryItem } from '../../types/domain';

interface MistakeBrainHeroProps {
  overview: MistakeMemoryOverview;
  topRecommendedMistake: MistakeMemoryItem | null;
  onStartPracticing: () => void;
  onOpenCoach: () => void;
  onSelectPillar: (pillar: 'grammar' | 'vocabulary' | 'speaking') => void;
}

export function MistakeBrainHero({
  overview,
  topRecommendedMistake,
  onStartPracticing,
  onOpenCoach,
  onSelectPillar,
}: MistakeBrainHeroProps) {
  const { lang } = useLanguage();
  const stageRef = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--px', `${(nx * 10).toFixed(2)}deg`);
    el.style.setProperty('--py', `${(-ny * 8).toFixed(2)}deg`);
  };

  const handlePointerLeave = () => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty('--px', '0deg');
    el.style.setProperty('--py', '0deg');
  };

  const grammarPillar = overview.heroPillars.find((p) => p.id === 'grammar');
  const vocabPillar = overview.heroPillars.find((p) => p.id === 'vocabulary');
  const speakingPillar = overview.heroPillars.find((p) => p.id === 'speaking');

  const formatPillarMetric = (
    pillar: { mistakeCount: number; resolvedCount: number; sharePercent: number | null } | undefined
  ) => {
    if (!pillar || pillar.mistakeCount === 0) {
      return {
        primary: '0',
        sub: lang === 'bn' ? 'কোনো ভুল নেই' : '0 recorded',
      };
    }
    return {
      primary: `${pillar.sharePercent ?? 0}%`,
      sub:
        lang === 'bn'
          ? `${pillar.mistakeCount}টি ধরন · ${pillar.resolvedCount}টি সমাধান`
          : `${pillar.mistakeCount} ${pillar.mistakeCount === 1 ? 'pattern' : 'patterns'} · ${pillar.resolvedCount} fixed`,
    };
  };

  const grammarMetric = formatPillarMetric(grammarPillar);
  const vocabMetric = formatPillarMetric(vocabPillar);
  const speakingMetric = formatPillarMetric(speakingPillar);

  return (
    <section
      aria-label="Mistake Memory Engine Hero"
      data-testid="mistake-memory-hero"
      className="lv-portal-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10"
    >
      {/* Ambient Midnight-Cyan-Violet-Magenta Nebula Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D9FF]/14 blur-3xl lv-ambient-aura"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 right-8 h-80 w-80 rounded-full bg-[#873BFF]/18 blur-3xl lv-ambient-aura"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-1/3 top-1/4 h-48 w-48 rounded-full bg-[#E42BFF]/10 blur-3xl"
      />

      {/* Subtle Neural Grid Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0, 217, 255, 0.75) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-6">
        {/* Left: Core Messaging & Actions */}
        <div className="lg:col-span-6">
          <p className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#00D9FF]">
            <Brain className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? 'মিস্টেক মেমোরি ইঞ্জিন · নিউরাল প্যাটার্ন রিকল'
                : 'Mistake Memory Engine · Neural Pattern Recall'}
            </span>
          </p>

          <h2 className="font-portal mt-3 text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
            {lang === 'bn' ? (
              <>
                আপনার ভুলগুলো মনে থাকবে।{' '}
                <span className="bg-gradient-to-r from-[#00D9FF] via-[#60A5FA] to-[#C084FC] bg-clip-text text-transparent">
                  আপনার অগ্রগতি নতুন রূপ পাবে।
                </span>
              </>
            ) : (
              <>
                Your Mistakes Remembered.{' '}
                <span className="bg-gradient-to-r from-[#00D9FF] via-[#60A5FA] to-[#C084FC] bg-clip-text text-transparent">
                  Your Progress Reimagined.
                </span>
              </>
            )}
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {lang === 'bn'
              ? 'প্রতিটি ভুল বুঝুন, সংশোধন করুন এবং যেন আর কখনো পুনরাবৃত্তি না হয় — একাডেমি, ডায়াগনস্টিক ও AI স্পিকিং স্টুডিওর বাস্তব ডেটা থেকে তৈরি।'
              : 'Understand, fix and never repeat your mistakes again. Every pattern below is captured directly from your real Academy, Diagnostic, and AI Speaking Studio sessions.'}
          </p>

          {/* Compact Real Context Summary Line (No fake scores, clean typography) */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-cyan-400/15 py-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold text-[#00D9FF] tabular-nums">
                {overview.totalValid}
              </span>
              <span>{lang === 'bn' ? 'মোট সংরক্ষিত ভুল' : 'patterns tracked'}</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold text-[#E42BFF] tabular-nums">
                {overview.recurringCount}
              </span>
              <span>{lang === 'bn' ? 'পুনরাবৃত্ত ধরন' : 'recurring habits'}</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold text-[#16E58B] tabular-nums">
                {overview.dueForReviewCount}
              </span>
              <span>{lang === 'bn' ? 'আজ রিভিউ বাকি' : 'due for review'}</span>
            </span>
          </div>

          {/* Primary & Secondary CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {topRecommendedMistake ? (
              <button
                type="button"
                onClick={onStartPracticing}
                data-testid="hero-start-practicing-btn"
                className="lv-glow-cta inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white whitespace-nowrap cursor-pointer"
              >
                <Target className="h-4 w-4" aria-hidden="true" />
                <span>{lang === 'bn' ? 'অনুশীলন শুরু করুন' : 'Start Practicing'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <Link
                to="/app/speak"
                data-testid="hero-start-practicing-btn"
                className="lv-glow-cta inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white whitespace-nowrap"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>{lang === 'bn' ? 'অনুশীলন শুরু করুন' : 'Start Practicing'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}

            <button
              type="button"
              onClick={onOpenCoach}
              data-testid="hero-ask-coach-btn"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-cyan-400/35 bg-[#0A1438]/80 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:border-cyan-300/70 hover:bg-[#102056] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'AI কোচকে জিজ্ঞাসা করুন' : 'Ask AI Coach'}</span>
            </button>
          </div>
        </div>

        {/* Right: 3D Glowing AI Neural Brain Visualization + Floating Real Stat Cards */}
        <div
          className="relative flex flex-col items-center justify-center lg:col-span-6"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div
            ref={stageRef}
            className="lv-parallax-stage relative flex w-full max-w-[460px] flex-col items-center justify-center py-2 sm:py-4"
          >
            {/* 3D Orbiting Holographic Stage */}
            <div className="relative flex h-[270px] w-[270px] items-center justify-center sm:h-[310px] sm:w-[310px]">
              {/* Volumetric Back Glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.34)_0%,rgba(135,59,255,0.24)_45%,rgba(5,9,31,0)_74%)] blur-2xl lv-holo-pulse"
              />

              {/* Tilted 3D Holographic Orbit Rings */}
              <div
                aria-hidden="true"
                className="lv-orbit-ring pointer-events-none absolute h-[250px] w-[250px] rounded-full border border-cyan-400/45 shadow-[0_0_24px_rgba(0,217,255,0.26)] sm:h-[285px] sm:w-[285px]"
              />
              <div
                aria-hidden="true"
                className="lv-orbit-ring-rev pointer-events-none absolute h-[210px] w-[210px] rounded-full border border-dashed border-violet-400/50 shadow-[0_0_20px_rgba(135,59,255,0.28)] sm:h-[242px] sm:w-[242px]"
              />
              <div
                aria-hidden="true"
                className="lv-orbit-ring-outer pointer-events-none absolute h-[278px] w-[278px] rounded-full border border-fuchsia-400/20 sm:h-[312px] sm:w-[312px]"
              />

              {/* Holographic Base Pedestal */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-4 h-12 w-56 rounded-full border border-cyan-400/30 bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.28)_0%,rgba(135,59,255,0.16)_55%,rgba(5,9,31,0)_100%)] shadow-[0_0_32px_rgba(0,217,255,0.25)]"
                style={{ transform: 'rotateX(70deg)' }}
              />

              {/* High-Precision 3D-Layered Neural Brain SVG */}
              <svg
                viewBox="0 0 320 300"
                role="img"
                aria-label={
                  lang === 'bn'
                    ? '৩ডি গ্লোয়িং নিউরাল ব্রেইন এবং স্মৃতি নেটওয়ার্ক ভিজ্যুয়ালাইজেশন'
                    : '3D glowing AI neural brain and memory network visualization'
                }
                className="lv-holo-float relative z-10 h-[230px] w-[245px] drop-shadow-[0_0_26px_rgba(0,217,255,0.34)] sm:h-[260px] sm:w-[275px]"
              >
                <defs>
                  <linearGradient id="brainRimCyanViolet" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F0FF" />
                    <stop offset="48%" stopColor="#3B82F6" />
                    <stop offset="80%" stopColor="#9333EA" />
                    <stop offset="100%" stopColor="#E42BFF" />
                  </linearGradient>
                  <linearGradient id="brainFillGlass" x1="15%" y1="10%" x2="85%" y2="90%">
                    <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.28" />
                    <stop offset="50%" stopColor="#4F46E5" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#E42BFF" stopOpacity="0.26" />
                  </linearGradient>
                  <radialGradient id="brainCoreGlow" cx="50%" cy="46%" r="48%">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                    <stop offset="28%" stopColor="#00D9FF" stopOpacity="0.65" />
                    <stop offset="68%" stopColor="#873BFF" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
                  </radialGradient>
                  <filter id="neonNodeGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="3.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Floating Ambient Neural Particles */}
                <g opacity="0.72">
                  <circle cx="42" cy="76" r="2.2" fill="#00D9FF" />
                  <circle cx="278" cy="64" r="2.4" fill="#E42BFF" />
                  <circle cx="290" cy="176" r="2" fill="#60A5FA" />
                  <circle cx="34" cy="196" r="1.8" fill="#A855F7" />
                  <circle cx="162" cy="24" r="2.2" fill="#00D9FF" />
                  <circle cx="244" cy="242" r="2" fill="#16E58B" />
                  <circle cx="84" cy="244" r="2" fill="#00D9FF" />
                </g>

                {/* Brain Silhouette — Left & Right Hemispheres with 3D Depth */}
                <g filter="url(#neonNodeGlow)">
                  {/* Left Hemisphere */}
                  <path
                    d="M156 54 C122 44, 82 62, 74 96 C54 106, 48 136, 62 162 C52 186, 66 218, 96 226 C112 242, 140 242, 156 226 Z"
                    fill="url(#brainFillGlass)"
                    stroke="url(#brainRimCyanViolet)"
                    strokeWidth="2.4"
                  />
                  {/* Right Hemisphere */}
                  <path
                    d="M164 54 C198 44, 238 62, 246 96 C266 106, 272 136, 258 162 C268 186, 254 218, 224 226 C208 242, 180 242, 164 226 Z"
                    fill="url(#brainFillGlass)"
                    stroke="url(#brainRimCyanViolet)"
                    strokeWidth="2.4"
                  />
                </g>

                {/* Cortical Folds (Sulci) */}
                <g
                  fill="none"
                  stroke="url(#brainRimCyanViolet)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.72"
                >
                  <path d="M148 82 C124 76, 102 90, 96 112" />
                  <path d="M148 118 C116 114, 90 132, 84 156" />
                  <path d="M146 158 C122 156, 102 174, 102 198" />
                  <path d="M126 196 C118 212, 132 224, 150 218" />

                  <path d="M172 82 C196 76, 218 90, 224 112" />
                  <path d="M172 118 C204 114, 230 132, 236 156" />
                  <path d="M174 158 C198 156, 218 174, 218 198" />
                  <path d="M194 196 C202 212, 188 224, 170 218" />
                </g>

                {/* Inner Volumetric Glow */}
                <circle cx="160" cy="142" r="78" fill="url(#brainCoreGlow)" />

                {/* Synaptic Neural Pathways */}
                <g fill="none" strokeLinecap="round">
                  <path
                    d="M96 112 L134 102 L160 132 L188 100 L224 112"
                    stroke="#00D9FF"
                    strokeWidth="1.7"
                    opacity="0.88"
                  />
                  <path
                    d="M84 156 L124 148 L160 132 L196 148 L236 156"
                    stroke="#8B5CF6"
                    strokeWidth="1.7"
                    opacity="0.88"
                  />
                  <path
                    d="M102 198 L136 184 L160 132 L186 184 L218 198"
                    stroke="#E42BFF"
                    strokeWidth="1.6"
                    opacity="0.82"
                  />
                  <path
                    d="M134 102 L124 148 L136 184 M188 100 L196 148 L186 184"
                    stroke="#60A5FA"
                    strokeWidth="1.3"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                  {/* Brainstem Neural Pulse */}
                  <path
                    d="M160 226 L160 264 M150 232 L144 256 M170 232 L176 256"
                    stroke="#00D9FF"
                    strokeWidth="2"
                    opacity="0.65"
                  />
                </g>

                {/* Glowing Synapse Memory Nodes */}
                <g filter="url(#neonNodeGlow)">
                  <circle cx="160" cy="132" r="8" fill="#FFFFFF" stroke="#00D9FF" strokeWidth="3" />
                  <circle cx="96" cy="112" r="4.5" fill="#00D9FF" />
                  <circle cx="134" cy="102" r="5" fill="#60A5FA" />
                  <circle cx="188" cy="100" r="5" fill="#A855F7" />
                  <circle cx="224" cy="112" r="4.5" fill="#E42BFF" />
                  <circle cx="84" cy="156" r="4.5" fill="#00D9FF" />
                  <circle cx="124" cy="148" r="4.5" fill="#16E58B" />
                  <circle cx="196" cy="148" r="4.5" fill="#00D9FF" />
                  <circle cx="236" cy="156" r="4.5" fill="#E42BFF" />
                  <circle cx="102" cy="198" r="4" fill="#8B5CF6" />
                  <circle cx="136" cy="184" r="4.5" fill="#00D9FF" />
                  <circle cx="186" cy="184" r="4.5" fill="#F59E0B" />
                  <circle cx="218" cy="198" r="4" fill="#16E58B" />
                </g>
              </svg>
            </div>

            {/* 3 Floating Real-Data Stat Cards (Positioned around brain on sm+, tidy grid on mobile) */}
            <div className="mt-2 grid w-full grid-cols-3 gap-2.5 sm:mt-0 sm:block">
              {/* Grammar Floating Card (Top Left on sm+) */}
              <button
                type="button"
                onClick={() => onSelectPillar('grammar')}
                className="lv-glass-card lv-glow-card-hover flex flex-col items-start rounded-2xl p-2.5 text-left sm:absolute sm:left-0 sm:top-6 sm:w-36 sm:p-3 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#00D9FF]">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{lang === 'bn' ? 'ব্যাকরণ' : 'Grammar'}</span>
                </div>
                <span className="mt-1 font-mono text-lg font-extrabold text-white tabular-nums sm:text-xl">
                  {grammarMetric.primary}
                </span>
                <span className="mt-0.5 truncate text-[10px] text-slate-400 max-w-full">
                  {grammarMetric.sub}
                </span>
              </button>

              {/* Vocabulary Floating Card (Bottom Left on sm+) */}
              <button
                type="button"
                onClick={() => onSelectPillar('vocabulary')}
                className="lv-glass-card lv-glow-card-hover flex flex-col items-start rounded-2xl p-2.5 text-left sm:absolute sm:bottom-2 sm:left-1 sm:w-36 sm:p-3 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#16E58B]">
                  <MessageSquareText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{lang === 'bn' ? 'শব্দভাণ্ডার' : 'Vocabulary'}</span>
                </div>
                <span className="mt-1 font-mono text-lg font-extrabold text-white tabular-nums sm:text-xl">
                  {vocabMetric.primary}
                </span>
                <span className="mt-0.5 truncate text-[10px] text-slate-400 max-w-full">
                  {vocabMetric.sub}
                </span>
              </button>

              {/* Speaking Floating Card (Middle Right on sm+) */}
              <button
                type="button"
                onClick={() => onSelectPillar('speaking')}
                className="lv-glass-card lv-glow-card-hover flex flex-col items-start rounded-2xl p-2.5 text-left sm:absolute sm:right-0 sm:top-1/2 sm:w-36 sm:-translate-y-1/2 sm:p-3 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#E42BFF]">
                  <Mic className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{lang === 'bn' ? 'স্পিকিং' : 'Speaking'}</span>
                </div>
                <span className="mt-1 font-mono text-lg font-extrabold text-white tabular-nums sm:text-xl">
                  {speakingMetric.primary}
                </span>
                <span className="mt-0.5 truncate text-[10px] text-slate-400 max-w-full">
                  {speakingMetric.sub}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
