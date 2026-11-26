import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeReplaySessionAccess,
  buildReplayDnaEvidenceTrace,
  buildSessionExportPayload,
  buildUnifiedReplaySessions,
  computeReplayLibraryMetrics,
  computeWaveformPeaksFromChannelData,
  DEFAULT_REPLAY_FILTERS,
  extractReplayScenarioCategories,
  filterReplaySessions,
  filterReplayTurnsBySpeaker,
  highlightTranscriptSegments,
  isAuthorizedAudioBlobKey,
  paginateReplaySessions,
  REPLAY_AUDIO_UNAVAILABLE_MESSAGE_EN,
  resolveAudioAvailability,
  resolveRequestedReplaySession,
  searchReplayTranscript,
  selectRecommendedReplaySession,
} from './communicationReplayEngine';
import type {
  MistakeMemoryItem,
  ReplayPracticeAttemptRecord,
  SpeakingSessionRecord,
  TransferAttemptRecord,
} from '../types/domain';

const USER_A = 'user_alpha_01';
const USER_B = 'user_beta_02';

function makeSpeakingSession(overrides: Partial<SpeakingSessionRecord> = {}): SpeakingSessionRecord {
  return {
    id: 'spk_sess_101',
    userId: USER_A,
    modeId: 'daily_conversations',
    pressureLevel: 'level_2_guided',
    startedAt: '2026-11-24T10:00:00.000Z',
    updatedAt: '2026-11-24T10:04:00.000Z',
    durationSeconds: 240,
    totalMistakesDetected: 1,
    turns: [
      {
        id: 'turn_1',
        turnNumber: 1,
        promptShown: 'Tell me about your morning routine.',
        userTranscript: 'Yesterday I go to market and buy fresh mangoes.',
        inputChannel: 'voice_stt',
        audioBlobKey: `audio_${USER_A}_spk_sess_101_turn_1`,
        audioDurationSeconds: 12,
        createdAt: '2026-11-24T10:01:00.000Z',
        evaluation: {
          ai_reply: 'That sounds delicious! Did you visit a local market nearby?',
          ai_reply_bn_hint: 'বাহ, দারুণ! আপনি কি কাছের বাজারে গিয়েছিলেন?',
          corrected_transcript: 'Yesterday I went to the market and bought fresh mangoes.',
          correct_elements: ['Clear time marker "Yesterday"', 'Natural food vocabulary'],
          mistakes: [
            {
              category: 'Verb Tense',
              original: 'Yesterday I go to market',
              corrected: 'Yesterday I went to the market',
              explanation_en: 'Use past simple "went" with "Yesterday".',
              explanation_bn: '"Yesterday" থাকায় অতীত কাল "went" ব্যবহার করতে হবে।',
              confidence: 0.92,
              severity: 'high',
            },
          ],
          natural_alternative: 'I stopped by the market yesterday and picked up some fresh mangoes.',
          pronunciation_note: 'Transcript-only clarity note: clear sentence boundaries.',
        },
      },
    ],
    ...overrides,
  };
}

