import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Check, Clock, Layers, Plus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { AcademyCourseSummary } from '../../domain/academyEngine';

interface CourseArtworkCardProps {
  summary: AcademyCourseSummary;
  onToggleEnroll: (courseId: string) => void;
}

function CourseVisualArtwork({ courseId }: { courseId: string }) {
  if (courseId === 'course_tenses') {
    return (
      <svg
        viewBox="0 0 360 132"
        aria-hidden="true"
        className="h-32 w-full object-cover"
      >
        <defs>
          <linearGradient id="art-tenses-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#121445" />
            <stop offset="60%" stopColor="#1E1B5E" />
            <stop offset="100%" stopColor="#091334" />
          </linearGradient>
          <linearGradient id="art-tenses-arc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="55%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#00D9FF" />
          </linearGradient>
        </defs>
        <rect width="360" height="132" fill="url(#art-tenses-bg)" />
        <path
          d="M 28 96 Q 180 18 332 82"
          fill="none"
          stroke="url(#art-tenses-arc)"
          strokeWidth="3"
        />
        <path
          d="M 46 108 Q 180 42 316 96"
          fill="none"
          stroke="#A78BFA"
          strokeOpacity="0.35"
          strokeDasharray="4 5"
          strokeWidth="1.5"
        />
        <circle cx="96" cy="70" r="8" fill="#8B5CF6" fillOpacity="0.3" stroke="#C4B5FD" strokeWidth="1.5" />
        <circle cx="180" cy="52" r="10" fill="#3B82F6" fillOpacity="0.35" stroke="#93C5FD" strokeWidth="1.5" />
        <circle cx="268" cy="64" r="8" fill="#00D9FF" fillOpacity="0.3" stroke="#67E8F9" strokeWidth="1.5" />
        <text x="80" y="96" fill="#C4B5FD" fontSize="10" fontFamily="monospace">PAST</text>
        <text x="164" y="82" fill="#E0F2FE" fontSize="10" fontFamily="monospace">SINCE</text>
        <text x="255" y="94" fill="#67E8F9" fontSize="10" fontFamily="monospace">NOW</text>
      </svg>
    );
  }

  if (courseId === 'course_workplace') {
    return (
      <svg
        viewBox="0 0 360 132"
        aria-hidden="true"
        className="h-32 w-full object-cover"
      >
        <defs>
          <linearGradient id="art-work-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D163E" />
            <stop offset="55%" stopColor="#1D1548" />
            <stop offset="100%" stopColor="#0B1B3B" />
          </linearGradient>
        </defs>
        <rect width="360" height="132" fill="url(#art-work-bg)" />
        {/* 3D stepped communication bars */}
        <rect x="52" y="72" width="38" height="40" rx="6" fill="#3B82F6" fillOpacity="0.32" stroke="#60A5FA" strokeWidth="1.2" />
        <rect x="106" y="52" width="38" height="60" rx="6" fill="#8B5CF6" fillOpacity="0.36" stroke="#A78BFA" strokeWidth="1.2" />
        <rect x="160" y="34" width="38" height="78" rx="6" fill="#00D9FF" fillOpacity="0.32" stroke="#67E8F9" strokeWidth="1.4" />
        <rect x="214" y="48" width="96" height="58" rx="10" fill="#0A1230" fillOpacity="0.85" stroke="#E42BFF" strokeOpacity="0.45" strokeWidth="1.2" />
        <text x="228" y="72" fill="#F0ABFC" fontSize="10" fontFamily="monospace">IMPACT VERBS</text>
        <text x="228" y="90" fill="#E2E8F0" fontSize="10.5" fontWeight="600">B1 – B2 Clarity</text>
      </svg>
    );
  }

  // Default / Foundations artwork
  return (
    <svg
      viewBox="0 0 360 132"
      aria-hidden="true"
      className="h-32 w-full object-cover"
    >
      <defs>
        <linearGradient id="art-found-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#09153A" />
          <stop offset="55%" stopColor="#122156" />
          <stop offset="100%" stopColor="#0C1338" />
        </linearGradient>
      </defs>
      <rect width="360" height="132" fill="url(#art-found-bg)" />
      {/* Connected 3D syntax blocks */}
      <line x1="88" y1="68" x2="272" y2="68" stroke="#00D9FF" strokeOpacity="0.45" strokeWidth="2" />
      <rect x="34" y="46" width="84" height="44" rx="10" fill="#0E2052" stroke="#00D9FF" strokeOpacity="0.7" strokeWidth="1.4" />
      <text x="48" y="65" fill="#67E8F9" fontSize="9" fontFamily="monospace">01 SUBJECT</text>
      <text x="48" y="80" fill="#F8FAFC" fontSize="11.5" fontWeight="600">I / She</text>

      <rect x="138" y="38" width="84" height="52" rx="10" fill="#1C2566" stroke="#3B82F6" strokeOpacity="0.85" strokeWidth="1.5" />
      <text x="152" y="58" fill="#93C5FD" fontSize="9" fontFamily="monospace">02 VERB</text>
      <text x="152" y="76" fill="#FFFFFF" fontSize="12" fontWeight="700">speak</text>

      <rect x="242" y="46" width="86" height="44" rx="10" fill="#231957" stroke="#A78BFA" strokeOpacity="0.7" strokeWidth="1.4" />
      <text x="255" y="65" fill="#C4B5FD" fontSize="9" fontFamily="monospace">03 OBJECT</text>
      <text x="255" y="80" fill="#F8FAFC" fontSize="11.5" fontWeight="600">clearly</text>
    </svg>
  );
}

