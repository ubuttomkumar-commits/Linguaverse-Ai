import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, HelpCircle, MessageCircleQuestion, RotateCcw, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LANDING_COPY } from '../../domain/landingContent';
import {
  recommendStartingPath,
  type QuizComfortLevel,
  type QuizPrimaryGoal,
} from '../../domain/landingQuiz';

type DrawerTab = 'answers' | 'quiz';

export function FloatingGuideWidget() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const copy = LANDING_COPY[lang].guideWidget;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerTab>('answers');
  const [comfort, setComfort] = useState<QuizComfortLevel | null>(null);
  const [goal, setGoal] = useState<QuizPrimaryGoal | null>(null);

  const recommendation =
    comfort && goal ? recommendStartingPath(comfort, goal) : null;

  const resolvedCtaPath = user
    ? !profile?.onboardingCompleted
      ? '/onboarding'
      : '/app'
    : recommendation?.ctaPath ?? '/register';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {/* Glassmorphic Support & Level-Finder Drawer */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label={copy.title}
          className="mb-3 w-[calc(100vw-2rem)] max-w-[390px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0E1526]/95 shadow-[0_24px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] bg-[#050914]/70 px-5 py-4">
            <div>
              <h2 className="font-display text-sm font-bold text-white">{copy.title}</h2>
              <p className="mt-0.5 text-xs text-slate-400">{copy.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close guide and support drawer"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* 2-Tab Bar */}
          <div
            role="tablist"
            aria-label="Guide options"
            className="grid grid-cols-2 gap-1 border-b border-white/[0.08] bg-[#050914]/50 p-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'answers'}
              onClick={() => setActiveTab('answers')}
              className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'answers'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <MessageCircleQuestion className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{copy.tabAnswers}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'quiz'}
              onClick={() => setActiveTab('quiz')}
              className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{copy.tabQuiz}</span>
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[62vh] overflow-y-auto p-5">
            {activeTab === 'answers' ? (
              <div className="space-y-4">
                {copy.quickAnswers.map((qa) => (
                  <div
                    key={qa.q}
                    className="rounded-xl border border-white/[0.08] bg-[#050914]/80 p-3.5"
                  >
                    <p className="text-xs font-semibold text-white">{qa.q}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{qa.a}</p>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#7C3AED]/50 bg-[#7C3AED]/15 px-4 py-2.5 text-xs font-semibold text-violet-200 hover:bg-[#7C3AED]/25 transition-colors cursor-pointer"
                >
                  <span>{copy.tabQuiz}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : !recommendation ? (
              <div className="space-y-5">
                <p className="text-xs text-slate-300">{copy.quizIntro}</p>

                {/* Question 1 */}
                <div>
                  <p className="text-xs font-semibold text-white">{copy.q1Label}</p>
                  <div className="mt-2 space-y-2">
                    {copy.q1Options.map((opt) => {
                      const selected = comfort === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setComfort(opt.value)}
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-xs leading-snug transition-colors cursor-pointer ${
                            selected
                              ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-white font-semibold'
                              : 'border-white/[0.08] bg-[#050914] text-slate-300 hover:border-white/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question 2 */}
                <div>
                  <p className="text-xs font-semibold text-white">{copy.q2Label}</p>
                  <div className="mt-2 space-y-2">
                    {copy.q2Options.map((opt) => {
                      const selected = goal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setGoal(opt.value)}
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-xs leading-snug transition-colors cursor-pointer ${
                            selected
                              ? 'border-[#7C3AED] bg-[#7C3AED]/20 text-white font-semibold'
                              : 'border-white/[0.08] bg-[#050914] text-slate-300 hover:border-white/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div data-testid="quiz-recommendation" className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#F59E0B]">{copy.resultTitle}</p>
                  <h3 className="font-display mt-1 text-base font-bold text-white">
                    {lang === 'bn' ? recommendation.trackTitleBn : recommendation.trackTitleEn}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-[#3B82F6]">
                    {recommendation.cefrBand}
                  </p>
                </div>

                <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-[#050914] p-3.5 text-xs">
                  <div>
                    <p className="font-medium text-slate-400">{copy.pressureLabel}</p>
                    <p className="mt-0.5 font-semibold text-slate-100">
                      {lang === 'bn'
                        ? recommendation.startingPressureBn
                        : recommendation.startingPressureEn}
                    </p>
                  </div>
                  <div className="border-t border-white/[0.08] pt-2.5">
                    <p className="font-medium text-slate-400">{copy.focusLabel}</p>
                    <p className="mt-0.5 text-slate-200">
                      {lang === 'bn' ? recommendation.firstFocusBn : recommendation.firstFocusEn}
                    </p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-300">
                  {lang === 'bn' ? recommendation.summaryBn : recommendation.summaryEn}
                </p>

                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    to={resolvedCtaPath}
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-[42px] w-full items-center justify-center rounded-xl bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors"
                  >
                    {copy.startPathCta}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setComfort(null);
                      setGoal(null);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    <span>{copy.retakeBtn}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Compact Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={copy.triggerLabel}
        className="inline-flex h-12 items-center gap-2 rounded-full border border-[#3B82F6]/45 bg-[#0E1526]/95 px-4 text-xs font-semibold text-white shadow-[0_12px_36px_rgba(5,9,20,0.75)] backdrop-blur-xl hover:border-[#3B82F6] hover:bg-[#131D35] transition-colors whitespace-nowrap cursor-pointer"
      >
        <HelpCircle className="h-4 w-4 text-[#3B82F6] shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">{copy.triggerLabel}</span>
        <span className="sm:hidden">{lang === 'bn' ? 'গাইড ও কুইজ' : 'Guide & Quiz'}</span>
      </button>
    </div>
  );
}
