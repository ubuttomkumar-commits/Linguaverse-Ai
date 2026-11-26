/**
 * Advanced Learning Labs Domain Engine (PRD v6.1 §§23, 26, 30, 33, 34)
 *
 * Covers:
 * - Writing Intelligence & Language Diary (§23.2, §26) — preserves original learner text strictly
 * - Japanese-Inspired Shadowing & Chunking Drills (§23.1) — honest transcript overlap, zero fake acoustic claims
 * - Human Communication Bridge (§30) — explicitly tagged as user_reported, never presented as AI/external verification
 * - Learning Plateau & Recovery Engine (§33) — transparent analytical signal with evidence & time window
 * - Independent Communication Readiness (§34) — multi-context evidence check with explicit limitations
 */

export type WritingModeId =
  | 'sentence'
  | 'paragraph'
  | 'daily_diary'
  | 'email'
  | 'professional'
  | 'academic'
  | 'creative'
  | 'examination';

export const WRITING_MODES: ReadonlyArray<{
  id: WritingModeId;
  labelEn: string;
  labelBn: string;
  placeholderEn: string;
}> = [
  {
    id: 'daily_diary',
    labelEn: 'Daily Language Diary',
    labelBn: 'দৈনিক ভাষা ডায়েরি',
    placeholderEn: 'Write 4–8 sentences about what happened today, what challenged you, or what you plan tomorrow...',
  },
  {
    id: 'email',
    labelEn: 'Workplace Email',
    labelBn: 'কর্মক্ষেত্রের ইমেইল',
    placeholderEn: 'Draft a clear, polite email to a colleague, client, or manager with a clear action item...',
  },
  {
    id: 'professional',
    labelEn: 'Professional Update / Report',
    labelBn: 'পেশাদার আপডেট / রিপোর্ট',
    placeholderEn: 'Summarize a project update, blocker, and next steps clearly...',
  },
  {
    id: 'academic',
    labelEn: 'Academic Paragraph',
    labelBn: 'একাডেমিক অনুচ্ছেদ',
    placeholderEn: 'Present a topic sentence, supporting evidence, and concise concluding insight...',
  },
  {
    id: 'sentence',
    labelEn: 'Sentence Construction',
    labelBn: 'বাক্য গঠন অনুশীলন',
    placeholderEn: 'Write 1–3 sentences practicing a specific grammar structure or tense...',
  },
  {
    id: 'paragraph',
    labelEn: 'Structured Paragraph',
    labelBn: 'সুসংগঠিত অনুচ্ছেদ',
    placeholderEn: 'Write a connected paragraph explaining an idea with clear transitions...',
  },
  {
    id: 'creative',
    labelEn: 'Creative Expression',
    labelBn: 'সৃজনশীল লেখা',
    placeholderEn: 'Describe a memorable scene, short story moment, or personal reflection...',
  },
  {
    id: 'examination',
    labelEn: 'Exam Essay Draft',
    labelBn: 'পরীক্ষার প্রবন্ধ খসড়া',
    placeholderEn: 'Draft a structured argument responding directly to an exam prompt...',
  },
];

export interface WritingFeedbackIssue {
  category: string;
  original: string;
  corrected: string;
  explanationEn: string;
  explanationBn: string;
  confidence: number;
}

