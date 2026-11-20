import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPressureLadderTier,
  normalizePressureLevel,
  PRESSURE_LADDER_TIERS,
} from './pressureLadder';
import {
  buildTransferRecommendations,
  normalizeTransferEvaluation,
  TRANSFER_SCENARIOS,
} from './transferLabEngine';
import {
  appendIdempotentXpAward,
  buildLessonCompletionXpAward,
  buildMistakeResolvedXpAward,
  buildSpeakingSessionXpAward,
  buildTransferPassXpAward,
  computeTotalVerifiedXp,
  computeVerifiedAchievements,
} from './gamificationEngine';
import type {
  LessonMasteryRecord,
  MistakeMemoryItem,
  XpLedgerEntry,
} from '../types/domain';

test('Pressure Ladder exposes all 5 progressive tiers and normalizes legacy levels cleanly', () => {
  assert.equal(PRESSURE_LADDER_TIERS.length, 5);
  assert.equal(PRESSURE_LADDER_TIERS[0].showTemplates, true);
  assert.equal(PRESSURE_LADDER_TIERS[1].showBulletCues, true);
  assert.equal(PRESSURE_LADDER_TIERS[1].showTemplates, false);
  assert.equal(PRESSURE_LADDER_TIERS[2].showBulletCues, false);
  assert.equal(PRESSURE_LADDER_TIERS[3].introducesTwist, true);
  assert.equal(PRESSURE_LADDER_TIERS[4].speakingTimeLimitSeconds, 45);
  assert.equal(PRESSURE_LADDER_TIERS[4].transferTimeLimitSeconds, 60);

  assert.equal(normalizePressureLevel('guided'), 'level_2_guided');
  assert.equal(normalizePressureLevel('open_ended'), 'level_3_open');
  assert.equal(normalizePressureLevel('time_limited'), 'level_5_timed_high_stakes');
  assert.equal(getPressureLadderTier('level_4_twist').levelNumber, 4);
});

test('Transfer Lab ships all 5 structured scenarios and prioritizes real Mistake Memory & Academy links', () => {
  assert.equal(TRANSFER_SCENARIOS.length, 5);
  const ids = TRANSFER_SCENARIOS.map((s) => s.id);
  assert.deepEqual(ids, [
    'job_interview_followup',
    'workplace_project_delay',
    'order_issue_resolution',
    'university_admission_interview',
    'storytelling_under_pressure',
  ]);

  // Cold start: no fake recommendations
  const coldRecs = buildTransferRecommendations({
    mistakes: [],
    lessonMastery: {},
    transferAttempts: [],
  });
  assert.equal(coldRecs.length, 5);
  assert.ok(coldRecs.every((r) => r.linkedSourceType === 'baseline' && !r.isRecommended));

  // Real active Preposition mistake should elevate "Explaining a Project Delay at Work" to #1
  const prepMistake: MistakeMemoryItem = {
    id: 'm_prep_1',
    userId: 'u1',
    source: 'speaking_studio',
    category: 'Preposition',
    domain: 'grammar',
    patternEn: 'Redundant about after discuss',
    patternBn: 'discuss-এর পর বাড়তি about',
    userExample: 'We discussed about the delay',
    correctedExample: 'We discussed the delay',
    explanationEn: 'Discuss is transitive.',
    explanationBn: 'Discuss-এর পর about বসে না।',
    occurrences: 3,
    status: 'active',
    createdAt: '2026-05-01T00:00:00.000Z',
    lastSeenAt: '2026-05-02T00:00:00.000Z',
  };

  const lessonMastery: Record<string, LessonMasteryRecord> = {
    les_past_simple_stories: {
      lessonId: 'les_past_simple_stories',
      userId: 'u1',
      attemptCount: 1,
      consecutivePassCount: 1,
      bestAccuracyPercent: 85,
      lastAccuracyPercent: 85,
      masteryPercent: 45,
      status: 'initial_acquisition',
      reviewIntervalDays: 1,
      schedulePreset: 'standard',
      lastAttemptAt: '2026-05-02T10:00:00.000Z',
      nextReviewAt: '2026-05-03T10:00:00.000Z',
    },
  };

  const personalized = buildTransferRecommendations({
    mistakes: [prepMistake],
    lessonMastery,
    transferAttempts: [],
  });

  assert.equal(personalized[0].scenario.id, 'workplace_project_delay');
  assert.equal(personalized[0].linkedSourceType, 'mistake_memory');
  assert.equal(personalized[0].isRecommended, true);
  assert.match(personalized[0].reasonEn, /Mistake Memory/i);
  assert.ok(
    personalized.some((r) => r.linkedSourceType === 'academy_lesson' && r.isRecommended)
  );
});

