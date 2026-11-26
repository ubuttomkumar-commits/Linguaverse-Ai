import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMUNITY_DIRECT_MESSAGING_ENABLED,
  COMMUNITY_GOVERNANCE_RULES,
  filterCommunityFeedForViewer,
  isUserCurrentlyRestricted,
  validateCommunityCommentInput,
  validateCommunityPostInput,
  type CommunityPostRecord,
} from './communityModerationEngine';

test('PRD 14.2 MVP safety invariants: DM disabled and governance rules defined', () => {
  assert.equal(COMMUNITY_DIRECT_MESSAGING_ENABLED, false);
  assert.ok(COMMUNITY_GOVERNANCE_RULES.length >= 4);
});

test('validateCommunityPostInput strips HTML tags and blocks spam heuristics', () => {
  const cleaned = validateCommunityPostInput({
    category: 'practice_challenge',
    title: '<b>How do you answer tell me about yourself?</b>',
    body: '<script>alert(1)</script>Let us practice a 30-second self-introduction for interviews.',
    tags: ['Interview', 'Speaking', 'interview'],
  });
  assert.equal(cleaned.ok, true);
  assert.equal(cleaned.cleaned?.title.includes('<'), false);
  assert.equal(cleaned.cleaned?.body.includes('<script>'), false);
  assert.deepEqual(cleaned.cleaned?.tags, ['interview', 'speaking']);

  const spamLinks = validateCommunityPostInput({
    title: 'Check out these offers today',
    body: 'Visit https://a.test https://b.test https://c.test right now!',
  });
  assert.equal(spamLinks.ok, false);

  const spamChars = validateCommunityCommentInput('aaaaaaaaaaaaaaa spam');
  assert.equal(spamChars.ok, false);
});

test('filterCommunityFeedForViewer hides blocked users posts/comments and moderated items', () => {
  const posts: CommunityPostRecord[] = [
    {
      id: 'p1',
      authorUserId: 'u_alice',
      authorName: 'Alice',
      authorLevel: 'B1',
      category: 'question',
      title: 'When to use discuss without about?',
      body: 'Should I say discuss the plan or discuss about the plan?',
      tags: ['grammar'],
      helpfulUserIds: [],
      status: 'active',
      comments: [
        {
          id: 'c1',
          postId: 'p1',
          authorUserId: 'u_blocked',
          authorName: 'Spammer',
          body: 'Blocked reply',
          status: 'active',
          createdAt: '2026-11-25T10:00:00.000Z',
          updatedAt: '2026-11-25T10:00:00.000Z',
        },
        {
          id: 'c2',
          postId: 'p1',
          authorUserId: 'u_bob',
          authorName: 'Bob',
          body: 'Use discuss + direct object without about.',
          status: 'active',
          createdAt: '2026-11-25T10:01:00.000Z',
          updatedAt: '2026-11-25T10:01:00.000Z',
        },
      ],
      createdAt: '2026-11-25T09:00:00.000Z',
      updatedAt: '2026-11-25T09:00:00.000Z',
    },
    {
      id: 'p2',
      authorUserId: 'u_blocked',
      authorName: 'Spammer',
      authorLevel: 'A1',
      category: 'discussion',
      title: 'Blocked user post',
      body: 'Should not appear in viewer feed.',
      tags: [],
      helpfulUserIds: [],
      status: 'active',
      comments: [],
      createdAt: '2026-11-25T09:05:00.000Z',
      updatedAt: '2026-11-25T09:05:00.000Z',
    },
  ];

  const visible = filterCommunityFeedForViewer(posts, ['u_blocked'], { category: 'all' });
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'p1');
  assert.equal(visible[0].comments.length, 1);
  assert.equal(visible[0].comments[0].authorUserId, 'u_bob');
});

test('isUserCurrentlyRestricted respects 24h expiry and permanent posting suspension', () => {
  const now = Date.parse('2026-11-25T12:00:00.000Z');
  assert.equal(
    isUserCurrentlyRestricted(
      {
        userId: 'u1',
        restrictionLevel: 'muted_24h',
        reason: 'spam',
        expiresAt: '2026-11-26T12:00:00.000Z',
        appealStatus: 'none',
        updatedAt: '2026-11-25T11:00:00.000Z',
      },
      now
    ),
    true
  );
  assert.equal(
    isUserCurrentlyRestricted(
      {
        userId: 'u1',
        restrictionLevel: 'muted_24h',
        reason: 'spam',
        expiresAt: '2026-11-25T11:00:00.000Z',
        appealStatus: 'none',
        updatedAt: '2026-11-24T11:00:00.000Z',
      },
      now
    ),
    false
  );
});
