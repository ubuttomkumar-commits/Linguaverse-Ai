import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, History, Mic } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getPressureLevelConfig,
  getSpeakingScenario,
} from '../../domain/speakingScenarios';
import { TurnEvaluationCard } from './TurnEvaluationCard';
import type { PlaybackSpeed } from '../../utils/speechSynthesis';
import type { ExplanationLanguage, SpeakingSessionRecord } from '../../types/domain';

interface CommunicationReplayPanelProps {
  sessions: SpeakingSessionRecord[];
  explanationPref: ExplanationLanguage;
  playbackSpeed: PlaybackSpeed;
  onStartNewSession: () => void;
}

export function CommunicationReplayPanel({
  sessions,
  explanationPref,
  playbackSpeed,
  onStartNewSession,
}: CommunicationReplayPanelProps) {
  const { lang } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(sessions[0]?.id ?? null);

  const activeSession = useMemo(() => {
    if (sessions.length === 0) return null;
    return sessions.find((s) => s.id === selectedId) ?? sessions[0];
  }, [sessions, selectedId]);

  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 16);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
        <p className="font-mono text-xs text-slate-400 tabular-nums">
          {lang === 'bn'
            ? '০টি সংরক্ষিত কথোপকথন · সৎ প্রাথমিক অবস্থা'
            : '0 recorded speaking sessions · Honest empty state'}
        </p>
        <h2 className="mt-2 text-xl font-bold text-white">
          {lang === 'bn'
            ? 'আপনার Communication Replay এখনো খালি'
            : 'Your Communication Replay is empty'}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          {lang === 'bn'
            ? 'AI Speaking Studio-তে অন্তত একটি কথা বলার ধাপ সম্পন্ন করলে এখানে আপনার অডিও রেকর্ডিং, মূল বনাম শুদ্ধ ট্রান্সক্রিপ্ট এবং বাংলা ব্যাখ্যা স্থায়ীভাবে সংরক্ষিত হবে।'
            : 'Complete at least one evaluated turn in the Live Speaking Studio. Every transcript, corrected version, self-review audio recording, and Mistake Memory sync will appear here automatically.'}
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onStartNewSession}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors cursor-pointer"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            <span>{lang === 'bn' ? 'নতুন সেশন শুরু করুন' : 'Start a Speaking Session'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Saved Sessions List */}
      <aside className="space-y-3 lg:col-span-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
            <History className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
            <span>
              {lang === 'bn'
                ? `সংরক্ষিত সেশন (${sessions.length})`
                : `Saved Sessions (${sessions.length})`}
            </span>
          </span>
        </div>

        <div className="space-y-2.5">
          {sessions.map((session) => {
            const scenario = getSpeakingScenario(session.modeId);
            const pressure = getPressureLevelConfig(session.pressureLevel);
            const isSelected = activeSession?.id === session.id;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedId(session.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                    : 'border-slate-800 bg-[#111827] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <CalendarClock className="h-3 w-3 text-[#8B5CF6]" aria-hidden="true" />
                    {formatDateTime(session.updatedAt)}
                  </span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {session.turns.length}{' '}
                    {lang === 'bn' ? 'ধাপ' : session.turns.length === 1 ? 'turn' : 'turns'}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-bold text-white">
                  {lang === 'bn' ? scenario.titleBn : scenario.titleEn}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {lang === 'bn' ? pressure.titleBn : pressure.titleEn} ·{' '}
                  <span className="font-mono tabular-nums">
                    {session.totalMistakesDetected}{' '}
                    {lang === 'bn'
                      ? 'টি ভুল'
                      : session.totalMistakesDetected === 1
                        ? 'mistake'
                        : 'mistakes'}
                  </span>
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right: Full Session Replay Inspector */}
      <div className="space-y-5 lg:col-span-8">
        {activeSession && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] p-5">
              <div>
                <p className="font-mono text-xs text-[#3B82F6]">
                  {lang === 'bn'
                    ? getPressureLevelConfig(activeSession.pressureLevel).titleBn
                    : getPressureLevelConfig(activeSession.pressureLevel).titleEn}
                </p>
                <h2 className="mt-1 text-lg font-bold text-white">
                  {lang === 'bn'
                    ? getSpeakingScenario(activeSession.modeId).titleBn
                    : getSpeakingScenario(activeSession.modeId).titleEn}
                </h2>
                <p className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
                  {formatDateTime(activeSession.startedAt)} · {activeSession.turns.length}{' '}
                  {lang === 'bn'
                    ? 'ধাপ'
                    : activeSession.turns.length === 1
                      ? 'turn'
                      : 'turns'}{' '}
                  · {activeSession.totalMistakesDetected}{' '}
                  {lang === 'bn'
                    ? 'টি ভুল শনাক্ত'
                    : activeSession.totalMistakesDetected === 1
                      ? 'mistake detected'
                      : 'mistakes detected'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/app/replay?session=${encodeURIComponent(activeSession.id)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/45 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                >
                  <span>{lang === 'bn' ? 'পূর্ণ রিপ্লে খুলুন' : 'Open Full Replay'}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  to="/app/improve"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#8B5CF6]/50 bg-[#8B5CF6]/10 px-3.5 py-2 text-xs font-semibold text-violet-200 hover:bg-[#8B5CF6]/20 transition-colors"
                >
                  <span>{lang === 'bn' ? 'Mistake Memory দেখুন' : 'View Mistake Memory'}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {activeSession.turns.map((turn) => (
                <TurnEvaluationCard
                  key={turn.id}
                  turn={turn}
                  explanationPref={explanationPref}
                  playbackSpeed={playbackSpeed}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
