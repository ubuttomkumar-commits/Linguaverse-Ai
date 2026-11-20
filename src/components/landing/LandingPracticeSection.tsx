import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  GraduationCap,
  MessageSquare,
  Plane,
  Users,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  SUPPLIED_LANDING_COPY,
  resolveLandingRoutes,
} from '../../domain/suppliedLandingCopy';
import { RevealSection } from './RevealSection';

const WAVE_BARS = [
  { h: 'h-[12px]', d: '[animation-delay:0s]' },
  { h: 'h-[24px]', d: '[animation-delay:0.08s]' },
  { h: 'h-[34px]', d: '[animation-delay:0.16s]' },
  { h: 'h-[18px]', d: '[animation-delay:0.24s]' },
  { h: 'h-[40px]', d: '[animation-delay:0.32s]' },
  { h: 'h-[28px]', d: '[animation-delay:0.4s]' },
  { h: 'h-[16px]', d: '[animation-delay:0.48s]' },
  { h: 'h-[32px]', d: '[animation-delay:0.56s]' },
  { h: 'h-[22px]', d: '[animation-delay:0.64s]' },
  { h: 'h-[38px]', d: '[animation-delay:0.72s]' },
  { h: 'h-[18px]', d: '[animation-delay:0.8s]' },
  { h: 'h-[26px]', d: '[animation-delay:0.88s]' },
  { h: 'h-[14px]', d: '[animation-delay:0.96s]' },
];

const TRANSFER_ICONS = [
  Briefcase,
  Building2,
  Users,
  GraduationCap,
  MessageSquare,
  Plane,
];

