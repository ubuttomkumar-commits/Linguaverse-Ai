import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  PlayCircle,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  TRANSFER_CATEGORIES,
  getAllScenarioSkillTags,
  type ScenarioDurationFilter,
  type ScenarioFilterState,
  type ScenarioProgressStatus,
  type ScenarioSortOption,
  type ScenarioUniverseCardModel,
} from '../../domain/transferLabUniverseEngine';
import type { TransferDifficultyLevel, TransferScenarioCategory } from '../../types/domain';
import type { TransferHealthResponse } from '../../services/transferApi';

interface ScenarioUniverseExplorerProps {
  models: ScenarioUniverseCardModel[];
  filteredModels: ScenarioUniverseCardModel[];
  filters: ScenarioFilterState;
  health: TransferHealthResponse | null;
  onChangeFilters: (next: ScenarioFilterState) => void;
  onLaunchScenario: (scenarioId: string) => void;
}

const DIFFICULTY_LABEL: Record<TransferDifficultyLevel, { en: string; bn: string; color: string }> = {
  beginner: { en: 'Beginner', bn: 'বিগিনার', color: 'text-emerald-300' },
  intermediate: { en: 'Intermediate', bn: 'ইন্টারমিডিয়েট', color: 'text-cyan-300' },
  advanced: { en: 'Advanced', bn: 'অ্যাডভান্সড', color: 'text-violet-300' },
  professional: { en: 'Professional', bn: 'প্রফেশনাল', color: 'text-amber-300' },
};

const STATUS_LABEL: Record<ScenarioProgressStatus, { en: string; bn: string; color: string }> = {
  completed: { en: 'Completed', bn: 'সম্পন্ন', color: 'text-emerald-300' },
  in_progress: { en: 'In Progress', bn: 'চলমান', color: 'text-cyan-300' },
  not_started: { en: 'Not Started', bn: 'শুরু হয়নি', color: 'text-slate-400' },
};

