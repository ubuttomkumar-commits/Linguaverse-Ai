import React, { useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { PrimaryContinueTarget } from '../../domain/dashboardIntelligence';

interface LvIntelligenceCoreHeroProps {
  userName: string;
  lang: 'en' | 'bn';
  languagePairLabel: string;
  dailyGoalMinutes: number;
  assessedSkillCount: number;
  totalSkillsCount: number;
  continueTarget: PrimaryContinueTarget;
}

export function LvIntelligenceCoreHero({
  userName,
  lang,
  languagePairLabel,
  dailyGoalMinutes,
  assessedSkillCount,
  totalSkillsCount,
  continueTarget,
}: LvIntelligenceCoreHeroProps) {
  const prefersReduced = Boolean(useReducedMotion());
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType !== 'mouse' || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    stageRef.current.style.setProperty('--px', `${(nx * 10).toFixed(2)}deg`);
    stageRef.current.style.setProperty('--py', `${(-ny * 8).toFixed(2)}deg`);
  };

  const handlePointerLeave = () => {
    if (!stageRef.current) return;
    stageRef.current.style.setProperty('--px', '0deg');
    stageRef.current.style.setProperty('--py', '0deg');
  };

  const firstName = (userName || '').trim().split(/\s+/)[0] || (lang === 'bn' ? 'শিক্ষার্থী' : 'Learner');

  return (
    <section
      aria-labelledby="dashboard-hero-heading"
      className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(12,23,66,0.92)_0%,rgba(7,12,36,0.96)_58%,rgba(22,14,54,0.94)_100%)] p-6 shadow-[0_24px_64px_rgba(2,5,22,0.75)] sm:p-8"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Controlled atmospheric ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.22)_0%,rgba(124,58,237,0.14)_45%,transparent_72%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18)_0%,transparent_70%)] blur-2xl"
      />

      <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Left: Welcome & Single Primary Command Action */}
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-cyan-300/90">
            <span className="inline-flex items-center gap-1.5 font-semibold tracking-wide text-[#00D9FF]">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'bn'
                ? 'কমিউনিকেশন ইন্টেলিজেন্স কমান্ড সেন্টার'
                : 'Communication Intelligence Command Center'}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-300">{languagePairLabel}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="font-mono text-slate-300 tabular-nums">
              {dailyGoalMinutes} {lang === 'bn' ? 'মি./দিন' : 'min/day'}
            </span>
          </div>

          <h2
            id="dashboard-hero-heading"
            className="font-portal mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-[34px] lg:leading-[1.15]"
          >
            {lang === 'bn' ? `আবার স্বাগতম, ${firstName}` : `Welcome back, ${firstName}`}
          </h2>

          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {lang === 'bn'
              ? 'আত্মবিশ্বাসী যোগাযোগের পরবর্তী ধাপ এখান থেকেই শুরু।'
              : 'Your next step toward confident communication starts here.'}
          </p>

          {/* Real Data-Driven Contextual Line */}
          <div className="mt-5 rounded-xl border border-cyan-400/15 bg-[#060C24]/75 px-4 py-3 text-sm text-slate-200">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#00D9FF]" aria-hidden="true" />
              <p className="leading-relaxed">
                {lang === 'bn' ? continueTarget.contextLineBn : continueTarget.contextLineEn}
              </p>
            </div>
          </div>

          {/* Single Primary CTA */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to={continueTarget.to}
              data-testid="hero-continue-cta"
              className="lv-portal-btn inline-flex items-center gap-2.5 rounded-xl px-6 py-3 text-sm font-semibold text-white whitespace-nowrap shrink-0"
            >
              <span>{lang === 'bn' ? continueTarget.labelBn : continueTarget.labelEn}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {assessedSkillCount > 0
                ? lang === 'bn'
                  ? `${assessedSkillCount}/${totalSkillsCount} দক্ষতা মূল্যায়িত`
                  : `${assessedSkillCount}/${totalSkillsCount} skills measured`
                : lang === 'bn'
                  ? 'বেসলাইন মূল্যায়ন বাকি'
                  : 'Baseline assessment pending'}
            </span>
          </div>
        </div>

        {/* Right: Lightweight 3D Holographic LV Intelligence Core Visual */}
        <div className="flex flex-col items-center justify-center lg:col-span-5">
          <div
            ref={stageRef}
            className="lv-parallax-stage relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 280 280"
              className="h-full w-full overflow-visible"
              fill="none"
            >
              <defs>
                <radialGradient id={`${uid}-core-glow`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#3B82F6" stopOpacity="0.72" />
                  <stop offset="70%" stopColor="#7C3AED" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${uid}-sphere`} cx="38%" cy="32%" r="65%">
                  <stop offset="0%" stopColor="#A5F3FC" stopOpacity="0.95" />
                  <stop offset="28%" stopColor="#0EA5E9" stopOpacity="0.88" />
                  <stop offset="68%" stopColor="#4F46E5" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.98" />
                </radialGradient>
                <linearGradient id={`${uid}-ring-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id={`${uid}-ring-violet`} x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E42BFF" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00D9FF" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Ambient halo */}
              <circle
                cx="140"
                cy="140"
                r="118"
                fill={`url(#${uid}-core-glow)`}
                className={prefersReduced ? '' : 'lv-holo-pulse'}
              />

              {/* Outer dashed intelligence ring */}
              <g className={prefersReduced ? '' : 'lv-holo-orbit-slow'}>
                <circle
                  cx="140"
                  cy="140"
                  r="106"
                  stroke={`url(#${uid}-ring-cyan)`}
                  strokeWidth="1.4"
                  strokeDasharray="6 8"
                  opacity="0.75"
                />
                <circle cx="246" cy="140" r="3.5" fill="#00D9FF" />
                <circle cx="34" cy="140" r="2.5" fill="#A855F7" />
              </g>

              {/* Tilted holographic elliptical orbits */}
              <g transform="rotate(-22 140 140)">
                <ellipse
                  cx="140"
                  cy="140"
                  rx="116"
                  ry="40"
                  stroke={`url(#${uid}-ring-cyan)`}
                  strokeWidth="1.8"
                  opacity="0.85"
                />
              </g>
              <g transform="rotate(28 140 140)">
                <ellipse
                  cx="140"
                  cy="140"
                  rx="102"
                  ry="34"
                  stroke={`url(#${uid}-ring-violet)`}
                  strokeWidth="1.5"
                  opacity="0.72"
                />
              </g>

              {/* Inner reverse orbital ring */}
              <g className={prefersReduced ? '' : 'lv-holo-orbit-rev'}>
                <circle
                  cx="140"
                  cy="140"
                  r="76"
                  stroke="rgba(125, 211, 252, 0.35)"
                  strokeWidth="1.2"
                  strokeDasharray="18 10"
                />
                <circle cx="140" cy="64" r="3" fill="#E42BFF" />
              </g>

              {/* Central 3D Luminous Sphere */}
              <circle
                cx="140"
                cy="140"
                r="56"
                fill={`url(#${uid}-sphere)`}
                stroke="rgba(186, 230, 253, 0.55)"
                strokeWidth="1.5"
              />

              {/* Latitude / Longitude wireframe arcs inside core */}
              <ellipse
                cx="140"
                cy="140"
                rx="55"
                ry="19"
                stroke="rgba(224, 242, 254, 0.25)"
                strokeWidth="1"
              />
              <ellipse
                cx="140"
                cy="140"
                rx="22"
                ry="55"
                stroke="rgba(224, 242, 254, 0.22)"
                strokeWidth="1"
              />

              {/* LV Core Monogram */}
              <text
                x="140"
                y="148"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="24"
                fontWeight="800"
                letterSpacing="2"
                fontFamily="Space Grotesk, Plus Jakarta Sans, sans-serif"
              >
                LV
              </text>

              {/* Floating subtle language nodes */}
              <g className={prefersReduced ? '' : 'lv-holo-float'}>
                <rect
                  x="20"
                  y="44"
                  width="38"
                  height="28"
                  rx="8"
                  fill="rgba(10, 20, 56, 0.9)"
                  stroke="rgba(0, 217, 255, 0.5)"
                  strokeWidth="1.2"
                />
                <text
                  x="39"
                  y="62"
                  textAnchor="middle"
                  fill="#7DD3FC"
                  fontSize="12"
                  fontWeight="700"
                >
                  Aa
                </text>

                <rect
                  x="220"
                  y="52"
                  width="38"
                  height="28"
                  rx="8"
                  fill="rgba(16, 18, 58, 0.9)"
                  stroke="rgba(168, 85, 247, 0.55)"
                  strokeWidth="1.2"
                />
                <text
                  x="239"
                  y="70"
                  textAnchor="middle"
                  fill="#E9D5FF"
                  fontSize="13"
                  fontWeight="700"
                >
                  অ
                </text>

                <rect
                  x="206"
                  y="204"
                  width="44"
                  height="26"
                  rx="8"
                  fill="rgba(10, 20, 56, 0.9)"
                  stroke="rgba(56, 189, 248, 0.45)"
                  strokeWidth="1.2"
                />
                <text
                  x="228"
                  y="221"
                  textAnchor="middle"
                  fill="#BAE6FD"
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  DNA
                </text>
              </g>
            </svg>
          </div>
          <p className="mt-1 text-center font-mono text-[11px] tracking-wide text-slate-400">
            {lang === 'bn' ? 'LV ইন্টেলিজেন্স কোর · বাস্তব প্রমাণ ভিত্তিক' : 'LV Intelligence Core · Evidence-Driven'}
          </p>
        </div>
      </div>
    </section>
  );
}