function makeTransferAttempt(overrides: Partial<TransferAttemptRecord> = {}): TransferAttemptRecord {
  return {
    id: 'trf_att_202',
    userId: USER_A,
    scenarioId: 'restaurant_order_mistake',
    pressureLevel: 'level_3_open',
    targetSkillLabelEn: 'Polite Complaint & Clarification',
    targetSkillLabelBn: 'ভদ্র অভিযোগ ও স্পষ্টীকরণ',
    linkedSourceType: 'mistake_memory',
    userResponse: 'Excuse me, I ordered vegetarian pasta without cheese.',
    inputChannel: 'text_fallback',
    durationSeconds: 185,
    timedOut: false,
    passed: true,
    completedAt: '2026-11-24T12:00:00.000Z',
    transcript: [
      {
        id: 'tr_t1',
        role: 'ai',
        text: 'Welcome back! How is your meal so far?',
        hintBn: 'আপনার খাবার কেমন লাগছে?',
        timestamp: '2026-11-24T11:57:00.000Z',
      },
      {
        id: 'tr_t2',
        role: 'learner',
        text: 'Excuse me, I was order vegetarian pasta without cheese, but this has chicken.',
        timestamp: '2026-11-24T11:58:00.000Z',
        inputChannel: 'text_fallback',
      },
      {
        id: 'tr_t3',
        role: 'ai',
        text: 'I am very sorry about that! I will bring the correct vegetarian dish right away.',
        timestamp: '2026-11-24T11:59:00.000Z',
      },
    ],
    evaluation: {
      task_completion: { score: 88, feedbackEn: 'Explained issue politely.', feedbackBn: 'ভদ্রভাবে সমস্যা বলেছেন।' },
      target_grammar_application: { score: 72, feedbackEn: 'Watch past simple auxiliary.', feedbackBn: 'অতীত কালের ব্যবহার খেয়াল করুন।' },
      contextual_appropriateness: { score: 90, feedbackEn: 'Very polite tone.', feedbackBn: 'খুবই ভদ্র সুর।' },
      response_relevance: { score: 86, feedbackEn: 'Directly addressed waiter.', feedbackBn: 'সরাসরি প্রাসঙ্গিক উত্তর।' },
      overall_score: 84,
      passed: true,
      strengths: ['Polite opener "Excuse me"', 'Clear dietary specification'],
      detected_mistakes: [
        {
          category: 'Verb Tense',
          original: 'I was order vegetarian pasta',
          corrected: 'I ordered vegetarian pasta',
          explanation_en: 'Avoid "was + base verb" for active past actions.',
          explanation_bn: 'অতীতের সক্রিয় কাজের জন্য "was + base verb" নয়, "ordered" বলুন।',
          confidence: 0.91,
          severity: 'high',
        },
      ],
      natural_model_response: 'Excuse me, I actually ordered the vegetarian pasta without cheese.',
      coach_summary_en: 'Polite, effective resolution with one minor tense correction.',
      coach_summary_bn: 'ভদ্রভাবে সমস্যাটি সমাধান করেছেন, শুধু একটি কালগত সংশোধন প্রয়োজন।',
      part11Report: {
        sessionId: 'trf_att_202',
        scenarioId: 'restaurant_order_mistake',
        evaluatedAt: '2026-11-24T12:00:00.000Z',
        taskOutcomeStatus: 'achieved',
        languageCorrectnessNoteEn: 'One past-simple auxiliary error detected.',
        languageCorrectnessNoteBn: 'একটি অতীত কালের ভুল শনাক্ত হয়েছে।',
        taskVsLanguageDistinctionEn: 'You achieved the restaurant goal clearly despite one verb-form slip.',
        taskVsLanguageDistinctionBn: 'একটি ব্যাকরণগত ত্রুটি থাকলেও আপনি রেস্তোরাঁর কাজটি সফলভাবে সম্পন্ন করেছেন।',
        scoringMethodologyEn: 'Weighted evidence-based evaluation.',
        scoringMethodologyBn: 'প্রমাণভিত্তিক মূল্যায়ন।',
        evaluatedDimensionCount: 2,
        overallScore: 84,
        passed: true,
        objectives: [
          {
            objectiveId: 'obj_1',
            labelEn: 'Politely point out the wrong dish',
            labelBn: 'ভদ্রভাবে ভুল খাবারের কথা জানানো',
            criteriaEn: 'State what was ordered vs received politely',
            status: 'achieved',
            evidenceQuote: 'Excuse me, I was order vegetarian pasta without cheese',
          },
        ],
        dimensions: [
          {
            dimension: 'task_completion',
            labelEn: 'Task Completion',
            labelBn: 'কাজ সম্পন্নতা',
            evaluated: true,
            score: 88,
            verdict: 'strong',
            evidenceFromConversation: 'Clarified wrong order politely.',
            supportingLearnerResponse: 'Excuse me, I was order vegetarian pasta without cheese',
            identifiedProblemEn: '',
            identifiedProblemBn: '',
            explanationEn: 'Clearly resolved the mix-up.',
            explanationBn: 'সমস্যাটি স্পষ্টভাবে তুলে ধরেছেন।',
            suggestedCorrection: '',
            betterExample: 'Excuse me, I ordered the vegetarian pasta.',
            confidence: 0.9,
            limitationsNoteEn: 'Transcript-only evaluation.',
            limitationsNoteBn: 'শুধুমাত্র ট্রান্সক্রিপ্টভিত্তিক।',
          },
          {
            dimension: 'problem_solving_communication',
            labelEn: 'Problem Solving',
            labelBn: 'সমস্যা সমাধান',
            evaluated: false,
            score: null,
            verdict: 'not_evaluated',
            evidenceFromConversation: '',
            supportingLearnerResponse: '',
            identifiedProblemEn: '',
            identifiedProblemBn: '',
            explanationEn: 'Insufficient turns to assess follow-up negotiation.',
            explanationBn: 'পর্যাপ্ত ধাপ ছিল না।',
            suggestedCorrection: '',
            betterExample: '',
            confidence: 0,
            limitationsNoteEn: 'Not evaluated due to short conversation.',
            limitationsNoteBn: 'সংক্ষিপ্ত সংলাপের কারণে মূল্যায়ন করা হয়নি।',
          },
        ],
        strengths: ['Polite tone', 'Clear correction request'],
        detectedMistakes: [
          {
            category: 'Verb Tense',
            original: 'I was order vegetarian pasta',
            corrected: 'I ordered vegetarian pasta',
            explanation_en: 'Use simple past "ordered".',
            explanation_bn: '"ordered" ব্যবহার করুন।',
            confidence: 0.91,
            severity: 'high',
          },
        ],
        naturalModelResponse: 'Excuse me, I actually ordered the vegetarian pasta without cheese.',
        coachSummaryEn: 'Effective real-world resolution.',
        coachSummaryBn: 'বাস্তব পরিস্থিতিতে কার্যকর সমাধান।',
        nextRecommendedActionEn: 'Practice past simple verbs in Mistake Memory.',
        nextRecommendedActionBn: 'Mistake Memory-তে অতীত কাল অনুশীলন করুন।',
      },
    },
    ...overrides,
  };
}

