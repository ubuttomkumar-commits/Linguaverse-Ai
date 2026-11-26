import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCms } from '../../context/CmsContext';
import { RevealSection } from './RevealSection';
import type { CmsHowItWorksStep } from '../../domain/cmsEngine';

const STEP_BADGE_STYLES: Record<CmsHowItWorksStep['accent'], string> = {
  cyan: 'from-[#00D9FF] to-[#087BFF] shadow-[0_0_22px_rgba(0,217,255,0.65)]',
  violet: 'from-[#A855F7] to-[#7C3AED] shadow-[0_0_22px_rgba(168,85,247,0.65)]',
  emerald: 'from-[#16E58B] to-[#059669] shadow-[0_0_22px_rgba(22,229,139,0.65)]',
};

function GraduationBooks3DIllustration() {
  return (
    <svg
      viewBox="0 0 210 185"
      className="mx-auto h-[168px] w-[196px] shrink-0 drop-shadow-[0_14px_30px_rgba(8,123,255,0.35)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lv-grad-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D9FF" />
          <stop offset="50%" stopColor="#873BFF" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <linearGradient id="lv-book-teal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="lv-book-blue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="lv-book-amber" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Luminous base platform glow */}
      <ellipse cx="105" cy="156" rx="84" ry="18" fill="rgba(0,217,255,0.16)" />
      <ellipse cx="105" cy="154" rx="72" ry="12" fill="none" stroke="url(#lv-grad-ring)" strokeWidth="2.2" opacity="0.85" />
      <ellipse cx="105" cy="108" rx="86" ry="26" fill="none" stroke="url(#lv-grad-ring)" strokeWidth="2" opacity="0.55" transform="rotate(-14 105 108)" />

      {/* Bottom Book (Teal) */}
      <rect x="44" y="128" width="120" height="22" rx="6" fill="url(#lv-book-teal)" stroke="#7dd3fc" strokeOpacity="0.45" />
      <rect x="52" y="133" width="102" height="12" rx="3" fill="#e0f2fe" opacity="0.85" />
      <rect x="44" y="128" width="16" height="22" rx="4" fill="#0369a1" />

      {/* Middle Book (Royal Blue) */}
      <rect x="50" y="106" width="112" height="22" rx="6" fill="url(#lv-book-blue)" stroke="#93c5fd" strokeOpacity="0.45" />
      <rect x="58" y="111" width="96" height="12" rx="3" fill="#eff6ff" opacity="0.86" />
      <rect x="50" y="106" width="16" height="22" rx="4" fill="#1e3a8a" />

      {/* Top Book (Warm Gold/Violet) */}
      <rect x="56" y="84" width="100" height="22" rx="6" fill="url(#lv-book-amber)" stroke="#fde68a" strokeOpacity="0.55" />
      <rect x="64" y="89" width="84" height="12" rx="3" fill="#fef3c7" opacity="0.88" />
      <rect x="56" y="84" width="15" height="22" rx="4" fill="#92400e" />

      {/* 3D Graduation Cap perched on top */}
      <path d="M74 68 C74 58 136 58 136 68 L136 82 C120 88 90 88 74 82 Z" fill="#1e293b" stroke="#60a5fa" strokeOpacity="0.4" />
      <polygon points="105,36 164,58 105,76 46,58" fill="#0f172a" stroke="#00D9FF" strokeWidth="1.6" />
      <polygon points="105,39 156,58 105,72 54,58" fill="#1e3a8a" opacity="0.55" />

      {/* Glowing Tassel */}
      <path d="M105 56 Q142 62 146 84" stroke="#FACC15" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="146" cy="87" r="4.5" fill="#FACC15" />

      {/* Sparkle particles */}
      <circle cx="32" cy="72" r="2.2" fill="#00D9FF" />
      <circle cx="176" cy="48" r="2.6" fill="#E42BFF" />
      <circle cx="172" cy="126" r="2" fill="#16E58B" />
    </svg>
  );
}

