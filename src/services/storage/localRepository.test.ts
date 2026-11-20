import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalPersistenceRepository, type StorageLike } from './localRepository';
import { DIAGNOSTIC_QUESTIONS } from '../../domain/diagnosticData';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

test('LocalPersistenceRepository handles register, duplicate rejection, login, reload restore, and logout', async () => {
  const storage = createMemoryStorage();
  const repo = new LocalPersistenceRepository(storage);

  const registered = await repo.register({
    name: 'Nusrat Jahan',
    email: 'Nusrat@Example.com',
    password: 'StrongPassword123',
    plan: 'free',
  });

  assert.equal(registered.user.email, 'nusrat@example.com');
  assert.equal(registered.profile.onboardingCompleted, false);
  assert.equal(registered.activitySummary.completedLessons, 0);
  assert.equal(registered.activitySummary.activeStreakDays, 0);

  await assert.rejects(
    () =>
      repo.register({
        name: 'Duplicate',
        email: 'nusrat@example.com',
        password: 'AnotherPassword123',
      }),
    /already exists/i
  );

  const repoAfterReload = new LocalPersistenceRepository(storage);
  const restored = await repoAfterReload.restoreSession();
  assert.ok(restored);
  assert.equal(restored.user.id, registered.user.id);

  await repoAfterReload.logout();
  const afterLogout = await repoAfterReload.restoreSession();
  assert.equal(afterLogout, null);

  await assert.rejects(
    () =>
      repoAfterReload.login({
        email: 'nusrat@example.com',
        password: 'WrongPassword',
      }),
    /Incorrect password/i
  );

  const loggedIn = await repoAfterReload.login({
    email: 'nusrat@example.com',
    password: 'StrongPassword123',
  });
  assert.equal(loggedIn.user.name, 'Nusrat Jahan');
});

test('LocalPersistenceRepository persists onboarding profile and diagnostic results cleanly', async () => {
  const storage = createMemoryStorage();
  const repo = new LocalPersistenceRepository(storage);

  const { user } = await repo.register({
    name: 'Tanvir Ahmed',
    email: 'tanvir@example.com',
    password: 'Password1234',
  });

  const { profile } = await repo.updateProfile(user.id, {
    preferredUiLanguage: 'bn',
    explanationLanguage: 'both',
    selfEstimatedLevel: 'B1',
    primaryGoal: 'job_interview',
    dailyTimeGoalMinutes: 25,
    onboardingCompleted: true,
  });

  assert.equal(profile.preferredUiLanguage, 'bn');
  assert.equal(profile.primaryGoal, 'job_interview');
  assert.equal(profile.onboardingCompleted, true);

  const answers = DIAGNOSTIC_QUESTIONS.map((q, idx) => ({
    questionId: q.id,
    userResponse: idx === 0 ? 'do' : q.correctAnswer,
  }));

  const diagResult = await repo.submitDiagnostic(user.id, answers);
  assert.equal(diagResult.diagnostic.totalCorrect, 4);
  assert.equal(diagResult.mistakes.length, 1);
  assert.equal(diagResult.profile.diagnosticCompleted, true);

  const restored = await repo.restoreSession();
  assert.ok(restored?.latestDiagnostic);
  assert.equal(restored.latestDiagnostic.totalCorrect, 4);
  assert.equal(restored.mistakes.length, 1);
});

