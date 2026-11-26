import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  Loader2,
  Mail,
  RefreshCw,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { AuthPortalLayout } from '../components/auth/AuthPortalLayout';
import type { PortalVisualState } from '../components/auth/PortalFallbackVisual';
import { isValidEmailAddress } from '../domain/authSecurityEngine';
import {
  requestPasswordResetApi,
  type PasswordResetRequestResult,
} from '../services/authApi';

export function ForgotPasswordPage() {
  const { lang } = useLanguage();
  const prefersReduced = useReducedMotion();

  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PasswordResetRequestResult | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = window.setInterval(() => {
      setCooldownLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownLeft]);

  const isSuccessScreen = Boolean(result);

  const portalState: PortalVisualState = isSuccessScreen
    ? 'success'
    : isSubmitting
      ? 'submitting'
      : error
        ? 'error'
        : focused
          ? 'focused'
          : 'idle';

  const submitRecovery = async (targetEmail: string) => {
    setError(null);
    if (!isValidEmailAddress(targetEmail)) {
      setError(
        lang === 'bn'
          ? 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।'
          : 'Please enter a valid email address.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await requestPasswordResetApi(targetEmail.trim());
      setResult(response);
      setCooldownLeft(response.cooldownSeconds || 60);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'রিকভারি অনুরোধ পাঠানো সম্ভব হয়নি। আবার চেষ্টা করুন।'
            : 'Unable to process recovery request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitRecovery(email);
  };

  return (
    <AuthPortalLayout
      sceneVariant={isSuccessScreen ? 'recovery-success' : 'forgot-password'}
      showCardBrandHeader={!isSuccessScreen}
      portalState={portalState}
      portalHeadlineEn={isSuccessScreen ? 'Check Your Inbox' : "Let's Get You Back In"}
      portalHeadlineBn={
        isSuccessScreen ? 'আপনার ইনবক্স চেক করুন' : 'চলুন আপনাকে ফিরিয়ে আনি'
      }
      portalDescriptionEn={
        isSuccessScreen
          ? 'If an account exists for this email address, recovery instructions will be sent.'
          : 'Your learning journey is safe. Recover your account and continue mastering communication.'
      }
      portalDescriptionBn={
        isSuccessScreen
          ? 'এই ইমেইল ঠিকানায় কোনো অ্যাকাউন্ট থাকলে পাসওয়ার্ড রিকভারি নির্দেশনা পাঠানো হবে।'
          : 'আপনার শেখার যাত্রা সুরক্ষিত। অ্যাকাউন্ট পুনরুদ্ধার করে যোগাযোগের দক্ষতা বাড়ান।'
      }
    >
      <AnimatePresence mode="wait">
        {isSuccessScreen && result ? (
          /* ==================================================================
             SCREEN 06 — RECOVERY SUCCESS (Matches Reference Panel 6)
             Displayed ONLY AFTER backend accepts POST /api/v1/auth/forgot-password
             ================================================================== */
          <motion.div
            key="recovery-success-screen"
            data-testid="forgot-generic-confirmation"
            initial={prefersReduced ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center py-4 text-center"
            role="status"
          >
            {/* Glowing Green-Cyan Verification Checkmark Ring */}
            <div className="relative flex h-18 w-18 items-center justify-center rounded-full border-2 border-[#16E58B] bg-[radial-gradient(circle,rgba(22,229,139,0.24),rgba(0,217,255,0.08))] text-[#16E58B] shadow-[0_0_34px_rgba(22,229,139,0.42)]">
              <Check className="h-9 w-9 stroke-[2.8]" aria-hidden="true" />
            </div>

            <h1 className="font-portal mt-6 text-2xl font-bold tracking-tight text-white">
              {lang === 'bn' ? 'রিকভারি ইমেইল পাঠানো হয়েছে!' : 'Recovery Email Sent!'}
            </h1>
            <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-slate-300">
              {lang === 'bn'
                ? 'এই ইমেইল ঠিকানায় অ্যাকাউন্ট থাকলে আপনার ইনবক্স চেক করুন এবং পাসওয়ার্ড রিসেট করার নির্দেশনা অনুসরণ করুন।'
                : 'Please check your email and follow the instructions to reset your password.'}
            </p>

            {/* Luminous Horizontal Accent Divider (Reference Panel 6) */}
            <div className="my-6 flex w-36 items-center justify-center gap-2" aria-hidden="true">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#00D9FF]/60" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#00D9FF] shadow-[0_0_8px_#00D9FF]" />
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#00D9FF]/60" />
            </div>

            {/* Honest Local Development Preview Link (ONLY when no transactional email provider key is configured) */}
            {result.deliveryMode === 'local_dev_preview' && result.devPreviewResetUrl && (
              <div
                data-testid="dev-reset-preview-banner"
                className="mb-5 w-full rounded-xl border border-amber-400/35 bg-amber-500/10 p-3.5 text-left"
              >
                <p className="text-xs font-semibold text-amber-300">
                  {lang === 'bn'
                    ? 'লোকাল ডেভেলপমেন্ট প্রিভিউ (ইমেইল প্রোভাইডার কনফিগার নেই)'
                    : 'Local Development Preview (No Email Provider Configured)'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                  {lang === 'bn'
                    ? 'প্রোডাকশনে লিংকটি শুধুমাত্র ইমেইলে পাঠানো হবে। টেস্ট করার জন্য নিচের এককালীন লিংক খুলুন:'
                    : 'In production this link is sent strictly by email. Use this single-use link to test reset:'}
                </p>
                <Link
                  to={result.devPreviewResetUrl}
                  className="mt-2.5 inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-amber-400/50 bg-[#05091F] px-3.5 py-2 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-950/60"
                >
                  <span>
                    {lang === 'bn' ? 'রিসেট পাসওয়ার্ড পেজ খুলুন' : 'Open Single-Use Reset Link'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}

            {/* Primary Back to Login CTA (Matches Reference Panel 6) */}
            <Link
              to="/login"
              className="lv-portal-btn-violet inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Login'}</span>
            </Link>

            {/* Resend Recovery Link Cooldown + Switch Email */}
            <div className="mt-5 flex w-full flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                disabled={isSubmitting || cooldownLeft > 0}
                onClick={() => void submitRecovery(email)}
                className="inline-flex min-h-[36px] items-center gap-1.5 font-medium text-[#7DD3FC] transition-colors hover:text-[#00D9FF] disabled:opacity-50 cursor-pointer tabular-nums"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSubmitting ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>
                  {cooldownLeft > 0
                    ? lang === 'bn'
                      ? `আবার পাঠান (${cooldownLeft} সে.)`
                      : `Resend Recovery Link (${cooldownLeft}s)`
                    : lang === 'bn'
                      ? 'রিকভারি লিংক আবার পাঠান'
                      : 'Resend Recovery Link'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'অন্য ইমেইল দিন' : 'Try another email'}
              </button>
            </div>
          </motion.div>
        ) : (
          /* ==================================================================
             SCREEN 03 — FORGOT PASSWORD (Matches Reference Panel 3)
             ================================================================== */
          <motion.div
            key="forgot-form-screen"
            initial={prefersReduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center">
              <h1 className="font-portal text-2xl font-bold tracking-tight text-white sm:text-[26px]">
                {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300/90">
                {lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টের সাথে যুক্ত ইমেইল ঠিকানাটি লিখুন।'
                  : 'Enter the email address associated with your account.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="forgot-err"
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

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="forgot-email" className="sr-only">
                  {lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300/80"
                    aria-hidden="true"
                  />
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder={
                      lang === 'bn' ? 'আপনার ইমেইল ঠিকানা লিখুন' : 'Enter your email address'
                    }
                    className="lv-auth-input block min-h-[46px] w-full rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="lv-portal-btn inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{lang === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending Recovery Link...'}</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'bn' ? 'রিকভারি লিংক পাঠান' : 'Send Recovery Link'}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* "or" Divider + Outlined Back to Login Pill (Matches Reference Panel 3) */}
            <div className="relative my-5 flex items-center">
              <div className="flex-1 border-t border-cyan-400/15" />
              <span className="px-3 text-xs text-slate-400">
                {lang === 'bn' ? 'অথবা' : 'or'}
              </span>
              <div className="flex-1 border-t border-cyan-400/15" />
            </div>

            <Link
              to="/login"
              className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border border-cyan-400/30 bg-[#0A1336]/75 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-[#00D9FF]/65 hover:bg-[#101E4E]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Login'}</span>
            </Link>

            <div className="mt-5 text-center text-xs text-slate-300">
              <span>{lang === 'bn' ? 'সহায়তা প্রয়োজন?' : 'Need Help?'} </span>
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="font-semibold text-[#38BDF8] underline decoration-[#38BDF8]/40 underline-offset-2 transition-colors hover:text-[#00D9FF] cursor-pointer"
              >
                {lang === 'bn' ? 'সাপোর্টে যোগাযোগ করুন' : 'Contact Support'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Recovery Support Modal */}
      <AnimatePresence>
        {supportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#030616]/82 px-4 backdrop-blur-sm"
            onClick={() => setSupportModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Account Recovery Support"
              initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="lv-portal-panel w-full max-w-md rounded-2xl p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-portal text-lg font-bold text-white">
                  {lang === 'bn' ? 'অ্যাকাউন্ট রিকভারি সহায়তা' : 'Account Recovery Support'}
                </h2>
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  aria-label="Close support dialog"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-300">
                <p>
                  {lang === 'bn'
                    ? 'রিসেট লিংক ১৫ মিনিটের জন্য কার্যকর থাকে এবং একবারই ব্যবহার করা যায়। ইনবক্সে না পেলে স্প্যাম বা প্রমোশন ফোল্ডার দেখুন।'
                    : 'Password reset links expire in 15 minutes and can only be used once. If you do not see the email, check your spam folder or wait 60 seconds to resend.'}
                </p>
                <p>
                  {lang === 'bn' ? 'সরাসরি সহায়তা ইমেইল: ' : 'Direct support email: '}
                  <a
                    href="mailto:support@linguaverse.ai"
                    className="font-semibold text-[#38BDF8] underline"
                  >
                    support@linguaverse.ai
                  </a>
                </p>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  className="lv-portal-btn rounded-full px-5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  {lang === 'bn' ? 'বুঝেছি' : 'Got it'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPortalLayout>
  );
}
