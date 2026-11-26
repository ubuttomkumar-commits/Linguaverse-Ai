import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { fetchAuthProviders } from '../../services/authApi';
import { useLanguage } from '../../i18n/LanguageContext';

interface GoogleOAuthButtonProps {
  mode: 'login' | 'register';
}

/**
 * Honest Google OAuth control.
 * Queries GET /api/v1/auth/providers — never simulates fake OAuth login.
 * If configured on the server, navigates to real OAuth initiation; otherwise
 * informs the user transparently that Google OAuth is not configured yet.
 */
export function GoogleOAuthButton({ mode }: GoogleOAuthButtonProps) {
  const { lang } = useLanguage();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAuthProviders().then((info) => {
      if (active) setConfigured(info.google.configured);
    });
    return () => {
      active = false;
    };
  }, []);

  if (configured === null) {
    return null;
  }

  const label =
    mode === 'login'
      ? lang === 'bn'
        ? 'Google দিয়ে চালিয়ে যান'
        : 'Continue with Google'
      : lang === 'bn'
        ? 'Google দিয়ে অ্যাকাউন্ট খুলুন'
        : 'Continue with Google';

  const handleClick = () => {
    if (configured) {
      window.location.href = '/api/v1/auth/google';
      return;
    }
    setShowNotice((prev) => !prev);
  };

  return (
    <div className="space-y-2.5">
      <div className="relative my-5 flex items-center">
        <div className="flex-1 border-t border-cyan-400/15" />
        <span className="px-3 text-xs font-medium text-slate-400">
          {lang === 'bn' ? 'অথবা চালিয়ে যান' : 'or continue with'}
        </span>
        <div className="flex-1 border-t border-cyan-400/15" />
      </div>

      <button
        type="button"
        onClick={handleClick}
        aria-expanded={!configured ? showNotice : undefined}
        className={`flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
          configured
            ? 'border-cyan-400/30 bg-[#0B1438]/90 text-white hover:border-[#00D9FF]/65 hover:bg-[#101E4D]'
            : 'border-indigo-400/25 bg-[#091233]/75 text-slate-200 hover:border-cyan-400/40'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
          />
        </svg>
        <span>{label}</span>
        {!configured && (
          <span className="text-[11px] text-slate-400">
            ({lang === 'bn' ? 'কনফিগার করা নেই' : 'Not configured'})
          </span>
        )}
      </button>

      {showNotice && !configured && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-cyan-400/25 bg-[#0A1334] px-3.5 py-2.5 text-xs leading-relaxed text-slate-300"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00D9FF]" aria-hidden="true" />
          <span>
            {lang === 'bn'
              ? 'এই সার্ভারে Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) এখনো কনফিগার করা হয়নি। অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড দিয়ে এগিয়ে যান।'
              : 'Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) is not configured on this server yet. Please sign in with your email and password.'}
          </span>
        </div>
      )}
    </div>
  );
}
