import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  bootstrapInitialAdmin,
  loginAdminPortal,
  type AdminAuthStatusResponse,
  type AdminPortalUser,
} from '../../services/adminPortalApi';

interface AdminLoginPageProps {
  authStatus: AdminAuthStatusResponse;
  onAuthenticated: (user: AdminPortalUser) => void;
  onRefreshStatus: () => Promise<void>;
}

export function AdminLoginPage({
  authStatus,
  onAuthenticated,
  onRefreshStatus,
}: AdminLoginPageProps) {
  const { lang, setLang } = useLanguage();
  const isBootstrapMode = !authStatus.hasAdminAccount && authStatus.bootstrapAvailable;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(
        lang === 'bn'
          ? 'একটি বৈধ অ্যাডমিনিস্ট্রেটর ইমেইল ঠিকানা লিখুন।'
          : 'Enter a valid administrator email address.'
      );
      return;
    }

    if (isBootstrapMode) {
      if (name.trim().length < 2) {
        setError(
          lang === 'bn'
            ? 'অ্যাডমিনিস্ট্রেটরের নাম কমপক্ষে ২ অক্ষরের হতে হবে।'
            : 'Administrator name must be at least 2 characters.'
        );
        return;
      }
      if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        setError(
          lang === 'bn'
            ? 'পাসওয়ার্ড কমপক্ষে ১০ অক্ষরের হতে হবে এবং বড় হাতের অক্ষর, ছোট হাতের অক্ষর ও সংখ্যা থাকতে হবে।'
            : 'Password must be at least 10 characters and include uppercase, lowercase, and numeric characters.'
        );
        return;
      }
      if (password !== confirmPassword) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি।' : 'Passwords do not match.');
        return;
      }
      if (authStatus.requiresBootstrapSecret && bootstrapSecret.trim().length === 0) {
        setError(
          lang === 'bn'
            ? 'সার্ভারে কনফিগার করা ADMIN_BOOTSTRAP_SECRET লিখুন।'
            : 'Enter the server-configured ADMIN_BOOTSTRAP_SECRET.'
        );
        return;
      }
    } else if (!password) {
      setError(lang === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন।' : 'Enter your administrator password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = isBootstrapMode
        ? await bootstrapInitialAdmin({
            name: name.trim(),
            email: trimmedEmail,
            password,
            bootstrapSecret: bootstrapSecret.trim() || undefined,
          })
        : await loginAdminPortal({
            email: trimmedEmail,
            password,
            rememberMe,
          });
      onAuthenticated(res.user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to authenticate administrator session.';
      setError(message);
      await onRefreshStatus().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05091F] text-slate-100 flex flex-col">
      {/* Minimal Admin Portal Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#070D24]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#6366F1] text-white font-bold shadow-lg shadow-blue-950/50">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">LINGUAVERSE AI</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
                {lang === 'bn' ? 'স্বতন্ত্র অ্যাডমিন অ্যাপ্লিকেশন' : 'Separate Admin Application'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 cursor-pointer"
            >
              {lang === 'en' ? 'বাংলা' : 'English'}
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B122C] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'লার্নার অ্যাপ' : 'User App'}</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0B122C]/95 p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            {isBootstrapMode ? (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Lock className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {isBootstrapMode
                ? lang === 'bn'
                  ? 'এককালীন প্রাথমিক সুপার অ্যাডমিন সেটআপ'
                  : 'One-Time Initial Super Admin Provisioning'
                : lang === 'bn'
                  ? 'সার্ভার-যাচাইকৃত অ্যাডমিন লগইন'
                  : 'Server-Verified Administrator Sign-In'}
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {isBootstrapMode
              ? lang === 'bn'
                ? 'প্রথম সুপার অ্যাডমিন অ্যাকাউন্ট তৈরি করুন'
                : 'Claim Initial Super Admin'
              : lang === 'bn'
                ? 'অ্যাডমিন কন্ট্রোল সেন্টারে সাইন ইন করুন'
                : 'Sign in to Admin Control Center'}
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {isBootstrapMode
              ? lang === 'bn'
                ? 'এখনো কোনো অ্যাডমিন অ্যাকাউন্ট তৈরি হয়নি। এই এককালীন ফর্মটি সম্পন্ন হলে প্রাথমিক প্রভিশনিং স্থায়ীভাবে লক হয়ে যাবে।'
                : 'No administrator account exists yet. Completing this one-time provisioning creates the initial Super Admin and permanently locks bootstrap.'
              : lang === 'bn'
                ? 'শুধুমাত্র অনুমোদিত অ্যাডমিন, কন্টেন্ট ম্যানেজার, AI Ops এবং মডারেটর অ্যাকাউন্টগুলো সার্ভার-সাইড RBAC যাচাইকরণের মাধ্যমে প্রবেশ করতে পারবে।'
                : 'Restricted to authorized Super Admin, Admin, Content Manager, AI Ops, and Moderator accounts verified server-side. Public admin registration is disabled.'}
          </p>

          {!authStatus.hasAdminAccount && !authStatus.bootstrapAvailable && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/35 p-3.5 text-xs text-amber-200 space-y-1.5"
            >
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Production Bootstrap Secret Required</span>
              </p>
              <p className="text-amber-100/80">
                Configure <code className="font-mono">ADMIN_BOOTSTRAP_SECRET</code> (minimum 16 characters) via{' '}
                <code className="font-mono">npx wrangler secret put ADMIN_BOOTSTRAP_SECRET</code> before provisioning the initial Super Admin.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-200"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            {isBootstrapMode && (
              <div>
                <label htmlFor="admin-name" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'অ্যাডমিনিস্ট্রেটরের নাম' : 'Administrator Full Name'}
                </label>
                <input
                  id="admin-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Platform Administrator"
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="admin-email" className="block text-xs font-medium text-slate-300">
                {lang === 'bn' ? 'অ্যাডমিন ইমেইল' : 'Administrator Email'}
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@linguaverse.ai"
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-medium text-slate-300">
                {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              </label>
              <div className="relative mt-1.5">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isBootstrapMode ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isBootstrapMode ? 'Min 10 chars (Aa1...)' : 'Enter administrator password'}
                  className="w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isBootstrapMode && (
              <div>
                <label htmlFor="admin-confirm-password" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                </label>
                <input
                  id="admin-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter strong password"
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            )}

            {isBootstrapMode && authStatus.requiresBootstrapSecret && (
              <div>
                <label htmlFor="admin-bootstrap-secret" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn' ? 'সার্ভার বুটস্ট্র্যাপ সিক্রেট' : 'Server Bootstrap Secret (ADMIN_BOOTSTRAP_SECRET)'}
                </label>
                <input
                  id="admin-bootstrap-secret"
                  type="password"
                  autoComplete="off"
                  required
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  placeholder="Configured on server environment"
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            )}

            {!isBootstrapMode && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-[#060B1E] accent-[#3B82F6]"
                />
                <span>
                  {lang === 'bn' ? 'এই বিশ্বস্ত ডিভাইসে সেশন চালু রাখুন' : 'Keep admin session active on this trusted device'}
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={submitting || (!authStatus.hasAdminAccount && !authStatus.bootstrapAvailable)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{isBootstrapMode ? 'Provisioning Super Admin...' : 'Verifying Credentials...'}</span>
                </>
              ) : (
                <span>
                  {isBootstrapMode
                    ? lang === 'bn'
                      ? 'সুপার অ্যাডমিন তৈরি করুন ও প্রবেশ করুন'
                      : 'Provision Super Admin & Enter'
                    : lang === 'bn'
                      ? 'অ্যাডমিন পোর্টালে সাইন ইন করুন'
                      : 'Sign In to Admin Portal'}
                </span>
              )}
            </button>
          </form>

          <p className="mt-5 border-t border-slate-800/80 pt-4 text-[11px] leading-relaxed text-slate-500">
            {lang === 'bn'
              ? 'সব অ্যাডমিন অ্যাকশন অপরিবর্তনীয় অডিট লগে রেকর্ড করা হয়। সাধারণ শিক্ষার্থী অ্যাকাউন্টগুলো এই পোর্টালে অনুমোদিত নয়।'
              : 'All administrative actions are recorded in the immutable audit ledger. Standard learner accounts are rejected server-side with HTTP 403.'}
          </p>
        </div>
      </main>
    </div>
  );
}
