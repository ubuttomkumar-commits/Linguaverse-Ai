import { useEffect, useState } from 'react';
import { ArrowRight, Volume2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { HERO_SCENARIOS, LANDING_COPY } from '../../domain/landingContent';
import { AcousticCore3D } from './AcousticCore3D';
import { TiltSpotlightCard } from './TiltSpotlightCard';
import { speakEnglishExample, stopSpeaking, type PlaybackSpeed } from '../../utils/speechSynthesis';

export function HeroSamplePreview() {
  const { lang } = useLanguage();
  const copy = LANDING_COPY[lang].hero;
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [pulseKey, setPulseKey] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeed, setActiveSpeed] = useState<PlaybackSpeed | null>(null);

  const scenario = HERO_SCENARIOS[scenarioIdx];

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const handleSelectScenario = (index: number) => {
    stopSpeaking();
    setIsSpeaking(false);
    setActiveSpeed(null);
    setScenarioIdx(index);
    setPulseKey((k) => k + 1);
  };

  const handlePlayAudio = (speed: PlaybackSpeed) => {
    setPulseKey((k) => k + 1);
    setIsSpeaking(true);
    setActiveSpeed(speed);
    const started = speakEnglishExample({
      text: scenario.fullNatural,
      rate: speed,
      onEnd: () => {
        setIsSpeaking(false);
        setActiveSpeed(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setActiveSpeed(null);
      },
    });
    if (!started) {
      setIsSpeaking(false);
      setActiveSpeed(null);
    }
  };

  const dnaItems = [
    { label: copy.dnaAxes.accuracy, value: scenario.dnaPreview.accuracy, color: 'bg-[#3B82F6]' },
    { label: copy.dnaAxes.naturalness, value: scenario.dnaPreview.naturalness, color: 'bg-[#7C3AED]' },
    { label: copy.dnaAxes.clarity, value: scenario.dnaPreview.clarity, color: 'bg-[#F59E0B]' },
  ];

  return (
    <TiltSpotlightCard
      as="div"
      maxTilt={3}
      className="rounded-2xl border border-white/[0.09] bg-[#0E1526]/92 p-5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      {/* Top Row: Integrated 3D Acoustic Core + Communication DNA Live Mini-Dashboard */}
      <div className="flex flex-col items-center gap-4 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center sm:gap-5">
        <AcousticCore3D pulseKey={pulseKey} isSpeaking={isSpeaking} compact />

        <div className="min-w-0 flex-1 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[#F59E0B]">{copy.samplePreviewTag}</p>
            <span className="text-[11px] font-medium text-slate-400">
              {lang === 'bn' ? scenario.contextBn : scenario.contextEn}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{copy.sampleSubtitle}</p>

          {/* Mini Communication DNA Skill Bars */}
          <div className="mt-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200">{copy.dnaMiniTitle}</span>
              <span className="text-slate-400">{copy.dnaSampleCaption}</span>
            </div>
            <div className="space-y-1.5">
              {dnaItems.map((bar) => (
                <div key={bar.label} className="grid grid-cols-12 items-center gap-2 text-[11px]">
                  <span className="col-span-5 truncate text-slate-400">{bar.label}</span>
                  <div className="col-span-5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${bar.color} transition-[width] duration-500 ease-out`}
                      style={{ width: `${bar.value}%` }}
                    />
                  </div>
                  <span className="col-span-2 text-right font-mono font-semibold text-slate-200 tabular-nums">
                    {bar.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Real Scenarios Switcher */}
      <div
        role="tablist"
        aria-label="Real speaking scenarios"
        className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.07] bg-[#050914] p-1"
      >
        {HERO_SCENARIOS.map((item, idx) => {
          const active = idx === scenarioIdx;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelectScenario(idx)}
              className={`min-h-[38px] rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
                active
                  ? 'bg-[#3B82F6] text-white shadow-[0_0_16px_rgba(59,130,246,0.35)]'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {lang === 'bn' ? item.tabBn : item.tabEn}
            </button>
          );
        })}
      </div>

      {/* Scenario Transformation Display */}
      <div key={scenario.id} className="mt-3.5 space-y-3">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Prompt: </span>“
          {lang === 'bn' ? scenario.promptQuestionBn : scenario.promptQuestionEn}”
        </p>

        {/* Before -> After Side by Side */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-500/25 bg-[#050914]/90 p-3.5">
            <p className="text-[11px] font-medium text-rose-300">{copy.heardLabel}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              {scenario.brokenBefore}
              <span className="rounded bg-rose-500/15 px-1 text-rose-200 underline decoration-rose-400/80 decoration-wavy underline-offset-4">
                {scenario.brokenHighlight}
              </span>
              {scenario.brokenAfter}
            </p>
          </div>

          <div className="rounded-xl border border-[#3B82F6]/35 bg-[#050914]/90 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-[#3B82F6]">{copy.naturalLabel}</p>
              <span className="truncate text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? scenario.categoryBn : scenario.categoryEn}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-emerald-300">
              {scenario.naturalBefore}
              <span className="rounded bg-emerald-500/15 px-1 text-emerald-200">
                {scenario.naturalHighlight}
              </span>
              {scenario.naturalAfter}
            </p>
          </div>
        </div>

        {/* Bangla Grammar Explanation + Slow Audio Controls */}
        <div className="rounded-xl border border-white/[0.07] bg-[#050914]/75 p-3.5 space-y-2">
          <p className="font-bn text-xs sm:text-[13px] leading-relaxed text-slate-200">
            <span className="font-semibold text-[#A78BFA]">{copy.banglaExplainLabel}: </span>
            {scenario.explanationBn}
          </p>
          {lang === 'en' && (
            <p className="text-xs leading-relaxed text-slate-400">
              <span className="font-semibold text-slate-300">{copy.englishExplainLabel}: </span>
              {scenario.explanationEn}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handlePlayAudio(0.75)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSpeed === 0.75
                  ? 'border-[#3B82F6] bg-[#3B82F6]/20 text-white'
                  : 'border-white/10 bg-[#0E1526] text-slate-300 hover:border-[#3B82F6]/50 hover:text-white'
              }`}
            >
              <Volume2 className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />
              <span>{copy.listenSlow}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePlayAudio(1.0)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSpeed === 1.0
                  ? 'border-[#3B82F6] bg-[#3B82F6]/20 text-white'
                  : 'border-white/10 bg-[#0E1526] text-slate-300 hover:border-[#3B82F6]/50 hover:text-white'
              }`}
            >
              <Volume2 className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
              <span>{copy.listenNormal}</span>
            </button>
            <a
              href="#live-demo"
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#3B82F6] hover:text-blue-300 transition-colors whitespace-nowrap"
            >
              <span>{lang === 'bn' ? 'নিজের বাক্য পরীক্ষা করুন' : 'Test your own sentence'}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </TiltSpotlightCard>
  );
}
