import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  FastForward,
  Loader2,
  Pause,
  Play,
  Rewind,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  computeWaveformPeaksFromChannelData,
  REPLAY_AUDIO_UNAVAILABLE_MESSAGE_BN,
  REPLAY_AUDIO_UNAVAILABLE_MESSAGE_EN,
  resolveAudioAvailability,
} from '../../domain/communicationReplayEngine';
import { getAudioBlob } from '../../utils/audioBlobStore';
import type { ReplayTranscriptTurn, UnifiedReplaySession } from '../../types/domain';

interface ReplayAudioPlayerProps {
  session: UnifiedReplaySession;
  currentUserId: string;
  activeAudioTurnId: string | null;
  audioRevision: number;
  onSelectAudioTurn: (turnId: string) => void;
  onResolvedAvailableCount?: (count: number) => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;
type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

interface ResolvedTrack {
  turn: ReplayTranscriptTurn;
  blob: Blob;
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function ReplayAudioPlayer({
  session,
  currentUserId,
  activeAudioTurnId,
  audioRevision,
  onSelectAudioTurn,
  onResolvedAvailableCount,
}: ReplayAudioPlayerProps) {
  const { lang } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [availableTracks, setAvailableTracks] = useState<ResolvedTrack[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [unauthorizedCount, setUnauthorizedCount] = useState(0);

  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [waveformStatus, setWaveformStatus] = useState<'idle' | 'decoding' | 'measured' | 'neutral'>('idle');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioCandidateTurns = useMemo(
    () => session.turns.filter((t) => t.speaker === 'learner' && Boolean(t.audioBlobKey?.trim())),
    [session.turns]
  );

  // Resolve real authorized IndexedDB blobs for this session
  useEffect(() => {
    let active = true;
    setAudioError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (audioCandidateTurns.length === 0) {
      setAvailableTracks([]);
      setMissingCount(0);
      setUnauthorizedCount(0);
      setIsLoadingTracks(false);
      onResolvedAvailableCount?.(0);
      return;
    }

    setIsLoadingTracks(true);
    Promise.all(
      audioCandidateTurns.map(async (turn) => {
        if (!turn.hasAuthorizedAudioKey || !turn.audioBlobKey) {
          return { turn, status: 'unauthorized' as const, blob: null };
        }
        const blob = await getAudioBlob(turn.audioBlobKey);
        const status = resolveAudioAvailability({
          audioBlobKey: turn.audioBlobKey,
          blobExists: Boolean(blob),
          currentUserId,
          sessionUserId: session.userId,
          inputChannel: turn.inputChannel,
        });
        return { turn, status, blob };
      })
    )
      .then((results) => {
        if (!active) return;
        const resolved: ResolvedTrack[] = [];
        let missing = 0;
        let unauthorized = 0;
        for (const r of results) {
          if (r.status === 'available' && r.blob) {
            resolved.push({ turn: r.turn, blob: r.blob });
          } else if (r.status === 'unauthorized') {
            unauthorized += 1;
          } else if (r.status === 'missing_recording') {
            missing += 1;
          }
        }
        setAvailableTracks(resolved);
        setMissingCount(missing);
        setUnauthorizedCount(unauthorized);
        onResolvedAvailableCount?.(resolved.length);
        setSelectedTurnId((prev) => {
          if (activeAudioTurnId && resolved.some((r) => r.turn.id === activeAudioTurnId)) {
            return activeAudioTurnId;
          }
          if (prev && resolved.some((r) => r.turn.id === prev)) {
            return prev;
          }
          return resolved[0]?.turn.id ?? null;
        });
      })
      .finally(() => {
        if (active) setIsLoadingTracks(false);
      });

    return () => {
      active = false;
    };
  }, [audioCandidateTurns, currentUserId, session.userId, audioRevision, activeAudioTurnId, onResolvedAvailableCount]);

  // Sync external turn selection from transcript
  useEffect(() => {
    if (activeAudioTurnId && availableTracks.some((t) => t.turn.id === activeAudioTurnId)) {
      setSelectedTurnId(activeAudioTurnId);
    }
  }, [activeAudioTurnId, availableTracks]);

  const activeTrack = useMemo(
    () => availableTracks.find((t) => t.turn.id === selectedTurnId) ?? availableTracks[0] ?? null,
    [availableTracks, selectedTurnId]
  );

  // Create object URL and decode real PCM waveform from actual audio blob (never fabricate peaks)
  useEffect(() => {
    let active = true;
    let url: string | null = null;
    let audioCtx: AudioContext | null = null;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(activeTrack?.turn.audioDurationSeconds ?? 0);
    setAudioError(null);

    if (!activeTrack) {
      setObjectUrl(null);
      setWaveformPeaks([]);
      setWaveformStatus('idle');
      return;
    }

    url = URL.createObjectURL(activeTrack.blob);
    setObjectUrl(url);
    setWaveformStatus('decoding');

    const decodeRealWaveform = async () => {
      try {
        const AudioCtxCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtxCtor) {
          if (active) {
            setWaveformPeaks([]);
            setWaveformStatus('neutral');
          }
          return;
        }
        const arrayBuf = await activeTrack.blob.arrayBuffer();
        audioCtx = new AudioCtxCtor();
        const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
        const channelData = decoded.getChannelData(0);
        const peaks = computeWaveformPeaksFromChannelData(channelData, 64);
        if (active) {
          if (Number.isFinite(decoded.duration) && decoded.duration > 0) {
            setDuration(decoded.duration);
          }
          if (peaks.length > 0) {
            setWaveformPeaks(peaks);
            setWaveformStatus('measured');
          } else {
            setWaveformPeaks([]);
            setWaveformStatus('neutral');
          }
        }
      } catch {
        // Honest fallback: neutral timeline, never fake peaks
        if (active) {
          setWaveformPeaks([]);
          setWaveformStatus('neutral');
        }
      } finally {
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
      }
    };

    void decodeRealWaveform();

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [activeTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, objectUrl]);

  const togglePlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el || !objectUrl) return;
    setAudioError(null);
    try {
      if (el.paused) {
        el.playbackRate = playbackRate;
        await el.play();
        setIsPlaying(true);
      } else {
        el.pause();
        setIsPlaying(false);
      }
    } catch {
      setIsPlaying(false);
      setAudioError(
        lang === 'bn'
          ? 'এই ব্রাউজারে অডিও প্লেব্যাক শুরু করা যায়নি, তবে আপনি সম্পূর্ণ ট্রান্সক্রিপ্ট পর্যালোচনা করতে পারবেন।'
          : 'Audio playback could not start in this browser, but transcript review remains fully available.'
      );
    }
  }, [objectUrl, playbackRate, lang]);

