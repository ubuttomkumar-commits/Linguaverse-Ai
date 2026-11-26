import { Compass, Mic } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { SpeakingOverviewMetrics } from '../../domain/speakingStudioEngine';
import { VoiceUniverseOrb } from './VoiceUniverseOrb';

interface SpeakingHomeHeroProps {
  overview: SpeakingOverviewMetrics;
  primaryGoalLabel: string;
  aiConfigured: boolean;
  onStartSpeaking: () => void;
  onExploreScenarios: () => void;
}

export function SpeakingHomeHero({
  overview,
  primaryGoalLabel,
  aiConfigured,
  onStartSpeaking,
  onExploreScenarios,
}: SpeakingHomeHeroProps) {
  const { lang } = useLanguage();

  return (
    <section
      aria-label={lang === 'bn' ? 'AI স্পিকিং স্টুডিও পরিচিতি' : 'AI Speaking Studio Hero'}
      className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br from-[#0B1230] via-[#070B1B] to-[#0B1230] p-6 sm:p-8"
    >
      {/* Subtle controlled ambient radial backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#22D3EE]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl"
      />

      <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Left: Core Message & Actions */}
        <div className="lg:col-span-7">
          <p className="text-xs font-medium tracking-wide text-[#22D3EE]">
            {lang === 'bn'
              ? 'লিঙ্গুয়াভার্স এআই স্পিকিং স্টুডিও · ভয়েস ইউনিভার্স'
              : 'Linguaverse AI Voice Universe · Speaking Studio'}
          </p>

          <h1 className="mt-2.5 max-w-xl text-3xl font-bold tracking-tight text-white [text-wrap:balance] sm:text-4xl">
            {lang === 'bn'
              ? 'নিজের কণ্ঠস্বর খুঁজে নিন। আত্মবিশ্বাস গড়ে তুলুন।'
              : 'Find Your Voice. Build Your Confidence.'}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {lang === 'bn'
              ? 'AI লার্নিং পার্টনারের সাথে বাস্তব কথোপকথন অনুশীলন করুন, অর্থবহ বাংলা ব্যাখ্যাসহ ফিডব্যাক পান এবং প্রতিটি কথোপকথনের মাধ্যমে উন্নতি করুন।'
              : 'Practice real conversations with an AI learning partner, receive meaningful feedback, and improve one conversation at a time.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStartSpeaking}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] px-5 py-3 text-sm font-semibold text-[#070B1B] shadow-lg shadow-[#22D3EE]/15 hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'কথা বলা শুরু করুন' : 'Start Speaking'}</span>
            </button>

            <button
              type="button"
              onClick={onExploreScenarios}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#070B1B]/80 px-5 py-3 text-sm font-semibold text-slate-100 hover:border-[#22D3EE]/60 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]"
            >
              <Compass className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'দৃশ্যপট দেখুন' : 'Explore Scenarios'}</span>
            </button>
          </div>
        </div>

        {/* Right: Signature Floating Holographic Voice Orb */}
        <div className="flex justify-center lg:col-span-5">
          <VoiceUniverseOrb
            state={aiConfigured ? 'idle' : 'unavailable'}
            size="hero"
            statusDetailEn={
              aiConfigured
                ? 'Voice + text coaching ready'
                : 'Configure GEMINI_API_KEY for live coaching'
            }
            statusDetailBn={
              aiConfigured
                ? 'ভয়েস ও টেক্সট কোচিং প্রস্তুত'
                : 'লাইভ কোচিংয়ের জন্য GEMINI_API_KEY প্রয়োজন'
            }
          />
        </div>
      </div>

      {/* Verified Speaking Overview Strip (Strictly Real Persisted Data) */}
      <div className="relative mt-7 grid grid-cols-2 gap-4 border-t border-slate-800/90 pt-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'সম্পন্ন সেশন' : 'Completed Sessions'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {overview.completedSessionsCount}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'যাচাইকৃত সময়' : 'Verified Practice'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#22D3EE] tabular-nums">
            {overview.verifiedPracticeMinutes}{' '}
            <span className="text-xs font-normal text-slate-400">
              {lang === 'bn' ? 'মিনিট' : 'min'}
            </span>
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'মূল্যায়িত ধাপ' : 'Feedback Records'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-violet-300 tabular-nums">
            {overview.totalTurnsEvaluated}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            {lang === 'bn' ? 'বর্তমান লক্ষ্য' : 'Active Focus Goal'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100 truncate">
            {primaryGoalLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
            {lang === 'bn'
              ? overview.improvementIndicator.summaryBn
              : overview.improvementIndicator.summaryEn}
          </p>
        </div>
      </div>
    </section>
  );
}
