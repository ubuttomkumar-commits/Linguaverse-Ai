import {
  getPressureLevelConfig,
  getSpeakingScenario,
} from './speakingScenarios';
import { isVerifiedMistakeForMemory } from './speakingStudioEngine';
import { getTransferUniverseScenario } from './transferLabUniverseEngine';
import { TRANSFER_SCENARIOS } from './transferLabEngine';
import type {
  MistakeMemoryItem,
  ReplayAnalysisSnapshot,
  ReplayAudioStatus,
  ReplayCloudSyncContract,
  ReplayComparisonItem,
  ReplayDimensionSnapshot,
  ReplayDnaEvidenceContribution,
  ReplayMistakeEvent,
  ReplayPracticeAttemptRecord,
  ReplayReviewStatus,
  ReplaySessionReviewRecord,
  ReplaySourceType,
  ReplayTranscriptTurn,
  SpeakingInputChannel,
  SpeakingSessionRecord,
  TransferAttemptRecord,
  UnifiedReplaySession,
} from '../types/domain';

export const REPLAY_CLOUD_SYNC_CONTRACT: ReplayCloudSyncContract = {
  deploymentStatus: 'not_deployed_local_only',
  plannedEndpoints: {
    listSessions: '/api/v1/replay/sessions',
    updateReviewState: '/api/v1/replay/sessions/:sessionId/review',
    getSignedAudioUrl: '/api/v1/replay/audio/:audioKey',
    deleteRecording: '/api/v1/replay/sessions/:sessionId/recording',
  },
  plannedTables: [
    'speaking_sessions',
    'transfer_attempts',
    'replay_session_reviews',
    'replay_practice_attempts',
    'audio_assets',
  ],
  plannedObjectStore: 'cloudflare_r2_private_audio_bucket',
};

export const REPLAY_AUDIO_UNAVAILABLE_MESSAGE_EN =
  'Audio recording is not available for this session. You can still review the saved conversation transcript.';
export const REPLAY_AUDIO_UNAVAILABLE_MESSAGE_BN =
  'এই সেশনের জন্য অডিও রেকর্ডিং উপলব্ধ নেই। তবে আপনি সংরক্ষিত কথোপকথনের ট্রান্সক্রিপ্ট পর্যালোচনা করতে পারবেন।';

const NON_ACOUSTIC_DISCLOSURE_EN =
  'Transcript-only evaluation: acoustic pronunciation, accent, and phoneme accuracy are not scored because no server-side acoustic pronunciation engine is active.';
const NON_ACOUSTIC_DISCLOSURE_BN =
  'শুধুমাত্র ট্রান্সক্রিপ্টভিত্তিক মূল্যায়ন: কোনো অ্যাকোস্টিক উচ্চারণ ইঞ্জিন সক্রিয় না থাকায় উচ্চারণ বা অ্যাক্সেন্টের নম্বর তৈরি করা হয় না।';

export interface ReplayAuthorizationResult {
  authorized: boolean;
  reason?: 'missing_user' | 'missing_owner' | 'owner_mismatch';
}

export function authorizeReplaySessionAccess(
  sessionUserId: string | null | undefined,
  currentUserId: string | null | undefined
): ReplayAuthorizationResult {
  const cleanCurrent = (currentUserId ?? '').trim();
  const cleanOwner = (sessionUserId ?? '').trim();
  if (!cleanCurrent) {
    return { authorized: false, reason: 'missing_user' };
  }
  if (!cleanOwner) {
    return { authorized: false, reason: 'missing_owner' };
  }
  if (cleanOwner !== cleanCurrent) {
    return { authorized: false, reason: 'owner_mismatch' };
  }
  return { authorized: true };
}

/**
 * Verifies that an IndexedDB audio blob key belongs strictly to the authenticated learner
 * and matches the owned session. Prevents cross-user audio lookup.
 */
export function isAuthorizedAudioBlobKey(
  blobKey: string | null | undefined,
  currentUserId: string | null | undefined,
  sessionUserId: string | null | undefined
): boolean {
  const auth = authorizeReplaySessionAccess(sessionUserId, currentUserId);
  if (!auth.authorized) return false;
  const key = (blobKey ?? '').trim();
  if (!key) return false;
  const expectedPrefix = `audio_${currentUserId!.trim()}_`;
  return key.startsWith(expectedPrefix);
}

export function resolveAudioAvailability(params: {
  audioBlobKey?: string;
  blobExists: boolean;
  currentUserId: string | null | undefined;
  sessionUserId: string | null | undefined;
  inputChannel?: SpeakingInputChannel;
}): ReplayAudioStatus {
  const { audioBlobKey, blobExists, currentUserId, sessionUserId, inputChannel } = params;
  const cleanKey = (audioBlobKey ?? '').trim();
  if (!cleanKey) {
    return inputChannel === 'text_fallback' || !inputChannel ? 'text_only' : 'missing_recording';
  }
  if (!isAuthorizedAudioBlobKey(cleanKey, currentUserId, sessionUserId)) {
    return 'unauthorized';
  }
  return blobExists ? 'available' : 'missing_recording';
}

/**
 * Computes real normalized RMS waveform peaks strictly from decoded PCM audio samples.
 * Returns empty array if no real audio samples exist (never fabricates fake peaks).
 */
