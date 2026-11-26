import {
  classifyMistakeCategory,
  MISTAKE_FILTER_CATEGORIES,
} from './mistakeMemoryEngine';
import type {
  MistakeDrillAttemptRecord,
  MistakeFilterCategory,
  MistakeMemoryItem,
  MistakeStatus,
} from '../types/domain';

export type ExtendedMistakeCategory = MistakeFilterCategory | 'pronunciation';

export interface ExtendedCategoryMeta {
  id: ExtendedMistakeCategory;
  labelEn: string;
  labelBn: string;
  shortLabelEn: string;
  color: string;
  pillar: 'grammar' | 'vocabulary' | 'speaking';
}

export const EXTENDED_MISTAKE_CATEGORIES: ExtendedCategoryMeta[] = [
  {
    id: 'verb_tense',
    labelEn: 'Verb Tense',
    labelBn: 'ক্রিয়ার কাল (Verb Tense)',
    shortLabelEn: 'Verb Tense',
    color: '#00D9FF',
    pillar: 'grammar',
  },
  {
    id: 'prepositions',
    labelEn: 'Prepositions',
    labelBn: 'প্রিপজিশন (Prepositions)',
    shortLabelEn: 'Prepositions',
    color: '#3B82F6',
    pillar: 'grammar',
  },
  {
    id: 'articles',
    labelEn: 'Articles',
    labelBn: 'আর্টিকেল (Articles)',
    shortLabelEn: 'Articles',
    color: '#8B5CF6',
    pillar: 'grammar',
  },
  {
    id: 'word_order',
    labelEn: 'Word Order',
    labelBn: 'শব্দক্রম (Word Order)',
    shortLabelEn: 'Word Order',
    color: '#E42BFF',
    pillar: 'grammar',
  },
  {
    id: 'vocabulary',
    labelEn: 'Vocabulary',
    labelBn: 'শব্দভাণ্ডার (Vocabulary)',
    shortLabelEn: 'Vocabulary',
    color: '#16E58B',
    pillar: 'vocabulary',
  },
  {
    id: 'sentence_structure',
    labelEn: 'Sentence Structure',
    labelBn: 'বাক্য গঠন (Sentence Structure)',
    shortLabelEn: 'Structure',
    color: '#6366F1',
    pillar: 'grammar',
  },
  {
    id: 'pronunciation',
    labelEn: 'Pronunciation & Clarity',
    labelBn: 'উচ্চারণ ও স্পষ্টতা (Pronunciation)',
    shortLabelEn: 'Pronunciation',
    color: '#F59E0B',
    pillar: 'speaking',
  },
];

export function getExtendedCategoryMeta(id: ExtendedMistakeCategory): ExtendedCategoryMeta {
  return (
    EXTENDED_MISTAKE_CATEGORIES.find((c) => c.id === id) ?? EXTENDED_MISTAKE_CATEGORIES[5]
  );
}

/**
 * Classifies a mistake into the 7 extended categories (6 canonical Mistake Memory
 * categories plus explicit Pronunciation/Clarity detection when recorded by
 * Speaking Studio or Pronunciation Lab).
 */
export function classifyExtendedMistakeCategory(
  item: Pick<MistakeMemoryItem, 'category' | 'domain'>
): ExtendedMistakeCategory {
  const lower = (item.category ?? '').trim().toLowerCase();
  if (
    lower.includes('pronunciation') ||
    lower.includes('clarity') ||
    lower.includes('phonetic') ||
    lower.includes('intonation') ||
    lower.includes('stress') ||
    lower.includes('accent')
  ) {
    return 'pronunciation';
  }
  return classifyMistakeCategory(item.category, item.domain);
}

export interface HeroPillarSummary {
  id: 'grammar' | 'vocabulary' | 'speaking';
  labelEn: string;
  labelBn: string;
  mistakeCount: number;
  resolvedCount: number;
  sharePercent: number | null;
  masteryPercent: number | null;
}

