import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMistakeCategoryDonut,
  buildMistakeMemoryOverview,
  buildMistakeTrendSeries,
  buildNeuralRelationshipMap,
  buildSmartRevisionSchedule,
  classifyExtendedMistakeCategory,
  filterAndSearchMistakes,
} from './mistakeAnalyticsEngine';
import type { MistakeDrillAttemptRecord, MistakeMemoryItem } from '../types/domain';

function makeMistake(overrides: Partial<MistakeMemoryItem>): MistakeMemoryItem {
  return {
    id: overrides.id ?? 'm_1',
    userId: overrides.userId ?? 'u_1',
    source: overrides.source ?? 'speaking_studio',
    domain: overrides.domain ?? 'grammar',
    category: overrides.category ?? 'Tense',
    userExample: overrides.userExample ?? 'Yesterday I go to office.',
    correctedExample: overrides.correctedExample ?? 'Yesterday I went to the office.',
    patternEn: overrides.patternEn ?? 'Past simple verb form after yesterday',
    patternBn: overrides.patternBn ?? 'গতকালের ঘটনায় past tense ব্যবহার',
    explanationEn: overrides.explanationEn ?? 'Use past simple went for completed past time.',
    explanationBn: overrides.explanationBn ?? 'অতীতের নির্দিষ্ট সময়ের জন্য went বসবে।',
    occurrences: overrides.occurrences ?? 1,
    severity: overrides.severity ?? 'medium',
    status: overrides.status ?? 'active',
    createdAt: overrides.createdAt ?? '2026-11-20T09:00:00.000Z',
    lastSeenAt: overrides.lastSeenAt ?? overrides.createdAt ?? '2026-11-20T09:00:00.000Z',
    ...overrides,
  };
}