const SAMPLE_MISTAKES: MistakeMemoryItem[] = [
  {
    id: 'mm_past_1',
    userId: USER_A,
    source: 'speaking_studio',
    speakingSessionId: 'spk_sess_101',
    domain: 'grammar',
    category: 'Verb Tense',
    userExample: 'Yesterday I go to market',
    correctedExample: 'Yesterday I went to the market',
    patternEn: 'Past simple tense',
    patternBn: 'অতীত কাল',
    explanationEn: 'Use went for past.',
    explanationBn: 'অতীতে went বসবে।',
    occurrences: 3,
    status: 'practicing',
    createdAt: '2026-11-24T10:01:00.000Z',
  },
];

test('1. merges real Part 08 Speaking and Part 11 Transfer sessions into unified speaker-separated replays without mutating inputs', () => {
  const speaking = [makeSpeakingSession()];
  const transfer = [makeTransferAttempt()];
  const snapshotBefore = JSON.stringify({ speaking, transfer, mistakes: SAMPLE_MISTAKES });

  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: speaking,
    transferAttempts: transfer,
    mistakes: SAMPLE_MISTAKES,
    reviewRecords: {
      trf_att_202: {
        sessionId: 'trf_att_202',
        source: 'transfer_lab',
        status: 'reviewed',
        startedReviewAt: '2026-11-24T12:50:00.000Z',
        updatedAt: '2026-11-24T13:00:00.000Z',
        reviewedAt: '2026-11-24T13:00:00.000Z',
        reviewedComparisonIds: ['tcmp_trf_att_202_0'],
        learnerNote: 'Remember to use simple past "ordered".',
      },
    },
  });

  assert.equal(unified.length, 2);
  assert.equal(unified[0].id, 'trf_att_202');
  assert.equal(unified[0].source, 'transfer_lab');
  assert.equal(unified[0].reviewStatus, 'reviewed');
  assert.deepEqual(unified[0].reviewedComparisonIds, ['tcmp_trf_att_202_0']);
  assert.equal(unified[0].analysis.evaluationType, 'transfer_8d');
  assert.equal(unified[0].analysis.overallScore, 84);
  assert.equal(unified[0].analysis.dimensions[1].evaluated, false);
  assert.equal(unified[0].analysis.dimensions[1].score, null);
  assert.equal(unified[0].turns.length, 3);
  assert.equal(unified[0].turns[0].hasValidTimestamp, true);

  assert.equal(unified[1].id, 'spk_sess_101');
  assert.equal(unified[1].source, 'speaking_studio');
  assert.equal(unified[1].reviewStatus, 'unreviewed');
  assert.equal(unified[1].turns.length, 3);
  assert.equal(unified[1].mistakes[0].memoryItemId, 'mm_past_1');
  assert.equal(unified[1].mistakes[0].memoryStatus, 'practicing');
  assert.equal(unified[1].mistakes[0].practiceLink, '/app/improve?focus=mm_past_1');
  assert.equal(unified[1].comparisons.length, 1);
  assert.equal(unified[1].comparisons[0].hasChanges, true);

  // Strict non-mutation / read-only invariant
  assert.equal(
    JSON.stringify({ speaking, transfer, mistakes: SAMPLE_MISTAKES }),
    snapshotBefore
  );
});

