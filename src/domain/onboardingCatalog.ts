import type {
  DailyTimeGoalMinutes,
  ExplanationDepth,
  LearningFormat,
  LearningGoalId,
  MicPermissionState,
  PrimaryGoal,
  SelfEstimatedLevel,
  SelfProficiencyChoice,
  UILanguage,
} from '../types/domain';

export interface NativeLanguageOption {
  code: string;
  englishName: string;
  nativeName: string;
  scriptBadge: string;
  popular: boolean;
}

export interface TargetLanguageOption {
  code: string;
  englishName: string;
  nativeName: string;
  symbol: string;
  supportedNow: boolean;
  noteEn: string;
  noteBn: string;
}

export interface LearningGoalOption {
  id: LearningGoalId;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  primaryMap: PrimaryGoal;
}

export interface DailyCommitmentOption {
  minutes: DailyTimeGoalMinutes;
  labelEn: string;
  labelBn: string;
  paceEn: string;
  paceBn: string;
  descEn: string;
  descBn: string;
}

export interface SelfProficiencyOption {
  id: SelfProficiencyChoice;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  mappedLevel: SelfEstimatedLevel;
}

export interface OnboardingDraft {
  preferredUiLanguage: UILanguage;
  nativeLanguage: string;
  targetLanguage: string;
  learningGoals: LearningGoalId[];
  dailyTimeGoalMinutes: DailyTimeGoalMinutes;
  explanationLanguage: 'bn' | 'en' | 'both';
  explanationDepth: ExplanationDepth;
  learningFormat: LearningFormat;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  selfProficiencyChoice: SelfProficiencyChoice;
  microphonePermissionStatus: MicPermissionState;
}

export const NATIVE_LANGUAGE_OPTIONS: NativeLanguageOption[] = [
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', scriptBadge: 'অ', popular: true },
  { code: 'en', englishName: 'English', nativeName: 'English', scriptBadge: 'Aa', popular: true },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', scriptBadge: 'अ', popular: true },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو', scriptBadge: 'اُ', popular: true },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', scriptBadge: 'ع', popular: true },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', scriptBadge: 'Ñ', popular: true },
  { code: 'fr', englishName: 'French', nativeName: 'Français', scriptBadge: 'É', popular: true },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', scriptBadge: 'あ', popular: true },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어', scriptBadge: '한', popular: false },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', scriptBadge: 'Ü', popular: false },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', scriptBadge: 'Ç', popular: false },
  { code: 'id', englishName: 'Indonesian', nativeName: 'Bahasa Indonesia', scriptBadge: 'Id', popular: false },
  { code: 'vi', englishName: 'Vietnamese', nativeName: 'Tiếng Việt', scriptBadge: 'Ơ', popular: false },
  { code: 'tr', englishName: 'Turkish', nativeName: 'Türkçe', scriptBadge: 'Ğ', popular: false },
  { code: 'zh', englishName: 'Chinese (Mandarin)', nativeName: '中文', scriptBadge: '文', popular: false },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', scriptBadge: 'Я', popular: false },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', scriptBadge: 'அ', popular: false },
  { code: 'ne', englishName: 'Nepali', nativeName: 'नेपाली', scriptBadge: 'क', popular: false },
];

/**
 * Honest Target Language Catalog:
 * Only English has full interactive Academy lessons, Speaking Studio, and Assessment content today.
 * Additional target languages are clearly labeled as upcoming roadmap tracks rather than faking support.
 */
