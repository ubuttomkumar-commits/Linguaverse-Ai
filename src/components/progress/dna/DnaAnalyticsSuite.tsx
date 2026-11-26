import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Clock,
  GitCompareArrows,
  TrendingUp,
} from 'lucide-react';
import type {
  CommunicationDnaLabModel,
  DnaSkillId,
  DnaSkillNode,
  DnaTimeframe,
} from '../../../domain/communicationDnaLabEngine';
import { useLanguage } from '../../../i18n/LanguageContext';

interface DnaAnalyticsSuiteProps {
  model: CommunicationDnaLabModel;
  timeframe: DnaTimeframe;
  onChangeTimeframe: (tf: DnaTimeframe) => void;
  selectedSkillId: DnaSkillId;
  onSelectSkill: (id: DnaSkillId) => void;
}

const RADAR_AXIS_IDS: DnaSkillId[] = [
  'grammar',
  'vocabulary',
  'speaking',
  'listening',
  'reading',
  'writing',
  'sentence_complexity',
  'functional_communication',
];

function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  index: number,
  total: number
): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

export function DnaAnalyticsSuite({
  model,
  timeframe,
  onChangeTimeframe,
  selectedSkillId,
  onSelectSkill,
}: DnaAnalyticsSuiteProps) {
  const { lang } = useLanguage();
  const [comparePrevious, setComparePrevious] = useState(false);

  const radarSkills: DnaSkillNode[] = RADAR_AXIS_IDS.map(
    (id) => model.skills.find((s) => s.id === id)!
  ).filter(Boolean);

  const radarMeasuredCount = radarSkills.filter((s) => s.scorePercent !== null).length;
  const hasPreviousData = radarSkills.some((s) => s.previousPeriodScorePercent !== null);

  // Radar SVG geometry (generous horizontal margins so all 8 labels stay unclipped)
  const cx = 235;
  const cy = 185;
  const maxR = 112;

  const currentPolyPoints = radarSkills
    .map((skill, idx) => {
      const r = skill.scorePercent !== null ? (skill.scorePercent / 100) * maxR : 0;
      const pt = polarPoint(cx, cy, r, idx, radarSkills.length);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const prevPolyPoints = radarSkills
    .map((skill, idx) => {
      const val = skill.previousPeriodScorePercent;
      const r = val !== null ? (val / 100) * maxR : 0;
      const pt = polarPoint(cx, cy, r, idx, radarSkills.length);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const timeframeOptions: Array<{ id: DnaTimeframe; en: string; bn: string }> = [
    { id: '7d', en: '7 Days', bn: '৭ দিন' },
    { id: '30d', en: '30 Days', bn: '৩০ দিন' },
    { id: '90d', en: '90 Days', bn: '৯০ দিন' },
    { id: 'all', en: 'All Time', bn: 'সর্বকালীন' },
  ];

  // Trend chart SVG geometry
  const trendPoints = model.trendSeries.points;
  const tWidth = 520;
  const tHeight = 195;
  const tPadL = 36;
  const tPadR = 18;
  const tPadT = 18;
  const tPadB = 34;
  const plotW = tWidth - tPadL - tPadR;
  const plotH = tHeight - tPadT - tPadB;

  const mappedTrend = trendPoints.map((pt, idx) => {
    const x =
      trendPoints.length <= 1
        ? tPadL + plotW / 2
        : tPadL + (idx / (trendPoints.length - 1)) * plotW;
    const y = tPadT + (1 - pt.avgScorePercent / 100) * plotH;
    return { ...pt, x, y };
  });

  const trendLinePath = mappedTrend
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const trendAreaPath =
    mappedTrend.length >= 2
      ? `${trendLinePath} L ${mappedTrend[mappedTrend.length - 1].x.toFixed(1)} ${(tPadT + plotH).toFixed(1)} L ${mappedTrend[0].x.toFixed(1)} ${(tPadT + plotH).toFixed(1)} Z`
      : '';

  return (
    <section
      aria-label={
        lang === 'bn'
          ? 'কমিউনিকেশন রাডার ও অগ্রগতি বিশ্লেষণ'
          : 'Communication Radar and Growth Analytics'
      }
      className="space-y-6"
    >
      {/* Unified Header + Timeframe Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-300">
            {lang === 'bn'
              ? 'প্রমাণভিত্তিক অ্যানালিটিক্স · সময়কাল তুলনা'
              : 'Communication Intelligence Analytics'}
          </p>
          <h2 className="font-portal mt-1 text-xl font-bold text-white sm:text-2xl">
            {lang === 'bn'
              ? 'যোগাযোগ রাডার, বৃদ্ধির ধারা ও শক্তির বিশ্লেষণ'
              : 'Skill Radar, Growth Timeline & Evidence Balance'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={lang === 'bn' ? 'সময়কাল নির্বাচন করুন' : 'Select analysis timeframe'}
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#070E28] p-1"
          >
            {timeframeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeTimeframe(opt.id)}
                aria-pressed={timeframe === opt.id}
                data-testid={`dna-timeframe-${opt.id}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeframe === opt.id
                    ? 'bg-[#2864FF] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'bn' ? opt.bn : opt.en}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setComparePrevious((prev) => !prev)}
            aria-pressed={comparePrevious}
            data-testid="dna-compare-toggle"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              comparePrevious
                ? 'border-violet-400/60 bg-violet-500/20 text-violet-100'
                : 'border-slate-800 bg-[#070E28] text-slate-300 hover:border-slate-600 hover:text-white'
            }`}
          >
            <GitCompareArrows className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
            <span>{lang === 'bn' ? 'পূর্ববর্তী সময়কালের তুলনা' : 'Compare Prior Period'}</span>
          </button>
        </div>
      </div>

      {/* Primary Row: Interactive 8-Axis Radar + Growth Timeline & Evidence Distribution */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* 8-Axis Communication Radar */}
        <div className="rounded-2xl border border-cyan-400/20 bg-[#0A1334]/95 p-5 sm:p-6 xl:col-span-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800/80 pb-3.5">
            <div>
              <h3 className="font-portal text-base font-bold text-white">
                {lang === 'bn'
                  ? '৮-মাত্রার কমিউনিকেশন রাডার'
                  : '8-Axis Communication Intelligence Radar'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'যেকোনো মাত্রার বিন্দুতে ক্লিক করে উপরে বিস্তারিত প্রমাণ দেখুন।'
                  : 'Click any skill axis vertex to inspect its verified records. Unmeasured axes stay hollow.'}
              </p>
            </div>
            <span className="font-mono text-xs text-cyan-300 tabular-nums">
              {radarMeasuredCount}/8 {lang === 'bn' ? 'পরিমাপকৃত' : 'measured'}
            </span>
          </div>

          <div className="mt-3 flex flex-col items-center">
            <svg
              viewBox="0 0 470 370"
              role="img"
              aria-label={
                lang === 'bn'
                  ? '৮টি যোগাযোগ দক্ষতার রাডার চার্ট'
                  : '8-axis communication intelligence radar chart'
              }
              className="h-auto w-full max-w-[460px]"
            >
              <defs>
                <linearGradient id="dnaRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#8050FF" stopOpacity="0.24" />
                </linearGradient>
              </defs>

              {/* Concentric Octagon Grid (25%, 50%, 75%, 100%) */}
              {[0.25, 0.5, 0.75, 1].map((level) => {
                const pts = radarSkills
                  .map((_, idx) => {
                    const p = polarPoint(cx, cy, maxR * level, idx, radarSkills.length);
                    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={level}
                    points={pts}
                    fill="none"
                    stroke={level === 1 ? 'rgba(56, 189, 248, 0.28)' : 'rgba(148, 163, 184, 0.14)'}
                    strokeWidth="1"
                  />
                );
              })}

              {/* Radial Spokes */}
              {radarSkills.map((skill, idx) => {
                const end = polarPoint(cx, cy, maxR, idx, radarSkills.length);
                return (
                  <line
                    key={`axis_${skill.id}`}
                    x1={cx}
                    y1={cy}
                    x2={end.x}
                    y2={end.y}
                    stroke="rgba(148, 163, 184, 0.16)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Prior Period Comparison Polygon */}
              {comparePrevious && hasPreviousData && (
                <polygon
                  points={prevPolyPoints}
                  fill="rgba(180, 77, 255, 0.14)"
                  stroke="#B44DFF"
                  strokeWidth="1.75"
                  strokeDasharray="5 4"
                />
              )}

              {/* Current Measured Polygon (only rendered when >= 2 radar dimensions have real scores) */}
              {radarMeasuredCount >= 2 && (
                <polygon
                  points={currentPolyPoints}
                  fill="url(#dnaRadarFill)"
                  stroke="#00D9FF"
                  strokeWidth="2.2"
                />
              )}

              {/* Clickable Axis Vertices & Crisp Labels */}
              {radarSkills.map((skill, idx) => {
                const isMeasured = skill.scorePercent !== null;
                const r = isMeasured ? (skill.scorePercent! / 100) * maxR : 14;
                const pt = polarPoint(cx, cy, r, idx, radarSkills.length);
                const labelPt = polarPoint(cx, cy, maxR + 24, idx, radarSkills.length);
                const isSelected = skill.id === selectedSkillId;
                const anchor =
                  labelPt.x < cx - 18 ? 'end' : labelPt.x > cx + 18 ? 'start' : 'middle';

                return (
                  <g
                    key={`vertex_${skill.id}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${lang === 'bn' ? skill.titleBn : skill.titleEn}: ${
                      isMeasured
                        ? `${skill.scorePercent}%`
                        : lang === 'bn'
                          ? 'অপরিমাপকৃত'
                          : 'Unmeasured'
                    }`}
                    onClick={() => onSelectSkill(skill.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectSkill(skill.id);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 7.5 : 5.5}
                      fill={isMeasured ? (isSelected ? '#FFFFFF' : '#00D9FF') : '#0A1334'}
                      stroke={isMeasured ? '#00D9FF' : '#64748B'}
                      strokeWidth={isSelected ? 2.5 : 1.75}
                    />
                    <text
                      x={labelPt.x}
                      y={labelPt.y - 3}
                      textAnchor={anchor}
                      fill={isSelected ? '#FFFFFF' : '#CBD5E1'}
                      fontSize="11"
                      fontWeight={isSelected ? '700' : '600'}
                    >
                      {lang === 'bn' ? skill.shortLabelBn : skill.shortLabelEn}
                    </text>
                    <text
                      x={labelPt.x}
                      y={labelPt.y + 11}
                      textAnchor={anchor}
                      fill={isMeasured ? '#67E8F9' : '#64748B'}
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {isMeasured ? `${skill.scorePercent}%` : '—'}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend + Honest Historical Comparison Notice */}
            <div className="mt-2 flex w-full flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#00D9FF]" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'বর্তমান সময়কাল' : 'Current Window'}</span>
                </span>
                {comparePrevious && (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-dashed border-[#B44DFF] bg-[#B44DFF]/25"
                      aria-hidden="true"
                    />
                    <span>{lang === 'bn' ? 'পূর্ববর্তী সময়কাল' : 'Prior Period'}</span>
                  </span>
                )}
              </div>

              {comparePrevious && !hasPreviousData && (
                <span className="text-[11px] text-amber-300">
                  {timeframe === 'all'
                    ? lang === 'bn'
                      ? 'তুলনার জন্য ৭/৩০/৯০ দিন নির্বাচন করুন।'
                      : 'Switch to 7D, 30D, or 90D to compare prior periods.'
                    : lang === 'bn'
                      ? 'পূর্ববর্তী সময়কালে পর্যাপ্ত নমুনা নেই।'
                      : 'Not enough prior-period samples for overlay.'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Stack: Communication Growth Timeline + Evidence Source Distribution */}
        <div className="flex flex-col gap-6 xl:col-span-6">
          {/* Growth Timeline */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800/80 pb-3.5">
              <div>
                <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
                  <TrendingUp className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>
                    {lang === 'bn'
                      ? 'সময়ের সাথে যোগাযোগের অগ্রগতি'
                      : 'Communication Growth Timeline'}
                  </span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'সক্রিয় অনুশীলনের দিনগুলোতে গড় প্রমাণ-ভিত্তিক স্কোর।'
                    : 'Verified daily average performance across recorded sessions.'}
                </p>
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {trendPoints.length}{' '}
                {lang === 'bn'
                  ? 'সক্রিয় দিন'
                  : trendPoints.length === 1
                    ? 'active day'
                    : 'active days'}
              </span>
            </div>

            {model.trendSeries.hasSufficientData ? (
              <div className="mt-4 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${tWidth} ${tHeight}`}
                  role="img"
                  aria-label={
                    lang === 'bn'
                      ? 'সময়ের সাথে যোগাযোগ দক্ষতার অগ্রগতি চার্ট'
                      : 'Communication growth timeline chart'
                  }
                  className="h-auto w-full min-w-[320px]"
                >
                  <defs>
                    <linearGradient id="dnaTrendArea" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.34" />
                      <stop offset="100%" stopColor="#2864FF" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = tPadT + (1 - tick / 100) * plotH;
                    return (
                      <g key={tick}>
                        <line
                          x1={tPadL}
                          y1={y}
                          x2={tWidth - tPadR}
                          y2={y}
                          stroke="rgba(148, 163, 184, 0.14)"
                          strokeWidth="1"
                        />
                        <text
                          x={tPadL - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          fill="#64748B"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {tick}%
                        </text>
                      </g>
                    );
                  })}

                  <path d={trendAreaPath} fill="url(#dnaTrendArea)" />
                  <path
                    d={trendLinePath}
                    fill="none"
                    stroke="#00D9FF"
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {mappedTrend.map((pt, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === mappedTrend.length - 1;
                    const step = Math.max(1, Math.ceil(mappedTrend.length / 5));
                    const lastPt = mappedTrend[mappedTrend.length - 1];
                    const tooCloseToLast = !isLast && lastPt.x - pt.x < 56;
                    const showTick =
                      isFirst ||
                      isLast ||
                      (!tooCloseToLast && (mappedTrend.length <= 5 || idx % step === 0));
                    return (
                      <g key={pt.dateKey}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4.2"
                          fill="#0A1334"
                          stroke="#00D9FF"
                          strokeWidth="2"
                        />
                        {showTick && (
                          <text
                            x={pt.x}
                            y={tHeight - 10}
                            textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
                            fill="#94A3B8"
                            fontSize="10"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {lang === 'bn' ? pt.labelBn : pt.labelEn}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#060C24] p-5 text-center">
                <Clock className="mx-auto h-5 w-5 text-slate-500" aria-hidden="true" />
                <p className="mt-2 text-xs font-semibold text-slate-200">
                  {lang === 'bn'
                    ? 'ধারার গ্রাফ দেখতে অন্তত ২টি ভিন্ন দিনে অনুশীলন প্রয়োজন'
                    : 'Complete practice on at least 2 different days to plot your growth trend'}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'কোনো কাল্পনিক ইতিহাস বা অনুমানকৃত ট্রেন্ড লাইন তৈরি করা হয় না।'
                    : 'No synthetic baseline curves or interpolated history are ever fabricated.'}
                </p>
              </div>
            )}
          </div>

          {/* Evidence Source Distribution */}
          <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800/80 pb-3.5">
              <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
                <BarChart2 className="h-4 w-4 text-violet-400" aria-hidden="true" />
                <span>
                  {lang === 'bn' ? 'প্রমাণের উৎস বিভাজন' : 'Evidence Source Distribution'}
                </span>
              </h3>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {model.totalVerifiedSamples}{' '}
                {lang === 'bn' ? 'মোট নমুনা' : 'verified samples'}
              </span>
            </div>

            {model.totalVerifiedSamples > 0 ? (
              <div className="mt-4 space-y-3">
                {model.evidenceDistribution.map((src) => (
                  <div key={src.source}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-200">
                        {lang === 'bn' ? src.labelBn : src.labelEn}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {src.sampleCount} ({src.sharePercent}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#05091F]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${src.sharePercent}%`,
                          backgroundColor: src.colorHex,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-relaxed text-slate-400">
                {lang === 'bn'
                  ? 'ডায়াগনস্টিক, একাডেমি, স্পিকিং স্টুডিও বা ট্রান্সফার ল্যাব সম্পন্ন করলে এখানে উৎস-ভিত্তিক বিভাজন দেখা যাবে।'
                  : 'Complete a Diagnostic check, Academy lesson, Speaking Studio session, or Transfer Lab drill to populate source coverage.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Strengths vs Growth Opportunities Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Verified Strengths */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6 lg:col-span-5">
          <div className="border-b border-slate-800/80 pb-3.5">
            <h3 className="font-portal text-base font-bold text-white">
              {lang === 'bn' ? 'প্রমাণিত যোগাযোগ শক্তি' : 'Verified Communication Strengths'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {lang === 'bn'
                ? 'ন্যূনতম ৩টি যাচাইকৃত নমুনায় শক্তিশালী স্কোর অর্জিত দক্ষতাগুলো।'
                : 'Skills with verified strong performance across 3+ assessment samples.'}
            </p>
          </div>

          {model.strengths.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-800/70">
              {model.strengths.map((str) => (
                <li key={str.skillId} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectSkill(str.skillId)}
                      className="text-left text-sm font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {lang === 'bn' ? str.titleBn : str.titleEn}
                    </button>
                    <span className="font-mono text-base font-bold text-[#00D9FF] tabular-nums">
                      {str.scorePercent}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {lang === 'bn' ? str.supportingEvidenceBn : str.supportingEvidenceEn}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-500 tabular-nums">
                    <CheckCircle2 className="h-3 w-3 text-cyan-400" aria-hidden="true" />
                    <span>{lang === 'bn' ? str.coverageLabelBn : str.coverageLabelEn}</span>
                    <span aria-hidden="true">·</span>
                    <span>{lang === 'bn' ? str.dateRangeBn : str.dateRangeEn}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-slate-800/80 bg-[#060C24] p-4 text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'এখনো কোনো দক্ষতা ৭২%+ যাচাইকৃত শক্তির মানদণ্ডে পৌঁছায়নি। প্রথম কয়েকটি লেসন বা স্পিকিং সেশন সম্পন্ন করুন।'
                : 'No skill has reached the verified strength threshold (72%+ across 3+ samples) yet. Complete an assessment or guided lesson to unlock strengths.'}
            </div>
          )}
        </div>

        {/* Priority Growth Opportunities */}
        <div className="rounded-2xl border border-cyan-400/20 bg-[#0A1334]/95 p-5 sm:p-6 lg:col-span-7">
          <div className="border-b border-slate-800/80 pb-3.5">
            <h3 className="font-portal text-base font-bold text-white">
              {lang === 'bn'
                ? 'অগ্রাধিকারভিত্তিক উন্নতির সুযোগ ও পরবর্তী পদক্ষেপ'
                : 'Priority Growth Opportunities & Next Practice'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {lang === 'bn'
                ? 'প্রতিটি সুপারিশ আপনার বাস্তব দুর্বলতা বা অপরিমাপকৃত দক্ষতার সাথে সরাসরি সংযুক্ত।'
                : 'Every recommendation links directly to an observed gap, recurring mistake, or unmeasured core skill.'}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {model.growthOpportunities.map((opp, idx) => (
              <div
                key={opp.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#060C24] p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-slate-400">
                    <span>
                      {lang === 'bn' ? `ধাপ ০${idx + 1}` : `Priority 0${idx + 1}`} ·{' '}
                      <span
                        className={
                          opp.priority === 'high'
                            ? 'text-amber-400'
                            : opp.priority === 'medium'
                              ? 'text-violet-300'
                              : 'text-cyan-300'
                        }
                      >
                        {lang === 'bn' ? opp.difficultyLabelBn : opp.difficultyLabelEn}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      ~{opp.expectedDurationMinutes}m
                    </span>
                  </div>

                  <h4 className="mt-1.5 text-sm font-bold text-white">
                    {lang === 'bn' ? opp.weaknessBn : opp.weaknessEn}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {lang === 'bn' ? opp.supportingEvidenceBn : opp.supportingEvidenceEn}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                    {lang === 'bn' ? opp.completionCriteriaBn : opp.completionCriteriaEn}
                  </p>
                </div>

                <div className="mt-4 pt-2">
                  <Link
                    to={opp.routeTo}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200"
                  >
                    <span>
                      {lang === 'bn' ? opp.recommendedExerciseBn : opp.recommendedExerciseEn}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
