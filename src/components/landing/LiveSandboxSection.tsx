import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Volume2,
} from 'lucide-react';
import {
  analyzeSampleSentence,
  SANDBOX_SAMPLE_CHIPS,
  type SampleMistakeAnalysis,
} from '../../domain/sampleAnalyzer';
import { LANDING_COPY } from '../../domain/landingContent';
import { useLanguage } from '../../i18n/LanguageContext';
import { RevealBlock, TiltSpotlightCard } from './TiltSpotlightCard';
import { speakEnglishExample, stopSpeaking, type PlaybackSpeed } from '../../utils/speechSynthesis';

export function LiveSandboxSection() {
  const { lang } = useLanguage();
  const copy = LANDING_COPY[lang].sandbox;

  const [selectedChipId, setSelectedChipId] = useState<string>(SANDBOX_SAMPLE_CHIPS[0].id);
  const [inputSentence, setInputSentence] = useState<string>(
    SANDBOX_SAMPLE_CHIPS[0].inputSentence
  );
  const [analysis, setAnalysis] = useState<SampleMistakeAnalysis>(() =>
    analyzeSampleSentence(SANDBOX_SAMPLE_CHIPS[0].inputSentence)
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [playingSpeed, setPlayingSpeed] = useState<PlaybackSpeed | null>(null);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const runAnalysis = async (rawSentence: string, chipId: string) => {
    const cleaned = rawSentence.trim();
    if (!cleaned) {
      setValidationError(copy.emptyError);
      return;
    }
    setValidationError(null);
    setSelectedChipId(chipId);
    stopSpeaking();
    setPlayingSpeed(null);

    // 1. Instant local rule engine for zero-latency classic Bangla-to-English interference
    const localResult = analyzeSampleSentence(cleaned);
    if (localResult.hasDetectedMistake) {
      setAnalysis(localResult);
      return;
    }

    // 2. For custom sentences not matched by local rules, query server-side Gemini endpoint
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/landing/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: cleaned }),
      });
      if (res.ok) {
        const data = (await res.json()) as { analysis?: SampleMistakeAnalysis };
        if (data.analysis) {
          setAnalysis(data.analysis);
          return;
        }
      }
      setAnalysis(localResult);
    } catch {
      setAnalysis(localResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChipClick = (chipId: string, sentence: string) => {
    setInputSentence(sentence);
    void runAnalysis(sentence, chipId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runAnalysis(inputSentence, 'custom');
  };

  const handleSpeakCorrected = (speed: PlaybackSpeed) => {
    setPlayingSpeed(speed);
    const ok = speakEnglishExample({
      text: analysis.correctedSentence,
      rate: speed,
      onEnd: () => setPlayingSpeed(null),
      onError: () => setPlayingSpeed(null),
    });
    if (!ok) setPlayingSpeed(null);
  };

  return (
    <section
      id="live-demo"
      className="border-t border-white/[0.06] bg-[#050914] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealBlock className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#3B82F6]">{copy.kicker}</p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              {copy.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
              {copy.subtitle}
            </p>
          </div>
          <p className="text-xs font-semibold text-[#F59E0B] whitespace-nowrap shrink-0">
            {copy.sampleLabel}
          </p>
        </RevealBlock>

        <RevealBlock delayMs={80} className="mt-10">
          <TiltSpotlightCard
            as="div"
            maxTilt={2}
            className="rounded-2xl border border-white/[0.09] bg-[#0E1526] p-6 sm:p-8 shadow-[0_28px_70px_rgba(0,0,0,0.4)]"
          >
            {/* 4 One-Click Sample Chips */}
            <div>
              <p className="text-xs font-semibold text-slate-400">{copy.chipsLabel}</p>
              <div
                role="group"
                aria-label={copy.chipsLabel}
                className="mt-3 flex flex-wrap gap-2.5"
              >
                {SANDBOX_SAMPLE_CHIPS.map((chip) => {
                  const active = selectedChipId === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleChipClick(chip.id, chip.inputSentence)}
                      className={`min-h-[40px] rounded-lg border px-3.5 py-2 text-left text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white'
                          : 'border-white/[0.09] bg-[#050914] text-slate-300 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      “{chip.inputSentence}”
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Sentence Input Form */}
            <form onSubmit={handleSubmit} className="mt-6">
              <label
                htmlFor="sandbox-sentence-input"
                className="block text-xs font-semibold text-slate-300"
              >
                {copy.inputLabel}
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  id="sandbox-sentence-input"
                  type="text"
                  value={inputSentence}
                  onChange={(e) => {
                    setInputSentence(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={copy.inputPlaceholder}
                  className="min-h-[46px] min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-[#050914] px-4 py-3 text-sm sm:text-base text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,130,246,0.3)] hover:bg-[#2563EB] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  <span>{isAnalyzing ? copy.analyzingBtn : copy.analyzeBtn}</span>
                </button>
              </div>
              {validationError && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-400">
                  {validationError}
                </p>
              )}
            </form>

            {/* Instant Analysis Result */}
            <div
              aria-live="polite"
              data-testid="sandbox-analysis-result"
              className="mt-7 border-t border-white/[0.08] pt-6"
            >
              {/* Status & Category Meta Line (Clean unboxed typography) */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${
                      analysis.hasDetectedMistake ? 'text-[#F59E0B]' : 'text-emerald-400'
                    }`}
                  >
                    {analysis.hasDetectedMistake ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {analysis.hasDetectedMistake ? copy.detectedBanner : copy.cleanBanner}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-300">
                    <span className="text-slate-400">{copy.categoryLabel}: </span>
                    <strong className="font-semibold text-white">
                      {lang === 'bn' ? analysis.errorCategoryBn : analysis.errorCategory}
                    </strong>
                  </span>
                </div>

                <span className="font-mono text-[11px] text-slate-400">
                  {analysis.analysisSource === 'gemini' ? copy.sourceAi : copy.sourceRule}
                </span>
              </div>

              {/* Original vs Natural Corrected Sentence */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/[0.08] bg-[#050914] p-4 sm:p-5">
                  <p className="text-xs font-medium text-slate-400">{copy.originalLabel}</p>
                  <p className="mt-2 text-base font-medium leading-relaxed text-slate-200">
                    {analysis.hasDetectedMistake ? (
                      <span className="text-rose-200 underline decoration-rose-400/80 decoration-wavy underline-offset-4">
                        {analysis.originalSentence}
                      </span>
                    ) : (
                      <span>{analysis.originalSentence}</span>
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-[#3B82F6]/40 bg-[#050914] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#3B82F6]">{copy.correctedLabel}</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSpeakCorrected(0.75)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          playingSpeed === 0.75
                            ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-amber-200'
                            : 'border-white/10 bg-[#0E1526] text-slate-300 hover:text-white'
                        }`}
                      >
                        <Volume2 className="h-3 w-3 text-[#F59E0B]" aria-hidden="true" />
                        <span>{copy.listenSlow}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSpeakCorrected(1.0)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          playingSpeed === 1.0
                            ? 'border-[#3B82F6] bg-[#3B82F6]/20 text-white'
                            : 'border-white/10 bg-[#0E1526] text-slate-300 hover:text-white'
                        }`}
                      >
                        <Volume2 className="h-3 w-3 text-[#3B82F6]" aria-hidden="true" />
                        <span>{copy.listenNormal}</span>
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-base font-semibold leading-relaxed text-emerald-300">
                    {analysis.correctedSentence}
                  </p>
                </div>
              </div>

              {/* Friendly Bilingual Bangla + English Explanations */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[#7C3AED]/25 bg-[#050914]/80 p-4 sm:p-5">
                  <p className="font-bn text-xs font-semibold text-[#A78BFA]">
                    {copy.banglaLabel}
                  </p>
                  <p className="font-bn mt-2 text-sm leading-relaxed text-slate-100">
                    {analysis.explanationBn}
                  </p>
                  <p className="font-bn mt-2 text-xs leading-relaxed text-slate-400">
                    {analysis.l1TriggerBn}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#050914]/80 p-4 sm:p-5">
                  <p className="text-xs font-semibold text-[#3B82F6]">{copy.englishLabel}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    {analysis.explanationEn}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    <span className="font-medium text-slate-300">{copy.l1Label}: </span>
                    {analysis.l1TriggerEn}
                  </p>
                </div>
              </div>

              {/* Conversion CTA Footer */}
              <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  {lang === 'bn'
                    ? analysis.patternNameBn
                    : analysis.patternNameEn}
                </p>
                <Link
                  to={`/register?from=sandbox&pattern=${encodeURIComponent(analysis.memoryTag)}`}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{copy.conversionCta}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </TiltSpotlightCard>
        </RevealBlock>
      </div>
    </section>
  );
}
