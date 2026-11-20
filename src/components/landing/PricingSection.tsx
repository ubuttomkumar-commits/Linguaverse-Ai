import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

type Currency = 'BDT' | 'USD';
type BillingCycle = 'monthly' | 'annual';

export function PricingSection() {
  const { t } = useLanguage();
  const [currency, setCurrency] = useState<Currency>('BDT');
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  const freePlan = t.pricing.plans.free;
  const proPlan = t.pricing.plans.pro;

  const freePrice =
    currency === 'BDT'
      ? billing === 'monthly'
        ? freePlan.priceBdtMonthly
        : freePlan.priceBdtAnnual
      : billing === 'monthly'
        ? freePlan.priceUsdMonthly
        : freePlan.priceUsdAnnual;

  const proPrice =
    currency === 'BDT'
      ? billing === 'monthly'
        ? proPlan.priceBdtMonthly
        : proPlan.priceBdtAnnual
      : billing === 'monthly'
        ? proPlan.priceUsdMonthly
        : proPlan.priceUsdAnnual;

  return (
    <section id="pricing" className="border-t border-slate-800/80 bg-[#0A0F1C] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#3B82F6]">{t.pricing.kicker}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
              {t.pricing.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
              {t.pricing.subtitle}
            </p>
          </div>

          {/* Interactive Currency & Billing Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label={t.pricing.currencyLabel}
              className="inline-flex items-center rounded-lg border border-slate-800 bg-[#111827] p-1"
            >
              <button
                type="button"
                onClick={() => setCurrency('BDT')}
                aria-pressed={currency === 'BDT'}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currency === 'BDT'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                BDT ৳
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                aria-pressed={currency === 'USD'}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                USD $
              </button>
            </div>

            <div
              role="group"
              aria-label="Billing cadence"
              className="inline-flex items-center rounded-lg border border-slate-800 bg-[#111827] p-1"
            >
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                aria-pressed={billing === 'monthly'}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  billing === 'monthly'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {t.pricing.billingMonthly}
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                aria-pressed={billing === 'annual'}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  billing === 'annual'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {t.pricing.billingAnnual}
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Free Tier */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
            <div>
              <p className="text-xs font-medium text-slate-400">{freePlan.audience}</p>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-b border-slate-800 pb-6">
                <h3 className="text-xl font-bold text-white">{freePlan.name}</h3>
                <div className="text-right">
                  <span className="font-mono text-3xl font-bold text-white tabular-nums sm:text-4xl">
                    {freePrice}
                  </span>
                  <span className="ml-1.5 text-xs text-slate-400">{t.pricing.perMonth}</span>
                </div>
              </div>

              <ul className="mt-6 space-y-3.5 text-sm text-slate-300">
                {freePlan.features.map((feat) => (
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
                className="block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-5 py-3 text-center text-sm font-semibold text-white hover:border-[#3B82F6] transition-colors"
              >
                {freePlan.cta}
              </Link>
            </div>
          </div>

          {/* Pro Tier */}
          <div className="flex flex-col justify-between rounded-xl border border-[#3B82F6] bg-[#111827] p-6 sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <p className="font-medium text-[#3B82F6]">{proPlan.audience}</p>
                {billing === 'annual' && (
                  <span className="font-medium text-[#F59E0B]">{t.pricing.billedAnnuallyNote}</span>
                )}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-b border-slate-800 pb-6">
                <h3 className="text-xl font-bold text-white">{proPlan.name}</h3>
                <div className="text-right">
                  <span className="font-mono text-3xl font-bold text-white tabular-nums sm:text-4xl">
                    {proPrice}
                  </span>
                  <span className="ml-1.5 text-xs text-slate-400">{t.pricing.perMonth}</span>
                </div>
              </div>

              <ul className="mt-6 space-y-3.5 text-sm text-slate-200">
                {proPlan.features.map((feat) => (
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
                to="/register?plan=pro"
                className="block w-full rounded-lg bg-[#3B82F6] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors"
              >
                {proPlan.cta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