test('2. enforces user ownership on both sessions and IndexedDB audio blob keys', () => {
  const foreignSpeaking = makeSpeakingSession({ id: 'spk_foreign', userId: USER_B });
  const foreignTransfer = makeTransferAttempt({ id: 'trf_foreign', userId: USER_B });
  const ownSpeaking = makeSpeakingSession({ id: 'spk_own', userId: USER_A });

  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: [ownSpeaking, foreignSpeaking],
    transferAttempts: [foreignTransfer],
    mistakes: SAMPLE_MISTAKES,
    reviewRecords: {},
  });

  assert.equal(unified.length, 1);
  assert.equal(unified[0].id, 'spk_own');

  assert.equal(authorizeReplaySessionAccess(USER_A, USER_A).authorized, true);
  assert.equal(authorizeReplaySessionAccess(USER_B, USER_A).authorized, false);
  assert.equal(authorizeReplaySessionAccess(USER_A, '').authorized, false);

  assert.equal(
    isAuthorizedAudioBlobKey(`audio_${USER_A}_spk_own_t1`, USER_A, USER_A),
    true
  );
  assert.equal(
    isAuthorizedAudioBlobKey(`audio_${USER_B}_spk_foreign_t1`, USER_A, USER_A),
    false
  );

  const requested = resolveRequestedReplaySession({
    ownedSessions: unified,
    requestedSessionId: 'spk_foreign',
    currentUserId: USER_A,
    allSessionOwnersById: { spk_foreign: USER_B, spk_own: USER_A },
  });
  assert.equal(requested.status, 'unauthorized');
  assert.equal(requested.session, null);
});

test('3. distinguishes available audio, missing recordings, text-only sessions, and unauthorized keys', () => {
  assert.equal(
    REPLAY_AUDIO_UNAVAILABLE_MESSAGE_EN,
    'Audio recording is not available for this session. You can still review the saved conversation transcript.'
  );

  assert.equal(
    resolveAudioAvailability({
      audioBlobKey: `audio_${USER_A}_sess_1_t1`,
      blobExists: true,
      currentUserId: USER_A,
      sessionUserId: USER_A,
      inputChannel: 'voice_stt',
    }),
    'available'
  );

  assert.equal(
    resolveAudioAvailability({
      audioBlobKey: `audio_${USER_A}_sess_1_t1`,
      blobExists: false,
      currentUserId: USER_A,
      sessionUserId: USER_A,
      inputChannel: 'voice_stt',
    }),
    'missing_recording'
  );

  assert.equal(
    resolveAudioAvailability({
      audioBlobKey: undefined,
      blobExists: false,
      currentUserId: USER_A,
      sessionUserId: USER_A,
      inputChannel: 'text_fallback',
    }),
    'text_only'
  );

  assert.equal(
    resolveAudioAvailability({
      audioBlobKey: `audio_${USER_B}_sess_2_t1`,
      blobExists: true,
      currentUserId: USER_A,
      sessionUserId: USER_A,
      inputChannel: 'voice_stt',
    }),
    'unauthorized'
  );
});

