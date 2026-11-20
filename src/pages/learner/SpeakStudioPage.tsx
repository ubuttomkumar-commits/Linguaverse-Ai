import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Clock,
  History,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { PressureLadderSelector } from '../../components/shared/PressureLadderSelector';
import { TurnEvaluationCard } from '../../components/speaking/TurnEvaluationCard';
import { CommunicationReplayPanel } from '../../components/speaking/CommunicationReplayPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  getPressureLevelConfig,
  getSpeakingScenario,
  SPEAKING_SCENARIOS,
} from '../../domain/speakingScenarios';
import {
  fetchSpeakingHealth,
  requestSpeakingEvaluation,
  SpeakingClientError,
  type SpeakingHealthResponse,
} from '../../services/speakingApi';
import { saveAudioBlob } from '../../utils/audioBlobStore';
import {
  classifyMicError,
  getSpeechRecognitionConstructor,
  isMediaRecorderSupported,
  isSpeechRecognitionSupported,
  pickSupportedAudioMimeType,
  type BrowserSpeechRecognition,
} from '../../utils/voiceRecorder';
import {
  speakEnglishExample,
  stopSpeaking,
  type PlaybackSpeed,
} from '../../utils/speechSynthesis';
import type {
  SpeakingInputChannel,
  SpeakingModeId,
  SpeakingPressureLevel,
  SpeakingTurnRecord,
} from '../../types/domain';

type StudioTab = 'studio' | 'replay';

