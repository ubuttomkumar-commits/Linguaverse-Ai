import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Flag, Lock, RefreshCw, Save, ShieldCheck, Sliders } from 'lucide-react';
import {
  fetchAdminSystemSettings,
  saveAdminSystemSettings,
  type AdminSystemConfigResponse,
} from '../../services/p3Api';
import {
  DEFAULT_FEATURE_FLAGS,
  type PlatformFeatureFlags,
} from '../../domain/aiProviderRegistry';
import {
  fetchAdminFeatureFlags,
  updateAdminFeatureFlags,
} from '../../services/prd61Api';

export function AdminSystemConfigTab({ lang }: { lang: 'en' | 'bn' }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<AdminSystemConfigResponse['webhookProvidersConfigured']>({
    stripe: false,
    sslcommerz: false,
    paddle: false,
  });
  const [form, setForm] = useState<AdminSystemConfigResponse['settings']>({
    audioRetentionDays: 30,
    aiRateLimitPerMinute: 30,
    freeDailySpeakingLimit: 3,
    communityDirectMessagingEnabled: false,
    maintenanceBannerEn: '',
    maintenanceBannerBn: '',
    allowNewRegistrations: true,
  });

  const [featureFlags, setFeatureFlags] = useState<PlatformFeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [flagsSaving, setFlagsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, flagsRes] = await Promise.all([
        fetchAdminSystemSettings(),
        fetchAdminFeatureFlags().catch(() => ({ featureFlags: DEFAULT_FEATURE_FLAGS })),
      ]);
      setForm(res.settings);
      setWebhooks(res.webhookProvidersConfigured);
      setFeatureFlags(flagsRes.featureFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load system configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await saveAdminSystemSettings({
        audioRetentionDays: Number(form.audioRetentionDays),
        aiRateLimitPerMinute: Number(form.aiRateLimitPerMinute),
        freeDailySpeakingLimit: Number(form.freeDailySpeakingLimit),
        maintenanceBannerEn: form.maintenanceBannerEn,
        maintenanceBannerBn: form.maintenanceBannerBn,
        allowNewRegistrations: form.allowNewRegistrations,
      });
      setForm(res.settings);
      setSavedMessage(
        lang === 'bn'
          ? 'সিস্টেম কনফিগারেশন সংরক্ষিত হয়েছে এবং অডিট লগে যুক্ত হয়েছে।'
          : 'System configuration saved and recorded in the audit log.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatureFlag = async (key: keyof PlatformFeatureFlags) => {
    if (key === 'updatedAt' || key === 'updatedBy' || flagsSaving) return;
    setFlagsSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const nextVal = !Boolean(featureFlags[key]);
      const res = await updateAdminFeatureFlags({ [key]: nextVal });
      setFeatureFlags(res.featureFlags);
      setSavedMessage(`Feature flag "${key}" set to ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update feature flag.');
    } finally {
      setFlagsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sliders className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            {lang === 'bn' ? 'সিস্টেম কনফিগারেশন ও গার্ডরেইল' : 'System Configuration & Guardrails'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn'
              ? 'নন-সিক্রেট অপারেশনাল সীমা ও প্ল্যাটফর্ম সেটিংস। কোনো API কী বা প্রোভাইডার সিক্রেট কখনোই এখানে দেখানো বা সংরক্ষণ করা হয় না।'
              : 'Non-secret operational limits and platform controls. Provider API keys and signing secrets are managed strictly via server environment secrets.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {savedMessage && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{savedMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0B122C]/70 p-6 text-sm text-slate-400">
          {lang === 'bn' ? 'কনফিগারেশন লোড হচ্ছে...' : 'Loading system configuration...'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleSave}
            className="space-y-5 rounded-2xl border border-slate-800 bg-[#0B122C]/80 p-6 lg:col-span-8"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="sys-audio-days" className="block text-xs font-semibold text-slate-300">
                  {lang === 'bn' ? 'অডিও সংরক্ষণ (দিন)' : 'Audio Retention (Days)'}
                </label>
                <input
                  id="sys-audio-days"
                  type="number"
                  min={1}
                  max={365}
                  value={form.audioRetentionDays}
                  onChange={(e) => setForm({ ...form, audioRetentionDays: Number(e.target.value) })}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="sys-ai-rpm" className="block text-xs font-semibold text-slate-300">
                  {lang === 'bn' ? 'AI রেট লিমিট (/মিনিট)' : 'AI Rate Limit (/min)'}
                </label>
                <input
                  id="sys-ai-rpm"
                  type="number"
                  min={5}
                  max={120}
                  value={form.aiRateLimitPerMinute}
                  onChange={(e) => setForm({ ...form, aiRateLimitPerMinute: Number(e.target.value) })}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="sys-free-speak" className="block text-xs font-semibold text-slate-300">
                  {lang === 'bn' ? 'ফ্রি দৈনিক স্পিকিং সীমা' : 'Free Daily Speaking Cap'}
                </label>
                <input
                  id="sys-free-speak"
                  type="number"
                  min={1}
                  max={20}
                  value={form.freeDailySpeakingLimit}
                  onChange={(e) => setForm({ ...form, freeDailySpeakingLimit: Number(e.target.value) })}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sys-banner-en" className="block text-xs font-semibold text-slate-300">
                  {lang === 'bn' ? 'মেইনটেন্যান্স নোটিশ (EN)' : 'Platform Notice Banner (EN)'}
                </label>
                <input
                  id="sys-banner-en"
                  type="text"
                  maxLength={220}
                  value={form.maintenanceBannerEn}
                  onChange={(e) => setForm({ ...form, maintenanceBannerEn: e.target.value })}
                  placeholder="Optional notice banner..."
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="sys-banner-bn" className="block text-xs font-semibold text-slate-300">
                  {lang === 'bn' ? 'মেইনটেন্যান্স নোটিশ (বাংলা)' : 'Platform Notice Banner (Bangla)'}
                </label>
                <input
                  id="sys-banner-bn"
                  type="text"
                  maxLength={220}
                  value={form.maintenanceBannerBn}
                  onChange={(e) => setForm({ ...form, maintenanceBannerBn: e.target.value })}
                  placeholder="ঐচ্ছিক নোটিশ বার্তা..."
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#070D24] p-4">
              <label className="flex items-center gap-2.5 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowNewRegistrations}
                  onChange={(e) => setForm({ ...form, allowNewRegistrations: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400"
                />
                <span>{lang === 'bn' ? 'নতুন লার্নার নিবন্ধন চালু রাখুন' : 'Allow new learner registrations'}</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? 'প্রাইভেট মেসেজিং (DM): নীতিমালা অনুযায়ী বন্ধ'
                    : 'Private Community DMs: Locked OFF (PRD safety rule)'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-slate-400">
                {form.updatedAt
                  ? `Last updated ${new Date(form.updatedAt).toLocaleString()} by ${form.updatedBy ?? 'admin'}`
                  : 'Using platform defaults'}
              </p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#087BFF] to-[#7C3AED] px-4 py-2.5 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{saving ? 'Saving...' : lang === 'bn' ? 'সেটিংস সংরক্ষণ করুন' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>

          <aside className="space-y-4 rounded-2xl border border-slate-800 bg-[#0B122C]/80 p-6 lg:col-span-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              {lang === 'bn' ? 'ওয়েবহুক ও সিক্রেট অবস্থা' : 'Payment Webhook Secret Status'}
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'পেমেন্ট ওয়েবহুক সিগনেচার যাচাইকরণ সার্ভার এনভায়রনমেন্ট ভেরিয়েবলের মাধ্যমে সক্রিয় হয়। কী কনফিগার না থাকলে ওয়েবহুক রুট নিরাপদভাবে ৫৩৩ রিটার্ন করে।'
                : 'Signed payment webhooks (`/api/v1/billing/webhooks/:provider`) enforce HMAC-SHA256 verification and fail closed (503) when a provider secret is unset.'}
            </p>
            <dl className="space-y-2.5 text-xs">
              {(['stripe', 'sslcommerz', 'paddle'] as const).map((provider) => (
                <div
                  key={provider}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#070D24] px-3.5 py-2.5"
                >
                  <dt className="font-mono uppercase text-slate-300">{provider}</dt>
                  <dd
                    className={
                      webhooks[provider]
                        ? 'font-semibold text-emerald-300'
                        : 'font-medium text-amber-300'
                    }
                  >
                    {webhooks[provider] ? 'Configured (Server Secret)' : 'Not Configured'}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>

          {/* PRD v6.1 §24.13 Platform Feature Flags & Maintenance Mode */}
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-[#0B122C]/80 p-6 lg:col-span-12">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Flag className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? 'ফিচার ফ্ল্যাগ ও মেইনটেন্যান্স মোড'
                    : 'Platform Feature Flags & Maintenance Mode'}
                </span>
              </h3>
              <span className="font-mono text-[11px] text-slate-400">
                {featureFlags.updatedAt
                  ? `Updated ${featureFlags.updatedAt.slice(0, 19)} by ${featureFlags.updatedBy ?? 'admin'}`
                  : 'Server defaults active'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['maintenanceMode', 'Maintenance Mode Banner', 'Shows maintenance notice across workspace'],
                  ['ieltsExamPrepEnabled', 'IELTS Exam Prep Lab', 'Speaking, Writing, Reading & Listening tasks'],
                  ['writingDiaryStudioEnabled', 'Writing & Language Diary', 'AI writing intelligence + rewrite loop'],
                  ['shadowingLabEnabled', 'Shadowing & Chunk Lab', 'Japanese-inspired chunking drills'],
                  ['humanBridgeEnabled', 'Human Bridge Reflections', 'User-reported offline conversation logs'],
                  ['communityEnabled', 'Community Forum', 'Moderated learner posts & appeals'],
                  ['voiceRecordingEnabled', 'Voice Recording Capture', 'Consent-gated audio storage'],
                  ['aiSpeakingEnabled', 'AI Speaking Coaching', 'Speaking Studio & real-time coaching routes'],
                ] as const
              ).map(([flagKey, label, desc]) => {
                const enabled = Boolean(featureFlags[flagKey]);
                return (
                  <button
                    key={flagKey}
                    type="button"
                    disabled={flagsSaving}
                    onClick={() => void handleToggleFeatureFlag(flagKey)}
                    className={`rounded-xl border p-3.5 text-left transition-colors cursor-pointer disabled:opacity-60 ${
                      flagKey === 'maintenanceMode' && enabled
                        ? 'border-amber-500/60 bg-amber-950/30'
                        : enabled
                          ? 'border-cyan-400/35 bg-[#070D24]'
                          : 'border-slate-800 bg-[#060B1E]/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{label}</span>
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          flagKey === 'maintenanceMode'
                            ? enabled
                              ? 'text-amber-300'
                              : 'text-slate-400'
                            : enabled
                              ? 'text-emerald-300'
                              : 'text-slate-500'
                        }`}
                      >
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{desc}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
