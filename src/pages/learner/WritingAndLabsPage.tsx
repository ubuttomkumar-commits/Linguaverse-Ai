import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookMarked,
  CheckCircle2,
  Loader2,
  PenTool,
  Play,
  RefreshCw,
  Send,
  Trash2,
  Users,
  Volume2,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  SHADOWING_PHRASE_LIBRARY,
  WRITING_MODES,
  computeTranscriptShadowingMatch,
  type HumanBridgeLogRecord,
  type ShadowingPhraseItem,
  type WritingDiaryEntryRecord,
  type WritingModeId,
} from '../../domain/advancedLearningLabsEngine';
import {
  createHumanBridgeLog,
  deleteHumanBridgeLog,
  evaluateWritingDiaryEntry,
  fetchHumanBridgeLogs,
  fetchWritingDiaryEntries,
  saveWritingDiaryRewrite,
} from '../../services/prd61Api';

type LabTabId = 'writing' | 'shadowing' | 'human_bridge';

export function WritingAndLabsPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<LabTabId>('writing');

  // Writing Intelligence & Language Diary State
  const [writingMode, setWritingMode] = useState<WritingModeId>('daily_diary');
  const [writingTitle, setWritingTitle] = useState('');
  const [writingText, setWritingText] = useState('');
  const [writingEntries, setWritingEntries] = useState<WritingDiaryEntryRecord[]>([]);
  const [writingLoading, setWritingLoading] = useState(true);
  const [writingSubmitting, setWritingSubmitting] = useState(false);
  const [writingError, setWritingError] = useState<string | null>(null);
  const [rewriteDrafts, setRewriteDrafts] = useState<Record<string, string>>({});
  const [rewriteSavedId, setRewriteSavedId] = useState<string | null>(null);

  // Japanese-Inspired Shadowing & Chunks State
  const [shadowingPhrases, setShadowingPhrases] =
    useState<readonly ShadowingPhraseItem[]>(SHADOWING_PHRASE_LIBRARY);
  const [selectedPhraseId, setSelectedPhraseId] = useState<string>(SHADOWING_PHRASE_LIBRARY[0].id);
  const [shadowingAttempt, setShadowingAttempt] = useState('');
  const [shadowingRate, setShadowingRate] = useState<number>(0.9);
  const [isPlayingPhrase, setIsPlayingPhrase] = useState(false);

  // Human Communication Bridge State
  const [bridgeLogs, setBridgeLogs] = useState<HumanBridgeLogRecord[]>([]);
  const [bridgeContext, setBridgeContext] = useState('');
  const [bridgePartner, setBridgePartner] =
    useState<HumanBridgeLogRecord['partnerType']>('colleague');
  const [bridgeGoal, setBridgeGoal] = useState('');
  const [bridgeWentWell, setBridgeWentWell] = useState('');
  const [bridgeFeltHard, setBridgeFeltHard] = useState('');
  const [bridgeConfidence, setBridgeConfidence] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [bridgeSaving, setBridgeSaving] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchWritingDiaryEntries(), fetchHumanBridgeLogs()])
      .then(([wRes, hRes]) => {
        if (!mounted) return;
        setWritingEntries(wRes.entries ?? []);
        if (wRes.shadowingPhrases?.length) setShadowingPhrases(wRes.shadowingPhrases);
        setBridgeLogs(hRes.logs ?? []);
      })
      .catch(() => {
        // Leave local defaults if server unavailable
      })
      .finally(() => {
        if (mounted) setWritingLoading(false);
      });
    return () => {
      mounted = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const selectedPhrase =
    shadowingPhrases.find((p) => p.id === selectedPhraseId) ?? shadowingPhrases[0];
  const shadowingMatch = shadowingAttempt.trim()
    ? computeTranscriptShadowingMatch(selectedPhrase.phraseEn, shadowingAttempt)
    : null;

  const handleWritingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (writingSubmitting) return;
    setWritingError(null);
    setWritingSubmitting(true);
    try {
      const res = await evaluateWritingDiaryEntry({
        mode: writingMode,
        title: writingTitle.trim() || 'Language Diary Entry',
        originalText: writingText,
      });
      setWritingEntries((prev) => [res.entry, ...prev]);
      setWritingTitle('');
      setWritingText('');
    } catch (err) {
      setWritingError(err instanceof Error ? err.message : 'Unable to evaluate writing.');
    } finally {
      setWritingSubmitting(false);
    }
  };

  const handleSaveRewrite = async (entryId: string) => {
    const text = (rewriteDrafts[entryId] || '').trim();
    if (text.length < 10) return;
    try {
      await saveWritingDiaryRewrite(entryId, text);
      setWritingEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, rewrittenText: text } : e))
      );
      setRewriteSavedId(entryId);
      window.setTimeout(() => setRewriteSavedId(null), 2500);
    } catch (err) {
      setWritingError(err instanceof Error ? err.message : 'Failed to save rewrite.');
    }
  };

  const handleSpeakShadowing = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = shadowingRate;
    u.onend = () => setIsPlayingPhrase(false);
    u.onerror = () => setIsPlayingPhrase(false);
    setIsPlayingPhrase(true);
    window.speechSynthesis.speak(u);
  };

  const handleSaveBridgeLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bridgeSaving) return;
    setBridgeError(null);
    setBridgeSaving(true);
    try {
      const res = await createHumanBridgeLog({
        scenarioContext: bridgeContext,
        partnerType: bridgePartner,
        goalEn: bridgeGoal,
        whatWentWell: bridgeWentWell,
        whatFeltHard: bridgeFeltHard,
        selfReportedConfidence: bridgeConfidence,
      });
      setBridgeLogs((prev) => [res.log, ...prev]);
      setBridgeContext('');
      setBridgeGoal('');
      setBridgeWentWell('');
      setBridgeFeltHard('');
      setBridgeConfidence(3);
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : 'Unable to save human practice log.');
    } finally {
      setBridgeSaving(false);
    }
  };

  const handleDeleteBridgeLog = async (logId: string) => {
    try {
      await deleteHumanBridgeLog(logId);
      setBridgeLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch (err) {
      setBridgeError(err instanceof Error ? err.message : 'Unable to delete log.');
    }
  };

  const activeModeMeta = WRITING_MODES.find((m) => m.id === writingMode) ?? WRITING_MODES[0];

  return (
    <LearnerShell
      title={lang === 'bn' ? 'রাইটিং ডায়েরি, শ্যাডোয়িং ও হিউম্যান ব্রিজ' : 'Writing Diary, Shadowing & Human Bridge'}
      subtitle={
        lang === 'bn'
          ? 'মূল লেখা সংরক্ষণসহ AI রাইটিং ফিডব্যাক, চাংক শ্যাডোয়িং এবং বাস্তব মানুষের সাথে কথোপকথনের ব্যক্তিগত লগ।'
          : 'Original-preserving Writing Intelligence & Language Diary, Japanese-inspired chunk shadowing, and user-reported real-world human conversation reflections.'
      }
    >
      <div className="space-y-6">
        {/* 3-Tab Switcher */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="tablist" aria-label="Advanced Learning Labs">
          {[
            {
              id: 'writing' as LabTabId,
              labelEn: 'Writing & Language Diary',
              labelBn: 'রাইটিং ও ভাষা ডায়েরি',
              icon: PenTool,
            },
            {
              id: 'shadowing' as LabTabId,
              labelEn: 'Shadowing & Chunks',
              labelBn: 'শ্যাডোয়িং ও চাংক',
              icon: Volume2,
            },
            {
              id: 'human_bridge' as LabTabId,
              labelEn: 'Human Communication Bridge',
              labelBn: 'বাস্তব কথোপকথন লগ',
              icon: Users,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'border-cyan-400/50 bg-[linear-gradient(135deg,rgba(0,217,255,0.14),rgba(124,58,237,0.14))] text-white'
                    : 'border-slate-800 bg-[#0A1334]/80 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                <span>{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Writing Intelligence & Language Diary (PRD §23.2 & §26) */}
        {activeTab === 'writing' && (
          <div className="space-y-6">
            <form
              onSubmit={handleWritingSubmit}
              className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6 space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="writing-mode" className="block text-xs font-medium text-slate-300">
                    {lang === 'bn' ? 'লেখার ধরন (Writing Mode)' : 'Writing Mode'}
                  </label>
                  <select
                    id="writing-mode"
                    value={writingMode}
                    onChange={(e) => setWritingMode(e.target.value as WritingModeId)}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] px-3.5 py-2.5 text-sm text-white focus:border-[#00D9FF] focus:outline-none"
                  >
                    {WRITING_MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {lang === 'bn' ? m.labelBn : m.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="writing-title" className="block text-xs font-medium text-slate-300">
                    {lang === 'bn' ? 'শিরোনাম (ঐচ্ছিক)' : 'Entry Title (Optional)'}
                  </label>
                  <input
                    id="writing-title"
                    type="text"
                    value={writingTitle}
                    onChange={(e) => setWritingTitle(e.target.value)}
                    placeholder={
                      lang === 'bn' ? 'যেমন: আজকের অফিস আপডেট' : 'e.g., Weekly standup reflection'
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="writing-body" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn'
                    ? 'আপনার মূল লেখা (কখনই মুছে ফেলা হবে না)'
                    : 'Your Original Writing (Always Preserved Untouched)'}
                </label>
                <textarea
                  id="writing-body"
                  rows={6}
                  required
                  value={writingText}
                  onChange={(e) => setWritingText(e.target.value)}
                  placeholder={activeModeMeta.placeholderEn}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] p-4 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                />
              </div>

              {writingError && (
                <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
                  {writingError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'আপনার মূল লেখা অক্ষত রেখে সংশোধিত ও স্বাভাবিক ইংরেজি সংস্করণ দেখানো হবে।'
                    : 'Returns corrected version, natural alternative, Bangla explanation, and a rewrite practice prompt.'}
                </p>
                <button
                  type="submit"
                  disabled={writingSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 cursor-pointer"
                >
                  {writingSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>
                    {writingSubmitting
                      ? lang === 'bn'
                        ? 'বিশ্লেষণ চলছে...'
                        : 'Analyzing...'
                      : lang === 'bn'
                        ? 'AI ফিডব্যাক নিন ও সংরক্ষণ করুন'
                        : 'Analyze & Save Diary Entry'}
                  </span>
                </button>
              </div>
            </form>

            {/* Saved Diary & Writing History */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-white">
                {lang === 'bn' ? 'সংরক্ষিত রাইটিং ও ডায়েরি এন্ট্রি' : 'Saved Writing & Language Diary Entries'}
              </h2>
              {writingLoading ? (
                <p className="text-xs text-slate-400">Loading entries...</p>
              ) : writingEntries.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-[#0A1334]/75 p-5 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'এখনো কোনো ডায়েরি এন্ট্রি নেই। উপরের ফর্ম থেকে আপনার প্রথম লেখা বিশ্লেষণ করুন।'
                    : 'No saved writing or diary entries yet. Submit your first piece above to build your personal writing archive.'}
                </div>
              ) : (
                writingEntries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <p className="font-mono text-[11px] uppercase text-[#00D9FF]">{entry.mode}</p>
                        <h3 className="text-base font-bold text-white">{entry.title}</h3>
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        {entry.createdAt.slice(0, 10)} · {entry.modelUsed}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 text-xs">
                      <div className="rounded-xl border border-slate-800 bg-[#060C24] p-3.5">
                        <p className="font-semibold text-slate-300">Original (Preserved)</p>
                        <p className="mt-1.5 whitespace-pre-line leading-relaxed text-slate-200">
                          {entry.originalText}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3.5">
                        <p className="font-semibold text-emerald-300">Corrected Version</p>
                        <p className="mt-1.5 whitespace-pre-line leading-relaxed text-emerald-100">
                          {entry.correctedVersion}
                        </p>
                      </div>
                      <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/15 p-3.5">
                        <p className="font-semibold text-cyan-300">Natural Alternative</p>
                        <p className="mt-1.5 whitespace-pre-line leading-relaxed text-cyan-100">
                          {entry.naturalAlternative}
                        </p>
                      </div>
                    </div>

                    {entry.banglaSummary && (
                      <p className="rounded-xl border border-slate-800 bg-[#060C24] px-4 py-3 text-xs leading-relaxed text-slate-300">
                        <strong className="text-white">Bangla Coach Summary: </strong>
                        {entry.banglaSummary}
                      </p>
                    )}

                    {/* Rewrite Practice Box */}
                    <div className="rounded-xl border border-slate-800 bg-[#060C24] p-4 space-y-2">
                      <p className="text-xs font-semibold text-white">
                        {lang === 'bn' ? 'পুনর্লিখন অনুশীলন (Rewrite Practice)' : 'Active Rewrite Practice'}
                      </p>
                      <p className="text-xs text-slate-400">{entry.targetedPracticeEn}</p>
                      <textarea
                        rows={3}
                        value={rewriteDrafts[entry.id] ?? entry.rewrittenText ?? ''}
                        onChange={(e) =>
                          setRewriteDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))
                        }
                        placeholder="Rewrite your improved version from memory..."
                        className="w-full rounded-lg border border-slate-700 bg-[#0A1334] p-3 text-xs text-white focus:border-[#00D9FF] focus:outline-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        {rewriteSavedId === entry.id ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Saved rewrite
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {entry.rewrittenText ? 'Rewrite recorded' : 'Not rewritten yet'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleSaveRewrite(entry.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10 cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>{lang === 'bn' ? 'পুনর্লিখন সংরক্ষণ করুন' : 'Save Rewrite'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        )}

        {/* TAB 2: Japanese-Inspired Shadowing & Chunking Drills (PRD §23.1) */}
        {activeTab === 'shadowing' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="space-y-2.5 lg:col-span-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'শ্যাডোয়িং চাংক লাইব্রেরি' : 'High-Value Chunk Library'}
              </h2>
              {shadowingPhrases.map((phrase) => {
                const active = phrase.id === selectedPhrase.id;
                return (
                  <button
                    key={phrase.id}
                    type="button"
                    onClick={() => {
                      setSelectedPhraseId(phrase.id);
                      setShadowingAttempt('');
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-cyan-400/45 bg-[#0E1A42] text-white'
                        : 'border-slate-800 bg-[#0A1334]/75 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                      <span>{phrase.category.replace('_', ' ')}</span>
                      <span>{phrase.cefr}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-medium text-white">
                      {phrase.phraseEn}
                    </p>
                  </button>
                );
              })}
            </aside>

            <section className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6 space-y-5 lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <p className="font-mono text-xs text-[#00D9FF]">
                    {selectedPhrase.cefr} · {selectedPhrase.category.replace('_', ' ')}
                  </p>
                  <h2 className="font-portal mt-1 text-base font-bold text-white">
                    {lang === 'bn' ? 'অডিও শুনে সাথে সাথে বলুন (Shadowing)' : 'Listen & Shadow Natural Chunks'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Speech speed"
                    value={shadowingRate}
                    onChange={(e) => setShadowingRate(Number(e.target.value))}
                    className="rounded-lg border border-slate-700 bg-[#060C24] px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value={0.75}>0.75x Slow</option>
                    <option value={0.9}>0.90x Clear</option>
                    <option value={1.0}>1.00x Natural</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSpeakShadowing(selectedPhrase.phraseEn)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{isPlayingPhrase ? 'Playing...' : 'Play Model Phrase'}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-[#060C24] p-4 space-y-3">
                <p className="text-base font-semibold leading-relaxed text-white">
                  “{selectedPhrase.phraseEn}”
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPhrase.chunkBreakdown.map((chunk, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSpeakShadowing(chunk)}
                      className="rounded-lg border border-slate-700 bg-[#0A1334] px-3 py-1.5 text-xs text-cyan-200 hover:border-cyan-400/50 cursor-pointer"
                    >
                      {chunk}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-300">{selectedPhrase.banglaBridge}</p>
                <p className="text-[11px] text-slate-400">{selectedPhrase.contextTipEn}</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="shadowing-attempt" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn'
                    ? 'শোনার পর না দেখে লিখুন বা ভয়েস টাইপ করুন'
                    : 'Type or dictate what you repeated (Recall & Word-Order Check)'}
                </label>
                <textarea
                  id="shadowing-attempt"
                  rows={3}
                  value={shadowingAttempt}
                  onChange={(e) => setShadowingAttempt(e.target.value)}
                  placeholder="Type or voice-dictate the phrase from memory to check lexical overlap..."
                  className="w-full rounded-xl border border-slate-700 bg-[#060C24] p-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                />
              </div>

              {shadowingMatch && (
                <div className="rounded-xl border border-slate-800 bg-[#060C24] p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Text-Transcript Word Overlap</span>
                    <span className="font-mono text-lg font-bold text-[#00D9FF] tabular-nums">
                      {shadowingMatch.wordOverlapPct}% ({shadowingMatch.matchedWords}/
                      {shadowingMatch.totalReferenceWords})
                    </span>
                  </div>
                  {shadowingMatch.missingWords.length > 0 && (
                    <p className="text-amber-300">
                      Missing words: {shadowingMatch.missingWords.join(', ')}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">{shadowingMatch.honestDisclosureEn}</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: Human Communication Bridge (PRD §30) */}
        {activeTab === 'human_bridge' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-400/25 bg-[#0A1334] p-4 text-xs text-slate-300 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#00D9FF]" aria-hidden="true" />
              <p>
                {lang === 'bn'
                  ? 'বাস্তব মানুষের সাথে কথোপকথনের লগগুলো "User-Reported Offline Activity" হিসেবে চিহ্নিত থাকে এবং AI যাচাইকৃত মূল্যায়ন থেকে সম্পূর্ণ আলাদা রাখা হয়।'
                  : 'All entries below are strictly tagged as User-Reported Offline Activity and kept separate from AI-assessed Communication DNA metrics.'}
              </p>
            </div>

            <form
              onSubmit={handleSaveBridgeLog}
              className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6 space-y-4"
            >
              <h2 className="text-base font-bold text-white">
                {lang === 'bn' ? 'বাস্তব কথোপকথন প্রতিফলন যুক্ত করুন' : 'Log a Real-World Human Conversation'}
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bridge-context" className="block text-xs font-medium text-slate-300">
                    {lang === 'bn' ? 'পরিস্থিতি / প্রেক্ষাপট' : 'Conversation Context'}
                  </label>
                  <input
                    id="bridge-context"
                    type="text"
                    required
                    value={bridgeContext}
                    onChange={(e) => setBridgeContext(e.target.value)}
                    placeholder="e.g., 10-minute client call about delivery schedule"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="bridge-partner" className="block text-xs font-medium text-slate-300">
                    {lang === 'bn' ? 'কার সাথে কথা বলেছেন' : 'Conversation Partner'}
                  </label>
                  <select
                    id="bridge-partner"
                    value={bridgePartner}
                    onChange={(e) =>
                      setBridgePartner(e.target.value as HumanBridgeLogRecord['partnerType'])
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] px-3.5 py-2.5 text-sm text-white focus:border-[#00D9FF] focus:outline-none"
                  >
                    <option value="colleague">Colleague / Manager</option>
                    <option value="interviewer">Interviewer / Recruiter</option>
                    <option value="teacher">Teacher / Mentor</option>
                    <option value="friend">Friend / Peer</option>
                    <option value="customer_service">Customer Service / Travel</option>
                    <option value="other">Other Real-World Speaker</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bridge-well" className="block text-xs font-medium text-slate-300">
                    {lang === 'bn' ? 'কী ভালো হয়েছে' : 'What Went Well'}
                  </label>
                  <textarea
                    id="bridge-well"
                    rows={3}
                    required
                    value={bridgeWentWell}
                    onChange={(e) => setBridgeWentWell(e.target.value)}
                    placeholder="e.g., Explained the timeline clearly without freezing..."
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] p-3 text-sm text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="bridge-hard" className="block text-xs font-medium text-slate-300">
                    {lang === 'bn' ? 'কোথায় কঠিন লেগেছে' : 'What Felt Difficult'}
                  </label>
                  <textarea
                    id="bridge-hard"
                    rows={3}
                    value={bridgeFeltHard}
                    onChange={(e) => setBridgeFeltHard(e.target.value)}
                    placeholder="e.g., Needed a second to find polite disagreement phrases..."
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] p-3 text-sm text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bridge-goal" className="block text-xs font-medium text-slate-300">
                    {lang === 'bn' ? 'কথোপকথনের লক্ষ্য' : 'Your Speaking Goal'}
                  </label>
                  <input
                    id="bridge-goal"
                    type="text"
                    value={bridgeGoal}
                    onChange={(e) => setBridgeGoal(e.target.value)}
                    placeholder="e.g., Ask two clarifying questions naturally"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="bridge-conf" className="block text-xs font-medium text-slate-300">
                    {lang === 'bn' ? 'নিজস্ব আত্মবিশ্বাস (১–৫)' : 'Self-Reported Confidence (1–5)'}
                  </label>
                  <select
                    id="bridge-conf"
                    value={bridgeConfidence}
                    onChange={(e) => setBridgeConfidence(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060C24] px-3.5 py-2.5 text-sm text-white focus:border-[#00D9FF] focus:outline-none"
                  >
                    <option value={1}>1 — Very nervous</option>
                    <option value={2}>2 — Hesitant</option>
                    <option value={3}>3 — Steady with pauses</option>
                    <option value={4}>4 — Confident & clear</option>
                    <option value={5}>5 — Fully comfortable</option>
                  </select>
                </div>
              </div>

              {bridgeError && (
                <p role="alert" className="text-xs text-rose-300">
                  {bridgeError}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={bridgeSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 cursor-pointer"
                >
                  <BookMarked className="h-4 w-4" />
                  <span>{bridgeSaving ? 'Saving...' : 'Save Human Bridge Log'}</span>
                </button>
              </div>
            </form>

            {/* Saved Human Bridge Reflections */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-white">
                {lang === 'bn' ? 'সংরক্ষিত বাস্তব কথোপকথন লগ' : 'Recorded Real-World Conversations'}
              </h3>
              {bridgeLogs.length === 0 ? (
                <p className="rounded-xl border border-slate-800 bg-[#0A1334]/75 p-4 text-xs text-slate-400">
                  No real-world conversation logs recorded yet.
                </p>
              ) : (
                bridgeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-800 bg-[#0A1334]/95 p-4 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{log.scenarioContext}</p>
                        <p className="font-mono text-[11px] text-slate-400">
                          User-Reported Offline Activity · {log.partnerType} · Confidence{' '}
                          {log.selfReportedConfidence}/5 · {log.createdAt.slice(0, 10)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteBridgeLog(log.id)}
                        aria-label="Delete conversation log"
                        className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:border-rose-500/50 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-emerald-200">
                      <strong>Went well:</strong> {log.whatWentWell}
                    </p>
                    {log.whatFeltHard && (
                      <p className="text-amber-200">
                        <strong>Felt hard:</strong> {log.whatFeltHard}
                      </p>
                    )}
                  </div>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </LearnerShell>
  );
}