test('LocalPersistenceRepository records exercise & lesson attempts, auto-logs Mistake Memory, and caps single-attempt mastery', async () => {
  const storage = createMemoryStorage();
  const repo = new LocalPersistenceRepository(storage);

  const { user } = await repo.register({
    name: 'Farhana Karim',
    email: 'farhana@example.com',
    password: 'Password1234',
  });

  // Record a wrong exercise attempt -> should automatically create a Mistake Memory item
  const wrongEx = await repo.recordExerciseAttempt(user.id, {
    lessonId: 'les_past_simple_markers',
    stage: 'guided',
    exerciseId: 'g_past_1',
    exerciseType: 'fill_blank',
    userResponse: 'spoke',
    expectedAnswer: 'speak',
    isCorrect: false,
    mistakeCategory: 'Tense',
    domain: 'grammar',
    patternEn: 'Using past verb after "Did"',
    patternBn: '"Did"-এর পর আবার Past form বসানো',
    explanationEn: 'Use base verb after Did.',
    explanationBn: '"Did"-এর পর Base verb বসবে।',
    mistakeSource: 'lesson_guided',
  });

  assert.ok(wrongEx.loggedMistake);
  assert.equal(wrongEx.mistakes.length, 1);
  assert.equal(wrongEx.mistakes[0].occurrences, 1);
  assert.equal(wrongEx.mistakes[0].category, 'Tense');

  // Repeating the same mistake increments occurrence count instead of duplicating
  const repeatWrongEx = await repo.recordExerciseAttempt(user.id, {
    lessonId: 'les_past_simple_markers',
    stage: 'assessment',
    exerciseId: 'as_past_2',
    exerciseType: 'mcq',
    userResponse: 'Did she finished',
    expectedAnswer: 'Did she finish',
    isCorrect: false,
    mistakeCategory: 'Tense',
    domain: 'grammar',
    patternEn: 'Using past verb after "Did"',
    patternBn: '"Did"-এর পর আবার Past form বসানো',
    explanationEn: 'Use base verb after Did.',
    explanationBn: '"Did"-এর পর Base verb বসবে।',
    mistakeSource: 'lesson_assessment',
  });
  assert.equal(repeatWrongEx.mistakes.length, 1);
  assert.equal(repeatWrongEx.mistakes[0].occurrences, 2);

  // Record a completed lesson attempt (7/8 = 88%) -> single attempt mastery must stay <= 45%
  const completed = await repo.recordLessonAttempt(user.id, {
    lessonId: 'les_past_simple_markers',
    startedAt: new Date(Date.now() - 240_000).toISOString(),
    durationSeconds: 240,
    guidedCorrect: 2,
    guidedTotal: 3,
    independentCorrect: 2,
    independentTotal: 2,
    assessmentCorrect: 3,
    assessmentTotal: 3,
    mistakesLoggedCount: 1,
  });

  const mastery = completed.lessonMastery['les_past_simple_markers'];
  assert.ok(mastery);
  assert.equal(mastery.attemptCount, 1);
  assert.ok(mastery.masteryPercent <= 45);
  assert.equal(completed.activitySummary.completedLessons, 1);
  assert.equal(completed.activitySummary.activeStreakDays, 1);

  // Reload persistence check
  const freshRepo = new LocalPersistenceRepository(storage);
  const restored = await freshRepo.restoreSession();
  assert.ok(restored);
  assert.equal(restored.lessonAttempts.length, 1);
  assert.equal(restored.exerciseAttempts.length, 2);
  assert.equal(restored.mistakes.length, 1);
  assert.equal(restored.mistakes[0].occurrences, 2);
  assert.equal(restored.lessonMastery['les_past_simple_markers']?.attemptCount, 1);
});

test('LocalPersistenceRepository persists Speaking Studio sessions and syncs mistakes with frequency & severity', async () => {
  const storage = createMemoryStorage();
  const repo = new LocalPersistenceRepository(storage);

  const { user } = await repo.register({
    name: 'Samira Akter',
    email: 'samira@example.com',
    password: 'Password123!',
  });

  const turn1 = {
    id: 'turn_1',
    turnNumber: 1,
    promptShown: 'How did your week go?',
    userTranscript: 'Yesterday I go to market with my sister.',
    inputChannel: 'voice_stt' as const,
    audioBlobKey: 'audio_spk_1_turn_1',
    audioDurationSeconds: 5,
    evaluation: {
      ai_reply: 'That sounds nice! What did you buy at the market?',
      ai_reply_bn_hint: 'চমৎকার! বাজার থেকে কী কিনলেন?',
      corrected_transcript: 'Yesterday I went to the market with my sister.',
      correct_elements: ['Clear past context with "Yesterday"'],
      mistakes: [
        {
          category: 'Tense',
          original: 'I go to market',
          corrected: 'I went to the market',
          explanation_en: 'Use past tense "went" with "yesterday".',
          explanation_bn: '"Yesterday" থাকায় "go" নয়, "went" ব্যবহার করুন।',
          confidence: 0.94,
          severity: 'medium' as const,
        },
      ],
      natural_alternative: 'I went shopping with my sister yesterday.',
      pronunciation_note: 'Speech-to-text clarity note (not an acoustic phoneme score).',
    },
    createdAt: new Date().toISOString(),
  };

  const firstSave = await repo.saveSpeakingSession(user.id, {
    sessionId: 'spk_1',
    modeId: 'daily_conversations',
    pressureLevel: 'guided',
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    durationSeconds: 60,
    turns: [turn1],
    newlyEvaluatedTurnId: 'turn_1',
  });

  assert.equal(firstSave.speakingSessions.length, 1);
  assert.equal(firstSave.activitySummary.completedSpeakingSessions, 1);
  assert.equal(firstSave.mistakes.length, 1);
  assert.equal(firstSave.mistakes[0].source, 'speaking_studio');
  assert.equal(firstSave.mistakes[0].occurrences, 1);
  assert.equal(firstSave.mistakes[0].severity, 'medium');

  // Turn 2 repeats the same tense pattern with high severity -> increments occurrences to 2 & escalates severity to high without re-counting Turn 1
  const turn2 = {
    ...turn1,
    id: 'turn_2',
    turnNumber: 2,
    evaluation: {
      ...turn1.evaluation,
      mistakes: [
        {
          ...turn1.evaluation.mistakes[0],
          severity: 'high' as const,
        },
      ],
    },
  };

  const secondSave = await repo.saveSpeakingSession(user.id, {
    sessionId: 'spk_1',
    modeId: 'daily_conversations',
    pressureLevel: 'guided',
    startedAt: firstSave.session.startedAt,
    durationSeconds: 120,
    turns: [turn1, turn2],
    newlyEvaluatedTurnId: 'turn_2',
  });

  assert.equal(secondSave.speakingSessions.length, 1);
  assert.equal(secondSave.speakingSessions[0].turns.length, 2);
  assert.equal(secondSave.mistakes.length, 1);
  assert.equal(secondSave.mistakes[0].occurrences, 2);
  assert.equal(secondSave.mistakes[0].severity, 'high');

  const freshRepo = new LocalPersistenceRepository(storage);
  const restored = await freshRepo.restoreSession();
  assert.ok(restored);
  assert.equal(restored.speakingSessions.length, 1);
  assert.equal(restored.speakingSessions[0].turns[0].audioBlobKey, 'audio_spk_1_turn_1');
  assert.equal(restored.activitySummary.completedSpeakingSessions, 1);
});