export function computeWaveformPeaksFromChannelData(
  channelData: Float32Array | number[],
  barCount = 64
): number[] {
  const totalSamples = channelData.length;
  if (totalSamples === 0 || barCount <= 0) return [];
  const safeBars = Math.min(Math.max(8, Math.round(barCount)), 128);
  const blockSize = Math.max(1, Math.floor(totalSamples / safeBars));
  const rawPeaks: number[] = [];

  for (let i = 0; i < safeBars; i += 1) {
    const start = i * blockSize;
    if (start >= totalSamples) {
      rawPeaks.push(0);
      continue;
    }
    const end = i === safeBars - 1 ? totalSamples : Math.min(totalSamples, start + blockSize);
    let sumSq = 0;
    let count = 0;
    for (let j = start; j < end; j += 1) {
      const sample = channelData[j] ?? 0;
      sumSq += sample * sample;
      count += 1;
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    rawPeaks.push(rms);
  }

  const maxPeak = Math.max(...rawPeaks, 0);
  if (maxPeak <= 0.0001) {
    return rawPeaks.map(() => 0.08);
  }
  return rawPeaks.map((v) => Math.max(0.08, Math.min(1, Number((v / maxPeak).toFixed(3)))));
}

function isValidIsoTimestamp(value: string | undefined): boolean {
  if (!value || !value.trim()) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

function normalizePhrase(input: string | undefined | null): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatFallbackScenarioTitle(scenarioId: string): string {
  return scenarioId
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCategoryLabel(rawCategory: string | undefined, fallback: string): string {
  const clean = (rawCategory ?? '').trim();
  if (!clean) return fallback;
  return clean
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function findMatchingMemoryItem(
  mistakes: MistakeMemoryItem[],
  userId: string,
  original: string,
  corrected: string,
  sessionId?: string
): MistakeMemoryItem | undefined {
  const normOrig = normalizePhrase(original);
  const normCorr = normalizePhrase(corrected);
  const owned = mistakes.filter((m) => m.userId === userId);

  if (sessionId) {
    const exactSessionMatch = owned.find(
      (m) =>
        m.speakingSessionId === sessionId &&
        (normalizePhrase(m.userExample) === normOrig ||
          normalizePhrase(m.correctedExample) === normCorr)
    );
    if (exactSessionMatch) return exactSessionMatch;
  }

  return owned.find(
    (m) =>
      (normOrig.length > 0 && normalizePhrase(m.userExample) === normOrig) ||
      (normCorr.length > 0 && normalizePhrase(m.correctedExample) === normCorr)
  );
}

function buildSpeakingReplaySession(
  session: SpeakingSessionRecord,
  userId: string,
  mistakes: MistakeMemoryItem[],
  reviewRecord?: ReplaySessionReviewRecord
): UnifiedReplaySession {
  const scenario = getSpeakingScenario(session.modeId);
  const pressure = getPressureLevelConfig(session.pressureLevel);
  const rawTurns = Array.isArray(session.turns) ? session.turns : [];

  const replayTurns: ReplayTranscriptTurn[] = [];
  const replayMistakes: ReplayMistakeEvent[] = [];
  const comparisons: ReplayComparisonItem[] = [];
  const strengthsSet = new Set<string>();
  const pronunciationNotes: string[] = [];
  const authorizedAudioKeys: string[] = [];

  let turnSeq = 0;
  let hasAnyEvaluation = false;

  for (const turn of rawTurns) {
    const promptText = (turn.promptShown ?? '').trim();
    const turnTs = turn.createdAt || '';
    const hasTs = isValidIsoTimestamp(turnTs);

    if (promptText) {
      turnSeq += 1;
      replayTurns.push({
        id: `${turn.id}_prompt`,
        turnIndex: turnSeq,
        speaker: 'ai',
        speakerLabelEn: 'AI Coach',
        speakerLabelBn: 'AI কোচ',
        text: promptText,
        timestamp: hasTs ? turnTs : '',
        hasValidTimestamp: hasTs,
        hasAuthorizedAudioKey: false,
        mistakeCount: 0,
      });
    }

    const evaluation = turn.evaluation;
    if (evaluation && (evaluation.ai_reply || evaluation.corrected_transcript)) {
      hasAnyEvaluation = true;
    }

    const turnMistakes = Array.isArray(evaluation?.mistakes) ? evaluation.mistakes : [];
    const learnerText = (turn.userTranscript ?? '').trim();
    const audioAuthorized = isAuthorizedAudioBlobKey(turn.audioBlobKey, userId, session.userId);
    if (audioAuthorized && turn.audioBlobKey) {
      authorizedAudioKeys.push(turn.audioBlobKey);
    }

    turnSeq += 1;
    const learnerTurnId = `${turn.id}_learner`;
    replayTurns.push({
      id: learnerTurnId,
      turnIndex: turnSeq,
      speaker: 'learner',
      speakerLabelEn: 'You (Learner)',
      speakerLabelBn: 'আপনি (শিক্ষার্থী)',
      text: learnerText,
      timestamp: hasTs ? turnTs : '',
      hasValidTimestamp: hasTs,
      inputChannel: turn.inputChannel,
      audioBlobKey: turn.audioBlobKey,
      audioDurationSeconds: turn.audioDurationSeconds,
      hasAuthorizedAudioKey: audioAuthorized,
      correctedText: evaluation?.corrected_transcript?.trim() || undefined,
      naturalAlternative: evaluation?.natural_alternative?.trim() || undefined,
      mistakeCount: turnMistakes.length,
    });

    if (learnerText && evaluation?.corrected_transcript?.trim()) {
      const corrected = evaluation.corrected_transcript.trim();
      const primaryMistake = turnMistakes[0];
      comparisons.push({
        id: `cmp_${turn.id}`,
        turnIndex: turnSeq,
        turnId: learnerTurnId,
        original: learnerText,
        corrected,
        naturalAlternative: evaluation.natural_alternative?.trim() || undefined,
        explanationEn: primaryMistake?.explanation_en,
        explanationBn: primaryMistake?.explanation_bn,
        hasChanges: normalizePhrase(learnerText) !== normalizePhrase(corrected),
        mistakeCategories: Array.from(new Set(turnMistakes.map((m) => m.category).filter(Boolean))),
      });
    }

    turnMistakes.forEach((m, idx) => {
      const memoryItem = findMatchingMemoryItem(
        mistakes,
        userId,
        m.original,
        m.corrected,
        session.id
      );
      const synced = Boolean(memoryItem) || isVerifiedMistakeForMemory(m);
      replayMistakes.push({
        id: `rm_${turn.id}_${idx}`,
        turnId: learnerTurnId,
        turnIndex: turnSeq,
        category: m.category || 'Grammar',
        detectionSourceEn: 'Part 08 Speaking Studio AI',
        detectionSourceBn: 'পার্ট ০৮ স্পিকিং স্টুডিও AI',
        original: m.original,
        corrected: m.corrected,
        explanationEn: m.explanation_en,
        explanationBn: m.explanation_bn,
        severity: m.severity || 'medium',
        confidence: typeof m.confidence === 'number' ? m.confidence : 0.75,
        syncedToMemory: synced,
        memoryItemId: memoryItem?.id,
        memoryStatus: memoryItem?.status,
        memoryOccurrences: memoryItem?.occurrences,
        practiceLink: memoryItem ? `/app/improve?focus=${encodeURIComponent(memoryItem.id)}` : '/app/improve',
      });
    });

    if (Array.isArray(evaluation?.correct_elements)) {
      for (const s of evaluation.correct_elements) {
        if (s && s.trim()) strengthsSet.add(s.trim());
      }
    }

    if (evaluation?.pronunciation_note && evaluation.pronunciation_note.trim()) {
      pronunciationNotes.push(evaluation.pronunciation_note.trim());
    }

    const aiReply = (evaluation?.ai_reply ?? '').trim();
    if (aiReply) {
      turnSeq += 1;
      replayTurns.push({
        id: `${turn.id}_ai_reply`,
        turnIndex: turnSeq,
        speaker: 'ai',
        speakerLabelEn: 'AI Coach',
        speakerLabelBn: 'AI কোচ',
        text: aiReply,
        hintBn: evaluation?.ai_reply_bn_hint?.trim() || undefined,
        timestamp: hasTs ? turnTs : '',
        hasValidTimestamp: hasTs,
        hasAuthorizedAudioKey: false,
        mistakeCount: 0,
      });
    }
  }

  const learnerTurns = replayTurns.filter((t) => t.speaker === 'learner');
  const aiTurns = replayTurns.filter((t) => t.speaker === 'ai');
  const hasTranscript = replayTurns.some((t) => t.text.trim().length > 0);

  const primaryChannel: SpeakingInputChannel =
    rawTurns.find((t) => t.inputChannel === 'voice_stt')?.inputChannel ??
    rawTurns.find((t) => t.inputChannel === 'voice_with_manual_edit')?.inputChannel ??
    rawTurns[0]?.inputChannel ??
    'text_fallback';

  const analysis: ReplayAnalysisSnapshot = hasAnyEvaluation
    ? {
        hasEvaluation: true,
        evaluationType: 'speaking_turns',
        methodologyVersion: 'speaking-studio-turn-eval-v1',
        overallScore: null,
        passed: null,
        summaryEn:
          replayMistakes.length === 0
            ? `Completed ${learnerTurns.length} speaking turn${learnerTurns.length === 1 ? '' : 's'} with 0 detected grammar/phrasing mistakes.`
            : `Completed ${learnerTurns.length} speaking turn${learnerTurns.length === 1 ? '' : 's'} with ${replayMistakes.length} detected improvement point${replayMistakes.length === 1 ? '' : 's'}.`,
        summaryBn:
          replayMistakes.length === 0
            ? `${learnerTurns.length}টি স্পিকিং ধাপ সম্পন্ন হয়েছে এবং কোনো ভুল শনাক্ত হয়নি।`
            : `${learnerTurns.length}টি স্পিকিং ধাপ সম্পন্ন হয়েছে এবং ${replayMistakes.length}টি সংশোধনযোগ্য বিষয় শনাক্ত হয়েছে।`,
        strengths: Array.from(strengthsSet),
        dimensions: [],
        objectives: [],
        pronunciationNotes: Array.from(new Set(pronunciationNotes)),
        nonAcousticDisclosureEn: NON_ACOUSTIC_DISCLOSURE_EN,
        nonAcousticDisclosureBn: NON_ACOUSTIC_DISCLOSURE_BN,
      }
    : {
        hasEvaluation: false,
        evaluationType: 'missing',
        methodologyVersion: 'none',
        overallScore: null,
        passed: null,
        summaryEn: 'No saved AI evaluation was recorded for this Speaking Studio session.',
        summaryBn: 'এই স্পিকিং সেশনের জন্য কোনো সংরক্ষিত AI মূল্যায়ন পাওয়া যায়নি।',
        strengths: [],
        dimensions: [],
        objectives: [],
        pronunciationNotes: [],
        nonAcousticDisclosureEn: NON_ACOUSTIC_DISCLOSURE_EN,
        nonAcousticDisclosureBn: NON_ACOUSTIC_DISCLOSURE_BN,
      };

  const audioKeyCount = rawTurns.filter((t) => Boolean(t.audioBlobKey?.trim())).length;

  return {
    id: session.id,
    userId: session.userId,
    source: 'speaking_studio',
    sourceId: session.modeId,
    titleEn: scenario.titleEn,
    titleBn: scenario.titleBn,
    subtitleEn: scenario.subtitleEn,
    subtitleBn: scenario.subtitleBn,
    targetLanguage: 'English',
    scenarioCategory: formatCategoryLabel(session.modeId, 'AI Conversation'),
    categoryLabelEn: 'AI Conversation',
    categoryLabelBn: 'AI কনভারসেশন',
    pressureLabelEn: pressure.titleEn,
    pressureLabelBn: pressure.titleBn,
    startedAt: session.startedAt,
    completedAt: session.updatedAt || session.startedAt,
    durationSeconds: Math.max(0, Math.round(session.durationSeconds || 0)),
    inputChannel: primaryChannel,
    hasTranscript,
    transcriptGapReasonEn: hasTranscript
      ? undefined
      : 'Transcript content is missing for this saved speaking session.',
    transcriptGapReasonBn: hasTranscript
      ? undefined
      : 'এই সংরক্ষিত স্পিকিং সেশনের ট্রান্সক্রিপ্ট পাওয়া যায়নি।',
    turns: replayTurns,
    learnerTurnCount: learnerTurns.length,
    aiTurnCount: aiTurns.length,
    mistakes: replayMistakes,
    comparisons,
    analysis,
    audioKeyCount,
    authorizedAudioKeys,
    reviewStatus: reviewRecord?.status ?? 'unreviewed',
    startedReviewAt: reviewRecord?.startedReviewAt,
    reviewedAt: reviewRecord?.reviewedAt,
    lastReviewedTurnId: reviewRecord?.lastReviewedTurnId,
    reviewedComparisonIds: reviewRecord?.reviewedComparisonIds ?? [],
    learnerNote: reviewRecord?.learnerNote,
    retryRoute: `/app/speak?mode=${encodeURIComponent(session.modeId)}`,
    retryLabelEn: 'Retry Speaking Mode',
    retryLabelBn: 'এই স্পিকিং মোডে আবার অনুশীলন করুন',
  };
}

function buildTransferReplaySession(
  attempt: TransferAttemptRecord,
  userId: string,
  mistakes: MistakeMemoryItem[],
  reviewRecord?: ReplaySessionReviewRecord
): UnifiedReplaySession {
  const universeScenario = getTransferUniverseScenario(attempt.scenarioId);
  const legacyScenario = !universeScenario
    ? TRANSFER_SCENARIOS.find((s) => s.id === attempt.scenarioId)
    : undefined;
  const pressure = getPressureLevelConfig(attempt.pressureLevel);

  const fallbackTitle = formatFallbackScenarioTitle(attempt.scenarioId);
  const titleEn = universeScenario?.titleEn ?? legacyScenario?.titleEn ?? fallbackTitle;
  const titleBn = universeScenario?.titleBn ?? legacyScenario?.titleBn ?? fallbackTitle;
  const subtitleEn =
    universeScenario?.descriptionEn ??
    legacyScenario?.briefEn ??
    attempt.targetSkillLabelEn ??
    'Real-world transfer simulation';
  const subtitleBn =
    universeScenario?.descriptionBn ??
    legacyScenario?.briefBn ??
    attempt.targetSkillLabelBn ??
    'বাস্তব যোগাযোগ অনুশীলন';
  const aiRoleLabelEn = universeScenario?.aiParticipantName ?? 'AI Scenario Partner';
  const aiRoleLabelBn = universeScenario?.aiParticipantName ?? 'AI সিনারিও পার্টনার';
  const scenarioCategory = formatCategoryLabel(
    universeScenario?.category,
    'Transfer Simulation'
  );

  const replayTurns: ReplayTranscriptTurn[] = [];
  const authorizedAudioKeys: string[] = [];
  let audioKeyCount = 0;
  let transcriptGapReasonEn: string | undefined;
  let transcriptGapReasonBn: string | undefined;

  const rawTranscript = Array.isArray(attempt.transcript) ? attempt.transcript : [];
  if (rawTranscript.length > 0) {
    rawTranscript.forEach((turn, idx) => {
      const hasAudioKey = Boolean(turn.audioBlobKey?.trim());
      if (hasAudioKey) audioKeyCount += 1;
      const authorizedKey = isAuthorizedAudioBlobKey(turn.audioBlobKey, userId, attempt.userId);
      if (authorizedKey && turn.audioBlobKey) {
        authorizedAudioKeys.push(turn.audioBlobKey);
      }
      const turnTs = turn.timestamp || '';
      const hasTs = isValidIsoTimestamp(turnTs);

      replayTurns.push({
        id: turn.id || `${attempt.id}_t_${idx + 1}`,
        turnIndex: idx + 1,
        speaker: turn.role === 'learner' ? 'learner' : 'ai',
        speakerLabelEn: turn.role === 'learner' ? 'You (Learner)' : aiRoleLabelEn,
        speakerLabelBn: turn.role === 'learner' ? 'আপনি (শিক্ষার্থী)' : aiRoleLabelBn,
        text: (turn.text ?? '').trim(),
        hintBn: turn.hintBn?.trim() || undefined,
        timestamp: hasTs ? turnTs : '',
        hasValidTimestamp: hasTs,
        inputChannel: turn.role === 'learner' ? turn.inputChannel ?? attempt.inputChannel : undefined,
        audioBlobKey: turn.audioBlobKey,
        audioDurationSeconds: turn.audioDurationSeconds,
        hasAuthorizedAudioKey: authorizedKey,
        mistakeCount: 0,
        coachNudgeEn: turn.coachNudgeEn,
        coachNudgeBn: turn.coachNudgeBn,
      });
    });
  } else if ((attempt.userResponse ?? '').trim().length > 0) {
    // Legacy Phase 5 single-response transfer attempt (no fabricated per-turn timestamps)
    transcriptGapReasonEn =
      'Recorded as a single-response Transfer Lab challenge (full multi-turn conversation transcript and turn-level timestamps were not captured in that mode).';
    transcriptGapReasonBn =
      'এটি একটি একক-উত্তর ট্রান্সফার ল্যাব চ্যালেঞ্জ হিসেবে সংরক্ষিত হয়েছিল (মাল্টি-টার্ন সংলাপ ও ধাপভিত্তিক সময়চিহ্ন ছিল না)।';
    let idx = 0;
    const opener = universeScenario?.openingMessageEn ?? legacyScenario?.openingPromptEn;
    if (opener) {
      idx += 1;
      replayTurns.push({
        id: `${attempt.id}_opener`,
        turnIndex: idx,
        speaker: 'ai',
        speakerLabelEn: aiRoleLabelEn,
        speakerLabelBn: aiRoleLabelBn,
        text: opener,
        timestamp: '',
        hasValidTimestamp: false,
        hasAuthorizedAudioKey: false,
        mistakeCount: 0,
      });
    }
    idx += 1;
    replayTurns.push({
      id: `${attempt.id}_response`,
      turnIndex: idx,
      speaker: 'learner',
      speakerLabelEn: 'You (Learner)',
      speakerLabelBn: 'আপনি (শিক্ষার্থী)',
      text: attempt.userResponse.trim(),
      timestamp: '',
      hasValidTimestamp: false,
      inputChannel: attempt.inputChannel,
      hasAuthorizedAudioKey: false,
      mistakeCount: 0,
    });
    if (attempt.twistPromptShown?.trim()) {
      idx += 1;
      replayTurns.push({
        id: `${attempt.id}_twist_prompt`,
        turnIndex: idx,
        speaker: 'ai',
        speakerLabelEn: aiRoleLabelEn,
        speakerLabelBn: aiRoleLabelBn,
        text: attempt.twistPromptShown.trim(),
        timestamp: '',
        hasValidTimestamp: false,
        hasAuthorizedAudioKey: false,
        mistakeCount: 0,
      });
    }
    if (attempt.twistResponse?.trim()) {
      idx += 1;
      replayTurns.push({
        id: `${attempt.id}_twist_reply`,
        turnIndex: idx,
        speaker: 'learner',
        speakerLabelEn: 'You (Learner)',
        speakerLabelBn: 'আপনি (শিক্ষার্থী)',
        text: attempt.twistResponse.trim(),
        timestamp: '',
        hasValidTimestamp: false,
        inputChannel: attempt.inputChannel,
        hasAuthorizedAudioKey: false,
        mistakeCount: 0,
      });
    }
  } else {
    transcriptGapReasonEn = 'Transcript content is missing for this saved Transfer Lab session.';
    transcriptGapReasonBn = 'এই সংরক্ষিত ট্রান্সফার ল্যাব সেশনের ট্রান্সক্রিপ্ট পাওয়া যায়নি।';
  }

  const evaluation = attempt.evaluation;
  const part11 = evaluation?.part11Report;
  const rawMistakes = Array.isArray(part11?.detectedMistakes)
    ? part11.detectedMistakes
    : Array.isArray(evaluation?.detected_mistakes)
      ? evaluation.detected_mistakes
      : [];

  const learnerTurns = replayTurns.filter((t) => t.speaker === 'learner');
  const aiTurns = replayTurns.filter((t) => t.speaker === 'ai');

  const detectionSourceEn = part11
    ? 'Part 11 Transfer Lab 8D Evaluation'
    : 'Transfer Lab Rubric Evaluation';
  const detectionSourceBn = part11
    ? 'পার্ট ১১ ট্রান্সফার ল্যাব ৮D মূল্যায়ন'
    : 'ট্রান্সফার ল্যাব রুব্রিক মূল্যায়ন';

  const replayMistakes: ReplayMistakeEvent[] = rawMistakes.map((m, idx) => {
    const normOrig = normalizePhrase(m.original);
    const matchedTurn =
      learnerTurns.find((t) => normOrig.length > 2 && normalizePhrase(t.text).includes(normOrig)) ??
      learnerTurns[0];

    if (matchedTurn) {
      matchedTurn.mistakeCount += 1;
    }

    const memoryItem = findMatchingMemoryItem(mistakes, userId, m.original, m.corrected);
    const synced = Boolean(memoryItem) || isVerifiedMistakeForMemory(m);

    return {
      id: `tm_${attempt.id}_${idx}`,
      turnId: matchedTurn?.id,
      turnIndex: matchedTurn?.turnIndex,
      category: m.category || 'Grammar',
      detectionSourceEn,
      detectionSourceBn,
      original: m.original,
      corrected: m.corrected,
      explanationEn: m.explanation_en,
      explanationBn: m.explanation_bn,
      severity: m.severity || 'medium',
      confidence: typeof m.confidence === 'number' ? m.confidence : 0.75,
      syncedToMemory: synced,
      memoryItemId: memoryItem?.id,
      memoryStatus: memoryItem?.status,
      memoryOccurrences: memoryItem?.occurrences,
      practiceLink: memoryItem ? `/app/improve?focus=${encodeURIComponent(memoryItem.id)}` : '/app/improve',
    };
  });

  // Build Original vs. Corrected comparison items strictly from real mistakes + model response
  const comparisons: ReplayComparisonItem[] = [];
  const modelResponse = (
    part11?.naturalModelResponse ||
    evaluation?.natural_model_response ||
    ''
  ).trim();

  if (replayMistakes.length > 0) {
    replayMistakes.forEach((m, idx) => {
      comparisons.push({
        id: `tcmp_${attempt.id}_${idx}`,
        turnIndex: m.turnIndex ?? idx + 1,
        turnId: m.turnId ?? `${attempt.id}_turn_${idx + 1}`,
        original: m.original,
        corrected: m.corrected,
        naturalAlternative: idx === 0 && modelResponse ? modelResponse : undefined,
        explanationEn: m.explanationEn,
        explanationBn: m.explanationBn,
        hasChanges: normalizePhrase(m.original) !== normalizePhrase(m.corrected),
        mistakeCategories: [m.category],
      });
    });
  } else if (learnerTurns.length > 0 && modelResponse) {
    const primaryLearnerTurn = learnerTurns[learnerTurns.length - 1];
    comparisons.push({
      id: `tcmp_${attempt.id}_model`,
      turnIndex: primaryLearnerTurn.turnIndex,
      turnId: primaryLearnerTurn.id,
      original: primaryLearnerTurn.text,
      corrected: primaryLearnerTurn.text,
      naturalAlternative: modelResponse,
      hasChanges: false,
      mistakeCategories: [],
    });
  }

  let analysis: ReplayAnalysisSnapshot;
  if (part11) {
    const dimensions: ReplayDimensionSnapshot[] = (part11.dimensions ?? []).map((d) => ({
      key: d.dimension,
      labelEn: d.labelEn,
      labelBn: d.labelBn,
      evaluated: d.evaluated,
      score: d.evaluated ? d.score : null,
      verdict: d.verdict,
      evidence: d.evidenceFromConversation || d.supportingLearnerResponse || undefined,
      explanationEn: d.explanationEn || undefined,
      explanationBn: d.explanationBn || undefined,
      methodologyEn: 'Part 11 8-Dimension Transcript Rubric (Historical Assessment)',
      limitationsEn: d.limitationsNoteEn || 'Transcript-based rubric; no acoustic pronunciation measurement.',
      limitationsBn: d.limitationsNoteBn || undefined,
    }));

    analysis = {
      hasEvaluation: true,
      evaluationType: 'transfer_8d',
      methodologyVersion: 'transfer-lab-8d-v1',
      overallScore:
        typeof part11.overallScore === 'number'
          ? part11.overallScore
          : typeof evaluation?.overall_score === 'number'
            ? evaluation.overall_score
            : null,
      passed: typeof part11.passed === 'boolean' ? part11.passed : Boolean(attempt.passed),
      taskOutcomeStatus: part11.taskOutcomeStatus,
      summaryEn: part11.coachSummaryEn || evaluation?.coach_summary_en || '',
      summaryBn: part11.coachSummaryBn || evaluation?.coach_summary_bn || '',
      taskVsLanguageEn: part11.taskVsLanguageDistinctionEn || undefined,
      taskVsLanguageBn: part11.taskVsLanguageDistinctionBn || undefined,
      strengths: Array.isArray(part11.strengths) ? part11.strengths : [],
      dimensions,
      objectives: Array.isArray(part11.objectives) ? part11.objectives : [],
      pronunciationNotes: [],
      nonAcousticDisclosureEn: NON_ACOUSTIC_DISCLOSURE_EN,
      nonAcousticDisclosureBn: NON_ACOUSTIC_DISCLOSURE_BN,
      nextRecommendedActionEn: part11.nextRecommendedActionEn || undefined,
      nextRecommendedActionBn: part11.nextRecommendedActionBn || undefined,
    };
  } else if (evaluation && typeof evaluation.overall_score === 'number') {
    const rubricDimensions: ReplayDimensionSnapshot[] = [];
    if (evaluation.task_completion) {
      rubricDimensions.push({
        key: 'task_completion',
        labelEn: 'Task Completion',
        labelBn: 'কাজ সম্পন্নতা',
        evaluated: true,
        score: evaluation.task_completion.score,
        explanationEn: evaluation.task_completion.feedbackEn,
        explanationBn: evaluation.task_completion.feedbackBn,
        methodologyEn: 'Transfer Lab 4-Rubric Assessment (Historical)',
        limitationsEn: 'Single-response text/transcript evaluation only.',
      });
    }
    if (evaluation.target_grammar_application) {
      rubricDimensions.push({
        key: 'target_grammar_application',
        labelEn: 'Target Grammar Application',
        labelBn: 'লক্ষ্য ব্যাকরণ প্রয়োগ',
        evaluated: true,
        score: evaluation.target_grammar_application.score,
        explanationEn: evaluation.target_grammar_application.feedbackEn,
        explanationBn: evaluation.target_grammar_application.feedbackBn,
        methodologyEn: 'Transfer Lab 4-Rubric Assessment (Historical)',
        limitationsEn: 'Evaluates written/transcribed grammar only.',
      });
    }
    if (evaluation.contextual_appropriateness) {
      rubricDimensions.push({
        key: 'contextual_appropriateness',
        labelEn: 'Contextual Appropriateness',
        labelBn: 'প্রাসঙ্গিক উপযোগিতা',
        evaluated: true,
        score: evaluation.contextual_appropriateness.score,
        explanationEn: evaluation.contextual_appropriateness.feedbackEn,
        explanationBn: evaluation.contextual_appropriateness.feedbackBn,
        methodologyEn: 'Transfer Lab 4-Rubric Assessment (Historical)',
        limitationsEn: 'Assessed against scenario prompt register.',
      });
    }
    if (evaluation.response_relevance) {
      rubricDimensions.push({
        key: 'response_relevance',
        labelEn: 'Response Relevance',
        labelBn: 'উত্তরের প্রাসঙ্গিকতা',
        evaluated: true,
        score: evaluation.response_relevance.score,
        explanationEn: evaluation.response_relevance.feedbackEn,
        explanationBn: evaluation.response_relevance.feedbackBn,
        methodologyEn: 'Transfer Lab 4-Rubric Assessment (Historical)',
        limitationsEn: 'Evaluates topical alignment in transcript.',
      });
    }

    analysis = {
      hasEvaluation: true,
      evaluationType: 'transfer_4rubric',
      methodologyVersion: 'transfer-lab-4rubric-v1',
      overallScore: evaluation.overall_score,
      passed: Boolean(attempt.passed),
      summaryEn: evaluation.coach_summary_en || '',
      summaryBn: evaluation.coach_summary_bn || '',
      strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
      dimensions: rubricDimensions,
      objectives: [],
      pronunciationNotes: [],
      nonAcousticDisclosureEn: NON_ACOUSTIC_DISCLOSURE_EN,
      nonAcousticDisclosureBn: NON_ACOUSTIC_DISCLOSURE_BN,
    };
  } else {
    analysis = {
      hasEvaluation: false,
      evaluationType: 'missing',
      methodologyVersion: 'none',
      overallScore: null,
      passed: null,
      summaryEn: 'No saved evaluation report was found for this Transfer Lab session.',
      summaryBn: 'এই ট্রান্সফার ল্যাব সেশনের জন্য কোনো সংরক্ষিত মূল্যায়ন রিপোর্ট পাওয়া যায়নি।',
      strengths: [],
      dimensions: [],
      objectives: [],
      pronunciationNotes: [],
      nonAcousticDisclosureEn: NON_ACOUSTIC_DISCLOSURE_EN,
      nonAcousticDisclosureBn: NON_ACOUSTIC_DISCLOSURE_BN,
    };
  }

  const hasTranscript = replayTurns.some((t) => t.text.trim().length > 0);

  return {
    id: attempt.id,
    userId: attempt.userId,
    source: 'transfer_lab',
    sourceId: attempt.scenarioId,
    titleEn,
    titleBn,
    subtitleEn,
    subtitleBn,
    targetLanguage: 'English',
    scenarioCategory,
    categoryLabelEn: 'Transfer Lab',
    categoryLabelBn: 'ট্রান্সফার ল্যাব',
    pressureLabelEn: pressure.titleEn,
    pressureLabelBn: pressure.titleBn,
    startedAt: rawTranscript[0]?.timestamp || attempt.completedAt,
    completedAt: attempt.completedAt,
    durationSeconds: Math.max(0, Math.round(attempt.durationSeconds || 0)),
    inputChannel: attempt.inputChannel || 'text_fallback',
    hasTranscript,
    transcriptGapReasonEn,
    transcriptGapReasonBn,
    turns: replayTurns,
    learnerTurnCount: learnerTurns.length,
    aiTurnCount: aiTurns.length,
    mistakes: replayMistakes,
    comparisons,
    analysis,
    audioKeyCount,
    authorizedAudioKeys,
    reviewStatus: reviewRecord?.status ?? 'unreviewed',
    startedReviewAt: reviewRecord?.startedReviewAt,
    reviewedAt: reviewRecord?.reviewedAt,
    lastReviewedTurnId: reviewRecord?.lastReviewedTurnId,
    reviewedComparisonIds: reviewRecord?.reviewedComparisonIds ?? [],
    learnerNote: reviewRecord?.learnerNote,
    retryRoute: `/app/transfer-lab?scenario=${encodeURIComponent(attempt.scenarioId)}`,
    retryLabelEn: 'Retry Scenario in Transfer Lab',
    retryLabelBn: 'ট্রান্সফার ল্যাবে সিনারিওটি আবার করুন',
  };
}

export function buildUnifiedReplaySessions(params: {
  userId: string | null | undefined;
  speakingSessions: SpeakingSessionRecord[];
  transferAttempts: TransferAttemptRecord[];
  mistakes: MistakeMemoryItem[];
  reviewRecords: Record<string, ReplaySessionReviewRecord>;
}): UnifiedReplaySession[] {
  const cleanUserId = (params.userId ?? '').trim();
  if (!cleanUserId) return [];

  const unified: UnifiedReplaySession[] = [];

  for (const s of params.speakingSessions ?? []) {
    if (!authorizeReplaySessionAccess(s.userId, cleanUserId).authorized) continue;
    unified.push(
      buildSpeakingReplaySession(s, cleanUserId, params.mistakes ?? [], params.reviewRecords[s.id])
    );
  }

  for (const t of params.transferAttempts ?? []) {
    if (!authorizeReplaySessionAccess(t.userId, cleanUserId).authorized) continue;
    unified.push(
      buildTransferReplaySession(t, cleanUserId, params.mistakes ?? [], params.reviewRecords[t.id])
    );
  }

  return unified.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
}

export type ReplayDateRangeFilter = 'all' | '7d' | '30d' | '90d';

export interface ReplayLibraryFilterState {
  search: string;
  source: 'all' | ReplaySourceType;
  dateRange: ReplayDateRangeFilter;
  scenarioCategory: string;
  reviewStatus: 'all' | ReplayReviewStatus;
  audioFilter: 'all' | 'has_audio_metadata' | 'text_only';
  transcriptFilter: 'all' | 'has_transcript' | 'missing_transcript';
  evaluationFilter: 'all' | 'evaluated' | 'not_evaluated';
  sortBy: 'newest' | 'oldest' | 'recently_reviewed' | 'most_mistakes' | 'highest_score';
}

export const DEFAULT_REPLAY_FILTERS: ReplayLibraryFilterState = {
  search: '',
  source: 'all',
  dateRange: 'all',
  scenarioCategory: 'all',
  reviewStatus: 'all',
  audioFilter: 'all',
  transcriptFilter: 'all',
  evaluationFilter: 'all',
  sortBy: 'newest',
};

export function extractReplayScenarioCategories(sessions: UnifiedReplaySession[]): string[] {
  return Array.from(new Set(sessions.map((s) => s.scenarioCategory).filter(Boolean))).sort();
}

export function filterReplaySessions(
  sessions: UnifiedReplaySession[],
  filters: ReplayLibraryFilterState,
  nowMs = Date.now()
): UnifiedReplaySession[] {
  const q = filters.search.trim().toLowerCase();
  const rangeDays =
    filters.dateRange === '7d'
      ? 7
      : filters.dateRange === '30d'
        ? 30
        : filters.dateRange === '90d'
          ? 90
          : null;
  const cutoffMs = rangeDays !== null ? nowMs - rangeDays * 24 * 60 * 60 * 1000 : null;

  const filtered = sessions.filter((s) => {
    if (filters.source !== 'all' && s.source !== filters.source) return false;
    if (filters.reviewStatus !== 'all' && s.reviewStatus !== filters.reviewStatus) return false;
    if (filters.scenarioCategory !== 'all' && s.scenarioCategory !== filters.scenarioCategory) {
      return false;
    }
    if (filters.audioFilter === 'has_audio_metadata' && s.audioKeyCount === 0) return false;
    if (filters.audioFilter === 'text_only' && s.audioKeyCount > 0) return false;
    if (filters.transcriptFilter === 'has_transcript' && !s.hasTranscript) return false;
    if (filters.transcriptFilter === 'missing_transcript' && s.hasTranscript) return false;
    if (filters.evaluationFilter === 'evaluated' && !s.analysis.hasEvaluation) return false;
    if (filters.evaluationFilter === 'not_evaluated' && s.analysis.hasEvaluation) return false;

    if (cutoffMs !== null) {
      const ts = Date.parse(s.completedAt);
      if (Number.isFinite(ts) && ts < cutoffMs) return false;
    }

    if (q) {
      const haystack = [
        s.titleEn,
        s.titleBn,
        s.subtitleEn,
        s.subtitleBn,
        s.scenarioCategory,
        s.categoryLabelEn,
        s.learnerNote ?? '',
        ...s.turns.map((t) => t.text),
        ...s.mistakes.map((m) => `${m.category} ${m.original} ${m.corrected}`),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sortBy === 'oldest') {
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
    }
    if (filters.sortBy === 'recently_reviewed') {
      const revA = a.reviewedAt ? Date.parse(a.reviewedAt) : -1;
      const revB = b.reviewedAt ? Date.parse(b.reviewedAt) : -1;
      return (
        revB - revA ||
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    }
    if (filters.sortBy === 'most_mistakes') {
      return (
        b.mistakes.length - a.mistakes.length ||
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    }
    if (filters.sortBy === 'highest_score') {
      const scoreA = a.analysis.overallScore ?? -1;
      const scoreB = b.analysis.overallScore ?? -1;
      return (
        scoreB - scoreA ||
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    }
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });
}

export function paginateReplaySessions(
  sessions: UnifiedReplaySession[],
  page: number,
  pageSize = 8
): {
  items: UnifiedReplaySession[];
  page: number;
  totalPages: number;
  hasMore: boolean;
} {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(sessions.length / safePageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const items = sessions.slice(0, safePage * safePageSize);
  return {
    items,
    page: safePage,
    totalPages,
    hasMore: items.length < sessions.length,
  };
}

export function filterReplayTurnsBySpeaker(
  turns: ReplayTranscriptTurn[],
  speakerFilter: 'all' | 'learner' | 'ai'
): ReplayTranscriptTurn[] {
  if (speakerFilter === 'all') return turns;
  return turns.filter((t) => t.speaker === speakerFilter);
}

/**
 * Selects a real recommended session to review (never fabricates sessions).
 * Priority: unreviewed/in-review session with detected mistakes -> most recent unreviewed -> most recent session.
 */
export function selectRecommendedReplaySession(
  sessions: UnifiedReplaySession[]
): {
  session: UnifiedReplaySession;
  reasonEn: string;
  reasonBn: string;
} | null {
  if (sessions.length === 0) return null;

  const unreviewedWithMistakes = sessions.find(
    (s) => s.reviewStatus !== 'reviewed' && s.mistakes.length > 0
  );
  if (unreviewedWithMistakes) {
    return {
      session: unreviewedWithMistakes,
      reasonEn: `${unreviewedWithMistakes.mistakes.length} detected mistake${unreviewedWithMistakes.mistakes.length === 1 ? '' : 's'} waiting for review`,
      reasonBn: `${unreviewedWithMistakes.mistakes.length}টি শনাক্তকৃত ভুল পর্যালোচনার অপেক্ষায় রয়েছে`,
    };
  }

  const nextUnreviewed = sessions.find((s) => s.reviewStatus !== 'reviewed');
  if (nextUnreviewed) {
    return {
      session: nextUnreviewed,
      reasonEn: 'Most recent unreviewed communication session',
      reasonBn: 'সবচেয়ে সাম্প্রতিক অপর্যালোচিত যোগাযোগ সেশন',
    };
  }

  const latest = sessions[0];
  return {
    session: latest,
    reasonEn: 'Latest saved session available for revisit or retry practice',
    reasonBn: 'পুনরায় দেখা ও অনুশীলনের জন্য সর্বশেষ সংরক্ষিত সেশন',
  };
}

/**
 * Traces which Part 10 Communication DNA dimensions received real evidence from this session.
 * Enforces strict boundaries: never claims Pronunciation from text-only records or Listening without listening tasks.
 */
export function buildReplayDnaEvidenceTrace(
  session: UnifiedReplaySession
): ReplayDnaEvidenceContribution[] {
  const sourceLabelEn =
    session.source === 'transfer_lab' ? 'Part 11 Transfer Lab' : 'Part 08 Speaking Studio';
  const version = session.analysis.methodologyVersion;
  const assessedAt = session.analysis.hasEvaluation ? session.completedAt : undefined;
  const hasEval = session.analysis.hasEvaluation;

  return [
    {
      dnaDimensionId: 'grammar',
      labelEn: 'Grammar Application',
      labelBn: 'ব্যাকরণ প্রয়োগ',
      contributed: hasEval,
      reasonEn: hasEval
        ? `Contributed from ${session.learnerTurnCount} learner turn(s) and ${session.mistakes.length} mistake detection record(s).`
        : 'Not contributed — no saved historical evaluation exists for this session.',
      reasonBn: hasEval
        ? `${session.learnerTurnCount}টি উত্তর ও ${session.mistakes.length}টি ভুল শনাক্তকরণ থেকে প্রমাণ যুক্ত হয়েছে।`
        : 'যুক্ত হয়নি — এই সেশনের সংরক্ষিত মূল্যায়ন নেই।',
      sourceLabelEn,
      assessedAt,
      methodologyVersion: version,
    },
    {
      dnaDimensionId: 'vocabulary',
      labelEn: 'Vocabulary & Natural Phrasing',
      labelBn: 'শব্দভাণ্ডার ও স্বাভাবিক প্রকাশ',
      contributed: hasEval,
      reasonEn: hasEval
        ? 'Contributed from saved lexical feedback and natural alternative comparisons.'
        : 'Not contributed — session lacks saved lexical evaluation.',
      reasonBn: hasEval
        ? 'সংরক্ষিত শব্দভাণ্ডার মূল্যায়ন ও স্বাভাবিক বিকল্প বিশ্লেষণ থেকে যুক্ত।'
        : 'যুক্ত হয়নি — শব্দভাণ্ডার মূল্যায়ন সংরক্ষিত নেই।',
      sourceLabelEn,
      assessedAt,
      methodologyVersion: version,
    },
    {
      dnaDimensionId: 'clarity',
      labelEn: 'Communication Clarity & Context',
      labelBn: 'যোগাযোগের স্পষ্টতা ও প্রাসঙ্গিকতা',
      contributed: hasEval,
      reasonEn: hasEval
        ? session.source === 'transfer_lab'
          ? 'Contributed from saved Transfer Lab task completion & contextual appropriateness rubric.'
          : 'Contributed from saved Speaking Studio response clarity evaluation.'
        : 'Not contributed — evaluation missing.',
      reasonBn: hasEval
        ? 'সংরক্ষিত প্রাসঙ্গিকতা ও যোগাযোগ স্পষ্টতা মূল্যায়ন থেকে যুক্ত।'
        : 'যুক্ত হয়নি — মূল্যায়ন অনুপলব্ধ।',
      sourceLabelEn,
      assessedAt,
      methodologyVersion: version,
    },
    {
      dnaDimensionId: 'pronunciation',
      labelEn: 'Acoustic Pronunciation',
      labelBn: 'অ্যাকোস্টিক উচ্চারণ',
      contributed: false,
      reasonEn:
        'Not updated from this replay — transcript-only evaluation never fabricates acoustic or phoneme pronunciation scores.',
      reasonBn:
        'আপডেট করা হয়নি — শুধুমাত্র ট্রান্সক্রিপ্ট থেকে অ্যাকোস্টিক বা ধ্বনিগত উচ্চারণ স্কোর তৈরি করা হয় না।',
      sourceLabelEn,
      methodologyVersion: 'acoustic-engine-unavailable',
    },
    {
      dnaDimensionId: 'listening',
      labelEn: 'Listening Comprehension',
      labelBn: 'শ্রবণ দক্ষতা',
      contributed: false,
      reasonEn:
        'Not updated — no dedicated listening comprehension assessment record was captured in this session.',
      reasonBn: 'আপডেট করা হয়নি — এই সেশনে পৃথক শ্রবণ মূল্যায়ন রেকর্ড করা হয়নি।',
      sourceLabelEn,
      methodologyVersion: 'no-listening-evidence',
    },
  ];
}

export function buildSessionExportPayload(
  session: UnifiedReplaySession,
  practiceAttempts: ReplayPracticeAttemptRecord[]
): Record<string, unknown> {
  return {
    exportVersion: 'linguaverse-replay-export-v1',
    exportedAt: new Date().toISOString(),
    storageScope: 'browser_local_only',
    session: {
      id: session.id,
      source: session.source,
      title: session.titleEn,
      scenarioCategory: session.scenarioCategory,
      targetLanguage: session.targetLanguage,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      durationSeconds: session.durationSeconds,
      reviewStatus: session.reviewStatus,
      reviewedAt: session.reviewedAt ?? null,
      learnerNote: session.learnerNote ?? null,
      transcript: session.turns.map((t) => ({
        turnIndex: t.turnIndex,
        speaker: t.speaker,
        speakerLabel: t.speakerLabelEn,
        text: t.text,
        timestamp: t.hasValidTimestamp ? t.timestamp : null,
        inputChannel: t.inputChannel ?? null,
        hasAudioReference: Boolean(t.audioBlobKey),
      })),
      mistakes: session.mistakes.map((m) => ({
        category: m.category,
        detectionSource: m.detectionSourceEn,
        original: m.original,
        corrected: m.corrected,
        explanationEn: m.explanationEn,
        confidence: m.confidence,
      })),
      historicalAnalysis: {
        hasEvaluation: session.analysis.hasEvaluation,
        evaluationType: session.analysis.evaluationType,
        methodologyVersion: session.analysis.methodologyVersion,
        overallScore: session.analysis.overallScore,
        summaryEn: session.analysis.summaryEn,
      },
    },
    separateReplayPracticeAttempts: practiceAttempts.filter((a) => a.sessionId === session.id),
  };
}

export interface TranscriptSearchResult {
  normalizedQuery: string;
  totalMatches: number;
  matchedTurnIds: string[];
  matchesByTurnId: Record<string, number>;
}

export function searchReplayTranscript(
  turns: ReplayTranscriptTurn[],
  query: string
): TranscriptSearchResult {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      normalizedQuery: '',
      totalMatches: 0,
      matchedTurnIds: [],
      matchesByTurnId: {},
    };
  }

  let totalMatches = 0;
  const matchedTurnIds: string[] = [];
  const matchesByTurnId: Record<string, number> = {};

  for (const turn of turns) {
    const textLower = turn.text.toLowerCase();
    let count = 0;
    let pos = 0;
    while (pos < textLower.length) {
      const idx = textLower.indexOf(normalizedQuery, pos);
      if (idx === -1) break;
      count += 1;
      pos = idx + normalizedQuery.length;
    }
    if (count > 0) {
      matchedTurnIds.push(turn.id);
      matchesByTurnId[turn.id] = count;
      totalMatches += count;
    }
  }

  return {
    normalizedQuery,
    totalMatches,
    matchedTurnIds,
    matchesByTurnId,
  };
}

export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

/**
 * Pure safe text highlighter returning structured segments (never raw HTML).
 */
export function highlightTranscriptSegments(text: string, query: string): HighlightSegment[] {
  const cleanQuery = query.trim();
  if (!cleanQuery || !text) {
    return [{ text, isMatch: false }];
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, cursor);
    if (matchIndex === -1) {
      segments.push({ text: text.slice(cursor), isMatch: false });
      break;
    }
    if (matchIndex > cursor) {
      segments.push({ text: text.slice(cursor, matchIndex), isMatch: false });
    }
    segments.push({
      text: text.slice(matchIndex, matchIndex + cleanQuery.length),
      isMatch: true,
    });
    cursor = matchIndex + cleanQuery.length;
  }

  return segments.length > 0 ? segments : [{ text, isMatch: false }];
}

export interface ReplayLibraryMetrics {
  totalSessions: number;
  speakingCount: number;
  transferCount: number;
  reviewedCount: number;
  inReviewCount: number;
  unreviewedCount: number;
  sessionsWithAudioMetadata: number;
  sessionsWithTranscripts: number;
  sessionsEvaluated: number;
  totalDetectedMistakes: number;
  totalPracticeMinutes: number;
}

export function computeReplayLibraryMetrics(
  sessions: UnifiedReplaySession[]
): ReplayLibraryMetrics {
  let speakingCount = 0;
  let transferCount = 0;
  let reviewedCount = 0;
  let inReviewCount = 0;
  let unreviewedCount = 0;
  let sessionsWithAudioMetadata = 0;
  let sessionsWithTranscripts = 0;
  let sessionsEvaluated = 0;
  let totalDetectedMistakes = 0;
  let totalSeconds = 0;

  for (const s of sessions) {
    if (s.source === 'speaking_studio') speakingCount += 1;
    else transferCount += 1;

    if (s.reviewStatus === 'reviewed') reviewedCount += 1;
    else if (s.reviewStatus === 'in_review') inReviewCount += 1;
    else unreviewedCount += 1;

    if (s.audioKeyCount > 0) sessionsWithAudioMetadata += 1;
    if (s.hasTranscript) sessionsWithTranscripts += 1;
    if (s.analysis.hasEvaluation) sessionsEvaluated += 1;
    totalDetectedMistakes += s.mistakes.length;
    totalSeconds += Math.max(0, s.durationSeconds);
  }

  return {
    totalSessions: sessions.length,
    speakingCount,
    transferCount,
    reviewedCount,
    inReviewCount,
    unreviewedCount,
    sessionsWithAudioMetadata,
    sessionsWithTranscripts,
    sessionsEvaluated,
    totalDetectedMistakes,
    totalPracticeMinutes: Math.round(totalSeconds / 60),
  };
}

export function resolveRequestedReplaySession(params: {
  ownedSessions: UnifiedReplaySession[];
  requestedSessionId: string | null | undefined;
  currentUserId: string | null | undefined;
  allSessionOwnersById?: Record<string, string>;
}): {
  status: 'ok' | 'empty' | 'not_found' | 'unauthorized';
  session: UnifiedReplaySession | null;
} {
  const { ownedSessions, requestedSessionId, currentUserId, allSessionOwnersById } = params;
  const reqId = (requestedSessionId ?? '').trim();

  if (reqId) {
    const ownedMatch = ownedSessions.find((s) => s.id === reqId);
    if (ownedMatch) {
      return { status: 'ok', session: ownedMatch };
    }
    const knownOwner = allSessionOwnersById?.[reqId];
    if (knownOwner && !authorizeReplaySessionAccess(knownOwner, currentUserId).authorized) {
      return { status: 'unauthorized', session: null };
    }
    return { status: 'not_found', session: null };
  }

  if (ownedSessions.length === 0) {
    return { status: 'empty', session: null };
  }

  return { status: 'ok', session: ownedSessions[0] };
}