export const TARGET_LANGUAGE_OPTIONS: TargetLanguageOption[] = [
  {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    symbol: 'EN',
    supportedNow: true,
    noteEn: 'Full curriculum, diagnostic assessment & AI Speaking Studio available now',
    noteBn: 'সম্পূর্ণ কারিকুলাম, ডায়াগনস্টিক মূল্যায়ন এবং AI স্পিকিং স্টুডিও এখনই চালু',
  },
  {
    code: 'es',
    englishName: 'Spanish',
    nativeName: 'Español',
    symbol: 'ES',
    supportedNow: false,
    noteEn: 'Curriculum in development — not yet available for assessment',
    noteBn: 'কারিকুলাম নির্মাণাধীন — মূল্যায়নের জন্য এখনো চালু হয়নি',
  },
  {
    code: 'fr',
    englishName: 'French',
    nativeName: 'Français',
    symbol: 'FR',
    supportedNow: false,
    noteEn: 'Curriculum in development — not yet available for assessment',
    noteBn: 'কারিকুলাম নির্মাণাধীন — মূল্যায়নের জন্য এখনো চালু হয়নি',
  },
  {
    code: 'de',
    englishName: 'German',
    nativeName: 'Deutsch',
    symbol: 'DE',
    supportedNow: false,
    noteEn: 'Curriculum in development — not yet available for assessment',
    noteBn: 'কারিকুলাম নির্মাণাধীন — মূল্যায়নের জন্য এখনো চালু হয়নি',
  },
  {
    code: 'ja',
    englishName: 'Japanese',
    nativeName: '日本語',
    symbol: '日',
    supportedNow: false,
    noteEn: 'Curriculum in development — not yet available for assessment',
    noteBn: 'কারিকুলাম নির্মাণাধীন — মূল্যায়নের জন্য এখনো চালু হয়নি',
  },
  {
    code: 'ko',
    englishName: 'Korean',
    nativeName: '한국어',
    symbol: '한',
    supportedNow: false,
    noteEn: 'Curriculum in development — not yet available for assessment',
    noteBn: 'কারিকুলাম নির্মাণাধীন — মূল্যায়নের জন্য এখনো চালু হয়নি',
  },
  {
    code: 'ar',
    englishName: 'Arabic',
    nativeName: 'العربية',
    symbol: 'ع',
    supportedNow: false,
    noteEn: 'Curriculum in development — not yet available for assessment',
    noteBn: 'কারিকুলাম নির্মাণাধীন — মূল্যায়নের জন্য এখনো চালু হয়নি',
  },
];

export const LEARNING_GOAL_OPTIONS: LearningGoalOption[] = [
  {
    id: 'speak_confidently',
    titleEn: 'Speak confidently',
    titleBn: 'আত্মবিশ্বাসের সাথে কথা বলুন',
    descEn: 'Overcome hesitation and speak naturally in daily conversations.',
    descBn: 'জড়তা কাটিয়ে দৈনন্দিন কথোপকথনে সাবলীলভাবে কথা বলুন।',
    primaryMap: 'daily_speaking',
  },
  {
    id: 'improve_pronunciation',
    titleEn: 'Improve pronunciation',
    titleBn: 'উচ্চারণ ও স্পষ্টতা উন্নত করুন',
    descEn: 'Build clearer articulation, stress, and spoken rhythm.',
    descBn: 'আরও স্পষ্ট উচ্চারণ ও স্বাভাবিক বলার ছন্দ গড়ে তুলুন।',
    primaryMap: 'daily_speaking',
  },
  {
    id: 'improve_grammar',
    titleEn: 'Improve grammar',
    titleBn: 'গ্রামার ও বাক্য গঠন ঠিক করুন',
    descEn: 'Eliminate recurring tense, preposition, and sentence-order mistakes.',
    descBn: 'বারবার হওয়া টেন্স, প্রিপজিশন ও বাক্যের ক্রমের ভুল দূর করুন।',
    primaryMap: 'daily_speaking',
  },
  {
    id: 'expand_vocabulary',
    titleEn: 'Expand vocabulary',
    titleBn: 'শব্দভাণ্ডার ও স্বাভাবিক প্রকাশ বাড়ান',
    descEn: 'Use natural collocations and precise words instead of literal translation.',
    descBn: 'আক্ষরিক অনুবাদের বদলে স্বাভাবিক ইংরেজি শব্দচয়ন শিখুন।',
    primaryMap: 'daily_speaking',
  },
  {
    id: 'improve_listening',
    titleEn: 'Improve listening',
    titleBn: 'শোনার ও বোঝার দক্ষতা বাড়ান',
    descEn: 'Follow natural spoken speed and key details in real exchanges.',
    descBn: 'স্বাভাবিক গতির ইংরেজি শুনে মূল ভাব দ্রুত বুঝতে শিখুন।',
    primaryMap: 'daily_speaking',
  },
  {
    id: 'improve_reading',
    titleEn: 'Improve reading',
    titleBn: 'পড়ে বোঝার দক্ষতা বাড়ান',
    descEn: 'Read workplace messages, articles, and instructions accurately.',
    descBn: 'ইমেইল, প্রবন্ধ ও নির্দেশনা নির্ভুলভাবে পড়ে বুঝতে শিখুন।',
    primaryMap: 'academic_ielts',
  },
  {
    id: 'improve_writing',
    titleEn: 'Improve writing',
    titleBn: 'লেখার মান উন্নত করুন',
    descEn: 'Write clearer emails, messages, and structured responses.',
    descBn: 'স্পষ্ট ও পেশাদার ইমেইল, মেসেজ ও উত্তর লিখতে শিখুন।',
    primaryMap: 'workplace',
  },
  {
    id: 'prepare_interviews',
    titleEn: 'Prepare for interviews',
    titleBn: 'চাকরির ইন্টারভিউ প্রস্তুতি',
    descEn: 'Answer tough hiring and behavioral questions with structure.',
    descBn: 'আত্মপরিচয় ও কঠিন ইন্টারভিউ প্রশ্নের গোছানো উত্তর দিন।',
    primaryMap: 'job_interview',
  },
  {
    id: 'workplace_communication',
    titleEn: 'Improve workplace communication',
    titleBn: 'কর্মক্ষেত্রে যোগাযোগ দক্ষতা',
    descEn: 'Lead standups, client calls, and team updates clearly.',
    descBn: 'অফিস মিটিং, ক্লায়েন্ট কল ও টিম আপডেটে স্পষ্টভাবে কথা বলুন।',
    primaryMap: 'workplace',
  },
  {
    id: 'prepare_exams',
    titleEn: 'Prepare for exams',
    titleBn: 'পরীক্ষা ও IELTS প্রস্তুতি',
    descEn: 'Strengthen structured comprehension, grammar, and speaking accuracy.',
    descBn: 'একাডেমিক ও IELTS-এর জন্য ব্যাকরণ ও বলার নির্ভুলতা বাড়ান।',
    primaryMap: 'academic_ielts',
  },
  {
    id: 'travel_communication',
    titleEn: 'Communicate while travelling',
    titleBn: 'ভ্রমণে স্বাচ্ছন্দ্যে যোগাযোগ',
    descEn: 'Handle airports, hotels, directions, and everyday travel situations.',
    descBn: 'বিমানবন্দর, হোটেল ও বিদেশে দৈনন্দিন পরিস্থিতি সামলান।',
    primaryMap: 'daily_speaking',
  },
];

