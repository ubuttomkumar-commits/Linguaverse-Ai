import type {
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LessonAttemptRecord,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  SpeakingSessionRecord,
} from '../types/domain';
import { classifyMistakeCategory } from './mistakeMemoryEngine';

export type CommunicationDnaDimensionId =
  | 'grammar_accuracy'
  | 'vocabulary_range'
  | 'sentence_complexity'
  | 'speaking_task_completion'
  | 'listening_reading_comprehension';

export type DataCoverageTier = 'insufficient_data' | 'low_confidence' | 'verified';

export interface CommunicationDnaDimension {
  id: CommunicationDnaDimensionId;
  titleEn: string;
  titleBn: string;
  /** Strictly null whenever sampleSize < 3 — NEVER fabricated */
  scorePercent: number | null;
  sampleSize: number;
  minSamplesRequired: 3;
  coverage: DataCoverageTier;
  coverageLabelEn: string;
  coverageLabelBn: string;
  sampleBreakdownEn: string;
  sampleBreakdownBn: string;
  lastUpdatedAt: string | null;
  evidenceNoteEn: string;
  evidenceNoteBn: string;
}

export interface CommunicationDnaProfile {
  dimensions: CommunicationDnaDimension[];
  measuredCount: number;
  totalDimensions: 5;
  lastUpdatedAt: string | null;
}