export interface MistakeMemoryOverview {
  totalValid: number;
  activeCount: number;
  practicingCount: number;
  resolvedCount: number;
  reportedCount: number;
  recurringCount: number;
  dueForReviewCount: number;
  totalOccurrences: number;
  totalDrillsCompleted: number;
  passedDrillsCount: number;
  /** Strictly computed from real mistakes; null when 0 valid mistakes exist. */
  improvementRatePercent: number | null;
  heroPillars: HeroPillarSummary[];
  /** 7-day real daily sparklines (newest last) derived strictly from timestamps. */
  sparklines: {
    totalLogged: number[];
    recurringActive: number[];
    drillsPracticed: number[];
    repairsPassed: number[];
  };
}

function toUtcDayKey(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function buildDayKeys(rangeDays: number, nowIso: string): string[] {
  const anchor = new Date(nowIso);
  const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  const keys: string[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(
        safeAnchor.getUTCFullYear(),
        safeAnchor.getUTCMonth(),
        safeAnchor.getUTCDate() - i
      )
    );
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function formatShortDayLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00.000Z`);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function formatCompactAxisLabel(dayKey: string, rangeDays: number): string {
  const d = new Date(`${dayKey}T00:00:00.000Z`);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (rangeDays <= 7) {
    return days[d.getUTCDay()];
  }
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function isMistakeDueForReview(
  item: MistakeMemoryItem,
  nowMs: number
): boolean {
  if (item.falseCorrectionReported) return false;
  if (item.nextReviewAt) {
    const dueMs = new Date(item.nextReviewAt).getTime();
    if (!Number.isNaN(dueMs)) {
      return dueMs <= nowMs;
    }
  }
  return item.status === 'active';
}

export function buildMistakeMemoryOverview(
  mistakes: MistakeMemoryItem[],
  drillAttempts: MistakeDrillAttemptRecord[],
  nowIso: string = new Date().toISOString()
): MistakeMemoryOverview {
  const valid = mistakes.filter((m) => !m.falseCorrectionReported);
  const reportedCount = mistakes.length - valid.length;
  const nowMs = new Date(nowIso).getTime();
  const safeNowMs = Number.isNaN(nowMs) ? Date.now() : nowMs;

  const activeCount = valid.filter((m) => m.status === 'active').length;
  const practicingCount = valid.filter((m) => m.status === 'practicing').length;
  const resolvedCount = valid.filter((m) => m.status === 'resolved').length;
  const recurringCount = valid.filter((m) => m.occurrences >= 2).length;
  const dueForReviewCount = valid.filter((m) => isMistakeDueForReview(m, safeNowMs)).length;
  const totalOccurrences = valid.reduce((acc, m) => acc + Math.max(1, m.occurrences), 0);

  const validIds = new Set(valid.map((m) => m.id));
  const validDrills = drillAttempts.filter((a) => validIds.has(a.mistakeId));
  const passedDrillsCount = validDrills.filter((a) => a.passed).length;

  const improvementRatePercent =
    valid.length > 0
      ? Math.round(((resolvedCount + practicingCount * 0.5) / valid.length) * 100)
      : null;

  // Compute the 3 Hero Pillars mutually exclusively so shares sum cleanly to 100%
  let grammarTotal = 0;
  let grammarResolved = 0;
  let vocabTotal = 0;
  let vocabResolved = 0;
  let speakingTotal = 0;
  let speakingResolved = 0;

  for (const m of valid) {
    const extCat = classifyExtendedMistakeCategory(m);
    const meta = getExtendedCategoryMeta(extCat);
    if (meta.pillar === 'vocabulary') {
      vocabTotal++;
      if (m.status === 'resolved') vocabResolved++;
    } else if (meta.pillar === 'speaking') {
      speakingTotal++;
      if (m.status === 'resolved') speakingResolved++;
    } else {
      grammarTotal++;
      if (m.status === 'resolved') grammarResolved++;
    }
  }

  const pct = (part: number, whole: number): number | null =>
    whole > 0 ? Math.round((part / whole) * 100) : null;

  const heroPillars: HeroPillarSummary[] = [
    {
      id: 'grammar',
      labelEn: 'Grammar',
      labelBn: 'ব্যাকরণ',
      mistakeCount: grammarTotal,
      resolvedCount: grammarResolved,
      sharePercent: pct(grammarTotal, valid.length),
      masteryPercent: pct(grammarResolved, grammarTotal),
    },
    {
      id: 'vocabulary',
      labelEn: 'Vocabulary',
      labelBn: 'শব্দভাণ্ডার',
      mistakeCount: vocabTotal,
      resolvedCount: vocabResolved,
      sharePercent: pct(vocabTotal, valid.length),
      masteryPercent: pct(vocabResolved, vocabTotal),
    },
    {
      id: 'speaking',
      labelEn: 'Speaking',
      labelBn: 'স্পিকিং',
      mistakeCount: speakingTotal,
      resolvedCount: speakingResolved,
      sharePercent: pct(speakingTotal, valid.length),
      masteryPercent: pct(speakingResolved, speakingTotal),
    },
  ];

  // Real 7-day daily sparklines (no synthetic baselines)
  const dayKeys = buildDayKeys(7, nowIso);
  const loggedMap = new Map<string, number>();
  const recurringMap = new Map<string, number>();
  const drillsMap = new Map<string, number>();
  const passedMap = new Map<string, number>();

  for (const m of valid) {
    const createdKey = toUtcDayKey(m.createdAt);
    if (createdKey) {
      loggedMap.set(createdKey, (loggedMap.get(createdKey) ?? 0) + 1);
    }
    const seenKey = toUtcDayKey(m.lastSeenAt ?? m.createdAt);
    if (seenKey && m.occurrences >= 2) {
      recurringMap.set(seenKey, (recurringMap.get(seenKey) ?? 0) + 1);
    }
  }

  for (const d of validDrills) {
    const dayKey = toUtcDayKey(d.timestamp);
    if (!dayKey) continue;
    drillsMap.set(dayKey, (drillsMap.get(dayKey) ?? 0) + 1);
    if (d.passed) {
      passedMap.set(dayKey, (passedMap.get(dayKey) ?? 0) + 1);
    }
  }

  return {
    totalValid: valid.length,
    activeCount,
    practicingCount,
    resolvedCount,
    reportedCount,
    recurringCount,
    dueForReviewCount,
    totalOccurrences,
    totalDrillsCompleted: validDrills.length,
    passedDrillsCount,
    improvementRatePercent,
    heroPillars,
    sparklines: {
      totalLogged: dayKeys.map((k) => loggedMap.get(k) ?? 0),
      recurringActive: dayKeys.map((k) => recurringMap.get(k) ?? 0),
      drillsPracticed: dayKeys.map((k) => drillsMap.get(k) ?? 0),
      repairsPassed: dayKeys.map((k) => passedMap.get(k) ?? 0),
    },
  };
}

export interface CategoryDonutSegment {
  id: ExtendedMistakeCategory;
  labelEn: string;
  labelBn: string;
  shortLabelEn: string;
  count: number;
  occurrences: number;
  percent: number;
  color: string;
}

export function buildMistakeCategoryDonut(
  mistakes: MistakeMemoryItem[],
  includeReported: boolean = false
): { total: number; segments: CategoryDonutSegment[] } {
  const pool = includeReported ? mistakes : mistakes.filter((m) => !m.falseCorrectionReported);
  const counts = new Map<ExtendedMistakeCategory, { count: number; occurrences: number }>();

  for (const m of pool) {
    const cat = classifyExtendedMistakeCategory(m);
    const prev = counts.get(cat) ?? { count: 0, occurrences: 0 };
    counts.set(cat, {
      count: prev.count + 1,
      occurrences: prev.occurrences + Math.max(1, m.occurrences),
    });
  }

  const total = pool.length;
  const segments: CategoryDonutSegment[] = EXTENDED_MISTAKE_CATEGORIES.map((meta) => {
    const stat = counts.get(meta.id) ?? { count: 0, occurrences: 0 };
    return {
      id: meta.id,
      labelEn: meta.labelEn,
      labelBn: meta.labelBn,
      shortLabelEn: meta.shortLabelEn,
      count: stat.count,
      occurrences: stat.occurrences,
      percent: total > 0 ? Math.round((stat.count / total) * 100) : 0,
      color: meta.color,
    };
  })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || b.occurrences - a.occurrences);

  return { total, segments };
}

export interface MistakeTrendPoint {
  dayKey: string;
  axisLabel: string;
  fullLabel: string;
  mistakesLogged: number;
  repairsPassed: number;
  drillsAttempted: number;
}

export interface MistakeTrendSeries {
  rangeDays: 7 | 30;
  points: MistakeTrendPoint[];
  activeDaysCount: number;
  hasSufficientTrendData: boolean;
  totalLoggedInRange: number;
  totalRepairsPassedInRange: number;
  maxValue: number;
}

export function buildMistakeTrendSeries(
  mistakes: MistakeMemoryItem[],
  drillAttempts: MistakeDrillAttemptRecord[],
  rangeDays: 7 | 30 = 7,
  nowIso: string = new Date().toISOString()
): MistakeTrendSeries {
  const valid = mistakes.filter((m) => !m.falseCorrectionReported);
  const validIds = new Set(valid.map((m) => m.id));
  const dayKeys = buildDayKeys(rangeDays, nowIso);
  const daySet = new Set(dayKeys);

  const loggedByDay = new Map<string, number>();
  const drillsByDay = new Map<string, number>();
  const passedByDay = new Map<string, number>();

  for (const m of valid) {
    const key = toUtcDayKey(m.createdAt);
    if (key && daySet.has(key)) {
      loggedByDay.set(key, (loggedByDay.get(key) ?? 0) + 1);
    }
  }

  for (const d of drillAttempts) {
    if (!validIds.has(d.mistakeId)) continue;
    const key = toUtcDayKey(d.timestamp);
    if (key && daySet.has(key)) {
      drillsByDay.set(key, (drillsByDay.get(key) ?? 0) + 1);
      if (d.passed) {
        passedByDay.set(key, (passedByDay.get(key) ?? 0) + 1);
      }
    }
  }

  let activeDaysCount = 0;
  let totalLoggedInRange = 0;
  let totalRepairsPassedInRange = 0;
  let maxValue = 0;

  const points: MistakeTrendPoint[] = dayKeys.map((dayKey) => {
    const mistakesLogged = loggedByDay.get(dayKey) ?? 0;
    const repairsPassed = passedByDay.get(dayKey) ?? 0;
    const drillsAttempted = drillsByDay.get(dayKey) ?? 0;
    if (mistakesLogged > 0 || drillsAttempted > 0) {
      activeDaysCount++;
    }
    totalLoggedInRange += mistakesLogged;
    totalRepairsPassedInRange += repairsPassed;
    if (mistakesLogged > maxValue) maxValue = mistakesLogged;
    if (repairsPassed > maxValue) maxValue = repairsPassed;

    return {
      dayKey,
      axisLabel: formatCompactAxisLabel(dayKey, rangeDays),
      fullLabel: formatShortDayLabel(dayKey),
      mistakesLogged,
      repairsPassed,
      drillsAttempted,
    };
  });

  return {
    rangeDays,
    points,
    activeDaysCount,
    hasSufficientTrendData: activeDaysCount >= 2,
    totalLoggedInRange,
    totalRepairsPassedInRange,
    maxValue,
  };
}

export interface NeuralGraphNode {
  id: string;
  kind: 'core' | 'category' | 'mistake';
  labelEn: string;
  labelBn: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  categoryId?: ExtendedMistakeCategory;
  mistakeId?: string;
  count: number;
  status?: MistakeStatus;
  occurrences?: number;
}

export interface NeuralGraphEdge {
  id: string;
  fromId: string;
  toId: string;
  kind: 'primary' | 'pattern' | 'transfer_link';
  color: string;
  strength: number;
}

export interface NeuralRelationshipGraph {
  isEmpty: boolean;
  nodes: NeuralGraphNode[];
  edges: NeuralGraphEdge[];
}

// Known Bangla-L1 linguistic interference links between categories
const CROSS_CATEGORY_LINKS: Array<[ExtendedMistakeCategory, ExtendedMistakeCategory]> = [
  ['verb_tense', 'sentence_structure'],
  ['prepositions', 'vocabulary'],
  ['articles', 'sentence_structure'],
  ['word_order', 'verb_tense'],
  ['pronunciation', 'vocabulary'],
];

/**
 * Builds a deterministic, responsive-viewBox (800x360) interactive Neural Memory Network
 * connecting the central Memory Core -> real active categories -> top recurring mistake nodes.
 */
export function buildNeuralRelationshipMap(
  mistakes: MistakeMemoryItem[]
): NeuralRelationshipGraph {
  const valid = mistakes.filter((m) => !m.falseCorrectionReported);
  const coreNode: NeuralGraphNode = {
    id: 'core',
    kind: 'core',
    labelEn: 'Memory Core',
    labelBn: 'মেমোরি কোর',
    x: 88,
    y: 180,
    radius: 34,
    color: '#00D9FF',
    count: valid.length,
  };

  if (valid.length === 0) {
    // Honest dormant architecture blueprint showing how categories connect once populated
    const blueprintCats: ExtendedMistakeCategory[] = [
      'verb_tense',
      'prepositions',
      'vocabulary',
      'sentence_structure',
    ];
    const nodes: NeuralGraphNode[] = [coreNode];
    const edges: NeuralGraphEdge[] = [];
    blueprintCats.forEach((catId, idx) => {
      const meta = getExtendedCategoryMeta(catId);
      const y = 66 + idx * 76;
      const nodeId = `cat:${catId}`;
      nodes.push({
        id: nodeId,
        kind: 'category',
        labelEn: meta.shortLabelEn,
        labelBn: meta.labelBn,
        x: 340,
        y,
        radius: 20,
        color: meta.color,
        categoryId: catId,
        count: 0,
      });
      edges.push({
        id: `edge:core->${nodeId}`,
        fromId: 'core',
        toId: nodeId,
        kind: 'primary',
        color: meta.color,
        strength: 0.35,
      });
    });
    return { isEmpty: true, nodes, edges };
  }

  const donut = buildMistakeCategoryDonut(valid, false);
  const activeSegments = donut.segments.slice(0, 6);

  const nodes: NeuralGraphNode[] = [coreNode];
  const edges: NeuralGraphEdge[] = [];
  const activeCategorySet = new Set<ExtendedMistakeCategory>();

  const catSpacing = activeSegments.length > 1 ? 256 / (activeSegments.length - 1) : 0;
  const catStartY = activeSegments.length > 1 ? 52 : 180;

  activeSegments.forEach((seg, idx) => {
    activeCategorySet.add(seg.id);
    const nodeId = `cat:${seg.id}`;
    const y = Math.round(catStartY + idx * catSpacing);
    nodes.push({
      id: nodeId,
      kind: 'category',
      labelEn: seg.shortLabelEn,
      labelBn: seg.labelBn,
      x: 282,
      y,
      radius: Math.min(28, 17 + seg.count * 2),
      color: seg.color,
      categoryId: seg.id,
      count: seg.count,
    });
    edges.push({
      id: `edge:core->${nodeId}`,
      fromId: 'core',
      toId: nodeId,
      kind: 'primary',
      color: seg.color,
      strength: Math.min(1, 0.45 + seg.percent / 100),
    });
  });

  // Cross-category Bangla-L1 transfer links between active categories
  for (const [a, b] of CROSS_CATEGORY_LINKS) {
    if (activeCategorySet.has(a) && activeCategorySet.has(b)) {
      edges.push({
        id: `edge:transfer:${a}->${b}`,
        fromId: `cat:${a}`,
        toId: `cat:${b}`,
        kind: 'transfer_link',
        color: '#8B5CF6',
        strength: 0.5,
      });
    }
  }

  // Top priority / recurring mistake nodes on right column (up to 6)
  const prioritizedMistakes = [...valid]
    .sort((a, b) => {
      const aActive = a.status === 'resolved' ? 0 : 1;
      const bActive = b.status === 'resolved' ? 0 : 1;
      if (aActive !== bActive) return bActive - aActive;
      if (a.occurrences !== b.occurrences) return b.occurrences - a.occurrences;
      return (b.lastSeenAt ?? b.createdAt).localeCompare(a.lastSeenAt ?? a.createdAt);
    })
    .slice(0, 6);

  const mSpacing = prioritizedMistakes.length > 1 ? 256 / (prioritizedMistakes.length - 1) : 0;
  const mStartY = prioritizedMistakes.length > 1 ? 52 : 180;

  prioritizedMistakes.forEach((m, idx) => {
    const extCat = classifyExtendedMistakeCategory(m);
    const meta = getExtendedCategoryMeta(extCat);
    const nodeId = `mistake:${m.id}`;
    const y = Math.round(mStartY + idx * mSpacing);
    const shortEn =
      m.patternEn.length > 38 ? `${m.patternEn.slice(0, 37).trimEnd()}…` : m.patternEn;
    const shortBn =
      m.patternBn.length > 36 ? `${m.patternBn.slice(0, 35).trimEnd()}…` : m.patternBn;

    nodes.push({
      id: nodeId,
      kind: 'mistake',
      labelEn: shortEn,
      labelBn: shortBn,
      x: 500,
      y,
      radius: m.occurrences >= 2 ? 20 : 15,
      color:
        m.status === 'resolved'
          ? '#16E58B'
          : m.occurrences >= 2
            ? '#E42BFF'
            : meta.color,
      categoryId: extCat,
      mistakeId: m.id,
      count: m.occurrences,
      status: m.status,
      occurrences: m.occurrences,
    });

    const parentId = activeCategorySet.has(extCat) ? `cat:${extCat}` : 'core';
    edges.push({
      id: `edge:${parentId}->${nodeId}`,
      fromId: parentId,
      toId: nodeId,
      kind: 'pattern',
      color: m.status === 'resolved' ? '#16E58B' : meta.color,
      strength: Math.min(1, 0.4 + m.occurrences * 0.15),
    });
  });

  return { isEmpty: false, nodes, edges };
}

export type RevisionBucket = 'overdue' | 'due_today' | 'upcoming_week' | 'maintenance';

export interface RevisionScheduleItem {
  mistake: MistakeMemoryItem;
  category: ExtendedMistakeCategory;
  bucket: RevisionBucket;
  dueDateIso: string | null;
  daysUntilDue: number;
  priorityScore: number;
}

export interface SmartRevisionSchedule {
  overdue: RevisionScheduleItem[];
  dueToday: RevisionScheduleItem[];
  upcomingWeek: RevisionScheduleItem[];
  maintenance: RevisionScheduleItem[];
  dueNowTotal: number;
  topRecommended: RevisionScheduleItem | null;
  recurringSpotlight: MistakeMemoryItem[];
}

export function computeMistakePriorityScore(
  item: MistakeMemoryItem,
  nowMs: number
): number {
  if (item.falseCorrectionReported) return -1;
  let score = 0;
  if (item.status === 'active') score += 45;
  else if (item.status === 'practicing') score += 28;
  else score += 5;

  score += Math.min(35, item.occurrences * 10);

  if (item.severity === 'high') score += 18;
  else if (item.severity === 'medium') score += 10;

  if (item.nextReviewAt) {
    const dueMs = new Date(item.nextReviewAt).getTime();
    if (!Number.isNaN(dueMs) && dueMs <= nowMs) {
      const overdueDays = Math.min(10, Math.max(1, Math.ceil((nowMs - dueMs) / 86400000)));
      score += 15 + overdueDays * 2;
    }
  } else if (item.status === 'active') {
    score += 15;
  }

  return score;
}

export function buildSmartRevisionSchedule(
  mistakes: MistakeMemoryItem[],
  nowIso: string = new Date().toISOString()
): SmartRevisionSchedule {
  const valid = mistakes.filter((m) => !m.falseCorrectionReported);
  const nowDate = new Date(nowIso);
  const nowMs = Number.isNaN(nowDate.getTime()) ? Date.now() : nowDate.getTime();
  const todayKey = new Date(nowMs).toISOString().slice(0, 10);

  const overdue: RevisionScheduleItem[] = [];
  const dueToday: RevisionScheduleItem[] = [];
  const upcomingWeek: RevisionScheduleItem[] = [];
  const maintenance: RevisionScheduleItem[] = [];

  const allItems: RevisionScheduleItem[] = valid.map((mistake) => {
    const category = classifyExtendedMistakeCategory(mistake);
    const priorityScore = computeMistakePriorityScore(mistake, nowMs);
    const dueDateIso = mistake.nextReviewAt ?? null;

    let bucket: RevisionBucket = 'due_today';
    let daysUntilDue = 0;

    if (dueDateIso) {
      const dueMs = new Date(dueDateIso).getTime();
      const dueKey = toUtcDayKey(dueDateIso);
      if (!Number.isNaN(dueMs) && dueKey) {
        const diffDays = Math.ceil((dueMs - nowMs) / 86400000);
        daysUntilDue = diffDays;
        if (dueKey < todayKey) {
          bucket = 'overdue';
        } else if (dueKey === todayKey || dueMs <= nowMs) {
          bucket = 'due_today';
        } else if (diffDays <= 7) {
          bucket = 'upcoming_week';
        } else {
          bucket = 'maintenance';
        }
      }
    } else if (mistake.status === 'resolved') {
      bucket = 'maintenance';
      daysUntilDue = 7;
    } else {
      bucket = 'due_today';
      daysUntilDue = 0;
    }

    const entry: RevisionScheduleItem = {
      mistake,
      category,
      bucket,
      dueDateIso,
      daysUntilDue,
      priorityScore,
    };

    if (bucket === 'overdue') overdue.push(entry);
    else if (bucket === 'due_today') dueToday.push(entry);
    else if (bucket === 'upcoming_week') upcomingWeek.push(entry);
    else maintenance.push(entry);

    return entry;
  });

  const byPriorityDesc = (a: RevisionScheduleItem, b: RevisionScheduleItem) =>
    b.priorityScore - a.priorityScore || b.mistake.occurrences - a.mistake.occurrences;

  overdue.sort(byPriorityDesc);
  dueToday.sort(byPriorityDesc);
  upcomingWeek.sort((a, b) => a.daysUntilDue - b.daysUntilDue || byPriorityDesc(a, b));
  maintenance.sort((a, b) => a.daysUntilDue - b.daysUntilDue || byPriorityDesc(a, b));
  allItems.sort(byPriorityDesc);

  const recurringSpotlight = valid
    .filter((m) => m.occurrences >= 2)
    .sort((a, b) => {
      const aResolved = a.status === 'resolved' ? 1 : 0;
      const bResolved = b.status === 'resolved' ? 1 : 0;
      if (aResolved !== bResolved) return aResolved - bResolved;
      if (a.occurrences !== b.occurrences) return b.occurrences - a.occurrences;
      return (b.lastSeenAt ?? b.createdAt).localeCompare(a.lastSeenAt ?? a.createdAt);
    })
    .slice(0, 5);

  return {
    overdue,
    dueToday,
    upcomingWeek,
    maintenance,
    dueNowTotal: overdue.length + dueToday.length,
    topRecommended: allItems[0] ?? null,
    recurringSpotlight,
  };
}

export type MistakeSortMode = 'priority' | 'recurring' | 'recent' | 'review_due';

export interface MistakeFilterQuery {
  searchText: string;
  status: 'all' | MistakeStatus;
  category: 'all' | ExtendedMistakeCategory;
  recurringOnly: boolean;
  showReported: boolean;
  sortBy: MistakeSortMode;
  nowIso?: string;
}

export function filterAndSearchMistakes(
  mistakes: MistakeMemoryItem[],
  query: MistakeFilterQuery
): MistakeMemoryItem[] {
  const needle = query.searchText.trim().toLowerCase();
  const nowMs = query.nowIso ? new Date(query.nowIso).getTime() : Date.now();
  const safeNowMs = Number.isNaN(nowMs) ? Date.now() : nowMs;

  const filtered = mistakes.filter((item) => {
    if (!query.showReported && item.falseCorrectionReported) return false;
    if (query.status !== 'all' && item.status !== query.status) return false;
    if (query.recurringOnly && item.occurrences < 2) return false;
    if (query.category !== 'all') {
      const extCat = classifyExtendedMistakeCategory(item);
      if (extCat !== query.category) return false;
    }
    if (needle) {
      const haystack = [
        item.patternEn,
        item.patternBn,
        item.userExample,
        item.correctedExample,
        item.explanationEn,
        item.explanationBn,
        item.category,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (query.sortBy === 'recurring') {
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
      return (b.lastSeenAt ?? b.createdAt).localeCompare(a.lastSeenAt ?? a.createdAt);
    }
    if (query.sortBy === 'recent') {
      return (b.lastSeenAt ?? b.createdAt).localeCompare(a.lastSeenAt ?? a.createdAt);
    }
    if (query.sortBy === 'review_due') {
      const aDue = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : safeNowMs;
      const bDue = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : safeNowMs;
      return aDue - bDue;
    }
    // Default: priority
    return computeMistakePriorityScore(b, safeNowMs) - computeMistakePriorityScore(a, safeNowMs);
  });
}

export function getCanonicalFilterCategories() {
  return MISTAKE_FILTER_CATEGORIES;
}
