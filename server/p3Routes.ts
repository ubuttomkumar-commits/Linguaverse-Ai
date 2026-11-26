import type express from 'express';
import {
  addCommunityComment,
  adminUpdateSupportTicket,
  blockCommunityUser,
  cancelUserSubscription,
  createCheckoutRequest,
  createCommunityPost,
  createCommunityReport,
  createSupportTicket,
  deleteCommunityPost,
  deleteUserVocabularyCard,
  getGamificationSummary,
  getUserBillingData,
  getUserRestriction,
  listAllAdminBillingAndSupport,
  listCommunityFeed,
  listModerationQueue,
  listUserVocabulary,
  requestInvoiceRefund,
  resolveModerationReport,
  reviewUserVocabularyCard,
  submitRestrictionAppeal,
  togglePostHelpfulReaction,
  unblockCommunityUser,
  updateRestrictionAppealStatus,
  upsertGamificationPrefs,
  upsertUserVocabularyCard,
  getSystemConfigSettings,
  saveSystemConfigSettings,
  applyVerifiedPaymentWebhookEvent,
} from './p3Store';
import { appendServerAuditLog } from './cmsStore';
import {
  SUPPORTED_WEBHOOK_PROVIDERS,
  validatePaymentWebhookPayload,
  validateSystemConfigPatch,
  verifyPaymentWebhookSignature,
  type SupportedWebhookProvider,
} from '../src/domain/paymentWebhookEngine';
import { validateVocabularyInput, type VocabRecallRating } from '../src/domain/vocabularyDeckEngine';
import {
  COMMUNITY_DIRECT_MESSAGING_ENABLED,
  COMMUNITY_GOVERNANCE_RULES,
  isUserCurrentlyRestricted,
  sanitizeCommunityPlainText,
  validateCommunityCommentInput,
  validateCommunityPostInput,
  type CommunityCategory,
  type CommunityEnforcementAction,
  type CommunityReportReason,
  type CommunityRestrictionLevel,
} from '../src/domain/communityModerationEngine';
import {
  computeRealFinancialMetrics,
  getPlanEntitlements,
  PLAN_ENTITLEMENTS_CATALOG,
  type BillingInterval,
  type SupportTicketRecord,
} from '../src/domain/subscriptionEntitlementsEngine';
import {
  computeLearnerLevel,
  sortVerifiedLeaderboard,
} from '../src/domain/gamificationEngine';
import type { SpacedRepetitionPreset, SubscriptionPlan } from '../src/types/domain';

export interface ExpressP3RouteDeps {
  resolveRequestSession: (req: express.Request) => {
    user: { id: string; email: string; name: string; role: string; plan?: string; emailVerified?: boolean };
  } | null;
  verifyCsrf: (req: express.Request, res: express.Response) => boolean;
  requireExpressAdmin: (
    req: express.Request,
    res: express.Response,
    roleCheck: (role: string) => boolean,
    forbiddenMessage: string
  ) => { id: string; email: string; role: string } | null;
}

const VALID_RATINGS = new Set<VocabRecallRating>(['again', 'hard', 'good', 'easy']);
const VALID_REPORT_REASONS = new Set<CommunityReportReason>([
  'spam',
  'harassment',
  'inappropriate',
  'misinformation',
  'other',
]);
const VALID_ENFORCEMENT = new Set<CommunityEnforcementAction>([
  'none',
  'hide_content',
  'warn_user',
  'restrict_user',
]);
const VALID_TICKET_CATEGORIES = new Set<SupportTicketRecord['category']>([
  'billing',
  'technical',
  'curriculum',
  'abuse_appeal',
  'privacy',
]);

const p3RateBuckets = new Map<string, number[]>();

