import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, UserX } from 'lucide-react';
import {
  decideAdminAppeal,
  fetchAdminModerationQueue,
  resolveAdminModerationReport,
} from '../../services/p3Api';
import type {
  CommunityEnforcementAction,
  CommunityReportRecord,
  CommunityRestrictionLevel,
  CommunityRestrictionRecord,
} from '../../domain/communityModerationEngine';

interface AdminModerationTabProps {
  lang: 'en' | 'bn';
}

export function AdminModerationTab({ lang }: AdminModerationTabProps) {
  const [reports, setReports] = useState<CommunityReportRecord[]>([]);
  const [restrictions, setRestrictions] = useState<CommunityRestrictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesByReport, setNotesByReport] = useState<Record<string, string>>({});
  const [levelByReport, setLevelByReport] = useState<Record<string, CommunityRestrictionLevel>>({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminModerationQueue();
      setReports(data.reports);
      setRestrictions(data.restrictions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load community moderation queue.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleResolve = async (
    report: CommunityReportRecord,
    action: CommunityEnforcementAction
  ) => {
    setBusyId(report.id);
    setError(null);
    setNotice(null);
    try {
      const reviewerNote = (notesByReport[report.id] ?? '').trim();
      const restrictionLevel = levelByReport[report.id] ?? 'muted_24h';
      const res = await resolveAdminModerationReport({
        reportId: report.id,
        action,
        reviewerNote:
          reviewerNote ||
          (action === 'none' ? 'Reviewed and dismissed.' : `Enforcement applied: ${action}`),
        restrictionLevel: action === 'restrict_user' ? restrictionLevel : undefined,
      });
      setReports(res.reports);
      setRestrictions(res.restrictions);
      setNotice(
        lang === 'bn'
          ? `রিপোর্ট #${report.id.slice(0, 8)} সমাধান হয়েছে (${action})।`
          : `Report ${report.id.slice(0, 8)} resolved (${action}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve report.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAppealDecision = async (
    restriction: CommunityRestrictionRecord,
    decision: 'approved' | 'denied'
  ) => {
    setBusyId(restriction.userId);
    setError(null);
    setNotice(null);
    try {
      const res = await decideAdminAppeal(restriction.userId, decision);
      setReports(res.reports);
      setRestrictions(res.restrictions);
      setNotice(
        lang === 'bn'
          ? `আপিলের সিদ্ধান্ত সংরক্ষিত হয়েছে (${decision})।`
          : `Appeal decision saved (${decision}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process appeal.');
    } finally {
      setBusyId(null);
    }
  };

  const openReports = reports.filter((r) => r.status === 'pending' || r.status === 'escalated');
  const resolvedReports = reports.filter(
    (r) => r.status === 'resolved_removed' || r.status === 'resolved_dismissed'
  );
  const activeRestrictions = restrictions.filter((r) => r.restrictionLevel !== 'none');

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">
              {lang === 'bn'
                ? 'কমিউনিটি মডারেশন, রিপোর্ট ও আপিল কিউ'
                : 'Community Moderation, Reports & Appeals Queue'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'রিপোর্টকৃত পোস্ট, কমেন্ট, স্প্যাম এবং ব্যবহারকারীর আপিল পর্যালোচনা করুন। প্রতিটি সিদ্ধান্ত অডিট লগে সংরক্ষিত হয়।'
                : 'Review flagged community posts, comments, spam reports, and restriction appeals. Every enforcement action is written to the server audit log.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadQueue()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh Queue'}</span>
          </button>
        </div>

        {/* Summary Counters */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {lang === 'bn' ? 'খোলা রিপোর্ট' : 'Open Reports'}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-amber-300 tabular-nums">
              {openReports.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {lang === 'bn' ? 'সক্রিয় সীমাবদ্ধতা' : 'Active Restrictions'}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-rose-300 tabular-nums">
              {activeRestrictions.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {lang === 'bn' ? 'সমাধানকৃত রিপোর্ট' : 'Resolved Reports'}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-300 tabular-nums">
              {resolvedReports.length}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}
      </section>

      {/* Open Reports List */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <h3 className="text-sm font-bold text-white">
            {lang === 'bn'
              ? `খোলা মডারেশন রিপোর্ট (${openReports.length})`
              : `Open Moderation Reports (${openReports.length})`}
          </h3>
        </div>

        {loading ? (
          <p className="mt-4 text-xs text-slate-400">
            {lang === 'bn' ? 'রিপোর্ট লোড হচ্ছে...' : 'Loading moderation reports...'}
          </p>
        ) : openReports.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-5 text-xs text-slate-400">
            {lang === 'bn'
              ? 'কোনো খোলা কমিউনিটি রিপোর্ট নেই। শিক্ষার্থীরা কোনো পোস্ট বা কমেন্ট রিপোর্ট করলে তা এখানে দেখা যাবে।'
              : 'No open community reports right now. When learners report a post, comment, or user, it will appear here for review.'}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {openReports.map((report) => {
              const isBusy = busyId === report.id;
              return (
                <article
                  key={report.id}
                  className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-amber-300">
                        {report.targetType.toUpperCase()} · {report.reason} · ID: {report.targetId}
                      </p>
                      <p className="text-xs text-slate-300">
                        {report.details ||
                          (lang === 'bn'
                            ? 'কোনো অতিরিক্ত বিবরণ দেওয়া হয়নি।'
                            : 'No additional details provided.')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'bn' ? 'রিপোর্ট করেছেন:' : 'Reported by:'} {report.reporterUserId}{' '}
                        · {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`mod-note-${report.id}`}
                        className="block text-[11px] font-medium text-slate-400"
                      >
                        {lang === 'bn' ? 'মডারেটর নোট' : 'Reviewer Note'}
                      </label>
                      <input
                        id={`mod-note-${report.id}`}
                        type="text"
                        value={notesByReport[report.id] ?? ''}
                        onChange={(e) =>
                          setNotesByReport((prev) => ({ ...prev, [report.id]: e.target.value }))
                        }
                        placeholder={
                          lang === 'bn'
                            ? 'সিদ্ধান্তের কারণ লিখুন...'
                            : 'Explain moderation rationale...'
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`mod-level-${report.id}`}
                        className="block text-[11px] font-medium text-slate-400"
                      >
                        {lang === 'bn' ? 'সীমাবদ্ধতার স্তর (প্রযোজ্য হলে)' : 'Restriction Level (if restricting)'}
                      </label>
                      <select
                        id={`mod-level-${report.id}`}
                        value={levelByReport[report.id] ?? 'muted_24h'}
                        onChange={(e) =>
                          setLevelByReport((prev) => ({
                            ...prev,
                            [report.id]: e.target.value as CommunityRestrictionLevel,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                      >
                        <option value="muted_24h">Muted for 24 Hours</option>
                        <option value="posting_suspended">Posting Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleResolve(report, 'hide_content')}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50 cursor-pointer"
                    >
                      {lang === 'bn' ? 'কন্টেন্ট লুকান' : 'Hide Content'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleResolve(report, 'restrict_user')}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                    >
                      {lang === 'bn' ? 'ব্যবহারকারী সীমাবদ্ধ করুন' : 'Restrict Author'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleResolve(report, 'warn_user')}
                      className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 cursor-pointer"
                    >
                      {lang === 'bn' ? 'সতর্কবার্তা দিন' : 'Warn Only'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleResolve(report, 'none')}
                      className="rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50 cursor-pointer"
                    >
                      {lang === 'bn' ? 'খারিজ করুন' : 'Dismiss Report'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Restrictions & Appeals */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-rose-400" aria-hidden="true" />
          <h3 className="text-sm font-bold text-white">
            {lang === 'bn'
              ? `ব্যবহারকারীর সীমাবদ্ধতা ও আপিল (${restrictions.length})`
              : `Account Restrictions & Appeals (${restrictions.length})`}
          </h3>
        </div>

        {restrictions.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-5 text-xs text-slate-400">
            {lang === 'bn'
              ? 'বর্তমানে কোনো সীমাবদ্ধ অ্যাকাউন্ট বা আপিল নেই।'
              : 'No restricted community accounts or pending appeals.'}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {restrictions.map((r) => {
              const isBusy = busyId === r.userId;
              return (
                <div
                  key={r.userId}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#0A0F1C] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 text-xs">
                    <p className="font-mono text-white">
                      User: {r.userId} · Level:{' '}
                      <span className="text-rose-300">{r.restrictionLevel}</span>
                    </p>
                    <p className="text-slate-300">{r.reason}</p>
                    {r.appealText && (
                      <p className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-cyan-200">
                        Appeal ({r.appealStatus}): &ldquo;{r.appealText}&rdquo;
                      </p>
                    )}
                  </div>

                  {r.appealStatus === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleAppealDecision(r, 'approved')}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                      >
                        {lang === 'bn' ? 'আপিল অনুমোদন (পুনর্বহাল)' : 'Approve & Lift'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleAppealDecision(r, 'denied')}
                        className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
                      >
                        {lang === 'bn' ? 'আপিল বাতিল' : 'Deny Appeal'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
