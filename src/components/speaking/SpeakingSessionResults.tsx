import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  History,
  MessageSquare,
  Mic,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  buildSpeakingSessionResults,
} from '../../domain/speakingStudioEngine';
import type { CommunicationDnaProfile } from '../../domain/communicationDnaEngine';
import type {
  SavedConversationVocabItem,
  SpeakingModeId,
  SpeakingSessionRecord,
} from '../../types/domain';

interface SpeakingSessionResultsProps {
  session: SpeakingSessionRecord;
  dna: CommunicationDnaProfile;
  xpAwarded: number;
  savedVocabulary?: SavedConversationVocabItem[];
  onPracticeAgain: (modeId: SpeakingModeId) => void;
  onReviewTranscript: () => void;
  onReturnHome: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export function SpeakingSessionResults({
  session,
  dna,
  xpAwarded,
  savedVocabulary = [],
  onPracticeAgain,
  onReviewTranscript,
  onReturnHome,
}: SpeakingSessionResultsProps) {
  const { lang } = useLanguage();
  const model = buildSpeakingSessionResults(session);
  const speakingDim = dna.dimensions.find((d) => d.id === 'speaking_task_completion');
  const learnerMessagesCount = session.turns.length;
  const aiResponsesCount = session.turns.length + 1; // opening prompt + 1 AI reply per evaluated turn

  return (
    <div className="space-y-6" data-testid="speaking-session-results">
      {/* Header Summary Card */}
      <section className="rounded-2xl border border-[#22D3EE]/40 bg-gradient-to-br from-[#0B1230] to-[#070B1B] p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium text-[#22D3EE]">
              {lang === 'bn' ? 'সেশন ফলাফল ও ভাষাগত বিশ্লেষণ' : 'Post-Conversation Summary'} ·{' '}
              {lang === 'bn' ? model.pressureTitleBn : model.pressureTitleEn}
            </p>
            <h2 className="mt-1.5 text-2xl font-bold text-white">
              {lang === 'bn' ? model.scenario.titleBn : model.scenario.titleEn}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-slate-300 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
                {formatDuration(model.durationSeconds)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
                {lang === 'bn'
                  ? `আপনার বার্তা: ${learnerMessagesCount} · AI উত্তর: ${aiResponsesCount}`
                  : `${learnerMessagesCount} learner msg${learnerMessagesCount === 1 ? '' : 's'} · ${aiResponsesCount} AI replies`}
              </span>
              <span>
                {model.verifiedMistakes.length}{' '}
                {lang === 'bn' ? 'টি নিশ্চিত ভুল সিঙ্কড' : 'Mistake Memory synced'}
              </span>
              {xpAwarded > 0 && (
                <span className="text-amber-300">+{xpAwarded} Verified XP</span>
              )}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              {lang === 'bn'
                ? 'স্বচ্ছতা নোট: AI কোচিং পরামর্শগুলো অনুশীলনের সহায়তার জন্য দেওয়া হয়েছে; এগুলো কোনো সনদপ্রাপ্ত CEFR স্কোর বা আনুষ্ঠানিক পরীক্ষা নয়।'
                : 'Honesty note: AI coaching feedback highlights practical communication opportunities and is clearly distinct from a certified CEFR assessment.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onPracticeAgain(session.modeId)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'আবার অনুশীলন করুন' : 'Practice Again'}</span>
            </button>
            <button
              type="button"
              onClick={onReviewTranscript}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#070B1B] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-[#22D3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <History className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'পূর্ণ ট্রান্সক্রিপ্ট দেখুন' : 'Review Transcript'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Saved Vocabulary Highlight (when learner saved phrases) */}
      {savedVocabulary.length > 0 && (
        <section className="rounded-2xl border border-emerald-500/30 bg-[#0B1230] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
              <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'আপনার সংরক্ষিত শব্দভাণ্ডার'
                  : 'Saved Vocabulary & Useful Phrases'}
              </span>
            </h3>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {savedVocabulary.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {savedVocabulary.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-[#070B1B] p-3 text-xs"
              >
                <p className="font-mono font-semibold text-[#67E8F9]">{item.phrase}</p>
                {item.contextSentence && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                    “{item.contextSentence}”
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evaluation Dimensions Grid (Source + Limitations Explicitly Disclosed) */}
      <section aria-labelledby="results-dimensions-heading" className="space-y-3">
        <h3 id="results-dimensions-heading" className="text-base font-bold text-white">
          {lang === 'bn' ? 'যাচাইকৃত মূল্যায়ন বিশ্লেষণ' : 'Verified Evaluation Breakdown'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {model.dimensions.map((dim) => (
            <div
              key={dim.id}
              className="rounded-xl border border-slate-800/90 bg-[#0B1230] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white">
                  {lang === 'bn' ? dim.labelBn : dim.labelEn}
                </h4>
                <span
                  className={`font-mono text-xs font-semibold ${
                    dim.evidenceType === 'measured'
                      ? 'text-[#22D3EE]'
                      : dim.evidenceType === 'ai_linguistic'
                        ? 'text-violet-300'
                        : 'text-slate-400'
                  }`}
                >
                  {lang === 'bn' ? dim.statusLabelBn : dim.statusLabelEn}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {lang === 'bn' ? `উৎস: ${dim.sourceBn}` : `Source: ${dim.sourceEn}`}
              </p>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                {lang === 'bn' ? dim.detailBn : dim.detailEn}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Corrected Sentences & Natural Alternatives */}
      <section className="rounded-2xl border border-slate-800/90 bg-[#0B1230] p-5 sm:p-6 space-y-4">
        <h3 className="text-base font-bold text-white">
          {lang === 'bn'
            ? 'আপনার বাক্য বনাম শুদ্ধ ও স্বাভাবিক রূপ'
            : 'Corrected Sentences & Vocabulary Upgrades'}
        </h3>

        <div className="space-y-3.5">
          {model.correctedSentences.map((row) => (
            <div
              key={row.turnNumber}
              className="rounded-xl border border-slate-800 bg-[#070B1B] p-4 space-y-2.5"
            >
              <p className="font-mono text-[11px] text-[#22D3EE] tabular-nums">
                {lang === 'bn' ? `ধাপ ০${row.turnNumber}` : `Turn 0${row.turnNumber}`}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs leading-relaxed">
                <div>
                  <p className="font-medium text-slate-400">
                    {lang === 'bn' ? 'আপনি যা বলেছেন' : 'You said'}
                  </p>
                  <p className="mt-1 text-slate-200">{row.original}</p>
                </div>
                <div>
                  <p className="font-medium text-emerald-400">
                    {lang === 'bn' ? 'শুদ্ধ রূপ' : 'Corrected'}
                  </p>
                  <p className="mt-1 text-emerald-200">{row.corrected}</p>
                </div>
                <div>
                  <p className="font-medium text-violet-300">
                    {lang === 'bn' ? 'স্বাভাবিক বিকল্প' : 'Natural phrasing'}
                  </p>
                  <p className="mt-1 text-slate-100">{row.naturalAlternative}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Strengths + Mistake Memory Sync Status */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Verified Mistakes Synced to Mistake Memory */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#0B1230] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">
              {lang === 'bn'
                ? 'Mistake Memory-তে সংরক্ষিত ভুল'
                : 'Synced to Mistake Memory (High Confidence)'}
            </h3>
            <span className="font-mono text-xs text-amber-300 tabular-nums">
              {model.verifiedMistakes.length}
            </span>
          </div>

          {model.verifiedMistakes.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'এই সেশনে উচ্চ-নিশ্চয়তার কোনো ভুল শনাক্ত হয়নি।'
                : 'No high-confidence errors (>= 70%) were detected in this session.'}
            </p>
          ) : (
            <div className="space-y-3">
              {model.verifiedMistakes.map((m, idx) => (
                <div
                  key={`vm_${idx}`}
                  className="rounded-lg border border-amber-500/30 bg-[#070B1B] p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-violet-300">{m.category}</span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {Math.round(m.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
                    <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" aria-hidden="true" />
                    <span className="text-rose-300 line-through">{m.original}</span>
                    <span className="text-slate-500" aria-hidden="true">→</span>
                    <span className="font-semibold text-emerald-300">{m.corrected}</span>
                  </p>
                  <p className="mt-1.5 text-slate-300">{m.explanation_en}</p>
                  <p className="font-bn mt-1 text-slate-400">{m.explanation_bn}</p>
                </div>
              ))}
            </div>
          )}

          {model.suggestedImprovements.length > 0 && (
            <div className="border-t border-slate-800 pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <AlertCircle className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? `ঐচ্ছিক AI পরামর্শ (${model.suggestedImprovements.length} — Mistake Memory-তে সংরক্ষিত নয়)`
                    : `Optional AI Suggestions (${model.suggestedImprovements.length} — not stored as confirmed mistakes)`}
                </span>
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                {model.suggestedImprovements.map((s, idx) => (
                  <li key={`sug_${idx}`}>
                    “{s.original}” → “{s.corrected}” ({Math.round(s.confidence * 100)}% confidence)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Strengths & Communication DNA Impact */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#0B1230] p-5 space-y-4">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'আপনার শক্তিশালী দিক' : 'What You Did Well'}</span>
            </h3>
            {model.strengths.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'প্রতিটি ধাপ সম্পন্ন করার জন্য ধন্যবাদ — আরও বিশদ উত্তরে শক্তিগুলো আরও স্পষ্ট হবে।'
                  : 'Keep speaking in multi-clause responses to capture specific phrasing strengths.'}
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-200">
                {model.strengths.map((st, idx) => (
                  <li key={idx}>• {st}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#22D3EE]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'Communication DNA প্রমাণ আপডেট' : 'Communication DNA Evidence'}</span>
            </p>
            {speakingDim && (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                {speakingDim.scorePercent !== null ? (
                  <>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {speakingDim.scorePercent}%
                    </span>{' '}
                    ({lang === 'bn' ? speakingDim.coverageLabelBn : speakingDim.coverageLabelEn} ·{' '}
                    {lang === 'bn' ? speakingDim.sampleBreakdownBn : speakingDim.sampleBreakdownEn})
                  </>
                ) : (
                  <span>
                    {lang === 'bn' ? speakingDim.evidenceNoteBn : speakingDim.evidenceNoteEn}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs font-semibold text-slate-200">
              {lang === 'bn' ? 'পরবর্তী প্রস্তাবিত অনুশীলন' : 'Suggested Next Practice'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {lang === 'bn' ? model.recommendedNextReasonBn : model.recommendedNextReasonEn}
            </p>
          </div>
        </section>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B1230] p-4">
        <button
          type="button"
          onClick={onReturnHome}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#070B1B] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{lang === 'bn' ? 'স্পিকিং স্টুডিও হোমে ফিরুন' : 'Return to Speaking Studio'}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/app/improve"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/50 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/25 transition-colors"
          >
            <span>{lang === 'bn' ? 'ভুলগুলো অনুশীলন করুন' : 'Practice Mistakes'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => onPracticeAgain(model.recommendedNextScenarioId)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#22D3EE] px-4 py-2 text-xs font-semibold text-[#070B1B] hover:brightness-110 transition-all cursor-pointer"
          >
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'পরবর্তী দৃশ্যপট শুরু করুন' : 'Start Next Practice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
