import { buildCsrfHeaders } from './authApi';
import { attachAuthBearerHeader, getApiCredentialsMode, resolveApiUrl } from './apiBase';
import type {
  VocabDeckSummary,
  VocabDifficulty,
  VocabRecallRating,
  VocabSourceType,
  VocabularyCardRecord,
} from '../domain/vocabularyDeckEngine';
import type {
  CommunityCategory,
  CommunityCommentRecord,
  CommunityEnforcementAction,
  CommunityGovernanceRule,
  CommunityPostRecord,
  CommunityReportReason,
  CommunityReportRecord,
  CommunityRestrictionLevel,
  CommunityRestrictionRecord,
} from '../domain/communityModerationEngine';
import type {
  BillingInterval,
  PlanEntitlements,
  RealFinancialMetrics,
  SubscriptionInvoiceRecord,
  SubscriptionRecord,
  SupportTicketRecord,
} from '../domain/subscriptionEntitlementsEngine';
import type { VerifiedLeaderboardEntry } from '../domain/gamificationEngine';
import type { SpacedRepetitionPreset, SubscriptionPlan } from '../types/domain';

async function p3FetchJson<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const isMutation = method !== 'GET';
  let headers: Record<string, string> = isMutation
    ? await buildCsrfHeaders({ 'Content-Type': 'application/json' })
    : {};
  headers = attachAuthBearerHeader(headers);

  const response = await fetch(resolveApiUrl(path), {
    method,
    credentials: getApiCredentialsMode(),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

// ============================================================================
// Vocabulary Deck API
// ============================================================================
export interface VocabDeckResponse {
  cards: VocabularyCardRecord[];
  summary: VocabDeckSummary;
}

export function fetchVocabularyDeck(): Promise<VocabDeckResponse> {
  return p3FetchJson<VocabDeckResponse>('/api/v1/vocabulary');
}

export function addVocabularyCard(input: {
  word: string;
  meaningEn: string;
  meaningBn: string;
  exampleSentence: string;
  phoneticHint?: string;
  difficulty?: VocabDifficulty;
  sourceType?: VocabSourceType;
  sourceId?: string;
}): Promise<VocabDeckResponse & { card: VocabularyCardRecord }> {
  return p3FetchJson('/api/v1/vocabulary', { method: 'POST', body: input });
}

export function reviewVocabularyCard(
  cardId: string,
  rating: VocabRecallRating,
  preset: SpacedRepetitionPreset = 'standard'
): Promise<VocabDeckResponse & { card: VocabularyCardRecord }> {
  return p3FetchJson(`/api/v1/vocabulary/${encodeURIComponent(cardId)}/review`, {
    method: 'POST',
    body: { rating, preset },
  });
}

export function deleteVocabularyCard(cardId: string): Promise<VocabDeckResponse & { deleted: boolean }> {
  return p3FetchJson(`/api/v1/vocabulary/${encodeURIComponent(cardId)}`, { method: 'DELETE' });
}

// ============================================================================
// Community & Moderation API
// ============================================================================
export interface CommunityFeedResponse {
  posts: CommunityPostRecord[];
  viewerUserId?: string;
  blockedUserIds: string[];
  restriction: CommunityRestrictionRecord | null;
  isRestricted: boolean;
  directMessagingEnabled: boolean;
  governanceRules: CommunityGovernanceRule[];
}

export function fetchCommunityFeed(params?: {
  category?: CommunityCategory | 'all';
  q?: string;
}): Promise<CommunityFeedResponse> {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== 'all') qs.set('category', params.category);
  if (params?.q?.trim()) qs.set('q', params.q.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return p3FetchJson<CommunityFeedResponse>(`/api/v1/community/posts${suffix}`);
}

export function createCommunityPostApi(input: {
  category: CommunityCategory;
  title: string;
  body: string;
  tags: string[];
  authorLevel: string;
}): Promise<{ post: CommunityPostRecord }> {
  return p3FetchJson('/api/v1/community/posts', { method: 'POST', body: input });
}

export function addCommunityCommentApi(
  postId: string,
  body: string
): Promise<{ comment: CommunityCommentRecord }> {
  return p3FetchJson(`/api/v1/community/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: { body },
  });
}

export function toggleCommunityReactionApi(
  postId: string
): Promise<{ post: CommunityPostRecord }> {
  return p3FetchJson(`/api/v1/community/posts/${encodeURIComponent(postId)}/reactions`, {
    method: 'POST',
    body: {},
  });
}

export function deleteCommunityPostApi(postId: string): Promise<{ deleted: boolean }> {
  return p3FetchJson(`/api/v1/community/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });
}

export function reportCommunityContentApi(input: {
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: CommunityReportReason;
  details: string;
}): Promise<{ report: CommunityReportRecord }> {
  return p3FetchJson('/api/v1/community/reports', { method: 'POST', body: input });
}

export function blockCommunityUserApi(blockedUserId: string): Promise<{ blockedUserIds: string[] }> {
  return p3FetchJson('/api/v1/community/blocks', {
    method: 'POST',
    body: { blockedUserId },
  });
}

export function unblockCommunityUserApi(
  blockedUserId: string
): Promise<{ blockedUserIds: string[] }> {
  return p3FetchJson(`/api/v1/community/blocks/${encodeURIComponent(blockedUserId)}`, {
    method: 'DELETE',
  });
}

export function submitCommunityAppealApi(
  appealText: string
): Promise<{ restriction: CommunityRestrictionRecord }> {
  return p3FetchJson('/api/v1/community/appeals', {
    method: 'POST',
    body: { appealText },
  });
}

export function fetchAdminModerationQueue(): Promise<{
  reports: CommunityReportRecord[];
  restrictions: CommunityRestrictionRecord[];
}> {
  return p3FetchJson('/api/v1/admin/moderation/reports');
}

export function resolveAdminModerationReport(input: {
  reportId: string;
  action: CommunityEnforcementAction;
  reviewerNote: string;
  restrictionLevel?: CommunityRestrictionLevel;
}): Promise<{
  report: CommunityReportRecord;
  reports: CommunityReportRecord[];
  restrictions: CommunityRestrictionRecord[];
}> {
  return p3FetchJson(
    `/api/v1/admin/moderation/reports/${encodeURIComponent(input.reportId)}/resolve`,
    {
      method: 'POST',
      body: {
        action: input.action,
        reviewerNote: input.reviewerNote,
        restrictionLevel: input.restrictionLevel,
      },
    }
  );
}

export function decideAdminAppeal(
  targetUserId: string,
  decision: 'approved' | 'denied'
): Promise<{
  restriction: CommunityRestrictionRecord;
  reports: CommunityReportRecord[];
  restrictions: CommunityRestrictionRecord[];
}> {
  return p3FetchJson(
    `/api/v1/admin/moderation/appeals/${encodeURIComponent(targetUserId)}`,
    {
      method: 'POST',
      body: { decision },
    }
  );
}

// ============================================================================
// Subscriptions, Invoices & Support API
// ============================================================================
export interface LearnerBillingResponse {
  activePlan: SubscriptionPlan;
  entitlements: PlanEntitlements;
  catalog: PlanEntitlements[];
  subscriptions: SubscriptionRecord[];
  invoices: SubscriptionInvoiceRecord[];
  supportTickets: SupportTicketRecord[];
  paymentProvider: {
    configured: boolean;
    providerName: string;
    supportedMarketsNoteEn: string;
    supportedMarketsNoteBn: string;
  };
}

export function fetchMySubscription(): Promise<LearnerBillingResponse> {
  return p3FetchJson<LearnerBillingResponse>('/api/v1/subscriptions/me');
}

export function submitSubscriptionCheckoutRequest(input: {
  planSlug: 'pro' | 'institution';
  billingInterval: BillingInterval;
}): Promise<{
  subscription: SubscriptionRecord;
  invoice: SubscriptionInvoiceRecord;
  providerConfigured: boolean;
  message?: string;
}> {
  return p3FetchJson('/api/v1/subscriptions/checkout-request', {
    method: 'POST',
    body: input,
  });
}

export function cancelMySubscription(
  subscriptionId: string
): Promise<{ subscription: SubscriptionRecord }> {
  return p3FetchJson(`/api/v1/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    body: {},
  });
}

export function requestMyInvoiceRefund(
  invoiceId: string,
  reason: string
): Promise<{ invoice: SubscriptionInvoiceRecord }> {
  return p3FetchJson(
    `/api/v1/subscriptions/invoices/${encodeURIComponent(invoiceId)}/refund-request`,
    {
      method: 'POST',
      body: { reason },
    }
  );
}

export function submitSupportTicket(input: {
  category: SupportTicketRecord['category'];
  subject: string;
  message: string;
}): Promise<{ ticket: SupportTicketRecord }> {
  return p3FetchJson('/api/v1/support/tickets', {
    method: 'POST',
    body: input,
  });
}

export function fetchAdminSubscriptionsAndFinance(params?: {
  totalUsers?: number;
  totalAiCostUsd?: number;
}): Promise<{
  subscriptions: SubscriptionRecord[];
  invoices: SubscriptionInvoiceRecord[];
  supportTickets: SupportTicketRecord[];
  financialMetrics: RealFinancialMetrics;
}> {
  const qs = new URLSearchParams();
  if (params?.totalUsers !== undefined) qs.set('totalUsers', String(params.totalUsers));
  if (params?.totalAiCostUsd !== undefined) qs.set('totalAiCostUsd', String(params.totalAiCostUsd));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return p3FetchJson(`/api/v1/admin/subscriptions${suffix}`);
}

export function updateAdminSupportTicket(input: {
  ticketId: string;
  status: SupportTicketRecord['status'];
  adminResponse: string;
}): Promise<{ ticket: SupportTicketRecord }> {
  return p3FetchJson(`/api/v1/admin/support/${encodeURIComponent(input.ticketId)}`, {
    method: 'PATCH',
    body: { status: input.status, adminResponse: input.adminResponse },
  });
}

// ============================================================================
// Gamification Preferences & Real Opt-in Leaderboard API
// ============================================================================
export interface GamificationPrefs {
  userId: string;
  leaderboardOptIn: boolean;
  displayAlias: string;
  reminderEnabled: boolean;
  reminderTimeLocal: string;
  updatedAt: string;
}

export function fetchGamificationSummary(): Promise<{
  prefs: GamificationPrefs;
  leaderboard: VerifiedLeaderboardEntry[];
}> {
  return p3FetchJson('/api/v1/gamification/summary');
}

export function saveGamificationPreferences(input: {
  leaderboardOptIn?: boolean;
  displayAlias?: string;
  reminderEnabled?: boolean;
  reminderTimeLocal?: string;
  totalVerifiedXp?: number;
}): Promise<{
  prefs: GamificationPrefs;
  leaderboard: VerifiedLeaderboardEntry[];
}> {
  return p3FetchJson('/api/v1/gamification/preferences', {
    method: 'PUT',
    body: input,
  });
}

// ============================================================================
// Admin System Configuration API (Zero Secret Exposure)
// ============================================================================
export interface AdminSystemConfigResponse {
  settings: {
    audioRetentionDays: number;
    aiRateLimitPerMinute: number;
    freeDailySpeakingLimit: number;
    communityDirectMessagingEnabled: false;
    maintenanceBannerEn: string;
    maintenanceBannerBn: string;
    allowNewRegistrations: boolean;
    updatedAt?: string;
    updatedBy?: string;
  };
  webhookProvidersConfigured: {
    stripe: boolean;
    sslcommerz: boolean;
    paddle: boolean;
  };
}

export function fetchAdminSystemSettings(): Promise<AdminSystemConfigResponse> {
  return p3FetchJson('/api/v1/admin/system-settings');
}

export function saveAdminSystemSettings(
  patch: Partial<AdminSystemConfigResponse['settings']>
): Promise<{ settings: AdminSystemConfigResponse['settings'] }> {
  return p3FetchJson('/api/v1/admin/system-settings', {
    method: 'PUT',
    body: patch,
  });
}

