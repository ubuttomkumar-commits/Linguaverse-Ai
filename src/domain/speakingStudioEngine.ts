import type {
  LearnerProfile,
  LessonAttemptRecord,
  MistakeMemoryItem,
  SpeakingDetectedMistake,
  SpeakingModeId,
  SpeakingPressureLevel,
  SpeakingScenarioCategory,
  SpeakingSessionRecord,
} from '../types/domain';
import type { CommunicationDnaProfile } from './communicationDnaEngine';
import { MISTAKE_MEMORY_MIN_CONFIDENCE } from './speakingEvaluation.ts';
import {
  getPressureLevelConfig,
  getSpeakingScenario,
  SPEAKING_SCENARIOS,
  type SpeakingDifficultyBand,
  type SpeakingScenario,
} from './speakingScenarios.ts';

export type SpeakingPracticeModeId =
  | 'ai_conversation'
  | 'pronunciation_practice'
  | 'fluency_practice'
  | 'roleplay_scenarios'
  | 'interview_practice'
  | 'presentation_practice';

export interface SpeakingPracticeModeCard {
  id: SpeakingPracticeModeId;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  availability: 'live' | 'stt_assisted';
  honestScopeEn: string;
  honestScopeBn: string;
  targetScenarioId?: SpeakingModeId;
  targetPressure?: SpeakingPressureLevel;
}

export interface SpeakingOverviewMetrics {
  completedSessionsCount: number;
  totalTurnsEvaluated: number;
  verifiedPracticeMinutes: number;
  totalVerifiedDurationSeconds: number;
  syncedMistakesCount: number;
  voiceTurnCount: number;
  textFallbackTurnCount: number;
  lastPracticedScenarioId: SpeakingModeId | null;
  lastSessionAt: string | null;
  improvementIndicator: {
    hasSufficientEvidence: boolean;
    deltaMistakesPerTurn: number | null;
    summaryEn: string;
    summaryBn: string;
  };
}

export interface SpeakingRecommendationItem {
  id: string;
  scenarioId: SpeakingModeId;
  recommendedPressure: SpeakingPressureLevel;
  titleEn: string;
  titleBn: string;
  reasonEn: string;
  reasonBn: string;
  evidenceSource: 'mistake_memory' | 'communication_dna' | 'learner_goal' | 'academy_bridge' | 'foundation';
}

export interface ScenarioFilterInput {
  query: string;
  category: 'all' | SpeakingScenarioCategory;
  difficulty: 'all' | SpeakingDifficultyBand;
}

export interface PronunciationDrillItem {
  id: string;
  kind: 'word' | 'sentence';
  targetText: string;
  ipaGuide: string;
  focusAreaEn: string;
  focusAreaBn: string;
  banglaTipEn: string;
  banglaTipBn: string;
  cefrFit: string;
}

export interface PronunciationWordMatch {
  word: string;
  matched: boolean;
}

export interface PronunciationComparisonResult {
  targetText: string;
  recognizedTranscript: string;
  wordMatches: PronunciationWordMatch[];
  matchedWordCount: number;
  totalTargetWords: number;
  extraWords: string[];
  recognitionMatchLabelEn: string;
  recognitionMatchLabelBn: string;
  coachingNoteEn: string;
  coachingNoteBn: string;
  honestDisclaimerEn: string;
  honestDisclaimerBn: string;
}

export interface SpeakingFeedbackDimensionItem {
  id: string;
  labelEn: string;
  labelBn: string;
  sourceEn: string;
  sourceBn: string;
  statusLabelEn: string;
  statusLabelBn: string;
  detailEn: string;
  detailBn: string;
  evidenceType: 'measured' | 'ai_linguistic' | 'unmeasured_limitation';
}

export interface SpeakingSessionResultsModel {
  sessionId: string;
  scenario: SpeakingScenario;
  pressureTitleEn: string;
  pressureTitleBn: string;
  durationSeconds: number;
  turnCount: number;
  voiceTurnCount: number;
  textTurnCount: number;
  correctedSentences: Array<{
    turnNumber: number;
    original: string;
    corrected: string;
    naturalAlternative: string;
    changed: boolean;
  }>;
  strengths: string[];
  verifiedMistakes: Array<SpeakingDetectedMistake & { turnNumber: number }>;
  suggestedImprovements: Array<SpeakingDetectedMistake & { turnNumber: number }>;
  dimensions: SpeakingFeedbackDimensionItem[];
  recommendedNextScenarioId: SpeakingModeId;
  recommendedNextReasonEn: string;
  recommendedNextReasonBn: string;
}

