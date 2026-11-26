import { getAllLessons, getLessonById } from './curriculumData';
import { classifyMistakeCategory } from './mistakeMemoryEngine';
import { getSpeakingScenario } from './speakingScenarios';
import { getTransferScenario } from './transferLabEngine';
import type {
  ActivityLedgerSummary,
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  SpeakingSessionRecord,
  TransferAttemptRecord,
} from '../types/domain';

export const DNA_CALCULATION_VERSION = 'dna-engine-v2.0';
export const MIN_DNA_SAMPLES = 3;

export type DnaTimeframe = '7d' | '30d' | '90d' | 'all';

export type DnaSkillId =
  | 'grammar'
  | 'vocabulary'
  | 'listening'
  | 'speaking'
  | 'reading'
  | 'writing'
  | 'pronunciation'
  | 'functional_communication'
  | 'sentence_complexity'
  | 'contextual_appropriateness';

export type DnaSkillGroup = 'core' | 'extended';

export type DnaNodeVisualState =
  | 'strong'
  | 'developing'
  | 'needs_attention'
  | 'insufficient';

export type DnaCoverageTier = 'insufficient_data' | 'low_confidence' | 'verified';

export interface DnaObservationPoint {
  id: string;
  source: 'diagnostic' | 'academy' | 'speaking' | 'mistake_drill' | 'transfer_lab';
  sourceLabelEn: string;
  sourceLabelBn: string;
  recordId: string;
  skillId: DnaSkillId;
  timestamp: string;
  scorePercent: number;
  summaryEn: string;
  summaryBn: string;
  limitationEn: string;
  limitationBn: string;
  routeTo: string;
}

export interface DnaSkillNode {
  id: DnaSkillId;
  group: DnaSkillGroup;
  titleEn: string;
  titleBn: string;
  shortLabelEn: string;
  shortLabelBn: string;
  /** Strictly null whenever sampleSize < 3 OR acoustic evidence is missing (Pronunciation). Never fabricated. */
  scorePercent: number | null;
  /** Measured score in the immediately preceding equivalent period when >= 3 samples exist there too. */
  previousPeriodScorePercent: number | null;
  deltaPercent: number | null;
  sampleSize: number;
  minSamplesRequired: number;
  coverage: DnaCoverageTier;
  coverageLabelEn: string;
  coverageLabelBn: string;
  confidencePercent: number;
  visualState: DnaNodeVisualState;
  lastAssessedAt: string | null;
  dateRangeLabelEn: string;
  dateRangeLabelBn: string;
  definitionEn: string;
  definitionBn: string;
  limitationEn: string;
  limitationBn: string;
  strengthsEn: string[];
  strengthsBn: string[];
  improvementsEn: string[];
  improvementsBn: string[];
  recommendedPracticeEn: string;
  recommendedPracticeBn: string;
  recommendedDurationMinutes: number;
  completionCriteriaEn: string;
  completionCriteriaBn: string;
  recommendedRoute: string;
  recentHistory: DnaObservationPoint[];
  supportingRecordIds: string[];
  /** 3D orbital coordinates for the neural network (deterministic per skill) */
  position3D: [number, number, number];
  /** Connected neighbor skill IDs for neural pathways */
  connectedTo: DnaSkillId[];
}

export interface DnaStrengthItem {
  skillId: DnaSkillId;
  titleEn: string;
  titleBn: string;
  scorePercent: number;
  sampleSize: number;
  coverage: DnaCoverageTier;
  coverageLabelEn: string;
  coverageLabelBn: string;
  dateRangeEn: string;
  dateRangeBn: string;
  supportingEvidenceEn: string;
  supportingEvidenceBn: string;
}

export interface DnaGrowthOpportunity {
  id: string;
  skillId: DnaSkillId;
  priority: 'high' | 'medium' | 'baseline';
  weaknessEn: string;
  weaknessBn: string;
  supportingEvidenceEn: string;
  supportingEvidenceBn: string;
  whyItMattersEn: string;
  whyItMattersBn: string;
  recommendedExerciseEn: string;
  recommendedExerciseBn: string;
  expectedDurationMinutes: number;
  difficultyLabelEn: string;
  difficultyLabelBn: string;
  completionCriteriaEn: string;
  completionCriteriaBn: string;
  routeTo: string;
  supportingRecordIds: string[];
}

export interface DnaHistoryTrendPoint {
  dateKey: string;
  labelEn: string;
  labelBn: string;
  avgScorePercent: number;
  sampleCount: number;
  sourcesCount: number;
}

export interface DnaEvidenceDistributionItem {
  source: DnaObservationPoint['source'];
  labelEn: string;
  labelBn: string;
  sampleCount: number;
  sharePercent: number;
  colorHex: string;
}

export interface DnaEvidenceLedgerRecord {
  id: string;
  assessmentId: string;
  source: DnaObservationPoint['source'];
  sourceLabelEn: string;
  sourceLabelBn: string;
  assessmentDate: string;
  skillsEvaluated: DnaSkillId[];
  sampleCount: number;
  calculationVersion: string;
  coverage: DnaCoverageTier;
  coverageLabelEn: string;
  coverageLabelBn: string;
  limitationEn: string;
  limitationBn: string;
  titleEn: string;
  titleBn: string;
  scoreSummaryEn: string;
  scoreSummaryBn: string;
  routeTo: string;
}

export interface DnaProfileSeparation {
  measuredSummary: {
    measuredSkillsCount: number;
    totalSkillsCount: number;
    totalVerifiedSamples: number;
    evidenceCoveragePercent: number;
    estimatedProficiencyEn: string;
    estimatedProficiencyBn: string;
    cefrDisclaimerEn: string;
    cefrDisclaimerBn: string;
  };
  selfReported: {
    levelLabelEn: string;
    levelLabelBn: string;
    dailyGoalMinutes: number;
    learningGoals: string[];
    hasSelfReport: boolean;
  };
  aiInterpretationEligibility: {
    eligible: boolean;
    reasonEn: string;
    reasonBn: string;
  };
}

export interface CommunicationDnaLabModel {
  calculationVersion: string;
  timeframe: DnaTimeframe;
  skills: DnaSkillNode[];
  coreSkills: DnaSkillNode[];
  extendedSkills: DnaSkillNode[];
  measuredCount: number;
  totalDimensions: 10;
  totalVerifiedSamples: number;
  evidenceCoveragePercent: number;
  lastAssessmentDate: string | null;
  hasHistoricalComparison: boolean;
  trendSeries: {
    points: DnaHistoryTrendPoint[];
    hasSufficientData: boolean;
  };
  evidenceDistribution: DnaEvidenceDistributionItem[];
  strengths: DnaStrengthItem[];
  growthOpportunities: DnaGrowthOpportunity[];
  nextBestPractice: DnaGrowthOpportunity;
  evidenceLedger: DnaEvidenceLedgerRecord[];
  profileSeparation: DnaProfileSeparation;
}

