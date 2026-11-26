import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { AuthPortalLayout } from '../components/auth/AuthPortalLayout';
import type { PortalVisualState } from '../components/auth/PortalFallbackVisual';
import { normalizeOtpInput } from '../domain/otpVerification';
import { maskEmailAddress } from '../domain/authSecurityEngine';

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
  const prefersReduced = useReducedMotion();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const navTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      window.clearInterval(id);
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.emailVerified !== false && !verifiedSuccess && !isVerifying) {
      navigate(profile?.onboardingCompleted ? '/app' : '/onboarding', { replace: true });
    }
  }, [user, profile, navigate, verifiedSuccess, isVerifying]);

  const expirySecondsLeft = pendingOtpDelivery?.expiresAt
    ? Math.max(0, Math.ceil((Date.parse(pendingOtpDelivery.expiresAt) - nowMs) / 1000))
    : 0;
  const resendSecondsLeft = pendingOtpDelivery?.resendAvailableAt
    ? Math.max(0, Math.ceil((Date.parse(pendingOtpDelivery.resendAvailableAt) - nowMs) / 1000))
    : 0;

  const fullCode = digits.join('');

  const portalState: PortalVisualState = verifiedSuccess
    ? 'success'
    : isVerifying
      ? 'submitting'
      : error
        ? 'error'
        : focusedIdx !== null
          ? 'focused'
          : 'idle';

  const handleDigitChange = (index: number, rawValue: string) => {
    const clean = normalizeOtpInput(rawValue);
    setError(null);
    if (clean.length > 1) {
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        next[i] = clean[i] ?? '';
      }
      setDigits(next);
      const focusTarget = Math.min(5, clean.length);
      inputRefs.current[focusTarget]?.focus();
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
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
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
      setVerifiedSuccess(true);
      navTimerRef.current = window.setTimeout(
        () => navigate('/auth/success?flow=verified', { replace: true }),
        prefersReduced ? 120 : 480
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'কোড যাচাই ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
            : 'Verification failed. Please check the code and try again.'
      );
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
            ? `${maskEmailAddress(nextDelivery.email)} ঠিকানায় নতুন ৬-সংখ্যার কোড পাঠানো হয়েছে।`
            : `A new 6-digit verification code has been emailed to ${maskEmailAddress(nextDelivery.email)}.`
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

  const handleBackToLogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const maskedEmail = maskEmailAddress(user.email);

  return (
    <AuthPortalLayout
      sceneVariant="verify-email"
      portalState={portalState}
      portalHeadlineEn="Verify Your Email"
      portalHeadlineBn="আপনার ইমেইল যাচাই করুন"
      portalDescriptionEn="Enter the 6-digit code sent to your email address"
      portalDescriptionBn="আপনার ইমেইল ঠিকানায় পাঠানো ৬-সংখ্যার যাচাইকরণ কোডটি লিখুন"
      onSignOut={() => void handleBackToLogin()}
    >
      {/* Centered Header Matching Reference Screen 04 */}
      <div className="text-center">
        <h1 className="font-portal text-2xl font-bold tracking-tight text-white sm:text-[26px]">
          {lang === 'bn' ? 'OTP যাচাইকরণ' : 'OTP Verification'}
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          {lang === 'bn'
            ? 'আমরা একটি ৬-সংখ্যার যাচাইকরণ কোড পাঠিয়েছি:'
            : "We've sent a verification code to"}
        </p>
        <p className="mt-1 font-portal text-sm font-bold tracking-wide text-white">
          {maskedEmail}
        </p>
      </div>

      {/* Honest Local Development Preview Banner — ONLY when no email API key is configured */}
      {pendingOtpDelivery?.deliveryMode === 'local_dev_preview' &&
        pendingOtpDelivery.devPreviewOtp && (
          <div
            role="status"
            data-testid="dev-otp-preview-banner"
            className="mt-5 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-amber-300">
                  {lang === 'bn'
                    ? 'লোকাল ডেভেলপমেন্ট প্রিভিউ (ইমেইল প্রোভাইডার কনফিগার নেই)'
                    : 'Local Development Preview (No Email Provider Configured)'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                  {lang === 'bn'
                    ? 'প্রোডাকশনে কোডটি সরাসরি আপনার ইনবক্সে পাঠানো হবে। অটো-ফিল করতে কোডে ক্লিক করুন।'
                    : 'In production this code is emailed directly. Click the code to auto-fill:'}
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
                className="shrink-0 rounded-lg border border-amber-400/45 bg-[#05091F] px-2.5 py-1.5 font-mono text-sm font-bold tracking-widest text-amber-200 transition-colors hover:bg-amber-950/60 cursor-pointer"
                title={lang === 'bn' ? 'কোডটি অটো-ফিল করুন' : 'Click to fill code'}
              >
                {pendingOtpDelivery.devPreviewOtp}
              </button>
            </div>
          </div>
        )}

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="otp-err"
            role="alert"
            initial={prefersReduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/45 bg-rose-950/40 p-3.5 text-sm text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {infoNotice && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/35 bg-emerald-950/30 p-3.5 text-sm text-emerald-200"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>{infoNotice}</span>
        </div>
      )}

      <form onSubmit={handleVerifySubmit} className="mt-6 space-y-5" noValidate>
        <div>
          <label htmlFor="otp-digit-0" className="sr-only">
            {lang === 'bn' ? '৬-সংখ্যার কোড লিখুন' : 'Enter 6-Digit Verification Code'}
          </label>
          <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
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
                onFocus={() => setFocusedIdx(index)}
                onBlur={() => setFocusedIdx(null)}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`h-13 w-full rounded-xl border bg-[#091236]/95 text-center font-mono text-xl font-bold text-white transition-all focus:outline-none ${
                  digit
                    ? 'border-[#00D9FF]/80 shadow-[0_0_16px_rgba(0,217,255,0.28)]'
                    : 'border-cyan-400/35 focus:border-[#00D9FF] focus:shadow-[0_0_16px_rgba(0,217,255,0.28)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Centered Resend Timer & Code Expiry Status (Matches Reference Screen 04) */}
        <div className="flex flex-col items-center gap-1 text-center text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
            {resendSecondsLeft > 0 ? (
              lang === 'bn' ? (
                <>নতুন কোড পাঠান {formatCountdown(resendSecondsLeft)} পর</>
              ) : (
                <>Resend code in {formatCountdown(resendSecondsLeft)}</>
              )
            ) : expirySecondsLeft > 0 ? (
              lang === 'bn' ? (
                <>কোডের মেয়াদ বাকি {formatCountdown(expirySecondsLeft)}</>
              ) : (
                <>Code expires in {formatCountdown(expirySecondsLeft)}</>
              )
            ) : pendingOtpDelivery?.expiresAt ? (
              <span className="text-amber-300">
                {lang === 'bn' ? 'কোডের মেয়াদ শেষ — নতুন কোড পাঠান' : 'Code expired — request a new one'}
              </span>
            ) : lang === 'bn' ? (
              'নতুন কোড পাঠাতে প্রস্তুত'
            ) : (
              'Ready to resend code'
            )}
          </span>
        </div>

        <button
          type="submit"
          disabled={isVerifying || verifiedSuccess || fullCode.length !== 6}
          className="lv-portal-btn-violet inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-55 cursor-pointer"
        >
          {verifiedSuccess ? (
            <>
              <CheckCircle2 className="h-4.5 w-4.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'অ্যাকাউন্ট যাচাই হয়েছে!' : 'Account Verified!'}</span>
            </>
          ) : isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying Account...'}</span>
            </>
          ) : (
            <>
              <span>{lang === 'bn' ? 'অ্যাকাউন্ট যাচাই করুন' : 'Verify Account'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      {/* Resend & Back to Login Footer (Matches Reference Screen 04) */}
      <div className="mt-5 space-y-3 text-center text-xs text-slate-300">
        <div>
          <span>{lang === 'bn' ? 'কোড পাননি?' : "Didn't receive the code?"} </span>
          <button
            type="button"
            disabled={isResending || resendSecondsLeft > 0}
            onClick={() => void handleResend()}
            className="font-semibold text-[#38BDF8] underline decoration-[#38BDF8]/40 underline-offset-2 transition-colors hover:text-[#00D9FF] disabled:opacity-45 cursor-pointer"
          >
            {isResending
              ? lang === 'bn'
                ? 'পাঠানো হচ্ছে...'
                : 'Sending...'
              : lang === 'bn'
                ? 'আবার পাঠান'
                : 'Resend'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleBackToLogin()}
          className="inline-flex items-center gap-1.5 font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Login'}</span>
        </button>
      </div>
    </AuthPortalLayout>
  );
}