export interface WritingDiaryEntryRecord {
  id: string;
  userId: string;
  mode: WritingModeId;
  title: string;
  originalText: string; // Strictly preserved (PRD §26.3)
  correctedVersion: string;
  naturalAlternative: string;
  issues: WritingFeedbackIssue[];
  dimensions: {
    grammarNote: string;
    vocabularyNote: string;
    coherenceNote: string;
    clarityAndRegisterNote: string;
  };
  banglaSummary: string;
  targetedPracticeEn: string;
  rewrittenText?: string;
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShadowingPhraseItem {
  id: string;
  category: 'workplace' | 'conversation_repair' | 'interview' | 'daily_chunk';
  cefr: 'A2' | 'B1' | 'B2';
  phraseEn: string;
  chunkBreakdown: string[];
  banglaBridge: string;
  contextTipEn: string;
}

export const SHADOWING_PHRASE_LIBRARY: readonly ShadowingPhraseItem[] = [
  {
    id: 'sh_repair_clarify',
    category: 'conversation_repair',
    cefr: 'A2',
    phraseEn: 'Could you say that one more time a bit more slowly? I want to make sure I understood correctly.',
    chunkBreakdown: ['Could you say that one more time', 'a bit more slowly?', 'I want to make sure', 'I understood correctly.'],
    banglaBridge: 'কোনো কথা পরিষ্কার না বুঝলে ঘাবড়ে না গিয়ে ভদ্রভাবে পুনরায় বলার অনুরোধ করার স্বাভাবিক ইংরেজি ফ্রেজ।',
    contextTipEn: 'Essential conversation repair chunk for meetings, calls, and interviews.',
  },
  {
    id: 'sh_work_update',
    category: 'workplace',
    cefr: 'B1',
    phraseEn: 'We finished the first milestone on schedule, and we are currently resolving one integration issue before Friday.',
    chunkBreakdown: ['We finished the first milestone', 'on schedule,', 'and we are currently resolving', 'one integration issue before Friday.'],
    banglaBridge: 'অফিসের স্ট্যান্ডআপ বা ম্যানেজারকে প্রগ্রেস আপডেট দেওয়ার সময় স্পষ্ট ও সংক্ষিপ্ত কাঠামো।',
    contextTipEn: 'Combines completed past action with current progressive status cleanly.',
  },
  {
    id: 'sh_interview_impact',
    category: 'interview',
    cefr: 'B2',
    phraseEn: 'In my previous role, I redesigned our onboarding checklist, which reduced weekly support tickets by nearly thirty percent.',
    chunkBreakdown: ['In my previous role,', 'I redesigned our onboarding checklist,', 'which reduced weekly support tickets', 'by nearly thirty percent.'],
    banglaBridge: 'ইন্টারভিউতে কাজের ফলাফল (impact) সংখ্যা ও স্পষ্ট ক্রিয়াপদ দিয়ে বলার কার্যকর চাংক।',
    contextTipEn: 'Uses a non-defining relative clause ("which reduced...") to link action to outcome.',
  },
  {
    id: 'sh_daily_rephrase',
    category: 'daily_chunk',
    cefr: 'B1',
    phraseEn: 'What I mean is that we should start with a smaller version first and improve it based on real feedback.',
    chunkBreakdown: ['What I mean is that', 'we should start with a smaller version first', 'and improve it', 'based on real feedback.'],
    banglaBridge: 'নিজের বক্তব্য আরও পরিষ্কারভাবে ব্যাখ্যা করার জন্য "What I mean is that..." খুবই স্বাভাবিক চাংক।',
    contextTipEn: 'Helps buy thinking time naturally without awkward pauses.',
  },
];

/**
 * Honest lexical/transcript overlap for Shadowing (PRD §23.1).
 * Explicitly NOT an acoustic similarity or pronunciation score.
 */
export function computeTranscriptShadowingMatch(referencePhrase: string, learnerTranscript: string): {
  wordOverlapPct: number;
  matchedWords: number;
  totalReferenceWords: number;
  missingWords: string[];
  honestDisclosureEn: string;
} {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const refWords = normalize(referencePhrase);
  const learnerSet = new Set(normalize(learnerTranscript));
  if (refWords.length === 0) {
    return {
      wordOverlapPct: 0,
      matchedWords: 0,
      totalReferenceWords: 0,
      missingWords: [],
      honestDisclosureEn: 'Text transcript comparison only — not an acoustic pronunciation score.',
    };
  }
  const missingWords: string[] = [];
  let matchedWords = 0;
  for (const w of refWords) {
    if (learnerSet.has(w)) {
      matchedWords += 1;
    } else if (!missingWords.includes(w)) {
      missingWords.push(w);
    }
  }
  return {
    wordOverlapPct: Math.round((matchedWords / refWords.length) * 100),
    matchedWords,
    totalReferenceWords: refWords.length,
    missingWords: missingWords.slice(0, 8),
    honestDisclosureEn:
      'Text-transcript word overlap only — acoustic accent/phoneme similarity is not measured without an acoustic assessment engine.',
  };
}

export interface HumanBridgeLogRecord {
  id: string;
  userId: string;
  scenarioContext: string;
  partnerType: 'colleague' | 'friend' | 'interviewer' | 'teacher' | 'customer_service' | 'other';
  goalEn: string;
  whatWentWell: string;
  whatFeltHard: string;
  selfReportedConfidence: 1 | 2 | 3 | 4 | 5;
  evidenceType: 'user_reported'; // PRD §30.3 strict separation
  createdAt: string;
}

export function validateWritingDiaryInput(input: unknown): {
  ok: boolean;
  error?: string;
  cleaned?: { mode: WritingModeId; title: string; originalText: string };
} {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Writing submission must be a JSON object.' };
  }
  const raw = input as Record<string, unknown>;
  const validModes = new Set<string>(WRITING_MODES.map((m) => m.id));
  const mode = typeof raw.mode === 'string' && validModes.has(raw.mode) ? (raw.mode as WritingModeId) : 'daily_diary';
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 120) : '';
  const originalText = typeof raw.originalText === 'string' ? raw.originalText.trim() : '';
  if (originalText.length < 15) {
    return { ok: false, error: 'Please write at least 15 characters so meaningful feedback can be generated.' };
  }
  if (originalText.length > 4000) {
    return { ok: false, error: 'Writing submission cannot exceed 4,000 characters.' };
  }
  return {
    ok: true,
    cleaned: {
      mode,
      title: title || `${WRITING_MODES.find((m) => m.id === mode)?.labelEn ?? 'Writing'} Entry`,
      originalText,
    },
  };
}

