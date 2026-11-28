import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface WorkspaceErrorBoundaryProps {
  lang?: 'en' | 'bn';
  children: React.ReactNode;
}

interface WorkspaceErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class WorkspaceErrorBoundary extends React.Component<
  WorkspaceErrorBoundaryProps,
  WorkspaceErrorBoundaryState
> {
  constructor(props: WorkspaceErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): WorkspaceErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || null,
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      const isBn = this.props.lang === 'bn';
      return (
        <section
          role="alert"
          className="rounded-2xl border border-rose-500/35 bg-[#120D24]/90 p-6 text-slate-200 shadow-[0_18px_46px_rgba(2,6,22,0.55)]"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-portal text-base font-bold text-white">
                {isBn
                  ? 'এই অংশটি লোড করতে সমস্যা হয়েছে'
                  : 'Something went wrong while rendering this view'}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {isBn
                  ? 'আপনার শেখার ডেটা নিরাপদ আছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
                  : 'Your saved learning records are safe. Retry rendering this view without losing your progress.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isBn ? 'আবার চেষ্টা করুন' : 'Try Again'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
