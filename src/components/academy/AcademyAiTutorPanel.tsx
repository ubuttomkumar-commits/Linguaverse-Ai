import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  AcademyAssistClientError,
  fetchAcademyAssistHealth,
  requestAcademyAssist,
  type AcademyAssistPayload,
} from '../../services/academyAssistApi';
import type {
  CurriculumLesson,
  ExplanationLanguage,
  LessonStageKey,
} from '../../types/domain';

interface AcademyAiTutorPanelProps {
  lesson: CurriculumLesson;
  activeStage: LessonStageKey;
  explanationPref: ExplanationLanguage;
}

const QUICK_PROMPTS = [
  {
    id: 'simple',
    en: 'Explain this grammar rule simply',
    bn: 'এই নিয়মটি আরও সহজভাবে বুঝিয়ে দিন',
    prompt: 'Explain this lesson grammar rule in very simple terms with a quick mental formula.',
  },
  {
    id: 'bangla',
    en: 'Why do Bangla speakers stumble here?',
    bn: 'বাংলাভাষীদের এখানে কেন ভুল হয়?',
    prompt: 'Explain clearly in Bangla and English why Bangla speakers frequently make this mistake.',
  },
  {
    id: 'examples',
    en: 'Give 2 more real-life examples',
    bn: 'আরও ২টি বাস্তব উদাহরণ দিন',
    prompt: 'Give 2 fresh, practical real-life examples (office or daily life) illustrating this rule.',
  },
  {
    id: 'contrast',
    en: 'Show common trap vs. natural phrasing',
    bn: 'সাধারণ ভুল বনাম স্বাভাবিক ইংরেজি',
    prompt: 'Show one common literal translation trap and contrast it with natural English phrasing.',
  },
];

