import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Mic,
  MicOff,
  PauseCircle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export type VoiceOrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'error'
  | 'unavailable';

interface VoiceUniverseOrbProps {
  state: VoiceOrbState;
  size?: 'hero' | 'studio' | 'compact';
  mediaStream?: MediaStream | null;
  recordingSeconds?: number;
  statusDetailEn?: string;
  statusDetailBn?: string;
  showWaveform?: boolean;
}

const BAR_COUNT = 28;
const IDLE_BARS = new Array<number>(BAR_COUNT).fill(0.12);

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

const STATE_META: Record<
  VoiceOrbState,
  {
    labelEn: string;
    labelBn: string;
    ringStroke: string;
    coreGradientId: string;
    textAccent: string;
  }
> = {
  idle: {
    labelEn: 'Ready to listen',
    labelBn: 'শোনার জন্য প্রস্তুত',
    ringStroke: '#22D3EE',
    coreGradientId: 'orbGradCyan',
    textAccent: 'text-[#22D3EE]',
  },
  listening: {
    labelEn: 'Recording live microphone',
    labelBn: 'লাইভ মাইক্রোফোন রেকর্ড হচ্ছে',
    ringStroke: '#22D3EE',
    coreGradientId: 'orbGradListening',
    textAccent: 'text-[#22D3EE]',
  },
  thinking: {
    labelEn: 'Analyzing your response',
    labelBn: 'আপনার উত্তর বিশ্লেষণ করা হচ্ছে',
    ringStroke: '#8B5CF6',
    coreGradientId: 'orbGradViolet',
    textAccent: 'text-violet-300',
  },
  speaking: {
    labelEn: 'AI voice playing',
    labelBn: 'AI ভয়েস বাজছে',
    ringStroke: '#3B82F6',
    coreGradientId: 'orbGradBlue',
    textAccent: 'text-blue-300',
  },
  paused: {
    labelEn: 'Session paused',
    labelBn: 'সেশন বিরতিতে রয়েছে',
    ringStroke: '#94A3B8',
    coreGradientId: 'orbGradPaused',
    textAccent: 'text-slate-300',
  },
  error: {
    labelEn: 'Attention needed',
    labelBn: 'ত্রুটি — আবার চেষ্টা করুন',
    ringStroke: '#F59E0B',
    coreGradientId: 'orbGradError',
    textAccent: 'text-amber-300',
  },
  unavailable: {
    labelEn: 'AI voice evaluation unavailable',
    labelBn: 'AI মূল্যায়ন উপলব্ধ নয়',
    ringStroke: '#64748B',
    coreGradientId: 'orbGradPaused',
    textAccent: 'text-slate-400',
  },
};