export const DAILY_COMMITMENT_OPTIONS: DailyCommitmentOption[] = [
  {
    minutes: 5,
    labelEn: '5 minutes',
    labelBn: '৫ মিনিট',
    paceEn: 'Micro habit',
    paceBn: 'ক্ষুদ্র অভ্যাস',
    descEn: 'One focused micro-drill each day to build momentum.',
    descBn: 'প্রতিদিন একটি ছোট অনুশীলন দিয়ে নিয়মিত অভ্যাস শুরু করুন।',
  },
  {
    minutes: 10,
    labelEn: '10 minutes',
    labelBn: '১০ মিনিট',
    paceEn: 'Light & steady',
    paceBn: 'সহজ ও নিয়মিত',
    descEn: 'Short daily lesson or mistake review on busy schedules.',
    descBn: 'ব্যস্ত সময়ের মাঝেও প্রতিদিন সংক্ষিপ্ত লেসন ও রিভিউ।',
  },
  {
    minutes: 15,
    labelEn: '15 minutes',
    labelBn: '১৫ মিনিট',
    paceEn: 'Recommended',
    paceBn: 'প্রস্তাবিত',
    descEn: 'Balanced rhythm combining one lesson stage and spoken recall.',
    descBn: 'একটি লেসন ধাপ ও স্পিকিং রিভিউয়ের আদর্শ দৈনিক ছন্দ।',
  },
  {
    minutes: 20,
    labelEn: '20 minutes',
    labelBn: '২০ মিনিট',
    paceEn: 'Structured growth',
    paceBn: 'সংগঠিত উন্নতি',
    descEn: 'Lesson practice plus targeted Mistake Memory drills.',
    descBn: 'লেসন অনুশীলনের সাথে মিস্টেক মেমোরি ড্রিল।',
  },
  {
    minutes: 30,
    labelEn: '30 minutes',
    labelBn: '৩০ মিনিট',
    paceEn: 'Accelerated',
    paceBn: 'দ্রুত অগ্রগতি',
    descEn: 'Full lesson cycle plus AI Speaking Studio conversation.',
    descBn: 'পূর্ণ লেসন ও AI স্পিকিং স্টুডিও কথোপকথন।',
  },
  {
    minutes: 45,
    labelEn: '45+ minutes',
    labelBn: '৪৫+ মিনিট',
    paceEn: 'Intensive',
    paceBn: 'নিবিড় প্রস্তুতি',
    descEn: 'Deep daily immersion for interviews, exams, or rapid fluency.',
    descBn: 'ইন্টারভিউ, পরীক্ষা বা দ্রুত উন্নতির জন্য নিবিড় চর্চা।',
  },
];

