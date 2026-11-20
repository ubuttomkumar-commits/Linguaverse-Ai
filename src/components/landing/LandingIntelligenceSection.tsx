import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowUpRight,
  BarChart3,
  Brain,
  ChevronDown,
  Compass,
  Dna,
  Mic,
  SlidersHorizontal,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { resolveLandingRoutes } from '../../domain/suppliedLandingCopy';
import {
  LANDING_3D_CONTENT,
  type FeatureCard3DItem,
} from '../../domain/landing3dContent';
import { RevealSection } from './RevealSection';
import { TiltCard3D } from './MotionPrimitives';

const FEATURE_ICONS: Record<
  FeatureCard3DItem['id'],
  React.ComponentType<{ className?: string }>
> = {
  communication_dna: Dna,
  mistake_memory: Brain,
  speaking_studio: Mic,
  transfer_lab: Compass,
  evidence_progress: BarChart3,
  adaptive_learning: SlidersHorizontal,
};

const ACCENT_TEXT: Record<FeatureCard3DItem['accent'], string> = {
  cyan: 'text-[#38bdf8]',
  blue: 'text-[#60a5fa]',
  violet: 'text-[#a78bfa]',
  magenta: 'text-[#e879f9]',
};

const ACCENT_ICON_BORDER: Record<FeatureCard3DItem['accent'], string> = {
  cyan: 'border-[#38bdf8]/35 bg-[#08192e] text-[#38bdf8]',
  blue: 'border-[#4f8bff]/35 bg-[#0b1834] text-[#60a5fa]',
  violet: 'border-[#8b6dff]/35 bg-[#151335] text-[#a78bfa]',
  magenta: 'border-[#d946ef]/35 bg-[#221032] text-[#e879f9]',
};

export function LandingIntelligenceSection() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const prefersReduced = useReducedMotion();
  const features = LANDING_3D_CONTENT[lang].features3D;
  const routes = resolveLandingRoutes(user, profile);

  const [expandedId, setExpandedId] = useState<string | null>('communication_dna');

  const resolveSystemTarget = (
    key: FeatureCard3DItem['routeKey']
  ): { isRoute: boolean; to: string } => {
    switch (key) {
      case 'improve':
        return routes.isSignedIn
          ? { isRoute: true, to: routes.improveRoute }
          : { isRoute: false, to: '#live-demo' };
      case 'speaking':
        return routes.isSignedIn
          ? { isRoute: true, to: routes.speakingRoute }
          : { isRoute: false, to: '#speaking' };
      case 'transfer':
        return routes.isSignedIn
          ? { isRoute: true, to: routes.transferLabRoute }
          : { isRoute: false, to: '#scenarios' };
      case 'progress':
        return routes.isSignedIn
          ? { isRoute: true, to: routes.progressRoute }
          : { isRoute: false, to: '#improvement-loop' };
      case 'demo':
      default:
        return { isRoute: false, to: '#live-demo' };
    }
  };

  return (
    <section
      id="intelligence"
      className="border-t border-[#b0c8ff]/[0.08] bg-[#080f20] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <RevealSection>
          <div className="max-w-2xl">
            <p className="text-[13px] font-semibold text-[#38bdf8]">
              {features.kicker}
            </p>
            <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
              {features.title}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
              {features.lead}
            </p>
          </div>

          {/* Six Interactive 3D Feature Cards */}
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.items.map((item) => {
              const Icon = FEATURE_ICONS[item.id];
              const target = resolveSystemTarget(item.routeKey);
              const isOpen = expandedId === item.id;

              return (
                <TiltCard3D
                  key={item.id}
                  glowAccent={item.accent}
                  className="flex flex-col justify-between rounded-[22px] border border-[#b0c8ff]/[0.14] bg-gradient-to-b from-[#101a33] to-[#0b1224] p-6 sm:p-7"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[12px] font-medium text-[#8ba5d3]">
                          <span
                            className={`font-mono tabular-nums font-semibold ${ACCENT_TEXT[item.accent]}`}
                          >
                            {item.number}
                          </span>
                          <span aria-hidden="true" className="mx-2 text-[#4e6288]">
                            ·
                          </span>
                          <span>{item.statusNote}</span>
                        </p>
                        <h3 className="font-display mt-2 text-[20px] font-bold tracking-tight text-[#f3f6ff]">
                          {item.title}
                        </h3>
                      </div>
                      <span
                        aria-hidden="true"
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border shadow-[0_8px_20px_rgba(0,0,0,0.38)] ${ACCENT_ICON_BORDER[item.accent]}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>

                    <dl className="mt-5 space-y-3 text-[13.5px] leading-relaxed">
                      <div>
                        <dt className="text-[11.5px] font-semibold text-[#8c9fc2]">
                          {features.problemLabel}
                        </dt>
                        <dd className="mt-0.5 text-[#c7d4ec]">{item.problemSolved}</dd>
                      </div>
                      <div>
                        <dt className="text-[11.5px] font-semibold text-[#8c9fc2]">
                          {features.howLabel}
                        </dt>
                        <dd className="mt-0.5 text-[#dce5f7]">{item.howItWorks}</dd>
                      </div>
                      <div>
                        <dt className="text-[11.5px] font-semibold text-[#34d399]">
                          {features.gainLabel}
                        </dt>
                        <dd className="mt-0.5 text-[#edf3ff]">{item.userGain}</dd>
                      </div>
                    </dl>

                    {/* Interactive Expandable Preview Drawer */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 rounded-[14px] border border-[#b0c8ff]/[0.14] bg-[#070d1d] p-3.5 text-[12px]">
                            <p className={`font-semibold ${ACCENT_TEXT[item.accent]}`}>
                              {item.previewTitle}
                            </p>
                            <div className="mt-2 space-y-1.5">
                              {item.previewRows.map((row) => (
                                <div key={row.label} className="leading-snug">
                                  <span className="text-[#8a9ec2]">{row.label}: </span>
                                  <span className="text-[#e6eeff]">{row.value}</span>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 border-t border-[#b0c8ff]/[0.08] pt-2 text-[11px] text-[#7f93b8]">
                              {item.previewNote}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#b0c8ff]/[0.1] pt-4">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setExpandedId((prev) => (prev === item.id ? null : item.id))
                      }
                      className="inline-flex min-h-[34px] cursor-pointer items-center gap-1 text-[12.5px] font-semibold text-[#b8c8e6] transition-colors hover:text-white"
                    >
                      <span>
                        {isOpen ? features.togglePreviewClose : features.togglePreviewOpen}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#38bdf8]' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {target.isRoute ? (
                      <Link
                        to={target.to}
                        className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#7bb0ff] transition-colors hover:text-white"
                      >
                        <span>{features.actionLabel}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ) : (
                      <a
                        href={target.to}
                        className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#7bb0ff] transition-colors hover:text-white"
                      >
                        <span>{features.actionLabel}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </TiltCard3D>
              );
            })}
          </div>
        </RevealSection>
      </div>
    </section>
  );
}
