import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Flag,
  MessageSquare,
  Plus,
  Search,
  Send,
  Shield,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  addCommunityCommentApi,
  blockCommunityUserApi,
  createCommunityPostApi,
  deleteCommunityPostApi,
  fetchCommunityFeed,
  reportCommunityContentApi,
  submitCommunityAppealApi,
  toggleCommunityReactionApi,
  unblockCommunityUserApi,
} from '../../services/p3Api';
import type {
  CommunityCategory,
  CommunityGovernanceRule,
  CommunityPostRecord,
  CommunityReportReason,
  CommunityRestrictionRecord,
} from '../../domain/communityModerationEngine';

export function CommunityPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();

  const [posts, setPosts] = useState<CommunityPostRecord[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [restriction, setRestriction] = useState<CommunityRestrictionRecord | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [governanceRules, setGovernanceRules] = useState<CommunityGovernanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<CommunityCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Composer
  const [showComposer, setShowComposer] = useState(false);
  const [postCategory, setPostCategory] = useState<CommunityCategory>('discussion');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postTags, setPostTags] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Inline comment drafts
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentBusyId, setCommentBusyId] = useState<string | null>(null);

  // Report modal
  const [reportTarget, setReportTarget] = useState<{
    targetType: 'post' | 'comment' | 'user';
    targetId: string;
    label: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState<CommunityReportReason>('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Governance drawer & appeal
  const [showGovernance, setShowGovernance] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommunityFeed({ category: categoryFilter, q: searchQuery });
      setPosts(data.posts);
      if (data.viewerUserId) setViewerUserId(data.viewerUserId);
      setBlockedUserIds(data.blockedUserIds);
      setRestriction(data.restriction);
      setIsRestricted(data.isRestricted);
      setGovernanceRules(data.governanceRules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load community feed.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmittingPost(true);
    try {
      const tags = postTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await createCommunityPostApi({
        category: postCategory,
        title: postTitle,
        body: postBody,
        tags,
        authorLevel: profile?.selfEstimatedLevel ?? 'A2',
      });
      setPosts((prev) => [res.post, ...prev]);
      setPostTitle('');
      setPostBody('');
      setPostTags('');
      setShowComposer(false);
      setNotice(
        lang === 'bn'
          ? 'আপনার পোস্ট কমিউনিটিতে প্রকাশিত হয়েছে।'
          : 'Your post is now live in the Learner Community.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    const draft = (commentDrafts[postId] ?? '').trim();
    if (!draft) return;
    setCommentBusyId(postId);
    setError(null);
    try {
      const res = await addCommunityCommentApi(postId, draft);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, res.comment] } : p))
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post comment.');
    } finally {
      setCommentBusyId(null);
    }
  };

  const handleToggleHelpful = async (postId: string) => {
    setError(null);
    try {
      const res = await toggleCommunityReactionApi(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, helpfulUserIds: res.post.helpfulUserIds } : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update reaction.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    setError(null);
    try {
      await deleteCommunityPostApi(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete post.');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    setSubmittingReport(true);
    setError(null);
    try {
      await reportCommunityContentApi({
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        reason: reportReason,
        details: reportDetails,
      });
      setReportTarget(null);
      setReportDetails('');
      setNotice(
        lang === 'bn'
          ? 'রিপোর্টটি মডারেশন কিউতে পাঠানো হয়েছে।'
          : 'Report submitted to the Admin Moderation Queue.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    setError(null);
    try {
      const res = await blockCommunityUserApi(targetUserId);
      setBlockedUserIds(res.blockedUserIds);
      setPosts((prev) => prev.filter((p) => p.authorUserId !== targetUserId));
      setNotice(
        lang === 'bn'
          ? 'ব্যবহারকারীকে ব্লক করা হয়েছে। তার পোস্ট আর দেখা যাবে না।'
          : 'User blocked. Their posts and comments are now hidden from your feed.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to block user.');
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    try {
      const res = await unblockCommunityUserApi(targetUserId);
      setBlockedUserIds(res.blockedUserIds);
      void loadFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unblock user.');
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAppeal(true);
    setError(null);
    try {
      const res = await submitCommunityAppealApi(appealText);
      setRestriction(res.restriction);
      setAppealText('');
      setNotice(
        lang === 'bn' ? 'আপনার আপিল মডারেশন টিমে পাঠানো হয়েছে।' : 'Your appeal has been submitted.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit appeal.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const categoryLabel = (cat: CommunityCategory) => {
    if (cat === 'question') return lang === 'bn' ? 'প্রশ্ন' : 'Question';
    if (cat === 'practice_challenge') return lang === 'bn' ? 'প্র্যাকটিস চ্যালেঞ্জ' : 'Practice Challenge';
    return lang === 'bn' ? 'আলোচনা' : 'Discussion';
  };

  return (
    <LearnerShell
      title={lang === 'bn' ? 'লার্নার কমিউনিটি' : 'Learner Community'}
      subtitle={
        lang === 'bn'
          ? 'আলোচনা, ভাষাগত প্রশ্ন এবং সাপ্তাহিক প্র্যাকটিস চ্যালেঞ্জ — মডারেশন, রিপোর্টিং ও ব্লকিং সুরক্ষাসহ (প্রাইভেট মেসেজিং MVP-তে নিরাপত্তার জন্য বন্ধ)।'
          : 'Structured learning discussions, questions, and peer practice challenges protected by moderation, reporting, and user blocking.'
      }
    >
      <div className="space-y-6">
        {/* Top Action & Governance Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowComposer((v) => !v)}
              disabled={isRestricted}
              className="lv-portal-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap disabled:opacity-45 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'নতুন পোস্ট লিখুন' : 'New Post'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGovernance((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0B122C] px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:border-cyan-400/40 whitespace-nowrap cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'কমিউনিটি নীতিমালা ও নিরাপত্তা' : 'Safety & Governance Rules'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {lang === 'bn'
              ? 'প্রাইভেট ডাইরেক্ট মেসেজিং বন্ধ · রিপোর্টিং ও ব্লকিং সক্রিয়'
              : 'Private DMs disabled (MVP safety) · Reporting & Blocking active'}
          </p>
        </div>

        {/* Restriction & Appeal Banner */}
        {isRestricted && restriction && (
          <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-amber-100">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div>
                <p className="font-bold">
                  {lang === 'bn'
                    ? `আপনার অ্যাকাউন্ট সীমাবদ্ধ (${restriction.restrictionLevel})`
                    : `Posting Restricted (${restriction.restrictionLevel})`}
                </p>
                <p className="mt-0.5 text-amber-200/90">{restriction.reason}</p>
              </div>
            </div>
            {restriction.appealStatus === 'none' ? (
              <form onSubmit={handleSubmitAppeal} className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder={
                    lang === 'bn' ? 'আপনার আপিলের কারণ লিখুন...' : 'Explain your moderation appeal...'
                  }
                  className="lv-auth-input flex-1 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={submittingAppeal}
                  className="rounded-xl border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/30 cursor-pointer"
                >
                  {lang === 'bn' ? 'আপিল জমা দিন' : 'Submit Appeal'}
                </button>
              </form>
            ) : (
              <p className="text-xs text-amber-200">
                {lang === 'bn' ? 'আপিলের অবস্থা' : 'Appeal status'}: {restriction.appealStatus}
              </p>
            )}
          </section>
        )}

        {/* Governance Rules Panel */}
        {showGovernance && (
          <section className="rounded-2xl border border-cyan-400/25 bg-[#09112B] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-portal text-sm font-bold text-white">
                {lang === 'bn' ? 'কমিউনিটি নীতিমালা ও মডারেশন' : 'Community Rules & Enforcement Policy'}
              </h2>
              <button
                type="button"
                onClick={() => setShowGovernance(false)}
                aria-label="Close rules"
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {governanceRules.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-slate-800 bg-[#060C22] p-3.5">
                  <p className="text-xs font-bold text-white">
                    {lang === 'bn' ? rule.titleBn : rule.titleEn}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {lang === 'bn' ? rule.detailBn : rule.detailEn}
                  </p>
                </div>
              ))}
            </div>
            {blockedUserIds.length > 0 && (
              <div className="border-t border-slate-800 pt-3">
                <p className="text-xs font-semibold text-slate-300">
                  {lang === 'bn' ? 'ব্লককৃত ব্যবহারকারী' : 'Blocked Users'} ({blockedUserIds.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {blockedUserIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => void handleUnblockUser(id)}
                      className="rounded-lg border border-slate-700 bg-[#0B122C] px-2.5 py-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                    >
                      {id.slice(0, 12)} · {lang === 'bn' ? 'আনব্লক' : 'Unblock'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"
          >
            {notice}
          </div>
        )}

        {/* New Post Composer */}
        {showComposer && (
          <form
            onSubmit={handleCreatePost}
            className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 space-y-4"
          >
            <h2 className="font-portal text-base font-bold text-white">
              {lang === 'bn' ? 'কমিউনিটিতে নতুন পোস্ট তৈরি করুন' : 'Create a Community Post'}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="comm-category" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'ধরন' : 'Category'}
                </label>
                <select
                  id="comm-category"
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value as CommunityCategory)}
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="discussion">{lang === 'bn' ? 'আলোচনা' : 'Discussion'}</option>
                  <option value="question">{lang === 'bn' ? 'ভাষাগত প্রশ্ন' : 'Question'}</option>
                  <option value="practice_challenge">
                    {lang === 'bn' ? 'প্র্যাকটিস চ্যালেঞ্জ' : 'Practice Challenge'}
                  </option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="comm-title" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'শিরোনাম' : 'Title'} *
                </label>
                <input
                  id="comm-title"
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g., How do you handle unexpected interview follow-up questions?"
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label htmlFor="comm-body" className="block text-xs font-medium text-slate-300">
                {lang === 'bn' ? 'বিস্তারিত' : 'Message'} *
              </label>
              <textarea
                id="comm-body"
                required
                rows={3}
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                placeholder="Share your speaking question, sentence attempt, or practice prompt..."
                className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="comm-tags" className="block text-xs font-medium text-slate-300">
                {lang === 'bn' ? 'ট্যাগ (কমা দিয়ে)' : 'Tags (comma-separated)'}
              </label>
              <input
                id="comm-tags"
                type="text"
                value={postTags}
                onChange={(e) => setPostTags(e.target.value)}
                placeholder="interview, grammar, tense"
                className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submittingPost}
                className="lv-portal-btn rounded-xl px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                {submittingPost
                  ? lang === 'bn'
                    ? 'প্রকাশ হচ্ছে...'
                    : 'Publishing...'
                  : lang === 'bn'
                    ? 'পোস্ট প্রকাশ করুন'
                    : 'Publish Post'}
              </button>
            </div>
          </form>
        )}

        {/* Category Filter Tabs & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-[#070D24] p-1">
            {(
              [
                { id: 'all', en: 'All', bn: 'সব' },
                { id: 'discussion', en: 'Discussions', bn: 'আলোচনা' },
                { id: 'question', en: 'Questions', bn: 'প্রশ্ন' },
                { id: 'practice_challenge', en: 'Practice Challenges', bn: 'প্র্যাকটিস চ্যালেঞ্জ' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === tab.id
                    ? 'bg-[#142459] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'bn' ? tab.bn : tab.en}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label={lang === 'bn' ? 'পোস্ট খুঁজুন' : 'Search community posts'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'bn' ? 'আলোচনা বা ট্যাগ খুঁজুন...' : 'Search topics or tags...'}
              className="lv-auth-input w-full rounded-xl py-2 pl-8 pr-3 text-xs text-white"
            />
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0B122C] p-8 text-center text-xs text-slate-400">
            {lang === 'bn' ? 'কমিউনিটি লোড হচ্ছে...' : 'Loading community discussions...'}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0B122C] p-8 text-center">
            <Users className="mx-auto h-7 w-7 text-slate-500" aria-hidden="true" />
            <h3 className="mt-3 font-portal text-base font-bold text-white">
              {lang === 'bn' ? 'এখনো কোনো কমিউনিটি পোস্ট নেই' : 'No community posts yet'}
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'কোনো ভুয়া পোস্ট বা কাল্পনিক সদস্য তৈরি করা হয়নি। প্রথম বাস্তব আলোচনা বা প্র্যাকটিস চ্যালেঞ্জ শুরু করুন।'
                : 'No synthetic placeholder posts or fake members are generated. Start the first real discussion, question, or practice challenge.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const currentActorId = viewerUserId ?? user?.id ?? '';
              const hasReacted = currentActorId
                ? post.helpfulUserIds.includes(currentActorId)
                : false;
              const isAuthor = Boolean(currentActorId && currentActorId === post.authorUserId);
              return (
                <article
                  key={post.id}
                  data-testid="community-post-card"
                  className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">
                        <span className="font-semibold text-cyan-300">
                          {categoryLabel(post.category)}
                        </span>{' '}
                        · {post.authorName} ({post.authorLevel}) ·{' '}
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                      <h3 className="mt-1 font-portal text-base font-bold text-white">
                        {post.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAuthor ? (
                        <button
                          type="button"
                          onClick={() => void handleDeletePost(post.id)}
                          aria-label={`Delete post ${post.title}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setReportTarget({
                                targetType: 'post',
                                targetId: post.id,
                                label: post.title,
                              })
                            }
                            aria-label={`Report post ${post.title}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer"
                          >
                            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleBlockUser(post.authorUserId)}
                            aria-label={`Block ${post.authorName}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                          >
                            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {post.body}
                  </p>

                  {post.tags.length > 0 && (
                    <p className="text-xs text-slate-400">
                      {post.tags.map((tag) => `#${tag}`).join(' · ')}
                    </p>
                  )}

                  {/* Reactions & Comment Count */}
                  <div className="flex items-center gap-4 border-t border-slate-800/80 pt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => void handleToggleHelpful(post.id)}
                      className={`inline-flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                        hasReacted ? 'text-[#00D9FF]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="tabular-nums">
                        {lang === 'bn' ? 'সহায়ক' : 'Helpful'} ({post.helpfulUserIds.length})
                      </span>
                    </button>
                    <span className="inline-flex items-center gap-1.5 text-slate-400 tabular-nums">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {post.comments.length}{' '}
                        {lang === 'bn'
                          ? 'মন্তব্য'
                          : post.comments.length === 1
                            ? 'comment'
                            : 'comments'}
                      </span>
                    </span>
                  </div>

                  {/* Comments Thread */}
                  {post.comments.length > 0 && (
                    <div className="space-y-2 border-t border-slate-800/60 pt-3">
                      {post.comments.map((cmt) => (
                        <div
                          key={cmt.id}
                          className="rounded-xl border border-slate-800/80 bg-[#060C22] px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-200">{cmt.authorName}</span>
                            <span>{new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="mt-1 text-slate-300">{cmt.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Comment Form */}
                  {!isRestricted && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        aria-label={`Reply to ${post.title}`}
                        value={commentDrafts[post.id] ?? ''}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleAddComment(post.id);
                          }
                        }}
                        placeholder={
                          lang === 'bn' ? 'সহায়ক উত্তর বা মতামত লিখুন...' : 'Write a helpful reply...'
                        }
                        className="lv-auth-input flex-1 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={commentBusyId === post.id}
                        onClick={() => void handleAddComment(post.id)}
                        aria-label={`Send reply to ${post.title}`}
                        className="inline-flex h-9 items-center gap-1 rounded-xl border border-cyan-400/35 bg-[#0E1A42] px-3 text-xs font-semibold text-cyan-200 hover:bg-[#142459] disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'পাঠান' : 'Reply'}</span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Report Content Modal */}
        {reportTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
          >
            <div
              className="fixed inset-0 bg-[#020512]/80 backdrop-blur-sm"
              onClick={() => setReportTarget(null)}
            />
            <form
              onSubmit={handleSubmitReport}
              className="lv-portal-panel relative z-10 w-full max-w-md rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 id="report-modal-title" className="font-portal text-base font-bold text-white">
                  {lang === 'bn' ? 'অপব্যবহার রিপোর্ট করুন' : 'Report Community Content'}
                </h2>
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  aria-label="Close report dialog"
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs text-slate-400 truncate">Target: {reportTarget.label}</p>
              <div>
                <label htmlFor="report-reason" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'কারণ' : 'Reason'}
                </label>
                <select
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as CommunityReportReason)}
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="spam">Spam or solicitation</option>
                  <option value="harassment">Harassment or disrespect</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="misinformation">Misleading information</option>
                  <option value="other">Other safety concern</option>
                </select>
              </div>
              <div>
                <label htmlFor="report-details" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'অতিরিক্ত বিবরণ' : 'Additional Details'}
                </label>
                <textarea
                  id="report-details"
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300 cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                >
                  {lang === 'bn' ? 'রিপোর্ট পাঠান' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