export const PRONUNCIATION_DRILLS: PronunciationDrillItem[] = [
  {
    id: 'pron_word_very',
    kind: 'word',
    targetText: 'very valuable review',
    ipaGuide: '/ˈveri ˈvæljuəbl rɪˈvjuː/',
    focusAreaEn: '/v/ vs /b/ & /bh/ contrast',
    focusAreaBn: '/v/ বনাম /ভ/ উচ্চারণ পার্থক্য',
    banglaTipEn: 'Touch your upper teeth lightly against your lower lip for /v/ — avoid closing both lips like Bangla ভ.',
    banglaTipBn: '/v/ উচ্চারণে উপরের দাঁত নিচের ঠোঁটে হালকা ছুঁয়ে বাতাস ছাড়ুন; বাংলার "ভ"-এর মতো দুই ঠোঁট পুরো বন্ধ করবেন না।',
    cefrFit: 'A1 – B1',
  },
  {
    id: 'pron_word_schedule',
    kind: 'word',
    targetText: 'schedule and strategy',
    ipaGuide: '/ˈskedʒuːl ænd ˈstrætədʒi/',
    focusAreaEn: 'Initial consonant clusters (sk-, str-)',
    focusAreaBn: 'শব্দের শুরুতে যুক্তবর্ণ (sk-, str-)',
    banglaTipEn: 'Start directly with "s" without adding an extra "e" sound in front ("schedule", not "es-chedule").',
    banglaTipBn: 'শব্দের আগে বাড়তি "ই" বা "এ" ধ্বনি যোগ না করে সরাসরি "স্" দিয়ে শুরু করুন ("schedule", "ইসকেডিউল" নয়)।',
    cefrFit: 'A2 – B2',
  },
  {
    id: 'pron_word_specific',
    kind: 'word',
    targetText: 'specific focus on ship and sip',
    ipaGuide: '/spəˈsɪfɪk ˈfoʊkəs ɒn ʃɪp ænd sɪp/',
    focusAreaEn: '/s/ vs /ʃ/ (sh) clarity',
    focusAreaBn: '/s/ বনাম /ʃ/ (শ) স্পষ্টতা',
    banglaTipEn: 'Keep lips spread for /s/ ("sip", "specific") and slightly rounded for /ʃ/ ("ship").',
    banglaTipBn: '/s/ বলার সময় ঠোঁট ছড়ানো রাখুন ("sip") আর /ʃ/ ("ship") বলার সময় ঠোঁট হালকা গোল করুন।',
    cefrFit: 'A1 – B1',
  },
  {
    id: 'pron_sent_interview',
    kind: 'sentence',
    targetText: 'Yesterday we discussed the final schedule and resolved the main issue.',
    ipaGuide: 'Stress: YES-ter-day · dis-CUSSED · FI-nal · SCHED-ule · re-SOLVED · IS-sue',
    focusAreaEn: 'Past -ed endings & content-word rhythm',
    focusAreaBn: 'Past -ed সমাপ্তি ও শব্দের জোর (word stress)',
    banglaTipEn: 'Pronounce the crisp /t/ ending on "discussed" and /d/ on "resolved" without adding an extra syllable.',
    banglaTipBn: '"discussed" (/t/) এবং "resolved" (/d/) এর শেষে বাড়তি সিলেবল যোগ না করে স্পষ্টভাবে শেষ করুন।',
    cefrFit: 'A2 – B2',
  },
  {
    id: 'pron_sent_workplace',
    kind: 'sentence',
    targetText: 'I have been working on this project since Monday and will share an update tomorrow.',
    ipaGuide: 'Stress: WORK-ing · PRO-ject · MON-day · SHARE · UP-date · to-MOR-row',
    focusAreaEn: 'Chunking & natural pause boundaries',
    focusAreaBn: 'বাক্যাংশ বিভাজন ও স্বাভাবিক বিরতি',
    banglaTipEn: 'Pause briefly after "since Monday" so the sentence breathes naturally instead of rushing every word evenly.',
    banglaTipBn: '"since Monday"-এর পর সামান্য থামুন যাতে বাক্যের ছন্দ ও স্পষ্টতা বজায় থাকে।',
    cefrFit: 'B1 – B2',
  },
  {
    id: 'pron_sent_travel',
    kind: 'sentence',
    targetText: 'Could you please tell me which gate my connecting flight leaves from?',
    ipaGuide: 'Intonation: rising politely on "leaves from?"',
    focusAreaEn: 'Polite question intonation & linking',
    focusAreaBn: 'ভদ্র প্রশ্নের সুর (intonation)',
    banglaTipEn: 'Blend "Could you" smoothly and lift your pitch slightly on the final phrase to sound polite.',
    banglaTipBn: '"Could you" সাবলীলভাবে যুক্ত করুন এবং প্রশ্নের শেষে হালকা সুর তুলুন যাতে অনুরোধটি ভদ্র শোনায়।',
    cefrFit: 'A1 – B1',
  },
];

export function isVerifiedMistakeForMemory(mistake: Pick<SpeakingDetectedMistake, 'confidence'>): boolean {
  return Number.isFinite(mistake.confidence) && mistake.confidence >= MISTAKE_MEMORY_MIN_CONFIDENCE;
}

