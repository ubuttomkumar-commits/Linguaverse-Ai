import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import type { SubscriptionPlan } from '../types/domain';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const { t } = useLanguage();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const planParam = searchParams.get('plan');
  const selectedPlan: SubscriptionPlan = planParam === 'pro' ? 'pro' : 'free';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError(t.auth.passwordMismatch);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        const created = await register({ name, email, password, plan: selectedPlan });
        navigate(created.emailVerified === false ? '/verify-email' : '/onboarding', {
          replace: true,
        });
      } else {
        const loggedIn = await login({ email, password });
        navigate(loggedIn.emailVerified === false ? '/verify-email' : '/app', {
          replace: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100 flex flex-col">
      {/* Minimal Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#0A0F1C]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t.auth.backHome}</span>
          </Link>
          <LanguageToggle compact />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
          <div className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-white">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6] text-xs font-bold text-white"
            >
              LV
            </span>
            <span>{t.brand}</span>
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? t.auth.loginTitle : t.auth.registerTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {mode === 'login' ? t.auth.loginSubtitle : t.auth.registerSubtitle}
          </p>

          {mode === 'register' && planParam && (
            <p className="mt-3 text-xs text-slate-300">
              <span className="text-slate-400">{t.auth.selectedPlanNote} </span>
              <span className="font-semibold text-[#3B82F6]">
                {selectedPlan === 'pro' ? 'Pro Track' : 'Free Track'}
              </span>
            </p>
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

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-slate-300">
                  {t.auth.nameLabel}
                </label>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.auth.namePlaceholder}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300">
                {t.auth.emailLabel}
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300">
                {t.auth.passwordLabel}
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-medium text-slate-300"
                >
                  {t.auth.confirmPasswordLabel}
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.auth.confirmPasswordPlaceholder}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <span>{mode === 'login' ? t.auth.loginBtn : t.auth.registerBtn}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-5 text-center text-sm text-slate-400">
            {mode === 'login' ? (
              <>
                <span>{t.auth.switchToRegister} </span>
                <Link
                  to="/register"
                  className="font-semibold text-[#3B82F6] hover:text-blue-400 transition-colors"
                >
                  {t.auth.switchToRegisterLink}
                </Link>
              </>
            ) : (
              <>
                <span>{t.auth.switchToLogin} </span>
                <Link
                  to="/login"
                  className="font-semibold text-[#3B82F6] hover:text-blue-400 transition-colors"
                >
                  {t.auth.switchToLoginLink}
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
