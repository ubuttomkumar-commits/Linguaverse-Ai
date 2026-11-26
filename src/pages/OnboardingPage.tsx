import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Globe,
  Mic,
  MicOff,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { OnboardingShell } from '../components/onboarding/OnboardingShell';
import type { OnboardingSceneVariant } from '../components/onboarding/OnboardingSceneVisuals';
import {
  DAILY_COMMITMENT_OPTIONS,
  EXPLANATION_DEPTH_OPTIONS,
  LEARNING_FORMAT_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  SELF_PROFICIENCY_OPTIONS,
  TARGET_LANGUAGE_OPTIONS,
  filterNativeLanguages,
  getNativeLanguageByCode,
  getProficiencyOptionById,
  getTargetLanguageByCode,
  mapGoalsToPrimaryGoal,
  mapProficiencyChoiceToCefrEstimate,
  validateOnboardingStep,
  type OnboardingDraft,
} from '../domain/onboardingCatalog';
import type {
  DailyTimeGoalMinutes,
  ExplanationLanguage,
  LearningGoalId,
  MicPermissionState,
  SelfProficiencyChoice,
  UILanguage,
} from '../types/domain';

const TOTAL_STEPS = 10;
const DRAFT_STORAGE_KEY = 'lv_onboarding_draft_v1';

interface StepMeta {
  titleEn: string;
  titleBn: string;
  scene: OnboardingSceneVariant;
  captionEn: string;
  captionBn: string;
}

const STEP_META: Record<number, StepMeta> = {
  1: {
    titleEn: 'Welcome',
    titleBn: 'স্বাগতম',
    scene: 'welcome',
    captionEn:
      'A calm, 2-minute calibration to shape your curriculum, explanations, and daily rhythm.',
    captionBn:
      'মাত্র ২ মিনিটের ব্যক্তিগত সেটআপ—আপনার লেসন, ব্যাখ্যা এবং দৈনিক অনুশীলনের ছন্দ সাজাতে।',
  },
  2: {
    titleEn: 'Interface Language',
    titleBn: 'ইন্টারফেস ভাষা',
    scene: 'languages',
    captionEn: 'Switch between English and বাংলা instantly across the entire platform.',
    captionBn: 'পুরো প্ল্যাটফর্মে মুহূর্তেই English এবং বাংলা ইন্টারফেস পরিবর্তন করুন।',
  },
  3: {
    titleEn: 'Native Language',
    titleBn: 'মাতৃভাষা',
    scene: 'languages',
    captionEn: 'Knowing your native language helps tailor explanations and common transfer habits.',
    captionBn: 'আপনার মাতৃভাষা জানা থাকলে ব্যাখ্যা ও স্বাভাবিক বাক্য গঠনের সহায়তা আরও কার্যকর হয়।',
  },
  4: {
    titleEn: 'Target Language',
    titleBn: 'লক্ষ্য ভাষা',
    scene: 'languages',
    captionEn:
      'English is live today with full lessons, diagnostic assessment, and AI Speaking Studio.',
    captionBn:
      'সম্পূর্ণ কারিকুলাম, ডায়াগনস্টিক মূল্যায়ন এবং AI স্পিকিং স্টুডিওসহ ইংরেজি এখনই চালু।',
  },
  5: {
    titleEn: 'Learning Goals',
    titleBn: 'শেখার লক্ষ্য',
    scene: 'goals',
    captionEn: 'Choose every outcome that matters to you—your starting path prioritizes them.',
    captionBn: 'আপনার জন্য গুরুত্বপূর্ণ লক্ষ্যগুলো বেছে নিন—শেখার পথ সেভাবেই সাজানো হবে।',
  },
  6: {
    titleEn: 'Daily Commitment',
    titleBn: 'দৈনিক সময় লক্ষ্য',
    scene: 'goals',
    captionEn: 'Short, consistent daily sessions build spoken fluency faster than irregular cramming.',
    captionBn: 'অনিয়মিত দীর্ঘ পড়ার চেয়ে প্রতিদিন নিয়মিত অল্প চর্চায় দ্রুত সাবলীলতা আসে।',
  },
  7: {
    titleEn: 'Learning Preferences',
    titleBn: 'শেখার ধরন ও পছন্দ',
    scene: 'goals',
    captionEn: 'Fine-tune how LINGUAVERSE AI explains mistakes and paces your practice.',
    captionBn: 'LINGUAVERSE AI কীভাবে ভুল ব্যাখ্যা করবে এবং অনুশীলন সাজাবে তা নির্বাচন করুন।',
  },
  8: {
    titleEn: 'Current Proficiency',
    titleBn: 'বর্তমান দক্ষতার ধারণা',
    scene: 'assessment',
    captionEn: 'Your own starting estimate—we will calibrate it honestly in the initial assessment.',
    captionBn: 'এটি কেবল আপনার নিজস্ব ধারণা—প্রাথমিক মূল্যায়নে আমরা বাস্তব অবস্থান যাচাই করব।',
  },
  9: {
    titleEn: 'Microphone & Audio',
    titleBn: 'মাইক্রোফোন ও অডিও',
    scene: 'microphone',
    captionEn: 'Audio is only captured when you actively press Record, never in the background.',
    captionBn: 'আপনি নিজে রেকর্ড বাটনে চাপ না দেওয়া পর্যন্ত কখনোই অডিও চালু হয় না।',
  },
  10: {
    titleEn: 'Onboarding Summary',
    titleBn: 'সেটআপ সারাংশ',
    scene: 'assessment',
    captionEn: 'Review your profile, edit any step directly, then begin your 5-skill assessment.',
    captionBn: 'আপনার সব পছন্দ যাচাই করুন, প্রয়োজনে বদলান, তারপর ৫-দক্ষতার প্রাথমিক মূল্যায়ন শুরু করুন।',
  },
};

