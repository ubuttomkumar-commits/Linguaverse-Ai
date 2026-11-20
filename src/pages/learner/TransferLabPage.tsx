import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  FlaskConical,
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
  XCircle,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { PressureLadderSelector } from '../../components/shared/PressureLadderSelector';
import { VerifiedGamificationPanel } from '../../components/gamification/VerifiedGamificationPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  buildTransferRecommendations,
  getTransferScenario,
  type TransferScenarioRecommendation,
} from '../../domain/transferLabEngine';
import { getPressureLadderTier } from '../../domain/pressureLadder';
import { requestTransferEvaluation } from '../../services/transferApi';
import { fetchSpeakingHealth, SpeakingClientError, type SpeakingHealthResponse } from '../../services/speakingApi';
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
  PressureLadderLevelId,
  SpeakingInputChannel,
  TransferAttemptRecord,
  TransferRubricEvaluation,
  TransferScenarioId,
  XpLedgerEntry,
} from '../../types/domain';

type TransferTab = 'scenarios' | 'xp' | 'history';

export function TransferLabPage() {
  const { lang, t } = useLanguage();
  const {
    profile,
    mistakes,
    lessonMastery,
    speakingSessions,
    transferAttempts,
    xpLedger,
    totalVerifiedXp,
    recordTransferAttempt,
  } = useAuth();

  const explanationPref = profile?.explanationLanguage ?? 'both';
  const learnerLevel = profile?.selfEstimatedLevel ?? 'A2';

  const [activeTab, setActiveTab] = useState<TransferTab>('scenarios');
  const [serverHealth, setServerHealth] = useState<SpeakingHealthResponse | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false);

  // Personalized recommendations connected directly to Mistake Memory & Academy lessons
  const recommendations = useMemo(
    () =>
      buildTransferRecommendations({
        mistakes,
        lessonMastery,
        transferAttempts,
      }),
    [mistakes, lessonMastery, transferAttempts]
  );

  const [selectedScenarioId, setSelectedScenarioId] = useState<TransferScenarioId>(
    recommendations[0]?.scenario.id ?? 'job_interview_followup'
  );
  const [selectedPressure, setSelectedPressure] = useState<PressureLadderLevelId>(
    recommendations[0]?.recommendedLevel ?? 'level_2_guided'
  );

  const selectedRecommendation: TransferScenarioRecommendation = useMemo(
    () =>
      recommendations.find((r) => r.scenario.id === selectedScenarioId) ?? recommendations[0],
    [recommendations, selectedScenarioId]
  );

  const scenario = selectedRecommendation.scenario;
  const activeTier = useMemo(
    () => getPressureLadderTier(selectedPressure),
    [selectedPressure]
  );

  const passedLevelsForScenario = useMemo(() => {
    const set = new Set<PressureLadderLevelId>();
    for (const attempt of transferAttempts) {
      if (attempt.scenarioId === selectedScenarioId && attempt.passed) {
        set.add(attempt.pressureLevel);
      }
    }
    return Array.from(set);
  }, [transferAttempts, selectedScenarioId]);

  const linkedMistakePattern = useMemo(() => {
    if (
      selectedRecommendation.linkedSourceType !== 'mistake_memory' ||
      !selectedRecommendation.linkedSourceId
    ) {
      return undefined;
    }
    const found = mistakes.find((m) => m.id === selectedRecommendation.linkedSourceId);
    return found ? `"${found.userExample}" -> "${found.correctedExample}" (${found.category})` : undefined;
  }, [selectedRecommendation, mistakes]);

  // Active challenge runner state
  const [challengeActive, setChallengeActive] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [usedVoice, setUsedVoice] = useState(false);
  const [editedManually, setEditedManually] = useState(false);
  const [micConsentGranted, setMicConsentGranted] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);

  // Level 4 Unexpected Twist two-step state
  const [awaitingTwistReply, setAwaitingTwistReply] = useState(false);
  const [initialResponseSaved, setInitialResponseSaved] = useState('');
  const [activeTwistEn, setActiveTwistEn] = useState('');
  const [activeTwistBn, setActiveTwistBn] = useState('');

  // Level 5 Timed High-Stakes countdown
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Latest completed evaluation result
  const [latestEvaluation, setLatestEvaluation] = useState<TransferRubricEvaluation | null>(null);
  const [latestSavedAttempt, setLatestSavedAttempt] = useState<TransferAttemptRecord | null>(null);
  const [latestAwardedXp, setLatestAwardedXp] = useState<XpLedgerEntry[]>([]);

  const challengeStartMsRef = useRef<number>(Date.now());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartMsRef = useRef<number>(0);

  const mediaRecorderAvailable = isMediaRecorderSupported();
  const speechRecAvailable = isSpeechRecognitionSupported();

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

  // Countdown timer for Level 5 High-Stakes Simulation
  useEffect(() => {
    if (!challengeActive || activeTier.transferTimeLimitSeconds === null || isGrading || latestEvaluation) {
      return;
    }
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [challengeActive, activeTier.transferTimeLimitSeconds, isGrading, latestEvaluation, remainingSeconds]);

  const speakText = (text: string) => {
    setIsSpeakingPrompt(true);
    const started = speakEnglishExample({
      text,
      rate: playbackSpeed,
      onEnd: () => setIsSpeakingPrompt(false),
      onError: () => setIsSpeakingPrompt(false),
    });
    if (!started) setIsSpeakingPrompt(false);
  };

  const stopVoiceCapture = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    try {
      speechRecRef.current?.stop();
    } catch {
      // Ignore
    }
    speechRecRef.current = null;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        // Ignore
      }
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const resetChallengeState = () => {
    stopVoiceCapture();
    stopSpeaking();
    setIsSpeakingPrompt(false);
    setDraftText('');
    setInterimText('');
    setUsedVoice(false);
    setEditedManually(false);
    setMicError(null);
    setApiError(null);
    setAwaitingTwistReply(false);
    setInitialResponseSaved('');
    setActiveTwistEn('');
    setActiveTwistBn('');
    setLatestEvaluation(null);
    setLatestSavedAttempt(null);
    setLatestAwardedXp([]);
    setTimedOut(false);
    setRemainingSeconds(activeTier.transferTimeLimitSeconds);
    challengeStartMsRef.current = Date.now();
  };

  const handleLaunchChallenge = (
    scenarioIdOverride?: TransferScenarioId,
    levelOverride?: PressureLadderLevelId
  ) => {
    const nextScenarioId = scenarioIdOverride ?? selectedScenarioId;
    const nextLevel = levelOverride ?? selectedPressure;
    setSelectedScenarioId(nextScenarioId);
    setSelectedPressure(nextLevel);
    const nextTier = getPressureLadderTier(nextLevel);

    stopVoiceCapture();
    stopSpeaking();
    setIsSpeakingPrompt(false);
    setDraftText('');
    setInterimText('');
    setUsedVoice(false);
    setEditedManually(false);
    setMicError(null);
    setApiError(null);
    setAwaitingTwistReply(false);
    setInitialResponseSaved('');
    setActiveTwistEn('');
    setActiveTwistBn('');
    setLatestEvaluation(null);
    setLatestSavedAttempt(null);
    setLatestAwardedXp([]);
    setTimedOut(false);
    setRemainingSeconds(nextTier.transferTimeLimitSeconds);
    challengeStartMsRef.current = Date.now();
    setChallengeActive(true);
    setActiveTab('scenarios');
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

      recordingStartMsRef.current = Date.now();
      setRecordingSeconds(0);
      recorder.onstop = () => {
        setUsedVoice(true);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setShowPrivacyBanner(false);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartMsRef.current) / 1000));
      }, 500);

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
              setDraftText((prev) =>
                prev.trim() ? `${prev.trim()} ${finalAppend.trim()}` : finalAppend.trim()
              );
              setUsedVoice(true);
            }
            setInterimText(interim.trim());
          };
          rec.onend = () => setInterimText('');
          rec.start();
          speechRecRef.current = rec;
        } catch {
          // Graceful fallback if STT fails
        }
      }
    } catch (err) {
      const classified = classifyMicError(err);
      setMicError(lang === 'bn' ? classified.messageBn : classified.messageEn);
      setIsRecording(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopVoiceCapture();
      return;
    }
    if (!micConsentGranted) {
      setShowPrivacyBanner(true);
      return;
    }
    void startVoiceCapture();
  };

  const handleSubmitResponse = async () => {
    if (isRecording) {
      stopVoiceCapture();
    }

    const combined = `${draftText} ${interimText}`.trim();
    if (!combined) {
      setApiError(
        lang === 'bn'
          ? 'মূল্যায়নের আগে আপনার ইংরেজি উত্তর বলুন অথবা টাইপ করুন।'
          : 'Please speak or type your English response before submitting for rubric grading.'
      );
      return;
    }

    setApiError(null);
    setIsGrading(true);

    const inputChannel: SpeakingInputChannel = !usedVoice
      ? 'text_fallback'
      : editedManually
        ? 'voice_with_manual_edit'
        : 'voice_stt';

    const allowAiTelemetry = profile?.privacyConsent?.logAiEvaluations !== false;

    try {
      // Level 4 Round 1: request an unexpected in-character twist before final rubric grading
      if (selectedPressure === 'level_4_twist' && !awaitingTwistReply) {
        const { evaluation } = await requestTransferEvaluation(
          {
            scenarioId: selectedScenarioId,
            pressureLevel: selectedPressure,
            stage: 'initial',
            userResponse: combined,
            targetSkillLabelEn: selectedRecommendation.targetSkillLabelEn,
            linkedMistakePattern,
            inputChannel,
            learnerLevel,
            explanationLanguage: explanationPref,
            timedOut,
          },
          { logTelemetry: allowAiTelemetry, userId: profile?.userId }
        );

        const twistEn = evaluation.unexpected_twist_en ?? scenario.fallbackTwistEn;
        const twistBn = evaluation.unexpected_twist_bn ?? scenario.fallbackTwistBn;
        setInitialResponseSaved(combined);
        setActiveTwistEn(twistEn);
        setActiveTwistBn(twistBn);
        setAwaitingTwistReply(true);
        setDraftText('');
        setInterimText('');
        speakText(twistEn);
        return;
      }

      // Final rubric grading (Level 1/2/3/5 single round, OR Level 4 Round 2 with Twist Reply)
      const isTwistFollowup = selectedPressure === 'level_4_twist' && awaitingTwistReply;
      const { evaluation } = await requestTransferEvaluation(
        {
          scenarioId: selectedScenarioId,
          pressureLevel: selectedPressure,
          stage: isTwistFollowup ? 'twist_followup' : 'initial',
          userResponse: isTwistFollowup ? initialResponseSaved : combined,
          twistPromptShown: isTwistFollowup ? activeTwistEn : undefined,
          twistResponse: isTwistFollowup ? combined : undefined,
          targetSkillLabelEn: selectedRecommendation.targetSkillLabelEn,
          linkedMistakePattern,
          inputChannel,
          learnerLevel,
          explanationLanguage: explanationPref,
          timedOut,
        },
        { logTelemetry: allowAiTelemetry, userId: profile?.userId }
      );

      const durationSeconds = Math.max(
        10,
        Math.round((Date.now() - challengeStartMsRef.current) / 1000)
      );

      const saved = await recordTransferAttempt({
        scenarioId: selectedScenarioId,
        pressureLevel: selectedPressure,
        linkedSourceType: selectedRecommendation.linkedSourceType,
        linkedSourceId: selectedRecommendation.linkedSourceId,
        targetSkillLabelEn: selectedRecommendation.targetSkillLabelEn,
        targetSkillLabelBn: selectedRecommendation.targetSkillLabelBn,
        userResponse: isTwistFollowup ? initialResponseSaved : combined,
        twistPromptShown: isTwistFollowup ? activeTwistEn : undefined,
        twistResponse: isTwistFollowup ? combined : undefined,
        inputChannel,
        durationSeconds,
        timedOut,
        evaluation,
      });

      setLatestEvaluation(evaluation);
      setLatestSavedAttempt(saved.transferAttempt);
      setLatestAwardedXp(saved.newlyAwardedXp);
    } catch (err) {
      const msg =
        err instanceof SpeakingClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to grade your Transfer Lab response right now. Your answer is preserved — please retry.';
      setApiError(msg);
    } finally {
      setIsGrading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 16);
    }
  };

  const rubricCards = latestEvaluation
    ? [
        {
          key: 'task_completion',
          titleEn: 'Task Completion',
          titleBn: 'কাজের পূর্ণতা (Task Completion)',
          dim: latestEvaluation.task_completion,
        },
        {
          key: 'target_grammar_application',
          titleEn: 'Target Grammar Application',
          titleBn: 'টার্গেট ব্যাকরণের প্রয়োগ',
          dim: latestEvaluation.target_grammar_application,
        },
        {
          key: 'contextual_appropriateness',
          titleEn: 'Contextual Appropriateness',
          titleBn: 'পরিস্থিতি অনুযায়ী উপযোগিতা',
          dim: latestEvaluation.contextual_appropriateness,
        },
        {
          key: 'response_relevance',
          titleEn: 'Response Relevance',
          titleBn: 'উত্তরের প্রাসঙ্গিকতা',
          dim: latestEvaluation.response_relevance,
        },
      ]
    : [];

  return (
    <LearnerShell
      title={t.workspace.modules.transferTitle}
      subtitle={
        lang === 'bn'
          ? 'নিয়ম শেখা থেকে বাস্তব যোগাযোগে রূপান্তর — ৫-স্তরের প্রেসার ল্যাডার, ৪-রুব্রিক AI মূল্যায়ন ও যাচাইকৃত XP লেজার।'
          : 'Bridge rule study into unscripted real-world communication with the 5-level Pressure Ladder, 4-rubric AI grading, and verified XP.'
      }
    >
      {/* Top Workspace Bar */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Transfer Lab sections"
          className="grid w-full grid-cols-3 gap-1 rounded-lg border border-slate-800 bg-[#111827] p-1 sm:inline-flex sm:w-auto sm:items-center sm:self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'scenarios'}
            onClick={() => setActiveTab('scenarios')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:px-3.5 sm:text-xs ${
              activeTab === 'scenarios'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{lang === 'bn' ? 'সিনারিও' : 'Scenarios'}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'xp'}
            onClick={() => setActiveTab('xp')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:px-3.5 sm:text-xs ${
              activeTab === 'xp'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? `XP (${totalVerifiedXp})`
                : `Verified XP (${totalVerifiedXp})`}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer sm:px-3.5 sm:text-xs ${
              activeTab === 'history'
                ? 'bg-[#3B82F6] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? `ইতিহাস (${transferAttempts.length})`
                : `History (${transferAttempts.length})`}
            </span>
          </button>
        </div>

        {/* Verified XP & Speed readout */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-mono text-slate-300 tabular-nums">
            {lang === 'bn' ? 'মোট যাচাইকৃত XP:' : 'Verified XP:'}{' '}
            <strong className="text-[#F59E0B]">{totalVerifiedXp} XP</strong>
          </span>

          <div
            role="group"
            aria-label="Prompt audio speed"
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

      {/* Gemini Key Missing Warning */}
      {serverHealth && !serverHealth.configured && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-4 text-xs leading-relaxed text-amber-200 sm:text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <span>
            {lang === 'bn'
              ? 'সার্ভারে GEMINI_API_KEY এখনো সেট করা নেই। লাইভ ৪-রুব্রিক মূল্যায়ন চালাতে Settings > Secrets-এ GEMINI_API_KEY যুক্ত করুন।'
              : 'GEMINI_API_KEY is not configured on the server. Add it in Settings > Secrets to run live 4-rubric Transfer Lab grading.'}
          </span>
        </div>
      )}

      {/* TAB 2: Verified XP & Achievements Ledger */}
      {activeTab === 'xp' ? (
        <VerifiedGamificationPanel
          xpLedger={xpLedger}
          lessonMastery={lessonMastery}
          speakingSessions={speakingSessions}
          mistakes={mistakes}
          transferAttempts={transferAttempts}
        />
      ) : activeTab === 'history' ? (
        /* TAB 3: Attempt History */
        <section
          aria-label="Transfer Lab attempt history"
          className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                {lang === 'bn' ? 'ট্রান্সফার ল্যাব মূল্যায়ন ইতিহাস' : 'Verified Transfer Attempt Ledger'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'প্রতিটি প্রচেষ্টার ৪টি রুব্রিক স্কোর, প্রেসার লেভেল ও ফলাফল সংরক্ষিত।'
                  : 'Every submitted Transfer Lab simulation with its exact Pressure Ladder tier and 4-rubric breakdown.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('scenarios')}
              className="rounded-lg bg-[#3B82F6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap cursor-pointer"
            >
              {lang === 'bn' ? 'নতুন সিনারিও শুরু করুন' : 'Start Transfer Scenario'}
            </button>
          </div>

          {transferAttempts.length === 0 ? (
            <div className="mt-5 rounded-lg border border-slate-800 bg-[#0A0F1C] p-6 text-sm text-slate-400">
              <p className="font-semibold text-slate-200">
                {lang === 'bn'
                  ? 'এখনো কোনো ট্রান্সফার চ্যালেঞ্জ জমা দেওয়া হয়নি।'
                  : '0 Transfer Lab attempts recorded yet.'}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                {lang === 'bn'
                  ? 'উপরের ৫টি বাস্তব সিনারিওর যেকোনো একটি নির্বাচন করে আপনার প্রথম ৪-রুব্রিক মূল্যায়ন সম্পন্ন করুন।'
                  : 'Select any of the 5 structured scenarios and complete your first rubric-graded simulation to record verified results here.'}
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-800/80">
              {transferAttempts.map((att) => {
                const sc = getTransferScenario(att.scenarioId);
                const tier = getPressureLadderTier(att.pressureLevel);
                return (
                  <div key={att.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">
                          {lang === 'bn' ? sc.titleBn : sc.titleEn}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-mono text-[#8B5CF6]">
                          {lang === 'bn' ? tier.shortLabelBn : tier.shortLabelEn}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {formatDate(att.completedAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <span
                          className={
                            att.passed
                              ? 'font-semibold text-emerald-400'
                              : 'font-semibold text-amber-300'
                          }
                        >
                          {att.evaluation.overall_score}% ·{' '}
                          {att.passed
                            ? lang === 'bn'
                              ? 'উত্তীর্ণ'
                              : 'PASSED'
                            : lang === 'bn'
                              ? 'পুনরায় চেষ্টা করুন'
                              : 'RETRY'}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-300">
                      {lang === 'bn' ? att.targetSkillLabelBn : att.targetSkillLabelEn}
                    </p>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[11px] tabular-nums">
                      <div className="rounded-md border border-slate-800 bg-[#0A0F1C] px-2.5 py-1.5 text-slate-300">
                        {lang === 'bn' ? 'কাজ' : 'Task'}:{' '}
                        <strong className="text-white">{att.evaluation.task_completion.score}%</strong>
                      </div>
                      <div className="rounded-md border border-slate-800 bg-[#0A0F1C] px-2.5 py-1.5 text-slate-300">
                        {lang === 'bn' ? 'ব্যাকরণ' : 'Grammar'}:{' '}
                        <strong className="text-white">
                          {att.evaluation.target_grammar_application.score}%
                        </strong>
                      </div>
                      <div className="rounded-md border border-slate-800 bg-[#0A0F1C] px-2.5 py-1.5 text-slate-300">
                        {lang === 'bn' ? 'উপযোগিতা' : 'Context'}:{' '}
                        <strong className="text-white">
                          {att.evaluation.contextual_appropriateness.score}%
                        </strong>
                      </div>
                      <div className="rounded-md border border-slate-800 bg-[#0A0F1C] px-2.5 py-1.5 text-slate-300">
                        {lang === 'bn' ? 'প্রাসঙ্গিকতা' : 'Relevance'}:{' '}
                        <strong className="text-white">
                          {att.evaluation.response_relevance.score}%
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : !challengeActive ? (
        /* TAB 1A: Scenario Selection & Pressure Ladder Setup */
        <div className="space-y-6">
          {/* Personalized Bridge Banner (Connected to Mistake Memory / Academy) */}
          <section
            aria-label="Personalized Transfer Recommendation"
            className="rounded-xl border border-[#3B82F6]/40 bg-[#111827] p-5 sm:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-[#3B82F6]">
                  {recommendations[0].linkedSourceType === 'mistake_memory'
                    ? lang === 'bn'
                      ? 'Mistake Memory থেকে সংযুক্ত সুপারিশ'
                      : 'Linked Directly to Your Mistake Memory'
                    : recommendations[0].linkedSourceType === 'academy_lesson'
                      ? lang === 'bn'
                        ? 'আপনার সাম্প্রতিক একাডেমি লেসন থেকে আনলক'
                        : 'Unlocked From Your Recent Academy Study'
                      : lang === 'bn'
                        ? 'বাস্তব প্রয়োগ ল্যাব · ৫টি কাঠামোবদ্ধ সিনারিও'
                        : 'Real-World Transfer Bridge · 5 Structured Scenarios'}
                </p>
                <h2 className="mt-1 text-lg font-bold text-white">
                  {lang === 'bn'
                    ? recommendations[0].scenario.titleBn
                    : recommendations[0].scenario.titleEn}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {lang === 'bn' ? recommendations[0].reasonBn : recommendations[0].reasonEn}
                </p>
                <p className="mt-2 font-mono text-xs text-[#8B5CF6]">
                  {lang === 'bn' ? 'টার্গেট দক্ষতা:' : 'Target Skill:'}{' '}
                  {lang === 'bn'
                    ? recommendations[0].targetSkillLabelBn
                    : recommendations[0].targetSkillLabelEn}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleLaunchChallenge(
                    recommendations[0].scenario.id,
                    recommendations[0].recommendedLevel
                  )
                }
                className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer lg:self-center"
              >
                <span>
                  {lang === 'bn'
                    ? 'সুপারিশকৃত চ্যালেঞ্জ শুরু করুন'
                    : 'Launch Recommended Transfer'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>

          {/* Step 1: Choose from 5 Structured Transfer Scenarios */}
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
            <div className="border-b border-slate-800 pb-4">
              <p className="font-mono text-xs text-[#3B82F6]">
                {lang === 'bn'
                  ? 'ধাপ ০১ · বাস্তব যোগাযোগের সিনারিও নির্বাচন'
                  : 'Step 01 · Choose a Structured Transfer Scenario'}
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">
                {lang === 'bn'
                  ? '৫টি উচ্চ-গুরুত্বপূর্ণ বাস্তব পরিস্থিতি'
                  : '5 High-Impact Real-World Transfer Scenarios'}
              </h2>
            </div>

            <div
              role="radiogroup"
              aria-label="Transfer Lab scenario"
              className="mt-5 grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3"
            >
              {recommendations.map((rec) => {
                const selected = rec.scenario.id === selectedScenarioId;
                return (
                  <button
                    key={rec.scenario.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setSelectedScenarioId(rec.scenario.id);
                      setSelectedPressure(rec.recommendedLevel);
                    }}
                    className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                        : 'border-slate-800 bg-[#0A0F1C] hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono text-slate-400">
                          {lang === 'bn' ? rec.scenario.contextTagBn : rec.scenario.contextTagEn}
                        </span>
                        {rec.isRecommended ? (
                          <span className="font-semibold text-[#F59E0B]">
                            {rec.linkedSourceType === 'mistake_memory'
                              ? lang === 'bn'
                                ? 'ভুল সংশোধন'
                                : 'From Mistake Memory'
                              : lang === 'bn'
                                ? 'একাডেমি সংযুক্ত'
                                : 'From Academy'}
                          </span>
                        ) : selected ? (
                          <span className="font-semibold text-[#3B82F6]">
                            {lang === 'bn' ? 'নির্বাচিত' : 'Selected'}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-1.5 text-sm font-bold text-white">
                        {lang === 'bn' ? rec.scenario.titleBn : rec.scenario.titleEn}
                      </h3>

                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {lang === 'bn' ? rec.scenario.briefBn : rec.scenario.briefEn}
                      </p>
                    </div>

                    <div className="mt-3 border-t border-slate-800/80 pt-2.5 text-[11px]">
                      <p className="text-slate-300">
                        {lang === 'bn' ? rec.targetSkillLabelBn : rec.targetSkillLabelEn}
                      </p>
                      <p className="mt-1 font-mono text-slate-500 tabular-nums">
                        {rec.passedCount > 0
                          ? lang === 'bn'
                            ? `${rec.passedCount}টি ধাপ উত্তীর্ণ`
                            : `${rec.passedCount} passed ${rec.passedCount === 1 ? 'run' : 'runs'}`
                          : lang === 'bn'
                            ? 'এখনো উত্তীর্ণ হয়নি'
                            : '0 passed runs yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: 5-Level Pressure Ladder */}
          <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
            <div className="border-b border-slate-800 pb-4">
              <p className="font-mono text-xs text-[#8B5CF6]">
                {lang === 'bn'
                  ? 'ধাপ ০২ · ৫-স্তরের প্রেসার ল্যাডার (Pressure Ladder)'
                  : 'Step 02 · Select Pressure Ladder Tier (Levels 1 – 5)'}
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">
                {lang === 'bn'
                  ? 'টেমপ্লেটসহ অনুশীলন থেকে সময়সীমাবদ্ধ উচ্চচাপ সিমুলেশন'
                  : 'Progress From Controlled Templates to Timed High-Stakes Simulations'}
              </h2>
            </div>

            <div className="mt-5">
              <PressureLadderSelector
                value={selectedPressure}
                onChange={setSelectedPressure}
                context="transfer"
                passedLevels={passedLevelsForScenario}
                recommendedLevel={selectedRecommendation.recommendedLevel}
              />
            </div>

            {/* Scenario Preview & Launch */}
            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0A0F1C] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs text-slate-400">
                  {lang === 'bn' ? scenario.titleBn : scenario.titleEn} ·{' '}
                  <span className="text-[#8B5CF6]">
                    {lang === 'bn' ? activeTier.shortLabelBn : activeTier.shortLabelEn}
                  </span>{' '}
                  ·{' '}
                  <span className="text-[#F59E0B]">+{activeTier.transferXpReward} XP</span>
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
                  “{scenario.openingPromptEn}”
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLaunchChallenge()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FlaskConical className="h-4 w-4" aria-hidden="true" />
                <span>
                  {lang === 'bn' ? 'ট্রান্সফার সিমুলেশন শুরু করুন' : 'Start Transfer Simulation'}
                </span>
              </button>
            </div>
          </section>
        </div>
      ) : (
        /* TAB 1B: Live Active Transfer Simulation & 4-Rubric AI Grader */
        <div className="space-y-6">
          {/* Active Challenge Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] px-5 py-4">
            <div>
              <p className="font-mono text-xs text-[#8B5CF6]">
                {lang === 'bn'
                  ? `${activeTier.shortLabelBn}: ${activeTier.titleBn}`
                  : `${activeTier.shortLabelEn}: ${activeTier.titleEn}`}{' '}
                ·{' '}
                <span className="text-[#F59E0B]">+{activeTier.transferXpReward} XP</span>
              </p>
              <h2 className="mt-0.5 text-base font-bold text-white sm:text-lg">
                {lang === 'bn' ? scenario.titleBn : scenario.titleEn}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {lang === 'bn' ? 'টার্গেট দক্ষতা:' : 'Target Grammar/Skill:'}{' '}
                <span className="text-slate-200">
                  {lang === 'bn'
                    ? selectedRecommendation.targetSkillLabelBn
                    : selectedRecommendation.targetSkillLabelEn}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {latestEvaluation && (
                <button
                  type="button"
                  onClick={resetChallengeState}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#3B82F6]/50 bg-[#3B82F6]/15 px-3.5 py-2 text-xs font-semibold text-blue-200 hover:bg-[#3B82F6]/25 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'পুনরায় অনুশীলন করুন' : 'Retry Scenario'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopVoiceCapture();
                  stopSpeaking();
                  setChallengeActive(false);
                }}
                className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                {lang === 'bn' ? 'সব সিনারিও দেখুন' : 'Change Scenario'}
              </button>
            </div>
          </div>

          {/* Prompt & Pressure Tier Context Card */}
          <section className="rounded-xl border border-[#3B82F6]/40 bg-[#111827] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#3B82F6]">
                  {lang === 'bn' ? scenario.rolePersonaBn : scenario.rolePersonaEn}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {lang === 'bn' ? scenario.briefBn : scenario.briefEn}
                </p>

                <div className="mt-3 rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
                  <p className="text-base font-medium leading-relaxed text-white sm:text-lg">
                    “{scenario.openingPromptEn}”
                  </p>
                  {(explanationPref === 'bn' || explanationPref === 'both') && (
                    <p className="font-bn mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                      {scenario.openingPromptBn}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isSpeakingPrompt) {
                    stopSpeaking();
                    setIsSpeakingPrompt(false);
                  } else {
                    speakText(awaitingTwistReply ? activeTwistEn : scenario.openingPromptEn);
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
                    <span>{lang === 'bn' ? 'প্রশ্ন শুনুন' : 'Listen to Prompt'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Level 1: Controlled Practice Templates */}
            {activeTier.showTemplates && (
              <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
                <p className="text-xs font-semibold text-[#8B5CF6]">
                  {lang === 'bn'
                    ? 'লেভেল ১ টেমপ্লেট (Controlled Practice Templates)'
                    : 'Level 1 Sentence Templates'}
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-200">
                  {scenario.level1TemplatesEn.map((tpl, i) => (
                    <li key={i} className="font-mono text-[12px]">
                      {i + 1}. {tpl}
                    </li>
                  ))}
                </ul>
                <p className="font-bn mt-2.5 border-t border-slate-800 pt-2 text-xs text-slate-400">
                  {scenario.level1TemplatesBn}
                </p>
              </div>
            )}

            {/* Level 2: Guided Conversation Bullet Cues */}
            {!activeTier.showTemplates && activeTier.showBulletCues && (
              <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
                <p className="text-xs font-semibold text-[#8B5CF6]">
                  {lang === 'bn'
                    ? 'লেভেল ২ বুলেট কিউ (Guided Cues — নিজের বাক্যে বলুন)'
                    : 'Level 2 Bullet-Point Cues (Build Your Own Sentences)'}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {(lang === 'bn' ? scenario.level2BulletCuesBn : scenario.level2BulletCuesEn).map(
                    (cue, i) => (
                      <li key={i}>• {cue}</li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* Level 3 / 4 / 5: Zero-Hint Notice */}
            {!activeTier.showTemplates && !activeTier.showBulletCues && (
              <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] px-4 py-3 text-xs text-slate-300">
                <span className="font-semibold text-[#8B5CF6]">
                  {lang === 'bn' ? activeTier.shortLabelBn : activeTier.shortLabelEn}:
                </span>{' '}
                {selectedPressure === 'level_4_twist'
                  ? lang === 'bn'
                    ? 'কোনো হিন্ট নেই — আপনার প্রথম উত্তরের পর AI তাৎক্ষণিক একটি অপ্রত্যাশিত পাল্টা প্রশ্ন (Twist) করবে।'
                    : 'No hints — after your initial response, the AI will inject an unexpected in-character twist you must handle immediately.'
                  : selectedPressure === 'level_5_timed_high_stakes'
                    ? lang === 'bn'
                      ? scenario.level5ConstraintBn
                      : scenario.level5ConstraintEn
                    : lang === 'bn'
                      ? 'কোনো টেমপ্লেট বা ইঙ্গিত নেই — স্বাধীনভাবে টার্গেট ব্যাকরণ প্রয়োগ করুন।'
                      : 'No templates or cues — apply the target grammar independently in natural English.'}
              </div>
            )}

            {/* Level 5 Live 60s Countdown Bar */}
            {activeTier.transferTimeLimitSeconds !== null && remainingSeconds !== null && !latestEvaluation && (
              <div
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs ${
                  remainingSeconds <= 15
                    ? 'border-[#F59E0B]/50 bg-[#F59E0B]/10 text-amber-200'
                    : 'border-slate-800 bg-[#0A0F1C] text-slate-300'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {timedOut
                      ? lang === 'bn'
                        ? '৬০ সেকেন্ড শেষ — তবুও আপনার উত্তর জমা দিয়ে রুব্রিক গ্রেড নিন'
                        : '60s high-stakes timer ended — submit your response for rubric grading'
                      : lang === 'bn'
                        ? 'লেভেল ৫ উচ্চচাপ কাউন্টডাউন সক্রিয়'
                        : 'Level 5 high-stakes simulation countdown active'}
                  </span>
                </span>
                <span className="font-mono text-sm font-bold tabular-nums">
                  00:{String(remainingSeconds).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Level 4 Active Twist Banner */}
            {awaitingTwistReply && activeTwistEn && !latestEvaluation && (
              <div
                role="status"
                className="rounded-xl border border-[#F59E0B]/50 bg-[#F59E0B]/10 p-4 space-y-2"
              >
                <p className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#F59E0B]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {lang === 'bn'
                      ? 'লেভেল ৪ অপ্রত্যাশিত টুইস্ট! এখনই উত্তর দিন'
                      : 'Level 4 Unexpected Follow-Up Twist — Respond on the Spot'}
                  </span>
                </p>
                <p className="text-sm font-semibold leading-relaxed text-white sm:text-base">
                  “{activeTwistEn}”
                </p>
                {(explanationPref === 'bn' || explanationPref === 'both') && activeTwistBn && (
                  <p className="font-bn text-xs text-amber-100/90">{activeTwistBn}</p>
                )}
              </div>
            )}
          </section>

          {/* Response Console (hidden once final evaluation is shown so the 4-Rubric Report is the focal point) */}
          {!latestEvaluation && (
            <section className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6 space-y-4">
              {showPrivacyBanner && !micConsentGranted && (
                <div
                  aria-label="Microphone privacy consent"
                  className="rounded-lg border border-[#3B82F6]/45 bg-[#0A0F1C] p-4"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]"
                      aria-hidden="true"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">
                        {lang === 'bn'
                          ? 'মাইক্রোফোন গোপনীয়তা সম্মতি'
                          : 'Microphone Privacy Consent'}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        {lang === 'bn'
                          ? 'মাইক্রোফোন চালু করলে ব্রাউজারে আপনার কথা টেক্সটে রূপান্তরিত হবে এবং শুধুমাত্র টেক্সট ট্রান্সক্রিপ্ট ৪-রুব্রিক মূল্যায়নের জন্য সার্ভারে পাঠানো হবে।'
                          : 'Enabling the microphone transcribes your speech in the browser; only the text transcript is sent to our server-side Gemini rubric grader.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMicConsentGranted(true);
                            setShowPrivacyBanner(false);
                            void startVoiceCapture();
                          }}
                          className="rounded-lg bg-[#3B82F6] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2563EB] cursor-pointer"
                        >
                          {lang === 'bn' ? 'সম্মতি দিন ও বলুন' : 'Consent & Record'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPrivacyBanner(false)}
                          className="rounded-lg border border-slate-700 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                        >
                          {lang === 'bn' ? 'টাইপ করব' : 'Use Text Input'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isGrading}
                  onClick={handleMicClick}
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
                      <span>{lang === 'bn' ? 'কথা বলুন (ভয়েস)' : 'Speak Response'}</span>
                    </>
                  )}
                </button>

                {!speechRecAvailable && (
                  <span className="text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'ব্রাউজারে লাইভ STT নেই — নিচে সরাসরি আপনার উত্তর টাইপ করুন।'
                      : 'Live STT unavailable in this browser — type your response directly below.'}
                  </span>
                )}
              </div>

              {micError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-xs text-amber-200"
                >
                  <MicOff className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
                  <span>{micError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="transfer-response-input"
                  className="block text-xs font-medium text-slate-300"
                >
                  {awaitingTwistReply
                    ? lang === 'bn'
                      ? 'অপ্রত্যাশিত টুইস্টের তাৎক্ষণিক উত্তর (ইংরেজিতে)'
                      : 'Your Response to the Unexpected Twist (English)'
                    : lang === 'bn'
                      ? 'আপনার বাস্তব যোগাযোগের উত্তর (কথা বলুন অথবা ইংরেজিতে টাইপ করুন)'
                      : 'Your Transfer Lab Response (Voice Transcript or Text Input)'}
                </label>
                <textarea
                  id="transfer-response-input"
                  rows={4}
                  disabled={isGrading}
                  value={
                    interimText
                      ? `${draftText}${draftText ? ' ' : ''}${interimText}`
                      : draftText
                  }
                  onChange={(e) => {
                    setInterimText('');
                    setDraftText(e.target.value);
                    if (usedVoice) setEditedManually(true);
                  }}
                  placeholder={
                    lang === 'bn'
                      ? 'পরিস্থিতি অনুযায়ী ৩–৪টি স্বাভাবিক ইংরেজি বাক্যে উত্তর লিখুন বা বলুন...'
                      : 'Respond naturally in 3–4 complete English sentences addressing the scenario brief...'
                  }
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none disabled:opacity-60"
                />
              </div>

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
                    onClick={handleSubmitResponse}
                    disabled={isGrading}
                    className="inline-flex items-center gap-1.5 self-start rounded-lg border border-rose-400/50 bg-rose-900/40 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800/60 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'আবার চেষ্টা করুন' : 'Retry Grading'}</span>
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'উত্তীর্ণ হতে সামগ্রিক রুব্রিক স্কোর ৭০%+ এবং কাজ ও টার্গেট ব্যাকরণে ৬০%+ প্রয়োজন।'
                    : 'Pass requires 70%+ overall across all 4 rubrics with 60%+ in Task Completion and Target Grammar.'}
                </p>

                <button
                  type="button"
                  disabled={isGrading || !(draftText.trim() || interimText.trim())}
                  onClick={handleSubmitResponse}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-45 transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>
                        {selectedPressure === 'level_4_twist' && !awaitingTwistReply
                          ? lang === 'bn'
                            ? 'AI টুইস্ট তৈরি করছে...'
                            : 'Generating Level 4 Twist...'
                          : lang === 'bn'
                            ? '৪টি রুব্রিকে মূল্যায়ন হচ্ছে...'
                            : 'Grading 4 Rubrics with Gemini...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {selectedPressure === 'level_4_twist' && !awaitingTwistReply
                          ? lang === 'bn'
                            ? 'জমা দিন ও AI টুইস্ট নিন'
                            : 'Submit & Face Level 4 Twist'
                          : lang === 'bn'
                            ? '৪-রুব্রিক মূল্যায়ন নিন'
                            : 'Submit for 4-Rubric AI Grading'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* 4-Rubric AI Grade Report */}
          {latestEvaluation && (
            <section
              aria-label="4-Rubric AI Grading Report"
              className="space-y-5 rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6"
            >
              {/* Pass / Retry Verdict & Verified XP Outcome */}
              <div
                className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  latestEvaluation.passed
                    ? 'border-emerald-500/45 bg-emerald-500/10'
                    : 'border-[#F59E0B]/45 bg-[#F59E0B]/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {latestEvaluation.passed ? (
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {latestEvaluation.passed
                        ? lang === 'bn'
                          ? `ট্রান্সফার চ্যালেঞ্জ উত্তীর্ণ (${latestEvaluation.overall_score}%)`
                          : `Transfer Challenge Passed (${latestEvaluation.overall_score}%)`
                        : lang === 'bn'
                          ? `আরও উন্নতি প্রয়োজন (${latestEvaluation.overall_score}%)`
                          : `Rubric Threshold Not Met (${latestEvaluation.overall_score}%)`}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-200 sm:text-sm">
                      {lang === 'bn'
                        ? latestEvaluation.coach_summary_bn
                        : latestEvaluation.coach_summary_en}
                    </p>
                  </div>
                </div>

                {/* Auditable XP Notice */}
                <div className="shrink-0 text-left sm:text-right">
                  {latestAwardedXp.length > 0 ? (
                    <div>
                      <p className="font-mono text-lg font-bold text-[#F59E0B] tabular-nums">
                        +{latestAwardedXp.reduce((s, x) => s + x.xpEarned, 0)} Verified XP
                      </p>
                      <p className="text-[11px] text-emerald-300">
                        {lang === 'bn'
                          ? 'XP লেজারে প্রমাণসহ যুক্ত হয়েছে'
                          : 'Logged to Auditable XP Ledger'}
                      </p>
                    </div>
                  ) : latestEvaluation.passed ? (
                    <div>
                      <p className="font-mono text-xs font-semibold text-slate-300">
                        {lang === 'bn' ? '+0 ডুপ্লিকেট XP' : '+0 Duplicate XP'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {lang === 'bn'
                          ? 'এই সিনারিও ও লেভেলের XP আগেই অর্জিত'
                          : 'Already earned XP for this scenario & tier'}
                      </p>
                    </div>
                  ) : (
                    <p className="font-mono text-xs text-slate-400">
                      {lang === 'bn' ? 'উত্তীর্ণ হলে XP যুক্ত হবে' : 'Pass rubrics to earn XP'}
                    </p>
                  )}
                </div>
              </div>

              {/* 4 Strict Rubric Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {rubricCards.map((item) => {
                  const scoreColor =
                    item.dim.score >= 80
                      ? 'text-emerald-400'
                      : item.dim.score >= 60
                        ? 'text-[#3B82F6]'
                        : 'text-[#F59E0B]';
                  return (
                    <div
                      key={item.key}
                      className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="text-xs font-bold text-white sm:text-sm">
                          {lang === 'bn' ? item.titleBn : item.titleEn}
                        </h4>
                        <span
                          className={`font-mono text-lg font-bold tabular-nums ${scoreColor}`}
                        >
                          {item.dim.score}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            item.dim.score >= 80
                              ? 'bg-emerald-500'
                              : item.dim.score >= 60
                                ? 'bg-[#3B82F6]'
                                : 'bg-[#F59E0B]'
                          }`}
                          style={{ width: `${Math.max(4, item.dim.score)}%` }}
                        />
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                        {item.dim.feedbackEn}
                      </p>
                      {(explanationPref === 'bn' || explanationPref === 'both') && (
                        <p className="font-bn mt-1.5 text-xs leading-relaxed text-slate-400">
                          {item.dim.feedbackBn}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Detected Mistakes (Synced to Mistake Memory) */}
              {latestEvaluation.detected_mistakes.length > 0 && (
                <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white sm:text-sm">
                      {lang === 'bn'
                        ? `শনাক্তকৃত ভুল (${latestEvaluation.detected_mistakes.length}টি — Mistake Memory-তে যুক্ত)`
                        : `Detected Errors (${latestEvaluation.detected_mistakes.length} synced to Mistake Memory)`}
                    </h4>
                    <Link
                      to="/app/improve"
                      className="text-xs font-semibold text-[#3B82F6] hover:text-blue-400"
                    >
                      {lang === 'bn' ? 'Mistake Memory খুলুন' : 'Open Mistake Memory'}
                    </Link>
                  </div>
                  <div className="mt-3 divide-y divide-slate-800/80">
                    {latestEvaluation.detected_mistakes.map((m, idx) => (
                      <div key={idx} className="py-3 first:pt-0 last:pb-0 text-xs">
                        <p className="font-mono text-[11px] text-[#8B5CF6]">{m.category}</p>
                        <p className="mt-1 text-sm text-slate-200">
                          <span className="text-rose-300 line-through">{m.original}</span>
                          <span className="mx-2 text-slate-500">→</span>
                          <span className="font-semibold text-emerald-300">{m.corrected}</span>
                        </p>
                        <p className="mt-1 text-slate-300">{m.explanation_en}</p>
                        {(explanationPref === 'bn' || explanationPref === 'both') && (
                          <p className="font-bn mt-1 text-slate-400">{m.explanation_bn}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Natural Model Response */}
              <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#3B82F6]">
                    {lang === 'bn'
                      ? 'প্রাকৃতিক আদর্শ উত্তর (Natural Model Response)'
                      : 'Natural Model Response'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => speakText(latestEvaluation.natural_model_response)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'শুনুন' : 'Listen'}</span>
                  </button>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-100">
                  {latestEvaluation.natural_model_response}
                </p>
              </div>

              {/* Next Steps Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={resetChallengeState}
                    className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer"
                  >
                    {lang === 'bn' ? 'আবার চেষ্টা করুন' : 'Practice Again'}
                  </button>
                  {latestSavedAttempt && activeTier.levelNumber < 5 && latestEvaluation.passed && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextId: PressureLadderLevelId =
                          activeTier.levelNumber === 1
                            ? 'level_2_guided'
                            : activeTier.levelNumber === 2
                              ? 'level_3_open'
                              : activeTier.levelNumber === 3
                                ? 'level_4_twist'
                                : 'level_5_timed_high_stakes';
                        handleLaunchChallenge(selectedScenarioId, nextId);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-violet-600 cursor-pointer"
                    >
                      <span>
                        {lang === 'bn'
                          ? `লেভেল ${activeTier.levelNumber + 1}-এ উন্নীত হোন`
                          : `Advance to Level ${activeTier.levelNumber + 1}`}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setChallengeActive(false);
                    setActiveTab('xp');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B] hover:text-amber-300 cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? 'XP লেজার দেখুন' : 'Inspect Auditable XP Ledger'}
                  </span>
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </LearnerShell>
  );
}