  const seekTo = useCallback(
    (targetSeconds: number) => {
      const el = audioRef.current;
      const maxDur = Number.isFinite(el?.duration) && (el?.duration ?? 0) > 0 ? el!.duration : duration;
      const clamped = Math.max(0, Math.min(maxDur || 0, targetSeconds));
      if (el) {
        el.currentTime = clamped;
      }
      setCurrentTime(clamped);
    },
    [duration]
  );

  const handleKeyboard = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!activeTrack) return;
    if (e.key === ' ' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
      e.preventDefault();
      void togglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekTo(currentTime - 5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekTo(currentTime + 5);
    }
  };

  if (isLoadingTracks) {
    return (
      <section
        aria-label={lang === 'bn' ? 'অডিও রিপ্লে প্লেয়ার' : 'Communication Replay Audio Player'}
        className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-[#081031]/90 p-4 text-xs text-slate-300"
      >
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden="true" />
        <span>
          {lang === 'bn'
            ? 'অনুমোদিত লোকাল অডিও রেকর্ডিং যাচাই করা হচ্ছে...'
            : 'Checking authorized local audio recordings for this session...'}
        </span>
      </section>
    );
  }

  // Honest Unavailable Audio State (Exact required messaging)
  if (!activeTrack) {
    return (
      <section
        aria-label={lang === 'bn' ? 'অডিও রিপ্লে প্লেয়ার' : 'Communication Replay Audio Player'}
        data-testid="replay-audio-unavailable-banner"
        className="rounded-2xl border border-slate-800/90 bg-[#070E2B]/90 p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-[#050A22] text-slate-400">
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white">
              {lang === 'bn' ? REPLAY_AUDIO_UNAVAILABLE_MESSAGE_BN : REPLAY_AUDIO_UNAVAILABLE_MESSAGE_EN}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              {unauthorizedCount > 0
                ? lang === 'bn'
                  ? 'অননুমোদিত অডিও রেফারেন্স নিরাপত্তার কারণে ব্লক করা হয়েছে।'
                  : 'Unauthorized audio references were blocked for account privacy.'
                : missingCount > 0
                  ? lang === 'bn'
                    ? `${missingCount}টি লোকাল অডিও রেফারেন্স এই ডিভাইসের IndexedDB-তে পাওয়া যায়নি বা মুছে ফেলা হয়েছে।`
                    : `${missingCount} local audio reference${missingCount === 1 ? ' was' : 's were'} deleted or not retained in this browser's IndexedDB.`
                  : lang === 'bn'
                    ? 'এই সেশনটি টেক্সট-ভিত্তিক হিসেবে সংরক্ষিত হয়েছে — কোনো নকল ওয়েভফর্ম দেখানো হয়নি।'
                    : 'This session was recorded in text mode — no placeholder waveform or simulated playback is shown.'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const progressRatio = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  return (
    <section
      aria-label={lang === 'bn' ? 'অডিও রিপ্লে প্লেয়ার' : 'Communication Replay Audio Player'}
      data-testid="replay-master-audio-player"
      tabIndex={0}
      onKeyDown={handleKeyboard}
      className="rounded-2xl border border-cyan-400/30 bg-[linear-gradient(135deg,rgba(8,16,49,0.96)_0%,rgba(14,19,58,0.96)_100%)] p-4 sm:p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
    >
      {/* Hidden native audio element driving real playback */}
      <audio
        ref={audioRef}
        src={objectUrl ?? undefined}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration) && el.duration > 0) {
            setDuration(el.duration);
          }
          el.playbackRate = playbackRate;
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={() => {
          setIsPlaying(false);
          setAudioError(
            lang === 'bn'
              ? 'অডিও ফাইলটি প্লে করা যায়নি, তবে ট্রান্সক্রিপ্ট সম্পূর্ণ সচল রয়েছে।'
              : 'Unable to play this audio recording. Transcript review remains fully available.'
          );
        }}
      />

      {/* Top Metadata + Multi-Turn Recording Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-300">
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? `সংরক্ষিত রেকর্ডিং · ধাপ #${String(activeTrack.turn.turnIndex).padStart(2, '0')}`
                : `Authorized Recording · Turn #${String(activeTrack.turn.turnIndex).padStart(2, '0')}`}
            </span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-[11px] text-slate-400">
            {waveformStatus === 'measured'
              ? lang === 'bn'
                ? 'প্রকৃত অডিও ওয়েভফর্ম (Web Audio)'
                : 'Measured audio waveform'
              : lang === 'bn'
                ? 'নিরপেক্ষ প্লেব্যাক টাইমলাইন'
                : 'Neutral playback timeline'}
          </span>
        </div>

        {availableTracks.length > 1 && (
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Select recorded turn">
            {availableTracks.map((track) => {
              const active = track.turn.id === activeTrack.turn.id;
              return (
                <button
                  key={track.turn.id}
                  type="button"
                  onClick={() => {
                    setSelectedTurnId(track.turn.id);
                    onSelectAudioTurn(track.turn.id);
                  }}
                  aria-pressed={active}
                  className={`rounded-lg px-2 py-1 font-mono text-[11px] font-semibold tabular-nums transition-colors cursor-pointer ${
                    active
                      ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                      : 'border border-slate-800 bg-[#050A22] text-slate-400 hover:text-white'
                  }`}
                >
                  #{String(track.turn.turnIndex).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Real Measured Waveform Canvas OR Honest Neutral Scrubber */}
      <div className="mt-3.5">
        {waveformStatus === 'measured' && waveformPeaks.length > 0 ? (
          <div
            data-testid="replay-measured-waveform"
            role="group"
            aria-label={lang === 'bn' ? 'অডিও ওয়েভফর্ম স্ক্রাবার' : 'Interactive audio waveform scrubber'}
            className="flex h-14 w-full items-center gap-[3px] rounded-xl border border-slate-800/90 bg-[#050A22] px-3 py-2"
          >
            {waveformPeaks.map((peak, idx) => {
              const barRatio = (idx + 0.5) / waveformPeaks.length;
              const isPlayed = barRatio <= progressRatio;
              const barTime = barRatio * duration;
              const heightPercent = Math.round(Math.max(14, peak * 100));
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => seekTo(barTime)}
                  aria-label={`Seek to ${formatClock(barTime)}`}
                  style={{ height: `${heightPercent}%` }}
                  className={`flex-1 rounded-full transition-colors cursor-pointer ${
                    isPlayed
                      ? 'bg-[linear-gradient(180deg,#22D3EE_0%,#8B5CF6_100%)]'
                      : 'bg-slate-700/80 hover:bg-cyan-400/50'
                  }`}
                />
              );
            })}
          </div>
        ) : (
          <div
            data-testid="replay-neutral-timeline"
            className="rounded-xl border border-slate-800/90 bg-[#050A22] px-3.5 py-3"
          >
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(currentTime, duration || 1)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label={lang === 'bn' ? 'অডিও সময় স্ক্রাবার' : 'Seek audio playback position'}
              aria-valuetext={`${formatClock(currentTime)} of ${formatClock(duration)}`}
              className="h-2 w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Transport Controls, Time Readout & Speeds (0.75x - 2x) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => seekTo(currentTime - 5)}
            aria-label={lang === 'bn' ? '৫ সেকেন্ড পেছনে যান' : 'Rewind 5 seconds'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#050A22] text-slate-300 hover:border-cyan-400/50 hover:text-white cursor-pointer"
          >
            <Rewind className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => void togglePlay()}
            data-testid="replay-audio-play-toggle"
            aria-label={
              isPlaying
                ? lang === 'bn'
                  ? 'অডিও বিরতি দিন'
                  : 'Pause recording'
                : lang === 'bn'
                  ? 'অডিও চালান'
                  : 'Play recording'
            }
            className="lv-portal-btn inline-flex h-10 w-10 items-center justify-center rounded-xl text-white cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4 translate-x-0.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => seekTo(currentTime + 5)}
            aria-label={lang === 'bn' ? '৫ সেকেন্ড সামনে যান' : 'Forward 5 seconds'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#050A22] text-slate-300 hover:border-cyan-400/50 hover:text-white cursor-pointer"
          >
            <FastForward className="h-4 w-4" aria-hidden="true" />
          </button>

          <span
            data-testid="replay-audio-clock"
            className="ml-1 font-mono text-xs text-slate-200 tabular-nums"
          >
            {formatClock(currentTime)} <span className="text-slate-500">/</span> {formatClock(duration)}
          </span>
        </div>

        <div
          role="group"
          aria-label={lang === 'bn' ? 'প্লেব্যাক গতি' : 'Playback speed controls'}
          className="flex flex-wrap items-center gap-1"
        >
          {SPEED_OPTIONS.map((rate) => {
            const active = playbackRate === rate;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                aria-pressed={active}
                data-testid={`replay-speed-${rate}`}
                className={`rounded-lg px-2 py-1 font-mono text-[11px] font-semibold tabular-nums transition-colors cursor-pointer ${
                  active
                    ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                    : 'border border-slate-800 bg-[#050A22] text-slate-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            );
          })}
        </div>
      </div>

      {audioError && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-200"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
          <span>{audioError}</span>
        </div>
      )}
    </section>
  );
}
