import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type {
  CommunicationDnaLabModel,
  DnaSkillNode,
} from '../../../domain/communicationDnaLabEngine';
import {
  DnaCoachClientError,
  requestDnaCoachReply,
  requestDnaSynthesis,
  type DnaCoachChatTurn,
  type DnaCoachReplyPayload,
} from '../../../services/dnaCoachApi';
import {
  loadPersistedDnaSynthesis,
  savePersistedDnaSynthesis,
  type PersistedDnaSynthesis,
} from '../../../services/dnaAnalysisStore';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useAuth } from '../../../context/AuthContext';

interface DnaAiIntelligencePanelProps {
  model: CommunicationDnaLabModel;
  selectedSkill: DnaSkillNode;
  coachTriggerPrompt: string | null;
  onConsumeCoachTrigger: () => void;
  analyzeTriggerCount: number;
}

interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  structured?: DnaCoachReplyPayload;
  model?: string;
}

export function DnaAiIntelligencePanel({
  model,
  selectedSkill,
  coachTriggerPrompt,
  onConsumeCoachTrigger,
  analyzeTriggerCount,
}: DnaAiIntelligencePanelProps) {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();

  const explanationLang = profile?.explanationLanguage ?? 'both';
  const [persistedSynthesis, setPersistedSynthesis] = useState<PersistedDnaSynthesis | null>(() =>
    loadPersistedDnaSynthesis(user?.id)
  );
  const [synthLoading, setSynthLoading] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);

  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachInput, setCoachInput] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  useEffect(() => {
    setPersistedSynthesis(loadPersistedDnaSynthesis(user?.id));
  }, [user?.id]);

  const handleRunSynthesis = async () => {
    if (!model.profileSeparation.aiInterpretationEligibility.eligible) return;
    setSynthLoading(true);
    setSynthError(null);
    try {
      const result = await requestDnaSynthesis({
        explanationLanguage: explanationLang,
        timeframe: model.timeframe,
        measuredCount: model.measuredCount,
        totalVerifiedSamples: model.totalVerifiedSamples,
        evidenceCoveragePercent: model.evidenceCoveragePercent,
        selfReportedLevel: model.profileSeparation.selfReported.levelLabelEn,
        learningGoals: model.profileSeparation.selfReported.learningGoals,
        skills: model.skills,
        topWeaknesses: model.growthOpportunities.map((g) => g.weaknessEn),
        userId: user?.id,
      });

      const saved: PersistedDnaSynthesis = {
        synthesis: result.synthesis,
        model: result.model,
        generatedAt: new Date().toISOString(),
        timeframe: model.timeframe,
        measuredCountAtGeneration: model.measuredCount,
        totalSamplesAtGeneration: model.totalVerifiedSamples,
      };
      savePersistedDnaSynthesis(user?.id, saved);
      setPersistedSynthesis(saved);
    } catch (err) {
      if (err instanceof DnaCoachClientError) {
        setSynthError(err.message);
      } else {
        setSynthError(
          lang === 'bn'
            ? 'AI বিশ্লেষণ তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
            : 'Unable to run AI Communication DNA synthesis right now. Please retry.'
        );
      }
    } finally {
      setSynthLoading(false);
    }
  };

  useEffect(() => {
    if (analyzeTriggerCount > 0 && model.profileSeparation.aiInterpretationEligibility.eligible) {
      void handleRunSynthesis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzeTriggerCount]);

  const sendCoachPrompt = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || coachLoading) return;

    const userMsg: CoachMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: clean,
    };
    const nextHistory: DnaCoachChatTurn[] = [...coachMessages, userMsg].slice(-6).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setCoachMessages((prev) => [...prev, userMsg]);
    setCoachInput('');
    setCoachLoading(true);
    setCoachError(null);

    try {
      const res = await requestDnaCoachReply({
        message: clean,
        explanationLanguage: explanationLang,
        focusedSkill: selectedSkill,
        measuredCount: model.measuredCount,
        totalVerifiedSamples: model.totalVerifiedSamples,
        selfReportedLevel: model.profileSeparation.selfReported.levelLabelEn,
        skills: model.skills,
        topWeaknesses: model.growthOpportunities.map((g) => g.weaknessEn),
        history: nextHistory,
        userId: user?.id,
      });

      const assistantMsg: CoachMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: lang === 'bn' ? res.reply.replyBn : res.reply.replyEn,
        structured: res.reply,
        model: res.model,
      };
      setCoachMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err instanceof DnaCoachClientError) {
        setCoachError(err.message);
      } else {
        setCoachError(
          lang === 'bn'
            ? 'AI কমিউনিকেশন কোচের সাথে সংযোগ করা যাচ্ছে না। আবার চেষ্টা করুন।'
            : 'Unable to reach AI Communication Coach right now. Please try again.'
        );
      }
    } finally {
      setCoachLoading(false);
    }
  };

  useEffect(() => {
    if (coachTriggerPrompt) {
      setCoachInput(coachTriggerPrompt);
      onConsumeCoachTrigger();
    }
  }, [coachTriggerPrompt, onConsumeCoachTrigger]);

  const handleCoachSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendCoachPrompt(coachInput);
  };

  const quickPrompts = [
    lang === 'bn'
      ? `আমার ${selectedSkill.titleBn} দক্ষতা কীভাবে উন্নত করব?`
      : `How can I improve my ${selectedSkill.titleEn} based on my current evidence?`,
    lang === 'bn'
      ? 'আমার এই সপ্তাহের সবচেয়ে কার্যকর ১০ মিনিটের অনুশীলন পরিকল্পনা কী?'
      : 'What is the highest-impact 10-minute practice plan for me this week?',
    lang === 'bn'
      ? 'কথোপকথনে সাবলীলতা বাড়ানোর একটি দ্রুত ড্রিল দিন।'
      : 'Give me a quick 60-second Bangla-to-English speaking fluency drill.',
  ];

  const { measuredSummary, selfReported, aiInterpretationEligibility } = model.profileSeparation;

  return (
    <section
      id="dna-ai-intelligence"
      aria-label={
        lang === 'bn'
          ? 'প্রোফাইল বিভাজন ও AI কমিউনিকেশন কোচ'
          : 'Profile Separation, AI Synthesis and Communication Coach'
      }
      className="space-y-6"
    >
      {/* Section Header */}
      <div>
        <p className="text-xs font-medium text-violet-300">
          {lang === 'bn'
            ? 'প্রমাণ বনাম স্ব-মূল্যায়ন বনাম AI বিশ্লেষণ'
            : 'Evidence Integrity & AI Communication Intelligence'}
        </p>
        <h2 className="font-portal mt-1 text-xl font-bold text-white sm:text-2xl">
          {lang === 'bn'
            ? 'কমিউনিকেশন প্রোফাইল ও AI কোচিং ল্যাব'
            : 'Profile Separation & AI Communication Coach'}
        </h2>
      </div>

      {/* 3-Column Strict Profile Separation (Measured vs Self-Reported vs AI Synthesis) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Column 1: Measured Performance */}
        <div className="rounded-2xl border border-cyan-400/25 bg-[#0A1334]/95 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>{lang === 'bn' ? '১. পরিমাপকৃত কর্মক্ষমতা' : '1. Measured Performance'}</span>
          </div>
          <p className="mt-3 font-portal text-base font-bold text-white">
            {lang === 'bn'
              ? measuredSummary.estimatedProficiencyBn
              : measuredSummary.estimatedProficiencyEn}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800/80 bg-[#060C24] px-3 py-2.5">
              <dt className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'পরিমাপকৃত মাত্রা' : 'Measured Skills'}
              </dt>
              <dd className="mt-0.5 font-mono text-base font-bold text-white tabular-nums">
                {measuredSummary.measuredSkillsCount}/{measuredSummary.totalSkillsCount}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-[#060C24] px-3 py-2.5">
              <dt className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'প্রমাণ কভারেজ' : 'Coverage'}
              </dt>
              <dd className="mt-0.5 font-mono text-base font-bold text-cyan-300 tabular-nums">
                {measuredSummary.evidenceCoveragePercent}%
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            {lang === 'bn' ? measuredSummary.cefrDisclaimerBn : measuredSummary.cefrDisclaimerEn}
          </p>
        </div>

        {/* Column 2: Self-Reported Learner Profile */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <UserCheck className="h-4 w-4 text-blue-400" aria-hidden="true" />
            <span>{lang === 'bn' ? '২. স্ব-নির্বাচিত প্রোফাইল' : '2. Self-Reported Profile'}</span>
          </div>
          <p className="mt-3 font-portal text-base font-bold text-white">
            {lang === 'bn' ? selfReported.levelLabelBn : selfReported.levelLabelEn}
          </p>
          <dl className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2">
              <dt className="text-slate-400">
                {lang === 'bn' ? 'দৈনিক অনুশীলন লক্ষ্য' : 'Daily Practice Target'}
              </dt>
              <dd className="font-mono font-semibold text-white tabular-nums">
                {selfReported.dailyGoalMinutes} {lang === 'bn' ? 'মিনিট/দিন' : 'min/day'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/70 pb-2">
              <dt className="text-slate-400">
                {lang === 'bn' ? 'শেখার লক্ষ্য' : 'Focus Goals'}
              </dt>
              <dd className="text-right font-medium text-slate-200">
                {selfReported.learningGoals.length > 0
                  ? selfReported.learningGoals
                      .slice(0, 2)
                      .map((g) => g.replace(/_/g, ' '))
                      .join(' · ')
                  : lang === 'bn'
                    ? 'সাধারণ দক্ষতা'
                    : 'General English fluency'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            {lang === 'bn'
              ? 'স্ব-নির্বাচিত স্তর শুধু শেখার পথ সাজাতে সাহায্য করে — এটি কখনো পরিমাপকৃত স্কোর পরিবর্তন করে না।'
              : 'Self-reported onboarding preferences guide recommendations and never alter verified assessment scores.'}
          </p>
        </div>

        {/* Column 3: AI Communication Synthesis (Evidence-Gated) */}
        <div className="flex flex-col justify-between rounded-2xl border border-violet-400/30 bg-[#0A1334]/95 p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>
                  {lang === 'bn' ? '৩. AI যোগাযোগ বিশ্লেষণ' : '3. AI Communication Synthesis'}
                </span>
              </div>
              {aiInterpretationEligibility.eligible && (
                <button
                  type="button"
                  onClick={() => void handleRunSynthesis()}
                  disabled={synthLoading}
                  data-testid="dna-run-ai-synthesis"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-[#151F52] px-2.5 py-1 text-[11px] font-semibold text-violet-100 hover:border-cyan-400/60 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  {synthLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>
                    {persistedSynthesis
                      ? lang === 'bn'
                        ? 'পুনরায় বিশ্লেষণ'
                        : 'Refresh AI'
                      : lang === 'bn'
                        ? 'বিশ্লেষণ তৈরি করুন'
                        : 'Generate'}
                  </span>
                </button>
              )}
            </div>

            {!aiInterpretationEligibility.eligible ? (
              <div className="mt-3 space-y-2">
                <p className="font-portal text-sm font-bold text-slate-200">
                  {lang === 'bn'
                    ? 'AI প্রোফাইল বিশ্লেষণ এখনো লক আছে'
                    : 'AI Profile Synthesis Locked Until Sufficient Evidence'}
                </p>
                <p className="text-xs leading-relaxed text-slate-400">
                  {lang === 'bn'
                    ? aiInterpretationEligibility.reasonBn
                    : aiInterpretationEligibility.reasonEn}
                </p>
              </div>
            ) : persistedSynthesis ? (
              <div className="mt-3 space-y-2.5">
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'প্রমাণভিত্তিক যোগাযোগ ধরণ (দৃষ্টান্তমূলক)'
                    : 'Illustrative Communication Pattern'}
                </p>
                <p className="font-portal text-base font-bold text-cyan-200">
                  {lang === 'bn'
                    ? persistedSynthesis.synthesis.communicationStyleBn
                    : persistedSynthesis.synthesis.communicationStyleEn}
                </p>
                <p className="text-xs leading-relaxed text-slate-300">
                  {lang === 'bn'
                    ? persistedSynthesis.synthesis.executiveSummaryBn
                    : persistedSynthesis.synthesis.executiveSummaryEn}
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5">
                <p className="text-xs leading-relaxed text-slate-300">
                  {lang === 'bn'
                    ? aiInterpretationEligibility.reasonBn
                    : aiInterpretationEligibility.reasonEn}
                </p>
                <button
                  type="button"
                  onClick={() => void handleRunSynthesis()}
                  disabled={synthLoading}
                  className="lv-portal-btn-violet inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
                >
                  {synthLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {lang === 'bn'
                      ? 'আমার Communication DNA বিশ্লেষণ করুন'
                      : 'Analyze My Communication DNA'}
                  </span>
                </button>
              </div>
            )}

            {synthError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-950/30 p-3 text-xs text-amber-200"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{synthError}</span>
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            {lang === 'bn'
              ? 'কোনো মনস্তাত্ত্বিক বা ব্যক্তিত্ব নির্ণয় নয় — কেবল সংরক্ষিত ভাষাগত প্রমাণের সারসংক্ষেপ।'
              : 'Illustrative language-learning synthesis only — never a psychological or clinical diagnosis.'}
          </p>
        </div>
      </div>

      {/* Expanded Persisted AI Synthesis Insights (when generated) */}
      {persistedSynthesis && aiInterpretationEligibility.eligible && (
        <div className="rounded-2xl border border-violet-400/25 bg-[#091230]/95 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800/80 pb-3.5">
            <div>
              <p className="text-xs font-semibold text-violet-300">
                {lang === 'bn'
                  ? persistedSynthesis.synthesis.communicationStyleBn
                  : persistedSynthesis.synthesis.communicationStyleEn}
              </p>
              <h3 className="font-portal mt-0.5 text-base font-bold text-white">
                {lang === 'bn'
                  ? 'AI যোগাযোগ ধরণ ও ৭-দিনের অ্যাকশন পরিকল্পনা'
                  : 'AI Communication Insights & 7-Day Action Plan'}
              </h3>
            </div>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {persistedSynthesis.measuredCountAtGeneration}/10{' '}
              {lang === 'bn' ? 'মাত্রা' : 'skills'} · {persistedSynthesis.totalSamplesAtGeneration}{' '}
              {lang === 'bn' ? 'নমুনা' : 'samples'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <h4 className="text-xs font-semibold text-cyan-300">
                {lang === 'bn' ? 'পর্যবেক্ষিত শক্তি' : 'Observed Strengths'}
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
                {(lang === 'bn'
                  ? persistedSynthesis.synthesis.observedStrengthsBn
                  : persistedSynthesis.synthesis.observedStrengthsEn
                ).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-amber-300">
                {lang === 'bn' ? 'অগ্রাধিকার ক্ষেত্র ও শেখার ধরণ' : 'Priority Focus & Pattern'}
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
                {(lang === 'bn'
                  ? persistedSynthesis.synthesis.priorityFocusBn
                  : persistedSynthesis.synthesis.priorityFocusEn
                ).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {lang === 'bn'
                  ? persistedSynthesis.synthesis.learningBehaviorInsightBn
                  : persistedSynthesis.synthesis.learningBehaviorInsightEn}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-violet-300">
                {lang === 'bn' ? 'আগামী ৭ দিনের পরিকল্পনা' : '7-Day Practice Plan'}
              </h4>
              <ol className="mt-2 space-y-2 text-xs leading-relaxed text-slate-200">
                {(lang === 'bn'
                  ? persistedSynthesis.synthesis.sevenDayPlanBn
                  : persistedSynthesis.synthesis.sevenDayPlanEn
                ).map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-[11px] font-bold text-violet-300 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p className="mt-4 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
            {lang === 'bn'
              ? persistedSynthesis.synthesis.evidenceBoundaryNoteBn
              : persistedSynthesis.synthesis.evidenceBoundaryNoteEn}
          </p>
        </div>
      )}

      {/* Interactive AI Communication Coach */}
      <div className="rounded-2xl border border-cyan-400/20 bg-[#0A1334]/95 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D9FF]/20 via-[#2864FF]/25 to-[#8050FF]/30 border border-cyan-400/30 text-cyan-300">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-portal text-base font-bold text-white">
                {lang === 'bn' ? 'AI কমিউনিকেশন কোচ' : 'AI Communication Coach'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? `নির্বাচিত মাত্রা: ${selectedSkill.titleBn} · আপনার বাস্তব প্রমাণ-ভিত্তিক দ্বিভাষিক কোচিং।`
                  : `Focused on ${selectedSkill.titleEn} · Bilingual English + Bangla coaching grounded in your verified profile.`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Starter Prompts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void sendCoachPrompt(q)}
              disabled={coachLoading}
              className="rounded-xl border border-slate-700/80 bg-[#060C24] px-3 py-1.5 text-left text-xs font-medium text-slate-300 hover:border-cyan-400/50 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Conversation Thread */}
        {coachMessages.length > 0 && (
          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
            {coachMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl border p-3.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'ml-auto max-w-2xl border-cyan-400/30 bg-[#102052] text-white'
                    : 'max-w-3xl border-slate-800 bg-[#060C24] text-slate-200'
                }`}
              >
                {msg.role === 'user' ? (
                  <p>{msg.text}</p>
                ) : msg.structured ? (
                  <div className="space-y-3">
                    <p className="text-slate-100">{msg.structured.replyEn}</p>
                    <p className="font-bn text-slate-300">{msg.structured.replyBn}</p>

                    <div className="grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold text-cyan-300">
                          {lang === 'bn' ? 'কার্যকর কৌশল' : 'Actionable Technique'}
                        </p>
                        <p className="mt-1 text-slate-200">
                          {lang === 'bn'
                            ? msg.structured.actionableTipBn
                            : msg.structured.actionableTipEn}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-violet-300">
                          {lang === 'bn' ? '৬০-সেকেন্ড প্র্যাকটিস প্রম্পট' : '60-Second Practice Drill'}
                        </p>
                        <p className="mt-1 text-slate-200">
                          {lang === 'bn'
                            ? msg.structured.practiceDrillPromptBn
                            : msg.structured.practiceDrillPromptEn}
                        </p>
                      </div>
                    </div>

                    {msg.structured.suggestedFollowUps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.structured.suggestedFollowUps.map((fup) => (
                          <button
                            key={fup}
                            type="button"
                            onClick={() => void sendCoachPrompt(fup)}
                            disabled={coachLoading}
                            className="rounded-lg border border-slate-700 bg-[#0B1538] px-2.5 py-1 text-[11px] text-cyan-200 hover:border-cyan-400/50 cursor-pointer"
                          >
                            {fup}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {coachError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-950/30 p-3 text-xs text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{coachError}</span>
          </div>
        )}

        {/* Question Form */}
        <form onSubmit={handleCoachSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor="dna-coach-input" className="sr-only">
            {lang === 'bn'
              ? 'AI কমিউনিকেশন কোচকে প্রশ্ন করুন'
              : 'Ask the AI Communication Coach'}
          </label>
          <input
            id="dna-coach-input"
            type="text"
            value={coachInput}
            onChange={(e) => setCoachInput(e.target.value)}
            placeholder={
              lang === 'bn'
                ? 'আপনার ব্যাকরণ, স্পিকিং বা পরবর্তী অনুশীলন নিয়ে প্রশ্ন লিখুন...'
                : 'Ask about your Grammar, Speaking fluency, vocabulary range, or next practice...'
            }
            maxLength={600}
            className="lv-auth-input flex-1 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={coachLoading || !coachInput.trim()}
            data-testid="dna-coach-submit"
            className="lv-portal-btn inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {coachLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{lang === 'bn' ? 'কোচকে জিজ্ঞাসা করুন' : 'Ask Coach'}</span>
          </button>
        </form>
      </div>
    </section>
  );
}
