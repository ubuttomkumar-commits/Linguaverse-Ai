import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, ChevronDown, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  SUPPLIED_LANDING_COPY,
  resolveLandingRoutes,
} from '../../domain/suppliedLandingCopy';
import { RevealSection } from './RevealSection';
import { MagneticWrap, TiltCard3D } from './MotionPrimitives';

export function LandingConversionSection() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const prefersReduced = useReducedMotion();
  const { pricing, faq, finalCta } = SUPPLIED_LANDING_COPY[lang];
  const routes = resolveLandingRoutes(user, profile);

  const [showPremiumNotice, setShowPremiumNotice] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <>
      {/* SECTION K — PREMIUM 3D PRICING & FEATURE COMPARISON */}
      <section
        id="pricing"
        className="border-t border-[#b0c8ff]/[0.08] bg-[radial-gradient(ellipse_60%_45%_at_75%_20%,rgba(217,70,239,0.08),transparent_65%),#080f20] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="max-w-2xl">
              <p className="text-[13px] font-semibold text-[#38bdf8]">
                {pricing.kicker}
              </p>
              <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
                {pricing.title}
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
                {pricing.lead}
              </p>
            </div>

            {/* 3D Illuminated Plan Cards */}
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Free Plan */}
              <TiltCard3D
                glowAccent="cyan"
                className="flex flex-col justify-between rounded-[22px] border border-[#b0c8ff]/[0.16] bg-gradient-to-b from-[#101a33] to-[#0b1224] p-7 sm:p-8"
              >
                <div>
                  <p className="text-[12px] font-semibold text-[#34d399]">
                    {pricing.free.eyebrow}
                  </p>
                  <div className="mt-2 flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-[22px] font-bold text-[#f3f6ff]">
                      {pricing.free.name}
                    </h3>
                    <p className="font-display text-[32px] font-extrabold tracking-tight text-[#f3f6ff]">
                      {pricing.free.price}
                    </p>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#a8b6d1]">
                    {pricing.free.description}
                  </p>

                  <ul className="mt-6 space-y-3 border-t border-[#b0c8ff]/[0.1] pt-6">
                    {pricing.free.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-[14px] text-[#dce5f7]"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#34d399]"
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <MagneticWrap className="w-full sm:w-fit">
                    <Link
                      to={routes.freeSignupRoute}
                      className="lv-glow-cta inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[12px] px-6 py-3 text-[14px] font-bold text-[#060b18] active:scale-[0.99] sm:w-auto"
                    >
                      <span>
                        {routes.isSignedIn ? pricing.free.ctaSignedIn : pricing.free.cta}
                      </span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </MagneticWrap>
                </div>
              </TiltCard3D>

              {/* Premium Placeholder Plan with Animated Illuminated Gradient Border */}
              <TiltCard3D glowAccent="magenta" className="rounded-[23px]">
                <div className="lv-glow-border-premium h-full rounded-[23px]">
                  <article className="flex h-full flex-col justify-between rounded-[22px] bg-[radial-gradient(ellipse_80%_60%_at_80%_0%,rgba(139,109,255,0.2),rgba(217,70,239,0.08)_45%,transparent_75%),linear-gradient(155deg,#121f3d,#0a1122)] p-7 sm:p-8">
                    <div>
                      <p className="text-[12px] font-semibold text-[#e879f9]">
                        {pricing.premium.eyebrow}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between gap-4">
                        <h3 className="font-display text-[22px] font-bold text-[#f3f6ff]">
                          {pricing.premium.name}
                        </h3>
                        <p className="font-display bg-gradient-to-r from-[#7dd3fc] via-[#c4b5fd] to-[#f0abfc] bg-clip-text text-[26px] font-extrabold tracking-tight text-transparent sm:text-[30px]">
                          {pricing.premium.price}
                        </p>
                      </div>
                      <p className="mt-3 text-[14px] leading-relaxed text-[#b8c7e3]">
                        {pricing.premium.description}
                      </p>

                      <ul className="mt-6 space-y-3 border-t border-[#b0c8ff]/[0.14] pt-6">
                        {pricing.premium.highlights.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2.5 text-[14px] text-[#e6eeff]"
                          >
                            <Check
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#38bdf8]"
                              aria-hidden="true"
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8">
                      <button
                        type="button"
                        aria-expanded={showPremiumNotice}
                        onClick={() => setShowPremiumNotice((prev) => !prev)}
                        className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#8b6dff]/45 bg-[#0a1226] px-5 py-3 text-[14px] font-semibold text-[#f3f6ff] transition-all duration-150 hover:border-[#d946ef]/70 hover:shadow-[0_0_24px_rgba(217,70,239,0.2)] sm:w-auto"
                      >
                        <Info className="h-4 w-4 text-[#38bdf8]" aria-hidden="true" />
                        <span>{pricing.premium.cta}</span>
                      </button>

                      <AnimatePresence initial={false}>
                        {showPremiumNotice && (
                          <motion.p
                            role="status"
                            initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                            transition={{ duration: 0.22 }}
                            className="mt-3 overflow-hidden rounded-[12px] border border-[#8b6dff]/35 bg-[#080f20] p-3.5 text-[13px] leading-relaxed text-[#c6d4ee]"
                          >
                            {pricing.premium.notice}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </article>
                </div>
              </TiltCard3D>
            </div>

            {/* Clean Feature & Limitation Comparison Table */}
            <div className="lv-glow-surface mt-10 overflow-x-auto rounded-[18px] border border-[#b0c8ff]/[0.12] bg-[#0c1428]">
              <table className="w-full min-w-[540px] border-collapse text-left text-[14px]">
                <caption className="sr-only">{pricing.tableTitle}</caption>
                <thead>
                  <tr className="border-b border-[#b0c8ff]/[0.12] text-[13px] text-[#9eb1d1]">
                    <th scope="col" className="px-5 py-4 font-semibold">
                      {pricing.tableHeaders[0]}
                    </th>
                    <th scope="col" className="px-5 py-4 font-semibold text-[#f3f6ff]">
                      {pricing.tableHeaders[1]}
                    </th>
                    <th scope="col" className="px-5 py-4 font-semibold text-[#c084fc]">
                      {pricing.tableHeaders[2]}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#b0c8ff]/[0.08]">
                  {pricing.comparisonRows.map((row) => (
                    <tr key={row.feature}>
                      <th
                        scope="row"
                        className="px-5 py-3.5 font-medium text-[#e4ecfc]"
                      >
                        {row.feature}
                      </th>
                      <td className="px-5 py-3.5 text-[#b5c4e0]">{row.freeValue}</td>
                      <td className="px-5 py-3.5 text-[#a8b6d1]">{row.premiumValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* SECTION L — SMOOTH FRAMER MOTION FAQ ACCORDION */}
      <section
        id="faq"
        className="border-t border-[#b0c8ff]/[0.08] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="text-[13px] font-semibold text-[#38bdf8]">
                  {faq.kicker}
                </p>
                <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#f3f6ff] sm:text-[38px] text-balance">
                  {faq.title}
                </h2>
              </div>

              <div className="divide-y divide-[#b0c8ff]/[0.12] border-y border-[#b0c8ff]/[0.12] lg:col-span-8">
                {faq.items.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  const panelId = `faq-panel-${idx}`;
                  return (
                    <div key={item.q} className="py-5">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() =>
                          setOpenFaqIndex((prev) => (prev === idx ? null : idx))
                        }
                        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-[16px] font-semibold text-[#f3f6ff] transition-colors hover:text-[#7dd3fc] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8]"
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-[#38bdf8] transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={panelId}
                            initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="mt-3.5 pr-6 text-[15px] leading-relaxed text-[#a8b6d1]">
                              {item.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* SECTION M — FINAL CONVERSION SECTION */}
      <section
        id="get-started"
        className="border-t border-[#b0c8ff]/[0.08] bg-[#080f20] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="lv-glow-surface rounded-[24px] border border-[#8b6dff]/35 bg-[radial-gradient(ellipse_65%_70%_at_50%_0%,rgba(56,189,248,0.18),rgba(139,109,255,0.12)_48%,transparent_72%),linear-gradient(155deg,#111d38,#091021)] px-6 py-14 text-center sm:px-12 sm:py-20">
              <p className="text-[13px] font-semibold text-[#38bdf8]">
                {finalCta.kicker}
              </p>
              <h2 className="font-display mx-auto mt-3 max-w-2xl text-[32px] font-extrabold leading-[1.12] tracking-[-0.035em] text-[#f3f6ff] sm:text-[46px] text-balance">
                {finalCta.title}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#b2c1dc]">
                {finalCta.lead}
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
                <MagneticWrap className="w-full sm:w-auto">
                  <Link
                    to={routes.primaryAuthRoute}
                    className="lv-glow-cta inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] px-7 py-3 text-[15px] font-bold text-[#060b18] active:scale-[0.99] sm:w-auto"
                  >
                    <span>
                      {routes.isSignedIn
                        ? finalCta.primaryBtnSignedIn
                        : finalCta.primaryBtn}
                    </span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </MagneticWrap>

                <a
                  href="#live-demo"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[12px] border border-[#b0c8ff]/[0.18] bg-[#0a1224]/85 px-6 py-3 text-[14px] font-semibold text-[#f3f6ff] transition-colors hover:border-[#38bdf8]/60 sm:w-auto"
                >
                  {finalCta.secondaryBtn}
                </a>
              </div>

              <p className="mt-6 text-[13px] text-[#8d9fbe]">
                {finalCta.contactPrefix}{' '}
                <a
                  href={`mailto:${finalCta.contactEmail}`}
                  className="font-mono text-[#9ec0ff] underline decoration-[#9ec0ff]/40 underline-offset-2 hover:text-white"
                >
                  {finalCta.contactEmail}
                </a>{' '}
                {finalCta.contactSuffix}
              </p>
            </div>
          </RevealSection>
        </div>
      </section>
    </>
  );
}
