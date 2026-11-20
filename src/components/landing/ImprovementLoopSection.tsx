import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Compass,
  Gauge,
  Repeat2,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANDING_COPY } from '../../domain/landingContent';
import { RevealBlock, TiltSpotlightCard } from './TiltSpotlightCard';

export function ImprovementLoopSection() {
  const { lang } = useLanguage();
  const loopCopy = LANDING_COPY[lang].loop;
  const systemsCopy = LANDING_COPY[lang].systems;

  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [pressureLevelDemo, setPressureLevelDemo] = useState<number>(2);
  const [replayMode, setReplayMode] = useState<'yours' | 'natural'>('natural');

  const activeStep = loopCopy.steps[activeStepIdx];

  const renderSystemMicroPreview = (
    id: 'dna' | 'mistake_memory' | 'transfer_lab' | 'pressure_ladder' | 'replay' | 'evidence'
  ) => {
    switch (id) {
      case 'dna':
        return (
          <div className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-4">
            {[
              { label: lang === 'bn' ? 'বাক্য নির্ভুলতা' : 'Sentence Accuracy', pct: 84, bar: 'bg-[#3B82F6]' },
              { label: lang === 'bn' ? 'স্বাভাবিক শব্দচয়ন' : 'Natural Collocations', pct: 76, bar: 'bg-[#7C3AED]' },
              { label: lang === 'bn' ? 'ট্রান্সফার স্থায়ীত্ব' : 'Transfer Reliability', pct: 81, bar: 'bg-[#F59E0B]' },
            ].map((axis) => (
              <div key={axis.label}>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">{axis.label}</span>
                  <span className="font-mono text-slate-200 tabular-nums">{axis.pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-800/90 overflow-hidden">
                  <div className={`h-full rounded-full ${axis.bar}`} style={{ width: `${axis.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'mistake_memory':
        return (
          <div className="mt-5 space-y-2 border-t border-white/[0.08] pt-4 text-xs">
            <div className="flex items-center justify-between gap-2 text-slate-300">
              <span className="truncate font-mono">I am agree → I agree</span>
              <span className="font-medium text-emerald-400 whitespace-nowrap">
                {lang === 'bn' ? 'সমাধান হয়েছে' : 'Resolved'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-slate-300">
              <span className="truncate font-mono">since 3 years → for 3 years</span>
              <span className="font-medium text-[#F59E0B] whitespace-nowrap">
                {lang === 'bn' ? 'রিভিশন বাকি' : 'Due Today'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-slate-300">
              <span className="truncate font-mono">senior than → senior to</span>
              <span className="font-medium text-[#3B82F6] whitespace-nowrap">
                {lang === 'bn' ? 'স্থিতিশীল হচ্ছে' : 'Stabilizing'}
              </span>
            </div>
          </div>
        );

      case 'transfer_lab':
        return (
          <div className="mt-5 border-t border-white/[0.08] pt-4 text-xs space-y-2">
            <p className="font-medium text-[#F59E0B]">
              {lang === 'bn' ? 'অপ্রত্যাশিত ফলো-আপ টুইস্ট:' : 'Unexpected Twist Prompt:'}
            </p>
            <p className="text-slate-300 leading-relaxed">
              “Can you clarify why the deadline moved from Tuesday to Thursday?”
            </p>
            <p className="text-[11px] text-slate-400">
              {lang === 'bn'
                ? '৪-রুব্রিক মূল্যায়ন: কাজ সম্পন্ন · গ্রামার প্রয়োগ · উপযুক্ততা · প্রাসঙ্গিকতা'
                : '4-Rubric Check: Task · Target Grammar · Tone · Relevance'}
            </p>
          </div>
        );

      case 'pressure_ladder': {
        const labels =
          lang === 'bn'
            ? ['১. টেমপ্লেট', '২. গাইড', '৩. মুক্ত', '৪. টুইস্ট', '৫. টাইমড']
            : ['L1 Template', 'L2 Guided', 'L3 Open', 'L4 Twist', 'L5 Timed'];
        const hints =
          lang === 'bn'
            ? [
                'কোনো টাইমার নেই · ০.৭৫x অডিও · বাংলা বাক্য টেমপ্লেট',
                'বুলেট হিন্টসহ স্বাভাবিক কথোপকথন অনুশীলন',
                'হিন্ট ছাড়াই নিজের মতো করে উত্তর দেওয়া',
                'এআই হঠাৎ অপ্রত্যাশিত ফলো-আপ প্রশ্ন করবে',
                'বাস্তব ইন্টারভিউয়ের মতো কাউন্টডাউন টাইমারে উত্তর',
              ]
            : [
                'Zero timer · 0.75x slow audio · Full Bangla-guided templates',
                'Bullet cues visible so you never freeze mid-sentence',
                'Unassisted speaking turns at your own comfortable pace',
                'AI introduces a realistic unexpected follow-up twist',
                'High-stakes timed interview & workplace simulation',
              ];
        return (
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="grid grid-cols-5 gap-1" role="group" aria-label="Pressure ladder preview">
              {labels.map((lbl, idx) => {
                const lvl = idx + 1;
                const active = pressureLevelDemo === lvl;
                return (
                  <button
                    key={lbl}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPressureLevelDemo(lvl)}
                    className={`rounded-md py-1.5 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap truncate ${
                      active
                        ? 'bg-[#3B82F6] text-white'
                        : 'bg-[#050914] text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-xs text-slate-300">{hints[pressureLevelDemo - 1]}</p>
          </div>
        );
      }

      case 'replay':
        return (
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#050914] p-0.5 text-xs">
              <button
                type="button"
                aria-pressed={replayMode === 'yours'}
                onClick={() => setReplayMode('yours')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  replayMode === 'yours'
                    ? 'bg-rose-500/20 text-rose-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'bn' ? 'আপনার বলা' : 'What You Said'}
              </button>
              <button
                type="button"
                aria-pressed={replayMode === 'natural'}
                onClick={() => setReplayMode('natural')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  replayMode === 'natural'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'bn' ? 'স্বাভাবিক সংস্করণ' : 'Fluent Upgrade'}
              </button>
            </div>
            <p
              className={`mt-2.5 text-xs leading-relaxed ${
                replayMode === 'yours' ? 'text-rose-200' : 'text-emerald-300 font-medium'
              }`}
            >
              {replayMode === 'yours'
                ? '“We will discuss about the client budget tomorrow morning.”'
                : '“We will discuss the client budget tomorrow morning.”'}
            </p>
          </div>
        );

      case 'evidence':
        return (
          <div className="mt-5 border-t border-white/[0.08] pt-4 flex items-start gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <p className="leading-relaxed">
              {lang === 'bn'
                ? 'নতুন অ্যাকাউন্ট ০% থেকে শুরু হয়—প্রতিটি উন্নতির সংখ্যা সরাসরি আপনার সম্পন্ন স্পিকিং সেশনের সাথে যুক্ত।'
                : 'New accounts start honestly at 0%—every score traces directly to verified speaking turns and transfer checks.'}
            </p>
          </div>
        );
    }
  };

  const getSystemIcon = (
    id: 'dna' | 'mistake_memory' | 'transfer_lab' | 'pressure_ladder' | 'replay' | 'evidence'
  ) => {
    const cls = 'h-5 w-5';
    switch (id) {
      case 'dna':
        return <Activity className={`${cls} text-[#3B82F6]`} aria-hidden="true" />;
      case 'mistake_memory':
        return <Brain className={`${cls} text-[#7C3AED]`} aria-hidden="true" />;
      case 'transfer_lab':
        return <Compass className={`${cls} text-[#F59E0B]`} aria-hidden="true" />;
      case 'pressure_ladder':
        return <Gauge className={`${cls} text-[#3B82F6]`} aria-hidden="true" />;
      case 'replay':
        return <Repeat2 className={`${cls} text-[#7C3AED]`} aria-hidden="true" />;
      case 'evidence':
        return <ShieldCheck className={`${cls} text-emerald-400`} aria-hidden="true" />;
    }
  };

  return (
    <>
      {/* 8-Step Communication Improvement Loop Visualizer */}
      <section
        id="how-it-works"
        className="border-t border-white/[0.06] bg-[#080E1D] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealBlock className="max-w-3xl">
            <p className="text-xs font-semibold text-[#3B82F6]">{loopCopy.kicker}</p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              {loopCopy.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
              {loopCopy.subtitle}
            </p>
          </RevealBlock>

          {/* Connected 8-Node Progress Rail */}
          <RevealBlock delayMs={60} className="mt-10">
            <div
              role="tablist"
              aria-label={loopCopy.title}
              className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8"
            >
              {loopCopy.steps.map((step, index) => {
                const isSelected = index === activeStepIdx;
                const isCompletedPath = index <= activeStepIdx;
                return (
                  <button
                    key={step.num}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveStepIdx(index)}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#3B82F6] bg-[#0E1526] text-white shadow-[0_0_24px_rgba(59,130,246,0.2)]'
                        : isCompletedPath
                          ? 'border-[#3B82F6]/35 bg-[#0E1526]/75 text-slate-200 hover:border-[#3B82F6]/60'
                          : 'border-white/[0.07] bg-[#050914]/70 text-slate-400 hover:border-white/[0.18] hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-mono text-xs font-bold tabular-nums ${
                          isSelected
                            ? 'text-[#3B82F6]'
                            : isCompletedPath
                              ? 'text-blue-300/80'
                              : 'text-slate-500'
                        }`}
                      >
                        {step.num}
                      </span>
                      {index < loopCopy.steps.length - 1 && (
                        <ArrowRight
                          className={`hidden h-3 w-3 lg:block ${
                            isCompletedPath ? 'text-[#3B82F6]' : 'text-slate-700'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <span className="mt-2.5 text-xs font-semibold leading-snug">
                      {step.shortTitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Step Detail & Concrete Learner Example */}
            <div
              role="tabpanel"
              data-testid="loop-step-detail"
              className="mt-5 rounded-2xl border border-white/[0.09] bg-[#0E1526] p-6 sm:p-8"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-6">
                  <p className="font-mono text-xs font-semibold text-[#7C3AED] tabular-nums">
                    {loopCopy.stepPrefix} {activeStep.num} / 08
                  </p>
                  <h3 className="font-display mt-2 text-xl font-bold text-white sm:text-2xl">
                    {activeStep.title}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-300">
                    {activeStep.summary}
                  </p>
                  <div className="mt-5 border-t border-white/[0.08] pt-4">
                    <p className="text-xs font-semibold text-[#F59E0B]">{loopCopy.outcomeLabel}</p>
                    <p className="mt-1.5 text-sm font-medium text-slate-100">
                      {activeStep.outcome}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#3B82F6]/25 bg-[#050914] p-5 lg:col-span-6">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#3B82F6]">{loopCopy.exampleLabel}</span>
                    <span className="text-slate-400">{activeStep.learnerExampleLabel}</span>
                  </div>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-200">
                    {activeStep.learnerExample}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveStepIdx((prev) =>
                          prev === 0 ? loopCopy.steps.length - 1 : prev - 1
                        )
                      }
                      className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {loopCopy.prevBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveStepIdx((prev) =>
                          prev === loopCopy.steps.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="text-xs font-semibold text-[#3B82F6] hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      {loopCopy.nextBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </RevealBlock>
        </div>
      </section>

      {/* 6 Differentiation Systems Asymmetric 3D Bento Grid */}
      <section
        id="features"
        className="border-t border-white/[0.06] bg-[#050914] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealBlock className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold text-[#A78BFA]">{systemsCopy.kicker}</p>
              <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
                {systemsCopy.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                {systemsCopy.subtitle}
              </p>
            </div>
            <p className="text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
              {systemsCopy.sampleCaption}
            </p>
          </RevealBlock>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-12">
            {systemsCopy.items.map((sys, idx) => {
              const spanClass =
                idx === 0 || idx === 3 || idx === 4 ? 'md:col-span-7' : 'md:col-span-5';
              return (
                <RevealBlock key={sys.id} delayMs={idx * 55} className={spanClass}>
                  <TiltSpotlightCard
                    as="article"
                    maxTilt={3.5}
                    className="flex h-full flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1526] p-6 sm:p-7 hover:border-[#3B82F6]/35"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs">
                          <span className="font-mono font-semibold text-slate-400 tabular-nums">
                            {sys.num}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="text-slate-400">{sys.tagline}</span>
                        </div>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#050914]">
                          {getSystemIcon(sys.id)}
                        </div>
                      </div>
                      <h3 className="font-display mt-4 text-xl font-bold text-white">
                        {sys.name}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                        {sys.description}
                      </p>
                    </div>

                    {renderSystemMicroPreview(sys.id)}
                  </TiltSpotlightCard>
                </RevealBlock>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
