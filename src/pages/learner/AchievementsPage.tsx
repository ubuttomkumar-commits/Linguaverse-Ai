import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, CheckCircle2, Flame, Trophy, Users } from 'lucide-react';
import { LearnerShell } from '../../components/layout/LearnerShell';
import { VerifiedGamificationPanel } from '../../components/gamification/VerifiedGamificationPanel';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  computeLearnerLevel,
  computeTotalVerifiedXp,
  computeWeeklyChallenges,
  type VerifiedLeaderboardEntry,
} from '../../domain/gamificationEngine';
import {
  fetchGamificationSummary,
  saveGamificationPreferences,
  type GamificationPrefs,
} from '../../services/p3Api';

export function AchievementsPage() {
  const { lang } = useLanguage();
  const {
    user,
    xpLedger,
    lessonMastery,
    speakingSessions,
    mistakes,
    transferAttempts,
    activitySummary,
  } = useAuth();

  const totalXp = useMemo(() => computeTotalVerifiedXp(xpLedger), [xpLedger]);
  const levelProgress = useMemo(() => computeLearnerLevel(totalXp), [totalXp]);
  const weeklyChallenges = useMemo(
    () =>
      computeWeeklyChallenges({
        lessonMastery,
        speakingSessions,
        mistakes,
        transferAttempts,
      }),
    [lessonMastery, speakingSessions, mistakes, transferAttempts]
  );

  const [prefs, setPrefs] = useState<GamificationPrefs | null>(null);
  const [leaderboard, setLeaderboard] = useState<VerifiedLeaderboardEntry[]>([]);
  const [aliasDraft, setAliasDraft] = useState('');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchGamificationSummary()
      .then((res) => {
        if (!active) return;
        setPrefs(res.prefs);
        setLeaderboard(res.leaderboard);
        setAliasDraft(res.prefs.displayAlias);
        setReminderTime(res.prefs.reminderTimeLocal);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load preferences.');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSavePrefs = async (patch: {
    leaderboardOptIn?: boolean;
    displayAlias?: string;
    reminderEnabled?: boolean;
    reminderTimeLocal?: string;
  }) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await saveGamificationPreferences({
        ...patch,
        totalVerifiedXp: totalXp,
      });
      setPrefs(res.prefs);
      setLeaderboard(res.leaderboard);
      setNotice(
        lang === 'bn'
          ? 'আপনার লিডারবোর্ড ও রিমাইন্ডার পছন্দ সংরক্ষিত হয়েছে।'
          : 'Retention & opt-in leaderboard preferences saved.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LearnerShell
      title={lang === 'bn' ? 'অর্জন ও চ্যালেঞ্জ' : 'Achievements & Challenges'}
      subtitle={
        lang === 'bn'
          ? 'প্রমাণিত XP লেভেল, সাপ্তাহিক বাস্তব চ্যালেঞ্জ, ঐচ্ছিক রিমাইন্ডার এবং অপ্ট-ইন লিডারবোর্ড — কোনো ভুয়া ব্যবহারকারী বা কৃত্রিম স্ট্রিক চাপ নেই।'
          : 'Verified XP levels, weekly learning challenges, learner-controlled reminders, and an opt-in real-learner leaderboard.'
      }
    >
      <div className="space-y-6">
        {/* Level & Consistency Overview */}
        <section className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs text-[#00D9FF]">
                {lang === 'bn' ? `লেভেল ${levelProgress.level}` : `Level ${levelProgress.level}`} ·{' '}
                {lang === 'bn' ? levelProgress.titleBn : levelProgress.titleEn}
              </p>
              <h2 className="mt-1 font-portal text-xl font-bold text-white">
                {user?.name} — {totalXp} {lang === 'bn' ? 'যাচাইকৃত XP' : 'Verified XP'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {lang === 'bn'
                  ? `পরবর্তী লেভেল (${levelProgress.nextLevelXp} XP) পর্যন্ত অগ্রগতি: ${levelProgress.progressPercent}%`
                  : `Progress toward Level ${levelProgress.level + 1} (${levelProgress.nextLevelXp} XP): ${levelProgress.progressPercent}%`}
              </p>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn' ? 'সক্রিয় ধারাবাহিকতা' : 'Active Streak'}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xl font-bold text-amber-400 tabular-nums">
                  <Flame className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {activitySummary.activeStreakDays} {lang === 'bn' ? 'দিন' : 'days'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn' ? 'সাপ্তাহিক চ্যালেঞ্জ' : 'Weekly Challenges'}
                </p>
                <p className="mt-0.5 font-mono text-xl font-bold text-white tabular-nums">
                  {weeklyChallenges.filter((c) => c.completed).length}/{weeklyChallenges.length}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] to-[#7C3AED] transition-all"
              style={{ width: `${levelProgress.progressPercent}%` }}
            />
          </div>
        </section>

        {/* Weekly Verified Learning Challenges */}
        <section className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 sm:p-6">
          <h2 className="font-portal text-base font-bold text-white">
            {lang === 'bn' ? '৭-দিনের প্রমাণিত লার্নিং চ্যালেঞ্জ' : '7-Day Verified Learning Challenges'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {lang === 'bn'
              ? 'প্রতিটি চ্যালেঞ্জ শুধুমাত্র আপনার গত ৭ দিনের বাস্তব একাডেমি, স্পিকিং, ভুল সমাধান এবং ট্রান্সফার ল্যাব রেকর্ড থেকে হিসাব করা হয়।'
              : 'Measured strictly from your real completed sessions over the past 7 days — never page visits.'}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {weeklyChallenges.map((ch) => (
              <div
                key={ch.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                  ch.completed
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-slate-800 bg-[#060C22]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'bn' ? ch.titleBn : ch.titleEn}
                    </h3>
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        ch.completed ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {ch.currentCount}/{ch.targetCount}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {lang === 'bn' ? ch.descriptionBn : ch.descriptionEn}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {ch.completed
                      ? lang === 'bn'
                        ? 'সম্পন্ন'
                        : 'Completed'
                      : lang === 'bn'
                        ? 'চলমান'
                        : 'In progress'}
                  </span>
                  <Link
                    to={ch.actionTo}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#00D9FF] hover:text-cyan-200"
                  >
                    <span>{lang === 'bn' ? 'অনুশীলন করুন' : 'Practice'}</span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Opt-in Real Leaderboard + Learner-Controlled Reminders */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <h2 className="font-portal text-base font-bold text-white">
                  {lang === 'bn' ? 'অপ্ট-ইন লার্নার লিডারবোর্ড' : 'Opt-In Verified Leaderboard'}
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {leaderboard.length} {lang === 'bn' ? 'অংশগ্রহণকারী' : 'opted in'}
              </span>
            </div>

            {prefs && (
              <div className="rounded-xl border border-slate-800 bg-[#060C22] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {lang === 'bn'
                        ? 'লিডারবোর্ডে আপনার যাচাইকৃত XP দেখান'
                        : 'Show my verified XP on the leaderboard'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'bn'
                        ? 'সম্পূর্ণ ঐচ্ছিক — যেকোনো সময় বন্ধ করা যাবে।'
                        : 'Strictly opt-in — only real learners who choose to appear are listed.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    data-testid="toggle-leaderboard-optin"
                    onClick={() =>
                      void handleSavePrefs({
                        leaderboardOptIn: !prefs.leaderboardOptIn,
                        displayAlias: aliasDraft,
                      })
                    }
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      prefs.leaderboardOptIn
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                        : 'border border-slate-700 bg-[#0B122C] text-slate-300 hover:text-white'
                    }`}
                  >
                    {prefs.leaderboardOptIn
                      ? lang === 'bn'
                        ? 'চালু আছে'
                        : 'Opted In'
                      : lang === 'bn'
                        ? 'অপ্ট-ইন করুন'
                        : 'Opt In'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    aria-label={lang === 'bn' ? 'প্রদর্শন নাম' : 'Leaderboard display alias'}
                    value={aliasDraft}
                    onChange={(e) => setAliasDraft(e.target.value)}
                    placeholder="Display alias"
                    className="lv-auth-input flex-1 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSavePrefs({ displayAlias: aliasDraft })}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 cursor-pointer"
                  >
                    {lang === 'bn' ? 'নাম সেভ' : 'Save Alias'}
                  </button>
                </div>
              </div>
            )}

            {leaderboard.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-[#060C22] p-5 text-center text-xs text-slate-400">
                <Users className="mx-auto h-5 w-5 text-slate-500" aria-hidden="true" />
                <p className="mt-2 font-semibold text-slate-200">
                  {lang === 'bn'
                    ? 'এখনো কোনো শিক্ষার্থী অপ্ট-ইন করেননি'
                    : 'No opted-in learners on the board yet'}
                </p>
                <p className="mt-1">
                  {lang === 'bn'
                    ? 'কোনো ভুয়া বট বা কাল্পনিক স্কোর দেখানো হয় না। উপরে অপ্ট-ইন করে আপনার প্রকৃত XP তালিকাভুক্ত করুন।'
                    : 'No synthetic bots or fabricated scores are ever displayed. Opt in above to appear with your real verified XP.'}
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#060C22]">
                {leaderboard.map((entry, idx) => (
                  <li
                    key={entry.userId}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 tabular-nums">#{idx + 1}</span>
                      <span className="font-semibold text-white">
                        {entry.displayAlias}
                        {entry.isCurrentUser ? (lang === 'bn' ? ' (আপনি)' : ' (You)') : ''}
                      </span>
                      <span className="text-[11px] text-slate-400">L{entry.level}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 tabular-nums">
                      {entry.totalVerifiedXp} XP
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Non-Punitive Reminder Preferences */}
          <section className="rounded-2xl border border-slate-800 bg-[#0B122C] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#00D9FF]" aria-hidden="true" />
              <h2 className="font-portal text-base font-bold text-white">
                {lang === 'bn' ? 'শেখার রিমাইন্ডার নিয়ন্ত্রণ' : 'Study Reminder Controls'}
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'কোনো বিরক্তিকর বা শাস্তিমূলক স্ট্রিক সতর্কতা পাঠানো হয় না। আপনার সুবিধামতো সময়ে হালকা অনুশীলনের রিমাইন্ডার চালু বা বন্ধ রাখুন।'
                : 'LINGUAVERSE AI avoids manipulative notifications and punitive streak traps. You stay in complete control of optional practice reminders.'}
            </p>

            {prefs && (
              <div className="space-y-3 rounded-xl border border-slate-800 bg-[#060C22] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-white">
                    {lang === 'bn' ? 'দৈনিক অনুশীলন রিমাইন্ডার' : 'Optional Daily Practice Reminder'}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    data-testid="toggle-reminder-btn"
                    onClick={() =>
                      void handleSavePrefs({
                        reminderEnabled: !prefs.reminderEnabled,
                        reminderTimeLocal: reminderTime,
                      })
                    }
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                      prefs.reminderEnabled
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                        : 'border border-slate-700 bg-[#0B122C] text-slate-300'
                    }`}
                  >
                    {prefs.reminderEnabled
                      ? lang === 'bn'
                        ? 'চালু'
                        : 'Enabled'
                      : lang === 'bn'
                        ? 'বন্ধ'
                        : 'Paused'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="reminder-time" className="text-xs text-slate-400">
                    {lang === 'bn' ? 'পছন্দের সময়' : 'Preferred Local Time'}
                  </label>
                  <input
                    id="reminder-time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="lv-auth-input rounded-lg px-2.5 py-1.5 font-mono text-xs text-white"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSavePrefs({ reminderTimeLocal: reminderTime })}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400/40 cursor-pointer"
                  >
                    {lang === 'bn' ? 'সংরক্ষণ' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{notice}</span>
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
              >
                {error}
              </div>
            )}
          </section>
        </div>

        {/* Reused Existing Verified XP Ledger & Achievements Panel */}
        <VerifiedGamificationPanel
          xpLedger={xpLedger}
          lessonMastery={lessonMastery}
          speakingSessions={speakingSessions}
          mistakes={mistakes}
          transferAttempts={transferAttempts}
        />
      </div>
    </LearnerShell>
  );
}
