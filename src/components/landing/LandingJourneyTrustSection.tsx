import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Database, Lock, MicOff, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  SUPPLIED_LANDING_COPY,
  resolveLandingRoutes,
} from '../../domain/suppliedLandingCopy';
import { RevealSection } from './RevealSection';

const PRIVACY_ICONS = [Database, MicOff, Lock, ShieldCheck];

export function LandingJourneyTrustSection() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { banglaAdvantage, journey, privacy } = SUPPLIED_LANDING_COPY[lang];
  const routes = resolveLandingRoutes(user, profile);

  const [bridgeId, setBridgeId] = useState(banglaAdvantage.levels[0].id);
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const activeBridge =
    banglaAdvantage.levels.find((lvl) => lvl.id === bridgeId) ??
    banglaAdvantage.levels[0];
  const activeStage = journey.stages[activeStageIdx] ?? journey.stages[0];

  return (
    <>
      {/* SECTION H — BANGLA-FIRST ADVANTAGE (Interactive Bilingual Bridge Preview) */}
      <section
        id="bangla-first"
        className="border-t border-[#b0c8ff]/[0.08] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <p className="text-[13px] font-semibold text-[#6da5ff]">
                  {banglaAdvantage.kicker}
                </p>
                <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.16] tracking-[-0.03em] text-[#f3f6ff] sm:text-[40px] text-balance">
                  {banglaAdvantage.title}
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
                  {banglaAdvantage.lead}
                </p>

                <div className="mt-7">
                  <p className="text-[12px] font-semibold text-[#91a3c4]">
                    {banglaAdvantage.modeHeading}
                  </p>
                  <div
                    role="tablist"
                    aria-label={banglaAdvantage.modeHeading}
                    className="mt-2.5 flex flex-wrap gap-2"
                  >
                    {banglaAdvantage.levels.map((lvl) => {
                      const isSelected = lvl.id === activeBridge.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => setBridgeId(lvl.id)}
                          className={`min-h-[40px] cursor-pointer rounded-[10px] border px-3.5 py-2 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                            isSelected
                              ? 'border-[#4f8bff] bg-[#152546] text-white'
                              : 'border-[#b0c8ff]/[0.16] bg-[#0d1528] text-[#b5c4e0] hover:border-[#6ca4ff]/50 hover:text-white'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Live Bilingual Preview Card */}
              <div
                aria-live="polite"
                className="rounded-[22px] border border-[#b0c8ff]/[0.14] bg-[#0d1528] p-6 sm:p-8 lg:col-span-7"
              >
                <p className="text-[12px] font-semibold text-[#38bdf8]">
                  {banglaAdvantage.exampleLabel}
                  <span aria-hidden="true" className="mx-2 text-[#56698e]">
                    ·
                  </span>
                  <span className="text-[#c9d7f2]">{activeBridge.label}</span>
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 border-b border-[#b0c8ff]/[0.12] pb-6 sm:grid-cols-2">
                  <div>
                    <p className="text-[12px] text-[#91a3c4]">Common pattern</p>
                    <p className="mt-1.5 text-[17px] font-semibold text-[#dce5f7]">
                      {banglaAdvantage.mistakeSentence}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#34d399]">Natural English</p>
                    <p className="mt-1.5 text-[17px] font-bold text-[#c6fae4]">
                      {banglaAdvantage.correctedSentence}
                    </p>
                  </div>
                </div>

                <p className="font-bn mt-6 text-[15px] leading-[1.75] text-[#eef3ff]">
                  {activeBridge.explanation}
                </p>

                <div className="mt-6 border-t border-[#b0c8ff]/[0.1] pt-4 text-[14px]">
                  <span className="font-semibold text-[#38bdf8]">
                    {banglaAdvantage.cueLabel}:
                  </span>{' '}
                  <span className="font-bn text-[#c6fae4]">{activeBridge.memoryCue}</span>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* SECTION I — PERSONALIZED LEARNING JOURNEY (5-Stage Interactive Progression) */}
      <section
        id="how"
        className="border-t border-[#b0c8ff]/[0.08] bg-[#080f20] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="max-w-2xl">
              <p className="text-[13px] font-semibold text-[#6da5ff]">
                {journey.kicker}
              </p>
              <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
                {journey.title}
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
                {journey.lead}
              </p>
            </div>

            {/* Interactive 5-Stage Progression Track */}
            <ol
              aria-label={journey.kicker}
              className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              {journey.stages.map((stage, idx) => {
                const isActive = idx === activeStageIdx;
                const isCompletedOrCurrent = idx <= activeStageIdx;
                return (
                  <li key={stage.step}>
                    <button
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveStageIdx(idx)}
                      className={`flex h-full w-full cursor-pointer flex-col rounded-[16px] border p-5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8bff] ${
                        isActive
                          ? 'border-[#4f8bff]/70 bg-[#121f3d]'
                          : 'border-[#b0c8ff]/[0.12] bg-[#0d1528] hover:border-[#6ca4ff]/45'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono tabular-nums text-[13px] font-bold ${
                            isCompletedOrCurrent ? 'text-[#38bdf8]' : 'text-[#6c7fa3]'
                          }`}
                        >
                          {stage.step}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`h-[2px] flex-1 rounded-full transition-colors ${
                            isCompletedOrCurrent ? 'bg-[#4f8bff]' : 'bg-[#b0c8ff]/[0.14]'
                          }`}
                        />
                      </div>
                      <h3 className="mt-4 text-[16px] font-bold text-[#f3f6ff]">
                        {stage.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#a8b6d1]">
                        {stage.shortSummary}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* Active Stage Breakdown */}
            <div
              aria-live="polite"
              className="mt-6 grid grid-cols-1 gap-6 rounded-[18px] border border-[#b0c8ff]/[0.14] bg-[#0d1528] p-6 md:grid-cols-2"
            >
              <div>
                <p className="text-[12px] font-semibold text-[#6da5ff]">
                  {journey.insideAppLabel}
                  <span aria-hidden="true" className="mx-1.5 text-[#56698e]">
                    ·
                  </span>
                  <span className="text-[#f3f6ff]">
                    {activeStage.step} {activeStage.title}
                  </span>
                </p>
                <p className="mt-2 text-[16px] font-semibold text-[#f3f6ff]">
                  {activeStage.platformMapping}
                </p>
              </div>
              <div className="border-t border-[#b0c8ff]/[0.1] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <p className="text-[12px] font-semibold text-[#34d399]">
                  {journey.outcomeLabel}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#dce5f7]">
                  {activeStage.learnerOutcome}
                </p>
              </div>
            </div>

            <p className="mt-4 text-[13px] text-[#8d9fbe]">{journey.disclaimer}</p>
          </RevealSection>
        </div>
      </section>

      {/* SECTION J — TRUST & PRIVACY */}
      <section
        id="privacy"
        className="border-t border-[#b0c8ff]/[0.08] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[13px] font-semibold text-[#6da5ff]">
                  {privacy.kicker}
                </p>
                <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
                  {privacy.title}
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
                  {privacy.lead}
                </p>
              </div>

              <Link
                to={routes.settingsRoute}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 self-start rounded-[10px] border border-[#b0c8ff]/[0.18] bg-[#0d1528] px-5 py-2.5 text-[13px] font-semibold text-[#f3f6ff] transition-colors hover:border-[#4f8bff]/60 hover:text-white lg:self-auto whitespace-nowrap"
              >
                <span>
                  {routes.isSignedIn ? privacy.settingsCta : privacy.settingsCtaSignedOut}
                </span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {privacy.pillars.map((pillar, idx) => {
                const Icon = PRIVACY_ICONS[idx % PRIVACY_ICONS.length];
                return (
                  <article
                    key={pillar.id}
                    className="flex flex-col justify-between rounded-[18px] border border-[#b0c8ff]/[0.12] bg-[#0d1528] p-6"
                  >
                    <div>
                      <Icon className="h-5 w-5 text-[#38bdf8]" aria-hidden="true" />
                      <h3 className="mt-4 text-[16px] font-bold text-[#f3f6ff]">
                        {pillar.title}
                      </h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-[#a8b6d1]">
                        {pillar.detail}
                      </p>
                    </div>
                    <p className="mt-5 border-t border-[#b0c8ff]/[0.1] pt-3.5 text-[12px] leading-relaxed text-[#8ec9b8]">
                      {pillar.verificationNote}
                    </p>
                  </article>
                );
              })}
            </div>
          </RevealSection>
        </div>
      </section>
    </>
  );
}