export interface CommunicationDnaInput {
  latestDiagnostic: EvidenceStartingProfile | null;
  exerciseAttempts: ExerciseAttemptRecord[];
  lessonAttempts: LessonAttemptRecord[];
  speakingSessions: SpeakingSessionRecord[];
  mistakes: MistakeMemoryItem[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
}

function getCoverageTier(sampleSize: number): {
  coverage: DataCoverageTier;
  labelEn: string;
  labelBn: string;
} {
  if (sampleSize < 3) {
    return {
      coverage: 'insufficient_data',
      labelEn: 'Insufficient Data',
      labelBn: 'অপর্যাপ্ত তথ্য',
    };
  }
  if (sampleSize < 8) {
    return {
      coverage: 'low_confidence',
      labelEn: 'Low Confidence',
      labelBn: 'প্রাথমিক আত্মবিশ্বাস',
    };
  }
  return {
    coverage: 'verified',
    labelEn: 'Verified',
    labelBn: 'যাচাইকৃত',
  };
}

function latestTimestamp(timestamps: Array<string | undefined | null>): string | null {
  let maxMs = -1;
  let best: string | null = null;
  for (const ts of timestamps) {
    if (!ts) continue;
    const ms = new Date(ts).getTime();
    if (Number.isFinite(ms) && ms > maxMs) {
      maxMs = ms;
      best = ts;
    }
  }
  return best;
}

function formatBreakdown(partsEn: string[], partsBn: string[]): { en: string; bn: string } {
  if (partsEn.length === 0) {
    return {
      en: '0 observations recorded yet',
      bn: 'এখনো ০টি পর্যবেক্ষণ সংরক্ষিত',
    };
  }
  return {
    en: `Based on ${partsEn.join(' & ')}`,
    bn: `${partsBn.join(' ও ')} এর ভিত্তিতে`,
  };
}

function plural(n: number, singular: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? singular : pluralWord ?? `${singular}s`}`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Computes the 5 separate, honest Communication DNA skill dimensions strictly from
 * persisted user evidence. NEVER collapses dimensions into a single composite score,
 * and strictly returns `scorePercent: null` whenever `sampleSize < 3`.
 */
export function computeCommunicationDna(
  input: CommunicationDnaInput
): CommunicationDnaProfile {
  const {
    latestDiagnostic,
    exerciseAttempts,
    speakingSessions,
    mistakes,
    mistakeDrillAttempts,
  } = input;

  // Exclude learner-reported false AI corrections from negative mistake impact
  const reportedFalseKeys = new Set(
    mistakes
      .filter((m) => m.falseCorrectionReported)
      .map((m) => m.userExample.trim().toLowerCase())
  );

  const allSpeakingTurns = speakingSessions.flatMap((session) =>
    session.turns.map((turn) => ({ session, turn }))
  );

  const diagItems = latestDiagnostic?.items ?? [];

  // -------------------------------------------------------------------------
  // 1. Grammar Accuracy
  // Sources: diagnostic grammar items + grammar/tense/preposition/article exercises
  //          + speaking turns evaluated for grammar mistakes + grammar drill attempts
  // -------------------------------------------------------------------------
  const diagGrammar = diagItems.filter((item) => item.domain === 'grammar');
  const exGrammar = exerciseAttempts.filter((ex) => {
    const cat = classifyMistakeCategory(ex.mistakeCategory);
    return cat === 'verb_tense' || cat === 'prepositions' || cat === 'articles' || cat === 'sentence_structure';
  });
  const drillGrammar = mistakeDrillAttempts.filter((d) => {
    const linked = mistakes.find((m) => m.id === d.mistakeId);
    if (!linked) return false;
    const cat = classifyMistakeCategory(linked.category, linked.domain);
    return cat === 'verb_tense' || cat === 'prepositions' || cat === 'articles';
  });

  const grammarSamples: number[] = [];
  const grammarTimestamps: string[] = [];

  for (const item of diagGrammar) {
    grammarSamples.push(item.isCorrect ? 100 : 0);
    if (latestDiagnostic) grammarTimestamps.push(latestDiagnostic.completedAt);
  }
  for (const ex of exGrammar) {
    grammarSamples.push(ex.isCorrect ? 100 : 0);
    grammarTimestamps.push(ex.timestamp);
  }
  for (const dr of drillGrammar) {
    grammarSamples.push(dr.passed ? 100 : 0);
    grammarTimestamps.push(dr.timestamp);
  }
  for (const { turn } of allSpeakingTurns) {
    const grammarErrors = turn.evaluation.mistakes.filter((m) => {
      if (reportedFalseKeys.has(m.original.trim().toLowerCase())) return false;
      const cat = classifyMistakeCategory(m.category);
      return cat === 'verb_tense' || cat === 'prepositions' || cat === 'articles';
    });
    const turnScore = Math.max(0, 100 - grammarErrors.length * 30);
    grammarSamples.push(turnScore);
    grammarTimestamps.push(turn.createdAt);
  }

  const grammarPartsEn: string[] = [];
  const grammarPartsBn: string[] = [];
  const grammarExCount = diagGrammar.length + exGrammar.length + drillGrammar.length;
  if (grammarExCount > 0) {
    grammarPartsEn.push(plural(grammarExCount, 'exercise'));
    grammarPartsBn.push(`${grammarExCount}টি অনুশীলন`);
  }
  if (allSpeakingTurns.length > 0) {
    grammarPartsEn.push(
      plural(speakingSessions.length, 'speaking session')
    );
    grammarPartsBn.push(`${speakingSessions.length}টি স্পিকিং সেশন`);
  }
  const grammarBreakdown = formatBreakdown(grammarPartsEn, grammarPartsBn);
  const grammarCoverage = getCoverageTier(grammarSamples.length);
  const grammarScore =
    grammarSamples.length >= 3
      ? clampPercent(grammarSamples.reduce((a, b) => a + b, 0) / grammarSamples.length)
      : null;

  // -------------------------------------------------------------------------
  // 2. Vocabulary Range
  // Sources: diagnostic vocabulary items + vocabulary exercises + lexical diversity
  //          of real spoken/written responses (speaking turns + independent exercises)
  // -------------------------------------------------------------------------
  const diagVocab = diagItems.filter((item) => item.domain === 'vocabulary');
  const exVocab = exerciseAttempts.filter(
    (ex) => classifyMistakeCategory(ex.mistakeCategory) === 'vocabulary'
  );
  const vocabSamples: number[] = [];
  const vocabTimestamps: string[] = [];

  for (const item of diagVocab) {
    vocabSamples.push(item.isCorrect ? 100 : 0);
    if (latestDiagnostic) vocabTimestamps.push(latestDiagnostic.completedAt);
  }
  for (const ex of exVocab) {
    vocabSamples.push(ex.isCorrect ? 100 : 0);
    vocabTimestamps.push(ex.timestamp);
  }
  for (const { turn } of allSpeakingTurns) {
    const words = turn.userTranscript
      .toLowerCase()
      .replace(/[^a-z'\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    const uniqueWords = new Set(words);
    const vocabErrors = turn.evaluation.mistakes.filter((m) => {
      if (reportedFalseKeys.has(m.original.trim().toLowerCase())) return false;
      return classifyMistakeCategory(m.category) === 'vocabulary';
    }).length;
    const richnessBase = words.length > 0 ? Math.min(100, Math.round((uniqueWords.size / Math.max(words.length, 6)) * 100)) : 50;
    const adjusted = Math.max(0, Math.min(100, richnessBase + Math.min(20, uniqueWords.size * 2) - vocabErrors * 25));
    vocabSamples.push(adjusted);
    vocabTimestamps.push(turn.createdAt);
  }

  const vocabPartsEn: string[] = [];
  const vocabPartsBn: string[] = [];
  const vocabExCount = diagVocab.length + exVocab.length;
  if (vocabExCount > 0) {
    vocabPartsEn.push(plural(vocabExCount, 'vocabulary item'));
    vocabPartsBn.push(`${vocabExCount}টি শব্দভাণ্ডার প্রশ্ন`);
  }
  if (allSpeakingTurns.length > 0) {
    vocabPartsEn.push(plural(allSpeakingTurns.length, 'speaking turn'));
    vocabPartsBn.push(`${allSpeakingTurns.length}টি স্পিকিং ধাপ`);
  }
  const vocabBreakdown = formatBreakdown(vocabPartsEn, vocabPartsBn);
  const vocabCoverage = getCoverageTier(vocabSamples.length);
  const vocabScore =
    vocabSamples.length >= 3
      ? clampPercent(vocabSamples.reduce((a, b) => a + b, 0) / vocabSamples.length)
      : null;

  // -------------------------------------------------------------------------
  // 3. Sentence Complexity
  // Sources: sentence_construction diagnostic items + independent/reorder/construct exercises
  //          + speaking turn clause/word-order performance
  // -------------------------------------------------------------------------
  const diagSentence = diagItems.filter((item) => item.domain === 'sentence_construction');
  const exSentence = exerciseAttempts.filter(
    (ex) =>
      ex.stage === 'independent' ||
      ex.exerciseType === 'reorder' ||
      ex.exerciseType === 'construct' ||
      classifyMistakeCategory(ex.mistakeCategory) === 'word_order'
  );
  const sentenceSamples: number[] = [];
  const sentenceTimestamps: string[] = [];

  for (const item of diagSentence) {
    sentenceSamples.push(item.isCorrect ? 100 : 0);
    if (latestDiagnostic) sentenceTimestamps.push(latestDiagnostic.completedAt);
  }
  for (const ex of exSentence) {
    sentenceSamples.push(ex.isCorrect ? 100 : 0);
    sentenceTimestamps.push(ex.timestamp);
  }
  for (const { turn } of allSpeakingTurns) {
    const words = turn.userTranscript.trim().split(/\s+/).filter(Boolean);
    const hasConnector = /\b(because|although|while|when|which|that|however|so|and|but|if|since)\b/i.test(
      turn.userTranscript
    );
    const structureErrors = turn.evaluation.mistakes.filter((m) => {
      if (reportedFalseKeys.has(m.original.trim().toLowerCase())) return false;
      const cat = classifyMistakeCategory(m.category);
      return cat === 'word_order' || cat === 'sentence_structure';
    }).length;
    const lengthScore = Math.min(75, words.length * 6);
    const connectorBonus = hasConnector ? 25 : 0;
    const turnScore = Math.max(0, Math.min(100, lengthScore + connectorBonus - structureErrors * 25));
    sentenceSamples.push(turnScore);
    sentenceTimestamps.push(turn.createdAt);
  }

  const sentencePartsEn: string[] = [];
  const sentencePartsBn: string[] = [];
  const sentenceExCount = diagSentence.length + exSentence.length;
  if (sentenceExCount > 0) {
    sentencePartsEn.push(plural(sentenceExCount, 'sentence exercise'));
    sentencePartsBn.push(`${sentenceExCount}টি বাক্য-গঠন অনুশীলন`);
  }
  if (allSpeakingTurns.length > 0) {
    sentencePartsEn.push(plural(allSpeakingTurns.length, 'speaking turn'));
    sentencePartsBn.push(`${allSpeakingTurns.length}টি স্পিকিং ধাপ`);
  }
  const sentenceBreakdown = formatBreakdown(sentencePartsEn, sentencePartsBn);
  const sentenceCoverage = getCoverageTier(sentenceSamples.length);
  const sentenceScore =
    sentenceSamples.length >= 3
      ? clampPercent(sentenceSamples.reduce((a, b) => a + b, 0) / sentenceSamples.length)
      : null;

  // -------------------------------------------------------------------------
  // 4. Speaking Task Completion
  // Sources: ONLY genuine Speaking Studio turns (completed responses, timing adherence,
  //          and meaningful task fulfillment — never inferred from written exercises!)
  // -------------------------------------------------------------------------
  const speakingSamples: number[] = [];
  const speakingTimestamps: string[] = [];

  for (const { turn } of allSpeakingTurns) {
    const wordCount = turn.userTranscript.trim().split(/\s+/).filter(Boolean).length;
    const hasPositiveElements = turn.evaluation.correct_elements.length > 0;
    let turnScore = 60;
    if (wordCount >= 8) turnScore += 20;
    else if (wordCount >= 4) turnScore += 10;
    if (hasPositiveElements) turnScore += 15;
    if (turn.inputChannel === 'voice_stt' || turn.inputChannel === 'voice_with_manual_edit') {
      turnScore += 5;
    }
    if (turn.timedOut) turnScore -= 15;
    speakingSamples.push(clampPercent(turnScore));
    speakingTimestamps.push(turn.createdAt);
  }

  const speakingPartsEn: string[] = [];
  const speakingPartsBn: string[] = [];
  if (allSpeakingTurns.length > 0) {
    speakingPartsEn.push(plural(allSpeakingTurns.length, 'speaking turn'));
    speakingPartsEn.push(plural(speakingSessions.length, 'session'));
    speakingPartsBn.push(`${allSpeakingTurns.length}টি স্পিকিং ধাপ`);
    speakingPartsBn.push(`${speakingSessions.length}টি সেশন`);
  }
  const speakingBreakdown = formatBreakdown(speakingPartsEn, speakingPartsBn);
  const speakingCoverage = getCoverageTier(speakingSamples.length);
  const speakingScore =
    speakingSamples.length >= 3
      ? clampPercent(speakingSamples.reduce((a, b) => a + b, 0) / speakingSamples.length)
      : null;

  // -------------------------------------------------------------------------
  // 5. Listening / Reading Comprehension
  // Sources: diagnostic reading items + Academy guided/assessment comprehension items
  // -------------------------------------------------------------------------
  const diagReading = diagItems.filter((item) => item.domain === 'reading');
  const exReading = exerciseAttempts.filter(
    (ex) =>
      ex.exerciseType === 'mcq' ||
      ex.exerciseType === 'error_spot' ||
      ex.mistakeCategory.toLowerCase() === 'reading'
  );
  const compSamples: number[] = [];
  const compTimestamps: string[] = [];

  for (const item of diagReading) {
    compSamples.push(item.isCorrect ? 100 : 0);
    if (latestDiagnostic) compTimestamps.push(latestDiagnostic.completedAt);
  }
  for (const ex of exReading) {
    compSamples.push(ex.isCorrect ? 100 : 0);
    compTimestamps.push(ex.timestamp);
  }

  const compPartsEn: string[] = [];
  const compPartsBn: string[] = [];
  if (diagReading.length > 0) {
    compPartsEn.push(plural(diagReading.length, 'diagnostic reading item'));
    compPartsBn.push(`${diagReading.length}টি ডায়াগনস্টিক রিডিং প্রশ্ন`);
  }
  if (exReading.length > 0) {
    compPartsEn.push(plural(exReading.length, 'comprehension check'));
    compPartsBn.push(`${exReading.length}টি বোধগম্যতা যাচাই`);
  }
  const compBreakdown = formatBreakdown(compPartsEn, compPartsBn);
  const compCoverage = getCoverageTier(compSamples.length);
  const compScore =
    compSamples.length >= 3
      ? clampPercent(compSamples.reduce((a, b) => a + b, 0) / compSamples.length)
      : null;

  const dimensions: CommunicationDnaDimension[] = [
    {
      id: 'grammar_accuracy',
      titleEn: 'Grammar Accuracy',
      titleBn: 'ব্যাকরণ নির্ভুলতা',
      scorePercent: grammarScore,
      sampleSize: grammarSamples.length,
      minSamplesRequired: 3,
      coverage: grammarCoverage.coverage,
      coverageLabelEn: grammarCoverage.labelEn,
      coverageLabelBn: grammarCoverage.labelBn,
      sampleBreakdownEn: grammarBreakdown.en,
      sampleBreakdownBn: grammarBreakdown.bn,
      lastUpdatedAt: latestTimestamp(grammarTimestamps),
      evidenceNoteEn:
        grammarSamples.length < 3
          ? `Complete ${3 - grammarSamples.length} more grammar exercise(s) or speaking turn(s) to unlock a measured score.`
          : 'Measured from verified grammar exercises, targeted mistake drills, and Speaking Studio turns.',
      evidenceNoteBn:
        grammarSamples.length < 3
          ? `পরিমাপকৃত স্কোর দেখতে আরও ${3 - grammarSamples.length}টি ব্যাকরণ অনুশীলন বা স্পিকিং ধাপ সম্পন্ন করুন।`
          : 'ব্যাকরণ অনুশীলন, মিস্টেক ড্রিল এবং স্পিকিং স্টুডিওর বাস্তব প্রমাণের ভিত্তিতে পরিমাপকৃত।',
    },
    {
      id: 'vocabulary_range',
      titleEn: 'Vocabulary Range',
      titleBn: 'শব্দভাণ্ডারের বিস্তৃতি',
      scorePercent: vocabScore,
      sampleSize: vocabSamples.length,
      minSamplesRequired: 3,
      coverage: vocabCoverage.coverage,
      coverageLabelEn: vocabCoverage.labelEn,
      coverageLabelBn: vocabCoverage.labelBn,
      sampleBreakdownEn: vocabBreakdown.en,
      sampleBreakdownBn: vocabBreakdown.bn,
      lastUpdatedAt: latestTimestamp(vocabTimestamps),
      evidenceNoteEn:
        vocabSamples.length < 3
          ? `Complete ${3 - vocabSamples.length} more vocabulary item(s) or speaking turn(s) to unlock a measured score.`
          : 'Measured from lexical accuracy items and distinct word usage across spoken/typed responses.',
      evidenceNoteBn:
        vocabSamples.length < 3
          ? `পরিমাপকৃত স্কোর দেখতে আরও ${3 - vocabSamples.length}টি শব্দভাণ্ডার প্রশ্ন বা স্পিকিং ধাপ সম্পন্ন করুন।`
          : 'সঠিক শব্দচয়ন ও কথোপকথনে ব্যবহৃত স্বতন্ত্র শব্দের বৈচিত্র্যের ভিত্তিতে পরিমাপকৃত।',
    },
    {
      id: 'sentence_complexity',
      titleEn: 'Sentence Complexity',
      titleBn: 'বাক্যের গঠন ও জটিলতা',
      scorePercent: sentenceScore,
      sampleSize: sentenceSamples.length,
      minSamplesRequired: 3,
      coverage: sentenceCoverage.coverage,
      coverageLabelEn: sentenceCoverage.labelEn,
      coverageLabelBn: sentenceCoverage.labelBn,
      sampleBreakdownEn: sentenceBreakdown.en,
      sampleBreakdownBn: sentenceBreakdown.bn,
      lastUpdatedAt: latestTimestamp(sentenceTimestamps),
      evidenceNoteEn:
        sentenceSamples.length < 3
          ? `Complete ${3 - sentenceSamples.length} more sentence construction task(s) or speaking turn(s) to unlock.`
          : 'Measured from word-order exercises, independent sentence writing, and multi-clause speaking turns.',
      evidenceNoteBn:
        sentenceSamples.length < 3
          ? `স্কোর আনলক করতে আরও ${3 - sentenceSamples.length}টি বাক্য গঠন অনুশীলন বা স্পিকিং ধাপ সম্পন্ন করুন।`
          : 'বাক্যের শব্দক্রম, স্বাধীন বাক্য রচনা এবং সংযুক্ত বাক্য গঠনের ভিত্তিতে পরিমাপকৃত।',
    },
    {
      id: 'speaking_task_completion',
      titleEn: 'Speaking Task Completion',
      titleBn: 'কথোপকথন দক্ষতা',
      scorePercent: speakingScore,
      sampleSize: speakingSamples.length,
      minSamplesRequired: 3,
      coverage: speakingCoverage.coverage,
      coverageLabelEn: speakingCoverage.labelEn,
      coverageLabelBn: speakingCoverage.labelBn,
      sampleBreakdownEn: speakingBreakdown.en,
      sampleBreakdownBn: speakingBreakdown.bn,
      lastUpdatedAt: latestTimestamp(speakingTimestamps),
      evidenceNoteEn:
        speakingSamples.length < 3
          ? `Complete ${3 - speakingSamples.length} more Speaking Studio turn(s) — written lessons never fake speaking scores.`
          : 'Measured strictly from Speaking Studio conversation turns, task fulfillment, and response pacing.',
      evidenceNoteBn:
        speakingSamples.length < 3
          ? `আরও ${3 - speakingSamples.length}টি স্পিকিং স্টুডিও ধাপ সম্পন্ন করুন — লিখিত লেসন থেকে কখনো ভুয়া স্পিকিং স্কোর দেখানো হয় না।`
          : 'শুধুমাত্র স্পিকিং স্টুডিওর বাস্তব কথোপকথন ও সময়ের মধ্যে উত্তর প্রদানের ভিত্তিতে পরিমাপকৃত।',
    },
    {
      id: 'listening_reading_comprehension',
      titleEn: 'Listening / Reading Comprehension',
      titleBn: 'শোনা ও পড়ার বোধগম্যতা',
      scorePercent: compScore,
      sampleSize: compSamples.length,
      minSamplesRequired: 3,
      coverage: compCoverage.coverage,
      coverageLabelEn: compCoverage.labelEn,
      coverageLabelBn: compCoverage.labelBn,
      sampleBreakdownEn: compBreakdown.en,
      sampleBreakdownBn: compBreakdown.bn,
      lastUpdatedAt: latestTimestamp(compTimestamps),
      evidenceNoteEn:
        compSamples.length < 3
          ? `Complete ${3 - compSamples.length} more reading or comprehension check(s) in Diagnostic or Academy.`
          : 'Measured from reading passages, error spotting, and Academy comprehension checks.',
      evidenceNoteBn:
        compSamples.length < 3
          ? `পরিমাপকৃত স্কোর দেখতে ডায়াগনস্টিক বা একাডেমিতে আরও ${3 - compSamples.length}টি বোধগম্যতা প্রশ্ন সম্পন্ন করুন।`
          : 'রিডিং প্যাসেজ, ভুল শনাক্তকরণ এবং একাডেমি মূল্যায়নের ভিত্তিতে পরিমাপকৃত।',
    },
  ];

  const measuredCount = dimensions.filter((d) => d.scorePercent !== null).length;

  return {
    dimensions,
    measuredCount,
    totalDimensions: 5,
    lastUpdatedAt: latestTimestamp(dimensions.map((d) => d.lastUpdatedAt)),
  };
}
