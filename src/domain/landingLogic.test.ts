import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSampleSentence, SANDBOX_SAMPLE_CHIPS } from './sampleAnalyzer';
import { recommendStartingPath } from './landingQuiz';

test('analyzes all 4 classic Bangla-speaker sandbox chips accurately', () => {
  assert.equal(SANDBOX_SAMPLE_CHIPS.length, 4);

  const chip1 = analyzeSampleSentence('Yesterday I go to office late because traffic jam');
  assert.equal(chip1.hasDetectedMistake, true);
  assert.equal(chip1.errorCategory, 'Verb Tense');
  assert.equal(
    chip1.correctedSentence,
    'Yesterday I went to the office late because of a traffic jam.'
  );
  assert.ok(chip1.explanationBn.includes('went'));

  const chip2 = analyzeSampleSentence('I am agree with your decision');
  assert.equal(chip2.hasDetectedMistake, true);
  assert.equal(chip2.errorCategory, 'Sentence Structure');
  assert.equal(chip2.correctedSentence, 'I agree with your decision.');

  const chip3 = analyzeSampleSentence('He is senior than me');
  assert.equal(chip3.hasDetectedMistake, true);
  assert.equal(chip3.errorCategory, 'Preposition');
  assert.equal(chip3.correctedSentence, 'He is senior to me.');

  const chip4 = analyzeSampleSentence('Can you repeat again please?');
  assert.equal(chip4.hasDetectedMistake, true);
  assert.equal(chip4.errorCategory, 'Redundancy');
  assert.equal(chip4.correctedSentence, 'Can you repeat that, please?');
});

test('detects duration with "since three years" and converts both tense and preposition', () => {
  const result = analyzeSampleSentence('I am working here since three years');
  assert.equal(result.hasDetectedMistake, true);
  assert.equal(result.correctedSentence, 'I have been working here for three years.');
});

test('mini-quiz recommends appropriate starting path for all comfort levels and goals', () => {
  const basicInterview = recommendStartingPath('freeze_basic', 'job_interview');
  assert.equal(basicInterview.cefrBand, 'Pre-A1 → A1 Foundation');
  assert.ok(basicInterview.startingPressureEn.includes('Level 1'));
  assert.ok(basicInterview.ctaPath.includes('/register'));

  const bridgeOffice = recommendStartingPath('understand_hesitate', 'office_meetings');
  assert.equal(bridgeOffice.cefrBand, 'A2 → B1 Bridge');
  assert.ok(bridgeOffice.startingPressureEn.includes('Level 2'));

  const polishDaily = recommendStartingPath('speak_with_errors', 'daily_confidence');
  assert.equal(polishDaily.cefrBand, 'B1 → B2+ Polish');
  assert.ok(polishDaily.startingPressureEn.includes('Level 4'));
});
