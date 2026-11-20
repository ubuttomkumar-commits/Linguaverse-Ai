import { CheckCircle2, Clock, Sparkles } from 'lucide-react';
import {
  normalizePressureLevel,
  PRESSURE_LADDER_TIERS,
} from '../../domain/pressureLadder';
import { useLanguage } from '../../i18n/LanguageContext';
import type { PressureLadderLevelId, SpeakingPressureLevel } from '../../types/domain';

interface PressureLadderSelectorProps {
  value: SpeakingPressureLevel;
  onChange: (level: PressureLadderLevelId) => void;
  context: 'speaking' | 'transfer';
  passedLevels?: PressureLadderLevelId[];
  recommendedLevel?: PressureLadderLevelId;
  disabled?: boolean;
}

export function PressureLadderSelector({
  value,
  onChange,
  context,
  passedLevels = [],
  recommendedLevel,
  disabled = false,
}: PressureLadderSelectorProps) {
  const { lang } = useLanguage();
  const normalizedSelected = normalizePressureLevel(value);

  return (
    <div
      role="radiogroup"
      aria-label={
        lang === 'bn'
          ? '৫-স্তরের প্রেসার ল্যাডার (Pressure Ladder)'
          : '5-Level Pressure Ladder'
      }
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {PRESSURE_LADDER_TIERS.map((tier) => {
        const selected = normalizedSelected === tier.id;
        const isPassed = passedLevels.includes(tier.id);
        const isRecommended = recommendedLevel === tier.id;
        const timeLimit =
          context === 'transfer'
            ? tier.transferTimeLimitSeconds
            : tier.speakingTimeLimitSeconds;

        const ruleLabelEn = tier.showTemplates
          ? 'Templates'
          : tier.showBulletCues
            ? 'Bullet Cues'
            : tier.introducesTwist
              ? 'AI Twist'
              : timeLimit
                ? `${timeLimit}s Timer`
                : 'No Hints';

        const ruleLabelBn = tier.showTemplates
          ? 'টেমপ্লেটসহ'
          : tier.showBulletCues
            ? 'বুলেট কিউ'
            : tier.introducesTwist
              ? 'AI টুইস্ট'
              : timeLimit
                ? `${timeLimit}s টাইমার`
                : 'হিন্ট ছাড়া';

        return (
          <button
            key={tier.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(tier.id)}
            className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/15'
                : 'border-slate-800 bg-[#0A0F1C] hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-mono font-semibold text-[#8B5CF6] tabular-nums">
                  {lang === 'bn' ? tier.shortLabelBn : tier.shortLabelEn}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  {tier.introducesTwist && (
                    <Sparkles className="h-3 w-3 text-[#F59E0B]" aria-hidden="true" />
                  )}
                  {timeLimit !== null && (
                    <Clock className="h-3 w-3 text-[#F59E0B]" aria-hidden="true" />
                  )}
                  <span>{lang === 'bn' ? ruleLabelBn : ruleLabelEn}</span>
                </span>
              </div>

              <h3 className="mt-1.5 text-xs font-bold leading-snug text-white sm:text-sm">
                {lang === 'bn' ? tier.titleBn : tier.titleEn}
              </h3>

              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                {lang === 'bn' ? tier.descBn : tier.descEn}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-800/80 pt-2 text-[11px]">
              {context === 'transfer' ? (
                <span className="font-mono text-[#F59E0B] tabular-nums">
                  +{tier.transferXpReward} XP
                </span>
              ) : (
                <span className="font-mono text-slate-500 tabular-nums">
                  {lang === 'bn' ? `ধাপ ০${tier.levelNumber}` : `Tier 0${tier.levelNumber}`}
                </span>
              )}

              {isPassed ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'উত্তীর্ণ' : 'Passed'}</span>
                </span>
              ) : isRecommended ? (
                <span className="font-medium text-[#3B82F6]">
                  {lang === 'bn' ? 'সুপারিশকৃত' : 'Recommended'}
                </span>
              ) : selected ? (
                <span className="font-medium text-violet-300">
                  {lang === 'bn' ? 'নির্বাচিত' : 'Selected'}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
