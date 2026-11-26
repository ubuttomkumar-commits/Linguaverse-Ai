import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Mic,
  RotateCcw,
  ShieldAlert,
  Square,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  comparePronunciationTranscript,
  PRONUNCIATION_DRILLS,
  type PronunciationComparisonResult,
} from '../../domain/speakingStudioEngine';
import { speakEnglishExample, stopSpeaking } from '../../utils/speechSynthesis';
import {
  classifyMicError,
  getSpeechRecognitionConstructor,
  isMediaRecorderSupported,
  isSpeechRecognitionSupported,
  pickSupportedAudioMimeType,
  type BrowserSpeechRecognition,
} from '../../utils/voiceRecorder';
import { LiveMicrophoneWaveform } from './VoiceUniverseOrb';

export function PronunciationPracticePanel() {
  const { lang } = useLanguage();
  const [kindFilter, setKindFilter] = useState<'word' | 'sentence'>('word');
  const drills = useMemo(
    () => PRONUNCIATION_DRILLS.filter((d) => d.kind === kindFilter),
    [kindFilter]
  );
  const [selectedDrillId, setSelectedDrillId] = useState<string>(PRONUNCIATION_DRILLS[0].id);

  const activeDrill = useMemo(
    () => drills.find((d) => d.id === selectedDrillId) ?? drills[0],
    [drills, selectedDrillId]
  );

  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<PronunciationComparisonResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const latestTranscriptRef = useRef<string>('');

  const mediaRecorderAvailable = isMediaRecorderSupported();
  const speechRecAvailable = isSpeechRecognitionSupported();

  const stopCapture = () => {
    setIsRecording(false);
    try {
      speechRecRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    speechRecRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setActiveStream(null);
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopCapture();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    };
  }, [recordedAudioUrl]);

  const handleSelectKind = (nextKind: 'word' | 'sentence') => {
    stopCapture();
    stopSpeaking();
    setKindFilter(nextKind);
    const firstOfKind = PRONUNCIATION_DRILLS.find((d) => d.kind === nextKind);
    if (firstOfKind) setSelectedDrillId(firstOfKind.id);
    setRecognizedText('');
    latestTranscriptRef.current = '';
    setComparison(null);
    setMicError(null);
  };

  const handleSelectDrill = (drillId: string) => {
    stopCapture();
    stopSpeaking();
    setSelectedDrillId(drillId);
    setRecognizedText('');
    latestTranscriptRef.current = '';
    setComparison(null);
    setMicError(null);
  };

  const handlePlayReference = (rate: 0.75 | 1.0) => {
    stopSpeaking();
    setIsPlayingRef(true);
    const ok = speakEnglishExample({
      text: activeDrill.targetText,
      rate,
      onEnd: () => setIsPlayingRef(false),
      onError: () => setIsPlayingRef(false),
    });
    if (!ok) setIsPlayingRef(false);
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      stopCapture();
      setComparison(
        comparePronunciationTranscript(activeDrill.targetText, latestTranscriptRef.current)
      );
      return;
    }

    setMicError(null);
    setComparison(null);
    setRecognizedText('');
    latestTranscriptRef.current = '';
    stopSpeaking();
    setIsPlayingRef(false);

    if (!mediaRecorderAvailable) {
      const classified = classifyMicError(new DOMException('NotSupportedError', 'NotSupportedError'));
      setMicError(lang === 'bn' ? classified.messageBn : classified.messageEn);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setActiveStream(stream);

      const mimeType = pickSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType ?? 'audio/webm' });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setRecordedAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      const SpeechRecCtor = getSpeechRecognitionConstructor();
      if (SpeechRecCtor) {
        try {
          const rec = new SpeechRecCtor();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';
          rec.onresult = (event) => {
            let full = '';
            for (let i = 0; i < event.results.length; i++) {
              full += `${event.results[i][0]?.transcript ?? ''} `;
            }
            const clean = full.trim();
            latestTranscriptRef.current = clean;
            setRecognizedText(clean);
          };
          rec.onerror = () => {
            // Keep MediaRecorder audio active even if browser STT errors
          };
          rec.start();
          speechRecRef.current = rec;
        } catch {
          // Graceful fallback
        }
      }
    } catch (err) {
      const classified = classifyMicError(err);
      setMicError(lang === 'bn' ? classified.messageBn : classified.messageEn);
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Strict Capability Honesty Banner */}
      <section
        aria-label={lang === 'bn' ? 'উচ্চারণ মূল্যায়নের স্বচ্ছতা' : 'Pronunciation capability scope'}
        className="flex items-start gap-3 rounded-xl border border-[#22D3EE]/35 bg-[#0B1230] p-4 text-xs leading-relaxed text-slate-200 sm:text-sm"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#22D3EE]" aria-hidden="true" />
        <div>
          <p className="font-semibold text-white">
            {lang === 'bn'
              ? 'সৎ প্রযুক্তি সীমাবদ্ধতা: স্পিচ রিকগনিশন বনাম অ্যাকুস্টিক উচ্চারণ মূল্যায়ন'
              : 'Honest Capability Notice: Speech Recognition vs. Acoustic Pronunciation Scoring'}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            {lang === 'bn'
              ? 'এই মোডে আপনি রেফারেন্স অডিও শুনতে, নিজের ভয়েস রেকর্ড করে প্লেব্যাক করতে এবং ব্রাউজার Speech Recognition-এর মাধ্যমে শব্দ-স্তরের স্পষ্টতা যাচাই করতে পারবেন। আমরা কখনোই ফোনিম-ভিত্তিক শতকরা স্কোর বা নেটিভ অ্যাকসেন্ট স্কোর তৈরি করি না, কারণ অ্যাকুস্টিক ফোনিম ইঞ্জিন এখনো যুক্ত নয়।'
              : 'Here you can listen to reference phrasing (0.75x / 1.0x), record and replay your own voice, and check browser Speech Recognition word-level clarity. We never claim phoneme-level accuracy percentages or native-accent equivalence because no acoustic phoneme scoring engine is connected.'}
          </p>
        </div>
      </section>

      {/* Word vs Sentence Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={lang === 'bn' ? 'অনুশীলনের ধরন' : 'Pronunciation drill type'}
          className="inline-flex items-center rounded-lg border border-slate-800 bg-[#0B1230] p-1"
        >
          <button
            type="button"
            aria-pressed={kindFilter === 'word'}
            onClick={() => handleSelectKind('word')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              kindFilter === 'word'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'শব্দ ও ধ্বনি অনুশীলন' : 'Word & Sound Focus'}
          </button>
          <button
            type="button"
            aria-pressed={kindFilter === 'sentence'}
            onClick={() => handleSelectKind('sentence')}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              kindFilter === 'sentence'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'বাক্য ও ছন্দ অনুশীলন' : 'Sentence & Rhythm'}
          </button>
        </div>

        <p className="text-xs text-slate-400">
          {speechRecAvailable
            ? lang === 'bn'
              ? 'ব্রাউজার স্পিচ রিকগনিশন সক্রিয়'
              : 'Browser Speech Recognition detected'
            : lang === 'bn'
              ? 'ব্রাউজার STT নেই — অডিও রেকর্ডিং ও নিজে শুনে মিলানোর সুবিধা চালু আছে'
              : 'Browser STT unavailable — record & self-playback comparison active'}
        </p>
      </div>

      {/* Drill Selector + Active Practice Stage */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Drill List */}
        <aside className="space-y-2.5 lg:col-span-4">
          {drills.map((drill) => {
            const selected = activeDrill.id === drill.id;
            return (
              <button
                key={drill.id}
                type="button"
                onClick={() => handleSelectDrill(drill.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                  selected
                    ? 'border-[#22D3EE]/70 bg-[#0B1230]'
                    : 'border-slate-800 bg-[#070B1B] hover:border-slate-700'
                }`}
              >
                <p className="font-mono text-[11px] text-[#22D3EE]">{drill.cefrFit}</p>
                <p className="mt-1 text-sm font-semibold text-white">{drill.targetText}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {lang === 'bn' ? drill.focusAreaBn : drill.focusAreaEn}
                </p>
              </button>
            );
          })}
        </aside>

        {/* Right: Active Pronunciation Lab */}
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-[#0B1230] p-5 sm:p-6 lg:col-span-8">
          <div className="border-b border-slate-800 pb-4">
            <p className="text-xs font-medium text-[#22D3EE]">
              {lang === 'bn' ? activeDrill.focusAreaBn : activeDrill.focusAreaEn} · {activeDrill.cefrFit}
            </p>
            <h2 className="mt-2 text-xl font-bold leading-snug text-white sm:text-2xl">
              “{activeDrill.targetText}”
            </h2>
            <p className="mt-1.5 font-mono text-xs text-violet-300">{activeDrill.ipaGuide}</p>
          </div>

          {/* Bangla Articulation Coaching Tip */}
          <div className="rounded-xl border border-slate-800 bg-[#070B1B] p-4 text-xs leading-relaxed text-slate-300 sm:text-sm">
            <p className="font-semibold text-slate-100">
              {lang === 'bn' ? 'বাংলাভাষীদের জন্য উচ্চারণ গাইড' : 'Bangla-L1 Articulation Guide'}
            </p>
            <p className="mt-1">{activeDrill.banglaTipEn}</p>
            <p className="font-bn mt-1.5 text-slate-400">{activeDrill.banglaTipBn}</p>
          </div>

          {/* Step 1 & 2 Controls: Reference Listen + Record */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handlePlayReference(1.0)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#070B1B] px-4 py-2.5 text-xs font-semibold text-slate-100 hover:border-[#22D3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Volume2 className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'রেফারেন্স শুনুন (1.0x)' : 'Listen Reference (1.0x)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlayReference(0.75)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#070B1B] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-[#22D3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Volume2 className="h-4 w-4 text-violet-300" aria-hidden="true" />
              <span>{lang === 'bn' ? 'ধীরগতি (0.75x)' : 'Slow Reference (0.75x)'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleToggleRecord()}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'থামান ও তুলনা করুন' : 'Stop & Compare'}</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'আপনার উচ্চারণ রেকর্ড করুন' : 'Record Your Voice'}</span>
                </>
              )}
            </button>
          </div>

          <LiveMicrophoneWaveform
            mediaStream={activeStream}
            isRecording={isRecording}
            isAiSpeaking={isPlayingRef}
          />

          {micError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{micError}</span>
            </div>
          )}

          {/* Self-Review Playback */}
          {recordedAudioUrl && (
            <div className="rounded-xl border border-slate-800 bg-[#070B1B] p-4">
              <p className="mb-2 text-xs font-semibold text-slate-200">
                {lang === 'bn'
                  ? 'আপনার রেকর্ডকৃত কণ্ঠস্বর (নিজে শুনে রেফারেন্সের সাথে মেলান)'
                  : 'Your Recorded Take (Self-Review Playback)'}
              </p>
              <audio
                controls
                src={recordedAudioUrl}
                aria-label="Your recorded pronunciation take"
                className="h-9 w-full"
              />
            </div>
          )}

          {/* Manual / Live Speech Recognition Transcript Box for Explicit Word Comparison */}
          <div className="rounded-xl border border-slate-800 bg-[#070B1B] p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="pron-transcript-input" className="text-xs font-semibold text-slate-200">
                {lang === 'bn'
                  ? 'স্পিচ রিকগনিশন ট্রান্সক্রিপ্ট (অথবা যা বলেছেন তা যাচাই করুন)'
                  : 'Recognized Transcript (Speech-to-Text Output)'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setComparison(
                    comparePronunciationTranscript(activeDrill.targetText, recognizedText)
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0B1230] px-3 py-1.5 text-xs font-semibold text-[#22D3EE] hover:border-[#22D3EE] cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>{lang === 'bn' ? 'শব্দ-তুলনা দেখুন' : 'Compare Words'}</span>
              </button>
            </div>
            <input
              id="pron-transcript-input"
              type="text"
              value={recognizedText}
              onChange={(e) => {
                setRecognizedText(e.target.value);
                latestTranscriptRef.current = e.target.value;
              }}
              placeholder={
                lang === 'bn'
                  ? 'রেকর্ড করলে এখানে ব্রাউজারের শোনা শব্দ দেখাবে...'
                  : 'Browser Speech Recognition output appears here while recording...'
              }
              className="w-full rounded-lg border border-slate-800 bg-[#0B1230] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none"
            />
          </div>

          {/* Deterministic Word-Level Comparison Result */}
          {comparison && (
            <div className="rounded-xl border border-[#3B82F6]/40 bg-[#070B1B] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">
                  {lang === 'bn'
                    ? comparison.recognitionMatchLabelBn
                    : comparison.recognitionMatchLabelEn}
                </p>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {comparison.matchedWordCount}/{comparison.totalTargetWords}{' '}
                  {lang === 'bn' ? 'শব্দ মিলেছে' : 'words matched'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {comparison.wordMatches.map((wm, idx) => (
                  <span
                    key={`${wm.word}_${idx}`}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${
                      wm.matched
                        ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                        : 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                    }`}
                  >
                    {wm.matched ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                    )}
                    <span>{wm.word}</span>
                  </span>
                ))}
              </div>

              <p className="text-xs leading-relaxed text-slate-300">
                {lang === 'bn' ? comparison.coachingNoteBn : comparison.coachingNoteEn}
              </p>
              <p className="border-t border-slate-800 pt-2.5 text-[11px] text-slate-400">
                {lang === 'bn' ? comparison.honestDisclaimerBn : comparison.honestDisclaimerEn}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
