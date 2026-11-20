import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Mic,
  Sparkles,
  Square,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getAudioBlob } from '../../utils/audioBlobStore';
import {
  speakEnglishExample,
  stopSpeaking,
  type PlaybackSpeed,
} from '../../utils/speechSynthesis';
import type {
  ExplanationLanguage,
  MistakeSeverity,
  SpeakingTurnRecord,
} from '../../types/domain';

interface TurnEvaluationCardProps {
  turn: SpeakingTurnRecord;
  explanationPref: ExplanationLanguage;
  playbackSpeed: PlaybackSpeed;
}

function severityLabel(severity: MistakeSeverity, lang: 'en' | 'bn'): string {
  if (severity === 'high') return lang === 'bn' ? 'উচ্চ গুরুত্ব' : 'High impact';
  if (severity === 'low') return lang === 'bn' ? 'সামান্য' : 'Minor';
  return lang === 'bn' ? 'মাঝারি' : 'Medium';
}

function channelLabel(channel: SpeakingTurnRecord['inputChannel'], lang: 'en' | 'bn'): string {
  if (channel === 'voice_stt') return lang === 'bn' ? 'ভয়েস (STT)' : 'Voice (STT)';
  if (channel === 'voice_with_manual_edit') {
    return lang === 'bn' ? 'ভয়েস + সম্পাদিত' : 'Voice + Edited';
  }
  return lang === 'bn' ? 'টেক্সট ফলব্যাক' : 'Text Fallback';
}

