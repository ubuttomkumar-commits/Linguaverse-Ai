import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeNextVocabReview,
  summarizeVocabDeck,
  VOCAB_SRS_ALGORITHM_VERSION,
  type VocabDifficulty,
  type VocabRecallRating,
  type VocabSourceType,
  type VocabularyCardRecord,
} from '../src/domain/vocabularyDeckEngine';
import {
  filterCommunityFeedForViewer,
  isUserCurrentlyRestricted,
  type CommunityCategory,
  type CommunityCommentRecord,
  type CommunityEnforcementAction,
  type CommunityPostRecord,
  type CommunityReportReason,
  type CommunityReportRecord,
  type CommunityRestrictionLevel,
  type CommunityRestrictionRecord,
} from '../src/domain/communityModerationEngine';
import {
  getQuotedPlanAmountCents,
  type BillingInterval,
  type SubscriptionInvoiceRecord,
  type SubscriptionRecord,
  type SupportTicketRecord,
} from '../src/domain/subscriptionEntitlementsEngine';
import type { SpacedRepetitionPreset, SubscriptionPlan } from '../src/types/domain';
import {
  DEFAULT_SYSTEM_CONFIG,
  type SystemConfigSettings,
  type ValidatedPaymentWebhookEvent,
} from '../src/domain/paymentWebhookEngine';

export interface GamificationPrefsRecord {
  userId: string;
  leaderboardOptIn: boolean;
  displayAlias: string;
  reminderEnabled: boolean;
  reminderTimeLocal: string;
  totalVerifiedXp: number;
  updatedAt: string;
}

interface P3StoreData {
  vocabulary: VocabularyCardRecord[];
  posts: CommunityPostRecord[];
  reports: CommunityReportRecord[];
  blocks: Array<{ id: string; blockerUserId: string; blockedUserId: string; createdAt: string }>;
  restrictions: Record<string, CommunityRestrictionRecord>;
  subscriptions: SubscriptionRecord[];
  invoices: SubscriptionInvoiceRecord[];
  supportTickets: SupportTicketRecord[];
  gamificationPrefs: Record<string, GamificationPrefsRecord>;
  systemConfig: SystemConfigSettings;
  processedWebhookEvents: Record<string, { provider: string; eventType: string; processedAt: string }>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'p3-store.json');

function createEmptyStore(): P3StoreData {
  return {
    vocabulary: [],
    posts: [],
    reports: [],
    blocks: [],
    restrictions: {},
    subscriptions: [],
    invoices: [],
    supportTickets: [],
    gamificationPrefs: {},
    systemConfig: { ...DEFAULT_SYSTEM_CONFIG },
    processedWebhookEvents: {},
  };
}

let cachedStore: P3StoreData | null = null;

function readStore(): P3StoreData {
  if (cachedStore) return cachedStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<P3StoreData>;
      cachedStore = {
        vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
        restrictions: parsed.restrictions && typeof parsed.restrictions === 'object' ? parsed.restrictions : {},
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        supportTickets: Array.isArray(parsed.supportTickets) ? parsed.supportTickets : [],
        gamificationPrefs:
          parsed.gamificationPrefs && typeof parsed.gamificationPrefs === 'object'
            ? parsed.gamificationPrefs
            : {},
        systemConfig:
          parsed.systemConfig && typeof parsed.systemConfig === 'object'
            ? { ...DEFAULT_SYSTEM_CONFIG, ...parsed.systemConfig, communityDirectMessagingEnabled: false }
            : { ...DEFAULT_SYSTEM_CONFIG },
        processedWebhookEvents:
          parsed.processedWebhookEvents && typeof parsed.processedWebhookEvents === 'object'
            ? parsed.processedWebhookEvents
            : {},
      };
      return cachedStore;
    }
  } catch {
    // Recover cleanly with empty store if corrupted
  }
  cachedStore = createEmptyStore();
  return cachedStore;
}

