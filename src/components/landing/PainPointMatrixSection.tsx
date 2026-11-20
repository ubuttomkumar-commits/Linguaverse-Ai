import { useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANDING_COPY } from '../../domain/landingContent';
import { RevealBlock, TiltSpotlightCard } from './TiltSpotlightCard';

export function PainPointMatrixSection() {
  const { lang } = useLanguage();
  const copy = LANDING_COPY[lang].painMatrix;
  const [focusedId, setFocusedId] = useState<string>(copy.items[0].id);

  return (
    <section
      id="why-it-works"
      className="border-t border-white/[0.06] bg-[#080E1D] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealBlock className="max-w-3xl">
          <p className="text-xs font-semibold text-[#F59E0B]">{copy.kicker}</p>
          <h2 className="font-display mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
            {copy.title}
          </h2>
          <p className="mt-3.5 text-base leading-relaxed text-slate-400">
            {copy.subtitle}
          </p>
        </RevealBlock>

        <div className="mt-12 space-y-5">
          {copy.items.map((item, idx) => {
            const isSelected = focusedId === item.id;
            return (
              <RevealBlock key={item.id} delayMs={idx * 70}>
                <TiltSpotlightCard
                  as="article"
                  maxTilt={2.5}
                  className={`rounded-2xl border transition-colors ${
                    isSelected
                      ? 'border-[#3B82F6]/45 bg-[#0E1526]'
                      : 'border-white/[0.08] bg-[#0E1526]/75 hover:border-white/[0.16]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setFocusedId(item.id)}
                    aria-expanded={isSelected}
                    className="w-full p-6 text-left sm:p-7 cursor-pointer"
                  >
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
                      {/* Index */}
                      <div className="flex items-center justify-between lg:col-span-1 lg:block">
                        <span className="font-mono text-sm font-semibold text-slate-500 tabular-nums">
                          {item.num}
                        </span>
                        <span className="text-xs font-medium text-[#3B82F6] lg:hidden">
                          {isSelected
                            ? lang === 'bn'
                              ? 'বিস্তারিত খোলা'
                              : 'Focused'
                            : lang === 'bn'
                              ? 'দেখুন'
                              : 'Inspect'}
                        </span>
                      </div>

                      {/* Before: Struggle */}
                      <div className="lg:col-span-5 lg:pr-4">
                        <p className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{copy.beforeLabel}</span>
                        </p>
                        <h3 className="font-display mt-2 text-lg font-semibold leading-snug text-slate-100">
                          {item.struggleQuote}
                        </h3>
                        <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                          {item.struggleDetail}
                        </p>
                      </div>

                      {/* Arrow divider on desktop */}
                      <div className="hidden lg:col-span-1 lg:flex lg:items-center lg:justify-center lg:pt-8">
                        <ArrowRight
                          className={`h-5 w-5 transition-colors ${
                            isSelected ? 'text-[#3B82F6]' : 'text-slate-600'
                          }`}
                          aria-hidden="true"
                        />
                      </div>

                      {/* After: Solution */}
                      <div className="border-t border-white/[0.07] pt-5 lg:col-span-5 lg:border-t-0 lg:border-l lg:border-white/[0.07] lg:pl-6 lg:pt-0">
                        <p className="flex items-center gap-2 text-xs font-semibold text-[#3B82F6]">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{copy.afterLabel}</span>
                        </p>
                        <h3 className="font-display mt-2 text-lg font-bold leading-snug text-white">
                          {item.solutionTitle}
                        </h3>
                        <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                          {item.solutionDetail}
                        </p>
                        <p className="mt-3 text-xs font-medium text-[#F59E0B]">
                          {item.proofPoint}
                        </p>
                      </div>
                    </div>
                  </button>
                </TiltSpotlightCard>
              </RevealBlock>
            );
          })}
        </div>
      </div>
    </section>
  );
}
