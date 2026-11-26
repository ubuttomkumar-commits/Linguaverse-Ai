import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  PenLine,
  Search,
  User,
  Volume2,
  X,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  filterReplayTurnsBySpeaker,
  highlightTranscriptSegments,
  searchReplayTranscript,
} from '../../domain/communicationReplayEngine';
import type {
  ExplanationLanguage,
  SpeakingInputChannel,
  UnifiedReplaySession,
} from '../../types/domain';

interface ReplayTranscriptTimelineProps {
  session: UnifiedReplaySession;
  explanationPref: ExplanationLanguage;
  focusedTurnId: string | null;
  activeAudioTurnId: string | null;
  onSelectTurnForMistakes: (turnId: string) => void;
  onJumpToAudioTurn: (turnId: string) => void;
  onPracticeTurn: (turnId: string) => void;
  onInspectTurn?: (turnId: string) => void;
}

function formatTurnTime(iso: string, lang: 'en' | 'bn'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function formatAudioSeconds(sec: number | undefined): string {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return '';
  const mins = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

function channelProvenanceLabel(channel: SpeakingInputChannel | undefined, lang: 'en' | 'bn'): string {
  if (channel === 'voice_stt') {
    return lang === 'bn' ? 'ভয়েস ট্রান্সক্রিপশন (STT)' : 'Voice STT transcript';
  }
  if (channel === 'voice_with_manual_edit') {
    return lang === 'bn' ? 'ভয়েস + হাতে সম্পাদিত' : 'Voice + manually edited';
  }
  return lang === 'bn' ? 'টেক্সট উত্তর' : 'Text response';
}

export function ReplayTranscriptTimeline({
  session,
  explanationPref,
  focusedTurnId,
  activeAudioTurnId,
  onSelectTurnForMistakes,
  onJumpToAudioTurn,
  onPracticeTurn,
  onInspectTurn,
}: ReplayTranscriptTimelineProps) {
  const { lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<'all' | 'learner' | 'ai'>('all');
  const [activeMatchCursor, setActiveMatchCursor] = useState(0);
  const [stepTurnIndex, setStepTurnIndex] = useState<number | null>(null);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const turnRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Reset local view state when switching sessions
  useEffect(() => {
    setSearchQuery('');
    setSpeakerFilter('all');
    setActiveMatchCursor(0);
    setStepTurnIndex(null);
    setCopiedTurnId(null);
  }, [session.id]);

  // Scroll into view when focused from Mistake Timeline or Audio Player
  useEffect(() => {
    if (!focusedTurnId) return;
    const node = turnRefs.current[focusedTurnId];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedTurnId]);

  const visibleTurns = useMemo(
    () => filterReplayTurnsBySpeaker(session.turns, speakerFilter),
    [session.turns, speakerFilter]
  );

  const searchResult = useMemo(
    () => searchReplayTranscript(visibleTurns, searchQuery),
    [visibleTurns, searchQuery]
  );

  const activeMatchedTurnId =
    searchResult.matchedTurnIds.length > 0
      ? searchResult.matchedTurnIds[activeMatchCursor % searchResult.matchedTurnIds.length]
      : null;

  const jumpToMatch = (direction: 1 | -1) => {
    if (searchResult.matchedTurnIds.length === 0) return;
    const count = searchResult.matchedTurnIds.length;
    const nextIdx = (activeMatchCursor + direction + count) % count;
    setActiveMatchCursor(nextIdx);
    const targetId = searchResult.matchedTurnIds[nextIdx];
    const node = turnRefs.current[targetId];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    onInspectTurn?.(targetId);
  };

  const stepTurn = (direction: 1 | -1) => {
    if (visibleTurns.length === 0) return;
    const current = stepTurnIndex ?? (direction === 1 ? -1 : visibleTurns.length);
    const next = Math.max(0, Math.min(visibleTurns.length - 1, current + direction));
    setStepTurnIndex(next);
    const target = visibleTurns[next];
    const node = turnRefs.current[target.id];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    onInspectTurn?.(target.id);
  };

  const handleCopyTurn = async (turnId: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedTurnId(turnId);
      window.setTimeout(() => {
        setCopiedTurnId((prev) => (prev === turnId ? null : prev));
      }, 1800);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  return (
    <section
      aria-label={lang === 'bn' ? 'স্মার্ট কনভারসেশন ট্রান্সক্রিপ্ট' : 'Smart Conversation Transcript'}
      className="space-y-4"
    >
      {/* Search + Speaker Filter + Step-Through Toolbar */}
      <div className="space-y-3 rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <label htmlFor="replay-transcript-search" className="sr-only">
              {lang === 'bn' ? 'ট্রান্সক্রিপ্টের মধ্যে খুঁজুন' : 'Search inside transcript'}
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="replay-transcript-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveMatchCursor(0);
              }}
              placeholder={
                lang === 'bn'
                  ? 'এই কথোপকথনের ট্রান্সক্রিপ্টে শব্দ খুঁজুন...'
                  : 'Search words or phrases in this transcript...'
              }
              className="w-full rounded-xl border border-slate-800 bg-[#050A22] py-2 pl-9 pr-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveMatchCursor(0);
                }}
                aria-label={lang === 'bn' ? 'ট্রান্সক্রিপ্ট সার্চ মুছুন' : 'Clear transcript search'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            {searchQuery.trim().length > 0 ? (
              <div className="flex items-center gap-1.5">
                <span
                  data-testid="transcript-search-count"
                  className="font-mono text-xs text-cyan-200 tabular-nums"
                >
                  {searchResult.totalMatches === 0
                    ? lang === 'bn'
                      ? '০টি মিল'
                      : '0 matches'
                    : lang === 'bn'
                      ? `${searchResult.totalMatches}টি মিল (${searchResult.matchedTurnIds.length} ধাপ)`
                      : `${searchResult.totalMatches} match${searchResult.totalMatches === 1 ? '' : 'es'}`}
                </span>
                <button
                  type="button"
                  disabled={searchResult.matchedTurnIds.length === 0}
                  onClick={() => jumpToMatch(-1)}
                  aria-label={lang === 'bn' ? 'আগের মিল' : 'Previous match'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#050A22] text-slate-300 hover:border-cyan-400/50 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={searchResult.matchedTurnIds.length === 0}
                  onClick={() => jumpToMatch(1)}
                  aria-label={lang === 'bn' ? 'পরবর্তী মিল' : 'Next match'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#050A22] text-slate-300 hover:border-cyan-400/50 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {stepTurnIndex !== null
                    ? `${lang === 'bn' ? 'ধাপ' : 'Turn'} ${stepTurnIndex + 1}/${visibleTurns.length}`
                    : `${visibleTurns.length} ${lang === 'bn' ? 'টি ধাপ' : visibleTurns.length === 1 ? 'turn' : 'turns'}`}
                </span>
                <button
                  type="button"
                  disabled={visibleTurns.length === 0}
                  onClick={() => stepTurn(-1)}
                  aria-label={lang === 'bn' ? 'আগের ধাপে যান' : 'Previous turn'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#050A22] text-slate-300 hover:border-cyan-400/50 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={visibleTurns.length === 0}
                  onClick={() => stepTurn(1)}
                  aria-label={lang === 'bn' ? 'পরবর্তী ধাপে যান' : 'Next turn'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#050A22] text-slate-300 hover:border-cyan-400/50 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Speaker Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2.5">
          <div
            role="group"
            aria-label={lang === 'bn' ? 'বক্তা অনুযায়ী ফিল্টার' : 'Filter transcript by speaker'}
            className="inline-flex rounded-xl border border-slate-800 bg-[#050A22] p-0.5"
          >
            {(
              [
                { id: 'all', en: `All (${session.turns.length})`, bn: `সব (${session.turns.length})` },
                {
                  id: 'learner',
                  en: `You (${session.learnerTurnCount})`,
                  bn: `আপনি (${session.learnerTurnCount})`,
                },
                {
                  id: 'ai',
                  en: `AI (${session.aiTurnCount})`,
                  bn: `AI (${session.aiTurnCount})`,
                },
              ] as const
            ).map((opt) => {
              const active = speakerFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSpeakerFilter(opt.id);
                    setStepTurnIndex(null);
                    setActiveMatchCursor(0);
                  }}
                  aria-pressed={active}
                  data-testid={`transcript-speaker-filter-${opt.id}`}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#3B82F6]/25 text-cyan-200 border border-cyan-400/35'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {lang === 'bn' ? opt.bn : opt.en}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-slate-500">
            {lang === 'bn'
              ? 'ঐতিহাসিক ট্রান্সক্রিপ্ট অপরিবর্তনীয় (শুধুমাত্র পাঠযোগ্য)'
              : 'Historical transcript is read-only and preserved verbatim'}
          </span>
        </div>
      </div>

      {/* Honest Transcript Gap / Legacy Mode Notice */}
      {(session.transcriptGapReasonEn || !session.hasTranscript) && (
        <div
          role="status"
          data-testid="replay-transcript-gap-notice"
          className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <div>
            <p className="font-semibold text-amber-100">
              {!session.hasTranscript
                ? lang === 'bn'
                  ? 'ট্রান্সক্রিপ্ট অনুপলব্ধ'
                  : 'Transcript Missing'
                : lang === 'bn'
                  ? 'আংশিক / একক-উত্তর ট্রান্সক্রিপ্ট নোট'
                  : 'Single-Response Session Note'}
            </p>
            <p className="mt-1 text-amber-200/85">
              {lang === 'bn' ? session.transcriptGapReasonBn : session.transcriptGapReasonEn}
            </p>
          </div>
        </div>
      )}

      {/* Missing Transcript Empty Box */}
      {!session.hasTranscript ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#081031]/70 p-8 text-center">
          <FileText className="mx-auto h-7 w-7 text-slate-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-white">
            {lang === 'bn'
              ? 'এই সেশনের জন্য কোনো সংরক্ষিত ট্রান্সক্রিপ্ট পাওয়া যায়নি'
              : 'No saved transcript turns found for this session'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
            {lang === 'bn'
              ? 'কোনো কাল্পনিক সংলাপ তৈরি করা হয়নি। যদি মূল্যায়ন সংরক্ষিত থাকে তবে আপনি বিশ্লেষণ ট্যাবে তা দেখতে পারবেন।'
              : 'No placeholder dialogue is generated. If an evaluation snapshot was saved, you can still review it in the Analysis tab.'}
          </p>
        </div>
      ) : visibleTurns.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#081031]/70 p-6 text-center text-xs text-slate-400">
          {lang === 'bn'
            ? 'নির্বাচিত বক্তার জন্য কোনো ধাপ পাওয়া যায়নি।'
            : 'No turns found for the selected speaker filter.'}
        </div>
      ) : (
        <ol
          aria-label={
            lang === 'bn' ? 'বক্তা-পৃথক কথোপকথন টাইমলাইন' : 'Speaker-separated conversation timeline'
          }
          className="space-y-3"
        >
          {visibleTurns.map((turn, idx) => {
            const isLearner = turn.speaker === 'learner';
            const isSearchMatch = Boolean(searchResult.matchesByTurnId[turn.id]);
            const isActiveSearchMatch = activeMatchedTurnId === turn.id;
            const isAudioSynced = activeAudioTurnId === turn.id;
            const isFocused =
              focusedTurnId === turn.id ||
              stepTurnIndex === idx ||
              isActiveSearchMatch ||
              isAudioSynced;

            const segments = highlightTranscriptSegments(turn.text, searchQuery);

            return (
              <li
                key={turn.id}
                ref={(el) => {
                  turnRefs.current[turn.id] = el;
                }}
                onClick={() => onInspectTurn?.(turn.id)}
                data-testid={`replay-turn-${turn.speaker}-${turn.turnIndex}`}
                className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                  isFocused
                    ? 'border-cyan-400/70 bg-[#0C1945]/95 shadow-[0_0_24px_rgba(0,217,255,0.12)]'
                    : isSearchMatch
                      ? 'border-cyan-400/35 bg-[#091438]'
                      : isLearner
                        ? 'border-[#3B82F6]/30 bg-[#091335]/90'
                        : 'border-slate-800/90 bg-[#070D26]/90'
                }`}
              >
                {/* Turn Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                        isLearner
                          ? 'bg-[#3B82F6]/20 text-[#22D3EE]'
                          : 'bg-[#8B5CF6]/20 text-violet-300'
                      }`}
                    >
                      {isLearner ? (
                        <User className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="font-semibold text-white">
                      {lang === 'bn' ? turn.speakerLabelBn : turn.speakerLabelEn}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      #{String(turn.turnIndex).padStart(2, '0')}
                    </span>
                    {isLearner && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="text-[11px] text-slate-400">
                          {channelProvenanceLabel(turn.inputChannel, lang)}
                        </span>
                      </>
                    )}
                    {isAudioSynced && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-cyan-300">
                          <Volume2 className="h-3 w-3" aria-hidden="true" />
                          {lang === 'bn' ? 'অডিও প্লেয়ারে নির্বাচিত' : 'Loaded in audio player'}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-slate-400 tabular-nums">
                    {turn.mistakeCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTurnForMistakes(turn.id);
                        }}
                        className="inline-flex items-center gap-1 font-sans font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        <span>
                          {turn.mistakeCount}{' '}
                          {lang === 'bn'
                            ? 'টি ভুল'
                            : turn.mistakeCount === 1
                              ? 'mistake'
                              : 'mistakes'}
                        </span>
                      </button>
                    )}

                    {/* Strictly render timestamp ONLY when a valid historical timestamp exists */}
                    {turn.hasValidTimestamp && turn.timestamp && (
                      <span>{formatTurnTime(turn.timestamp, lang)}</span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleCopyTurn(turn.id, turn.text);
                      }}
                      aria-label={lang === 'bn' ? 'বার্তা কপি করুন' : 'Copy message'}
                      data-testid={`copy-turn-${turn.turnIndex}`}
                      className="inline-flex items-center gap-1 font-sans text-[11px] text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"
                    >
                      {copiedTurnId === turn.id ? (
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
                </div>

                {/* Turn Body with Safe Highlighting */}
                <p className="mt-3 text-sm leading-relaxed text-slate-100">
                  {segments.map((seg, segIdx) =>
                    seg.isMatch ? (
                      <mark
                        key={segIdx}
                        className="rounded bg-cyan-400/30 px-0.5 text-cyan-100"
                      >
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={segIdx}>{seg.text}</span>
                    )
                  )}
                </p>

                {/* Optional Bangla Hint for AI Turn */}
                {!isLearner &&
                  turn.hintBn &&
                  (explanationPref === 'bn' || explanationPref === 'both') && (
                    <p className="font-bn mt-2 text-xs leading-relaxed text-slate-400">
                      {turn.hintBn}
                    </p>
                  )}

                {/* Optional Transfer Coach Nudge */}
                {turn.coachNudgeEn && (
                  <p className="mt-2 border-l-2 border-violet-400/50 pl-3 text-xs text-violet-200/90">
                    {lang === 'bn' && turn.coachNudgeBn ? turn.coachNudgeBn : turn.coachNudgeEn}
                  </p>
                )}

                {/* Quick Inline Suggested Correction Preview for Learner Turn */}
                {isLearner && turn.correctedText && turn.correctedText !== turn.text && (
                  <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/15 px-3 py-2 text-xs">
                    <span className="font-semibold text-emerald-300">
                      {lang === 'bn' ? 'প্রস্তাবিত শুদ্ধ রূপ: ' : 'Suggested correction: '}
                    </span>
                    <span className="text-slate-200">{turn.correctedText}</span>
                  </div>
                )}

                {/* Action Footer for Learner Turns: Audio Sync + Practice */}
                {isLearner && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2.5 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3">
                      {turn.hasAuthorizedAudioKey && turn.audioBlobKey ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJumpToAudioTurn(turn.id);
                          }}
                          data-testid={`sync-audio-turn-${turn.turnIndex}`}
                          className="inline-flex items-center gap-1.5 font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                        >
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {lang === 'bn' ? 'অডিও প্লেয়ারে শুনুন' : 'Play in Audio Player'}
                            {turn.audioDurationSeconds
                              ? ` (${formatAudioSeconds(turn.audioDurationSeconds)})`
                              : ''}
                          </span>
                        </button>
                      ) : (
                        <span
                          data-testid={`turn-audio-text-only-${turn.id}`}
                          className="text-slate-500"
                        >
                          {lang === 'bn'
                            ? 'কোনো অডিও রেকর্ডিং যুক্ত নেই'
                            : 'No audio recording attached'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPracticeTurn(turn.id);
                      }}
                      data-testid={`practice-turn-btn-${turn.turnIndex}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-violet-300 hover:text-violet-200 cursor-pointer"
                    >
                      <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {lang === 'bn' ? 'এই উত্তর প্র্যাকটিস করুন' : 'Practice this response'}
                      </span>
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
