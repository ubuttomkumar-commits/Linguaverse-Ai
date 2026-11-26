import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  FlaskConical,
  Globe,
  Mic,
  Search,
  SlidersHorizontal,
  Volume2,
  X,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  DEFAULT_REPLAY_FILTERS,
  extractReplayScenarioCategories,
  paginateReplaySessions,
  type ReplayLibraryFilterState,
} from '../../domain/communicationReplayEngine';
import type { ReplayReviewStatus, UnifiedReplaySession } from '../../types/domain';

interface ReplayLibrarySidebarProps {
  sessions: UnifiedReplaySession[];
  allOwnedSessions: UnifiedReplaySession[];
  selectedSessionId: string | null;
  filters: ReplayLibraryFilterState;
  onChangeFilters: (next: ReplayLibraryFilterState) => void;
  onSelectSession: (sessionId: string) => void;
}

const PAGE_SIZE = 8;

function formatShortDate(iso: string, lang: 'en' | 'bn'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function formatDuration(seconds: number, lang: 'en' | 'bn'): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return lang === 'bn' ? `${secs} সে.` : `${secs}s`;
  return lang === 'bn' ? `${mins} মি. ${secs} সে.` : `${mins}m ${secs}s`;
}

function reviewStatusLabel(status: ReplayReviewStatus, lang: 'en' | 'bn'): string {
  if (status === 'reviewed') return lang === 'bn' ? 'পর্যালোচিত' : 'Reviewed';
  if (status === 'in_review') return lang === 'bn' ? 'চলমান' : 'In Progress';
  return lang === 'bn' ? 'অপর্যালোচিত' : 'Not Reviewed';
}

function reviewStatusAccent(status: ReplayReviewStatus): string {
  if (status === 'reviewed') return 'text-[#16E58B]';
  if (status === 'in_review') return 'text-[#F59E0B]';
  return 'text-slate-400';
}