export function buildPracticeModesCatalog(): SpeakingPracticeModeCard[] {
  return [
    {
      id: 'ai_conversation',
      titleEn: 'AI Conversation',
      titleBn: 'AI কথোপকথন',
      descEn: 'Open, responsive voice or text dialogue with live Gemini coaching and Bangla explanations.',
      descBn: 'লাইভ Gemini কোচিং ও বাংলা ব্যাখ্যাসহ বাস্তবসম্মত ভয়েস বা টেক্সট কথোপকথন।',
      availability: 'live',
      honestScopeEn: 'Live Gemini evaluation + browser voice capture & text fallback',
      honestScopeBn: 'লাইভ Gemini মূল্যায়ন + ব্রাউজার ভয়েস ও টেক্সট ইনপুট',
      targetScenarioId: 'daily_conversations',
      targetPressure: 'level_2_guided',
    },
    {
      id: 'pronunciation_practice',
      titleEn: 'Pronunciation Practice',
      titleBn: 'উচ্চারণ ও স্পষ্টতা অনুশীলন',
      descEn: 'Listen to reference English phrasing, record your voice, and inspect word-level recognition clarity.',
      descBn: 'রেফারেন্স উচ্চারণ শুনুন, নিজের কণ্ঠ রেকর্ড করুন এবং শব্দ-ভিত্তিক স্পষ্টতা যাচাই করুন।',
      availability: 'stt_assisted',
      honestScopeEn: 'Reference TTS + Speech Recognition word match (no acoustic phoneme scoring)',
      honestScopeBn: 'রেফারেন্স TTS + স্পিচ রিকগনিশন তুলনা (অ্যাকুস্টিক ফোনিম স্কোর নয়)',
    },
    {
      id: 'fluency_practice',
      titleEn: 'Fluency Practice',
      titleBn: 'সাবলীলতা ও তাৎক্ষণিক অনুশীলন',
      descEn: 'Think on your feet with spontaneous prompts and optional 45-second timed pressure.',
      descBn: 'তাৎক্ষণিক প্রশ্ন ও ৪৫ সেকেন্ডের সময়সীমা চাপে সাবলীলভাবে কথা বলার অনুশীলন।',
      availability: 'live',
      honestScopeEn: 'Live timed conversation pacing & structure feedback',
      honestScopeBn: 'সময়সীমাভিত্তিক লাইভ কথোপকথন ও বাক্যগঠন ফিডব্যাক',
      targetScenarioId: 'unexpected_questions',
      targetPressure: 'level_5_timed_high_stakes',
    },
    {
      id: 'roleplay_scenarios',
      titleEn: 'Roleplay Scenarios',
      titleBn: 'রোলপ্লে দৃশ্যপট লাইব্রেরি',
      descEn: 'Browse 10 configured Everyday, Professional, Academic, and Travel conversations.',
      descBn: 'দৈনন্দিন, পেশাদার, একাডেমিক ও ভ্রমণভিত্তিক ১০টি বাস্তব রোলপ্লে দৃশ্যপট।',
      availability: 'live',
      honestScopeEn: '10 configured scenarios · 5-level Pressure Ladder',
      honestScopeBn: '১০টি বাস্তব দৃশ্যপট · ৫-স্তরের প্রেসার ল্যাডার',
    },
    {
      id: 'interview_practice',
      titleEn: 'Interview Practice',
      titleBn: 'চাকরির ইন্টারভিউ অনুশীলন',
      descEn: 'Practice STAR behavioral answers with a Hiring Manager persona and follow-up twists.',
      descBn: 'হায়ারিং ম্যানেজার পার্সোনা ও পাল্টা প্রশ্নের মাধ্যমে STAR ইন্টারভিউ প্রস্তুতি।',
      availability: 'live',
      honestScopeEn: 'Live Hiring Manager persona + twist follow-ups',
      honestScopeBn: 'লাইভ ইন্টারভিউয়ার পার্সোনা ও পাল্টা প্রশ্ন',
      targetScenarioId: 'job_interviews',
      targetPressure: 'level_4_twist',
    },
    {
      id: 'presentation_practice',
      titleEn: 'Presentation Practice',
      titleBn: 'প্রেজেন্টেশন ও পিচ অনুশীলন',
      descEn: 'Deliver structured executive summaries and respond clearly to stakeholder questions.',
      descBn: 'গুছিয়ে মূল বার্তা উপস্থাপন এবং স্টেকহোল্ডারদের প্রশ্নের উত্তর অনুশীলন।',
      availability: 'live',
      honestScopeEn: 'Live stakeholder Q&A + structure & clarity feedback',
      honestScopeBn: 'লাইভ স্টেকহোল্ডার প্রশ্নোত্তর ও স্পষ্টতা ফিডব্যাক',
      targetScenarioId: 'presentation_pitch',
      targetPressure: 'level_3_open',
    },
  ];
}

