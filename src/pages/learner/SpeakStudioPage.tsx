import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Eraser,
  History,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  PanelLeftOpen,
  PanelRightOpen,
  Pause,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { PressureLadderSelector } from '../../components/shared/PressureLadderSelector';
import { CommunicationReplayPanel } from '../../components/speaking/CommunicationReplayPanel';
import { VoiceUniverseOrb, type VoiceOrbState } from '../../components/speaking/VoiceUniverseOrb';
import { SpeakingHomeHero } from '../../components/speaking/SpeakingHomeHero';
import { ScenarioLibrarySection } from '../../components/speaking/ScenarioLibrarySection';
import { PronunciationPracticePanel } from '../../components/speaking/PronunciationPracticePanel';
import { SpeakingSessionResults } from '../../components/speaking/SpeakingSessionResults';
import { ConversationHistorySidebar } from '../../components/speaking/ConversationHistorySidebar';
import { ConversationMessageStream } from '../../components/speaking/ConversationMessageStream';
import { ConversationContextSidebar } from '../../components/speaking/ConversationContextSidebar';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  getPressureLevelConfig,
  getSpeakingScenario,
} from '../../domain/speakingScenarios';
import {
  buildPracticeModesCatalog,
  buildSpeakingOverview,
  buildSpeakingRecommendations,
  type SpeakingPracticeModeCard,
} from '../../domain/speakingStudioEngine';
import {
  buildBoundedConversationContext,
  deriveConversationStatus,
} from '../../domain/conversationContextEngine';
import { computeCommunicationDna } from '../../domain/communicationDnaEngine';
import {
  fetchSpeakingHealth,
  requestSpeakingEvaluation,
  SpeakingClientError,
  type SpeakingHealthResponse,
} from '../../services/speakingApi';
import {
  clearSpeakingSessionDraft,
  loadUserSpeakingState,
  removeConversationVocabulary,
  saveConversationVocabulary,
  saveSpeakingSessionDraft,
  setUserCorrectionStyle,
  type SpeakingSessionDraft,
} from '../../services/speakingStateStore';
import {
  MAX_RECORDING_SECONDS,
  saveAudioBlob,
  validateAudioBlob,
} from '../../utils/audioBlobStore';
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
  ConversationCorrectionStyle,
  SavedConversationVocabItem,
  SpeakingDetectedMistake,
  SpeakingInputChannel,
  SpeakingModeId,
  SpeakingPressureLevel,
  SpeakingSessionRecord,
  SpeakingTurnRecord,
} from '../../types/domain';

type StudioView = 'home' | 'conversation' | 'pronunciation' | 'results' | 'replay';

function generateClientId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.max(0, totalSeconds) % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatPrimaryGoalLabel(goal: string | undefined, lang: 'en' | 'bn'): string {
  switch (goal) {
    case 'job_interview':
      return lang === 'bn' ? 'চাকরির ইন্টারভিউ প্রস্তুতি' : 'Job Interview Fluency';
    case 'workplace':
      return lang === 'bn' ? 'কর্মক্ষেত্রের যোগাযোগ' : 'Workplace Communication';
    case 'academic_ielts':
      return lang === 'bn' ? 'একাডেমিক ও মৌখিক পরীক্ষা' : 'Academic & Oral Exam';
    default:
      return lang === 'bn' ? 'দৈনন্দিন ইংরেজি কথোপকথন' : 'Everyday Spoken Fluency';
  }
}