function writeStore(store: P3StoreData): void {
  cachedStore = store;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Ignore write failure in read-only test containers
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// ============================================================================
// Vocabulary Deck Operations
// ============================================================================
export function listUserVocabulary(userId: string) {
  const store = readStore();
  const cards = store.vocabulary
    .filter((c) => c.userId === userId)
    .sort((a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt));
  return {
    cards,
    summary: summarizeVocabDeck(cards),
  };
}

export function upsertUserVocabularyCard(
  userId: string,
  input: {
    word: string;
    wordNormalized: string;
    phoneticHint: string;
    meaningEn: string;
    meaningBn: string;
    exampleSentence: string;
    sourceType: VocabSourceType;
    sourceId?: string;
    difficulty: VocabDifficulty;
  }
): VocabularyCardRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const existing = store.vocabulary.find(
    (c) => c.userId === userId && c.wordNormalized === input.wordNormalized
  );

  if (existing) {
    existing.word = input.word;
    existing.phoneticHint = input.phoneticHint;
    existing.meaningEn = input.meaningEn;
    existing.meaningBn = input.meaningBn;
    existing.exampleSentence = input.exampleSentence;
    existing.difficulty = input.difficulty;
    existing.updatedAt = now;
    writeStore(store);
    return existing;
  }

  const card: VocabularyCardRecord = {
    id: makeId('voc'),
    userId,
    word: input.word,
    wordNormalized: input.wordNormalized,
    phoneticHint: input.phoneticHint,
    meaningEn: input.meaningEn,
    meaningBn: input.meaningBn,
    exampleSentence: input.exampleSentence,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    difficulty: input.difficulty,
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
  };
  store.vocabulary.unshift(card);
  writeStore(store);
  return card;
}

export function reviewUserVocabularyCard(
  userId: string,
  cardId: string,
  rating: VocabRecallRating,
  preset: SpacedRepetitionPreset = 'standard'
): VocabularyCardRecord | null {
  const store = readStore();
  const idx = store.vocabulary.findIndex((c) => c.id === cardId && c.userId === userId);
  if (idx === -1) return null;
  const updated = computeNextVocabReview(store.vocabulary[idx], rating, preset);
  store.vocabulary[idx] = updated;
  writeStore(store);
  return updated;
}

export function deleteUserVocabularyCard(userId: string, cardId: string): boolean {
  const store = readStore();
  const prevLen = store.vocabulary.length;
  store.vocabulary = store.vocabulary.filter((c) => !(c.id === cardId && c.userId === userId));
  if (store.vocabulary.length === prevLen) return false;
  writeStore(store);
  return true;
}

// ============================================================================
// Community & Moderation Operations
// ============================================================================
export function listCommunityFeed(
  viewerUserId: string,
  filters?: { category?: CommunityCategory | 'all'; query?: string }
) {
  const store = readStore();
  const blockedUserIds = store.blocks
    .filter((b) => b.blockerUserId === viewerUserId)
    .map((b) => b.blockedUserId);
  const posts = filterCommunityFeedForViewer(store.posts, blockedUserIds, filters);
  const restriction = store.restrictions[viewerUserId] ?? null;
  return {
    posts,
    blockedUserIds,
    restriction,
    isRestricted: isUserCurrentlyRestricted(restriction),
  };
}

export function getUserRestriction(userId: string): CommunityRestrictionRecord | null {
  const store = readStore();
  return store.restrictions[userId] ?? null;
}

export function createCommunityPost(input: {
  authorUserId: string;
  authorName: string;
  authorLevel: string;
  category: CommunityCategory;
  title: string;
  body: string;
  tags: string[];
}): CommunityPostRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const post: CommunityPostRecord = {
    id: makeId('post'),
    authorUserId: input.authorUserId,
    authorName: input.authorName,
    authorLevel: input.authorLevel,
    category: input.category,
    title: input.title,
    body: input.body,
    tags: input.tags,
    helpfulUserIds: [],
    status: 'active',
    comments: [],
    createdAt: now,
    updatedAt: now,
  };
  store.posts.unshift(post);
  writeStore(store);
  return post;
}

