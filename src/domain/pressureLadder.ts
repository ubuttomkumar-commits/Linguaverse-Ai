import type { PressureLadderLevelId, SpeakingPressureLevel } from '../types/domain';

export interface PressureLadderTier {
  id: PressureLadderLevelId;
  levelNumber: 1 | 2 | 3 | 4 | 5;
  shortLabelEn: string;
  shortLabelBn: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  /** Level 1: full sentence templates visible */
  showTemplates: boolean;
  /** Level 2: bullet-point structural cues visible */
  showBulletCues: boolean;
  /** Level 4: AI introduces an unexpected follow-up twist */
  introducesTwist: boolean;
  /** Level 5: countdown timer active */
  speakingTimeLimitSeconds: number | null;
  transferTimeLimitSeconds: number | null;
  transferXpReward: number;
}

export const PRESSURE_LADDER_TIERS: PressureLadderTier[] = [
  {
    id: 'level_1_controlled',
    levelNumber: 1,
    shortLabelEn: 'Level 1',
    shortLabelBn: 'লেভেল ১',
    titleEn: 'Controlled Practice',
    titleBn: 'নিয়ন্ত্রিত অনুশীলন (টেমপ্লেটসহ)',
    descEn: 'Fill-in sentence templates and Bangla phrasing guides available with zero timer.',
    descBn: 'বাক্য গঠনের সম্পূর্ণ টেমপ্লেট ও বাংলা নির্দেশিকা থাকবে, কোনো সময়ের চাপ নেই।',
    showTemplates: true,
    showBulletCues: true,
    introducesTwist: false,
    speakingTimeLimitSeconds: null,
    transferTimeLimitSeconds: null,
    transferXpReward: 60,
  },
  {
    id: 'level_2_guided',
    levelNumber: 2,
    shortLabelEn: 'Level 2',
    shortLabelBn: 'লেভেল ২',
    titleEn: 'Guided Conversation',
    titleBn: 'নির্দেশিত কথোপকথন (বুলেট কিউ)',
    descEn: 'Concise bullet-point cues only — assemble sentences yourself at your own pace.',
    descBn: 'শুধু সংক্ষিপ্ত বুলেট-পয়েন্ট ইঙ্গিত থাকবে — নিজের ভাষায় বাক্য সাজিয়ে বলুন।',
    showTemplates: false,
    showBulletCues: true,
    introducesTwist: false,
    speakingTimeLimitSeconds: null,
    transferTimeLimitSeconds: null,
    transferXpReward: 65,
  },
  {
    id: 'level_3_open',
    levelNumber: 3,
    shortLabelEn: 'Level 3',
    shortLabelBn: 'লেভেল ৩',
    titleEn: 'Open-Ended Conversation',
    titleBn: 'উন্মুক্ত কথোপকথন (হিন্ট ছাড়া)',
    descEn: 'No templates or cues — apply the rule independently in natural communication.',
    descBn: 'কোনো টেমপ্লেট বা ইঙ্গিত নেই — সম্পূর্ণ স্বাধীনভাবে স্বাভাবিক ইংরেজিতে উত্তর দিন।',
    showTemplates: false,
    showBulletCues: false,
    introducesTwist: false,
    speakingTimeLimitSeconds: null,
    transferTimeLimitSeconds: null,
    transferXpReward: 80,
  },
  {
    id: 'level_4_twist',
    levelNumber: 4,
    shortLabelEn: 'Level 4',
    shortLabelBn: 'লেভেল ৪',
    titleEn: 'Unexpected Follow-Up Questions',
    titleBn: 'অপ্রত্যাশিত পাল্টা প্রশ্ন (AI টুইস্ট)',
    descEn: 'No hints — the AI introduces a sudden twist or challenge you must handle on the spot.',
    descBn: 'কোনো হিন্ট নেই — AI হঠাৎ নতুন একটি অপ্রত্যাশিত পরিস্থিতি বা পাল্টা প্রশ্ন জুড়ে দেবে।',
    showTemplates: false,
    showBulletCues: false,
    introducesTwist: true,
    speakingTimeLimitSeconds: null,
    transferTimeLimitSeconds: null,
    transferXpReward: 90,
  },
  {
    id: 'level_5_timed_high_stakes',
    levelNumber: 5,
    shortLabelEn: 'Level 5',
    shortLabelBn: 'লেভেল ৫',
    titleEn: 'Time-Limited High-Stakes Simulation',
    titleBn: 'সময়সীমা ও উচ্চচাপের বাস্তব সিমুলেশন',
    descEn: 'Live countdown timer + complex multi-constraint high-stakes pressure with zero hints.',
    descBn: 'লাইভ কাউন্টডাউন টাইমার এবং জটিল শর্তসহ বাস্তব জীবনের উচ্চচাপের পরীক্ষা।',
    showTemplates: false,
    showBulletCues: false,
    introducesTwist: false,
    speakingTimeLimitSeconds: 45,
    transferTimeLimitSeconds: 60,
    transferXpReward: 100,
  },
];

export function normalizePressureLevel(level: SpeakingPressureLevel | undefined): PressureLadderLevelId {
  switch (level) {
    case 'level_1_controlled':
    case 'level_2_guided':
    case 'level_3_open':
    case 'level_4_twist':
    case 'level_5_timed_high_stakes':
      return level;
    case 'guided':
      return 'level_2_guided';
    case 'open_ended':
      return 'level_3_open';
    case 'time_limited':
      return 'level_5_timed_high_stakes';
    default:
      return 'level_2_guided';
  }
}

export function getPressureLadderTier(level: SpeakingPressureLevel | undefined): PressureLadderTier {
  const normalized = normalizePressureLevel(level);
  return (
    PRESSURE_LADDER_TIERS.find((tier) => tier.id === normalized) ?? PRESSURE_LADDER_TIERS[1]
  );
}
