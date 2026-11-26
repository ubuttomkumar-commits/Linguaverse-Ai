import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Repeat2,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type {
  CategoryDonutSegment,
  ExtendedMistakeCategory,
  MistakeMemoryOverview,
  MistakeTrendSeries,
  NeuralGraphNode,
  NeuralRelationshipGraph,
} from '../../domain/mistakeAnalyticsEngine';
import type { MistakeMemoryItem } from '../../types/domain';

interface MistakeAnalyticsVisualsProps {
  overview: MistakeMemoryOverview;
  donut: { total: number; segments: CategoryDonutSegment[] };
  trend7d: MistakeTrendSeries;
  trend30d: MistakeTrendSeries;
  neuralGraph: NeuralRelationshipGraph;
  mistakes: MistakeMemoryItem[];
  selectedCategory: 'all' | ExtendedMistakeCategory;
  onSelectCategory: (cat: 'all' | ExtendedMistakeCategory) => void;
  onPracticeMistake: (mistakeId: string) => void;
  onAskCoachAboutMistake: (mistake: MistakeMemoryItem) => void;
}

function MiniSparkline({
  values,
  strokeColor,
  gradientId,
}: {
  values: number[];
  strokeColor: string;
  gradientId: string;
}) {
  const width = 92;
  const height = 34;
  const maxVal = Math.max(1, ...values);
  const points = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * width : width / 2;
    const y = height - 4 - (v / maxVal) * (height - 10);
    return { x, y };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="h-9 w-[92px] shrink-0 overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.34" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2.8"
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

export function MistakeAnalyticsVisuals({
  overview,
  donut,
  trend7d,
  trend30d,
  neuralGraph,
  mistakes,
  selectedCategory,
  onSelectCategory,
  onPracticeMistake,
  onAskCoachAboutMistake,
}: MistakeAnalyticsVisualsProps) {
  const { lang } = useLanguage();
  const [trendRange, setTrendRange] = useState<7 | 30>(7);
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const activeTrend = trendRange === 7 ? trend7d : trend30d;

  const selectedGraphNode: NeuralGraphNode | null = useMemo(
    () => neuralGraph.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [neuralGraph.nodes, selectedNodeId]
  );

  const selectedGraphMistake: MistakeMemoryItem | null = useMemo(() => {
    if (!selectedGraphNode?.mistakeId) return null;
    return mistakes.find((m) => m.id === selectedGraphNode.mistakeId) ?? null;
  }, [mistakes, selectedGraphNode]);

  // SVG Donut geometry
  const donutRadius = 62;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let cumulativeRatio = 0;
  const donutArcs = donut.segments.map((seg) => {
    const ratio = donut.total > 0 ? seg.count / donut.total : 0;
    const strokeLength = Math.max(0, ratio * donutCircumference - 3);
    const offset = -cumulativeRatio * donutCircumference;
    cumulativeRatio += ratio;
    return {
      ...seg,
      strokeDasharray: `${strokeLength.toFixed(2)} ${donutCircumference.toFixed(2)}`,
      strokeDashoffset: offset.toFixed(2),
    };
  });

  // Improvement radial ring geometry
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringPercent = overview.improvementRatePercent ?? 0;
  const ringOffset = ringCircumference * (1 - ringPercent / 100);

  // Weekly trend chart coordinates
  const chartW = 460;
  const chartH = 165;
  const padX = 22;
  const padTop = 18;
  const padBottom = 28;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padTop - padBottom;
  const yCeiling = Math.max(2, activeTrend.maxValue);

  const trendCoords = activeTrend.points.map((pt, idx) => {
    const x =
      activeTrend.points.length > 1
        ? padX + (idx / (activeTrend.points.length - 1)) * plotW
        : padX + plotW / 2;
    const yLogged = padTop + plotH - (pt.mistakesLogged / yCeiling) * plotH;
    const yPassed = padTop + plotH - (pt.repairsPassed / yCeiling) * plotH;
    return { ...pt, x, yLogged, yPassed };
  });

  const loggedPath = trendCoords
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yLogged.toFixed(1)}`)
    .join(' ');
  const passedPath = trendCoords
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yPassed.toFixed(1)}`)
    .join(' ');
  const loggedArea =
    trendCoords.length > 0
      ? `${loggedPath} L ${trendCoords[trendCoords.length - 1].x.toFixed(1)} ${(
          padTop + plotH
        ).toFixed(1)} L ${trendCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const hoveredPoint =
    hoveredDayIndex !== null ? trendCoords[hoveredDayIndex] ?? null : null;

  const nodeLookup = useMemo(() => {
    const map = new Map<string, NeuralGraphNode>();
    for (const n of neuralGraph.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [neuralGraph.nodes]);

  const kpiCards = [
    {
      id: 'total',
      labelEn: 'Total Mistakes',
      labelBn: 'মোট ভুলের ধরন',
      value: overview.totalValid,
      subEn: `${overview.totalOccurrences} total observations`,
      subBn: `${overview.totalOccurrences} বার শনাক্ত হয়েছে`,
      color: '#00D9FF',
      icon: Activity,
      sparkline: overview.sparklines.totalLogged,
    },
    {
      id: 'recurring',
      labelEn: 'Recurring Habits',
      labelBn: 'পুনরাবৃত্ত ভুল',
      value: overview.recurringCount,
      subEn: 'Observed 2+ times',
      subBn: '২+ বার পুনরাবৃত্তি হয়েছে',
      color: '#E42BFF',
      icon: Repeat2,
      sparkline: overview.sparklines.recurringActive,
    },
    {
      id: 'practicing',
      labelEn: 'Practicing',
      labelBn: 'অনুশীলনরত',
      value: overview.practicingCount,
      subEn: `${overview.totalDrillsCompleted} repair drills logged`,
      subBn: `${overview.totalDrillsCompleted}টি রিপিয়ার ড্রিল সম্পন্ন`,
      color: '#F59E0B',
      icon: AlertTriangle,
      sparkline: overview.sparklines.drillsPracticed,
    },
    {
      id: 'resolved',
      labelEn: 'Improved',
      labelBn: 'সমাধান হয়েছে',
      value: overview.resolvedCount,
      subEn: `${overview.passedDrillsCount} verified passes`,
      subBn: `${overview.passedDrillsCount}টি সফল যাচাই`,
      color: '#16E58B',
      icon: CheckCircle2,
      sparkline: overview.sparklines.repairsPassed,
    },
  ];

  return (
    <section aria-label="Mistake Memory Analytics" className="space-y-6">
      {/* 4 Glassmorphic KPI Sparkline Cards */}
      <div
        data-testid="mistake-kpi-grid"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="lv-glass-card lv-glow-card-hover flex items-center justify-between gap-3 rounded-2xl p-4 sm:p-5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: card.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{lang === 'bn' ? card.labelBn : card.labelEn}</span>
                </div>
                <p
                  className="mt-2 font-mono text-2xl font-extrabold text-white tabular-nums sm:text-3xl"
                  data-testid={`kpi-${card.id}`}
                >
                  {card.value}
                </p>
                <p className="mt-1 truncate text-[11px] text-slate-400">
                  {lang === 'bn' ? card.subBn : card.subEn}
                </p>
              </div>
              <MiniSparkline
                values={card.sparkline}
                strokeColor={card.color}
                gradientId={`spark-${card.id}`}
              />
            </div>
          );
        })}
      </div>

      {/* Bento Row: Mistake Overview & Weekly Trend (Left 7 cols) + Category Donut (Right 5 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: Improvement Ring + Weekly Trend Graph */}
        <div className="lv-glass-card rounded-2xl p-5 sm:p-6 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
                <TrendingUp className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                <span>
                  {lang === 'bn' ? 'ভুল সংশোধন ও অগ্রগতির গ্রাফ' : 'Your Mistake Overview & Trend'}
                </span>
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'বাস্তব সংরক্ষিত ভুল বনাম সফল সংশোধন ড্রিলের তুলনা'
                  : 'Real recorded mistakes compared against passed repair drills'}
              </p>
            </div>

            <div
              role="group"
              aria-label="Trend timeframe"
              className="inline-flex items-center rounded-xl border border-slate-800 bg-[#060C22] p-1 text-xs"
            >
              {([7, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={trendRange === days}
                  onClick={() => {
                    setTrendRange(days);
                    setHoveredDayIndex(null);
                  }}
                  className={`rounded-lg px-3 py-1 font-mono font-semibold transition-colors cursor-pointer ${
                    trendRange === days
                      ? 'bg-[#087BFF] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 items-center gap-5 md:grid-cols-12">
            {/* Radial Improvement Rate Ring */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-400/15 bg-[#060C22]/85 p-4 md:col-span-4">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg viewBox="0 0 112 112" className="h-28 w-28 -rotate-90" aria-hidden="true">
                  <defs>
                    <linearGradient id="improveRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00D9FF" />
                      <stop offset="55%" stopColor="#873BFF" />
                      <stop offset="100%" stopColor="#16E58B" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="56"
                    cy="56"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(148,163,184,0.16)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#improveRingGrad)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span
                    data-testid="improvement-rate-value"
                    className="font-mono text-2xl font-extrabold text-white tabular-nums"
                  >
                    {overview.improvementRatePercent !== null
                      ? `${overview.improvementRatePercent}%`
                      : '—'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {lang === 'bn' ? 'উন্নতি সূচক' : 'Recovery'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] leading-snug text-slate-400">
                {overview.totalValid === 0
                  ? lang === 'bn'
                    ? 'ভুল শনাক্ত হলে সূচক সক্রিয় হবে'
                    : 'Activates once patterns are tracked'
                  : lang === 'bn'
                    ? `${overview.resolvedCount}টি সম্পূর্ণ সমাধান · ${overview.practicingCount}টি অনুশীলনরত`
                    : `${overview.resolvedCount} resolved · ${overview.practicingCount} practicing`}
              </p>
            </div>

            {/* Dual-Line SVG Weekly/30D Trend Chart */}
            <div className="md:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#00D9FF]" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'শনাক্তকৃত ভুল' : 'Mistakes Logged'} (
                      <span className="font-mono tabular-nums">{activeTrend.totalLoggedInRange}</span>
                      )
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#16E58B]" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'সফল সংশোধন' : 'Repairs Passed'} (
                      <span className="font-mono tabular-nums">
                        {activeTrend.totalRepairsPassedInRange}
                      </span>
                      )
                    </span>
                  </span>
                </div>
                {hoveredPoint && (
                  <span className="font-mono text-[11px] text-cyan-200 tabular-nums">
                    {hoveredPoint.fullLabel}: {hoveredPoint.mistakesLogged} logged /{' '}
                    {hoveredPoint.repairsPassed} fixed
                  </span>
                )}
              </div>

              <div className="mt-2 overflow-hidden rounded-xl border border-slate-800/80 bg-[#060C22]/80 p-2">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  role="img"
                  aria-label={
                    lang === 'bn'
                      ? `${trendRange} দিনের ভুল ও সংশোধন ট্রেন্ড চার্ট`
                      : `${trendRange}-day mistakes logged vs repairs passed trend chart`
                  }
                  className="h-44 w-full"
                >
                  <defs>
                    <linearGradient id="trendLoggedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#00D9FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Reference Lines */}
                  {[0, 0.5, 1].map((frac) => {
                    const y = padTop + plotH * (1 - frac);
                    return (
                      <line
                        key={frac}
                        x1={padX}
                        y1={y}
                        x2={chartW - padX}
                        y2={y}
                        stroke="rgba(148,163,184,0.14)"
                        strokeDasharray="3 4"
                      />
                    );
                  })}

                  {/* Area + Dual Series */}
                  {loggedArea && <path d={loggedArea} fill="url(#trendLoggedFill)" />}
                  {loggedPath && (
                    <path
                      d={loggedPath}
                      fill="none"
                      stroke="#00D9FF"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {passedPath && (
                    <path
                      d={passedPath}
                      fill="none"
                      stroke="#16E58B"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Data Points & X-Axis Labels */}
                  {trendCoords.map((pt, idx) => {
                    const showLabel =
                      trendRange === 7 || idx % 5 === 0 || idx === trendCoords.length - 1;
                    const isActive = hoveredDayIndex === idx;
                    return (
                      <g
                        key={pt.dayKey}
                        onMouseEnter={() => setHoveredDayIndex(idx)}
                        onMouseLeave={() => setHoveredDayIndex(null)}
                        onClick={() => setHoveredDayIndex(idx)}
                        className="cursor-pointer"
                      >
                        {isActive && (
                          <line
                            x1={pt.x}
                            y1={padTop}
                            x2={pt.x}
                            y2={padTop + plotH}
                            stroke="rgba(0,217,255,0.4)"
                            strokeWidth="1"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.yLogged}
                          r={isActive ? 5 : pt.mistakesLogged > 0 ? 3.5 : 2}
                          fill="#00D9FF"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.yPassed}
                          r={isActive ? 5 : pt.repairsPassed > 0 ? 3.5 : 2}
                          fill="#16E58B"
                        />
                        {showLabel && (
                          <text
                            x={pt.x}
                            y={chartH - 8}
                            textAnchor="middle"
                            fill="#94A3B8"
                            fontSize="10"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {pt.axisLabel}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {!activeTrend.hasSufficientTrendData && (
                <p className="mt-2 text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'বহু-দিনের ট্রেন্ড তুলনার জন্য অন্তত ২টি ভিন্ন দিনে অনুশীলন প্রয়োজন — কোনো কাল্পনিক ডেটা দেখানো হচ্ছে না।'
                    : 'Practice across 2+ distinct days to unlock multi-day trend comparison — zero synthetic data is fabricated.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Interactive Mistake Category Donut Chart */}
        <div className="lv-glass-card rounded-2xl p-5 sm:p-6 xl:col-span-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-portal text-base font-bold text-white">
                {lang === 'bn' ? 'ভুলের ধরন বিশ্লেষণ' : 'Mistake Categories'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'ফিল্টার করতে যেকোনো ক্যাটাগরিতে ক্লিক করুন'
                  : 'Click any category to filter your records'}
              </p>
            </div>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 cursor-pointer"
              >
                {lang === 'bn' ? 'সব দেখুন' : 'Reset'}
              </button>
            )}
          </div>

          {donut.total === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-[#060C22]/75 px-4 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-cyan-400/35 text-slate-400">
                <span className="font-mono text-lg font-bold tabular-nums">0</span>
              </div>
              <p className="mt-3 text-xs font-medium text-slate-300">
                {lang === 'bn'
                  ? 'এখনো কোনো ক্যাটাগরি বিভাজন তৈরি হয়নি'
                  : 'No category breakdown recorded yet'}
              </p>
              <p className="mt-1 max-w-xs text-[11px] text-slate-400">
                {lang === 'bn'
                  ? 'ব্যাকরণ, শব্দভাণ্ডার, বাক্য গঠন বা উচ্চারণের ভুল ধরা পড়লে এখানে ডোনাট চার্ট আপডেট হবে।'
                  : 'Complete a Diagnostic, Academy exercise, or Speaking turn to map Grammar, Vocabulary, Structure, and Clarity.'}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
              <div className="relative flex items-center justify-center sm:col-span-5">
                <svg
                  viewBox="0 0 160 160"
                  role="img"
                  aria-label={
                    lang === 'bn'
                      ? 'ভুলের ক্যাটাগরি ডোনাট চার্ট'
                      : 'Mistake categories distribution donut chart'
                  }
                  className="h-40 w-40 -rotate-90"
                >
                  <circle
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="none"
                    stroke="rgba(148,163,184,0.14)"
                    strokeWidth="16"
                  />
                  {donutArcs.map((arc) => {
                    const isSelected = selectedCategory === arc.id;
                    return (
                      <circle
                        key={arc.id}
                        cx="80"
                        cy="80"
                        r={donutRadius}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={isSelected ? 20 : 16}
                        strokeDasharray={arc.strokeDasharray}
                        strokeDashoffset={arc.strokeDashoffset}
                        strokeLinecap="butt"
                        opacity={
                          selectedCategory === 'all' || isSelected ? 1 : 0.35
                        }
                        onClick={() =>
                          onSelectCategory(isSelected ? 'all' : arc.id)
                        }
                        className="cursor-pointer transition-all"
                      />
                    );
                  })}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-2xl font-extrabold text-white tabular-nums">
                    {donut.total}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'bn' ? 'ধরন' : 'Patterns'}
                  </span>
                </div>
              </div>

              <ul className="space-y-2 sm:col-span-7">
                {donut.segments.map((seg) => {
                  const isSelected = selectedCategory === seg.id;
                  return (
                    <li key={seg.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          onSelectCategory(isSelected ? 'all' : seg.id)
                        }
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-cyan-400/60 bg-cyan-400/10 text-white'
                            : 'border-slate-800/80 bg-[#060C22]/75 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: seg.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate font-medium">
                            {lang === 'bn' ? seg.labelBn : seg.shortLabelEn}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-200 tabular-nums">
                          {seg.count} ({seg.percent}%)
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Full-Width Interactive Neural Memory Network / Mistake Relationship Map */}
      <div
        data-testid="neural-relationship-map"
        className="lv-glass-card rounded-2xl p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
              <GitBranch className="h-4 w-4 text-[#873BFF]" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'নিউরাল মেমোরি নেটওয়ার্ক · ভুলের সম্পর্ক মানচিত্র'
                  : 'Neural Memory Network — Mistake Relationship Map'}
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {neuralGraph.isEmpty
                ? lang === 'bn'
                  ? 'আপনার বাস্তব ভুল শনাক্ত হলে কীভাবে ক্যাটাগরি ও বাংলা-টু-ইংরেজি ট্রান্সফার প্যাটার্ন যুক্ত হয় তা নিচে দেখানো হয়েছে।'
                  : 'Blueprint preview: once mistakes are captured, live synaptic paths link your core memory, categories, Bangla-L1 transfer links, and top recurring patterns.'
                : lang === 'bn'
                  ? 'যেকোনো নোডে ক্লিক করে সংশ্লিষ্ট ক্যাটাগরি ফিল্টার করুন বা সাথে সাথে সংশোধন অনুশীলন শুরু করুন।'
                  : 'Click any glowing category or recurring mistake node to inspect Bangla-L1 links, filter history, or launch targeted practice.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#00D9FF]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'কোর / ক্যাটাগরি' : 'Core & Category'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#E42BFF]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'পুনরাবৃত্ত (২+)' : 'Recurring (2+)'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#16E58B]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'সমাধানকৃত' : 'Resolved'}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-cyan-400/15 bg-[#050A21]/90 p-2 sm:p-3">
          <svg
            viewBox="0 0 800 360"
            role="img"
            aria-label={
              lang === 'bn'
                ? 'ইন্টারেক্টিভ নিউরাল ভুল সম্পর্ক গ্রাফ'
                : 'Interactive neural mistake relationship graph'
            }
            className="h-[250px] w-full min-w-[600px] sm:h-[310px]"
          >
            <defs>
              <filter id="graphNodeGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Curved Synaptic Edges */}
            {neuralGraph.edges.map((edge) => {
              const from = nodeLookup.get(edge.fromId);
              const to = nodeLookup.get(edge.toId);
              if (!from || !to) return null;

              const isHighlighted =
                !selectedNodeId ||
                selectedNodeId === edge.fromId ||
                selectedNodeId === edge.toId;

              if (edge.kind === 'transfer_link') {
                const midX = Math.min(from.x, to.x) - 46;
                const midY = (from.y + to.y) / 2;
                return (
                  <path
                    key={edge.id}
                    d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                    fill="none"
                    stroke={edge.color}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity={isHighlighted ? 0.65 : 0.14}
                  />
                );
              }

              const c1x = from.x + (to.x - from.x) * 0.45;
              const c2x = from.x + (to.x - from.x) * 0.65;
              return (
                <path
                  key={edge.id}
                  d={`M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={edge.kind === 'primary' ? 2.2 : 1.8}
                  opacity={
                    neuralGraph.isEmpty
                      ? 0.28
                      : isHighlighted
                        ? 0.45 + edge.strength * 0.45
                        : 0.14
                  }
                />
              );
            })}

            {/* Interactive Memory Nodes */}
            {neuralGraph.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const label = lang === 'bn' ? node.labelBn : node.labelEn;
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${label} (${node.count})`}
                  onClick={() => {
                    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
                    if (node.kind === 'category' && node.categoryId && !neuralGraph.isEmpty) {
                      onSelectCategory(node.categoryId);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
                      if (node.kind === 'category' && node.categoryId && !neuralGraph.isEmpty) {
                        onSelectCategory(node.categoryId);
                      }
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.radius + 7}
                      fill="none"
                      stroke="#00D9FF"
                      strokeWidth="2"
                      opacity="0.85"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius}
                    fill="#08112E"
                    stroke={node.color}
                    strokeWidth={node.kind === 'core' ? 3 : 2.2}
                    filter="url(#graphNodeGlow)"
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={node.kind === 'core' ? '14' : '11'}
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {node.kind === 'mistake' ? `${node.count}x` : node.count}
                  </text>
                  <text
                    x={node.kind === 'mistake' ? node.x + node.radius + 10 : node.x}
                    y={
                      node.kind === 'mistake'
                        ? node.y + 4
                        : node.y + node.radius + 16
                    }
                    textAnchor={node.kind === 'mistake' ? 'start' : 'middle'}
                    fill={isSelected ? '#FFFFFF' : '#CBD5E1'}
                    fontSize="11"
                    fontWeight={isSelected ? '700' : '500'}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Contextual Action Strip */}
        {selectedGraphNode && !neuralGraph.isEmpty && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/30 bg-[#081236] px-4 py-3 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-white">
                {lang === 'bn' ? selectedGraphNode.labelBn : selectedGraphNode.labelEn}
              </p>
              <p className="mt-0.5 text-slate-300">
                {selectedGraphMistake
                  ? `"${selectedGraphMistake.userExample}" → "${selectedGraphMistake.correctedExample}"`
                  : lang === 'bn'
                    ? `${selectedGraphNode.count}টি প্যাটার্ন এই নোডে যুক্ত আছে`
                    : `${selectedGraphNode.count} tracked patterns linked to this neural node`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedGraphMistake && (
                <>
                  <button
                    type="button"
                    onClick={() => onPracticeMistake(selectedGraphMistake.id)}
                    className="lv-portal-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'এই ভুলটি ঠিক করুন' : 'Fix This Pattern'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAskCoachAboutMistake(selectedGraphMistake)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/35 bg-[#0C1B4D] px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:border-cyan-300 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'AI কোচকে জিজ্ঞাসা' : 'Ask AI Coach'}</span>
                  </button>
                </>
              )}
              {selectedGraphNode.kind === 'category' && selectedGraphNode.categoryId && (
                <button
                  type="button"
                  onClick={() => onSelectCategory(selectedGraphNode.categoryId!)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 cursor-pointer"
                >
                  <span>{lang === 'bn' ? 'এই ক্যাটাগরি ফিল্টার করুন' : 'Filter Category Below'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