function checkP3RateLimit(key: string, maxRequests: number, windowMs: number): number | null {
  const now = Date.now();
  const entries = (p3RateBuckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (entries.length >= maxRequests) {
    const oldest = entries[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    p3RateBuckets.set(key, entries);
    return retryAfter;
  }
  entries.push(now);
  p3RateBuckets.set(key, entries);
  if (p3RateBuckets.size > 500) {
    const firstKey = p3RateBuckets.keys().next().value;
    if (firstKey) p3RateBuckets.delete(firstKey);
  }
  return null;
}

export function registerExpressP3Routes(app: express.Express, deps: ExpressP3RouteDeps): void {
  const { resolveRequestSession, verifyCsrf, requireExpressAdmin } = deps;

  const requireVerifiedLearner = (req: express.Request, res: express.Response) => {
    const resolved = resolveRequestSession(req);
    if (!resolved) {
      res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
      return null;
    }
    return resolved.user;
  };

  // ==========================================================================
  // 1. Spaced-Repetition Vocabulary Deck (/api/v1/vocabulary)
  // ==========================================================================
  app.get('/api/v1/vocabulary', (req, res) => {
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    res.json(listUserVocabulary(user.id));
  });

  app.post('/api/v1/vocabulary', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const retryAfter = checkP3RateLimit(`vocab_add:${user.id}`, 30, 60_000);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many vocabulary requests. Please wait a moment.' });
      return;
    }
    const validation = validateVocabularyInput(req.body || {});
    if (!validation.ok || !validation.cleaned) {
      res.status(400).json({ error: validation.error || 'Invalid vocabulary card.' });
      return;
    }
    const card = upsertUserVocabularyCard(user.id, {
      ...validation.cleaned,
      sourceId: typeof req.body?.sourceId === 'string' ? req.body.sourceId.slice(0, 80) : undefined,
    });
    const deck = listUserVocabulary(user.id);
    res.status(201).json({ card, ...deck });
  });

  app.post('/api/v1/vocabulary/:cardId/review', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const rating = req.body?.rating as VocabRecallRating;
    if (!VALID_RATINGS.has(rating)) {
      res.status(400).json({ error: 'Invalid recall rating. Use again, hard, good, or easy.' });
      return;
    }
    const preset: SpacedRepetitionPreset =
      req.body?.preset === 'intensive' || req.body?.preset === 'relaxed'
        ? req.body.preset
        : 'standard';
    const card = reviewUserVocabularyCard(user.id, req.params.cardId, rating, preset);
    if (!card) {
      res.status(404).json({ error: 'Vocabulary card not found.' });
      return;
    }
    const deck = listUserVocabulary(user.id);
    res.json({ card, ...deck });
  });

  app.delete('/api/v1/vocabulary/:cardId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const deleted = deleteUserVocabularyCard(user.id, req.params.cardId);
    if (!deleted) {
      res.status(404).json({ error: 'Vocabulary card not found.' });
      return;
    }
    res.json({ deleted: true, ...listUserVocabulary(user.id) });
  });

  // ==========================================================================
  // 2. Learner Community & Safety Moderation (/api/v1/community)
  // ==========================================================================
  app.get('/api/v1/community/posts', (req, res) => {
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const categoryRaw = String(req.query.category || 'all');
    const category: CommunityCategory | 'all' =
      categoryRaw === 'discussion' ||
      categoryRaw === 'question' ||
      categoryRaw === 'practice_challenge'
        ? categoryRaw
        : 'all';
    const query = String(req.query.q || '').slice(0, 120);
    const feed = listCommunityFeed(user.id, { category, query });
    res.json({
      ...feed,
      viewerUserId: user.id,
      directMessagingEnabled: COMMUNITY_DIRECT_MESSAGING_ENABLED,
      governanceRules: COMMUNITY_GOVERNANCE_RULES,
    });
  });

  app.post('/api/v1/community/posts', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const retryAfter = checkP3RateLimit(`comm_post:${user.id}`, 8, 60_000);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Posting rate limit reached. Please wait before posting again.' });
      return;
    }
    const restriction = getUserRestriction(user.id);
    if (isUserCurrentlyRestricted(restriction)) {
      res.status(403).json({
        error: 'Your posting privileges are currently restricted. You may submit an appeal below.',
        code: 'USER_RESTRICTED',
      });
      return;
    }
    const validation = validateCommunityPostInput(req.body || {});
    if (!validation.ok || !validation.cleaned) {
      res.status(400).json({ error: validation.error || 'Invalid post content.' });
      return;
    }
    const authorLevel =
      typeof req.body?.authorLevel === 'string'
        ? sanitizeCommunityPlainText(req.body.authorLevel, 16) || 'A2'
        : 'A2';
    const post = createCommunityPost({
      authorUserId: user.id,
      authorName: user.name || 'Learner',
      authorLevel,
      ...validation.cleaned,
    });
    res.status(201).json({ post });
  });

  app.post('/api/v1/community/posts/:postId/comments', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const retryAfter = checkP3RateLimit(`comm_cmt:${user.id}`, 20, 60_000);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many comments. Please slow down.' });
      return;
    }
    const restriction = getUserRestriction(user.id);
    if (isUserCurrentlyRestricted(restriction)) {
      res.status(403).json({
        error: 'Commenting is restricted for your account.',
        code: 'USER_RESTRICTED',
      });
      return;
    }
    const validation = validateCommunityCommentInput(req.body?.body);
    if (!validation.ok || !validation.body) {
      res.status(400).json({ error: validation.error || 'Invalid comment.' });
      return;
    }
    const comment = addCommunityComment({
      postId: req.params.postId,
      authorUserId: user.id,
      authorName: user.name || 'Learner',
      body: validation.body,
    });
    if (!comment) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    res.status(201).json({ comment });
  });

  app.post('/api/v1/community/posts/:postId/reactions', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const post = togglePostHelpfulReaction(req.params.postId, user.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    res.json({ post });
  });

  app.delete('/api/v1/community/posts/:postId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const isMod = ['moderator', 'admin', 'super_admin'].includes(user.role);
    const result = deleteCommunityPost(req.params.postId, user.id, isMod);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ deleted: true });
  });

  app.post('/api/v1/community/reports', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const retryAfter = checkP3RateLimit(`comm_rep:${user.id}`, 10, 60_000);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many abuse reports submitted.' });
      return;
    }
    const targetType = req.body?.targetType;
    const targetId = sanitizeCommunityPlainText(req.body?.targetId, 80);
    const reason = req.body?.reason as CommunityReportReason;
    const details = sanitizeCommunityPlainText(req.body?.details, 500);
    if (
      (targetType !== 'post' && targetType !== 'comment' && targetType !== 'user') ||
      !targetId ||
      !VALID_REPORT_REASONS.has(reason)
    ) {
      res.status(400).json({ error: 'Invalid report payload.' });
      return;
    }
    const report = createCommunityReport({
      targetType,
      targetId,
      reporterUserId: user.id,
      reason,
      details,
    });
    res.status(201).json({ report });
  });

  app.post('/api/v1/community/blocks', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const blockedUserId = sanitizeCommunityPlainText(req.body?.blockedUserId, 80);
    if (!blockedUserId || blockedUserId === user.id) {
      res.status(400).json({ error: 'Valid target user ID required.' });
      return;
    }
    const blockedUserIds = blockCommunityUser(user.id, blockedUserId);
    res.status(201).json({ blockedUserIds });
  });

  app.delete('/api/v1/community/blocks/:blockedUserId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const blockedUserIds = unblockCommunityUser(user.id, req.params.blockedUserId);
    res.json({ blockedUserIds });
  });

  app.post('/api/v1/community/appeals', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const appealText = sanitizeCommunityPlainText(req.body?.appealText, 800);
    if (appealText.length < 10) {
      res.status(400).json({ error: 'Please explain your appeal in at least 10 characters.' });
      return;
    }
    const updated = submitRestrictionAppeal(user.id, appealText);
    if (!updated) {
      res.status(404).json({ error: 'No active community restriction found for your account.' });
      return;
    }
    res.json({ restriction: updated });
  });

  // ==========================================================================
  // 3. Admin Community Moderation Queue (/api/v1/admin/moderation/*)
  // ==========================================================================
  const isModOrAdmin = (role: string) => ['moderator', 'admin', 'super_admin'].includes(role);

  app.get('/api/v1/admin/moderation/reports', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      isModOrAdmin,
      'Moderator or Admin role required to access community moderation queue.'
    );
    if (!admin) return;
    res.json(listModerationQueue());
  });

  app.post('/api/v1/admin/moderation/reports/:reportId/resolve', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      isModOrAdmin,
      'Moderator or Admin role required to resolve moderation reports.'
    );
    if (!admin) return;
    const action = req.body?.action as CommunityEnforcementAction;
    if (!VALID_ENFORCEMENT.has(action)) {
      res.status(400).json({ error: 'Invalid enforcement action.' });
      return;
    }
    const reviewerNote = sanitizeCommunityPlainText(req.body?.reviewerNote, 500);
    const restrictionLevel: CommunityRestrictionLevel =
      req.body?.restrictionLevel === 'posting_suspended' ? 'posting_suspended' : 'muted_24h';
    const report = resolveModerationReport({
      reportId: req.params.reportId,
      reviewerUserId: admin.id,
      action,
      reviewerNote,
      restrictionLevel,
    });
    if (!report) {
      res.status(404).json({ error: 'Moderation report not found.' });
      return;
    }
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'community.moderation_resolved',
      resource: `report:${report.id}`,
      details: `Resolved report (${report.reason}) with action=${action}.`,
    });
    res.json({ report, ...listModerationQueue() });
  });

  app.post('/api/v1/admin/moderation/appeals/:targetUserId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      isModOrAdmin,
      'Moderator or Admin role required to review appeals.'
    );
    if (!admin) return;
    const decision = req.body?.decision === 'approved' ? 'approved' : 'denied';
    const restriction = updateRestrictionAppealStatus(req.params.targetUserId, decision, admin.id);
    if (!restriction) {
      res.status(404).json({ error: 'Restriction record not found.' });
      return;
    }
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'community.appeal_decided',
      resource: `user:${req.params.targetUserId}`,
      details: `Community restriction appeal ${decision}.`,
    });
    res.json({ restriction, ...listModerationQueue() });
  });

  // ==========================================================================
  // 4. Subscriptions, Entitlements, Invoices & Support (/api/v1/subscriptions & /api/v1/support)
  // ==========================================================================
  app.get('/api/v1/subscriptions/me', (req, res) => {
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const activePlan: SubscriptionPlan =
      user.plan === 'pro' || user.plan === 'institution' ? user.plan : 'free';
    const billing = getUserBillingData(user.id);
    res.json({
      activePlan,
      entitlements: getPlanEntitlements(activePlan),
      catalog: Object.values(PLAN_ENTITLEMENTS_CATALOG),
      subscriptions: billing.subscriptions,
      invoices: billing.invoices,
      supportTickets: billing.tickets,
      paymentProvider: {
        configured: false,
        providerName: 'unconfigured',
        supportedMarketsNoteEn:
          'Live payment gateway settlement (Bangladesh BDT / international USD merchant webhooks) is not yet connected. Upgrade requests are logged honestly as pending_provider with zero simulated charges.',
        supportedMarketsNoteBn:
          'লাইভ পেমেন্ট গেটওয়ে (বাংলাদেশ BDT / আন্তর্জাতিক USD মার্চেন্ট ওয়েবহুক) এখনো সংযুক্ত হয়নি। আপগ্রেড অনুরোধগুলো কোনো ভুয়া চার্জ ছাড়াই pending_provider হিসেবে সংরক্ষিত হয়।',
      },
    });
  });

  app.post('/api/v1/subscriptions/checkout-request', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const retryAfter = checkP3RateLimit(`sub_req:${user.id}`, 10, 60_000);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many subscription requests. Please wait a minute.' });
      return;
    }
    const planSlug = req.body?.planSlug;
    const billingInterval: BillingInterval =
      req.body?.billingInterval === 'yearly' ? 'yearly' : 'monthly';
    if (planSlug !== 'pro' && planSlug !== 'institution') {
      res.status(400).json({ error: 'Please select pro or institution plan.' });
      return;
    }
    const created = createCheckoutRequest({
      userId: user.id,
      planSlug,
      billingInterval,
    });
    res.status(201).json({
      ...created,
      providerConfigured: false,
      message:
        'Upgrade request recorded as pending_provider. No payment has been charged because a live payment gateway is not configured yet.',
    });
  });

  app.post('/api/v1/subscriptions/:subscriptionId/cancel', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const updated = cancelUserSubscription(user.id, req.params.subscriptionId);
    if (!updated) {
      res.status(404).json({ error: 'Subscription record not found.' });
      return;
    }
    res.json({ subscription: updated });
  });

  app.post('/api/v1/subscriptions/invoices/:invoiceId/refund-request', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const reason = sanitizeCommunityPlainText(req.body?.reason, 400);
    if (reason.length < 5) {
      res.status(400).json({ error: 'Please provide a brief reason for your refund request.' });
      return;
    }
    const invoice = requestInvoiceRefund(user.id, req.params.invoiceId, reason);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice record not found.' });
      return;
    }
    res.json({ invoice });
  });

  app.post('/api/v1/support/tickets', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const retryAfter = checkP3RateLimit(`sup_tkt:${user.id}`, 6, 60_000);
    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'Too many support requests. Please wait a minute.' });
      return;
    }
    const category = req.body?.category as SupportTicketRecord['category'];
    const subject = sanitizeCommunityPlainText(req.body?.subject, 120);
    const message = sanitizeCommunityPlainText(req.body?.message, 1500);
    if (!VALID_TICKET_CATEGORIES.has(category) || subject.length < 4 || message.length < 10) {
      res.status(400).json({ error: 'Please provide a valid category, subject, and message.' });
      return;
    }
    const ticket = createSupportTicket({
      userId: user.id,
      userEmail: user.email,
      category,
      subject,
      message,
    });
    res.status(201).json({ ticket });
  });

  app.get('/api/v1/admin/subscriptions', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => ['admin', 'super_admin'].includes(role),
      'Admin or Super Admin role required to access subscription and finance records.'
    );
    if (!admin) return;
    const data = listAllAdminBillingAndSupport();
    const totalUsers = Math.max(1, Number(req.query.totalUsers) || 1);
    const totalAiCostUsd = Math.max(0, Number(req.query.totalAiCostUsd) || 0);
    const financialMetrics = computeRealFinancialMetrics({
      totalUsersCount: totalUsers,
      subscriptions: data.subscriptions,
      invoices: data.invoices,
      totalAiCostUsd,
    });
    res.json({
      ...data,
      financialMetrics,
    });
  });

  app.patch('/api/v1/admin/support/:ticketId', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => ['admin', 'super_admin', 'moderator'].includes(role),
      'Admin or Moderator role required to update support tickets.'
    );
    if (!admin) return;
    const status =
      req.body?.status === 'in_progress' || req.body?.status === 'resolved'
        ? req.body.status
        : 'open';
    const adminResponse = sanitizeCommunityPlainText(req.body?.adminResponse, 1000);
    const ticket = adminUpdateSupportTicket({
      ticketId: req.params.ticketId,
      status,
      adminResponse,
      handledBy: admin.email,
    });
    if (!ticket) {
      res.status(404).json({ error: 'Support ticket not found.' });
      return;
    }
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'support.ticket_updated',
      resource: `ticket:${ticket.id}`,
      details: `Updated support ticket status to ${status}.`,
    });
    res.json({ ticket });
  });

  // ==========================================================================
  // 5. Gamification Retention Preferences & Opt-in Leaderboard (/api/v1/gamification)
  // ==========================================================================
  app.get('/api/v1/gamification/summary', (req, res) => {
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const { prefs, optedInEntries } = getGamificationSummary(user.id, user.name);
    const leaderboard = sortVerifiedLeaderboard(
      optedInEntries.map((entry) => ({
        ...entry,
        level: computeLearnerLevel(entry.totalVerifiedXp).level,
      })),
      user.id
    );
    res.json({ prefs, leaderboard });
  });

  app.put('/api/v1/gamification/preferences', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const user = requireVerifiedLearner(req, res);
    if (!user) return;
    const updated = upsertGamificationPrefs(
      user.id,
      {
        leaderboardOptIn:
          typeof req.body?.leaderboardOptIn === 'boolean' ? req.body.leaderboardOptIn : undefined,
        displayAlias:
          typeof req.body?.displayAlias === 'string'
            ? sanitizeCommunityPlainText(req.body.displayAlias, 32)
            : undefined,
        reminderEnabled:
          typeof req.body?.reminderEnabled === 'boolean' ? req.body.reminderEnabled : undefined,
        reminderTimeLocal:
          typeof req.body?.reminderTimeLocal === 'string' ? req.body.reminderTimeLocal : undefined,
        totalVerifiedXp:
          typeof req.body?.totalVerifiedXp === 'number' ? req.body.totalVerifiedXp : undefined,
      },
      user.name
    );
    const { optedInEntries } = getGamificationSummary(user.id, user.name);
    const leaderboard = sortVerifiedLeaderboard(
      optedInEntries.map((entry) => ({
        ...entry,
        level: computeLearnerLevel(entry.totalVerifiedXp).level,
      })),
      user.id
    );
    res.json({ prefs: updated, leaderboard });
  });

  // ==========================================================================
  // 6. Admin System Configuration (Zero Secret Exposure, RBAC + Audit Logged)
  // ==========================================================================
  app.get('/api/v1/admin/system-settings', (req, res) => {
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => ['admin', 'super_admin'].includes(role),
      'Admin or Super Admin role required to view system configuration.'
    );
    if (!admin) return;
    res.json({
      settings: getSystemConfigSettings(),
      webhookProvidersConfigured: {
        stripe: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
        sslcommerz: Boolean(process.env.SSLCOMMERZ_STORE_PASSWD?.trim()),
        paddle: Boolean(process.env.PADDLE_WEBHOOK_SECRET?.trim()),
      },
    });
  });

  app.put('/api/v1/admin/system-settings', (req, res) => {
    if (!verifyCsrf(req, res)) return;
    const admin = requireExpressAdmin(
      req,
      res,
      (role) => ['admin', 'super_admin'].includes(role),
      'Admin or Super Admin role required to update system configuration.'
    );
    if (!admin) return;

    const current = getSystemConfigSettings();
    const validation = validateSystemConfigPatch(req.body, current);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error, code: 'INVALID_SYSTEM_CONFIG' });
      return;
    }

    const saved = saveSystemConfigSettings(validation.next, admin.email);
    appendServerAuditLog({
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'system.settings_updated',
      resource: 'system_settings:global',
      details: `Updated system settings (audioRetentionDays=${saved.audioRetentionDays}, aiRateLimitPerMinute=${saved.aiRateLimitPerMinute}, freeDailySpeakingLimit=${saved.freeDailySpeakingLimit}, allowNewRegistrations=${saved.allowNewRegistrations}).`,
    });

    res.json({ settings: saved });
  });

  // ==========================================================================
  // 7. Signed Payment Webhook Verification (Fail-Closed & Idempotent)
  // ==========================================================================
  app.post('/api/v1/billing/webhooks/:provider', async (req, res) => {
    const provider = String(req.params.provider || '').trim().toLowerCase() as SupportedWebhookProvider;
    if (!SUPPORTED_WEBHOOK_PROVIDERS.has(provider)) {
      res.status(400).json({ error: 'Unsupported payment provider.', code: 'UNSUPPORTED_PROVIDER' });
      return;
    }

    const secretMap: Record<SupportedWebhookProvider, string | undefined> = {
      stripe: process.env.STRIPE_WEBHOOK_SECRET,
      sslcommerz: process.env.SSLCOMMERZ_STORE_PASSWD,
      paddle: process.env.PADDLE_WEBHOOK_SECRET,
    };
    const secret = secretMap[provider]?.trim();
    if (!secret) {
      res.status(503).json({
        error: `Webhook signing secret for ${provider} is not configured on this server.`,
        code: 'WEBHOOK_SECRET_NOT_CONFIGURED',
      });
      return;
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const signatureHeader =
      (req.headers['x-lv-webhook-signature'] as string | undefined) ||
      (req.headers['stripe-signature'] as string | undefined) ||
      (req.headers['paddle-signature'] as string | undefined);
    const timestampHeader = req.headers['x-lv-webhook-timestamp'] as string | undefined;

    const sigCheck = await verifyPaymentWebhookSignature({
      secret,
      rawBody,
      signatureHeader,
      timestampHeader,
    });
    if (!sigCheck.valid) {
      res.status(401).json({
        error: 'Webhook signature verification failed.',
        code: sigCheck.reason ?? 'INVALID_WEBHOOK_SIGNATURE',
      });
      return;
    }

    let parsedBody: unknown = req.body;
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body);
      } catch {
        res.status(400).json({ error: 'Invalid JSON payload.', code: 'INVALID_JSON' });
        return;
      }
    }

    const validated = validatePaymentWebhookPayload(provider, parsedBody);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error, code: 'INVALID_WEBHOOK_PAYLOAD' });
      return;
    }

    const result = applyVerifiedPaymentWebhookEvent(validated.event);
    if (!result.duplicate) {
      appendServerAuditLog({
        actorEmail: `webhook:${provider}`,
        actorRole: 'system',
        action: `billing.webhook.${validated.event.eventType}`,
        resource: `user:${validated.event.userId}`,
        details: `Verified ${provider} webhook ${validated.event.eventId} -> ${result.statusApplied}.`,
      });
    }

    res.status(200).json({
      received: true,
      duplicate: result.duplicate,
      statusApplied: result.statusApplied,
      eventId: validated.event.eventId,
    });
  });
}
