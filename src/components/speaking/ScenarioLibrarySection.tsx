import { useMemo, useState } from 'react';
import { ArrowRight, Mic, RotateCcw, Search } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  SPEAKING_SCENARIOS,
  type SpeakingDifficultyBand,
  type SpeakingScenario,
} from '../../domain/speakingScenarios';
import { filterSpeakingScenarios } from '../../domain/speakingStudioEngine';
import type { SpeakingModeId, SpeakingScenarioCategory } from '../../types/domain';

interface ScenarioLibrarySectionProps {
  selectedMode: SpeakingModeId;
  onSelectScenario: (modeId: SpeakingModeId) => void;
  onLaunchScenario: (modeId: SpeakingModeId) => void;
}

const CATEGORIES: Array<{ id: 'all' | SpeakingScenarioCategory; en: string; bn: string }> = [
  { id: 'all', en: 'All Scenarios', bn: 'সব দৃশ্যপট' },
  { id: 'everyday', en: 'Everyday', bn: 'দৈনন্দিন' },
  { id: 'professional', en: 'Professional', bn: 'পেশাদার' },
  { id: 'academic', en: 'Academic', bn: 'একাডেমিক' },
  { id: 'travel', en: 'Travel', bn: 'ভ্রমণ' },
];

const DIFFICULTIES: Array<{ id: 'all' | SpeakingDifficultyBand; en: string; bn: string }> = [
  { id: 'all', en: 'All Levels', bn: 'সব স্তর' },
  { id: 'beginner', en: 'Foundation', bn: 'প্রাথমিক' },
  { id: 'intermediate', en: 'Intermediate', bn: 'মধ্যম' },
  { id: 'advanced', en: 'Advanced', bn: 'উচ্চতর' },
];

function categoryLabel(cat: SpeakingScenarioCategory, lang: 'en' | 'bn'): string {
  const found = CATEGORIES.find((c) => c.id === cat);
  return found ? (lang === 'bn' ? found.bn : found.en) : cat;
}

export function ScenarioLibrarySection({
  selectedMode,
  onSelectScenario,
  onLaunchScenario,
}: ScenarioLibrarySectionProps) {
  const { lang } = useLanguage();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | SpeakingScenarioCategory>('all');
  const [difficulty, setDifficulty] = useState<'all' | SpeakingDifficultyBand>('all');

  const filtered = useMemo(
    () => filterSpeakingScenarios(SPEAKING_SCENARIOS, { query, category, difficulty }),
    [query, category, difficulty]
  );

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
    setDifficulty('all');
  };

  return (
    <section
      id="speaking-scenario-library"
      aria-labelledby="scenario-library-heading"
      className="rounded-2xl border border-slate-800/90 bg-[#0B1230]/85 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-slate-800/90 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-[#22D3EE]">
            {lang === 'bn'
              ? `রোলপ্লে দৃশ্যপট লাইব্রেরি · ${SPEAKING_SCENARIOS.length}টি বাস্তব পরিস্থিতি`
              : `Roleplay Scenario Library · ${SPEAKING_SCENARIOS.length} Configured Scenarios`}
          </p>
          <h2 id="scenario-library-heading" className="mt-1 text-xl font-bold text-white">
            {lang === 'bn'
              ? 'বাস্তব জীবনের কথোপকথন বেছে নিন'
              : 'Choose a Real-World Conversation Scenario'}
          </h2>
        </div>

        {/* Search input */}
        <div className="relative w-full lg:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={lang === 'bn' ? 'দৃশ্যপট খুঁজুন' : 'Search speaking scenarios'}
            placeholder={lang === 'bn' ? 'দৃশ্যপট, ভূমিকা বা শব্দ খুঁজুন...' : 'Search scenarios, roles, vocabulary...'}
            className="w-full rounded-lg border border-slate-700/90 bg-[#070B1B] py-2 pr-3 pl-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none sm:text-sm"
          />
        </div>
      </div>

      {/* Category & Difficulty filter controls */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label={lang === 'bn' ? 'ক্যাটাগরি ফিল্টার' : 'Scenario categories'}
          className="flex flex-wrap items-center gap-1.5"
        >
          {CATEGORIES.map((item) => {
            const active = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-[#070B1B] text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {lang === 'bn' ? item.bn : item.en}
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label={lang === 'bn' ? 'কঠিনতা ফিল্টার' : 'Scenario difficulty'}
          className="flex flex-wrap items-center gap-1.5"
        >
          {DIFFICULTIES.map((item) => {
            const active = difficulty === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setDifficulty(item.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-[#22D3EE]/70 bg-[#22D3EE]/15 text-[#22D3EE]'
                    : 'border-slate-800 bg-[#070B1B] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {lang === 'bn' ? item.bn : item.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Cards Grid */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-800 bg-[#070B1B] p-6 text-center">
          <p className="text-sm font-semibold text-white">
            {lang === 'bn' ? 'কোনো দৃশ্যপট পাওয়া যায়নি' : 'No matching scenarios found'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn'
              ? 'অনুগ্রহ করে ফিল্টার পরিবর্তন করুন বা সব দৃশ্যপট দেখুন।'
              : 'Try clearing your search term or resetting the category filter.'}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0B1230] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-[#22D3EE] hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}</span>
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((item: SpeakingScenario) => {
            const isSelected = selectedMode === item.id;
            return (
              <article
                key={item.id}
                className={`group flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 ${
                  isSelected
                    ? 'border-[#22D3EE]/70 bg-[#070B1B] shadow-lg shadow-[#22D3EE]/10'
                    : 'border-slate-800/90 bg-[#070B1B]/90 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Clean unboxed typographic metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span>
                      {categoryLabel(item.category, lang)} ·{' '}
                      <span className="font-mono tabular-nums">{item.cefrFit}</span> ·{' '}
                      <span className="font-mono tabular-nums">~{item.estimatedMinutes} min</span>
                    </span>
                    {isSelected && (
                      <span className="font-semibold text-[#22D3EE]">
                        {lang === 'bn' ? 'নির্বাচিত' : 'Selected'}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-base font-bold text-white">
                    {lang === 'bn' ? item.titleBn : item.titleEn}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {lang === 'bn' ? item.subtitleBn : item.subtitleEn}
                  </p>

                  <dl className="mt-3.5 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs">
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-medium text-slate-400">
                        {lang === 'bn' ? 'AI ভূমিকা:' : 'AI Role:'}
                      </dt>
                      <dd className="text-slate-200">
                        {lang === 'bn' ? item.aiPersonaBn : item.aiPersonaEn}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-medium text-slate-400">
                        {lang === 'bn' ? 'লক্ষ্য:' : 'Goal:'}
                      </dt>
                      <dd className="text-slate-300">
                        {lang === 'bn' ? item.communicationGoalBn : item.communicationGoalEn}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300">
                      {lang === 'bn' ? 'উপযোগী শব্দগুচ্ছ: ' : 'Key phrases: '}
                    </span>
                    {item.suggestedVocabulary.join(' · ')}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3.5">
                  <button
                    type="button"
                    onClick={() => onSelectScenario(item.id)}
                    className="text-xs font-medium text-slate-300 hover:text-[#22D3EE] transition-colors cursor-pointer"
                  >
                    {isSelected
                      ? lang === 'bn'
                        ? 'বর্তমান প্রেসার লেভেলের জন্য নির্বাচিত'
                        : 'Selected for setup'
                      : lang === 'bn'
                        ? 'নির্বাচন করুন'
                        : 'Select Scenario'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onLaunchScenario(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'শুরু করুন' : 'Practice Now'}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
