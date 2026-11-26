import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRealFinancialMetrics,
  getPlanEntitlements,
  getQuotedPlanAmountCents,
} from './subscriptionEntitlementsEngine';

test('getPlanEntitlements differentiates Free, Pro, and Institution quotas accurately', () => {
  const free = getPlanEntitlements('free');
  const pro = getPlanEntitlements('pro');
  const inst = getPlanEntitlements('institution');
  assert.equal(free.monthlyPriceUsd, 0);
  assert.ok(pro.dailyAiSpeakingTurns > free.dailyAiSpeakingTurns);
  assert.ok(inst.dailyAiSpeakingTurns > pro.dailyAiSpeakingTurns);
  assert.equal(getQuotedPlanAmountCents('pro', 'monthly'), 1200);
  assert.equal(getQuotedPlanAmountCents('pro', 'yearly'), 10800);
});

test('computeRealFinancialMetrics never counts pending_provider requests as actual revenue', () => {
  const metrics = computeRealFinancialMetrics({
    totalUsersCount: 10,
    subscriptions: [
      {
        id: 'sub_1',
        userId: 'u1',
        planSlug: 'pro',
        billingInterval: 'monthly',
        status: 'pending_provider',
        provider: 'unconfigured',
        createdAt: '2026-11-25T00:00:00.000Z',
        updatedAt: '2026-11-25T00:00:00.000Z',
      },
    ],
    invoices: [
      {
        id: 'inv_1',
        subscriptionId: 'sub_1',
        userId: 'u1',
        planSlug: 'pro',
        billingInterval: 'monthly',
        amountCents: 1200,
        currency: 'USD',
        status: 'pending_provider',
        provider: 'unconfigured',
        createdAt: '2026-11-25T00:00:00.000Z',
        updatedAt: '2026-11-25T00:00:00.000Z',
      },
    ],
    totalAiCostUsd: 0.15,
  });

  assert.equal(metrics.activePaidSubscriptions, 0);
  assert.equal(metrics.pendingProviderRequests, 1);
  assert.equal(metrics.actualMrrUsd, 0);
  assert.equal(metrics.actualTotalCollectedUsd, 0);
  assert.equal(metrics.arppuUsd, 0);
});

test('computeRealFinancialMetrics calculates MRR, ARPPU, churn, and failure rate from settled records', () => {
  const metrics = computeRealFinancialMetrics({
    totalUsersCount: 4,
    subscriptions: [
      {
        id: 's1',
        userId: 'u1',
        planSlug: 'pro',
        billingInterval: 'monthly',
        status: 'active',
        provider: 'stripe',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
      {
        id: 's2',
        userId: 'u2',
        planSlug: 'pro',
        billingInterval: 'monthly',
        status: 'canceled',
        provider: 'stripe',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-11-10T00:00:00.000Z',
      },
    ],
    invoices: [
      {
        id: 'i1',
        subscriptionId: 's1',
        userId: 'u1',
        planSlug: 'pro',
        billingInterval: 'monthly',
        amountCents: 1200,
        currency: 'USD',
        status: 'paid',
        provider: 'stripe',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
      {
        id: 'i2',
        subscriptionId: 's2',
        userId: 'u2',
        planSlug: 'pro',
        billingInterval: 'monthly',
        amountCents: 1200,
        currency: 'USD',
        status: 'failed',
        provider: 'stripe',
        failureReason: 'card_declined',
        createdAt: '2026-11-05T00:00:00.000Z',
        updatedAt: '2026-11-05T00:00:00.000Z',
      },
    ],
    totalAiCostUsd: 2.0,
  });

  assert.equal(metrics.activePaidSubscriptions, 1);
  assert.equal(metrics.actualMrrUsd, 12);
  assert.equal(metrics.actualTotalCollectedUsd, 12);
  assert.equal(metrics.arppuUsd, 12);
  assert.equal(metrics.conversionRatePercent, 25);
  assert.equal(metrics.churnRatePercent, 50);
  assert.equal(metrics.paymentFailureRatePercent, 50);
  assert.equal(metrics.contributionMarginUsd, 10);
});