export interface CommunicationDnaLabInput {
  profile: LearnerProfile | null;
  latestDiagnostic: EvidenceStartingProfile | null;
  exerciseAttempts: ExerciseAttemptRecord[];
  lessonAttempts: LessonAttemptRecord[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  speakingSessions: SpeakingSessionRecord[];
  mistakes: MistakeMemoryItem[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
  transferAttempts: TransferAttemptRecord[];
  activitySummary?: ActivityLedgerSummary;
  timeframe?: DnaTimeframe;
  now?: Date;
}

const SKILL_META: Record<
  DnaSkillId,
  {
    group: DnaSkillGroup;
    titleEn: string;
    titleBn: string;
    shortLabelEn: string;
    shortLabelBn: string;
    definitionEn: string;
    definitionBn: string;
    limitationEn: string;
    limitationBn: string;
    position3D: [number, number, number];
    connectedTo: DnaSkillId[];
    defaultRoute: string;
    defaultDuration: number;
  }
> = {
  grammar: {
    group: 'core',
    titleEn: 'Grammar',
    titleBn: 'ব্যাকরণ',
    shortLabelEn: 'Grammar',
    shortLabelBn: 'ব্যাকরণ',
    definitionEn:
      'Accuracy with verb tenses, articles, prepositions, and core English syntax measured across exercises, drills, and speaking turns.',
    definitionBn:
      'অনুশীলন, মিস্টেক ড্রিল এবং স্পিকিং ধাপে ক্রিয়ার কাল, আর্টিকেল, প্রিপজিশন ও ব্যাকরণগত নির্ভুলতা।',
    limitationEn: 'Reflects recorded exercises, diagnostic items, and AI transcript evaluations only.',
    limitationBn: 'শুধুমাত্র সংরক্ষিত অনুশীলন, ডায়াগনস্টিক ও ট্রান্সক্রিপ্ট মূল্যায়নের উপর ভিত্তি করে।',
    position3D: [-2.4, 1.35, 0.85],
    connectedTo: ['sentence_complexity', 'writing', 'speaking'],
    defaultRoute: '/app/learn',
    defaultDuration: 10,
  },
  vocabulary: {
    group: 'core',
    titleEn: 'Vocabulary',
    titleBn: 'শব্দভাণ্ডার',
    shortLabelEn: 'Vocabulary',
    shortLabelBn: 'শব্দভাণ্ডার',
    definitionEn:
      'Word choice accuracy and distinct lexical diversity observed across diagnostic checks, exercises, and spoken turns.',
    definitionBn:
      'ডায়াগনস্টিক, অনুশীলন এবং কথোপকথনে সঠিক শব্দচয়ন ও স্বতন্ত্র শব্দের বৈচিত্র্য।',
    limitationEn: 'Does not yet include a standalone spaced-repetition flashcard corpus.',
    limitationBn: 'এখনো আলাদা স্পেসড-রিপিটিশন ভোকাবুলারি ডেক যুক্ত হয়নি।',
    position3D: [2.4, 1.35, 0.75],
    connectedTo: ['reading', 'writing', 'contextual_appropriateness'],
    defaultRoute: '/app/learn',
    defaultDuration: 8,
  },
  speaking: {
    group: 'core',
    titleEn: 'Speaking',
    titleBn: 'কথোপকথন (Speaking)',
    shortLabelEn: 'Speaking',
    shortLabelBn: 'স্পিকিং',
    definitionEn:
      'Spoken task fulfillment, response completeness, and pacing measured strictly from Speaking Studio turns.',
    definitionBn:
      'শুধুমাত্র AI স্পিকিং স্টুডিওর বাস্তব কথোপকথন থেকে পরিমাপকৃত উত্তর সম্পূর্ণতা ও সাবলীলতা।',
    limitationEn: 'Evaluates recognized text transcripts and response timing; written work never substitutes for speaking.',
    limitationBn: 'ট্রান্সক্রিপ্ট এবং উত্তরের সময়কাল মূল্যায়ন করে; লিখিত অনুশীলন কখনো স্পিকিং স্কোর তৈরি করে না।',
    position3D: [0.0, 2.25, 0.35],
    connectedTo: ['grammar', 'functional_communication', 'pronunciation'],
    defaultRoute: '/app/speak',
    defaultDuration: 10,
  },
  listening: {
    group: 'core',
    titleEn: 'Listening',
    titleBn: 'শোনা (Listening)',
    shortLabelEn: 'Listening',
    shortLabelBn: 'লিসেনিং',
    definitionEn:
      'Comprehension of spoken English prompts measured strictly from listening assessment items.',
    definitionBn:
      'ইংরেজি অডিও প্রম্পট শুনে বোঝার দক্ষতা — শুধুমাত্র লিসেনিং মূল্যায়ন প্রশ্ন থেকে পরিমাপকৃত।',
    limitationEn: 'Uses browser speech-synthesis audio prompts; requires at least 3 completed listening items.',
    limitationBn: 'ব্রাউজার স্পিচ-সিনথেসিস অডিও ব্যবহার করে; স্কোরের জন্য অন্তত ৩টি লিসেনিং প্রশ্ন প্রয়োজন।',
    position3D: [-2.65, -0.35, -0.75],
    connectedTo: ['reading', 'speaking', 'contextual_appropriateness'],
    defaultRoute: '/diagnostic',
    defaultDuration: 6,
  },
  reading: {
    group: 'core',
    titleEn: 'Reading',
    titleBn: 'পড়া (Reading)',
    shortLabelEn: 'Reading',
    shortLabelBn: 'রিডিং',
    definitionEn:
      'Comprehension of written passages, error detection, and meaning extraction across Diagnostic and Academy checks.',
    definitionBn:
      'ডায়াগনস্টিক ও একাডেমিতে লিখিত অনুচ্ছেদ পড়া, অর্থ বোঝা এবং ভুল শনাক্ত করার দক্ষতা।',
    limitationEn: 'Reflects short diagnostic passages and Academy comprehension exercises; no long-form reading exam yet.',
    limitationBn: 'সংক্ষিপ্ত ডায়াগনস্টিক প্যাসেজ ও একাডেমি প্রশ্নের ভিত্তিতে পরিমাপকৃত।',
    position3D: [2.6, -0.3, -0.8],
    connectedTo: ['vocabulary', 'listening', 'grammar'],
    defaultRoute: '/app/learn',
    defaultDuration: 10,
  },
  writing: {
    group: 'core',
    titleEn: 'Writing',
    titleBn: 'লেখা (Writing)',
    shortLabelEn: 'Writing',
    shortLabelBn: 'রাইটিং',
    definitionEn:
      'Written production accuracy across independent Academy sentence construction, mistake repair rewrites, and Transfer Lab written responses.',
    definitionBn:
      'একাডেমির স্বাধীন বাক্য রচনা, মিস্টেক রি-রাইট ড্রিল এবং ট্রান্সফার ল্যাবের লিখিত উত্তরের নির্ভুলতা।',
    limitationEn: 'Measures short structured written responses rather than multi-paragraph essays.',
    limitationBn: 'সংক্ষিপ্ত কাঠামোবদ্ধ লিখিত উত্তর পরিমাপ করে; পূর্ণাঙ্গ প্রবন্ধ মূল্যায়ন এখনো যুক্ত নয়।',
    position3D: [0.0, -2.15, 0.55],
    connectedTo: ['grammar', 'vocabulary', 'sentence_complexity'],
    defaultRoute: '/app/improve',
    defaultDuration: 8,
  },
  pronunciation: {
    group: 'extended',
    titleEn: 'Pronunciation',
    titleBn: 'উচ্চারণ (Acoustic)',
    shortLabelEn: 'Pronunciation',
    shortLabelBn: 'উচ্চারণ',
    definitionEn:
      'Phoneme-level acoustic articulation, stress, and intonation measurement.',
    definitionBn:
      'ধ্বনিতাত্ত্বিক (Acoustic) উচ্চারণ, স্ট্রেস এবং স্বরভঙ্গির নির্ভুলতা।',
    limitationEn:
      'Acoustic phoneme scoring backend is not connected in this runtime. Pronunciation remains unmeasured rather than fabricating acoustic scores from text.',
    limitationBn:
      'অ্যাকোস্টিক ফোনিম স্কোরিং সার্ভার এখনো সংযুক্ত নয়। টেক্সট থেকে কখনো ভুয়া উচ্চারণ স্কোর দেখানো হয় না।',
    position3D: [-1.45, 2.0, -1.35],
    connectedTo: ['speaking', 'listening'],
    defaultRoute: '/app/speak',
    defaultDuration: 6,
  },
  functional_communication: {
    group: 'extended',
    titleEn: 'Functional Communication',
    titleBn: 'কার্যকর যোগাযোগ',
    shortLabelEn: 'Functional',
    shortLabelBn: 'কার্যকরতা',
    definitionEn:
      'Ability to accomplish real-world communication tasks in Transfer Lab scenarios and Speaking Studio roleplays.',
    definitionBn:
      'ট্রান্সফার ল্যাব ও স্পিকিং স্টুডিওর বাস্তব পরিস্থিতিতে লক্ষ্যভিত্তিক যোগাযোগ সম্পন্ন করার সক্ষমতা।',
    limitationEn: 'Derived from Transfer Lab task-completion rubrics and Speaking Studio scenario turns.',
    limitationBn: 'ট্রান্সফার ল্যাব রুব্রিক এবং স্পিকিং স্টুডিও রোলপ্লে সেশন থেকে সংগৃহীত।',
    position3D: [1.55, 2.0, -1.25],
    connectedTo: ['speaking', 'contextual_appropriateness'],
    defaultRoute: '/app/transfer-lab',
    defaultDuration: 10,
  },
  sentence_complexity: {
    group: 'extended',
    titleEn: 'Sentence Complexity',
    titleBn: 'বাক্যের জটিলতা ও গঠন',
    shortLabelEn: 'Complexity',
    shortLabelBn: 'বাক্য গঠন',
    definitionEn:
      'Control over English word order, multi-clause connectors, and structured sentence formation.',
    definitionBn:
      'ইংরেজি শব্দক্রম, সংযুক্ত বাক্যাংশ এবং জটিল বাক্য গঠনের দক্ষতা।',
    limitationEn: 'Measured from reorder/construct tasks and clause connectors in spoken turns.',
    limitationBn: 'শব্দ-সাজানো, স্বাধীন বাক্য গঠন এবং কথোপকথনের সংযুক্ত বাক্য থেকে নির্ণীত।',
    position3D: [-1.65, -1.85, -1.1],
    connectedTo: ['grammar', 'writing'],
    defaultRoute: '/app/learn',
    defaultDuration: 10,
  },
  contextual_appropriateness: {
    group: 'extended',
    titleEn: 'Contextual Appropriateness',
    titleBn: 'প্রেক্ষাপট-উপযোগী প্রকাশ',
    shortLabelEn: 'Context',
    shortLabelBn: 'প্রেক্ষাপট',
    definitionEn:
      'Register, politeness, tone control, and relevance to workplace, academic, and social situations.',
    definitionBn:
      'কর্মক্ষেত্র, একাডেমিক বা দৈনন্দিন পরিবেশ অনুযায়ী উপযুক্ত টোন ও প্রাসঙ্গিক উত্তর দেওয়ার দক্ষতা।',
    limitationEn: 'Measured from Transfer Lab contextual/relevance rubrics and Speaking Studio evaluated exchanges.',
    limitationBn: 'ট্রান্সফার ল্যাবের প্রাসঙ্গিকতা রুব্রিক এবং স্পিকিং সেশনের মূল্যায়ন থেকে নির্ণীত।',
    position3D: [1.65, -1.85, -1.05],
    connectedTo: ['functional_communication', 'vocabulary', 'listening'],
    defaultRoute: '/app/transfer-lab',
    defaultDuration: 10,
  },
};

export const ALL_DNA_SKILL_IDS: DnaSkillId[] = [
  'grammar',
  'vocabulary',
  'listening',
  'speaking',
  'reading',
  'writing',
  'pronunciation',
  'functional_communication',
  'sentence_complexity',
  'contextual_appropriateness',
];

export const CORE_DNA_SKILL_IDS: DnaSkillId[] = [
  'grammar',
  'vocabulary',
  'listening',
  'speaking',
  'reading',
  'writing',
];

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCoverage(sampleSize: number): {
  coverage: DnaCoverageTier;
  labelEn: string;
  labelBn: string;
  confidencePercent: number;
} {
  if (sampleSize < MIN_DNA_SAMPLES) {
    return {
      coverage: 'insufficient_data',
      labelEn: 'Insufficient Evidence',
      labelBn: 'অপর্যাপ্ত প্রমাণ',
      confidencePercent: Math.round((sampleSize / MIN_DNA_SAMPLES) * 35),
    };
  }
  if (sampleSize < 8) {
    return {
      coverage: 'low_confidence',
      labelEn: 'Low Confidence',
      labelBn: 'প্রাথমিক আত্মবিশ্বাস',
      confidencePercent: Math.min(72, 45 + (sampleSize - 3) * 6),
    };
  }
  return {
    coverage: 'verified',
    labelEn: 'Verified Evidence',
    labelBn: 'যাচাইকৃত প্রমাণ',
    confidencePercent: Math.min(96, 76 + Math.min(20, (sampleSize - 8) * 2)),
  };
}

function getVisualState(
  scorePercent: number | null,
  coverage: DnaCoverageTier
): DnaNodeVisualState {
  if (scorePercent === null || coverage === 'insufficient_data') {
    return 'insufficient';
  }
  if (scorePercent >= 75 && coverage === 'verified') {
    return 'strong';
  }
  if (scorePercent < 58) {
    return 'needs_attention';
  }
  return 'developing';
}

function getWindowBounds(
  timeframe: DnaTimeframe,
  now: Date
): { currentStartMs: number | null; prevStartMs: number | null; prevEndMs: number | null } {
  const nowMs = now.getTime();
  const dayMs = 86_400_000;
  if (timeframe === 'all') {
    return { currentStartMs: null, prevStartMs: null, prevEndMs: null };
  }
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
  const currentStartMs = nowMs - days * dayMs;
  return {
    currentStartMs,
    prevStartMs: currentStartMs - days * dayMs,
    prevEndMs: currentStartMs,
  };
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(iso: string, lang: 'en' | 'bn'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function buildDateRangeLabel(
  timestamps: string[],
  lang: 'en' | 'bn'
): string {
  const validMs = timestamps
    .map((ts) => ({ ts, ms: new Date(ts).getTime() }))
    .filter((entry) => Number.isFinite(entry.ms))
    .sort((a, b) => a.ms - b.ms);
  if (validMs.length === 0) {
    return lang === 'bn' ? 'কোনো রেকর্ড নেই' : 'No records yet';
  }
  const first = formatShortDate(validMs[0].ts, lang);
  const last = formatShortDate(validMs[validMs.length - 1].ts, lang);
  if (first === last) return first;
  return `${first} – ${last}`;
}

function formatSelfLevelLabel(
  level: LearnerProfile['selfProficiencyChoice'] | LearnerProfile['selfEstimatedLevel'] | undefined
): { en: string; bn: string } {
  const map: Record<string, { en: string; bn: string }> = {
    complete_beginner: { en: 'Complete Beginner (Self-Reported)', bn: 'সম্পূর্ণ নতুন (স্ব-নির্বাচিত)' },
    few_words: { en: 'Few Words (Self-Reported)', bn: 'কয়েকটি শব্দ (স্ব-নির্বাচিত)' },
    simple_sentences: { en: 'Simple Sentences (Self-Reported)', bn: 'সহজ বাক্য (স্ব-নির্বাচিত)' },
    basic_conversations: { en: 'Basic Conversations (Self-Reported)', bn: 'প্রাথমিক কথোপকথন (স্ব-নির্বাচিত)' },
    comfortable: { en: 'Comfortable Communicator (Self-Reported)', bn: 'স্বাচ্ছন্দ্যময় (স্ব-নির্বাচিত)' },
    advanced: { en: 'Advanced (Self-Reported)', bn: 'উন্নত (স্ব-নির্বাচিত)' },
    unsure: { en: 'Unsure (Self-Reported)', bn: 'নিশ্চিত নন (স্ব-নির্বাচিত)' },
    'Pre-A1': { en: 'Pre-A1 Foundation (Self-Reported)', bn: 'Pre-A1 ভিত্তি (স্ব-নির্বাচিত)' },
    A1: { en: 'A1 Beginner (Self-Reported)', bn: 'A1 প্রাথমিক (স্ব-নির্বাচিত)' },
    A2: { en: 'A2 Elementary (Self-Reported)', bn: 'A2 মৌলিক (স্ব-নির্বাচিত)' },
    B1: { en: 'B1 Intermediate (Self-Reported)', bn: 'B1 মধ্যম (স্ব-নির্বাচিত)' },
    B2: { en: 'B2 Upper-Intermediate (Self-Reported)', bn: 'B2 উচ্চ-মধ্যম (স্ব-নির্বাচিত)' },
    C1: { en: 'C1 Advanced (Self-Reported)', bn: 'C1 উন্নত (স্ব-নির্বাচিত)' },
  };
  if (!level) {
    return { en: 'Not specified yet', bn: 'এখনো নির্ধারিত নয়' };
  }
  return map[level] ?? { en: `${level} (Self-Reported)`, bn: `${level} (স্ব-নির্বাচিত)` };
}

function estimateMeasuredProficiencyBand(
  measuredSkills: DnaSkillNode[],
  totalSamples: number
): { en: string; bn: string } {
  if (measuredSkills.length < 3 || totalSamples < 9) {
    return {
      en: 'Insufficient multi-skill evidence for proficiency estimate',
      bn: 'দক্ষতার স্তর অনুমানের জন্য পর্যাপ্ত বহু-দক্ষতা প্রমাণ এখনো নেই',
    };
  }
  const avg = Math.round(
    measuredSkills.reduce((sum, s) => sum + (s.scorePercent ?? 0), 0) / measuredSkills.length
  );
  if (avg >= 85 && measuredSkills.length >= 5) {
    return {
      en: 'Provisional Upper-Intermediate Range (Evidence-Based, Non-CEFR)',
      bn: 'প্রাথমিক উচ্চ-মধ্যম পর্যায় (প্রমাণভিত্তিক, আনুষ্ঠানিক CEFR নয়)',
    };
  }
  if (avg >= 72) {
    return {
      en: 'Provisional Intermediate Range (Evidence-Based, Non-CEFR)',
      bn: 'প্রাথমিক মধ্যম পর্যায় (প্রমাণভিত্তিক, আনুষ্ঠানিক CEFR নয়)',
    };
  }
  if (avg >= 55) {
    return {
      en: 'Provisional Elementary–Pre-Intermediate Range (Evidence-Based)',
      bn: 'প্রাথমিক মৌলিক–প্রাক-মধ্যম পর্যায় (প্রমাণভিত্তিক)',
    };
  }
  return {
    en: 'Provisional Foundation Range (Evidence-Based)',
    bn: 'প্রাথমিক ভিত্তি পর্যায় (প্রমাণভিত্তিক)',
  };
}

/**
 * Pure, deterministic Communication DNA Laboratory Engine (Part 10).
 *
 * Guarantees:
 * - Zero fabricated scores: strictly null when sampleSize < 3.
 * - Pronunciation strictly requires real acoustic phoneme evidence (remains null without acoustic engine).
 * - Separates Measured Performance, Self-Reported Profile, and AI Interpretation.
 * - Never infers personality, intelligence, or psychological traits from speech.
 * - Every metric traces directly to real persisted assessment records with IDs and timestamps.
 */
export function buildCommunicationDnaLab(
  input: CommunicationDnaLabInput
): CommunicationDnaLabModel {
  const {
    profile,
    latestDiagnostic,
    exerciseAttempts,
    lessonAttempts,
    lessonMastery,
    speakingSessions,
    mistakes,
    mistakeDrillAttempts,
    transferAttempts,
    timeframe = 'all',
    now = new Date(),
  } = input;

  const { currentStartMs, prevStartMs, prevEndMs } = getWindowBounds(timeframe, now);

  // Exclude learner-reported false AI corrections from negative scoring
  const reportedFalseKeys = new Set(
    mistakes
      .filter((m) => m.falseCorrectionReported)
      .map((m) => m.userExample.trim().toLowerCase())
  );

  // Collect ALL verified observations across all sources (unfiltered by timeframe first so we can compute current + previous windows)
  const allObservations: DnaObservationPoint[] = [];
  const ledgerRecords: DnaEvidenceLedgerRecord[] = [];

  // 1. Diagnostic Evidence
  if (latestDiagnostic) {
    const diagTime = latestDiagnostic.completedAt;
    const diagId = latestDiagnostic.attemptId || `diag_${diagTime.slice(0, 10)}`;
    const diagSkillsSet = new Set<DnaSkillId>();

    for (const item of latestDiagnostic.items) {
      let skillId: DnaSkillId = 'grammar';
      if (item.domain === 'vocabulary') skillId = 'vocabulary';
      else if (item.domain === 'reading') skillId = 'reading';
      else if (item.domain === 'sentence_construction') skillId = 'sentence_complexity';
      else if (item.domain === 'grammar') skillId = 'grammar';

      diagSkillsSet.add(skillId);
      allObservations.push({
        id: `obs_diag_${item.questionId}`,
        source: 'diagnostic',
        sourceLabelEn: 'Baseline Diagnostic',
        sourceLabelBn: 'বেসলাইন ডায়াগনস্টিক',
        recordId: diagId,
        skillId,
        timestamp: diagTime,
        scorePercent: item.isCorrect ? 100 : 0,
        summaryEn: item.isCorrect
          ? `Correct diagnostic response (${item.domain.replace('_', ' ')})`
          : `Missed diagnostic item (${item.domain.replace('_', ' ')})`,
        summaryBn: item.isCorrect
          ? `ডায়াগনস্টিক প্রশ্নে সঠিক উত্তর`
          : `ডায়াগনস্টিক প্রশ্নে সংশোধনের সুযোগ`,
        limitationEn: latestDiagnostic.confidenceLabelEn || 'Short baseline diagnostic sample.',
        limitationBn: latestDiagnostic.confidenceLabelBn || 'সংক্ষিপ্ত বেসলাইন ডায়াগনস্টিক নমুনা।',
        routeTo: '/diagnostic',
      });
    }

    // Include 5-skill diagnostic listening/speaking observations if genuinely evaluated
    const fiveSkill = latestDiagnostic.fiveSkillSummary;
    if (fiveSkill) {
      const listeningEval = fiveSkill.skills.find(
        (s) => s.skill === 'listening' && s.status === 'assessed' && s.scorePercent !== null
      );
      if (listeningEval && listeningEval.scorePercent !== null) {
        const count = Math.max(1, listeningEval.totalCount);
        diagSkillsSet.add('listening');
        for (let i = 0; i < count; i++) {
          allObservations.push({
            id: `obs_diag_listen_${i + 1}`,
            source: 'diagnostic',
            sourceLabelEn: 'Initial Listening Check',
            sourceLabelBn: 'প্রাথমিক লিসেনিং যাচাই',
            recordId: diagId,
            skillId: 'listening',
            timestamp: diagTime,
            scorePercent: listeningEval.scorePercent,
            summaryEn: `Listening prompt check #${i + 1} (${listeningEval.scorePercent}%)`,
            summaryBn: `লিসেনিং প্রম্পট যাচাই #${i + 1} (${listeningEval.scorePercent}%)`,
            limitationEn: 'Uses browser speech-synthesis audio prompts rather than studio multi-accent audio.',
            limitationBn: 'ব্রাউজার স্পিচ-সিনথেসিস অডিও ব্যবহৃত হয়েছে।',
            routeTo: '/diagnostic',
          });
        }
      }
    }

    ledgerRecords.push({
      id: `ledger_${diagId}`,
      assessmentId: diagId,
      source: 'diagnostic',
      sourceLabelEn: 'Baseline Diagnostic',
      sourceLabelBn: 'বেসলাইন ডায়াগনস্টিক',
      assessmentDate: diagTime,
      skillsEvaluated: Array.from(diagSkillsSet),
      sampleCount: latestDiagnostic.items.length,
      calculationVersion: DNA_CALCULATION_VERSION,
      coverage: getCoverage(latestDiagnostic.items.length).coverage,
      coverageLabelEn: getCoverage(latestDiagnostic.items.length).labelEn,
      coverageLabelBn: getCoverage(latestDiagnostic.items.length).labelBn,
      limitationEn:
        latestDiagnostic.confidenceLabelEn ||
        'Written baseline diagnostic only; does not validate formal CEFR certification.',
      limitationBn:
        latestDiagnostic.confidenceLabelBn ||
        'শুধুমাত্র প্রাথমিক ডায়াগনস্টিক; এটি আনুষ্ঠানিক CEFR সনদ নয়।',
      titleEn: `Baseline Assessment (${latestDiagnostic.accuracyPercent}% accuracy)`,
      titleBn: `বেসলাইন মূল্যায়ন (${latestDiagnostic.accuracyPercent}% নির্ভুলতা)`,
      scoreSummaryEn: `${latestDiagnostic.accuracyPercent}% across ${latestDiagnostic.items.length} items`,
      scoreSummaryBn: `${latestDiagnostic.items.length}টি প্রশ্নে ${latestDiagnostic.accuracyPercent}%`,
      routeTo: '/diagnostic',
    });
  }

  // 2. Academy Exercise Attempts
  for (const ex of exerciseAttempts) {
    const cat = classifyMistakeCategory(ex.mistakeCategory);
    const lesson = getLessonById(ex.lessonId);
    const lessonLabelEn = lesson?.titleEn ?? ex.lessonId;
    const lessonLabelBn = lesson?.titleBn ?? ex.lessonId;
    const score = ex.isCorrect ? 100 : 0;

    if (
      cat === 'verb_tense' ||
      cat === 'prepositions' ||
      cat === 'articles' ||
      cat === 'sentence_structure'
    ) {
      allObservations.push({
        id: `obs_ex_gram_${ex.id}`,
        source: 'academy',
        sourceLabelEn: 'Academy Exercise',
        sourceLabelBn: 'একাডেমি অনুশীলন',
        recordId: ex.id,
        skillId: 'grammar',
        timestamp: ex.timestamp,
        scorePercent: score,
        summaryEn: `${lessonLabelEn} · ${ex.isCorrect ? 'Accurate' : 'Needs review'}`,
        summaryBn: `${lessonLabelBn} · ${ex.isCorrect ? 'সঠিক' : 'পুনরায় অনুশীলন প্রয়োজন'}`,
        limitationEn: 'Structured single-item Academy grammar prompt.',
        limitationBn: 'একক-প্রশ্নভিত্তিক একাডেমি ব্যাকরণ অনুশীলন।',
        routeTo: `/app/learn/${ex.lessonId}`,
      });
    }

    if (cat === 'vocabulary') {
      allObservations.push({
        id: `obs_ex_vocab_${ex.id}`,
        source: 'academy',
        sourceLabelEn: 'Academy Vocabulary Check',
        sourceLabelBn: 'একাডেমি শব্দভাণ্ডার যাচাই',
        recordId: ex.id,
        skillId: 'vocabulary',
        timestamp: ex.timestamp,
        scorePercent: score,
        summaryEn: `${lessonLabelEn} · Lexical item`,
        summaryBn: `${lessonLabelBn} · শব্দভাণ্ডার প্রশ্ন`,
        limitationEn: 'Lesson-scoped vocabulary check.',
        limitationBn: 'লেসন-ভিত্তিক শব্দভাণ্ডার যাচাই।',
        routeTo: `/app/learn/${ex.lessonId}`,
      });
    }

    if (
      ex.stage === 'independent' ||
      ex.exerciseType === 'reorder' ||
      ex.exerciseType === 'construct' ||
      cat === 'word_order'
    ) {
      allObservations.push({
        id: `obs_ex_sent_${ex.id}`,
        source: 'academy',
        sourceLabelEn: 'Academy Sentence Construction',
        sourceLabelBn: 'একাডেমি বাক্য গঠন',
        recordId: ex.id,
        skillId: 'sentence_complexity',
        timestamp: ex.timestamp,
        scorePercent: score,
        summaryEn: `${lessonLabelEn} · Sentence order & structure`,
        summaryBn: `${lessonLabelBn} · বাক্যের শব্দক্রম ও গঠন`,
        limitationEn: 'Guided/independent sentence construction check.',
        limitationBn: 'বাক্য-গঠন অনুশীলন নমুনা।',
        routeTo: `/app/learn/${ex.lessonId}`,
      });
    }

    if (ex.stage === 'independent' || ex.exerciseType === 'construct') {
      allObservations.push({
        id: `obs_ex_write_${ex.id}`,
        source: 'academy',
        sourceLabelEn: 'Academy Written Production',
        sourceLabelBn: 'একাডেমি লিখিত বাক্য রচনা',
        recordId: ex.id,
        skillId: 'writing',
        timestamp: ex.timestamp,
        scorePercent: score,
        summaryEn: `${lessonLabelEn} · Independent written sentence`,
        summaryBn: `${lessonLabelBn} · স্বাধীন লিখিত বাক্য`,
        limitationEn: 'Short single-sentence written production; not essay-length evaluation.',
        limitationBn: 'একক বাক্যের লিখিত অনুশীলন; পূর্ণাঙ্গ প্রবন্ধ নয়।',
        routeTo: `/app/learn/${ex.lessonId}`,
      });
    }

    if (
      ex.exerciseType === 'mcq' ||
      ex.exerciseType === 'error_spot' ||
      ex.mistakeCategory.toLowerCase() === 'reading'
    ) {
      allObservations.push({
        id: `obs_ex_read_${ex.id}`,
        source: 'academy',
        sourceLabelEn: 'Academy Reading & Error Spotting',
        sourceLabelBn: 'একাডেমি রিডিং ও ভুল শনাক্তকরণ',
        recordId: ex.id,
        skillId: 'reading',
        timestamp: ex.timestamp,
        scorePercent: score,
        summaryEn: `${lessonLabelEn} · Comprehension check`,
        summaryBn: `${lessonLabelBn} · বোধগম্যতা যাচাই`,
        limitationEn: 'Focused comprehension/error-spotting item.',
        limitationBn: 'সংক্ষিপ্ত বোধগম্যতা যাচাই।',
        routeTo: `/app/learn/${ex.lessonId}`,
      });
    }
  }

  for (const la of lessonAttempts) {
    const lesson = getLessonById(la.lessonId);
    const totalItems = la.guidedTotal + la.independentTotal + la.assessmentTotal;
    ledgerRecords.push({
      id: `ledger_lesson_${la.id}`,
      assessmentId: la.id,
      source: 'academy',
      sourceLabelEn: 'Academy Lesson Assessment',
      sourceLabelBn: 'একাডেমি লেসন মূল্যায়ন',
      assessmentDate: la.completedAt,
      skillsEvaluated: ['grammar', 'reading', 'sentence_complexity', 'writing'],
      sampleCount: Math.max(1, totalItems),
      calculationVersion: DNA_CALCULATION_VERSION,
      coverage: getCoverage(totalItems).coverage,
      coverageLabelEn: getCoverage(totalItems).labelEn,
      coverageLabelBn: getCoverage(totalItems).labelBn,
      limitationEn: 'Lesson-level written exercises; single-attempt mastery is capped at 45%.',
      limitationBn: 'লিখিত লেসন অনুশীলন; একক প্রচেষ্টায় মাস্টারি সর্বোচ্চ ৪৫% সীমাবদ্ধ।',
      titleEn: lesson?.titleEn ?? la.lessonId,
      titleBn: lesson?.titleBn ?? la.lessonId,
      scoreSummaryEn: `${la.overallAccuracyPercent}% accuracy (${totalItems} items)`,
      scoreSummaryBn: `${totalItems}টি প্রশ্নে ${la.overallAccuracyPercent}% নির্ভুলতা`,
      routeTo: `/app/learn/${la.lessonId}`,
    });
  }

  // 3. Mistake Repair Drills (Grammar + Writing evidence)
  for (const dr of mistakeDrillAttempts) {
    const linked = mistakes.find((m) => m.id === dr.mistakeId);
    const cat = linked ? classifyMistakeCategory(linked.category, linked.domain) : 'sentence_structure';
    const score = dr.passed ? 100 : 0;

    if (cat === 'verb_tense' || cat === 'prepositions' || cat === 'articles') {
      allObservations.push({
        id: `obs_drill_gram_${dr.id}`,
        source: 'mistake_drill',
        sourceLabelEn: 'Mistake Repair Drill',
        sourceLabelBn: 'মিস্টেক সংশোধন ড্রিল',
        recordId: dr.id,
        skillId: 'grammar',
        timestamp: dr.timestamp,
        scorePercent: score,
        summaryEn: dr.passed
          ? `Passed grammar repair (${linked?.patternEn ?? 'pattern'})`
          : `Attempted grammar repair (${linked?.patternEn ?? 'pattern'})`,
        summaryBn: dr.passed
          ? `ব্যাকরণ সংশোধন ড্রিলে উত্তীর্ণ`
          : `ব্যাকরণ সংশোধন ড্রিলে পুনরায় চেষ্টা প্রয়োজন`,
        limitationEn: 'Targeted sentence repair drill focused on one known error.',
        limitationBn: 'নির্দিষ্ট একটি ভুল সংশোধনের উপর কেন্দ্রীভূত ড্রিল।',
        routeTo: `/app/improve?focus=${encodeURIComponent(dr.mistakeId)}`,
      });
    }

    allObservations.push({
      id: `obs_drill_write_${dr.id}`,
      source: 'mistake_drill',
      sourceLabelEn: 'Mistake Rewrite Drill',
      sourceLabelBn: 'বাক্য পুনর্লিখন ড্রিল',
      recordId: dr.id,
      skillId: 'writing',
      timestamp: dr.timestamp,
      scorePercent: score,
      summaryEn: dr.passed
        ? `Accurate written repair: "${dr.userRewrite.slice(0, 48)}"`
        : `Written repair retry needed`,
      summaryBn: dr.passed ? `সঠিক লিখিত পুনর্লিখন সম্পন্ন` : `লিখিত পুনর্লিখন পুনরায় অনুশীলন প্রয়োজন`,
      limitationEn: 'Single-sentence correction rewrite.',
      limitationBn: 'একক বাক্য পুনর্লিখন অনুশীলন।',
      routeTo: `/app/improve?focus=${encodeURIComponent(dr.mistakeId)}`,
    });

    ledgerRecords.push({
      id: `ledger_drill_${dr.id}`,
      assessmentId: dr.id,
      source: 'mistake_drill',
      sourceLabelEn: 'Mistake Memory Drill',
      sourceLabelBn: 'মিস্টেক মেমোরি ড্রিল',
      assessmentDate: dr.timestamp,
      skillsEvaluated: ['grammar', 'writing'],
      sampleCount: 1,
      calculationVersion: DNA_CALCULATION_VERSION,
      coverage: 'low_confidence',
      coverageLabelEn: 'Single Repair Sample',
      coverageLabelBn: 'একক সংশোধন নমুনা',
      limitationEn: 'Verifies isolated sentence repair; transfer to live speech is tracked separately.',
      limitationBn: 'বিচ্ছিন্ন বাক্য সংশোধন যাচাই করে; বাস্তব কথোপকথনে প্রয়োগ আলাদাভাবে মাপা হয়।',
      titleEn: linked?.patternEn ?? 'Mistake Repair Drill',
      titleBn: linked?.patternBn ?? 'ভুল সংশোধন ড্রিল',
      scoreSummaryEn: dr.passed ? 'Passed rewrite verification' : 'Retry scheduled',
      scoreSummaryBn: dr.passed ? 'সংশোধন সফল' : 'পুনরায় অনুশীলন নির্ধারিত',
      routeTo: `/app/improve?focus=${encodeURIComponent(dr.mistakeId)}`,
    });
  }

  // 4. AI Speaking Studio Sessions (Grammar, Vocabulary, Speaking, Sentence Complexity, Functional, Context)
  for (const session of speakingSessions) {
    if (session.turns.length === 0) continue;
    const scenario = getSpeakingScenario(session.modeId);

    for (const turn of session.turns) {
      const validTurnMistakes = turn.evaluation.mistakes.filter(
        (m) => !reportedFalseKeys.has(m.original.trim().toLowerCase())
      );

      // Grammar
      const grammarErrs = validTurnMistakes.filter((m) => {
        const cat = classifyMistakeCategory(m.category);
        return cat === 'verb_tense' || cat === 'prepositions' || cat === 'articles';
      }).length;
      allObservations.push({
        id: `obs_spk_gram_${session.id}_${turn.id}`,
        source: 'speaking',
        sourceLabelEn: 'AI Speaking Studio',
        sourceLabelBn: 'AI স্পিকিং স্টুডিও',
        recordId: session.id,
        skillId: 'grammar',
        timestamp: turn.createdAt,
        scorePercent: clampPercent(100 - grammarErrs * 30),
        summaryEn: `${scenario.titleEn} · Turn ${turn.turnNumber} (${grammarErrs} grammar ${grammarErrs === 1 ? 'note' : 'notes'})`,
        summaryBn: `${scenario.titleBn} · ধাপ ${turn.turnNumber}`,
        limitationEn: 'Transcript-based AI grammar evaluation.',
        limitationBn: 'ট্রান্সক্রিপ্ট-ভিত্তিক AI ব্যাকরণ মূল্যায়ন।',
        routeTo: '/app/speak',
      });

      // Vocabulary
      const words = turn.userTranscript
        .toLowerCase()
        .replace(/[^a-z'\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2);
      const uniqueWords = new Set(words);
      const vocabErrs = validTurnMistakes.filter(
        (m) => classifyMistakeCategory(m.category) === 'vocabulary'
      ).length;
      const richnessBase =
        words.length > 0
          ? Math.min(100, Math.round((uniqueWords.size / Math.max(words.length, 6)) * 100))
          : 50;
      const vocabTurnScore = clampPercent(
        richnessBase + Math.min(20, uniqueWords.size * 2) - vocabErrs * 25
      );
      allObservations.push({
        id: `obs_spk_vocab_${session.id}_${turn.id}`,
        source: 'speaking',
        sourceLabelEn: 'AI Speaking Studio',
        sourceLabelBn: 'AI স্পিকিং স্টুডিও',
        recordId: session.id,
        skillId: 'vocabulary',
        timestamp: turn.createdAt,
        scorePercent: vocabTurnScore,
        summaryEn: `${scenario.titleEn} · ${uniqueWords.size} distinct words`,
        summaryBn: `${scenario.titleBn} · ${uniqueWords.size}টি স্বতন্ত্র শব্দ`,
        limitationEn: 'Lexical variety measured from spoken transcript.',
        limitationBn: 'কথোপকথনের ট্রান্সক্রিপ্ট থেকে শব্দের বৈচিত্র্য পরিমাপকৃত।',
        routeTo: '/app/speak',
      });

      // Speaking Task Completion
      const wordCount = turn.userTranscript.trim().split(/\s+/).filter(Boolean).length;
      let spkScore = 60;
      if (wordCount >= 8) spkScore += 20;
      else if (wordCount >= 4) spkScore += 10;
      if (turn.evaluation.correct_elements.length > 0) spkScore += 15;
      if (turn.inputChannel === 'voice_stt' || turn.inputChannel === 'voice_with_manual_edit') {
        spkScore += 5;
      }
      if (turn.timedOut) spkScore -= 15;
      allObservations.push({
        id: `obs_spk_task_${session.id}_${turn.id}`,
        source: 'speaking',
        sourceLabelEn: 'AI Speaking Studio',
        sourceLabelBn: 'AI স্পিকিং স্টুডিও',
        recordId: session.id,
        skillId: 'speaking',
        timestamp: turn.createdAt,
        scorePercent: clampPercent(spkScore),
        summaryEn: `${scenario.titleEn} · Turn ${turn.turnNumber} (${wordCount} words)`,
        summaryBn: `${scenario.titleBn} · ধাপ ${turn.turnNumber} (${wordCount} শব্দ)`,
        limitationEn: 'Measures transcript completeness and timing; no acoustic fluency/accent meter connected.',
        limitationBn: 'ট্রান্সক্রিপ্ট ও সময়কাল পরিমাপ করে; অ্যাকোস্টিক অ্যাক্সেন্ট স্কোরিং যুক্ত নয়।',
        routeTo: '/app/speak',
      });

      // Sentence Complexity
      const hasConnector =
        /\b(because|although|while|when|which|that|however|so|and|but|if|since)\b/i.test(
          turn.userTranscript
        );
      const structErrs = validTurnMistakes.filter((m) => {
        const cat = classifyMistakeCategory(m.category);
        return cat === 'word_order' || cat === 'sentence_structure';
      }).length;
      const sentTurnScore = clampPercent(
        Math.min(75, wordCount * 6) + (hasConnector ? 25 : 0) - structErrs * 25
      );
      allObservations.push({
        id: `obs_spk_sent_${session.id}_${turn.id}`,
        source: 'speaking',
        sourceLabelEn: 'AI Speaking Studio',
        sourceLabelBn: 'AI স্পিকিং স্টুডিও',
        recordId: session.id,
        skillId: 'sentence_complexity',
        timestamp: turn.createdAt,
        scorePercent: sentTurnScore,
        summaryEn: `${scenario.titleEn} · ${hasConnector ? 'Multi-clause turn' : 'Simple clause turn'}`,
        summaryBn: `${scenario.titleBn} · ${hasConnector ? 'সংযুক্ত বাক্য' : 'সরল বাক্য'}`,
        limitationEn: 'Heuristic clause/connector structure check on spoken transcript.',
        limitationBn: 'কথোপকথনের বাক্য কাঠামো বিশ্লেষণ।',
        routeTo: '/app/speak',
      });

      // Functional Communication (Speaking scenario fulfillment)
      const funcScore = clampPercent(
        58 +
          Math.min(24, turn.evaluation.correct_elements.length * 12) +
          (wordCount >= 6 ? 12 : 4) -
          (turn.timedOut ? 14 : 0) -
          Math.min(20, validTurnMistakes.length * 6)
      );
      allObservations.push({
        id: `obs_spk_func_${session.id}_${turn.id}`,
        source: 'speaking',
        sourceLabelEn: 'Speaking Roleplay',
        sourceLabelBn: 'স্পিকিং রোলপ্লে',
        recordId: session.id,
        skillId: 'functional_communication',
        timestamp: turn.createdAt,
        scorePercent: funcScore,
        summaryEn: `${scenario.titleEn} · Task fulfillment turn ${turn.turnNumber}`,
        summaryBn: `${scenario.titleBn} · ধাপ ${turn.turnNumber} লক্ষ্য পূরণ`,
        limitationEn: 'Reflects simulated roleplay turns.',
        limitationBn: 'সিমুলেটেড রোলপ্লে সেশনের ভিত্তিতে নির্ণীত।',
        routeTo: '/app/speak',
      });

      // Contextual Appropriateness (Speaking scenario register/relevance)
      const ctxScore = clampPercent(
        72 +
          (turn.evaluation.correct_elements.length > 0 ? 18 : 0) -
          Math.min(30, vocabErrs * 15 + grammarErrs * 8)
      );
      allObservations.push({
        id: `obs_spk_ctx_${session.id}_${turn.id}`,
        source: 'speaking',
        sourceLabelEn: 'Speaking Roleplay',
        sourceLabelBn: 'স্পিকিং রোলপ্লে',
        recordId: session.id,
        skillId: 'contextual_appropriateness',
        timestamp: turn.createdAt,
        scorePercent: ctxScore,
        summaryEn: `${scenario.titleEn} · Contextual register check`,
        summaryBn: `${scenario.titleBn} · প্রেক্ষাপট-উপযোগিতা যাচাই`,
        limitationEn: 'Evaluated from transcript context against scenario prompt.',
        limitationBn: 'সিনারিও প্রম্পটের সাথে উত্তরের প্রাসঙ্গিকতা যাচাই।',
        routeTo: '/app/speak',
      });
    }

    ledgerRecords.push({
      id: `ledger_spk_${session.id}`,
      assessmentId: session.id,
      source: 'speaking',
      sourceLabelEn: 'AI Speaking Studio',
      sourceLabelBn: 'AI স্পিকিং স্টুডিও',
      assessmentDate: session.updatedAt,
      skillsEvaluated: [
        'speaking',
        'grammar',
        'vocabulary',
        'sentence_complexity',
        'functional_communication',
        'contextual_appropriateness',
      ],
      sampleCount: session.turns.length,
      calculationVersion: DNA_CALCULATION_VERSION,
      coverage: getCoverage(session.turns.length).coverage,
      coverageLabelEn: getCoverage(session.turns.length).labelEn,
      coverageLabelBn: getCoverage(session.turns.length).labelBn,
      limitationEn:
        'Evaluates recognized text transcript & timing only; acoustic phoneme pronunciation is not scored.',
      limitationBn:
        'শুধুমাত্র ট্রান্সক্রিপ্ট ও সময়কাল মূল্যায়ন করে; অ্যাকোস্টিক ফোনিম উচ্চারণ স্কোর করা হয় না।',
      titleEn: `${scenario.titleEn} (${session.turns.length} ${session.turns.length === 1 ? 'turn' : 'turns'})`,
      titleBn: `${scenario.titleBn} (${session.turns.length} ধাপ)`,
      scoreSummaryEn: `${session.totalMistakesDetected} ${session.totalMistakesDetected === 1 ? 'mistake' : 'mistakes'} flagged`,
      scoreSummaryBn: `${session.totalMistakesDetected}টি ভুল শনাক্ত`,
      routeTo: '/app/speak',
    });
  }

  // 5. Transfer Lab Attempts (Functional Communication, Contextual Appropriateness, Writing, Grammar)
  for (const tr of transferAttempts) {
    if (
      !tr.evaluation ||
      typeof tr.evaluation.overall_score !== 'number' ||
      !tr.evaluation.task_completion ||
      !tr.evaluation.contextual_appropriateness ||
      !tr.evaluation.response_relevance ||
      !tr.evaluation.target_grammar_application
    ) {
      continue;
    }
    const scenario = getTransferScenario(tr.scenarioId);
    const titleEn = scenario?.titleEn ?? tr.scenarioId;
    const titleBn = scenario?.titleBn ?? tr.scenarioId;

    const taskCompScore = clampPercent(tr.evaluation.task_completion.score);
    allObservations.push({
      id: `obs_tr_func_${tr.id}`,
      source: 'transfer_lab',
      sourceLabelEn: 'Transfer Lab',
      sourceLabelBn: 'ট্রান্সফার ল্যাব',
      recordId: tr.id,
      skillId: 'functional_communication',
      timestamp: tr.completedAt,
      scorePercent: taskCompScore,
      summaryEn: `${titleEn} · Task completion (${taskCompScore}%)`,
      summaryBn: `${titleBn} · কাজ সম্পন্নতা (${taskCompScore}%)`,
      limitationEn: 'Rubric-graded real-world transfer simulation.',
      limitationBn: 'রুব্রিক-ভিত্তিক ট্রান্সফার ল্যাব সিমুলেশন।',
      routeTo: '/app/transfer-lab',
    });

    const ctxAvg = clampPercent(
      (tr.evaluation.contextual_appropriateness.score + tr.evaluation.response_relevance.score) / 2
    );
    allObservations.push({
      id: `obs_tr_ctx_${tr.id}`,
      source: 'transfer_lab',
      sourceLabelEn: 'Transfer Lab',
      sourceLabelBn: 'ট্রান্সফার ল্যাব',
      recordId: tr.id,
      skillId: 'contextual_appropriateness',
      timestamp: tr.completedAt,
      scorePercent: ctxAvg,
      summaryEn: `${titleEn} · Context & relevance (${ctxAvg}%)`,
      summaryBn: `${titleBn} · প্রেক্ষাপট ও প্রাসঙ্গিকতা (${ctxAvg}%)`,
      limitationEn: 'Evaluates contextual register and relevance via Transfer Lab rubric.',
      limitationBn: 'ট্রান্সফার ল্যাব রুব্রিক দ্বারা প্রাসঙ্গিকতা মূল্যায়ন।',
      routeTo: '/app/transfer-lab',
    });

    const targetGramScore = clampPercent(tr.evaluation.target_grammar_application.score);
    allObservations.push({
      id: `obs_tr_gram_${tr.id}`,
      source: 'transfer_lab',
      sourceLabelEn: 'Transfer Lab',
      sourceLabelBn: 'ট্রান্সফার ল্যাব',
      recordId: tr.id,
      skillId: 'grammar',
      timestamp: tr.completedAt,
      scorePercent: targetGramScore,
      summaryEn: `${titleEn} · Target grammar transfer (${targetGramScore}%)`,
      summaryBn: `${titleBn} · ব্যাকরণ প্রয়োগ (${targetGramScore}%)`,
      limitationEn: 'Measures transfer of target lesson grammar into open scenarios.',
      limitationBn: 'বাস্তব পরিস্থিতিতে নির্দিষ্ট ব্যাকরণের প্রয়োগ পরিমাপ।',
      routeTo: '/app/transfer-lab',
    });

    if (tr.inputChannel === 'text_fallback' || tr.userResponse.trim().length > 0) {
      allObservations.push({
        id: `obs_tr_write_${tr.id}`,
        source: 'transfer_lab',
        sourceLabelEn: 'Transfer Lab',
        sourceLabelBn: 'ট্রান্সফার ল্যাব',
        recordId: tr.id,
        skillId: 'writing',
        timestamp: tr.completedAt,
        scorePercent: clampPercent(tr.evaluation.overall_score),
        summaryEn: `${titleEn} · Applied response (${tr.evaluation.overall_score}%)`,
        summaryBn: `${titleBn} · প্রয়োগমূলক উত্তর (${tr.evaluation.overall_score}%)`,
        limitationEn: 'Short scenario response rather than formal long-form writing.',
        limitationBn: 'সংক্ষিপ্ত সিনারিও উত্তর; দীর্ঘ প্রবন্ধ নয়।',
        routeTo: '/app/transfer-lab',
      });
    }

    ledgerRecords.push({
      id: `ledger_tr_${tr.id}`,
      assessmentId: tr.id,
      source: 'transfer_lab',
      sourceLabelEn: 'Transfer Lab',
      sourceLabelBn: 'ট্রান্সফার ল্যাব',
      assessmentDate: tr.completedAt,
      skillsEvaluated: ['functional_communication', 'contextual_appropriateness', 'grammar', 'writing'],
      sampleCount: 4,
      calculationVersion: DNA_CALCULATION_VERSION,
      coverage: 'verified',
      coverageLabelEn: '4-Rubric Transfer Check',
      coverageLabelBn: '৪-রুব্রিক ট্রান্সফার যাচাই',
      limitationEn: 'AI rubric-graded scenario response under selected Pressure Ladder level.',
      limitationBn: 'নির্বাচিত প্রেশার ল্যাডার স্তরে AI রুব্রিক মূল্যায়ন।',
      titleEn: `${titleEn} (${tr.evaluation.passed ? 'Passed' : 'Retry'})`,
      titleBn: `${titleBn} (${tr.evaluation.passed ? 'উত্তীর্ণ' : 'পুনরায় চেষ্টা'})`,
      scoreSummaryEn: `${tr.evaluation.overall_score}% overall transfer score`,
      scoreSummaryBn: `সামগ্রিক ট্রান্সফার স্কোর ${tr.evaluation.overall_score}%`,
      routeTo: '/app/transfer-lab',
    });
  }

  // Filter observations by selected timeframe
  const inCurrentWindow = (ts: string) => {
    if (currentStartMs === null) return true;
    const ms = new Date(ts).getTime();
    return Number.isFinite(ms) && ms >= currentStartMs && ms <= now.getTime();
  };

  const inPrevWindow = (ts: string) => {
    if (prevStartMs === null || prevEndMs === null) return false;
    const ms = new Date(ts).getTime();
    return Number.isFinite(ms) && ms >= prevStartMs && ms < prevEndMs;
  };

  const currentObservations = allObservations.filter((obs) => inCurrentWindow(obs.timestamp));
  const previousObservations = allObservations.filter((obs) => inPrevWindow(obs.timestamp));

  // Build all 10 DNA skill nodes
  let hasHistoricalComparison = false;

  const skills: DnaSkillNode[] = ALL_DNA_SKILL_IDS.map((skillId) => {
    const meta = SKILL_META[skillId];
    // Pronunciation is strictly acoustic-gated: 0 acoustic samples in current runtime
    const skillObs =
      skillId === 'pronunciation'
        ? []
        : currentObservations
            .filter((o) => o.skillId === skillId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const prevSkillObs =
      skillId === 'pronunciation'
        ? []
        : previousObservations.filter((o) => o.skillId === skillId);

    const sampleSize = skillObs.length;
    const cov = getCoverage(sampleSize);
    const scorePercent =
      sampleSize >= MIN_DNA_SAMPLES
        ? clampPercent(skillObs.reduce((s, o) => s + o.scorePercent, 0) / sampleSize)
        : null;

    const previousPeriodScorePercent =
      prevSkillObs.length >= MIN_DNA_SAMPLES
        ? clampPercent(prevSkillObs.reduce((s, o) => s + o.scorePercent, 0) / prevSkillObs.length)
        : null;

    let deltaPercent: number | null = null;
    if (scorePercent !== null && previousPeriodScorePercent !== null) {
      deltaPercent = scorePercent - previousPeriodScorePercent;
      hasHistoricalComparison = true;
    }

    const visualState = getVisualState(scorePercent, cov.coverage);
    const lastAssessedAt = skillObs[0]?.timestamp ?? null;
    const timestamps = skillObs.map((o) => o.timestamp);
    const supportingRecordIds = Array.from(new Set(skillObs.map((o) => o.recordId)));

    // Build honest skill-specific strengths and improvement cues strictly from observations
    const strengthsEn: string[] = [];
    const strengthsBn: string[] = [];
    const improvementsEn: string[] = [];
    const improvementsBn: string[] = [];

    if (skillId === 'pronunciation') {
      improvementsEn.push(
        'Acoustic phoneme evaluation is not yet connected. You can still self-review recorded audio in AI Speaking Studio.'
      );
      improvementsBn.push(
        'অ্যাকোস্টিক ফোনিম মূল্যায়ন এখনো সংযুক্ত নয়। তবে স্পিকিং স্টুডিওতে নিজের রেকর্ডকৃত অডিও শুনে অনুশীলন করতে পারেন।'
      );
    } else if (scorePercent === null) {
      const needed = MIN_DNA_SAMPLES - sampleSize;
      improvementsEn.push(
        `Not enough assessment data (${sampleSize}/${MIN_DNA_SAMPLES} samples). Complete ${needed} more verified ${needed === 1 ? 'sample' : 'samples'} to unlock a measured score.`
      );
      improvementsBn.push(
        `পর্যাপ্ত মূল্যায়ন তথ্য নেই (${sampleSize}/${MIN_DNA_SAMPLES} নমুনা)। পরিমাপকৃত স্কোর দেখতে আরও ${needed}টি নমুনা সম্পন্ন করুন।`
      );
    } else {
      const highCount = skillObs.filter((o) => o.scorePercent >= 75).length;
      const lowCount = skillObs.filter((o) => o.scorePercent < 65).length;

      if (highCount > 0) {
        strengthsEn.push(
          `${highCount} of ${sampleSize} recent samples reached 75%+ accuracy (${scorePercent}% average).`
        );
        strengthsBn.push(
          `সাম্প্রতিক ${sampleSize}টি নমুনার মধ্যে ${highCount}টিতে ৭৫%+ দক্ষতা অর্জিত হয়েছে (গড় ${scorePercent}%)।`
        );
      }
      if (cov.coverage === 'verified') {
        strengthsEn.push(`Verified evidence depth across ${sampleSize} tracked assessment samples.`);
        strengthsBn.push(`${sampleSize}টি যাচাইকৃত নমুনার ভিত্তিতে নির্ভরযোগ্য প্রমাণ সংগৃহীত।`);
      }

      if (lowCount > 0) {
        improvementsEn.push(
          `${lowCount} of ${sampleSize} samples scored below 65% — review supporting records and practice targeted drills.`
        );
        improvementsBn.push(
          `${sampleSize}টি নমুনার মধ্যে ${lowCount}টিতে ৬৫%-এর নিচে স্কোর হয়েছে — নির্ধারিত ড্রিল অনুশীলন করুন।`
        );
      } else if (cov.coverage === 'low_confidence') {
        improvementsEn.push(
          `Currently at ${sampleSize} samples (Low Confidence). Reach 8+ verified samples for high-confidence measurement.`
        );
        improvementsBn.push(
          `বর্তমানে ${sampleSize}টি নমুনা আছে। উচ্চ আত্মবিশ্বাসের জন্য ৮+ নমুনা সম্পন্ন করুন।`
        );
      } else {
        improvementsEn.push(
          'Maintain retention through spaced review and higher Pressure Ladder scenarios.'
        );
        improvementsBn.push(
          'স্পেসড রিভিউ এবং উচ্চতর প্রেশার ল্যাডার সিনারিওর মাধ্যমে এই দক্ষতা ধরে রাখুন।'
        );
      }
    }

    const recommendedPracticeEn =
      skillId === 'speaking'
        ? 'Complete a 3-turn AI Speaking Studio roleplay'
        : skillId === 'grammar'
          ? 'Complete a Grammar Academy lesson or Mistake Memory repair drill'
          : skillId === 'vocabulary'
            ? 'Practice contextual word choice in Academy & Speaking Studio'
            : skillId === 'listening'
              ? 'Complete the Listening checks inside Initial Assessment'
              : skillId === 'reading'
                ? 'Complete Academy comprehension & error-spotting exercises'
                : skillId === 'writing'
                  ? 'Complete independent sentence rewrites in Mistake Memory or Academy'
                  : skillId === 'functional_communication' ||
                      skillId === 'contextual_appropriateness'
                    ? 'Complete a Transfer Lab real-world scenario under Pressure Ladder'
                    : skillId === 'sentence_complexity'
                      ? 'Practice sentence construction & multi-clause speaking turns'
                      : 'Record and self-review articulation drills in Speaking Studio';

    const recommendedPracticeBn =
      skillId === 'speaking'
        ? 'AI স্পিকিং স্টুডিওতে ৩-ধাপের রোলপ্লে সম্পন্ন করুন'
        : skillId === 'grammar'
          ? 'একাডেমি ব্যাকরণ লেসন অথবা মিস্টেক মেমোরি ড্রিল অনুশীলন করুন'
          : skillId === 'vocabulary'
            ? 'একাডেমি ও স্পিকিং স্টুডিওতে প্রাসঙ্গিক শব্দচয়ন অনুশীলন করুন'
            : skillId === 'listening'
              ? 'ডায়াগনস্টিক মূল্যায়নে লিসেনিং প্রম্পট সম্পন্ন করুন'
              : skillId === 'reading'
                ? 'একাডেমিতে রিডিং ও ভুল শনাক্তকরণ অনুশীলন সম্পন্ন করুন'
                : skillId === 'writing'
                  ? 'মিস্টেক মেমোরি বা একাডেমিতে স্বাধীন বাক্য রচনা সম্পন্ন করুন'
                  : skillId === 'functional_communication' ||
                      skillId === 'contextual_appropriateness'
                    ? 'ট্রান্সফার ল্যাবে একটি বাস্তব-পরিস্থিতি সিনারিও সম্পন্ন করুন'
                    : skillId === 'sentence_complexity'
                      ? 'বাক্য গঠন ও সংযুক্ত বাক্যের কথোপকথন অনুশীলন করুন'
                      : 'স্পিকিং স্টুডিওতে অডিও রেকর্ড করে নিজের উচ্চারণ পর্যালোচনা করুন';

    const completionCriteriaEn =
      scorePercent === null
        ? `Record at least ${Math.max(1, MIN_DNA_SAMPLES - sampleSize)} verified ${
            MIN_DNA_SAMPLES - sampleSize === 1 ? 'sample' : 'samples'
          } to unlock measured tracking.`
        : 'Achieve 80%+ accuracy across 2 consecutive verified samples.';

    const completionCriteriaBn =
      scorePercent === null
        ? `পরিমাপ আনলক করতে আরও অন্তত ${Math.max(1, MIN_DNA_SAMPLES - sampleSize)}টি যাচাইকৃত নমুনা সম্পন্ন করুন।`
        : 'পরপর ২টি যাচাইকৃত অনুশীলনে ৮০%+ নির্ভুলতা অর্জন করুন।';

    return {
      id: skillId,
      group: meta.group,
      titleEn: meta.titleEn,
      titleBn: meta.titleBn,
      shortLabelEn: meta.shortLabelEn,
      shortLabelBn: meta.shortLabelBn,
      scorePercent,
      previousPeriodScorePercent,
      deltaPercent,
      sampleSize,
      minSamplesRequired: MIN_DNA_SAMPLES,
      coverage: cov.coverage,
      coverageLabelEn: cov.labelEn,
      coverageLabelBn: cov.labelBn,
      confidencePercent: cov.confidencePercent,
      visualState,
      lastAssessedAt,
      dateRangeLabelEn: buildDateRangeLabel(timestamps, 'en'),
      dateRangeLabelBn: buildDateRangeLabel(timestamps, 'bn'),
      definitionEn: meta.definitionEn,
      definitionBn: meta.definitionBn,
      limitationEn: meta.limitationEn,
      limitationBn: meta.limitationBn,
      strengthsEn,
      strengthsBn,
      improvementsEn,
      improvementsBn,
      recommendedPracticeEn,
      recommendedPracticeBn,
      recommendedDurationMinutes: meta.defaultDuration,
      completionCriteriaEn,
      completionCriteriaBn,
      recommendedRoute: meta.defaultRoute,
      recentHistory: skillObs.slice(0, 6),
      supportingRecordIds,
      position3D: meta.position3D,
      connectedTo: meta.connectedTo,
    };
  });

  const coreSkills = skills.filter((s) => s.group === 'core');
  const extendedSkills = skills.filter((s) => s.group === 'extended');
  const measuredSkills = skills.filter((s) => s.scorePercent !== null);
  const measuredCount = measuredSkills.length;

  // Unique verified samples in current window (avoid double-counting same observation ID)
  const totalVerifiedSamples = currentObservations.length;
  // Measurable dimensions = 9 (pronunciation explicitly unmeasured without acoustic engine), or express out of 10 with honest explanation
  const evidenceCoveragePercent = Math.round((measuredCount / 10) * 100);

  const sortedLedger = ledgerRecords
    .filter((r) => inCurrentWindow(r.assessmentDate))
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());

  const lastAssessmentDate =
    sortedLedger[0]?.assessmentDate ??
    allObservations
      .map((o) => o.timestamp)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
    null;

  // Build Historical Development Trend (grouped by real active day — gated on >= 2 distinct days!)
  const byDay = new Map<
    string,
    { scores: number[]; sources: Set<string>; isoSample: string }
  >();
  for (const obs of currentObservations) {
    const key = toDateKey(obs.timestamp);
    const bucket = byDay.get(key) ?? {
      scores: [],
      sources: new Set<string>(),
      isoSample: obs.timestamp,
    };
    bucket.scores.push(obs.scorePercent);
    bucket.sources.add(obs.source);
    byDay.set(key, bucket);
  }

  const trendPoints: DnaHistoryTrendPoint[] = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([dateKey, bucket]) => ({
      dateKey,
      labelEn: formatShortDate(bucket.isoSample, 'en'),
      labelBn: formatShortDate(bucket.isoSample, 'bn'),
      avgScorePercent: clampPercent(
        bucket.scores.reduce((s, v) => s + v, 0) / bucket.scores.length
      ),
      sampleCount: bucket.scores.length,
      sourcesCount: bucket.sources.size,
    }));

  // Evidence Distribution by Source
  const sourceConfig: Array<{
    source: DnaObservationPoint['source'];
    labelEn: string;
    labelBn: string;
    colorHex: string;
  }> = [
    { source: 'diagnostic', labelEn: 'Baseline Diagnostic', labelBn: 'ডায়াগনস্টিক', colorHex: '#00D9FF' },
    { source: 'academy', labelEn: 'Academy Lessons', labelBn: 'একাডেমি লেসন', colorHex: '#2864FF' },
    { source: 'speaking', labelEn: 'AI Speaking Studio', labelBn: 'স্পিকিং স্টুডিও', colorHex: '#8050FF' },
    { source: 'mistake_drill', labelEn: 'Mistake Drills', labelBn: 'মিস্টেক ড্রিল', colorHex: '#F59E0B' },
    { source: 'transfer_lab', labelEn: 'Transfer Lab', labelBn: 'ট্রান্সফার ল্যাব', colorHex: '#16E58B' },
  ];

  const evidenceDistribution: DnaEvidenceDistributionItem[] = sourceConfig.map((cfg) => {
    const count = currentObservations.filter((o) => o.source === cfg.source).length;
    return {
      source: cfg.source,
      labelEn: cfg.labelEn,
      labelBn: cfg.labelBn,
      sampleCount: count,
      sharePercent:
        totalVerifiedSamples > 0 ? Math.round((count / totalVerifiedSamples) * 100) : 0,
      colorHex: cfg.colorHex,
    };
  });

  // Section 07 — Evidence-Supported Strengths (measured >= 70%)
  const strengths: DnaStrengthItem[] = measuredSkills
    .filter((s) => (s.scorePercent ?? 0) >= 70)
    .sort((a, b) => (b.scorePercent ?? 0) - (a.scorePercent ?? 0))
    .slice(0, 4)
    .map((s) => ({
      skillId: s.id,
      titleEn: s.titleEn,
      titleBn: s.titleBn,
      scorePercent: s.scorePercent!,
      sampleSize: s.sampleSize,
      coverage: s.coverage,
      coverageLabelEn: s.coverageLabelEn,
      coverageLabelBn: s.coverageLabelBn,
      dateRangeEn: s.dateRangeLabelEn,
      dateRangeBn: s.dateRangeLabelBn,
      supportingEvidenceEn:
        s.strengthsEn[0] ??
        `Observed ${s.scorePercent}% average across ${s.sampleSize} verified samples.`,
      supportingEvidenceBn:
        s.strengthsBn[0] ??
        `${s.sampleSize}টি যাচাইকৃত নমুনায় গড় ${s.scorePercent}% দক্ষতা পর্যবেক্ষিত।`,
    }));

  // Section 08 — Growth Opportunities (strictly evidence-backed)
  const growthOpportunities: DnaGrowthOpportunity[] = [];
  const activeMistakes = mistakes
    .filter((m) => !m.falseCorrectionReported && m.status !== 'resolved')
    .sort((a, b) => b.occurrences - a.occurrences);

  // Opportunity 1: Highest recurring active mistake pattern
  if (activeMistakes.length > 0) {
    const top = activeMistakes[0];
    const cat = classifyMistakeCategory(top.category, top.domain);
    const linkedSkill: DnaSkillId =
      cat === 'vocabulary'
        ? 'vocabulary'
        : cat === 'word_order'
          ? 'sentence_complexity'
          : 'grammar';
    growthOpportunities.push({
      id: `opp_mistake_${top.id}`,
      skillId: linkedSkill,
      priority: 'high',
      weaknessEn: `Recurring ${top.category} pattern: "${top.patternEn}"`,
      weaknessBn: `পুনরাবৃত্ত ${top.category} ভুল: "${top.patternBn}"`,
      supportingEvidenceEn: `Observed ${top.occurrences}x across sessions ("${top.userExample}" → "${top.correctedExample}").`,
      supportingEvidenceBn: `${top.occurrences} বার পর্যবেক্ষিত ("${top.userExample}" → "${top.correctedExample}")।`,
      whyItMattersEn:
        'Repairing recurring habits directly raises both spoken clarity and grammatical reliability under pressure.',
      whyItMattersBn:
        'পুনরাবৃত্ত ভুল সংশোধন করলে কথোপকথনের স্পষ্টতা ও ব্যাকরণগত নির্ভরযোগ্যতা দ্রুত বৃদ্ধি পায়।',
      recommendedExerciseEn: 'Run a 2-step Mistake Memory repair drill',
      recommendedExerciseBn: 'মিস্টেক মেমোরিতে ২-ধাপের সংশোধন ড্রিল সম্পন্ন করুন',
      expectedDurationMinutes: 4,
      difficultyLabelEn: top.severity === 'high' ? 'Focused Repair' : 'Standard Repair',
      difficultyLabelBn: top.severity === 'high' ? 'গুরুত্বপূর্ণ সংশোধন' : 'নিয়মিত সংশোধন',
      completionCriteriaEn: 'Pass the recognition check and write 1 accurate correction rewrite.',
      completionCriteriaBn: 'সঠিক বিকল্প বাছাই করুন এবং ১টি নির্ভুল বাক্য পুনর্লিখন সম্পন্ন করুন।',
      routeTo: `/app/improve?focus=${encodeURIComponent(top.id)}`,
      supportingRecordIds: top.speakingSessionId ? [top.speakingSessionId] : [],
    });
  }

  // Opportunity 2: Lowest measured dimension (< 78%)
  const weakMeasured = measuredSkills
    .filter((s) => (s.scorePercent ?? 100) < 78)
    .sort((a, b) => (a.scorePercent ?? 100) - (b.scorePercent ?? 100));

  for (const dim of weakMeasured.slice(0, 2)) {
    if (growthOpportunities.length >= 3) break;
    growthOpportunities.push({
      id: `opp_dim_${dim.id}`,
      skillId: dim.id,
      priority: (dim.scorePercent ?? 100) < 60 ? 'high' : 'medium',
      weaknessEn: `${dim.titleEn} currently at ${dim.scorePercent}%`,
      weaknessBn: `${dim.titleBn} বর্তমানে ${dim.scorePercent}%`,
      supportingEvidenceEn: `Measured across ${dim.sampleSize} verified samples (${dim.dateRangeLabelEn}).`,
      supportingEvidenceBn: `${dim.sampleSize}টি যাচাইকৃত নমুনায় পরিমাপকৃত (${dim.dateRangeLabelBn})।`,
      whyItMattersEn: dim.definitionEn,
      whyItMattersBn: dim.definitionBn,
      recommendedExerciseEn: dim.recommendedPracticeEn,
      recommendedExerciseBn: dim.recommendedPracticeBn,
      expectedDurationMinutes: dim.recommendedDurationMinutes,
      difficultyLabelEn: (dim.scorePercent ?? 100) < 60 ? 'Core Rebuild' : 'Skill Reinforcement',
      difficultyLabelBn: (dim.scorePercent ?? 100) < 60 ? 'ভিত্তি সুদৃঢ়করণ' : 'দক্ষতা বৃদ্ধি',
      completionCriteriaEn: dim.completionCriteriaEn,
      completionCriteriaBn: dim.completionCriteriaBn,
      routeTo: dim.recommendedRoute,
      supportingRecordIds: dim.supportingRecordIds,
    });
  }

  // Opportunity 3: Unmeasured core skills (Speaking, Academy, Diagnostic) so cold-start users get real actionable steps
  const speakingSkill = skills.find((s) => s.id === 'speaking')!;
  if (speakingSkill.scorePercent === null && growthOpportunities.length < 3) {
    const remaining = MIN_DNA_SAMPLES - speakingSkill.sampleSize;
    growthOpportunities.push({
      id: 'opp_unlock_speaking',
      skillId: 'speaking',
      priority: 'medium',
      weaknessEn: 'Speaking evidence not yet unlocked',
      weaknessBn: 'স্পিকিং দক্ষতার প্রমাণ এখনো আনলক হয়নি',
      supportingEvidenceEn: `${speakingSkill.sampleSize} of ${MIN_DNA_SAMPLES} required Speaking Studio turns recorded.`,
      supportingEvidenceBn: `প্রয়োজনীয় ${MIN_DNA_SAMPLES}টি স্পিকিং ধাপের মধ্যে ${speakingSkill.sampleSize}টি সংরক্ষিত আছে।`,
      whyItMattersEn:
        'Spoken English uses live recall under time pressure and cannot be inferred from written grammar exercises.',
      whyItMattersBn:
        'কথোপকথনের দক্ষতা লিখিত অনুশীলন থেকে অনুমান করা যায় না; বাস্তব স্পিকিং সেশন প্রয়োজন।',
      recommendedExerciseEn: `Complete ${remaining} Speaking Studio ${remaining === 1 ? 'turn' : 'turns'}`,
      recommendedExerciseBn: `AI স্পিকিং স্টুডিওতে ${remaining}টি কথোপকথন ধাপ সম্পন্ন করুন`,
      expectedDurationMinutes: 6,
      difficultyLabelEn: 'Guided Speaking',
      difficultyLabelBn: 'নির্দেশিত স্পিকিং',
      completionCriteriaEn: `Submit ${remaining} evaluated spoken or text-fallback ${remaining === 1 ? 'turn' : 'turns'}.`,
      completionCriteriaBn: `${remaining}টি মূল্যায়নকৃত স্পিকিং ধাপ সম্পন্ন করুন।`,
      routeTo: '/app/speak',
      supportingRecordIds: speakingSkill.supportingRecordIds,
    });
  }

  if (growthOpportunities.length < 3) {
    const allLessons = getAllLessons();
    const nextLesson = allLessons.find((l) => !lessonMastery[l.id]) ?? allLessons[0];
    if (nextLesson) {
      growthOpportunities.push({
        id: `opp_lesson_${nextLesson.id}`,
        skillId: 'grammar',
        priority: 'baseline',
        weaknessEn:
          measuredCount === 0
            ? 'Baseline Academy evidence not yet recorded'
            : `Continue structured mastery with "${nextLesson.titleEn}"`,
        weaknessBn:
          measuredCount === 0
            ? 'প্রাথমিক একাডেমি প্রমাণ এখনো সংরক্ষিত হয়নি'
            : `"${nextLesson.titleBn}" লেসন দিয়ে দক্ষতা বাড়ান`,
        supportingEvidenceEn: `${Object.keys(lessonMastery).length} of ${allLessons.length} Academy lessons practiced so far.`,
        supportingEvidenceBn: `এখন পর্যন্ত ${allLessons.length}টির মধ্যে ${Object.keys(lessonMastery).length}টি লেসন অনুশীলন করেছেন।`,
        whyItMattersEn:
          'Completing 7-stage Bangla-guided lessons builds verified Grammar, Reading, Sentence Complexity, and Writing evidence.',
        whyItMattersBn:
          '৭-ধাপের একাডেমি লেসন ব্যাকরণ, রিডিং, বাক্য গঠন ও লেখার যাচাইকৃত প্রমাণ তৈরি করে।',
        recommendedExerciseEn: `Complete Academy Lesson: ${nextLesson.titleEn}`,
        recommendedExerciseBn: `একাডেমি লেসন সম্পন্ন করুন: ${nextLesson.titleBn}`,
        expectedDurationMinutes: nextLesson.estimatedMinutes ?? 10,
        difficultyLabelEn: 'Structured Lesson',
        difficultyLabelBn: 'কাঠামোবদ্ধ লেসন',
        completionCriteriaEn: 'Finish Guided Practice, Independent Practice, and Stage 6 Assessment.',
        completionCriteriaBn: 'নির্দেশিত, স্বাধীন এবং মূল্যায়ন ধাপ সম্পন্ন করুন।',
        routeTo: `/app/learn/${nextLesson.id}`,
        supportingRecordIds: [],
      });
    }
  }

  if (!latestDiagnostic && growthOpportunities.length < 3) {
    growthOpportunities.push({
      id: 'opp_baseline_diagnostic',
      skillId: 'listening',
      priority: 'baseline',
      weaknessEn: 'No baseline diagnostic on record',
      weaknessBn: 'কোনো বেসলাইন ডায়াগনস্টিক সম্পন্ন হয়নি',
      supportingEvidenceEn: '0 baseline diagnostic assessments recorded.',
      supportingEvidenceBn: 'এখনো ০টি বেসলাইন ডায়াগনস্টিক রেকর্ড আছে।',
      whyItMattersEn:
        'The 5-skill baseline assessment establishes verified starting points for Reading, Vocabulary, Grammar, and Listening.',
      whyItMattersBn:
        '৫-দক্ষতার বেসলাইন মূল্যায়ন আপনার রিডিং, শব্দভাণ্ডার, ব্যাকরণ ও লিসেনিংয়ের বাস্তব ভিত্তি তৈরি করে।',
      recommendedExerciseEn: 'Complete the 5-Skill Initial Assessment',
      recommendedExerciseBn: '৫-দক্ষতার প্রাথমিক মূল্যায়ন সম্পন্ন করুন',
      expectedDurationMinutes: 8,
      difficultyLabelEn: 'Baseline Check',
      difficultyLabelBn: 'বেসলাইন যাচাই',
      completionCriteriaEn: 'Answer the written and listening diagnostic prompts and view results.',
      completionCriteriaBn: 'লিখিত ও লিসেনিং ডায়াগনস্টিক প্রশ্ন সম্পন্ন করুন।',
      routeTo: '/diagnostic',
      supportingRecordIds: [],
    });
  }

  const nextBestPractice = growthOpportunities[0] ?? {
    id: 'opp_default_transfer',
    skillId: 'functional_communication',
    priority: 'medium',
    weaknessEn: 'Strengthen real-world communication transfer',
    weaknessBn: 'বাস্তব যোগাযোগে দক্ষতা প্রয়োগ বাড়ান',
    supportingEvidenceEn: 'All tracked skills are currently healthy; test retention under real scenarios.',
    supportingEvidenceBn: 'বর্তমান দক্ষতাগুলো ভালো অবস্থানে আছে; বাস্তব পরিস্থিতিতে যাচাই করুন।',
    whyItMattersEn:
      'Transfer Lab verifies whether learned grammar and vocabulary hold up in real conversations.',
    whyItMattersBn:
      'ট্রান্সফার ল্যাব যাচাই করে যে শেখা ব্যাকরণ ও শব্দভাণ্ডার বাস্তব কথোপকথনে কাজ করছে কিনা।',
    recommendedExerciseEn: 'Complete a Transfer Lab scenario',
    recommendedExerciseBn: 'ট্রান্সফার ল্যাবে একটি সিনারিও সম্পন্ন করুন',
    expectedDurationMinutes: 10,
    difficultyLabelEn: 'Applied Transfer',
    difficultyLabelBn: 'বাস্তব প্রয়োগ',
    completionCriteriaEn: 'Score 75%+ across the 4-rubric Transfer Lab evaluation.',
    completionCriteriaBn: '৪-রুব্রিক ট্রান্সফার ল্যাব মূল্যায়নে ৭৫%+ স্কোর করুন।',
    routeTo: '/app/transfer-lab',
    supportingRecordIds: [],
  };

  // Profile Separation (Section 09)
  const selfLevel = formatSelfLevelLabel(
    profile?.selfProficiencyChoice ?? profile?.selfEstimatedLevel
  );
  const estProficiency = estimateMeasuredProficiencyBand(measuredSkills, totalVerifiedSamples);

  const aiEligible = measuredCount >= 3 && totalVerifiedSamples >= 9;

  const profileSeparation: DnaProfileSeparation = {
    measuredSummary: {
      measuredSkillsCount: measuredCount,
      totalSkillsCount: 10,
      totalVerifiedSamples,
      evidenceCoveragePercent,
      estimatedProficiencyEn: estProficiency.en,
      estimatedProficiencyBn: estProficiency.bn,
      cefrDisclaimerEn:
        'Provisional evidence-based indicator only — definitive CEFR certification requires a standardized proctored exam.',
      cefrDisclaimerBn:
        'এটি শুধুমাত্র প্রমাণভিত্তিক প্রাথমিক নির্দেশক — আনুষ্ঠানিক CEFR স্তরের জন্য প্রমিত পরীক্ষা প্রয়োজন।',
    },
    selfReported: {
      levelLabelEn: selfLevel.en,
      levelLabelBn: selfLevel.bn,
      dailyGoalMinutes: profile?.dailyTimeGoalMinutes ?? 15,
      learningGoals:
        profile?.learningGoals && profile.learningGoals.length > 0
          ? profile.learningGoals
          : profile?.primaryGoal
            ? [profile.primaryGoal]
            : [],
      hasSelfReport: Boolean(profile?.selfProficiencyChoice || profile?.selfEstimatedLevel),
    },
    aiInterpretationEligibility: {
      eligible: aiEligible,
      reasonEn: aiEligible
        ? `Ready for AI Communication Synthesis (${measuredCount} measured dimensions across ${totalVerifiedSamples} verified samples).`
        : `Unlock AI Communication Synthesis once at least 3 dimensions are measured and 9+ verified samples are recorded (currently ${measuredCount}/3 dimensions, ${totalVerifiedSamples}/9 samples).`,
      reasonBn: aiEligible
        ? `AI যোগাযোগ বিশ্লেষণের জন্য প্রস্তুত (${measuredCount}টি পরিমাপকৃত মাত্রা, ${totalVerifiedSamples}টি যাচাইকৃত নমুনা)।`
        : `AI বিশ্লেষণ আনলক করতে অন্তত ৩টি পরিমাপকৃত মাত্রা ও ৯+ যাচাইকৃত নমুনা প্রয়োজন (বর্তমানে ${measuredCount}/৩ মাত্রা, ${totalVerifiedSamples}/৯ নমুনা)।`,
    },
  };

  return {
    calculationVersion: DNA_CALCULATION_VERSION,
    timeframe,
    skills,
    coreSkills,
    extendedSkills,
    measuredCount,
    totalDimensions: 10,
    totalVerifiedSamples,
    evidenceCoveragePercent,
    lastAssessmentDate,
    hasHistoricalComparison,
    trendSeries: {
      points: trendPoints,
      hasSufficientData: trendPoints.length >= 2,
    },
    evidenceDistribution,
    strengths,
    growthOpportunities: growthOpportunities.slice(0, 4),
    nextBestPractice,
    evidenceLedger: sortedLedger,
    profileSeparation,
  };
}