function generateClientId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function SpeakStudioPage() {
  const { lang, t } = useLanguage();
  const { profile, speakingSessions, saveSpeakingSession } = useAuth();

  const explanationPref = profile?.explanationLanguage ?? 'both';
  const learnerLevel = profile?.selfEstimatedLevel ?? 'A2';

  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const [selectedMode, setSelectedMode] = useState<SpeakingModeId>('daily_conversations');
  const [selectedPressure, setSelectedPressure] =
    useState<SpeakingPressureLevel>('level_2_guided');
  const [autoSpeakAi, setAutoSpeakAi] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [serverHealth, setServerHealth] = useState<SpeakingHealthResponse | null>(null);

  // Active conversation session state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionStartedAt, setSessionStartedAt] = useState<string>('');
  const [turns, setTurns] = useState<SpeakingTurnRecord[]>([]);
  const [sessionXpAwardedAmount, setSessionXpAwardedAmount] = useState<number>(0);
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false);

  // Mic privacy consent & voice capture state
  const [micConsentGranted, setMicConsentGranted] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [draftTranscript, setDraftTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [capturedAudioBlob, setCapturedAudioBlob] = useState<Blob | null>(null);
  const [capturedAudioUrl, setCapturedAudioUrl] = useState<string | null>(null);
  const [capturedAudioDuration, setCapturedAudioDuration] = useState<number>(0);
  const [usedVoiceThisTurn, setUsedVoiceThisTurn] = useState(false);
  const [editedTranscriptManually, setEditedTranscriptManually] = useState(false);

  // Time-limited pressure countdown
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [turnTimedOut, setTurnTimedOut] = useState(false);

  // Evaluation & error state (always preserves user recording & transcript!)
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartMsRef = useRef<number>(0);
  const turnStartMsRef = useRef<number>(0);

  const scenario = useMemo(() => getSpeakingScenario(selectedMode), [selectedMode]);
  const pressureConfig = useMemo(
    () => getPressureLevelConfig(selectedPressure),
    [selectedPressure]
  );

  const currentAiPrompt =
    turns.length > 0
      ? turns[turns.length - 1].evaluation.ai_reply
      : scenario.openingPromptEn;

  const currentAiPromptBnHint =
    turns.length > 0
      ? turns[turns.length - 1].evaluation.ai_reply_bn_hint
      : scenario.openingPromptBnHint;

  const mediaRecorderAvailable = isMediaRecorderSupported();
  const speechRecAvailable = isSpeechRecognitionSupported();

  // Check server-side Gemini readiness on mount
  useEffect(() => {
    let active = true;
    fetchSpeakingHealth()
      .then((res) => {
        if (active) setServerHealth(res);
      })
      .catch(() => {
        if (active) setServerHealth({ ok: false, configured: false, model: 'gemini-4-hydrogen' });
      });
    return () => {
      active = false;
    };
  }, []);

  // Cleanup audio URLs, streams, and TTS on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      try {
        speechRecRef.current?.abort();
      } catch {
        // Ignore cleanup errors
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (capturedAudioUrl) {
        URL.revokeObjectURL(capturedAudioUrl);
      }
    };
  }, [capturedAudioUrl]);

  // Countdown timer for Time-Limited Pressure Mode
  useEffect(() => {
    if (!sessionActive || pressureConfig.timeLimitSeconds === null || isEvaluating) {
      return;
    }
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setTurnTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sessionActive, pressureConfig.timeLimitSeconds, isEvaluating, remainingSeconds]);

  const clearTurnDraft = () => {
    setDraftTranscript('');
    setInterimTranscript('');
    if (capturedAudioUrl) {
      URL.revokeObjectURL(capturedAudioUrl);
    }
    setCapturedAudioBlob(null);
    setCapturedAudioUrl(null);
    setCapturedAudioDuration(0);
    setUsedVoiceThisTurn(false);
    setEditedTranscriptManually(false);
    setMicError(null);
    setApiError(null);
    setTurnTimedOut(false);
    turnStartMsRef.current = Date.now();
    setRemainingSeconds(pressureConfig.timeLimitSeconds);
  };

  const speakPrompt = (text: string) => {
    setIsSpeakingPrompt(true);
    const started = speakEnglishExample({
      text,
      rate: playbackSpeed,
      onEnd: () => setIsSpeakingPrompt(false),
      onError: () => setIsSpeakingPrompt(false),
    });
    if (!started) setIsSpeakingPrompt(false);
  };

  const handleStartSession = () => {
    stopSpeaking();
    const newSessionId = generateClientId('spk');
    const startedIso = new Date().toISOString();
    setSessionId(newSessionId);
    setSessionStartedAt(startedIso);
    setTurns([]);
    setSessionXpAwardedAmount(0);
    setSessionActive(true);
    setActiveTab('studio');
    setShowPrivacyBanner(!micConsentGranted);
    clearTurnDraft();
    setRemainingSeconds(pressureConfig.timeLimitSeconds);

    if (autoSpeakAi) {
      speakPrompt(scenario.openingPromptEn);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      speechRecRef.current?.stop();
    } catch {
      // Ignore already-stopped recognition
    }
    speechRecRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Ignore stop errors
      }
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startVoiceCapture = async () => {
    setMicError(null);
    setApiError(null);
    stopSpeaking();
    setIsSpeakingPrompt(false);

    if (!mediaRecorderAvailable) {
      const classified = classifyMicError(new DOMException('NotSupportedError', 'NotSupportedError'));
      setMicError(lang === 'bn' ? classified.messageBn : classified.messageEn);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = pickSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recordingStartMsRef.current = Date.now();
      setRecordingSeconds(0);

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const elapsedSec = Math.max(
          1,
          Math.round((Date.now() - recordingStartMsRef.current) / 1000)
        );
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType ?? 'audio/webm',
        });

        if (blob.size === 0) {
          setMicError(
            lang === 'bn'
              ? 'কোনো অডিও পাওয়া যায়নি। আবার চেষ্টা করুন অথবা নিচের বক্সে টাইপ করুন।'
              : 'Recorded audio was empty. Try speaking closer to the mic or use the text input below.'
          );
          return;
        }

        const nextUrl = URL.createObjectURL(blob);
        setCapturedAudioBlob(blob);
        setCapturedAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });
        setCapturedAudioDuration(elapsedSec);
        setUsedVoiceThisTurn(true);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setShowPrivacyBanner(false);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartMsRef.current) / 1000));
      }, 500);

      // Start browser Web Speech Recognition in parallel if supported
      const SpeechRecCtor = getSpeechRecognitionConstructor();
      if (SpeechRecCtor) {
        try {
          const rec = new SpeechRecCtor();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event) => {
            let finalAppend = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i];
              const chunk = res[0]?.transcript ?? '';
              if (res.isFinal) {
                finalAppend += `${chunk} `;
              } else {
                interim += chunk;
              }
            }
            if (finalAppend.trim()) {
              setDraftTranscript((prev) =>
                prev.trim() ? `${prev.trim()} ${finalAppend.trim()}` : finalAppend.trim()
              );
            }
            setInterimTranscript(interim.trim());
          };

          rec.onerror = (event) => {
            if (event.error === 'not-allowed') {
              setMicError(
                lang === 'bn'
                  ? 'স্পিচ রিকগনিশন অনুমতি পায়নি — আপনার অডিও রেকর্ড হচ্ছে, চাইলে নিজে টেক্সট লিখতে পারবেন।'
                  : 'Speech recognition was blocked — your audio is still recording, and you can type or edit your transcript below.'
              );
            }
          };

          rec.onend = () => {
            setInterimTranscript('');
          };

          rec.start();
          speechRecRef.current = rec;
        } catch {
          // Graceful fallback: MediaRecorder continues capturing audio even if STT fails to start
        }
      }
    } catch (err) {
      const classified = classifyMicError(err);
      setMicError(lang === 'bn' ? classified.messageBn : classified.messageEn);
      setIsRecording(false);
    }
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      handleStopRecording();
      return;
    }
    if (!micConsentGranted) {
      setShowPrivacyBanner(true);
      return;
    }
    void startVoiceCapture();
  };

  const handleConsentAndRecord = () => {
    setMicConsentGranted(true);
    setShowPrivacyBanner(false);
    void startVoiceCapture();
  };

  const handleEvaluateTurn = async () => {
    if (isRecording) {
      handleStopRecording();
    }

    const combinedTranscript = `${draftTranscript} ${interimTranscript}`.trim();
    if (!combinedTranscript) {
      setApiError(
        lang === 'bn'
          ? 'মূল্যায়নের আগে অনুগ্রহ করে কথা বলুন অথবা আপনার ইংরেজি উত্তরটি টাইপ করুন।'
          : 'Please record your voice or type an English response before evaluating.'
      );
      return;
    }

    setApiError(null);
    setIsEvaluating(true);

    const inputChannel: SpeakingInputChannel = !usedVoiceThisTurn
      ? 'text_fallback'
      : editedTranscriptManually
        ? 'voice_with_manual_edit'
        : 'voice_stt';

    const history = [
      { role: 'ai' as const, text: scenario.openingPromptEn },
      ...turns.flatMap((turn) => [
        { role: 'user' as const, text: turn.userTranscript },
        { role: 'ai' as const, text: turn.evaluation.ai_reply },
      ]),
    ];

    const allowMicStorage = profile?.privacyConsent?.storeMicRecordings !== false;
    const allowAiTelemetry = profile?.privacyConsent?.logAiEvaluations !== false;

    try {
      const { evaluation } = await requestSpeakingEvaluation(
        {
          modeId: selectedMode,
          pressureLevel: selectedPressure,
          userTranscript: combinedTranscript,
          inputChannel,
          learnerLevel,
          explanationLanguage: explanationPref,
          history,
          timedOut: turnTimedOut,
        },
        {
          logTelemetry: allowAiTelemetry,
          userId: profile?.userId,
        }
      );

      const turnId = generateClientId('turn');
      let audioBlobKey: string | undefined;
      if (allowMicStorage && capturedAudioBlob && capturedAudioBlob.size > 0) {
        audioBlobKey = `audio_${sessionId}_${turnId}`;
        await saveAudioBlob(audioBlobKey, capturedAudioBlob);
      }

      const responseTimeSeconds = Math.max(
        1,
        Math.round((Date.now() - turnStartMsRef.current) / 1000)
      );

      const newTurn: SpeakingTurnRecord = {
        id: turnId,
        turnNumber: turns.length + 1,
        promptShown: currentAiPrompt,
        userTranscript: combinedTranscript,
        inputChannel,
        audioBlobKey,
        audioDurationSeconds: capturedAudioDuration || undefined,
        responseTimeSeconds,
        timedOut: turnTimedOut,
        evaluation,
        createdAt: new Date().toISOString(),
      };

      const nextTurns = [...turns, newTurn];
      setTurns(nextTurns);

      const sessionDurationSec = Math.max(
        10,
        Math.round((Date.now() - new Date(sessionStartedAt).getTime()) / 1000)
      );

      // Persist session + auto-sync mistakes into Mistake Memory + award idempotent XP
      const savedResult = await saveSpeakingSession({
        sessionId,
        modeId: selectedMode,
        pressureLevel: selectedPressure,
        startedAt: sessionStartedAt,
        updatedAt: new Date().toISOString(),
        durationSeconds: sessionDurationSec,
        turns: nextTurns,
        newlyEvaluatedTurnId: newTurn.id,
      });

      if (savedResult.newlyAwardedXp.length > 0) {
        const added = savedResult.newlyAwardedXp.reduce((sum, e) => sum + e.xpEarned, 0);
        setSessionXpAwardedAmount((prev) => prev + added);
      }

      clearTurnDraft();

      if (autoSpeakAi) {
        speakPrompt(evaluation.ai_reply);
      }
    } catch (err) {
      // CRITICAL: Never clear capturedAudioBlob or draftTranscript on error!
      const msg =
        err instanceof SpeakingClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to reach AI evaluator. Your recording is safely preserved — please retry.';
      setApiError(msg);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleEndSessionToReplay = () => {
    handleStopRecording();
    stopSpeaking();
    setSessionActive(false);
    setActiveTab('replay');
  };

  return (
    <LearnerShell
      title={t.workspace.modules.speakTitle}
      subtitle={
        lang === 'bn'
          ? 'ভয়েস-প্রথম AI কথোপকথন, বাংলা ব্যাখ্যাসহ তাৎক্ষণিক মূল্যায়ন ও Communication Replay'
          : 'Voice-first AI speaking practice with Gemini feedback, Bangla explanations, and Replay.'
      }
    >
      {/* Top Workspace Bar: Studio vs Replay Tabs + Audio Controls */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Speaking studio views"
          className="inline-flex items-center rounded-lg border border-slate-800 bg-[#111827] p-1 self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'studio'}
            onClick={() => setActiveTab('studio')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'studio'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'লাইভ স্পিকিং স্টুডিও' : 'Live Speaking Studio'}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'replay'}
            onClick={() => {
              handleStopRecording();
              stopSpeaking();
              setActiveTab('replay');
            }}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'replay'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? `Communication Replay (${speakingSessions.length})`
                : `Communication Replay (${speakingSessions.length})`}
            </span>
          </button>
        </div>

        {/* TTS Speed & Auto-Speak Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            aria-pressed={autoSpeakAi}
            onClick={() => setAutoSpeakAi((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors whitespace-nowrap cursor-pointer ${
              autoSpeakAi
                ? 'border-[#3B82F6]/50 bg-[#3B82F6]/15 text-blue-200'
                : 'border-slate-800 bg-[#111827] text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoSpeakAi ? (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {lang === 'bn'
                ? autoSpeakAi
                  ? 'AI ভয়েস চালু'
                  : 'AI ভয়েস বন্ধ'
                : autoSpeakAi
                  ? 'AI Voice On'
                  : 'AI Voice Muted'}
            </span>
          </button>

          <div
            role="group"
            aria-label="AI voice playback speed"
            className="inline-flex items-center rounded-lg border border-slate-800 bg-[#111827] p-0.5"
          >
            {([0.75, 1.0] as PlaybackSpeed[]).map((rate) => (
              <button
                key={rate}
                type="button"
                aria-pressed={playbackSpeed === rate}
                onClick={() => setPlaybackSpeed(rate)}
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                  playbackSpeed === rate
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {rate === 0.75 ? '0.75x' : '1.0x'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notice if server GEMINI_API_KEY is not configured yet */}
      {serverHealth && !serverHealth.configured && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-4 text-xs leading-relaxed text-amber-200 sm:text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <span>
            {lang === 'bn'
              ? 'সার্ভারে GEMINI_API_KEY এখনো সেট করা নেই। লাইভ AI মূল্যায়ন চালু করতে AI Studio-এর Settings > Secrets প্যানেলে GEMINI_API_KEY যুক্ত করুন।'
              : 'GEMINI_API_KEY is not yet configured on the server. Add your Gemini API key in Settings > Secrets to run live AI Speaking evaluations.'}
          </span>
        </div>
      )}

      {/* TAB 2: Communication Replay */}
      {activeTab === 'replay' ? (
        <CommunicationReplayPanel
          sessions={speakingSessions}
          explanationPref={explanationPref}
          playbackSpeed={playbackSpeed}
          onStartNewSession={() => setActiveTab('studio')}
        />
      ) : !sessionActive ? (
        /* TAB 1A: Scenario & Pressure Level Selector */
        <div className="space-y-6">
          {/* Step 1: Choose Conversation Mode (7 Modes) */}
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
            <div className="border-b border-slate-800 pb-4">
              <p className="font-mono text-xs text-[#3B82F6]">
                {lang === 'bn' ? 'ধাপ ০১ · কথোপকথনের বিষয় নির্বাচন' : 'Step 01 · Select Conversation Mode'}
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">
                {lang === 'bn'
                  ? '৭টি বাস্তব পরিস্থিতির যেকোনো একটি বেছে নিন'
                  : 'Choose from 7 Real-World Speaking Scenarios'}
              </h2>
            </div>

            <div
              role="radiogroup"
              aria-label="Conversation mode"
              className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {SPEAKING_SCENARIOS.map((item, idx) => {
                const selected = selectedMode === item.id;
                const isLastCard = idx === SPEAKING_SCENARIOS.length - 1;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedMode(item.id)}
                    className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                      isLastCard ? 'sm:col-span-2 lg:col-span-3 lg:flex-row lg:items-center lg:gap-6' : ''
                    } ${
                      selected
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                        : 'border-slate-800 bg-[#0A0F1C] hover:border-slate-700'
                    }`}
                  >
                    <div className={isLastCard ? 'lg:flex-1' : ''}>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono text-slate-400">{item.cefrFit}</span>
                        {selected && (
                          <span className="font-semibold text-[#3B82F6]">
                            {lang === 'bn' ? 'নির্বাচিত' : 'Selected'}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold text-white">
                        {lang === 'bn' ? item.titleBn : item.titleEn}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {lang === 'bn' ? item.subtitleBn : item.subtitleEn}
                      </p>
                    </div>
                    <p
                      className={`mt-3 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-500 ${
                        isLastCard ? 'lg:mt-0 lg:w-72 lg:shrink-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5' : ''
                      }`}
                    >
                      {lang === 'bn' ? item.aiPersonaBn : item.aiPersonaEn}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Select 5-Level Pressure Ladder Tier */}
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
            <div className="border-b border-slate-800 pb-4">
              <p className="font-mono text-xs text-[#8B5CF6]">
                {lang === 'bn'
                  ? 'ধাপ ০২ · ৫-স্তরের প্রেসার ল্যাডার (Pressure Ladder)'
                  : 'Step 02 · 5-Level Pressure Ladder'}
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">
                {lang === 'bn'
                  ? 'নিয়ন্ত্রিত টেমপ্লেট থেকে উচ্চচাপের সময়সীমা সিমুলেশন বেছে নিন'
                  : 'Choose Your Support & Pressure Level (Levels 1 – 5)'}
              </h2>
            </div>

            <div className="mt-5">
              <PressureLadderSelector
                value={selectedPressure}
                onChange={setSelectedPressure}
                context="speaking"
              />
            </div>

            {/* Opening Prompt Preview & Launch */}
            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0A0F1C] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400">
                  {lang === 'bn' ? 'প্রথম প্রশ্ন (Opening Prompt Preview)' : 'Opening Prompt Preview'}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
                  “{scenario.openingPromptEn}”
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartSession}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>{lang === 'bn' ? 'কথোপকথন শুরু করুন' : 'Start Speaking Session'}</span>
              </button>
            </div>
          </section>
        </div>
      ) : (
        /* TAB 1B: Live Active Speaking Session */
        <div className="space-y-6">
          {/* Active Session Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] px-5 py-4">
            <div>
              <p className="font-mono text-xs text-[#3B82F6]">
                {lang === 'bn' ? pressureConfig.titleBn : pressureConfig.titleEn} ·{' '}
                {lang === 'bn' ? `${turns.length} ধাপ সম্পন্ন` : `${turns.length} turns completed`}
              </p>
              <h2 className="mt-0.5 text-base font-bold text-white sm:text-lg">
                {lang === 'bn' ? scenario.titleBn : scenario.titleEn}
              </h2>
              {sessionXpAwardedAmount > 0 && (
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#F59E0B] tabular-nums">
                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {lang === 'bn'
                      ? `+${sessionXpAwardedAmount} যাচাইকৃত XP লেজারে যুক্ত হয়েছে (প্রতি সেশনে একবার)`
                      : `+${sessionXpAwardedAmount} Verified XP logged to XP Ledger (idempotent per session)`}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {turns.length > 0 && (
                <button
                  type="button"
                  onClick={handleEndSessionToReplay}
                  className="rounded-lg border border-[#3B82F6]/50 bg-[#3B82F6]/15 px-3.5 py-2 text-xs font-semibold text-blue-200 hover:bg-[#3B82F6]/25 transition-colors cursor-pointer"
                >
                  {lang === 'bn'
                    ? 'শেষ করুন ও রিপ্লে দেখুন'
                    : 'Finish & Open Replay'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleStopRecording();
                  stopSpeaking();
                  setSessionActive(false);
                }}
                className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                {lang === 'bn' ? 'দৃশ্যপট বদলান' : 'Change Mode'}
              </button>
            </div>
          </div>

          {/* Current AI Prompt Card */}
          <section className="rounded-xl border border-[#3B82F6]/40 bg-[#111827] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? scenario.aiPersonaBn : scenario.aiPersonaEn}
                  </span>
                </p>
                <p className="mt-2 text-base font-medium leading-relaxed text-white sm:text-lg">
                  {currentAiPrompt}
                </p>
                {(explanationPref === 'bn' || explanationPref === 'both') && (
                  <p className="font-bn mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    {currentAiPromptBnHint}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isSpeakingPrompt) {
                    stopSpeaking();
                    setIsSpeakingPrompt(false);
                  } else {
                    speakPrompt(currentAiPrompt);
                  }
                }}
                className={`inline-flex items-center gap-1.5 self-start rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSpeakingPrompt
                    ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                    : 'border-slate-700 bg-[#0A0F1C] text-slate-200 hover:border-[#3B82F6] hover:text-white'
                }`}
              >
                {isSpeakingPrompt ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'থামান' : 'Stop Audio'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'আবার শুনুন' : 'Replay Prompt'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Level 1 Templates OR Level 2 Bullet Cues */}
            {pressureConfig.showTemplates ? (
              <div className="mt-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
                <p className="text-xs font-semibold text-[#8B5CF6]">
                  {lang === 'bn'
                    ? 'লেভেল ১ টেমপ্লেট (Controlled Practice Templates)'
                    : 'Level 1 Sentence Templates'}
                </p>
                <ul className="mt-2 space-y-1 text-xs font-mono text-slate-200">
                  {scenario.guidedHintsEn.map((hint, idx) => (
                    <li key={idx}>
                      {idx + 1}. {hint}
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 border-t border-slate-800 pt-2 space-y-1">
                  {scenario.guidedHintsBn.map((bnHint, idx) => (
                    <p key={idx} className="font-bn text-xs text-slate-400">
                      {bnHint}
                    </p>
                  ))}
                </div>
              </div>
            ) : pressureConfig.showHints ? (
              <div className="mt-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
                <p className="text-xs font-semibold text-[#8B5CF6]">
                  {lang === 'bn'
                    ? 'লেভেল ২ বুলেট কিউ (Guided Conversation Cues)'
                    : 'Level 2 Bullet-Point Cues'}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {scenario.guidedHintsEn.map((hint, idx) => (
                    <li key={idx}>• {hint}</li>
                  ))}
                </ul>
              </div>
            ) : pressureConfig.introducesTwist ? (
              <div className="mt-4 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-2.5 text-xs text-amber-200">
                <span className="font-semibold">
                  {lang === 'bn' ? 'লেভেল ৪ অপ্রত্যাশিত টুইস্ট সক্রিয়:' : 'Level 4 Unexpected Twist Active:'}
                </span>{' '}
                {lang === 'bn'
                  ? 'কোনো হিন্ট নেই — প্রতিটি উত্তরের পর AI হঠাৎ নতুন একটি পাল্টা প্রশ্ন বা শর্ত জুড়ে দেবে।'
                  : 'Zero hints — the AI will introduce an unexpected follow-up twist in its reply for you to adapt on the spot.'}
              </div>
            ) : null}

            {/* Time-Limited Pressure Bar */}
            {pressureConfig.timeLimitSeconds !== null && remainingSeconds !== null && (
              <div
                className={`mt-4 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs ${
                  remainingSeconds <= 10
                    ? 'border-[#F59E0B]/50 bg-[#F59E0B]/10 text-amber-200'
                    : 'border-slate-800 bg-[#0A0F1C] text-slate-300'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {turnTimedOut
                      ? lang === 'bn'
                        ? '৪৫ সেকেন্ড শেষ — তবুও আপনার উত্তর জমা দিতে পারবেন'
                        : '45s timer finished — you can still submit your response'
                      : lang === 'bn'
                        ? 'সময়সীমা চাপ মোড সক্রিয়'
                        : 'Time-limited response active'}
                  </span>
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  00:{String(remainingSeconds).padStart(2, '0')}
                </span>
              </div>
            )}
          </section>

          {/* Privacy Consent Banner before activating Microphone */}
          {showPrivacyBanner && !micConsentGranted && (
            <section
              aria-label="Microphone privacy consent"
              className="rounded-xl border border-[#3B82F6]/45 bg-[#111827] p-5"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#3B82F6]"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'bn'
                      ? 'মাইক্রোফোন গোপনীয়তা সম্মতি (Privacy Consent)'
                      : 'Microphone Privacy Consent'}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                    {lang === 'bn'
                      ? 'আপনার কণ্ঠস্বরের অডিও শুধুমাত্র আপনার নিজের ব্রাউজারের IndexedDB-তে সংরক্ষিত হয় যাতে আপনি Communication Replay-তে নিজের ভয়েস শুনতে পারেন। AI মূল্যায়নের জন্য কেবল টেক্সট ট্রান্সক্রিপ্ট পাঠানো হয়। মাইক্রোফোন ছাড়াই নিচে টাইপ করেও অনুশীলন করতে পারবেন।'
                      : 'Your voice recording is stored locally in your browser (IndexedDB) for your own Communication Replay review. Only the transcribed text is sent to our server-side Gemini evaluator for feedback. You can also use text input anytime without enabling the microphone.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleConsentAndRecord}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
                    >
                      <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {lang === 'bn'
                          ? 'সম্মতি দিন ও রেকর্ডিং শুরু করুন'
                          : 'I Consent — Activate Microphone'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPrivacyBanner(false)}
                      className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {lang === 'bn'
                        ? 'টেক্সট ইনপুট ব্যবহার করব'
                        : 'Use Text Input Instead'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Voice Recording & Text Fallback Console */}
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isEvaluating}
                  onClick={handleMicButtonClick}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                    isRecording
                      ? 'bg-rose-600 text-white hover:bg-rose-500'
                      : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>
                        {lang === 'bn'
                          ? `রেকর্ডিং থামান (00:${String(recordingSeconds).padStart(2, '0')})`
                          : `Stop Recording (00:${String(recordingSeconds).padStart(2, '0')})`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {lang === 'bn' ? 'কথা বলুন (মাইক্রোফোন)' : 'Record Voice Response'}
                      </span>
                    </>
                  )}
                </button>

                {!speechRecAvailable && (
                  <span className="text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'লাইভ STT এই ব্রাউজারে অনুপস্থিত — অডিও রেকর্ড করে নিচে টেক্সট লিখুন।'
                      : 'Browser live Speech-to-Text unavailable — record audio and type your transcript below.'}
                  </span>
                )}
              </div>

              {capturedAudioBlob && (
                <span className="font-mono text-xs text-emerald-400 tabular-nums">
                  {lang === 'bn'
                    ? `অডিও সংরক্ষিত (${capturedAudioDuration}s)`
                    : `Audio captured (${capturedAudioDuration}s)`}
                </span>
              )}
            </div>

            {/* Mic Error Notice */}
            {micError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3.5 text-xs leading-relaxed text-amber-200"
              >
                <MicOff className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
                <span>{micError}</span>
              </div>
            )}

            {/* Self-Review Audio Preview (Preserved even if API errors occur) */}
            {capturedAudioUrl && (
              <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
                <p className="mb-1.5 text-xs font-medium text-slate-300">
                  {lang === 'bn'
                    ? 'জমা দেওয়ার আগে আপনার রেকর্ডকৃত ভয়েস শুনুন'
                    : 'Self-review your recorded audio before submitting'}
                </p>
                <audio
                  controls
                  src={capturedAudioUrl}
                  aria-label="Preview your current voice recording"
                  className="h-9 w-full"
                />
              </div>
            )}

            {/* Live Transcript + Full Text-Input Fallback */}
            <div>
              <label
                htmlFor="speaking-transcript-input"
                className="block text-xs font-medium text-slate-300"
              >
                {lang === 'bn'
                  ? 'আপনার উত্তর (লাইভ ট্রান্সক্রিপ্ট অথবা সরাসরি ইংরেজিতে টাইপ করুন)'
                  : 'Your Spoken Transcript or Text Fallback Input'}
              </label>
              <textarea
                id="speaking-transcript-input"
                rows={3}
                disabled={isEvaluating}
                value={
                  interimTranscript
                    ? `${draftTranscript}${draftTranscript ? ' ' : ''}${interimTranscript}`
                    : draftTranscript
                }
                onChange={(e) => {
                  setInterimTranscript('');
                  setDraftTranscript(e.target.value);
                  if (usedVoiceThisTurn) {
                    setEditedTranscriptManually(true);
                  }
                }}
                placeholder={
                  lang === 'bn'
                    ? 'মাইক্রোফোনে কথা বলুন অথবা এখানে সরাসরি আপনার ইংরেজি উত্তর টাইপ করুন (যেমন: "Yesterday I go to market with my friend...")'
                    : 'Speak into your microphone or type your English reply directly here (e.g., "Yesterday I go to market with my friend...")'
                }
                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none disabled:opacity-60"
              />
            </div>

            {/* Robust API Error Banner with Retry (Preserves Recording & Text) */}
            {apiError && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-lg border border-rose-500/40 bg-rose-950/25 p-4 text-xs text-rose-200 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                    aria-hidden="true"
                  />
                  <span>{apiError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleEvaluateTurn}
                  disabled={isEvaluating}
                  className="inline-flex items-center gap-1.5 self-start rounded-lg border border-rose-400/50 bg-rose-900/40 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800/60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'আবার চেষ্টা করুন' : 'Retry Evaluation'}</span>
                </button>
              </div>
            )}

            {/* Submit Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'প্রতিটি মূল্যায়ন স্বয়ংক্রিয়ভাবে Communication Replay এবং Mistake Memory-তে সংরক্ষিত হয়।'
                  : 'Every evaluated turn is automatically saved to Communication Replay and synced to Mistake Memory.'}
              </p>

              <button
                type="button"
                disabled={isEvaluating || !(draftTranscript.trim() || interimTranscript.trim())}
                onClick={handleEvaluateTurn}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-45 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'Gemini বিশ্লেষণ করছে...' : 'Evaluating with Gemini...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'মূল্যায়ন ও উত্তর নিন' : 'Evaluate & Get AI Reply'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Evaluated Turn History (Newest First so latest feedback is immediately visible) */}
          {turns.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200">
                {lang === 'bn'
                  ? `সেশন বিশ্লেষণ ও ফিডব্যাক (${turns.length} ধাপ)`
                  : `Turn-by-Turn AI Evaluation (${turns.length} turn${turns.length === 1 ? '' : 's'})`}
              </h3>
              {[...turns].reverse().map((turn) => (
                <TurnEvaluationCard
                  key={turn.id}
                  turn={turn}
                  explanationPref={explanationPref}
                  playbackSpeed={playbackSpeed}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </LearnerShell>
  );
}
