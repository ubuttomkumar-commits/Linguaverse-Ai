import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { AuthPortalLayout } from '../components/auth/AuthPortalLayout';
import type { PortalVisualState } from '../components/auth/PortalFallbackVisual';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import { GoogleOAuthButton } from '../components/auth/GoogleOAuthButton';
import {
  validateLoginFields,
  validateRegistrationFields,
  type AuthValidationErrors,
} from '../domain/authSecurityEngine';
import type { SubscriptionPlan } from '../types/domain';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const { lang } = useLanguage();
  const { isHydrating, user, profile, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefersReduced = useReducedMotion();

  const planParam = searchParams.get('plan');
  const selectedPlan: SubscriptionPlan = planParam === 'pro' ? 'pro' : 'free';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsTab, setTermsTab] = useState<'terms' | 'privacy'>('terms');

  const [fieldErrors, setFieldErrors] = useState<AuthValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [authSucceeded, setAuthSucceeded] = useState(false);

  // Redirect already-signed-in visitors without interrupting an active portal-opening transition
  useEffect(() => {
    if (isHydrating || isSubmitting || authSucceeded || !user) return;
    if (user.emailVerified === false) {
      navigate('/verify-email', { replace: true });
      return;
    }
    if (profile && !profile.onboardingCompleted) {
      navigate('/onboarding', { replace: true });
      return;
    }
    navigate('/app', { replace: true });
  }, [isHydrating, isSubmitting, authSucceeded, user, profile, navigate]);

  const portalState: PortalVisualState = authSucceeded
    ? 'success'
    : isSubmitting
      ? 'submitting'
      : serverError || Object.values(fieldErrors).some(Boolean)
        ? 'error'
        : focusedField
          ? 'focused'
          : 'idle';

  const clearFieldError = (key: keyof AuthValidationErrors) => {
    setServerError(null);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors =
      mode === 'register'
        ? validateRegistrationFields(
            { name, email, password, confirmPassword, acceptedTerms },
            lang
          )
        : validateLoginFields({ email, password }, lang);

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const created = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          plan: selectedPlan,
        });
        setAuthSucceeded(true);
        const dest =
          created.emailVerified === false ? '/verify-email' : '/auth/success?flow=register';
        window.setTimeout(
          () => navigate(dest, { replace: true }),
          prefersReduced ? 100 : 420
        );
      } else {
        const loggedIn = await login({
          email: email.trim(),
          password,
          rememberMe,
        });
        setAuthSucceeded(true);
        const dest =
          loggedIn.emailVerified === false ? '/verify-email' : '/auth/success?flow=login';
        window.setTimeout(
          () => navigate(dest, { replace: true }),
          prefersReduced ? 100 : 450
        );
      }
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : lang === 'bn'
            ? 'অথেনটিকেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
            : 'Authentication failed. Please check your credentials and try again.'
      );
      setIsSubmitting(false);
    }
  };

  const passwordsMatch =
    mode === 'register' && confirmPassword.length > 0 && password === confirmPassword;

  return (
    <AuthPortalLayout
      sceneVariant={mode === 'login' ? 'login' : 'register'}
      portalState={portalState}
      showFeatureMedallions={mode === 'login'}
      portalHeadlineEn={
        mode === 'login' ? 'LINGUAVERSE AI' : 'Start Your Learning Journey'
      }
      portalHeadlineBn={
        mode === 'login' ? 'LINGUAVERSE AI' : 'আপনার শেখার যাত্রা শুরু করুন'
      }
      portalDescriptionEn={
        mode === 'login'
          ? "Don't Just Learn a Language. Master Real Communication."
          : 'Join LINGUAVERSE AI today and unlock your communication potential.'
      }
      portalDescriptionBn={
        mode === 'login'
          ? 'শুধু ভাষা শেখা নয় — বাস্তব যোগাযোগে দক্ষ হয়ে উঠুন।'
          : 'আজই LINGUAVERSE AI-তে যুক্ত হোন এবং আত্মবিশ্বাসের সাথে ইংরেজি বলুন।'
      }
    >
      {/* Screen Heading (Centered like Reference Screens 01 & 02) */}
      <div className="text-center">
        <h1 className="font-portal text-2xl font-bold tracking-tight text-white sm:text-[26px]">
          {mode === 'login'
            ? lang === 'bn'
              ? 'আবার স্বাগতম!'
              : 'Welcome Back!'
            : lang === 'bn'
              ? 'অ্যাকাউন্ট তৈরি করুন'
              : 'Create Account'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-300/90">
          {mode === 'login'
            ? lang === 'bn'
              ? 'আপনার শেখার যাত্রা চালিয়ে যান'
              : 'Continue your learning journey'
            : lang === 'bn'
              ? 'শুরু করতে আপনার অ্যাকাউন্ট তৈরি করুন'
              : 'Build your account to get started'}
        </p>

        {mode === 'register' && planParam && (
          <p className="mt-2 text-xs text-slate-300">
            <span className="text-slate-400">
              {lang === 'bn' ? 'নির্বাচিত প্ল্যান: ' : 'Selected plan: '}
            </span>
            <span className="font-semibold text-[#00D9FF]">
              {selectedPlan === 'pro' ? 'Premium Track' : 'Free Plan'}
            </span>
          </p>
        )}
      </div>

      {/* Server Error Alert */}
      <AnimatePresence mode="wait">
        {serverError && (
          <motion.div
            key="auth-error"
            role="alert"
            initial={prefersReduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/45 bg-rose-950/40 p-3.5 text-sm text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            <span>{serverError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-3.5" noValidate>
        {mode === 'register' && (
          <div>
            <label htmlFor="auth-name" className="sr-only">
              {lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300/80"
                aria-hidden="true"
              />
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                required
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'auth-name-err' : undefined}
                value={name}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError('name');
                }}
                placeholder={lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
                className={`lv-auth-input block min-h-[46px] w-full rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:outline-none ${
                  fieldErrors.name ? '!border-rose-500/75' : ''
                }`}
              />
            </div>
            {fieldErrors.name && (
              <p id="auth-name-err" role="alert" className="mt-1.5 text-xs text-rose-300">
                {fieldErrors.name}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="sr-only">
            {lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300/80"
              aria-hidden="true"
            />
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'auth-email-err' : undefined}
              value={email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
              placeholder={lang === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
              className={`lv-auth-input block min-h-[46px] w-full rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-400 focus:outline-none ${
                fieldErrors.email ? '!border-rose-500/75' : ''
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p id="auth-email-err" role="alert" className="mt-1.5 text-xs text-rose-300">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="auth-password" className="sr-only">
            {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300/80"
              aria-hidden="true"
            />
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'auth-password-err' : undefined}
              value={password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
              placeholder={lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              className={`lv-auth-input block min-h-[46px] w-full rounded-xl py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 focus:outline-none ${
                fieldErrors.password ? '!border-rose-500/75' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300/80 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="auth-password-err" role="alert" className="mt-1.5 text-xs text-rose-300">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Login Row: Remember Me + Forgot Password? (Matches Reference Screen 01) */}
        {mode === 'login' && (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-200 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-cyan-400/50 bg-[#081234] accent-[#00C8F8]"
              />
              <span>{lang === 'bn' ? 'মনে রাখুন' : 'Remember me'}</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#7DD3FC] underline decoration-[#7DD3FC]/40 underline-offset-2 transition-colors hover:text-[#00D9FF]"
            >
              {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
            </Link>
          </div>
        )}

        {/* Register Fields: Confirm Password + Strength Bar + Terms Checkbox (Matches Reference Screen 02) */}
        {mode === 'register' && (
          <>
            <div>
              <label htmlFor="auth-confirm-password" className="sr-only">
                {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300/80"
                  aria-hidden="true"
                />
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'auth-confirm-err' : undefined}
                  value={confirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError('confirmPassword');
                  }}
                  placeholder={lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                  className={`lv-auth-input block min-h-[46px] w-full rounded-xl py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-400 focus:outline-none ${
                    fieldErrors.confirmPassword ? '!border-rose-500/75' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirmPassword}
                  className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-300/80 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between">
                {fieldErrors.confirmPassword ? (
                  <p id="auth-confirm-err" role="alert" className="text-xs text-rose-300">
                    {fieldErrors.confirmPassword}
                  </p>
                ) : (
                  <span />
                )}
                {passwordsMatch && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16E58B]">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {lang === 'bn' ? 'পাসওয়ার্ড মিলেছে' : 'Passwords match'}
                  </span>
                )}
              </div>
            </div>

            <PasswordStrengthMeter password={password} variant="bar-only" />

            <div className="pt-0.5">
              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-slate-300">
                <input
                  id="auth-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    clearFieldError('terms');
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-cyan-400/50 bg-[#081234] accent-[#00C8F8]"
                />
                <span>
                  {lang === 'bn' ? (
                    <>
                      আমি{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTermsTab('terms');
                          setTermsModalOpen(true);
                        }}
                        className="font-semibold text-[#38BDF8] underline decoration-[#38BDF8]/50 underline-offset-2 hover:text-[#00D9FF] cursor-pointer"
                      >
                        ব্যবহারের শর্তাবলি
                      </button>{' '}
                      এবং{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTermsTab('privacy');
                          setTermsModalOpen(true);
                        }}
                        className="font-semibold text-[#38BDF8] underline decoration-[#38BDF8]/50 underline-offset-2 hover:text-[#00D9FF] cursor-pointer"
                      >
                        প্রাইভেসি নীতিমালা
                      </button>{' '}
                      মেনে নিচ্ছি।
                    </>
                  ) : (
                    <>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTermsTab('terms');
                          setTermsModalOpen(true);
                        }}
                        className="font-semibold text-[#38BDF8] underline decoration-[#38BDF8]/50 underline-offset-2 hover:text-[#00D9FF] cursor-pointer"
                      >
                        Terms &amp; Conditions
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTermsTab('privacy');
                          setTermsModalOpen(true);
                        }}
                        className="font-semibold text-[#38BDF8] underline decoration-[#38BDF8]/50 underline-offset-2 hover:text-[#00D9FF] cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                    </>
                  )}
                </span>
              </label>
              {fieldErrors.terms && (
                <p role="alert" className="mt-1.5 text-xs text-rose-300">
                  {fieldErrors.terms}
                </p>
              )}
            </div>
          </>
        )}

        {/* Primary Cyan-to-Violet Pill CTA (Matches Reference Screens 01 & 02) */}
        <motion.button
          type="submit"
          disabled={isSubmitting || authSucceeded}
          whileTap={prefersReduced ? undefined : { scale: 0.99 }}
          className="lv-portal-btn mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-65 cursor-pointer"
        >
          {authSucceeded ? (
            <>
              <Check className="h-4.5 w-4.5" aria-hidden="true" />
              <span>
                {lang === 'bn' ? 'পোর্টাল আনলক হচ্ছে...' : 'Opening Language Portal...'}
              </span>
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>
                {mode === 'login'
                  ? lang === 'bn'
                    ? 'সাইন ইন করা হচ্ছে...'
                    : 'Signing in...'
                  : lang === 'bn'
                    ? 'অ্যাকাউন্ট তৈরি হচ্ছে...'
                    : 'Creating account...'}
              </span>
            </>
          ) : (
            <>
              <span>
                {mode === 'login'
                  ? lang === 'bn'
                    ? 'সাইন ইন'
                    : 'Sign In'
                  : lang === 'bn'
                    ? 'অ্যাকাউন্ট তৈরি করুন'
                    : 'Create Account'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </motion.button>
      </form>

      {/* Honest Google OAuth on Login (Matches Reference Screen 01) */}
      {mode === 'login' && <GoogleOAuthButton mode="login" />}

      {/* Bottom Switch Link */}
      <div className="mt-5 pt-2 text-center text-xs sm:text-sm text-slate-300">
        {mode === 'login' ? (
          <>
            <span>{lang === 'bn' ? 'অ্যাকাউন্ট নেই?' : "Don't have an account?"} </span>
            <Link
              to="/register"
              className="font-semibold text-[#38BDF8] underline decoration-[#38BDF8]/40 underline-offset-2 transition-colors hover:text-[#00D9FF]"
            >
              {lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
            </Link>
          </>
        ) : (
          <>
            <span>{lang === 'bn' ? 'আগে থেকেই অ্যাকাউন্ট আছে?' : 'Already have an account?'} </span>
            <Link
              to="/login"
              className="font-semibold text-[#38BDF8] underline decoration-[#38BDF8]/40 underline-offset-2 transition-colors hover:text-[#00D9FF]"
            >
              {lang === 'bn' ? 'লগইন করুন' : 'Login'}
            </Link>
          </>
        )}
      </div>

      {/* Terms & Privacy Summary Modal */}
      <AnimatePresence>
        {termsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#030616]/82 px-4 backdrop-blur-sm"
            onClick={() => setTermsModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Terms of Service and Privacy Policy"
              initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="lv-portal-panel w-full max-w-md rounded-2xl p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-portal text-lg font-bold text-white">
                  {termsTab === 'privacy'
                    ? lang === 'bn'
                      ? 'প্রাইভেসি নীতিমালা'
                      : 'Privacy Policy'
                    : lang === 'bn'
                      ? 'ব্যবহারের শর্তাবলি'
                      : 'Terms & Conditions'}
                </h2>
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(false)}
                  aria-label="Close legal dialog"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
                <p>
                  {lang === 'bn'
                    ? 'আপনার পাসওয়ার্ড সুরক্ষিতভাবে scrypt হ্যাশিংয়ে সংরক্ষিত হয় এবং ইমেইল যাচাইয়ের জন্য এককালীন ৬-সংখ্যার SHA-256 OTP ব্যবহার করা হয়।'
                    : 'Your password is stored using cryptographic salted scrypt hashing, and email verification uses time-limited SHA-256 hashed 6-digit OTP tokens.'}
                </p>
                <p>
                  {lang === 'bn'
                    ? 'আপনি যেকোনো সময় Settings থেকে আপনার ভয়েস রেকর্ডিং ও সম্পূর্ণ অ্যাকাউন্ট ডেটা এক্সপোর্ট বা স্থায়ীভাবে মুছে ফেলতে পারবেন।'
                    : 'Voice recordings and AI speaking logs are strictly governed by your privacy toggles in Settings, where you can export or permanently erase all data at any time.'}
                </p>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAcceptedTerms(true);
                    clearFieldError('terms');
                    setTermsModalOpen(false);
                  }}
                  className="lv-portal-btn rounded-full px-5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  {lang === 'bn' ? 'সম্মত হোন ও বন্ধ করুন' : 'Accept & Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthPortalLayout>
  );
}
