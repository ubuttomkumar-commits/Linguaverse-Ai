import { useEffect, useState } from 'react';
import { Volume2, Square, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  isSpeechSynthesisSupported,
  speakEnglishExample,
  stopSpeaking,
  type PlaybackSpeed,
} from '../../utils/speechSynthesis';
import type { LessonExample } from '../../types/domain';

interface LessonExamplesStageProps {
  examples: LessonExample[];
}

function renderHighlightedSentence(sentence: string, phrase: string) {
  const idx = sentence.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1 || !phrase) return sentence;
  const before = sentence.slice(0, idx);
  const match = sentence.slice(idx, idx + phrase.length);
  const after = sentence.slice(idx + phrase.length);
  return (
    <>
      {before}
      <span className="font-semibold text-[#3B82F6] underline decoration-[#3B82F6]/50 underline-offset-4">
        {match}
      </span>
      {after}
    </>
  );
}

export function LessonExamplesStage({ examples }: LessonExamplesStageProps) {
  const { lang } = useLanguage();
  const [speed, setSpeed] = useState<PlaybackSpeed>(1.0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [ttsNotice, setTtsNotice] = useState<string | null>(null);
  const ttsSupported = isSpeechSynthesisSupported();

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleTogglePlay = (example: LessonExample) => {
    setTtsNotice(null);
    if (playingId === example.id) {
      stopSpeaking();
      setPlayingId(null);
      return;
    }

    setPlayingId(example.id);
    const started = speakEnglishExample({
      text: example.englishSentence,
      rate: speed,
      onEnd: () => {
        setPlayingId((curr) => (curr === example.id ? null : curr));
      },
      onError: () => {
        setPlayingId(null);
        setTtsNotice(
          lang === 'bn'
            ? 'এই ব্রাউজারে অডিও ভয়েস পাওয়া যায়নি। বাক্যগুলো জোরে পড়ে অনুশীলন করুন।'
            : 'Audio voices are unavailable in this browser environment. Practice reading each example aloud.'
        );
      },
    });

    if (!started) {
      setPlayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white sm:text-xl">
            {lang === 'bn'
              ? 'বাস্তব জীবনের উদাহরণ ও উচ্চারণ অনুশীলন'
              : 'Real-World Examples with Audio Pronunciation'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {lang === 'bn'
              ? 'প্রতিটি উদাহরণ শুনুন, তারপর নিজে জোরে বলুন। প্রয়োজনে ০.৭৫x ধীর গতিতে শুনুন।'
              : 'Listen to each natural sentence, notice the highlighted structure, and repeat it aloud.'}
          </p>
        </div>

        {/* Speed Control Toggle (0.75x / 1.0x) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-slate-400">
            {lang === 'bn' ? 'অডিও গতি:' : 'Playback Speed:'}
          </span>
          <div
            role="group"
            aria-label="Audio playback speed"
            className="inline-flex items-center rounded-lg border border-slate-800 bg-[#0A0F1C] p-0.5"
          >
            {([0.75, 1.0] as PlaybackSpeed[]).map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setSpeed(rate)}
                aria-pressed={speed === rate}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  speed === rate
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {rate === 0.75 ? '0.75x' : '1.0x'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(!ttsSupported || ttsNotice) && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3.5 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <span>
            {ttsNotice ??
              (lang === 'bn'
                ? 'আপনার ব্রাউজারে Web Speech API অনুপস্থিত। প্রতিটি উদাহরণ নিজে জোরে পড়ে অনুশীলন করুন।'
                : 'Web Speech API is unavailable in this browser. Read each example aloud to build spoken rhythm.')}
          </span>
        </div>
      )}

      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#0A0F1C]">
        {examples.map((ex, idx) => {
          const isPlaying = playingId === ex.id;
          return (
            <div
              key={ex.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">
                  <span className="font-mono text-slate-500 tabular-nums">0{idx + 1}</span>
                  <span aria-hidden="true" className="mx-2 text-slate-600">
                    ·
                  </span>
                  <span>{lang === 'bn' ? ex.contextBn : ex.contextEn}</span>
                </p>
                <p className="mt-2 text-base font-medium leading-relaxed text-white sm:text-lg">
                  {renderHighlightedSentence(ex.englishSentence, ex.highlightPhrase)}
                </p>
                <p className="font-bn mt-1.5 text-sm leading-relaxed text-slate-400">
                  {ex.banglaMeaning}
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => handleTogglePlay(ex)}
                  aria-pressed={isPlaying}
                  aria-label={
                    isPlaying
                      ? `Stop audio for example ${idx + 1}`
                      : `Play audio for example ${idx + 1} at ${speed}x speed`
                  }
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isPlaying
                      ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                      : 'border-slate-700 bg-[#111827] text-slate-200 hover:border-[#3B82F6] hover:text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'থামান' : 'Stop'}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {lang === 'bn' ? `শুনুন (${speed}x)` : `Listen (${speed}x)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
