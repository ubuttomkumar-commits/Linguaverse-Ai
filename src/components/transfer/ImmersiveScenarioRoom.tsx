import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Play,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  computeObjectiveProgressSummary,
  type PersonalizedAdaptationBrief,
  type TransferUniverseScenario,
} from '../../domain/transferLabUniverseEngine';
import { getPressureLadderTier, PRESSURE_LADDER_TIERS } from '../../domain/pressureLadder';
import {
  requestTransferAudioTranscription,
  requestTransferSessionEvaluation,
  requestTransferSpeechSynthesis,
  requestTransferTurn,
  type TransferHealthResponse,
} from '../../services/transferApi';
import { SpeakingClientError } from '../../services/speakingApi';
import {
  classifyMicError,
  getSpeechRecognitionConstructor,
  isMediaRecorderSupported,
  isSpeechRecognitionSupported,
  pickSupportedAudioMimeType,
  type BrowserSpeechRecognition,
} from '../../utils/voiceRecorder';
import { deleteAudioBlob, getAudioBlob, saveAudioBlob } from '../../utils/audioBlobStore';
import { speakEnglishExample, stopSpeaking } from '../../utils/speechSynthesis';
import type {
  ExplanationLanguage,
  PressureLadderLevelId,
  SelfEstimatedLevel,
  SpeakingInputChannel,
  TransferConversationTurn,
  TransferInteractionMode,
  TransferObjectiveProgress,
  TransferObjectiveStatus,
  TransferRubricEvaluation,
  TransferSessionDraft,
  TransferSessionEvaluationReport,
} from '../../types/domain';

interface ImmersiveScenarioRoomProps {
  userId: string;
  scenario: TransferUniverseScenario;
  initialDraft: TransferSessionDraft;
  learnerLevel: SelfEstimatedLevel;
  explanationLanguage: ExplanationLanguage;
  adaptation: PersonalizedAdaptationBrief;
  health: TransferHealthResponse | null;
  allowMicStorageByProfile: boolean;
  allowTelemetry: boolean;
  onDraftChange: (draft: TransferSessionDraft) => void;
  onSaveAndExit: (draft: TransferSessionDraft) => void;
  onSessionEvaluated: (payload: {
    report: TransferSessionEvaluationReport;
    rubricEvaluation: TransferRubricEvaluation;
    transcript: TransferConversationTurn[];
    pressureLevel: PressureLadderLevelId;
    durationSeconds: number;
    inputChannel: SpeakingInputChannel;
  }) => Promise<void>;
}

const MAX_RECORDING_SECONDS = 90;

const OBJ_STATUS_STYLE: Record<TransferObjectiveStatus, { en: string; bn: string; color: string }> = {
  not_started: { en: 'Not Started', bn: 'শুরু হয়নি', color: 'text-slate-400' },
  in_progress: { en: 'In Progress', bn: 'চলমান', color: 'text-cyan-300' },
  achieved: { en: 'Achieved', bn: 'অর্জিত', color: 'text-emerald-300' },
  partially_achieved: { en: 'Partially Achieved', bn: 'আংশিক অর্জিত', color: 'text-amber-300' },
  not_achieved: { en: 'Not Achieved', bn: 'অর্জিত হয়নি', color: 'text-rose-300' },
  not_evaluated: { en: 'Not Evaluated', bn: 'মূল্যায়িত নয়', color: 'text-slate-400' },
};

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Unable to read recorded audio data.'));
    reader.readAsDataURL(blob);
  });
}

