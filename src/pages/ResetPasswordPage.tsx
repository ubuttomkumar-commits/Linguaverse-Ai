import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { AuthPortalLayout } from '../components/auth/AuthPortalLayout';
import type { PortalVisualState } from '../components/auth/PortalFallbackVisual';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import {
  validatePasswordUpdateFields,
  type AuthValidationErrors,
} from '../domain/authSecurityEngine';
import {
  completePasswordResetApi,
  validateResetTokenApi,
  type ResetTokenValidationResult,
} from '../services/authApi';

export function ResetPasswordPage() {
  const { lang } = useLanguage();
  const { applyPasswordResetSync } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefersReduced = useReducedMotion();

  const tokenParam = searchParams.get('token') ?? '';

  const [tokenCheck, setTokenCheck] = useState<ResetTokenValidationResult | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    let active = true;
    setIsValidatingToken(true);
    validateResetTokenApi(tokenParam)
      .then((res) => {
        if (active) setTokenCheck(res);
      })
      .catch(() => {
        if (active) {
          setTokenCheck({
            valid: false,
            reason: 'NOT_FOUND',
            messageEn: 'Unable to validate this recovery link. Please request a new link.',
            messageBn: 'রিসেট লিংক যাচাই করা সম্ভব হয়নি। অনুগ্রহ করে নতুন লিংক অনুরোধ করুন।',
          });
        }
      })
      .finally(() => {
        if (active) setIsValidatingToken(false);
      });

    return () => {
      active = false;
    };
  }, [tokenParam]);

  const portalState: PortalVisualState = resetDone
    ? 'success'
    : isSubmitting
      ? 'submitting'
      : serverError || (tokenCheck && !tokenCheck.valid) || Object.values(fieldErrors).some(Boolean)
        ? 'error'
        : focusedField
          ? 'focused'
          : 'idle';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validatePasswordUpdateFields(
      { password: newPassword, confirmPassword },
      lang
    );
    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const outcome = await completePasswordResetApi({
        token: tokenParam,
        newPassword,
      });
      await applyPasswordResetSync(outcome.email, newPassword);
      setResetDone(true);
      window.setTimeout(
        () =>
          navigate(
            `/auth/success?flow=password-reset&revoked=${outcome.revokedSessionsCount}`,
            { replace: true }
          ),
        prefersReduced ? 120 : 480
      );
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'পাসওয়ার্ড আপডেট করা সম্ভব হয়নি।'
            : 'Unable to update password. Please request a fresh recovery link.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPortalLayout
      sceneVariant="reset-password"
      portalState={portalState}
      portalHeadlineEn="Create New Password"
      portalHeadlineBn="নতুন পাসওয়ার্ড তৈরি করুন"
      portalDescriptionEn="Set a strong password to keep your account secure."
      portalDescriptionBn="আপনার অ্যাকাউন্ট সুরক্ষিত রাখতে একটি শক্তিশালী পাসওয়ার্ড সেট করুন।"
    >
      {/* Loading State while validating reset token */}
      {isValidatingToken ? (
        <div className="flex flex-col items-center justify-center py-10 text-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-[#00D9FF]" aria-hidden="true" />
          <p className="font-portal mt-4 text-base font-semibold text-white">
            {lang === 'bn' ? 'রিসেট লিংক যাচাই করা হচ্ছে...' : 'Validating recovery link...'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn'
              ? 'টোকেনের মেয়াদ ও নিরাপত্তা পরীক্ষা করা হচ্ছে।'
              : 'Checking single-use token integrity and expiry.'}
          </p>
        </div>
      ) : !tokenCheck?.valid ? (
        /* Expired / Invalid / Already-Used Token Error Recovery State */
        <div className="space-y-5 text-center" role="alert" data-testid="reset-token-invalid">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/45 bg-rose-950/45 text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.22)]">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-300">
              {tokenCheck?.reason === 'EXPIRED'
                ? lang === 'bn'
                  ? 'টোকেনের মেয়াদ শেষ'
                  : 'Reset Link Expired'
                : tokenCheck?.reason === 'ALREADY_USED'
                  ? lang === 'bn'
                    ? 'লিংকটি ব্যবহৃত হয়েছে'
                    : 'Link Already Used'
                  : lang === 'bn'
                    ? 'অকার্যকর রিসেট লিংক'
                    : 'Invalid Reset Link'}
            </p>
            <h1 className="font-portal mt-1 text-xl font-bold text-white">
              {lang === 'bn' ? 'নতুন রিকভারি লিংক প্রয়োজন' : 'Recovery Link Unavailable'}
            </h1>
          </div>

          <p className="text-sm leading-relaxed text-slate-300">
            {lang === 'bn'
              ? tokenCheck?.messageBn ||
                'এই পাসওয়ার্ড রিসেট লিংকটি আর কার্যকর নয়। অনুগ্রহ করে নতুন লিংক অনুরোধ করুন।'
              : tokenCheck?.messageEn ||
                'This password reset link is invalid or expired. Please request a fresh recovery link.'}
          </p>

          <div className="flex flex-col gap-2.5 pt-1">
            <Link
              to="/forgot-password"
              className="lv-portal-btn inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
            >
              <span>
                {lang === 'bn' ? 'নতুন রিসেট লিংক অনুরোধ করুন' : 'Request New Reset Link'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full border border-cyan-400/25 bg-[#0A1336]/75 px-4 py-2 text-sm font-medium text-slate-200 hover:border-[#00D9FF]/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Login'}</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Valid Token — Screen 05 Reset Password Form (Matches Reference Panel 5) */
        <div>
          <div className="text-center">
            <h1 className="font-portal text-2xl font-bold tracking-tight text-white sm:text-[26px]">
              {lang === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              {lang === 'bn' ? 'নিচে আপনার নতুন পাসওয়ার্ড লিখুন' : 'Enter your new password below'}
            </p>
            {tokenCheck.emailMasked && (
              <p className="mt-1 text-xs font-medium text-[#7DD3FC]">
                {tokenCheck.emailMasked}
              </p>
            )}
          </div>

          <AnimatePresence mode="wait">
            {serverError && (
              <motion.div
                key="reset-err"
                role="alert"
                initial={prefersReduced ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/45 bg-rose-950/40 p-3.5 text-sm text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{serverError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5" noValidate>
            <div>
              <label htmlFor="reset-new-password" className="sr-only">
                {lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300/80"
                  aria-hidden="true"
                />
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                  className="lv-auth-input block min-h-[46px] w-full rounded-xl py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300/80 hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p role="alert" className="mt-1.5 text-xs text-rose-300">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="sr-only">
                {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300/80"
                  aria-hidden="true"
                />
                <input
                  id="reset-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder={lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                  className="lv-auth-input block min-h-[46px] w-full rounded-xl py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300/80 hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between">
                {fieldErrors.confirmPassword ? (
                  <p role="alert" className="text-xs text-rose-300">
                    {fieldErrors.confirmPassword}
                  </p>
                ) : (
                  <span />
                )}
                {confirmPassword.length > 0 && confirmPassword === newPassword && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16E58B]">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {lang === 'bn' ? 'পাসওয়ার্ড মিলেছে' : 'Passwords match'}
                  </span>
                )}
              </div>
            </div>

            {/* Strength Meter & Glowing Green Check Requirements (Reference Panel 5) */}
            <PasswordStrengthMeter password={newPassword} variant="full" />

            <button
              type="submit"
              disabled={isSubmitting || resetDone}
              className="lv-portal-btn mt-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'আপডেট করা হচ্ছে...' : 'Resetting Password...'}</span>
                </>
              ) : (
                <>
                  <span>{lang === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7DD3FC] underline decoration-[#7DD3FC]/40 underline-offset-2 transition-colors hover:text-[#00D9FF]"
            >
              <span>{lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Login'}</span>
            </Link>
          </div>
        </div>
      )}
    </AuthPortalLayout>
  );
}
