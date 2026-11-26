import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Flag,
  HelpCircle,
  Loader2,
  Mic,
  Sparkles,
  Square,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { extractMessageVocabularyHighlights } from '../../domain/conversationContextEngine';
import { MISTAKE_MEMORY_MIN_CONFIDENCE } from '../../domain/speakingEvaluation';
import { getAudioBlob } from '../../utils/audioBlobStore';
import {
  speakEnglishExample,
  stopSpeaking,
  type PlaybackSpeed,
} from '../../utils/speechSynthesis';
import type {
  ExplanationLanguage,
  MistakeMemoryItem,
  SavedConversationVocabItem,
  SpeakingDetectedMistake,
  SpeakingModeId,
  SpeakingTurnRecord,
} from '../../types/domain';

interface ConversationMessageStreamProps {
  scenarioId: SpeakingModeId;
  aiPersonaEn: string;
  aiPersonaBn: string;
  openingPromptEn: string;
  openingPromptBnHint: string;
  suggestedVocabulary: string[];
  turns: SpeakingTurnRecord[];
  explanationPref: ExplanationLanguage;
  playbackSpeed: PlaybackSpeed;
  isEvaluating: boolean;
  savedVocabulary: SavedConversationVocabItem[];
  syncedMistakes: MistakeMemoryItem[];
  onSaveVocabulary: (phrase: string, contextSentence: string) => void;
  onReportIncorrectFeedback: (
    mistake: SpeakingDetectedMistake,
    matchedMistakeId?: string
  ) => Promise<boolean>;
}

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatChannelLabel(channel: SpeakingTurnRecord['inputChannel'], lang: 'en' | 'bn'): string {
  if (channel === 'voice_stt') {
    return lang === 'bn' ? 'ভয়েস (STT)' : 'Voice (STT)';
  }
  if (channel === 'voice_with_manual_edit') {
    return lang === 'bn' ? 'ভয়েস + সম্পাদিত' : 'Voice + Edited';
  }
  return lang === 'bn' ? 'টেক্সট ইনপুট' : 'Text Input';
}

function InlineAudioPlayer({ blobKey }: { blobKey: string }) {
  const { lang } = useLanguage();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    getAudioBlob(blobKey)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          createdUrl = URL.createObjectURL(blob);
          setAudioUrl(createdUrl);
        }
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [blobKey]);

  if (!loaded || !audioUrl) return null;

  return (
    <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-slate-700/80 bg-[#070B1B]/90 px-2.5 py-1.5">
      <Mic className="h-3.5 w-3.5 text-[#22D3EE] shrink-0" aria-hidden="true" />
      <audio
        controls
        src={audioUrl}
        aria-label={lang === 'bn' ? 'আপনার রেকর্ডকৃত কণ্ঠস্বর শুনুন' : 'Play your voice recording'}
        className="h-7 w-full"
      />
    </div>
  );
}