test('normalizeTransferEvaluation enforces strict 4-rubric pass bar and Level 4 twist fallback', () => {
  // High average (73%) but Target Grammar is 55% (< 60%) -> MUST NOT PASS
  const failedGrammar = normalizeTransferEvaluation(
    {
      task_completion: { score: 85, feedbackEn: 'Complete.', feedbackBn: 'সম্পূর্ণ।' },
      target_grammar_application: { score: 55, feedbackEn: 'Tense slips.', feedbackBn: 'কাল ভুল।' },
      contextual_appropriateness: { score: 80, feedbackEn: 'Polite.', feedbackBn: 'ভদ্র।' },
      response_relevance: { score: 72, feedbackEn: 'Relevant.', feedbackBn: 'প্রাসঙ্গিক।' },
      strengths: ['Clear structure'],
      detected_mistakes: [],
      natural_model_response: 'Model response.',
      coach_summary_en: 'Needs grammar repair.',
      coach_summary_bn: 'ব্যাকরণ ঠিক করুন।',
    },
    {
      scenarioId: 'job_interview_followup',
      pressureLevel: 'level_3_open',
      stage: 'initial',
      userResponse: 'Yesterday I fix the bug.',
      targetSkillLabelEn: 'Past Simple',
      inputChannel: 'text_fallback',
      learnerLevel: 'B1',
      explanationLanguage: 'both',
    }
  );
  assert.equal(failedGrammar.overall_score, 73);
  assert.equal(failedGrammar.passed, false);

  // Level 4 initial stage supplies fallback twist when omitted
  const level4Initial = normalizeTransferEvaluation(
    {
      task_completion: { score: 80, feedbackEn: 'Good.', feedbackBn: 'ভালো।' },
      target_grammar_application: { score: 78, feedbackEn: 'Solid.', feedbackBn: 'দৃঢ়।' },
      contextual_appropriateness: { score: 82, feedbackEn: 'Appropriate.', feedbackBn: 'উপযুক্ত।' },
      response_relevance: { score: 80, feedbackEn: 'Direct.', feedbackBn: 'সরাসরি।' },
      strengths: ['Direct answer'],
      detected_mistakes: [],
      natural_model_response: 'Natural response.',
      coach_summary_en: 'Good start.',
      coach_summary_bn: 'ভালো শুরু।',
    },
    {
      scenarioId: 'workplace_project_delay',
      pressureLevel: 'level_4_twist',
      stage: 'initial',
      userResponse: 'We have been waiting for the vendor API since Monday.',
      targetSkillLabelEn: 'Prepositions & Present Perfect',
      inputChannel: 'text_fallback',
      learnerLevel: 'B1',
      explanationLanguage: 'both',
    }
  );
  assert.equal(level4Initial.passed, true);
  assert.ok(level4Initial.unexpected_twist_en && level4Initial.unexpected_twist_en.length > 10);
  assert.ok(level4Initial.unexpected_twist_bn && level4Initial.unexpected_twist_bn.length > 10);
});

