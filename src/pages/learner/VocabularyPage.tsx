import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Layers,
  Plus,
  RotateCw,
  Search,
  Trash2,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  addVocabularyCard,
  deleteVocabularyCard,
  fetchVocabularyDeck,
  reviewVocabularyCard,
} from '../../services/p3Api';
import {
  isVocabCardDue,
  VOCAB_SRS_ALGORITHM_VERSION,
  type VocabDeckSummary,
  type VocabDifficulty,
  type VocabRecallRating,
  type VocabularyCardRecord,
} from '../../domain/vocabularyDeckEngine';
import { loadUserSpeakingState } from '../../services/speakingStateStore';

export function VocabularyPage() {
  const { lang } = useLanguage();
  const { user, profile, mistakes } = useAuth();

  const [cards, setCards] = useState<VocabularyCardRecord[]>([]);
  const [summary, setSummary] = useState<VocabDeckSummary>({
    totalCards: 0,
    dueNowCount: 0,
    masteredCount: 0,
    learningCount: 0,
    retentionRatePercent: null,
    algorithmVersion: VOCAB_SRS_ALGORITHM_VERSION,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Review session state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Add card form
  const [showAddForm, setShowAddForm] = useState(false);
  const [word, setWord] = useState('');
  const [phoneticHint, setPhoneticHint] = useState('');
  const [meaningEn, setMeaningEn] = useState('');
  const [meaningBn, setMeaningBn] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [difficulty, setDifficulty] = useState<VocabDifficulty>('medium');
  const [savingCard, setSavingCard] = useState(false);

  // Filter & search
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVocabularyDeck();
      setCards(data.cards);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load vocabulary deck.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  const dueCards = useMemo(() => cards.filter((c) => isVocabCardDue(c)), [cards]);
  const activeReviewCard = useMemo(
    () => (reviewingId ? cards.find((c) => c.id === reviewingId) ?? null : null),
    [cards, reviewingId]
  );

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cards.filter((card) => {
      if (filterMode === 'due' && !isVocabCardDue(card)) return false;
      if (filterMode === 'mastered' && card.masteryStatus !== 'mastered') return false;
      if (!q) return true;
      return (
        card.word.toLowerCase().includes(q) ||
        card.meaningEn.toLowerCase().includes(q) ||
        card.meaningBn.toLowerCase().includes(q) ||
        card.exampleSentence.toLowerCase().includes(q)
      );
    });
  }, [cards, filterMode, searchQuery]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSavingCard(true);
    try {
      const res = await addVocabularyCard({
        word,
        phoneticHint,
        meaningEn,
        meaningBn: meaningBn.trim() || meaningEn,
        exampleSentence,
        difficulty,
        sourceType: 'manual',
      });
      setCards(res.cards);
      setSummary(res.summary);
      setWord('');
      setPhoneticHint('');
      setMeaningEn('');
      setMeaningBn('');
      setExampleSentence('');
      setShowAddForm(false);
      setNotice(
        lang === 'bn'
          ? `"${res.card.word}" আপনার ভোকাবুলারি ডেকে সংরক্ষিত হয়েছে।`
          : `Saved "${res.card.word}" to your spaced-repetition deck.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save vocabulary card.');
    } finally {
      setSavingCard(false);
    }
  };

  const handleImportFromWorkspace = async () => {
    if (!user || importing) return;
    setImporting(true);
    setError(null);
    setNotice(null);
    try {
      let importedCount = 0;
      const speakingState = loadUserSpeakingState(user.id);
      for (const item of speakingState.savedVocabulary.slice(0, 12)) {
        const res = await addVocabularyCard({
          word: item.phrase,
          meaningEn: item.contextSentence || 'Saved from Speaking Studio',
          meaningBn: item.contextSentence || 'স্পিকিং স্টুডিও থেকে সংরক্ষিত',
          exampleSentence:
            item.contextSentence || `I practiced using "${item.phrase}" in conversation.`,
          sourceType: 'speaking_studio',
          sourceId: item.id,
        });
        setCards(res.cards);
        setSummary(res.summary);
        importedCount += 1;
      }

      const vocabMistakes = mistakes
        .filter((m) => m.category === 'Vocabulary' || m.category === 'Collocation')
        .slice(0, 8);
      for (const m of vocabMistakes) {
        const res = await addVocabularyCard({
          word: m.correctedExample.slice(0, 70),
          meaningEn: m.explanationEn,
          meaningBn: m.explanationBn,
          exampleSentence: m.correctedExample,
          sourceType: 'mistake_memory',
          sourceId: m.id,
        });
        setCards(res.cards);
        setSummary(res.summary);
        importedCount += 1;
      }

      setNotice(
        importedCount > 0
          ? lang === 'bn'
            ? `${importedCount}টি শব্দ/ফ্রেজ স্পিকিং স্টুডিও ও মিস্টেক মেমোরি থেকে সিঙ্ক করা হয়েছে।`
            : `Synced ${importedCount} expressions from Speaking Studio and Mistake Memory.`
          : lang === 'bn'
            ? 'ইম্পোর্ট করার মতো কোনো নতুন সংরক্ষিত শব্দ এখনো পাওয়া যায়নি।'
            : 'No saved Speaking Studio phrases or Vocabulary mistakes found to import yet.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import workspace vocabulary.');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmitRating = async (rating: VocabRecallRating) => {
    if (!activeReviewCard || submittingReview) return;
    setSubmittingReview(true);
    setError(null);
    try {
      const preset = profile?.spacedRepetitionPreset ?? 'standard';
      const res = await reviewVocabularyCard(activeReviewCard.id, rating, preset);
      setCards(res.cards);
      setSummary(res.summary);
      setShowAnswer(false);
      const nextDue = res.cards.find((c) => isVocabCardDue(c) && c.id !== activeReviewCard.id);
      setReviewingId(nextDue ? nextDue.id : null);
      setNotice(
        lang === 'bn'
          ? `রিভিউ সংরক্ষিত: "${res.card.word}" পরবর্তী রিভিউ ${res.card.intervalDays} দিন পর।`
          : `Review recorded: "${res.card.word}" scheduled in ${res.card.intervalDays} day(s).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteCard = async (card: VocabularyCardRecord) => {
    setError(null);
    try {
      const res = await deleteVocabularyCard(card.id);
      setCards(res.cards);
      setSummary(res.summary);
      if (reviewingId === card.id) {
        setReviewingId(null);
        setShowAnswer(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete card.');
    }
  };

  return (
    <LearnerShell
      title={lang === 'bn' ? 'ভোকাবুলারি স্পেসড-রিপিটিশন ডেক' : 'Vocabulary Deck'}
      subtitle={
        lang === 'bn'
          ? 'কনটেক্সট-ভিত্তিক শব্দভাণ্ডার ও বিলম্বিত স্মরণ (Delayed Recall) শিডিউলিং — একবারেই নয়, ধারাবাহিক সফল রিভিউয়ে মাস্টারি অর্জিত হয়।'
          : 'Context-grounded vocabulary with versioned spaced-repetition scheduling. Mastery requires 3+ consecutive spaced recalls.'
      }
    >
      <div className="space-y-6">
        {/* KPI Summary Strip */}
        <section
          aria-label="Vocabulary Deck Metrics"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <div className="rounded-xl border border-slate-800 bg-[#0B122C] p-4">
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'মোট কার্ড' : 'Total Cards'}
            </p>
            <p
              data-testid="vocab-total-count"
              className="mt-1 font-mono text-2xl font-bold text-white tabular-nums"
            >
              {summary.totalCards}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B122C] p-4">
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'এখন রিভিউ বাকি' : 'Due Now'}
            </p>
            <p
              data-testid="vocab-due-count"
              className="mt-1 font-mono text-2xl font-bold text-[#00D9FF] tabular-nums"
            >
              {summary.dueNowCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B122C] p-4">
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'মাস্টার্ড (৩+ ধাপ)' : 'Verified Mastered'}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
              {summary.masteredCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B122C] p-4">
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'রিটেনশন হার' : 'Recall Retention'}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
              {summary.retentionRatePercent === null ? '—' : `${summary.retentionRatePercent}%`}
            </p>
          </div>
        </section>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (dueCards.length > 0) {
                  setReviewingId(dueCards[0].id);
                  setShowAnswer(false);
                }
              }}
              disabled={dueCards.length === 0}
              className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap disabled:opacity-45 cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? `ডিউ রিভিউ শুরু করুন (${dueCards.length})`
                  : `Review Due Cards (${dueCards.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-[#0E1A42] px-4 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-[#142459] whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'নতুন শব্দ যোগ করুন' : 'Add Word Card'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleImportFromWorkspace()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0B122C] px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:border-slate-500 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {importing
                  ? lang === 'bn'
                    ? 'সিঙ্ক হচ্ছে...'
                    : 'Syncing...'
                  : lang === 'bn'
                    ? 'স্পিকিং ও ভুল থেকে ইম্পোর্ট'
                    : 'Import from Studio & Mistakes'}
              </span>
            </button>
          </div>

          <p className="font-mono text-[11px] text-slate-400">
            {lang === 'bn' ? 'অ্যালগরিদম' : 'Scheduler'}: {summary.algorithmVersion} ·{' '}
            {profile?.spacedRepetitionPreset ?? 'standard'}
          </p>
        </div>

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
            className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {/* Active Spaced-Repetition Flashcard Session */}
        {activeReviewCard && (
          <section
            aria-label="Active Vocabulary Review"
            className="rounded-2xl border border-cyan-400/35 bg-[#09112B] p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 text-xs text-slate-400">
              <span>
                {lang === 'bn' ? 'সক্রিয় স্পেসড রিভিউ' : 'Active Recall Session'} ·{' '}
                {activeReviewCard.masteryStatus} · {activeReviewCard.reviewCount}{' '}
                {lang === 'bn' ? 'বার রিভিউ' : 'reviews'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReviewingId(null);
                  setShowAnswer(false);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>

            <div className="py-6 text-center">
              <h2 className="font-portal text-2xl font-bold text-white sm:text-3xl">
                {activeReviewCard.word}
              </h2>
              {activeReviewCard.phoneticHint && (
                <p className="mt-1 font-mono text-xs text-cyan-300">
                  /{activeReviewCard.phoneticHint}/
                </p>
              )}

              {!showAnswer ? (
                <div className="mt-6">
                  <p className="text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'উত্তর দেখার আগে শব্দটির অর্থ ও একটি ইংরেজি বাক্য মনে করার চেষ্টা করুন।'
                      : 'Recall the meaning and say an example sentence aloud before revealing.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAnswer(true)}
                    className="lv-portal-btn mt-4 rounded-xl px-6 py-2.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    {lang === 'bn' ? 'অর্থ ও উদাহরণ দেখুন' : 'Reveal Meaning & Example'}
                  </button>
                </div>
              ) : (
                <div className="mx-auto mt-5 max-w-xl space-y-3 text-left">
                  <div className="rounded-xl border border-slate-800 bg-[#060C22] p-4">
                    <p className="text-sm font-semibold text-white">{activeReviewCard.meaningEn}</p>
                    <p className="mt-1 text-sm text-cyan-200">{activeReviewCard.meaningBn}</p>
                    <p className="mt-3 border-t border-slate-800 pt-2.5 text-xs italic text-slate-300">
                      "{activeReviewCard.exampleSentence}"
                    </p>
                  </div>

                  <div className="pt-2">
                    <p className="mb-2 text-center text-xs text-slate-400">
                      {lang === 'bn'
                        ? 'আপনি কতটা সঠিকভাবে মনে করতে পেরেছেন?'
                        : 'How accurately did you recall this expression?'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(
                        [
                          { id: 'again', en: 'Again (1d)', bn: 'আবার (১ দিন)', tone: 'border-rose-500/40 text-rose-200 hover:bg-rose-500/15' },
                          { id: 'hard', en: 'Hard', bn: 'কঠিন', tone: 'border-amber-500/40 text-amber-200 hover:bg-amber-500/15' },
                          { id: 'good', en: 'Good', bn: 'ভালো', tone: 'border-cyan-400/40 text-cyan-200 hover:bg-cyan-400/15' },
                          { id: 'easy', en: 'Easy', bn: 'সহজ', tone: 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/15' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={submittingReview}
                          onClick={() => void handleSubmitRating(opt.id)}
                          className={`rounded-xl border bg-[#0B122C] px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${opt.tone}`}
                        >
                          {lang === 'bn' ? opt.bn : opt.en}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Add Word Card Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateCard}
            className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 space-y-4"
          >
            <h2 className="font-portal text-base font-bold text-white">
              {lang === 'bn' ? 'নতুন ভোকাবুলারি কার্ড তৈরি করুন' : 'Add New Vocabulary Card'}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="vocab-word" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'ইংরেজি শব্দ বা ফ্রেজ' : 'English Word or Phrase'} *
                </label>
                <input
                  id="vocab-word"
                  type="text"
                  required
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="e.g., Clarify, Follow up"
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="vocab-phonetic" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'উচ্চারণ নির্দেশিকা (ঐচ্ছিক)' : 'Pronunciation Guide (Optional)'}
                </label>
                <input
                  id="vocab-phonetic"
                  type="text"
                  value={phoneticHint}
                  onChange={(e) => setPhoneticHint(e.target.value)}
                  placeholder="e.g., KLAIR-uh-fy"
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="vocab-meaning-en" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'ইংরেজি অর্থ' : 'English Meaning'} *
                </label>
                <input
                  id="vocab-meaning-en"
                  type="text"
                  required
                  value={meaningEn}
                  onChange={(e) => setMeaningEn(e.target.value)}
                  placeholder="To make something clearer and easier to understand"
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="vocab-meaning-bn" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'বাংলা অর্থ' : 'Bangla Meaning'}
                </label>
                <input
                  id="vocab-meaning-bn"
                  type="text"
                  value={meaningBn}
                  onChange={(e) => setMeaningBn(e.target.value)}
                  placeholder="কোনো বিষয় স্পষ্ট করে বোঝানো"
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="vocab-example" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'বাস্তব উদাহরণ বাক্য' : 'Real-World Example Sentence'} *
                </label>
                <input
                  id="vocab-example"
                  type="text"
                  required
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                  placeholder="Could you clarify the deadline for this report?"
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="vocab-difficulty" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'কঠিনতা' : 'Difficulty'}
                </label>
                <select
                  id="vocab-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as VocabDifficulty)}
                  className="lv-auth-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="easy">{lang === 'bn' ? 'সহজ' : 'Easy'}</option>
                  <option value="medium">{lang === 'bn' ? 'মাঝারি' : 'Medium'}</option>
                  <option value="hard">{lang === 'bn' ? 'কঠিন' : 'Hard'}</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={savingCard}
                className="lv-portal-btn rounded-xl px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                {savingCard
                  ? lang === 'bn'
                    ? 'সংরক্ষণ হচ্ছে...'
                    : 'Saving...'
                  : lang === 'bn'
                    ? 'কার্ড সংরক্ষণ করুন'
                    : 'Save Card'}
              </button>
            </div>
          </form>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#070D24] p-1">
            {(
              [
                { id: 'all', en: `All (${cards.length})`, bn: `সব (${cards.length})` },
                { id: 'due', en: `Due (${dueCards.length})`, bn: `বাকি (${dueCards.length})` },
                { id: 'mastered', en: `Mastered (${summary.masteredCount})`, bn: `মাস্টার্ড (${summary.masteredCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  filterMode === tab.id
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
              aria-label={lang === 'bn' ? 'শব্দ খুঁজুন' : 'Search vocabulary cards'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'bn' ? 'শব্দ বা অর্থ খুঁজুন...' : 'Search words or meanings...'}
              className="lv-auth-input w-full rounded-xl py-2 pl-8 pr-3 text-xs text-white"
            />
          </div>
        </div>

        {/* Deck List */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0B122C] p-8 text-center text-xs text-slate-400">
            {lang === 'bn' ? 'ভোকাবুলারি ডেক লোড হচ্ছে...' : 'Loading your vocabulary deck...'}
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0B122C] p-8 text-center">
            <Layers className="mx-auto h-7 w-7 text-slate-500" aria-hidden="true" />
            <h3 className="mt-3 font-portal text-base font-bold text-white">
              {cards.length === 0
                ? lang === 'bn'
                  ? 'আপনার ভোকাবুলারি ডেক এখনো খালি'
                  : 'Your vocabulary deck has 0 cards yet'
                : lang === 'bn'
                  ? 'এই ফিল্টারে কোনো কার্ড পাওয়া যায়নি'
                  : 'No vocabulary cards match this filter'}
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'কোনো কাল্পনিক শব্দ যোগ করা হয়নি। নিজের শেখা বাস্তব শব্দ যোগ করুন অথবা স্পিকিং স্টুডিও ও মিস্টেক মেমোরি থেকে ইম্পোর্ট করুন।'
                : 'No synthetic starter words are fabricated. Add expressions from your real conversations or import them from Speaking Studio and Mistake Memory.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredCards.map((card) => {
              const due = isVocabCardDue(card);
              return (
                <article
                  key={card.id}
                  data-testid="vocab-card-item"
                  className="rounded-xl border border-slate-800 bg-[#0B122C] p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-portal text-base font-bold text-white">{card.word}</h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {card.masteryStatus} · {card.reviewCount}{' '}
                          {lang === 'bn' ? 'রিভিউ' : 'reviews'} ·{' '}
                          {due
                            ? lang === 'bn'
                              ? 'এখন রিভিউ উপযুক্ত'
                              : 'Due now'
                            : lang === 'bn'
                              ? `${card.intervalDays} দিন ব্যবধান`
                              : `${card.intervalDays}d interval`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCard(card)}
                        aria-label={`Delete ${card.word}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="mt-2.5 text-xs font-medium text-slate-200">{card.meaningEn}</p>
                    <p className="mt-0.5 text-xs text-cyan-200">{card.meaningBn}</p>
                    <p className="mt-2 text-xs italic text-slate-400">"{card.exampleSentence}"</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{card.sourceType.replace('_', ' ')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewingId(card.id);
                        setShowAnswer(false);
                      }}
                      className="font-semibold text-[#00D9FF] hover:text-cyan-200 cursor-pointer"
                    >
                      {lang === 'bn' ? 'এখন রিভিউ করুন →' : 'Practice Recall →'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