export function buildSpeakingOverview(
  sessions: SpeakingSessionRecord[]
): SpeakingOverviewMetrics {
  const validSessions = sessions.filter((s) => s.turns.length > 0);
  const completedSessionsCount = validSessions.length;
  const totalTurnsEvaluated = validSessions.reduce((sum, s) => sum + s.turns.length, 0);
  const totalVerifiedDurationSeconds = validSessions.reduce(
    (sum, s) => sum + Math.max(0, s.durationSeconds || 0),
    0
  );
  const verifiedPracticeMinutes =
    totalVerifiedDurationSeconds > 0
      ? Math.max(1, Math.round(totalVerifiedDurationSeconds / 60))
      : 0;

  let syncedMistakesCount = 0;
  let voiceTurnCount = 0;
  let textFallbackTurnCount = 0;

  for (const session of validSessions) {
    for (const turn of session.turns) {
      if (turn.inputChannel === 'voice_stt' || turn.inputChannel === 'voice_with_manual_edit') {
        voiceTurnCount += 1;
      } else {
        textFallbackTurnCount += 1;
      }
      syncedMistakesCount += turn.evaluation.mistakes.filter(isVerifiedMistakeForMemory).length;
    }
  }

  // Sort chronological copy to check real trend across >= 2 completed sessions
  const chronological = [...validSessions].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );
  const latestSession = chronological[chronological.length - 1] ?? null;

  let improvementIndicator: SpeakingOverviewMetrics['improvementIndicator'];
  if (chronological.length < 2) {
    improvementIndicator = {
      hasSufficientEvidence: false,
      deltaMistakesPerTurn: null,
      summaryEn:
        chronological.length === 0
          ? 'Complete 2 speaking sessions to unlock real error-rate trend comparison.'
          : '1 session completed — complete 1 more session to measure your real trend.',
      summaryBn:
        chronological.length === 0
          ? 'বাস্তব উন্নতির ধারা দেখতে অন্তত ২টি স্পিকিং সেশন সম্পন্ন করুন।'
          : '১টি সেশন সম্পন্ন হয়েছে — উন্নতির তুলনা দেখতে আরও ১টি সেশন সম্পন্ন করুন।',
    };
  } else {
    const first = chronological[0];
    const latest = chronological[chronological.length - 1];
    const firstRate = first.totalMistakesDetected / Math.max(1, first.turns.length);
    const latestRate = latest.totalMistakesDetected / Math.max(1, latest.turns.length);
    const delta = Number((latestRate - firstRate).toFixed(2));
    if (delta < 0) {
      improvementIndicator = {
        hasSufficientEvidence: true,
        deltaMistakesPerTurn: delta,
        summaryEn: `Fewer errors per turn in your latest session (${latestRate.toFixed(1)} vs ${firstRate.toFixed(1)} initially).`,
        summaryBn: `আপনার সর্বশেষ সেশনে প্রতি ধাপে ভুল কমেছে (${firstRate.toFixed(1)} → ${latestRate.toFixed(1)})।`,
      };
    } else if (delta === 0) {
      improvementIndicator = {
        hasSufficientEvidence: true,
        deltaMistakesPerTurn: 0,
        summaryEn: `Steady accuracy across sessions (${latestRate.toFixed(1)} errors/turn). Try increasing Pressure Ladder difficulty.`,
        summaryBn: `সেশনগুলোতে নির্ভুলতা স্থিতিশীল রয়েছে (প্রতি ধাপে ${latestRate.toFixed(1)}টি ভুল)। উচ্চতর প্রেসার লেভেল চেষ্টা করুন।`,
      };
    } else {
      improvementIndicator = {
        hasSufficientEvidence: true,
        deltaMistakesPerTurn: delta,
        summaryEn: `More complex phrasing surfaced ${latestRate.toFixed(1)} errors/turn — drill active items in Mistake Memory.`,
        summaryBn: `সর্বশেষ সেশনে প্রতি ধাপে ${latestRate.toFixed(1)}টি ভুল শনাক্ত হয়েছে — Mistake Memory-তে অনুশীলন করুন।`,
      };
    }
  }

  return {
    completedSessionsCount,
    totalTurnsEvaluated,
    verifiedPracticeMinutes,
    totalVerifiedDurationSeconds,
    syncedMistakesCount,
    voiceTurnCount,
    textFallbackTurnCount,
    lastPracticedScenarioId: latestSession?.modeId ?? null,
    lastSessionAt: latestSession?.updatedAt ?? null,
    improvementIndicator,
  };
}

