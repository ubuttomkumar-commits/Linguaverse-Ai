import { useMemo, useState } from 'react';
import {
  Clock,
  Compass,
  History,
  MessageSquarePlus,
  PanelLeftClose,
  Play,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  SPEAKING_SCENARIOS,
  getSpeakingScenario,
} from '../../domain/speakingScenarios';
import { filterConversationHistory } from '../../domain/conversationContextEngine';
import type { SpeakingSessionDraft } from '../../services/speakingStateStore';
import type { SpeakingModeId, SpeakingSessionRecord } from '../../types/domain';

interface ConversationHistorySidebarProps {
  activeSessionId: string;
  activeModeId: SpeakingModeId;
  sessions: SpeakingSessionRecord[];
  savedDraft: SpeakingSessionDraft | null;
  onNewConversation: () => void;
  onSelectScenario: (modeId: SpeakingModeId) => void;
  onInspectSession: (session: SpeakingSessionRecord) => void;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
  onCollapse?: () => void;
}

function formatShortDate(iso: string, lang: 'en' | 'bn'): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function ConversationHistorySidebar({
  activeSessionId,
  activeModeId,
  sessions,
  savedDraft,
  onNewConversation,
  onSelectScenario,
  onInspectSession,
  onResumeDraft,
  onDiscardDraft,
  onCollapse,
}: ConversationHistorySidebarProps) {
  const { lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(
    () => filterConversationHistory(sessions, searchQuery),
    [sessions, searchQuery]
  );

  const shortcutScenarios = useMemo(() => SPEAKING_SCENARIOS.slice(0, 6), []);

  return (
    <aside
      aria-label={lang === 'bn' ? 'কথোপকথনের ইতিহাস ও দৃশ্যপট' : 'Conversation history and scenarios'}
      className="flex h-full flex-col rounded-2xl border border-slate-800/90 bg-[#0B1230]/90 p-4"
      data-testid="conversation-history-sidebar"
    >
      {/* Top Row: Title + Collapse */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <History className="h-4 w-4 text-[#22D3EE] shrink-0" aria-hidden="true" />
          <h2 className="truncate text-xs font-bold uppercase tracking-wider text-slate-200">
            {lang === 'bn' ? 'কথোপকথন' : 'Conversations'}
          </h2>
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={lang === 'bn' ? 'ইতিহাস প্যানেল লুকান' : 'Collapse history panel'}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Primary Action: New Conversation */}
      <button
        type="button"
        onClick={onNewConversation}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all cursor-pointer"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{lang === 'bn' ? 'নতুন কথোপকথন' : 'New Conversation'}</span>
      </button>

      {/* Search Saved Conversations */}
      <div className="mt-3 relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={lang === 'bn' ? 'পূর্ববর্তী কথোপকথন খুঁজুন' : 'Search conversation history'}
          placeholder={lang === 'bn' ? 'কথোপকথন খুঁজুন...' : 'Search history...'}
          className="w-full rounded-lg border border-slate-800 bg-[#070B1B] py-2 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
        />
      </div>

      {/* Scrollable Body */}
      <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-0.5">
        {/* Saved Draft Recovery Card (if different from current session) */}
        {savedDraft && savedDraft.sessionId !== activeSessionId && (
          <div className="rounded-xl border border-[#22D3EE]/40 bg-[#070B1B] p-3">
            <p className="text-[11px] font-semibold text-[#22D3EE]">
              {lang === 'bn' ? 'সংরক্ষিত ড্রাফট' : 'Saved Draft'}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-white">
              {lang === 'bn'
                ? getSpeakingScenario(savedDraft.modeId).titleBn
                : getSpeakingScenario(savedDraft.modeId).titleEn}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
              {savedDraft.turns.length} {lang === 'bn' ? 'ধাপ' : 'turns'}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={onResumeDraft}
                className="inline-flex items-center gap-1 rounded-md bg-[#22D3EE] px-2.5 py-1 text-[11px] font-semibold text-[#070B1B] hover:brightness-110 cursor-pointer"
              >
                <Play className="h-3 w-3" aria-hidden="true" />
                <span>{lang === 'bn' ? 'চালিয়ে যান' : 'Resume'}</span>
              </button>
              <button
                type="button"
                onClick={onDiscardDraft}
                aria-label={lang === 'bn' ? 'ড্রাফট মুছুন' : 'Discard saved draft'}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-rose-500/50 hover:text-rose-200 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Saved Sessions List */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>{lang === 'bn' ? 'সাম্প্রতিক সেশন' : 'Recent History'}</span>
            <span className="font-mono tabular-nums">{filteredSessions.length}</span>
          </div>

          {filteredSessions.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-800 bg-[#070B1B]/60 p-3 text-xs leading-relaxed text-slate-400">
              {searchQuery.trim()
                ? lang === 'bn'
                  ? 'এই শব্দে কোনো সংরক্ষিত কথোপকথন পাওয়া যায়নি।'
                  : 'No saved conversations match your search.'
                : lang === 'bn'
                  ? 'আপনার মূল্যায়িত সেশনগুলো এখানে স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।'
                  : 'Your evaluated conversations will appear here automatically.'}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {filteredSessions.slice(0, 8).map((sess) => {
                const sc = getSpeakingScenario(sess.modeId);
                const isActive = sess.id === activeSessionId;
                const previewText =
                  sess.turns[sess.turns.length - 1]?.userTranscript ?? sc.subtitleEn;
                return (
                  <li key={sess.id}>
                    <button
                      type="button"
                      onClick={() => onInspectSession(sess)}
                      className={`w-full rounded-xl border p-2.5 text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10'
                          : 'border-slate-800/80 bg-[#070B1B]/80 hover:border-slate-700 hover:bg-[#070B1B]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-white">
                          {lang === 'bn' ? sc.titleBn : sc.titleEn}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums">
                          {formatShortDate(sess.updatedAt, lang)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                        {previewText}
                      </p>
                      <p className="mt-1 flex items-center gap-2 font-mono text-[10px] text-slate-500 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                          {sess.turns.length} {lang === 'bn' ? 'ধাপ' : 'turns'}
                        </span>
                        {isActive && (
                          <span className="text-[#22D3EE]">
                            · {lang === 'bn' ? 'চলমান' : 'Active'}
                          </span>
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Scenario Shortcuts */}
        <div className="border-t border-slate-800/80 pt-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Compass className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
            <span>{lang === 'bn' ? 'দৃশ্যপট শর্টকাট' : 'Scenario Shortcuts'}</span>
          </p>
          <ul className="mt-2 space-y-1">
            {shortcutScenarios.map((sc) => {
              const selected = sc.id === activeModeId;
              return (
                <li key={sc.id}>
                  <button
                    type="button"
                    onClick={() => onSelectScenario(sc.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#3B82F6]/20 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{lang === 'bn' ? sc.titleBn : sc.titleEn}</span>
                    {selected && (
                      <Sparkles
                        className="h-3 w-3 shrink-0 text-[#22D3EE]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