export function LandingPracticeSection() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const { speaking, transfer } = SUPPLIED_LANDING_COPY[lang];
  const routes = resolveLandingRoutes(user, profile);

  const [activeSpeakingId, setActiveSpeakingId] = useState(speaking.scenarios[0].id);
  const [activeTransferId, setActiveTransferId] = useState(transfer.items[0].id);

  const currentSpeaking =
    speaking.scenarios.find((s) => s.id === activeSpeakingId) ?? speaking.scenarios[0];
  const currentTransfer =
    transfer.items.find((t) => t.id === activeTransferId) ?? transfer.items[0];

  return (
    <>
      {/* SECTION F — SPEAKING STUDIO INTERACTIVE PREVIEW */}
      <section
        id="speaking"
        className="border-t border-[#b0c8ff]/[0.08] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
              {/* Left Narrative + Scenario Tabs */}
              <div className="lg:col-span-5">
                <p className="text-[13px] font-semibold text-[#6da5ff]">
                  {speaking.kicker}
                </p>
                <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[40px] text-balance">
                  {speaking.title}
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
                  {speaking.lead}
                </p>

                {/* Functional Scenario Switcher Tabs */}
                <div
                  role="tablist"
                  aria-label={speaking.sessionHeader}
                  className="mt-7 flex flex-wrap gap-2"
                >
                  {speaking.scenarios.map((scenario) => {
                    const isSelected = scenario.id === currentSpeaking.id;
                    return (
                      <button
                        key={scenario.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setActiveSpeakingId(scenario.id)}
                        className={`min-h-[40px] cursor-pointer rounded-[10px] border px-3.5 py-2 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'border-[#4f8bff] bg-[#152546] text-white'
                            : 'border-[#b0c8ff]/[0.16] bg-[#0d1528] text-[#b5c4e0] hover:border-[#6ca4ff]/50 hover:text-white'
                        }`}
                      >
                        {scenario.tabLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Speaking Focus Signals */}
                <div className="mt-7 border-t border-[#b0c8ff]/[0.12] pt-6">
                  <p className="text-[12px] font-semibold text-[#91a3c4]">
                    {speaking.focusHeading}
                  </p>
                  <ul className="mt-3 space-y-3">
                    {currentSpeaking.focusDimensions.map((dim) => (
                      <li key={dim.label} className="text-[14px] leading-relaxed">
                        <span className="font-semibold text-[#e6eeff]">{dim.label}</span>
                        <span aria-hidden="true" className="mx-2 text-[#5c7096]">
                          ·
                        </span>
                        <span className="text-[#a8b6d1]">{dim.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    to={routes.speakingRoute}
                    className="lv-glow-cta inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[12px] px-6 py-3 text-[14px] font-bold text-[#060b18] active:scale-[0.99] whitespace-nowrap"
                  >
                    <span>
                      {routes.isSignedIn ? speaking.ctaSignedIn : speaking.cta}
                    </span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* Right Conversation Studio Preview Panel */}
              <div className="lv-glow-surface rounded-[22px] border border-[#38bdf8]/25 bg-gradient-to-b from-[#111b33] to-[#0a1122] p-5 sm:p-7 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#b0c8ff]/[0.12] pb-4 text-[13px]">
                  <span className="font-semibold text-[#f3f6ff]">
                    {currentSpeaking.contextLabel}
                  </span>
                  <span className="text-[12px] text-[#38bdf8]">
                    {speaking.previewTag}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="max-w-[88%] rounded-[16px] bg-[#1a2947] px-4 py-3.5 text-[14px] leading-relaxed text-[#f3f6ff]">
                    {currentSpeaking.prompt}
                  </div>

                  <div className="ml-auto max-w-[88%] rounded-[16px] bg-[#2a3b7c] px-4 py-3.5 text-[14px] leading-relaxed text-[#f3f6ff]">
                    {currentSpeaking.learnerReply}
                  </div>

                  {/* Feedback Surface */}
                  <div className="rounded-[16px] border border-[#34d399]/30 bg-[#0b2324] p-4 text-[14px] leading-relaxed">
                    <p className="text-[13px] font-semibold text-[#34d399]">
                      {currentSpeaking.feedbackHeading}
                    </p>
                    <p className="mt-1.5 text-[#e4f7f1]">
                      {currentSpeaking.feedbackExplanation}
                    </p>
                    <p className="mt-2 text-[13px] text-[#a7dcd0]">
                      “{currentSpeaking.naturalRewrite}”
                    </p>
                  </div>
                </div>

                {/* Decorative Voice Visualization */}
                <div
                  className="my-5 flex h-[44px] items-center justify-center gap-1.5"
                  role="img"
                  aria-label={speaking.waveAriaLabel}
                >
                  {WAVE_BARS.map((bar, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className={`lv-wave-bar w-[3px] rounded-full bg-gradient-to-b from-[#38bdf8] to-[#8b6dff] ${bar.h} ${bar.d}`}
                    />
                  ))}
                </div>

                <p className="text-center text-[12px] leading-relaxed text-[#8d9fbe]">
                  {speaking.noMicDisclaimer}
                </p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* SECTION G — REAL-WORLD TRANSFER LAB */}
      <section
        id="scenarios"
        className="border-t border-[#b0c8ff]/[0.08] bg-[#080f20] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[13px] font-semibold text-[#6da5ff]">
                  {transfer.kicker}
                </p>
                <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
                  {transfer.title}
                </h2>
                <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
                  {transfer.lead}
                </p>
              </div>

              <Link
                to={routes.transferLabRoute}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 self-start rounded-[10px] border border-[#b0c8ff]/[0.18] bg-[#0d1528] px-5 py-2.5 text-[13px] font-semibold text-[#f3f6ff] transition-colors hover:border-[#4f8bff]/60 hover:text-white lg:self-auto whitespace-nowrap"
              >
                <span>
                  {routes.isSignedIn ? transfer.ctaSignedIn : transfer.cta}
                </span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {/* Interactive 6-Scenario Selector Grid */}
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {transfer.items.map((item, idx) => {
                const Icon = TRANSFER_ICONS[idx % TRANSFER_ICONS.length];
                const isActive = item.id === currentTransfer.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveTransferId(item.id)}
                    className={`flex cursor-pointer flex-col justify-between rounded-[18px] border p-5 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8bff] ${
                      isActive
                        ? 'border-[#4f8bff]/70 bg-[#121f3d]'
                        : 'border-[#b0c8ff]/[0.12] bg-[#0d1528] hover:border-[#6ca4ff]/45'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Icon
                        className={`h-5 w-5 ${
                          isActive ? 'text-[#38bdf8]' : 'text-[#89b5ff]'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-[12px] font-medium ${
                          item.isLiveInApp ? 'text-[#34d399]' : 'text-[#92a4c6]'
                        }`}
                      >
                        {item.isLiveInApp ? transfer.liveTag : transfer.plannedTag}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-[16px] font-bold text-[#f3f6ff]">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#a8b6d1]">
                        {item.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Scenario Brief Detail Bar */}
            <div
              aria-live="polite"
              className="mt-6 grid grid-cols-1 gap-6 rounded-[18px] border border-[#b0c8ff]/[0.14] bg-[#0d1528] p-6 md:grid-cols-2"
            >
              <div>
                <p className="text-[12px] font-semibold text-[#6da5ff]">
                  {transfer.briefLabel}
                  <span aria-hidden="true" className="mx-1.5 text-[#56698e]">
                    ·
                  </span>
                  <span className="text-[#e3ecfc]">{currentTransfer.title}</span>
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#dce5f7]">
                  {currentTransfer.challengeBrief}
                </p>
              </div>
              <div className="border-t border-[#b0c8ff]/[0.1] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <p className="text-[12px] font-semibold text-[#34d399]">
                  {transfer.skillLabel}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#f3f6ff]">
                  {currentTransfer.targetSkill}
                </p>
              </div>
            </div>

            <p className="mt-4 text-[13px] text-[#8d9fbe]">{transfer.honestyNote}</p>
          </RevealSection>
        </div>
      </section>
    </>
  );
}