export function ImmersiveScenarioRoom({
  userId,
  scenario,
  initialDraft,
  learnerLevel,
  explanationLanguage,
  adaptation,
  health,
  allowMicStorageByProfile,
  allowTelemetry,
  onDraftChange,
  onSaveAndExit,
  onSessionEvaluated,
}: ImmersiveScenarioRoomProps) {
  const { lang } = useLanguage();

  const [pressureLevel, setPressureLevel] = useState<PressureLadderLevelId>(initialDraft.pressureLevel);
  const [interactionMode, setInteractionMode] = useState<TransferInteractionMode>(
    initialDraft.interactionMode
  );
  const [messages, setMessages] = useState<TransferConversationTurn[]>(initialDraft.messages);
  const [objectives, setObjectives] = useState<TransferObjectiveProgress[]>(initialDraft.objectives);
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState<string>(initialDraft.currentPhaseLabel);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(initialDraft.elapsedSeconds);
  const [draftInput, setDraftInput] = useState<string>(initialDraft.draftInput);
  const [voiceConsentGranted, setVoiceConsentGranted] = useState<boolean>(
    initialDraft.voiceConsentGranted
  );
  const [retainAudioConsent, setRetainAudioConsent] = useState<boolean>(
    initialDraft.retainAudioConsent && allowMicStorageByProfile
  );

  // UI helper states
  const [showPhrases, setShowPhrases] = useState(
    pressureLevel === 'level_1_controlled' || pressureLevel === 'level_2_guided'
  );
  const [showBnHints, setShowBnHints] = useState<Record<string, boolean>>({});
  const [isSendingTurn, setIsSendingTurn] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [conversationShouldWrap, setConversationShouldWrap] = useState(false);

  // TTS playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [ttsNotice, setTtsNotice] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice recording & transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatusNote, setVoiceStatusNote] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [pendingAudioBlobKey, setPendingAudioBlobKey] = useState<string | null>(null);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingTranscriptionSource, setPendingTranscriptionSource] = useState<
    'gemini_transcribe' | 'browser_stt' | 'manual_text'
  >('manual_text');
  const [pendingAudioDuration, setPendingAudioDuration] = useState<number | undefined>(undefined);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const browserSttTranscriptRef = useRef<string>('');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRafRef = useRef<number>(0);
  const recordTimerRef = useRef<number>(0);
  const recordStartMsRef = useRef<number>(0);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const activeTier = useMemo(() => getPressureLadderTier(pressureLevel), [pressureLevel]);
  const objSummary = useMemo(() => computeObjectiveProgressSummary(objectives), [objectives]);
  const learnerTurns = useMemo(
    () => messages.filter((m) => m.role === 'learner' && m.text.trim().length > 0),
    [messages]
  );

  // Live session timer
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden && !isEvaluating) {
        setElapsedSeconds((s) => s + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isEvaluating]);

  // Auto-persist draft on key state changes
  const buildCurrentDraft = useCallback(
    (): TransferSessionDraft => ({
      sessionId: initialDraft.sessionId,
      scenarioId: scenario.id,
      pressureLevel,
      interactionMode,
      startedAt: initialDraft.startedAt,
      updatedAt: new Date().toISOString(),
      elapsedSeconds,
      messages,
      objectives,
      currentPhaseLabel,
      draftInput,
      voiceConsentGranted,
      retainAudioConsent,
      adaptationSummaryEn: adaptation.headlineEn,
      adaptationSummaryBn: adaptation.headlineBn,
    }),
    [
      initialDraft.sessionId,
      initialDraft.startedAt,
      scenario.id,
      pressureLevel,
      interactionMode,
      elapsedSeconds,
      messages,
      objectives,
      currentPhaseLabel,
      draftInput,
      voiceConsentGranted,
      retainAudioConsent,
      adaptation.headlineEn,
      adaptation.headlineBn,
    ]
  );

  useEffect(() => {
    onDraftChange(buildCurrentDraft());
  }, [
    messages,
    objectives,
    pressureLevel,
    interactionMode,
    currentPhaseLabel,
    draftInput,
    voiceConsentGranted,
    retainAudioConsent,
    onDraftChange,
    buildCurrentDraft,
  ]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, isSendingTurn]);

  // Cleanup audio streams & playback on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
      }
      window.cancelAnimationFrame(analyserRafRef.current);
      window.clearInterval(recordTimerRef.current);
      if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
    };
  }, [pendingAudioUrl]);

  const stopTtsPlayback = () => {
    stopSpeaking();
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setPlayingMessageId(null);
  };

  const handlePlayAiMessage = async (turn: TransferConversationTurn) => {
    if (playingMessageId === turn.id) {
      stopTtsPlayback();
      return;
    }
    stopTtsPlayback();
    setTtsNotice(null);
    setPlayingMessageId(turn.id);

    // 1. Prefer real server Gemini TTS when configured
    if (health?.ttsConfigured) {
      try {
        const ttsRes = await requestTransferSpeechSynthesis(
          {
            text: turn.text,
            voiceName: 'Kore',
            style: `Natural ${scenario.aiParticipantRoleEn}`,
          },
          { userId, logTelemetry: allowTelemetry }
        );
        const audio = new Audio(`data:${ttsRes.mimeType};base64,${ttsRes.audioBase64}`);
        ttsAudioRef.current = audio;
        audio.onended = () => setPlayingMessageId(null);
        audio.onerror = () => {
          setPlayingMessageId(null);
          setTtsNotice(
            lang === 'bn'
              ? 'অডিও প্লেব্যাক এই ব্রাউজারে চালানো যায়নি।'
              : 'Audio playback could not start in this browser.'
          );
        };
        await audio.play();
        return;
      } catch {
        // Fall through to honest browser speechSynthesis fallback
      }
    }

    // 2. Browser speechSynthesis fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        setPlayingMessageId(null);
        setTtsNotice(
          lang === 'bn'
            ? 'এই ব্রাউজারে কোনো ভয়েস প্যাক পাওয়া যায়নি এবং সার্ভার TTS কনফিগার করা নেই।'
            : 'No browser speech voices are installed and server TTS is unavailable.'
        );
        return;
      }
      speakEnglishExample({
        text: turn.text,
        rate: 1.0,
        onEnd: () => setPlayingMessageId(null),
        onError: () => {
          setPlayingMessageId(null);
          setTtsNotice(
            lang === 'bn' ? 'স্পিচ প্লেব্যাক ব্যর্থ হয়েছে।' : 'Speech playback failed.'
          );
        },
      });
      return;
    }

    setPlayingMessageId(null);
    setTtsNotice(
      lang === 'bn'
        ? 'এই ব্রাউজারে অডিও প্লেব্যাক সমর্থিত নয়।'
        : 'Audio playback is not supported in this browser.'
    );
  };

  const handlePlayStoredTurnAudio = async (blobKey: string) => {
    const blob = await getAudioBlob(blobKey);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    void audio.play();
  };

  const handleDeleteStoredTurnAudio = async (turnId: string, blobKey: string) => {
    await deleteAudioBlob(blobKey);
    setMessages((prev) =>
      prev.map((m) => (m.id === turnId ? { ...m, audioBlobKey: undefined } : m))
    );
  };

  const stopRecordingInternal = useCallback(() => {
    window.clearInterval(recordTimerRef.current);
    window.cancelAnimationFrame(analyserRafRef.current);
    setAudioLevel(0);

    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleStartRecording = async () => {
    setVoiceError(null);
    setVoiceStatusNote(null);

    if (!voiceConsentGranted) {
      setVoiceError(
        lang === 'bn'
          ? 'মাইক্রোফোন ব্যবহারের আগে নিচের সম্মতি নিশ্চিত করুন।'
          : 'Please confirm microphone consent below before recording.'
      );
      return;
    }

    if (!isMediaRecorderSupported() || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError(
        lang === 'bn'
          ? 'এই ব্রাউজারে অডিও রেকর্ডিং সমর্থিত নয়। অনুগ্রহ করে টেক্সট মোড ব্যবহার করুন।'
          : 'Audio recording is unavailable in this browser. Please continue in Text Mode.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Live Web Audio AnalyserNode level meter (zero fake waveforms)
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setAudioLevel(Math.min(100, Math.round(rms * 320)));
          analyserRafRef.current = window.requestAnimationFrame(updateMeter);
        };
        analyserRafRef.current = window.requestAnimationFrame(updateMeter);
      }

      const mimeType = pickSupportedAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      browserSttTranscriptRef.current = '';

      // Optional parallel browser SpeechRecognition as live fallback if server transcription is unavailable
      if (isSpeechRecognitionSupported()) {
        const RecCtor = getSpeechRecognitionConstructor();
        if (RecCtor) {
          try {
            const rec = new RecCtor();
            rec.lang = 'en-US';
            rec.continuous = true;
            rec.interimResults = false;
            rec.onresult = (event) => {
              let combined = '';
              for (let i = 0; i < event.results.length; i++) {
                combined += `${event.results[i][0]?.transcript ?? ''} `;
              }
              browserSttTranscriptRef.current = combined.trim();
            };
            rec.start();
            speechRecRef.current = rec;
          } catch {
            // Browser STT optional
          }
        }
      }

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const durationSec = Math.max(1, Math.round((Date.now() - recordStartMsRef.current) / 1000));
        setPendingAudioDuration(durationSec);
        const finalMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalMime });

        if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
        setPendingAudioUrl(URL.createObjectURL(blob));

        if (retainAudioConsent && allowMicStorageByProfile) {
          const blobKey = `audio_${userId}_${initialDraft.sessionId}_${Date.now()}`;
          await saveAudioBlob(blobKey, blob);
          setPendingAudioBlobKey(blobKey);
        } else {
          setPendingAudioBlobKey(null);
        }

        // Transcribe via server Gemini Transcribe when configured; otherwise use browser STT or honest message
        if (health?.transcriptionConfigured) {
          setIsTranscribing(true);
          setVoiceStatusNote(
            lang === 'bn'
              ? 'সার্ভারে অডিও ট্রান্সক্রাইব হচ্ছে...'
              : 'Transcribing your recording on server...'
          );
          try {
            const base64 = await blobToBase64(blob);
            const res = await requestTransferAudioTranscription(
              { audioBase64: base64, mimeType: finalMime },
              { userId, logTelemetry: allowTelemetry }
            );
            setDraftInput((prev) => (prev.trim() ? `${prev.trim()} ${res.transcript}` : res.transcript));
            setPendingTranscriptionSource('gemini_transcribe');
            setVoiceStatusNote(
              lang === 'bn'
                ? 'ট্রান্সক্রিপশন সম্পন্ন হয়েছে। পাঠানোর আগে চাইলে টেক্সট সম্পাদনা করতে পারেন।'
                : 'Transcription complete. Review or edit before sending.'
            );
          } catch (err) {
            if (browserSttTranscriptRef.current) {
              setDraftInput(browserSttTranscriptRef.current);
              setPendingTranscriptionSource('browser_stt');
              setVoiceStatusNote(
                lang === 'bn'
                  ? 'সার্ভার ট্রান্সক্রিপশন ব্যর্থ হওয়ায় ব্রাউজার স্পিচ-টু-টেক্সট ব্যবহার করা হয়েছে।'
                  : 'Server transcription failed; populated from browser SpeechRecognition.'
              );
            } else {
              setVoiceError(
                err instanceof Error
                  ? err.message
                  : 'Server transcription failed. You can replay your audio or type your message.'
              );
            }
          } finally {
            setIsTranscribing(false);
          }
        } else if (browserSttTranscriptRef.current) {
          setDraftInput((prev) =>
            prev.trim()
              ? `${prev.trim()} ${browserSttTranscriptRef.current}`
              : browserSttTranscriptRef.current
          );
          setPendingTranscriptionSource('browser_stt');
          setVoiceStatusNote(
            lang === 'bn'
              ? 'ব্রাউজার স্পিচ-টু-টেক্সট থেকে ট্রান্সক্রিপ্ট তৈরি হয়েছে।'
              : 'Transcribed via browser SpeechRecognition. Review before sending.'
          );
        } else {
          setVoiceStatusNote(
            lang === 'bn'
              ? 'রেকর্ডিং সম্পন্ন হয়েছে, তবে স্পিচ-টু-টেক্সট পাওয়া যায়নি। নিচে আপনার উত্তর টাইপ করে পাঠান।'
              : 'Audio recorded, but speech-to-text is unavailable in this environment. Type your response below to continue.'
          );
        }
      };

      recordStartMsRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);
      recorder.start();

      recordTimerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - recordStartMsRef.current) / 1000);
        setRecordingSeconds(sec);
        if (sec >= MAX_RECORDING_SECONDS) {
          stopRecordingInternal();
        }
      }, 250);
    } catch (err) {
      const classified = classifyMicError(err);
      setVoiceError(lang === 'bn' ? classified.messageBn : classified.messageEn);
      stopRecordingInternal();
    }
  };

  const handleClearPendingAudio = async () => {
    if (pendingAudioBlobKey) {
      await deleteAudioBlob(pendingAudioBlobKey);
    }
    if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
    setPendingAudioBlobKey(null);
    setPendingAudioUrl(null);
    setPendingAudioDuration(undefined);
    setPendingTranscriptionSource('manual_text');
  };

  const handleSendMessage = async () => {
    const cleanText = draftInput.trim();
    if (!cleanText || isSendingTurn || isEvaluating) return;

    setTurnError(null);
    setEvalError(null);
    setIsSendingTurn(true);

    const inputChannel: SpeakingInputChannel =
      pendingTranscriptionSource === 'gemini_transcribe' ||
      pendingTranscriptionSource === 'browser_stt'
        ? 'voice_with_manual_edit'
        : 'text_fallback';

    try {
      const response = await requestTransferTurn(
        {
          scenarioId: scenario.id,
          pressureLevel,
          learnerLevel,
          explanationLanguage,
          learnerMessage: cleanText,
          transcript: messages,
          currentObjectives: objectives,
          adaptationCues: adaptation.inRoomCoachingCuesEn,
          linkedMistakePattern: adaptation.linkedMistakePattern,
        },
        { userId, logTelemetry: allowTelemetry }
      );

      const nowIso = new Date().toISOString();
      const learnerTurn: TransferConversationTurn = {
        id: `turn_u_${Date.now()}`,
        role: 'learner',
        text: cleanText,
        timestamp: nowIso,
        inputChannel,
        audioBlobKey: pendingAudioBlobKey ?? undefined,
        audioDurationSeconds: pendingAudioDuration,
        transcriptionSource: pendingTranscriptionSource,
      };

      const aiTurn: TransferConversationTurn = {
        id: `turn_ai_${Date.now() + 1}`,
        role: 'ai',
        text: response.aiReply,
        hintBn: response.aiReplyBnHint || undefined,
        timestamp: new Date(Date.now() + 50).toISOString(),
        coachNudgeEn: response.coachNudgeEn || undefined,
        coachNudgeBn: response.coachNudgeBn || undefined,
      };

      setMessages((prev) => [...prev, learnerTurn, aiTurn]);
      setObjectives(response.updatedObjectives);
      setCurrentPhaseLabel(response.phaseLabel);
      setConversationShouldWrap(response.conversationShouldWrap);
      setDraftInput('');
      setPendingAudioBlobKey(null);
      if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
      setPendingAudioUrl(null);
      setPendingAudioDuration(undefined);
      setPendingTranscriptionSource('manual_text');
      setVoiceStatusNote(null);
    } catch (err) {
      const msg =
        err instanceof SpeakingClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to reach the live AI participant. Your draft message is preserved — please retry.';
      setTurnError(msg);
    } finally {
      setIsSendingTurn(false);
    }
  };

  const handleEndAndEvaluate = async () => {
    if (learnerTurns.length === 0 || isEvaluating || isSendingTurn) return;
    setEvalError(null);
    setIsEvaluating(true);
    stopTtsPlayback();
    if (isRecording) stopRecordingInternal();

    try {
      const res = await requestTransferSessionEvaluation(
        {
          sessionId: initialDraft.sessionId,
          scenarioId: scenario.id,
          pressureLevel,
          learnerLevel,
          explanationLanguage,
          transcript: messages,
          currentObjectives: objectives,
          linkedMistakePattern: adaptation.linkedMistakePattern,
        },
        { userId, logTelemetry: allowTelemetry }
      );

      const usedVoice = learnerTurns.some(
        (t) => t.inputChannel === 'voice_stt' || t.inputChannel === 'voice_with_manual_edit'
      );

      await onSessionEvaluated({
        report: res.report,
        rubricEvaluation: res.rubricEvaluation,
        transcript: messages,
        pressureLevel,
        durationSeconds: Math.max(15, elapsedSeconds),
        inputChannel: usedVoice ? 'voice_with_manual_edit' : 'text_fallback',
      });
    } catch (err) {
      setEvalError(
        err instanceof SpeakingClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to complete the 8-dimension session evaluation right now. Your conversation is preserved — please retry.'
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <section
      data-testid="immersive-scenario-room"
      className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12"
    >
      {/* LEFT: Mission Control Sidebar (matches reference split-panel layout) */}
      <aside className="space-y-4 lg:col-span-4">
        <div className="rounded-2xl border border-cyan-500/25 bg-[#081031]/95 p-5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onSaveAndExit(buildCurrentDraft())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'সংরক্ষণ ও প্রস্থান' : 'Save & Exit'}
            </button>

            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-cyan-300 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              <span aria-label="Session timer">{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
              {lang === 'bn' ? scenario.environmentNameBn : scenario.environmentNameEn}
            </p>
            <h1 className="font-display text-xl font-bold text-white">
              {lang === 'bn' ? scenario.titleBn : scenario.titleEn}
            </h1>
            <p className="text-xs leading-relaxed text-slate-300">
              {lang === 'bn' ? scenario.descriptionBn : scenario.descriptionEn}
            </p>
          </div>

          {/* Current Phase & Identities */}
          <div className="mt-4 space-y-2.5 rounded-xl border border-slate-800 bg-[#050B24] p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <span className="text-slate-400">
                {lang === 'bn' ? 'বর্তমান ধাপ' : 'Current Phase'}
              </span>
              <span className="font-semibold text-emerald-300">{currentPhaseLabel}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-400">
                {lang === 'bn' ? 'AI সহ-অংশগ্রহণকারী' : 'AI Participant'}
              </span>
              <span className="text-right font-medium text-slate-100">
                {scenario.aiParticipantName} ·{' '}
                <span className="text-slate-400">
                  {lang === 'bn' ? scenario.aiParticipantRoleBn : scenario.aiParticipantRoleEn}
                </span>
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-400">
                {lang === 'bn' ? 'আপনার ভূমিকা' : 'Your Role'}
              </span>
              <span className="text-right font-medium text-cyan-200">
                {lang === 'bn' ? scenario.learnerRoleBn : scenario.learnerRoleEn}
              </span>
            </div>
          </div>

          {/* Pressure Ladder selector */}
          <div className="mt-4">
            <label
              htmlFor="room-pressure-select"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              {lang === 'bn' ? 'প্রেসার ল্যাডার স্তর' : 'Pressure Ladder Tier'}
            </label>
            <select
              id="room-pressure-select"
              value={pressureLevel}
              onChange={(e) => setPressureLevel(e.target.value as PressureLadderLevelId)}
              className="mt-1.5 w-full rounded-xl border border-slate-700/80 bg-[#050B24] px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              {PRESSURE_LADDER_TIERS.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  L{tier.levelNumber}: {lang === 'bn' ? tier.titleBn : tier.titleEn}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              {lang === 'bn' ? activeTier.descBn : activeTier.descEn}
            </p>
          </div>
        </div>

        {/* Measurable Objectives Checklist */}
        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/95 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white">
              {lang === 'bn' ? 'যোগাযোগের লক্ষ্যসমূহ' : 'Communication Objectives'}
            </h2>
            <span className="font-mono text-xs font-semibold text-cyan-300 tabular-nums">
              {objSummary.achieved}/{objSummary.total}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#087BFF] to-[#00D9FF] transition-all"
              style={{ width: `${objSummary.completionPercent}%` }}
            />
          </div>

          <ul className="mt-3.5 space-y-2.5" data-testid="room-objectives-list">
            {objectives.map((obj, idx) => {
              const st = OBJ_STATUS_STYLE[obj.status] ?? OBJ_STATUS_STYLE.not_started;
              return (
                <li
                  key={obj.objectiveId}
                  className="rounded-xl border border-slate-800/90 bg-[#050B24]/90 p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-100">
                      <span className="mr-1.5 font-mono text-[11px] text-slate-500">
                        0{idx + 1}
                      </span>
                      {lang === 'bn' ? obj.labelBn : obj.labelEn}
                    </span>
                    <span className={`shrink-0 text-[11px] font-semibold ${st.color}`}>
                      {lang === 'bn' ? st.bn : st.en}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{obj.criteriaEn}</p>
                  {obj.evidenceQuote && (
                    <p className="mt-1.5 border-l-2 border-emerald-400/60 pl-2 text-[11px] text-emerald-200">
                      “{obj.evidenceQuote}”
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Personalized Adaptation & Helpful Phrases */}
        <div className="rounded-2xl border border-slate-800 bg-[#080F2D]/95 p-5 space-y-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'ব্যক্তিগতকৃত ফোকাস' : 'Personalized Adaptation'}
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
              {(lang === 'bn' ? adaptation.inRoomCoachingCuesBn : adaptation.inRoomCoachingCuesEn).map(
                (cue, i) => (
                  <li key={i} className="leading-relaxed">
                    • {cue}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setShowPhrases((v) => !v)}
              aria-expanded={showPhrases}
              className="flex w-full items-center justify-between text-xs font-semibold text-slate-200 hover:text-cyan-200"
            >
              <span>{lang === 'bn' ? 'সহায়ক বাক্যাংশ (Try saying)' : 'Helpful Phrases (Try saying)'}</span>
              {showPhrases ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showPhrases && (
              <ul className="mt-2.5 space-y-1.5 text-xs text-slate-300">
                {scenario.helpfulPhrasesEn.map((phrase, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftInput((prev) => (prev.trim() ? `${prev.trim()} ${phrase}` : phrase))
                      }
                      className="w-full rounded-lg border border-slate-800 bg-[#050B24] px-2.5 py-2 text-left text-xs text-slate-200 transition hover:border-cyan-400/50 hover:text-cyan-200"
                    >
                      “{phrase}”
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Primary Session Controls */}
          <div className="space-y-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => onSaveAndExit(buildCurrentDraft())}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
            >
              <Save className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'ড্রাফট সংরক্ষণ করে বের হন' : 'Save Draft & Exit'}
            </button>

            <button
              type="button"
              disabled={learnerTurns.length === 0 || isEvaluating || isSendingTurn}
              onClick={() => void handleEndAndEvaluate()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#087BFF] to-[#00C2FF] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {lang === 'bn' ? '৮-মাত্রার মূল্যায়ন তৈরি হচ্ছে...' : 'Evaluating 8 Dimensions...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {lang === 'bn'
                    ? 'সেশন শেষ ও প্রমাণভিত্তিক মূল্যায়ন করুন'
                    : 'End & Evaluate Session'}
                </>
              )}
            </button>

            {learnerTurns.length === 0 && (
              <p className="text-center text-[11px] text-slate-400">
                {lang === 'bn'
                  ? 'মূল্যায়ন শুরু করতে কমপক্ষে ১টি উত্তর পাঠান।'
                  : 'Send at least 1 response to unlock evidence-based evaluation.'}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* RIGHT: Immersive Conversation Stage */}
      <div className="flex h-[74vh] min-h-[560px] max-h-[760px] flex-col overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#060C24]/95 lg:sticky lg:top-20 lg:col-span-8">
        {/* Stage Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-white">
              {scenario.aiParticipantName}{' '}
              <span className="font-normal text-slate-400">
                · {lang === 'bn' ? scenario.aiParticipantRoleBn : scenario.aiParticipantRoleEn}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {lang === 'bn' ? scenario.requiredTaskBn : scenario.requiredTaskEn}
            </p>
          </div>

          {/* Text vs Voice Mode Toggle */}
          <div
            role="group"
            aria-label={lang === 'bn' ? 'যোগাযোগের মাধ্যম' : 'Interaction mode'}
            className="inline-flex rounded-xl border border-slate-800 bg-[#05091F] p-1 text-xs"
          >
            <button
              type="button"
              onClick={() => setInteractionMode('text')}
              aria-pressed={interactionMode === 'text'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                interactionMode === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'টেক্সট' : 'Text Mode'}
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode('voice')}
              aria-pressed={interactionMode === 'voice'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                interactionMode === 'voice'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              {lang === 'bn' ? 'ভয়েস' : 'Voice Mode'}
            </button>
          </div>
        </div>

        {/* Honest AI Service Notice when unconfigured */}
        {health && !health.aiConfigured && (
          <div
            role="status"
            className="mx-5 mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-950/30 p-3.5 text-xs text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold">
                {lang === 'bn'
                  ? 'সার্ভারে লাইভ AI কনফিগার করা নেই'
                  : 'Live AI Service Currently Unconfigured'}
              </p>
              <p className="mt-0.5 text-amber-100/80">
                {lang === 'bn'
                  ? 'GEMINI_API_KEY যুক্ত না থাকায় লাইভ AI উত্তর তৈরি করা যাবে না। নকল উত্তর দেখানো হবে না — আপনি ড্রাফট সংরক্ষণ করে রাখতে পারবেন।'
                  : 'GEMINI_API_KEY is not configured on the server. Fake AI replies are never fabricated; add your API key in Settings > Secrets to run live turns and evaluation.'}
              </p>
            </div>
          </div>
        )}

        {/* Conversation Transcript Log */}
        <div
          role="log"
          aria-live="polite"
          aria-label={lang === 'bn' ? 'কথোপকথনের ট্রান্সক্রিপ্ট' : 'Conversation transcript'}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          {messages.map((turn) => {
            const isLearner = turn.role === 'learner';
            const hintVisible = Boolean(showBnHints[turn.id]);

            return (
              <div
                key={turn.id}
                data-turn-role={turn.role}
                className={`flex flex-col ${isLearner ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl border p-4 sm:max-w-[80%] ${
                    isLearner
                      ? 'border-blue-500/40 bg-gradient-to-br from-blue-600/30 to-indigo-700/25 text-slate-50'
                      : 'border-slate-800 bg-[#0A1335] text-slate-100'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-4 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
                      <User className="h-3 w-3 text-cyan-400" />
                      {isLearner
                        ? lang === 'bn'
                          ? 'আপনি'
                          : 'You'
                        : scenario.aiParticipantName}
                      {isLearner && turn.transcriptionSource && turn.transcriptionSource !== 'manual_text' && (
                        <span className="font-normal text-cyan-300">
                          · {turn.transcriptionSource === 'gemini_transcribe' ? 'Server STT' : 'Browser STT'}
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums">
                      {new Date(turn.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{turn.text}</p>

                  {/* AI message controls: Play audio + Bangla hint */}
                  {!isLearner && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-2.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => void handlePlayAiMessage(turn)}
                        aria-label={
                          playingMessageId === turn.id ? 'Stop audio playback' : 'Listen to AI reply'
                        }
                        className="inline-flex items-center gap-1 font-medium text-cyan-300 hover:text-cyan-200"
                      >
                        {playingMessageId === turn.id ? (
                          <>
                            <VolumeX className="h-3.5 w-3.5" />
                            {lang === 'bn' ? 'থামান' : 'Stop'}
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3.5 w-3.5" />
                            {lang === 'bn' ? 'শুনুন' : 'Listen'}
                          </>
                        )}
                      </button>

                      {turn.hintBn && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowBnHints((prev) => ({ ...prev, [turn.id]: !prev[turn.id] }))
                          }
                          aria-expanded={hintVisible}
                          className="font-medium text-slate-400 hover:text-slate-200"
                        >
                          {hintVisible
                            ? lang === 'bn'
                              ? 'বাংলা ইঙ্গিত লুকান'
                              : 'Hide Bangla Hint'
                            : lang === 'bn'
                              ? 'বাংলা অর্থ দেখুন'
                              : 'Show Bangla Hint'}
                        </button>
                      )}
                    </div>
                  )}

                  {!isLearner && hintVisible && turn.hintBn && (
                    <p className="mt-2 rounded-lg border border-slate-800 bg-[#050A22] px-3 py-2 text-xs text-slate-300">
                      {turn.hintBn}
                    </p>
                  )}

                  {!isLearner && (turn.coachNudgeEn || turn.coachNudgeBn) && (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-cyan-300/90">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        {lang === 'bn' ? turn.coachNudgeBn ?? turn.coachNudgeEn : turn.coachNudgeEn}
                      </span>
                    </p>
                  )}

                  {/* Retained audio playback + delete control for learner turn */}
                  {isLearner && turn.audioBlobKey && (
                    <div className="mt-2.5 flex items-center gap-3 border-t border-blue-400/20 pt-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => void handlePlayStoredTurnAudio(turn.audioBlobKey!)}
                        className="inline-flex items-center gap-1 font-medium text-cyan-200 hover:text-white"
                      >
                        <Play className="h-3 w-3" />
                        {lang === 'bn' ? 'নিজের রেকর্ডিং শুনুন' : 'Replay recording'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteStoredTurnAudio(turn.id, turn.audioBlobKey!)}
                        className="inline-flex items-center gap-1 font-medium text-rose-300 hover:text-rose-200"
                      >
                        <Trash2 className="h-3 w-3" />
                        {lang === 'bn' ? 'রেকর্ডিং মুছুন' : 'Delete audio'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isSendingTurn && (
            <div className="flex items-center gap-2 text-xs text-cyan-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {scenario.aiParticipantName}{' '}
                {lang === 'bn' ? 'উত্তর প্রস্তুত করছেন...' : 'is responding...'}
              </span>
            </div>
          )}

          {conversationShouldWrap && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3.5 text-xs text-emerald-200">
              {lang === 'bn'
                ? 'কথোপকথনটি স্বাভাবিক সমাপ্তিতে পৌঁছেছে। এখন "সেশন শেষ ও প্রমাণভিত্তিক মূল্যায়ন করুন" বাটনে ক্লিক করে আপনার ৮-মাত্রার রিপোর্ট দেখুন।'
                : 'The scenario conversation has reached a natural closing. Click "End & Evaluate Session" to generate your 8-dimension evidence report.'}
            </div>
          )}

          <div ref={logEndRef} />
        </div>

        {/* Notices & Retryable Error Area */}
        <div className="space-y-2 px-5">
          {ttsNotice && (
            <p className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
              {ttsNotice}
            </p>
          )}

          {turnError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-950/35 px-3.5 py-2.5 text-xs text-rose-200"
            >
              <span>{turnError}</span>
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500/25 px-2.5 py-1 font-semibold text-rose-100 hover:bg-rose-500/40"
              >
                <RefreshCw className="h-3 w-3" />
                {lang === 'bn' ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
              </button>
            </div>
          )}

          {evalError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-950/35 px-3.5 py-2.5 text-xs text-rose-200"
            >
              <span>{evalError}</span>
              <button
                type="button"
                onClick={() => void handleEndAndEvaluate()}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500/25 px-2.5 py-1 font-semibold text-rose-100 hover:bg-rose-500/40"
              >
                <RefreshCw className="h-3 w-3" />
                {lang === 'bn' ? 'মূল্যায়ন পুনরায় চেষ্টা করুন' : 'Retry Evaluation'}
              </button>
            </div>
          )}
        </div>

        {/* Bottom Composer (Text Mode + Voice Mode with Consent & Controls) */}
        <div className="mt-3 border-t border-slate-800 p-4 sm:p-5">
          {interactionMode === 'voice' && (
            <div className="mb-4 space-y-3 rounded-xl border border-cyan-500/25 bg-[#081235] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2 text-xs text-slate-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <div>
                    <p className="font-semibold text-white">
                      {lang === 'bn'
                        ? 'ভয়েস রেকর্ডিং ও ট্রান্সক্রিপশন কন্ট্রোল'
                        : 'Voice Recording & Transcription Controls'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {lang === 'bn'
                        ? 'ভয়েস রেকর্ডিং ও ট্রান্সক্রিপশন আলাদা ধাপ। টেক্সট ট্রান্সক্রিপ্ট থেকে অ্যাকোস্টিক উচ্চারণের স্কোর দাবি করা হয় না।'
                        : 'Voice recording and transcription are separate steps. Acoustic pronunciation accuracy is never claimed from text transcripts.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Explicit Microphone Consent & Retention Checkboxes */}
              <div className="space-y-2 text-xs text-slate-200">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={voiceConsentGranted}
                    onChange={(e) => setVoiceConsentGranted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500"
                  />
                  <span>
                    {lang === 'bn'
                      ? 'আমি এই সেশনে উত্তর রেকর্ড ও ট্রান্সক্রাইব করতে মাইক্রোফোন ব্যবহারের অনুমতি দিচ্ছি।'
                      : 'I consent to use my microphone to record and transcribe my response for this session.'}
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    disabled={!allowMicStorageByProfile}
                    checked={retainAudioConsent && allowMicStorageByProfile}
                    onChange={(e) => setRetainAudioConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 disabled:opacity-40"
                  />
                  <span>
                    {allowMicStorageByProfile
                      ? lang === 'bn'
                        ? 'নিজে শোনার জন্য এই ডিভাইসের ব্রাউজারে (IndexedDB) অডিও সংরক্ষণ করুন (যেকোনো সময় মুছতে পারবেন)।'
                        : 'Optionally retain audio locally in this browser (IndexedDB) for self-playback (deletable anytime).'
                      : lang === 'bn'
                        ? 'আপনার Privacy Settings-এ রেকর্ডিং সংরক্ষণ বন্ধ আছে — অডিও কেবল তাৎক্ষণিক ট্রান্সক্রিপশনের পর মুছে যাবে।'
                        : 'Local recording retention is disabled in Privacy Settings — audio is discarded after transcription.'}
                  </span>
                </label>
              </div>

              {/* Record / Stop Action Row + Real AnalyserNode Level Meter */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {!isRecording ? (
                  <button
                    type="button"
                    disabled={!voiceConsentGranted || isTranscribing || isSendingTurn}
                    onClick={() => void handleStartRecording()}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Mic className="h-4 w-4" />
                    {lang === 'bn' ? 'রেকর্ডিং শুরু করুন' : 'Start Recording'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecordingInternal}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-500"
                  >
                    <Square className="h-3.5 w-3.5" />
                    {lang === 'bn' ? 'রেকর্ডিং থামান' : 'Stop Recording'}{' '}
                    <span className="font-mono tabular-nums">({formatTimer(recordingSeconds)})</span>
                  </button>
                )}

                {isRecording && (
                  <div className="flex flex-1 items-center gap-2" aria-label="Microphone audio level">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all duration-75"
                        style={{ width: `${Math.max(4, audioLevel)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
                      max {MAX_RECORDING_SECONDS}s
                    </span>
                  </div>
                )}

                {isTranscribing && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {lang === 'bn' ? 'ট্রান্সক্রাইব হচ্ছে...' : 'Transcribing...'}
                  </span>
                )}
              </div>

              {pendingAudioUrl && !isRecording && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/80 bg-[#050A22] px-3 py-2">
                  <audio controls src={pendingAudioUrl} className="h-8 max-w-full" />
                  <button
                    type="button"
                    onClick={() => void handleClearPendingAudio()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-300 hover:text-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {lang === 'bn' ? 'রেকর্ডিং মুছুন' : 'Delete Recording'}
                  </button>
                </div>
              )}

              {voiceStatusNote && (
                <p className="flex items-start gap-1.5 text-xs text-cyan-200">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {voiceStatusNote}
                </p>
              )}

              {voiceError && (
                <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-300">
                  <MicOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {voiceError}
                </p>
              )}
            </div>
          )}

          {/* Message Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="transfer-room-message-input" className="sr-only">
                {lang === 'bn'
                  ? `${scenario.aiParticipantName}-কে উত্তর লিখুন`
                  : `Reply to ${scenario.aiParticipantName}`}
              </label>
              <textarea
                id="transfer-room-message-input"
                rows={2}
                value={draftInput}
                onChange={(e) => setDraftInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder={
                  lang === 'bn'
                    ? `${scenario.aiParticipantName} (${scenario.aiParticipantRoleBn})-কে ইংরেজিতে উত্তর দিন...`
                    : `Reply to ${scenario.aiParticipantName} (${scenario.aiParticipantRoleEn})...`
                }
                className="w-full resize-none rounded-xl border border-slate-700/80 bg-[#05091F] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!draftInput.trim() || isSendingTurn || isEvaluating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSendingTurn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {lang === 'bn' ? 'পাঠান' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
