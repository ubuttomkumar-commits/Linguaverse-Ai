import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, PlayCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { ContinueLearningTarget } from '../../domain/academyEngine';

interface AcademyUniverseHeroProps {
  continueTarget: ContinueLearningTarget | null;
  totalCourses: number;
  enrolledCoursesCount: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  dueReviewCount: number;
  averageMasteryPercent: number;
  onExploreCourses: () => void;
}

export function AcademyUniverseHero({
  continueTarget,
  totalCourses,
  enrolledCoursesCount,
  completedLessonsCount,
  totalLessonsCount,
  dueReviewCount,
  averageMasteryPercent,
  onExploreCourses,
}: AcademyUniverseHeroProps) {
  const { lang } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: relX * 10, y: relY * -10 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const primaryCtaLabel = continueTarget
    ? continueTarget.mode === 'resume_draft'
      ? lang === 'bn'
        ? 'সংরক্ষিত লেসন চালিয়ে যান'
        : 'Resume Saved Lesson'
      : continueTarget.mode === 'continue_course'
        ? lang === 'bn'
          ? 'শেখা চালিয়ে যান'
          : 'Continue Learning'
        : lang === 'bn'
          ? 'প্রথম লেসন শুরু করুন'
          : 'Start Recommended Lesson'
    : lang === 'bn'
      ? 'কোর্স দেখুন'
      : 'Explore Courses';

  const primaryHref = continueTarget ? `/app/learn/${continueTarget.lesson.id}` : '#academy-catalog';

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-labelledby="academy-hero-heading"
      className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br from-[#070E2B] via-[#0A1335] to-[#0E1334] p-6 sm:p-8 lg:p-10"
    >
      {/* Subtle controlled ambient radial illumination */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#00D9FF]/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-[#8B5CF6]/14 blur-3xl"
      />

      <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Left: Editorial Hierarchy & CTAs */}
        <div className="lg:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00D9FF]">
            {lang === 'bn'
              ? 'লিঙ্গুয়াভার্স একাডেমি · দি লার্নিং ইউনিভার্স'
              : 'LINGUAVERSE ACADEMY · THE LEARNING UNIVERSE'}
          </p>

          <h1
            id="academy-hero-heading"
            className="font-portal mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.12]"
          >
            {lang === 'bn'
              ? 'আপনার ভাষা শিক্ষার মহাবিশ্ব এখান থেকেই শুরু।'
              : 'Your Learning Universe Starts Here.'}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {lang === 'bn'
              ? 'কাঠামোবদ্ধ দ্বিভাষিক কোর্স, বাংলা-ইংরেজি তুলনামূলক ব্যাখ্যা, ইন্টারঅ্যাক্টিভ অনুশীলন এবং স্পেসড রিপিটিশন মূল্যায়নের মাধ্যমে বাস্তব ইংরেজি যোগাযোগ দক্ষতা গড়ে তুলুন।'
              : 'Master real English communication through structured bilingual courses, Bangla-L1 contrast breakdowns, interactive practice labs, and verified spaced-repetition retention.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {continueTarget ? (
              <Link
                to={primaryHref}
                className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                <span>{primaryCtaLabel}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onExploreCourses}
                className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white cursor-pointer whitespace-nowrap"
              >
                <span>{primaryCtaLabel}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={onExploreCourses}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/90 bg-[#080F2E]/80 px-5 py-3 text-sm font-semibold text-slate-100 hover:border-[#00D9FF]/60 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Compass className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
              <span>{lang === 'bn' ? 'সব কোর্স দেখুন' : 'Explore Courses'}</span>
            </button>
          </div>

          {/* Unboxed Verified Progress Strip */}
          <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-slate-800/90 pt-5 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? 'সম্পন্ন লেসন' : 'Lessons Completed'}
              </dt>
              <dd className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                {completedLessonsCount}
                <span className="text-sm font-normal text-slate-500">/{totalLessonsCount}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? 'সক্রিয় কোর্স' : 'Enrolled Courses'}
              </dt>
              <dd className="mt-1 font-mono text-xl font-bold text-[#00D9FF] tabular-nums">
                {enrolledCoursesCount}
                <span className="text-sm font-normal text-slate-500">/{totalCourses}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? 'গড় প্রমাণিত মাস্টারি' : 'Verified Mastery'}
              </dt>
              <dd className="mt-1 font-mono text-xl font-bold text-[#A78BFA] tabular-nums">
                {averageMasteryPercent}%
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">
                {lang === 'bn' ? 'বকেয়া রিভিউ' : 'Reviews Due'}
              </dt>
              <dd
                className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                  dueReviewCount > 0 ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                {dueReviewCount}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: Lightweight 3D Holographic Orbital Learning Visual */}
        <div className="lg:col-span-5">
          <div
            className="relative mx-auto flex max-w-[360px] items-center justify-center py-2 transition-transform duration-300 ease-out"
            style={
              reducedMotion
                ? undefined
                : {
                    transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
                  }
            }
          >
            <svg
              viewBox="0 0 360 280"
              role="img"
              aria-label={
                lang === 'bn'
                  ? 'ত্রিমাত্রিক হোলোগ্রাফিক ভাষা শিক্ষা অরবিট ভিজ্যুয়াল'
                  : 'Holographic 3D orbital learning universe diagram showing bilingual mastery stages'
              }
              className="h-auto w-full drop-shadow-[0_18px_38px_rgba(0,217,255,0.16)]"
            >
              <defs>
                <radialGradient id="lv-core-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.45" />
                  <stop offset="55%" stopColor="#8B5CF6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="lv-ring-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D9FF" />
                  <stop offset="50%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="lv-prism-face" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.92" />
                </linearGradient>
                <linearGradient id="lv-card-glass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#13204D" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#09102C" stopOpacity="0.92" />
                </linearGradient>
              </defs>

              {/* Soft glow halo */}
              <circle cx="180" cy="140" r="118" fill="url(#lv-core-glow)" />

              {/* Tilted orbital rings */}
              <ellipse
                cx="180"
                cy="142"
                rx="136"
                ry="48"
                fill="none"
                stroke="url(#lv-ring-cyan)"
                strokeWidth="1.5"
                strokeOpacity="0.65"
                transform="rotate(-14 180 142)"
              />
              <ellipse
                cx="180"
                cy="142"
                rx="108"
                ry="38"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="1.2"
                strokeDasharray="4 6"
                strokeOpacity="0.55"
                transform="rotate(16 180 142)"
              />

              {/* Central 3D Octahedron Prism */}
              <g>
                <polygon
                  points="180,68 228,136 180,158 132,136"
                  fill="url(#lv-prism-face)"
                  stroke="#7DD3FC"
                  strokeWidth="1.2"
                />
                <polygon
                  points="180,68 228,136 180,158"
                  fill="#00D9FF"
                  fillOpacity="0.22"
                />
                <polygon
                  points="180,210 228,136 180,158 132,136"
                  fill="#1E1B4B"
                  fillOpacity="0.88"
                  stroke="#A78BFA"
                  strokeWidth="1.1"
                />
                <line
                  x1="180"
                  y1="68"
                  x2="180"
                  y2="210"
                  stroke="#E0F2FE"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                />
              </g>

              {/* Floating Glass Module Node 1 (Top Left: SVO Grammar) */}
              <g transform="translate(18, 34)">
                <rect
                  width="112"
                  height="52"
                  rx="12"
                  fill="url(#lv-card-glass)"
                  stroke="#38BDF8"
                  strokeOpacity="0.45"
                  strokeWidth="1"
                />
                <text x="12" y="21" fill="#38BDF8" fontSize="9.5" fontWeight="700" fontFamily="monospace">
                  STAGE 01–07
                </text>
                <text x="12" y="38" fill="#F8FAFC" fontSize="11.5" fontWeight="600">
                  S + V + O Clarity
                </text>
              </g>

              {/* Floating Glass Module Node 2 (Top Right: Bangla Contrast) */}
              <g transform="translate(232, 32)">
                <rect
                  width="112"
                  height="52"
                  rx="12"
                  fill="url(#lv-card-glass)"
                  stroke="#A78BFA"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                />
                <text x="12" y="21" fill="#C4B5FD" fontSize="9.5" fontWeight="700" fontFamily="monospace">
                  L1 CONTRAST
                </text>
                <text x="12" y="39" fill="#F8FAFC" fontSize="11.5" fontWeight="600">
                  বাংলা → English
                </text>
              </g>

              {/* Floating Glass Module Node 3 (Bottom Left: Spaced Retention) */}
              <g transform="translate(22, 198)">
                <rect
                  width="132"
                  height="54"
                  rx="12"
                  fill="url(#lv-card-glass)"
                  stroke="#3B82F6"
                  strokeOpacity="0.48"
                  strokeWidth="1"
                />
                <text x="12" y="21" fill="#93C5FD" fontSize="9.5" fontWeight="700" fontFamily="monospace">
                  SPACED MASTERY
                </text>
                <rect x="12" y="31" width="108" height="6" rx="3" fill="#1E293B" />
                <rect
                  x="12"
                  y="31"
                  width={Math.max(14, Math.round((108 * Math.max(averageMasteryPercent, 12)) / 100))}
                  height="6"
                  rx="3"
                  fill="#00D9FF"
                />
                <text x="12" y="47" fill="#CBD5E1" fontSize="9" fontFamily="monospace">
                  {averageMasteryPercent}% verified
                </text>
              </g>

              {/* Floating Glass Module Node 4 (Bottom Right: Verified Courses) */}
              <g transform="translate(226, 200)">
                <rect
                  width="118"
                  height="52"
                  rx="12"
                  fill="url(#lv-card-glass)"
                  stroke="#E42BFF"
                  strokeOpacity="0.42"
                  strokeWidth="1"
                />
                <text x="12" y="21" fill="#F0ABFC" fontSize="9.5" fontWeight="700" fontFamily="monospace">
                  LIVE TRACKS
                </text>
                <text x="12" y="38" fill="#F8FAFC" fontSize="11.5" fontWeight="600">
                  {totalCourses} Courses · {totalLessonsCount} Lessons
                </text>
              </g>

              {/* Orbital anchor points */}
              <circle cx="62" cy="116" r="4" fill="#00D9FF" />
              <circle cx="304" cy="126" r="4.5" fill="#A78BFA" />
              <circle cx="268" cy="176" r="3.5" fill="#E42BFF" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
