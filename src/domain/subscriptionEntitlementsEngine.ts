import type { SubscriptionPlan } from '../types/domain';

export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionLifecycleStatus =
  | 'free_active'
  | 'pending_provider'
  | 'active'
  | 'past_due'
  | 'canceled';
export type InvoiceStatus =
  | 'pending_provider'
  | 'paid'
  | 'failed'
  | 'refund_requested'
  | 'refunded';

export interface PlanEntitlements {
  planSlug: SubscriptionPlan;
  nameEn: string;
  nameBn: string;
  monthlyPriceUsd: number;
  yearlyMonthlyPriceUsd: number;
  dailyAiSpeakingTurns: number;
  dailyTransferScenarios: number;
  vocabularyDeckLimit: number;
  replayRetentionDays: number;
  advancedDnaAnalytics: boolean;
  prioritySupport: boolean;
  highlightsEn: string[];
  highlightsBn: string[];
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planSlug: SubscriptionPlan;
  billingInterval: BillingInterval;
  status: 'pending_provider' | 'active' | 'past_due' | 'canceled';
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInvoiceRecord {
  id: string;
  subscriptionId: string;
  userId: string;
  planSlug: SubscriptionPlan;
  billingInterval: BillingInterval;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  provider: string;
  failureReason?: string | null;
  refundReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketRecord {
  id: string;
  userId: string;
  userEmail: string;
  category: 'billing' | 'technical' | 'curriculum' | 'abuse_appeal' | 'privacy';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  adminResponse?: string | null;
  handledBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RealFinancialMetrics {
  activePaidSubscriptions: number;
  pendingProviderRequests: number;
  canceledSubscriptions: number;
  pastDueSubscriptions: number;
  paidInvoicesCount: number;
  failedInvoicesCount: number;
  refundRequestedCount: number;
  refundedCount: number;
  actualMrrUsd: number;
  actualTotalCollectedUsd: number;
  arppuUsd: number;
  conversionRatePercent: number;
  churnRatePercent: number;
  refundRatePercent: number;
  paymentFailureRatePercent: number;
  aiCostTotalUsd: number;
  aiCostPerActiveUserUsd: number;
  contributionMarginUsd: number;
  revenueNoticeEn: string;
  revenueNoticeBn: string;
}

export const PLAN_ENTITLEMENTS_CATALOG: Record<SubscriptionPlan, PlanEntitlements> = {
  free: {
    planSlug: 'free',
    nameEn: 'Free Learner',
    nameBn: 'ফ্রি লার্নার',
    monthlyPriceUsd: 0,
    yearlyMonthlyPriceUsd: 0,
    dailyAiSpeakingTurns: 15,
    dailyTransferScenarios: 2,
    vocabularyDeckLimit: 100,
    replayRetentionDays: 30,
    advancedDnaAnalytics: false,
    prioritySupport: false,
    highlightsEn: [
      'Core bilingual Academy lessons & spaced repetition',
      'Up to 15 AI Speaking Studio turns/day',
      'Basic Mistake Memory & Communication DNA',
      'Up to 2 Transfer Lab simulations/day',
      '30-day local Communication Replay history',
    ],
    highlightsBn: [
      'মূল দ্বিভাষিক একাডেমি লেসন ও স্পেসড রিপিটিশন',
      'প্রতিদিন ১৫টি পর্যন্ত AI স্পিকিং স্টুডিও টার্ন',
      'বেসিক মিস্টেক মেমোরি ও কমিউনিকেশন DNA',
      'প্রতিদিন ২টি পর্যন্ত ট্রান্সফার ল্যাব সিমুলেশন',
      '৩০ দিনের কমিউনিকেশন রিপ্লে ইতিহাস',
    ],
  },
  pro: {
    planSlug: 'pro',
    nameEn: 'Pro Communicator',
    nameBn: 'প্রো কমিউনিকেটর',
    monthlyPriceUsd: 12,
    yearlyMonthlyPriceUsd: 9,
    dailyAiSpeakingTurns: 150,
    dailyTransferScenarios: 25,
    vocabularyDeckLimit: 2000,
    replayRetentionDays: 365,
    advancedDnaAnalytics: true,
    prioritySupport: true,
    highlightsEn: [
      'All Academy tracks & adaptive CEFR revision',
      'High-volume AI Speaking Studio (150 turns/day fair-use)',
      'Full 30-scenario Transfer Lab & 5-Tier Pressure Ladder',
      'Deep Communication DNA evidence analytics & coaching',
      '365-day Communication Replay history & export',
    ],
    highlightsBn: [
      'সকল একাডেমি ট্র্যাক ও অ্যাডাপ্টিভ CEFR রিভিশন',
      'উচ্চ সীমার AI স্পিকিং স্টুডিও (প্রতিদিন ১৫০ টার্ন)',
      'সম্পূর্ণ ৩০-সিনারিও ট্রান্সফার ল্যাব ও প্রেশার ল্যাডার',
      'বিস্তারিত কমিউনিকেশন DNA অ্যানালিটিক্স ও কোচিং',
      '৩৬৫ দিনের কমিউনিকেশন রিপ্লে ও ডেটা এক্সপোর্ট',
    ],
  },
  institution: {
    planSlug: 'institution',
    nameEn: 'Institution & Teams',
    nameBn: 'প্রতিষ্ঠান ও টিম',
    monthlyPriceUsd: 49,
    yearlyMonthlyPriceUsd: 39,
    dailyAiSpeakingTurns: 500,
    dailyTransferScenarios: 100,
    vocabularyDeckLimit: 10000,
    replayRetentionDays: 730,
    advancedDnaAnalytics: true,
    prioritySupport: true,
    highlightsEn: [
      'Multi-seat organization cohorts & curriculum builder',
      'Highest fair-use AI Speaking & Transfer Lab quotas',
      'Dedicated RBAC admin audit logs & support SLA',
      'Invoice billing & localized Bangladesh / global settlement readiness',
    ],
    highlightsBn: [
      'প্রতিষ্ঠানের জন্য মাল্টি-সিট কোহর্ট ও কারিকুলাম বিল্ডার',
      'সর্বোচ্চ AI স্পিকিং ও ট্রান্সফার ল্যাব কোটা',
      'RBAC অ্যাডমিন অডিট লগ ও অগ্রাধিকার সাপোর্ট',
      'ইনভয়েস বিলিং ও বাংলাদেশ/গ্লোবাল পেমেন্ট প্রস্তুতি',
    ],
  },
};

export function getPlanEntitlements(plan: SubscriptionPlan | undefined): PlanEntitlements {
  if (plan === 'pro') return PLAN_ENTITLEMENTS_CATALOG.pro;
  if (plan === 'institution') return PLAN_ENTITLEMENTS_CATALOG.institution;
  return PLAN_ENTITLEMENTS_CATALOG.free;
}

export function getQuotedPlanAmountCents(
  planSlug: SubscriptionPlan,
  billingInterval: BillingInterval
): number {
  const plan = getPlanEntitlements(planSlug);
  const monthlyUsd =
    billingInterval === 'yearly' ? plan.yearlyMonthlyPriceUsd : plan.monthlyPriceUsd;
  const totalUsd = billingInterval === 'yearly' ? monthlyUsd * 12 : monthlyUsd;
  return Math.round(totalUsd * 100);
}

/**
 * PRD v5.0 Section 17.4:
 * Computes financial metrics strictly from REAL subscription, invoice, and AI cost records.
 * Pending provider intents NEVER count as paid MRR or actual revenue.
 */
export function computeRealFinancialMetrics(input: {
  totalUsersCount: number;
  subscriptions: SubscriptionRecord[];
  invoices: SubscriptionInvoiceRecord[];
  totalAiCostUsd: number;
}): RealFinancialMetrics {
  const { totalUsersCount, subscriptions, invoices, totalAiCostUsd } = input;

  const activePaid = subscriptions.filter(
    (s) => s.status === 'active' && s.planSlug !== 'free'
  );
  const pendingProvider = subscriptions.filter((s) => s.status === 'pending_provider');
  const canceled = subscriptions.filter((s) => s.status === 'canceled');
  const pastDue = subscriptions.filter((s) => s.status === 'past_due');

  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const failedInvoices = invoices.filter((i) => i.status === 'failed');
  const refundRequested = invoices.filter((i) => i.status === 'refund_requested');
  const refunded = invoices.filter((i) => i.status === 'refunded');

  const actualMrrUsd = Number(
    activePaid
      .reduce((sum, sub) => {
        const plan = getPlanEntitlements(sub.planSlug);
        const monthlyRate =
          sub.billingInterval === 'yearly'
            ? plan.yearlyMonthlyPriceUsd
            : plan.monthlyPriceUsd;
        return sum + monthlyRate;
      }, 0)
      .toFixed(2)
  );

  const actualTotalCollectedUsd = Number(
    (
      paidInvoices.reduce((sum, inv) => sum + Math.max(0, inv.amountCents), 0) / 100
    ).toFixed(2)
  );

  const arppuUsd =
    activePaid.length > 0 ? Number((actualMrrUsd / activePaid.length).toFixed(2)) : 0;

  const conversionRatePercent =
    totalUsersCount > 0 ? Number(((activePaid.length / totalUsersCount) * 100).toFixed(1)) : 0;

  const totalEverPaidOrCanceled = activePaid.length + canceled.length + pastDue.length;
  const churnRatePercent =
    totalEverPaidOrCanceled > 0
      ? Number(((canceled.length / totalEverPaidOrCanceled) * 100).toFixed(1))
      : 0;

  const settledOrRefunded = paidInvoices.length + refunded.length;
  const refundRatePercent =
    settledOrRefunded > 0
      ? Number(((refunded.length / settledOrRefunded) * 100).toFixed(1))
      : 0;

  const attemptedCharges = paidInvoices.length + failedInvoices.length;
  const paymentFailureRatePercent =
    attemptedCharges > 0
      ? Number(((failedInvoices.length / attemptedCharges) * 100).toFixed(1))
      : 0;

  const aiCostTotalUsd = Number(Math.max(0, totalAiCostUsd).toFixed(6));
  const aiCostPerActiveUserUsd =
    totalUsersCount > 0 ? Number((aiCostTotalUsd / totalUsersCount).toFixed(6)) : 0;
  const contributionMarginUsd = Number((actualTotalCollectedUsd - aiCostTotalUsd).toFixed(2));

  return {
    activePaidSubscriptions: activePaid.length,
    pendingProviderRequests: pendingProvider.length,
    canceledSubscriptions: canceled.length,
    pastDueSubscriptions: pastDue.length,
    paidInvoicesCount: paidInvoices.length,
    failedInvoicesCount: failedInvoices.length,
    refundRequestedCount: refundRequested.length,
    refundedCount: refunded.length,
    actualMrrUsd,
    actualTotalCollectedUsd,
    arppuUsd,
    conversionRatePercent,
    churnRatePercent,
    refundRatePercent,
    paymentFailureRatePercent,
    aiCostTotalUsd,
    aiCostPerActiveUserUsd,
    contributionMarginUsd,
    revenueNoticeEn:
      paidInvoices.length === 0
        ? 'No settled payment-provider invoices yet. Pending upgrade requests are tracked separately and never counted as revenue.'
        : 'All revenue metrics are computed strictly from verified paid and refunded invoice records.',
    revenueNoticeBn:
      paidInvoices.length === 0
        ? 'এখনো কোনো নিষ্পত্তিকৃত পেমেন্ট-প্রোভাইডার ইনভয়েস নেই। পেন্ডিং আপগ্রেড অনুরোধ কখনো আয় হিসেবে দেখানো হয় না।'
        : 'সকল আর্থিক পরিসংখ্যান শুধুমাত্র যাচাইকৃত পেইড ও রিফান্ড ইনভয়েস রেকর্ড থেকে গণনা করা হয়েছে।',
  };
}
