import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquareQuote,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCms } from '../../context/CmsContext';
import { useAuth } from '../../context/AuthContext';
import { RevealSection } from './RevealSection';
import { resolveLandingRoutes } from '../../domain/suppliedLandingCopy';
import { getApprovedTestimonials, getPublishedFaqs } from '../../domain/cmsEngine';

function NetworkGlobeIllustration() {
  return (
    <svg
      viewBox="0 0 185 150"
      className="h-[126px] w-[156px] shrink-0 drop-shadow-[0_0_24px_rgba(0,217,255,0.45)]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="lv-comm-globe" cx="45%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#080F2E" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="lv-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D9FF" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
      </defs>

      {/* Orbital Connection Arcs */}
      <ellipse cx="94" cy="76" rx="74" ry="30" fill="none" stroke="url(#lv-arc)" strokeWidth="1.4" opacity="0.65" transform="rotate(-18 94 76)" />
      <ellipse cx="94" cy="76" rx="74" ry="30" fill="none" stroke="#00D9FF" strokeWidth="1.2" opacity="0.45" transform="rotate(20 94 76)" />

      {/* Central Glowing Globe */}
      <circle cx="94" cy="76" r="44" fill="url(#lv-comm-globe)" stroke="#38bdf8" strokeOpacity="0.55" strokeWidth="1.4" />
      <ellipse cx="94" cy="76" rx="44" ry="15" fill="none" stroke="#7dd3fc" strokeOpacity="0.35" strokeWidth="1" />
      <ellipse cx="94" cy="76" rx="22" ry="44" fill="none" stroke="#7dd3fc" strokeOpacity="0.35" strokeWidth="1" />
      <line x1="50" y1="76" x2="138" y2="76" stroke="#7dd3fc" strokeOpacity="0.3" strokeWidth="1" />

      {/* Connected Learner Nodes around the Globe */}
      {[
        { cx: 34, cy: 48, fill: '#00D9FF' },
        { cx: 154, cy: 44, fill: '#E42BFF' },
        { cx: 26, cy: 96, fill: '#873BFF' },
        { cx: 162, cy: 96, fill: '#16E58B' },
        { cx: 70, cy: 22, fill: '#38bdf8' },
        { cx: 122, cy: 130, fill: '#FACC15' },
      ].map((n, idx) => (
        <g key={idx}>
          <line x1={n.cx} y1={n.cy} x2="94" y2="76" stroke={n.fill} strokeOpacity="0.35" strokeWidth="1" />
          <circle cx={n.cx} cy={n.cy} r="9" fill="#0A1742" stroke={n.fill} strokeWidth="1.8" />
          <circle cx={n.cx} cy={n.cy - 1.6} r="2.6" fill={n.fill} />
          <path d={`M${n.cx - 4} ${n.cy + 5} Q${n.cx} ${n.cy + 1.5} ${n.cx + 4} ${n.cy + 5}`} stroke={n.fill} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

function GlowingQuestionCubeSvg() {
  return (
    <svg
      viewBox="0 0 110 110"
      className="h-[92px] w-[92px] shrink-0 drop-shadow-[0_0_24px_rgba(0,217,255,0.5)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lv-qcube-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="lv-qcube-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      {/* 3D Glass Cube */}
      <rect x="22" y="24" width="60" height="62" rx="14" fill="url(#lv-qcube-front)" stroke="#7dd3fc" strokeWidth="2" />
      <path d="M74 26 L90 36 L90 78 L74 86 Z" fill="url(#lv-qcube-side)" opacity="0.72" />
      <text
        x="52"
        y="69"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="40"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        ?
      </text>
      <circle cx="16" cy="24" r="3" fill="#00D9FF" />
      <circle cx="94" cy="20" r="2.5" fill="#E42BFF" />
    </svg>
  );
}

function Rocket3DSvg() {
  return (
    <svg
      viewBox="0 0 96 96"
      className="lv-float-slow h-[76px] w-[76px] shrink-0 drop-shadow-[0_0_26px_rgba(0,217,255,0.55)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lv-rocket-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#087BFF" />
        </linearGradient>
        <linearGradient id="lv-rocket-flame" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="55%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
      </defs>
      {/* Exhaust Flame */}
      <path d="M28 68 C16 74 12 82 10 88 C20 85 28 80 34 72 Z" fill="url(#lv-rocket-flame)" />
      {/* Fins */}
      <path d="M36 42 L20 48 L30 58 Z" fill="#873BFF" />
      <path d="M54 60 L48 76 L38 66 Z" fill="#E42BFF" />
      {/* Body */}
      <path
        d="M78 18 C64 20 46 32 34 50 L46 62 C64 50 76 32 78 18 Z"
        fill="url(#lv-rocket-body)"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="1.4"
      />
      {/* Porthole Window */}
      <circle cx="56" cy="40" r="7.5" fill="#08143B" stroke="#00D9FF" strokeWidth="2.4" />
      <circle cx="54" cy="38" r="2.2" fill="#e0f2fe" opacity="0.85" />
    </svg>
  );
}

export function CommunityTestimonialsFaqSection({
  showCommunityRow = true,
  showFinalCta = true,
}: {
  showCommunityRow?: boolean;
  showFinalCta?: boolean;
}) {
  const { lang } = useLanguage();
  const { config, trackEvent } = useCms();
  const { user, profile } = useAuth();
  const prefersReduced = useReducedMotion();

  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>(
    () => getPublishedFaqs(config)[0]?.id ?? null
  );
  const [faqPanelExpanded, setFaqPanelExpanded] = useState(false);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);

  const routes = resolveLandingRoutes(user, profile);
  const approvedTestimonials = useMemo(() => getApprovedTestimonials(config), [config]);
  const publishedFaqs = useMemo(() => getPublishedFaqs(config), [config]);

  const currentTestimonial =
    approvedTestimonials.length > 0
      ? approvedTestimonials[testimonialIdx % approvedTestimonials.length]
      : null;

  return (
    <>
      {showCommunityRow && (
        <RevealSection id="community" className="py-8 sm:py-12">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            {/* Reference 3-Card Bento Row: Global Community | Verified Testimonials | FAQs */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.28fr_1.06fr_0.86fr]">
              {/* CARD 1: Join a Global Community of Confident Speakers */}
              <div className="lv-glass-card flex flex-col justify-between gap-4 rounded-[22px] p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[20px] font-extrabold leading-snug text-white sm:text-[21px]">
                    {lang === 'bn' ? config.community.titleBn : config.community.titleEn}
                  </h2>
                  <p className="mt-2 text-[13px] text-[#a8bde0]">
                    {lang === 'bn' ? config.community.subtitleBn : config.community.subtitleEn}
                  </p>

                  <button
                    type="button"
                    onClick={() => setCommunityModalOpen(true)}
                    className="lv-glow-cta mt-5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-bold text-white cursor-pointer"
                  >
                    <span>
                      {lang === 'bn' ? config.community.ctaLabelBn : config.community.ctaLabelEn}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="mx-auto sm:mx-0">
                  <NetworkGlobeIllustration />
                </div>
              </div>

              {/* CARD 2: Verified Testimonials (Strictly Admin-Approved Only — Zero Fake Reviews) */}
              <div className="lv-glass-card flex flex-col justify-between rounded-[22px] p-5">
                {currentTestimonial ? (
                  <>
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <MessageSquareQuote
                          className="h-7 w-7 shrink-0 text-[#00D9FF]/80"
                          aria-hidden="true"
                        />
                        {approvedTestimonials.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="Previous testimonial"
                              onClick={() =>
                                setTestimonialIdx(
                                  (i) =>
                                    (i - 1 + approvedTestimonials.length) %
                                    approvedTestimonials.length
                                )
                              }
                              className="grid h-7 w-7 place-items-center rounded-full border border-[#60a5fa]/30 text-[#c5d6f4] hover:text-white cursor-pointer"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Next testimonial"
                              onClick={() =>
                                setTestimonialIdx((i) => (i + 1) % approvedTestimonials.length)
                              }
                              className="grid h-7 w-7 place-items-center rounded-full border border-[#60a5fa]/30 text-[#c5d6f4] hover:text-white cursor-pointer"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <blockquote className="mt-2.5 text-[14px] font-medium leading-relaxed text-[#eef4ff]">
                        &ldquo;
                        {lang === 'bn' && currentTestimonial.quoteBn
                          ? currentTestimonial.quoteBn
                          : currentTestimonial.quoteEn}
                        &rdquo;
                      </blockquote>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#60a5fa]/15 pt-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {currentTestimonial.avatarUrl ? (
                          <img
                            src={currentTestimonial.avatarUrl}
                            alt={currentTestimonial.authorName}
                            className="h-9 w-9 shrink-0 rounded-full border border-[#00D9FF]/45 object-cover"
                          />
                        ) : (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#087BFF] to-[#873BFF] text-xs font-extrabold text-white">
                            {currentTestimonial.authorName
                              .split(' ')
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-white">
                            — {currentTestimonial.authorName}
                          </p>
                          <p className="truncate text-[11px] text-[#9eb4dc]">
                            {currentTestimonial.authorRole}
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex shrink-0 items-center gap-0.5 text-[#FACC15]"
                        aria-label={`${currentTestimonial.rating} out of 5 stars`}
                      >
                        {Array.from({ length: currentTestimonial.rating }).map((_, idx) => (
                          <Star key={idx} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[#00D9FF]">
                        <MessageSquareQuote className="h-6 w-6" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {lang === 'bn' ? 'যাচাইকৃত রিভিউ' : 'Verified Learner Reviews'}
                        </span>
                      </div>
                      <p className="mt-2.5 text-[14px] font-semibold leading-relaxed text-white">
                        {lang === 'bn'
                          ? 'আমরা কখনোই ভুয়া রিভিউ প্রকাশ করি না।'
                          : 'Zero fabricated testimonials—only verified learner stories.'}
                      </p>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#a8bde0]">
                        {lang === 'bn'
                          ? 'প্রকৃত শিক্ষার্থীর অনুমোদিত মতামত অ্যাডমিন ড্যাশবোর্ড থেকে অনুমোদন করার সাথে সাথেই এখানে প্রদর্শিত হবে।'
                          : 'Real learner feedback approved through the Admin Dashboard appears live here automatically.'}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#60a5fa]/15 pt-3 text-[11.5px] text-[#7dd3fc]">
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {lang === 'bn'
                            ? 'অ্যাডমিন অনুমোদিত রিভিউ সিস্টেম'
                            : 'Admin-Moderated Testimonial Feed'}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: FAQs Card with Glowing 3D Question Cube */}
              <div className="lv-glass-card flex items-center justify-between gap-3 rounded-[22px] p-5">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[20px] font-extrabold text-white">
                    {lang === 'bn' ? 'সাধারণ জিজ্ঞাসা' : 'FAQs'}
                  </h2>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#a8bde0]">
                    {lang === 'bn'
                      ? 'LINGUAVERSE AI সম্পর্কে সাধারণ প্রশ্নের উত্তর জানুন।'
                      : 'Get answers to common questions about LINGUAVERSE AI.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFaqPanelExpanded(true);
                      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="mt-4 inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#60a5fa]/45 bg-[#087BFF]/25 px-4 py-1.5 text-[12.5px] font-bold text-white transition-colors hover:border-[#00D9FF] hover:bg-[#087BFF]/40 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'FAQ দেখুন' : 'View FAQ'}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <GlowingQuestionCubeSvg />
              </div>
            </div>

            {/* Interactive CMS-Controlled FAQ Accordion */}
            <div id="faq" className="mt-6">
              <div className="lv-glass-card rounded-[22px] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#60a5fa]/18">
                  <div>
                    <h3 className="font-display text-[17px] font-extrabold text-white">
                      {lang === 'bn'
                        ? 'সচরাচর জিজ্ঞাসিত প্রশ্নোত্তর'
                        : 'Frequently Asked Questions'}
                    </h3>
                    <p className="text-[12px] text-[#9eb4dc]">
                      {lang === 'bn'
                        ? 'অ্যাডমিন CMS থেকে সরাসরি পরিচালিত'
                        : 'Managed live via LINGUAVERSE Admin CMS'}
                    </p>
                  </div>
                  {publishedFaqs.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setFaqPanelExpanded((prev) => !prev)}
                      className="text-[12px] font-semibold text-[#00D9FF] hover:text-white cursor-pointer"
                    >
                      {faqPanelExpanded
                        ? lang === 'bn'
                          ? 'সংক্ষিপ্ত দেখুন'
                          : 'Show Fewer'
                        : lang === 'bn'
                          ? `সবগুলো দেখুন (${publishedFaqs.length})`
                          : `Show All (${publishedFaqs.length})`}
                    </button>
                  )}
                </div>

                <div className="mt-3 divide-y divide-[#60a5fa]/15">
                  {(faqPanelExpanded ? publishedFaqs : publishedFaqs.slice(0, 4)).map((faq) => {
                    const isOpen = openFaqId === faq.id;
                    return (
                      <div key={faq.id} className="py-3">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                          className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                        >
                          <span className="text-[14px] font-semibold text-white">
                            {lang === 'bn' ? faq.questionBn : faq.questionEn}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-[#00D9FF] transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <p className="pt-2.5 text-[13px] leading-relaxed text-[#b5c7e8]">
                                {lang === 'bn' ? faq.answerBn : faq.answerEn}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Community Links & Announcements Modal */}
          <AnimatePresence>
            {communityModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#030616]/82 px-4 backdrop-blur-md"
                onClick={() => setCommunityModalOpen(false)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Global Community Hub"
                  initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  onClick={(e) => e.stopPropagation()}
                  className="lv-glass-card w-full max-w-lg rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-[18px] font-extrabold text-white">
                        {lang === 'bn' ? config.community.titleBn : config.community.titleEn}
                      </h3>
                      <p className="mt-1 text-[12.5px] text-[#9eb4dc]">
                        {lang === 'bn' ? config.community.subtitleBn : config.community.subtitleEn}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCommunityModalOpen(false)}
                      aria-label="Close community modal"
                      className="rounded-lg p-1 text-[#9eb4dc] hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Announcements */}
                  <div className="mt-4 space-y-2.5">
                    {config.community.announcements
                      .filter((a) => a.enabled)
                      .map((ann) => (
                        <div
                          key={ann.id}
                          className="rounded-xl border border-[#00D9FF]/25 bg-[#060E2B]/85 p-3.5"
                        >
                          <p className="text-[13px] font-bold text-[#00D9FF]">{ann.title}</p>
                          <p className="mt-1 text-[12.5px] leading-relaxed text-[#d4e1f7]">
                            {ann.body}
                          </p>
                        </div>
                      ))}
                  </div>

                  {/* Community Links */}
                  <div className="mt-4 space-y-2">
                    {config.community.links
                      .filter((l) => l.enabled)
                      .map((lk) => (
                        <a
                          key={lk.id}
                          href={lk.url}
                          onClick={() => setCommunityModalOpen(false)}
                          className="flex items-center justify-between rounded-xl border border-[#60a5fa]/25 bg-[#0A1640]/80 px-4 py-2.5 text-[13px] font-semibold text-white hover:border-[#00D9FF]"
                        >
                          <span>{lk.label}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
                        </a>
                      ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </RevealSection>
      )}

      {/* SECTION 11: Final Conversion Luminous Gradient Banner with 3D Rocket */}
      {showFinalCta && (
        <RevealSection className="pb-12 pt-4 sm:pb-16">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[26px] border border-[#60a5fa]/40 bg-[linear-gradient(100deg,#0C2778_0%,#1D328A_42%,#4D1E96_78%,#7C209E_100%)] px-6 py-7 shadow-[0_24px_60px_rgba(8,123,255,0.32),0_0_46px_rgba(228,43,255,0.22)] sm:px-10 sm:py-9">
              {/* Soft Ambient Light Streaks */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(0,217,255,0.24),transparent_48%),radial-gradient(circle_at_88%_50%,rgba(228,43,255,0.28),transparent_50%)]"
              />

              <div className="relative flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                  <Rocket3DSvg />
                  <div>
                    <h2 className="font-display text-[24px] font-extrabold tracking-[-0.02em] text-white sm:text-[30px]">
                      {lang === 'bn' ? config.finalCta.titleBn : config.finalCta.titleEn}
                    </h2>
                    <p className="mt-1.5 text-[14.5px] text-[#dce8ff]">
                      {lang === 'bn' ? config.finalCta.subtitleBn : config.finalCta.subtitleEn}
                    </p>
                  </div>
                </div>

                <Link
                  to={routes.primaryAuthRoute}
                  onClick={() => trackEvent('hero_cta_click', { location: 'final_cta' })}
                  className="lv-glow-cta inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full px-7 py-3 text-[14.5px] font-extrabold text-white whitespace-nowrap"
                >
                  <span>
                    {lang === 'bn' ? config.finalCta.ctaLabelBn : config.finalCta.ctaLabelEn}
                  </span>
                  <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>
      )}
    </>
  );
}