function createInitialDraft(
  fallbackUiLang: UILanguage,
  profile: ReturnType<typeof useAuth>['profile']
): OnboardingDraft {
  const defaultDraft: OnboardingDraft = {
    preferredUiLanguage: profile?.preferredUiLanguage ?? fallbackUiLang,
    nativeLanguage: profile?.nativeLanguage ?? 'bn',
    targetLanguage: profile?.targetLanguage ?? 'en',
    learningGoals:
      profile?.learningGoals && profile.learningGoals.length > 0
        ? profile.learningGoals
        : ['speak_confidently'],
    dailyTimeGoalMinutes: profile?.dailyTimeGoalMinutes ?? 15,
    explanationLanguage: profile?.explanationLanguage ?? 'both',
    explanationDepth: profile?.explanationDepth ?? 'balanced',
    learningFormat: profile?.learningFormat ?? 'mixed_practice',
    dailyReminderEnabled: profile?.dailyReminderEnabled ?? false,
    dailyReminderTime: profile?.dailyReminderTime ?? '20:00',
    selfProficiencyChoice: profile?.selfProficiencyChoice ?? 'basic_conversations',
    microphonePermissionStatus: profile?.microphonePermissionStatus ?? 'idle',
  };

  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return defaultDraft;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    return {
      ...defaultDraft,
      ...parsed,
      learningGoals:
        Array.isArray(parsed.learningGoals) && parsed.learningGoals.length > 0
          ? parsed.learningGoals
          : defaultDraft.learningGoals,
    };
  } catch {
    return defaultDraft;
  }
}

