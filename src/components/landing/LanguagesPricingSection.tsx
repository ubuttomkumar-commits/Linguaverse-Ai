import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Crown,
  Globe,
  Info,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCms } from '../../context/CmsContext';
import { RevealSection } from './RevealSection';
import {
  requestSubscriptionIntent,
  type SubscriptionIntentResponse,
} from '../../services/cmsApi';
import type { CmsLanguageItem } from '../../domain/cmsEngine';

function FlagCircleSvg({ flagKey }: { flagKey: CmsLanguageItem['flagKey'] }) {
  switch (flagKey) {
    case 'en':
      return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 rounded-full shadow-md" aria-hidden="true">
          <clipPath id="flag-en"><circle cx="18" cy="18" r="18" /></clipPath>
          <g clipPath="url(#flag-en)">
            <rect width="36" height="36" fill="#012169" />
            <path d="M0 0L36 36M36 0L0 36" stroke="#fff" strokeWidth="6" />
            <path d="M0 0L36 36M36 0L0 36" stroke="#C8102E" strokeWidth="3" />
            <path d="M18 0V36M0 18H36" stroke="#fff" strokeWidth="9" />
            <path d="M18 0V36M0 18H36" stroke="#C8102E" strokeWidth="5.5" />
          </g>
        </svg>
      );
    case 'bn':
      return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 rounded-full shadow-md" aria-hidden="true">
          <circle cx="18" cy="18" r="18" fill="#006A4E" />
          <circle cx="16.5" cy="18" r="7.2" fill="#F42A41" />
        </svg>
      );
    case 'es':
      return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 rounded-full shadow-md" aria-hidden="true">
          <clipPath id="flag-es"><circle cx="18" cy="18" r="18" /></clipPath>
          <g clipPath="url(#flag-es)">
            <rect width="36" height="9" fill="#AA151B" />
            <rect y="9" width="36" height="18" fill="#F1BF00" />
            <rect y="27" width="36" height="9" fill="#AA151B" />
          </g>
        </svg>
      );
    case 'fr':
      return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 rounded-full shadow-md" aria-hidden="true">
          <clipPath id="flag-fr"><circle cx="18" cy="18" r="18" /></clipPath>
          <g clipPath="url(#flag-fr)">
            <rect width="12" height="36" fill="#0055A4" />
            <rect x="12" width="12" height="36" fill="#FFFFFF" />
            <rect x="24" width="12" height="36" fill="#EF4135" />
          </g>
        </svg>
      );
    case 'de':
      return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 rounded-full shadow-md" aria-hidden="true">
          <clipPath id="flag-de"><circle cx="18" cy="18" r="18" /></clipPath>
          <g clipPath="url(#flag-de)">
            <rect width="36" height="12" fill="#111827" />
            <rect y="12" width="36" height="12" fill="#DD0000" />
            <rect y="24" width="36" height="12" fill="#FFCE00" />
          </g>
        </svg>
      );
    case 'ja':
      return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 rounded-full shadow-md" aria-hidden="true">
          <circle cx="18" cy="18" r="18" fill="#FFFFFF" />
          <circle cx="18" cy="18" r="7.5" fill="#BC002D" />
        </svg>
      );
    case 'ko':
      return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 rounded-full shadow-md" aria-hidden="true">
          <circle cx="18" cy="18" r="18" fill="#FFFFFF" />
          <path d="M18 10 A8 8 0 0 1 18 26 A4 4 0 0 1 18 18 A4 4 0 0 0 18 10 Z" fill="#CD2E3A" />
          <path d="M18 26 A8 8 0 0 1 18 10 A4 4 0 0 1 18 18 A4 4 0 0 0 18 26 Z" fill="#0047A0" />
        </svg>
      );
    default:
      return (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#087BFF]/25 text-[#00D9FF]">
          <Globe className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
      );
  }
}

function GlowingDiamondSvg() {
  return (
    <svg
      viewBox="0 0 96 86"
      className="h-[74px] w-[82px] shrink-0 drop-shadow-[0_0_24px_rgba(0,217,255,0.6)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lv-dia-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="lv-dia-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#087BFF" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      <polygon points="24,10 72,10 88,32 48,78 8,32" fill="url(#lv-dia-body)" stroke="#7dd3fc" strokeWidth="1.5" />
      <polygon points="24,10 72,10 88,32 8,32" fill="url(#lv-dia-top)" opacity="0.9" />
      <polygon points="48,10 64,32 48,78 32,32" fill="#e0f2fe" opacity="0.34" />
      <line x1="8" y1="32" x2="88" y2="32" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.2" />
    </svg>
  );
}

