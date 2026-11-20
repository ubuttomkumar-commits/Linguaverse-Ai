import { DIAGNOSTIC_QUESTIONS } from './diagnosticData';
import type {
  DiagnosticQuestion,
  DiagnosticSkillDomain,
  DiagnosticUserAnswer,
  DomainBreakdown,
  EvaluatedDiagnosticItem,
  EvidenceStartingProfile,
  MistakeMemoryItem,
  SelfEstimatedLevel,
} from '../types/domain';

const SELF_LEVEL_RANK: Record<SelfEstimatedLevel, number> = {
  'Pre-A1': 0,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

function normalizeSentence(value: string): string {
  return value
    .trim()
    .replace(/[.?!,]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function isDiagnosticAnswerCorrect(
  question: DiagnosticQuestion,
  rawUserResponse: string
): boolean {
  const response = rawUserResponse.trim();
  if (!response) return false;

  if (question.type === 'sentence_builder') {
    const normalizedResponse = normalizeSentence(response);
    const validTargets = question.acceptableAnswers?.length
      ? question.acceptableAnswers
      : [question.correctAnswer];
    return validTargets.some((target) => normalizeSentence(target) === normalizedResponse);
  }

  return response === question.correctAnswer;
}

export function formatOptionDisplay(question: DiagnosticQuestion, value: string): string {
  if (question.type === 'mcq' && question.options) {
    const match = question.options.find((opt) => opt.id === value);
    if (match) return match.label;
  }
  return value;
}

export function evaluateDiagnosticAttempt(params: {
  attemptId: string;
  userId: string;
  selfEstimatedLevel: SelfEstimatedLevel;
  answers: DiagnosticUserAnswer[];
  completedAt?: string;
}): {
  profile: EvidenceStartingProfile;
  mistakes: MistakeMemoryItem[];
} {
  const completedAt = params.completedAt ?? new Date().toISOString();
  const answerMap = new Map<string, string>();
  for (const ans of params.answers) {
    answerMap.set(ans.questionId, ans.userResponse);
  }

  const evaluatedItems: EvaluatedDiagnosticItem[] = DIAGNOSTIC_QUESTIONS.map((q) => {
    const rawUserResponse = answerMap.get(q.id) ?? '';
    const isCorrect = isDiagnosticAnswerCorrect(q, rawUserResponse);

    return {
      questionId: q.id,
      domain: q.domain,
      userResponse: formatOptionDisplay(q, rawUserResponse),
      correctAnswer: formatOptionDisplay(q, q.correctAnswer),
      isCorrect,
      mistakeCategory: q.mistakeCategory,
      mistakePatternEn: q.mistakePatternEn,
      mistakePatternBn: q.mistakePatternBn,
      explanationEn: q.explanationEn,
      explanationBn: q.explanationBn,
    };
  });

  const totalQuestions = evaluatedItems.length;
  const totalCorrect = evaluatedItems.filter((item) => item.isCorrect).length;
  const accuracyPercent = Math.round((totalCorrect / totalQuestions) * 100);

  const domains: DiagnosticSkillDomain[] = [
    'vocabulary',
    'grammar',
    'sentence_construction',
    'reading',
  ];

  const domainBreakdown: DomainBreakdown[] = domains.map((domain) => {
    const domainItems = evaluatedItems.filter((item) => item.domain === domain);
    const correct = domainItems.filter((item) => item.isCorrect).length;
    const total = domainItems.length;
    return {
      domain,
      correct,
      total,
      accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  });

  // Honest starting band — explicitly conservative and never a certified CEFR score.
  let observedBandRank = 1;
  let estimatedStartingBand = 'Foundational Start (Pre-A1–A1 range)';
  let estimatedStartingBandBn = 'ভিত্তিমূলক শুরু (Pre-A1–A1 পরিসর)';
  let recommendedTrackEn = 'Core Sentence Structure & High-Frequency Spoken Patterns';
  let recommendedTrackBn = 'মৌলিক বাক্য গঠন ও দৈনন্দিন কথোপকথনের ভিত্তি';

  if (totalCorrect <= 1) {
    observedBandRank = 0;
    estimatedStartingBand = 'Foundational Start (Pre-A1–A1 range)';
    estimatedStartingBandBn = 'ভিত্তিমূলক শুরু (Pre-A1–A1 পরিসর)';
    recommendedTrackEn = 'Core Sentence Order, Everyday Verbs & Guided Bangla-Supported Drills';
    recommendedTrackBn = 'মৌলিক বাক্য ক্রম, দৈনন্দিন ক্রিয়া ও বাংলা-সহায়ক অনুশীলন';
  } else if (totalCorrect === 2 || totalCorrect === 3) {
    observedBandRank = 2;
    estimatedStartingBand = 'Developing Communicator (A2–B1 range)';
    estimatedStartingBandBn = 'বিকাশমান যোগাযোগকারী (A2–B1 পরিসর)';
    recommendedTrackEn = 'Bangla-to-English Interference Repair & Guided Speaking Transfers';
    recommendedTrackBn = 'বাংলা-প্রভাবিত ভুল সংশোধন ও নির্দেশিত কথোপকথন অনুশীলন';
  } else if (totalCorrect === 4) {
    observedBandRank = 3;
    estimatedStartingBand = 'Functional Communicator (B1–B2 range)';
    estimatedStartingBandBn = 'কার্যকর যোগাযোগকারী (B1–B2 পরিসর)';
    recommendedTrackEn = 'Precision Collocations, Natural Phrasing & Timed Speaking Pressure';
    recommendedTrackBn = 'স্বাভাবিক শব্দচয়ন, সাবলীল প্রকাশভঙ্গি ও সময়বদ্ধ বলার অনুশীলন';
  } else {
    observedBandRank = 4;
    estimatedStartingBand = 'Strong Baseline (B2+ initial sample)';
    estimatedStartingBandBn = 'শক্তিশালী প্রাথমিক ভিত্তি (B2+ প্রাথমিক নমুনা)';
    recommendedTrackEn = 'Unscripted Spoken Fluency, Nuance & High-Pressure Transfer Tasks';
    recommendedTrackBn = 'তাৎক্ষণিক সাবলীলতা, সূক্ষ্ম প্রকাশভঙ্গি ও চাপের মধ্যে কথোপকথন';
  }

  const selfRank = SELF_LEVEL_RANK[params.selfEstimatedLevel];
  let calibrationNoteEn: string;
  let calibrationNoteBn: string;

  if (Math.abs(selfRank - observedBandRank) <= 1) {
    calibrationNoteEn = `Your 5-item diagnostic aligns closely with your self-estimate (${params.selfEstimatedLevel}). Speaking tasks will verify active spoken accuracy next.`;
    calibrationNoteBn = `আপনার ৫-প্রশ্নের ডায়াগনস্টিক ফলাফল আপনার নিজের মূল্যায়নের (${params.selfEstimatedLevel}) সাথে সামঞ্জস্যপূর্ণ। পরবর্তী ধাপে বাস্তব কথা বলার মাধ্যমে এটি আরও নির্ভুল হবে।`;
  } else if (selfRank > observedBandRank) {
    calibrationNoteEn = `You self-estimated ${params.selfEstimatedLevel}, while this 5-item sample surfaced specific Bangla-to-English transfer gaps. We will prioritize fixing those recurring patterns first.`;
    calibrationNoteBn = `আপনি নিজের স্তর ${params.selfEstimatedLevel} হিসেবে নির্বাচন করেছেন, তবে এই ৫-প্রশ্নের নমুনায় বাংলা-থেকে-ইংরেজি অনুবাদের কিছু নির্দিষ্ট ভুল ধরা পড়েছে। আমরা আগে সেগুলো সংশোধনে গুরুত্ব দেব।`;
  } else {
    calibrationNoteEn = `You outperformed your self-estimate (${params.selfEstimatedLevel}) on written items. We will check whether this accuracy holds during live spoken responses.`;
    calibrationNoteBn = `আপনি আপনার নিজের মূল্যায়নের (${params.selfEstimatedLevel}) চেয়ে লিখিত প্রশ্নে ভালো করেছেন। বাস্তব কথা বলার সময়ও এই নির্ভুলতা বজায় থাকে কিনা তা পরবর্তীতে যাচাই করা হবে।`;
  }

  // Coverage is strictly bounded to 20% for a 5-question written diagnostic (no voice evidence yet).
  const confidenceCoveragePercent = 20;

  const profile: EvidenceStartingProfile = {
    attemptId: params.attemptId,
    userId: params.userId,
    completedAt,
    totalCorrect,
    totalQuestions,
    accuracyPercent,
    estimatedStartingBand,
    estimatedStartingBandBn,
    recommendedTrackEn,
    recommendedTrackBn,
    selfEstimatedLevel: params.selfEstimatedLevel,
    calibrationNoteEn,
    calibrationNoteBn,
    confidenceCoveragePercent,
    confidenceLabelEn:
      'Initial Written Sample Only (20% coverage · Not a certified CEFR score)',
    confidenceLabelBn:
      'শুধুমাত্র প্রাথমিক লিখিত নমুনা (২০% কভারেজ · এটি কোনো সনদপ্রাপ্ত CEFR স্কোর নয়)',
    isCertifiedCefr: false,
    domainBreakdown,
    items: evaluatedItems,
  };

  const mistakes: MistakeMemoryItem[] = evaluatedItems
    .filter((item) => !item.isCorrect)
    .map((item) => ({
      id: `mm_${params.attemptId}_${item.questionId}`,
      userId: params.userId,
      source: 'diagnostic',
      domain: item.domain,
      category: item.mistakeCategory,
      userExample: item.userResponse || '(No response)',
      correctedExample: item.correctAnswer,
      patternEn: item.mistakePatternEn,
      patternBn: item.mistakePatternBn,
      explanationEn: item.explanationEn,
      explanationBn: item.explanationBn,
      occurrences: 1,
      status: 'active',
      createdAt: completedAt,
    }));

  return { profile, mistakes };
}
