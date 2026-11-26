import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Info,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  DnaNodeVisualState,
  DnaSkillNode,
} from '../../../domain/communicationDnaLabEngine';
import { useLanguage } from '../../../i18n/LanguageContext';

interface DnaSkillInspectorProps {
  skill: DnaSkillNode;
  onAskCoachAboutSkill: (skill: DnaSkillNode) => void;
}

function getStateMeta(
  state: DnaNodeVisualState,
  lang: 'en' | 'bn'
): {
  label: string;
  accentClass: string;
  barClass: string;
  Icon: typeof ShieldCheck;
} {
  if (state === 'strong') {
    return {
      label: lang === 'bn' ? 'শক্তিশালী প্রমাণ' : 'Strong Evidence',
      accentClass: 'text-[#00D9FF]',
      barClass: 'bg-gradient-to-r from-[#2864FF] to-[#00D9FF]',
      Icon: CheckCircle2,
    };
  }
  if (state === 'developing') {
    return {
      label: lang === 'bn' ? 'উন্নয়নশীল' : 'Developing',
      accentClass: 'text-[#60A5FA]',
      barClass: 'bg-gradient-to-r from-[#2864FF] to-[#8050FF]',
      Icon: ShieldCheck,
    };
  }
  if (state === 'needs_attention') {
    return {
      label: lang === 'bn' ? 'মনোযোগ প্রয়োজন' : 'Needs Attention',
      accentClass: 'text-[#F59E0B]',
      barClass: 'bg-gradient-to-r from-[#D97706] to-[#F59E0B]',
      Icon: AlertTriangle,
    };
  }
  return {
    label: lang === 'bn' ? 'পর্যাপ্ত মূল্যায়ন তথ্য নেই' : 'Not Enough Assessment Data',
    accentClass: 'text-slate-400',
    barClass: 'bg-slate-700',
    Icon: Clock,
  };
}