export function CourseArtworkCard({ summary, onToggleEnroll }: CourseArtworkCardProps) {
  const { lang } = useLanguage();
  const { course } = summary;

  const statusText =
    summary.status === 'completed'
      ? lang === 'bn'
        ? 'সম্পন্ন'
        : 'Completed'
      : summary.status === 'in_progress'
        ? lang === 'bn'
          ? 'চলমান'
          : 'In progress'
        : summary.enrolled
          ? lang === 'bn'
            ? 'যুক্ত আছেন'
            : 'Enrolled'
          : lang === 'bn'
            ? 'শুরু হয়নি'
            : 'Not started';

  const statusColor =
    summary.status === 'completed'
      ? 'text-emerald-400'
      : summary.status === 'in_progress'
        ? 'text-[#00D9FF]'
        : summary.enrolled
          ? 'text-violet-300'
          : 'text-slate-400';

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-[#080F2E]/85 transition-colors hover:border-[#3B82F6]/60">
      {/* Custom Lightweight 3D Artwork Header */}
      <div className="relative border-b border-slate-800/80">
        <CourseVisualArtwork courseId={course.id} />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#080F2E] to-transparent" />
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Zero-pill metadata line */}
        <p className="text-xs text-slate-400">
          <span className="font-mono font-semibold text-[#00D9FF]">{course.cefrRange}</span>
          <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
          <span>{lang === 'bn' ? summary.difficultyLabelBn : summary.difficultyLabelEn}</span>
          <span aria-hidden="true" className="mx-1.5 text-slate-600">·</span>
          <span className={`font-semibold ${statusColor}`}>{statusText}</span>
        </p>

        <h3 className="font-portal mt-2 text-lg font-bold leading-snug text-white group-hover:text-[#7DD3FC] transition-colors">
          <Link to={`/app/learn/course/${course.id}`} className="focus:outline-none">
            {lang === 'bn' ? course.titleBn : course.titleEn}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">
          {lang === 'bn' ? course.subtitleBn : course.subtitleEn}
        </p>

        {/* Clean factual metrics row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            <Layers className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            {summary.lessonCount} {lang === 'bn' ? 'লেসন' : 'lessons'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />~
            {summary.totalMinutes}m
          </span>
          <span className="font-mono tabular-nums">
            {summary.totalExercises} {lang === 'bn' ? 'অনুশীলন' : 'exercises'}
          </span>
          {summary.bookmarkedLessonCount > 0 && (
            <span className="inline-flex items-center gap-1 text-violet-300 font-mono tabular-nums">
              <Bookmark className="h-3 w-3 fill-current" aria-hidden="true" />
              {summary.bookmarkedLessonCount}
            </span>
          )}
        </div>

        {/* Verified Progress Bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {lang === 'bn' ? 'প্রমাণিত অগ্রগতি' : 'Verified progress'}
            </span>
            <span className="font-mono font-semibold text-slate-200 tabular-nums">
              {summary.completedLessonCount}/{summary.lessonCount} ({summary.completionPercent}%)
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] via-[#3B82F6] to-[#8B5CF6] transition-all duration-300"
              style={{ width: `${summary.completionPercent}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {lang === 'bn'
                ? `গড় মাস্টারি: ${summary.averageMasteryPercent}%`
                : `Avg mastery: ${summary.averageMasteryPercent}%`}
            </span>
            {summary.dueReviewCount > 0 && (
              <span className="font-semibold text-amber-300">
                {lang === 'bn'
                  ? `${summary.dueReviewCount}টি রিভিউ বকেয়া`
                  : `${summary.dueReviewCount} review due`}
              </span>
            )}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-800/80 pt-4">
          <Link
            to={`/app/learn/course/${course.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors whitespace-nowrap"
          >
            <span>
              {summary.status === 'in_progress'
                ? lang === 'bn'
                  ? 'কোর্স চালিয়ে যান'
                  : 'Continue Course'
                : lang === 'bn'
                  ? 'কোর্স ও কারিকুলাম দেখুন'
                  : 'View Course'}
            </span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => onToggleEnroll(course.id)}
            aria-pressed={summary.enrolled}
            disabled={summary.completedLessonCount > 0}
            title={
              summary.completedLessonCount > 0
                ? lang === 'bn'
                  ? 'অগ্রগতি থাকায় এই কোর্সটি স্বয়ংক্রিয়ভাবে এনরোলড'
                  : 'Automatically enrolled based on verified lesson progress'
                : undefined
            }
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              summary.enrolled
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                : 'border-slate-700 bg-[#05091F] text-slate-300 hover:border-[#00D9FF]/60 hover:text-white'
            } ${summary.completedLessonCount > 0 ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
          >
            {summary.enrolled ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'যুক্ত' : 'Enrolled'}</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'যুক্ত হোন' : 'Enroll'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