test('LocalPersistenceRepository persists Mistake Memory drill attempts, spaced resolution, and false AI correction flags', async () => {
  const storage = createMemoryStorage();
  const repo = new LocalPersistenceRepository(storage);

  const { user } = await repo.register({
    name: 'Samira Akter',
    email: 'samira@example.com',
    password: 'password123',
  });

  // Seed 2 AI-detected speaking mistakes
  const saveRes = await repo.saveSpeakingSession(user.id, {
    sessionId: 'spk_p4',
    modeId: 'job_interviews',
    pressureLevel: 'guided',
    startedAt: '2026-05-03T10:00:00.000Z',
    durationSeconds: 90,
    newlyEvaluatedTurnId: 'turn_p4_1',
    turns: [
      {
        id: 'turn_p4_1',
        turnNumber: 1,
        promptShown: 'Tell me about your recent work.',
        userTranscript: 'Yesterday I go to office and discuss about project.',
        inputChannel: 'text_fallback',
        responseTimeSeconds: 20,
        timedOut: false,
        createdAt: '2026-05-03T10:01:00.000Z',
        evaluation: {
          ai_reply: 'Thanks for sharing.',
          ai_reply_bn_hint: 'ধন্যবাদ।',
          corrected_transcript: 'Yesterday I went to the office and discussed the project.',
          correct_elements: ['Clear subject'],
          mistakes: [
            {
              category: 'Verb Tense',
              original: 'Yesterday I go to office',
              corrected: 'Yesterday I went to the office',
              explanation_en: 'Use past simple went.',
              explanation_bn: 'Yesterday এর সাথে went বসবে।',
              confidence: 0.94,
              severity: 'high',
            },
            {
              category: 'Preposition',
              original: 'discuss about project',
              corrected: 'discussed the project',
              explanation_en: 'No about after discuss.',
              explanation_bn: 'Discuss এর পর about বসে না।',
              confidence: 0.85,
              severity: 'medium',
            },
          ],
          natural_alternative: 'Yesterday I went to the office to discuss the project.',
          pronunciation_note: 'Text input used.',
        },
      },
    ],
  });

  assert.equal(saveRes.mistakes.length, 2);
  const tenseMistake = saveRes.mistakes.find((m) => m.category === 'Verb Tense')!;
  const prepMistake = saveRes.mistakes.find((m) => m.category === 'Preposition')!;

  // Pass #1 of targeted drill -> status moves active -> practicing
  const pass1 = await repo.recordMistakeDrillAttempt(user.id, {
    mistakeId: tenseMistake.id,
    passed: true,
    userRewrite: 'Yesterday I went to the office',
    expectedAnswer: 'Yesterday I went to the office',
    durationSeconds: 45,
  });

  assert.equal(pass1.updatedMistake.status, 'practicing');
  assert.equal(pass1.updatedMistake.practicePassCount, 1);
  assert.ok(pass1.updatedMistake.nextReviewAt);
  assert.equal(pass1.mistakeDrillAttempts.length, 1);

  // Pass #2 -> status moves practicing -> resolved
  const pass2 = await repo.recordMistakeDrillAttempt(user.id, {
    mistakeId: tenseMistake.id,
    passed: true,
    userRewrite: 'Yesterday I went to the office',
    expectedAnswer: 'Yesterday I went to the office',
    durationSeconds: 35,
  });
  assert.equal(pass2.updatedMistake.status, 'resolved');
  assert.equal(pass2.updatedMistake.practicePassCount, 2);

  // Report false correction on the second AI-detected mistake
  const flagged = await repo.reportFalseCorrection(user.id, {
    mistakeId: prepMistake.id,
    reported: true,
    reason: 'My original phrasing was natural in context',
  });
  assert.equal(flagged.updatedMistake.falseCorrectionReported, true);
  assert.equal(
    flagged.updatedMistake.falseCorrectionReason,
    'My original phrasing was natural in context'
  );

  // Reload from storage and verify everything persisted cleanly
  const freshRepo = new LocalPersistenceRepository(storage);
  const restored = await freshRepo.restoreSession();
  assert.ok(restored);
  assert.equal(restored.mistakeDrillAttempts.length, 2);
  assert.equal(
    restored.mistakes.find((m) => m.id === tenseMistake.id)?.status,
    'resolved'
  );
  assert.equal(
    restored.mistakes.find((m) => m.id === prepMistake.id)?.falseCorrectionReported,
    true
  );
});

