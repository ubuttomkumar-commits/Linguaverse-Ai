import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { AssessmentSkillKey, FiveSkillResultItem } from '../../types/domain';
import { getSkillDisplayName } from '../../domain/initialAssessmentEngine';

interface SkillProgressRingProps {
  item: FiveSkillResultItem;
  lang: 'en' | 'bn';
}

export function SkillProgressRing({ item, lang }: SkillProgressRingProps) {
  const prefersReduced = Boolean(useReducedMotion());
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  const isAssessed = item.status === 'assessed' && item.scorePercent !== null;
  const pct = isAssessed ? item.scorePercent ?? 0 : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const strokeStart =
    !isAssessed
      ? '#475569'
      : pct >= 75
        ? '#16E58B'
        : pct >= 50
          ? '#00D9FF'
          : '#F59E0B';
  const strokeEnd =
    !isAssessed
      ? '#334155'
      : pct >= 75
        ? '#00D9FF'
        : pct >= 50
          ? '#8B5CF6'
          : '#F43F5E';

  return (
    <div className="flex flex-col items-center rounded-xl border border-cyan-400/15 bg-[#08102B]/80 p-4 text-center">
      <div className="relative flex h-[86px] w-[86px] items-center justify-center">
        <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id={`${uid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={strokeStart} />
              <stop offset="100%" stopColor={strokeEnd} />
            </linearGradient>
          </defs>
          <circle
            cx="42"
            cy="42"
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth="7"
          />
          {isAssessed && (
            <motion.circle
              cx="42"
              cy="42"
              r={radius}
              fill="none"
              stroke={`url(#${uid}-ring)`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={prefersReduced ? false : { strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-base font-bold text-white tabular-nums">
            {isAssessed ? `${pct}%` : '—'}
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-sm font-semibold text-white">
        {getSkillDisplayName(item.skill, lang)}
      </p>
      <p className="mt-1 text-xs text-slate-400 tabular-nums">
        {isAssessed
          ? `${item.correctCount}/${item.totalCount} ${lang === 'bn' ? 'সঠিক' : 'evidence items'}`
          : item.status === 'unavailable'
            ? lang === 'bn'
              ? 'সার্ভিস অনুপলব্ধ'
              : 'Service unavailable'
            : lang === 'bn'
              ? 'এখনো মূল্যায়িত হয়নি'
              : 'Not assessed yet'}
      </p>
    </div>
  );
}

interface SkillRadarChartProps {
  skills: FiveSkillResultItem[];
  lang: 'en' | 'bn';
}

const SHORT_LABELS: Record<AssessmentSkillKey, { en: string; bn: string }> = {
  vocabulary: { en: 'Vocabulary', bn: 'শব্দভাণ্ডার' },
  grammar: { en: 'Grammar', bn: 'গ্রামার' },
  reading: { en: 'Reading', bn: 'রিডিং' },
  listening: { en: 'Listening', bn: 'লিসেনিং' },
  speaking: { en: 'Speaking', bn: 'স্পিকিং' },
};

export function SkillRadarChart({ skills, lang }: SkillRadarChartProps) {
  const prefersReduced = Boolean(useReducedMotion());
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  const cx = 175;
  const cy = 152;
  const maxR = 96;
  const levels = [0.25, 0.5, 0.75, 1];

  const getPoint = (index: number, fraction: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / skills.length;
    return {
      x: cx + Math.cos(angle) * maxR * fraction,
      y: cy + Math.sin(angle) * maxR * fraction,
    };
  };

  // Plot assessed skills accurately; unassessed skills stay at center (0) and are explicitly labeled "Not assessed"
  const polygonPoints = skills
    .map((item, idx) => {
      const frac =
        item.status === 'assessed' && item.scorePercent !== null
          ? Math.max(0.08, item.scorePercent / 100)
          : 0.04;
      const pt = getPoint(idx, frac);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 350 304"
        className="w-full max-w-[340px] overflow-visible"
        role="img"
        aria-label={
          lang === 'bn'
            ? '৫টি যোগাযোগ দক্ষতার রাডার চার্ট'
            : 'Five-skill Communication Profile radar chart'
        }
      >
        <defs>
          <linearGradient id={`${uid}-radar-area`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.46" />
            <stop offset="60%" stopColor="#6366F1" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#E42BFF" stopOpacity="0.42" />
          </linearGradient>
        </defs>

        {/* Concentric Pentagon Grid Levels */}
        {levels.map((lvl) => (
          <polygon
            key={lvl}
            points={skills
              .map((_, idx) => {
                const pt = getPoint(idx, lvl);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke="rgba(148, 163, 184, 0.22)"
            strokeWidth="1"
          />
        ))}

        {/* Radial Axes */}
        {skills.map((item, idx) => {
          const pt = getPoint(idx, 1);
          return (
            <line
              key={item.skill}
              x1={cx}
              y1={cy}
              x2={pt.x}
              y2={pt.y}
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth="1"
            />
          );
        })}

        {/* Observed Evidence Polygon */}
        <motion.polygon
          points={polygonPoints}
          fill={`url(#${uid}-radar-area)`}
          stroke="#00E5FF"
          strokeWidth="2.4"
          initial={prefersReduced ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Vertex Dots & Accessible Labels */}
        {skills.map((item, idx) => {
          const isAssessed = item.status === 'assessed' && item.scorePercent !== null;
          const frac = isAssessed ? Math.max(0.08, (item.scorePercent ?? 0) / 100) : 0.04;
          const pt = getPoint(idx, frac);
          const labelPt = getPoint(idx, 1.26);
          const label = lang === 'bn' ? SHORT_LABELS[item.skill].bn : SHORT_LABELS[item.skill].en;

          return (
            <g key={item.skill}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isAssessed ? 4.8 : 3.5}
                fill={isAssessed ? '#00E5FF' : '#64748B'}
                stroke="#05091F"
                strokeWidth="1.5"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                fill="#E2E8F0"
                fontSize="11.5"
                fontWeight="600"
              >
                {label}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 14}
                textAnchor="middle"
                fill={isAssessed ? '#7DD3FC' : '#94A3B8'}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {isAssessed
                  ? `${item.scorePercent}%`
                  : lang === 'bn'
                    ? 'মূল্যায়িত নয়'
                    : 'Not assessed'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