export function HowItWorksSection() {
  const { lang } = useLanguage();
  const { config } = useCms();
  const hiw = config.howItWorks;

  return (
    <RevealSection id="how-it-works" className="relative py-10 sm:py-14">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Centered Header matching reference */}
        <div className="text-center">
          <h2 className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-white sm:text-[34px]">
            {lang === 'bn' ? (
              <span className="bg-gradient-to-r from-[#00D9FF] via-[#60a5fa] to-[#E42BFF] bg-clip-text text-transparent">
                {hiw.titleBn}
              </span>
            ) : (
              <>
                <span className="text-white">{hiw.titlePrefixEn}</span>
                <span className="bg-gradient-to-r from-[#00D9FF] via-[#873BFF] to-[#E42BFF] bg-clip-text text-transparent">
                  {hiw.titleAccentEn}
                </span>
              </>
            )}
          </h2>
          <p className="mt-1.5 text-[15px] font-medium text-[#b9ccef]">
            {lang === 'bn' ? hiw.subtitleBn : hiw.subtitleEn}
          </p>
        </div>

        {/* 3-Zone Reference Row: Left Books | Center 3 Connected Cards | Right Learning Journey */}
        <div className="mt-8 grid grid-cols-1 items-center gap-6 lg:grid-cols-[0.82fr_2.2fr_0.86fr]">
          {/* Left: 3D Graduation Books Illustration */}
          <div className="flex justify-center">
            <GraduationBooks3DIllustration />
          </div>

          {/* Center: 3 Horizontally Connected Neon Step Cards */}
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3 md:gap-4">
            {hiw.steps.map((step, index) => (
              <div key={step.id} className="relative flex items-center">
                <div className="lv-glass-card lv-glow-card-hover relative flex h-full w-full flex-col items-center rounded-[20px] px-4 pb-5 pt-7 text-center">
                  {/* Floating Top Neon Number Badge */}
                  <span
                    className={`absolute -top-4 grid h-8.5 w-8.5 place-items-center rounded-xl bg-gradient-to-br text-[14px] font-extrabold text-white ${STEP_BADGE_STYLES[step.accent]}`}
                  >
                    {step.stepNumber}
                  </span>

                  <h3 className="font-display mt-1 text-[15.5px] font-bold text-white">
                    {lang === 'bn' ? step.titleBn : step.titleEn}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#a8bde0]">
                    {lang === 'bn' ? step.descriptionBn : step.descriptionEn}
                  </p>
                </div>

                {/* Connecting Neon Arrow on Desktop */}
                {index < hiw.steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden md:grid absolute -right-3.5 z-10 h-6 w-6 place-items-center rounded-full bg-[#05091F] text-[#7dd3fc]"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Right: Stylized "Your Learning Journey" Callout */}
          <div className="flex flex-col items-center text-center lg:items-center">
            <p className="font-display text-[26px] font-extrabold italic leading-[1.1] tracking-[-0.02em] text-white sm:text-[28px]">
              {lang === 'bn' ? (
                hiw.journeyTitleBn
              ) : (
                <>
                  {hiw.journeyTitleLine1En}
                  <br />
                  <span className="bg-gradient-to-r from-[#00D9FF] via-[#38bdf8] to-[#873BFF] bg-clip-text text-transparent">
                    {hiw.journeyTitleLine2En}
                  </span>
                </>
              )}
            </p>
            <p className="mt-2.5 max-w-[220px] text-[13px] leading-snug text-[#c5d6f4]">
              {lang === 'bn' ? hiw.journeySubtitleBn : hiw.journeySubtitleEn}
            </p>
            {/* Glowing Curved Underline */}
            <svg viewBox="0 0 180 14" className="mt-2.5 h-3.5 w-40" aria-hidden="true">
              <path
                d="M6 10 Q90 2 174 8"
                fill="none"
                stroke="url(#lv-grad-ring)"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
