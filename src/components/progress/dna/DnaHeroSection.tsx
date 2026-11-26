import { Link } from 'react-router-dom';
import {
  ArrowDown,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type {
  CommunicationDnaLabModel,
  DnaSkillId,
} from '../../../domain/communicationDnaLabEngine';
import { useLanguage } from '../../../i18n/LanguageContext';

interface DnaHeroSectionProps {
  learnerName: string;
  model: CommunicationDnaLabModel;
  selectedSkillId: DnaSkillId;
  onSelectSkill: (id: DnaSkillId) => void;
  onExploreDna: () => void;
  onAnalyzeCommunication: () => void;
}

export function DnaHeroSection({
  learnerName,
  model,
  selectedSkillId,
  onSelectSkill,
  onExploreDna,
  onAnalyzeCommunication,
}: DnaHeroSectionProps) {
  const { lang } = useLanguage();

  const firstName = learnerName.trim().split(/\s+/)[0] || (lang === 'bn' ? 'শিক্ষার্থী' : 'Learner');

  const formatDate = (iso: string | null) => {
    if (!iso) return lang === 'bn' ? 'এখনো মূল্যায়ন নেই' : 'Not yet assessed';
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  const getSkill = (id: DnaSkillId) => model.skills.find((s) => s.id === id)!;
  const speaking = getSkill('speaking');
  const grammar = getSkill('grammar');
  const vocabulary = getSkill('vocabulary');
  const pronunciation = getSkill('pronunciation');
  const writing = getSkill('writing');

  const kpiCards: Array<{
    key: string;
    skillId?: DnaSkillId;
    labelEn: string;
    labelBn: string;
    value: string;
    subEn: string;
    subBn: string;
    accentClass: string;
  }> = [
    {
      key: 'coverage',
      labelEn: 'Evidence Coverage',
      labelBn: 'প্রমাণ কভারেজ',
      value: `${model.evidenceCoveragePercent}%`,
      subEn: `${model.measuredCount}/10 skills measured`,
      subBn: `${model.measuredCount}/১০ দক্ষতা পরিমাপকৃত`,
      accentClass: 'text-[#00D9FF]',
    },
    {
      key: 'speaking',
      skillId: 'speaking',
      labelEn: 'Speaking Fluency',
      labelBn: 'স্পিকিং দক্ষতা',
      value: speaking.scorePercent !== null ? `${speaking.scorePercent}%` : '—',
      subEn:
        speaking.scorePercent !== null
          ? `${speaking.sampleSize} speaking turns`
          : `Needs ${speaking.minSamplesRequired - speaking.sampleSize} more turns`,
      subBn:
        speaking.scorePercent !== null
          ? `${speaking.sampleSize}টি স্পিকিং ধাপ`
          : `আরও ${speaking.minSamplesRequired - speaking.sampleSize}টি ধাপ প্রয়োজন`,
      accentClass: speaking.scorePercent !== null ? 'text-white' : 'text-slate-500',
    },
    {
      key: 'grammar',
      skillId: 'grammar',
      labelEn: 'Grammar Accuracy',
      labelBn: 'ব্যাকরণ নির্ভুলতা',
      value: grammar.scorePercent !== null ? `${grammar.scorePercent}%` : '—',
      subEn:
        grammar.scorePercent !== null
          ? `${grammar.sampleSize} verified samples`
          : `${grammar.sampleSize}/3 samples`,
      subBn:
        grammar.scorePercent !== null
          ? `${grammar.sampleSize}টি যাচাইকৃত নমুনা`
          : `${grammar.sampleSize}/৩ নমুনা`,
      accentClass: grammar.scorePercent !== null ? 'text-white' : 'text-slate-500',
    },
    {
      key: 'vocabulary',
      skillId: 'vocabulary',
      labelEn: 'Vocabulary Strength',
      labelBn: 'শব্দভাণ্ডার শক্তি',
      value: vocabulary.scorePercent !== null ? `${vocabulary.scorePercent}%` : '—',
      subEn:
        vocabulary.scorePercent !== null
          ? `${vocabulary.sampleSize} verified samples`
          : `${vocabulary.sampleSize}/3 samples`,
      subBn:
        vocabulary.scorePercent !== null
          ? `${vocabulary.sampleSize}টি যাচাইকৃত নমুনা`
          : `${vocabulary.sampleSize}/৩ নমুনা`,
      accentClass: vocabulary.scorePercent !== null ? 'text-white' : 'text-slate-500',
    },
    {
      key: 'pronunciation',
      skillId: 'pronunciation',
      labelEn: 'Pronunciation',
      labelBn: 'উচ্চারণ (Acoustic)',
      value: '—',
      subEn: 'Acoustic engine pending',
      subBn: 'অ্যাকোস্টিক ইঞ্জিন যুক্ত নয়',
      accentClass: 'text-slate-500',
    },
    {
      key: 'writing',
      skillId: 'writing',
      labelEn: 'Writing Accuracy',
      labelBn: 'লিখিত দক্ষতা',
      value: writing.scorePercent !== null ? `${writing.scorePercent}%` : '—',
      subEn:
        writing.scorePercent !== null
          ? `${writing.sampleSize} verified samples`
          : `${writing.sampleSize}/3 samples`,
      subBn:
        writing.scorePercent !== null
          ? `${writing.sampleSize}টি যাচাইকৃত নমুনা`
          : `${writing.sampleSize}/৩ নমুনা`,
      accentClass: writing.scorePercent !== null ? 'text-white' : 'text-slate-500',
    },
  ];

  const { measuredSummary } = model.profileSeparation;

  return (
    <section
      aria-label={lang === 'bn' ? 'আপনার Communication DNA পরিচিতি' : 'Your Communication DNA Hero'}
      className="relative overflow-hidden rounded-3xl border border-cyan-400/25 bg-[linear-gradient(155deg,#0B1535_0%,#080F29_55%,#0C1234_100%)] p-6 shadow-[0_24px_70px_rgba(2,5,20,0.75)] sm:p-8"
    >
      {/* Subtle controlled ambient radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.16)_0%,rgba(128,80,255,0.08)_50%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(128,80,255,0.14)_0%,transparent_72%)]"
      />

      <div className="relative z-10">
        {/* Clean Unboxed Learner Context Metadata Strip */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
          <span className="font-semibold text-cyan-300">
            {lang === 'bn' ? `স্বাগতম, ${firstName}` : `Welcome back, ${firstName}`}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span>
            {lang === 'bn' ? 'শেখার ভাষা: ইংরেজি (বাংলা মাধ্যম)' : 'Learning: English (Bangla L1)'}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono text-slate-400 tabular-nums">
            {lang === 'bn' ? 'সর্বশেষ মূল্যায়ন: ' : 'Last assessment: '}
            {formatDate(model.lastAssessmentDate)}
          </span>
        </div>

        {/* Main Hero Row */}
        <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h2 className="font-portal text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {lang === 'bn' ? 'আপনার Communication DNA আবিষ্কার করুন' : 'Your Communication DNA'}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#A9B6D3] sm:text-base">
              {lang === 'bn'
                ? 'আপনি কীভাবে যোগাযোগ করেন তা বুঝুন, আপনার প্রমাণিত শক্তি খুঁজে নিন এবং পরবর্তী ধাপে এগোনোর জন্য সঠিক দক্ষতা চিহ্নিত করুন।'
                : 'Understand how you communicate, uncover your verified strengths, and identify the exact skills that will move you forward.'}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">
                {lang === 'bn' ? 'প্রমাণভিত্তিক স্তর নির্দেশক: ' : 'Estimated Proficiency: '}
              </span>
              <span>
                {lang === 'bn'
                  ? measuredSummary.estimatedProficiencyBn
                  : measuredSummary.estimatedProficiencyEn}
              </span>
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onExploreDna}
              data-testid="hero-explore-dna-btn"
              className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{lang === 'bn' ? 'আমার DNA দেখুন' : 'Explore My DNA'}</span>
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onAnalyzeCommunication}
              data-testid="hero-analyze-dna-btn"
              className="lv-portal-btn-violet inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'AI বিশ্লেষণ করুন' : 'Analyze My Communication'}</span>
            </button>

            <Link
              to="/diagnostic"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/90 bg-[#070E28] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              <span>{lang === 'bn' ? 'মূল্যায়ন রিফ্রেশ' : 'Refresh Assessment'}</span>
            </Link>
          </div>
        </div>

        {/* 6-Card Real-Data Intelligence Strip (Zero Fabricated Scores) */}
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map((card) => {
            const isSelected = Boolean(card.skillId && card.skillId === selectedSkillId);
            const content = (
              <>
                <p className="truncate text-[11px] font-medium text-slate-400">
                  {lang === 'bn' ? card.labelBn : card.labelEn}
                </p>
                <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${card.accentClass}`}>
                  {card.value}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  {lang === 'bn' ? card.subBn : card.subEn}
                </p>
              </>
            );

            if (card.skillId) {
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => onSelectSkill(card.skillId!)}
                  aria-pressed={isSelected}
                  className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400/70 bg-[#0F1E4D]/95 shadow-[0_0_24px_rgba(0,217,255,0.16)]'
                      : 'border-slate-800/90 bg-[#070E28]/90 hover:border-cyan-400/40'
                  }`}
                >
                  {content}
                </button>
              );
            }

            return (
              <div
                key={card.key}
                className="rounded-2xl border border-cyan-400/25 bg-[#070E28]/90 p-3.5"
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