export const SELF_PROFICIENCY_OPTIONS: SelfProficiencyOption[] = [
  {
    id: 'complete_beginner',
    titleEn: 'Complete beginner',
    titleBn: 'একদম নতুন শুরু করছি',
    descEn: 'I am starting from the very basics.',
    descBn: 'আমি একদম প্রাথমিক পর্যায় থেকে শুরু করছি।',
    mappedLevel: 'Pre-A1',
  },
  {
    id: 'few_words',
    titleEn: 'I know a few words',
    titleBn: 'কিছু সাধারণ শব্দ জানি',
    descEn: 'I recognize common words and short phrases, but forming sentences is hard.',
    descBn: 'পরিচিত কিছু শব্দ জানি, তবে নিজে বাক্য বানাতে কষ্ট হয়।',
    mappedLevel: 'A1',
  },
  {
    id: 'simple_sentences',
    titleEn: 'I can understand simple sentences',
    titleBn: 'সহজ বাক্য বুঝতে পারি',
    descEn: 'I follow slow, clear English and everyday written messages.',
    descBn: 'ধীরে বলা সহজ ইংরেজি এবং সাধারণ লেখা বুঝতে পারি।',
    mappedLevel: 'A2',
  },
  {
    id: 'basic_conversations',
    titleEn: 'I can have basic conversations',
    titleBn: 'মৌলিক কথোপকথন চালাতে পারি',
    descEn: 'I can handle familiar topics, though I pause to translate or check grammar.',
    descBn: 'পরিচিত বিষয়ে কথা বলতে পারি, তবে মাঝে মাঝে অনুবাদ করতে থামি।',
    mappedLevel: 'B1',
  },
  {
    id: 'comfortable',
    titleEn: 'I can communicate comfortably',
    titleBn: 'স্বাচ্ছন্দ্যে যোগাযোগ করতে পারি',
    descEn: 'I participate in meetings and discussions and want sharper natural phrasing.',
    descBn: 'মিটিং ও আলোচনায় অংশ নিতে পারি, আরও সাবলীল ও নিখুঁত হতে চাই।',
    mappedLevel: 'B2',
  },
  {
    id: 'advanced',
    titleEn: 'I am advanced',
    titleBn: 'আমার দক্ষতা উন্নত পর্যায়ে',
    descEn: 'I communicate fluently and want nuance, precision, and high-pressure polish.',
    descBn: 'আমি সাবলীলভাবে যোগাযোগ করি, এখন সূক্ষ্মতা ও পেশাদারিত্ব বাড়াতে চাই।',
    mappedLevel: 'C1',
  },
  {
    id: 'unsure',
    titleEn: "I'm not sure",
    titleBn: 'আমি নিশ্চিত নই',
    descEn: 'Let the initial diagnostic assessment help estimate my starting point.',
    descBn: 'প্রাথমিক ডায়াগনস্টিক মূল্যায়নই আমার শুরুর অবস্থান নির্ধারণ করুক।',
    mappedLevel: 'A2',
  },
];

export const EXPLANATION_DEPTH_OPTIONS: {
  id: ExplanationDepth;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
}[] = [
  {
    id: 'beginner_friendly',
    titleEn: 'Beginner-friendly explanations',
    titleBn: 'সহজ ও ধাপে ধাপে ব্যাখ্যা',
    descEn: 'Plain everyday examples without heavy grammar jargon.',
    descBn: 'জটিল ব্যাকরণের পরিভাষা ছাড়া সহজ দৈনন্দিন উদাহরণ।',
  },
  {
    id: 'balanced',
    titleEn: 'Balanced practical guidance',
    titleBn: 'ভারসাম্যপূর্ণ ব্যবহারিক ব্যাখ্যা',
    descEn: 'Clear patterns with concise grammar rules and natural alternatives.',
    descBn: 'স্পষ্ট নিয়মের সাথে স্বাভাবিক বিকল্প প্রকাশভঙ্গি।',
  },
  {
    id: 'advanced',
    titleEn: 'Detailed & nuanced explanations',
    titleBn: 'বিস্তারিত ও সূক্ষ্ম ব্যাখ্যা',
    descEn: 'Nuanced tone, register, collocation, and structure breakdowns.',
    descBn: 'বাক্যের সূক্ষ্ম ভাব, টোন, কলোকেশন ও কাঠামোগত বিশ্লেষণ।',
  },
];

