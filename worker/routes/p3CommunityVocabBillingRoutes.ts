import { generateRandomId } from '../services/crypto';
import type { D1Database } from '../types';
import type { WorkerApp, WorkerRouteDeps } from './parts06To12Routes';
import {
  computeNextVocabReview,
  summarizeVocabDeck,
  validateVocabularyInput,
  VOCAB_SRS_ALGORITHM_VERSION,
  type VocabDifficulty,
  type VocabMasteryStatus,
  type VocabRecallRating,
  type VocabReviewHistoryEntry,
  type VocabSourceType,
  type VocabularyCardRecord,
} from '../../src/domain/vocabularyDeckEngine';
import {
  COMMUNITY_DIRECT_MESSAGING_ENABLED,
  COMMUNITY_GOVERNANCE_RULES,
  filterCommunityFeedForViewer,
  isUserCurrentlyRestricted,
  sanitizeCommunityPlainText,
  validateCommunityCommentInput,
  validateCommunityPostInput,
  type CommunityCategory,
  type CommunityCommentRecord,
  type CommunityEnforcementAction,
  type CommunityPostRecord,
  type CommunityReportReason,
  type CommunityReportRecord,
  type CommunityRestrictionLevel,
  type CommunityRestrictionRecord,
} from '../../src/domain/communityModerationEngine';
import {
  computeRealFinancialMetrics,
  getPlanEntitlements,
  getQuotedPlanAmountCents,
  PLAN_ENTITLEMENTS_CATALOG,
  type BillingInterval,
  type SubscriptionInvoiceRecord,
  type SubscriptionRecord,
  type SupportTicketRecord,
} from '../../src/domain/subscriptionEntitlementsEngine';
import { computeLearnerLevel, sortVerifiedLeaderboard } from '../../src/domain/gamificationEngine';
import type { SpacedRepetitionPreset, SubscriptionPlan } from '../../src/types/domain';
import {
  DEFAULT_SYSTEM_CONFIG,
  SUPPORTED_WEBHOOK_PROVIDERS,
  validatePaymentWebhookPayload,
  validateSystemConfigPatch,
  verifyPaymentWebhookSignature,
  type SupportedWebhookProvider,
  type SystemConfigSettings,
} from '../../src/domain/paymentWebhookEngine';

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

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapVocabRow(row: Record<string, unknown>): VocabularyCardRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    word: String(row.word),
    wordNormalized: String(row.word_normalized),
    phoneticHint: typeof row.phonetic_hint === 'string' ? row.phonetic_hint : '',
    meaningEn: String(row.meaning_en),
    meaningBn: String(row.meaning_bn),
    exampleSentence: String(row.example_sentence),
    sourceType: (row.source_type as VocabSourceType) || 'manual',
    sourceId: typeof row.source_id === 'string' ? row.source_id : undefined,
    difficulty: (row.difficulty as VocabDifficulty) || 'medium',
    reviewCount: Number(row.review_count || 0),
    passCount: Number(row.pass_count || 0),
    consecutivePasses: Number(row.consecutive_passes || 0),
    intervalDays: Number(row.interval_days || 1),
    masteryStatus: (row.mastery_status as VocabMasteryStatus) || 'new',
    algorithmVersion: String(row.algorithm_version || VOCAB_SRS_ALGORITHM_VERSION),
    lastReviewedAt: typeof row.last_reviewed_at === 'string' ? row.last_reviewed_at : null,
    nextReviewAt: String(row.next_review_at),
    reviewHistory: safeJsonParse<VocabReviewHistoryEntry[]>(row.review_history_json, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRestrictionRow(row: Record<string, unknown> | null): CommunityRestrictionRecord | null {
  if (!row) return null;
  return {
    userId: String(row.user_id),
    restrictionLevel: (row.restriction_level as CommunityRestrictionLevel) || 'none',
    reason: String(row.reason || ''),
    restrictedBy: typeof row.restricted_by === 'string' ? row.restricted_by : null,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
    appealText: typeof row.appeal_text === 'string' ? row.appeal_text : null,
    appealStatus: (row.appeal_status as CommunityRestrictionRecord['appealStatus']) || 'none',
    updatedAt: String(row.updated_at),
  };
}

export function registerP3CommunityVocabBillingRoutes(
  app: WorkerApp,
  deps: WorkerRouteDeps
): void {
  const { requireAuth, requireAdmin, checkRateLimit, writeAuditLog } = deps;

  // ==========================================================================
  // 1. Spaced-Repetition Vocabulary Deck (/api/v1/vocabulary)
  // ==========================================================================
  app.get('/api/v1/vocabulary', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const rows = await c.env.DB.prepare(
      `SELECT * FROM vocabulary_items WHERE user_id = ? ORDER BY next_review_at ASC LIMIT 500`
    )
      .bind(auth.id)
      .all<Record<string, unknown>>();
    const cards = rows.results.map(mapVocabRow);
    return c.json({ cards, summary: summarizeVocabDeck(cards) });
  });

  app.post('/api/v1/vocabulary', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    if (!(await checkRateLimit(c, 'vocab_add', 30))) {
      return c.json({ error: 'Too many vocabulary requests.' }, 429);
    }
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const validation = validateVocabularyInput(body);
    if (!validation.ok || !validation.cleaned) {
      return c.json({ error: validation.error || 'Invalid vocabulary card.' }, 400);
    }
    const cleaned = validation.cleaned;
    const now = new Date().toISOString();
    const existing = await c.env.DB.prepare(
      `SELECT * FROM vocabulary_items WHERE user_id = ? AND word_normalized = ? LIMIT 1`
    )
      .bind(auth.id, cleaned.wordNormalized)
      .first<Record<string, unknown>>();

    let cardId: string;
    if (existing) {
      cardId = String(existing.id);
      await c.env.DB.prepare(
        `UPDATE vocabulary_items
         SET word = ?, phonetic_hint = ?, meaning_en = ?, meaning_bn = ?, example_sentence = ?,
             difficulty = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
        .bind(
          cleaned.word,
          cleaned.phoneticHint,
          cleaned.meaningEn,
          cleaned.meaningBn,
          cleaned.exampleSentence,
          cleaned.difficulty,
          now,
          cardId,
          auth.id
        )
        .run();
    } else {
      cardId = generateRandomId('voc');
      await c.env.DB.prepare(
        `INSERT INTO vocabulary_items (
          id, user_id, word, word_normalized, phonetic_hint, meaning_en, meaning_bn,
          example_sentence, source_type, source_id, difficulty, review_count, pass_count,
          consecutive_passes, interval_days, mastery_status, algorithm_version,
          last_reviewed_at, next_review_at, review_history_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, 'new', ?, NULL, ?, '[]', ?, ?)`
      )
        .bind(
          cardId,
          auth.id,
          cleaned.word,
          cleaned.wordNormalized,
          cleaned.phoneticHint,
          cleaned.meaningEn,
          cleaned.meaningBn,
          cleaned.exampleSentence,
          cleaned.sourceType,
          typeof body.sourceId === 'string' ? body.sourceId.slice(0, 80) : null,
          cleaned.difficulty,
          VOCAB_SRS_ALGORITHM_VERSION,
          now,
          now,
          now
        )
        .run();
    }

    const rows = await c.env.DB.prepare(
      `SELECT * FROM vocabulary_items WHERE user_id = ? ORDER BY next_review_at ASC LIMIT 500`
    )
      .bind(auth.id)
      .all<Record<string, unknown>>();
    const cards = rows.results.map(mapVocabRow);
    const card = cards.find((x) => x.id === cardId) ?? cards[0];
    return c.json({ card, cards, summary: summarizeVocabDeck(cards) }, 201);
  });

  app.post('/api/v1/vocabulary/:cardId/review', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const cardId = c.req.param('cardId');
    const body = (await c.req.json().catch(() => ({}))) as {
      rating?: VocabRecallRating;
      preset?: SpacedRepetitionPreset;
    };
    if (!body.rating || !VALID_RATINGS.has(body.rating)) {
      return c.json({ error: 'Invalid recall rating.' }, 400);
    }
    const row = await c.env.DB.prepare(
      `SELECT * FROM vocabulary_items WHERE id = ? AND user_id = ? LIMIT 1`
    )
      .bind(cardId, auth.id)
      .first<Record<string, unknown>>();
    if (!row) return c.json({ error: 'Vocabulary card not found.' }, 404);

    const preset: SpacedRepetitionPreset =
      body.preset === 'intensive' || body.preset === 'relaxed' ? body.preset : 'standard';
    const updated = computeNextVocabReview(mapVocabRow(row), body.rating, preset);

    await c.env.DB.prepare(
      `UPDATE vocabulary_items
       SET difficulty = ?, review_count = ?, pass_count = ?, consecutive_passes = ?,
           interval_days = ?, mastery_status = ?, algorithm_version = ?,
           last_reviewed_at = ?, next_review_at = ?, review_history_json = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
      .bind(
        updated.difficulty,
        updated.reviewCount,
        updated.passCount,
        updated.consecutivePasses,
        updated.intervalDays,
        updated.masteryStatus,
        updated.algorithmVersion,
        updated.lastReviewedAt,
        updated.nextReviewAt,
        JSON.stringify(updated.reviewHistory),
        updated.updatedAt,
        cardId,
        auth.id
      )
      .run();

    const rows = await c.env.DB.prepare(
      `SELECT * FROM vocabulary_items WHERE user_id = ? ORDER BY next_review_at ASC LIMIT 500`
    )
      .bind(auth.id)
      .all<Record<string, unknown>>();
    const cards = rows.results.map(mapVocabRow);
    return c.json({ card: updated, cards, summary: summarizeVocabDeck(cards) });
  });

  app.delete('/api/v1/vocabulary/:cardId', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const cardId = c.req.param('cardId');
    await c.env.DB.prepare(`DELETE FROM vocabulary_items WHERE id = ? AND user_id = ?`)
      .bind(cardId, auth.id)
      .run();
    const rows = await c.env.DB.prepare(
      `SELECT * FROM vocabulary_items WHERE user_id = ? ORDER BY next_review_at ASC LIMIT 500`
    )
      .bind(auth.id)
      .all<Record<string, unknown>>();
    const cards = rows.results.map(mapVocabRow);
    return c.json({ deleted: true, cards, summary: summarizeVocabDeck(cards) });
  });

  // ==========================================================================
  // 2. Learner Community & Moderation (/api/v1/community & /api/v1/admin/moderation)
  // ==========================================================================
  app.get('/api/v1/community/posts', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;

    const categoryRaw = c.req.query('category') || 'all';
    const category: CommunityCategory | 'all' =
      categoryRaw === 'discussion' ||
      categoryRaw === 'question' ||
      categoryRaw === 'practice_challenge'
        ? categoryRaw
        : 'all';
    const query = (c.req.query('q') || '').slice(0, 120);

    const [postsRes, commentsRes, blocksRes, restrictionRow] = await Promise.all([
      c.env.DB.prepare(
        `SELECT * FROM community_posts WHERE status = 'active' ORDER BY created_at DESC LIMIT 100`
      ).all<Record<string, unknown>>(),
      c.env.DB.prepare(
        `SELECT * FROM community_comments WHERE status = 'active' ORDER BY created_at ASC LIMIT 400`
      ).all<Record<string, unknown>>(),
      c.env.DB.prepare(`SELECT blocked_user_id FROM community_user_blocks WHERE blocker_user_id = ?`)
        .bind(auth.id)
        .all<{ blocked_user_id: string }>(),
      c.env.DB.prepare(`SELECT * FROM community_user_restrictions WHERE user_id = ? LIMIT 1`)
        .bind(auth.id)
        .first<Record<string, unknown>>(),
    ]);

    const commentsByPost = new Map<string, CommunityCommentRecord[]>();
    for (const row of commentsRes.results) {
      const postId = String(row.post_id);
      const list = commentsByPost.get(postId) ?? [];
      list.push({
        id: String(row.id),
        postId,
        authorUserId: String(row.author_user_id),
        authorName: String(row.author_name),
        body: String(row.body),
        status: (row.status as CommunityCommentRecord['status']) || 'active',
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      });
      commentsByPost.set(postId, list);
    }

    const allPosts: CommunityPostRecord[] = postsRes.results.map((r) => ({
      id: String(r.id),
      authorUserId: String(r.author_user_id),
      authorName: String(r.author_name),
      authorLevel: String(r.author_level || 'A2'),
      category: (r.category as CommunityCategory) || 'discussion',
      title: String(r.title),
      body: String(r.body),
      tags: safeJsonParse<string[]>(r.tags_json, []),
      helpfulUserIds: safeJsonParse<string[]>(r.helpful_user_ids_json, []),
      status: (r.status as CommunityPostRecord['status']) || 'active',
      moderationNote: typeof r.moderation_note === 'string' ? r.moderation_note : null,
      comments: commentsByPost.get(String(r.id)) ?? [],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));

    const blockedUserIds = blocksRes.results.map((b) => String(b.blocked_user_id));
    const restriction = mapRestrictionRow(restrictionRow);

    return c.json({
      posts: filterCommunityFeedForViewer(allPosts, blockedUserIds, { category, query }),
      viewerUserId: auth.id,
      blockedUserIds,
      restriction,
      isRestricted: isUserCurrentlyRestricted(restriction),
      directMessagingEnabled: COMMUNITY_DIRECT_MESSAGING_ENABLED,
      governanceRules: COMMUNITY_GOVERNANCE_RULES,
    });
  });

  app.post('/api/v1/community/posts', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    if (!(await checkRateLimit(c, 'comm_post', 8))) {
      return c.json({ error: 'Posting rate limit reached.' }, 429);
    }
    const restrictionRow = await c.env.DB.prepare(
      `SELECT * FROM community_user_restrictions WHERE user_id = ? LIMIT 1`
    )
      .bind(auth.id)
      .first<Record<string, unknown>>();
    if (isUserCurrentlyRestricted(mapRestrictionRow(restrictionRow))) {
      return c.json({ error: 'Your posting privileges are currently restricted.' }, 403);
    }

    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const validation = validateCommunityPostInput(body);
    if (!validation.ok || !validation.cleaned) {
      return c.json({ error: validation.error || 'Invalid post content.' }, 400);
    }
    const id = generateRandomId('post');
    const now = new Date().toISOString();
    const authorLevel = sanitizeCommunityPlainText(body.authorLevel, 16) || 'A2';

    await c.env.DB.prepare(
      `INSERT INTO community_posts (
        id, author_user_id, author_name, author_level, category, title, body,
        tags_json, helpful_user_ids_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', 'active', ?, ?)`
    )
      .bind(
        id,
        auth.id,
        auth.name || 'Learner',
        authorLevel,
        validation.cleaned.category,
        validation.cleaned.title,
        validation.cleaned.body,
        JSON.stringify(validation.cleaned.tags),
        now,
        now
      )
      .run();

    return c.json(
      {
        post: {
          id,
          authorUserId: auth.id,
          authorName: auth.name || 'Learner',
          authorLevel,
          ...validation.cleaned,
          helpfulUserIds: [],
          status: 'active',
          comments: [],
          createdAt: now,
          updatedAt: now,
        },
      },
      201
    );
  });

  app.post('/api/v1/community/posts/:postId/comments', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    if (!(await checkRateLimit(c, 'comm_cmt', 20))) {
      return c.json({ error: 'Too many comments.' }, 429);
    }
    const restrictionRow = await c.env.DB.prepare(
      `SELECT * FROM community_user_restrictions WHERE user_id = ? LIMIT 1`
    )
      .bind(auth.id)
      .first<Record<string, unknown>>();
    if (isUserCurrentlyRestricted(mapRestrictionRow(restrictionRow))) {
      return c.json({ error: 'Commenting is restricted for your account.' }, 403);
    }

    const postId = c.req.param('postId');
    const post = await c.env.DB.prepare(
      `SELECT id FROM community_posts WHERE id = ? AND status = 'active' LIMIT 1`
    )
      .bind(postId)
      .first();
    if (!post) return c.json({ error: 'Post not found.' }, 404);

    const body = (await c.req.json().catch(() => ({}))) as { body?: unknown };
    const validation = validateCommunityCommentInput(body.body);
    if (!validation.ok || !validation.body) {
      return c.json({ error: validation.error || 'Invalid comment.' }, 400);
    }

    const id = generateRandomId('cmt');
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO community_comments (id, post_id, author_user_id, author_name, body, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    )
      .bind(id, postId, auth.id, auth.name || 'Learner', validation.body, now, now)
      .run();

    return c.json(
      {
        comment: {
          id,
          postId,
          authorUserId: auth.id,
          authorName: auth.name || 'Learner',
          body: validation.body,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        },
      },
      201
    );
  });

  app.post('/api/v1/community/posts/:postId/reactions', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const postId = c.req.param('postId');
    const row = await c.env.DB.prepare(
      `SELECT * FROM community_posts WHERE id = ? AND status = 'active' LIMIT 1`
    )
      .bind(postId)
      .first<Record<string, unknown>>();
    if (!row) return c.json({ error: 'Post not found.' }, 404);

    const current = safeJsonParse<string[]>(row.helpful_user_ids_json, []);
    const next = current.includes(auth.id)
      ? current.filter((u) => u !== auth.id)
      : [...current, auth.id];
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `UPDATE community_posts SET helpful_user_ids_json = ?, updated_at = ? WHERE id = ?`
    )
      .bind(JSON.stringify(next), now, postId)
      .run();

    return c.json({ post: { id: postId, helpfulUserIds: next, updatedAt: now } });
  });

  app.post('/api/v1/community/reports', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const targetType = body.targetType;
    const targetId = sanitizeCommunityPlainText(body.targetId, 80);
    const reason = body.reason as CommunityReportReason;
    const details = sanitizeCommunityPlainText(body.details, 500);
    if (
      (targetType !== 'post' && targetType !== 'comment' && targetType !== 'user') ||
      !targetId ||
      !VALID_REPORT_REASONS.has(reason)
    ) {
      return c.json({ error: 'Invalid report payload.' }, 400);
    }
    const id = generateRandomId('rep');
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO community_reports (
        id, target_type, target_id, reporter_user_id, reason, details, status, enforcement_action, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'none', ?)`
    )
      .bind(id, targetType, targetId, auth.id, reason, details, now)
      .run();

    return c.json(
      {
        report: {
          id,
          targetType,
          targetId,
          reporterUserId: auth.id,
          reason,
          details,
          status: 'pending',
          enforcementAction: 'none',
          createdAt: now,
        },
      },
      201
    );
  });

  app.post('/api/v1/community/blocks', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const body = (await c.req.json().catch(() => ({}))) as { blockedUserId?: unknown };
    const blockedUserId = sanitizeCommunityPlainText(body.blockedUserId, 80);
    if (!blockedUserId || blockedUserId === auth.id) {
      return c.json({ error: 'Valid target user ID required.' }, 400);
    }
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO community_user_blocks (id, blocker_user_id, blocked_user_id, created_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(generateRandomId('blk'), auth.id, blockedUserId, new Date().toISOString())
      .run();
    const res = await c.env.DB.prepare(
      `SELECT blocked_user_id FROM community_user_blocks WHERE blocker_user_id = ?`
    )
      .bind(auth.id)
      .all<{ blocked_user_id: string }>();
    return c.json({ blockedUserIds: res.results.map((r) => String(r.blocked_user_id)) }, 201);
  });

  app.delete('/api/v1/community/blocks/:blockedUserId', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    await c.env.DB.prepare(
      `DELETE FROM community_user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?`
    )
      .bind(auth.id, c.req.param('blockedUserId'))
      .run();
    const res = await c.env.DB.prepare(
      `SELECT blocked_user_id FROM community_user_blocks WHERE blocker_user_id = ?`
    )
      .bind(auth.id)
      .all<{ blocked_user_id: string }>();
    return c.json({ blockedUserIds: res.results.map((r) => String(r.blocked_user_id)) });
  });

  app.get('/api/v1/admin/moderation/reports', async (c) => {
    const admin = await requireAdmin(c, ['moderator', 'admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const [reportsRes, restrictionsRes] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM community_reports ORDER BY created_at DESC LIMIT 200`).all<
        Record<string, unknown>
      >(),
      c.env.DB.prepare(
        `SELECT * FROM community_user_restrictions WHERE restriction_level != 'none' OR appeal_status = 'pending'`
      ).all<Record<string, unknown>>(),
    ]);
    const reports: CommunityReportRecord[] = reportsRes.results.map((r) => ({
      id: String(r.id),
      targetType: r.target_type as CommunityReportRecord['targetType'],
      targetId: String(r.target_id),
      reporterUserId: String(r.reporter_user_id),
      reason: r.reason as CommunityReportReason,
      details: String(r.details || ''),
      status: r.status as CommunityReportRecord['status'],
      enforcementAction: r.enforcement_action as CommunityEnforcementAction,
      reviewerUserId: typeof r.reviewer_user_id === 'string' ? r.reviewer_user_id : null,
      reviewerNote: typeof r.reviewer_note === 'string' ? r.reviewer_note : null,
      reviewedAt: typeof r.reviewed_at === 'string' ? r.reviewed_at : null,
      createdAt: String(r.created_at),
    }));
    const restrictions = restrictionsRes.results
      .map((r) => mapRestrictionRow(r))
      .filter((r): r is CommunityRestrictionRecord => r !== null);
    return c.json({ reports, restrictions });
  });

  app.post('/api/v1/admin/moderation/reports/:reportId/resolve', async (c) => {
    const admin = await requireAdmin(c, ['moderator', 'admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const reportId = c.req.param('reportId');
    const body = (await c.req.json().catch(() => ({}))) as {
      action?: CommunityEnforcementAction;
      reviewerNote?: unknown;
      restrictionLevel?: CommunityRestrictionLevel;
    };
    if (!body.action || !VALID_ENFORCEMENT.has(body.action)) {
      return c.json({ error: 'Invalid enforcement action.' }, 400);
    }
    const existing = await c.env.DB.prepare(`SELECT * FROM community_reports WHERE id = ? LIMIT 1`)
      .bind(reportId)
      .first<Record<string, unknown>>();
    if (!existing) return c.json({ error: 'Moderation report not found.' }, 404);

    const now = new Date().toISOString();
    const reviewerNote = sanitizeCommunityPlainText(body.reviewerNote, 500);
    const nextStatus = body.action === 'none' ? 'resolved_dismissed' : 'resolved_removed';

    await c.env.DB.prepare(
      `UPDATE community_reports
       SET status = ?, enforcement_action = ?, reviewer_user_id = ?, reviewer_note = ?, reviewed_at = ?
       WHERE id = ?`
    )
      .bind(nextStatus, body.action, admin.id, reviewerNote, now, reportId)
      .run();

    let targetAuthorId: string | null = null;
    if (existing.target_type === 'post') {
      const post = await c.env.DB.prepare(`SELECT author_user_id FROM community_posts WHERE id = ?`)
        .bind(String(existing.target_id))
        .first<{ author_user_id: string }>();
      targetAuthorId = post?.author_user_id ?? null;
      if (body.action === 'hide_content' || body.action === 'restrict_user') {
        await c.env.DB.prepare(
          `UPDATE community_posts SET status = 'hidden_by_mod', moderation_note = ?, updated_at = ? WHERE id = ?`
        )
          .bind(reviewerNote || 'Removed by moderation.', now, String(existing.target_id))
          .run();
      }
    } else if (existing.target_type === 'comment') {
      const cmt = await c.env.DB.prepare(
        `SELECT author_user_id FROM community_comments WHERE id = ?`
      )
        .bind(String(existing.target_id))
        .first<{ author_user_id: string }>();
      targetAuthorId = cmt?.author_user_id ?? null;
      if (body.action === 'hide_content' || body.action === 'restrict_user') {
        await c.env.DB.prepare(
          `UPDATE community_comments SET status = 'hidden_by_mod', updated_at = ? WHERE id = ?`
        )
          .bind(now, String(existing.target_id))
          .run();
      }
    }

    if (body.action === 'restrict_user' && targetAuthorId) {
      const level: CommunityRestrictionLevel =
        body.restrictionLevel === 'posting_suspended' ? 'posting_suspended' : 'muted_24h';
      const expiresAt =
        level === 'muted_24h' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
      await c.env.DB.prepare(
        `INSERT OR REPLACE INTO community_user_restrictions (
          user_id, restriction_level, reason, restricted_by, expires_at, appeal_text, appeal_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, NULL, 'none', ?)`
      )
        .bind(targetAuthorId, level, reviewerNote || 'Moderation enforcement', admin.id, expiresAt, now)
        .run();
    }

    await writeAuditLog(c.env, {
      actorUserId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'community.moderation_resolved',
      resourceType: 'community_report',
      resourceId: reportId,
      summaryEn: `Resolved community report ${reportId} with action=${body.action}.`,
      summaryBn: `কমিউনিটি রিপোর্ট ${reportId} নিষ্পত্তি হয়েছে (${body.action})।`,
    });

    const [updatedReportRow, allReportsRes, allRestrictionsRes] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM community_reports WHERE id = ? LIMIT 1`)
        .bind(reportId)
        .first<Record<string, unknown>>(),
      c.env.DB.prepare(`SELECT * FROM community_reports ORDER BY created_at DESC LIMIT 200`).all<
        Record<string, unknown>
      >(),
      c.env.DB.prepare(
        `SELECT * FROM community_user_restrictions WHERE restriction_level != 'none' OR appeal_status = 'pending'`
      ).all<Record<string, unknown>>(),
    ]);
    const mapReport = (r: Record<string, unknown>): CommunityReportRecord => ({
      id: String(r.id),
      targetType: r.target_type as CommunityReportRecord['targetType'],
      targetId: String(r.target_id),
      reporterUserId: String(r.reporter_user_id),
      reason: r.reason as CommunityReportReason,
      details: String(r.details || ''),
      status: r.status as CommunityReportRecord['status'],
      enforcementAction: r.enforcement_action as CommunityEnforcementAction,
      reviewerUserId: typeof r.reviewer_user_id === 'string' ? r.reviewer_user_id : null,
      reviewerNote: typeof r.reviewer_note === 'string' ? r.reviewer_note : null,
      reviewedAt: typeof r.reviewed_at === 'string' ? r.reviewed_at : null,
      createdAt: String(r.created_at),
    });
    const reports = allReportsRes.results.map(mapReport);
    const restrictions = allRestrictionsRes.results
      .map((r) => mapRestrictionRow(r))
      .filter((r): r is CommunityRestrictionRecord => r !== null);

    return c.json({
      ok: true,
      report: updatedReportRow ? mapReport(updatedReportRow) : null,
      reports,
      restrictions,
    });
  });

  app.post('/api/v1/community/appeals', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const body = (await c.req.json().catch(() => ({}))) as { appealText?: unknown };
    const appealText = sanitizeCommunityPlainText(body.appealText, 800);
    if (appealText.length < 10) {
      return c.json({ error: 'Please explain your appeal in at least 10 characters.' }, 400);
    }
    const existing = await c.env.DB.prepare(
      `SELECT * FROM community_user_restrictions WHERE user_id = ? LIMIT 1`
    )
      .bind(auth.id)
      .first<Record<string, unknown>>();
    if (!existing || existing.restriction_level === 'none') {
      return c.json({ error: 'No active community restriction found to appeal.' }, 404);
    }
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `UPDATE community_user_restrictions
       SET appeal_text = ?, appeal_status = 'pending', updated_at = ?
       WHERE user_id = ?`
    )
      .bind(appealText, now, auth.id)
      .run();
    const updated = await c.env.DB.prepare(
      `SELECT * FROM community_user_restrictions WHERE user_id = ? LIMIT 1`
    )
      .bind(auth.id)
      .first<Record<string, unknown>>();
    return c.json({ restriction: mapRestrictionRow(updated) });
  });

  app.post('/api/v1/admin/moderation/appeals/:targetUserId', async (c) => {
    const admin = await requireAdmin(c, ['moderator', 'admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const targetUserId = c.req.param('targetUserId');
    const body = (await c.req.json().catch(() => ({}))) as { decision?: unknown };
    const decision = body.decision === 'approved' ? 'approved' : body.decision === 'denied' ? 'denied' : null;
    if (!decision) {
      return c.json({ error: 'Decision must be approved or denied.' }, 400);
    }
    const existing = await c.env.DB.prepare(
      `SELECT * FROM community_user_restrictions WHERE user_id = ? LIMIT 1`
    )
      .bind(targetUserId)
      .first<Record<string, unknown>>();
    if (!existing) {
      return c.json({ error: 'Restriction record not found.' }, 404);
    }
    const now = new Date().toISOString();
    const nextLevel = decision === 'approved' ? 'none' : String(existing.restriction_level || 'muted_24h');
    await c.env.DB.prepare(
      `UPDATE community_user_restrictions
       SET restriction_level = ?, appeal_status = ?, updated_at = ?
       WHERE user_id = ?`
    )
      .bind(nextLevel, decision, now, targetUserId)
      .run();

    await writeAuditLog(c.env, {
      actorUserId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'community.appeal_decided',
      resourceType: 'community_restriction',
      resourceId: targetUserId,
      summaryEn: `Community appeal for ${targetUserId} marked ${decision}.`,
      summaryBn: `${targetUserId}-এর কমিউনিটি আপিল ${decision} করা হয়েছে।`,
    });

    const [updatedRow, allReportsRes, allRestrictionsRes] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM community_user_restrictions WHERE user_id = ? LIMIT 1`)
        .bind(targetUserId)
        .first<Record<string, unknown>>(),
      c.env.DB.prepare(`SELECT * FROM community_reports ORDER BY created_at DESC LIMIT 200`).all<
        Record<string, unknown>
      >(),
      c.env.DB.prepare(
        `SELECT * FROM community_user_restrictions WHERE restriction_level != 'none' OR appeal_status = 'pending'`
      ).all<Record<string, unknown>>(),
    ]);
    const reports: CommunityReportRecord[] = allReportsRes.results.map((r) => ({
      id: String(r.id),
      targetType: r.target_type as CommunityReportRecord['targetType'],
      targetId: String(r.target_id),
      reporterUserId: String(r.reporter_user_id),
      reason: r.reason as CommunityReportReason,
      details: String(r.details || ''),
      status: r.status as CommunityReportRecord['status'],
      enforcementAction: r.enforcement_action as CommunityEnforcementAction,
      reviewerUserId: typeof r.reviewer_user_id === 'string' ? r.reviewer_user_id : null,
      reviewerNote: typeof r.reviewer_note === 'string' ? r.reviewer_note : null,
      reviewedAt: typeof r.reviewed_at === 'string' ? r.reviewed_at : null,
      createdAt: String(r.created_at),
    }));
    const restrictions = allRestrictionsRes.results
      .map((r) => mapRestrictionRow(r))
      .filter((r): r is CommunityRestrictionRecord => r !== null);

    return c.json({
      restriction: mapRestrictionRow(updatedRow),
      reports,
      restrictions,
    });
  });

  // ==========================================================================
  // 3. Subscriptions, Invoices, Financial Metrics & Support Tickets
  // ==========================================================================
  app.get('/api/v1/subscriptions/me', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const activePlan: SubscriptionPlan =
      auth.plan === 'pro' || auth.plan === 'institution' ? auth.plan : 'free';
    const [subsRes, invRes, ticketsRes] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC`)
        .bind(auth.id)
        .all<Record<string, unknown>>(),
      c.env.DB.prepare(
        `SELECT * FROM subscription_invoices WHERE user_id = ? ORDER BY created_at DESC`
      )
        .bind(auth.id)
        .all<Record<string, unknown>>(),
      c.env.DB.prepare(`SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`)
        .bind(auth.id)
        .all<Record<string, unknown>>(),
    ]);

    return c.json({
      activePlan,
      entitlements: getPlanEntitlements(activePlan),
      catalog: Object.values(PLAN_ENTITLEMENTS_CATALOG),
      subscriptions: subsRes.results.map((s) => ({
        id: String(s.id),
        userId: String(s.user_id),
        planSlug: s.plan_slug as SubscriptionPlan,
        billingInterval: s.billing_interval as BillingInterval,
        status: s.status as SubscriptionRecord['status'],
        provider: String(s.provider),
        createdAt: String(s.created_at),
        updatedAt: String(s.updated_at),
      })),
      invoices: invRes.results.map((i) => ({
        id: String(i.id),
        subscriptionId: String(i.subscription_id),
        userId: String(i.user_id),
        planSlug: i.plan_slug as SubscriptionPlan,
        billingInterval: i.billing_interval as BillingInterval,
        amountCents: Number(i.amount_cents || 0),
        currency: String(i.currency || 'USD'),
        status: i.status as SubscriptionInvoiceRecord['status'],
        provider: String(i.provider),
        failureReason: typeof i.failure_reason === 'string' ? i.failure_reason : null,
        refundReason: typeof i.refund_reason === 'string' ? i.refund_reason : null,
        createdAt: String(i.created_at),
        updatedAt: String(i.updated_at),
      })),
      supportTickets: ticketsRes.results.map((t) => ({
        id: String(t.id),
        userId: String(t.user_id),
        userEmail: String(t.user_email),
        category: t.category as SupportTicketRecord['category'],
        subject: String(t.subject),
        message: String(t.message),
        status: t.status as SupportTicketRecord['status'],
        adminResponse: typeof t.admin_response === 'string' ? t.admin_response : null,
        handledBy: typeof t.handled_by === 'string' ? t.handled_by : null,
        createdAt: String(t.created_at),
        updatedAt: String(t.updated_at),
      })),
      paymentProvider: {
        configured: false,
        providerName: 'unconfigured',
        supportedMarketsNoteEn:
          'Live payment gateway settlement is not yet configured. Upgrade requests are logged as pending_provider without simulated charges.',
        supportedMarketsNoteBn:
          'লাইভ পেমেন্ট গেটওয়ে এখনো কনফিগার করা হয়নি। আপগ্রেড অনুরোধ কোনো ভুয়া চার্জ ছাড়াই pending_provider হিসেবে সংরক্ষিত হয়।',
      },
    });
  });

  app.post('/api/v1/subscriptions/checkout-request', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    if (!(await checkRateLimit(c, 'sub_req', 10))) {
      return c.json({ error: 'Too many subscription requests.' }, 429);
    }
    const body = (await c.req.json().catch(() => ({}))) as {
      planSlug?: unknown;
      billingInterval?: unknown;
    };
    const planSlug = body.planSlug;
    const billingInterval: BillingInterval =
      body.billingInterval === 'yearly' ? 'yearly' : 'monthly';
    if (planSlug !== 'pro' && planSlug !== 'institution') {
      return c.json({ error: 'Please select pro or institution plan.' }, 400);
    }
    const now = new Date().toISOString();
    const subId = generateRandomId('sub');
    const invId = generateRandomId('inv');
    const amountCents = getQuotedPlanAmountCents(planSlug, billingInterval);

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO subscriptions (id, user_id, plan_slug, billing_interval, status, provider, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending_provider', 'unconfigured', ?, ?)`
      ).bind(subId, auth.id, planSlug, billingInterval, now, now),
      c.env.DB.prepare(
        `INSERT INTO subscription_invoices (id, subscription_id, user_id, plan_slug, billing_interval, amount_cents, currency, status, provider, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'USD', 'pending_provider', 'unconfigured', ?, ?)`
      ).bind(invId, subId, auth.id, planSlug, billingInterval, amountCents, now, now),
    ]);

    return c.json(
      {
        subscription: {
          id: subId,
          userId: auth.id,
          planSlug,
          billingInterval,
          status: 'pending_provider',
          provider: 'unconfigured',
          createdAt: now,
          updatedAt: now,
        },
        invoice: {
          id: invId,
          subscriptionId: subId,
          userId: auth.id,
          planSlug,
          billingInterval,
          amountCents,
          currency: 'USD',
          status: 'pending_provider',
          provider: 'unconfigured',
          createdAt: now,
          updatedAt: now,
        },
        providerConfigured: false,
      },
      201
    );
  });

  app.post('/api/v1/support/tickets', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const category = body.category as SupportTicketRecord['category'];
    const subject = sanitizeCommunityPlainText(body.subject, 120);
    const message = sanitizeCommunityPlainText(body.message, 1500);
    if (!VALID_TICKET_CATEGORIES.has(category) || subject.length < 4 || message.length < 10) {
      return c.json({ error: 'Valid category, subject, and message required.' }, 400);
    }
    const id = generateRandomId('sup');
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO support_tickets (id, user_id, user_email, category, subject, message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`
    )
      .bind(id, auth.id, auth.email, category, subject, message, now, now)
      .run();
    return c.json(
      {
        ticket: {
          id,
          userId: auth.id,
          userEmail: auth.email,
          category,
          subject,
          message,
          status: 'open',
          createdAt: now,
          updatedAt: now,
        },
      },
      201
    );
  });

  app.get('/api/v1/admin/subscriptions', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const [usersCountRow, subsRes, invRes, aiCostRow, ticketsRes] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM users`).first<{ cnt: number }>(),
      c.env.DB.prepare(`SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 200`).all<
        Record<string, unknown>
      >(),
      c.env.DB.prepare(`SELECT * FROM subscription_invoices ORDER BY created_at DESC LIMIT 200`).all<
        Record<string, unknown>
      >(),
      c.env.DB.prepare(`SELECT COALESCE(SUM(estimated_cost_usd), 0) AS total FROM ai_usage_ledger`).first<{
        total: number;
      }>(),
      c.env.DB.prepare(`SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 200`).all<
        Record<string, unknown>
      >(),
    ]);

    const subscriptions: SubscriptionRecord[] = subsRes.results.map((s) => ({
      id: String(s.id),
      userId: String(s.user_id),
      planSlug: s.plan_slug as SubscriptionPlan,
      billingInterval: s.billing_interval as BillingInterval,
      status: s.status as SubscriptionRecord['status'],
      provider: String(s.provider),
      createdAt: String(s.created_at),
      updatedAt: String(s.updated_at),
    }));
    const invoices: SubscriptionInvoiceRecord[] = invRes.results.map((i) => ({
      id: String(i.id),
      subscriptionId: String(i.subscription_id),
      userId: String(i.user_id),
      planSlug: i.plan_slug as SubscriptionPlan,
      billingInterval: i.billing_interval as BillingInterval,
      amountCents: Number(i.amount_cents || 0),
      currency: String(i.currency || 'USD'),
      status: i.status as SubscriptionInvoiceRecord['status'],
      provider: String(i.provider),
      failureReason: typeof i.failure_reason === 'string' ? i.failure_reason : null,
      refundReason: typeof i.refund_reason === 'string' ? i.refund_reason : null,
      createdAt: String(i.created_at),
      updatedAt: String(i.updated_at),
    }));
    const supportTickets: SupportTicketRecord[] = ticketsRes.results.map((t) => ({
      id: String(t.id),
      userId: String(t.user_id),
      userEmail: String(t.user_email),
      category: t.category as SupportTicketRecord['category'],
      subject: String(t.subject),
      message: String(t.message),
      status: t.status as SupportTicketRecord['status'],
      adminResponse: typeof t.admin_response === 'string' ? t.admin_response : null,
      handledBy: typeof t.handled_by === 'string' ? t.handled_by : null,
      createdAt: String(t.created_at),
      updatedAt: String(t.updated_at),
    }));

    const financialMetrics = computeRealFinancialMetrics({
      totalUsersCount: Number(usersCountRow?.cnt || 0),
      subscriptions,
      invoices,
      totalAiCostUsd: Number(aiCostRow?.total || 0),
    });

    return c.json({ subscriptions, invoices, supportTickets, financialMetrics });
  });

  // ==========================================================================
  // 4. Gamification Preferences & Real Opt-in Leaderboard
  // ==========================================================================
  app.get('/api/v1/gamification/summary', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const [prefRow, optedRes] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM learner_gamification_prefs WHERE user_id = ? LIMIT 1`)
        .bind(auth.id)
        .first<Record<string, unknown>>(),
      c.env.DB.prepare(
        `SELECT p.user_id, p.display_alias, COALESCE(SUM(x.xp_earned), 0) AS total_xp
         FROM learner_gamification_prefs p
         LEFT JOIN user_xp_events x ON x.user_id = p.user_id
         WHERE p.leaderboard_opt_in = 1
         GROUP BY p.user_id, p.display_alias
         ORDER BY total_xp DESC
         LIMIT 50`
      ).all<{ user_id: string; display_alias: string; total_xp: number }>(),
    ]);

    const prefs = {
      userId: auth.id,
      leaderboardOptIn: Boolean(prefRow?.leaderboard_opt_in),
      displayAlias:
        typeof prefRow?.display_alias === 'string' && prefRow.display_alias.trim()
          ? prefRow.display_alias
          : auth.name.split(/\s+/)[0] || 'Learner',
      reminderEnabled: Boolean(prefRow?.reminder_enabled),
      reminderTimeLocal:
        typeof prefRow?.reminder_time_local === 'string' ? prefRow.reminder_time_local : '20:00',
      updatedAt: typeof prefRow?.updated_at === 'string' ? prefRow.updated_at : new Date().toISOString(),
    };

    const leaderboard = sortVerifiedLeaderboard(
      optedRes.results.map((r) => ({
        userId: String(r.user_id),
        displayAlias: String(r.display_alias || 'Learner'),
        totalVerifiedXp: Number(r.total_xp || 0),
        level: computeLearnerLevel(Number(r.total_xp || 0)).level,
      })),
      auth.id
    );

    return c.json({ prefs, leaderboard });
  });

  app.put('/api/v1/gamification/preferences', async (c) => {
    const auth = await requireAuth(c, { requireVerified: true });
    if (auth instanceof Response) return auth;
    const body = (await c.req.json().catch(() => ({}))) as {
      leaderboardOptIn?: unknown;
      displayAlias?: unknown;
      reminderEnabled?: unknown;
      reminderTimeLocal?: unknown;
    };
    const now = new Date().toISOString();
    const leaderboardOptIn = body.leaderboardOptIn === true ? 1 : 0;
    const displayAlias =
      sanitizeCommunityPlainText(body.displayAlias, 32) || auth.name.split(/\s+/)[0] || 'Learner';
    const reminderEnabled = body.reminderEnabled === true ? 1 : 0;
    const reminderTimeLocal =
      typeof body.reminderTimeLocal === 'string' && /^\d{2}:\d{2}$/.test(body.reminderTimeLocal)
        ? body.reminderTimeLocal
        : '20:00';

    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO learner_gamification_prefs (
        user_id, leaderboard_opt_in, display_alias, reminder_enabled, reminder_time_local, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(auth.id, leaderboardOptIn, displayAlias, reminderEnabled, reminderTimeLocal, now)
      .run();

    const optedRes = await c.env.DB.prepare(
      `SELECT p.user_id, p.display_alias, COALESCE(SUM(x.xp_earned), 0) AS total_xp
       FROM learner_gamification_prefs p
       LEFT JOIN user_xp_events x ON x.user_id = p.user_id
       WHERE p.leaderboard_opt_in = 1
       GROUP BY p.user_id, p.display_alias
       ORDER BY total_xp DESC
       LIMIT 50`
    ).all<{ user_id: string; display_alias: string; total_xp: number }>();

    const leaderboard = sortVerifiedLeaderboard(
      optedRes.results.map((r) => ({
        userId: String(r.user_id),
        displayAlias: String(r.display_alias || 'Learner'),
        totalVerifiedXp: Number(r.total_xp || 0),
        level: computeLearnerLevel(Number(r.total_xp || 0)).level,
      })),
      auth.id
    );

    return c.json({
      prefs: {
        userId: auth.id,
        leaderboardOptIn: Boolean(leaderboardOptIn),
        displayAlias,
        reminderEnabled: Boolean(reminderEnabled),
        reminderTimeLocal,
        updatedAt: now,
      },
      leaderboard,
    });
  });

  // ==========================================================================
  // 5. Admin System Configuration (D1 system_settings, Zero Secrets Exposed)
  // ==========================================================================
  const loadWorkerSystemConfig = async (db: D1Database): Promise<SystemConfigSettings> => {
    const row = await db
      .prepare(`SELECT setting_value, updated_by, updated_at FROM system_settings WHERE setting_key = ? LIMIT 1`)
      .bind('platform_config_v1')
      .first<{ setting_value: string; updated_by?: string; updated_at?: string }>();
    if (!row?.setting_value) {
      return { ...DEFAULT_SYSTEM_CONFIG };
    }
    try {
      const parsed = JSON.parse(row.setting_value) as Partial<SystemConfigSettings>;
      return {
        ...DEFAULT_SYSTEM_CONFIG,
        ...parsed,
        communityDirectMessagingEnabled: false,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
      };
    } catch {
      return { ...DEFAULT_SYSTEM_CONFIG };
    }
  };

  app.get('/api/v1/admin/system-settings', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const settings = await loadWorkerSystemConfig(c.env.DB);
    return c.json({
      settings,
      webhookProvidersConfigured: {
        stripe: Boolean(c.env.STRIPE_WEBHOOK_SECRET?.trim()),
        sslcommerz: Boolean(c.env.SSLCOMMERZ_STORE_PASSWD?.trim()),
        paddle: Boolean(c.env.PADDLE_WEBHOOK_SECRET?.trim()),
      },
    });
  });

  app.put('/api/v1/admin/system-settings', async (c) => {
    const admin = await requireAdmin(c, ['admin', 'super_admin']);
    if (admin instanceof Response) return admin;
    const body = await c.req.json().catch(() => null);
    const current = await loadWorkerSystemConfig(c.env.DB);
    const validation = validateSystemConfigPatch(body, current);
    if (!validation.ok) {
      return c.json({ error: validation.error, code: 'INVALID_SYSTEM_CONFIG' }, 400);
    }

    const now = new Date().toISOString();
    const saved: SystemConfigSettings = {
      ...validation.next,
      communityDirectMessagingEnabled: false,
      updatedAt: now,
      updatedBy: admin.email,
    };

    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_by, updated_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind('platform_config_v1', JSON.stringify(saved), admin.email, now)
      .run();

    await writeAuditLog(c.env, {
      actorUserId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'system.settings_updated',
      resourceType: 'system',
      resourceId: 'platform_config_v1',
      summaryEn: `Updated system configuration (audioRetentionDays=${saved.audioRetentionDays}, aiRateLimitPerMinute=${saved.aiRateLimitPerMinute}).`,
      summaryBn: `সিস্টেম কনফিগারেশন হালনাগাদ করা হয়েছে (অডিও সংরক্ষণ=${saved.audioRetentionDays} দিন)।`,
    });

    return c.json({ settings: saved });
  });

  // ==========================================================================
  // 6. Signed Payment Webhook Verification (Fail-Closed & Idempotent via D1)
  // ==========================================================================
  app.post('/api/v1/billing/webhooks/:provider', async (c) => {
    const provider = String(c.req.param('provider') || '').trim().toLowerCase() as SupportedWebhookProvider;
    if (!SUPPORTED_WEBHOOK_PROVIDERS.has(provider)) {
      return c.json({ error: 'Unsupported payment provider.', code: 'UNSUPPORTED_PROVIDER' }, 400);
    }

    const secretMap: Record<SupportedWebhookProvider, string | undefined> = {
      stripe: c.env.STRIPE_WEBHOOK_SECRET,
      sslcommerz: c.env.SSLCOMMERZ_STORE_PASSWD,
      paddle: c.env.PADDLE_WEBHOOK_SECRET,
    };
    const secret = secretMap[provider]?.trim();
    if (!secret) {
      return c.json(
        {
          error: `Webhook signing secret for ${provider} is not configured on this Worker.`,
          code: 'WEBHOOK_SECRET_NOT_CONFIGURED',
        },
        503
      );
    }

    const rawBody = await c.req.text();
    const signatureHeader =
      c.req.header('x-lv-webhook-signature') ||
      c.req.header('stripe-signature') ||
      c.req.header('paddle-signature');
    const timestampHeader = c.req.header('x-lv-webhook-timestamp');

    const sigCheck = await verifyPaymentWebhookSignature({
      secret,
      rawBody,
      signatureHeader,
      timestampHeader,
    });
    if (!sigCheck.valid) {
      return c.json(
        {
          error: 'Webhook signature verification failed.',
          code: sigCheck.reason ?? 'INVALID_WEBHOOK_SIGNATURE',
        },
        401
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return c.json({ error: 'Invalid JSON payload.', code: 'INVALID_JSON' }, 400);
    }

    const validated = validatePaymentWebhookPayload(provider, parsedBody);
    if (!validated.ok) {
      return c.json({ error: validated.error, code: 'INVALID_WEBHOOK_PAYLOAD' }, 400);
    }

    const event = validated.event;
    const dedupeKey = `webhook_event:${event.eventId}`;
    const existingEvent = await c.env.DB.prepare(
      `SELECT setting_key FROM system_settings WHERE setting_key = ? LIMIT 1`
    )
      .bind(dedupeKey)
      .first<{ setting_key: string }>();
    if (existingEvent) {
      return c.json({
        received: true,
        duplicate: true,
        statusApplied: 'already_processed',
        eventId: event.eventId,
      });
    }

    const now = new Date().toISOString();
    let statusApplied = 'recorded';

    const existingSub = await c.env.DB.prepare(
      `SELECT id, plan_slug FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`
    )
      .bind(event.userId)
      .first<{ id: string; plan_slug: string }>();

    if (event.eventType === 'payment_succeeded') {
      const targetPlan = event.plan ?? (existingSub?.plan_slug && existingSub.plan_slug !== 'free' ? existingSub.plan_slug : 'pro');
      let subscriptionId = existingSub?.id ?? generateRandomId('sub');
      if (existingSub) {
        await c.env.DB.prepare(
          `UPDATE subscriptions SET plan_slug = ?, status = 'active', provider = ?, updated_at = ? WHERE id = ?`
        )
          .bind(targetPlan, event.provider, now, existingSub.id)
          .run();
      } else {
        await c.env.DB.prepare(
          `INSERT INTO subscriptions (id, user_id, plan_slug, billing_interval, status, provider, created_at, updated_at)
           VALUES (?, ?, ?, 'monthly', 'active', ?, ?, ?)`
        )
          .bind(subscriptionId, event.userId, targetPlan, event.provider, now, now)
          .run();
      }
      await c.env.DB.prepare(`UPDATE users SET plan = ?, updated_at = ? WHERE id = ?`)
        .bind(targetPlan, now, event.userId)
        .run();
      if (event.invoiceId) {
        await c.env.DB.prepare(
          `UPDATE subscription_invoices SET status = 'paid', amount_cents = ?, currency = ?, provider = ?, updated_at = ? WHERE id = ? AND user_id = ?`
        )
          .bind(event.amountCents, event.currency, event.provider, now, event.invoiceId, event.userId)
          .run();
      } else {
        await c.env.DB.prepare(
          `INSERT INTO subscription_invoices (id, subscription_id, user_id, plan_slug, billing_interval, amount_cents, currency, status, provider, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'monthly', ?, ?, 'paid', ?, ?, ?)`
        )
          .bind(
            generateRandomId('inv'),
            subscriptionId,
            event.userId,
            targetPlan,
            event.amountCents,
            event.currency,
            event.provider,
            now,
            now
          )
          .run();
      }
      statusApplied = 'subscription_active';
    } else if (event.eventType === 'payment_failed') {
      if (existingSub) {
        await c.env.DB.prepare(`UPDATE subscriptions SET status = 'past_due', updated_at = ? WHERE id = ?`)
          .bind(now, existingSub.id)
          .run();
      }
      if (event.invoiceId) {
        await c.env.DB.prepare(
          `UPDATE subscription_invoices SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ? AND user_id = ?`
        )
          .bind(`Failed via ${event.provider} webhook (${event.eventId}).`, now, event.invoiceId, event.userId)
          .run();
      }
      statusApplied = 'payment_failed';
    } else if (event.eventType === 'subscription_cancelled') {
      if (existingSub) {
        await c.env.DB.prepare(
          `UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE id = ?`
        )
          .bind(now, existingSub.id)
          .run();
      }
      statusApplied = 'subscription_cancelled';
    } else if (event.eventType === 'refund_issued') {
      if (event.invoiceId) {
        await c.env.DB.prepare(
          `UPDATE subscription_invoices SET status = 'refunded', refund_reason = ?, updated_at = ? WHERE id = ? AND user_id = ?`
        )
          .bind(`Refunded via ${event.provider} webhook (${event.eventId}).`, now, event.invoiceId, event.userId)
          .run();
      }
      statusApplied = 'refund_recorded';
    }

    await c.env.DB.prepare(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at) VALUES (?, ?, ?, ?)`
    )
      .bind(dedupeKey, JSON.stringify({ provider: event.provider, eventType: event.eventType, statusApplied }), `webhook:${provider}`, now)
      .run();

    return c.json({
      received: true,
      duplicate: false,
      statusApplied,
      eventId: event.eventId,
    });
  });
}