export function DnaSkillInspector({
  skill,
  onAskCoachAboutSkill,
}: DnaSkillInspectorProps) {
  const { lang } = useLanguage();
  const stateMeta = getStateMeta(skill.visualState, lang);
  const StateIcon = stateMeta.Icon;

  const formatDate = (iso: string | null) => {
    if (!iso) return lang === 'bn' ? 'মূল্যায়ন হয়নি' : 'None yet';
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(5, 10);
    }
  };

  const hasScore = skill.scorePercent !== null;
  const strengths = lang === 'bn' ? skill.strengthsBn : skill.strengthsEn;
  const improvements = lang === 'bn' ? skill.improvementsBn : skill.improvementsEn;

  return (
    <aside
      aria-label={lang === 'bn' ? 'দক্ষতার বিস্তারিত বিশ্লেষণ' : 'Selected skill intelligence inspector'}
      data-testid="dna-skill-inspector"
      className="flex h-full flex-col justify-between rounded-2xl border border-cyan-400/25 bg-[#0A1334]/95 p-5 sm:p-6"
    >
      <div className="space-y-5">
        {/* Header: Skill Name + Clean Unboxed Metadata */}
        <div className="border-b border-slate-800/90 pb-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>
              {skill.group === 'core'
                ? lang === 'bn'
                  ? 'মূল যোগাযোগ দক্ষতা'
                  : 'Core Communication Skill'
                : lang === 'bn'
                  ? 'সম্প্রসারিত মূল্যায়ন মাত্রা'
                  : 'Extended Assessment Dimension'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={`inline-flex items-center gap-1 font-semibold ${stateMeta.accentClass}`}>
              <StateIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{stateMeta.label}</span>
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-portal text-xl font-bold text-white">
              {lang === 'bn' ? skill.titleBn : skill.titleEn}
            </h3>

            <div className="text-right font-mono tabular-nums">
              {hasScore ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{skill.scorePercent}%</span>
                  {skill.deltaPercent !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                        skill.deltaPercent > 0
                          ? 'text-emerald-400'
                          : skill.deltaPercent < 0
                            ? 'text-amber-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {skill.deltaPercent > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : skill.deltaPercent < 0 ? (
                        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      <span>
                        {skill.deltaPercent > 0 ? '+' : ''}
                        {skill.deltaPercent}%
                      </span>
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  {lang === 'bn' ? 'পর্যাপ্ত মূল্যায়ন তথ্য নেই' : 'Not enough assessment data'}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#05091F]"
            role="progressbar"
            aria-label={lang === 'bn' ? skill.titleBn : skill.titleEn}
            aria-valuenow={hasScore ? skill.scorePercent! : 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${stateMeta.barClass}`}
              style={{
                width: hasScore
                  ? `${skill.scorePercent}%`
                  : `${Math.min(100, Math.round((skill.sampleSize / skill.minSamplesRequired) * 100))}%`,
              }}
            />
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
            {lang === 'bn' ? skill.definitionBn : skill.definitionEn}
          </p>
        </div>

        {/* Verified Evidence Telemetry Grid */}
        <dl className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800/80 bg-[#060C24] px-3 py-2.5">
            <dt className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'নমুনা সংখ্যা' : 'Samples'}
            </dt>
            <dd className="mt-0.5 font-mono text-sm font-bold text-white tabular-nums">
              {skill.sampleSize}
              <span className="text-[11px] font-normal text-slate-500">
                /{skill.minSamplesRequired}+
              </span>
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#060C24] px-3 py-2.5">
            <dt className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'প্রমাণ আত্মবিশ্বাস' : 'Confidence'}
            </dt>
            <dd className="mt-0.5 font-mono text-sm font-bold text-cyan-300 tabular-nums">
              {skill.confidencePercent}%
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#060C24] px-3 py-2.5">
            <dt className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'সর্বশেষ মূল্যায়ন' : 'Last Assessed'}
            </dt>
            <dd className="mt-0.5 font-mono text-xs font-semibold leading-snug text-slate-200 tabular-nums">
              {formatDate(skill.lastAssessedAt)}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#060C24] px-3 py-2.5">
            <dt className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'কভারেজ স্তর' : 'Coverage'}
            </dt>
            <dd className="mt-0.5 text-xs font-semibold leading-snug text-slate-200">
              {lang === 'bn' ? skill.coverageLabelBn : skill.coverageLabelEn}
            </dd>
          </div>
        </dl>

        {/* Strengths & Improvement Opportunities */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold text-cyan-300">
              {lang === 'bn' ? 'শনাক্তকৃত শক্তি' : 'Identified Strengths'}
            </h4>
            {strengths.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
                {strengths.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {lang === 'bn'
                  ? 'শক্তি শনাক্ত করতে অন্তত ৩টি যাচাইকৃত নমুনা প্রয়োজন।'
                  : 'Complete at least 3 verified samples in this dimension to establish observed strengths.'}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-amber-300">
              {lang === 'bn' ? 'উন্নতির সুযোগ' : 'Areas Requiring Improvement'}
            </h4>
            {improvements.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
                {improvements.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {lang === 'bn'
                  ? 'এই মুহূর্তে কোনো জরুরি দুর্বলতা ধরা পড়েনি।'
                  : 'No acute weaknesses flagged yet — maintain regular real-world transfer practice.'}
              </p>
            )}
          </div>
        </div>

        {/* Recent Performance History */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-200">
              {lang === 'bn' ? 'সাম্প্রতিক মূল্যায়ন ইতিহাস' : 'Recent Supporting Evidence'}
            </h4>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {lang === 'bn' ? skill.dateRangeLabelBn : skill.dateRangeLabelEn}
            </span>
          </div>

          {skill.recentHistory.length > 0 ? (
            <ul className="mt-2 divide-y divide-slate-800/80 rounded-xl border border-slate-800/80 bg-[#060C24] px-3 py-1">
              {skill.recentHistory.slice(0, 4).map((obs) => (
                <li
                  key={obs.id}
                  className="flex items-center justify-between gap-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-200">
                      {lang === 'bn' ? obs.summaryBn : obs.summaryEn}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>{lang === 'bn' ? obs.sourceLabelBn : obs.sourceLabelEn}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatDate(obs.timestamp)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-cyan-300 tabular-nums">
                    {obs.scorePercent}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 rounded-xl border border-slate-800/80 bg-[#060C24] px-3.5 py-3 text-xs text-slate-400">
              {lang === 'bn'
                ? 'এই দক্ষতার জন্য এখনো কোনো যাচাইকৃত রেকর্ড জমা পড়েনি।'
                : 'No supporting assessment records recorded for this dimension yet.'}
            </div>
          )}
        </div>

        {/* Honest Assessment Limitation Notice */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-800/90 bg-[#070E2B] px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" aria-hidden="true" />
          <span>{lang === 'bn' ? skill.limitationBn : skill.limitationEn}</span>
        </div>
      </div>

      {/* Recommended Practice Action Footer */}
      <div className="mt-5 border-t border-slate-800/90 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-200">
            {lang === 'bn' ? 'পরবর্তী প্রস্তাবিত অনুশীলন' : 'Recommended Practice'}
          </span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-400">
            <CalendarClock className="h-3 w-3 text-violet-400" aria-hidden="true" />
            <span>
              ~{skill.recommendedDurationMinutes} {lang === 'bn' ? 'মিনিট' : 'min'}
            </span>
          </span>
        </div>

        <p className="mt-1 text-xs font-medium text-white">
          {lang === 'bn' ? skill.recommendedPracticeBn : skill.recommendedPracticeEn}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {lang === 'bn' ? skill.completionCriteriaBn : skill.completionCriteriaEn}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <Link
            to={skill.recommendedRoute}
            className="lv-portal-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white whitespace-nowrap"
          >
            <span>{lang === 'bn' ? 'অনুশীলন শুরু করুন' : 'Start Practice'}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => onAskCoachAboutSkill(skill)}
            className="rounded-xl border border-violet-400/35 bg-[#121B48] px-3.5 py-2 text-xs font-semibold text-violet-200 hover:border-cyan-400/50 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            {lang === 'bn' ? 'AI কোচকে জিজ্ঞাসা করুন' : 'Ask AI Coach'}
          </button>
        </div>
      </div>
    </aside>
  );
}
