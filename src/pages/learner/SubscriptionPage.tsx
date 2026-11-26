import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  cancelMySubscription,
  fetchMySubscription,
  requestMyInvoiceRefund,
  submitSubscriptionCheckoutRequest,
  submitSupportTicket,
  type LearnerBillingResponse,
} from '../../services/p3Api';
import type { BillingInterval, SupportTicketRecord } from '../../domain/subscriptionEntitlementsEngine';

export function SubscriptionPage() {
  const { lang } = useLanguage();
  const [data, setData] = useState<LearnerBillingResponse | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Support ticket form
  const [ticketCategory, setTicketCategory] =
    useState<SupportTicketRecord['category']>('billing');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMySubscription();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load subscription details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const handleCheckoutRequest = async (planSlug: 'pro' | 'institution') => {
    setBusyPlan(planSlug);
    setError(null);
    setNotice(null);
    try {
      const res = await submitSubscriptionCheckoutRequest({ planSlug, billingInterval });
      setNotice(
        res.message ||
          (lang === 'bn'
            ? 'আপগ্রেড অনুরোধ সংরক্ষিত হয়েছে (কোনো পেমেন্ট চার্জ করা হয়নি)।'
            : 'Upgrade request logged as pending_provider (no card was charged).')
      );
      await loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit upgrade request.');
    } finally {
      setBusyPlan(null);
    }
  };

  const handleCancelSub = async (subId: string) => {
    setError(null);
    try {
      await cancelMySubscription(subId);
      setNotice(
        lang === 'bn' ? 'সাবস্ক্রিপশন অনুরোধ বাতিল করা হয়েছে।' : 'Subscription record canceled.'
      );
      await loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel subscription.');
    }
  };

  const handleRefundRequest = async (invoiceId: string) => {
    setError(null);
    try {
      await requestMyInvoiceRefund(invoiceId, 'Learner requested billing review / refund.');
      setNotice(
        lang === 'bn'
          ? 'রিফান্ড অনুরোধ অ্যাডমিন রিভিউয়ের জন্য জমা দেওয়া হয়েছে।'
          : 'Refund request submitted for admin billing review.'
      );
      await loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request refund.');
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTicket(true);
    setError(null);
    setNotice(null);
    try {
      await submitSupportTicket({
        category: ticketCategory,
        subject: ticketSubject,
        message: ticketMessage,
      });
      setTicketSubject('');
      setTicketMessage('');
      setNotice(
        lang === 'bn'
          ? 'আপনার সাপোর্ট টিকিট সংরক্ষিত হয়েছে।'
          : 'Support ticket submitted to the Admin Support Queue.'
      );
      await loadBilling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit support ticket.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <LearnerShell
      title={lang === 'bn' ? 'সাবস্ক্রিপশন, এনটাইটেলমেন্ট ও সাপোর্ট' : 'Subscription & Support'}
      subtitle={
        lang === 'bn'
          ? 'আপনার বর্তমান প্ল্যান, দৈনিক AI ব্যবহারের সীমা, ইনভয়েস রেকর্ড এবং সরাসরি সাপোর্ট টিকিট পরিচালনা করুন।'
          : 'Manage your active plan entitlements, transparent payment gateway status, invoice records, and support requests.'
      }
    >
      <div className="space-y-6">
        {loading || !data ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0B122C] p-8 text-center text-xs text-slate-400">
            {lang === 'bn' ? 'বিলিং তথ্য লোড হচ্ছে...' : 'Loading plan and entitlement details...'}
          </div>
        ) : (
          <>
            {/* Active Entitlements Summary */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-1.5 font-mono text-xs text-[#00D9FF]">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {lang === 'bn' ? 'সক্রিয় প্ল্যান' : 'Active Plan'}:{' '}
                      {lang === 'bn' ? data.entitlements.nameBn : data.entitlements.nameEn}
                    </span>
                  </p>
                  <h2 className="mt-1 font-portal text-xl font-bold text-white">
                    {lang === 'bn'
                      ? 'আপনার বর্তমান ওয়ার্কস্পেস কোটা'
                      : 'Your Current Workspace Entitlements'}
                  </h2>
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#070D24] p-1 self-start">
                  <button
                    type="button"
                    onClick={() => setBillingInterval('monthly')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      billingInterval === 'monthly'
                        ? 'bg-[#142459] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'bn' ? 'মাসিক' : 'Monthly'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInterval('yearly')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      billingInterval === 'yearly'
                        ? 'bg-[#142459] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'bn' ? 'বার্ষিক (সাশ্রয়ী)' : 'Yearly (Save 25%)'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-[#060C22] p-3.5">
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn' ? 'দৈনিক AI স্পিকিং টার্ন' : 'Daily AI Speaking Turns'}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                    {data.entitlements.dailyAiSpeakingTurns}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#060C22] p-3.5">
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn' ? 'দৈনিক ট্রান্সফার ল্যাব' : 'Daily Transfer Lab'}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                    {data.entitlements.dailyTransferScenarios}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#060C22] p-3.5">
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn' ? 'ভোকাবুলারি ডেক সীমা' : 'Vocab Deck Limit'}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                    {data.entitlements.vocabularyDeckLimit}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#060C22] p-3.5">
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn' ? 'রিপ্লে সংরক্ষণ' : 'Replay Retention'}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
                    {data.entitlements.replayRetentionDays}d
                  </p>
                </div>
              </div>

              {/* Honest Payment Gateway Readiness Notice */}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-100">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
                <p>
                  {lang === 'bn'
                    ? data.paymentProvider.supportedMarketsNoteBn
                    : data.paymentProvider.supportedMarketsNoteEn}
                </p>
              </div>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
              >
                {error}
              </div>
            )}
            {notice && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{notice}</span>
              </div>
            )}

            {/* Plan Comparison Cards */}
            <section aria-label="Subscription Plans" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {data.catalog.map((plan) => {
                const isCurrent = data.activePlan === plan.planSlug;
                const price =
                  billingInterval === 'yearly'
                    ? plan.yearlyMonthlyPriceUsd
                    : plan.monthlyPriceUsd;
                return (
                  <div
                    key={plan.planSlug}
                    className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 ${
                      plan.planSlug === 'pro'
                        ? 'border-cyan-400/40 bg-[#0E183C]'
                        : 'border-slate-800 bg-[#0B122C]'
                    }`}
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-portal text-base font-bold text-white">
                          {lang === 'bn' ? plan.nameBn : plan.nameEn}
                        </h3>
                        <span className="font-mono text-xl font-bold text-white tabular-nums">
                          ${price}
                          <span className="text-xs font-normal text-slate-400">/mo</span>
                        </span>
                      </div>
                      <ul className="mt-4 space-y-2 text-xs text-slate-300">
                        {(lang === 'bn' ? plan.highlightsBn : plan.highlightsEn).map((line) => (
                          <li key={line} className="flex items-start gap-2">
                            <CheckCircle2
                              className="h-3.5 w-3.5 shrink-0 text-[#00D9FF] mt-0.5"
                              aria-hidden="true"
                            />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isCurrent ? (
                      <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2.5 text-center text-xs font-semibold text-emerald-200">
                        {lang === 'bn' ? 'বর্তমান সক্রিয় প্ল্যান' : 'Current Active Plan'}
                      </div>
                    ) : plan.planSlug === 'free' ? (
                      <div className="rounded-xl border border-slate-800 py-2.5 text-center text-xs text-slate-400">
                        {lang === 'bn' ? 'বেস ফ্রি টিয়ার' : 'Base Free Tier'}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busyPlan === plan.planSlug}
                        onClick={() =>
                          void handleCheckoutRequest(plan.planSlug as 'pro' | 'institution')
                        }
                        className="lv-portal-btn w-full rounded-xl py-2.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                      >
                        {busyPlan === plan.planSlug
                          ? lang === 'bn'
                            ? 'অনুরোধ সংরক্ষণ হচ্ছে...'
                            : 'Recording request...'
                          : lang === 'bn'
                            ? `${plan.nameBn} আপগ্রেড অনুরোধ করুন`
                            : `Request ${plan.nameEn} Upgrade`}
                      </button>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Subscription Lifecycle & Invoices + Support Tickets */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                  <h2 className="font-portal text-base font-bold text-white">
                    {lang === 'bn' ? 'সাবস্ক্রিপশন ও ইনভয়েস ইতিহাস' : 'Subscription & Invoice History'}
                  </h2>
                </div>

                {data.subscriptions.length === 0 ? (
                  <p className="rounded-xl border border-slate-800 bg-[#060C22] p-4 text-xs text-slate-400">
                    {lang === 'bn'
                      ? 'এখনো কোনো পেইড সাবস্ক্রিপশন বা ইনভয়েস রেকর্ড নেই।'
                      : 'No subscription or invoice records yet.'}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.subscriptions.map((sub) => {
                      const inv = data.invoices.find((i) => i.subscriptionId === sub.id);
                      return (
                        <div
                          key={sub.id}
                          data-testid="subscription-record-row"
                          className="rounded-xl border border-slate-800 bg-[#060C22] p-3.5 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">
                              {sub.planSlug.toUpperCase()} ({sub.billingInterval})
                            </span>
                            <span className="font-mono text-[11px] text-amber-300">
                              {sub.status}
                            </span>
                          </div>
                          {inv && (
                            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                              Invoice {inv.id} · ${(inv.amountCents / 100).toFixed(2)} {inv.currency}{' '}
                              · {inv.status}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {sub.status !== 'canceled' && (
                              <button
                                type="button"
                                onClick={() => void handleCancelSub(sub.id)}
                                className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                              >
                                {lang === 'bn' ? 'বাতিল করুন' : 'Cancel Request'}
                              </button>
                            )}
                            {inv && inv.status === 'paid' && (
                              <button
                                type="button"
                                onClick={() => void handleRefundRequest(inv.id)}
                                className="rounded-lg border border-amber-500/40 px-2.5 py-1 text-[11px] text-amber-200 hover:bg-amber-500/15 cursor-pointer"
                              >
                                {lang === 'bn' ? 'রিফান্ড অনুরোধ' : 'Request Refund'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Learner Support Request Form */}
              <section className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
                  <h2 className="font-portal text-base font-bold text-white">
                    {lang === 'bn' ? 'সাপোর্ট ও বিলিং সহায়তা' : 'Support & Billing Help'}
                  </h2>
                </div>

                <form onSubmit={handleSupportSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="support-cat" className="block text-xs text-slate-300">
                        {lang === 'bn' ? 'বিষয়শ্রেণি' : 'Category'}
                      </label>
                      <select
                        id="support-cat"
                        value={ticketCategory}
                        onChange={(e) =>
                          setTicketCategory(e.target.value as SupportTicketRecord['category'])
                        }
                        className="lv-auth-input mt-1 w-full rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="billing">Billing & Subscriptions</option>
                        <option value="technical">Technical Issue</option>
                        <option value="curriculum">Curriculum Question</option>
                        <option value="privacy">Privacy & Data</option>
                        <option value="abuse_appeal">Safety / Appeal</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="support-subj" className="block text-xs text-slate-300">
                        {lang === 'bn' ? 'শিরোনাম' : 'Subject'} *
                      </label>
                      <input
                        id="support-subj"
                        type="text"
                        required
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="Brief summary of your question"
                        className="lv-auth-input mt-1 w-full rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="support-msg" className="block text-xs text-slate-300">
                      {lang === 'bn' ? 'বিস্তারিত বার্তা' : 'Message'} *
                    </label>
                    <textarea
                      id="support-msg"
                      required
                      rows={3}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Describe how our team can assist you..."
                      className="lv-auth-input mt-1 w-full rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="lv-portal-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {submittingTicket
                        ? lang === 'bn'
                          ? 'জমা হচ্ছে...'
                          : 'Submitting...'
                        : lang === 'bn'
                          ? 'সাপোর্ট টিকিট পাঠান'
                          : 'Submit Support Ticket'}
                    </span>
                  </button>
                </form>

                {data.supportTickets.length > 0 && (
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <p className="text-xs font-semibold text-slate-300">
                      {lang === 'bn' ? 'আপনার পূর্ববর্তী টিকিটসমূহ' : 'Your Recent Tickets'}
                    </p>
                    {data.supportTickets.map((t) => (
                      <div
                        key={t.id}
                        data-testid="support-ticket-row"
                        className="rounded-xl border border-slate-800 bg-[#060C22] p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white">{t.subject}</span>
                          <span className="font-mono text-[11px] text-cyan-300">{t.status}</span>
                        </div>
                        <p className="mt-1 text-slate-400">{t.message}</p>
                        {t.adminResponse && (
                          <p className="mt-2 border-t border-slate-800 pt-1.5 text-emerald-300">
                            Admin: {t.adminResponse}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </LearnerShell>
  );
}