export function ScenarioUniverseExplorer({
  models,
  filteredModels,
  filters,
  health,
  onChangeFilters,
  onLaunchScenario,
}: ScenarioUniverseExplorerProps) {
  const { lang } = useLanguage();
  const allSkills = useMemo(() => getAllScenarioSkillTags(), []);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: models.length };
    for (const item of models) {
      map[item.scenario.category] = (map[item.scenario.category] ?? 0) + 1;
    }
    return map;
  }, [models]);

  const hasActiveFilter =
    filters.category !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.skill !== 'all' ||
    filters.duration !== 'all' ||
    filters.status !== 'all' ||
    filters.search.trim().length > 0;

  const resetFilters = () => {
    onChangeFilters({
      category: 'all',
      difficulty: 'all',
      skill: 'all',
      duration: 'all',
      status: 'all',
      search: '',
      sortBy: 'recommended',
    });
  };

  return (
    <section id="scenario-universe" className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            {lang === 'bn' ? 'সিনারিও ইউনিভার্স (Scenario Universe)' : 'Scenario Universe'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {lang === 'bn'
              ? '৬টি বাস্তব ক্যাটাগরিতে ৩০টি লক্ষ্যভিত্তিক যোগাযোগ সিমুলেশন — প্রতিটি সিনারিওতে স্পষ্ট মূল্যায়ন মানদণ্ড রয়েছে।'
              : '30 structured communication simulations across 6 real-world categories with explicit measurable criteria.'}
          </p>
        </div>

        <div className="text-xs text-slate-400">
          {health === null ? (
            <span>{lang === 'bn' ? 'সিমুলেশন সার্ভিস যাচাই হচ্ছে...' : 'Checking live simulation availability...'}</span>
          ) : health.aiConfigured ? (
            <span className="font-medium text-cyan-300">
              {lang === 'bn'
                ? 'লাইভ AI সিমুলেশন সংযুক্ত · টেক্সট ও ভয়েস সমর্থিত'
                : 'Live AI simulation connected · Text & Voice supported'}
            </span>
          ) : (
            <span className="font-medium text-amber-300">
              {lang === 'bn'
                ? 'লাইভ AI কনফিগার করা নেই — সার্ভার API কী যুক্ত করলে লাইভ সিমুলেশন সক্রিয় হবে'
                : 'Live AI service not configured on server — configure GEMINI_API_KEY to enable live AI responses'}
            </span>
          )}
        </div>
      </div>

      {/* Category Segmented Tabs (functional filter buttons) */}
      <div
        role="tablist"
        aria-label={lang === 'bn' ? 'সিনারিও ক্যাটাগরি ফিল্টার' : 'Scenario category filter'}
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={filters.category === 'all'}
          onClick={() => onChangeFilters({ ...filters, category: 'all' })}
          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
            filters.category === 'all'
              ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200'
              : 'border-slate-800 bg-[#080F2D] text-slate-300 hover:border-slate-600'
          }`}
        >
          {lang === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}{' '}
          <span className="ml-1 font-mono text-xs opacity-75 tabular-nums">
            ({categoryCounts.all})
          </span>
        </button>

        {TRANSFER_CATEGORIES.map((cat) => {
          const active = filters.category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() =>
                onChangeFilters({
                  ...filters,
                  category: cat.id as TransferScenarioCategory,
                })
              }
              className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                active
                  ? 'border-cyan-400/70 bg-cyan-500/15 text-white'
                  : 'border-slate-800 bg-[#080F2D] text-slate-300 hover:border-slate-600'
              }`}
            >
              {lang === 'bn' ? cat.labelBn : cat.labelEn}{' '}
              <span className="ml-1 font-mono text-xs opacity-75 tabular-nums">
                ({categoryCounts[cat.id] ?? 0})
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Multi-Dimensional Filters */}
      <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/90 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <label htmlFor="transfer-scenario-search" className="sr-only">
              {lang === 'bn' ? 'সিনারিও খুঁজুন' : 'Search scenarios'}
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="transfer-scenario-search"
              type="search"
              value={filters.search}
              onChange={(e) => onChangeFilters({ ...filters, search: e.target.value })}
              placeholder={
                lang === 'bn'
                  ? 'সিনারিও, ভূমিকা বা দক্ষতা খুঁজুন...'
                  : 'Search scenario, role, or skill...'
              }
              className="w-full rounded-xl border border-slate-700/80 bg-[#050A22] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="transfer-filter-difficulty" className="sr-only">
              {lang === 'bn' ? 'কঠিনতার স্তর' : 'Difficulty'}
            </label>
            <select
              id="transfer-filter-difficulty"
              value={filters.difficulty}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  difficulty: e.target.value as TransferDifficultyLevel | 'all',
                })
              }
              className="w-full rounded-xl border border-slate-700/80 bg-[#050A22] px-3 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">{lang === 'bn' ? 'সব স্তর' : 'All Difficulties'}</option>
              <option value="beginner">{lang === 'bn' ? 'বিগিনার' : 'Beginner'}</option>
              <option value="intermediate">{lang === 'bn' ? 'ইন্টারমিডিয়েট' : 'Intermediate'}</option>
              <option value="advanced">{lang === 'bn' ? 'অ্যাডভান্সড' : 'Advanced'}</option>
              <option value="professional">{lang === 'bn' ? 'প্রফেশনাল' : 'Professional'}</option>
            </select>
          </div>

          <div>
            <label htmlFor="transfer-filter-skill" className="sr-only">
              {lang === 'bn' ? 'লক্ষ্য দক্ষতা' : 'Target skill'}
            </label>
            <select
              id="transfer-filter-skill"
              value={filters.skill}
              onChange={(e) => onChangeFilters({ ...filters, skill: e.target.value })}
              className="w-full rounded-xl border border-slate-700/80 bg-[#050A22] px-3 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">{lang === 'bn' ? 'সব দক্ষতা' : 'All Target Skills'}</option>
              {allSkills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="transfer-filter-duration" className="sr-only">
              {lang === 'bn' ? 'সময়কাল' : 'Duration'}
            </label>
            <select
              id="transfer-filter-duration"
              value={filters.duration}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  duration: e.target.value as ScenarioDurationFilter,
                })
              }
              className="w-full rounded-xl border border-slate-700/80 bg-[#050A22] px-3 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">{lang === 'bn' ? 'সব সময়কাল' : 'Any Duration'}</option>
              <option value="short">{lang === 'bn' ? 'সংক্ষিপ্ত (≤৫ মিনিট)' : 'Short (≤5 min)'}</option>
              <option value="medium">{lang === 'bn' ? 'মাঝারি (৬–৭ মিনিট)' : 'Medium (6–7 min)'}</option>
              <option value="extended">{lang === 'bn' ? 'দীর্ঘ (৮+ মিনিট)' : 'Extended (8+ min)'}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="transfer-filter-status" className="sr-only">
                {lang === 'bn' ? 'অগ্রগতির অবস্থা' : 'Progress status'}
              </label>
              <select
                id="transfer-filter-status"
                value={filters.status}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    status: e.target.value as ScenarioProgressStatus | 'all',
                  })
                }
                className="w-full rounded-xl border border-slate-700/80 bg-[#050A22] px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none sm:text-sm"
              >
                <option value="all">{lang === 'bn' ? 'সব অবস্থা' : 'All Status'}</option>
                <option value="not_started">{lang === 'bn' ? 'শুরু হয়নি' : 'Not Started'}</option>
                <option value="in_progress">{lang === 'bn' ? 'চলমান' : 'In Progress'}</option>
                <option value="completed">{lang === 'bn' ? 'সম্পন্ন' : 'Completed'}</option>
              </select>
            </div>

            <div>
              <label htmlFor="transfer-filter-sort" className="sr-only">
                {lang === 'bn' ? 'সাজানোর ক্রম' : 'Sort scenarios'}
              </label>
              <select
                id="transfer-filter-sort"
                value={filters.sortBy}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    sortBy: e.target.value as ScenarioSortOption,
                  })
                }
                className="w-full rounded-xl border border-slate-700/80 bg-[#050A22] px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none sm:text-sm"
              >
                <option value="recommended">{lang === 'bn' ? 'প্রস্তাবিত' : 'Recommended'}</option>
                <option value="difficulty_asc">{lang === 'bn' ? 'স্তর অনুযায়ী' : 'Difficulty'}</option>
                <option value="duration_asc">{lang === 'bn' ? 'সময় অনুযায়ী' : 'Shortest'}</option>
                <option value="title_asc">{lang === 'bn' ? 'নাম (A-Z)' : 'Title (A–Z)'}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-cyan-400" />
            <span className="tabular-nums">
              {lang === 'bn'
                ? `${models.length}টি সিনারিওর মধ্যে ${filteredModels.length}টি দেখানো হচ্ছে`
                : `Showing ${filteredModels.length} of ${models.length} scenarios`}
            </span>
          </div>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-medium text-cyan-300 hover:text-cyan-200"
            >
              <X className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'সব ফিল্টার রিসেট করুন' : 'Reset filters'}
            </button>
          )}
        </div>
      </div>

      {/* Scenario Grid */}
      {filteredModels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#070E2A] p-8 text-center">
          <p className="text-sm font-medium text-slate-200">
            {lang === 'bn'
              ? 'আপনার নির্বাচিত ফিল্টারের সাথে কোনো সিনারিও মেলেনি।'
              : 'No scenarios match your current filters.'}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-slate-700"
          >
            {lang === 'bn' ? 'ফিল্টার পরিষ্কার করুন' : 'Clear all filters'}
          </button>
        </div>
      ) : (
        <div
          data-testid="scenario-universe-grid"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {filteredModels.map((item) => {
            const sc = item.scenario;
            const catMeta = TRANSFER_CATEGORIES.find((c) => c.id === sc.category);
            const diffMeta = DIFFICULTY_LABEL[sc.difficulty];
            const statusMeta = STATUS_LABEL[item.status];

            return (
              <article
                key={sc.id}
                className={`group flex flex-col justify-between rounded-2xl border p-5 transition ${
                  item.status === 'in_progress'
                    ? 'border-cyan-400/55 bg-[#091538]'
                    : item.isPersonalizedMatch
                      ? 'border-blue-500/35 bg-[#081031] hover:border-cyan-400/50'
                      : 'border-slate-800/90 bg-[#080F2C]/90 hover:border-slate-600'
                }`}
              >
                <div className="space-y-3">
                  {/* Unboxed clean metadata line (zero pill clutter) */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold" style={{ color: catMeta?.accentHex ?? '#38BDF8' }}>
                      {catMeta ? (lang === 'bn' ? catMeta.labelBn : catMeta.labelEn) : sc.category}
                    </span>
                    <span className={`font-semibold ${statusMeta.color}`}>
                      {item.status === 'completed' && item.bestScore !== null
                        ? `${lang === 'bn' ? statusMeta.bn : statusMeta.en} · ${item.bestScore}%`
                        : lang === 'bn'
                          ? statusMeta.bn
                          : statusMeta.en}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-200">
                      {lang === 'bn' ? sc.titleBn : sc.titleEn}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-300">
                      {lang === 'bn' ? sc.descriptionBn : sc.descriptionEn}
                    </p>
                  </div>

                  {/* Key metadata row */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 tabular-nums">
                    <span className={`font-medium ${diffMeta.color}`}>
                      {lang === 'bn' ? diffMeta.bn : diffMeta.en}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {sc.estimatedMinutes} {lang === 'bn' ? 'মিনিট' : 'min'}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>
                      {sc.objectives.length} {lang === 'bn' ? 'টি লক্ষ্য' : 'objectives'}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>{lang === 'bn' ? 'টেক্সট · ভয়েস' : 'Text · Voice'}</span>
                  </div>

                  {/* Role & Required Task */}
                  <div className="rounded-xl border border-slate-800/80 bg-[#050B22]/80 p-3 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <span className="truncate">
                        <strong className="text-slate-200">{sc.aiParticipantName}</strong> (
                        {lang === 'bn' ? sc.aiParticipantRoleBn : sc.aiParticipantRoleEn})
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-slate-300">
                      <span className="font-semibold text-slate-200">
                        {lang === 'bn' ? 'টাস্ক: ' : 'Task: '}
                      </span>
                      {lang === 'bn' ? sc.requiredTaskBn : sc.requiredTaskEn}
                    </p>
                  </div>

                  {/* Target Skills (unboxed typographic list) */}
                  <p className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">
                      {lang === 'bn' ? 'দক্ষতা: ' : 'Skills: '}
                    </span>
                    {sc.targetSkills.join(' · ')}
                  </p>

                  {item.isPersonalizedMatch && item.adaptationReasonEn && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-cyan-300">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      {lang === 'bn' ? item.adaptationReasonBn : item.adaptationReasonEn}
                    </p>
                  )}
                </div>

                {/* Action Footer */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3.5">
                  <span className="text-[11px] text-slate-500">
                    {item.attemptCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-300/90 tabular-nums">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {item.attemptCount}{' '}
                        {lang === 'bn'
                          ? 'বার সম্পন্ন'
                          : `attempt${item.attemptCount === 1 ? '' : 's'}`}
                      </span>
                    ) : (
                      <span>
                        {lang === 'bn' ? `আপনার ভূমিকা: ${sc.learnerRoleBn}` : `Role: ${sc.learnerRoleEn}`}
                      </span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => onLaunchScenario(sc.id)}
                    aria-label={`${item.status === 'in_progress' ? 'Resume' : 'Enter'} ${sc.titleEn}`}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      item.status === 'in_progress'
                        ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                        : 'bg-blue-600/90 text-white hover:bg-blue-500'
                    }`}
                  >
                    {item.status === 'in_progress' ? (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        {lang === 'bn' ? 'চালিয়ে যান' : 'Resume'}
                      </>
                    ) : (
                      <>
                        {lang === 'bn' ? 'শুরু করুন' : 'Enter Room'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