export function filterSpeakingScenarios(
  scenarios: SpeakingScenario[],
  filter: ScenarioFilterInput
): SpeakingScenario[] {
  const q = filter.query.trim().toLowerCase();
  return scenarios.filter((item) => {
    if (filter.category !== 'all' && item.category !== filter.category) {
      return false;
    }
    if (filter.difficulty !== 'all' && item.difficultyBand !== filter.difficulty) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      item.titleEn,
      item.titleBn,
      item.subtitleEn,
      item.subtitleBn,
      item.learningObjectiveEn,
      item.aiPersonaEn,
      item.cefrFit,
      ...item.suggestedVocabulary,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function buildSpeakingRecommendations(input: {
  profile: LearnerProfile | null;
  mistakes: MistakeMemoryItem[];
  speakingSessions: SpeakingSessionRecord[];
  lessonAttempts: LessonAttemptRecord[];
  dna: CommunicationDnaProfile;
}): SpeakingRecommendationItem[] {
  const recs: SpeakingRecommendationItem[] = [];
  const usedScenarios = new Set<SpeakingModeId>();

  const activeMistakes = input.mistakes
    .filter((m) => m.status === 'active' && !m.falseCorrectionReported)
    .sort((a, b) => b.occurrences - a.occurrences);

  // 1. Active Mistake Memory pattern recommendation
  if (activeMistakes.length > 0) {
    const top = activeMistakes[0];
    const targetId: SpeakingModeId =
      top.domain === 'vocabulary' || /preposition|collocation/i.test(top.category)
        ? 'workplace_communication'
        : /tense|past/i.test(top.category)
          ? 'job_interviews'
          : 'daily_conversations';
    const scenario = getSpeakingScenario(targetId);
    usedScenarios.add(targetId);
    recs.push({
      id: `rec_mistake_${top.id}`,
      scenarioId: targetId,
      recommendedPressure: 'level_2_guided',
      titleEn: `Transfer Fix: ${scenario.titleEn}`,
      titleBn: `ভুল সংশোধন অনুশীলন: ${scenario.titleBn}`,
      reasonEn: `Recommended because "${top.userExample}" → "${top.correctedExample}" (${top.category}) is active in your Mistake Memory (${top.occurrences}×).`,
      reasonBn: `আপনার Mistake Memory-তে "${top.userExample}" → "${top.correctedExample}" (${top.category}) সক্রিয় থাকায় এই সেশনটি প্রস্তাবিত।`,
      evidenceSource: 'mistake_memory',
    });
  }

  // 2. Communication DNA Speaking Task Completion gap
  const speakingDim = input.dna.dimensions.find((d) => d.id === 'speaking_task_completion');
  if (speakingDim && speakingDim.sampleSize < 3) {
    const targetId: SpeakingModeId = usedScenarios.has('self_introduction')
      ? 'daily_conversations'
      : 'self_introduction';
    if (!usedScenarios.has(targetId)) {
      const scenario = getSpeakingScenario(targetId);
      usedScenarios.add(targetId);
      const needed = 3 - speakingDim.sampleSize;
      recs.push({
        id: 'rec_dna_speaking_unlock',
        scenarioId: targetId,
        recommendedPressure: 'level_1_controlled',
        titleEn: `Unlock Speaking DNA: ${scenario.titleEn}`,
        titleBn: `Speaking DNA আনলক: ${scenario.titleBn}`,
        reasonEn: `Complete ${needed} more spoken turn${needed === 1 ? '' : 's'} to unlock a verified Speaking Task Completion score in Communication DNA.`,
        reasonBn: `Communication DNA-তে Speaking দক্ষতা পরিমাপ করতে আরও ${needed}টি স্পিকিং ধাপ সম্পন্ন করুন।`,
        evidenceSource: 'communication_dna',
      });
    }
  }

  // 3. Learner Profile Primary Goal match
  const goalMap: Record<string, { scenarioId: SpeakingModeId; pressure: SpeakingPressureLevel; labelEn: string; labelBn: string }> = {
    job_interview: {
      scenarioId: 'job_interviews',
      pressure: 'level_3_open',
      labelEn: 'Job Interview preparation',
      labelBn: 'চাকরির ইন্টারভিউ প্রস্তুতি',
    },
    workplace: {
      scenarioId: 'workplace_communication',
      pressure: 'level_3_open',
      labelEn: 'Workplace Communication',
      labelBn: 'কর্মক্ষেত্রের যোগাযোগ',
    },
    academic_ielts: {
      scenarioId: 'academic_discussion',
      pressure: 'level_3_open',
      labelEn: 'Academic & Oral Exam fluency',
      labelBn: 'একাডেমিক ও মৌখিক পরীক্ষা',
    },
    daily_speaking: {
      scenarioId: 'daily_conversations',
      pressure: 'level_2_guided',
      labelEn: 'Everyday Spoken Fluency',
      labelBn: 'দৈনন্দিন ইংরেজি কথোপকথন',
    },
  };
  const goalMatch = goalMap[input.profile?.primaryGoal ?? 'daily_speaking'] ?? goalMap.daily_speaking;
  if (!usedScenarios.has(goalMatch.scenarioId)) {
    const scenario = getSpeakingScenario(goalMatch.scenarioId);
    usedScenarios.add(goalMatch.scenarioId);
    recs.push({
      id: `rec_goal_${goalMatch.scenarioId}`,
      scenarioId: goalMatch.scenarioId,
      recommendedPressure: goalMatch.pressure,
      titleEn: scenario.titleEn,
      titleBn: scenario.titleBn,
      reasonEn: `Aligned with your saved learning goal: ${goalMatch.labelEn}.`,
      reasonBn: `আপনার নির্বাচিত শেখার লক্ষ্য (${goalMatch.labelBn}) অনুযায়ী প্রস্তাবিত।`,
      evidenceSource: 'learner_goal',
    });
  }

  // 4. Academy bridge if learner completed a lesson recently
  if (recs.length < 3 && input.lessonAttempts.length > 0 && !usedScenarios.has('presentation_pitch')) {
    const scenario = getSpeakingScenario('presentation_pitch');
    usedScenarios.add('presentation_pitch');
    recs.push({
      id: 'rec_academy_bridge',
      scenarioId: 'presentation_pitch',
      recommendedPressure: 'level_2_guided',
      titleEn: `Apply Academy Grammar: ${scenario.titleEn}`,
      titleBn: `একাডেমি গ্রামার প্রয়োগ: ${scenario.titleBn}`,
      reasonEn: `Put your ${input.lessonAttempts.length} completed Academy attempt${input.lessonAttempts.length === 1 ? '' : 's'} into live spoken structure.`,
      reasonBn: `একাডেমিতে সম্পন্ন করা অনুশীলনগুলো সরাসরি কথা বলার মাধ্যমে ঝালিয়ে নিন।`,
      evidenceSource: 'academy_bridge',
    });
  }

  // Fill up to 3 curated starting scenarios if needed
  const fallbackOrder: SpeakingModeId[] = ['self_introduction', 'travel', 'customer_service'];
  for (const fallbackId of fallbackOrder) {
    if (recs.length >= 3) break;
    if (usedScenarios.has(fallbackId)) continue;
    const scenario = getSpeakingScenario(fallbackId);
    usedScenarios.add(fallbackId);
    recs.push({
      id: `rec_foundation_${fallbackId}`,
      scenarioId: fallbackId,
      recommendedPressure: 'level_2_guided',
      titleEn: scenario.titleEn,
      titleBn: scenario.titleBn,
      reasonEn: `Practical real-world scenario (${scenario.cefrFit}) to build natural speaking confidence.`,
      reasonBn: `বাস্তব পরিস্থিতিতে আত্মবিশ্বাস বাড়াতে উপযোগী অনুশীলন (${scenario.cefrFit})।`,
      evidenceSource: 'foundation',
    });
  }

  return recs.slice(0, 3);
}

function tokenizeNormalizedWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/**
 * Deterministic word-level Speech Recognition comparison.
 * STRICT HONESTY: Compares recognized transcript words against the target phrase ONLY.
 * Never claims acoustic phoneme accuracy or native-speaker accent scoring.
 */
export function comparePronunciationTranscript(
  targetText: string,
  recognizedTranscript: string
): PronunciationComparisonResult {
  const targetDisplayWords = targetText.trim().split(/\s+/).filter(Boolean);
  const targetTokens = targetDisplayWords.map((w) => w.toLowerCase().replace(/[^a-z0-9']/g, ''));
  const spokenTokens = tokenizeNormalizedWords(recognizedTranscript);

  const remainingSpoken = [...spokenTokens];
  const wordMatches: PronunciationWordMatch[] = targetDisplayWords.map((displayWord, idx) => {
    const token = targetTokens[idx];
    const foundIdx = remainingSpoken.indexOf(token);
    if (token && foundIdx >= 0) {
      remainingSpoken.splice(foundIdx, 1);
      return { word: displayWord, matched: true };
    }
    return { word: displayWord, matched: false };
  });

  const matchedWordCount = wordMatches.filter((w) => w.matched).length;
  const totalTargetWords = wordMatches.length;

  let recognitionMatchLabelEn: string;
  let recognitionMatchLabelBn: string;
  let coachingNoteEn: string;
  let coachingNoteBn: string;

  if (spokenTokens.length === 0) {
    recognitionMatchLabelEn = 'No transcript captured';
    recognitionMatchLabelBn = 'কোনো ট্রান্সক্রিপ্ট পাওয়া যায়নি';
    coachingNoteEn =
      'Browser Speech Recognition did not capture words. Play back your own recording to compare against the reference audio, or try speaking slightly closer to the microphone.';
    coachingNoteBn =
      'ব্রাউজার স্পিচ রিকগনিশন কোনো শব্দ শনাক্ত করেনি। নিজের রেকর্ডকৃত অডিও চালিয়ে রেফারেন্সের সাথে মিলিয়ে শুনুন বা মাইক্রোফোনের কাছাকাছি বলুন।';
  } else if (matchedWordCount === totalTargetWords) {
    recognitionMatchLabelEn = `All ${totalTargetWords}/${totalTargetWords} target words recognized`;
    recognitionMatchLabelBn = `সব ${totalTargetWords}/${totalTargetWords}টি শব্দ স্পষ্টভাবে শনাক্ত হয়েছে`;
    coachingNoteEn =
      'Browser speech recognition matched every target word. Listen to your own audio replay next to the 0.75x reference audio to self-check stress and intonation.';
    coachingNoteBn =
      'স্পিচ রিকগনিশন প্রতিটি লক্ষ্য শব্দ সঠিকভাবে শনাক্ত করেছে। এখন ০.৭৫x রেফারেন্সের সাথে নিজের রেকর্ডিং মিলিয়ে শব্দের জোর ও সুর যাচাই করুন।';
  } else {
    const missed = wordMatches
      .filter((w) => !w.matched)
      .map((w) => w.word)
      .slice(0, 4)
      .join(', ');
    recognitionMatchLabelEn = `${matchedWordCount}/${totalTargetWords} target words recognized`;
    recognitionMatchLabelBn = `${matchedWordCount}/${totalTargetWords}টি লক্ষ্য শব্দ শনাক্ত হয়েছে`;
    coachingNoteEn = `Speech recognition missed or substituted: ${missed}. Slow down on those words, replay the 0.75x reference audio, and try one more take.`;
    coachingNoteBn = `শনাক্ত না হওয়া বা ভিন্নভাবে শোনা শব্দ: ${missed}। ০.৭৫x গতিতে রেফারেন্স শুনে এই শব্দগুলোতে মনোযোগ দিয়ে আবার চেষ্টা করুন।`;
  }

  return {
    targetText,
    recognizedTranscript: recognizedTranscript.trim(),
    wordMatches,
    matchedWordCount,
    totalTargetWords,
    extraWords: remainingSpoken,
    recognitionMatchLabelEn,
    recognitionMatchLabelBn,
    coachingNoteEn,
    coachingNoteBn,
    honestDisclaimerEn:
      'Speech Recognition Word Match Only — browser STT checks recognized words, not acoustic phonemes or native-accent equivalence.',
    honestDisclaimerBn:
      'শুধুমাত্র স্পিচ রিকগনিশন শব্দ-মিল — এটি অ্যাকুস্টিক ফোনিম বা নেটিভ অ্যাকসেন্ট স্কোর নয়।',
  };
}

export function buildSpeakingSessionResults(
  session: SpeakingSessionRecord
): SpeakingSessionResultsModel {
  const scenario = getSpeakingScenario(session.modeId);
  const pressure = getPressureLevelConfig(session.pressureLevel);

  const correctedSentences = session.turns.map((turn) => ({
    turnNumber: turn.turnNumber,
    original: turn.userTranscript,
    corrected: turn.evaluation.corrected_transcript,
    naturalAlternative: turn.evaluation.natural_alternative,
    changed:
      turn.userTranscript.trim().toLowerCase() !==
      turn.evaluation.corrected_transcript.trim().toLowerCase(),
  }));

  const strengths: string[] = [];
  const verifiedMistakes: Array<SpeakingDetectedMistake & { turnNumber: number }> = [];
  const suggestedImprovements: Array<SpeakingDetectedMistake & { turnNumber: number }> = [];

  let voiceTurnCount = 0;
  let textTurnCount = 0;
  let totalWordCount = 0;

  for (const turn of session.turns) {
    if (turn.inputChannel === 'voice_stt' || turn.inputChannel === 'voice_with_manual_edit') {
      voiceTurnCount += 1;
    } else {
      textTurnCount += 1;
    }
    totalWordCount += turn.userTranscript.trim().split(/\s+/).filter(Boolean).length;

    for (const elem of turn.evaluation.correct_elements) {
      if (!strengths.includes(elem)) strengths.push(elem);
    }
    for (const m of turn.evaluation.mistakes) {
      if (isVerifiedMistakeForMemory(m)) {
        verifiedMistakes.push({ ...m, turnNumber: turn.turnNumber });
      } else {
        suggestedImprovements.push({ ...m, turnNumber: turn.turnNumber });
      }
    }
  }

  const avgWordsPerTurn =
    session.turns.length > 0 ? Math.round(totalWordCount / session.turns.length) : 0;

  const grammarIssueCount = verifiedMistakes.filter((m) =>
    /grammar|tense|verb|preposition|article|auxiliary/i.test(m.category)
  ).length;
  const vocabIssueCount = verifiedMistakes.filter((m) =>
    /vocab|collocation|word choice|phrasing/i.test(m.category)
  ).length;

  const dimensions: SpeakingFeedbackDimensionItem[] = [
    {
      id: 'grammar',
      labelEn: 'Grammar & Structure',
      labelBn: 'ব্যাকরণ ও বাক্যগঠন',
      sourceEn: 'AI Linguistic Analysis (Gemini)',
      sourceBn: 'AI ভাষাগত বিশ্লেষণ (Gemini)',
      statusLabelEn:
        grammarIssueCount === 0
          ? 'No confirmed grammar errors'
          : `${grammarIssueCount} confirmed error${grammarIssueCount === 1 ? '' : 's'}`,
      statusLabelBn:
        grammarIssueCount === 0
          ? 'কোনো নিশ্চিত ব্যাকরণ ভুল নেই'
          : `${grammarIssueCount}টি নিশ্চিত ব্যাকরণ ভুল`,
      detailEn:
        grammarIssueCount === 0
          ? 'Your evaluated turns kept verb tense, word order, and prepositions accurate.'
          : 'High-confidence grammar issues (>= 70% confidence) were synced to your Mistake Memory for targeted drilling.',
      detailBn:
        grammarIssueCount === 0
          ? 'আপনার মূল্যায়িত বাক্যগুলোতে কাল, শব্দক্রম ও প্রিপজিশন সঠিক ছিল।'
          : 'উচ্চ-নিশ্চয়তার ব্যাকরণ ভুলগুলো অনুশীলনের জন্য আপনার Mistake Memory-তে যুক্ত হয়েছে।',
      evidenceType: 'ai_linguistic',
    },
    {
      id: 'vocabulary',
      labelEn: 'Vocabulary & Natural Phrasing',
      labelBn: 'শব্দভাণ্ডার ও স্বাভাবিক প্রকাশ',
      sourceEn: 'AI Linguistic Analysis + Measured Lexical Output',
      sourceBn: 'AI বিশ্লেষণ ও শব্দ-বৈচিত্র্য',
      statusLabelEn:
        vocabIssueCount === 0
          ? `${totalWordCount} words · Natural upgrades available`
          : `${vocabIssueCount} phrasing adjustment${vocabIssueCount === 1 ? '' : 's'}`,
      statusLabelBn:
        vocabIssueCount === 0
          ? `${totalWordCount}টি শব্দ · স্বাভাবিক বিকল্প যুক্ত`
          : `${vocabIssueCount}টি শব্দচয়ন সংশোধন`,
      detailEn: `You produced ${totalWordCount} words across ${session.turns.length} turn${session.turns.length === 1 ? '' : 's'} (avg ${avgWordsPerTurn} words/turn). Review the natural alternatives below.`,
      detailBn: `${session.turns.length} ধাপে মোট ${totalWordCount}টি শব্দ ব্যবহার করেছেন (গড়ে ${avgWordsPerTurn} শব্দ/ধাপ)। নিচের স্বাভাবিক বিকল্পগুলো দেখুন।`,
      evidenceType: 'ai_linguistic',
    },
    {
      id: 'clarity_pacing',
      labelEn: 'Communication & Pacing',
      labelBn: 'যোগাযোগ ও গতি',
      sourceEn: 'Measured Session Telemetry',
      sourceBn: 'পরিমাপকৃত সেশন তথ্য',
      statusLabelEn: `${session.turns.length} ${session.turns.length === 1 ? 'turn' : 'turns'} · ${voiceTurnCount} voice / ${textTurnCount} text`,
      statusLabelBn: `${session.turns.length} ধাপ · ${voiceTurnCount} ভয়েস / ${textTurnCount} টেক্সট`,
      detailEn:
        session.turns.some((t) => t.timedOut)
          ? 'At least one response exceeded the 45-second pressure timer — practice concise opening phrases to respond faster.'
          : 'All responses were submitted within the active pacing window.',
      detailBn:
        session.turns.some((t) => t.timedOut)
          ? 'এক বা একাধিক উত্তরে ৪৫ সেকেন্ডের সময়সীমা শেষ হয়েছিল — সংক্ষিপ্ত সূচনা বাক্য অনুশীলন করুন।'
          : 'সবগুলো উত্তর নির্ধারিত সময়ের মধ্যেই সম্পন্ন হয়েছে।',
      evidenceType: 'measured',
    },
    {
      id: 'pronunciation',
      labelEn: 'Acoustic Pronunciation & Accent',
      labelBn: 'অ্যাকুস্টিক উচ্চারণ ও অ্যাকসেন্ট',
      sourceEn: 'Limitation Notice (No Phoneme Scorer)',
      sourceBn: 'সীমাবদ্ধতা নোট (ফোনিম স্কোরার নেই)',
      statusLabelEn: 'Not acoustically scored',
      statusLabelBn: 'অ্যাকুস্টিকভাবে স্কোর করা হয়নি',
      detailEn:
        'Only recognized transcripts were evaluated by Gemini. Replay your local voice recordings in the transcript below to self-review rhythm and intonation.',
      detailBn:
        'Gemini কেবল টেক্সট ট্রান্সক্রিপ্ট মূল্যায়ন করেছে। উচ্চারণ ও সুর যাচাই করতে নিচের ট্রান্সক্রিপ্ট থেকে আপনার রেকর্ড করা অডিও শুনুন।',
      evidenceType: 'unmeasured_limitation',
    },
  ];

  // Pick logical next scenario recommendation
  const currentIdx = SPEAKING_SCENARIOS.findIndex((s) => s.id === session.modeId);
  const nextScenario = SPEAKING_SCENARIOS[(currentIdx + 1) % SPEAKING_SCENARIOS.length];

  return {
    sessionId: session.id,
    scenario,
    pressureTitleEn: pressure.titleEn,
    pressureTitleBn: pressure.titleBn,
    durationSeconds: session.durationSeconds,
    turnCount: session.turns.length,
    voiceTurnCount,
    textTurnCount,
    correctedSentences,
    strengths,
    verifiedMistakes,
    suggestedImprovements,
    dimensions,
    recommendedNextScenarioId:
      verifiedMistakes.length >= 2 ? session.modeId : nextScenario.id,
    recommendedNextReasonEn:
      verifiedMistakes.length >= 2
        ? `Retest "${scenario.titleEn}" after reviewing your ${verifiedMistakes.length} synced mistakes to verify real retention.`
        : `Step into "${nextScenario.titleEn}" to broaden your real-world speaking versatility.`,
    recommendedNextReasonBn:
      verifiedMistakes.length >= 2
        ? `শনাক্তকৃত ${verifiedMistakes.length}টি ভুল রিভিউ করার পর "${scenario.titleBn}" আবার অনুশীলন করে অগ্রগতি যাচাই করুন।`
        : `নতুন পরিস্থিতিতে দক্ষতা বাড়াতে "${nextScenario.titleBn}" চেষ্টা করুন।`,
  };
}
