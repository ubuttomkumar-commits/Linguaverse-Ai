import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
} from 'lucide-react';
import {
  broadcastAdminNotification,
  fetchAdminSystemHealth,
  type AdminSystemHealthResponse,
} from '../../services/prd61Api';

export function AdminSystemHealthTab({
  lang,
  canBroadcast,
}: {
  lang: 'en' | 'bn';
  canBroadcast: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<AdminSystemHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin Platform Broadcast State
  const [titleEn, setTitleEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyBn, setBodyBn] = useState('');
  const [actionRoute, setActionRoute] = useState('/app/ielts');
  const [sending, setSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminSystemHealth();
      setHealth(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load system health.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canBroadcast || sending) return;
    setSending(true);
    setBroadcastSuccess(null);
    setError(null);
    try {
      await broadcastAdminNotification({
        titleEn,
        titleBn: titleBn || titleEn,
        bodyEn,
        bodyBn: bodyBn || bodyEn,
        actionRoute: actionRoute.startsWith('/') ? actionRoute : undefined,
      });
      setTitleEn('');
      setTitleBn('');
      setBodyEn('');
      setBodyBn('');
      setBroadcastSuccess(
        lang === 'bn'
          ? 'প্ল্যাটফর্ম নোটিশ সফলভাবে সংরক্ষিত ও সম্প্রচার করা হয়েছে।'
          : 'Platform notification broadcast saved and queued for all learners.'
      );
      await loadHealth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to broadcast notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Server className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? 'সিস্টেম হেলথ, ডাটাবেস মাইগ্রেশন ও সিকিউরিটি'
                : 'System Health, Database Migrations & Security Events'}
            </span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn'
              ? 'বাস্তব ডাটাবেস রেকর্ড সংখ্যা, মাইগ্রেশন প্রস্তুতি (0001–0004), নিরাপত্তা ইভেন্ট এবং প্ল্যাটফর্ম নোটিশ সম্প্রচার।'
              : 'Live runtime health, real database record counts, sequential migration readiness (0001–0004), security events, and platform notification broadcasts.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHealth()}
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

      {loading || !health ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0B122C]/70 p-6 text-xs text-slate-400">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-[#00D9FF]" />
          Loading system health telemetry...
        </div>
      ) : (
        <>
          {/* Real Counts Strip */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Users', val: health.counts.totalUsers },
              { label: 'Exam Attempts', val: health.counts.examinationAttempts },
              { label: 'Writing Entries', val: health.counts.writingDiaryEntries },
              { label: 'Human Bridge Logs', val: health.counts.humanBridgeLogs },
              { label: 'Audit Logs', val: health.counts.auditLogs },
              {
                label: 'Configured Providers',
                val: `${health.providersSummary.filter((p) => p.configured).length}/${health.providersSummary.length}`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-800 bg-[#0B122C]/85 p-4"
              >
                <p className="text-[11px] text-slate-400">{item.label}</p>
                <p className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                  {item.val}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Database & Migrations Card */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B122C]/85 p-5 space-y-4 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Database className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                  <span>Database & Migrations ({health.runtime})</span>
                </h3>
                <span className="font-mono text-xs font-semibold text-emerald-300 uppercase">
                  {health.database.status}
                </span>
              </div>
              <p className="font-mono text-xs text-slate-400">
                Engine: {health.database.engine} · Checked: {health.checkedAt.slice(0, 19)}Z
              </p>
              <div>
                <p className="text-xs font-semibold text-slate-300">Sequential D1 Migrations Ready:</p>
                <ul className="mt-2 space-y-1.5 font-mono text-xs text-emerald-200">
                  {health.database.migrationsReady.map((mig) => (
                    <li key={mig} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span>{mig}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#060B1E] p-3 text-xs text-slate-300">
                <p className="font-semibold text-white">Backup & Rollback Protocol</p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">
                  {health.database.backupStatus}
                </p>
              </div>
            </section>

            {/* Security Events Log */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B122C]/85 p-5 space-y-4 lg:col-span-6">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <ShieldAlert className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span>Recent Security Events ({health.securityEvents.length})</span>
              </h3>
              {health.securityEvents.length === 0 ? (
                <p className="rounded-xl border border-slate-800 bg-[#060B1E] p-4 text-xs text-slate-400">
                  No security events recorded in this runtime session yet. Key rotations, account
                  suspensions, and deletions are logged here automatically.
                </p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
                  {health.securityEvents.slice(0, 20).map((evt) => (
                    <li
                      key={evt.id}
                      className="rounded-xl border border-slate-800 bg-[#060B1E] p-3 space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span
                          className={
                            evt.severity === 'critical'
                              ? 'text-rose-400 uppercase'
                              : evt.severity === 'warning'
                                ? 'text-amber-300 uppercase'
                                : 'text-cyan-300 uppercase'
                          }
                        >
                          {evt.severity} · {evt.category}
                        </span>
                        <span className="text-slate-500">{evt.createdAt.slice(0, 19)}</span>
                      </div>
                      <p className="text-slate-200">{evt.messageEn}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Admin Platform Notification Broadcast */}
          {canBroadcast && (
            <form
              onSubmit={handleBroadcast}
              className="rounded-2xl border border-slate-800 bg-[#0B122C]/85 p-6 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                <h3 className="text-sm font-bold text-white">
                  {lang === 'bn'
                    ? 'সব লার্নারের জন্য প্ল্যাটফর্ম নোটিশ পাঠান'
                    : 'Broadcast Platform Notification to Learners'}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bc-title-en" className="block text-xs font-medium text-slate-300">
                    Title (EN)
                  </label>
                  <input
                    id="bc-title-en"
                    type="text"
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g., New IELTS Practice Tasks Available"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="bc-title-bn" className="block text-xs font-medium text-slate-300">
                    Title (Bangla, optional)
                  </label>
                  <input
                    id="bc-title-bn"
                    type="text"
                    value={titleBn}
                    onChange={(e) => setTitleBn(e.target.value)}
                    placeholder="যেমন: নতুন IELTS অনুশীলন যুক্ত হয়েছে"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="bc-body-en" className="block text-xs font-medium text-slate-300">
                    Message (EN)
                  </label>
                  <textarea
                    id="bc-body-en"
                    rows={2}
                    required
                    value={bodyEn}
                    onChange={(e) => setBodyEn(e.target.value)}
                    placeholder="Clear, respectful announcement for learners..."
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] p-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="bc-route" className="block text-xs font-medium text-slate-300">
                    Action Route (internal path)
                  </label>
                  <input
                    id="bc-route"
                    type="text"
                    value={actionRoute}
                    onChange={(e) => setActionRoute(e.target.value)}
                    placeholder="/app/ielts"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-[#060B1E] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
              </div>

              {broadcastSuccess && (
                <p role="status" className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{broadcastSuccess}</span>
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{sending ? 'Broadcasting...' : 'Send Broadcast Notice'}</span>
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