export function OnboardingPage() {
  const { lang, setLang } = useLanguage();
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const prefersReduced = Boolean(useReducedMotion());

  const [step, setStep] = useState<number>(1);
  const [returnToSummary, setReturnToSummary] = useState<boolean>(false);
  const [draft, setDraft] = useState<OnboardingDraft>(() => createInitialDraft(lang, profile));
  const [nativeSearch, setNativeSearch] = useState('');
  const [roadmapNotice, setRoadmapNotice] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [micRequesting, setMicRequesting] = useState(false);
  const [micDetailMessage, setMicDetailMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync in-progress draft to sessionStorage so refreshing mid-onboarding keeps progress
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota / private mode errors
    }
  }, [draft]);

  // Keep draft UI language aligned when user switches top-right EN/বাংলা switcher
  useEffect(() => {
    setDraft((prev) =>
      prev.preferredUiLanguage === lang ? prev : { ...prev, preferredUiLanguage: lang }
    );
  }, [lang]);

  // Detect unsupported mediaDevices cleanly when landing on Step 9 (without requesting permission!)
  useEffect(() => {
    if (step !== 9) return;
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setDraft((prev) =>
        prev.microphonePermissionStatus === 'unsupported'
          ? prev
          : { ...prev, microphonePermissionStatus: 'unsupported' }
      );
    }
  }, [step]);

  const filteredNativeLanguages = useMemo(
    () => filterNativeLanguages(nativeSearch),
    [nativeSearch]
  );

  const popularNative = useMemo(
    () => filteredNativeLanguages.filter((l) => l.popular),
    [filteredNativeLanguages]
  );

  const otherNative = useMemo(
    () => filteredNativeLanguages.filter((l) => !l.popular),
    [filteredNativeLanguages]
  );

  const stepMeta = STEP_META[step] ?? STEP_META[1];

  const handleSelectUiLang = (next: UILanguage) => {
    setLang(next);
    setDraft((prev) => ({ ...prev, preferredUiLanguage: next }));
    setStepError(null);
  };

  const handleToggleGoal = (goalId: LearningGoalId) => {
    setStepError(null);
    setDraft((prev) => {
      const exists = prev.learningGoals.includes(goalId);
      const nextGoals = exists
        ? prev.learningGoals.filter((g) => g !== goalId)
        : [...prev.learningGoals, goalId];
      return { ...prev, learningGoals: nextGoals };
    });
  };

  const handleEnableMicrophone = async () => {
    setStepError(null);
    setMicDetailMessage(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setDraft((prev) => ({ ...prev, microphonePermissionStatus: 'unsupported' }));
      setMicDetailMessage(
        lang === 'bn'
          ? 'এই ব্রাউজারে সরাসরি মাইক্রোফোন অ্যাক্সেস সমর্থিত নয়। আপনি স্পিকিং ছাড়াই এগিয়ে যেতে পারেন।'
          : 'This browser does not support direct microphone capture. You can continue without microphone access.'
      );
      return;
    }

    setMicRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release audio tracks so the browser mic indicator turns off cleanly
      stream.getTracks().forEach((track) => track.stop());
      setDraft((prev) => ({ ...prev, microphonePermissionStatus: 'granted' }));
      setMicDetailMessage(
        lang === 'bn'
          ? 'মাইক্রোফোন সফলভাবে যুক্ত হয়েছে। স্পিকিং মূল্যায়ন ও স্টুডিওর জন্য প্রস্তুত।'
          : 'Microphone access verified. You are ready for spoken assessment and AI Speaking Studio.'
      );
    } catch (err) {
      const errName = err instanceof DOMException ? err.name : '';
      const isUnavailable = errName === 'NotFoundError' || errName === 'DevicesNotFoundError';
      const nextState: MicPermissionState = isUnavailable ? 'unsupported' : 'denied';
      setDraft((prev) => ({ ...prev, microphonePermissionStatus: nextState }));
      setMicDetailMessage(
        isUnavailable
          ? lang === 'bn'
            ? 'এই ডিভাইসে কোনো সক্রিয় মাইক্রোফোন পাওয়া যায়নি। আপনি এখন এড়িয়ে যেতে পারেন এবং পরে আবার চেষ্টা করতে পারবেন।'
            : 'No active microphone hardware was detected on this device. You can skip for now and enable it anytime later.'
          : lang === 'bn'
            ? 'মাইক্রোফোন অনুমতি দেওয়া হয়নি। ব্রাউজারের অ্যাড্রেস বার থেকে অনুমতি পরিবর্তন করতে পারেন অথবা এখন এড়িয়ে এগিয়ে যেতে পারেন।'
            : 'Microphone permission was not granted. You can enable it later in your browser address bar or continue without it now.'
      );
    } finally {
      setMicRequesting(false);
    }
  };

  const handleSkipMicrophone = () => {
    setDraft((prev) => ({
      ...prev,
      microphonePermissionStatus:
        prev.microphonePermissionStatus === 'granted' ? 'granted' : 'skipped',
    }));
    setStepError(null);
    if (returnToSummary) {
      setReturnToSummary(false);
      setStep(10);
    } else {
      setStep(10);
    }
  };

  const goNext = () => {
    const validationMsg = validateOnboardingStep(step, draft, lang);
    if (validationMsg) {
      setStepError(validationMsg);
      return;
    }
    setStepError(null);
    setRoadmapNotice(null);

    if (returnToSummary && step < TOTAL_STEPS) {
      setReturnToSummary(false);
      setStep(TOTAL_STEPS);
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    setStepError(null);
    setRoadmapNotice(null);
    if (returnToSummary) {
      setReturnToSummary(false);
      setStep(TOTAL_STEPS);
      return;
    }
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const jumpToEditStep = (targetStep: number) => {
    setStepError(null);
    setRoadmapNotice(null);
    setReturnToSummary(true);
    setStep(targetStep);
  };

  const handleCompleteOnboarding = async (destination: '/diagnostic' | '/app') => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const mappedPrimaryGoal = mapGoalsToPrimaryGoal(draft.learningGoals);
      const mappedSelfLevel = mapProficiencyChoiceToCefrEstimate(draft.selfProficiencyChoice);

      await updateProfile({
        preferredUiLanguage: draft.preferredUiLanguage,
        nativeLanguage: draft.nativeLanguage,
        targetLanguage: draft.targetLanguage,
        learningGoals: draft.learningGoals,
        primaryGoal: mappedPrimaryGoal,
        dailyTimeGoalMinutes: draft.dailyTimeGoalMinutes,
        explanationLanguage: draft.explanationLanguage,
        explanationDepth: draft.explanationDepth,
        learningFormat: draft.learningFormat,
        dailyReminderEnabled: draft.dailyReminderEnabled,
        dailyReminderTime: draft.dailyReminderTime,
        selfProficiencyChoice: draft.selfProficiencyChoice,
        selfEstimatedLevel: mappedSelfLevel,
        microphonePermissionStatus: draft.microphonePermissionStatus,
        onboardingCompleted: true,
      });

      setLang(draft.preferredUiLanguage);
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore
      }
      navigate(destination, { replace: true });
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'অনবোর্ডিং প্রোফাইল সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'
            : 'Unable to save your onboarding preferences. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedNativeOption = getNativeLanguageByCode(draft.nativeLanguage);
  const selectedTargetOption = getTargetLanguageByCode(draft.targetLanguage);
  const selectedProficiencyOption = getProficiencyOptionById(draft.selfProficiencyChoice);
  const selectedCommitmentOption =
    DAILY_COMMITMENT_OPTIONS.find((d) => d.minutes === draft.dailyTimeGoalMinutes) ??
    DAILY_COMMITMENT_OPTIONS[2];
  const selectedDepthOption =
    EXPLANATION_DEPTH_OPTIONS.find((d) => d.id === draft.explanationDepth) ??
    EXPLANATION_DEPTH_OPTIONS[1];
  const selectedFormatOption =
    LEARNING_FORMAT_OPTIONS.find((f) => f.id === draft.learningFormat) ??
    LEARNING_FORMAT_OPTIONS[2];

  const renderFooter = () => {
    if (step === 1) {
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden text-xs text-slate-400 sm:block">
            {lang === 'bn' ? 'সময় লাগবে ~২ মিনিট · যেকোনো সময় বদলানো যাবে' : 'Takes ~2 minutes · Editable anytime in Settings'}
          </p>
          <button
            type="button"
            onClick={goNext}
            className="lv-portal-btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white cursor-pointer sm:w-auto"
          >
            <span>{lang === 'bn' ? 'আমার যাত্রা শুরু করুন' : 'Start My Journey'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      );
    }

    if (step === 10) {
      return (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0A1334] px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'পিছনে' : 'Back'}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleCompleteOnboarding('/app')}
              disabled={isSaving}
              className="text-xs font-medium text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {lang === 'bn' ? 'এখন ড্যাশবোর্ডে যান' : 'Skip assessment for now'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleCompleteOnboarding('/diagnostic')}
            disabled={isSaving}
            className="lv-portal-btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white cursor-pointer disabled:opacity-60 sm:w-auto"
          >
            <span>
              {isSaving
                ? lang === 'bn'
                  ? 'সংরক্ষণ হচ্ছে...'
                  : 'Saving profile...'
                : lang === 'bn'
                  ? 'আমার মূল্যায়ন শুরু করুন'
                  : 'Start My Assessment'}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0A1334] px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>
            {returnToSummary
              ? lang === 'bn'
                ? 'সারাংশে ফিরুন'
                : 'Summary'
              : lang === 'bn'
                ? 'পিছনে'
                : 'Back'}
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          {step === 7 && (
            <button
              type="button"
              onClick={goNext}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"
            >
              {lang === 'bn' ? 'ঐচ্ছিক ধাপ এড়ান' : 'Skip optional'}
            </button>
          )}
          {step === 9 && draft.microphonePermissionStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleSkipMicrophone}
              className="rounded-xl border border-slate-700/80 bg-[#0A1334] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-white transition-colors cursor-pointer sm:text-sm"
            >
              {lang === 'bn' ? 'এখন এড়িয়ে যান' : 'Skip for now'}
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white cursor-pointer"
          >
            <span>
              {returnToSummary
                ? lang === 'bn'
                  ? 'সংরক্ষণ করে সারাংশে ফিরুন'
                  : 'Return to Summary'
                : lang === 'bn'
                  ? 'এগিয়ে যান'
                  : 'Continue'}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <OnboardingShell
      step={step}
      totalSteps={TOTAL_STEPS}
      stepTitleEn={stepMeta.titleEn}
      stepTitleBn={stepMeta.titleBn}
      sceneVariant={stepMeta.scene}
      sceneCaptionEn={stepMeta.captionEn}
      sceneCaptionBn={stepMeta.captionBn}
      micActive={draft.microphonePermissionStatus === 'granted'}
      footer={renderFooter()}
    >
      <motion.div
        key={step}
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
          {/* SCREEN 01 — WELCOME */}
          {step === 1 && (
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#00D9FF] uppercase">
                {lang === 'bn' ? 'ব্যক্তিগত অনবোর্ডিং' : 'Personalized Onboarding'}
              </p>
              <h1 className="font-portal mt-2.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {lang === 'bn'
                  ? 'আপনার যোগাযোগ যাত্রা এখান থেকেই শুরু।'
                  : 'Your Communication Journey Starts Here.'}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                {lang === 'bn'
                  ? 'চলুন আপনার শেখার অভিজ্ঞতা ব্যক্তিগতভাবে সাজিয়ে নিই।'
                  : "Let's personalize your learning experience."}
              </p>

              {user?.name && (
                <p className="mt-4 text-sm text-cyan-200/90">
                  {lang === 'bn'
                    ? `স্বাগতম, ${user.name}। কয়েকটি সংক্ষিপ্ত প্রশ্নের মাধ্যমে আমরা আপনার শেখার পথ প্রস্তুত করব।`
                    : `Welcome, ${user.name}. In a few quick steps, we'll tailor your lessons, explanations, and initial diagnostic.`}
                </p>
              )}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-cyan-400/15 bg-[#08102B]/75 p-4">
                  <Globe className="h-5 w-5 text-[#00D9FF]" aria-hidden="true" />
                  <p className="mt-2.5 text-sm font-semibold text-white">
                    {lang === 'bn' ? 'ভাষা ও ব্যাখ্যা' : 'Language & Clarity'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {lang === 'bn'
                      ? 'আপনার মাতৃভাষা ও পছন্দের ব্যাখ্যার ধরন নির্ধারণ করুন।'
                      : 'Choose your UI language, native script, and explanation depth.'}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-400/15 bg-[#08102B]/75 p-4">
                  <Sparkles className="h-5 w-5 text-[#A855F7]" aria-hidden="true" />
                  <p className="mt-2.5 text-sm font-semibold text-white">
                    {lang === 'bn' ? 'লক্ষ্য ও দৈনিক ছন্দ' : 'Goals & Daily Pace'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {lang === 'bn'
                      ? 'বাস্তব লক্ষ্য ও প্রতিদিন ৫ থেকে ৪৫+ মিনিটের সময় বেছে নিন।'
                      : 'Select real communication goals and a sustainable daily target.'}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-400/15 bg-[#08102B]/75 p-4">
                  <Mic className="h-5 w-5 text-[#16E58B]" aria-hidden="true" />
                  <p className="mt-2.5 text-sm font-semibold text-white">
                    {lang === 'bn' ? 'প্রাথমিক মূল্যায়ন' : '5-Skill Diagnostic'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {lang === 'bn'
                      ? 'সততার সাথে আপনার বর্তমান অবস্থান ও শুরুর লেসন জানুন।'
                      : 'Map your genuine starting baseline without fabricated scores.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 02 — INTERFACE LANGUAGE */}
          {step === 2 && (
            <div>
              <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                {lang === 'bn'
                  ? 'আপনি কোন ভাষায় অ্যাপটি ব্যবহার করতে চান?'
                  : 'Choose your interface language'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {lang === 'bn'
                  ? 'মেনু, নির্দেশনা ও বাটনগুলো তাৎক্ষণিকভাবে আপনার পছন্দের ভাষায় পরিবর্তিত হবে।'
                  : 'Menus, prompts, and navigation switch immediately as soon as you choose.'}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleSelectUiLang('en')}
                  aria-pressed={draft.preferredUiLanguage === 'en'}
                  className={`flex items-start justify-between rounded-xl border p-5 text-left transition-all cursor-pointer ${
                    draft.preferredUiLanguage === 'en'
                      ? 'border-[#00D9FF] bg-[#00D9FF]/12 shadow-[0_0_24px_rgba(0,217,255,0.18)]'
                      : 'border-slate-700/80 bg-[#08102B]/80 hover:border-cyan-400/40'
                  }`}
                >
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#7DD3FC]">EN</p>
                    <p className="mt-1.5 text-lg font-bold text-white">English</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Full English workspace with optional Bengali grammar support.
                    </p>
                  </div>
                  {draft.preferredUiLanguage === 'en' && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectUiLang('bn')}
                  aria-pressed={draft.preferredUiLanguage === 'bn'}
                  className={`flex items-start justify-between rounded-xl border p-5 text-left transition-all cursor-pointer ${
                    draft.preferredUiLanguage === 'bn'
                      ? 'border-[#00D9FF] bg-[#00D9FF]/12 shadow-[0_0_24px_rgba(0,217,255,0.18)]'
                      : 'border-slate-700/80 bg-[#08102B]/80 hover:border-cyan-400/40'
                  }`}
                >
                  <div>
                    <p className="font-bn text-xs font-semibold text-[#C084FC]">বাংলা</p>
                    <p className="font-bn mt-1.5 text-lg font-bold text-white">বাংলা (Bengali)</p>
                    <p className="font-bn mt-1 text-xs leading-relaxed text-slate-400">
                      সম্পূর্ণ বাংলা ইন্টারফেস এবং ইংরেজি ভুলের পরিষ্কার বাংলা ব্যাখ্যা।
                    </p>
                  </div>
                  {draft.preferredUiLanguage === 'bn' && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                  )}
                </button>
              </div>

              <p className="mt-5 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'আপনি যেকোনো সময় Settings থেকে ইন্টারফেস ভাষা পরিবর্তন করতে পারবেন।'
                  : 'You can change your interface language anytime in Settings.'}
              </p>
            </div>
          )}

          {/* SCREEN 03 — NATIVE LANGUAGE */}
          {step === 3 && (
            <div>
              <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                {lang === 'bn' ? 'আপনার মাতৃভাষা কোনটি?' : 'What is your native language?'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {lang === 'bn'
                  ? 'বিশ্বের যেকোনো ভাষার শিক্ষার্থীর জন্য আমরা ব্যক্তিগত সহায়তা সাজাই। আপনার মাতৃভাষা খুঁজুন বা নিচে থেকে নির্বাচন করুন।'
                  : 'Search or pick the language you speak most naturally. We never assume your background.'}
              </p>

              <div className="relative mt-5">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={nativeSearch}
                  onChange={(e) => setNativeSearch(e.target.value)}
                  placeholder={
                    lang === 'bn'
                      ? 'ভাষা খুঁজুন (যেমন: বাংলা, Hindi, Arabic, Spanish...)'
                      : 'Search languages (e.g., Bengali, Hindi, Spanish, Arabic...)'
                  }
                  aria-label={lang === 'bn' ? 'মাতৃভাষা খুঁজুন' : 'Search native language'}
                  className="lv-portal-input w-full rounded-xl py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-slate-500"
                />
                {nativeSearch && (
                  <button
                    type="button"
                    onClick={() => setNativeSearch('')}
                    aria-label={lang === 'bn' ? 'সার্চ মুছুন' : 'Clear search'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="mt-4 max-h-[300px] space-y-4 overflow-y-auto pr-1">
                {popularNative.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                      {lang === 'bn' ? 'জনপ্রিয় ভাষাসমূহ' : 'Popular Languages'}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {popularNative.map((item) => {
                        const selected = draft.nativeLanguage === item.code;
                        return (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => {
                              setDraft((prev) => ({ ...prev, nativeLanguage: item.code }));
                              setStepError(null);
                            }}
                            aria-pressed={selected}
                            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                              selected
                                ? 'border-[#00D9FF] bg-[#00D9FF]/12 text-white shadow-[0_0_18px_rgba(0,217,255,0.16)]'
                                : 'border-slate-700/75 bg-[#08102B]/80 text-slate-200 hover:border-cyan-400/40'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-[#0D1A44] text-sm font-bold text-[#7DD3FC]"
                              >
                                {item.scriptBadge}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {item.nativeName}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                  {item.englishName}
                                </p>
                              </div>
                            </div>
                            {selected && (
                              <Check className="h-4 w-4 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {otherNative.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                      {lang === 'bn' ? 'অন্যান্য ভাষা' : 'More Languages'}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {otherNative.map((item) => {
                        const selected = draft.nativeLanguage === item.code;
                        return (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => {
                              setDraft((prev) => ({ ...prev, nativeLanguage: item.code }));
                              setStepError(null);
                            }}
                            aria-pressed={selected}
                            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                              selected
                                ? 'border-[#00D9FF] bg-[#00D9FF]/12 text-white shadow-[0_0_18px_rgba(0,217,255,0.16)]'
                                : 'border-slate-700/75 bg-[#08102B]/80 text-slate-200 hover:border-cyan-400/40'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                aria-hidden="true"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-[#141744] text-sm font-bold text-[#C4B5FD]"
                              >
                                {item.scriptBadge}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {item.nativeName}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                  {item.englishName}
                                </p>
                              </div>
                            </div>
                            {selected && (
                              <Check className="h-4 w-4 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredNativeLanguages.length === 0 && (
                  <p className="rounded-xl border border-slate-800 bg-[#08102B] p-4 text-center text-sm text-slate-400">
                    {lang === 'bn'
                      ? `"${nativeSearch}" এর সাথে কোনো ভাষা মেলেনি।`
                      : `No languages matched "${nativeSearch}".`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 04 — TARGET LANGUAGE */}
          {step === 4 && (
            <div>
              <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                {lang === 'bn' ? 'আপনি কোন ভাষা শিখতে চান?' : 'Which language do you want to master?'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {lang === 'bn'
                  ? 'ইংরেজি (English) এখন সম্পূর্ণভাবে চালু রয়েছে। অন্যান্য ভাষাগুলো আমাদের রোডম্যাপে নির্মাণাধীন।'
                  : 'English is fully active today with interactive lessons, diagnostic evaluation, and speaking coaching. Additional languages are transparently labeled as upcoming roadmap tracks.'}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {TARGET_LANGUAGE_OPTIONS.map((item) => {
                  const selected = draft.targetLanguage === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setStepError(null);
                        if (item.supportedNow) {
                          setDraft((prev) => ({ ...prev, targetLanguage: item.code }));
                          setRoadmapNotice(null);
                        } else {
                          setRoadmapNotice(
                            lang === 'bn'
                              ? `${item.englishName} (${item.nativeName}) কারিকুলাম এখনো নির্মাণাধীন। আমরা অসম্পূর্ণ কোর্সের ভুয়া মূল্যায়ন দেখাই না—এই মুহূর্তে English দিয়ে আপনার যাত্রা শুরু করুন।`
                              : `${item.englishName} (${item.nativeName}) curriculum is still in development. We never fake unsupported assessments—select English to begin today.`
                          );
                        }
                      }}
                      aria-pressed={selected}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                        selected
                          ? 'border-[#00D9FF] bg-[#00D9FF]/12 shadow-[0_0_22px_rgba(0,217,255,0.18)]'
                          : item.supportedNow
                            ? 'border-slate-700/80 bg-[#08102B]/80 hover:border-cyan-400/40'
                            : 'border-slate-800/80 bg-[#070E26]/60 opacity-75 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          aria-hidden="true"
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-extrabold ${
                            item.supportedNow
                              ? 'border-cyan-400/40 bg-gradient-to-br from-[#00D9FF]/20 to-[#7C3AED]/30 text-white'
                              : 'border-slate-700 bg-slate-900/80 text-slate-400'
                          }`}
                        >
                          {item.symbol}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-white">{item.englishName}</p>
                            <span
                              className={`font-mono text-[11px] font-semibold ${
                                item.supportedNow ? 'text-[#16E58B]' : 'text-slate-400'
                              }`}
                            >
                              {item.supportedNow
                                ? lang === 'bn'
                                  ? '· এখনই চালু'
                                  : '· Available Now'
                                : lang === 'bn'
                                  ? '· আসছে শীঘ্রই'
                                  : '· Coming Soon'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {lang === 'bn' ? item.noteBn : item.noteEn}
                          </p>
                        </div>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              {roadmapNotice && (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400/35 bg-amber-950/25 p-3.5 text-xs leading-relaxed text-amber-100"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  <p>{roadmapNotice}</p>
                </div>
              )}
            </div>
          )}

          {/* SCREEN 05 — LEARNING GOALS (ALL 11 MULTI-SELECT) */}
          {step === 5 && (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                  {lang === 'bn' ? 'আপনার শেখার লক্ষ্যগুলো বেছে নিন' : 'What are your learning goals?'}
                </h1>
                <span className="font-mono text-xs font-semibold text-[#7DD3FC] tabular-nums">
                  {lang === 'bn'
                    ? `${draft.learningGoals.length}টি নির্বাচিত`
                    : `${draft.learningGoals.length} selected`}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {lang === 'bn'
                  ? 'একাধিক লক্ষ্য বেছে নিতে পারেন (কমপক্ষে ১টি)। আপনার প্রথম লেসন ও স্পিকিং প্র্যাকটিস এই লক্ষ্য অনুযায়ী সাজানো হবে।'
                  : 'Select one or more outcomes that matter most. Your personalized path and first lesson prioritize these.'}
              </p>

              <div className="mt-5 grid max-h-[340px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {LEARNING_GOAL_OPTIONS.map((goal) => {
                  const selected = draft.learningGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => handleToggleGoal(goal.id)}
                      aria-pressed={selected}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        selected
                          ? 'border-[#00D9FF] bg-[#00D9FF]/12 shadow-[0_0_18px_rgba(0,217,255,0.16)]'
                          : 'border-slate-700/75 bg-[#08102B]/80 hover:border-cyan-400/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {lang === 'bn' ? goal.titleBn : goal.titleEn}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {lang === 'bn' ? goal.descBn : goal.descEn}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          selected
                            ? 'border-[#00D9FF] bg-[#00D9FF] text-[#05091F]'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCREEN 06 — DAILY LEARNING COMMITMENT */}
          {step === 6 && (
            <div>
              <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                {lang === 'bn'
                  ? 'প্রতিদিন কতটুকু সময় অনুশীলন করতে চান?'
                  : 'Set your daily learning commitment'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {lang === 'bn'
                  ? 'ধারাবাহিকতা দীর্ঘ পড়ার চেয়ে বেশি কার্যকর। প্রতিদিন বাস্তবসম্মত সময় বেছে নিন।'
                  : 'Daily consistency builds spoken recall far better than occasional long sessions. Pick a realistic target.'}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DAILY_COMMITMENT_OPTIONS.map((option) => {
                  const selected = draft.dailyTimeGoalMinutes === option.minutes;
                  return (
                    <button
                      key={option.minutes}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          dailyTimeGoalMinutes: option.minutes as DailyTimeGoalMinutes,
                        }))
                      }
                      aria-pressed={selected}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                        selected
                          ? 'border-[#00D9FF] bg-[#00D9FF]/12 shadow-[0_0_20px_rgba(0,217,255,0.18)]'
                          : 'border-slate-700/75 bg-[#08102B]/80 hover:border-cyan-400/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                          <span className="font-mono text-base font-bold text-white tabular-nums">
                            {lang === 'bn' ? option.labelBn : option.labelEn}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              option.minutes === 15 ? 'text-[#16E58B]' : 'text-slate-400'
                            }`}
                          >
                            · {lang === 'bn' ? option.paceBn : option.paceEn}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                          {lang === 'bn' ? option.descBn : option.descEn}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCREEN 07 — LEARNING PREFERENCES (OPTIONAL) */}
          {step === 7 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                  {lang === 'bn' ? 'শেখার পছন্দসমূহ (ঐচ্ছিক)' : 'Personalize your learning preferences'}
                </h1>
                <p className="mt-1.5 text-sm text-slate-300">
                  {lang === 'bn'
                    ? 'ব্যাখ্যার ভাষা, গভীরতা ও অনুশীলনের ধরন ঠিক করুন—চাইলে এই ধাপ এড়িয়েও যেতে পারেন।'
                    : 'Choose how explanations are delivered and your preferred practice format, or skip to use balanced defaults.'}
                </p>
              </div>

              {/* Explanation Language */}
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  {lang === 'bn' ? 'ব্যাখ্যার ভাষা' : 'Explanation Language'}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      { id: 'both', en: 'English + বাংলা', bn: 'বাংলা + English' },
                      { id: 'bn', en: 'Bangla first', bn: 'শুধু বাংলা ব্যাখ্যা' },
                      { id: 'en', en: 'English only', bn: 'শুধু ইংরেজি ব্যাখ্যা' },
                    ] as { id: ExplanationLanguage; en: string; bn: string }[]
                  ).map((opt) => {
                    const active = draft.explanationLanguage === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, explanationLanguage: opt.id }))
                        }
                        aria-pressed={active}
                        className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? 'border-[#00D9FF] bg-[#00D9FF]/12 text-white'
                            : 'border-slate-700/75 bg-[#08102B]/80 text-slate-300 hover:border-cyan-400/40'
                        }`}
                      >
                        {lang === 'bn' ? opt.bn : opt.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanation Depth */}
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  {lang === 'bn' ? 'ব্যাখ্যার গভীরতা' : 'Explanation Depth'}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {EXPLANATION_DEPTH_OPTIONS.map((opt) => {
                    const active = draft.explanationDepth === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, explanationDepth: opt.id }))}
                        aria-pressed={active}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          active
                            ? 'border-[#00D9FF] bg-[#00D9FF]/12'
                            : 'border-slate-700/75 bg-[#08102B]/80 hover:border-cyan-400/40'
                        }`}
                      >
                        <p className="text-xs font-semibold text-white">
                          {lang === 'bn' ? opt.titleBn : opt.titleEn}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          {lang === 'bn' ? opt.descBn : opt.descEn}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Learning Format */}
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  {lang === 'bn' ? 'পছন্দের শেখার ধরন' : 'Preferred Learning Format'}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {LEARNING_FORMAT_OPTIONS.map((opt) => {
                    const active = draft.learningFormat === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, learningFormat: opt.id }))}
                        aria-pressed={active}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          active
                            ? 'border-[#00D9FF] bg-[#00D9FF]/12'
                            : 'border-slate-700/75 bg-[#08102B]/80 hover:border-cyan-400/40'
                        }`}
                      >
                        <p className="text-xs font-semibold text-white">
                          {lang === 'bn' ? opt.titleBn : opt.titleEn}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                          {lang === 'bn' ? opt.descBn : opt.descEn}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daily Study Reminder Preference */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/75 bg-[#08102B]/80 p-3.5">
                <div className="flex items-start gap-2.5">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#7DD3FC]" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {lang === 'bn' ? 'দৈনিক অনুশীলন সময়সূচি (রিমাইন্ডার)' : 'Daily Practice Schedule Reminder'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {lang === 'bn'
                        ? 'আপনার প্রোফাইলে পছন্দের অনুশীলনের সময় সংরক্ষণ করে রাখে।'
                        : 'Saves your preferred study time in your profile preferences.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {draft.dailyReminderEnabled && (
                    <input
                      type="time"
                      aria-label={lang === 'bn' ? 'রিমাইন্ডারের সময়' : 'Daily reminder time'}
                      value={draft.dailyReminderTime}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, dailyReminderTime: e.target.value }))
                      }
                      className="lv-portal-input rounded-lg px-2.5 py-1 font-mono text-xs text-white"
                    />
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.dailyReminderEnabled}
                    aria-label={lang === 'bn' ? 'দৈনিক রিমাইন্ডার চালু/বন্ধ' : 'Toggle daily reminder'}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        dailyReminderEnabled: !prev.dailyReminderEnabled,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      draft.dailyReminderEnabled ? 'bg-[#00D9FF]' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-[#05091F] transition-transform ${
                        draft.dailyReminderEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 08 — CURRENT PROFICIENCY ESTIMATE (ALL 7 OPTIONS) */}
          {step === 8 && (
            <div>
              <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                {lang === 'bn'
                  ? 'ইংরেজিতে আপনার বর্তমান অবস্থান কেমন মনে করেন?'
                  : 'How would you estimate your current English level?'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {lang === 'bn'
                  ? 'এটি শুধুমাত্র আপনার নিজস্ব অনুমান (self-estimated) — কোনো যাচাইকৃত বা আনুষ্ঠানিক মূল্যায়ন নয়। পরবর্তী ডায়াগনস্টিক আপনার প্রকৃত অবস্থান নির্ধারণে সাহায্য করবে।'
                  : 'This is a self-estimate only—not a verified proficiency level. The initial assessment right after onboarding will calibrate your actual starting baseline.'}
              </p>

              <div className="mt-4 max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
                {SELF_PROFICIENCY_OPTIONS.map((opt) => {
                  const selected = draft.selfProficiencyChoice === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          selfProficiencyChoice: opt.id as SelfProficiencyChoice,
                        }))
                      }
                      aria-pressed={selected}
                      className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        selected
                          ? 'border-[#00D9FF] bg-[#00D9FF]/12 shadow-[0_0_18px_rgba(0,217,255,0.16)]'
                          : 'border-slate-700/75 bg-[#08102B]/80 hover:border-cyan-400/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {lang === 'bn' ? opt.titleBn : opt.titleEn}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                          {lang === 'bn' ? opt.descBn : opt.descEn}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SCREEN 09 — MICROPHONE & AUDIO PERMISSION */}
          {step === 9 && (
            <div>
              <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                {lang === 'bn'
                  ? 'স্পিকিং প্র্যাকটিসের জন্য মাইক্রোফোন প্রস্তুত করুন'
                  : 'Enable Microphone & Audio for Speaking'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {lang === 'bn'
                  ? 'স্পিকিং মূল্যায়ন ও AI স্পিকিং স্টুডিওতে কথা বলার অনুশীলনের জন্য মাইক্রোফোন প্রয়োজন। আপনি চাইলে এখন এড়িয়ে যেতে পারেন এবং পরে যেকোনো সময় চালু করতে পারেন।'
                  : 'Microphone access lets you record spoken responses in the assessment and practice live conversations in AI Speaking Studio. It is completely optional right now.'}
              </p>

              {/* Status Banner */}
              <div className="mt-5 rounded-xl border border-cyan-400/20 bg-[#08102B]/85 p-5">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                      draft.microphonePermissionStatus === 'granted'
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                        : draft.microphonePermissionStatus === 'denied' ||
                            draft.microphonePermissionStatus === 'unsupported'
                          ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                          : 'border-cyan-400/35 bg-cyan-500/15 text-[#00D9FF]'
                    }`}
                  >
                    {draft.microphonePermissionStatus === 'denied' ||
                    draft.microphonePermissionStatus === 'unsupported' ? (
                      <MicOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Mic className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">
                      {draft.microphonePermissionStatus === 'granted'
                        ? lang === 'bn'
                          ? 'মাইক্রোফোন প্রস্তুত'
                          : 'Microphone Ready'
                        : draft.microphonePermissionStatus === 'denied'
                          ? lang === 'bn'
                            ? 'মাইক্রোফোন অনুমতি বন্ধ রয়েছে'
                            : 'Microphone Access Denied'
                          : draft.microphonePermissionStatus === 'unsupported'
                            ? lang === 'bn'
                              ? 'মাইক্রোফোন পাওয়া যায়নি / অসমর্থিত'
                              : 'Microphone Unavailable on This Device'
                            : lang === 'bn'
                              ? 'আপনার অনুমতি ছাড়া মাইক্রোফোন চালু হবে না'
                              : 'Only activated when you click Enable'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {micDetailMessage ||
                        (lang === 'bn'
                          ? 'নিচের বাটনে ক্লিক করলে ব্রাউজার একবারের জন্য মাইক্রোফোন অনুমতি চাইবে এবং সাথে সাথে পরীক্ষা করে বন্ধ করে দেবে।'
                          : 'Clicking Enable Microphone requests browser permission once to verify your input device, then immediately releases the mic.')}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleEnableMicrophone()}
                        disabled={micRequesting || draft.microphonePermissionStatus === 'unsupported'}
                        className="lv-portal-btn-violet inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white cursor-pointer disabled:opacity-50 sm:text-sm"
                      >
                        <Mic className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {micRequesting
                            ? lang === 'bn'
                              ? 'অনুমতি যাচাই হচ্ছে...'
                              : 'Requesting permission...'
                            : draft.microphonePermissionStatus === 'granted'
                              ? lang === 'bn'
                                ? 'আবার পরীক্ষা করুন'
                                : 'Re-verify Microphone'
                              : lang === 'bn'
                                ? 'মাইক্রোফোন চালু করুন'
                                : 'Enable Microphone'}
                        </span>
                      </button>

                      {draft.microphonePermissionStatus !== 'granted' && (
                        <button
                          type="button"
                          onClick={handleSkipMicrophone}
                          className="rounded-xl border border-slate-700 bg-[#0A1334] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-cyan-400/40 hover:text-white transition-colors cursor-pointer sm:text-sm"
                        >
                          {lang === 'bn' ? 'মাইক্রোফোন ছাড়াই এগিয়ে যান' : 'Continue without microphone'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-800 bg-[#070E26]/75 p-4 text-xs leading-relaxed text-slate-300">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16E58B]" aria-hidden="true" />
                <p>
                  {lang === 'bn'
                    ? 'প্রাইভেসি নিশ্চয়তা: LINGUAVERSE AI কখনোই ব্যাকগ্রাউন্ডে আপনার কণ্ঠ রেকর্ড করে না। শুধুমাত্র আপনি Record বাটনে চাপ দিলে অডিও ধারণ হয়, এবং Settings থেকে যেকোনো সময় সব রেকর্ডিং মুছে ফেলতে পারবেন।'
                    : 'Privacy guarantee: LINGUAVERSE AI never listens in the background. Audio is captured strictly when you press Record, and you can delete stored recordings anytime in Settings.'}
                </p>
              </div>
            </div>
          )}

          {/* SCREEN 10 — ONBOARDING SUMMARY */}
          {step === 10 && (
            <div>
              <h1 className="font-portal text-2xl font-bold tracking-tight text-white">
                {lang === 'bn' ? 'আপনার ব্যক্তিগত প্রোফাইল প্রস্তুত' : 'Review Your Learning Profile'}
              </h1>
              <p className="mt-1.5 text-sm text-slate-300">
                {lang === 'bn'
                  ? 'নিচে আপনার সব পছন্দ একনজরে দেখুন। কোনো কিছু বদলাতে চাইলে Edit-এ ক্লিক করুন, অথবা সরাসরি প্রাথমিক মূল্যায়ন শুরু করুন।'
                  : 'Verify your setup below. Click Edit on any item to update it, or save and start your 5-skill initial assessment.'}
              </p>

              <dl className="mt-5 divide-y divide-cyan-400/12 rounded-xl border border-cyan-400/18 bg-[#08102B]/85 px-4 text-sm">
                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'ইন্টারফেস ভাষা' : 'Interface Language'}
                    </dt>
                    <dd className="mt-0.5 font-semibold text-white">
                      {draft.preferredUiLanguage === 'bn' ? 'বাংলা (Bengali)' : 'English (EN)'}
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToEditStep(2)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7DD3FC] hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'বদলান' : 'Edit'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'ভাষার জোড়া (মাতৃভাষা → লক্ষ্য ভাষা)' : 'Language Pair'}
                    </dt>
                    <dd className="mt-0.5 font-semibold text-white">
                      {selectedNativeOption.nativeName} ({selectedNativeOption.englishName}) →{' '}
                      {selectedTargetOption.englishName}
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToEditStep(3)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7DD3FC] hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'বদলান' : 'Edit'}</span>
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'শেখার লক্ষ্যসমূহ' : 'Selected Learning Goals'}
                    </dt>
                    <dd className="mt-0.5 font-medium text-white">
                      {draft.learningGoals
                        .map((id) => {
                          const match = LEARNING_GOAL_OPTIONS.find((g) => g.id === id);
                          return match ? (lang === 'bn' ? match.titleBn : match.titleEn) : id;
                        })
                        .join(' · ')}
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToEditStep(5)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#7DD3FC] hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'বদলান' : 'Edit'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'দৈনিক অনুশীলন লক্ষ্য' : 'Daily Commitment'}
                    </dt>
                    <dd className="mt-0.5 font-mono font-semibold text-white tabular-nums">
                      {lang === 'bn'
                        ? `${selectedCommitmentOption.labelBn} · ${selectedCommitmentOption.paceBn}`
                        : `${selectedCommitmentOption.labelEn} / day · ${selectedCommitmentOption.paceEn}`}
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToEditStep(6)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7DD3FC] hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'বদলান' : 'Edit'}</span>
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'ব্যাখ্যা ও অনুশীলনের ধরন' : 'Study Preferences'}
                    </dt>
                    <dd className="mt-0.5 text-xs font-medium leading-relaxed text-slate-200">
                      {lang === 'bn' ? selectedDepthOption.titleBn : selectedDepthOption.titleEn} ·{' '}
                      {lang === 'bn' ? selectedFormatOption.titleBn : selectedFormatOption.titleEn}
                      {draft.dailyReminderEnabled ? ` · ${draft.dailyReminderTime}` : ''}
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToEditStep(7)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#7DD3FC] hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'বদলান' : 'Edit'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn'
                        ? 'বর্তমান দক্ষতা (নিজস্ব অনুমান — যাচাইকৃত নয়)'
                        : 'Current Level (Self-estimated — not verified)'}
                    </dt>
                    <dd className="mt-0.5 font-semibold text-white">
                      {lang === 'bn'
                        ? selectedProficiencyOption.titleBn
                        : selectedProficiencyOption.titleEn}
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToEditStep(8)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7DD3FC] hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'বদলান' : 'Edit'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <dt className="text-xs text-slate-400">
                      {lang === 'bn' ? 'মাইক্রোফোন অবস্থা' : 'Microphone Status'}
                    </dt>
                    <dd className="mt-0.5 text-xs font-semibold text-slate-200">
                      {draft.microphonePermissionStatus === 'granted'
                        ? lang === 'bn'
                          ? 'অনুমোদিত (স্পিকিংয়ের জন্য প্রস্তুত)'
                          : 'Enabled (Ready for speaking)'
                        : draft.microphonePermissionStatus === 'denied'
                          ? lang === 'bn'
                            ? 'অনুমতি দেওয়া হয়নি (পরে চালু করা যাবে)'
                            : 'Permission denied (Can enable later)'
                          : draft.microphonePermissionStatus === 'unsupported'
                            ? lang === 'bn'
                              ? 'ডিভাইসে উপলব্ধ নয়'
                              : 'Unavailable on this device'
                            : lang === 'bn'
                              ? 'এখনকার মতো এড়িয়ে যাওয়া হয়েছে'
                              : 'Skipped for now'}
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToEditStep(9)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7DD3FC] hover:text-white cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'বদলান' : 'Edit'}</span>
                  </button>
                </div>
              </dl>

              {saveError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                  <p>{saveError}</p>
                </div>
              )}
            </div>
          )}

          {/* Inline Step Validation Error */}
          {stepError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 text-xs text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <p>{stepError}</p>
            </div>
          )}
        </motion.div>
    </OnboardingShell>
  );
}
