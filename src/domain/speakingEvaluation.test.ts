import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpeakingSystemInstruction,
  buildSpeakingTurnPrompt,
  mapMistakeCategoryToDomain,
  normalizeSpeakingEvaluation,
} from './speakingEvaluation.ts';
import { SPEAKING_PRESSURE_LEVELS, SPEAKING_SCENARIOS } from './speakingScenarios.ts';

test('defines all 10 configured speaking scenarios (preserving all 7 core modes) and 5 Pressure Ladder levels', () => {
  assert.equal(SPEAKING_SCENARIOS.length, 10);
  const modeIds = SPEAKING_SCENARIOS.map((s) => s.id);
  for (const expected of [
    'daily_conversations',
    'self_introduction',
    'job_interviews',
    'workplace_communication',
    'travel',
    'customer_service',
    'unexpected_questions',
    'academic_discussion',
    'presentation_pitch',
    'travel_airport_assistance',
  ]) {
    assert.ok(modeIds.includes(expected as (typeof modeIds)[number]), `Missing mode: ${expected}`);
  }

  assert.equal(SPEAKING_PRESSURE_LEVELS.length, 5);
  assert.deepEqual(
    SPEAKING_PRESSURE_LEVELS.map((p) => p.id),
    [
      'level_1_controlled',
      'level_2_guided',
      'level_3_open',
      'level_4_twist',
      'level_5_timed_high_stakes',
    ]
  );
  assert.equal(SPEAKING_PRESSURE_LEVELS[4].timeLimitSeconds, 45);
});

test('system instruction enforces Bangla explanations and bans fabricated pronunciation scores', () => {
  const sys = buildSpeakingSystemInstruction({
    modeId: 'job_interviews',
    pressureLevel: 'time_limited',
    userTranscript: 'Yesterday I go to office and discuss about the project.',
    inputChannel: 'voice_stt',
    learnerLevel: 'A2',
    explanationLanguage: 'both',
    history: [],
    timedOut: false,
  });

  assert.match(sys, /Job Interviews/);
  assert.match(sys, /Bangla/i);
  assert.match(sys, /NEVER invent or fabricate a percentage pronunciation score/i);

  const prompt = buildSpeakingTurnPrompt({
    modeId: 'job_interviews',
    pressureLevel: 'time_limited',
    userTranscript: 'Yesterday I go to office.',
    inputChannel: 'text_fallback',
    learnerLevel: 'A2',
    explanationLanguage: 'bn',
    history: [{ role: 'ai', text: 'Tell me about a project.' }],
    timedOut: true,
  });

  assert.match(prompt, /Typed text fallback/);
  assert.match(prompt, /45-second response timer expired/);
});

test('normalizeSpeakingEvaluation strips fabricated numeric pronunciation scores and clamps confidence', () => {
  const normalized = normalizeSpeakingEvaluation(
    {
      ai_reply: 'That sounds productive! What was the biggest lesson you learned?',
      ai_reply_bn_hint: 'চমৎকার! সেখান থেকে আপনি কী শিখেছেন?',
      corrected_transcript: 'Yesterday I went to the office and discussed the project.',
      correct_elements: ['Clear past context with "Yesterday"'],
      mistakes: [
        {
          category: 'Tense',
          original: 'I go to office',
          corrected: 'I went to the office',
          explanation_en: 'Use past simple "went" with "yesterday".',
          explanation_bn: '"Yesterday" থাকায় "go" নয়, "went" বসবে।',
          confidence: 1.45,
          severity: 'high',
        },
        {
          // Identical original/corrected should be filtered out as a non-mistake
          category: 'Grammar',
          original: 'the project',
          corrected: 'the project',
          explanation_en: 'No change',
          explanation_bn: 'কোনো পরিবর্তন নেই',
          confidence: 0.5,
          severity: 'low',
        },
      ],
      natural_alternative: 'Yesterday I went into the office to discuss the project with my team.',
      pronunciation_note: 'Your pronunciation is 88% accurate and very clear.',
    },
    'Yesterday I go to office and discuss about the project.',
    'voice_stt'
  );

  assert.equal(normalized.mistakes.length, 1);
  assert.equal(normalized.mistakes[0].confidence, 1);
  assert.equal(normalized.mistakes[0].severity, 'high');
  assert.doesNotMatch(normalized.pronunciation_note, /88%/);
  assert.match(normalized.pronunciation_note, /not an acoustic phoneme score/i);
});

test('normalizeSpeakingEvaluation clarifies typed fallback mode honestly', () => {
  const normalized = normalizeSpeakingEvaluation(
    {
      ai_reply: 'Great point! How did your team respond?',
      corrected_transcript: 'We finished on time.',
      correct_elements: ['Accurate past tense'],
      mistakes: [],
      natural_alternative: 'We wrapped up right on schedule.',
      pronunciation_note: 'Good sentence rhythm.',
    },
    'We finished on time.',
    'text_fallback'
  );

  assert.equal(normalized.mistakes.length, 0);
  assert.match(normalized.pronunciation_note, /Typed fallback mode/i);
  assert.equal(mapMistakeCategoryToDomain('Collocation'), 'vocabulary');
  assert.equal(mapMistakeCategoryToDomain('Word Order'), 'sentence_construction');
  assert.equal(mapMistakeCategoryToDomain('Tense'), 'grammar');
});
