import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Compass,
  Layers,
  PanelRightClose,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { CORRECTION_STYLE_OPTIONS } from '../../domain/conversationContextEngine';
import { MISTAKE_MEMORY_MIN_CONFIDENCE } from '../../domain/speakingEvaluation';
import type { SpeakingScenario } from '../../domain/speakingScenarios';
import type {
  ConversationCorrectionStyle,
  SavedConversationVocabItem,
  SpeakingTurnRecord,
} from '../../types/domain';

interface ConversationContextSidebarProps {
  scenario: SpeakingScenario;
  turns: SpeakingTurnRecord[];
  correctionStyle: ConversationCorrectionStyle;
  onChangeCorrectionStyle: (style: ConversationCorrectionStyle) => void;
  savedVocabulary: SavedConversationVocabItem[];
  onSaveVocabulary: (phrase: string, contextSentence: string) => void;
  onRemoveVocabulary: (phraseOrId: string) => void;
  isContextCompressed: boolean;
  summarizedEntryCount: number;
  onCollapse?: () => void;
}

export function ConversationContextSidebar({
  scenario,
  turns,
  correctionStyle,
  onChangeCorrectionStyle,
  savedVocabulary,
  onSaveVocabulary,
  onRemoveVocabulary,
  isContextCompressed,
  summarizedEntryCount,
  onCollapse,
}: ConversationContextSidebarProps) {
  const { lang } = useLanguage();
  const savedSet = new Set(savedVocabulary.map((item) => item.phrase.toLowerCase()));

  const confirmedMistakesCount = turns.reduce(
    (sum, turn) =>
      sum +
      turn.evaluation.mistakes.filter((m) => m.confidence >= MISTAKE_MEMORY_MIN_CONFIDENCE).length,
    0
  );

  const uniqueCategories = Array.from(
    new Set(
      turns.flatMap((t) =>
        t.evaluation.mistakes
          .filter((m) => m.confidence >= MISTAKE_MEMORY_MIN_CONFIDENCE)
          .map((m) => m.category)
      )
    )
  );

  return (
    <aside
      aria-label={lang === 'bn' ? 'প্রাসঙ্গিক শেখার সহায়তা ও সেটিংস' : 'Contextual learning support and settings'}
      className="flex h-full flex-col rounded-2xl border border-slate-800/90 bg-[#0B1230]/90 p-4"
      data-testid="conversation-context-sidebar"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-4 w-4 text-violet-300 shrink-0" aria-hidden="true" />
          <h2 className="truncate text-xs font-bold uppercase tracking-wider text-slate-200">
            {lang === 'bn' ? 'শেখার সহায়তা' : 'Learning Context'}
          </h2>
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={lang === 'bn' ? 'শেখার সহায়তা প্যানেল লুকান' : 'Collapse learning context panel'}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <PanelRightClose className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Scrollable Contextual Learning Content */}
      <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-0.5 text-xs">
        {/* 1. Scenario Objective */}
        <section className="space-y-2">
          <p className="flex items-center gap-1.5 font-semibold text-[#22D3EE]">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'বর্তমান লক্ষ্য' : 'Conversation Objective'}</span>
          </p>
          <p className="leading-relaxed text-slate-200">
            {lang === 'bn' ? scenario.communicationGoalBn : scenario.communicationGoalEn}
          </p>
          <p className="leading-relaxed text-slate-400">
            {lang === 'bn' ? scenario.contextBn : scenario.contextEn}
          </p>
        </section>

        {/* 2. Useful Vocabulary (Clickable Save) */}
        <section className="border-t border-slate-800/80 pt-4 space-y-2.5">
          <p className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Sparkles className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
            <span>{lang === 'bn' ? 'উপযোগী শব্দগুচ্ছ' : 'Useful Vocabulary'}</span>
          </p>
          <ul className="space-y-1.5">
            {scenario.suggestedVocabulary.map((phrase) => {
              const isSaved = savedSet.has(phrase.toLowerCase());
              return (
                <li
                  key={phrase}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#070B1B]/90 px-2.5 py-2"
                >
                  <span className="font-mono text-[11px] text-[#67E8F9]">{phrase}</span>
                  <button
                    type="button"
                    onClick={() =>
                      isSaved
                        ? onRemoveVocabulary(phrase)
                        : onSaveVocabulary(phrase, scenario.openingPromptEn)
                    }
                    aria-label={
                      isSaved
                        ? `Remove "${phrase}" from saved vocabulary`
                        : `Save "${phrase}" to vocabulary`
                    }
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-emerald-500/15 text-emerald-300 hover:bg-rose-500/15 hover:text-rose-200'
                        : 'bg-slate-800 text-slate-300 hover:bg-[#22D3EE]/20 hover:text-[#22D3EE]'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="h-3 w-3" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'সংরক্ষিত' : 'Saved'}</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3 w-3" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'সংরক্ষণ' : 'Save'}</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 3. Saved Vocabulary Vault */}
        <section
          className="border-t border-slate-800/80 pt-4 space-y-2"
          data-testid="saved-vocabulary-list"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-200">
              {lang === 'bn' ? 'সংরক্ষিত শব্দভাণ্ডার' : 'Saved Vocabulary'}
            </p>
            <span className="font-mono text-[11px] text-emerald-300 tabular-nums">
              {savedVocabulary.length}
            </span>
          </div>
          {savedVocabulary.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'AI বার্তা বা উপরের তালিকা থেকে যেকোনো দরকারি শব্দগুচ্ছ সংরক্ষণ করুন।'
                : 'Save useful phrases from AI messages or above to review after this session.'}
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {savedVocabulary.slice(0, 12).map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-emerald-500/20 bg-[#070B1B] px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold text-emerald-200 break-words">
                      {item.phrase}
                    </p>
                    {item.contextSentence && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                        {item.contextSentence}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveVocabulary(item.id)}
                    aria-label={`Remove saved phrase ${item.phrase}`}
                    className="rounded p-1 text-slate-500 hover:text-rose-300 cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 4. Contextual Grammar & Learning Summary */}
        <section className="border-t border-slate-800/80 pt-4 space-y-2">
          <p className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Layers className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
            <span>{lang === 'bn' ? 'সেশন ব্যাকরণ ও প্রসঙ্গ' : 'Grammar & Context Window'}</span>
          </p>
          <div className="rounded-lg border border-slate-800 bg-[#070B1B]/90 p-3 space-y-1.5">
            <p className="font-mono text-[11px] text-slate-300 tabular-nums">
              {turns.length} {lang === 'bn' ? 'ধাপ মূল্যায়িত' : 'turns evaluated'} ·{' '}
              {confirmedMistakesCount}{' '}
              {lang === 'bn' ? 'টি Mistake Memory সিঙ্কড' : 'Mistake Memory synced'}
            </p>
            {uniqueCategories.length > 0 ? (
              <p className="text-[11px] text-amber-200/90">
                {lang === 'bn' ? 'মনোযোগের ক্ষেত্র: ' : 'Focus areas: '}
                {uniqueCategories.join(' · ')}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                {lang === 'bn'
                  ? 'প্রতিটি উত্তরের সাথে সাথে ব্যাকরণ ও বাংলা-থেকে-ইংরেজি ভুলের বিশ্লেষণ এখানে যুক্ত হবে।'
                  : 'Grammar patterns and Bangla-transfer notes accumulate here as you practice.'}
              </p>
            )}
            {isContextCompressed && (
              <p className="pt-1 text-[11px] text-[#22D3EE]">
                {lang === 'bn'
                  ? `দীর্ঘ কথোপকথন সক্রিয়: পূর্বের ${summarizedEntryCount}টি বার্তা সংক্ষিপ্ত প্রসঙ্গ হিসেবে ধরে রাখা হয়েছে।`
                  : `Long-session memory active: ${summarizedEntryCount} earlier messages condensed into rolling context.`}
              </p>
            )}
          </div>
        </section>

        {/* 5. Real Backend-Wired Correction Style Preference */}
        <section className="border-t border-slate-800/80 pt-4 space-y-2.5">
          <p className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Sliders className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />
            <span>{lang === 'bn' ? 'সংশোধন পছন্দ (AI Coaching)' : 'Correction Preference'}</span>
          </p>
          <div
            role="radiogroup"
            aria-label={lang === 'bn' ? 'AI সংশোধনের ধরন' : 'AI correction style'}
            className="space-y-1.5"
          >
            {CORRECTION_STYLE_OPTIONS.map((opt) => {
              const active = opt.id === correctionStyle;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChangeCorrectionStyle(opt.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-[#22D3EE]/60 bg-[#22D3EE]/10 text-white'
                      : 'border-slate-800 bg-[#070B1B]/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <p className="font-semibold text-xs">
                    {lang === 'bn' ? opt.labelBn : opt.labelEn}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                    {lang === 'bn' ? opt.descBn : opt.descEn}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 6. Transparent Privacy & Data Handling Notice */}
        <section className="border-t border-slate-800/80 pt-4">
          <div className="rounded-lg border border-slate-800 bg-[#070B1B]/70 p-3 space-y-1.5">
            <p className="flex items-center gap-1.5 font-semibold text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>{lang === 'bn' ? 'গোপনীয়তা ও ডেটা স্বচ্ছতা' : 'Privacy & AI Transparency'}</span>
            </p>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'কথোপকথন ও শব্দভাণ্ডার কেবল আপনার অ্যাকাউন্টের ব্রাউজার স্টোরেজে সংরক্ষিত হয়। AI মূল্যায়নের জন্য কেবল টেক্সট ট্রান্সক্রিপ্ট সার্ভারে পাঠানো হয়; কাঁচা অডিও নয়। AI পরামর্শ কোনো সনদপ্রাপ্ত CEFR স্কোর নয়।'
                : 'Transcripts and saved phrases stay scoped to your account in local storage; voice clips save locally in IndexedDB only with consent. Only sanitized text transcripts are sent to the server-side Gemini evaluator. AI coaching suggestions are not certified assessments.'}
            </p>
          </div>
        </section>
      </div>
    </aside>
  );
}
