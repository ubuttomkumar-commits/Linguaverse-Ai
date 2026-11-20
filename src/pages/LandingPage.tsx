import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';
import { HeroSamplePreview } from '../components/landing/HeroSamplePreview';
import { ImprovementLoopSection } from '../components/landing/ImprovementLoopSection';
import { PricingSection } from '../components/landing/PricingSection';
import { FaqSection } from '../components/landing/FaqSection';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

export function LandingPage() {
  const { lang, t } = useLanguage();
  const { user, profile } = useAuth();

  const primaryCtaTarget = user
    ? !profile?.onboardingCompleted
      ? '/onboarding'
      : '/app'
    : '/register';

  const primaryCtaLabel = user ? t.nav.openWorkspace : t.hero.primaryCta;

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100">
      <PublicHeader />

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            {/* Left Copy Column */}
            <div className="flex flex-col justify-between lg:col-span-6 lg:pr-4">
              <div>
                <p className="text-xs font-medium text-slate-400 sm:text-sm">
                  {t.hero.kicker}
                </p>
                <h1
                  className={`mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] text-balance ${
                    lang === 'bn' ? 'leading-[1.25] lg:leading-[1.24]' : 'lg:leading-[1.1]'
                  }`}
                >
                  {t.hero.headline}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                  {t.hero.subheadline}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to={primaryCtaTarget}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{primaryCtaLabel}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center rounded-lg border border-slate-700 bg-[#111827] px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    {t.hero.secondaryCta}
                  </a>
                </div>
              </div>

              <div className="mt-10 border-t border-slate-800/80 pt-5">
                <p className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]"
                    aria-hidden="true"
                  />
                  <span>{t.hero.honestyNote}</span>
                </p>
              </div>
            </div>

            {/* Right Interactive Live Product Preview Widget */}
            <div className="lg:col-span-6">
              <HeroSamplePreview />
            </div>
          </div>
        </section>

        {/* Why Traditional Learning Fails */}
        <section
          id="why-traditional-fails"
          className="border-t border-slate-800/80 bg-[#0D1322] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold text-[#F59E0B]">{t.whyFails.kicker}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
                {t.whyFails.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                {t.whyFails.subtitle}
              </p>
            </div>

            <div className="mt-12 divide-y divide-slate-800 border-y border-slate-800">
              <div className="hidden grid-cols-12 gap-6 py-3 text-xs font-semibold text-slate-400 md:grid">
                <div className="col-span-1">#</div>
                <div className="col-span-5">{t.whyFails.columns.oldWay}</div>
                <div className="col-span-6 text-[#3B82F6]">{t.whyFails.columns.newWay}</div>
              </div>

              {t.whyFails.items.map((row) => (
                <div
                  key={row.index}
                  className="grid grid-cols-1 gap-6 py-7 md:grid-cols-12 md:items-start"
                >
                  <div className="font-mono text-xs font-semibold text-slate-500 tabular-nums md:col-span-1">
                    {row.index}
                  </div>
                  <div className="md:col-span-5">
                    <p className="text-xs font-medium text-rose-300 md:hidden">
                      {t.whyFails.columns.oldWay}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-200 md:mt-0">
                      {row.problemTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {row.problemDesc}
                    </p>
                  </div>
                  <div className="md:col-span-6">
                    <p className="text-xs font-medium text-[#3B82F6] md:hidden">
                      {t.whyFails.columns.newWay}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-white md:mt-0">
                      {row.solutionTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {row.solutionDesc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8-Step Communication Improvement Loop */}
        <ImprovementLoopSection />

        {/* 6 Differentiation Systems (Asymmetric Editorial Grid) */}
        <section
          id="features"
          className="border-t border-slate-800/80 bg-[#0D1322] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold text-[#8B5CF6]">{t.systemsSection.kicker}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
                {t.systemsSection.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                {t.systemsSection.subtitle}
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-12">
              {t.systemsSection.systems.map((sys, idx) => {
                // Asymmetric editorial rhythm: marquee items span 7 + 5, alternating per row
                const spanClass =
                  idx === 0 || idx === 3 || idx === 4 ? 'md:col-span-7' : 'md:col-span-5';
                const accentText =
                  idx % 3 === 0
                    ? 'text-[#3B82F6]'
                    : idx % 3 === 1
                      ? 'text-[#8B5CF6]'
                      : 'text-[#F59E0B]';

                return (
                  <article
                    key={sys.id}
                    className={`${spanClass} flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-7`}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 text-xs">
                        <span className={`font-mono font-semibold tabular-nums ${accentText}`}>
                          {sys.index}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-400">{sys.tagline}</span>
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-white">{sys.name}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">
                        {sys.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <PricingSection />

        {/* FAQ */}
        <FaqSection />
      </main>

      <PublicFooter />
    </div>
  );
}
