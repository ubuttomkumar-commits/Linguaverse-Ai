import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Info } from 'lucide-react';
import { SkillRadarChart } from '../assessment/SkillRadarChart';
import { getSkillDisplayName } from '../../domain/initialAssessmentEngine';
import type { CommunicationDnaProfile } from '../../domain/communicationDnaEngine';
import type { EvidenceStartingProfile, LearnerProfile } from '../../types/domain';

interface CommunicationDnaWidgetProps {
  profile: LearnerProfile | null;
  latestDiagnostic: EvidenceStartingProfile | null;
  dnaProfile: CommunicationDnaProfile;
  lang: 'en' | 'bn';
}

export function CommunicationDnaWidget({
  profile,
  latestDiagnostic,
  dnaProfile,
  lang,
}: CommunicationDnaWidgetProps) {
  const fiveSkill = latestDiagnostic?.fiveSkillSummary ?? null;

  // Map 6 learner-facing skills transparently: Vocabulary, Grammar, Reading, Listening, Speaking, Writing
  // Writing has no dedicated assessment scorer yet -> always honestly marked "Not assessed yet"
  const sixSkillRows = [
    {
      key: 'vocabulary',
      labelEn: 'Vocabulary',
      labelBn: 'শব্দভাণ্ডার',
      score:
        fiveSkill?.skills.find((s) => s.skill === 'vocabulary')?.scorePercent ??
        dnaProfile.dimensions.find((d) => d.id === 'vocabulary_range')?.scorePercent ??
        null,
      status:
        fiveSkill?.skills.find((s) => s.skill === 'vocabulary')?.status ??
        (dnaProfile.dimensions.find((d) => d.id === 'vocabulary_range')?.scorePercent !== null
          ? 'assessed'
          : 'not_assessed'),
    },
    {
      key: 'grammar',
      labelEn: 'Grammar',
      labelBn: 'গ্রামার',
      score:
        fiveSkill?.skills.find((s) => s.skill === 'grammar')?.scorePercent ??
        dnaProfile.dimensions.find((d) => d.id === 'grammar_accuracy')?.scorePercent ??
        null,
      status:
        fiveSkill?.skills.find((s) => s.skill === 'grammar')?.status ??
        (dnaProfile.dimensions.find((d) => d.id === 'grammar_accuracy')?.scorePercent !== null
          ? 'assessed'
          : 'not_assessed'),
    },
    {
      key: 'reading',
      labelEn: 'Reading',
      labelBn: 'রিডিং',
      score:
        fiveSkill?.skills.find((s) => s.skill === 'reading')?.scorePercent ??
        dnaProfile.dimensions.find((d) => d.id === 'listening_reading_comprehension')
          ?.scorePercent ??
        null,
      status:
        fiveSkill?.skills.find((s) => s.skill === 'reading')?.status ??
        (dnaProfile.dimensions.find((d) => d.id === 'listening_reading_comprehension')
          ?.scorePercent !== null
          ? 'assessed'
          : 'not_assessed'),
    },
    {
      key: 'listening',
      labelEn: 'Listening',
      labelBn: 'লিসেনিং',
      score: fiveSkill?.skills.find((s) => s.skill === 'listening')?.scorePercent ?? null,
      status: fiveSkill?.skills.find((s) => s.skill === 'listening')?.status ?? 'not_assessed',
    },
    {
      key: 'speaking',
      labelEn: 'Speaking',
      labelBn: 'স্পিকিং',
      score:
        fiveSkill?.skills.find((s) => s.skill === 'speaking')?.scorePercent ??
        dnaProfile.dimensions.find((d) => d.id === 'speaking_task_completion')?.scorePercent ??
        null,
      status:
        fiveSkill?.skills.find((s) => s.skill === 'speaking')?.status ??
        (dnaProfile.dimensions.find((d) => d.id === 'speaking_task_completion')?.scorePercent !==
        null
          ? 'assessed'
          : 'not_assessed'),
    },
    {
      key: 'writing',
      labelEn: 'Writing',
      labelBn: 'রাইটিং',
      score: null,
      status: 'not_assessed' as const,
    },
  ];

  const strengths = fiveSkill
    ? lang === 'bn'
      ? fiveSkill.strengthsBn
      : fiveSkill.strengthsEn
    : [];
  const opportunities = fiveSkill
    ? lang === 'bn'
      ? fiveSkill.opportunitiesBn
      : fiveSkill.opportunitiesEn
    : [];

  return (
    <section
      aria-labelledby="comm-dna-heading"
      className="rounded-2xl border border-violet-400/20 bg-[#0B122C]/85 p-6 shadow-[0_18px_46px_rgba(2,6,22,0.55)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300">
            <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'bn' ? 'পার্সোনাল ইন্টেলিজেন্স প্রোফাইল' : 'Personal Intelligence Profile'}
          </p>
          <h3 id="comm-dna-heading" className="font-portal mt-1 text-lg font-bold text-white">
            {lang === 'bn' ? 'কমিউনিকেশন DNA' : 'Communication DNA'}
          </h3>
        </div>

        <Link
          to="/app/progress"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200 transition-colors whitespace-nowrap"
        >
          <span>
            {lang === 'bn' ? 'সম্পূর্ণ DNA দেখুন' : 'Explore My Communication DNA'}
          </span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Transparent separation: Self-Estimated vs. Measured Results */}
      <div className="mt-4 grid grid-cols-1 gap-3 border-y border-slate-800/80 py-3.5 text-xs sm:grid-cols-2">
        <div>
          <p className="text-slate-400">
            {lang === 'bn' ? 'স্ব-মূল্যায়িত স্তর (অনবোর্ডিং)' : 'Self-Estimated Level (Onboarding)'}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-white">
            {profile?.selfEstimatedLevel ?? (lang === 'bn' ? 'নির্ধারিত নয়' : 'Not set')}
          </p>
        </div>
        <div>
          <p className="text-slate-400">
            {lang === 'bn' ? 'পরিমাপকৃত বেসলাইন ফলাফল' : 'Measured Assessment Result'}
          </p>
          <p className="mt-1 text-sm font-semibold text-cyan-300">
            {latestDiagnostic
              ? lang === 'bn'
                ? latestDiagnostic.estimatedStartingBandBn
                : latestDiagnostic.estimatedStartingBand
              : lang === 'bn'
                ? 'এখনো মূল্যায়িত হয়নি'
                : 'Not assessed yet'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 items-center gap-6 xl:grid-cols-12">
        {/* Radar Visualization or Honest Unassessed State */}
        <div className="xl:col-span-6">
          {fiveSkill ? (
            <SkillRadarChart skills={fiveSkill.skills} lang={lang} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/90 bg-[#070D24]/70 px-5 py-8 text-center">
              <Info className="h-6 w-6 text-cyan-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-white">
                {lang === 'bn'
                  ? 'আপনার দক্ষতার মানচিত্র এখনো তৈরি হয়নি'
                  : 'Your Communication DNA map is awaiting evidence'}
              </p>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-400">
                {lang === 'bn'
                  ? 'আমরা কখনো ভুয়া স্কোর দেখাই না। ৫-দক্ষতা প্রাথমিক মূল্যায়ন সম্পন্ন করলে আপনার বাস্তব রাডার প্রোফাইল এখানে দেখাবে।'
                  : 'We never fabricate skill scores. Complete your 5-skill assessment to plot your real baseline radar here.'}
              </p>
              <Link
                to="/diagnostic"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
              >
                <span>{lang === 'bn' ? 'মূল্যায়ন শুরু করুন' : 'Take Initial Assessment'}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        {/* 6-Skill Breakdown Table (Single-elevation crisp bars, honest "Not assessed yet") */}
        <div className="space-y-3 xl:col-span-6">
          {sixSkillRows.map((row) => {
            const isMeasured = row.score !== null && row.status === 'assessed';
            return (
              <div key={row.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-200">
                    {lang === 'bn' ? row.labelBn : row.labelEn}
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      isMeasured ? 'font-semibold text-cyan-300' : 'text-slate-500'
                    }`}
                  >
                    {isMeasured
                      ? `${row.score}%`
                      : row.status === 'unavailable'
                        ? lang === 'bn'
                          ? 'অনুপলব্ধ'
                          : 'Unavailable'
                        : lang === 'bn'
                          ? 'এখনো মূল্যায়িত হয়নি'
                          : 'Not assessed yet'}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                  {isMeasured && (
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] via-[#3B82F6] to-[#8B5CF6]"
                      style={{ width: `${Math.max(4, row.score ?? 0)}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Real Evidence Strengths & Opportunities */}
          {(strengths.length > 0 || opportunities.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-slate-800/80 pt-3.5 text-xs sm:grid-cols-2">
              <div>
                <p className="font-semibold text-emerald-300">
                  {lang === 'bn' ? 'শক্তিশালী দিক' : 'Measured Strengths'}
                </p>
                <p className="mt-0.5 text-slate-300">
                  {strengths.length > 0
                    ? strengths.join(' · ')
                    : lang === 'bn'
                      ? 'আরও প্রমাণ প্রয়োজন'
                      : 'Needs more evidence'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-amber-300">
                  {lang === 'bn' ? 'উন্নতির সুযোগ' : 'Priority Focus'}
                </p>
                <p className="mt-0.5 text-slate-300">
                  {opportunities.length > 0
                    ? opportunities.join(' · ')
                    : lang === 'bn'
                      ? 'ভারসাম্যপূর্ণ অগ্রগতি'
                      : 'Balanced across assessed skills'}
                </p>
              </div>
            </div>
          )}

          {fiveSkill && (
            <p className="pt-1 text-[11px] leading-relaxed text-slate-500">
              {lang === 'bn'
                ? `${fiveSkill.skills.filter((s) => s.status === 'assessed').map((s) => getSkillDisplayName(s.skill, 'bn')).join(', ')} থেকে সংগৃহীত বাস্তব প্রমাণ।`
                : `Evidence collected from ${fiveSkill.skills.filter((s) => s.status === 'assessed').map((s) => getSkillDisplayName(s.skill, 'en')).join(', ')}.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