export function ReplayLibrarySidebar({
  sessions,
  allOwnedSessions,
  selectedSessionId,
  filters,
  onChangeFilters,
  onSelectSession,
}: ReplayLibrarySidebarProps) {
  const { lang } = useLanguage();
  const [page, setPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const scenarioCategories = useMemo(
    () => extractReplayScenarioCategories(allOwnedSessions),
    [allOwnedSessions]
  );

  // Reset pagination whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const paginated = useMemo(
    () => paginateReplaySessions(sessions, page, PAGE_SIZE),
    [sessions, page]
  );

  const activeAdvancedCount =
    (filters.dateRange !== 'all' ? 1 : 0) +
    (filters.scenarioCategory !== 'all' ? 1 : 0) +
    (filters.transcriptFilter !== 'all' ? 1 : 0) +
    (filters.evaluationFilter !== 'all' ? 1 : 0);

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.source !== 'all' ||
    filters.reviewStatus !== 'all' ||
    filters.audioFilter !== 'all' ||
    activeAdvancedCount > 0;

  const handleResetFilters = () => {
    onChangeFilters({ ...DEFAULT_REPLAY_FILTERS });
    setPage(1);
  };

  return (
    <aside
      aria-label={lang === 'bn' ? 'সংরক্ষিত সেশন লাইব্রেরি' : 'Saved Session Library'}
      className="flex flex-col rounded-2xl border border-cyan-400/15 bg-[#081031]/90 backdrop-blur-xl"
    >
      {/* Header & Search */}
      <div className="space-y-3 border-b border-slate-800/80 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-portal text-sm font-bold text-white">
            {lang === 'bn' ? 'সংরক্ষিত সেশন লাইব্রেরি' : 'Saved Session Library'}
          </h2>
          <span
            data-testid="replay-library-count"
            className="font-mono text-xs text-slate-400 tabular-nums"
          >
            {sessions.length}/{allOwnedSessions.length}
          </span>
        </div>

        <div className="relative">
          <label htmlFor="replay-library-search" className="sr-only">
            {lang === 'bn' ? 'সেশন বা ট্রান্সক্রিপ্ট খুঁজুন' : 'Search saved sessions'}
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="replay-library-search"
            type="text"
            value={filters.search}
            onChange={(e) => onChangeFilters({ ...filters, search: e.target.value })}
            placeholder={
              lang === 'bn'
                ? 'সিনারিও, বাক্য বা ভুল খুঁজুন...'
                : 'Search scenario, phrase, or mistake...'
            }
            className="w-full rounded-xl border border-slate-800 bg-[#050A22] py-2 pl-9 pr-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, search: '' })}
              aria-label={lang === 'bn' ? 'অনুসন্ধান মুছুন' : 'Clear library search'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Source Segmented Filter */}
        <div
          role="group"
          aria-label={lang === 'bn' ? 'সেশনের উৎস ফিল্টার' : 'Filter by source'}
          className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800/90 bg-[#050A22] p-1"
        >
          {(
            [
              { id: 'all', en: 'All', bn: 'সব' },
              { id: 'speaking_studio', en: 'Speaking', bn: 'স্পিকিং' },
              { id: 'transfer_lab', en: 'Transfer', bn: 'ট্রান্সফার' },
            ] as const
          ).map((opt) => {
            const active = filters.source === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeFilters({ ...filters, source: opt.id })}
                aria-pressed={active}
                data-testid={`replay-source-filter-${opt.id}`}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
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

        {/* Primary Selectors: Review Status & Audio */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="replay-review-filter" className="sr-only">
              {lang === 'bn' ? 'পর্যালোচনার অবস্থা' : 'Review status filter'}
            </label>
            <select
              id="replay-review-filter"
              value={filters.reviewStatus}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  reviewStatus: e.target.value as ReplayLibraryFilterState['reviewStatus'],
                })
              }
              className="w-full rounded-lg border border-slate-800 bg-[#050A22] px-2.5 py-1.5 text-[11px] text-slate-200 focus:border-cyan-400/60 focus:outline-none"
            >
              <option value="all">{lang === 'bn' ? 'সব রিভিউ অবস্থা' : 'All review statuses'}</option>
              <option value="unreviewed">{lang === 'bn' ? 'অপর্যালোচিত' : 'Not Reviewed'}</option>
              <option value="in_review">{lang === 'bn' ? 'চলমান' : 'In Progress'}</option>
              <option value="reviewed">{lang === 'bn' ? 'পর্যালোচিত' : 'Reviewed'}</option>
            </select>
          </div>

          <div>
            <label htmlFor="replay-audio-filter" className="sr-only">
              {lang === 'bn' ? 'অডিও ফিল্টার' : 'Audio availability filter'}
            </label>
            <select
              id="replay-audio-filter"
              value={filters.audioFilter}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  audioFilter: e.target.value as ReplayLibraryFilterState['audioFilter'],
                })
              }
              className="w-full rounded-lg border border-slate-800 bg-[#050A22] px-2.5 py-1.5 text-[11px] text-slate-200 focus:border-cyan-400/60 focus:outline-none"
            >
              <option value="all">{lang === 'bn' ? 'সব অডিও অবস্থা' : 'All audio states'}</option>
              <option value="has_audio_metadata">
                {lang === 'bn' ? 'অডিও রেফসহ' : 'Has audio ref'}
              </option>
              <option value="text_only">{lang === 'bn' ? 'শুধু টেক্সট' : 'Text-only'}</option>
            </select>
          </div>
        </div>

        {/* Sort & Advanced Filters Toggle */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            aria-expanded={showAdvancedFilters}
            data-testid="replay-toggle-advanced-filters"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
          >
            <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            <span>
              {lang === 'bn' ? 'আরও ফিল্টার' : 'More filters'}
              {activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ''}
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            <label
              htmlFor="replay-sort-select"
              className="inline-flex items-center gap-1 text-[11px] text-slate-400"
            >
              <Filter className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">{lang === 'bn' ? 'সাজান' : 'Sort'}</span>
            </label>
            <select
              id="replay-sort-select"
              value={filters.sortBy}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  sortBy: e.target.value as ReplayLibraryFilterState['sortBy'],
                })
              }
              className="rounded-lg border border-slate-800 bg-[#050A22] px-2.5 py-1 text-[11px] text-slate-200 focus:border-cyan-400/60 focus:outline-none"
            >
              <option value="newest">{lang === 'bn' ? 'সবচেয়ে সাম্প্রতিক' : 'Most recent'}</option>
              <option value="oldest">{lang === 'bn' ? 'সবচেয়ে পুরনো' : 'Oldest first'}</option>
              <option value="recently_reviewed">
                {lang === 'bn' ? 'সাম্প্রতিক পর্যালোচিত' : 'Recently reviewed'}
              </option>
              <option value="most_mistakes">
                {lang === 'bn' ? 'বেশি ভুল প্রথম' : 'Most mistakes'}
              </option>
              <option value="highest_score">
                {lang === 'bn' ? 'সর্বোচ্চ স্কোর' : 'Highest score'}
              </option>
            </select>
          </div>
        </div>

        {/* Advanced Filter Drawer: Date Range, Category, Transcript, Evaluation */}
        {showAdvancedFilters && (
          <div
            data-testid="replay-advanced-filters"
            className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800/80 bg-[#050A22]/80 p-2.5"
          >
            <div>
              <label htmlFor="replay-date-filter" className="block text-[10px] text-slate-400 mb-1">
                {lang === 'bn' ? 'সময়সীমা' : 'Date range'}
              </label>
              <select
                id="replay-date-filter"
                value={filters.dateRange}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    dateRange: e.target.value as ReplayLibraryFilterState['dateRange'],
                  })
                }
                className="w-full rounded-lg border border-slate-800 bg-[#081031] px-2 py-1.5 text-[11px] text-slate-200 focus:border-cyan-400/60 focus:outline-none"
              >
                <option value="all">{lang === 'bn' ? 'সব সময়' : 'All dates'}</option>
                <option value="7d">{lang === 'bn' ? 'গত ৭ দিন' : 'Last 7 days'}</option>
                <option value="30d">{lang === 'bn' ? 'গত ৩০ দিন' : 'Last 30 days'}</option>
                <option value="90d">{lang === 'bn' ? 'গত ৯০ দিন' : 'Last 90 days'}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="replay-category-filter"
                className="block text-[10px] text-slate-400 mb-1"
              >
                {lang === 'bn' ? 'ক্যাটাগরি' : 'Scenario category'}
              </label>
              <select
                id="replay-category-filter"
                value={filters.scenarioCategory}
                onChange={(e) =>
                  onChangeFilters({ ...filters, scenarioCategory: e.target.value })
                }
                className="w-full rounded-lg border border-slate-800 bg-[#081031] px-2 py-1.5 text-[11px] text-slate-200 focus:border-cyan-400/60 focus:outline-none"
              >
                <option value="all">{lang === 'bn' ? 'সব ক্যাটাগরি' : 'All categories'}</option>
                {scenarioCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="replay-transcript-filter"
                className="block text-[10px] text-slate-400 mb-1"
              >
                {lang === 'bn' ? 'ট্রান্সক্রিপ্ট' : 'Transcript'}
              </label>
              <select
                id="replay-transcript-filter"
                value={filters.transcriptFilter}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    transcriptFilter: e.target.value as ReplayLibraryFilterState['transcriptFilter'],
                  })
                }
                className="w-full rounded-lg border border-slate-800 bg-[#081031] px-2 py-1.5 text-[11px] text-slate-200 focus:border-cyan-400/60 focus:outline-none"
              >
                <option value="all">{lang === 'bn' ? 'সব' : 'All'}</option>
                <option value="has_transcript">
                  {lang === 'bn' ? 'ট্রান্সক্রিপ্ট আছে' : 'Available'}
                </option>
                <option value="missing_transcript">
                  {lang === 'bn' ? 'অনুপলব্ধ' : 'Missing'}
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="replay-eval-filter"
                className="block text-[10px] text-slate-400 mb-1"
              >
                {lang === 'bn' ? 'মূল্যায়ন' : 'Evaluation'}
              </label>
              <select
                id="replay-eval-filter"
                value={filters.evaluationFilter}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    evaluationFilter: e.target.value as ReplayLibraryFilterState['evaluationFilter'],
                  })
                }
                className="w-full rounded-lg border border-slate-800 bg-[#081031] px-2 py-1.5 text-[11px] text-slate-200 focus:border-cyan-400/60 focus:outline-none"
              >
                <option value="all">{lang === 'bn' ? 'সব' : 'All'}</option>
                <option value="evaluated">{lang === 'bn' ? 'মূল্যায়িত' : 'Evaluated'}</option>
                <option value="not_evaluated">
                  {lang === 'bn' ? 'মূল্যায়ন নেই' : 'Not evaluated'}
                </option>
              </select>
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            data-testid="replay-reset-filters-btn"
            className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
          >
            {lang === 'bn' ? 'সব ফিল্টার রিসেট করুন' : 'Reset all filters'}
          </button>
        )}
      </div>

      {/* Session List */}
      <div className="max-h-[680px] divide-y divide-slate-800/70 overflow-y-auto p-2">
        {paginated.items.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs font-medium text-slate-300">
              {lang === 'bn'
                ? 'এই ফিল্টারের সাথে কোনো সেশন মেলেনি।'
                : 'No saved sessions match your current filters.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 cursor-pointer"
              >
                {lang === 'bn' ? 'ফিল্টার মুছুন' : 'Clear filters'}
              </button>
            )}
          </div>
        ) : (
          <>
            {paginated.items.map((session) => {
              const isSelected = session.id === selectedSessionId;
              const SourceIcon = session.source === 'transfer_lab' ? FlaskConical : Mic;

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  aria-current={isSelected ? 'true' : undefined}
                  data-testid={`replay-session-item-${session.id}`}
                  className={`mb-1.5 w-full rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400/50 bg-[linear-gradient(135deg,rgba(0,217,255,0.14)_0%,rgba(124,58,237,0.14)_100%)]'
                      : 'border-transparent bg-[#060C24]/70 hover:border-slate-700/80 hover:bg-[#0B1438]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1.5 font-medium text-cyan-300 min-w-0">
                      <SourceIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {session.source === 'transfer_lab'
                          ? lang === 'bn'
                            ? 'ট্রান্সফার ল্যাব'
                            : 'Transfer Lab'
                          : lang === 'bn'
                            ? 'স্পিকিং স্টুডিও'
                            : 'Speaking Studio'}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-slate-400">
                      {formatShortDate(session.completedAt, lang)}
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-1 text-sm font-bold text-white">
                    {lang === 'bn' ? session.titleBn : session.titleEn}
                  </p>

                  {/* Unboxed Typographic Metadata Row */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-slate-400 tabular-nums">
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Globe className="h-3 w-3 text-slate-500" aria-hidden="true" />
                      {session.targetLanguage}
                    </span>
                    {session.durationSeconds > 0 && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" aria-hidden="true" />
                          {formatDuration(session.durationSeconds, lang)}
                        </span>
                      </>
                    )}
                    <span className="text-slate-600">·</span>
                    <span
                      className={
                        session.mistakes.length > 0 ? 'text-amber-300' : 'text-emerald-300'
                      }
                    >
                      {session.mistakes.length}{' '}
                      {lang === 'bn'
                        ? 'ভুল'
                        : session.mistakes.length === 1
                          ? 'mistake'
                          : 'mistakes'}
                    </span>
                    {session.analysis.overallScore !== null && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="font-semibold text-cyan-200">
                          {session.analysis.overallScore}%
                        </span>
                      </>
                    )}
                  </div>

                  {/* Honest Capability Indicators (Review · Audio · Transcript · Eval) */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${reviewStatusAccent(session.reviewStatus)}`}
                    >
                      {session.reviewStatus === 'reviewed' && (
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      )}
                      <span>{reviewStatusLabel(session.reviewStatus, lang)}</span>
                    </span>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      {session.audioKeyCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-cyan-300">
                          <Volume2 className="h-3 w-3" aria-hidden="true" />
                          <span>{lang === 'bn' ? 'অডিও' : 'Audio'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {lang === 'bn' ? 'টেক্সট' : 'Text'}
                        </span>
                      )}
                      <span className="text-slate-700">·</span>
                      <span
                        className={
                          session.hasTranscript ? 'text-slate-300' : 'text-amber-400/80'
                        }
                      >
                        <FileText className="mr-0.5 inline h-2.5 w-2.5" aria-hidden="true" />
                        {session.hasTranscript
                          ? lang === 'bn'
                            ? 'লিপি'
                            : 'Transcript'
                          : lang === 'bn'
                            ? 'লিপি নেই'
                            : 'No transcript'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Pagination Load More */}
            {paginated.hasMore && (
              <div className="pt-3 pb-1 text-center">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="replay-load-more-btn"
                  className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                >
                  {lang === 'bn'
                    ? `আরও সেশন দেখুন (${paginated.items.length}/${sessions.length})`
                    : `Load More (${paginated.items.length} of ${sessions.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
