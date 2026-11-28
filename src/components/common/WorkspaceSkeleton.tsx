import React from 'react';

/**
 * Zero-CLS Workspace Route Skeleton
 * Matches LearnerShell sidebar + sticky header + main workspace grid geometry
 * so lazy route transitions feel instant and layout-stable without blank flashes.
 */
export function WorkspaceRouteSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading workspace"
      className="flex min-h-screen bg-[#05091F] text-slate-300"
    >
      {/* Desktop Sidebar Skeleton */}
      <div className="hidden w-64 shrink-0 border-r border-cyan-400/10 bg-[#070D24]/95 p-4 lg:flex lg:flex-col">
        <div className="flex h-10 items-center gap-2.5 border-b border-slate-800/70 pb-4">
          <div className="h-8 w-8 rounded-lg bg-slate-800/80" />
          <div className="h-4 w-32 rounded bg-slate-800/70" />
        </div>
        <div className="mt-5 space-y-2">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={idx}
              className="h-9 w-full animate-pulse rounded-xl bg-[#0D1638]/75"
            />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-cyan-400/10 bg-[#060B22]/90 px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="h-5 w-44 animate-pulse rounded-lg bg-slate-800/80" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-800/70" />
            <div className="h-9 w-16 animate-pulse rounded-xl bg-slate-800/70" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-28 w-full animate-pulse rounded-2xl border border-slate-800/60 bg-[#0A1334]/75" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-36 animate-pulse rounded-2xl border border-slate-800/60 bg-[#0A1334]/70" />
            <div className="h-36 animate-pulse rounded-2xl border border-slate-800/60 bg-[#0A1334]/70" />
            <div className="h-36 animate-pulse rounded-2xl border border-slate-800/60 bg-[#0A1334]/70" />
          </div>
          <span className="sr-only">Loading LINGUAVERSE AI...</span>
        </div>
      </div>
    </div>
  );
}