export function validateHumanBridgeInput(input: unknown): {
  ok: boolean;
  error?: string;
  cleaned?: Omit<HumanBridgeLogRecord, 'id' | 'userId' | 'evidenceType' | 'createdAt'>;
} {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Human practice log must be a JSON object.' };
  }
  const raw = input as Record<string, unknown>;
  const scenarioContext = typeof raw.scenarioContext === 'string' ? raw.scenarioContext.trim().slice(0, 160) : '';
  const goalEn = typeof raw.goalEn === 'string' ? raw.goalEn.trim().slice(0, 240) : '';
  const whatWentWell = typeof raw.whatWentWell === 'string' ? raw.whatWentWell.trim().slice(0, 500) : '';
  const whatFeltHard = typeof raw.whatFeltHard === 'string' ? raw.whatFeltHard.trim().slice(0, 500) : '';
  const validPartners = new Set(['colleague', 'friend', 'interviewer', 'teacher', 'customer_service', 'other']);
  const partnerType =
    typeof raw.partnerType === 'string' && validPartners.has(raw.partnerType)
      ? (raw.partnerType as HumanBridgeLogRecord['partnerType'])
      : 'other';
  const conf = Number(raw.selfReportedConfidence);
  if (!scenarioContext || scenarioContext.length < 4) {
    return { ok: false, error: 'Describe the real-world conversation context (at least 4 characters).' };
  }
  if (!whatWentWell || whatWentWell.length < 5) {
    return { ok: false, error: 'Add a short reflection on what went well (at least 5 characters).' };
  }
  if (!Number.isInteger(conf) || conf < 1 || conf > 5) {
    return { ok: false, error: 'Self-reported confidence must be an integer from 1 to 5.' };
  }
  return {
    ok: true,
    cleaned: {
      scenarioContext,
      partnerType,
      goalEn: goalEn || 'Practice real-world English communication',
      whatWentWell,
      whatFeltHard,
      selfReportedConfidence: conf as 1 | 2 | 3 | 4 | 5,
    },
  };
}

/**
 * Learning Plateau & Recovery Analytical Signal (PRD §33)
 * Strictly evidence-based signal, never a psychological diagnosis.
 */