export function addCommunityComment(input: {
  postId: string;
  authorUserId: string;
  authorName: string;
  body: string;
}): CommunityCommentRecord | null {
  const store = readStore();
  const post = store.posts.find((p) => p.id === input.postId && p.status === 'active');
  if (!post) return null;
  const now = new Date().toISOString();
  const comment: CommunityCommentRecord = {
    id: makeId('cmt'),
    postId: post.id,
    authorUserId: input.authorUserId,
    authorName: input.authorName,
    body: input.body,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  post.comments.push(comment);
  post.updatedAt = now;
  writeStore(store);
  return comment;
}

export function togglePostHelpfulReaction(postId: string, userId: string): CommunityPostRecord | null {
  const store = readStore();
  const post = store.posts.find((p) => p.id === postId && p.status === 'active');
  if (!post) return null;
  const exists = post.helpfulUserIds.includes(userId);
  post.helpfulUserIds = exists
    ? post.helpfulUserIds.filter((id) => id !== userId)
    : [...post.helpfulUserIds, userId];
  post.updatedAt = new Date().toISOString();
  writeStore(store);
  return post;
}

export function deleteCommunityPost(
  postId: string,
  actorUserId: string,
  isModerator: boolean
): { ok: boolean; status: number; error?: string } {
  const store = readStore();
  const post = store.posts.find((p) => p.id === postId && p.status !== 'deleted');
  if (!post) return { ok: false, status: 404, error: 'Post not found.' };
  if (post.authorUserId !== actorUserId && !isModerator) {
    return { ok: false, status: 403, error: 'You can only delete your own posts.' };
  }
  post.status = isModerator && post.authorUserId !== actorUserId ? 'hidden_by_mod' : 'deleted';
  post.updatedAt = new Date().toISOString();
  writeStore(store);
  return { ok: true, status: 200 };
}

export function createCommunityReport(input: {
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reporterUserId: string;
  reason: CommunityReportReason;
  details: string;
}): CommunityReportRecord {
  const store = readStore();
  const report: CommunityReportRecord = {
    id: makeId('rep'),
    targetType: input.targetType,
    targetId: input.targetId,
    reporterUserId: input.reporterUserId,
    reason: input.reason,
    details: input.details,
    status: 'pending',
    enforcementAction: 'none',
    createdAt: new Date().toISOString(),
  };
  store.reports.unshift(report);
  writeStore(store);
  return report;
}

export function blockCommunityUser(blockerUserId: string, blockedUserId: string): string[] {
  const store = readStore();
  if (
    blockerUserId !== blockedUserId &&
    !store.blocks.some(
      (b) => b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId
    )
  ) {
    store.blocks.push({
      id: makeId('blk'),
      blockerUserId,
      blockedUserId,
      createdAt: new Date().toISOString(),
    });
    writeStore(store);
  }
  return store.blocks
    .filter((b) => b.blockerUserId === blockerUserId)
    .map((b) => b.blockedUserId);
}

export function unblockCommunityUser(blockerUserId: string, blockedUserId: string): string[] {
  const store = readStore();
  store.blocks = store.blocks.filter(
    (b) => !(b.blockerUserId === blockerUserId && b.blockedUserId === blockedUserId)
  );
  writeStore(store);
  return store.blocks
    .filter((b) => b.blockerUserId === blockerUserId)
    .map((b) => b.blockedUserId);
}

export function submitRestrictionAppeal(
  userId: string,
  appealText: string
): CommunityRestrictionRecord | null {
  const store = readStore();
  const rec = store.restrictions[userId];
  if (!rec || rec.restrictionLevel === 'none') return null;
  rec.appealText = appealText;
  rec.appealStatus = 'pending';
  rec.updatedAt = new Date().toISOString();
  writeStore(store);
  return rec;
}

export function listModerationQueue() {
  const store = readStore();
  return {
    reports: store.reports,
    restrictions: Object.values(store.restrictions).filter(
      (r) => r.restrictionLevel !== 'none' || r.appealStatus === 'pending'
    ),
  };
}

export function resolveModerationReport(input: {
  reportId: string;
  reviewerUserId: string;
  action: CommunityEnforcementAction;
  reviewerNote: string;
  restrictionLevel?: CommunityRestrictionLevel;
}): CommunityReportRecord | null {
  const store = readStore();
  const report = store.reports.find((r) => r.id === input.reportId);
  if (!report) return null;
  const now = new Date().toISOString();

  report.enforcementAction = input.action;
  report.reviewerUserId = input.reviewerUserId;
  report.reviewerNote = input.reviewerNote;
  report.reviewedAt = now;
  report.status = input.action === 'none' ? 'resolved_dismissed' : 'resolved_removed';

  let targetAuthorId: string | null = null;
  if (report.targetType === 'post') {
    const post = store.posts.find((p) => p.id === report.targetId);
    if (post) {
      targetAuthorId = post.authorUserId;
      if (input.action === 'hide_content' || input.action === 'restrict_user') {
        post.status = 'hidden_by_mod';
        post.moderationNote = input.reviewerNote || 'Removed by moderation.';
        post.updatedAt = now;
      }
    }
  } else if (report.targetType === 'comment') {
    for (const post of store.posts) {
      const comment = post.comments.find((c) => c.id === report.targetId);
      if (comment) {
        targetAuthorId = comment.authorUserId;
        if (input.action === 'hide_content' || input.action === 'restrict_user') {
          comment.status = 'hidden_by_mod';
          comment.updatedAt = now;
        }
        break;
      }
    }
  } else if (report.targetType === 'user') {
    targetAuthorId = report.targetId;
  }

  if (input.action === 'restrict_user' && targetAuthorId) {
    const level: CommunityRestrictionLevel = input.restrictionLevel || 'muted_24h';
    store.restrictions[targetAuthorId] = {
      userId: targetAuthorId,
      restrictionLevel: level,
      reason: input.reviewerNote || `Restricted for ${report.reason}`,
      restrictedBy: input.reviewerUserId,
      expiresAt:
        level === 'muted_24h'
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null,
      appealStatus: 'none',
      updatedAt: now,
    };
  }

  writeStore(store);
  return report;
}

export function updateRestrictionAppealStatus(
  targetUserId: string,
  decision: 'approved' | 'denied',
  reviewerUserId: string
): CommunityRestrictionRecord | null {
  const store = readStore();
  const rec = store.restrictions[targetUserId];
  if (!rec) return null;
  rec.appealStatus = decision;
  if (decision === 'approved') {
    rec.restrictionLevel = 'none';
    rec.expiresAt = null;
  }
  rec.restrictedBy = reviewerUserId;
  rec.updatedAt = new Date().toISOString();
  writeStore(store);
  return rec;
}

// ============================================================================
// Subscriptions, Invoices & Support Tickets
// ============================================================================
export function getUserBillingData(userId: string) {
  const store = readStore();
  const subscriptions = store.subscriptions.filter((s) => s.userId === userId);
  const invoices = store.invoices.filter((i) => i.userId === userId);
  const tickets = store.supportTickets.filter((t) => t.userId === userId);
  return { subscriptions, invoices, tickets };
}

export function createCheckoutRequest(input: {
  userId: string;
  planSlug: SubscriptionPlan;
  billingInterval: BillingInterval;
}): { subscription: SubscriptionRecord; invoice: SubscriptionInvoiceRecord } {
  const store = readStore();
  const now = new Date().toISOString();
  const sub: SubscriptionRecord = {
    id: makeId('sub'),
    userId: input.userId,
    planSlug: input.planSlug,
    billingInterval: input.billingInterval,
    status: 'pending_provider',
    provider: 'unconfigured',
    createdAt: now,
    updatedAt: now,
  };
  const inv: SubscriptionInvoiceRecord = {
    id: makeId('inv'),
    subscriptionId: sub.id,
    userId: input.userId,
    planSlug: input.planSlug,
    billingInterval: input.billingInterval,
    amountCents: getQuotedPlanAmountCents(input.planSlug, input.billingInterval),
    currency: 'USD',
    status: 'pending_provider',
    provider: 'unconfigured',
    createdAt: now,
    updatedAt: now,
  };
  store.subscriptions.unshift(sub);
  store.invoices.unshift(inv);
  writeStore(store);
  return { subscription: sub, invoice: inv };
}

export function cancelUserSubscription(userId: string, subscriptionId: string): SubscriptionRecord | null {
  const store = readStore();
  const sub = store.subscriptions.find((s) => s.id === subscriptionId && s.userId === userId);
  if (!sub) return null;
  sub.status = 'canceled';
  sub.updatedAt = new Date().toISOString();
  writeStore(store);
  return sub;
}

export function requestInvoiceRefund(
  userId: string,
  invoiceId: string,
  reason: string
): SubscriptionInvoiceRecord | null {
  const store = readStore();
  const inv = store.invoices.find((i) => i.id === invoiceId && i.userId === userId);
  if (!inv) return null;
  inv.status = 'refund_requested';
  inv.refundReason = reason;
  inv.updatedAt = new Date().toISOString();
  writeStore(store);
  return inv;
}

export function createSupportTicket(input: {
  userId: string;
  userEmail: string;
  category: SupportTicketRecord['category'];
  subject: string;
  message: string;
}): SupportTicketRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const ticket: SupportTicketRecord = {
    id: makeId('sup'),
    userId: input.userId,
    userEmail: input.userEmail,
    category: input.category,
    subject: input.subject,
    message: input.message,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  store.supportTickets.unshift(ticket);
  writeStore(store);
  return ticket;
}

export function listAllAdminBillingAndSupport() {
  const store = readStore();
  return {
    subscriptions: store.subscriptions,
    invoices: store.invoices,
    supportTickets: store.supportTickets,
  };
}

export function adminUpdateSupportTicket(input: {
  ticketId: string;
  status: SupportTicketRecord['status'];
  adminResponse: string;
  handledBy: string;
}): SupportTicketRecord | null {
  const store = readStore();
  const ticket = store.supportTickets.find((t) => t.id === input.ticketId);
  if (!ticket) return null;
  ticket.status = input.status;
  ticket.adminResponse = input.adminResponse;
  ticket.handledBy = input.handledBy;
  ticket.updatedAt = new Date().toISOString();
  writeStore(store);
  return ticket;
}

// ============================================================================
// Gamification Preferences & Opt-in Leaderboard
// ============================================================================
export function getGamificationSummary(userId: string, fallbackName: string) {
  const store = readStore();
  const prefs: GamificationPrefsRecord = store.gamificationPrefs[userId] ?? {
    userId,
    leaderboardOptIn: false,
    displayAlias: fallbackName.split(/\s+/)[0] || 'Learner',
    reminderEnabled: false,
    reminderTimeLocal: '20:00',
    totalVerifiedXp: 0,
    updatedAt: new Date().toISOString(),
  };
  const optedInEntries = Object.values(store.gamificationPrefs)
    .filter((p) => p.leaderboardOptIn)
    .map((p) => ({
      userId: p.userId,
      displayAlias: p.displayAlias || 'Learner',
      totalVerifiedXp: Math.max(0, Math.round(p.totalVerifiedXp || 0)),
    }));
  return { prefs, optedInEntries };
}

export function upsertGamificationPrefs(
  userId: string,
  patch: {
    leaderboardOptIn?: boolean;
    displayAlias?: string;
    reminderEnabled?: boolean;
    reminderTimeLocal?: string;
    totalVerifiedXp?: number;
  },
  fallbackName: string
): GamificationPrefsRecord {
  const store = readStore();
  const prev = store.gamificationPrefs[userId] ?? {
    userId,
    leaderboardOptIn: false,
    displayAlias: fallbackName.split(/\s+/)[0] || 'Learner',
    reminderEnabled: false,
    reminderTimeLocal: '20:00',
    totalVerifiedXp: 0,
    updatedAt: new Date().toISOString(),
  };
  const next: GamificationPrefsRecord = {
    ...prev,
    leaderboardOptIn:
      typeof patch.leaderboardOptIn === 'boolean' ? patch.leaderboardOptIn : prev.leaderboardOptIn,
    displayAlias:
      typeof patch.displayAlias === 'string' && patch.displayAlias.trim()
        ? patch.displayAlias.trim().slice(0, 32)
        : prev.displayAlias,
    reminderEnabled:
      typeof patch.reminderEnabled === 'boolean' ? patch.reminderEnabled : prev.reminderEnabled,
    reminderTimeLocal:
      typeof patch.reminderTimeLocal === 'string' && /^\d{2}:\d{2}$/.test(patch.reminderTimeLocal)
        ? patch.reminderTimeLocal
        : prev.reminderTimeLocal,
    totalVerifiedXp:
      typeof patch.totalVerifiedXp === 'number' && Number.isFinite(patch.totalVerifiedXp)
        ? Math.max(0, Math.min(100000, Math.round(patch.totalVerifiedXp)))
        : prev.totalVerifiedXp,
    updatedAt: new Date().toISOString(),
  };
  store.gamificationPrefs[userId] = next;
  writeStore(store);
  return next;
}

// ============================================================================
// Admin System Configuration & Signed Payment Webhook Ledger
// ============================================================================
export function getSystemConfigSettings(): SystemConfigSettings {
  const store = readStore();
  return {
    ...DEFAULT_SYSTEM_CONFIG,
    ...store.systemConfig,
    communityDirectMessagingEnabled: false,
  };
}

export function saveSystemConfigSettings(
  nextConfig: SystemConfigSettings,
  actorEmail: string
): SystemConfigSettings {
  const store = readStore();
  const saved: SystemConfigSettings = {
    ...nextConfig,
    communityDirectMessagingEnabled: false,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
  };
  store.systemConfig = saved;
  writeStore(store);
  return saved;
}

export function applyVerifiedPaymentWebhookEvent(event: ValidatedPaymentWebhookEvent): {
  duplicate: boolean;
  statusApplied: string;
} {
  const store = readStore();
  if (store.processedWebhookEvents[event.eventId]) {
    return { duplicate: true, statusApplied: 'already_processed' };
  }

  const now = new Date().toISOString();
  let sub = store.subscriptions.find((s) => s.userId === event.userId);
  if (!sub) {
    const created: SubscriptionRecord = {
      id: makeId('sub'),
      userId: event.userId,
      planSlug: event.plan ?? 'free',
      billingInterval: 'monthly',
      status: 'pending_provider',
      provider: event.provider,
      createdAt: now,
      updatedAt: now,
    };
    store.subscriptions.push(created);
    sub = created;
  }

  const inv = event.invoiceId
    ? store.invoices.find((i) => i.id === event.invoiceId && i.userId === event.userId)
    : undefined;

  let statusApplied = 'recorded';
  if (event.eventType === 'payment_succeeded') {
    sub.planSlug = event.plan ?? (sub.planSlug === 'free' ? 'pro' : sub.planSlug);
    sub.status = 'active';
    sub.provider = event.provider;
    sub.updatedAt = now;
    if (inv) {
      inv.status = 'paid';
      inv.amountCents = event.amountCents;
      inv.currency = event.currency;
      inv.updatedAt = now;
    } else {
      store.invoices.push({
        id: event.invoiceId ?? makeId('inv'),
        subscriptionId: sub.id,
        userId: event.userId,
        planSlug: sub.planSlug,
        billingInterval: sub.billingInterval,
        amountCents: event.amountCents,
        currency: event.currency,
        status: 'paid',
        provider: event.provider,
        createdAt: now,
        updatedAt: now,
      });
    }
    statusApplied = 'subscription_active';
  } else if (event.eventType === 'payment_failed') {
    sub.status = 'past_due';
    sub.updatedAt = now;
    if (inv) {
      inv.status = 'failed';
      inv.failureReason = `Payment failed via ${event.provider} webhook (${event.eventId}).`;
      inv.updatedAt = now;
    }
    statusApplied = 'payment_failed';
  } else if (event.eventType === 'subscription_cancelled') {
    sub.status = 'canceled';
    sub.updatedAt = now;
    statusApplied = 'subscription_cancelled';
  } else if (event.eventType === 'refund_issued') {
    if (inv) {
      inv.status = 'refunded';
      inv.refundReason = `Refund issued via ${event.provider} webhook (${event.eventId}).`;
      inv.updatedAt = now;
    }
    statusApplied = 'refund_recorded';
  }

  store.processedWebhookEvents[event.eventId] = {
    provider: event.provider,
    eventType: event.eventType,
    processedAt: now,
  };
  writeStore(store);
  return { duplicate: false, statusApplied };
}

