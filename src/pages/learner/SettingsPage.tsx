import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  LogOut,
  MicOff,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  ADMIN_ROLE_LABELS,
  buildLearnerDataExportPayload,
  DEFAULT_PRIVACY_CONSENT,
} from '../../domain/adminGovernanceEngine';
import { appendAuditLog } from '../../services/governanceStore';
import { listAudioBlobKeys } from '../../utils/audioBlobStore';
import type {
  DailyTimeGoalMinutes,
  ExplanationLanguage,
  PrimaryGoal,
  SelfEstimatedLevel,
  SpacedRepetitionPreset,
  UILanguage,
} from '../../types/domain';

const SELF_LEVELS: SelfEstimatedLevel[] = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1'];
const PRIMARY_GOALS: PrimaryGoal[] = [
  'job_interview',
  'daily_speaking',
  'academic_ielts',
  'workplace',
];
const DAILY_TIMES: DailyTimeGoalMinutes[] = [10, 15, 25, 45];

export function SettingsPage() {
  const { lang, t } = useLanguage();
  const {
    user,
    profile,
    latestDiagnostic,
    lessonMastery,
    lessonAttempts,
    exerciseAttempts,
    speakingSessions,
    mistakes,
    mistakeDrillAttempts,
    transferAttempts,
    xpLedger,
    activitySummary,
    storageMode,
    updateProfile,
    logout,
    deleteAllRecordings,
    clearAccount,
  } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [uiLang, setUiLang] = useState<UILanguage>(profile?.preferredUiLanguage ?? 'en');
  const [expLang, setExpLang] = useState<ExplanationLanguage>(
    profile?.explanationLanguage ?? 'bn'
  );
  const [selfLevel, setSelfLevel] = useState<SelfEstimatedLevel>(
    profile?.selfEstimatedLevel ?? 'A2'
  );
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(
    profile?.primaryGoal ?? 'daily_speaking'
  );
  const [dailyMinutes, setDailyMinutes] = useState<DailyTimeGoalMinutes>(
    profile?.dailyTimeGoalMinutes ?? 15
  );
  const [srsPreset, setSrsPreset] = useState<SpacedRepetitionPreset>(
    profile?.spacedRepetitionPreset ?? 'standard'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Privacy & Data Sovereignty State
  const privacyConsent = profile?.privacyConsent ?? DEFAULT_PRIVACY_CONSENT;
  const [consentSaving, setConsentSaving] = useState(false);
  const [storedRecordingCount, setStoredRecordingCount] = useState<number>(0);
  const [privacyStatus, setPrivacyStatus] = useState<{
    en: string;
    bn: string;
    correlationId?: string;
  } | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    if (profile) {
      setUiLang(profile.preferredUiLanguage);
      setExpLang(profile.explanationLanguage);
      setSelfLevel(profile.selfEstimatedLevel);
      setPrimaryGoal(profile.primaryGoal);
      setDailyMinutes(profile.dailyTimeGoalMinutes);
      setSrsPreset(profile.spacedRepetitionPreset ?? 'standard');
    }
  }, [user?.name, profile]);

  useEffect(() => {
    let active = true;
    listAudioBlobKeys().then((keys) => {
      if (active) setStoredRecordingCount(keys.length);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!confirmDelete) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeletingAll) {
        setConfirmDelete(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmDelete, isDeletingAll]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);
    setIsSaving(true);
    try {
      await updateProfile({
        name,
        preferredUiLanguage: uiLang,
        explanationLanguage: expLang,
        selfEstimatedLevel: selfLevel,
        primaryGoal,
        dailyTimeGoalMinutes: dailyMinutes,
        spacedRepetitionPreset: srsPreset,
      });
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleConsent = async (
    field: 'storeMicRecordings' | 'logAiEvaluations'
  ) => {
    if (!user || consentSaving) return;
    setConsentSaving(true);
    setPrivacyStatus(null);
    try {
      const nextValue = !privacyConsent[field];
      const nextConsent = {
        ...privacyConsent,
        [field]: nextValue,
        updatedAt: new Date().toISOString(),
      };
      await updateProfile({ privacyConsent: nextConsent });
      const logEntry = appendAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role ?? 'learner',
        action: 'privacy.consent_updated',
        resourceType: 'privacy_consent',
        resourceId: user.id,
        summaryEn: `Set ${field} consent to ${nextValue ? 'ENABLED' : 'DISABLED'}.`,
        summaryBn: `${field === 'storeMicRecordings' ? 'মাইক্রোফোন রেকর্ডিং সংরক্ষণ' : 'AI মূল্যায়ন লগিং'} সম্মতি ${nextValue ? 'চালু' : 'বন্ধ'} করা হয়েছে।`,
        metadata: { field, enabled: nextValue },
      });
      setPrivacyStatus({
        en:
          field === 'storeMicRecordings'
            ? `Microphone recording storage ${nextValue ? 'enabled' : 'disabled'} immediately.`
            : `AI evaluation telemetry logging ${nextValue ? 'enabled' : 'disabled'} immediately.`,
        bn:
          field === 'storeMicRecordings'
            ? `মাইক্রোফোন রেকর্ডিং সংরক্ষণ এখন ${nextValue ? 'চালু' : 'বন্ধ'}।`
            : `AI মূল্যায়ন টেলিমেট্রি লগিং এখন ${nextValue ? 'চালু' : 'বন্ধ'}।`,
        correlationId: logEntry.correlationId,
      });
    } finally {
      setConsentSaving(false);
    }
  };

  const handleExportLearningData = async () => {
    if (!user) return;
    const storedAudioRecordingKeys = await listAudioBlobKeys();
    const payload = buildLearnerDataExportPayload({
      account: user,
      profile,
      activitySummary,
      latestDiagnostic,
      lessonMastery,
      lessonAttempts,
      exerciseAttempts,
      speakingSessions,
      mistakes,
      mistakeDrillAttempts,
      transferAttempts,
      xpLedger,
      storedAudioRecordingKeys,
    });

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `linguaverse-data-export-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    const logEntry = appendAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role ?? 'learner',
      action: 'privacy.data_exported',
      resourceType: 'data_export',
      resourceId: user.id,
      summaryEn: `Exported complete learner JSON archive (${lessonAttempts.length} lessons, ${speakingSessions.length} speaking sessions, ${mistakes.length} mistakes).`,
      summaryBn: `সম্পূর্ণ লার্নিং ডেটা JSON আকারে ডাউনলোড করা হয়েছে (${lessonAttempts.length} লেসন, ${speakingSessions.length} স্পিকিং সেশন, ${mistakes.length} ভুল)।`,
      metadata: {
        lessons: lessonAttempts.length,
        speakingSessions: speakingSessions.length,
        mistakes: mistakes.length,
      },
      correlationId: payload.correlationId,
    });

    setPrivacyStatus({
      en: `Exported JSON learning archive (${lessonAttempts.length} lessons, ${speakingSessions.length} speaking sessions, ${mistakes.length} mistakes, ${xpLedger.length} XP entries).`,
      bn: `আপনার সম্পূর্ণ লার্নিং ডেটা JSON ডাউনলোড সম্পন্ন হয়েছে (${lessonAttempts.length} লেসন, ${speakingSessions.length} স্পিকিং সেশন, ${mistakes.length} ভুল)।`,
      correlationId: logEntry.correlationId,
    });
  };

  const handleDeleteRecordingsOnly = async () => {
    const res = await deleteAllRecordings();
    setStoredRecordingCount(0);
    setPrivacyStatus({
      en: `Verified cleanup complete: ${res.deletedCount} stored voice recording(s) permanently removed from IndexedDB.`,
      bn: `যাচাইকৃত ক্লিনআপ সম্পন্ন: IndexedDB থেকে ${res.deletedCount}টি ভয়েস রেকর্ডিং স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAll) return;
    setIsDeletingAll(true);
    try {
      await clearAccount();
      setConfirmDelete(false);
      navigate('/', { replace: true });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <LearnerShell
      title={t.workspace.settings.title}
      subtitle={t.workspace.settings.subtitle}
    >
      <div className="space-y-6">
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-6"
        >
          {/* Account Section */}
          <div>
            <h2 className="text-base font-bold text-white">
              {t.workspace.settings.accountSection}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="settings-name" className="block text-xs font-medium text-slate-300">
                  {t.workspace.settings.nameLabel}
                </label>
                <input
                  id="settings-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  {t.workspace.settings.emailLabel}
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email ?? ''}
                  className="mt-1.5 block w-full rounded-lg border border-slate-800 bg-[#0A0F1C]/60 px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
              <span>
                {t.workspace.settings.planLabel}:{' '}
                <strong className="text-slate-200 uppercase">{user?.plan ?? 'free'}</strong>
              </span>
              <span>
                {lang === 'bn' ? 'ভূমিকা (Role): ' : 'Role: '}
                <strong className="font-mono text-slate-200">
                  {lang === 'bn'
                    ? ADMIN_ROLE_LABELS[user?.role ?? 'learner'].bn
                    : ADMIN_ROLE_LABELS[user?.role ?? 'learner'].en}
                </strong>
              </span>
              <span>
                {t.workspace.settings.storageLabel}:{' '}
                <strong className="font-mono text-slate-200">
                  {storageMode === 'cloudflare-d1'
                    ? 'Cloudflare Workers + D1 API'
                    : 'Local Repository (D1-Ready Adapter)'}
                </strong>
              </span>
            </div>
          </div>

          {/* Learning & Language Preferences */}
          <div className="border-t border-slate-800 pt-6">
            <h2 className="text-base font-bold text-white">
              {t.workspace.settings.preferencesSection}
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="settings-ui-lang" className="block text-xs font-medium text-slate-300">
                  {t.workspace.settings.uiLangLabel}
                </label>
                <select
                  id="settings-ui-lang"
                  value={uiLang}
                  onChange={(e) => setUiLang(e.target.value as UILanguage)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                >
                  <option value="en">English (EN)</option>
                  <option value="bn">বাংলা (Bangla)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="settings-exp-lang"
                  className="block text-xs font-medium text-slate-300"
                >
                  {t.workspace.settings.expLangLabel}
                </label>
                <select
                  id="settings-exp-lang"
                  value={expLang}
                  onChange={(e) => setExpLang(e.target.value as ExplanationLanguage)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                >
                  <option value="bn">{t.onboarding.steps.expLang.bnLabel}</option>
                  <option value="both">{t.onboarding.steps.expLang.bothLabel}</option>
                  <option value="en">{t.onboarding.steps.expLang.enLabel}</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-level" className="block text-xs font-medium text-slate-300">
                  {t.workspace.settings.levelLabel}
                </label>
                <select
                  id="settings-level"
                  value={selfLevel}
                  onChange={(e) => setSelfLevel(e.target.value as SelfEstimatedLevel)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                >
                  {SELF_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="settings-goal" className="block text-xs font-medium text-slate-300">
                  {t.workspace.settings.goalLabel}
                </label>
                <select
                  id="settings-goal"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value as PrimaryGoal)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                >
                  {PRIMARY_GOALS.map((g) => (
                    <option key={g} value={g}>
                      {t.onboarding.steps.goal.options[g].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="settings-daily" className="block text-xs font-medium text-slate-300">
                  {t.workspace.settings.dailyTimeLabel}
                </label>
                <select
                  id="settings-daily"
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value) as DailyTimeGoalMinutes)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                >
                  {DAILY_TIMES.map((m) => (
                    <option key={m} value={m}>
                      {m} {t.onboarding.steps.dailyTime.minutesLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="settings-srs" className="block text-xs font-medium text-slate-300">
                  {lang === 'bn'
                    ? 'স্পেসড রিপিটিশন ব্যবধান (Spaced Repetition)'
                    : 'Spaced Repetition Schedule'}
                </label>
                <select
                  id="settings-srs"
                  value={srsPreset}
                  onChange={(e) => setSrsPreset(e.target.value as SpacedRepetitionPreset)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-[#0A0F1C] px-3.5 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
                >
                  <option value="intensive">
                    {lang === 'bn'
                      ? 'দ্রুত — ১, ২, ৪, ৭, ১৪ দিন'
                      : 'Intensive — 1, 2, 4, 7, 14 days'}
                  </option>
                  <option value="standard">
                    {lang === 'bn'
                      ? 'স্বাভাবিক — ১, ৩, ৭, ১৪, ৩০ দিন'
                      : 'Standard — 1, 3, 7, 14, 30 days'}
                  </option>
                  <option value="relaxed">
                    {lang === 'bn'
                      ? 'সহজ — ২, ৫, ১০, ২১, ৪৫ দিন'
                      : 'Relaxed — 2, 5, 10, 21, 45 days'}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}

          {savedNotice && (
            <p
              role="status"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>{t.workspace.settings.savedNotice}</span>
            </p>
          )}

          <div className="flex justify-end border-t border-slate-800 pt-5">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {t.workspace.settings.saveBtn}
            </button>
          </div>
        </form>

        {/* Privacy & Data Sovereignty Controls */}
        <section
          id="privacy-sovereignty"
          className="rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                {lang === 'bn'
                  ? 'প্রাইভেসি ও ডেটা সার্বভৌমত্ব নিয়ন্ত্রণ'
                  : 'Privacy & Data Sovereignty Controls'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {lang === 'bn'
                  ? 'আপনার ভয়েস রেকর্ডিং ও AI টেলিমেট্রি কীভাবে সংরক্ষিত হবে তা সরাসরি নিয়ন্ত্রণ করুন এবং যেকোনো সময় আপনার সম্পূর্ণ ডেটা ডাউনলোড বা মুছে ফেলুন।'
                  : 'Control microphone recording persistence and AI evaluation telemetry in real time, export your complete JSON archive, or wipe stored voice clips with verified cleanup.'}
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {lang === 'bn'
                ? `সংরক্ষিত ভয়েস ক্লিপ: ${storedRecordingCount}`
                : `Stored Voice Clips: ${storedRecordingCount}`}
            </span>
          </div>

          {/* Granular Consent Switches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {lang === 'bn'
                    ? 'মাইক্রোফোন রেকর্ডিং সংরক্ষণ (Self-Review Replay)'
                    : 'Microphone Recording Storage (IndexedDB / R2)'}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'বন্ধ করলে স্পিকিং স্টুডিও আপনার ভয়েস অডিও সংরক্ষণ করবে না—শুধুমাত্র ট্রান্সক্রিপ্ট মূল্যায়ন করবে।'
                    : 'When disabled, Speaking Studio evaluates transcripts without saving audio blobs to browser IndexedDB or Cloudflare R2.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={privacyConsent.storeMicRecordings}
                aria-label="Toggle microphone recording storage"
                disabled={consentSaving}
                onClick={() => void handleToggleConsent('storeMicRecordings')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  privacyConsent.storeMicRecordings ? 'bg-[#3B82F6]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    privacyConsent.storeMicRecordings ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {lang === 'bn'
                    ? 'AI মূল্যায়ন টেলিমেট্রি ও ল্যাটেন্সি লগিং'
                    : 'AI Evaluation Telemetry & Cost Logging'}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {lang === 'bn'
                    ? 'বন্ধ করলে আপনার Speaking এবং Transfer Lab কলগুলো AI Ops ল্যাটেন্সি ও টোকেন লগে নথিভুক্ত হবে না।'
                    : 'When disabled, your Speaking Studio and Transfer Lab API calls are excluded from AI Operations latency and token monitoring.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={privacyConsent.logAiEvaluations}
                aria-label="Toggle AI evaluation logging"
                disabled={consentSaving}
                onClick={() => void handleToggleConsent('logAiEvaluations')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  privacyConsent.logAiEvaluations ? 'bg-[#3B82F6]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    privacyConsent.logAiEvaluations ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {privacyStatus && (
            <div
              role="status"
              className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200"
            >
              <p className="font-semibold">
                {lang === 'bn' ? privacyStatus.bn : privacyStatus.en}
              </p>
              {privacyStatus.correlationId && (
                <p className="mt-0.5 font-mono text-[11px] text-emerald-300/80">
                  Audit Correlation ID: {privacyStatus.correlationId}
                </p>
              )}
            </div>
          )}

          {/* Export & Recording Cleanup Actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => void handleExportLearningData()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'আমার লার্নিং ডেটা এক্সপোর্ট করুন (JSON)'
                  : 'Export My Learning Data (JSON)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleDeleteRecordingsOnly()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-amber-500/60 hover:text-white transition-colors cursor-pointer"
            >
              <MicOff className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'সংরক্ষিত সব ভয়েস রেকর্ডিং মুছুন'
                  : 'Delete Stored Voice Recordings'}
              </span>
            </button>
          </div>
        </section>

        {/* Governance, Diagnostic & Account Deletion */}
        <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
          <h2 className="text-base font-bold text-white">
            {t.workspace.settings.actionsSection}
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-[#8B5CF6]/50 bg-[#8B5CF6]/10 px-4 py-2.5 text-sm font-medium text-violet-200 hover:bg-[#8B5CF6]/20 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>
                {lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল সেন্টার (/admin)' : 'Admin Control Center (/admin)'}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => navigate('/diagnostic')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-[#3B82F6] hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>{t.workspace.settings.retakeDiagBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>{t.workspace.settings.logoutBtn}</span>
            </button>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-950/20 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:border-rose-400 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'আমার সব ডেটা রিসেট / মুছুন'
                  : 'Reset / Delete All My Data'}
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* Accessible Confirmation Modal for Full Data & Recording Reset */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isDeletingAll) setConfirmDelete(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-data-modal-title"
            className="w-full max-w-md rounded-xl border border-rose-500/40 bg-[#111827] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3
                  id="delete-data-modal-title"
                  className="text-base font-bold text-white"
                >
                  {lang === 'bn'
                    ? 'সব রেকর্ডিং ও অ্যাকাউন্ট ডেটা মুছবেন?'
                    : 'Reset & Delete All Learning Data?'}
                </h3>
              </div>
              <button
                type="button"
                aria-label={t.workspace.settings.cancelBtn}
                disabled={isDeletingAll}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {lang === 'bn'
                ? `এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি আপনার ${storedRecordingCount}টি সংরক্ষিত ভয়েস রেকর্ডিং (IndexedDB), সব লেসন ইতিহাস, স্পিকিং সেশন, মিস্টেক মেমোরি, XP লেজার এবং প্রোফাইল সম্পূর্ণভাবে মুছে দিয়ে অ্যাপটিকে প্রাথমিক অবস্থায় ফিরিয়ে আনবে।`
                : `This action cannot be undone. It permanently erases all ${storedRecordingCount} stored voice recording(s) in IndexedDB, your lesson progress, speaking sessions, Mistake Memory, XP ledger, and account profile, resetting the app to its initial state.`}
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white disabled:opacity-60 cursor-pointer"
              >
                {t.workspace.settings.cancelBtn}
              </button>
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => void handleDeleteAccount()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {isDeletingAll
                    ? lang === 'bn'
                      ? 'মুছে ফেলা হচ্ছে...'
                      : 'Deleting...'
                    : lang === 'bn'
                      ? 'হ্যাঁ, সব ডেটা মুছে ফেলুন'
                      : 'Confirm Delete All Data'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </LearnerShell>
  );
}