test('4. computes real normalized RMS waveform peaks from decoded PCM samples and returns empty for empty data', () => {
  assert.deepEqual(computeWaveformPeaksFromChannelData(new Float32Array(0), 32), []);

  // Half silence, half high-amplitude sine wave -> second half peaks must exceed first half
  const samples = new Float32Array(1600);
  for (let i = 800; i < 1600; i += 1) {
    samples[i] = Math.sin(i * 0.25) * 0.9;
  }
  const peaks = computeWaveformPeaksFromChannelData(samples, 16);
  assert.equal(peaks.length, 16);
  assert.ok(peaks[0] <= 0.1, 'Silent section should stay near minimum floor');
  assert.ok(peaks[12] >= 0.85, 'Loud section should normalize near 1.0');
  assert.ok(peaks.every((p) => p >= 0.08 && p <= 1));
});

test('5. handles missing transcript, missing evaluation, and legacy single-response turns without fabricating timestamps or scores', () => {
  const brokenTransfer = makeTransferAttempt({
    id: 'trf_missing_all',
    transcript: [],
    userResponse: '',
    evaluation: {} as TransferAttemptRecord['evaluation'],
  });
  const legacySingleResponse = makeTransferAttempt({
    id: 'trf_legacy_single',
    transcript: [],
    userResponse: 'Could we reschedule our project sync to Thursday morning?',
  });

  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: [],
    transferAttempts: [brokenTransfer, legacySingleResponse],
    mistakes: [],
    reviewRecords: {},
  });

  const trf = unified.find((s) => s.id === 'trf_missing_all')!;
  assert.equal(trf.hasTranscript, false);
  assert.ok(trf.transcriptGapReasonEn);
  assert.equal(trf.analysis.hasEvaluation, false);
  assert.equal(trf.analysis.evaluationType, 'missing');
  assert.equal(trf.analysis.overallScore, null);
  assert.equal(trf.analysis.passed, null);

  const legacy = unified.find((s) => s.id === 'trf_legacy_single')!;
  assert.equal(legacy.hasTranscript, true);
  assert.ok(
    legacy.turns.every((t) => t.hasValidTimestamp === false && t.timestamp === ''),
    'Legacy single-response turns must never fabricate turn timestamps'
  );
});

test('6. searches transcript turns accurately, highlights safely, and filters by speaker', () => {
  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: [makeSpeakingSession()],
    transferAttempts: [makeTransferAttempt()],
    mistakes: SAMPLE_MISTAKES,
    reviewRecords: {},
  });

  const transferSession = unified.find((s) => s.id === 'trf_att_202')!;
  const search = searchReplayTranscript(transferSession.turns, 'vegetarian');
  assert.equal(search.totalMatches, 2);
  assert.equal(search.matchedTurnIds.length, 2);

  const learnerOnly = filterReplayTurnsBySpeaker(transferSession.turns, 'learner');
  assert.equal(learnerOnly.length, 1);
  assert.equal(learnerOnly[0].speaker, 'learner');

  const aiOnly = filterReplayTurnsBySpeaker(transferSession.turns, 'ai');
  assert.equal(aiOnly.length, 2);
  assert.ok(aiOnly.every((t) => t.speaker === 'ai'));

  const segments = highlightTranscriptSegments('I ordered vegetarian pasta today.', 'vegetarian');
  assert.deepEqual(segments, [
    { text: 'I ordered ', isMatch: false },
    { text: 'vegetarian', isMatch: true },
    { text: ' pasta today.', isMatch: false },
  ]);
});

