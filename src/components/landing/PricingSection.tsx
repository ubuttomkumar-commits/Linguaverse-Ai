import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANDING_COPY } from '../../domain/landingContent';
import { RevealBlock, TiltSpotlightCard } from './TiltSpotlightCard';

type Currency = 'BDT' | 'USD';
type BillingCycle = 'monthly' | 'annual';

export function PricingSection() {
  const { lang } = useLanguage();
  const copy = LANDING_COPY[lang].pricing;
  const [currency, setCurrency] = useState<Currency>('BDT');
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  const freePrice =
    currency === 'BDT'
      ? billing === 'monthly'
        ? copy.free.priceBdtMonthly
        : copy.free.priceBdtAnnual
      : billing === 'monthly'
        ? copy.free.priceUsdMonthly
        : copy.free.priceUsdAnnual;

  const proPrice =
    currency === 'BDT'
      ? billing === 'monthly'
        ? copy.pro.priceBdtMonthly
        : copy.pro.priceBdtAnnual
      : billing === 'monthly'
        ? copy.pro.priceUsdMonthly
        : copy.pro.priceUsdAnnual;

  return (
    <section id="pricing" className="border-t border-white/[0.06] bg-[#050914] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealBlock className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#3B82F6]">{copy.kicker}</p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              {copy.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
              {copy.subtitle}
            </p>
          </div>

          {/* Currency & Billing Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Currency selector"
              className="inline-flex items-center rounded-xl border border-white/[0.09] bg-[#0E1526] p-1"
            >
              <button
                type="button"
                onClick={() => setCurrency('BDT')}
                aria-pressed={currency === 'BDT'}
                className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currency === 'BDT'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {copy.bdtLabel}
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                aria-pressed={currency === 'USD'}
                className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {copy.usdLabel}
              </button>
            </div>

            <div
              role="group"
              aria-label="Billing cycle selector"
              className="inline-flex items-center rounded-xl border border-white/[0.09] bg-[#0E1526] p-1"
            >
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                aria-pressed={billing === 'monthly'}
                className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  billing === 'monthly'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {copy.monthlyLabel}
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                aria-pressed={billing === 'annual'}
                className={`min-h-[36px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  billing === 'annual'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {copy.annualLabel}
              </button>
            </div>
          </div>
        </RevealBlock>

        {/* Free vs Pro Comparison Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Free Tier */}
          <RevealBlock delayMs={60}>
            <TiltSpotlightCard
              as="div"
              maxTilt={2.5}
              className="flex h-full flex-col justify-between rounded-2xl border border-white/[0.09] bg-[#0E1526] p-6 sm:p-8"
            >
              <div>
                <p className="text-xs font-medium text-slate-400">{copy.free.audience}</p>
                <div className="mt-3 flex items-baseline justify-between gap-4 border-b border-white/[0.08] pb-6">
                  <h3 className="font-display text-xl font-bold text-white">{copy.free.name}</h3>
                  <div className="text-right">
                    <span
                      data-testid="price-free"
                      className="font-mono text-3xl font-bold text-white tabular-nums sm:text-4xl"
                    >
                      {freePrice}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-400">{copy.perMonth}</span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm text-slate-300">
                  {copy.free.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  to="/register?plan=free"
                  className="flex min-h-[46px] w-full items-center justify-center rounded-xl border border-white/[0.14] bg-[#050914] px-5 py-3 text-center text-sm font-semibold text-white hover:border-[#3B82F6] transition-colors"
                >
                  {copy.free.cta}
                </Link>
              </div>
            </TiltSpotlightCard>
          </RevealBlock>

          {/* Pro Tier */}
          <RevealBlock delayMs={120}>
            <TiltSpotlightCard
              as="div"
              maxTilt={2.5}
              className="flex h-full flex-col justify-between rounded-2xl border border-[#3B82F6]/60 bg-[#0E1526] p-6 sm:p-8 shadow-[0_0_48px_rgba(59,130,246,0.12)]"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <p className="font-semibold text-[#3B82F6]">{copy.pro.audience}</p>
                  {billing === 'annual' && (
                    <span className="font-medium text-[#F59E0B]">{copy.billedAnnually}</span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-4 border-b border-white/[0.08] pb-6">
                  <h3 className="font-display text-xl font-bold text-white">{copy.pro.name}</h3>
                  <div className="text-right">
                    <span
                      data-testid="price-pro"
                      className="font-mono text-3xl font-bold text-white tabular-nums sm:text-4xl"
                    >
                      {proPrice}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-400">{copy.perMonth}</span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3.5 text-sm text-slate-200">
                  {copy.pro.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]"
                        aria-hidden="true"
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  to={`/register?plan=pro&currency=${currency.toLowerCase()}&billing=${billing}`}
                  className="flex min-h-[46px] w-full items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,130,246,0.3)] hover:bg-[#2563EB] transition-colors"
                >
                  {copy.pro.cta}
                </Link>
              </div>
            </TiltSpotlightCard>
          </RevealBlock>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden="true" />
          <span>{copy.honestyNote}</span>
        </p>
      </div>
    </section>
  );
}