export const LEARNING_FORMAT_OPTIONS: {
  id: LearningFormat;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
}[] = [
  {
    id: 'voice_first',
    titleEn: 'Voice-first speaking practice',
    titleBn: 'ভয়েস-ফার্স্ট স্পিকিং অনুশীলন',
    descEn: 'Prioritize live spoken conversations and real-world scenarios.',
    descBn: 'বাস্তব কথোপকথন ও মুখে বলার চর্চায় সবচেয়ে বেশি গুরুত্ব।',
  },
  {
    id: 'structured_lessons',
    titleEn: 'Structured step-by-step lessons',
    titleBn: 'ধাপে ধাপে সংগঠিত লেসন',
    descEn: 'Follow guided Academy modules before moving into open speaking.',
    descBn: 'ওপেন স্পিকিংয়ের আগে গাইডেড একাডেমি লেসন সম্পন্ন করুন।',
  },
  {
    id: 'mixed_practice',
    titleEn: 'Balanced lessons + speaking',
    titleBn: 'লেসন ও স্পিকিংয়ের সমন্বয়',
    descEn: 'Combine structured lessons, Mistake Memory, and speaking transfer.',
    descBn: 'লেসন, মিস্টেক মেমোরি ও স্পিকিং ট্রান্সফারের সমন্বিত চর্চা।',
  },
  {
    id: 'quick_drills',
    titleEn: 'Short targeted drills',
    titleBn: 'সংক্ষিপ্ত টার্গেটেড ড্রিল',
    descEn: 'Fast bite-sized mistake repair and recall prompts.',
    descBn: 'অল্প সময়ে নির্দিষ্ট ভুল সংশোধন ও দ্রুত রিভিউ।',
  },
];

export function filterNativeLanguages(query: string): NativeLanguageOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return NATIVE_LANGUAGE_OPTIONS;
  return NATIVE_LANGUAGE_OPTIONS.filter(
    (item) =>
      item.englishName.toLowerCase().includes(q) ||
      item.nativeName.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q)
  );
}

export function getNativeLanguageByCode(code?: string): NativeLanguageOption {
  return (
    NATIVE_LANGUAGE_OPTIONS.find((item) => item.code === code) ?? NATIVE_LANGUAGE_OPTIONS[0]
  );
}

export function getTargetLanguageByCode(code?: string): TargetLanguageOption {
  return (
    TARGET_LANGUAGE_OPTIONS.find((item) => item.code === code) ?? TARGET_LANGUAGE_OPTIONS[0]
  );
}

export function mapGoalsToPrimaryGoal(goals: LearningGoalId[]): PrimaryGoal {
  if (goals.includes('prepare_interviews')) return 'job_interview';
  if (goals.includes('workplace_communication') || goals.includes('improve_writing')) {
    return 'workplace';
  }
  if (goals.includes('prepare_exams')) return 'academic_ielts';
  return 'daily_speaking';
}

export function mapProficiencyChoiceToCefrEstimate(
  choice: SelfProficiencyChoice
): SelfEstimatedLevel {
  const match = SELF_PROFICIENCY_OPTIONS.find((item) => item.id === choice);
  return match ? match.mappedLevel : 'A2';
}

export function getProficiencyOptionById(choice?: SelfProficiencyChoice): SelfProficiencyOption {
  return (
    SELF_PROFICIENCY_OPTIONS.find((item) => item.id === choice) ?? SELF_PROFICIENCY_OPTIONS[2]
  );
}

export function validateOnboardingStep(
  step: number,
  draft: OnboardingDraft,
  lang: UILanguage
): string | null {
  if (step === 3 && !draft.nativeLanguage) {
    return lang === 'bn'
      ? 'অনুগ্রহ করে আপনার মাতৃভাষা নির্বাচন করুন।'
      : 'Please select your native language to continue.';
  }
  if (step === 4) {
    const selectedTarget = TARGET_LANGUAGE_OPTIONS.find((t) => t.code === draft.targetLanguage);
    if (!selectedTarget || !selectedTarget.supportedNow) {
      return lang === 'bn'
        ? 'এই মুহূর্তে শুধুমাত্র ইংরেজি (English) কারিকুলাম ও মূল্যায়ন চালু রয়েছে। অনুগ্রহ করে English নির্বাচন করুন।'
        : 'Only English currently has an active assessment and curriculum. Please select English to continue.';
    }
  }
  if (step === 5 && draft.learningGoals.length === 0) {
    return lang === 'bn'
      ? 'অন্তত একটি শেখার লক্ষ্য নির্বাচন করুন।'
      : 'Please choose at least one learning goal.';
  }
  return null;
}