test('7. computes strictly real library metrics including transcript and evaluation counts', () => {
  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: [makeSpeakingSession()],
    transferAttempts: [makeTransferAttempt()],
    mistakes: SAMPLE_MISTAKES,
    reviewRecords: {
      trf_att_202: {
        sessionId: 'trf_att_202',
        source: 'transfer_lab',
        status: 'reviewed',
        updatedAt: '2026-11-24T13:00:00.000Z',
        reviewedAt: '2026-11-24T13:00:00.000Z',
      },
    },
  });

  const metrics = computeReplayLibraryMetrics(unified);
  assert.equal(metrics.totalSessions, 2);
  assert.equal(metrics.speakingCount, 1);
  assert.equal(metrics.transferCount, 1);
  assert.equal(metrics.reviewedCount, 1);
  assert.equal(metrics.unreviewedCount, 1);
  assert.equal(metrics.sessionsWithAudioMetadata, 1);
  assert.equal(metrics.sessionsWithTranscripts, 2);
  assert.equal(metrics.sessionsEvaluated, 2);
  assert.equal(metrics.totalDetectedMistakes, 2);
  assert.equal(metrics.totalPracticeMinutes, 7);
});

test('8. supports advanced filters (date range, category, transcript, evaluation) and recently_reviewed sort', () => {
  const oldSpeaking = makeSpeakingSession({
    id: 'spk_old_60d',
    updatedAt: '2026-09-10T10:00:00.000Z',
  });
  const recentTransfer = makeTransferAttempt({
    id: 'trf_recent',
    completedAt: '2026-11-23T10:00:00.000Z',
  });
  const brokenTransfer = makeTransferAttempt({
    id: 'trf_no_eval',
    completedAt: '2026-11-24T09:00:00.000Z',
    transcript: [],
    userResponse: '',
    evaluation: {} as TransferAttemptRecord['evaluation'],
  });

  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: [oldSpeaking],
    transferAttempts: [recentTransfer, brokenTransfer],
    mistakes: SAMPLE_MISTAKES,
    reviewRecords: {
      spk_old_60d: {
        sessionId: 'spk_old_60d',
        source: 'speaking_studio',
        status: 'reviewed',
        updatedAt: '2026-11-24T15:00:00.000Z',
        reviewedAt: '2026-11-24T15:00:00.000Z',
      },
    },
  });

  const nowMs = Date.parse('2026-11-24T16:00:00.000Z');
  const last7Days = filterReplaySessions(
    unified,
    { ...DEFAULT_REPLAY_FILTERS, dateRange: '7d' },
    nowMs
  );
  assert.equal(last7Days.length, 2);
  assert.ok(!last7Days.some((s) => s.id === 'spk_old_60d'));

  const missingTranscript = filterReplaySessions(
    unified,
    { ...DEFAULT_REPLAY_FILTERS, transcriptFilter: 'missing_transcript' },
    nowMs
  );
  assert.equal(missingTranscript.length, 1);
  assert.equal(missingTranscript[0].id, 'trf_no_eval');

  const evaluatedOnly = filterReplaySessions(
    unified,
    { ...DEFAULT_REPLAY_FILTERS, evaluationFilter: 'evaluated' },
    nowMs
  );
  assert.equal(evaluatedOnly.length, 2);

  const recentlyReviewed = filterReplaySessions(
    unified,
    { ...DEFAULT_REPLAY_FILTERS, sortBy: 'recently_reviewed' },
    nowMs
  );
  assert.equal(recentlyReviewed[0].id, 'spk_old_60d');

  const categories = extractReplayScenarioCategories(unified);
  assert.ok(categories.length >= 2);
});

test('9. paginates session lists deterministically for Load More UX', () => {
  const manySpeaking = Array.from({ length: 12 }, (_, idx) =>
    makeSpeakingSession({
      id: `spk_page_${idx}`,
      updatedAt: new Date(Date.parse('2026-11-24T10:00:00.000Z') - idx * 60000).toISOString(),
    })
  );
  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: manySpeaking,
    transferAttempts: [],
    mistakes: [],
    reviewRecords: {},
  });

  const page1 = paginateReplaySessions(unified, 1, 8);
  assert.equal(page1.items.length, 8);
  assert.equal(page1.hasMore, true);
  assert.equal(page1.totalPages, 2);

  const page2 = paginateReplaySessions(unified, 2, 8);
  assert.equal(page2.items.length, 12);
  assert.equal(page2.hasMore, false);
});

