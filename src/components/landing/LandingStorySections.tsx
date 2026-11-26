import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronsRight,
  Mic,
  Star,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCms } from '../../context/CmsContext';
import { RevealSection } from './RevealSection';
import type { CmsLoopNode } from '../../domain/cmsEngine';

const NODE_STYLES: Record<
  CmsLoopNode['color'],
  { bg: string; border: string; glow: string; icon: typeof BookOpen }
> = {
  cyan: {
    bg: 'from-[#00D9FF] to-[#087BFF]',
    border: 'border-[#00D9FF]/70',
    glow: 'shadow-[0_0_24px_rgba(0,217,255,0.5)]',
    icon: BookOpen,
  },
  emerald: {
    bg: 'from-[#16E58B] to-[#059669]',
    border: 'border-[#16E58B]/70',
    glow: 'shadow-[0_0_24px_rgba(22,229,139,0.45)]',
    icon: Mic,
  },
  amber: {
    bg: 'from-[#FBBF24] to-[#EA580C]',
    border: 'border-[#FBBF24]/70',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.45)]',
    icon: BarChart3,
  },
  violet: {
    bg: 'from-[#A855F7] to-[#6366F1]',
    border: 'border-[#A855F7]/70',
    glow: 'shadow-[0_0_24px_rgba(168,85,247,0.45)]',
    icon: ArrowLeftRight,
  },
  magenta: {
    bg: 'from-[#F472B6] to-[#D946EF]',
    border: 'border-[#E42BFF]/70',
    glow: 'shadow-[0_0_24px_rgba(228,43,255,0.45)]',
    icon: Star,
  },
};

// Clockwise circular coordinates (percent) around 240x240 loop stage:
// Learn (top), Speak (right), Improve (bottom-right), Transfer (bottom-left), Practice (left)
const NODE_POSITIONS: Record<CmsLoopNode['id'], { left: string; top: string }> = {
  learn: { left: '50%', top: '8%' },
  speak: { left: '88%', top: '38%' },
  improve: { left: '74%', top: '84%' },
  transfer: { left: '26%', top: '84%' },
  practice: { left: '12%', top: '38%' },
};

function BooksProblemIllustration() {
  return (
    <svg
      viewBox="0 0 180 175"
      className="h-[155px] w-[160px] shrink-0 drop-shadow-[0_14px_24px_rgba(2,6,24,0.85)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lv-book-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="lv-book-mid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="lv-thought-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Subtle ambient glow behind silhouette */}
      <circle cx="96" cy="54" r="50" fill="url(#lv-thought-glow)" />

      {/* Abstract thinking wireframe ring + Question Mark */}
      <circle cx="52" cy="48" r="18" stroke="#60a5fa" strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
      <ellipse cx="52" cy="48" rx="22" ry="9" stroke="#818cf8" strokeOpacity="0.4" strokeWidth="1" fill="none" transform="rotate(-24 52 48)" />
      <ellipse cx="52" cy="48" rx="22" ry="9" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1" fill="none" transform="rotate(28 52 48)" />
      <text
        x="128"
        y="62"
        fill="#cbd5e1"
        fontSize="42"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
        opacity="0.78"
      >
        ?
      </text>

      {/* Stack of 4 heavy textbook volumes */}
      {/* Bottom book */}
      <polygon points="36,144 102,126 154,142 88,162" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
      <polygon points="36,144 88,162 88,151 36,133" fill="#cbd5e1" opacity="0.82" />
      <polygon points="88,162 154,142 154,131 88,151" fill="#334155" />

      {/* Book 3 */}
      <polygon points="32,127 98,109 150,125 84,145" fill="url(#lv-book-mid)" stroke="#94a3b8" strokeOpacity="0.45" strokeWidth="1" />
      <polygon points="32,127 84,145 84,134 32,116" fill="#e2e8f0" opacity="0.88" />
      <polygon points="84,145 150,125 150,114 84,134" fill="#1e293b" />

      {/* Book 2 */}
      <polygon points="40,110 104,92 152,107 88,126" fill="url(#lv-book-top)" stroke="#94a3b8" strokeOpacity="0.55" strokeWidth="1" />
      <polygon points="40,110 88,126 88,116 40,100" fill="#f1f5f9" opacity="0.9" />
      <polygon points="88,126 152,107 152,97 88,116" fill="#334155" />

      {/* Top tilted book */}
      <polygon points="44,91 106,74 150,89 88,107" fill="#334155" stroke="#94a3b8" strokeOpacity="0.65" strokeWidth="1.2" />
      <polygon points="44,91 88,107 88,97 44,82" fill="#f8fafc" opacity="0.92" />
      <polygon points="88,107 150,89 150,80 88,97" fill="#1e293b" />
    </svg>
  );
}

