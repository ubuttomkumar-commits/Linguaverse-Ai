import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACEHOLDER_CONTACT_EMAIL,
  SUPPLIED_LANDING_COPY,
  resolveLandingRoutes,
} from './suppliedLandingCopy';
import { analyzeSampleSentence } from './sampleAnalyzer';
import {
  buildEnrichedDemoGuidance,
  validateLandingDemoSentence,
} from './landingDemoEnricher';
import { LANDING_3D_CONTENT } from './landing3dContent';

test('resolveLandingRoutes maps unauthenticated visitors to real signup routes', () => {
  const routes = resolveLandingRoutes(null, null);
  assert.equal(routes.isSignedIn, false);
  assert.equal(routes.primaryAuthRoute, '/register');
  assert.equal(routes.freeSignupRoute, '/register?plan=free');
  assert.equal(routes.speakingRoute, '/register');
  assert.equal(routes.transferLabRoute, '/register');
  assert.equal(routes.settingsRoute, '/register');
});

test('resolveLandingRoutes gates unverified and non-onboarded accounts properly', () => {
  const unverified = resolveLandingRoutes({ emailVerified: false }, null);
  assert.equal(unverified.primaryAuthRoute, '/verify-email');
  assert.equal(unverified.speakingRoute, '/verify-email');

  const needsOnboarding = resolveLandingRoutes(
    { emailVerified: true },
    { onboardingCompleted: false }
  );
  assert.equal(needsOnboarding.primaryAuthRoute, '/onboarding');
  assert.equal(needsOnboarding.transferLabRoute, '/onboarding');
});

test('resolveLandingRoutes connects onboarded learners to verified /app/* routes', () => {
  const ready = resolveLandingRoutes(
    { emailVerified: true },
    { onboardingCompleted: true }
  );
  assert.equal(ready.isSignedIn, true);
  assert.equal(ready.primaryAuthRoute, '/app');
  assert.equal(ready.speakingRoute, '/app/speak');
  assert.equal(ready.transferLabRoute, '/app/transfer-lab');
  assert.equal(ready.improveRoute, '/app/improve');
  assert.equal(ready.progressRoute, '/app/progress');
  assert.equal(ready.settingsRoute, '/app/settings');
});

test('SUPPLIED_LANDING_COPY maintains EN/BN structural parity across all 14 sections', () => {
  const en = SUPPLIED_LANDING_COPY.en;
  const bn = SUPPLIED_LANDING_COPY.bn;

  assert.equal(en.hero.orbitNodes.length, 4);
  assert.equal(bn.hero.orbitNodes.length, 4);
  assert.equal(en.problem.chapters.length, 5);
  assert.equal(bn.problem.chapters.length, 5);
  assert.equal(en.intelligence.items.length, 6);
  assert.equal(bn.intelligence.items.length, 6);
  assert.equal(en.speaking.scenarios.length, 3);
  assert.equal(bn.speaking.scenarios.length, 3);
  assert.equal(en.transfer.items.length, 6);
  assert.equal(bn.transfer.items.length, 6);
  assert.equal(en.banglaAdvantage.levels.length, 3);
  assert.equal(bn.banglaAdvantage.levels.length, 3);
  assert.equal(en.journey.stages.length, 5);
  assert.equal(bn.journey.stages.length, 5);
  assert.equal(en.privacy.pillars.length, 4);
  assert.equal(bn.privacy.pillars.length, 4);
  assert.equal(en.faq.items.length, 6);
  assert.equal(bn.faq.items.length, 6);

  // Exactly 5 scenarios are live in Transfer Lab today; Travel is an honest preview
  assert.equal(en.transfer.items.filter((s) => s.isLiveInApp).length, 5);
  assert.equal(bn.transfer.items.filter((s) => s.isLiveInApp).length, 5);

  // Placeholder contact email stays clearly identifiable
  assert.equal(en.finalCta.contactEmail, PLACEHOLDER_CONTACT_EMAIL);
});

test('landingDemoEnricher validates input and enriches "I am agree with you." with natural alternatives', () => {
  assert.equal(validateLandingDemoSentence('').valid, false);
  assert.equal(validateLandingDemoSentence('Hi').valid, false);
  assert.equal(validateLandingDemoSentence('I am agree with you.').valid, true);

  const analysis = analyzeSampleSentence('I am agree with you.');
  assert.equal(analysis.hasDetectedMistake, true);
  assert.equal(analysis.correctedSentence, 'I agree with you.');

  const enriched = buildEnrichedDemoGuidance(analysis);
  assert.ok(enriched.naturalAlternatives.length >= 2);
  assert.match(enriched.contextLabelEn, /Workplace/i);

  // Verify every landing demo preset resolves deterministically without stalling
  for (const preset of SUPPLIED_LANDING_COPY.en.demo.presets) {
    const res = analyzeSampleSentence(preset);
    assert.equal(res.hasDetectedMistake, true, `Expected preset "${preset}" to detect mistake`);
    assert.notEqual(res.correctedSentence, preset);
  }
  assert.equal(
    analyzeSampleSentence('We discussed about the new project.').correctedSentence,
    'We discussed the new project.'
  );
});

test('LANDING_3D_CONTENT enforces EN/BN parity for 3D Hero deck, 7-step Orbital Loop, and 6 3D Feature Cards', () => {
  const en = LANDING_3D_CONTENT.en;
  const bn = LANDING_3D_CONTENT.bn;

  assert.equal(en.heroDeck.panels.length, 4);
  assert.equal(bn.heroDeck.panels.length, 4);

  assert.deepEqual(
    en.loop.steps.map((s) => s.code),
    ['DETECT', 'EXPLAIN', 'PERSONALIZE', 'PRACTICE', 'TRANSFER', 'RETEST', 'IMPROVE']
  );
  assert.equal(bn.loop.steps.length, 7);

  assert.deepEqual(
    en.features3D.items.map((f) => f.title),
    [
      'Communication DNA',
      'Mistake Memory Engine',
      'AI Speaking Studio',
      'Transfer Lab',
      'Evidence-Based Progress',
      'Adaptive Learning',
    ]
  );
  assert.equal(bn.features3D.items.length, 6);

  // Explicit demonstration disclaimer present in both EN and BN
  assert.match(en.demoDashboard.sampleBadge, /Sample Preview/i);
  assert.ok(bn.demoDashboard.sampleMetricDisclaimer.length > 20);
});
