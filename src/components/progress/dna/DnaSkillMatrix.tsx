import type {
  DnaNodeVisualState,
  DnaSkillId,
  DnaSkillNode,
} from '../../../domain/communicationDnaLabEngine';
import { useLanguage } from '../../../i18n/LanguageContext';

interface DnaSkillMatrixProps {
  coreSkills: DnaSkillNode[];
  extendedSkills: DnaSkillNode[];
  selectedSkillId: DnaSkillId;
  onSelectSkill: (id: DnaSkillId) => void;
}

function getStateStyle(
  state: DnaNodeVisualState,
  lang: 'en' | 'bn'
): { label: string; textClass: string; barClass: string } {
  if (state === 'strong') {
    return {
      label: lang === 'bn' ? 'শক্তিশালী' : 'Strong',
      textClass: 'text-[#00D9FF]',
      barClass: 'bg-gradient-to-r from-[#2864FF] to-[#00D9FF]',
    };
  }
  if (state === 'developing') {
    return {
      label: lang === 'bn' ? 'উন্নয়নশীল' : 'Developing',
      textClass: 'text-[#60A5FA]',
      barClass: 'bg-gradient-to-r from-[#2864FF] to-[#8050FF]',
    };
  }
  if (state === 'needs_attention') {
    return {
      label: lang === 'bn' ? 'মনোযোগ প্রয়োজন' : 'Needs Attention',
      textClass: 'text-amber-400',
      barClass: 'bg-amber-500',
    };
  }
  return {
    label: lang === 'bn' ? 'অপরিমাপকৃত' : 'Not Enough Data',
    textClass: 'text-slate-500',
    barClass: 'bg-slate-700',
  };
}

export function DnaSkillMatrix({
  coreSkills,
  extendedSkills,
  selectedSkillId,
  onSelectSkill,
}: DnaSkillMatrixProps) {
  const { lang } = useLanguage();

  const renderCard = (skill: DnaSkillNode) => {
    const isSelected = skill.id === selectedSkillId;
    const style = getStateStyle(skill.visualState, lang);
    const hasScore = skill.scorePercent !== null;

    return (
      <button
        key={skill.id}
        type="button"
        onClick={() => onSelectSkill(skill.id)}
        aria-pressed={isSelected}
        data-testid={`dna-skill-node-btn-${skill.id}`}
        className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
          isSelected
            ? 'border-cyan-400/75 bg-[#0F1E4D]/95 shadow-[0_0_24px_rgba(0,217,255,0.16)]'
            : 'border-slate-800/90 bg-[#0A1334]/90 hover:border-cyan-400/35 hover:bg-[#0C173E]'
        }`}
      >
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-bold text-white">
              {lang === 'bn' ? skill.titleBn : skill.titleEn}
            </span>
            <span
              className={`shrink-0 font-mono text-base font-bold tabular-nums ${
                hasScore ? 'text-white' : 'text-slate-500'
              }`}
            >
              {hasScore ? `${skill.scorePercent}%` : '—'}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
            <span className={`font-semibold ${style.textClass}`}>{style.label}</span>
            <span className="font-mono text-slate-400 tabular-nums">
              {skill.sampleSize} {lang === 'bn' ? 'নমুনা' : skill.sampleSize === 1 ? 'sample' : 'samples'}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#05091F]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${style.barClass}`}
              style={{
                width: hasScore
                  ? `${skill.scorePercent}%`
                  : `${Math.min(100, Math.round((skill.sampleSize / skill.minSamplesRequired) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-1.5 truncate text-[11px] text-slate-400">
            {hasScore
              ? lang === 'bn'
                ? skill.coverageLabelBn
                : skill.coverageLabelEn
              : lang === 'bn'
                ? 'পর্যাপ্ত মূল্যায়ন তথ্য নেই'
                : 'Not enough assessment data'}
          </p>
        </div>
      </button>
    );
  };

  return (
    <section
      aria-label={
        lang === 'bn'
          ? '৬টি মূল দক্ষতা এবং ৪টি সম্প্রসারিত মাত্রা'
          : 'Six core communication skills and four extended assessment dimensions'
      }
      className="space-y-5"
    >
      {/* 6 Core Communication Skills */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-portal text-base font-bold text-white">
              {lang === 'bn' ? '৬টি মূল যোগাযোগ দক্ষতা' : 'Six Core Communication Skills'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'bn'
                ? 'যেকোনো দক্ষতায় ক্লিক করে 3D নোড এবং বিস্তারিত প্রমাণ দেখুন।'
                : 'Select any core dimension to illuminate its neural node and inspect supporting evidence.'}
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {coreSkills.filter((s) => s.scorePercent !== null).length}/6{' '}
            {lang === 'bn' ? 'পরিমাপকৃত' : 'measured'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {coreSkills.map(renderCard)}
        </div>
      </div>

      {/* 4 Extended Assessment Dimensions */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-portal text-base font-bold text-white">
              {lang === 'bn' ? '৪টি সম্প্রসারিত মূল্যায়ন মাত্রা' : 'Extended Assessment Dimensions'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'bn'
                ? 'কার্যকর যোগাযোগ, বাক্যের জটিলতা, প্রেক্ষাপট ও অ্যাকোস্টিক উচ্চারণ নির্দেশক।'
                : 'Functional communication, sentence complexity, contextual appropriateness, and acoustic pronunciation indicators.'}
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {extendedSkills.filter((s) => s.scorePercent !== null).length}/4{' '}
            {lang === 'bn' ? 'পরিমাপকৃত' : 'measured'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {extendedSkills.map(renderCard)}
        </div>
      </div>
    </section>
  );
}