export function AcademyAiTutorPanel({
  lesson,
  activeStage,
  explanationPref,
}: AcademyAiTutorPanelProps) {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [healthChecked, setHealthChecked] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AcademyAssistPayload | null>(null);
  const [lastAsked, setLastAsked] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAcademyAssistHealth().then((status) => {
      if (!active) return;
      setIsConfigured(status.configured);
      setHealthChecked(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Reset contextual output cleanly when switching lessons
  useEffect(() => {
    setResponse(null);
    setError(null);
    setQuestion('');
    setLastAsked(null);
  }, [lesson.id]);

  const askTutor = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || loading) return;
    setLoading(true);
    setError(null);
    setLastAsked(clean);

    try {
      const result = await requestAcademyAssist(
        {
          lessonId: lesson.id,
          lessonTitleEn: lesson.titleEn,
          lessonTitleBn: lesson.titleBn,
          cefrBand: lesson.cefrBand,
          conceptRuleEn: lesson.conceptRuleEn,
          banglaInterferenceEn: lesson.banglaInterferenceEn,
          activeStage,
          explanationLanguage: explanationPref,
          question: clean,
        },
        {
          logTelemetry: profile?.privacyConsent?.logAiEvaluations !== false,
          userId: user?.id,
        }
      );
      setResponse(result.assist);
      setQuestion('');
    } catch (err) {
      if (err instanceof AcademyAssistClientError && err.code === 'API_KEY_MISSING') {
        setIsConfigured(false);
      }
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach AI Tutor right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label={lang === 'bn' ? 'প্রসঙ্গভিত্তিক AI টিউটর' : 'Contextual AI Lesson Tutor'}
      className="rounded-2xl border border-slate-800/90 bg-[#080F2E]/85 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#0D1742]/70 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/15 text-[#A78BFA]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {lang === 'bn'
                ? 'প্রসঙ্গভিত্তিক AI লেসন কোচ'
                : 'Contextual AI Lesson Coach'}
            </p>
            <p className="truncate text-xs text-slate-400">
              {activeStage === 'assessment'
                ? lang === 'bn'
                  ? 'মূল্যায়ন মোড: কেবল নিয়ম বোঝার সাহায্য পাওয়া যাবে, উত্তর নয়'
                  : 'Assessment mode: conceptual guidance only — answers are never revealed'
                : lang === 'bn'
                  ? 'এই লেসনের নিয়ম, বাংলা ব্যাখ্যা বা অতিরিক্ত উদাহরণ জানতে প্রশ্ন করুন'
                  : 'Ask for simpler grammar explanations, Bangla breakdowns, or extra examples'}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-800/80 p-5 space-y-4">
          {healthChecked && !isConfigured ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <div>
                <p className="font-semibold text-amber-100">
                  {lang === 'bn'
                    ? 'লাইভ AI কোচ বর্তমানে সংযুক্ত নয়'
                    : 'Live AI Lesson Coach is currently unavailable'}
                </p>
                <p className="mt-1 text-amber-200/90">
                  {lang === 'bn'
                    ? 'সার্ভারে GEMINI_API_KEY যুক্ত না থাকায় লাইভ AI ব্যাখ্যা বন্ধ আছে। তবে লেসনের সব বাংলা-ইংরেজি ব্যাখ্যা, উদাহরণ ও মূল্যায়ন সম্পূর্ণ কার্যকর আছে।'
                    : 'Server-side Gemini integration is not configured in this environment. All built-in bilingual concept notes, contrast tables, audio examples, and graded drills remain 100% functional.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Prompt Chips */}
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={loading}
                    onClick={() => void askTutor(item.prompt)}
                    className="rounded-lg border border-slate-700/90 bg-[#05091F] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#00D9FF]/60 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? item.bn : item.en}
                  </button>
                ))}
              </div>

              {/* Custom Question Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void askTutor(question);
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <label htmlFor="academy-tutor-input" className="sr-only">
                  {lang === 'bn' ? 'লেসন নিয়ে প্রশ্ন লিখুন' : 'Ask a question about this lesson'}
                </label>
                <input
                  id="academy-tutor-input"
                  type="text"
                  maxLength={500}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                  placeholder={
                    lang === 'bn'
                      ? 'এই লেসনের নিয়ম সম্পর্কে প্রশ্ন লিখুন...'
                      : 'Ask a specific question about this lesson rule...'
                  }
                  className="flex-1 rounded-xl border border-slate-700 bg-[#05091F] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00D9FF] focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-45 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'বিশ্লেষণ হচ্ছে...' : 'Thinking...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{lang === 'bn' ? 'জিজ্ঞাসা করুন' : 'Ask Coach'}</span>
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div
                  role="alert"
                  className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                  {lastAsked && (
                    <button
                      type="button"
                      onClick={() => void askTutor(lastAsked)}
                      className="shrink-0 font-semibold text-white underline cursor-pointer"
                    >
                      {lang === 'bn' ? 'আবার চেষ্টা' : 'Retry'}
                    </button>
                  )}
                </div>
              )}

              {response && (
                <div className="space-y-4 rounded-xl border border-violet-500/35 bg-[#05091F]/90 p-4">
                  <div className="space-y-2 text-sm leading-relaxed">
                    {(explanationPref === 'bn' || explanationPref === 'both') && (
                      <p className="font-bn text-slate-100">{response.answerBn}</p>
                    )}
                    {(explanationPref === 'en' || explanationPref === 'both') && (
                      <p className="text-slate-300">{response.answerEn}</p>
                    )}
                  </div>

                  {response.examples.length > 0 && (
                    <div className="space-y-2 border-t border-slate-800 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#00D9FF]">
                        {lang === 'bn' ? 'অতিরিক্ত উদাহরণ' : 'Additional Examples'}
                      </p>
                      <ul className="space-y-2">
                        {response.examples.map((ex, i) => (
                          <li
                            key={`${ex.english}_${i}`}
                            className="rounded-lg border border-slate-800/90 bg-[#080F2E]/70 px-3.5 py-2.5"
                          >
                            <p className="text-sm font-medium text-white">{ex.english}</p>
                            <p className="font-bn mt-0.5 text-xs text-slate-400">{ex.bangla}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-3 text-xs">
                    <p className="font-semibold text-violet-300">
                      {lang === 'bn' ? 'মূল সারসংক্ষেপ:' : 'Key Takeaway:'}
                    </p>
                    <p className="mt-1 text-slate-200">
                      {lang === 'bn' ? response.keyTakeawayBn : response.keyTakeawayEn}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