test('Verified Gamification XP Ledger is strictly idempotent and prevents duplicate XP farming', () => {
  let ledger: XpLedgerEntry[] = [];

  // Failing lesson (< 60%) awards 0 XP
  assert.equal(buildLessonCompletionXpAward('les_1', 'L1', 'ল১', 50), null);

  // Passing lesson awards +50 XP once
  const lessonAward = buildLessonCompletionXpAward('les_1', 'L1', 'ল১', 80);
  const r1 = appendIdempotentXpAward(ledger, 'u1', lessonAward, '2026-05-03T10:00:00Z', 'xp_1');
  ledger = r1.ledger;
  assert.equal(r1.newlyAwarded?.xpEarned, 50);

  // Repeating the same lesson MUST NOT award duplicate XP
  const r1Dup = appendIdempotentXpAward(ledger, 'u1', lessonAward, '2026-05-03T10:05:00Z', 'xp_2');
  ledger = r1Dup.ledger;
  assert.equal(r1Dup.newlyAwarded, null);
  assert.equal(computeTotalVerifiedXp(ledger), 50);

  // Speaking session awards +40 XP once per sessionId
  const spkAward = buildSpeakingSessionXpAward('spk_1', 'Daily', 'দৈনন্দিন', 1);
  const r2 = appendIdempotentXpAward(ledger, 'u1', spkAward, '2026-05-03T10:10:00Z', 'xp_3');
  ledger = r2.ledger;
  assert.equal(r2.newlyAwarded?.xpEarned, 40);

  // Turn 2 of the same speaking session is idempotent -> 0 duplicate XP
  const spkAwardTurn2 = buildSpeakingSessionXpAward('spk_1', 'Daily', 'দৈনন্দিন', 2);
  const r2Dup = appendIdempotentXpAward(ledger, 'u1', spkAwardTurn2, '2026-05-03T10:12:00Z', 'xp_4');
  assert.equal(r2Dup.newlyAwarded, null);

  // Mistake resolved awards +35 XP only when status === 'resolved' and not false-flagged
  const resolvedMistake: MistakeMemoryItem = {
    id: 'm_1',
    userId: 'u1',
    source: 'speaking_studio',
    category: 'Verb Tense',
    domain: 'grammar',
    patternEn: 'Past simple',
    patternBn: 'অতীত কাল',
    userExample: 'I go yesterday',
    correctedExample: 'I went yesterday',
    explanationEn: 'Use went.',
    explanationBn: 'went ব্যবহার করুন।',
    occurrences: 2,
    status: 'resolved',
    createdAt: '2026-05-01T00:00:00Z',
    lastSeenAt: '2026-05-03T00:00:00Z',
  };
  const r3 = appendIdempotentXpAward(
    ledger,
    'u1',
    buildMistakeResolvedXpAward(resolvedMistake),
    '2026-05-03T10:20:00Z',
    'xp_5'
  );
  ledger = r3.ledger;
  assert.equal(r3.newlyAwarded?.xpEarned, 35);

  // Transfer Lab passed at Level 4 awards +90 XP once per (scenarioId, pressureLevel)
  const trFail = buildTransferPassXpAward('job_interview_followup', 'Job', 'চাকরি', 'level_4_twist', 64, false);
  assert.equal(trFail, null);
  const trPass = buildTransferPassXpAward('job_interview_followup', 'Job', 'চাকরি', 'level_4_twist', 84, true);
  const r4 = appendIdempotentXpAward(ledger, 'u1', trPass, '2026-05-03T10:30:00Z', 'xp_6');
  ledger = r4.ledger;
  assert.equal(r4.newlyAwarded?.xpEarned, 90);
  const r4Dup = appendIdempotentXpAward(ledger, 'u1', trPass, '2026-05-03T10:35:00Z', 'xp_7');
  assert.equal(r4Dup.newlyAwarded, null);

  assert.equal(computeTotalVerifiedXp(ledger), 50 + 40 + 35 + 90);

  // Fresh account achievements must all be locked (0/6)
  const freshAchievements = computeVerifiedAchievements({
    xpLedger: [],
    lessonMastery: {},
    speakingSessions: [],
    mistakes: [],
    transferAttempts: [],
  });
  assert.equal(freshAchievements.filter((a) => a.unlocked).length, 0);
});