export function ConversationMessageStream({
  aiPersonaEn,
  aiPersonaBn,
  openingPromptEn,
  openingPromptBnHint,
  suggestedVocabulary,
  turns,
  explanationPref,
  playbackSpeed,
  isEvaluating,
  savedVocabulary,
  syncedMistakes,
  onSaveVocabulary,
  onReportIncorrectFeedback,
}: ConversationMessageStreamProps) {
  const { lang } = useLanguage();
  const streamEndRef = useRef<HTMLDivElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [explainedIds, setExplainedIds] = useState<Record<string, boolean>>({});
  const [openFeedbackIds, setOpenFeedbackIds] = useState<Record<string, boolean>>({});
  const [reportedKeys, setReportedKeys] = useState<Record<string, boolean>>({});
  const [reportingKey, setReportingKey] = useState<string | null>(null);

  const savedPhraseSet = new Set(savedVocabulary.map((v) => v.phrase.toLowerCase()));

  // Auto-open the newest turn's learning feedback drawer and scroll smoothly to latest message
  useEffect(() => {
    if (turns.length > 0) {
      const latest = turns[turns.length - 1];
      setOpenFeedbackIds((prev) =>
        prev[latest.id] === undefined ? { ...prev, [latest.id]: true } : prev
      );
    }
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns.length, isEvaluating]);

  const handleTogglePlay = (id: string, text: string) => {
    if (playingId === id) {
      stopSpeaking();
      setPlayingId(null);
      return;
    }
    setPlayingId(id);
    const started = speakEnglishExample({
      text,
      rate: playbackSpeed,
      onEnd: () => setPlayingId((curr) => (curr === id ? null : curr)),
      onError: () => setPlayingId((curr) => (curr === id ? null : curr)),
    });
    if (!started) setPlayingId(null);
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === id ? null : curr));
      }, 1800);
    } catch {
      // Ignore clipboard permission denials cleanly
    }
  };

  const renderHighlightedAiText = (text: string) => {
    const segments = extractMessageVocabularyHighlights(text, suggestedVocabulary);
    return segments.map((seg, idx) => {
      if (!seg.matchedPhrase) {
        return <span key={idx}>{seg.text}</span>;
      }
      const isSaved = savedPhraseSet.has(seg.matchedPhrase.toLowerCase());
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onSaveVocabulary(seg.matchedPhrase!, text)}
          title={
            isSaved
              ? lang === 'bn'
                ? 'শব্দগুচ্ছটি সংরক্ষিত আছে'
                : 'Phrase already saved to your vocabulary list'
              : lang === 'bn'
                ? 'শব্দভাণ্ডারে সংরক্ষণ করতে ক্লিক করুন'
                : 'Click to save useful phrase to vocabulary'
          }
          className={`mx-0.5 inline rounded px-1 py-0.5 font-medium underline decoration-dotted underline-offset-4 transition-colors cursor-pointer ${
            isSaved
              ? 'bg-emerald-500/20 text-emerald-200 decoration-emerald-400'
              : 'bg-[#22D3EE]/15 text-[#67E8F9] decoration-[#22D3EE] hover:bg-[#22D3EE]/25'
          }`}
        >
          {seg.text}
        </button>
      );
    });
  };

  const findSyncedMistakeId = (m: SpeakingDetectedMistake): string | undefined => {
    const match = syncedMistakes.find(
      (item) =>
        item.userExample.trim().toLowerCase() === m.original.trim().toLowerCase() &&
        item.correctedExample.trim().toLowerCase() === m.corrected.trim().toLowerCase()
    );
    return match?.id;
  };

  const renderAiBubble = (opts: {
    id: string;
    text: string;
    bnHint: string;
    timestamp?: string;
    isOpening?: boolean;
  }) => {
    const showExplain =
      explainedIds[opts.id] ?? (explanationPref === 'bn' || explanationPref === 'both');
    const matchedVocab = Array.from(
      new Set(
        extractMessageVocabularyHighlights(opts.text, suggestedVocabulary)
          .map((s) => s.matchedPhrase)
          .filter((p): p is string => Boolean(p))
      )
    );

    return (
      <article
        key={opts.id}
        className="flex flex-col items-start gap-1.5"
        aria-label={lang === 'bn' ? 'AI কোচের বার্তা' : 'AI Coach message'}
      >
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 font-semibold text-[#22D3EE]">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>{lang === 'bn' ? aiPersonaBn : aiPersonaEn}</span>
          </span>
          {opts.timestamp && (
            <span className="font-mono text-[10px] text-slate-500 tabular-nums">
              · {formatMessageTime(opts.timestamp)}
            </span>
          )}
        </div>

        <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-tl-sm border border-[#3B82F6]/30 bg-[#0B1230]/95 px-4 py-3.5 shadow-md">
          <p className="text-sm leading-relaxed text-slate-100 sm:text-[15px]">
            {renderHighlightedAiText(opts.text)}
          </p>

          {showExplain && opts.bnHint && (
            <div className="mt-2.5 rounded-lg border border-slate-800/90 bg-[#070B1B]/80 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                {lang === 'bn' ? 'বাংলা অর্থ ও প্রেক্ষাপট' : 'Bangla Meaning & Context'}
              </p>
              <p className="font-bn mt-1 text-xs leading-relaxed text-slate-300">
                {opts.bnHint}
              </p>
            </div>
          )}

          {/* Message Actions Row */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/70 pt-2.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleTogglePlay(opts.id, opts.text)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors cursor-pointer ${
                playingId === opts.id
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {playingId === opts.id ? (
                <>
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'থামান' : 'Stop'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3 w-3 text-[#22D3EE]" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'শুনুন' : 'Listen'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleCopyText(opts.id, opts.text)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              {copiedId === opts.id ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'কপি' : 'Copy'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              aria-expanded={showExplain}
              onClick={() =>
                setExplainedIds((prev) => ({ ...prev, [opts.id]: !showExplain }))
              }
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors cursor-pointer ${
                showExplain
                  ? 'bg-violet-500/15 text-violet-200'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <HelpCircle className="h-3 w-3" aria-hidden="true" />
              <span>
                {showExplain
                  ? lang === 'bn'
                    ? 'ব্যাখ্যা লুকান'
                    : 'Hide Explain'
                  : lang === 'bn'
                    ? 'বাংলা ব্যাখ্যা'
                    : 'Explain'}
              </span>
            </button>

            {matchedVocab.length > 0 && (
              <button
                type="button"
                onClick={() => onSaveVocabulary(matchedVocab[0], opts.text)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-[#22D3EE] hover:bg-[#22D3EE]/10 transition-colors cursor-pointer"
              >
                {savedPhraseSet.has(matchedVocab[0].toLowerCase()) ? (
                  <>
                    <BookmarkCheck className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">
                      {lang === 'bn' ? 'সংরক্ষিত' : 'Saved'}
                    </span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3 w-3" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? `সংরক্ষণ: "${matchedVocab[0]}"` : `Save "${matchedVocab[0]}"`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label={lang === 'bn' ? 'AI কথোপকথন বার্তা তালিকা' : 'AI conversation message stream'}
      data-testid="conversation-message-stream"
      className="flex-1 space-y-5 overflow-y-auto px-1 py-2"
    >
      {/* Opening AI Prompt */}
      {renderAiBubble({
        id: 'ai_opening',
        text: openingPromptEn,
        bnHint: openingPromptBnHint,
        isOpening: true,
      })}

      {/* Conversational Turns */}
      {turns.map((turn) => {
        const evalData = turn.evaluation;
        const confirmedMistakes = evalData.mistakes.filter(
          (m) => m.confidence >= MISTAKE_MEMORY_MIN_CONFIDENCE
        );
        const optionalSuggestions = evalData.mistakes.filter(
          (m) => m.confidence < MISTAKE_MEMORY_MIN_CONFIDENCE
        );
        const hasFeedbackOpen = Boolean(openFeedbackIds[turn.id]);
        const hasDiff =
          evalData.corrected_transcript.trim().toLowerCase() !==
          turn.userTranscript.trim().toLowerCase();

        return (
          <div key={turn.id} className="space-y-4">
            {/* Learner Message Bubble (Right-Aligned) */}
            <article
              className="flex flex-col items-end gap-1.5"
              aria-label={lang === 'bn' ? `আপনার বার্তা ধাপ ${turn.turnNumber}` : `Your message turn ${turn.turnNumber}`}
            >
              <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-slate-400">
                <span className="font-semibold text-violet-300">
                  {lang === 'bn' ? 'আপনি' : 'You'}
                </span>
                <span>· {formatChannelLabel(turn.inputChannel, lang)}</span>
                <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                  · {formatMessageTime(turn.createdAt)}
                </span>
              </div>

              <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-tr-sm border border-[#8B5CF6]/40 bg-gradient-to-br from-[#1E295E] to-[#141C42] px-4 py-3.5 shadow-md">
                <p className="text-sm leading-relaxed text-white sm:text-[15px]">
                  {turn.userTranscript}
                </p>

                {turn.audioBlobKey && <InlineAudioPlayer blobKey={turn.audioBlobKey} />}

                {/* Learner Bubble Action Strip */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-[11px]">
                  <button
                    type="button"
                    aria-expanded={hasFeedbackOpen}
                    onClick={() =>
                      setOpenFeedbackIds((prev) => ({
                        ...prev,
                        [turn.id]: !hasFeedbackOpen,
                      }))
                    }
                    className="inline-flex items-center gap-1.5 font-semibold text-[#22D3EE] hover:text-white transition-colors cursor-pointer"
                  >
                    <span>
                      {confirmedMistakes.length > 0
                        ? lang === 'bn'
                          ? `কোচিং ফিডব্যাক (${confirmedMistakes.length}টি সংশোধন)`
                          : `Learning Feedback (${confirmedMistakes.length} correction${confirmedMistakes.length === 1 ? '' : 's'})`
                        : lang === 'bn'
                          ? 'কোচিং ফিডব্যাক (সঠিক ইংরেজি)'
                          : 'Learning Feedback (Accurate)'}
                    </span>
                    {hasFeedbackOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCopyText(`user_${turn.id}`, turn.userTranscript)}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    {copiedId === `user_${turn.id}` ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-300">
                          {lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'কপি' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Expandable Inline Contextual Learning Feedback */}
                {hasFeedbackOpen && (
                  <div
                    className="mt-3 space-y-3 rounded-xl border border-slate-700/80 bg-[#070B1B]/95 p-3.5 text-xs"
                    data-testid={`turn-feedback-${turn.turnNumber}`}
                  >
                    {/* Corrected & Natural Alternative */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <p className="font-semibold text-emerald-400">
                          {hasDiff
                            ? lang === 'bn'
                              ? 'শুদ্ধ রূপ'
                              : 'Corrected Sentence'
                            : lang === 'bn'
                              ? 'ব্যাকরণগতভাবে সঠিক'
                              : 'Grammatically Accurate'}
                        </p>
                        <p className="mt-1 leading-relaxed text-emerald-100">
                          {evalData.corrected_transcript}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-violet-300">
                            {lang === 'bn' ? 'স্বাভাবিক বিকল্প' : 'Natural Alternative'}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              onSaveVocabulary(
                                evalData.natural_alternative,
                                turn.userTranscript
                              )
                            }
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-[#22D3EE] hover:underline cursor-pointer"
                          >
                            <Bookmark className="h-2.5 w-2.5" aria-hidden="true" />
                            <span>{lang === 'bn' ? 'সংরক্ষণ' : 'Save'}</span>
                          </button>
                        </div>
                        <p className="mt-1 leading-relaxed text-slate-200">
                          {evalData.natural_alternative}
                        </p>
                      </div>
                    </div>

                    {/* Confirmed Mistakes (>= 70% Confidence) */}
                    {confirmedMistakes.length > 0 && (
                      <div className="space-y-2 border-t border-slate-800 pt-2.5">
                        <p className="font-semibold text-amber-300">
                          {lang === 'bn'
                            ? 'সনাক্তকৃত ভুল (Mistake Memory-তে সিঙ্কড)'
                            : 'Detected Improvements (Synced to Mistake Memory)'}
                        </p>
                        {confirmedMistakes.map((m, mIdx) => {
                          const repKey = `${turn.id}_m_${mIdx}`;
                          const syncedId = findSyncedMistakeId(m);
                          const alreadyFlagged =
                            reportedKeys[repKey] ||
                            Boolean(
                              syncedId &&
                                syncedMistakes.find((s) => s.id === syncedId)
                                  ?.falseCorrectionReported
                            );

                          return (
                            <div
                              key={repKey}
                              className="rounded-lg border border-amber-500/25 bg-[#0B1230] p-2.5 space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-violet-300">
                                  {m.category}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                                  {Math.round(m.confidence * 100)}% AI confidence
                                </span>
                              </div>
                              <p className="flex flex-wrap items-center gap-1.5 text-xs">
                                <XCircle
                                  className="h-3.5 w-3.5 text-rose-400 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="text-rose-300 line-through">{m.original}</span>
                                <span className="text-slate-500" aria-hidden="true">
                                  →
                                </span>
                                <span className="font-semibold text-emerald-300">
                                  {m.corrected}
                                </span>
                              </p>
                              {(explanationPref === 'en' || explanationPref === 'both') && (
                                <p className="text-slate-300 leading-relaxed">{m.explanation_en}</p>
                              )}
                              {(explanationPref === 'bn' || explanationPref === 'both') && (
                                <p className="font-bn text-slate-400 leading-relaxed">
                                  {m.explanation_bn}
                                </p>
                              )}
                              <div className="pt-1 flex justify-end">
                                <button
                                  type="button"
                                  disabled={alreadyFlagged || reportingKey === repKey}
                                  onClick={async () => {
                                    setReportingKey(repKey);
                                    try {
                                      const ok = await onReportIncorrectFeedback(m, syncedId);
                                      if (ok) {
                                        setReportedKeys((prev) => ({
                                          ...prev,
                                          [repKey]: true,
                                        }));
                                      }
                                    } finally {
                                      setReportingKey(null);
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                    alreadyFlagged
                                      ? 'text-amber-300 cursor-default'
                                      : 'text-slate-400 hover:bg-slate-800 hover:text-amber-200 cursor-pointer'
                                  }`}
                                >
                                  <Flag className="h-2.5 w-2.5" aria-hidden="true" />
                                  <span>
                                    {alreadyFlagged
                                      ? lang === 'bn'
                                        ? 'পর্যালোচনার জন্য রিপোর্ট করা হয়েছে'
                                        : 'Flagged for Review'
                                      : lang === 'bn'
                                        ? 'ভুল AI ফিডব্যাক রিপোর্ট করুন'
                                        : 'Report Incorrect AI Feedback'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Optional Suggestions (< 70%) */}
                    {optionalSuggestions.length > 0 && (
                      <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                        <p className="inline-flex items-center gap-1 font-semibold text-slate-300">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          <span>
                            {lang === 'bn'
                              ? 'ঐচ্ছিক AI পরামর্শ (Mistake Memory-তে যুক্ত নয়)'
                              : 'Optional AI Suggestion (not logged as a mistake)'}
                          </span>
                        </p>
                        {optionalSuggestions.map((s, idx) => (
                          <p key={idx} className="mt-1">
                            “{s.original}” → “{s.corrected}” ({Math.round(s.confidence * 100)}%)
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Strengths */}
                    {evalData.correct_elements.length > 0 && (
                      <div className="border-t border-slate-800 pt-2">
                        <p className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{lang === 'bn' ? 'ভালো দিক' : 'What Worked Well'}</span>
                        </p>
                        <ul className="mt-1 space-y-0.5 text-slate-300">
                          {evalData.correct_elements.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Honest Clarity / Channel Note */}
                    <p className="border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                      {evalData.pronunciation_note}
                    </p>
                  </div>
                )}
              </div>
            </article>

            {/* AI Coach Follow-Up Response */}
            {renderAiBubble({
              id: `ai_${turn.id}`,
              text: evalData.ai_reply,
              bnHint: evalData.ai_reply_bn_hint,
              timestamp: turn.createdAt,
            })}
          </div>
        );
      })}

      {/* Genuine Processing / AI Thinking Indicator */}
      {isEvaluating && (
        <div
          className="flex flex-col items-start gap-1.5"
          role="status"
          aria-live="assertive"
          data-testid="ai-processing-indicator"
        >
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            <span>
              {lang === 'bn' ? 'LINGUAVERSE AI উত্তর তৈরি করছে...' : 'LINGUAVERSE AI is analyzing & responding...'}
            </span>
          </span>
          <div className="rounded-2xl rounded-tl-sm border border-violet-500/35 bg-[#0B1230] px-4 py-3 text-xs text-slate-300">
            {lang === 'bn'
              ? 'আপনার বাক্যের ব্যাকরণ, অর্থ এবং পরবর্তী প্রশ্ন বিশ্লেষণ করা হচ্ছে।'
              : 'Evaluating grammar, natural phrasing, and preparing the next conversational reply.'}
          </div>
        </div>
      )}

      <div ref={streamEndRef} />
    </div>
  );
}