export function LandingStorySections() {
  const { lang } = useLanguage();
  const { config } = useCms();
  const ps = config.problemSolution;
  const [activeNodeId, setActiveNodeId] = useState<CmsLoopNode['id']>('learn');

  const activeNode = ps.loopNodes.find((n) => n.id === activeNodeId) ?? ps.loopNodes[0];

  return (
    <RevealSection id="problem-solution" className="py-8 sm:py-12">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Reference Split Problem -> Solution Glassmorphic Panel */}
        <div className="lv-glass-card relative overflow-hidden rounded-[26px] p-5 sm:p-7 lg:p-8">
          {/* Subtle Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-1/2 h-[320px] w-[320px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.16)_0%,rgba(135,59,255,0.12)_50%,transparent_75%)] blur-2xl"
          />

          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto_1.22fr] lg:gap-6">
            {/* LEFT ZONE: The Problem */}
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 text-[14px] font-bold text-rose-400">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  <span>{lang === 'bn' ? ps.problemEyebrowBn : ps.problemEyebrowEn}</span>
                </div>

                <h2 className="font-display mt-2.5 text-[24px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white sm:text-[28px]">
                  {lang === 'bn' ? ps.problemTitleBn : ps.problemTitleEn}
                </h2>

                <ul className="mt-5 space-y-3">
                  {ps.problemItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2.5 text-[14px] leading-snug text-[#dce7fc]"
                    >
                      <XCircle
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.45)]"
                        aria-hidden="true"
                      />
                      <span>{lang === 'bn' ? item.textBn : item.textEn}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mx-auto sm:mx-0">
                <BooksProblemIllustration />
              </div>
            </div>

            {/* CENTER NEON CHEVRON DIVIDER */}
            <div
              aria-hidden="true"
              className="hidden lg:flex flex-col items-center justify-center px-1"
            >
              <div className="h-20 w-[1px] bg-gradient-to-b from-transparent via-[#60a5fa]/35 to-transparent" />
              <span className="my-2 grid h-10 w-10 place-items-center rounded-full border border-[#00D9FF]/35 bg-[#087BFF]/15 text-[#00D9FF] shadow-[0_0_22px_rgba(0,217,255,0.4)]">
                <ChevronsRight className="h-5 w-5" />
              </span>
              <div className="h-20 w-[1px] bg-gradient-to-b from-transparent via-[#60a5fa]/35 to-transparent" />
            </div>

            {/* RIGHT ZONE: The LINGUAVERSE Solution + 5-Node Interactive Orbital Loop */}
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
              <div className="w-full min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 text-[14px] font-bold text-[#16E58B]">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  <span>{lang === 'bn' ? ps.solutionEyebrowBn : ps.solutionEyebrowEn}</span>
                </div>

                <h2 className="font-display mt-2.5 text-[23px] font-extrabold leading-[1.18] tracking-[-0.02em] text-white sm:text-[26px]">
                  {lang === 'bn' ? ps.solutionTitleBn : ps.solutionTitleEn}
                </h2>

                <ul className="mt-4 space-y-2.5">
                  {(lang === 'bn' ? ps.solutionPillarsBn : ps.solutionPillarsEn).map((pillar) => (
                    <li
                      key={pillar}
                      className="flex items-start gap-2.5 text-[13.5px] font-semibold text-[#e6efff]"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#16E58B] drop-shadow-[0_0_8px_rgba(22,229,139,0.45)]"
                        aria-hidden="true"
                      />
                      <span>{pillar}</span>
                    </li>
                  ))}
                </ul>

                {/* Active Loop Stage Micro-Explanation */}
                {activeNode && (
                  <div className="mt-4 rounded-xl border border-[#00D9FF]/25 bg-[#060E2B]/80 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#c6d7f5]">
                    <span className="font-bold text-[#00D9FF]">
                      {lang === 'bn' ? activeNode.labelBn : activeNode.labelEn}:
                    </span>{' '}
                    {lang === 'bn' ? activeNode.detailBn : activeNode.detailEn}
                  </div>
                )}
              </div>

              {/* Interactive 5-Node Circular Glowing Orbital Diagram */}
              <div
                className="relative h-[250px] w-[250px] shrink-0 sm:h-[268px] sm:w-[268px]"
                role="tablist"
                aria-label="Communication Improvement Loop stages"
              >
                {/* Luminous Gradient Orbital Ring SVG */}
                <svg
                  viewBox="0 0 240 240"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="lv-loop-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00D9FF" />
                      <stop offset="28%" stopColor="#16E58B" />
                      <stop offset="56%" stopColor="#FBBF24" />
                      <stop offset="80%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#E42BFF" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="120"
                    cy="120"
                    r="86"
                    fill="none"
                    stroke="url(#lv-loop-ring-grad)"
                    strokeWidth="3.5"
                    strokeDasharray="40 16"
                    strokeLinecap="round"
                    opacity="0.88"
                  />
                  <circle
                    cx="120"
                    cy="120"
                    r="64"
                    fill="rgba(7, 15, 45, 0.78)"
                    stroke="rgba(96, 165, 250, 0.25)"
                    strokeWidth="1"
                  />
                </svg>

                {/* Center Label */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
                  <span className="font-display text-[13px] font-extrabold leading-tight text-white">
                    {lang === 'bn'
                      ? 'কমিউনিকেশন উন্নয়ন চক্র'
                      : 'Communication Improvement Loop'}
                  </span>
                </div>

                {/* 5 Interactive Static-Positioned Glowing Circular Nodes */}
                {ps.loopNodes.map((node) => {
                  const pos = NODE_POSITIONS[node.id];
                  const style = NODE_STYLES[node.color];
                  const Icon = style.icon;
                  const isSelected = activeNode?.id === node.id;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setActiveNodeId(node.id)}
                      style={{ left: pos.left, top: pos.top }}
                      className={`group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D9FF]`}
                    >
                      <span
                        className={`grid h-12 w-12 place-items-center rounded-full border-2 bg-gradient-to-br text-white transition-transform duration-150 ${style.bg} ${style.border} ${style.glow} ${
                          isSelected ? 'scale-110 ring-2 ring-white/80' : 'group-hover:scale-105'
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="mt-1 rounded-md bg-[#05091F]/85 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                        {lang === 'bn' ? node.labelBn : node.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
