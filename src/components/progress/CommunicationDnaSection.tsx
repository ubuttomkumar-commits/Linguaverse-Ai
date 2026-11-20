import { AlertCircle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type {
  CommunicationDnaDimension,
  CommunicationDnaProfile,
  DataCoverageTier,
} from '../../domain/communicationDnaEngine';

interface CommunicationDnaSectionProps {
  profile: CommunicationDnaProfile;
}

function coverageStyle(tier: DataCoverageTier): {
  textClass: string;
  barClass: string;
  Icon: typeof ShieldCheck;
} {
  if (tier === 'verified') {
    return {
      textClass: 'text-emerald-400',
      barClass: 'bg-emerald-500',
      Icon: CheckCircle2,
    };
  }
  if (tier === 'low_confidence') {
    return {
      textClass: 'text-[#F59E0B]',
      barClass: 'bg-[#3B82F6]',
      Icon: AlertCircle,
    };
  }
  return {
    textClass: 'text-slate-400',
    barClass: 'bg-slate-700',
    Icon: Clock,
  };
}

export function CommunicationDnaSection({ profile }: CommunicationDnaSectionProps) {
  const { lang } = useLanguage();

  const formatDate = (iso: string | null) => {
    if (!iso) return lang === 'bn' ? 'এখনো হালনাগাদ হয়নি' : 'Not yet measured';
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <section
      aria-label="Communication DNA Profile"
      className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <p className="font-mono text-xs text-[#8B5CF6]">
            {lang === 'bn'
              ? 'Communication DNA · ৫টি পৃথক দক্ষতার মাত্রা'
              : 'Communication DNA · 5 Independent Skill Dimensions'}
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">
            {lang === 'bn'
              ? 'প্রমাণভিত্তিক যোগাযোগ প্রোফাইল'
              : 'Evidence-Based Communication DNA Profile'}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            {lang === 'bn'
              ? 'প্রতিটি দক্ষতা আলাদাভাবে পরিমাপ করা হয় — কখনো একটি ভুয়া সামগ্রিক স্কোরে মিলিয়ে ফেলা হয় না। ন্যূনতম ৩টি বাস্তব নমুনা ছাড়া কোনো স্কোর দেখানো হয় না।'
              : 'Each dimension is tracked independently and never collapsed into one fake overall score. A measured score is only shown once at least 3 real samples exist.'}
          </p>
        </div>

        <div className="text-left sm:text-right font-mono text-xs tabular-nums text-slate-400">
          <p className="font-semibold text-white">
            {lang === 'bn'
              ? `${profile.measuredCount} / ${profile.totalDimensions} মাত্রা পরিমাপকৃত`
              : `${profile.measuredCount} / ${profile.totalDimensions} dimensions measured`}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {lang === 'bn' ? 'সর্বশেষ হালনাগাদ: ' : 'Last updated: '}
            {formatDate(profile.lastUpdatedAt)}
          </p>
        </div>
      </div>

      {/* 5 Independent Dimension Rows */}
      <div className="mt-5 divide-y divide-slate-800/80">
        {profile.dimensions.map((dim: CommunicationDnaDimension) => {
          const { textClass, barClass, Icon } = coverageStyle(dim.coverage);
          const hasScore = dim.scorePercent !== null;

          return (
            <div key={dim.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'bn' ? dim.titleBn : dim.titleEn}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                    <span>{lang === 'bn' ? dim.sampleBreakdownBn : dim.sampleBreakdownEn}</span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className={`inline-flex items-center gap-1 font-semibold ${textClass}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{lang === 'bn' ? dim.coverageLabelBn : dim.coverageLabelEn}</span>
                    </span>
                  </div>
                </div>

                {/* Measured Score or Honest Insufficient Data Marker */}
                <div className="text-right font-mono tabular-nums">
                  {hasScore ? (
                    <span className="text-xl font-bold text-white">{dim.scorePercent}%</span>
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">
                      {lang === 'bn'
                        ? `— (${dim.sampleSize}/৩ নমুনা)`
                        : `— (${dim.sampleSize}/3 samples)`}
                    </span>
                  )}
                </div>
              </div>

              {/* Clean Progress Bar Track */}
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#0A0F1C]"
                role="progressbar"
                aria-label={lang === 'bn' ? dim.titleBn : dim.titleEn}
                aria-valuenow={hasScore ? dim.scorePercent! : 0}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {hasScore ? (
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barClass}`}
                    style={{ width: `${dim.scorePercent}%` }}
                  />
                ) : (
                  <div
                    className="h-full rounded-full bg-slate-800"
                    style={{ width: `${Math.min(100, Math.round((dim.sampleSize / 3) * 100))}%` }}
                  />
                )}
              </div>

              {/* Footer Metadata: Last Updated + Evidence Note */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>{lang === 'bn' ? dim.evidenceNoteBn : dim.evidenceNoteEn}</span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {lang === 'bn' ? 'হালনাগাদ: ' : 'Updated: '}
                  {formatDate(dim.lastUpdatedAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
