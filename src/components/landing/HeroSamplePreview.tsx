import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  analyzeSampleSentence,
  HERO_SAMPLE_PRESETS,
} from '../../domain/sampleAnalyzer';
import { useLanguage } from '../../i18n/LanguageContext';
import type { ExplanationLanguage } from '../../types/domain';

export function HeroSamplePreview() {
  const { lang, t } = useLanguage();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(HERO_SAMPLE_PRESETS[0].id);
  const [draftSentence, setDraftSentence] = useState<string>(HERO_SAMPLE_PRESETS[0].inputSentence);
  const [submittedSentence, setSubmittedSentence] = useState<string>(
    HERO_SAMPLE_PRESETS[0].inputSentence
  );
  const [explanationLang, setExplanationLang] = useState<ExplanationLanguage>('both');
  const [fixApplied, setFixApplied] = useState(false);

  const analysis = useMemo(() => analyzeSampleSentence(submittedSentence), [submittedSentence]);

  const handleSelectPreset = (presetId: string, sentence: string) => {
    setSelectedPresetId(presetId);
    setDraftSentence(sentence);
    setSubmittedSentence(sentence);
    setFixApplied(false);
  };

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftSentence.trim();
    if (!cleaned) return;
    setSelectedPresetId('custom');
    setSubmittedSentence(cleaned);
    setFixApplied(false);
  };

  const handleApplyFix = () => {
    setFixApplied(true);
  };

  const handleReset = () => {
    const preset =
      HERO_SAMPLE_PRESETS.find((p) => p.id === selectedPresetId) ?? HERO_SAMPLE_PRESETS[0];
    setSelectedPresetId(preset.id);
    setDraftSentence(preset.inputSentence);
    setSubmittedSentence(preset.inputSentence);
    setFixApplied(false);
  };

  return (
    <section
      aria-label={t.samplePreview.badge}
      className="flex h-full flex-col justify-between rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6"
    >
      <div>
        {/* Honest Sample Label (unboxed typographic hierarchy) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#F59E0B]">
              {t.samplePreview.badge}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{t.samplePreview.subtitle}</p>
          </div>
          <div
            role="group"
            aria-label="Sample explanation language"
            className="inline-flex items-center rounded-md border border-slate-800 bg-[#0A0F1C] p-0.5"
          >
            {(['bn', 'both', 'en'] as ExplanationLanguage[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setExplanationLang(opt)}
                aria-pressed={explanationLang === opt}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  opt === 'bn' ? 'font-bn' : ''
                } ${
                  explanationLang === opt
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.samplePreview.explanationToggle[opt]}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Selector Tabs */}
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Sample sentences">
          {HERO_SAMPLE_PRESETS.map((preset) => {
            const isActive = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id, preset.inputSentence)}
                aria-pressed={isActive}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white'
                    : 'border-slate-800 bg-[#0A0F1C] text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                {lang === 'bn' ? preset.labelBn : preset.labelEn}
              </button>
            );
          })}
        </div>

        {/* Interactive Sentence Input */}
        <form onSubmit={handleAnalyzeSubmit} className="mt-4">
          <label
            htmlFor="hero-sample-input"
            className="block text-xs font-medium text-slate-400"
          >
            {t.samplePreview.inputLabel}
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="hero-sample-input"
              type="text"
              value={draftSentence}
              onChange={(e) => setDraftSentence(e.target.value)}
              placeholder={t.samplePreview.inputPlaceholder}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#3B82F6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.samplePreview.analyzeBtn}
            </button>
          </div>
        </form>

        {/* Analysis Output */}
        <div className="mt-5 space-y-4 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                analysis.hasDetectedMistake ? 'text-[#F59E0B]' : 'text-emerald-400'
              }`}
            >
              {analysis.hasDetectedMistake ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>
                {analysis.hasDetectedMistake
                  ? t.samplePreview.detectedLabel
                  : t.samplePreview.cleanLabel}
              </span>
            </span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {analysis.memoryTag}
            </span>
          </div>

          {/* Before / After comparison */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
              <p className="text-[11px] font-medium text-slate-400">
                {t.samplePreview.originalLabel}
              </p>
              <p className="mt-1.5 text-sm font-medium text-slate-200 leading-relaxed">
                {analysis.hasDetectedMistake && !fixApplied ? (
                  <>
                    <span className="text-rose-300 underline decoration-rose-400/80 decoration-wavy underline-offset-4">
                      {analysis.originalSentence}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 line-through">{analysis.originalSentence}</span>
                )}
              </p>
            </div>

            <div className="rounded-lg border border-[#3B82F6]/40 bg-[#0A0F1C] p-3.5">
              <p className="text-[11px] font-medium text-[#3B82F6]">
                {t.samplePreview.naturalLabel}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-emerald-300 leading-relaxed">
                {analysis.correctedSentence}
              </p>
            </div>
          </div>

          {/* L1 Bangla Interference Explanation */}
          <div className="space-y-2.5 text-sm leading-relaxed">
            <p className="text-xs font-semibold text-slate-300">
              {lang === 'bn' ? analysis.patternNameBn : analysis.patternNameEn}
            </p>

            {(explanationLang === 'bn' || explanationLang === 'both') && (
              <div className="font-bn space-y-1.5 text-sm leading-relaxed text-slate-200">
                <p>
                  <span className="font-semibold text-[#8B5CF6]">বাংলা ব্যাখ্যা: </span>
                  {analysis.explanationBn}
                </p>
                <p className="text-xs text-slate-400">{analysis.l1TriggerBn}</p>
              </div>
            )}

            {(explanationLang === 'en' || explanationLang === 'both') && (
              <div className="space-y-1 text-sm leading-relaxed text-slate-300">
                <p>
                  <span className="font-semibold text-[#3B82F6]">English note: </span>
                  {analysis.explanationEn}
                </p>
                {explanationLang === 'en' && (
                  <p className="text-xs text-slate-400">{analysis.l1TriggerEn}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Micro-interaction footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        {analysis.hasDetectedMistake && !fixApplied ? (
          <button
            type="button"
            onClick={handleApplyFix}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2 text-xs font-semibold text-slate-100 hover:border-[#3B82F6] hover:text-white transition-colors cursor-pointer"
          >
            <span>{t.samplePreview.applyFixBtn}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : (
          <p className="text-xs text-emerald-300">
            {fixApplied ? t.samplePreview.compareDone : t.samplePreview.cleanLabel}
          </p>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t.samplePreview.resetBtn}</span>
        </button>
      </div>
    </section>
  );
}
