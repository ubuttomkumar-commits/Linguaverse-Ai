import React, { useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Lock,
  MailCheck,
  MailWarning,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { ADMIN_ROLE_LABELS } from '../../domain/adminGovernanceEngine';
import type {
  AccountStatus,
  AdminRole,
  AdminUserSummary,
  UILanguage,
} from '../../types/domain';

const ASSIGNABLE_ROLES: AdminRole[] = [
  'learner',
  'moderator',
  'content_manager',
  'ai_ops',
  'admin',
  'super_admin',
];

interface AdminUserManagementTabProps {
  lang: UILanguage;
  canManageUsers: boolean;
  currentUserId: string;
  users: AdminUserSummary[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onUpdateUser: (
    target: AdminUserSummary,
    patch: { role?: AdminRole; accountStatus?: AccountStatus }
  ) => Promise<void>;
}

export function AdminUserManagementTab({
  lang,
  canManageUsers,
  currentUserId,
  users,
  searchQuery,
  onSearchChange,
  onUpdateUser,
}: AdminUserManagementTabProps) {
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!canManageUsers) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-[#111827] p-6">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-200">
            {lang === 'bn'
              ? 'ইউজার ম্যানেজমেন্ট ও ভূমিকা পরিবর্তনের জন্য Admin বা Super Admin অনুমতি প্রয়োজন।'
              : 'User Management requires Admin or Super Admin permissions (users:manage).'}
          </p>
        </div>
      </div>
    );
  }

  const handleAction = async (
    target: AdminUserSummary,
    patch: { role?: AdminRole; accountStatus?: AccountStatus }
  ) => {
    setBusyUserId(target.id);
    setNotice(null);
    try {
      await onUpdateUser(target, patch);
      setNotice(
        lang === 'bn'
          ? `${target.email} অ্যাকাউন্ট আপডেট করা হয়েছে এবং অডিট লগে সংরক্ষিত হয়েছে।`
          : `Updated account ${target.email} and recorded entry in the immutable Audit Log.`
      );
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Users className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? `নিবন্ধিত ব্যবহারকারী (${users.length})`
                  : `Registered User Accounts (${users.length})`}
              </span>
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'বাস্তব নিবন্ধিত ব্যবহারকারীদের খুঁজুন, ইমেইল যাচাই অবস্থা দেখুন, অ্যাকাউন্ট স্থগিত/পুনর্বহাল করুন বা ভূমিকা পরিবর্তন করুন।'
                : 'Search real registered accounts, inspect Gmail OTP verification status, suspend/restore accounts, or update RBAC roles.'}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                lang === 'bn'
                  ? 'নাম, ইমেইল বা ভূমিকা খুঁজুন...'
                  : 'Search name, email, or role...'
              }
              aria-label={lang === 'bn' ? 'ব্যবহারকারী খুঁজুন' : 'Search registered users'}
              className="w-full rounded-lg border border-slate-700 bg-[#0A0F1C] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-[#3B82F6] focus:outline-none"
            />
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/25 px-3.5 py-2.5 text-xs text-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {users.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-800 bg-[#0A0F1C] p-8 text-center">
            <p className="text-sm font-medium text-slate-300">
              {lang === 'bn'
                ? 'এই অনুসন্ধানে কোনো নিবন্ধিত অ্যাকাউন্ট পাওয়া যায়নি।'
                : 'No registered user accounts match your search.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 pr-4">{lang === 'bn' ? 'ব্যবহারকারী' : 'User'}</th>
                  <th className="py-2.5 pr-4">{lang === 'bn' ? 'যাচাই ও অবস্থা' : 'Verification & Status'}</th>
                  <th className="py-2.5 pr-4">{lang === 'bn' ? 'অগ্রগতি' : 'Real Activity'}</th>
                  <th className="py-2.5 pr-4">{lang === 'bn' ? 'ভূমিকা (RBAC)' : 'RBAC Role'}</th>
                  <th className="py-2.5 text-right">{lang === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isBusy = busyUserId === u.id;
                  const isSuspended = u.accountStatus === 'suspended';
                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-white">
                          {u.name}{' '}
                          {isSelf && (
                            <span className="ml-1 rounded bg-[#3B82F6]/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                              {lang === 'bn' ? 'আপনি' : 'You'}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">{u.email}</div>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              u.emailVerified ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {u.emailVerified ? (
                              <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <MailWarning className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {u.emailVerified
                              ? lang === 'bn'
                                ? 'ইমেইল যাচাইকৃত'
                                : 'Verified'
                              : lang === 'bn'
                                ? 'যাচাই বাকি'
                                : 'Unverified'}
                          </span>
                          <span
                            className={`text-[11px] font-mono ${
                              isSuspended ? 'text-rose-300' : 'text-slate-400'
                            }`}
                          >
                            {isSuspended
                              ? lang === 'bn'
                                ? 'স্থগিত (Suspended)'
                                : 'Suspended'
                              : lang === 'bn'
                                ? 'সক্রিয় (Active)'
                                : 'Active'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 pr-4 font-mono text-[11px] text-slate-300">
                        <div>
                          {u.lessonsCompleted} {lang === 'bn' ? 'লেসন' : 'lessons'} ·{' '}
                          {u.speakingSessions} {lang === 'bn' ? 'স্পিকিং' : 'speaking'}
                        </div>
                        <div className="text-slate-400">
                          {u.activeMistakes} {lang === 'bn' ? 'সক্রিয় ভুল' : 'active mistakes'}
                        </div>
                      </td>

                      <td className="py-3 pr-4">
                        <select
                          aria-label={`Role for ${u.email}`}
                          disabled={isBusy}
                          value={u.role}
                          onChange={(e) =>
                            void handleAction(u, { role: e.target.value as AdminRole })
                          }
                          className="rounded-lg border border-slate-700 bg-[#0A0F1C] px-2.5 py-1.5 text-xs text-white focus:border-[#3B82F6] focus:outline-none disabled:opacity-50"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {lang === 'bn' ? ADMIN_ROLE_LABELS[r].bn : ADMIN_ROLE_LABELS[r].en}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 text-right">
                        <button
                          type="button"
                          disabled={isBusy || isSelf}
                          onClick={() =>
                            void handleAction(u, {
                              accountStatus: isSuspended ? 'active' : 'suspended',
                            })
                          }
                          title={
                            isSelf
                              ? lang === 'bn'
                                ? 'নিজের অ্যাকাউন্ট স্থগিত করা যাবে না'
                                : 'Cannot suspend your own active admin session'
                              : undefined
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                            isSuspended
                              ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-950/40'
                              : 'border-rose-500/40 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40'
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{lang === 'bn' ? 'পুনর্বহাল' : 'Restore'}</span>
                            </>
                          ) : (
                            <>
                              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{lang === 'bn' ? 'স্থগিত' : 'Suspend'}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