export function LiveMicrophoneWaveform({
  mediaStream,
  isRecording,
  isAiSpeaking = false,
}: {
  mediaStream: MediaStream | null;
  isRecording: boolean;
  isAiSpeaking?: boolean;
}) {
  const { lang } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const [bars, setBars] = useState<number[]>(IDLE_BARS);
  const [peakPercent, setPeakPercent] = useState<number>(0);

  useEffect(() => {
    if (!isRecording || !mediaStream || typeof window === 'undefined') {
      setBars(IDLE_BARS);
      setPeakPercent(0);
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      setBars(IDLE_BARS);
      return;
    }

    let rafId = 0;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      audioCtx = new AudioCtx();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastUpdate = 0;

      const sample = (ts: number) => {
        if (!analyser) return;
        // Throttle React bar updates to ~20fps for low-end Android performance
        if (ts - lastUpdate >= (reducedMotion ? 160 : 55)) {
          lastUpdate = ts;
          analyser.getByteTimeDomainData(dataArray);
          const nextBars: number[] = [];
          const bucketSize = Math.max(1, Math.floor(dataArray.length / BAR_COUNT));
          let maxAmp = 0;
          for (let i = 0; i < BAR_COUNT; i++) {
            let sum = 0;
            const start = i * bucketSize;
            const end = Math.min(dataArray.length, start + bucketSize);
            for (let j = start; j < end; j++) {
              sum += Math.abs(dataArray[j] - 128) / 128;
            }
            const avg = end > start ? sum / (end - start) : 0;
            const scaled = Math.min(1, Math.max(0.1, avg * 3.4));
            if (scaled > maxAmp) maxAmp = scaled;
            nextBars.push(scaled);
          }
          setBars(nextBars);
          setPeakPercent(Math.round(maxAmp * 100));
        }
        rafId = window.requestAnimationFrame(sample);
      };

      rafId = window.requestAnimationFrame(sample);
    } catch {
      setBars(IDLE_BARS);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      try {
        source?.disconnect();
        analyser?.disconnect();
        void audioCtx?.close();
      } catch {
        // Ignore teardown errors
      }
    };
  }, [isRecording, mediaStream, reducedMotion]);

  return (
    <div
      className="w-full"
      role="region"
      aria-label={
        isRecording
          ? lang === 'bn'
            ? 'লাইভ মাইক্রোফোন অডিও ওয়েভফর্ম'
            : 'Live microphone audio waveform'
          : lang === 'bn'
            ? 'অডিও ওয়েভফর্ম (নিষ্ক্রিয়)'
            : 'Audio waveform idle'
      }
    >
      <div
        className="flex h-12 items-center justify-center gap-1 rounded-lg border border-slate-800/90 bg-[#070B1B]/90 px-3"
        aria-hidden="true"
      >
        {bars.map((amp, idx) => {
          const heightPct = isRecording ? Math.max(14, Math.round(amp * 100)) : 14;
          return (
            <span
              key={idx}
              style={{
                height: `${heightPct}%`,
                transition: reducedMotion ? 'none' : 'height 70ms ease-out',
              }}
              className={`w-1 rounded-full ${
                isRecording
                  ? idx % 3 === 0
                    ? 'bg-[#22D3EE]'
                    : idx % 3 === 1
                      ? 'bg-[#3B82F6]'
                      : 'bg-[#8B5CF6]'
                  : isAiSpeaking
                    ? 'bg-[#3B82F6]/50'
                    : 'bg-slate-700/70'
              }`}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {isRecording
            ? lang === 'bn'
              ? 'বাস্তব মাইক্রোফোন ইনপুট সক্রিয় (Web Audio Analyser)'
              : 'Real microphone input active (Web Audio Analyser)'
            : isAiSpeaking
              ? lang === 'bn'
                ? 'ব্রাউজার TTS অডিও চলছে (লাইভ মাইক বন্ধ)'
                : 'Browser TTS playback active (microphone idle)'
              : lang === 'bn'
                ? 'মাইক্রোফোন নিষ্ক্রিয় — কথা বললে বাস্তব ওয়েভফর্ম দেখাবে'
                : 'Microphone idle — live waveform activates only while recording'}
        </span>
        {isRecording && (
          <span className="font-mono tabular-nums text-[#22D3EE]">
            {lang === 'bn' ? `স্তর ${peakPercent}%` : `Level ${peakPercent}%`}
          </span>
        )}
      </div>
    </div>
  );
}

export function VoiceUniverseOrb({
  state,
  size = 'studio',
  mediaStream = null,
  recordingSeconds = 0,
  statusDetailEn,
  statusDetailBn,
  showWaveform,
}: VoiceUniverseOrbProps) {
  const { lang } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const meta = STATE_META[state];
  const isHero = size === 'hero';
  const isCompact = size === 'compact';
  const dim = isHero ? 210 : isCompact ? 116 : 168;
  const shouldShowWaveform = showWaveform ?? !isHero;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
    setTilt({ x: ny, y: nx });
  };

  const renderStateIcon = () => {
    switch (state) {
      case 'listening':
        return <Mic className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />;
      case 'thinking':
        return (
          <Loader2
            className={`h-3.5 w-3.5 text-violet-300 ${reducedMotion ? '' : 'animate-spin'}`}
            aria-hidden="true"
          />
        );
      case 'speaking':
        return <Volume2 className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />;
      case 'paused':
        return <PauseCircle className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />;
      case 'error':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />;
      case 'unavailable':
        return <MicOff className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-[#22D3EE]" aria-hidden="true" />;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className={`flex ${isCompact ? 'flex-col sm:flex-row items-center gap-4' : 'flex-col items-center justify-center'} select-none`}
      data-testid="voice-universe-orb"
      data-orb-state={state}
    >
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{
          width: dim,
          height: dim,
          transform: reducedMotion
            ? undefined
            : `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: reducedMotion ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <svg
          viewBox="0 0 240 240"
          width={dim}
          height={dim}
          role="img"
          aria-label={lang === 'bn' ? meta.labelBn : meta.labelEn}
          className="overflow-visible"
        >
          <defs>
            <radialGradient id="orbGradCyan" cx="35%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.9" />
              <stop offset="38%" stopColor="#22D3EE" stopOpacity="0.65" />
              <stop offset="72%" stopColor="#6D28D9" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#070B1B" stopOpacity="0.98" />
            </radialGradient>
            <radialGradient id="orbGradListening" cx="35%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#A5F3FC" stopOpacity="0.98" />
              <stop offset="44%" stopColor="#22D3EE" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#8B5CF6" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#070B1B" stopOpacity="0.98" />
            </radialGradient>
            <radialGradient id="orbGradViolet" cx="34%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#F0ABFC" stopOpacity="0.92" />
              <stop offset="45%" stopColor="#D946EF" stopOpacity="0.78" />
              <stop offset="82%" stopColor="#4F46E5" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#070B1B" stopOpacity="0.98" />
            </radialGradient>
            <radialGradient id="orbGradBlue" cx="38%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.95" />
              <stop offset="48%" stopColor="#3B82F6" stopOpacity="0.82" />
              <stop offset="85%" stopColor="#6366F1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#070B1B" stopOpacity="0.98" />
            </radialGradient>
            <radialGradient id="orbGradPaused" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#64748B" stopOpacity="0.7" />
              <stop offset="65%" stopColor="#1E293B" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#070B1B" stopOpacity="0.96" />
            </radialGradient>
            <radialGradient id="orbGradError" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#D97706" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0B1230" stopOpacity="0.96" />
            </radialGradient>
            <radialGradient id="orbAmbientHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={meta.ringStroke} stopOpacity="0.32" />
              <stop offset="55%" stopColor="#8B5CF6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#070B1B" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="orbRimGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Soft breathing ambient halo */}
          <circle
            cx="120"
            cy="120"
            r="114"
            fill="url(#orbAmbientHalo)"
            className={
              !reducedMotion && state !== 'paused' && state !== 'unavailable'
                ? 'animate-pulse'
                : ''
            }
          />

          {/* Outer tilted holographic orbital rings */}
          <g
            style={
              !reducedMotion && (state === 'listening' || state === 'thinking' || state === 'speaking')
                ? {
                    transformOrigin: '120px 120px',
                    animation:
                      state === 'thinking'
                        ? 'spin 7s linear infinite'
                        : 'spin 16s linear infinite',
                  }
                : undefined
            }
          >
            <ellipse
              cx="120"
              cy="120"
              rx="100"
              ry="38"
              fill="none"
              stroke={meta.ringStroke}
              strokeOpacity="0.45"
              strokeWidth="1.35"
              transform="rotate(-26 120 120)"
            />
            <ellipse
              cx="120"
              cy="120"
              rx="92"
              ry="32"
              fill="none"
              stroke="#D946EF"
              strokeOpacity="0.38"
              strokeWidth="1.15"
              strokeDasharray="6 8"
              transform="rotate(34 120 120)"
            />
            <circle cx="204" cy="84" r="3.4" fill="#22D3EE" opacity="0.9" />
            <circle cx="42" cy="156" r="2.8" fill="#D946EF" opacity="0.85" />
            <circle cx="164" cy="40" r="2.2" fill="#3B82F6" opacity="0.85" />
          </g>

          {/* Outer luminous glass shell */}
          <circle
            cx="120"
            cy="120"
            r="68"
            fill="none"
            stroke="url(#orbRimGlass)"
            strokeOpacity={state === 'listening' ? '0.88' : '0.48'}
            strokeWidth={state === 'listening' ? '2.2' : '1.4'}
          />

          {/* Holographic core sphere */}
          <circle
            cx="120"
            cy="120"
            r="58"
            fill={`url(#${meta.coreGradientId})`}
            stroke="rgba(165,243,252,0.35)"
            strokeWidth="1.2"
          />

          {/* Internal glass swirl ribbons */}
          <path
            d="M 74 102 C 92 78, 148 76, 166 106"
            fill="none"
            stroke="rgba(103,232,249,0.55)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M 78 144 C 102 164, 146 160, 164 134"
            fill="none"
            stroke="rgba(217,70,239,0.45)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Subtle cosmic inner particle constellation */}
          <circle cx="106" cy="108" r="1.8" fill="#F0ABFC" opacity="0.85" />
          <circle cx="134" cy="102" r="1.4" fill="#67E8F9" opacity="0.9" />
          <circle cx="126" cy="134" r="1.6" fill="#F0ABFC" opacity="0.8" />
          <circle cx="98" cy="130" r="1.2" fill="#93C5FD" opacity="0.8" />
          <circle cx="142" cy="122" r="1.3" fill="#67E8F9" opacity="0.75" />

          {/* Specular glass reflection crescent */}
          <ellipse
            cx="102"
            cy="94"
            rx="22"
            ry="12"
            fill="rgba(255,255,255,0.22)"
            transform="rotate(-24 102 94)"
          />

          {/* Inner acoustic ring motif */}
          <circle
            cx="120"
            cy="120"
            r="34"
            fill="none"
            stroke="rgba(255,255,255,0.26)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
          <text
            x="120"
            y="125"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="15"
            fontWeight="700"
            letterSpacing="2"
            fontFamily="monospace"
          >
            LV
          </text>
        </svg>
      </div>

      {/* Explicit non-color-only state readout + optional real microphone waveform */}
      <div className={isCompact ? 'min-w-0 flex-1 space-y-2' : 'mt-2 flex w-full flex-col items-center'}>
        <div
          role="status"
          aria-live="polite"
          className={`flex flex-col ${isCompact ? 'items-center sm:items-start text-center sm:text-left' : 'items-center text-center'}`}
        >
          <p className={`inline-flex items-center gap-2 text-xs font-semibold ${meta.textAccent}`}>
            {renderStateIcon()}
            <span>{lang === 'bn' ? meta.labelBn : meta.labelEn}</span>
            {state === 'listening' && (
              <span className="font-mono tabular-nums text-white">
                · 00:{String(recordingSeconds).padStart(2, '0')}
              </span>
            )}
          </p>
          {(statusDetailEn || statusDetailBn) && (
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn' ? statusDetailBn ?? statusDetailEn : statusDetailEn}
            </p>
          )}
        </div>

        {shouldShowWaveform && (
          <div className={isCompact ? 'w-full' : 'mt-3 w-full max-w-md'}>
            <LiveMicrophoneWaveform
              mediaStream={mediaStream}
              isRecording={state === 'listening'}
              isAiSpeaking={state === 'speaking'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