const COMPARISON_ROWS = [
  {
    featureEn: 'Structured Bangla-Aware Lessons',
    featureBn: 'বাংলাভাষীদের জন্য কাঠামোগত লেসন',
    free: 'Foundations',
    premium: 'Full Catalog',
  },
  {
    featureEn: 'Voice-First AI Speaking Studio',
    featureBn: 'ভয়েস-ফার্স্ট AI স্পিকিং স্টুডিও',
    free: 'Starter Daily Quota',
    premium: 'Unlimited (Fair-Use*)',
  },
  {
    featureEn: 'Mistake Memory & Repair Drills',
    featureBn: 'মিস্টেক মেমোরি ও সংশোধন ড্রিল',
    free: 'Core Patterns',
    premium: 'Deep Pattern Analytics',
  },
  {
    featureEn: 'Transfer Lab Real-Life Scenarios',
    featureBn: 'বাস্তব জীবনের ট্রান্সফার ল্যাব',
    free: 'Sample Scenarios',
    premium: 'All Interview & Work Labs',
  },
  {
    featureEn: 'Privacy & Audio Purge Controls',
    featureBn: 'প্রাইভেসি ও অডিও ডিলিট নিয়ন্ত্রণ',
    free: 'Included',
    premium: 'Included',
  },
];

