import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Headphones,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { OnboardingSceneVisuals } from '../components/onboarding/OnboardingSceneVisuals';
import { SkillProgressRing, SkillRadarChart } from '../components/assessment/SkillRadarChart';
import {
  LISTENING_ASSESSMENT_QUESTIONS,
  SPEAKING_ASSESSMENT_PROMPT,
  getAllWrittenAssessmentQuestions,
  getSkillDisplayName,
  type AssessmentSpeakingInput,
} from '../domain/initialAssessmentEngine';
import { getProficiencyOptionById } from '../domain/onboardingCatalog';
import { fetchSpeakingHealth, requestSpeakingEvaluation } from '../services/speakingApi';
import type { DiagnosticQuestion, DiagnosticUserAnswer } from '../types/domain';

type AssessmentStage = 'intro' | 'workspace' | 'results';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanceLike;

const DRAFT_STORAGE_KEY = 'lv_initial_assessment_draft_v1';

interface AssessmentDraftState {
  stepIndex: number;
  writtenResponses: Record<string, string>;
  listeningResponses: Record<string, string>;
  listeningSkipped: boolean;
}

function getWrittenSkillMeta(q: DiagnosticQuestion, lang: 'en' | 'bn') {
  if (q.domain === 'vocabulary') {
    return lang === 'bn' ? 'শব্দভাণ্ডার (Vocabulary)' : 'Vocabulary';
  }
  if (q.domain === 'reading') {
    return lang === 'bn' ? 'পড়ে বোঝা (Reading)' : 'Reading Comprehension';
  }
  if (q.domain === 'sentence_construction') {
    return lang === 'bn' ? 'গ্রামার · বাক্য গঠন' : 'Grammar · Sentence Builder';
  }
  return lang === 'bn' ? 'গ্রামার (Grammar)' : 'Grammar';
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function DiagnosticPage() {
  const { lang, setLang } = useLanguage();
  const { profile, latestDiagnostic, submitDiagnostic } = useAuth();
  const navigate = useNavigate();
  const prefersReduced = Boolean(useReducedMotion());

  const writtenQuestions = useMemo(() => getAllWrittenAssessmentQuestions(), []);
  const listeningQuestions = LISTENING_ASSESSMENT_QUESTIONS;
  // Total steps: 8 written + 2 listening + 1 speaking = 11
  const totalSteps = writtenQuestions.length + listeningQuestions.length + 1;
  const listeningStartIndex = writtenQuestions.length;
  const speakingStepIndex = writtenQuestions.length + listeningQuestions.length;

  const [stage, setStage] = useState<AssessmentStage>('intro');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [writtenResponses, setWrittenResponses] = useState<Record<string, string>>({});
  const [listeningResponses, setListeningResponses] = useState<Record<string, string>>({});
  const [listeningSkipped, setListeningSkipped] = useState<boolean>(false);
  const [playedClips, setPlayedClips] = useState<Record<string, boolean>>({});
  const [audioRate, setAudioRate] = useState<number>(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [speechSynthSupported, setSpeechSynthSupported] = useState<boolean>(true);

  // Speaking section real hardware + AI backend state
  const [speakingHealthChecked, setSpeakingHealthChecked] = useState(false);
  const [speakingAiConfigured, setSpeakingAiConfigured] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [speechRecSupported, setSpeechRecSupported] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showItemReview, setShowItemReview] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Hydrate saved draft if learner refreshed mid-assessment
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AssessmentDraftState>;
        if (typeof parsed.stepIndex === 'number' && parsed.stepIndex >= 0 && parsed.stepIndex < totalSteps) {
          setStepIndex(parsed.stepIndex);
        }
        if (parsed.writtenResponses && typeof parsed.writtenResponses === 'object') {
          setWrittenResponses(parsed.writtenResponses);
        }
        if (parsed.listeningResponses && typeof parsed.listeningResponses === 'object') {
          setListeningResponses(parsed.listeningResponses);
        }
        if (typeof parsed.listeningSkipped === 'boolean') {
          setListeningSkipped(parsed.listeningSkipped);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [totalSteps]);

  // Persist workspace draft
  useEffect(() => {
    if (stage !== 'workspace') return;
    try {
      const payload: AssessmentDraftState = {
        stepIndex,
        writtenResponses,
        listeningResponses,
        listeningSkipped,
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore
    }
  }, [stage, stepIndex, writtenResponses, listeningResponses, listeningSkipped]);

  // Check browser speech synthesis & speech recognition capability + backend AI health
  useEffect(() => {
    const hasSynth =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined';
    setSpeechSynthSupported(hasSynth);

    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    setSpeechRecSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));

    let active = true;
    fetchSpeakingHealth().then((health) => {
      if (!active) return;
      setSpeakingHealthChecked(true);
      setSpeakingAiConfigured(Boolean(health.ok && health.configured));
    });
    return () => {
      active = false;
    };
  }, []);

  // Cleanup audio synthesis & recording resources on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        speechRecRef.current?.stop();
      } catch {
        // Ignore
      }
    };
  }, []);

  // Revoke object URL when replaced or unmounted
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  const stopAudioPlayback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  const handlePlayListeningClip = (clipId: string, script: string) => {
    setAudioError(null);
    if (!speechSynthSupported || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAudioError(
        lang === 'bn'
          ? 'এই ব্রাউজারে অডিও প্লেব্যাক পাওয়া যাচ্ছে না। আপনি লিসেনিং ধাপ এড়িয়ে যেতে পারেন।'
          : 'Browser speech audio is unavailable on this device. You can skip Listening without penalty.'
      );
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = 'en-US';
      utterance.rate = audioRate;

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setPlayedClips((prev) => ({ ...prev, [clipId]: true }));
      };
      utterance.onend = () => {
        setIsPlayingAudio(false);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setAudioError(
          lang === 'bn'
            ? 'অডিও চালাতে সমস্যা হয়েছে। আবার চেষ্টা করুন অথবা লিসেনিং এড়িয়ে যান।'
            : 'Audio playback encountered an error. Try replaying or choose Skip Listening.'
        );
      };

      setPlayedClips((prev) => ({ ...prev, [clipId]: true }));
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);

      // Safety timeout in case a headless/silent system never dispatches onend
      window.setTimeout(() => {
        if (!window.speechSynthesis.speaking) {
          setIsPlayingAudio(false);
        }
      }, 15000);
    } catch {
      setIsPlayingAudio(false);
      setAudioError(
        lang === 'bn'
          ? 'এই ব্রাউজারে স্পিচ সিন্থেসিস চালু করা যায়নি।'
          : 'Unable to start speech playback in this browser.'
      );
    }
  };

  const stopSpeakingRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    try {
      speechRecRef.current?.stop();
    } catch {
      // Ignore
    }
    setIsRecording(false);
  };

  const startSpeakingRecording = async () => {
    setMicError(null);
    setValidationError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setMicError(
        lang === 'bn'
          ? 'এই ব্রাউজারে অডিও রেকর্ডিং সমর্থিত নয়। আপনি স্পিকিং ছাড়াই ফলাফল দেখতে পারেন।'
          : 'Audio recording is not supported in this browser. You can finish without speaking.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      setLiveTranscript('');
      setRecordSeconds(0);
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(null);
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          setRecordedAudioUrl(URL.createObjectURL(blob));
        }
      };

      recorder.start();
      setIsRecording(true);

      // Start live browser SpeechRecognition ONLY when natively supported
      const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      };
      const RecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (RecognitionCtor) {
        try {
          const rec = new RecognitionCtor();
          rec.lang = 'en-US';
          rec.continuous = true;
          rec.interimResults = true;
          let finalizedText = '';
          rec.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
              const part = event.results[i][0]?.transcript ?? '';
              if (event.results[i].isFinal) {
                finalizedText = `${finalizedText} ${part}`.trim();
              } else {
                interim = `${interim} ${part}`.trim();
              }
            }
            setLiveTranscript(`${finalizedText} ${interim}`.trim());
          };
          rec.onerror = () => {
            // Do not crash recording; honest fallback handles unscored local clip
          };
          speechRecRef.current = rec;
          rec.start();
        } catch {
          // SpeechRecognition optional
        }
      }

      timerIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev + 1 >= SPEAKING_ASSESSMENT_PROMPT.maxSeconds) {
            stopSpeakingRecording();
            return SPEAKING_ASSESSMENT_PROMPT.maxSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setMicError(
        lang === 'bn'
          ? 'মাইক্রোফোন অনুমতি পাওয়া যায়নি। ব্রাউজার সেটিংস থেকে অনুমতি দিন অথবা স্পিকিং এড়িয়ে ফলাফল দেখুন।'
          : 'Microphone access was denied or unavailable. Enable it in browser settings or skip Speaking to view your results.'
      );
    }
  };

  const handleSentenceBankToggle = (qId: string, token: string) => {
    setValidationError(null);
    setWrittenResponses((prev) => {
      const current = (prev[qId] ?? '').trim();
      const tokens = current ? current.split(/\s+/) : [];
      tokens.push(token);
      return { ...prev, [qId]: tokens.join(' ') };
    });
  };

  const handleSentenceBankRemoveLast = (qId: string) => {
    setWrittenResponses((prev) => {
      const current = (prev[qId] ?? '').trim();
      const tokens = current ? current.split(/\s+/) : [];
      tokens.pop();
      return { ...prev, [qId]: tokens.join(' ') };
    });
  };

  const handleNextStep = () => {
    setValidationError(null);
    stopAudioPlayback();

    if (stepIndex < listeningStartIndex) {
      const currentQ = writtenQuestions[stepIndex];
      const answer = (writtenResponses[currentQ.id] ?? '').trim();
      if (!answer) {
        setValidationError(
          lang === 'bn'
            ? 'পরবর্তী প্রশ্নে যেতে অনুগ্রহ করে একটি উত্তর নির্বাচন বা তৈরি করুন।'
            : 'Please select or complete an answer before continuing.'
        );
        return;
      }
      setStepIndex((i) => i + 1);
      return;
    }

    if (stepIndex < speakingStepIndex) {
      const clipIdx = stepIndex - listeningStartIndex;
      const clip = listeningQuestions[clipIdx];
      const answer = (listeningResponses[clip.id] ?? '').trim();
      if (!answer && !listeningSkipped) {
        setValidationError(
          lang === 'bn'
            ? 'একটি উত্তর নির্বাচন করুন অথবা অডিও না শুনতে পারলে "লিসেনিং এড়ান" ক্লিক করুন।'
            : 'Select an answer after listening, or click "Skip Listening" if audio is unavailable.'
        );
        return;
      }
      setStepIndex((i) => i + 1);
    }
  };

  const handleSkipListening = () => {
    stopAudioPlayback();
    setValidationError(null);
    setListeningSkipped(true);
    setListeningResponses({});
    setStepIndex(speakingStepIndex);
  };

  const handlePreviousStep = () => {
    stopAudioPlayback();
    if (isRecording) stopSpeakingRecording();
    setValidationError(null);
    if (stepIndex > 0) {
      if (stepIndex === speakingStepIndex && listeningSkipped) {
        setListeningSkipped(false);
        setStepIndex(listeningStartIndex);
      } else {
        setStepIndex((i) => i - 1);
      }
    }
  };

  const handleSubmitFullAssessment = async (skipSpeaking: boolean) => {
    if (isRecording) stopSpeakingRecording();
    stopAudioPlayback();
    setValidationError(null);
    setIsSubmitting(true);

    try {
      const writtenAnswers: DiagnosticUserAnswer[] = writtenQuestions.map((q) => ({
        questionId: q.id,
        userResponse: (writtenResponses[q.id] ?? '').trim(),
      }));

      const listeningMode: 'speech_synthesis' | 'skipped' | 'unavailable' = !speechSynthSupported
        ? 'unavailable'
        : listeningSkipped
          ? 'skipped'
          : Object.keys(listeningResponses).length > 0
            ? 'speech_synthesis'
            : 'skipped';

      let speakingInput: AssessmentSpeakingInput;

      if (skipSpeaking) {
        speakingInput = {
          mode: !speakingAiConfigured && speakingHealthChecked ? 'unavailable' : 'skipped',
        };
      } else if (speakingAiConfigured && liveTranscript.trim().length >= 8) {
        try {
          const aiRes = await requestSpeakingEvaluation(
            {
              modeId: 'self_introduction',
              pressureLevel: 'level_1_controlled',
              userTranscript: liveTranscript.trim(),
              inputChannel: 'voice_stt',
              learnerLevel: profile?.selfEstimatedLevel ?? 'A2',
              explanationLanguage: profile?.explanationLanguage ?? 'both',
              history: [
                { role: 'ai', text: SPEAKING_ASSESSMENT_PROMPT.promptEn },
              ],
            },
            {
              logTelemetry: profile?.privacyConsent?.logAiEvaluations !== false,
            }
          );
          speakingInput = {
            mode: 'ai_evaluated',
            transcript: liveTranscript.trim(),
            aiMistakesCount: aiRes.evaluation.mistakes.length,
            aiCorrectElementsCount: Math.max(1, aiRes.evaluation.correct_elements.length),
            aiCoachNoteEn: aiRes.evaluation.ai_reply,
            aiCoachNoteBn: aiRes.evaluation.ai_reply_bn_hint,
          };
        } catch {
          speakingInput = {
            mode: recordedAudioUrl ? 'recorded_unscored' : 'unavailable',
            transcript: liveTranscript.trim() || undefined,
          };
        }
      } else if (recordedAudioUrl) {
        speakingInput = {
          mode: 'recorded_unscored',
          transcript: liveTranscript.trim() || undefined,
        };
      } else {
        speakingInput = {
          mode: speakingAiConfigured ? 'skipped' : 'unavailable',
        };
      }

      await submitDiagnostic(writtenAnswers, {
        listeningAnswers: listeningMode === 'speech_synthesis' ? listeningResponses : {},
        listeningMode,
        speakingInput,
      });

      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore
      }

      setStage('results');
      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'মূল্যায়ন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'
            : 'Could not save assessment results. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestartAssessment = () => {
    stopAudioPlayback();
    if (isRecording) stopSpeakingRecording();
    setWrittenResponses({});
    setListeningResponses({});
    setListeningSkipped(false);
    setPlayedClips({});
    setLiveTranscript('');
    setRecordedAudioUrl(null);
    setStepIndex(0);
    setValidationError(null);
    setShowItemReview(false);
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setStage('workspace');
  };

  const currentWrittenQ =
    stepIndex < listeningStartIndex ? writtenQuestions[stepIndex] : null;
  const currentListeningQ =
    stepIndex >= listeningStartIndex && stepIndex < speakingStepIndex
      ? listeningQuestions[stepIndex - listeningStartIndex]
      : null;
  const isSpeakingStep = stepIndex === speakingStepIndex;

  const progressPercent = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const summary = latestDiagnostic?.fiveSkillSummary;
  const selfProficiencyOpt = getProficiencyOptionById(profile?.selfProficiencyChoice);

  const renderTopBar = (subtitle?: string, progress?: number) => (
    <header className="relative z-20 border-b border-cyan-400/12 bg-[#05091F]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/app"
          className="inline-flex items-center gap-2.5 text-sm font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/40 bg-gradient-to-br from-[#00D9FF]/25 via-[#3B82F6]/30 to-[#7C3AED]/40 text-xs font-extrabold text-white"
          >
            LV
          </span>
          <span className="font-portal tracking-wide">
            LINGUAVERSE <span className="text-[#00D9FF]">AI</span>
          </span>
        </Link>

        {subtitle && (
          <p className="hidden truncate text-xs font-medium text-slate-300 sm:block">
            {subtitle}
          </p>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {stage !== 'results' && (
            <Link
              to="/app"
              className="hidden text-xs font-medium text-slate-400 hover:text-white transition-colors sm:inline"
            >
              {lang === 'bn' ? 'ড্যাশবোর্ডে ফিরুন' : 'Exit to Dashboard'}
            </Link>
          )}
          <div
            role="group"
            aria-label="Interface language switcher"
            className="inline-flex items-center rounded-lg border border-cyan-400/20 bg-[#091233]/85 p-0.5 text-xs"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`rounded-md px-2.5 py-1.5 font-semibold transition-colors cursor-pointer ${
                lang === 'en' ? 'bg-[#3B82F6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('bn')}
              aria-pressed={lang === 'bn'}
              className={`font-bn rounded-md px-2.5 py-1.5 font-semibold transition-colors cursor-pointer ${
                lang === 'bn' ? 'bg-[#3B82F6] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>

      {typeof progress === 'number' && (
        <div
          role="progressbar"
          aria-label={lang === 'bn' ? 'মূল্যায়ন অগ্রগতি' : 'Assessment progress'}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-[3px] w-full bg-slate-900"
        >
          <div
            className="h-full bg-gradient-to-r from-[#00D9FF] via-[#3B82F6] to-[#A855F7] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </header>
  );

  // =========================================================================
  // STAGE 1: ASSESSMENT INTRODUCTION
  // =========================================================================
  if (stage === 'intro') {
    const skillOverviewCards = [
      {
        icon: BookOpen,
        color: 'text-[#00D9FF]',
        titleEn: 'Vocabulary',
        titleBn: 'শব্দভাণ্ডার',
        detailEn: '3 contextual meaning & collocation items',
        detailBn: '৩টি প্রাসঙ্গিক শব্দচয়ন প্রশ্ন',
      },
      {
        icon: Sparkles,
        color: 'text-[#A855F7]',
        titleEn: 'Grammar',
        titleBn: 'গ্রামার ও বাক্য গঠন',
        detailEn: '3 tense, preposition & sentence-builder items',
        detailBn: '৩টি টেন্স, প্রিপজিশন ও বাক্য তৈরি প্রশ্ন',
      },
      {
        icon: CheckCircle2,
        color: 'text-[#38BDF8]',
        titleEn: 'Reading',
        titleBn: 'পড়ে বোঝা',
        detailEn: '2 real-world passage & email comprehension items',
        detailBn: '২টি বাস্তব অনুচ্ছেদ ও ইমেইল বিশ্লেষণ',
      },
      {
        icon: Headphones,
        color: 'text-[#16E58B]',
        titleEn: 'Listening',
        titleBn: 'শুনে বোঝা',
        detailEn: '2 browser audio clips (skippable if audio is off)',
        detailBn: '২টি অডিও ক্লিপ (অডিও না থাকলে এড়ানো যাবে)',
      },
      {
        icon: Mic,
        color: 'text-[#F472B6]',
        titleEn: 'Speaking',
        titleBn: 'কথা বলা',
        detailEn: '1 short voice prompt (scored only if speech AI is live)',
        detailBn: '১টি সংক্ষিপ্ত ভয়েস প্রম্পট (স্পিচ AI চালু থাকলেই স্কোর)',
      },
    ];

    return (
      <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#05091F] text-slate-100">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-24 top-1/4 h-[440px] w-[440px] rounded-full bg-[#00D9FF]/10 blur-[120px]" />
          <div className="absolute -right-24 top-1/3 h-[480px] w-[480px] rounded-full bg-[#7C3AED]/14 blur-[130px]" />
        </div>

        {renderTopBar(lang === 'bn' ? 'প্রাথমিক ৫-দক্ষতা মূল্যায়ন' : 'Initial 5-Skill Assessment')}

        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <aside className="flex flex-col items-center text-center lg:col-span-5">
              <OnboardingSceneVisuals variant="assessment" />
              <div className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-[#7DD3FC]">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'আনুমানিক সময়: ৫–৭ মিনিট' : 'Estimated time: 5–7 minutes'}</span>
              </div>
            </aside>

            <section className="lv-portal-panel rounded-2xl p-6 sm:p-8 lg:col-span-7">
              <p className="text-xs font-semibold tracking-wider text-[#00D9FF] uppercase">
                {lang === 'bn' ? 'প্রাথমিক যোগাযোগ মূল্যায়ন' : 'Initial Communication Assessment'}
              </p>
              <h1 className="font-portal mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {lang === 'bn'
                  ? 'আপনার যোগাযোগ দক্ষতার অবস্থান জানুন।'
                  : 'Discover Your Communication Level.'}
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                {lang === 'bn'
                  ? 'চলুন বুঝে নিই আপনি ইতিমধ্যে কী ভালো জানেন এবং কোথায় উন্নতির সুযোগ রয়েছে।'
                  : "Let's understand what you already know and where you can improve."}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {skillOverviewCards.map((card, idx) => {
                  const Icon = card.icon;
                  const isFifth = idx === skillOverviewCards.length - 1;
                  return (
                    <div
                      key={card.titleEn}
                      className={`flex items-start gap-3 rounded-xl border border-cyan-400/15 bg-[#08102B]/80 p-3.5 ${
                        isFifth ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${card.color}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {lang === 'bn' ? card.titleBn : card.titleEn}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                          {lang === 'bn' ? card.detailBn : card.detailEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Honest non-certification disclaimer */}
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-950/20 p-3.5 text-xs leading-relaxed text-amber-100">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <p>
                  {lang === 'bn'
                    ? 'সততা নীতি: এটি LINGUAVERSE AI-এর ভেতর আপনার শেখার পথ সাজানোর একটি প্রাথমিক ডায়াগনস্টিক—কোনো আনুষ্ঠানিক বা সনদপ্রাপ্ত CEFR পরীক্ষা নয়। যে দক্ষতা মূল্যায়িত হবে না, সেখানে কখনোই কাল্পনিক স্কোর দেখানো হবে না।'
                    : 'Honest baseline notice: This diagnostic estimates a starting learning profile inside LINGUAVERSE AI. It is not an official CEFR certification exam, and any skipped or unavailable skill is marked honestly as "Not assessed yet".'}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStage('workspace')}
                  className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white cursor-pointer"
                >
                  <span>
                    {latestDiagnostic
                      ? lang === 'bn'
                        ? 'নতুন করে মূল্যায়ন শুরু করুন'
                        : 'Start Fresh Assessment'
                      : lang === 'bn'
                        ? 'মূল্যায়ন শুরু করুন'
                        : 'Begin Assessment'}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                {latestDiagnostic?.fiveSkillSummary && (
                  <button
                    type="button"
                    onClick={() => setStage('results')}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-[#0A1334] px-5 py-3 text-sm font-semibold text-[#7DD3FC] hover:border-[#00D9FF] hover:text-white transition-colors cursor-pointer"
                  >
                    <span>
                      {lang === 'bn'
                        ? 'আগের ফলাফল দেখুন'
                        : 'View Saved Profile'}
                    </span>
                  </button>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // STAGE 3: ASSESSMENT RESULTS ("YOUR COMMUNICATION PROFILE")
  // =========================================================================
  if (stage === 'results' && latestDiagnostic && summary) {
    const path = summary.personalizedPath;

    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[#05091F] text-slate-100">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-24 top-20 h-[440px] w-[440px] rounded-full bg-[#00D9FF]/10 blur-[120px]" />
          <div className="absolute -right-24 top-40 h-[500px] w-[500px] rounded-full bg-[#7C3AED]/14 blur-[130px]" />
        </div>

        {renderTopBar(lang === 'bn' ? 'আপনার যোগাযোগ প্রোফাইল' : 'Your Communication Profile', 100)}

        <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
          {/* Profile Summary Hero */}
          <section className="lv-portal-panel rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-wider text-[#00D9FF] uppercase">
                  {lang === 'bn' ? 'প্রাথমিক মূল্যায়ন সম্পন্ন' : 'Initial Diagnostic Complete'}
                </p>
                <h1 className="font-portal mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {lang === 'bn' ? 'আপনার যোগাযোগ প্রোফাইল' : 'Your Communication Profile'}
                </h1>
                <p className="mt-2 text-lg font-bold text-[#7DD3FC]">
                  {lang === 'bn'
                    ? latestDiagnostic.estimatedStartingBandBn
                    : latestDiagnostic.estimatedStartingBand}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {lang === 'bn'
                    ? latestDiagnostic.calibrationNoteBn
                    : latestDiagnostic.calibrationNoteEn}
                </p>
              </div>

              {/* Self-Estimate vs Observed Diagnostic Side-by-Side */}
              <div className="grid grid-cols-2 gap-3 shrink-0 sm:min-w-[320px]">
                <div className="rounded-xl border border-slate-700/80 bg-[#08102B]/85 p-4">
                  <p className="text-[11px] font-medium text-slate-400">
                    {lang === 'bn' ? 'আপনার নিজস্ব ধারণা' : 'Self-Estimated Level'}
                  </p>
                  <p className="mt-1.5 font-mono text-base font-bold text-slate-200">
                    {profile?.selfEstimatedLevel ?? 'A2'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {lang === 'bn' ? selfProficiencyOpt.titleBn : selfProficiencyOpt.titleEn}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-400/35 bg-[#0A173B]/90 p-4">
                  <p className="text-[11px] font-medium text-[#7DD3FC]">
                    {lang === 'bn' ? 'মূল্যায়িত প্রমাণ' : 'Observed Evidence'}
                  </p>
                  <p className="mt-1.5 font-mono text-base font-bold text-white tabular-nums">
                    {summary.assessedSkillCount}/5 {lang === 'bn' ? 'দক্ষতা' : 'skills'}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[#16E58B] tabular-nums">
                    {latestDiagnostic.totalCorrect}/{latestDiagnostic.totalQuestions}{' '}
                    {lang === 'bn' ? 'লিখিত সঠিক' : 'written items'} ·{' '}
                    {latestDiagnostic.confidenceCoveragePercent}% {lang === 'bn' ? 'কভারেজ' : 'coverage'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? latestDiagnostic.confidenceLabelBn
                  : latestDiagnostic.confidenceLabelEn}
              </span>
            </div>
          </section>

          {/* 5 Skill Progress Rings */}
          <section aria-label="Five-skill breakdown">
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
              {summary.skills.map((item) => (
                <SkillProgressRing key={item.skill} item={item} lang={lang} />
              ))}
            </div>
          </section>

          {/* Radar Chart + Strengths / Improvement Areas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="lv-portal-panel rounded-2xl p-6 lg:col-span-5">
              <h2 className="font-portal text-base font-bold text-white">
                {lang === 'bn' ? '৫-দক্ষতার ভিজ্যুয়াল মানচিত্র' : '5-Skill Diagnostic Map'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'শুধুমাত্র মূল্যায়িত দক্ষতাগুলোর বাস্তব শতাংশ গ্রাফে দেখানো হয়েছে।'
                  : 'Only genuinely assessed skills are plotted; unassessed axes remain at zero and labeled honestly.'}
              </p>

              <div className="mt-4">
                {summary.hasSufficientRadarData ? (
                  <SkillRadarChart skills={summary.skills} lang={lang} />
                ) : (
                  <p className="rounded-xl border border-slate-800 bg-[#08102B] p-4 text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'রাডার চার্টের জন্য কমপক্ষে ৩টি দক্ষতা মূল্যায়িত হওয়া প্রয়োজন।'
                      : 'Complete at least 3 skill sections to display the 5-axis radar visualization.'}
                  </p>
                )}
              </div>

              {summary.speakingCoachNoteEn && (
                <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-950/25 p-3.5 text-xs leading-relaxed text-violet-100">
                  <p className="font-semibold text-violet-200">
                    {lang === 'bn' ? 'AI স্পিকিং পর্যবেক্ষণ' : 'AI Speaking Note'}
                  </p>
                  <p className="mt-1">
                    {lang === 'bn' ? summary.speakingCoachNoteBn : summary.speakingCoachNoteEn}
                  </p>
                </div>
              )}
            </section>

            {/* Strengths & Opportunities */}
            <section className="lv-portal-panel rounded-2xl p-6 lg:col-span-7 space-y-6">
              <div>
                <h2 className="font-portal flex items-center gap-2 text-base font-bold text-white">
                  <CheckCircle2 className="h-4 w-4 text-[#16E58B]" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? 'আপনি ইতিমধ্যে যা ভালো পারেন' : 'What you already do well'}
                  </span>
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {(lang === 'bn' ? summary.strengthsBn : summary.strengthsEn).map((line, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-100 sm:text-sm"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-cyan-400/12 pt-5">
                <h2 className="font-portal flex items-center gap-2 text-base font-bold text-white">
                  <Sparkles className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? 'যেগুলোতে আরও অনুশীলন প্রয়োজন' : 'What needs more practice'}
                  </span>
                </h2>
                <ul className="mt-3 space-y-2">
                  {(lang === 'bn' ? summary.opportunitiesBn : summary.opportunitiesEn).map(
                    (line, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-cyan-400/15 bg-[#08102B]/80 px-3.5 py-2.5 text-xs leading-relaxed text-slate-200 sm:text-sm"
                      >
                        {line}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </section>
          </div>

          {/* PERSONALIZED LEARNING PATH */}
          <section className="lv-portal-panel rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#A855F7] uppercase">
                  {lang === 'bn' ? 'ব্যক্তিগতকৃত শেখার পথ' : 'Personalized Learning Path'}
                </p>
                <h2 className="font-portal mt-1.5 text-xl font-extrabold text-white sm:text-2xl">
                  {lang === 'bn'
                    ? 'আপনার জন্য নির্ধারিত শুরুর পরিকল্পনা'
                    : 'Your Recommended Starting Plan'}
                </h2>
              </div>

              <span className="font-mono text-xs font-semibold text-[#7DD3FC] tabular-nums">
                {lang === 'bn'
                  ? `দৈনিক লক্ষ্য: ${path.dailyPracticeMinutes} মিনিট/দিন`
                  : `Daily Practice Target: ${path.dailyPracticeMinutes} min / day`}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-cyan-400/15 bg-[#08102B]/80 p-4">
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'শুরুর অবস্থান' : 'Recommended Starting Point'}
                </p>
                <p className="mt-1.5 text-sm font-bold text-white">
                  {lang === 'bn' ? path.startingPointBn : path.startingPointEn}
                </p>
              </div>

              <div className="rounded-xl border border-cyan-400/15 bg-[#08102B]/80 p-4">
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'সবচেয়ে শক্তিশালী দক্ষতা' : 'Strongest Skills'}
                </p>
                <p className="mt-1.5 text-sm font-bold text-[#16E58B]">
                  {path.strongestSkills.length > 0
                    ? path.strongestSkills.map((s) => getSkillDisplayName(s, lang)).join(' · ')
                    : lang === 'bn'
                      ? 'প্রাথমিক ভিত্তি তৈরি হচ্ছে'
                      : 'Building core baseline'}
                </p>
              </div>

              <div className="rounded-xl border border-cyan-400/15 bg-[#08102B]/80 p-4">
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'অগ্রাধিকার উন্নতির ক্ষেত্র' : 'Priority Improvement Areas'}
                </p>
                <p className="mt-1.5 text-sm font-bold text-[#7DD3FC]">
                  {path.prioritySkills.map((s) => getSkillDisplayName(s, lang)).join(' · ')}
                </p>
              </div>
            </div>

            {/* Recommended First Lesson Card */}
            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-[#00D9FF]/30 bg-gradient-to-r from-[#0B1740] via-[#101846] to-[#1A1348] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-[#00D9FF]">
                  {lang === 'bn' ? 'আপনার প্রস্তাবিত প্রথম লেসন' : 'Recommended First Lesson'}
                </p>
                <p className="mt-1 text-base font-bold text-white">
                  {lang === 'bn'
                    ? path.recommendedFirstLessonTitleBn
                    : path.recommendedFirstLessonTitleEn}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {(lang === 'bn' ? path.nextStepsBn : path.nextStepsEn).map((stepLine, idx) => (
                    <li key={idx}>• {stepLine}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  to={`/app/learn/${encodeURIComponent(path.recommendedFirstLessonId)}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-[#0A1334] px-4 py-2.5 text-xs font-bold text-[#7DD3FC] hover:border-[#00D9FF] hover:text-white transition-colors whitespace-nowrap sm:text-sm"
                >
                  <span>{lang === 'bn' ? 'প্রথম লেসন খুলুন' : 'Start First Lesson'}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white cursor-pointer whitespace-nowrap"
                >
                  <span>{lang === 'bn' ? 'আমার ড্যাশবোর্ডে যান' : 'Go to My Dashboard'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          {/* Collapsible Item-by-Item Review (Answers revealed ONLY after completion) */}
          <section className="lv-portal-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowItemReview((v) => !v)}
                aria-expanded={showItemReview}
                className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#7DD3FC] transition-colors cursor-pointer"
              >
                <span>
                  {lang === 'bn'
                    ? `প্রশ্নভিত্তিক উত্তর ও ব্যাখ্যা দেখুন (${latestDiagnostic.items.length}টি লিখিত প্রশ্ন)`
                    : `Review Answers & Explanations (${latestDiagnostic.items.length} written items)`}
                </span>
                {showItemReview ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={handleRestartAssessment}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'আবার মূল্যায়ন দিন' : 'Retake Assessment'}</span>
              </button>
            </div>

            {showItemReview && (
              <div className="mt-5 divide-y divide-cyan-400/12">
                {latestDiagnostic.items.map((item, idx) => (
                  <div key={item.questionId} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {item.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16E58B]" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                        )}
                        <span className="font-mono text-xs font-semibold text-[#7DD3FC]">
                          #{idx + 1} · {item.mistakeCategory}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          item.isCorrect ? 'text-[#16E58B]' : 'text-rose-300'
                        }`}
                      >
                        {item.isCorrect
                          ? lang === 'bn'
                            ? 'সঠিক'
                            : 'Correct'
                          : lang === 'bn'
                            ? 'ভুল (মিস্টেক মেমোরিতে যুক্ত)'
                            : 'Logged to Mistake Memory'}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                      {lang === 'bn' ? 'আপনার উত্তর: ' : 'Your response: '}
                      <span
                        className={
                          item.isCorrect ? 'font-semibold text-emerald-300' : 'text-rose-300'
                        }
                      >
                        {item.userResponse || '—'}
                      </span>
                      {!item.isCorrect && (
                        <>
                          {' · '}
                          {lang === 'bn' ? 'সঠিক উত্তর: ' : 'Expected: '}
                          <span className="font-semibold text-emerald-300">
                            {item.correctAnswer}
                          </span>
                        </>
                      )}
                    </p>

                    <p className="font-bn mt-1.5 text-xs leading-relaxed text-slate-400">
                      {profile?.explanationLanguage === 'en'
                        ? item.explanationEn
                        : profile?.explanationLanguage === 'bn'
                          ? item.explanationBn
                          : lang === 'bn'
                            ? item.explanationBn
                            : `${item.explanationEn} — ${item.explanationBn}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  // =========================================================================
  // STAGE 2: FOCUSED ASSESSMENT WORKSPACE (NEVER REVEALS ANSWERS EARLY)
  // =========================================================================
  const workspaceSectionTitle = currentWrittenQ
    ? getWrittenSkillMeta(currentWrittenQ, lang)
    : currentListeningQ
      ? lang === 'bn'
        ? 'শুনে বোঝা (Listening)'
        : 'Listening Comprehension'
      : lang === 'bn'
        ? 'কথা বলা (Speaking)'
        : 'Speaking Sample';

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#05091F] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full bg-[#00D9FF]/10 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-[460px] w-[460px] rounded-full bg-[#7C3AED]/14 blur-[130px]" />
      </div>

      {renderTopBar(
        `${workspaceSectionTitle} · ${stepIndex + 1} / ${totalSteps}`,
        progressPercent
      )}

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6 pb-24 sm:px-6 sm:py-10 sm:pb-10">
        {/* Focused Question Card */}
        <section className="lv-portal-panel rounded-2xl p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-400/12 pb-4">
            <span className="text-xs font-semibold tracking-wider text-[#00D9FF] uppercase">
              {workspaceSectionTitle}
            </span>
            <span className="font-mono text-xs font-semibold text-slate-300 tabular-nums">
              {lang === 'bn'
                ? `ধাপ ${stepIndex + 1} / ${totalSteps}`
                : `Item ${stepIndex + 1} of ${totalSteps}`}
            </span>
          </div>

          <motion.div
            key={stepIndex}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5"
          >
              {/* WRITTEN ITEMS (Vocabulary, Grammar, Sentence Builder, Reading) */}
              {currentWrittenQ && (
                <div>
                  {currentWrittenQ.passageEn && (
                    <div className="mb-5 rounded-xl border border-cyan-400/20 bg-[#08102B]/90 p-4">
                      <p className="text-[11px] font-semibold tracking-wider text-[#7DD3FC] uppercase">
                        {lang === 'bn' ? 'প্যাসেজটি মনোযোগ দিয়ে পড়ুন' : 'Read the passage'}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-100">
                        {currentWrittenQ.passageEn}
                      </p>
                      {lang === 'bn' && currentWrittenQ.passageBnHint && (
                        <p className="font-bn mt-2 text-xs text-slate-400">
                          {currentWrittenQ.passageBnHint}
                        </p>
                      )}
                    </div>
                  )}

                  <h1 className="whitespace-pre-line text-lg font-bold leading-snug text-white sm:text-xl">
                    {lang === 'bn' ? currentWrittenQ.promptBn : currentWrittenQ.promptEn}
                  </h1>

                  {/* Multiple Choice */}
                  {currentWrittenQ.type === 'mcq' && currentWrittenQ.options && (
                    <div className="mt-5 space-y-2.5">
                      {currentWrittenQ.options.map((opt, idx) => {
                        const selected = writtenResponses[currentWrittenQ.id] === opt.id;
                        const letter = String.fromCharCode(65 + idx);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setValidationError(null);
                              setWrittenResponses((prev) => ({
                                ...prev,
                                [currentWrittenQ.id]: opt.id,
                              }));
                            }}
                            aria-pressed={selected}
                            className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all cursor-pointer ${
                              selected
                                ? 'border-[#00D9FF] bg-[#00D9FF]/14 text-white shadow-[0_0_20px_rgba(0,217,255,0.18)]'
                                : 'border-slate-700/80 bg-[#08102B]/80 text-slate-200 hover:border-cyan-400/45'
                            }`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                                selected
                                  ? 'bg-[#00D9FF] text-[#05091F]'
                                  : 'border border-slate-600 text-slate-300'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="text-sm font-medium">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Interactive Sentence Builder */}
                  {currentWrittenQ.type === 'sentence_builder' && (
                    <div className="mt-5 space-y-4">
                      <div>
                        <label
                          htmlFor="sentence-builder-input"
                          className="block text-xs font-medium text-slate-300"
                        >
                          {lang === 'bn'
                            ? 'নিচের শব্দগুলো ক্লিক করুন অথবা সরাসরি বাক্যটি টাইপ করুন'
                            : 'Tap word blocks below or type the complete sentence directly'}
                        </label>
                        <input
                          id="sentence-builder-input"
                          type="text"
                          value={writtenResponses[currentWrittenQ.id] ?? ''}
                          onChange={(e) => {
                            setValidationError(null);
                            setWrittenResponses((prev) => ({
                              ...prev,
                              [currentWrittenQ.id]: e.target.value,
                            }));
                          }}
                          placeholder={
                            lang === 'bn'
                              ? 'আপনার বাক্য এখানে তৈরি হবে...'
                              : 'Your sentence will appear here...'
                          }
                          className="lv-portal-input mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500"
                        />
                      </div>

                      {currentWrittenQ.wordBank && (
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {currentWrittenQ.wordBank.map((word) => (
                              <button
                                key={word}
                                type="button"
                                onClick={() => handleSentenceBankToggle(currentWrittenQ.id, word)}
                                className="rounded-lg border border-cyan-400/30 bg-[#0B173D] px-3.5 py-2 text-sm font-semibold text-cyan-100 hover:border-[#00D9FF] hover:bg-[#00D9FF]/15 transition-colors cursor-pointer"
                              >
                                {word}
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSentenceBankRemoveLast(currentWrittenQ.id)}
                              className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                            >
                              {lang === 'bn' ? 'শেষ শব্দ মুছুন' : 'Undo last word'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setWrittenResponses((prev) => ({
                                  ...prev,
                                  [currentWrittenQ.id]: '',
                                }))
                              }
                              className="text-xs font-semibold text-slate-400 hover:text-rose-300 cursor-pointer"
                            >
                              {lang === 'bn' ? 'সব মুছুন' : 'Clear'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* LISTENING ITEMS (Real browser speechSynthesis + honest Skip/Unavailable) */}
              {currentListeningQ && (
                <div>
                  <h1 className="text-lg font-bold text-white sm:text-xl">
                    {lang === 'bn' ? currentListeningQ.titleBn : currentListeningQ.titleEn}
                  </h1>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    {lang === 'bn'
                      ? 'প্রথমে অডিও ক্লিপটি শুনুন, তারপর নিচের প্রশ্নের উত্তর দিন। অডিও শুনতে সমস্যা হলে "লিসেনিং এড়ান" বেছে নিন—কোনো কাল্পনিক স্কোর দেওয়া হবে না।'
                      : 'Listen to the spoken audio clip below, then select the best answer. If audio is unavailable on your device, choose Skip Listening and no score will be fabricated.'}
                  </p>

                  {/* Real Audio Playback Console */}
                  <div className="mt-5 rounded-xl border border-cyan-400/25 bg-[#08102B]/90 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            isPlayingAudio
                              ? stopAudioPlayback()
                              : handlePlayListeningClip(
                                  currentListeningQ.id,
                                  currentListeningQ.spokenScriptEn
                                )
                          }
                          disabled={!speechSynthSupported}
                          className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white cursor-pointer disabled:opacity-50"
                        >
                          {isPlayingAudio ? (
                            <>
                              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                              <span>{lang === 'bn' ? 'থামান' : 'Stop'}</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                              <span>
                                {playedClips[currentListeningQ.id]
                                  ? lang === 'bn'
                                    ? 'আবার শুনুন'
                                    : 'Replay Audio'
                                  : lang === 'bn'
                                    ? 'অডিও চালান'
                                    : 'Play Audio'}
                              </span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setAudioRate((r) => (r === 1 ? 0.82 : 1))}
                          className="rounded-lg border border-slate-700 bg-[#0D1840] px-3 py-2 font-mono text-xs font-semibold text-slate-200 hover:border-cyan-400/50 cursor-pointer"
                        >
                          {audioRate === 1
                            ? lang === 'bn'
                              ? 'গতি: ১.০x (স্বাভাবিক)'
                              : 'Speed: 1.0x'
                            : lang === 'bn'
                              ? 'গতি: ০.৮২x (ধীরে)'
                              : 'Speed: 0.82x (Slow)'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#7DD3FC]">
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {isPlayingAudio
                            ? lang === 'bn'
                              ? 'অডিও চলছে...'
                              : 'Playing audio...'
                            : playedClips[currentListeningQ.id]
                              ? lang === 'bn'
                                ? 'শোনা হয়েছে'
                                : 'Clip played'
                              : lang === 'bn'
                                ? 'শোনার জন্য প্রস্তুত'
                                : 'Ready to play'}
                        </span>
                      </div>
                    </div>

                    {audioError && (
                      <p role="alert" className="mt-3 text-xs text-amber-300">
                        {audioError}
                      </p>
                    )}

                    {!speechSynthSupported && (
                      <p className="mt-3 text-xs text-amber-300">
                        {lang === 'bn'
                          ? 'এই ব্রাউজারে স্পিচ অডিও প্লেব্যাক উপলব্ধ নয়। নিচের "লিসেনিং এড়ান" বাটনে ক্লিক করুন।'
                          : 'Speech audio playback is not available in this browser. Click "Skip Listening" below to continue honestly.'}
                      </p>
                    )}
                  </div>

                  <p className="mt-5 text-base font-semibold text-white">
                    {lang === 'bn' ? currentListeningQ.promptBn : currentListeningQ.promptEn}
                  </p>

                  <div className="mt-3.5 space-y-2.5">
                    {currentListeningQ.options.map((opt, idx) => {
                      const selected = listeningResponses[currentListeningQ.id] === opt.id;
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setValidationError(null);
                            setListeningSkipped(false);
                            setListeningResponses((prev) => ({
                              ...prev,
                              [currentListeningQ.id]: opt.id,
                            }));
                          }}
                          aria-pressed={selected}
                          className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                            selected
                              ? 'border-[#00D9FF] bg-[#00D9FF]/14 text-white shadow-[0_0_20px_rgba(0,217,255,0.18)]'
                              : 'border-slate-700/80 bg-[#08102B]/80 text-slate-200 hover:border-cyan-400/45'
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                              selected
                                ? 'bg-[#00D9FF] text-[#05091F]'
                                : 'border border-slate-600 text-slate-300'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="text-sm font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSkipListening}
                      className="text-xs font-semibold text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-cyan-200 cursor-pointer"
                    >
                      {lang === 'bn'
                        ? 'লিসেনিং এড়ান (অডিও অনুপলব্ধ / পরে করব)'
                        : 'Skip Listening (Audio unavailable / do later)'}
                    </button>
                  </div>
                </div>
              )}

              {/* SPEAKING PROMPT (Real MediaRecorder + Honest AI Availability Check) */}
              {isSpeakingStep && (
                <div>
                  <h1 className="text-lg font-bold text-white sm:text-xl">
                    {lang === 'bn'
                      ? SPEAKING_ASSESSMENT_PROMPT.titleBn
                      : SPEAKING_ASSESSMENT_PROMPT.titleEn}
                  </h1>
                  <p className="mt-2.5 rounded-xl border border-cyan-400/20 bg-[#08102B]/90 p-4 text-sm leading-relaxed text-slate-100">
                    {lang === 'bn'
                      ? SPEAKING_ASSESSMENT_PROMPT.promptBn
                      : SPEAKING_ASSESSMENT_PROMPT.promptEn}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {lang === 'bn'
                      ? SPEAKING_ASSESSMENT_PROMPT.guidanceBn
                      : SPEAKING_ASSESSMENT_PROMPT.guidanceEn}
                  </p>

                  {/* Honest Backend Speech Processing Availability Banner */}
                  {speakingHealthChecked && (!speakingAiConfigured || !speechRecSupported) && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400/35 bg-amber-950/20 p-3.5 text-xs leading-relaxed text-amber-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                      <p>
                        {!speakingAiConfigured
                          ? lang === 'bn'
                            ? 'স্বয়ংক্রিয় AI স্পিচ মূল্যায়ন সার্ভিস এই সার্ভারে এখনো কনফিগার করা নেই। আপনি নিজের ভয়েস রেকর্ড করে শুনতে পারেন, অথবা সরাসরি ফলাফল দেখতে পারেন—কোনো কাল্পনিক স্পিকিং স্কোর দেখানো হবে না।'
                            : 'Automated AI speech evaluation is not configured on this server right now. You can still record and play back your voice locally, or continue to your results—Speaking will honestly show as "Not assessed yet / Service unavailable".'
                          : lang === 'bn'
                            ? 'এই ব্রাউজারে লাইভ স্পিচ-টু-টেক্সট উপলব্ধ নয়। আপনি নিজের কণ্ঠ রেকর্ড করে প্লেব্যাক করতে পারবেন, এবং স্পিকিং স্কোর কাল্পনিকভাবে তৈরি করা হবে না।'
                            : 'Live browser speech-to-text is unavailable in this browser. You can record and replay locally, and Speaking will remain honestly unassessed rather than fabricating a score.'}
                      </p>
                    </div>
                  )}

                  {/* Real Microphone Recorder Panel */}
                  <div className="mt-5 rounded-xl border border-cyan-400/20 bg-[#08102B]/85 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {!isRecording ? (
                          <button
                            type="button"
                            onClick={() => void startSpeakingRecording()}
                            className="lv-portal-btn-violet inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white cursor-pointer"
                          >
                            <Mic className="h-4 w-4" aria-hidden="true" />
                            <span>
                              {recordedAudioUrl
                                ? lang === 'bn'
                                  ? 'আবার রেকর্ড করুন'
                                  : 'Re-record Response'
                                : lang === 'bn'
                                  ? 'রেকর্ডিং শুরু করুন'
                                  : 'Start Recording'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopSpeakingRecording}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 transition-colors cursor-pointer"
                          >
                            <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                            <span>{lang === 'bn' ? 'রেকর্ডিং থামান' : 'Stop Recording'}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs text-slate-300 tabular-nums">
                        {isRecording && (
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"
                          />
                        )}
                        <span>
                          {formatTimer(recordSeconds)} / {formatTimer(SPEAKING_ASSESSMENT_PROMPT.maxSeconds)}
                        </span>
                      </div>
                    </div>

                    {micError && (
                      <div
                        role="alert"
                        className="mt-3 flex items-start gap-2 text-xs text-amber-300"
                      >
                        <MicOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <p>{micError}</p>
                      </div>
                    )}

                    {liveTranscript && (
                      <div className="mt-4 rounded-lg border border-slate-700/80 bg-[#05091F]/80 p-3 text-xs text-slate-200">
                        <p className="font-semibold text-[#7DD3FC]">
                          {lang === 'bn' ? 'লাইভ ট্রান্সক্রিপ্ট:' : 'Captured transcript:'}
                        </p>
                        <p className="mt-1 leading-relaxed">{liveTranscript}</p>
                      </div>
                    )}

                    {recordedAudioUrl && !isRecording && (
                      <div className="mt-4">
                        <p className="mb-1.5 text-xs font-medium text-slate-300">
                          {lang === 'bn' ? 'আপনার রেকর্ডিং শুনুন:' : 'Playback preview:'}
                        </p>
                        <audio controls src={recordedAudioUrl} className="w-full h-10" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {validationError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                  <p>{validationError}</p>
                </div>
              )}
            </motion.div>

          {/* Desktop/Tablet Workspace Footer */}
          <div className="mt-7 hidden items-center justify-between gap-3 border-t border-cyan-400/15 pt-5 sm:flex">
            <button
              type="button"
              onClick={handlePreviousStep}
              disabled={stepIndex === 0 || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0A1334] px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'আগের প্রশ্ন' : 'Previous'}</span>
            </button>

            {isSpeakingStep ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleSubmitFullAssessment(true)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-700 bg-[#0A1334] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-white transition-colors cursor-pointer disabled:opacity-50 sm:text-sm"
                >
                  {lang === 'bn' ? 'স্পিকিং এড়িয়ে ফলাফল দেখুন' : 'Skip Speaking & View Results'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitFullAssessment(false)}
                  disabled={isSubmitting}
                  className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {isSubmitting
                      ? lang === 'bn'
                        ? 'বিশ্লেষণ হচ্ছে...'
                        : 'Evaluating...'
                      : lang === 'bn'
                        ? 'মূল্যায়ন সম্পন্ন করুন'
                        : 'Finish & View Profile'}
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleNextStep}
                className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white cursor-pointer"
              >
                <span>{lang === 'bn' ? 'পরবর্তী' : 'Next'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2.5 border-t border-cyan-400/20 bg-[#05091F]/95 px-4 py-3 backdrop-blur-lg sm:hidden">
        <button
          type="button"
          onClick={handlePreviousStep}
          disabled={stepIndex === 0 || isSubmitting}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-[#0A1334] px-3.5 py-2.5 text-xs font-semibold text-slate-200 disabled:opacity-40 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{lang === 'bn' ? 'পিছনে' : 'Back'}</span>
        </button>

        {isSpeakingStep ? (
          <button
            type="button"
            onClick={() => void handleSubmitFullAssessment(!recordedAudioUrl && !liveTranscript)}
            disabled={isSubmitting}
            className="lv-portal-btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white cursor-pointer disabled:opacity-60"
          >
            <span>
              {isSubmitting
                ? lang === 'bn'
                  ? 'বিশ্লেষণ হচ্ছে...'
                  : 'Evaluating...'
                : lang === 'bn'
                  ? 'ফলাফল দেখুন'
                  : 'Finish & View Profile'}
            </span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNextStep}
            className="lv-portal-btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white cursor-pointer"
          >
            <span>{lang === 'bn' ? 'পরবর্তী' : 'Next'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
