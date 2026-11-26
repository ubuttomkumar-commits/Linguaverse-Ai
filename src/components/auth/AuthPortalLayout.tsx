import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  LogOut,
  MessageSquare,
  Mic,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { BrandLogoMark } from '../layout/PublicHeader';
import type { PortalVisualState } from './PortalFallbackVisual';
import {
  AuthSceneIllustrations,
  type AuthSceneVariant,
} from './AuthSceneIllustrations';

interface AuthPortalLayoutProps {
  sceneVariant?: AuthSceneVariant;
  portalState: PortalVisualState;
  portalHeadlineEn: string;
  portalHeadlineBn: string;
  portalDescriptionEn: string;
  portalDescriptionBn: string;
  portalHighlightEn?: string;
  portalHighlightBn?: string;
  showFeatureMedallions?: boolean;
  showCardBrandHeader?: boolean;
  onSignOut?: () => void;
  children: React.ReactNode;
}

const LOGIN_MEDALLIONS = [
  { id: 'learn', icon: BookOpen, labelEn: 'Learn', labelBn: 'শিখুন' },
  { id: 'speak', icon: Mic, labelEn: 'Speak', labelBn: 'বলুন' },
  { id: 'improve', icon: TrendingUp, labelEn: 'Improve', labelBn: 'উন্নতি' },
  { id: 'communicate', icon: MessageSquare, labelEn: 'Communicate', labelBn: 'যোগাযোগ' },
];

export function AuthPortalLayout({
  sceneVariant = 'login',
  portalState,
  portalHeadlineEn,
  portalHeadlineBn,
  portalDescriptionEn,
  portalDescriptionBn,
  portalHighlightEn,
  portalHighlightBn,
  showFeatureMedallions = false,
  showCardBrandHeader = true,
  onSignOut,
  children,
}: AuthPortalLayoutProps) {
  const { lang } = useLanguage();
  const prefersReduced = Boolean(useReducedMotion());
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleStageMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -ny * 7, ry: nx * 9 });
  };

  const handleStageLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[radial-gradient(ellipse_75%_52%_at_18%_22%,rgba(0,217,255,0.16),rgba(5,9,31,0)_62%),radial-gradient(ellipse_70%_55%_at_84%_20%,rgba(124,58,237,0.22),rgba(5,9,31,0)_66%),radial-gradient(ellipse_85%_40%_at_50%_98%,rgba(168,85,247,0.26),rgba(5,9,31,0)_70%),#04081D] text-slate-100">
      {/* Subtle Ambient Cosmic Floor Horizon Glow (Compositor-only, non-blocking) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-44 bg-[radial-gradient(ellipse_62%_75%_at_50%_100%,rgba(0,217,255,0.22),rgba(139,92,246,0.12)_48%,rgba(4,8,29,0)_78%)]"
      />

      {/* Minimal Top Navigation Bar */}
      <header className="relative z-20 border-b border-cyan-400/12 bg-[#04081D]/78 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex min-h-[40px] items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-[#00D9FF] whitespace-nowrap"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">
              {lang === 'bn' ? 'হোম পেজে ফিরুন' : 'Back to Home'}
            </span>
            <span className="sm:hidden">{lang === 'bn' ? 'হোম' : 'Home'}</span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold tracking-tight text-white whitespace-nowrap"
          >
            <BrandLogoMark size="sm" />
            <span className="font-portal text-[15px] font-bold tracking-[0.03em]">
              LINGUAVERSE <span className="text-[#00D9FF]">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-[#0B122C] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-[#00D9FF]/65 hover:text-white cursor-pointer whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {lang === 'bn' ? 'সাইন আউট' : 'Sign Out'}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Split-Screen (Desktop & Tablet) / Focused Single-Column (Mobile) */}
      <main className="relative z-10 mx-auto grid w-full max-w-[1220px] flex-1 grid-cols-1 items-center gap-6 px-4 py-6 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:gap-8 md:py-10 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12">
        {/* LEFT COLUMN (Desktop & Tablet): Reference-Matched 3D Holographic Visual Stage */}
        <section
          aria-label="LINGUAVERSE AI 3D visual showcase"
          onPointerMove={handleStageMove}
          onPointerLeave={handleStageLeave}
          className="relative hidden md:flex flex-col items-center justify-center px-2 py-4 text-center"
        >
          <div
            style={
              prefersReduced
                ? undefined
                : {
                    transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                    transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }
            }
            className="w-full"
          >
            <AuthSceneIllustrations variant={sceneVariant} portalState={portalState} />
          </div>

          {/* Left Visual Narrative matching Reference Image */}
          <div className="relative z-10 mt-2 max-w-[420px]">
            <h2 className="font-portal text-balance text-2xl font-bold tracking-tight text-white lg:text-[28px]">
              {lang === 'bn' ? portalHeadlineBn : portalHeadlineEn}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
              {lang === 'bn' ? portalDescriptionBn : portalDescriptionEn}
            </p>

            {/* 4 Luminous Circular Medallions on Login Screen (Learn, Speak, Improve, Communicate) */}
            {showFeatureMedallions && (
              <div className="mt-6 grid grid-cols-4 gap-3">
                {LOGIN_MEDALLIONS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="flex flex-col items-center gap-1.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/35 bg-[#0A1438]/85 text-[#7DD3FC] shadow-[0_0_20px_rgba(0,217,255,0.16)]">
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-300">
                        {lang === 'bn' ? item.labelBn : item.labelEn}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {!showFeatureMedallions && (portalHighlightEn || portalHighlightBn) && (
              <p className="mt-4 text-xs font-medium text-[#7DD3FC]">
                {lang === 'bn' ? portalHighlightBn : portalHighlightEn}
              </p>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Reference-Matched Luminous Rim Glass Auth Card */}
        <section className="mx-auto w-full max-w-[464px]">
          {/* Mobile-only compact 3D Illustration above form */}
          <div className="mb-4 flex flex-col items-center text-center md:hidden">
            <AuthSceneIllustrations variant={sceneVariant} portalState={portalState} compact />
            <h2 className="font-portal mt-1 text-lg font-bold tracking-tight text-white">
              {lang === 'bn' ? portalHeadlineBn : portalHeadlineEn}
            </h2>
          </div>

          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="lv-portal-panel rounded-[26px] p-6 sm:p-8"
          >
            {/* Signature In-Card LV Brand Lockup matching reference screens 01–05 */}
            {showCardBrandHeader && (
              <div className="mb-6 flex items-center justify-center gap-3">
                <BrandLogoMark size="md" />
                <div className="text-left leading-tight">
                  <p className="font-portal text-[16px] font-bold tracking-[0.04em] text-white">
                    LINGUAVERSE <span className="text-[#00D9FF]">AI</span>
                  </p>
                  <p className="text-[11.5px] font-medium text-slate-300/90">
                    {lang === 'bn' ? 'কমিউনিকেশন ইন্টেলিজেন্স' : 'Communication Intelligence'}
                  </p>
                </div>
              </div>
            )}

            {children}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
