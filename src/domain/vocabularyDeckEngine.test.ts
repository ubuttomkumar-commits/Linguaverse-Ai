import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNextVocabReview,
  isVocabCardDue,
  normalizeVocabWord,
  summarizeVocabDeck,
  validateVocabularyInput,
  VOCAB_SRS_ALGORITHM_VERSION,
  type VocabularyCardRecord,
} from './vocabularyDeckEngine';

function makeCard(overrides: Partial<VocabularyCardRecord> = {}): VocabularyCardRecord {
  const now = '2026-11-25T10:00:00.000Z';
  return {
    id: 'voc_1',
    userId: 'usr_1',
    word: 'Resilient',
    wordNormalized: 'resilient',
    phoneticHint: 'ri-ZIL-yuhnt',
    meaningEn: 'Able to recover quickly from difficulties',
    meaningBn: 'কঠিন পরিস্থিতি থেকে দ্রুত ঘুরে দাঁড়াতে সক্ষম',
    exampleSentence: 'A resilient speaker stays calm during follow-up questions.',
    sourceType: 'manual',
    difficulty: 'medium',
    reviewCount: 0,
    passCount: 0,
    consecutivePasses: 0,
    intervalDays: 1,
    masteryStatus: 'new',
    algorithmVersion: VOCAB_SRS_ALGORITHM_VERSION,
    lastReviewedAt: null,
    nextReviewAt: now,
    reviewHistory: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('validateVocabularyInput normalizes words and rejects invalid empty input', () => {
  const invalid = validateVocabularyInput({ word: 'a', meaningEn: '', exampleSentence: '' });
  assert.equal(invalid.ok, false);

  const valid = validateVocabularyInput({
    word: '  Follow Up! ',
    meaningEn: 'Check progress after an earlier discussion',
    meaningBn: 'পূর্ববর্তী আলোচনার পর অগ্রগতি যাচাই করা',
    exampleSentence: 'I will follow up with the hiring manager tomorrow.',
    sourceType: 'speaking_studio',
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.cleaned?.wordNormalized, 'follow up');
  assert.equal(normalizeVocabWord('  "Clarify" '), 'clarify');
});

test('computeNextVocabReview never grants mastery after a single pass and requires delayed recall', () => {
  let card = makeCard();
  // Pass 1 (good) -> learning, interval 2d
  card = computeNextVocabReview(card, 'good', 'standard', '2026-11-25T10:00:00.000Z');
  assert.equal(card.masteryStatus, 'learning');
  assert.equal(card.consecutivePasses, 1);
  assert.equal(card.intervalDays, 2);

  // Pass 2 (good) -> reviewing, interval 6d
  card = computeNextVocabReview(card, 'good', 'standard', '2026-11-27T10:00:00.000Z');
  assert.equal(card.masteryStatus, 'reviewing');
  assert.equal(card.consecutivePasses, 2);
  assert.equal(card.intervalDays, 6);

  // Pass 3 (good) -> mastered, interval 14d (6 * 2.4 = 14)
  card = computeNextVocabReview(card, 'good', 'standard', '2026-12-03T10:00:00.000Z');
  assert.equal(card.masteryStatus, 'mastered');
  assert.equal(card.consecutivePasses, 3);
  assert.equal(card.intervalDays, 14);
  assert.equal(card.reviewHistory.length, 3);

  // Lapse ('again') resets consecutivePasses and drops back to learning (1d)
  const lapsed = computeNextVocabReview(card, 'again', 'standard', '2026-12-17T10:00:00.000Z');
  assert.equal(lapsed.masteryStatus, 'learning');
  assert.equal(lapsed.consecutivePasses, 0);
  assert.equal(lapsed.intervalDays, 1);
});

test('summarizeVocabDeck returns honest null retention when 0 reviews exist and accurate counts otherwise', () => {
  const nowMs = Date.parse('2026-11-26T00:00:00.000Z');
  const emptySummary = summarizeVocabDeck([], nowMs);
  assert.equal(emptySummary.totalCards, 0);
  assert.equal(emptySummary.retentionRatePercent, null);

  const dueCard = makeCard({ nextReviewAt: '2026-11-25T00:00:00.000Z', reviewCount: 2, passCount: 1 });
  const futureCard = makeCard({
    id: 'voc_2',
    word: 'Clarify',
    wordNormalized: 'clarify',
    nextReviewAt: '2026-12-05T00:00:00.000Z',
    masteryStatus: 'mastered',
    reviewCount: 4,
    passCount: 4,
  });

  assert.equal(isVocabCardDue(dueCard, nowMs), true);
  assert.equal(isVocabCardDue(futureCard, nowMs), false);

  const summary = summarizeVocabDeck([dueCard, futureCard], nowMs);
  assert.equal(summary.totalCards, 2);
  assert.equal(summary.dueNowCount, 1);
  assert.equal(summary.masteredCount, 1);
  assert.equal(summary.retentionRatePercent, 83); // 5 / 6
});