export function LanguagesPricingSection() {
  const { lang } = useLanguage();
  const { config, trackEvent } = useCms();
  const prefersReduced = useReducedMotion();

  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [showLanguageMatrix, setShowLanguageMatrix] = useState(false);
  const [showAllPlansTable, setShowAllPlansTable] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    loading: boolean;
    response: SubscriptionIntentResponse | null;
  }>({ open: false, loading: false, response: null });

  const enabledLanguages = useMemo(
    () =>
      [...config.languages]
        .filter((l) => l.enabled)
        .sort((a, b) => a.order - b.order),
    [config.languages]
  );

  const enabledPlans = useMemo(
    () =>
      [...config.pricingPlans]
        .filter((p) => p.enabled)
        .sort((a, b) => a.order - b.order),
    [config.pricingPlans]
  );

  const freePlan = enabledPlans.find((p) => p.slug === 'free') ?? enabledPlans[0];
  const premiumPlan = enabledPlans.find((p) => p.slug === 'premium') ?? enabledPlans[1];

  const handleUpgradeClick = async (planSlug: string) => {
    trackEvent('pricing_click', { planSlug, billingInterval });
    setUpgradeModal({ open: true, loading: true, response: null });
    const res = await requestSubscriptionIntent({ planSlug, billingInterval });
    setUpgradeModal({ open: true, loading: false, response: res });
  };

  return (
    <RevealSection id="pricing" className="py-8 sm:py-12">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* Subtle Billing Interval Switcher aligned over Pricing */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] font-medium text-[#9eb4dc]">
            {lang === 'bn'
              ? 'ইংরেজি ও বাংলা এখন লাইভ — অতিরিক্ত ভাষা রোডম্যাপে যুক্ত রয়েছে।'
              : 'English & বাংলা are Live today — additional languages are honestly marked Coming Soon.'}
          </p>
          <div
            role="group"
            aria-label="Billing interval toggle"
            className="inline-flex items-center rounded-full border border-[#60a5fa]/30 bg-[#081236]/90 p-1 text-[12px] font-semibold"
          >
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              aria-pressed={billingInterval === 'monthly'}
              className={`rounded-full px-3.5 py-1 transition-colors cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-[#087BFF] text-white shadow-[0_0_14px_rgba(8,123,255,0.5)]'
                  : 'text-[#a8bde0] hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'মাসিক' : 'Monthly'}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('yearly')}
              aria-pressed={billingInterval === 'yearly'}
              className={`rounded-full px-3.5 py-1 transition-colors cursor-pointer ${
                billingInterval === 'yearly'
                  ? 'bg-[#873BFF] text-white shadow-[0_0_14px_rgba(135,59,255,0.5)]'
                  : 'text-[#a8bde0] hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'বাৎসরিক (-২০%)' : 'Yearly (Save 20%)'}
            </button>
          </div>
        </div>

        {/* Reference 4-Panel Bento Row: Supported Languages | Free Plan | Premium Plan | Flexible Pricing */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.52fr_0.92fr_1.04fr_0.96fr]">
          {/* PANEL 1: Supported Languages */}
          <div
            id="languages"
            className="lv-glass-card flex flex-col justify-between rounded-[22px] p-5"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#087BFF]/25 text-[#00D9FF]">
                    <Globe className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="font-display text-[17px] font-extrabold text-white">
                    {lang === 'bn' ? 'সমর্থিত ভাষাসমূহ' : 'Supported Languages'}
                  </h2>
                </div>
                <span className="rounded-full border border-[#16E58B]/35 bg-[#16E58B]/12 px-2 py-0.5 text-[10px] font-bold text-[#16E58B]">
                  {enabledLanguages.filter((l) => l.status === 'live').length} Live
                </span>
              </div>

              {/* Flag Icons Row matching reference */}
              <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-4">
                {enabledLanguages.slice(0, 7).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShowLanguageMatrix(true)}
                    className="group flex flex-col items-center text-center cursor-pointer"
                    title={
                      item.status === 'live'
                        ? `${item.name} — Live now`
                        : `${item.name} — Coming Soon`
                    }
                  >
                    <div className="relative transition-transform duration-150 group-hover:scale-110">
                      <FlagCircleSvg flagKey={item.flagKey} />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#05091F] ${
                          item.status === 'live' ? 'bg-[#16E58B]' : 'bg-amber-400/90'
                        }`}
                      />
                    </div>
                    <span className="mt-1.5 text-[11.5px] font-semibold text-[#e6efff]">
                      {item.nativeLabel}
                    </span>
                    <span
                      className={`text-[9.5px] font-medium ${
                        item.status === 'live' ? 'text-[#16E58B]' : 'text-[#90a7d0]'
                      }`}
                    >
                      {item.status === 'live'
                        ? lang === 'bn'
                          ? 'লাইভ'
                          : 'Live'
                        : lang === 'bn'
                          ? 'শীঘ্রই'
                          : 'Soon'}
                    </span>
                  </button>
                ))}

                {/* "+ and more..." button matching reference */}
                <button
                  type="button"
                  onClick={() => setShowLanguageMatrix((prev) => !prev)}
                  className="group flex flex-col items-center text-center cursor-pointer"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[#873BFF]/55 bg-[#873BFF]/25 text-white shadow-[0_0_16px_rgba(135,59,255,0.45)] transition-transform duration-150 group-hover:scale-110">
                    <Plus className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 text-[11.5px] font-semibold text-[#c4b5fd]">
                    {lang === 'bn' ? 'আরও ভাষা...' : 'and more...'}
                  </span>
                  <span className="text-[9.5px] text-[#90a7d0]">
                    {showLanguageMatrix ? 'Hide' : 'Roadmap'}
                  </span>
                </button>
              </div>
            </div>

            <p className="mt-4 border-t border-[#60a5fa]/15 pt-3 text-[11px] leading-relaxed text-[#95add6]">
              {lang === 'bn'
                ? 'সবুজ বিন্দু = বর্তমানে চালু (EN + বাংলা)। হলুদ বিন্দু = রোডম্যাপে পরিকল্পিত ভাষা (অ্যাডমিন CMS থেকে নিয়ন্ত্রিত)।'
                : 'Green dot = Active today (English + বাংলা). Amber dot = Planned roadmap languages managed via Admin CMS.'}
            </p>
          </div>

          {/* PANEL 2: Free Plan */}
          {freePlan && (
            <div className="lv-glass-card flex flex-col justify-between rounded-[22px] p-5">
              <div>
                <h3 className="font-display text-[17px] font-extrabold text-white">
                  {lang === 'bn' ? freePlan.nameBn : freePlan.nameEn}
                </h3>
                <p className="mt-1 text-[12px] text-[#9eb4dc]">
                  {lang === 'bn' ? freePlan.taglineBn : freePlan.taglineEn}
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-[34px] font-extrabold leading-none text-white tabular-nums">
                    {freePlan.currency}
                    {freePlan.monthlyPrice}
                  </span>
                  <span className="text-[12.5px] font-medium text-[#9eb4dc]">
                    {lang === 'bn' ? freePlan.billingLabelBn : freePlan.billingLabelEn}
                  </span>
                </div>

                <ul className="mt-4 space-y-2.5 text-[12.5px] text-[#dce7fc]">
                  {(lang === 'bn' ? freePlan.featuresBn : freePlan.featuresEn).map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16E58B]"
                        aria-hidden="true"
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/register?plan=free"
                onClick={() => trackEvent('pricing_click', { planSlug: 'free' })}
                className="mt-6 inline-flex min-h-[40px] w-full items-center justify-center rounded-full border border-[#60a5fa]/40 bg-[#0A1742]/90 px-4 py-2 text-[13px] font-bold text-white transition-all hover:border-[#00D9FF] hover:bg-[#087BFF]/25"
              >
                {lang === 'bn' ? freePlan.ctaLabelBn : freePlan.ctaLabelEn}
              </Link>
            </div>
          )}

          {/* PANEL 3: Premium Plan (Most Popular Glowing Neon Card) */}
          {premiumPlan && (
            <div className="lv-glow-border-premium relative rounded-[23px]">
              {premiumPlan.isPopular && (
                <span className="absolute -top-3 right-4 z-10 rounded-full bg-gradient-to-r from-[#FACC15] to-[#F59E0B] px-3 py-0.5 text-[11px] font-extrabold text-[#05091F] shadow-[0_0_16px_rgba(250,204,21,0.55)]">
                  {lang === 'bn' ? premiumPlan.popularBadgeBn : premiumPlan.popularBadgeEn}
                </span>
              )}

              <div className="flex h-full flex-col justify-between rounded-[21.5px] bg-[linear-gradient(155deg,#102263_0%,#09123B_65%,#191246_100%)] p-5">
                <div>
                  <h3 className="font-display text-[17px] font-extrabold text-white">
                    {lang === 'bn' ? premiumPlan.nameBn : premiumPlan.nameEn}
                  </h3>
                  <p className="mt-1 text-[12px] text-[#b4c7ea]">
                    {lang === 'bn' ? premiumPlan.taglineBn : premiumPlan.taglineEn}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-[34px] font-extrabold leading-none text-white tabular-nums">
                      {premiumPlan.currency}
                      {billingInterval === 'yearly'
                        ? premiumPlan.yearlyMonthlyPrice.toFixed(2)
                        : premiumPlan.monthlyPrice.toFixed(2)}
                    </span>
                    <span className="text-[12.5px] font-medium text-[#b4c7ea]">
                      {lang === 'bn' ? premiumPlan.billingLabelBn : premiumPlan.billingLabelEn}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-[12.5px] text-[#edf4ff]">
                    {(lang === 'bn' ? premiumPlan.featuresBn : premiumPlan.featuresEn).map(
                      (feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16E58B]"
                            aria-hidden="true"
                          />
                          <span>{feat}</span>
                        </li>
                      )
                    )}
                  </ul>

                  {(premiumPlan.fairUseNoteEn || premiumPlan.fairUseNoteBn) && (
                    <p className="mt-3 text-[10.5px] leading-snug text-[#9cb2dc]">
                      {lang === 'bn' ? premiumPlan.fairUseNoteBn : premiumPlan.fairUseNoteEn}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleUpgradeClick(premiumPlan.slug)}
                  className="lv-glow-cta mt-5 inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold text-white cursor-pointer"
                >
                  <span>
                    {lang === 'bn' ? premiumPlan.ctaLabelBn : premiumPlan.ctaLabelEn}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* PANEL 4: Flexible Pricing for Every Learner (Crown + 3D Diamond) */}
          <div className="relative overflow-hidden rounded-[22px] border border-[#873BFF]/45 bg-[linear-gradient(155deg,rgba(49,29,122,0.78)_0%,rgba(13,22,68,0.92)_100%)] p-5 shadow-[0_22px_54px_rgba(4,8,30,0.75)]">
            <div className="flex h-full flex-col justify-between">
              <div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#FACC15]/15 text-[#FACC15] shadow-[0_0_16px_rgba(250,204,21,0.35)]">
                  <Crown className="h-4.5 w-4.5" aria-hidden="true" />
                </span>

                <h3 className="font-display mt-3 text-[17.5px] font-extrabold leading-snug text-white">
                  {lang === 'bn'
                    ? 'প্রত্যেক শিক্ষার্থীর জন্য নমনীয় প্রাইসিং'
                    : 'Flexible Pricing for Every Learner'}
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#c6d6f5]">
                  {lang === 'bn'
                    ? 'বিনামূল্যে শুরু করুন, প্রয়োজন হলে যেকোনো সময় আপগ্রেড করুন।'
                    : 'Start free, upgrade anytime. Transparent fair-use limits.'}
                </p>
              </div>

              <div className="mt-4 flex items-end justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllPlansTable((prev) => !prev)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#60a5fa]/45 bg-[#081236]/85 px-3.5 py-1.5 text-[12px] font-bold text-white transition-colors hover:border-[#00D9FF] cursor-pointer whitespace-nowrap"
                >
                  <span>
                    {showAllPlansTable
                      ? lang === 'bn'
                        ? 'তুলনা লুকান'
                        : 'Hide Compare'
                      : lang === 'bn'
                        ? 'সব প্ল্যান দেখুন'
                        : 'View All Plans'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                <GlowingDiamondSvg />
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Language Roadmap Matrix */}
        <AnimatePresence initial={false}>
          {showLanguageMatrix && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="lv-glass-card mt-4 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-[15px] font-bold text-white">
                    {lang === 'bn'
                      ? 'ভাষা সাপোর্ট ও রোডম্যাপ স্ট্যাটাস'
                      : 'Language Availability & Honest Roadmap Status'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowLanguageMatrix(false)}
                    className="rounded-lg p-1 text-[#9eb4dc] hover:bg-white/10 hover:text-white cursor-pointer"
                    aria-label="Close language roadmap"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {enabledLanguages.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-[#60a5fa]/20 bg-[#060E2B]/80 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <FlagCircleSvg flagKey={item.flagKey} />
                        <div>
                          <p className="text-[13px] font-bold text-white">{item.name}</p>
                          <p className="text-[11px] text-[#9eb4dc]">{item.nativeLabel}</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.status === 'live'
                            ? 'bg-[#16E58B]/15 text-[#16E58B]'
                            : 'bg-amber-400/15 text-amber-300'
                        }`}
                      >
                        {item.status === 'live' ? 'Live' : 'Coming Soon'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable Plan Comparison Table ("View All Plans") */}
        <AnimatePresence initial={false}>
          {showAllPlansTable && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="lv-glass-card mt-4 overflow-x-auto rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 pb-3">
                  <h3 className="font-display text-[15px] font-bold text-white">
                    {lang === 'bn'
                      ? 'ফ্রি বনাম প্রিমিয়াম ফিচার তুলনা'
                      : 'Free vs. Premium Plan Comparison'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAllPlansTable(false)}
                    className="rounded-lg p-1 text-[#9eb4dc] hover:bg-white/10 hover:text-white cursor-pointer"
                    aria-label="Close plan comparison"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <table className="w-full min-w-[520px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#60a5fa]/20 text-[12px] uppercase tracking-wider text-[#9eb4dc]">
                      <th className="py-2.5 pr-4">Capability</th>
                      <th className="py-2.5 px-4">Free ($0)</th>
                      <th className="py-2.5 pl-4 text-[#00D9FF]">
                        Premium ({premiumPlan?.currency}
                        {billingInterval === 'yearly'
                          ? premiumPlan?.yearlyMonthlyPrice.toFixed(2)
                          : premiumPlan?.monthlyPrice.toFixed(2)}
                        /mo)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#60a5fa]/12">
                    {COMPARISON_ROWS.map((row) => (
                      <tr key={row.featureEn}>
                        <td className="py-2.5 pr-4 font-medium text-[#e6efff]">
                          {lang === 'bn' ? row.featureBn : row.featureEn}
                        </td>
                        <td className="py-2.5 px-4 text-[#a8bde0]">{row.free}</td>
                        <td className="py-2.5 pl-4 font-semibold text-[#16E58B]">
                          {row.premium}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Honest Billing / Subscription Intent Modal (NEVER simulates fake payment success) */}
      <AnimatePresence>
        {upgradeModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#030616]/82 px-4 backdrop-blur-md"
            onClick={() => setUpgradeModal({ open: false, loading: false, response: null })}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Subscription billing status"
              initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="lv-glass-card w-full max-w-md rounded-2xl p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
                    <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-[16px] font-bold text-white">
                      {lang === 'bn'
                        ? 'পেমেন্ট গেটওয়ে স্ট্যাটাস'
                        : 'Billing & Checkout Status'}
                    </h3>
                    <p className="text-[11.5px] text-[#9eb4dc]">
                      Premium ({billingInterval})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeModal({ open: false, loading: false, response: null })}
                  aria-label="Close modal"
                  className="rounded-lg p-1 text-[#9eb4dc] hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-[#60a5fa]/25 bg-[#060E2B]/85 p-4 text-[13px] leading-relaxed text-[#dce7fc]">
                {upgradeModal.loading ? (
                  <p className="text-[#9eb4dc]">Checking live billing provider status...</p>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#00D9FF]" aria-hidden="true" />
                    <p>
                      {upgradeModal.response?.message ||
                        'Live payment processing is not configured yet in this environment. No card has been charged.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUpgradeModal({ open: false, loading: false, response: null })}
                  className="rounded-full border border-[#60a5fa]/35 px-4 py-2 text-[12.5px] font-semibold text-[#dce7fc] hover:text-white cursor-pointer"
                >
                  {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
                <Link
                  to="/register?plan=free"
                  className="lv-glow-cta inline-flex items-center gap-1.5 rounded-full px-4.5 py-2 text-[12.5px] font-bold text-white"
                >
                  <span>{lang === 'bn' ? 'ফ্রি প্ল্যান দিয়ে শুরু করুন' : 'Start Free Account'}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RevealSection>
  );
}
