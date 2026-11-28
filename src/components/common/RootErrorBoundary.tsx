import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import {
  BOOT_RELOAD_GUARD_KEY,
  CHUNK_RELOAD_GUARD_KEY,
  looksLikeChunkLoadError,
  shouldAttemptAutoRecoveryReload,
} from '../../domain/bootRecovery';
import { purgeAllServiceWorkerCaches } from '../../utils/pwaRuntime';

declare global {
  interface Window {
    __LV_APP_MOUNTED__?: boolean;
  }
}

interface RootErrorBoundaryProps {
  appName?: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
}

async function clearStaleCachesAndReload(): Promise<void> {
  try {
    await purgeAllServiceWorkerCaches();
  } catch {
    // Best-effort cache cleanup before hard reload
  }
  window.location.reload();
}

function triggerGuardedChunkRecovery(): void {
  if (typeof window === 'undefined') return;
  try {
    const lastAttempt = window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY);
    if (shouldAttemptAutoRecoveryReload(lastAttempt)) {
      window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(Date.now()));
      void clearStaleCachesAndReload();
    }
  } catch {
    // Fallback to manual recovery UI
  }
}

/**
 * Top-level Root Error Boundary for both the Learner PWA and Separate Admin App.
 * Guarantees an unhandled render or dynamic chunk failure NEVER produces a blank
 * dark screen, while strictly hiding internal stack traces and runtime details
 * from public users.
 */
export class RootErrorBoundary extends React.Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    return {
      hasError: true,
      isChunkError: looksLikeChunkLoadError(error),
    };
  }

  componentDidCatch(error: unknown): void {
    if (looksLikeChunkLoadError(error)) {
      triggerGuardedChunkRecovery();
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, isChunkError: false });
  };

  handleHardReload = (): void => {
    try {
      window.sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);
      window.sessionStorage.removeItem(BOOT_RELOAD_GUARD_KEY);
    } catch {
      // Ignore storage restrictions
    }
    void clearStaleCachesAndReload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const appName = this.props.appName || 'LINGUAVERSE AI';

    return (
      <div
        role="alert"
        className="min-h-screen bg-[#05091F] text-slate-100 flex items-center justify-center px-4 py-10"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B122C] p-6 sm:p-8 shadow-2xl shadow-black/60 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/35 bg-rose-500/15 text-rose-300">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>

          <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
            {appName}
          </p>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-white">
            {this.state.isChunkError
              ? 'New App Update Available'
              : 'Unable to Display This Screen'}
          </h1>

          <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
            {this.state.isChunkError
              ? 'A newer version of the application was just deployed. Reload to load the latest files cleanly.'
              : this.props.isAdmin
                ? 'A temporary display issue interrupted the Admin portal. Your data and session settings remain protected.'
                : 'A temporary display issue occurred. Your saved learning progress is safe — retry or reload to continue.'}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:border-cyan-400/50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={this.handleHardReload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Reload Fresh App</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Lightweight isolated boundary for optional features (e.g., 3D WebGL Globe,
 * individual landing sections) so a non-critical failure degrades gracefully
 * without ever blanking out the surrounding page.
 */
export class SafeFeatureBoundary extends React.Component<
  { fallback?: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback?: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Intentionally isolated so non-critical feature errors do not crash the page
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

let preloadRecoveryInstalled = false;

export function installVitePreloadRecovery(): void {
  if (typeof window === 'undefined' || preloadRecoveryInstalled) return;
  preloadRecoveryInstalled = true;

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    triggerGuardedChunkRecovery();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (looksLikeChunkLoadError(event.reason)) {
      event.preventDefault();
      triggerGuardedChunkRecovery();
    }
  });
}

/**
 * Marks the React application as successfully mounted (disabling the HTML boot watchdog)
 * and clears one-shot reload guards once the page stays healthy for 5 seconds.
 */
export function markAppBootMounted(): void {
  if (typeof window === 'undefined') return;
  window.__LV_APP_MOUNTED__ = true;
  window.setTimeout(() => {
    try {
      window.sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);
      window.sessionStorage.removeItem(BOOT_RELOAD_GUARD_KEY);
    } catch {
      // Ignore storage restrictions
    }
  }, 5_000);
}
