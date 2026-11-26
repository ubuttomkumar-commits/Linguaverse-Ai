import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react';
import {
  DEFAULT_AI_RUNTIME_CONFIG,
  type AiRuntimeConfig,
  type ProviderId,
  type ProviderStatusView,
} from '../../domain/aiProviderRegistry';
import {
  checkAdminProviderHealth,
  fetchAdminAiProviders,
  rotateAdminProviderKey,
  updateAdminAiRuntimeConfig,
} from '../../services/prd61Api';

export function AdminAiProvidersTab({
  lang,
  canRotateKeys,
}: {
  lang: 'en' | 'bn';
  canRotateKeys: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runtimeConfig, setRuntimeConfig] = useState<AiRuntimeConfig>(DEFAULT_AI_RUNTIME_CONFIG);
  const [providers, setProviders] = useState<ProviderStatusView[]>([]);
  const [supportedModels, setSupportedModels] = useState<{
    text: readonly string[];
    transcribe: readonly string[];
    tts: readonly string[];
  }>({
    text: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    transcribe: ['gemini-2.5-flash'],
    tts: ['gemini-2.5-flash-preview-tts'],
  });
  const [guidance, setGuidance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Write-only key rotation state (never prefilled, cleared immediately after submit)
  const [activeRotateId, setActiveRotateId] = useState<ProviderId | null>(null);
  const [secretDraft, setSecretDraft] = useState('');
  const [busyProviderId, setBusyProviderId] = useState<ProviderId | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAiProviders();
      setRuntimeConfig(res.runtimeConfig);
      setProviders(res.providers);
      setSupportedModels(res.supportedModels);
      setGuidance(res.productionSecretGuidance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load AI & provider settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveRuntime = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await updateAdminAiRuntimeConfig({
        primaryModel: runtimeConfig.primaryModel,
        fallbackModel: runtimeConfig.fallbackModel,
        transcribeModel: runtimeConfig.transcribeModel,
        ttsModel: runtimeConfig.ttsModel,
        requestTimeoutMs: Number(runtimeConfig.requestTimeoutMs),
        maxRetries: Number(runtimeConfig.maxRetries),
        dailyCostCeilingUsd: Number(runtimeConfig.dailyCostCeilingUsd),
        maxRequestsPerMinute: Number(runtimeConfig.maxRequestsPerMinute),
        geminiEnabled: runtimeConfig.geminiEnabled,
      });
      setRuntimeConfig(res.runtimeConfig);
      setProviders(res.providers);
      setNotice(
        lang === 'bn'
          ? 'AI রানটাইম কনফিগারেশন সংরক্ষিত হয়েছে এবং অডিট লগে যুক্ত হয়েছে।'
          : 'AI runtime model & quota configuration saved and logged.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update AI runtime settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleHealthProbe = async (providerId: ProviderId) => {
    setBusyProviderId(providerId);
    setError(null);
    setNotice(null);
    try {
      const res = await checkAdminProviderHealth(providerId);
      setProviders(res.providers);
      setNotice(
        `${providerId}: ${res.status.toUpperCase()} (${res.latencyMs}ms) — ${res.message}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Provider health check failed.');
    } finally {
      setBusyProviderId(null);
    }
  };

  const handleRotateKey = async (providerId: ProviderId, clear = false) => {
    if (!clear && secretDraft.trim().length < 8) {
      setError('Enter a valid provider secret (minimum 8 characters).');
      return;
    }
    setBusyProviderId(providerId);
    setError(null);
    setNotice(null);
    try {
      const res = await rotateAdminProviderKey(
        providerId,
        clear ? { clear: true } : { secretValue: secretDraft.trim() }
      );
      setProviders(res.providers);
      setSecretDraft('');
      setActiveRotateId(null);
      setNotice(
        clear
          ? `Cleared runtime key override for ${providerId}.`
          : `Rotated key for ${providerId} (write-only; raw value never displayed).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Key rotation failed.');
    } finally {
      setBusyProviderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Cpu className="h-5 w-5 text-[#00D9FF]" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? 'AI মডেল ও প্রোভাইডার কন্ট্রোল (সার্ভার-সাইড)'
                : 'AI Runtime & External Providers Control Center'}
            </span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn'
              ? 'Gemini মডেল নির্বাচন, ফলব্যাক, টাইমআউট, কোটা এবং ১২টি প্রোভাইডারের নিরাপদ মাস্কড স্ট্যাটাস। কোনো রাও সিক্রেট কখনোই ব্রাউজারে পাঠানো হয় না।'
              : 'Manage Gemini models, fallback routing, timeouts, retries, cost ceilings, live health checks, and masked server-side provider secret status.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/35 p-3.5 text-xs text-rose-200">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0B122C]/70 p-6 text-xs text-slate-400">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-[#00D9FF]" />
          Loading AI runtime configuration...
        </div>
      ) : (
        <>
          {/* Gemini Runtime Model, Timeout, Retry & Quota Form */}
          <form
            onSubmit={handleSaveRuntime}
            className="rounded-2xl border border-slate-800 bg-[#0B122C]/85 p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Gemini Primary, Fallback & Guardrail Configuration
              </h3>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={runtimeConfig.geminiEnabled}
                  onChange={(e) =>
                    setRuntimeConfig((c) => ({ ...c, geminiEnabled: e.target.checked }))
                  }
                  className="h-4 w-4 accent-[#00D9FF]"
                />
                <span>Gemini AI Engine Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="ai-primary-model" className="block text-xs font-medium text-slate-300">
                  Primary Text Model
                </label>
                <select
                  id="ai-primary-model"
                  value={runtimeConfig.primaryModel}
                  onChange={(e) =>
                    setRuntimeConfig((c) => ({ ...c, primaryModel: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white"
                >
                  {supportedModels.text.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ai-fallback-model" className="block text-xs font-medium text-slate-300">
                  Fallback Text Model
                </label>
                <select
                  id="ai-fallback-model"
                  value={runtimeConfig.fallbackModel}
                  onChange={(e) =>
                    setRuntimeConfig((c) => ({ ...c, fallbackModel: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white"
                >
                  {supportedModels.text.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ai-transcribe-model" className="block text-xs font-medium text-slate-300">
                  Transcription Model
                </label>
                <select
                  id="ai-transcribe-model"
                  value={runtimeConfig.transcribeModel}
                  onChange={(e) =>
                    setRuntimeConfig((c) => ({ ...c, transcribeModel: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white"
                >
                  {supportedModels.transcribe.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ai-tts-model" className="block text-xs font-medium text-slate-300">
                  TTS Synthesis Model
                </label>
                <select
                  id="ai-tts-model"
                  value={runtimeConfig.ttsModel}
                  onChange={(e) => setRuntimeConfig((c) => ({ ...c, ttsModel: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white"
                >
                  {supportedModels.tts.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="ai-timeout" className="block text-xs font-medium text-slate-300">
                  Request Timeout (ms)
                </label>
                <input
                  id="ai-timeout"
                  type="number"
                  min={5000}
                  max={60000}
                  step={1000}
                  value={runtimeConfig.requestTimeoutMs}
                  onChange={(e) =>
                    setRuntimeConfig((c) => ({ ...c, requestTimeoutMs: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label htmlFor="ai-retries" className="block text-xs font-medium text-slate-300">
                  Max Retries (0–3)
                </label>
                <input
                  id="ai-retries"
                  type="number"
                  min={0}
                  max={3}
                  value={runtimeConfig.maxRetries}
                  onChange={(e) =>
                    setRuntimeConfig((c) => ({ ...c, maxRetries: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label htmlFor="ai-cost-cap" className="block text-xs font-medium text-slate-300">
                  Daily Cost Ceiling (USD)
                </label>
                <input
                  id="ai-cost-cap"
                  type="number"
                  min={1}
                  max={5000}
                  step={1}
                  value={runtimeConfig.dailyCostCeilingUsd}
                  onChange={(e) =>
                    setRuntimeConfig((c) => ({ ...c, dailyCostCeilingUsd: Number(e.target.value) }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2">
                <label htmlFor="ai-rpm-cap" className="text-xs text-slate-300">
                  Max Requests / Minute
                </label>
                <input
                  id="ai-rpm-cap"
                  type="number"
                  min={5}
                  max={600}
                  value={runtimeConfig.maxRequestsPerMinute}
                  onChange={(e) =>
                    setRuntimeConfig((c) => ({
                      ...c,
                      maxRequestsPerMinute: Number(e.target.value),
                    }))
                  }
                  className="w-24 rounded-lg border border-slate-700 bg-[#060B1E] px-2.5 py-1.5 font-mono text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{saving ? 'Saving...' : 'Save AI Runtime Config'}</span>
              </button>
            </div>
          </form>

          {/* Cloudflare Secret Handling Guidance */}
          {guidance && (
            <div className="rounded-xl border border-cyan-400/25 bg-[#0A1334] p-4 text-xs text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00D9FF]" aria-hidden="true" />
              <p>{guidance}</p>
            </div>
          )}

          {/* Modular 12-Provider Status & Masked Key Rotation Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {providers.map((prov) => {
              const busy = busyProviderId === prov.id;
              const isRotating = activeRotateId === prov.id;
              return (
                <div
                  key={prov.id}
                  className="rounded-2xl border border-slate-800 bg-[#0B122C]/85 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                        {prov.category}
                      </p>
                      <h4 className="text-sm font-bold text-white">{prov.name}</h4>
                    </div>
                    <span
                      className={`rounded-lg border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                        prov.configured
                          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-950/25 text-amber-300'
                      }`}
                    >
                      {prov.configured ? 'CONFIGURED' : 'UNCONFIGURED'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#060B1E] p-3 text-xs space-y-1">
                    <p className="font-mono text-[11px] text-slate-300">
                      Env: {prov.envVarNames.join(', ')}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      Fingerprint: {prov.maskedKey ?? 'Not set'} ({prov.source})
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Health: <strong className="text-slate-200">{prov.lastHealthStatus}</strong>
                      {prov.lastHealthLatencyMs !== null ? ` · ${prov.lastHealthLatencyMs}ms` : ''}
                      {prov.lastHealthMessage ? ` — ${prov.lastHealthMessage}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300/90">
                    <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <code className="truncate">{prov.productionSecretCommand}</code>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleHealthProbe(prov.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#060B1E] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 disabled:opacity-50 cursor-pointer"
                    >
                      <Activity className="h-3.5 w-3.5 text-[#00D9FF]" aria-hidden="true" />
                      <span>{busy ? 'Checking...' : 'Health Check'}</span>
                    </button>

                    {canRotateKeys && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setActiveRotateId(isRotating ? null : prov.id);
                          setSecretDraft('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#060B1E] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-violet-400/50 cursor-pointer"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-[#8B5CF6]" aria-hidden="true" />
                        <span>{isRotating ? 'Cancel' : 'Rotate Key'}</span>
                      </button>
                    )}

                    {canRotateKeys && prov.source === 'runtime_override' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRotateKey(prov.id, true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Clear Override</span>
                      </button>
                    )}
                  </div>

                  {isRotating && (
                    <div className="rounded-xl border border-violet-500/35 bg-[#060B1E] p-3 space-y-2">
                      <label className="block text-[11px] font-medium text-slate-300">
                        Write-only new API key for {prov.name} (never returned after save):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          autoComplete="off"
                          value={secretDraft}
                          onChange={(e) => setSecretDraft(e.target.value)}
                          placeholder="Paste new secret key..."
                          className="flex-1 rounded-lg border border-slate-700 bg-[#0B122C] px-3 py-1.5 text-xs text-white font-mono focus:border-violet-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRotateKey(prov.id, false)}
                          className="rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 cursor-pointer"
                        >
                          Save Key
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