export interface PlateauRecoverySignal {
  status: 'insufficient_data' | 'progressing' | 'possible_plateau';
  evidenceSummaryEn: string;
  evidenceSummaryBn: string;
  sampleSize: number;
  recurringMistakeCount: number;
  recoveryActionsEn: string[];
  recoveryActionsBn: string[];
  limitationsEn: string;
}

export function detectLearningPlateau(params: {
  recentScoresPct: number[]; // chronologically ordered oldest -> newest
  recurringMistakeCount: number;
  completedLessonsCount: number;
}): PlateauRecoverySignal {
  const scores = params.recentScoresPct.filter((n) => Number.isFinite(n));
  if (scores.length < 4) {
    return {
      status: 'insufficient_data',
      evidenceSummaryEn: `Only ${scores.length} scored sessions recorded. At least 4 scored sessions are needed to analyze trend stability.`,
      evidenceSummaryBn: `এখনও মাত্র ${scores.length}টি স্কোরকৃত সেশন আছে। প্রবণতা বিশ্লেষণের জন্য কমপক্ষে ৪টি সেশন প্রয়োজন।`,
      sampleSize: scores.length,
      recurringMistakeCount: params.recurringMistakeCount,
      recoveryActionsEn: [
        'Complete at least 4 assessed speaking, lesson, or transfer tasks to establish a baseline trend.',
      ],
      recoveryActionsBn: [
        'বেসলাইন প্রবণতা তৈরি করতে কমপক্ষে ৪টি স্পিকিং, লেসন বা ট্রান্সফার অনুশীলন সম্পন্ন করুন।',
      ],
      limitationsEn: 'Analytical signal only — requires multi-session evidence across time.',
    };
  }

  const recent4 = scores.slice(-4);
  const minScore = Math.min(...recent4);
  const maxScore = Math.max(...recent4);
  const spread = maxScore - minScore;
  const firstHalfAvg = (recent4[0] + recent4[1]) / 2;
  const secondHalfAvg = (recent4[2] + recent4[3]) / 2;
  const delta = secondHalfAvg - firstHalfAvg;

  const isStalled = (delta <= 2 && spread <= 8 && secondHalfAvg < 85) || (delta < 0 && params.recurringMistakeCount >= 2);

  if (isStalled) {
    return {
      status: 'possible_plateau',
      evidenceSummaryEn: `Last ${recent4.length} scored sessions averaged ${Math.round(firstHalfAvg)}% → ${Math.round(secondHalfAvg)}% (spread ${Math.round(spread)} pts) with ${params.recurringMistakeCount} recurring active mistake(s).`,
      evidenceSummaryBn: `শেষ ${recent4.length}টি সেশনে গড় স্কোর ${Math.round(firstHalfAvg)}% → ${Math.round(secondHalfAvg)}% এবং ${params.recurringMistakeCount}টি পুনরাবৃত্ত ভুল সক্রিয় আছে।`,
      sampleSize: scores.length,
      recurringMistakeCount: params.recurringMistakeCount,
      recoveryActionsEn: [
        'Switch exercise format: try Shadowing chunks or a Language Diary rewrite before your next speaking session.',
        'Review prerequisite Bangla-bridge rules for your top recurring mistake in Mistake Memory.',
        'Lower Pressure Ladder difficulty by one step and focus on accuracy before timed speed.',
      ],
      recoveryActionsBn: [
        'অনুশীলনের ধরন বদলান: পরবর্তী স্পিকিং সেশনের আগে শ্যাডোয়িং বা ল্যাঙ্গুয়েজ ডায়েরি চেষ্টা করুন।',
        'মিস্টেক মেমোরি থেকে আপনার পুনরাবৃত্ত ভুলের মূল নিয়মগুলো আবার দেখুন।',
        'প্রেশার ল্যাডারের কঠিনতা এক ধাপ কমিয়ে আগে নির্ভুলতায় মনোযোগ দিন।',
      ],
      limitationsEn:
        'Analytical indicator only, not a diagnosis. Reflects recent recorded scores without accounting for external offline study.',
    };
  }

  return {
    status: 'progressing',
    evidenceSummaryEn: `Recent ${recent4.length} scored sessions show healthy movement (${Math.round(firstHalfAvg)}% → ${Math.round(secondHalfAvg)}%) across ${params.completedLessonsCount} completed lesson(s).`,
    evidenceSummaryBn: `শেষ ${recent4.length}টি সেশনে ইতিবাচক অগ্রগতি দেখা যাচ্ছে (${Math.round(firstHalfAvg)}% → ${Math.round(secondHalfAvg)}%)।`,
    sampleSize: scores.length,
    recurringMistakeCount: params.recurringMistakeCount,
    recoveryActionsEn: [
      'Keep alternating structured Academy lessons with Transfer Lab scenarios to reinforce delayed retention.',
    ],
    recoveryActionsBn: [
      'দীর্ঘমেয়াদি মনে রাখার জন্য একাডেমি লেসনের পাশাপাশি ট্রান্সফার ল্যাব অনুশীলন চালিয়ে যান।',
    ],
    limitationsEn: 'Analytical trend based strictly on recorded in-platform sessions.',
  };
}

