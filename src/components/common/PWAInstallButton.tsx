import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useLanguage } from '../../i18n/LanguageContext';

export function PWAInstallButton() {
  const { lang } = useLanguage();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        data-testid="pwa-install-btn"
        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-500/20 transition-colors cursor-pointer whitespace-nowrap"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">
          {lang === 'bn' ? 'অ্যাপ ইনস্টল' : 'Install App'}
        </span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          data-testid="pwa-ios-install-btn"
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-500/20 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">
            {lang === 'bn' ? 'iOS ইনস্টল' : 'Install on iOS'}
          </span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-guide-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-2xl border border-cyan-400/30 bg-[#09112B] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 id="ios-install-guide-title" className="font-portal text-base font-bold text-white">
                  {lang === 'bn'
                    ? 'iPhone / iPad-এ ইনস্টল করুন'
                    : 'Install LINGUAVERSE AI on iOS'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                <li>
                  1.{' '}
                  {lang === 'bn'
                    ? 'Safari টুলবারে Share বাটনে ট্যাপ করুন।'
                    : 'Tap the Share button in Safari’s bottom toolbar.'}
                </li>
                <li>
                  2.{' '}
                  {lang === 'bn'
                    ? 'নিচে স্ক্রল করে "Add to Home Screen" বেছে নিন।'
                    : 'Scroll down and tap "Add to Home Screen".'}
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-800 py-2 text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer"
              >
                {lang === 'bn' ? 'ঠিক আছে' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