describe('mistakeAnalyticsEngine', () => {
  const NOW = '2026-11-22T12:00:00.000Z';

  it('returns honest empty metrics with null percentages when no mistakes exist', () => {
    const overview = buildMistakeMemoryOverview([], [], NOW);
    assert.equal(overview.totalValid, 0);
    assert.equal(overview.recurringCount, 0);
    assert.equal(overview.improvementRatePercent, null);
    assert.equal(overview.dueForReviewCount, 0);
    assert.deepEqual(overview.sparklines.totalLogged, [0, 0, 0, 0, 0, 0, 0]);
    for (const pillar of overview.heroPillars) {
      assert.equal(pillar.mistakeCount, 0);
      assert.equal(pillar.sharePercent, null);
      assert.equal(pillar.masteryPercent, null);
    }

    const graph = buildNeuralRelationshipMap([]);
    assert.equal(graph.isEmpty, true);
    assert.ok(graph.nodes.length >= 5);
  });

  it('classifies pronunciation/clarity mistakes without breaking canonical categories', () => {
    assert.equal(
      classifyExtendedMistakeCategory({
        category: 'Pronunciation / Clarity',
        domain: 'sentence_construction',
      }),
      'pronunciation'
    );
    assert.equal(
      classifyExtendedMistakeCategory({ category: 'Preposition', domain: 'grammar' }),
      'prepositions'
    );
    assert.equal(
      classifyExtendedMistakeCategory({ category: 'Collocation', domain: 'vocabulary' }),
      'vocabulary'
    );
  });

  it('computes real KPI counts, recurring counts, improvement rate, and excludes false-flagged mistakes', () => {
    const mistakes: MistakeMemoryItem[] = [
      makeMistake({
        id: 'm1',
        category: 'Tense',
        occurrences: 3,
        status: 'active',
        createdAt: '2026-11-20T10:00:00.000Z',
        nextReviewAt: '2026-11-21T10:00:00.000Z',
      }),
      makeMistake({
        id: 'm2',
        category: 'Vocabulary',
        domain: 'vocabulary',
        source: 'lesson_guided',
        occurrences: 2,
        status: 'practicing',
        createdAt: '2026-11-21T10:00:00.000Z',
        nextReviewAt: '2026-11-25T10:00:00.000Z',
      }),
      makeMistake({
        id: 'm3',
        category: 'Pronunciation / Clarity',
        domain: 'sentence_construction',
        source: 'speaking_studio',
        occurrences: 1,
        status: 'resolved',
        createdAt: '2026-11-22T08:00:00.000Z',
        nextReviewAt: '2026-11-29T08:00:00.000Z',
      }),
      makeMistake({
        id: 'm4',
        category: 'Preposition',
        occurrences: 4,
        status: 'active',
        falseCorrectionReported: true,
      }),
    ];

    const drills: MistakeDrillAttemptRecord[] = [
      {
        id: 'd1',
        userId: 'u_1',
        mistakeId: 'm2',
        passed: true,
        userRewrite: 'make a decision',
        expectedAnswer: 'make a decision',
        durationSeconds: 18,
        timestamp: '2026-11-21T11:00:00.000Z',
      },
      {
        id: 'd2',
        userId: 'u_1',
        mistakeId: 'm3',
        passed: true,
        userRewrite: 'schedule',
        expectedAnswer: 'schedule',
        durationSeconds: 12,
        timestamp: '2026-11-22T09:00:00.000Z',
      },
    ];

    const overview = buildMistakeMemoryOverview(mistakes, drills, NOW);
    assert.equal(overview.totalValid, 3);
    assert.equal(overview.reportedCount, 1);
    assert.equal(overview.activeCount, 1);
    assert.equal(overview.practicingCount, 1);
    assert.equal(overview.resolvedCount, 1);
    assert.equal(overview.recurringCount, 2);
    assert.equal(overview.dueForReviewCount, 1);
    // (1 resolved + 0.5 practicing) / 3 = 50%
    assert.equal(overview.improvementRatePercent, 50);
    assert.equal(overview.passedDrillsCount, 2);
  });

  it('builds accurate donut segments and gates multi-day trends on >= 2 active days', () => {
    const singleDayMistakes = [
      makeMistake({ id: 'm1', category: 'Tense', createdAt: '2026-11-22T08:00:00.000Z' }),
      makeMistake({ id: 'm2', category: 'Tense', createdAt: '2026-11-22T09:00:00.000Z' }),
      makeMistake({ id: 'm3', category: 'Preposition', createdAt: '2026-11-22T10:00:00.000Z' }),
    ];

    const donut = buildMistakeCategoryDonut(singleDayMistakes);
    assert.equal(donut.total, 3);
    assert.equal(donut.segments.length, 2);
    assert.equal(donut.segments[0].id, 'verb_tense');
    assert.equal(donut.segments[0].count, 2);
    assert.equal(donut.segments[0].percent, 67);

    const singleDayTrend = buildMistakeTrendSeries(singleDayMistakes, [], 7, NOW);
    assert.equal(singleDayTrend.activeDaysCount, 1);
    assert.equal(singleDayTrend.hasSufficientTrendData, false);
    assert.equal(singleDayTrend.totalLoggedInRange, 3);

    const multiDayMistakes = [
      ...singleDayMistakes,
      makeMistake({ id: 'm4', category: 'Vocabulary', createdAt: '2026-11-20T10:00:00.000Z' }),
    ];
    const multiDayTrend = buildMistakeTrendSeries(multiDayMistakes, [], 7, NOW);
    assert.equal(multiDayTrend.activeDaysCount, 2);
    assert.equal(multiDayTrend.hasSufficientTrendData, true);
  });

  it('builds neural relationship graph, smart revision schedule, and multi-facet search/sorting', () => {
    const mistakes: MistakeMemoryItem[] = [
      makeMistake({
        id: 'm1',
        category: 'Tense',
        occurrences: 4,
        severity: 'high',
        status: 'active',
        patternEn: 'Past tense verb drop',
        userExample: 'Yesterday I go home',
        correctedExample: 'Yesterday I went home',
        nextReviewAt: '2026-11-20T09:00:00.000Z',
      }),
      makeMistake({
        id: 'm2',
        category: 'Sentence Structure',
        occurrences: 2,
        status: 'practicing',
        patternEn: 'Auxiliary verb missing in questions',
        userExample: 'Where you going?',
        correctedExample: 'Where are you going?',
        nextReviewAt: '2026-11-22T10:00:00.000Z',
      }),
      makeMistake({
        id: 'm3',
        category: 'Preposition',
        occurrences: 1,
        status: 'practicing',
        patternEn: 'No about after discuss',
        userExample: 'We discussed about salary',
        correctedExample: 'We discussed salary',
        nextReviewAt: '2026-11-25T10:00:00.000Z',
      }),
    ];

    const graph = buildNeuralRelationshipMap(mistakes);
    assert.equal(graph.isEmpty, false);
    assert.ok(graph.nodes.some((n) => n.kind === 'core'));
    assert.ok(graph.nodes.some((n) => n.id === 'cat:verb_tense'));
    assert.ok(graph.nodes.some((n) => n.id === 'mistake:m1'));
    // Bangla-L1 transfer link between verb_tense and sentence_structure should be present
    assert.ok(graph.edges.some((e) => e.kind === 'transfer_link'));

    const schedule = buildSmartRevisionSchedule(mistakes, NOW);
    assert.equal(schedule.overdue.length, 1);
    assert.equal(schedule.dueToday.length, 1);
    assert.equal(schedule.upcomingWeek.length, 1);
    assert.equal(schedule.dueNowTotal, 2);
    assert.equal(schedule.topRecommended?.mistake.id, 'm1');
    assert.equal(schedule.recurringSpotlight.length, 2);

    const searchResults = filterAndSearchMistakes(mistakes, {
      searchText: 'salary',
      status: 'all',
      category: 'all',
      recurringOnly: false,
      showReported: false,
      sortBy: 'priority',
      nowIso: NOW,
    });
    assert.equal(searchResults.length, 1);
    assert.equal(searchResults[0].id, 'm3');

    const recurringOnly = filterAndSearchMistakes(mistakes, {
      searchText: '',
      status: 'all',
      category: 'all',
      recurringOnly: true,
      showReported: false,
      sortBy: 'recurring',
      nowIso: NOW,
    });
    assert.equal(recurringOnly.length, 2);
    assert.equal(recurringOnly[0].id, 'm1');
  });
});
