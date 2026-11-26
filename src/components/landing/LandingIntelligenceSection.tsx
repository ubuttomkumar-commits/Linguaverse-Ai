import { Link } from 'react-router-dom';
import {
  BarChart3,
  BrainCircuit,
  Compass,
  Mic,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCms } from '../../context/CmsContext';
import { useAuth } from '../../context/AuthContext';
import { RevealSection } from './RevealSection';
import { TiltCard3D } from './MotionPrimitives';
import type { CmsFeatureIconKey, CmsFeatureItem } from '../../domain/cmsEngine';

const FEATURE_ICON_MAP: Record<CmsFeatureIconKey, typeof BrainCircuit> = {
  dna: BrainCircuit,
  mistake: Target,
  mic: Mic,
  transfer: Compass,
  progress: BarChart3,
  adaptive: Star,
  sparkles: Sparkles,
};

const ACCENT_MAP: Record<
  CmsFeatureItem['accent'],
  { iconColor: string; ringBg: string; shadow: string }
> = {
  violet: {
    iconColor: 'text-[#c084fc]',
    ringBg: 'border-[#a855f7]/45 bg-[#a855f7]/15',
    shadow: 'shadow-[0_0_24px_rgba(168,85,247,0.4)]',
  },
  magenta: {
    iconColor: 'text-[#f472b6]',
    ringBg: 'border-[#e42bff]/45 bg-[#e42bff]/15',
    shadow: 'shadow-[0_0_24px_rgba(228,43,255,0.4)]',
  },
  cyan: {
    iconColor: 'text-[#00D9FF]',
    ringBg: 'border-[#00D9FF]/45 bg-[#00D9FF]/15',
    shadow: 'shadow-[0_0_24px_rgba(0,217,255,0.4)]',
  },
  blue: {
    iconColor: 'text-[#60a5fa]',
    ringBg: 'border-[#087BFF]/45 bg-[#087BFF]/15',
    shadow: 'shadow-[0_0_24px_rgba(8,123,255,0.4)]',
  },
  emerald: {
    iconColor: 'text-[#16E58B]',
    ringBg: 'border-[#16E58B]/45 bg-[#16E58B]/15',
    shadow: 'shadow-[0_0_24px_rgba(22,229,139,0.4)]',
  },
  amber: {
    iconColor: 'text-[#fbbf24]',
    ringBg: 'border-[#fbbf24]/45 bg-[#fbbf24]/15',
    shadow: 'shadow-[0_0_24px_rgba(251,191,36,0.4)]',
  },
};

export function LandingIntelligenceSection() {
  const { lang } = useLanguage();
  const { config } = useCms();
  const { user } = useAuth();

  const enabledFeatures = [...config.features]
    .filter((f) => f.enabled)
    .sort((a, b) => a.order - b.order);

  if (enabledFeatures.length === 0) return null;

  return (
    <RevealSection id="features" className="py-8 sm:py-12">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Reference Section Header with Glowing Diamond Mark */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#00D9FF]/25 to-[#087BFF]/25 text-[#00D9FF] shadow-[0_0_18px_rgba(0,217,255,0.45)]"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
              <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
            </svg>
          </span>
          <h2 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-white sm:text-[26px]">
            {lang === 'bn' ? 'ছয়টি শক্তিশালী ফিচার' : 'Six Powerful Features'}
          </h2>
        </div>

        {/* Reference 6-Card Horizontal Row on Desktop */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {enabledFeatures.map((feature) => {
            const Icon = FEATURE_ICON_MAP[feature.iconKey] ?? Sparkles;
            const accent = ACCENT_MAP[feature.accent] ?? ACCENT_MAP.cyan;
            const destination = user ? feature.targetRoute : '/register';

            return (
              <TiltCard3D
                key={feature.id}
                className="h-full"
                glowAccent={
                  feature.accent === 'magenta'
                    ? 'magenta'
                    : feature.accent === 'violet'
                      ? 'violet'
                      : feature.accent === 'blue'
                        ? 'blue'
                        : 'cyan'
                }
              >
                <Link
                  to={destination}
                  className="lv-glass-card lv-glow-card-hover group flex h-full flex-col items-center rounded-[20px] px-4 py-6 text-center"
                >
                  <span
                    className={`grid h-13 w-13 place-items-center rounded-2xl border transition-transform duration-200 group-hover:scale-110 ${accent.ringBg} ${accent.iconColor} ${accent.shadow}`}
                  >
                    <Icon className="h-6.5 w-6.5" aria-hidden="true" />
                  </span>

                  <h3 className="font-display mt-4 text-[15px] font-bold leading-snug text-white">
                    {lang === 'bn' ? feature.titleBn : feature.titleEn}
                  </h3>

                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#a8bde0]">
                    {lang === 'bn' ? feature.summaryBn : feature.summaryEn}
                  </p>
                </Link>
              </TiltCard3D>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}