export function TurnEvaluationCard({
  turn,
  explanationPref,
  playbackSpeed,
}: TurnEvaluationCardProps) {
  const { lang } = useLanguage();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSpeakingReply, setIsSpeakingReply] = useState(false);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let active = true;

    if (turn.audioBlobKey) {
      getAudioBlob(turn.audioBlobKey).then((blob) => {
        if (!active || !blob) return;
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        setAudioUrl(url);
      });
    } else {
      setAudioUrl(null);
    }

    return () => {
      active = false;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [turn.audioBlobKey]);

  const handleToggleReplyTts = () => {
    if (isSpeakingReply) {
      stopSpeaking();
      setIsSpeakingReply(false);
      return;
    }
    setIsSpeakingReply(true);
    const started = speakEnglishExample({
      text: turn.evaluation.ai_reply,
      rate: playbackSpeed,
      onEnd: () => setIsSpeakingReply(false),
      onError: () => setIsSpeakingReply(false),
    });
    if (!started) setIsSpeakingReply(false);
  };

  const { evaluation } = turn;

  return (
    <article className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6 space-y-5">
      {/* Turn Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 text-xs">
        <span className="font-mono font-semibold text-[#3B82F6] tabular-nums">
          {lang === 'bn' ? `ধাপ ০${turn.turnNumber}` : `Turn 0${turn.turnNumber}`} ·{' '}
          {channelLabel(turn.inputChannel, lang)}
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-slate-400 tabular-nums">
          {turn.timedOut && (
            <span className="text-[#F59E0B]">
              {lang === 'bn' ? 'সময়সীমা অতিক্রান্ত' : 'Timer expired'}
            </span>
          )}
          <span>
            {evaluation.mistakes.length === 0
              ? lang === 'bn'
                ? '০টি ভুল শনাক্ত'
                : '0 errors detected'
              : lang === 'bn'
                ? `${evaluation.mistakes.length}টি ভুল · Mistake Memory-তে সিঙ্কড`
                : `${evaluation.mistakes.length} error${evaluation.mistakes.length === 1 ? '' : 's'} · Synced to Mistake Memory`}
          </span>
        </div>
      </div>

      {/* User Transcript + Self-Review Audio Player */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-[#0A0F1C] p-4">
          <p className="text-xs font-medium text-slate-400">
            {lang === 'bn' ? 'আপনার বক্তব্য (Original)' : 'What You Said (Original)'}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-100">{turn.userTranscript}</p>

          {audioUrl && (
            <div className="mt-3 border-t border-slate-800 pt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Mic className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
                <span>
                  {lang === 'bn'
                    ? 'আপনার রেকর্ডকৃত কণ্ঠস্বর শুনুন'
                    : 'Play back your recorded voice'}
                </span>
              </p>
              <audio
                controls
                src={audioUrl}
                aria-label={`Recorded voice for turn ${turn.turnNumber}`}
                className="h-9 w-full"
              />
            </div>
          )}
        </div>

        {/* Corrected & Natural Alternative */}
        <div className="rounded-lg border border-[#3B82F6]/35 bg-[#0A0F1C] p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-[#3B82F6]">
              {lang === 'bn' ? 'শুদ্ধ রূপ (Corrected Transcript)' : 'Corrected Transcript'}
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-emerald-300">
              {evaluation.corrected_transcript}
            </p>
          </div>
          <div className="border-t border-slate-800 pt-2.5">
            <p className="text-xs font-medium text-[#8B5CF6]">
              {lang === 'bn'
                ? 'স্বাভাবিক নেটিভ বিকল্প (Natural Alternative)'
                : 'Natural Fluent Alternative'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-100">
              {evaluation.natural_alternative}
            </p>
          </div>
        </div>
      </div>

      {/* AI Conversational Reply + TTS */}
      <div className="rounded-xl border border-slate-700/80 bg-[#0A0F1C] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? 'AI কথোপকথনের উত্তর' : 'AI Coach Reply'}</span>
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-white sm:text-base">
              {evaluation.ai_reply}
            </p>
            {evaluation.ai_reply_bn_hint && (explanationPref === 'bn' || explanationPref === 'both') && (
              <p className="font-bn mt-1.5 text-xs leading-relaxed text-slate-400">
                {evaluation.ai_reply_bn_hint}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleReplyTts}
            aria-pressed={isSpeakingReply}
            className={`inline-flex items-center gap-1.5 self-start rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSpeakingReply
                ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                : 'border-slate-700 bg-[#111827] text-slate-200 hover:border-[#3B82F6] hover:text-white'
            }`}
          >
            {isSpeakingReply ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>{lang === 'bn' ? 'থামান' : 'Stop'}</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{lang === 'bn' ? 'শুনুন' : 'Listen'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* What You Said Well */}
      {evaluation.correct_elements.length > 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/15 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{lang === 'bn' ? 'যা ভালো বলেছেন' : 'What You Said Well'}</span>
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-200 sm:text-sm">
            {evaluation.correct_elements.map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detected Mistakes List */}
      {evaluation.mistakes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#F59E0B]">
            {lang === 'bn'
              ? 'শনাক্তকৃত ভুল ও বাংলা ব্যাখ্যা (Mistake Memory-তে সংরক্ষিত)'
              : 'Detected Mistakes & Bangla Explanations (Synced to Mistake Memory)'}
          </p>
          <div className="space-y-3">
            {evaluation.mistakes.map((m, idx) => (
              <div
                key={`${turn.id}_m_${idx}`}
                className="rounded-lg border border-[#F59E0B]/35 bg-[#0A0F1C] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#8B5CF6]">{m.category}</span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {severityLabel(m.severity, lang)} ·{' '}
                    {lang === 'bn'
                      ? `নিশ্চয়তা ${Math.round(m.confidence * 100)}%`
                      : `${Math.round(m.confidence * 100)}% confidence`}
                  </span>
                </div>

                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden="true" />
                  <span className="text-rose-300 line-through">{m.original}</span>
                  <span aria-hidden="true" className="text-slate-500">
                    →
                  </span>
                  <span className="font-semibold text-emerald-300">{m.corrected}</span>
                </p>

                <div className="mt-2.5 space-y-1.5 text-xs leading-relaxed sm:text-sm">
                  {(explanationPref === 'bn' || explanationPref === 'both') && (
                    <p className="font-bn text-slate-200">
                      <span className="font-semibold text-[#8B5CF6]">বাংলা ব্যাখ্যা: </span>
                      {m.explanation_bn}
                    </p>
                  )}
                  {(explanationPref === 'en' || explanationPref === 'both') && (
                    <p className="text-slate-300">
                      <span className="font-semibold text-[#3B82F6]">English: </span>
                      {m.explanation_en}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Honest Pronunciation / Clarity Note */}
      <div className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-[#0A0F1C] p-3.5 text-xs leading-relaxed text-slate-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <div>
          <p className="font-semibold text-slate-200">
            {lang === 'bn'
              ? 'উচ্চারণ ও স্পষ্টতা নোট (কোনো কাল্পনিক স্কোর নয়)'
              : 'Honest Clarity & Spoken Rhythm Note (Non-Acoustic)'}
          </p>
          <p className="mt-1 text-slate-400">{evaluation.pronunciation_note}</p>
        </div>
      </div>
    </article>
  );
}
