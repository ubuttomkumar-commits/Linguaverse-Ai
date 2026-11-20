import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { normalizeOtpInput } from '../domain/otpVerification';

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VerifyEmailPage() {
  const { lang } = useLanguage();
  const {
    user,
    profile,
    pendingOtpDelivery,
    verifyEmailOtp,
    resendEmailOtp,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.emailVerified !== false) {
      navigate(profile?.onboardingCompleted ? '/app' : '/onboarding', { replace: true });
    }
  }, [user, profile, navigate]);

  const expirySecondsLeft = pendingOtpDelivery?.expiresAt
    ? Math.max(0, Math.ceil((Date.parse(pendingOtpDelivery.expiresAt) - nowMs) / 1000))
    : 0;
  const resendSecondsLeft = pendingOtpDelivery?.resendAvailableAt
    ? Math.max(0, Math.ceil((Date.parse(pendingOtpDelivery.resendAvailableAt) - nowMs) / 1000))
    : 0;

  const fullCode = digits.join('');

  const handleDigitChange = (index: number, rawValue: string) => {
    const clean = normalizeOtpInput(rawValue);
    setError(null);
    if (clean.length > 1) {
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        next[i] = clean[i] ?? '';
      }
      setDigits(next);
      const focusIdx = Math.min(5, clean.length);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = normalizeOtpInput(e.clipboardData.getData('text'));
    if (!pasted) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] ?? '';
    }
    setDigits(next);
    inputRefs.current[Math.min(5, pasted.length)]?.focus();
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoNotice(null);

    if (fullCode.length !== 6) {
      setError(
        lang === 'bn'
          ? 'অনুগ্রহ করে ৬-সংখ্যার যাচাইকরণ কোডটি সম্পূর্ণ লিখুন।'
          : 'Please enter all 6 digits of your verification code.'
      );
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmailOtp(fullCode);
      navigate(profile?.onboardingCompleted ? '/app' : '/onboarding', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'কোড যাচাই ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
            : 'Verification failed. Please check the code and try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfoNotice(null);
    setIsResending(true);
    try {
      const nextDelivery = await resendEmailOtp();
      setDigits(['', '', '', '', '', '']);
      setInfoNotice(
        nextDelivery.deliveryMode === 'email_provider'
          ? lang === 'bn'
            ? `${nextDelivery.email} ঠিকানায় নতুন ৬-সংখ্যার কোড পাঠানো হয়েছে।`
            : `A new 6-digit verification code has been emailed to ${nextDelivery.email}.`
          : lang === 'bn'
            ? 'নতুন লোকাল ডেভ প্রিভিউ কোড তৈরি করা হয়েছে (নিচে দেখুন)।'
            : 'A fresh verification code has been generated in local development preview mode.'
      );
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'নতুন কোড পাঠানো সম্ভব হয়নি।'
            : 'Unable to resend verification code.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    navigate('/register', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/80 bg-[#050914]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{lang === 'bn' ? 'হোম পেজে ফিরুন' : 'Back to Home'}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle compact />
            <button
              type="button"
              onClick={() => void handleSwitchAccount()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0E1526] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-[#0E1526] p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3B82F6]/40 bg-[#3B82F6]/15 text-[#3B82F6]">
              <MailCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#3B82F6]">
                {lang === 'bn' ? 'ইমেইল যাচাইকরণ (OTP)' : 'Email Verification (6-Digit OTP)'}
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white">
                {lang === 'bn'
                  ? 'আপনার ইমেইল ইনবক্স চেক করুন'
                  : 'Verify Your Email Address'}
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            {lang === 'bn' ? (
              <>
                আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে{' '}
                <span className="font-semibold text-white">{user.email}</span> ঠিকানায় ৬-সংখ্যার
                একটি যাচাইকরণ কোড পাঠানো হয়েছে। ওয়ার্কস্পেস আনলক করতে নিচে কোডটি লিখুন।
              </>
            ) : (
              <>
                To protect your learner profile and activate your workspace, enter the 6-digit
                verification code issued for{' '}
                <span className="font-semibold text-white">{user.email}</span>.
              </>
            )}
          </p>

          {/* Honest Local Development Preview Banner — ONLY when no email API key is configured */}
          {pendingOtpDelivery?.deliveryMode === 'local_dev_preview' &&
            pendingOtpDelivery.devPreviewOtp && (
              <div
                role="status"
                data-testid="dev-otp-preview-banner"
                className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-amber-300">
                      {lang === 'bn'
                        ? 'লোকাল ডেভেলপমেন্ট প্রিভিউ (ইমেইল প্রোভাইডার কী সেট করা নেই)'
                        : 'Local Development Preview (No Email Provider API Key Configured)'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                      {lang === 'bn'
                        ? 'প্রোডাকশনে RESEND_API_KEY বা EMAIL_PROVIDER_API_KEY যুক্ত করলে এই কোডটি সরাসরি আপনার Gmail ইনবক্সে যাবে।'
                        : 'In production with RESEND_API_KEY or EMAIL_PROVIDER_API_KEY set, this code is delivered directly to your Gmail inbox.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const code = pendingOtpDelivery.devPreviewOtp ?? '';
                      if (code.length === 6) {
                        setDigits(code.split(''));
                        setError(null);
                      }
                    }}
                    className="shrink-0 rounded-lg border border-amber-400/50 bg-[#050914] px-2.5 py-1.5 font-mono text-sm font-bold tracking-widest text-amber-200 hover:bg-amber-950/50 cursor-pointer"
                    title={lang === 'bn' ? 'কোডটি অটো-ফিল করুন' : 'Click to fill code'}
                  >
                    {pendingOtpDelivery.devPreviewOtp}
                  </button>
                </div>
              </div>
            )}

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3.5 text-sm text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {infoNotice && (
            <div
              role="status"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/25 p-3.5 text-sm text-emerald-200"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <span>{infoNotice}</span>
            </div>
          )}

          <form onSubmit={handleVerifySubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label
                htmlFor="otp-digit-0"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                {lang === 'bn' ? '৬-সংখ্যার কোড লিখুন' : 'Enter 6-Digit Verification Code'}
              </label>
              <div className="mt-2.5 grid grid-cols-6 gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    id={`otp-digit-${index}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={6}
                    aria-label={`Verification code digit ${index + 1}`}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="h-13 w-full rounded-xl border border-slate-700 bg-[#050914] text-center font-mono text-xl font-bold text-white focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/30 focus:outline-none"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {pendingOtpDelivery?.expiresAt ? (
                  expirySecondsLeft > 0 ? (
                    lang === 'bn' ? (
                      <>কোডের মেয়াদ বাকি: {formatCountdown(expirySecondsLeft)}</>
                    ) : (
                      <>Code expires in {formatCountdown(expirySecondsLeft)}</>
                    )
                  ) : lang === 'bn' ? (
                    <span className="text-amber-300">কোডের মেয়াদ শেষ — নতুন কোড পাঠান</span>
                  ) : (
                    <span className="text-amber-300">Code expired — request a new one</span>
                  )
                ) : lang === 'bn' ? (
                  'নতুন কোড পেতে নিচে ক্লিক করুন'
                ) : (
                  'Request a fresh code if you need a new OTP'
                )}
              </span>

              <span className="inline-flex items-center gap-1 text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
                {lang === 'bn' ? 'SHA-256 সুরক্ষিত' : 'SHA-256 Hashed OTP'}
              </span>
            </div>

            <button
              type="submit"
              disabled={isVerifying || fullCode.length !== 6}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <span>
                {isVerifying
                  ? lang === 'bn'
                    ? 'যাচাই করা হচ্ছে...'
                    : 'Verifying...'
                  : lang === 'bn'
                    ? 'ইমেইল যাচাই ও ওয়ার্কস্পেস আনলক করুন'
                    : 'Verify Email & Unlock Workspace'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'কোড পাননি বা মেয়াদ শেষ?' : 'Did not receive the code?'}
            </p>
            <button
              type="button"
              disabled={isResending || resendSecondsLeft > 0}
              onClick={() => void handleResend()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#050914] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-[#3B82F6] hover:text-white disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>
                {resendSecondsLeft > 0
                  ? lang === 'bn'
                    ? `আবার পাঠান (${resendSecondsLeft} সেকেন্ড)`
                    : `Resend Code (${resendSecondsLeft}s)`
                  : lang === 'bn'
                    ? 'নতুন কোড পাঠান'
                    : 'Resend Code'}
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