export function SpeakStudioPage() {
  const { lang, t } = useLanguage();
  const {
    user,
    profile,
    latestDiagnostic,
    mistakes,
    lessonAttempts,
    exerciseAttempts,
    mistakeDrillAttempts,
    speakingSessions,
    saveSpeakingSession,
    reportFalseCorrection,
  } = useAuth();

  const [searchParams] = useSearchParams();
  const explanationPref = profile?.explanationLanguage ?? 'both';
  const learnerLevel = profile?.selfEstimatedLevel ?? 'A2';

  const [view, setView] = useState<StudioView>('home');
  const [selectedMode, setSelectedMode] = useState<SpeakingModeId>('daily_conversations');
  const [selectedPressure, setSelectedPressure] =
    useState<SpeakingPressureLevel>('level_2_guided');
  const [autoSpeakAi, setAutoSpeakAi] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [serverHealth, setServerHealth] = useState<SpeakingHealthResponse | null>(null);

  // Part 08: User-scoped draft recovery, correction style & saved vocabulary
  const [savedDraft, setSavedDraft] = useState<SpeakingSessionDraft | null>(null);
  const [correctionStyle, setCorrectionStyle] = useState<ConversationCorrectionStyle>('gentle');
  const [savedVocabulary, setSavedVocabulary] = useState<SavedConversationVocabItem[]>([]);

  // Part 08: Collapsible 3-panel desktop workspace & mobile drawer toggles
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(true);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'history' | 'context'>('none');

  // Active conversation session state
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionStartedAt, setSessionStartedAt] = useState<string>('');
  const [turns, setTurns] = useState<SpeakingTurnRecord[]>([]);
  const [sessionXpAwardedAmount, setSessionXpAwardedAmount] = useState<number>(0);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(0);
  const [isSessionPaused, setIsSessionPaused] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false);

  // Completed session shown in Results view
  const [resultsSession, setResultsSession] = useState<SpeakingSessionRecord | null>(null);

  // Mic privacy consent & voice capture state
  const [micConsentGranted, setMicConsentGranted] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
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

  // Load user-scoped speaking draft, correction style & saved vocabulary on user change
  useEffect(() => {
    const stored = loadUserSpeakingState(user?.id);
    setSavedDraft(stored.draftSession);
    setCorrectionStyle(stored.correctionStyle);
    setSavedVocabulary(stored.savedVocabulary);
    if (stored.lastPracticedModeId) {
      setSelectedMode(stored.lastPracticedModeId);
    }
  }, [user?.id]);

  // Honor ?mode=<SpeakingModeId> deep link from Communication Replay retry actions
  useEffect(() => {
    const modeParam = searchParams.get('mode') as SpeakingModeId | null;
    if (modeParam && getSpeakingScenario(modeParam)?.id === modeParam) {
      setSelectedMode(modeParam);
    }
  }, [searchParams]);

  // Reset scroll position cleanly when transitioning between Speaking Studio views
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [view]);

  // Derived domain data (100% real persisted records)
  const scenario = useMemo(() => getSpeakingScenario(selectedMode), [selectedMode]);
  const pressureConfig = useMemo(
    () => getPressureLevelConfig(selectedPressure),
    [selectedPressure]
  );
  const overview = useMemo(
    () => buildSpeakingOverview(speakingSessions),
    [speakingSessions]
  );
  const practiceModes = useMemo(() => buildPracticeModesCatalog(), []);
  const dna = useMemo(
    () =>
      computeCommunicationDna({
        latestDiagnostic,
        exerciseAttempts,
        lessonAttempts,
        speakingSessions,
        mistakes,
        mistakeDrillAttempts,
      }),
    [
      latestDiagnostic,
      exerciseAttempts,
      lessonAttempts,
      speakingSessions,
      mistakes,
      mistakeDrillAttempts,
    ]
  );
  const recommendations = useMemo(
    () =>
      buildSpeakingRecommendations({
        profile,
        mistakes,
        speakingSessions,
        lessonAttempts,
        dna,
      }),
    [profile, mistakes, speakingSessions, lessonAttempts, dna]
  );

  const currentAiPrompt =
    turns.length > 0
      ? turns[turns.length - 1].evaluation.ai_reply
      : scenario.openingPromptEn;

  const mediaRecorderAvailable = isMediaRecorderSupported();
  const speechRecAvailable = isSpeechRecognitionSupported();
  const aiConfigured = serverHealth ? serverHealth.configured : true;

  // Bounded rolling conversation context (preserves early turns in summary rather than dropping silently)
  const boundedConversationContext = useMemo(() => {
    const rawHistory = [
      { role: 'ai' as const, text: scenario.openingPromptEn },
      ...turns.flatMap((turn) => [
        { role: 'user' as const, text: turn.userTranscript },
        { role: 'ai' as const, text: turn.evaluation.ai_reply },
      ]),
    ];
    return buildBoundedConversationContext(rawHistory, 8);
  }, [scenario.openingPromptEn, turns]);

  // Honest conversation status derived strictly from real live state
  const conversationStatus = useMemo(
    () =>
      deriveConversationStatus({
        aiConfigured,
        isPaused: isSessionPaused,
        isEvaluating,
        isRecording,
        isSpeakingPrompt,
        hasError: Boolean(apiError || micError),
      }),
    [aiConfigured, isSessionPaused, isEvaluating, isRecording, isSpeakingPrompt, apiError, micError]
  );

  // Compute Voice Orb state strictly from real live app state
  const orbState: VoiceOrbState = useMemo(() => {
    if (serverHealth && !serverHealth.configured) return 'unavailable';
    if (isSessionPaused) return 'paused';
    if (apiError || micError) return 'error';
    if (isEvaluating) return 'thinking';
    if (isRecording) return 'listening';
    if (isSpeakingPrompt) return 'speaking';
    return 'idle';
  }, [serverHealth, isSessionPaused, apiError, micError, isEvaluating, isRecording, isSpeakingPrompt]);

  const handleChangeCorrectionStyle = (nextStyle: ConversationCorrectionStyle) => {
    setCorrectionStyle(nextStyle);
    const updated = setUserCorrectionStyle(user?.id, nextStyle);
    setCorrectionStyle(updated.correctionStyle);
  };

  const handleSaveVocabularyPhrase = (phrase: string, contextSentence: string) => {
    const updated = saveConversationVocabulary(user?.id, {
      phrase,
      contextSentence,
      scenarioId: selectedMode,
    });
    setSavedVocabulary(updated.savedVocabulary);
  };

  const handleRemoveVocabularyPhrase = (phraseOrId: string) => {
    const updated = removeConversationVocabulary(user?.id, phraseOrId);
    setSavedVocabulary(updated.savedVocabulary);
  };

  const handleReportIncorrectFeedback = async (
    mistake: SpeakingDetectedMistake,
    matchedMistakeId?: string
  ): Promise<boolean> => {
    if (!matchedMistakeId) {
      return true;
    }
    try {
      await reportFalseCorrection({
        mistakeId: matchedMistakeId,
        reported: true,
        reason: `Learner flagged AI conversation correction ("${mistake.original}" -> "${mistake.corrected}") as inaccurate.`,
      });
      return true;
    } catch {
      return false;
    }
  };

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

  // Live session elapsed timer (stops when paused or outside active conversation)
  useEffect(() => {
    if (view !== 'conversation' || isSessionPaused) return;
    const timer = window.setInterval(() => {
      setSessionElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, isSessionPaused]);

  // Countdown timer for Time-Limited Pressure Mode (respects pause)
  useEffect(() => {
    if (
      view !== 'conversation' ||
      isSessionPaused ||
      pressureConfig.timeLimitSeconds === null ||
      isEvaluating
    ) {
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
  }, [view, isSessionPaused, pressureConfig.timeLimitSeconds, isEvaluating, remainingSeconds]);

  const clearTurnDraft = (nextPressureTimeLimit = pressureConfig.timeLimitSeconds) => {
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
    setRemainingSeconds(nextPressureTimeLimit);
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
    setActiveMediaStream(null);
  };

  const launchConversationSession = (
    modeId: SpeakingModeId = selectedMode,
    pressure: SpeakingPressureLevel = selectedPressure
  ) => {
    handleStopRecording();
    stopSpeaking();
    setSelectedMode(modeId);
    setSelectedPressure(pressure);
    const nextScenario = getSpeakingScenario(modeId);
    const nextPressureCfg = getPressureLevelConfig(pressure);

    const newSessionId = generateClientId('spk');
    const startedIso = new Date().toISOString();
    setSessionId(newSessionId);
    setSessionStartedAt(startedIso);
    setTurns([]);
    setSessionXpAwardedAmount(0);
    setSessionElapsedSeconds(0);
    setIsSessionPaused(false);
    setShowExitModal(false);
    setView('conversation');
    setShowPrivacyBanner(!micConsentGranted);
    clearTurnDraft(nextPressureCfg.timeLimitSeconds);

    if (autoSpeakAi) {
      speakPrompt(nextScenario.openingPromptEn);
    }
  };

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    handleStopRecording();
    stopSpeaking();
    const nextPressureCfg = getPressureLevelConfig(savedDraft.pressureLevel);
    setSelectedMode(savedDraft.modeId);
    setSelectedPressure(savedDraft.pressureLevel);
    setSessionId(savedDraft.sessionId);
    setSessionStartedAt(savedDraft.startedAt);
    setTurns(savedDraft.turns);
    setSessionXpAwardedAmount(0);
    setSessionElapsedSeconds(Math.max(0, savedDraft.turns.length * 25));
    setIsSessionPaused(false);
    setShowExitModal(false);
    setDraftTranscript(savedDraft.draftTranscript);
    setInterimTranscript('');
    setRemainingSeconds(nextPressureCfg.timeLimitSeconds);
    turnStartMsRef.current = Date.now();
    setView('conversation');
  };

  const handleDiscardDraft = () => {
    const next = clearSpeakingSessionDraft(user?.id);
    setSavedDraft(next.draftSession);
  };

  const handleRequestExitConversation = () => {
    handleStopRecording();
    stopSpeaking();
    if (turns.length > 0 || draftTranscript.trim().length > 0) {
      setShowExitModal(true);
      return;
    }
    setView('home');
  };

  const handleSaveDraftAndExit = () => {
    const draft: SpeakingSessionDraft = {
      sessionId,
      modeId: selectedMode,
      pressureLevel: selectedPressure,
      startedAt: sessionStartedAt,
      savedAt: new Date().toISOString(),
      turns,
      draftTranscript: draftTranscript.trim(),
    };
    const next = saveSpeakingSessionDraft(user?.id, draft);
    setSavedDraft(next.draftSession);
    setShowExitModal(false);
    setView('home');
  };

  const handleDiscardAndExit = () => {
    const next = clearSpeakingSessionDraft(user?.id, selectedMode);
    setSavedDraft(next.draftSession);
    setShowExitModal(false);
    setView('home');
  };

  const handleFinishToResults = () => {
    handleStopRecording();
    stopSpeaking();
    const existing = speakingSessions.find((s) => s.id === sessionId);
    const snapshot: SpeakingSessionRecord = existing ?? {
      id: sessionId,
      userId: user?.id ?? 'local',
      modeId: selectedMode,
      pressureLevel: selectedPressure,
      startedAt: sessionStartedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      durationSeconds: Math.max(10, sessionElapsedSeconds),
      turns,
      totalMistakesDetected: turns.reduce((sum, item) => sum + item.evaluation.mistakes.length, 0),
    };
    const next = clearSpeakingSessionDraft(user?.id, selectedMode);
    setSavedDraft(next.draftSession);
    setResultsSession(snapshot);
    setShowExitModal(false);
    setView('results');
  };

  const handleTogglePause = () => {
    if (isSessionPaused) {
      setIsSessionPaused(false);
      return;
    }
    handleStopRecording();
    stopSpeaking();
    setIsSpeakingPrompt(false);
    setIsSessionPaused(true);
  };

  const handlePracticeModeClick = (card: SpeakingPracticeModeCard) => {
    if (card.id === 'pronunciation_practice') {
      handleStopRecording();
      stopSpeaking();
      setView('pronunciation');
      return;
    }
    if (card.id === 'roleplay_scenarios') {
      document.getElementById('speaking-scenario-library')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    launchConversationSession(
      card.targetScenarioId ?? selectedMode,
      card.targetPressure ?? selectedPressure
    );
  };

  const startVoiceCapture = async () => {
    if (isSessionPaused) {
      setIsSessionPaused(false);
    }
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
      setActiveMediaStream(stream);

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

        const validation = validateAudioBlob(blob, elapsedSec);
        if (!validation.valid) {
          setMicError(
            validation.reason === 'too_large' || validation.reason === 'too_long'
              ? lang === 'bn'
                ? 'রেকর্ডিংয়ের আকার বা সময়সীমা (সর্বোচ্চ ২ মিনিট / ১০MB) অতিক্রম করেছে। সংক্ষিপ্ত উত্তর রেকর্ড করুন অথবা টেক্সট ব্যবহার করুন।'
                : 'Recording exceeded the 2-minute / 10 MB safety limit. Please record a shorter turn or submit your transcript below.'
              : lang === 'bn'
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
        const elapsed = Math.floor((Date.now() - recordingStartMsRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) {
          handleStopRecording();
          setMicError(
            lang === 'bn'
              ? '২ মিনিটের সর্বোচ্চ রেকর্ডিং সীমায় পৌঁছানোয় রেকর্ডিং স্বয়ংক্রিয়ভাবে থামানো হয়েছে।'
              : 'Recording automatically stopped at the 2-minute per-turn limit. Your audio and transcript are ready below.'
          );
        }
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
      setActiveMediaStream(null);
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
    if (isSessionPaused) {
      setIsSessionPaused(false);
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
          history: boundedConversationContext.recentHistory,
          contextSummary: boundedConversationContext.contextSummary || undefined,
          correctionStyle,
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
        const validation = validateAudioBlob(capturedAudioBlob, capturedAudioDuration || 1);
        if (validation.valid) {
          audioBlobKey = `audio_${user?.id ?? 'anon'}_${sessionId}_${turnId}`;
          await saveAudioBlob(audioBlobKey, capturedAudioBlob);
        }
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
        sessionElapsedSeconds,
        Math.round((Date.now() - new Date(sessionStartedAt).getTime()) / 1000)
      );

      // Persist session + confidence-gated Mistake Memory sync + idempotent XP
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

      // Keep draft updated in case user closes browser mid-session
      const nextUiState = saveSpeakingSessionDraft(user?.id, {
        sessionId,
        modeId: selectedMode,
        pressureLevel: selectedPressure,
        startedAt: sessionStartedAt,
        savedAt: new Date().toISOString(),
        turns: nextTurns,
        draftTranscript: '',
      });
      setSavedDraft(nextUiState.draftSession);

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

  const navigateTopTab = (next: 'home' | 'pronunciation' | 'replay') => {
    if (view === 'conversation' && (turns.length > 0 || draftTranscript.trim().length > 0)) {
      handleRequestExitConversation();
      return;
    }
    handleStopRecording();
    stopSpeaking();
    setView(next);
  };

  return (
    <LearnerShell
      title={t.workspace.modules.speakTitle}
      subtitle={
        lang === 'bn'
          ? 'বাস্তব কথোপকথন অনুশীলন করুন। আপনার ভুলগুলো বুঝুন। আত্মবিশ্বাসের সাথে কথা বলুন।'
          : 'Practice Real Conversations. Understand Your Mistakes. Speak With Confidence.'
      }
    >
      {/* Top Studio Navigation Bar + Voice Playback Controls */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-800/90 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label={lang === 'bn' ? 'স্পিকিং স্টুডিও বিভাগ' : 'Speaking studio sections'}
          className="inline-flex flex-wrap items-center rounded-xl border border-slate-800 bg-[#0B1230] p-1 self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'home' || view === 'conversation' || view === 'results'}
            onClick={() => navigateTopTab('home')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              view === 'home' || view === 'conversation' || view === 'results'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'স্পিকিং স্টুডিও' : 'Speaking Studio'}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === 'pronunciation'}
            onClick={() => navigateTopTab('pronunciation')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              view === 'pronunciation'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'উচ্চারণ ল্যাব' : 'Pronunciation Lab'}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === 'replay'}
            onClick={() => navigateTopTab('replay')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              view === 'replay'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? `রিপ্লে (${speakingSessions.length})`
                : `Replay (${speakingSessions.length})`}
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
                ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[#22D3EE]'
                : 'border-slate-800 bg-[#0B1230] text-slate-400 hover:text-slate-200'
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
            className="inline-flex items-center rounded-lg border border-slate-800 bg-[#0B1230] p-0.5"
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

      {/* Honest Server AI Readiness Notice */}
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

      {/* VIEW 1: PRONUNCIATION PRACTICE MODE */}
      {view === 'pronunciation' && <PronunciationPracticePanel />}

      {/* VIEW 2: COMMUNICATION REPLAY */}
      {view === 'replay' && (
        <CommunicationReplayPanel
          sessions={speakingSessions}
          explanationPref={explanationPref}
          playbackSpeed={playbackSpeed}
          onStartNewSession={() => setView('home')}
        />
      )}

      {/* VIEW 3: POST-SESSION SPEAKING RESULTS */}
      {view === 'results' && resultsSession && (
        <SpeakingSessionResults
          session={resultsSession}
          dna={dna}
          xpAwarded={sessionXpAwardedAmount}
          savedVocabulary={savedVocabulary}
          onPracticeAgain={(nextModeId) => launchConversationSession(nextModeId, selectedPressure)}
          onReviewTranscript={() => setView('replay')}
          onReturnHome={() => setView('home')}
        />
      )}

      {/* VIEW 4: SPEAKING STUDIO HOME */}
      {view === 'home' && (
        <div className="space-y-8">
          {/* 1. Voice Universe Hero + Verified Overview Strip */}
          <SpeakingHomeHero
            overview={overview}
            primaryGoalLabel={formatPrimaryGoalLabel(profile?.primaryGoal, lang)}
            aiConfigured={aiConfigured}
            onStartSpeaking={() => launchConversationSession(selectedMode, selectedPressure)}
            onExploreScenarios={() => {
              document
                .getElementById('speaking-scenario-library')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* 2. Continue Practice (Unfinished Draft Recovery OR Last Practiced Scenario) */}
          {savedDraft ? (
            <section
              aria-label={lang === 'bn' ? 'অসমাপ্ত সেশন চালিয়ে যান' : 'Continue unfinished session'}
              className="flex flex-col gap-4 rounded-2xl border border-[#22D3EE]/50 bg-[#0B1230] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#22D3EE]">
                  {lang === 'bn' ? 'অসমাপ্ত কথোপকথন সংরক্ষিত আছে' : 'Unfinished Session Draft Saved'}
                </p>
                <h2 className="mt-1 text-base font-bold text-white">
                  {lang === 'bn'
                    ? getSpeakingScenario(savedDraft.modeId).titleBn
                    : getSpeakingScenario(savedDraft.modeId).titleEn}
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  {lang === 'bn'
                    ? `${savedDraft.turns.length}টি ধাপ সম্পন্ন · ${getPressureLevelConfig(savedDraft.pressureLevel).titleBn}`
                    : `${savedDraft.turns.length} turn${savedDraft.turns.length === 1 ? '' : 's'} completed · ${getPressureLevelConfig(savedDraft.pressureLevel).titleEn}`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#22D3EE] px-4 py-2 text-xs font-semibold text-[#070B1B] hover:brightness-110 transition-all cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'সেশন চালিয়ে যান' : 'Resume Draft'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#070B1B] px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:text-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Discard'}</span>
                </button>
              </div>
            </section>
          ) : overview.lastPracticedScenarioId ? (
            <section className="flex flex-col gap-4 rounded-2xl border border-slate-800/90 bg-[#0B1230] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  {lang === 'bn' ? 'অনুশীলন চালিয়ে যান' : 'Continue Where You Left Off'}
                </p>
                <h2 className="mt-1 text-base font-bold text-white">
                  {lang === 'bn'
                    ? getSpeakingScenario(overview.lastPracticedScenarioId).titleBn
                    : getSpeakingScenario(overview.lastPracticedScenarioId).titleEn}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {lang === 'bn'
                    ? overview.improvementIndicator.summaryBn
                    : overview.improvementIndicator.summaryEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  launchConversationSession(overview.lastPracticedScenarioId!, selectedPressure)
                }
                className="inline-flex items-center gap-1.5 self-start rounded-lg bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:self-center"
              >
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'আবার অনুশীলন করুন' : 'Continue Scenario'}</span>
              </button>
            </section>
          ) : null}

          {/* 3. Speaking Practice Modes (6 Honest Modes) */}
          <section aria-labelledby="practice-modes-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-[#22D3EE]">
                  {lang === 'bn' ? '৬টি অনুশীলন মোড' : '6 Speaking Practice Modes'}
                </p>
                <h2 id="practice-modes-heading" className="mt-0.5 text-xl font-bold text-white">
                  {lang === 'bn' ? 'আপনার অনুশীলনের ধরন বেছে নিন' : 'Choose How You Want to Practice'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {practiceModes.map((mode) => (
                <article
                  key={mode.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0B1230]/85 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#22D3EE]/50"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
                      <span
                        className={
                          mode.availability === 'live' ? 'text-[#22D3EE]' : 'text-violet-300'
                        }
                      >
                        {mode.availability === 'live'
                          ? lang === 'bn'
                            ? 'লাইভ AI কোচিং'
                            : 'Live AI Coaching'
                          : lang === 'bn'
                            ? 'TTS + শব্দ স্পষ্টতা'
                            : 'Reference TTS + STT Match'}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-white">
                      {lang === 'bn' ? mode.titleBn : mode.titleEn}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                      {lang === 'bn' ? mode.descBn : mode.descEn}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-slate-800/80 pt-3">
                    <p className="text-[11px] text-slate-400">
                      {lang === 'bn' ? mode.honestScopeBn : mode.honestScopeEn}
                    </p>
                    <button
                      type="button"
                      onClick={() => handlePracticeModeClick(mode)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#22D3EE] hover:text-white transition-colors cursor-pointer"
                    >
                      <span>
                        {mode.id === 'roleplay_scenarios'
                          ? lang === 'bn'
                            ? 'দৃশ্যপট লাইব্রেরি দেখুন'
                            : 'Browse Scenarios'
                          : lang === 'bn'
                            ? 'মোড চালু করুন'
                            : 'Open Mode'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* 4. Evidence-Based Recommended Sessions */}
          <section aria-labelledby="speaking-recommendations-heading" className="space-y-4">
            <div>
              <p className="text-xs font-medium text-violet-300">
                {lang === 'bn'
                  ? 'আপনার প্রমাণভিত্তিক প্রস্তাবনা'
                  : 'Recommended From Your Real Progress'}
              </p>
              <h2
                id="speaking-recommendations-heading"
                className="mt-0.5 text-xl font-bold text-white"
              >
                {lang === 'bn'
                  ? 'পরবর্তী সেরা স্পিকিং সেশন'
                  : 'Best Next Speaking Sessions for You'}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {recommendations.map((rec) => (
                <article
                  key={rec.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0B1230]/85 p-5"
                >
                  <div>
                    <p className="font-mono text-[11px] text-violet-300">
                      {lang === 'bn'
                        ? getPressureLevelConfig(rec.recommendedPressure).titleBn
                        : getPressureLevelConfig(rec.recommendedPressure).titleEn}
                    </p>
                    <h3 className="mt-1.5 text-sm font-bold text-white">
                      {lang === 'bn' ? rec.titleBn : rec.titleEn}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {lang === 'bn' ? rec.reasonBn : rec.reasonEn}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      launchConversationSession(rec.scenarioId, rec.recommendedPressure)
                    }
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#3B82F6]/50 bg-[#3B82F6]/15 px-3.5 py-2 text-xs font-semibold text-blue-200 hover:bg-[#3B82F6] hover:text-white transition-colors cursor-pointer"
                  >
                    <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'এই সেশন শুরু করুন' : 'Start Recommended Session'}</span>
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* 5. 5-Level Pressure Ladder Setup + Quick Launch */}
          <section className="rounded-2xl border border-slate-800/90 bg-[#0B1230]/85 p-5 sm:p-6">
            <div className="border-b border-slate-800 pb-4">
              <p className="text-xs font-medium text-violet-300">
                {lang === 'bn'
                  ? '৫-স্তরের প্রেসার ল্যাডার (সাপোর্ট ও সময়সীমা নিয়ন্ত্রণ)'
                  : '5-Level Pressure Ladder · Support & Pacing Setup'}
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">
                {lang === 'bn'
                  ? 'নিয়ন্ত্রিত টেমপ্লেট থেকে ৪৫ সেকেন্ডের চ্যালেঞ্জ বেছে নিন'
                  : 'Dial Your Speaking Support Level (Levels 1 – 5)'}
              </h2>
            </div>

            <div className="mt-5">
              <PressureLadderSelector
                value={selectedPressure}
                onChange={setSelectedPressure}
                context="speaking"
              />
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#070B1B] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#22D3EE]">
                  {lang === 'bn'
                    ? `নির্বাচিত দৃশ্যপট: ${scenario.titleBn}`
                    : `Selected Scenario: ${scenario.titleEn}`}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                  “{scenario.openingPromptEn}”
                </p>
              </div>
              <button
                type="button"
                onClick={() => launchConversationSession(selectedMode, selectedPressure)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>{lang === 'bn' ? 'কথোপকথন শুরু করুন' : 'Launch Live Studio'}</span>
              </button>
            </div>
          </section>

          {/* 6. Roleplay Scenario Library (10 Scenarios with Category, Difficulty & Search) */}
          <ScenarioLibrarySection
            selectedMode={selectedMode}
            onSelectScenario={(modeId) => setSelectedMode(modeId)}
            onLaunchScenario={(modeId) => launchConversationSession(modeId, selectedPressure)}
          />

          {/* 7. Recent Speaking Sessions (Strictly Real Persisted History) */}
          <section className="rounded-2xl border border-slate-800/90 bg-[#0B1230]/85 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {lang === 'bn' ? 'সাম্প্রতিক স্পিকিং সেশন' : 'Recent Speaking Sessions'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'আপনার সংরক্ষিত সেশনগুলোর ফলাফল ও অডিও রিপ্লে দেখুন।'
                    : 'Inspect completed session results or replay full transcripts and audio.'}
                </p>
              </div>
              {speakingSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setView('replay')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22D3EE] hover:text-white cursor-pointer"
                >
                  <span>{lang === 'bn' ? 'সব রিপ্লে দেখুন' : 'Open Full Replay'}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {speakingSessions.length === 0 ? (
              <p className="mt-4 text-xs leading-relaxed text-slate-400 sm:text-sm">
                {lang === 'bn'
                  ? 'এখনো কোনো স্পিকিং সেশন সম্পন্ন হয়নি। উপরের যেকোনো দৃশ্যপট বা "কথা বলা শুরু করুন" বাটনে ক্লিক করে আপনার প্রথম সেশন শুরু করুন।'
                  : 'No completed speaking sessions yet. Start any scenario above to record your first real conversation and generate verified feedback.'}
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-800/80">
                {speakingSessions.slice(0, 5).map((sess) => {
                  const sc = getSpeakingScenario(sess.modeId);
                  return (
                    <div
                      key={sess.id}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {lang === 'bn' ? sc.titleBn : sc.titleEn}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                          {sess.turns.length} {lang === 'bn' ? 'ধাপ' : 'turns'} ·{' '}
                          {formatClock(sess.durationSeconds)} ·{' '}
                          {new Date(sess.updatedAt).toLocaleDateString(
                            lang === 'bn' ? 'bn-BD' : 'en-US',
                            { month: 'short', day: 'numeric' }
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResultsSession(sess);
                            setSessionXpAwardedAmount(0);
                            setView('results');
                          }}
                          className="rounded-lg border border-slate-700 bg-[#070B1B] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-[#22D3EE] transition-colors cursor-pointer"
                        >
                          {lang === 'bn' ? 'ফলাফল দেখুন' : 'View Results'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setView('replay')}
                          className="rounded-lg border border-slate-800 bg-[#070B1B] px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {lang === 'bn' ? 'রিপ্লে' : 'Replay'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* VIEW 5: PART 08 — LINGUAVERSE AI CONVERSATION WORKSPACE (3-PANEL RESPONSIVE) */}
      {view === 'conversation' && (
        <div className="space-y-4" data-testid="ai-conversation-workspace">
          {/* Mobile Drawer Controls (Visible < xl) */}
          <div className="flex items-center justify-between gap-2 xl:hidden">
            <button
              type="button"
              onClick={() =>
                setMobileDrawer((curr) => (curr === 'history' ? 'none' : 'history'))
              }
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                mobileDrawer === 'history'
                  ? 'border-[#22D3EE] bg-[#22D3EE]/15 text-[#22D3EE]'
                  : 'border-slate-800 bg-[#0B1230] text-slate-200'
              }`}
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'ইতিহাস ও দৃশ্যপট' : 'History & Scenarios'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setMobileDrawer((curr) => (curr === 'context' ? 'none' : 'context'))
              }
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                mobileDrawer === 'context'
                  ? 'border-violet-400 bg-violet-500/15 text-violet-200'
                  : 'border-slate-800 bg-[#0B1230] text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'শেখার সহায়তা' : 'Learning Context'}</span>
            </button>
          </div>

          {/* Mobile Collapsible Drawer Surface */}
          {mobileDrawer !== 'none' && (
            <div className="xl:hidden">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobileDrawer('none')}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#0B1230] px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'বন্ধ করুন' : 'Close Panel'}</span>
                </button>
              </div>
              {mobileDrawer === 'history' ? (
                <ConversationHistorySidebar
                  activeSessionId={sessionId}
                  activeModeId={selectedMode}
                  sessions={speakingSessions}
                  savedDraft={savedDraft}
                  onNewConversation={() => {
                    setMobileDrawer('none');
                    launchConversationSession(selectedMode, selectedPressure);
                  }}
                  onSelectScenario={(modeId) => {
                    setMobileDrawer('none');
                    launchConversationSession(modeId, selectedPressure);
                  }}
                  onInspectSession={(sess) => {
                    setMobileDrawer('none');
                    setResultsSession(sess);
                    setSessionXpAwardedAmount(0);
                    setView('results');
                  }}
                  onResumeDraft={() => {
                    setMobileDrawer('none');
                    handleResumeDraft();
                  }}
                  onDiscardDraft={handleDiscardDraft}
                />
              ) : (
                <ConversationContextSidebar
                  scenario={scenario}
                  turns={turns}
                  correctionStyle={correctionStyle}
                  onChangeCorrectionStyle={handleChangeCorrectionStyle}
                  savedVocabulary={savedVocabulary}
                  onSaveVocabulary={handleSaveVocabularyPhrase}
                  onRemoveVocabulary={handleRemoveVocabularyPhrase}
                  isContextCompressed={boundedConversationContext.isWindowCompressed}
                  summarizedEntryCount={boundedConversationContext.summarizedEntryCount}
                />
              )}
            </div>
          )}

          {/* Desktop 3-Panel Responsive Workspace Grid */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            {/* LEFT PANEL: Conversation History, Search & Scenario Shortcuts */}
            {showLeftPanel && (
              <div className="hidden xl:block xl:col-span-3">
                <ConversationHistorySidebar
                  activeSessionId={sessionId}
                  activeModeId={selectedMode}
                  sessions={speakingSessions}
                  savedDraft={savedDraft}
                  onNewConversation={() => launchConversationSession(selectedMode, selectedPressure)}
                  onSelectScenario={(modeId) => launchConversationSession(modeId, selectedPressure)}
                  onInspectSession={(sess) => {
                    setResultsSession(sess);
                    setSessionXpAwardedAmount(0);
                    setView('results');
                  }}
                  onResumeDraft={handleResumeDraft}
                  onDiscardDraft={handleDiscardDraft}
                  onCollapse={() => setShowLeftPanel(false)}
                />
              </div>
            )}

            {/* CENTER PANEL: AI Conversation Header + Orb + Stream + Multimodal Composer */}
            <div
              className={`flex flex-col space-y-4 ${
                showLeftPanel && showRightPanel
                  ? 'xl:col-span-6'
                  : showLeftPanel || showRightPanel
                    ? 'xl:col-span-9'
                    : 'xl:col-span-12'
              }`}
            >
              {/* 1. AI Conversation Header */}
              <section
                aria-label={lang === 'bn' ? 'AI কথোপকথন শিরোনাম' : 'AI Conversation Header'}
                className="rounded-2xl border border-slate-800/90 bg-[#0B1230]/95 px-4 py-3.5 sm:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                      {!showLeftPanel && (
                        <button
                          type="button"
                          onClick={() => setShowLeftPanel(true)}
                          aria-label={lang === 'bn' ? 'ইতিহাস প্যানেল দেখান' : 'Expand history panel'}
                          className="hidden xl:inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#070B1B] px-2 py-0.5 text-slate-300 hover:border-[#22D3EE] hover:text-white cursor-pointer"
                        >
                          <PanelLeftOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{lang === 'bn' ? 'ইতিহাস' : 'History'}</span>
                        </button>
                      )}
                      <span
                        data-testid="conversation-honest-status"
                        className={`font-semibold ${
                          conversationStatus.tone === 'cyan'
                            ? 'text-[#22D3EE]'
                            : conversationStatus.tone === 'violet'
                              ? 'text-violet-300'
                              : conversationStatus.tone === 'blue'
                                ? 'text-blue-300'
                                : conversationStatus.tone === 'amber'
                                  ? 'text-amber-300'
                                  : 'text-slate-400'
                        }`}
                      >
                        {lang === 'bn' ? conversationStatus.labelBn : conversationStatus.labelEn}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-300">
                        {lang === 'bn' ? 'English · EN/বাংলা কোচিং' : 'English · EN/বাংলা Coaching'}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {formatClock(sessionElapsedSeconds)}
                      </span>
                    </div>

                    <h2 className="mt-1 text-base font-bold text-white sm:text-lg">
                      {lang === 'bn' ? scenario.titleBn : scenario.titleEn}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-400">
                      <span className="text-slate-300">
                        {lang === 'bn' ? scenario.aiPersonaBn : scenario.aiPersonaEn}
                      </span>{' '}
                      · {lang === 'bn' ? pressureConfig.shortLabelBn : pressureConfig.shortLabelEn}
                      {sessionXpAwardedAmount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 font-mono font-semibold text-amber-300 tabular-nums">
                          <Award className="h-3 w-3" aria-hidden="true" />+{sessionXpAwardedAmount}{' '}
                          XP
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Header Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        isSessionPaused
                          ? 'border-[#22D3EE] bg-[#22D3EE]/15 text-[#22D3EE]'
                          : 'border-slate-700 bg-[#070B1B] text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      {isSessionPaused ? (
                        <>
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{lang === 'bn' ? 'চালিয়ে যান' : 'Resume'}</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{lang === 'bn' ? 'বিরতি' : 'Pause'}</span>
                        </>
                      )}
                    </button>

                    {turns.length > 0 && (
                      <button
                        type="button"
                        onClick={handleFinishToResults}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#22D3EE] px-3 py-1.5 text-xs font-semibold text-[#070B1B] hover:brightness-110 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'শেষ করুন' : 'End Conversation'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleRequestExitConversation}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#070B1B] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'প্রস্থান' : 'Exit'}</span>
                    </button>

                    {!showRightPanel && (
                      <button
                        type="button"
                        onClick={() => setShowRightPanel(true)}
                        aria-label={lang === 'bn' ? 'শেখার সহায়তা দেখান' : 'Expand learning context panel'}
                        className="hidden xl:inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#070B1B] px-2.5 py-1.5 text-xs text-slate-300 hover:border-violet-400 hover:text-white cursor-pointer"
                      >
                        <PanelRightOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'সহায়তা' : 'Context'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* 2. Holographic AI Voice Orb + Live Microphone Waveform + Pressure Guidance */}
              <section
                aria-label={lang === 'bn' ? 'AI ভয়েস অর্ব ও অডিও ওয়েভফর্ম' : 'AI Voice Presence'}
                className="rounded-2xl border border-slate-800/90 bg-gradient-to-b from-[#0B1230] to-[#070B1B] p-4 sm:p-5"
              >
                <VoiceUniverseOrb
                  state={orbState}
                  size="compact"
                  mediaStream={activeMediaStream}
                  recordingSeconds={recordingSeconds}
                  statusDetailEn={
                    isSessionPaused
                      ? 'Session paused — press Resume or start speaking when ready'
                      : isRecording
                        ? `Recording local audio + browser speech transcription (max ${MAX_RECORDING_SECONDS}s)`
                        : isEvaluating
                          ? 'Analyzing transcript & generating next conversational reply'
                          : isSpeakingPrompt
                            ? 'Playing AI coach reply via browser speech synthesis'
                            : 'Speak naturally with voice capture or type your reply below'
                  }
                  statusDetailBn={
                    isSessionPaused
                      ? 'সেশন বিরতিতে আছে — প্রস্তুত হলে চালিয়ে যান'
                      : isRecording
                        ? `অডিও রেকর্ড ও ব্রাউজার স্পিচ ট্রান্সক্রিপশন চলছে (সর্বোচ্চ ${MAX_RECORDING_SECONDS}s)`
                        : isEvaluating
                          ? 'আপনার উত্তর বিশ্লেষণ করে পরবর্তী প্রশ্ন তৈরি হচ্ছে'
                          : isSpeakingPrompt
                            ? 'ব্রাউজার TTS দিয়ে AI-এর উত্তর বাজানো হচ্ছে'
                            : 'ভয়েস রেকর্ড করুন অথবা নিচে ইংরেজিতে টাইপ করুন'
                  }
                />

                {/* Level 1 Templates / Level 2 Cues / Level 4 Twist */}
                {pressureConfig.showTemplates ? (
                  <div className="mt-3.5 rounded-xl border border-slate-800 bg-[#070B1B]/90 p-3">
                    <p className="text-[11px] font-semibold text-violet-300">
                      {lang === 'bn'
                        ? 'লেভেল ১ বাক্য টেমপ্লেট (Controlled Practice)'
                        : 'Level 1 Sentence Templates'}
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs font-mono text-slate-200">
                      {scenario.guidedHintsEn.map((hint, idx) => (
                        <li key={idx}>
                          {idx + 1}. {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : pressureConfig.showHints ? (
                  <div className="mt-3.5 rounded-xl border border-slate-800 bg-[#070B1B]/90 p-3">
                    <p className="text-[11px] font-semibold text-violet-300">
                      {lang === 'bn'
                        ? 'লেভেল ২ বুলেট কিউ (Guided Cues)'
                        : 'Level 2 Guided Speaking Cues'}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
                      {scenario.guidedHintsEn.map((hint, idx) => (
                        <li key={idx}>• {hint}</li>
                      ))}
                    </ul>
                  </div>
                ) : pressureConfig.introducesTwist ? (
                  <div className="mt-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    <span className="font-semibold">
                      {lang === 'bn' ? 'লেভেল ৪ অপ্রত্যাশিত টুইস্ট:' : 'Level 4 Unexpected Twist:'}
                    </span>{' '}
                    {lang === 'bn'
                      ? 'কোনো হিন্ট নেই — প্রতিটি উত্তরের পর AI নতুন পাল্টা শর্ত বা প্রশ্ন জুড়ে দেবে।'
                      : 'Zero hints — the AI will introduce an unexpected follow-up twist in its reply.'}
                  </div>
                ) : null}

                {/* Time-Limited Pressure Bar */}
                {pressureConfig.timeLimitSeconds !== null && remainingSeconds !== null && (
                  <div
                    className={`mt-3 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
                      remainingSeconds <= 10
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                        : 'border-slate-800 bg-[#070B1B] text-slate-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {turnTimedOut
                          ? lang === 'bn'
                            ? '৪৫ সেকেন্ড শেষ — তবুও উত্তর জমা দিতে পারবেন'
                            : '45s timer finished — you can still submit'
                          : isSessionPaused
                            ? lang === 'bn'
                              ? 'টাইমার বিরতিতে আছে'
                              : 'Pressure timer paused'
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

              {/* 3. Structured AI Conversation Message Stream */}
              <section className="flex min-h-[340px] max-h-[540px] flex-col rounded-2xl border border-slate-800/90 bg-[#070B1B]/90 p-4">
                <ConversationMessageStream
                  scenarioId={selectedMode}
                  aiPersonaEn={scenario.aiPersonaEn}
                  aiPersonaBn={scenario.aiPersonaBn}
                  openingPromptEn={scenario.openingPromptEn}
                  openingPromptBnHint={scenario.openingPromptBnHint}
                  suggestedVocabulary={scenario.suggestedVocabulary}
                  turns={turns}
                  explanationPref={explanationPref}
                  playbackSpeed={playbackSpeed}
                  isEvaluating={isEvaluating}
                  savedVocabulary={savedVocabulary}
                  syncedMistakes={mistakes}
                  onSaveVocabulary={handleSaveVocabularyPhrase}
                  onReportIncorrectFeedback={handleReportIncorrectFeedback}
                />
              </section>

              {/* Privacy Consent Banner before activating Microphone */}
              {showPrivacyBanner && !micConsentGranted && (
                <section
                  aria-label="Microphone privacy consent"
                  className="rounded-xl border border-[#22D3EE]/45 bg-[#0B1230] p-4"
                >
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#22D3EE]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white">
                        {lang === 'bn'
                          ? 'মাইক্রোফোন গোপনীয়তা সম্মতি'
                          : 'Microphone Privacy Consent'}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        {lang === 'bn'
                          ? 'আপনার অডিও কেবল আপনার ব্রাউজারের IndexedDB-তে সংরক্ষিত হয়। AI মূল্যায়নের জন্য কেবল টেক্সট ট্রান্সক্রিপ্ট পাঠানো হয়। মাইক্রোফোন ছাড়াই নিচে টাইপ করে কথা বলতে পারবেন।'
                          : 'Voice recordings stay locally in your browser (IndexedDB) for self-review. Only the transcribed text is sent to our server-side Gemini evaluator. You can also type anytime without microphone access.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleConsentAndRecord}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
                        >
                          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {lang === 'bn'
                              ? 'সম্মতি দিন ও রেকর্ড করুন'
                              : 'I Consent — Activate Microphone'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPrivacyBanner(false)}
                          className="rounded-lg border border-slate-700 bg-[#070B1B] px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {lang === 'bn' ? 'টেক্সট ব্যবহার করব' : 'Use Text Input Instead'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 4. Multimodal Voice + Text Composer */}
              <section
                aria-label={lang === 'bn' ? 'বার্তা ও ভয়েস ইনপুট কম্পোজার' : 'Conversation message composer'}
                className="rounded-2xl border border-slate-800/90 bg-[#0B1230] p-4 sm:p-5 space-y-3.5"
              >
                {/* Voice Capture Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isEvaluating}
                      onClick={handleMicButtonClick}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                        isRecording
                          ? 'bg-rose-600 text-white hover:bg-rose-500'
                          : 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          <span>
                            {lang === 'bn'
                              ? `রেকর্ডিং থামান (${formatClock(recordingSeconds)})`
                              : `Stop Recording (${formatClock(recordingSeconds)})`}
                          </span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {lang === 'bn' ? 'ভয়েস রেকর্ড করুন' : 'Record Voice Response'}
                          </span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] text-slate-400">
                      {speechRecAvailable
                        ? lang === 'bn'
                          ? 'ভয়েস রেকর্ডিং + ব্রাউজার স্পিচ ট্রান্সক্রিপশন'
                          : 'Voice Recording + Browser Speech Transcription'
                        : lang === 'bn'
                          ? 'ব্রাউজার STT নেই — অডিও রেকর্ড করুন বা টাইপ করুন'
                          : 'Browser STT unavailable — record audio or type below'}
                    </span>
                  </div>

                  {capturedAudioBlob && (
                    <span className="font-mono text-xs text-emerald-400 tabular-nums">
                      {lang === 'bn'
                        ? `অডিও প্রস্তুত (${capturedAudioDuration}s)`
                        : `Audio captured (${capturedAudioDuration}s)`}
                    </span>
                  )}
                </div>

                {/* Mic Error Alert */}
                {micError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200"
                  >
                    <MicOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    <span>{micError}</span>
                  </div>
                )}

                {/* Self-Review Recorded Audio Preview */}
                {capturedAudioUrl && (
                  <div className="rounded-lg border border-slate-800 bg-[#070B1B] p-3">
                    <p className="mb-1.5 text-[11px] font-medium text-slate-300">
                      {lang === 'bn'
                        ? 'পাঠানোর আগে আপনার রেকর্ডকৃত কণ্ঠস্বর শুনুন'
                        : 'Preview your recorded audio before sending'}
                    </p>
                    <audio
                      controls
                      src={capturedAudioUrl}
                      aria-label="Preview your current voice recording"
                      className="h-8 w-full"
                    />
                  </div>
                )}

                {/* Editable Transcript / Text Input */}
                <div>
                  <label
                    htmlFor="speaking-transcript-input"
                    className="sr-only"
                  >
                    {lang === 'bn'
                      ? 'আপনার ইংরেজি বার্তা লিখুন বা ভয়েস ট্রান্সক্রিপ্ট সম্পাদনা করুন'
                      : 'Type your English message or edit your voice transcript'}
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
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        if (!isEvaluating && (draftTranscript.trim() || interimTranscript.trim())) {
                          void handleEvaluateTurn();
                        }
                      }
                    }}
                    placeholder={
                      lang === 'bn'
                        ? 'স্বাভাবিকভাবে কথা বলুন অথবা এখানে আপনার ইংরেজি উত্তর টাইপ করুন... (Ctrl+Enter চাপুন পাঠাতে)'
                        : 'Speak with voice capture or type your natural English reply here... (Ctrl+Enter to send)'
                    }
                    className="block w-full rounded-xl border border-slate-700 bg-[#070B1B] px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:border-[#22D3EE] focus:outline-none disabled:opacity-60"
                  />
                </div>

                {/* API Error Banner with Retry (Preserves Recording & Text) */}
                {apiError && (
                  <div
                    role="alert"
                    className="flex flex-col gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/25 p-3.5 text-xs text-rose-200 sm:flex-row sm:items-center sm:justify-between"
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
                      onClick={() => void handleEvaluateTurn()}
                      disabled={isEvaluating}
                      className="inline-flex items-center gap-1.5 self-start rounded-lg border border-rose-400/50 bg-rose-900/40 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800/60 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'আবার চেষ্টা করুন' : 'Retry'}</span>
                    </button>
                  </div>
                )}

                {/* Bottom Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                  <div className="flex items-center gap-2">
                    {(draftTranscript.trim() || interimTranscript.trim() || capturedAudioBlob) && (
                      <button
                        type="button"
                        disabled={isEvaluating}
                        onClick={() => clearTurnDraft()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#070B1B] px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer disabled:opacity-50"
                      >
                        <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Clear Draft'}</span>
                      </button>
                    )}
                    <span className="hidden sm:inline text-[11px] text-slate-400">
                      {lang === 'bn'
                        ? 'নিশ্চিত ভুল (>= ৭০%) Mistake Memory-তে সিঙ্ক হয়'
                        : 'Confirmed mistakes (>= 70%) sync to Mistake Memory'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isEvaluating || !(draftTranscript.trim() || interimTranscript.trim())}
                    onClick={() => void handleEvaluateTurn()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-45 transition-all cursor-pointer disabled:cursor-not-allowed sm:text-sm"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>
                          {lang === 'bn' ? 'বিশ্লেষণ চলছে...' : 'Analyzing & Replying...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden="true" />
                        <span>{lang === 'bn' ? 'বার্তা পাঠান' : 'Send Message'}</span>
                      </>
                    )}
                  </button>
                </div>
              </section>
            </div>

            {/* RIGHT PANEL: Collapsible Contextual Learning Support */}
            {showRightPanel && (
              <div className="hidden xl:block xl:col-span-3">
                <ConversationContextSidebar
                  scenario={scenario}
                  turns={turns}
                  correctionStyle={correctionStyle}
                  onChangeCorrectionStyle={handleChangeCorrectionStyle}
                  savedVocabulary={savedVocabulary}
                  onSaveVocabulary={handleSaveVocabularyPhrase}
                  onRemoveVocabulary={handleRemoveVocabularyPhrase}
                  isContextCompressed={boundedConversationContext.isWindowCompressed}
                  summarizedEntryCount={boundedConversationContext.summarizedEntryCount}
                  onCollapse={() => setShowRightPanel(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exit Session Confirmation Modal */}
      {showExitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-speaking-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0B1230] p-6 shadow-2xl">
            <h3 id="exit-speaking-modal-title" className="text-lg font-bold text-white">
              {lang === 'bn' ? 'কথোপকথন থেকে বের হবেন?' : 'Leave Active Speaking Session?'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {lang === 'bn'
                ? 'আপনি চাইলে এই সেশনটি ড্রাফট হিসেবে সংরক্ষণ করে পরে আবার এখান থেকে শুরু করতে পারেন, অথবা এখনই ফলাফল দেখতে পারেন।'
                : 'You can save this session as a draft to continue later, jump straight to your Session Results, or discard the draft.'}
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSaveDraftAndExit}
                className="w-full rounded-lg bg-[#22D3EE] px-4 py-2.5 text-xs font-semibold text-[#070B1B] hover:brightness-110 transition-all cursor-pointer"
              >
                {lang === 'bn' ? 'ড্রাফট সংরক্ষণ করে বের হন' : 'Save Draft & Exit to Studio Home'}
              </button>
              {turns.length > 0 && (
                <button
                  type="button"
                  onClick={handleFinishToResults}
                  className="w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? 'সেশন শেষ করে ফলাফল দেখুন' : 'Finish & View Session Results'}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="rounded-lg border border-slate-700 bg-[#070B1B] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 cursor-pointer"
                >
                  {lang === 'bn' ? 'অনুশীলন চালিয়ে যান' : 'Keep Practicing'}
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndExit}
                  className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/50 cursor-pointer"
                >
                  {lang === 'bn' ? 'ড্রাফট মুছে বের হন' : 'Discard Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </LearnerShell>
  );
}
