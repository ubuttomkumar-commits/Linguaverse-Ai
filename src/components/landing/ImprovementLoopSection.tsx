import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export function ImprovementLoopSection() {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStep = t.loopSection.steps[activeIndex];

  return (
    <section
      id="how-it-works"
      className="border-t border-slate-800/80 bg-[#0A0F1C] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold text-[#3B82F6]">{t.loopSection.kicker}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
            {t.loopSection.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            {t.loopSection.subtitle}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Interactive 8-Step List */}
          <div
            role="tablist"
            aria-label={t.loopSection.title}
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:col-span-7"
          >
            {t.loopSection.steps.map((step, index) => {
              const isSelected = index === activeIndex;
              return (
                <button
                  key={step.num}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveIndex(index)}
                  className={`flex flex-col rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#3B82F6] bg-[#111827] text-white'
                      : 'border-slate-800 bg-[#111827]/50 text-slate-300 hover:border-slate-700 hover:bg-[#111827]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums ${
                        isSelected ? 'text-[#3B82F6]' : 'text-slate-500'
                      }`}
                    >
                      {step.num}
                    </span>
                    {isSelected && (
                      <ArrowRight className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
                    )}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{step.shortDesc}</p>
                </button>
              );
            })}
          </div>

          {/* Focused Mechanism & Outcome Panel */}
          <div
            role="tabpanel"
            className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8 lg:col-span-5"
          >
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="font-mono font-semibold text-[#8B5CF6] tabular-nums">
                Step {activeStep.num} / 08
              </span>
              <span aria-hidden="true">·</span>
              <span>{t.loopSection.selectPrompt}</span>
            </div>

            <h3 className="mt-4 text-xl font-bold text-white sm:text-2xl">{activeStep.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              {activeStep.detail}
            </p>

            <div className="mt-6 border-t border-slate-800 pt-5">
              <p className="text-xs font-semibold text-[#F59E0B]">Measurable Outcome</p>
              <p className="mt-1.5 text-sm font-medium text-slate-100">{activeStep.outcome}</p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev === 0 ? t.loopSection.steps.length - 1 : prev - 1))
                }
                className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Prev step
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev === t.loopSection.steps.length - 1 ? 0 : prev + 1))
                }
                className="text-xs font-semibold text-[#3B82F6] hover:text-blue-400 transition-colors cursor-pointer"
              >
                Next step →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
