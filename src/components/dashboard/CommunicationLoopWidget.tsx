import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, RefreshCw, Sparkles } from 'lucide-react';
import type { CommunicationLoopStage } from '../../domain/dashboardIntelligence';

interface CommunicationLoopWidgetProps {
  stages: CommunicationLoopStage[];
  lang: 'en' | 'bn';
}

export function CommunicationLoopWidget({ stages, lang }: CommunicationLoopWidgetProps) {
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const activeStage = stages.find((s) => s.status === 'active') ?? stages[0];

  return (
    <section
      aria-labelledby="comm-loop-heading"
      data-testid="communication-loop-widget"
      className="rounded-2xl border border-cyan-400/20 bg-[linear-gradient(155deg,rgba(11,18,44,0.92)_0%,rgba(7,13,36,0.96)_100%)] p-6 shadow-[0_18px_48px_rgba(2,6,22,0.55)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00D9FF]">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {lang === 'bn'
              ? 'কমিউনিকেশন ইম্প্রুভমেন্ট লুপ · ৮ ধাপ'
              : 'Communication Improvement Loop · 8 Stages'}
          </p>
          <h2 id="comm-loop-heading" className="font-portal mt-1 text-lg font-bold text-white sm:text-xl">
            {lang === 'bn'
              ? 'শনাক্ত থেকে দক্ষতা — আপনার সক্রিয় শেখার চক্র'
              : 'From Mistake Detection to Real-World Fluency'}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            {lang === 'bn'
              ? 'প্রতিটি ধাপ সরাসরি আপনার বাস্তব অনুশীলনের রেকর্ডের সাথে যুক্ত। যেকোনো ধাপে ক্লিক করে সরাসরি সংশ্লিষ্ট মডিউলে যান।'
              : 'Each stage tracks real learner evidence from your account. Select any stage to jump straight into its live workspace.'}
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#060B22]/90 px-3.5 py-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {lang === 'bn' ? 'চক্রের অগ্রগতি' : 'Loop Progress'}
            </p>
            <p className="font-mono text-sm font-bold text-white tabular-nums">
              {completedCount}/{stages.length}{' '}
              <span className="text-xs font-normal text-slate-400">
                {lang === 'bn' ? 'ধাপ সম্পন্ন' : 'stages verified'}
              </span>
            </p>
          </div>
          {activeStage && (
            <Link
              to={activeStage.to}
              className="lv-portal-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap"
            >
              <span>
                {lang === 'bn'
                  ? `পরবর্তী: ${activeStage.labelBn}`
                  : `Next: ${activeStage.labelEn}`}
              </span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {/* 8-Stage Interactive Grid */}
      <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage) => {
          const isCompleted = stage.status === 'completed';
          const isActive = stage.status === 'active';
          return (
            <li key={stage.id}>
              <Link
                to={stage.to}
                data-testid={`comm-loop-stage-${stage.id}`}
                className={`group flex h-full flex-col justify-between rounded-xl border p-3.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D9FF] ${
                  isActive
                    ? 'border-[#00D9FF]/60 bg-[linear-gradient(145deg,rgba(0,217,255,0.12)_0%,rgba(124,58,237,0.12)_100%)] shadow-[0_0_24px_rgba(0,217,255,0.12)]'
                    : isCompleted
                      ? 'border-emerald-400/35 bg-emerald-500/[0.06] hover:border-emerald-400/60'
                      : 'border-slate-800/90 bg-[#070D24]/85 hover:border-slate-700 hover:bg-[#0B1435]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wider text-slate-300">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isActive
                              ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                              : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {stage.stepNumber}
                      </span>
                      <span
                        className={
                          isActive
                            ? 'text-[#00D9FF]'
                            : isCompleted
                              ? 'text-emerald-300'
                              : 'text-slate-200'
                        }
                      >
                        {lang === 'bn' ? stage.labelBn : stage.labelEn}
                      </span>
                    </span>

                    {isCompleted ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-400"
                        aria-label={lang === 'bn' ? 'সম্পন্ন' : 'Completed'}
                      />
                    ) : isActive ? (
                      <Sparkles
                        className="h-4 w-4 shrink-0 text-[#00D9FF]"
                        aria-label={lang === 'bn' ? 'বর্তমান ধাপ' : 'Active step'}
                      />
                    ) : (
                      <Circle
                        className="h-3.5 w-3.5 shrink-0 text-slate-600"
                        aria-label={lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}
                      />
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {lang === 'bn' ? stage.summaryBn : stage.summaryEn}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-[11px]">
                  <span
                    className={`truncate font-mono ${
                      isCompleted
                        ? 'text-emerald-300'
                        : isActive
                          ? 'text-cyan-200'
                          : 'text-slate-400'
                    }`}
                  >
                    {lang === 'bn' ? stage.evidenceBn : stage.evidenceEn}
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-[#00D9FF]"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