test('10. selects a real recommended session prioritizing unreviewed sessions with mistakes and returns null when empty', () => {
  assert.equal(selectRecommendedReplaySession([]), null);

  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: [makeSpeakingSession()],
    transferAttempts: [makeTransferAttempt()],
    mistakes: SAMPLE_MISTAKES,
    reviewRecords: {
      trf_att_202: {
        sessionId: 'trf_att_202',
        source: 'transfer_lab',
        status: 'reviewed',
        updatedAt: '2026-11-24T13:00:00.000Z',
        reviewedAt: '2026-11-24T13:00:00.000Z',
      },
    },
  });

  const rec = selectRecommendedReplaySession(unified);
  assert.ok(rec);
  assert.equal(rec.session.id, 'spk_sess_101');
  assert.ok(rec.reasonEn.includes('mistake'));
});

test('11. builds honest Part 10 Communication DNA Evidence Trace strictly excluding Pronunciation & Listening from text-only records', () => {
  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: [],
    transferAttempts: [makeTransferAttempt()],
    mistakes: SAMPLE_MISTAKES,
    reviewRecords: {},
  });

  const trace = buildReplayDnaEvidenceTrace(unified[0]);
  const grammar = trace.find((d) => d.dnaDimensionId === 'grammar')!;
  const pronunciation = trace.find((d) => d.dnaDimensionId === 'pronunciation')!;
  const listening = trace.find((d) => d.dnaDimensionId === 'listening')!;

  assert.equal(grammar.contributed, true);
  assert.equal(pronunciation.contributed, false);
  assert.equal(pronunciation.methodologyVersion, 'acoustic-engine-unavailable');
  assert.equal(listening.contributed, false);
  assert.equal(listening.methodologyVersion, 'no-listening-evidence');
});

test('12. builds privacy-scoped JSON export separating historical session data from Replay Practice attempts', () => {
  const unified = buildUnifiedReplaySessions({
    userId: USER_A,
    speakingSessions: [makeSpeakingSession()],
    transferAttempts: [],
    mistakes: SAMPLE_MISTAKES,
    reviewRecords: {},
  });

  const practiceAttempts: ReplayPracticeAttemptRecord[] = [
    {
      id: 'rpa_1',
      userId: USER_A,
      sessionId: 'spk_sess_101',
      source: 'speaking_studio',
      turnId: 'turn_1_learner',
      originalResponse: 'Yesterday I go to market and buy fresh mangoes.',
      correctedReference: 'Yesterday I went to the market and bought fresh mangoes.',
      learnerRetryText: 'Yesterday I went to the market and bought fresh mangoes.',
      correctionHiddenDuringAttempt: true,
      createdAt: '2026-11-24T14:00:00.000Z',
    },
    {
      id: 'rpa_other',
      userId: USER_A,
      sessionId: 'other_session',
      source: 'transfer_lab',
      turnId: 't_1',
      originalResponse: 'orig',
      learnerRetryText: 'retry',
      correctionHiddenDuringAttempt: false,
      createdAt: '2026-11-24T14:05:00.000Z',
    },
  ];

  const payload = buildSessionExportPayload(unified[0], practiceAttempts) as {
    storageScope: string;
    session: { id: string; transcript: unknown[] };
    separateReplayPracticeAttempts: ReplayPracticeAttemptRecord[];
  };

  assert.equal(payload.storageScope, 'browser_local_only');
  assert.equal(payload.session.id, 'spk_sess_101');
  assert.equal(payload.session.transcript.length, 3);
  assert.equal(payload.separateReplayPracticeAttempts.length, 1);
  assert.equal(payload.separateReplayPracticeAttempts[0].id, 'rpa_1');
});