/**
 * Independent Communication Readiness Estimator (PRD §34)
 * Requires evidence across multiple contexts; NEVER claims official CEFR certification or complete fluency.
 */
export interface CommunicationReadinessEstimate {
  bandLabelEn: string;
  bandLabelBn: string;
  coveragePct: number;
  contextsCovered: string[];
  contextsMissing: string[];
  sampleSize: number;
  limitationsEn: string;
}

export function computeCommunicationReadiness(params: {
  diagnosticCompleted: boolean;
  completedLessonsCount: number;
  speakingSessionsCount: number;
  transferAttemptsCount: number;
  examOrWritingAttemptsCount: number;
}): CommunicationReadinessEstimate {
  const contexts: Array<{ key: string; present: boolean }> = [
    { key: 'Initial Diagnostic Baseline', present: params.diagnosticCompleted },
    { key: 'Structured Academy Lessons', present: params.completedLessonsCount > 0 },
    { key: 'AI Speaking Practice', present: params.speakingSessionsCount > 0 },
    { key: 'Transfer Lab Real-World Scenarios', present: params.transferAttemptsCount > 0 },
    { key: 'Writing / IELTS Exam Tasks', present: params.examOrWritingAttemptsCount > 0 },
  ];
  const contextsCovered = contexts.filter((c) => c.present).map((c) => c.key);
  const contextsMissing = contexts.filter((c) => !c.present).map((c) => c.key);
  const coveragePct = Math.round((contextsCovered.length / contexts.length) * 100);
  const sampleSize =
    (params.diagnosticCompleted ? 1 : 0) +
    params.completedLessonsCount +
    params.speakingSessionsCount +
    params.transferAttemptsCount +
    params.examOrWritingAttemptsCount;

  let bandLabelEn = 'Insufficient Multi-Context Evidence';
  let bandLabelBn = 'পর্যাপ্ত বহুমুখী প্রমাণ এখনো তৈরি হয়নি';
  if (contextsCovered.length >= 4 && sampleSize >= 6) {
    bandLabelEn = 'Multi-Context Practice Readiness (Self-Guided Estimate)';
    bandLabelBn = 'বহুমুখী অনুশীলন প্রস্তুতি (অনুশীলনমূলক মূল্যায়ন)';
  } else if (contextsCovered.length >= 2 && sampleSize >= 2) {
    bandLabelEn = 'Developing Practice Evidence';
    bandLabelBn = 'বিকাশমান অনুশীলন প্রমাণ';
  }

  return {
    bandLabelEn,
    bandLabelBn,
    coveragePct,
    contextsCovered,
    contextsMissing,
    sampleSize,
    limitationsEn:
      'Practice evidence indicator only — AI assessments do not prove complete real-world fluency and are NOT official CEFR or IELTS certification.',
  };
}
