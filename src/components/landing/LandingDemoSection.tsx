import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Mic,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  SUPPLIED_LANDING_COPY,
  resolveLandingRoutes,
} from '../../domain/suppliedLandingCopy';
import { LANDING_3D_CONTENT } from '../../domain/landing3dContent';
import {
  analyzeSampleSentence,
  type SampleMistakeAnalysis,
} from '../../domain/sampleAnalyzer';
import {
  buildEnrichedDemoGuidance,
  validateLandingDemoSentence,
} from '../../domain/landingDemoEnricher';
import { RevealSection } from './RevealSection';
import { InteractiveProgressRing, MagneticWrap } from './MotionPrimitives';

const INITIAL_SENTENCE = 'I am agree with you.';

const DEMO_WAVE = [
  'h-[10px] [animation-delay:0s]',
  'h-[20px] [animation-delay:0.1s]',
  'h-[28px] [animation-delay:0.2s]',
  'h-[14px] [animation-delay:0.3s]',
  'h-[24px] [animation-delay:0.4s]',
  'h-[18px] [animation-delay:0.5s]',
  'h-[12px] [animation-delay:0.6s]',
];

export function LandingDemoSection() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const demo = SUPPLIED_LANDING_COPY[lang].demo;
  const dash = LANDING_3D_CONTENT[lang].demoDashboard;
  const routes = resolveLandingRoutes(user, profile);

  const [sentence, setSentence] = useState(INITIAL_SENTENCE);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sourceMode, setSourceMode] = useState<'ai' | 'rule'>('rule');
  const [analysis, setAnalysis] = useState<SampleMistakeAnalysis>(() =>
    analyzeSampleSentence(INITIAL_SENTENCE)
  );

  const enriched = useMemo(() => buildEnrichedDemoGuidance(analysis), [analysis]);

  const runAnalysis = async (rawText: string) => {
    const check = validateLandingDemoSentence(rawText);
    if (!check.valid) {
      setValidationError(lang === 'bn' ? check.errorBn ?? null : check.errorEn ?? null);
      return;
    }

    setValidationError(null);
    const cleaned = rawText.trim();
    const deterministic = analyzeSampleSentence(cleaned);

    if (deterministic.hasDetectedMistake) {
      setAnalysis(deterministic);
      setSourceMode('rule');
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch('/api/landing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: cleaned }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        const serverAnalysis = data?.analysis as SampleMistakeAnalysis | undefined;
        if (serverAnalysis?.correctedSentence) {
          setAnalysis(serverAnalysis);
          setSourceMode(serverAnalysis.analysisSource === 'gemini' ? 'ai' : 'rule');
          setIsAnalyzing(false);
          window.clearTimeout(timeoutId);
          return;
        }
      }
    } catch {
      // Fall back cleanly to built-in deterministic analyzer
    } finally {
      window.clearTimeout(timeoutId);
    }

    setAnalysis(deterministic);
    setSourceMode('rule');
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runAnalysis(sentence);
  };

  return (
    <section
      id="live-demo"
      className="border-t border-[#b0c8ff]/[0.08] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <RevealSection>
          <div className="max-w-2xl">
            <p className="text-[13px] font-semibold text-[#38bdf8]">{demo.kicker}</p>
            <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
              {demo.title}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
              {demo.lead}
            </p>
          </div>

          {/* Realistic 3D Dashboard Preview Shell */}
          <div className="lv-glow-surface mt-10 overflow-hidden rounded-[24px] border border-[#38bdf8]/25 bg-gradient-to-b from-[#0f1930] to-[#0a1122]">
            {/* Realistic Dashboard Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#b0c8ff]/[0.12] bg-[#080f20]/90 px-5 py-3.5 text-[12.5px] sm:px-8">
              <div className="flex items-center gap-2.5">
                <span className="font-display font-bold text-[#f3f6ff]">
                  {dash.workspaceTitle}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                <span className="font-semibold text-[#38bdf8]">{dash.sampleBadge}</span>
                <span aria-hidden="true" className="hidden text-[#4c5f85] sm:inline">
                  ·
                </span>
                <span className="text-[#9cb0d1]">
                  {sourceMode === 'ai' ? demo.sourceAi : demo.sourceRule}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {/* Interactive Sentence Analyzer Input */}
              <form onSubmit={handleSubmit} noValidate>
                <label
                  htmlFor="demo-sentence-input"
                  className="block text-[14px] font-semibold text-[#e1eafb]"
                >
                  {demo.inputLabel}
                </label>

                <div className="mt-2.5 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="demo-sentence-input"
                    type="text"
                    value={sentence}
                    onChange={(e) => {
                      setSentence(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={demo.inputPlaceholder}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={validationError ? 'demo-input-error' : undefined}
                    className="min-h-[48px] flex-1 rounded-[12px] border border-[#b0c8ff]/[0.18] bg-[#060b18] px-4 py-3 text-[15px] text-[#f3f6ff] placeholder:text-[#7083a6] focus:border-[#38bdf8] focus:outline-none"
                  />
                  <MagneticWrap className="shrink-0">
                    <button
                      type="submit"
                      disabled={isAnalyzing}
                      className="lv-glow-cta inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] px-6 py-3 text-[14px] font-bold text-[#060b18] active:scale-[0.99] disabled:opacity-60 sm:w-auto whitespace-nowrap"
                    >
                      {isAnalyzing && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      )}
                      <span>{isAnalyzing ? demo.analyzingBtn : demo.analyzeBtn}</span>
                    </button>
                  </MagneticWrap>
                </div>

                {validationError && (
                  <p
                    id="demo-input-error"
                    role="alert"
                    className="mt-2.5 flex items-center gap-2 text-[13px] font-medium text-[#fca5a5]"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{validationError}</span>
                  </p>
                )}

                {/* Preset Example Buttons */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[13px] text-[#92a4c6]">
                    {demo.presetsLabel}
                  </span>
                  {demo.presets.map((preset) => {
                    const isCurrent =
                      sentence.trim().toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setSentence(preset);
                          void runAnalysis(preset);
                        }}
                        className={`min-h-[36px] cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                          isCurrent
                            ? 'border-[#38bdf8]/75 bg-[#122447] font-semibold text-white shadow-[0_0_16px_rgba(56,189,248,0.18)]'
                            : 'border-[#b0c8ff]/[0.14] bg-[#080f20] text-[#b9c8e3] hover:border-[#6ca4ff]/50 hover:text-white'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </form>

              {/* Multi-Panel Dashboard Output Grid */}
              <div
                aria-live="polite"
                className="mt-8 grid grid-cols-1 gap-6 border-t border-[#b0c8ff]/[0.12] pt-7 lg:grid-cols-12"
              >
                {/* Left 7 Columns: Mistake Detection, Corrected Sentence & Bilingual AI Feedback */}
                <div className="space-y-6 lg:col-span-7">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-[16px] border border-[#b0c8ff]/[0.12] bg-[#080f20] p-4">
                      <p className="text-[12px] font-semibold text-[#94a6c7]">
                        {demo.originalHeading}
                      </p>
                      <p className="mt-2 text-[17px] font-semibold leading-snug text-[#e2eaf9]">
                        “{analysis.originalSentence}”
                      </p>
                      {analysis.hasDetectedMistake && (
                        <p className="mt-2 text-[12.5px] text-[#9bb0d4]">
                          {lang === 'bn'
                            ? analysis.errorCategoryBn
                            : analysis.errorCategory}
                          <span aria-hidden="true" className="mx-1.5">
                            ·
                          </span>
                          <span className="text-[#fca5a5]">{analysis.errorSpan}</span>
                        </p>
                      )}
                    </div>

                    <div className="rounded-[16px] border border-[#34d399]/30 bg-[#081d22] p-4">
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#34d399]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{demo.correctedHeading}</span>
                      </p>
                      <p className="mt-2 text-[17px] font-bold leading-snug text-[#c6fae4]">
                        “{analysis.correctedSentence}”
                      </p>
                      {analysis.hasDetectedMistake && (
                        <p className="mt-2 text-[12.5px] text-[#8be3c1]">
                          {lang === 'bn'
                            ? analysis.patternNameBn
                            : analysis.patternNameEn}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bilingual AI Feedback Panel */}
                  <div className="rounded-[16px] border border-[#b0c8ff]/[0.12] bg-[#080f20] p-5">
                    <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[#38bdf8]">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{demo.explanationHeading}</span>
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#eef3ff]">
                      {lang === 'bn' ? analysis.explanationBn : analysis.explanationEn}
                    </p>
                    <p className="font-bn mt-2 text-[14px] leading-relaxed text-[#a8b8d6]">
                      {lang === 'bn' ? analysis.explanationEn : analysis.explanationBn}
                    </p>

                    <div className="mt-4 border-t border-[#b0c8ff]/[0.1] pt-4">
                      <h4 className="text-[12.5px] font-semibold text-[#c084fc]">
                        {demo.alternativesHeading}
                      </h4>
                      <ul className="mt-2 space-y-1.5 text-[13.5px] text-[#dce6fa]">
                        {enriched.naturalAlternatives.map((alt) => (
                          <li key={alt} className="flex items-start gap-2">
                            <span aria-hidden="true" className="text-[#34d399]">
                              —
                            </span>
                            <span>{alt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right 5 Columns: Speaking Studio Sync, Sample Progress Rings & Personalized Recommendation */}
                <div className="flex flex-col justify-between gap-4 lg:col-span-5">
                  {/* Speaking Studio Mini Sync Card */}
                  <div className="rounded-[16px] border border-[#b0c8ff]/[0.12] bg-[#080f20] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#7dd3fc]">
                        <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{dash.speakingPanelLabel}</span>
                      </span>
                      <div className="flex h-[24px] items-center gap-1" aria-hidden="true">
                        {DEMO_WAVE.map((cls, i) => (
                          <span
                            key={i}
                            className={`lv-wave-bar w-[2.5px] rounded-full bg-gradient-to-b from-[#38bdf8] to-[#d946ef] ${cls}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#b5c4e0]">
                      <span className="font-semibold text-[#e6eeff]">
                        {lang === 'bn'
                          ? enriched.contextLabelBn
                          : enriched.contextLabelEn}
                        :
                      </span>{' '}
                      {lang === 'bn'
                        ? enriched.contextUsageBn
                        : enriched.contextUsageEn}
                    </p>
                  </div>

                  {/* Interactive Sample Progress Rings Card */}
                  <div className="rounded-[16px] border border-[#b0c8ff]/[0.12] bg-[#080f20] p-4">
                    <p className="text-[12px] font-semibold text-[#c4b5fd]">
                      {dash.progressPanelLabel}
                    </p>
                    <div className="mt-3.5 flex items-center justify-around">
                      {dash.rings.map((ring) => (
                        <InteractiveProgressRing
                          key={ring.id}
                          value={ring.sampleValue}
                          label={ring.label}
                          color={ring.color}
                          size={58}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-[#8295b8]">
                      {dash.sampleMetricDisclaimer}
                    </p>
                  </div>

                  {/* Personalized Recommendation Card */}
                  <div className="rounded-[16px] border border-[#8b6dff]/30 bg-gradient-to-br from-[#121d3b] to-[#0a1226] p-4">
                    <p className="text-[12px] font-semibold text-[#38bdf8]">
                      {dash.recommendationLabel}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#dce5f7]">
                      {analysis.hasDetectedMistake
                        ? lang === 'bn'
                          ? `“${analysis.errorSpan}” প্যাটার্নটি মিস্টেক মেমোরিতে যুক্ত করে স্পিকিং স্টুডিওতে ৩ বার স্বাভাবিক বাক্যে বলার অনুশীলন করুন।`
                          : `Log “${analysis.errorSpan}” to Mistake Memory and rehearse “${analysis.correctedSentence}” across 3 calm Speaking Studio turns.`
                        : lang === 'bn'
                        ? 'এই বাক্যটি পরিষ্কার! এবার ট্রান্সফার ল্যাবে ফলো-আপ প্রশ্নসহ বাস্তব পরিস্থিতিতে অনুশীলন করুন।'
                        : 'Clean structure detected—advance to a Transfer Lab workplace scenario with follow-up questions.'}
                    </p>
                    <div className="mt-3">
                      <Link
                        to={routes.speakingRoute}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#38bdf8] transition-colors hover:text-white"
                      >
                        <span>
                          {routes.isSignedIn ? demo.tryCtaSignedIn : demo.tryCta}
                        </span>
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