test('LocalPersistenceRepository records Transfer Lab attempts, syncs errors to Mistake Memory, and blocks duplicate XP farming across reload', async () => {
  const storage = createMemoryStorage();
  const repo = new LocalPersistenceRepository(storage);

  const { user, xpLedger: initialLedger } = await repo.register({
    name: 'Arif Rahman',
    email: 'arif@example.com',
    password: 'Password123!',
  });

  // Fresh user starts with strictly 0 XP
  assert.equal(initialLedger.length, 0);

  // 1. Complete a passing Academy lesson -> +50 XP once
  const l1 = await repo.recordLessonAttempt(user.id, {
    lessonId: 'les_svo_order',
    startedAt: '2026-05-04T09:00:00.000Z',
    durationSeconds: 180,
    guidedCorrect: 3,
    guidedTotal: 3,
    independentCorrect: 2,
    independentTotal: 2,
    assessmentCorrect: 3,
    assessmentTotal: 3,
    mistakesLoggedCount: 0,
  });
  assert.equal(l1.newlyAwardedXp.length, 1);
  assert.equal(l1.newlyAwardedXp[0].xpEarned, 50);

  // Repeating the same lesson immediately (same mastery tier) -> 0 duplicate completion XP
  const l1Repeat = await repo.recordLessonAttempt(user.id, {
    lessonId: 'les_svo_order',
    startedAt: '2026-05-04T09:10:00.000Z',
    durationSeconds: 180,
    guidedCorrect: 3,
    guidedTotal: 3,
    independentCorrect: 2,
    independentTotal: 2,
    assessmentCorrect: 3,
    assessmentTotal: 3,
    mistakesLoggedCount: 0,
  });
  // Second pass advances mastery tier (practiced -> reinforced = +25 XP), NOT another +50 completion XP
  assert.equal(
    l1Repeat.xpLedger.filter((e) => e.sourceType === 'lesson_completed').length,
    1
  );

  // 2. Record a failed Transfer Lab attempt -> 0 XP, but mistakes still sync to Mistake Memory
  const trFail = await repo.recordTransferAttempt(user.id, {
    scenarioId: 'workplace_project_delay',
    pressureLevel: 'level_3_open',
    linkedSourceType: 'baseline',
    targetSkillLabelEn: 'Prepositions & Present Perfect',
    targetSkillLabelBn: 'প্রিপজিশন ও Present Perfect',
    userResponse: 'We discussed about the API delay yesterday.',
    inputChannel: 'text_fallback',
    durationSeconds: 45,
    timedOut: false,
    evaluation: {
      task_completion: { score: 55, feedbackEn: 'Incomplete.', feedbackBn: 'অসম্পূর্ণ।' },
      target_grammar_application: { score: 50, feedbackEn: 'Redundant about.', feedbackBn: 'বাড়তি about।' },
      contextual_appropriateness: { score: 70, feedbackEn: 'Polite.', feedbackBn: 'ভদ্র।' },
      response_relevance: { score: 65, feedbackEn: 'Relevant.', feedbackBn: 'প্রাসঙ্গিক।' },
      overall_score: 60,
      passed: false,
      strengths: ['Polite tone'],
      detected_mistakes: [
        {
          category: 'Preposition',
          original: 'discussed about the API delay',
          corrected: 'discussed the API delay',
          explanation_en: 'Do not use about after discuss.',
          explanation_bn: 'discuss-এর পর about বসে না।',
          confidence: 0.95,
          severity: 'high',
        },
      ],
      natural_model_response: 'We discussed the API delay and created a recovery plan.',
      coach_summary_en: 'Fix the redundant preposition and include a recovery plan.',
      coach_summary_bn: 'বাড়তি প্রিপজিশন বাদ দিয়ে সমাধান পরিকল্পনা যোগ করুন।',
    },
  });

  assert.equal(trFail.newlyAwardedXp.length, 0);
  assert.equal(trFail.transferAttempts.length, 1);
  assert.equal(trFail.mistakes.length, 1);
  assert.equal(trFail.activitySummary.completedTransferDrills, 0);

  // 3. Pass the same Transfer Lab scenario at Level 3 -> +80 Verified XP
  const trPass = await repo.recordTransferAttempt(user.id, {
    scenarioId: 'workplace_project_delay',
    pressureLevel: 'level_3_open',
    linkedSourceType: 'mistake_memory',
    linkedSourceId: trFail.mistakes[0].id,
    targetSkillLabelEn: 'Prepositions & Present Perfect',
    targetSkillLabelBn: 'প্রিপজিশন ও Present Perfect',
    userResponse:
      'We have been waiting for the vendor API since Tuesday, and we already discussed a fallback plan with engineering so we can deliver a working demo Thursday and the final release Saturday.',
    inputChannel: 'text_fallback',
    durationSeconds: 50,
    timedOut: false,
    evaluation: {
      task_completion: { score: 88, feedbackEn: 'Complete.', feedbackBn: 'সম্পূর্ণ।' },
      target_grammar_application: { score: 90, feedbackEn: 'Accurate.', feedbackBn: 'নির্ভুল।' },
      contextual_appropriateness: { score: 86, feedbackEn: 'Professional.', feedbackBn: 'পেশাদার।' },
      response_relevance: { score: 88, feedbackEn: 'Direct.', feedbackBn: 'সরাসরি।' },
      overall_score: 88,
      passed: true,
      strengths: ['No redundant preposition after discuss'],
      detected_mistakes: [],
      natural_model_response: 'Clear and professional update.',
      coach_summary_en: 'Excellent transfer under open-ended pressure.',
      coach_summary_bn: 'উন্মুক্ত ধাপে দারুণ বাস্তব প্রয়োগ।',
    },
  });

  assert.equal(trPass.newlyAwardedXp.length, 1);
  assert.equal(trPass.newlyAwardedXp[0].xpEarned, 80);
  assert.equal(trPass.activitySummary.completedTransferDrills, 1);

  // 4. Re-passing the EXACT same scenario + Level 3 MUST NOT farm duplicate XP
  const trPassDuplicate = await repo.recordTransferAttempt(user.id, {
    scenarioId: 'workplace_project_delay',
    pressureLevel: 'level_3_open',
    linkedSourceType: 'mistake_memory',
    targetSkillLabelEn: 'Prepositions & Present Perfect',
    targetSkillLabelBn: 'প্রিপজিশন ও Present Perfect',
    userResponse: 'We have been waiting since Tuesday and discussed a fallback plan.',
    inputChannel: 'text_fallback',
    durationSeconds: 40,
    timedOut: false,
    evaluation: trPass.transferAttempt.evaluation,
  });

  assert.equal(trPassDuplicate.newlyAwardedXp.length, 0);
  assert.equal(
    trPassDuplicate.xpLedger.filter((e) => e.sourceType === 'transfer_lab_passed').length,
    1
  );

  // 5. Reload from storage -> verify Transfer attempts & exact XP Ledger survive cleanly
  const freshRepo = new LocalPersistenceRepository(storage);
  const restored = await freshRepo.restoreSession();
  assert.ok(restored);
  assert.equal(restored.transferAttempts.length, 3);
  assert.equal(restored.xpLedger.length, 3); // +50 lesson +25 reinforced +80 transfer = 155 XP
  const totalXp = restored.xpLedger.reduce((sum, e) => sum + e.xpEarned, 0);
  assert.equal(totalXp, 155);
});



