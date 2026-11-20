import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import type {
  DailyTimeGoalMinutes,
  ExplanationLanguage,
  PrimaryGoal,
  SelfEstimatedLevel,
  UILanguage,
} from '../types/domain';

const SELF_LEVELS: SelfEstimatedLevel[] = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1'];
const PRIMARY_GOALS: PrimaryGoal[] = [
  'job_interview',
  'daily_speaking',
  'academic_ielts',
  'workplace',
];
const DAILY_TIMES: DailyTimeGoalMinutes[] = [10, 15, 25, 45];

export function OnboardingPage() {
  const { lang, setLang, t } = useLanguage();
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [preferredUiLanguage, setPreferredUiLanguage] = useState<UILanguage>(
    profile?.preferredUiLanguage ?? lang
  );
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage>(
    profile?.explanationLanguage ?? 'bn'
  );
  const [selfEstimatedLevel, setSelfEstimatedLevel] = useState<SelfEstimatedLevel>(
    profile?.selfEstimatedLevel ?? 'A2'
  );
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(
    profile?.primaryGoal ?? 'daily_speaking'
  );
  const [dailyTimeGoalMinutes, setDailyTimeGoalMinutes] = useState<DailyTimeGoalMinutes>(
    profile?.dailyTimeGoalMinutes ?? 15
  );
  const [isSaving, setIsSaving] = useState(false);

  const totalSteps = 5;

  const handleSelectUiLang = (next: UILanguage) => {
    setPreferredUiLanguage(next);
    setLang(next);
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        preferredUiLanguage,
        explanationLanguage,
        selfEstimatedLevel,
        primaryGoal,
        dailyTimeGoalMinutes,
        onboardingCompleted: true,
      });
      navigate('/diagnostic', { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-[#0A0F1C]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6] text-xs font-bold text-white"
            >
              LV
            </span>
            <span>{t.brand}</span>
          </div>
          <p className="font-mono text-xs text-slate-400 tabular-nums">
            {t.onboarding.stepOf} {step} {t.onboarding.of} {totalSteps}
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        {/* Clean Linear Progress Bar */}
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-[#3B82F6] transition-all duration-200"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
          {/* Step 1: Preferred UI Language */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {t.onboarding.steps.uiLang.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">{t.onboarding.steps.uiLang.desc}</p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      id: 'bn' as UILanguage,
                      label: t.onboarding.steps.uiLang.bnLabel,
                      desc: t.onboarding.steps.uiLang.bnDesc,
                    },
                    {
                      id: 'en' as UILanguage,
                      label: t.onboarding.steps.uiLang.enLabel,
                      desc: t.onboarding.steps.uiLang.enDesc,
                    },
                  ] as const
                ).map((item) => {
                  const selected = preferredUiLanguage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectUiLang(item.id)}
                      aria-pressed={selected}
                      className={`flex flex-col justify-between rounded-xl border p-5 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-white'
                          : 'border-slate-800 bg-[#0A0F1C] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-white">{item.label}</span>
                        {selected && <Check className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Explanation Language */}
          {step === 2 && (
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {t.onboarding.steps.expLang.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">{t.onboarding.steps.expLang.desc}</p>

              <div className="mt-6 space-y-3">
                {(
                  [
                    {
                      id: 'bn' as ExplanationLanguage,
                      label: t.onboarding.steps.expLang.bnLabel,
                      desc: t.onboarding.steps.expLang.bnDesc,
                    },
                    {
                      id: 'both' as ExplanationLanguage,
                      label: t.onboarding.steps.expLang.bothLabel,
                      desc: t.onboarding.steps.expLang.bothDesc,
                    },
                    {
                      id: 'en' as ExplanationLanguage,
                      label: t.onboarding.steps.expLang.enLabel,
                      desc: t.onboarding.steps.expLang.enDesc,
                    },
                  ] as const
                ).map((item) => {
                  const selected = explanationLanguage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setExplanationLanguage(item.id)}
                      aria-pressed={selected}
                      className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                          : 'border-slate-800 bg-[#0A0F1C] hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                      </div>
                      {selected && (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Self-Estimated Level */}
          {step === 3 && (
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {t.onboarding.steps.level.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">{t.onboarding.steps.level.desc}</p>

              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SELF_LEVELS.map((lvl) => {
                  const selected = selfEstimatedLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelfEstimatedLevel(lvl)}
                      aria-pressed={selected}
                      className={`flex flex-col rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                          : 'border-slate-800 bg-[#0A0F1C] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-white">{lvl}</span>
                        {selected && <Check className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {t.onboarding.steps.level.options[lvl]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Primary Goal */}
          {step === 4 && (
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {t.onboarding.steps.goal.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">{t.onboarding.steps.goal.desc}</p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRIMARY_GOALS.map((goalKey) => {
                  const selected = primaryGoal === goalKey;
                  const opt = t.onboarding.steps.goal.options[goalKey];
                  return (
                    <button
                      key={goalKey}
                      type="button"
                      onClick={() => setPrimaryGoal(goalKey)}
                      aria-pressed={selected}
                      className={`flex flex-col rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                          : 'border-slate-800 bg-[#0A0F1C] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{opt.label}</span>
                        {selected && (
                          <Check className="h-4 w-4 shrink-0 text-[#3B82F6]" aria-hidden="true" />
                        )}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Daily Time Goal */}
          {step === 5 && (
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">
                {t.onboarding.steps.dailyTime.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">{t.onboarding.steps.dailyTime.desc}</p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DAILY_TIMES.map((mins) => {
                  const selected = dailyTimeGoalMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyTimeGoalMinutes(mins)}
                      aria-pressed={selected}
                      className={`flex flex-col rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                          : 'border-slate-800 bg-[#0A0F1C] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-bold text-white tabular-nums">
                          {mins} {t.onboarding.steps.dailyTime.minutesLabel}
                        </span>
                        {selected && <Check className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                        {t.onboarding.steps.dailyTime.options[mins]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wizard Footer Actions */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{t.onboarding.backBtn}</span>
            </button>

            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
              >
                <span>{t.onboarding.nextBtn}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <span>{t.onboarding.finishBtn}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
