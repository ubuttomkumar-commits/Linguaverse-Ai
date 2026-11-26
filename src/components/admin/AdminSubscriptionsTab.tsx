import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  RefreshCw,
} from 'lucide-react';
import {
  fetchAdminSubscriptionsAndFinance,
  updateAdminSupportTicket,
} from '../../services/p3Api';
import type {
  RealFinancialMetrics,
  SubscriptionInvoiceRecord,
  SubscriptionRecord,
  SupportTicketRecord,
} from '../../domain/subscriptionEntitlementsEngine';

interface AdminSubscriptionsTabProps {
  lang: 'en' | 'bn';
  totalUsers: number;
  totalAiCostUsd: number;
}

export function AdminSubscriptionsTab({
  lang,
  totalUsers,
  totalAiCostUsd,
}: AdminSubscriptionsTabProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [invoices, setInvoices] = useState<SubscriptionInvoiceRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [metrics, setMetrics] = useState<RealFinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [replyByTicket, setReplyByTicket] = useState<Record<string, string>>({});

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSubscriptionsAndFinance({
        totalUsers,
        totalAiCostUsd,
      });
      setSubscriptions(data.subscriptions);
      setInvoices(data.invoices);
      setTickets(data.supportTickets);
      setMetrics(data.financialMetrics);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load subscription and finance records.'
      );
    } finally {
      setLoading(false);
    }
  }, [totalUsers, totalAiCostUsd]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const handleUpdateTicket = async (
    ticket: SupportTicketRecord,
    status: SupportTicketRecord['status']
  ) => {
    setBusyTicketId(ticket.id);
    setError(null);
    setNotice(null);
    try {
      const adminResponse = (replyByTicket[ticket.id] ?? ticket.adminResponse ?? '').trim();
      const res = await updateAdminSupportTicket({
        ticketId: ticket.id,
        status,
        adminResponse:
          adminResponse || `Status updated to ${status} by administrator.`,
      });
      setTickets((prev) => prev.map((t) => (t.id === res.ticket.id ? res.ticket : t)));
      setNotice(
        lang === 'bn'
          ? `সাপোর্ট টিকিট #${ticket.id.slice(0, 8)} আপডেট হয়েছে (${status})।`
          : `Support ticket ${ticket.id.slice(0, 8)} updated to ${status}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update support ticket.');
    } finally {
      setBusyTicketId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real Financial Metrics */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <h2 className="text-base font-bold text-white">
                {lang === 'bn'
                  ? 'সাবস্ক্রিপশন, বাস্তব আর্থিক মেট্রিক্স ও সাপোর্ট'
                  : 'Subscriptions, Real Financial Metrics & Support Triage'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'সমস্ত আয়, সক্রিয় প্রো সাবস্ক্রিপশন এবং রিফান্ড শুধুমাত্র প্রকৃত পরিশোধিত ইনভয়েস থেকে গণনা করা হয়। কোনো অনুমানিত বা কাল্পনিক আয় দেখানো হয় না।'
                : 'All revenue, MRR, active subscriptions, and refund figures are computed strictly from settled invoice records. Pending provider requests are never counted as revenue.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadBilling()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0A0F1C] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh Finance'}</span>
          </button>
        </div>

        {metrics && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'সক্রিয় পেইড সাবস্ক্রিপশন' : 'Active Paid Subs'}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                {metrics.activePaidSubscriptions}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {metrics.pendingProviderRequests} pending provider
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'প্রকৃত নিট আয় (USD)' : 'Settled Net Revenue'}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-300 tabular-nums">
                ${metrics.actualTotalCollectedUsd.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                MRR: ${metrics.actualMrrUsd.toFixed(2)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'পেইড কনভার্সন হার' : 'Paid Conversion'}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-cyan-300 tabular-nums">
                {metrics.conversionRatePercent}%
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {metrics.refundedCount} refunded invoices
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {lang === 'bn' ? 'মোট AI খরচ বনাম আয়' : 'Recorded AI Cost'}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-violet-300 tabular-nums">
                ${metrics.aiCostTotalUsd.toFixed(4)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {totalUsers} total accounts
              </p>
            </div>
          </div>
        )}

        {metrics && metrics.actualTotalCollectedUsd === 0 && (
          <p className="mt-3 rounded-lg border border-slate-800 bg-[#0A0F1C] px-3.5 py-2.5 text-xs text-slate-400">
            {lang === 'bn' ? metrics.revenueNoticeBn : metrics.revenueNoticeEn}
          </p>
        )}

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

      {/* Subscriptions & Invoices */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <h3 className="text-sm font-bold text-white">
          {lang === 'bn'
            ? `সাবস্ক্রিপশন রেকর্ড (${subscriptions.length}) ও ইনভয়েস (${invoices.length})`
            : `Subscription Records (${subscriptions.length}) & Invoices (${invoices.length})`}
        </h3>

        {subscriptions.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-5 text-xs text-slate-400">
            {lang === 'bn'
              ? 'এখনো কোনো সাবস্ক্রিপশন অনুরোধ বা সক্রিয় পেইড সাবস্ক্রিপশন রেকর্ড নেই।'
              : 'No subscription upgrade requests or active paid plans have been recorded yet.'}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3 font-medium">User ID</th>
                  <th className="py-2 pr-3 font-medium">Plan</th>
                  <th className="py-2 pr-3 font-medium">Interval</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Provider</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-300">
                      {sub.userId}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold uppercase text-white">
                      {sub.planSlug}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-300">{sub.billingInterval}</td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-amber-300">
                      {sub.status}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-400">{sub.provider}</td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-400">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Support Tickets Triage */}
      <section className="rounded-xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <h3 className="text-sm font-bold text-white">
            {lang === 'bn'
              ? `সাপোর্ট টিকিট কিউ (${tickets.length})`
              : `Learner Support Tickets (${tickets.length})`}
          </h3>
        </div>

        {tickets.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-800 bg-[#0A0F1C] p-5 text-xs text-slate-400">
            {lang === 'bn'
              ? 'এখনো কোনো সাপোর্ট টিকিট জমা পড়েনি।'
              : 'No support tickets submitted yet.'}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {tickets.map((ticket) => {
              const isBusy = busyTicketId === ticket.id;
              return (
                <article
                  key={ticket.id}
                  className="rounded-xl border border-slate-800 bg-[#0A0F1C] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{ticket.subject}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {ticket.category} · {ticket.userEmail} · Status:{' '}
                        <span className="text-cyan-300">{ticket.status}</span>
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-300">{ticket.message}</p>

                  <div>
                    <label
                      htmlFor={`ticket-reply-${ticket.id}`}
                      className="block text-[11px] font-medium text-slate-400"
                    >
                      {lang === 'bn' ? 'অ্যাডমিন উত্তর' : 'Admin Response'}
                    </label>
                    <input
                      id={`ticket-reply-${ticket.id}`}
                      type="text"
                      value={replyByTicket[ticket.id] ?? ticket.adminResponse ?? ''}
                      onChange={(e) =>
                        setReplyByTicket((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                      }
                      placeholder={
                        lang === 'bn'
                          ? 'শিক্ষার্থীর জন্য উত্তর লিখুন...'
                          : 'Write a response for the learner...'
                      }
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs text-white focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleUpdateTicket(ticket, 'in_progress')}
                      className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50 cursor-pointer"
                    >
                      {lang === 'bn' ? 'চলমান হিসেবে চিহ্নিত করুন' : 'Mark In Progress'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleUpdateTicket(ticket, 'resolved')}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                    >
                      {lang === 'bn' ? 'সমাধান করুন' : 'Resolve Ticket'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleUpdateTicket(ticket, 'open')}
                      className="rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-50 cursor-pointer"
                    >
                      {lang === 'bn' ? 'পুনরায় খুলুন' : 'Reopen'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
