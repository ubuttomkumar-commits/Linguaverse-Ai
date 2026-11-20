import { useEffect, useState } from 'react';
import { ChevronDown, Keyboard, Languages, Mic, Volume2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANDING_COPY } from '../../domain/landingContent';
import { RevealBlock, TiltSpotlightCard } from './TiltSpotlightCard';
import { speakEnglishExample, stopSpeaking, type PlaybackSpeed } from '../../utils/speechSynthesis';

export function SupportEcosystemSection() {
  const { lang } = useLanguage();
  const copy = LANDING_COPY[lang].support;

  const [explainDemoLang, setExplainDemoLang] = useState<'bn' | 'en'>('bn');
  const [audioRate, setAudioRate] = useState<PlaybackSpeed>(0.75);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [inputModeDemo, setInputModeDemo] = useState<'voice' | 'text'>('text');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const handlePlaySlowDemo = (speed: PlaybackSpeed) => {
    setAudioRate(speed);
    setIsPlayingDemo(true);
    const ok = speakEnglishExample({
      text: "Could we reschedule our meeting to Thursday morning? I'll send the updated slides today.",
      rate: speed,
      onEnd: () => setIsPlayingDemo(false),
      onError: () => setIsPlayingDemo(false),
    });
    if (!ok) setIsPlayingDemo(false);
  };

  return (
    <section
      id="support"
      className="border-t border-white/[0.06] bg-[#080E1D] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealBlock className="max-w-3xl">
          <p className="text-xs font-semibold text-[#F59E0B]">{copy.kicker}</p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
            {copy.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            {copy.subtitle}
          </p>
        </RevealBlock>

        {/* 3 Beginner Safety Pillars with Live Micro-Demos */}
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {copy.pillars.map((pillar, idx) => (
            <RevealBlock key={pillar.id} delayMs={idx * 70}>
              <TiltSpotlightCard
                as="article"
                maxTilt={3}
                className="flex h-full flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1526] p-6"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#050914]">
                    {pillar.id === 'bangla' && (
                      <Languages className="h-5 w-5 text-[#7C3AED]" aria-hidden="true" />
                    )}
                    {pillar.id === 'slow_audio' && (
                      <Volume2 className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
                    )}
                    {pillar.id === 'text_fallback' && (
                      <Keyboard className="h-5 w-5 text-[#3B82F6]" aria-hidden="true" />
                    )}
                  </div>

                  <h3 className="font-display mt-4 text-lg font-bold text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {pillar.description}
                  </p>
                </div>

                {/* Live Interactive Safeguard Preview */}
                <div className="mt-6 border-t border-white/[0.08] pt-4">
                  {pillar.id === 'bangla' && (
                    <div className="space-y-2.5">
                      <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#050914] p-0.5 text-xs">
                        <button
                          type="button"
                          aria-pressed={explainDemoLang === 'bn'}
                          onClick={() => setExplainDemoLang('bn')}
                          className={`font-bn rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                            explainDemoLang === 'bn'
                              ? 'bg-[#7C3AED] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          বাংলা ব্যাখ্যা
                        </button>
                        <button
                          type="button"
                          aria-pressed={explainDemoLang === 'en'}
                          onClick={() => setExplainDemoLang('en')}
                          className={`rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                            explainDemoLang === 'en'
                              ? 'bg-[#3B82F6] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          English Note
                        </button>
                      </div>
                      <p className="font-bn text-xs leading-relaxed text-slate-300">
                        {explainDemoLang === 'bn'
                          ? '“Senior”-এর পর তুলনায় “than” নয়, সবসময় “to” বসে: He is senior to me.'
                          : 'Comparative adjectives ending in “-ior” (senior, junior) always take “to”, never “than”.'}
                      </p>
                    </div>
                  )}

                  {pillar.id === 'slow_audio' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePlaySlowDemo(0.75)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            audioRate === 0.75 && isPlayingDemo
                              ? 'border-[#F59E0B] bg-[#F59E0B]/20 text-amber-200'
                              : 'border-white/10 bg-[#050914] text-slate-200 hover:border-[#F59E0B]/60'
                          }`}
                        >
                          <Volume2 className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />
                          <span>0.75x Slow</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlaySlowDemo(1.0)}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                            audioRate === 1.0 && isPlayingDemo
                              ? 'border-[#3B82F6] bg-[#3B82F6]/20 text-white'
                              : 'border-white/10 bg-[#050914] text-slate-300 hover:border-[#3B82F6]/60'
                          }`}
                        >
                          <Volume2 className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
                          <span>1.0x Natural</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        {isPlayingDemo
                          ? `Playing sample at ${audioRate}x speed...`
                          : '“Could we reschedule our meeting to Thursday morning?”'}
                      </p>
                    </div>
                  )}

                  {pillar.id === 'text_fallback' && (
                    <div className="space-y-2.5">
                      <div className="inline-flex rounded-lg border border-white/[0.08] bg-[#050914] p-0.5 text-xs">
                        <button
                          type="button"
                          aria-pressed={inputModeDemo === 'voice'}
                          onClick={() => setInputModeDemo('voice')}
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                            inputModeDemo === 'voice'
                              ? 'bg-[#3B82F6] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Mic className="h-3 w-3" aria-hidden="true" />
                          <span>Voice</span>
                        </button>
                        <button
                          type="button"
                          aria-pressed={inputModeDemo === 'text'}
                          onClick={() => setInputModeDemo('text')}
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                            inputModeDemo === 'text'
                              ? 'bg-[#3B82F6] text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Keyboard className="h-3 w-3" aria-hidden="true" />
                          <span>Text Fallback</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300">
                        {inputModeDemo === 'text'
                          ? lang === 'bn'
                            ? 'মাইক বন্ধ — নীরবে টাইপ করেও সম্পূর্ণ AI ফিডব্যাক ও বাংলা ব্যাখ্যা পাবেন।'
                            : 'Mic muted — type your reply silently and receive identical AI & Bangla coaching.'
                          : lang === 'bn'
                            ? 'ভয়েস চালু — স্বাভাবিকভাবে বলুন, সিস্টেম আপনার বলা বাক্য বিশ্লেষণ করবে।'
                            : 'Voice active — speak aloud at your own pace with instant transcript & replay.'}
                      </p>
                    </div>
                  )}
                </div>
              </TiltSpotlightCard>
            </RevealBlock>
          ))}
        </div>

        {/* Clean Beginner FAQ Accordion */}
        <RevealBlock delayMs={100} className="mt-16 mx-auto max-w-4xl">
          <div id="faq">
            <h3 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
              {copy.faqTitle}
            </h3>

            <div className="mt-6 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {copy.faqs.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={item.q} className="py-5">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-semibold text-slate-100">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#3B82F6]' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-3 pr-6 text-sm leading-relaxed text-slate-400">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </RevealBlock>
      </div>
    </section>
  );
}
