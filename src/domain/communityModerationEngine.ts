export type CommunityCategory = 'discussion' | 'question' | 'practice_challenge';
export type CommunityReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'misinformation'
  | 'other';
export type CommunityReportStatus =
  | 'pending'
  | 'resolved_removed'
  | 'resolved_dismissed'
  | 'escalated';
export type CommunityEnforcementAction = 'none' | 'hide_content' | 'warn_user' | 'restrict_user';
export type CommunityRestrictionLevel = 'none' | 'muted_24h' | 'posting_suspended';

/**
 * PRD v5.0 Section 14.2:
 * Private messaging is NOT part of the initial MVP and stays disabled until
 * moderation, reporting, blocking, and abuse response are proven operational.
 */
export const COMMUNITY_DIRECT_MESSAGING_ENABLED = false;

export interface CommunityCommentRecord {
  id: string;
  postId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  status: 'active' | 'hidden_by_mod' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostRecord {
  id: string;
  authorUserId: string;
  authorName: string;
  authorLevel: string;
  category: CommunityCategory;
  title: string;
  body: string;
  tags: string[];
  helpfulUserIds: string[];
  status: 'active' | 'hidden_by_mod' | 'deleted';
  moderationNote?: string | null;
  comments: CommunityCommentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReportRecord {
  id: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reporterUserId: string;
  reason: CommunityReportReason;
  details: string;
  status: CommunityReportStatus;
  enforcementAction: CommunityEnforcementAction;
  reviewerUserId?: string | null;
  reviewerNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface CommunityRestrictionRecord {
  userId: string;
  restrictionLevel: CommunityRestrictionLevel;
  reason: string;
  restrictedBy?: string | null;
  expiresAt?: string | null;
  appealText?: string | null;
  appealStatus: 'none' | 'pending' | 'approved' | 'denied';
  updatedAt: string;
}

export interface CommunityGovernanceRule {
  id: string;
  titleEn: string;
  titleBn: string;
  detailEn: string;
  detailBn: string;
}

export const COMMUNITY_GOVERNANCE_RULES: CommunityGovernanceRule[] = [
  {
    id: 'respectful_feedback',
    titleEn: 'Constructive & Respectful Feedback',
    titleBn: 'গঠনমূলক ও সম্মানজনক মতামত',
    detailEn:
      'Never mock accents, beginner mistakes, or Bangla-English phrasing. Offer kind, specific language tips.',
    detailBn:
      'কারো উচ্চারণ বা ভুল নিয়ে উপহাস করা সম্পূর্ণ নিষিদ্ধ। সর্বদা সহায়ক ও নির্দিষ্ট পরামর্শ দিন।',
  },
  {
    id: 'no_spam_or_links',
    titleEn: 'Zero Spam, Scams, or External Solicitations',
    titleBn: 'স্প্যাম, প্রতারণা ও অপ্রাসঙ্গিক প্রচারণা নিষিদ্ধ',
    detailEn:
      'Commercial promotions, repeated messages, and unsolicited links are automatically flagged and removed.',
    detailBn:
      'অবাঞ্ছিত বিজ্ঞাপন, পুনরাবৃত্তি স্প্যাম এবং সন্দেহজনক লিংক স্বয়ংক্রিয়ভাবে ব্লক ও অপসারণ করা হয়।',
  },
  {
    id: 'privacy_and_no_dm',
    titleEn: 'Protect Personal Privacy (No Direct Messaging in MVP)',
    titleBn: 'ব্যক্তিগত গোপনীয়তা রক্ষা (MVP-তে প্রাইভেট মেসেজ বন্ধ)',
    detailEn:
      'Never share phone numbers, home addresses, or private credentials. Private 1-on-1 messaging is intentionally disabled for learner safety.',
    detailBn:
      'ফোন নম্বর, ঠিকানা বা ব্যক্তিগত তথ্য শেয়ার করবেন না। নিরাপত্তার জন্য ১-টু-১ প্রাইভেট মেসেজিং বন্ধ রাখা হয়েছে।',
  },
  {
    id: 'enforcement_and_appeals',
    titleEn: 'Transparent Enforcement & Appeals',
    titleBn: 'স্বচ্ছ মডারেশন ও আপিল প্রক্রিয়া',
    detailEn:
      'Enforcement follows progressive tiers: content removal -> warning -> 24h mute -> posting suspension. Restricted users may submit an appeal.',
    detailBn:
      'নীতিমালা ভঙ্গের মাত্রা অনুযায়ী ধাপে ধাপে ব্যবস্থা নেওয়া হয় এবং সীমাবদ্ধ অ্যাকাউন্ট থেকে আপিল করার সুযোগ রয়েছে।',
  },
];

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const REPEATED_CHAR_PATTERN = /(.)\1{9,}/;

export function sanitizeCommunityPlainText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLen);
}

export function detectSpamHeuristic(text: string): { isSpam: boolean; reason?: string } {
  const urlMatches = text.match(URL_PATTERN) ?? [];
  if (urlMatches.length >= 3) {
    return { isSpam: true, reason: 'Too many external links in a single message.' };
  }
  if (REPEATED_CHAR_PATTERN.test(text)) {
    return { isSpam: true, reason: 'Repeated spam characters detected.' };
  }
  const lower = text.toLowerCase();
  if (
    lower.includes('whatsapp me') ||
    lower.includes('telegram @') ||
    lower.includes('free crypto') ||
    lower.includes('guaranteed visa')
  ) {
    return { isSpam: true, reason: 'Prohibited solicitation phrase detected.' };
  }
  return { isSpam: false };
}

export function validateCommunityPostInput(input: {
  category?: unknown;
  title?: unknown;
  body?: unknown;
  tags?: unknown;
}): {
  ok: boolean;
  error?: string;
  cleaned?: {
    category: CommunityCategory;
    title: string;
    body: string;
    tags: string[];
  };
} {
  const category: CommunityCategory =
    input.category === 'question' || input.category === 'practice_challenge'
      ? input.category
      : 'discussion';
  const title = sanitizeCommunityPlainText(input.title, 140);
  const body = sanitizeCommunityPlainText(input.body, 2000);

  if (title.length < 5) {
    return { ok: false, error: 'Post title must be at least 5 characters.' };
  }
  if (body.length < 10) {
    return { ok: false, error: 'Post content must be at least 10 characters.' };
  }

  const spamCheck = detectSpamHeuristic(`${title}\n${body}`);
  if (spamCheck.isSpam) {
    return { ok: false, error: spamCheck.reason || 'Content rejected by spam protection.' };
  }

  const rawTags = Array.isArray(input.tags) ? input.tags : [];
  const tags = Array.from(
    new Set(
      rawTags
        .map((t) => sanitizeCommunityPlainText(t, 28).toLowerCase())
        .filter((t) => t.length >= 2)
    )
  ).slice(0, 5);

  return {
    ok: true,
    cleaned: { category, title, body, tags },
  };
}

export function validateCommunityCommentInput(bodyRaw: unknown): {
  ok: boolean;
  error?: string;
  body?: string;
} {
  const body = sanitizeCommunityPlainText(bodyRaw, 1000);
  if (body.length < 2) {
    return { ok: false, error: 'Comment must be at least 2 characters.' };
  }
  const spamCheck = detectSpamHeuristic(body);
  if (spamCheck.isSpam) {
    return { ok: false, error: spamCheck.reason || 'Comment rejected by spam protection.' };
  }
  return { ok: true, body };
}

export function isUserCurrentlyRestricted(
  restriction: CommunityRestrictionRecord | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!restriction || restriction.restrictionLevel === 'none') return false;
  if (restriction.restrictionLevel === 'posting_suspended') return true;
  if (restriction.restrictionLevel === 'muted_24h') {
    if (!restriction.expiresAt) return true;
    const expMs = Date.parse(restriction.expiresAt);
    return Number.isNaN(expMs) ? true : expMs > nowMs;
  }
  return false;
}

export function filterCommunityFeedForViewer(
  posts: CommunityPostRecord[],
  blockedUserIds: string[],
  filters?: { category?: CommunityCategory | 'all'; query?: string }
): CommunityPostRecord[] {
  const blockedSet = new Set(blockedUserIds);
  const query = (filters?.query ?? '').trim().toLowerCase();

  return posts
    .filter((post) => post.status === 'active')
    .filter((post) => !blockedSet.has(post.authorUserId))
    .filter((post) => !filters?.category || filters.category === 'all' || post.category === filters.category)
    .filter((post) => {
      if (!query) return true;
      return (
        post.title.toLowerCase().includes(query) ||
        post.body.toLowerCase().includes(query) ||
        post.tags.some((t) => t.toLowerCase().includes(query))
      );
    })
    .map((post) => ({
      ...post,
      comments: post.comments.filter(
        (c) => c.status === 'active' && !blockedSet.has(c.authorUserId)
      ),
    }));
}
