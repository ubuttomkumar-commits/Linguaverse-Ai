import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSampleSentence } from './sampleAnalyzer';

test('detects past tense omission in "I go to market yesterday"', () => {
  const result = analyzeSampleSentence('I go to market yesterday');
  assert.equal(result.hasDetectedMistake, true);
  assert.equal(result.correctedSentence, 'I went to the market yesterday.');
  assert.equal(result.memoryTag, 'L1-TENSE-PAST-01');
  assert.ok(result.explanationBn.includes('went'));
});

test('detects third-person singular auxiliary and possessive error', () => {
  const result = analyzeSampleSentence("He don't know my brother name");
  assert.equal(result.hasDetectedMistake, true);
  assert.equal(result.correctedSentence, "He doesn't know my brother's name.");
  assert.equal(result.memoryTag, 'L1-AGREEMENT-3SG-02');
});

test('detects present continuous with since', () => {
  const result = analyzeSampleSentence('I am working here since 2022');
  assert.equal(result.hasDetectedMistake, true);
  assert.equal(result.correctedSentence, 'I have been working here since 2022.');
  assert.equal(result.memoryTag, 'L1-ASPECT-SINCE-03');
});

test('detects redundant preposition after discuss', () => {
  const result = analyzeSampleSentence('We need to discuss about the budget');
  assert.equal(result.hasDetectedMistake, true);
  assert.equal(result.correctedSentence, 'We need to discuss the budget.');
});

test('handles clean sentence honestly without false positives', () => {
  const result = analyzeSampleSentence('I went to the market yesterday.');
  assert.equal(result.hasDetectedMistake, false);
  assert.equal(result.memoryTag, 'SAMPLE-CLEAN');
});
