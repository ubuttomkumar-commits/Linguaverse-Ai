import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Dna,
  Download,
  Info,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  buildReplayDnaEvidenceTrace,
  buildSessionExportPayload,
  isAuthorizedAudioBlobKey,
} from '../../domain/communicationReplayEngine';
import {
  notifyServerRecordingDeletion,
  ReplayApiError,
  requestReplaySessionSummary,
} from '../../services/replayApi';
import { appendAuditLog } from '../../services/governanceStore';
import { deleteAudioBlob } from '../../utils/audioBlobStore';
import type {
  AdminRole,
  ExplanationLanguage,
  PrivacyConsentSettings,
  ReplayPracticeAttemptRecord,
  ReplayReviewStatus,
  ReplaySessionAiSummary,
  UnifiedReplaySession,
} from '../../types/domain';

interface ReplayAnalysisAndPracticePanelProps {
  session: UnifiedReplaySession;
  currentUserId: string;
  currentUserEmail: string;
  currentUserRole: AdminRole;
  explanationPref: ExplanationLanguage;
  privacyConsent?: PrivacyConsentSettings;
  practiceAttempts: ReplayPracticeAttemptRecord[];
  onUpdateReview: (payload: { status: ReplayReviewStatus; learnerNote?: string }) => void;
  onRecordingsDeleted: () => void;
}

function objectiveStatusLabel(status: string, lang: 'en' | 'bn'): string {
  switch (status) {
    case 'achieved':
      return lang === 'bn' ? 'অর্জিত' : 'Achieved';
    case 'partially_achieved':
      return lang === 'bn' ? 'আংশিক অর্জিত' : 'Partially achieved';
    case 'not_achieved':
      return lang === 'bn' ? 'অর্জিত হয়নি' : 'Not achieved';
    case 'not_evaluated':
      return lang === 'bn' ? 'মূল্যায়ন হয়নি' : 'Not evaluated';
    default:
      return lang === 'bn' ? 'চলমান' : 'In progress';
  }
}

export function ReplayAnalysisAndPracticePanel({
  session,
  currentUserId,
  currentUserEmail,
  currentUserRole,
  explanationPref,
  privacyConsent,
  practiceAttempts,
  onUpdateReview,
  onRecordingsDeleted,
}: ReplayAnalysisAndPracticePanelProps) {
  const { lang } = useLanguage();
  const [noteDraft, setNoteDraft] = useState(session.learnerNote ?? '');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // On-demand AI session summary (strictly separate from historical assessment)
  const [aiSummary, setAiSummary] = useState<ReplaySessionAiSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Privacy export & local recording deletion controls
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [confirmDeleteAudio, setConfirmDeleteAudio] = useState(false);
  const [isDeletingAudio, setIsDeletingAudio] = useState(false);
  const [deleteAudioMessage, setDeleteAudioMessage] = useState<string | null>(null);

  useEffect(() => {
    setNoteDraft(session.learnerNote ?? '');
    setNoteSavedFeedback(false);
    setAiSummary(null);
    setSummaryError(null);
    setExportNotice(null);
    setConfirmDeleteAudio(false);
    setDeleteAudioMessage(null);
  }, [session.id, session.learnerNote]);

  const dnaEvidenceTrace = useMemo(() => buildReplayDnaEvidenceTrace(session), [session]);

  const handleSaveNote = () => {
    onUpdateReview({
      status: session.reviewStatus === 'unreviewed' ? 'in_review' : session.reviewStatus,
      learnerNote: noteDraft,
    });
    setNoteSavedFeedback(true);
    window.setTimeout(() => setNoteSavedFeedback(false), 2500);
  };

  const handleGenerateAiSummary = async () => {
    if (!session.hasTranscript) return;
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const summary = await requestReplaySessionSummary({
        sessionId: session.id,
        scenarioTitle: session.titleEn,
        transcript: session.turns.map((t) => ({ speaker: t.speaker, text: t.text })),
        explanationLanguage: explanationPref,
        userId: currentUserId,
      });
      setAiSummary(summary);
    } catch (err) {
      setSummaryError(
        err instanceof ReplayApiError
          ? err.message
          : lang === 'bn'
            ? 'AI সারসংক্ষেপ তৈরি করা যায়নি।'
            : 'Unable to generate on-demand AI summary right now.'
      );
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleExportSessionJson = () => {
    try {
      const payload = buildSessionExportPayload(session, practiceAttempts);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `linguaverse-replay-${session.id}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      appendAuditLog({
        actorUserId: currentUserId,
        actorEmail: currentUserEmail,
        actorRole: currentUserRole,
        action: 'replay_session_exported',
        resourceType: 'data_export',
        resourceId: session.id,
        summaryEn: `Exported Communication Replay JSON for session ${session.id}`,
        summaryBn: `সেশন ${session.id}-এর Communication Replay JSON এক্সপোর্ট করা হয়েছে`,
        metadata: {
          source: session.source,
          turnCount: session.turns.length,
        },
      });

      setExportNotice(
        lang === 'bn'
          ? 'সেশন JSON ডাউনলোড হয়েছে এবং অডিট লগে রেকর্ড করা হয়েছে।'
          : 'Session JSON exported and recorded in your account audit log.'
      );
    } catch {
      setExportNotice(
        lang === 'bn' ? 'এক্সপোর্ট করতে সমস্যা হয়েছে।' : 'Unable to export session JSON.'
      );
    }
  };

  const handleDeleteLocalRecordings = async () => {
    setIsDeletingAudio(true);
    setDeleteAudioMessage(null);
    let deletedCount = 0;

    try {
      const authorizedKeys = Array.from(
        new Set(
          session.authorizedAudioKeys.filter((key) =>
            isAuthorizedAudioBlobKey(key, currentUserId, session.userId)
          )
        )
      );

      for (const key of authorizedKeys) {
        await deleteAudioBlob(key);
        deletedCount += 1;
      }

      appendAuditLog({
        actorUserId: currentUserId,
        actorEmail: currentUserEmail,
        actorRole: currentUserRole,
        action: 'replay_local_recording_deleted',
        resourceType: 'recordings_purge',
        resourceId: session.id,
        summaryEn: `Deleted ${deletedCount} authorized local audio blob(s) for replay session ${session.id}`,
        summaryBn: `রিপ্লে সেশন ${session.id}-এর ${deletedCount}টি লোকাল অডিও ফাইল মুছে ফেলা হয়েছে`,
        metadata: {
          deletedLocalKeyCount: deletedCount,
          storageScope: 'browser_local_indexeddb',
        },
      });

      const serverAck = await notifyServerRecordingDeletion({
        sessionId: session.id,
        deletedLocalKeyCount: deletedCount,
      });

      setConfirmDeleteAudio(false);
      onRecordingsDeleted();

      setDeleteAudioMessage(
        lang === 'bn'
          ? `এই ডিভাইসের IndexedDB থেকে ${deletedCount}টি অনুমোদিত অডিও রেকর্ডিং মুছে ফেলা হয়েছে${serverAck.auditedOnServer ? ' এবং সার্ভার অডিট লগে নথিভুক্ত হয়েছে' : ''}। ট্রান্সক্রিপ্ট অক্ষত আছে।`
          : `Deleted ${deletedCount} authorized local recording blob(s) from this browser's IndexedDB${serverAck.auditedOnServer ? ' and logged deletion with the server' : ''}. Your transcript remains intact.`
      );
    } catch {
      setDeleteAudioMessage(
        lang === 'bn'
          ? 'লোকাল রেকর্ডিং মুছতে ত্রুটি হয়েছে।'
          : 'Failed to delete local audio recording.'
      );
    } finally {
      setIsDeletingAudio(false);
    }
  };

  const { analysis } = session;

  return (
    <div className="space-y-6">
      {/* 1. Learner Self-Reflection & Session Review Status */}
      <section
        aria-label={lang === 'bn' ? 'শিক্ষার্থীর স্ব-পর্যালোচনা' : 'Learner Self-Reflection'}
        className="rounded-2xl border border-cyan-400/20 bg-[#081031]/90 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
              {lang === 'bn' ? 'শিক্ষার্থীর স্ব-পর্যালোচনা' : 'Learner Self-Reflection'}
            </p>
            <h3 className="font-portal mt-0.5 flex items-center gap-2 text-base font-bold text-white">
              <ClipboardCheck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>{lang === 'bn' ? 'সেশন পর্যালোচনা ও নোট' : 'Session Review Status'}</span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'সেশন খোলার সাথে সাথে স্বয়ংক্রিয়ভাবে "Reviewed" হয় না। স্ট্যাটাস আপডেট করলে নতুন মূল্যায়ন বা ডুপ্লিকেট XP তৈরি হয় না।'
                : 'Opening a replay never auto-marks it reviewed. Updating your review status is idempotent and never alters historical scores or XP.'}
            </p>
          </div>

          <div
            role="group"
            aria-label={lang === 'bn' ? 'রিভিউ স্ট্যাটাস নির্বাচন' : 'Select review status'}
            className="inline-flex rounded-xl border border-slate-800 bg-[#050A22] p-1"
          >
            {(
              [
                { id: 'unreviewed', en: 'Not Reviewed', bn: 'অপর্যালোচিত' },
                { id: 'in_review', en: 'In Progress', bn: 'চলমান' },
                { id: 'reviewed', en: 'Reviewed', bn: 'পর্যালোচিত' },
              ] as const
            ).map((opt) => {
              const active = session.reviewStatus === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateReview({ status: opt.id, learnerNote: noteDraft })}
                  aria-pressed={active}
                  data-testid={`review-status-btn-${opt.id}`}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? opt.id === 'reviewed'
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                        : opt.id === 'in_review'
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                          : 'bg-slate-700/60 text-white border border-slate-600'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {lang === 'bn' ? opt.bn : opt.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Review Progress Timestamps */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-slate-400 tabular-nums">
          <span>
            {lang === 'bn' ? 'সংশোধন পর্যালোচিত:' : 'Corrections reviewed:'}{' '}
            {session.reviewedComparisonIds.length}/{session.comparisons.length}
          </span>
          {session.startedReviewAt && (
            <>
              <span className="text-slate-600">·</span>
              <span>
                {lang === 'bn' ? 'শুরু:' : 'Started:'}{' '}
                {new Date(session.startedReviewAt).toLocaleString()}
              </span>
            </>
          )}
          {session.reviewedAt && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-300">
                {lang === 'bn' ? 'সম্পন্ন:' : 'Completed:'}{' '}
                {new Date(session.reviewedAt).toLocaleString()}
              </span>
            </>
          )}
        </div>

        {/* Reflection Note */}
        <div className="mt-4 space-y-2">
          <label htmlFor="replay-learner-note" className="block text-xs font-medium text-slate-300">
            {lang === 'bn'
              ? 'ব্যক্তিগত পর্যালোচনা নোট (ঐচ্ছিক, শুধুমাত্র এই ব্রাউজারে আপনার অ্যাকাউন্টে সংরক্ষিত)'
              : 'Personal reflection note (optional, saved separately in browser-local storage)'}
          </label>
          <textarea
            id="replay-learner-note"
            rows={2}
            maxLength={800}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={
              lang === 'bn'
                ? 'পরবর্তী প্র্যাকটিসে কোন বিষয়টি মনে রাখতে চান লিখুন...'
                : 'Write one takeaway to apply on your next retry...'
            }
            className="w-full rounded-xl border border-slate-800 bg-[#050A22] px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {noteDraft.length}/800
            </span>
            <button
              type="button"
              onClick={handleSaveNote}
              data-testid="save-replay-note-btn"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {noteSavedFeedback
                  ? lang === 'bn'
                    ? 'সংরক্ষিত হয়েছে'
                    : 'Saved'
                  : lang === 'bn'
                    ? 'নোট সংরক্ষণ করুন'
                    : 'Save Note'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Saved Historical Assessment + Separate On-Demand AI Summary */}
      <section
        aria-label={lang === 'bn' ? 'প্রমাণভিত্তিক যোগাযোগ বিশ্লেষণ' : 'Evidence-Based Communication Analysis'}
        className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
              {lang === 'bn'
                ? `ঐতিহাসিক মূল্যায়ন · ${analysis.methodologyVersion}`
                : `Saved Historical Assessment · ${analysis.methodologyVersion}`}
            </p>
            <h3 className="font-portal mt-0.5 flex items-center gap-2 text-base font-bold text-white">
              <Activity className="h-4 w-4 text-[#22D3EE]" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'প্রমাণভিত্তিক যোগাযোগ বিশ্লেষণ'
                  : 'Evidence-Based Communication Analysis'}
              </span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'পার্ট ০৮ / পার্ট ১১-এর সংরক্ষিত মূল্যায়ন প্রমাণ সরাসরি প্রদর্শিত (শুধুমাত্র পাঠযোগ্য)।'
                : 'Read-only historical snapshot reused directly from your saved Part 08 / Part 11 evaluation evidence.'}
            </p>
          </div>

          {analysis.overallScore !== null && (
            <div className="text-right">
              <p className="text-[11px] text-slate-400">
                {lang === 'bn' ? 'সংরক্ষিত স্কোর' : 'Historical Score'}
              </p>
              <p
                data-testid="replay-analysis-score"
                className={`font-mono text-2xl font-bold tabular-nums ${
                  analysis.passed ? 'text-[#16E58B]' : 'text-[#F59E0B]'
                }`}
              >
                {analysis.overallScore}%
              </p>
            </div>
          )}
        </div>

        {/* Missing Evaluation Honest State */}
        {!analysis.hasEvaluation ? (
          <div
            data-testid="replay-missing-evaluation-notice"
            className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/15 p-4 text-xs leading-relaxed text-amber-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-amber-100">
                {lang === 'bn' ? 'কোনো সংরক্ষিত মূল্যায়ন নেই' : 'Historical Evaluation Not Available'}
              </p>
              <p className="mt-1 text-amber-200/85">
                {lang === 'bn' ? analysis.summaryBn : analysis.summaryEn}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-800 bg-[#050A22] p-4 space-y-2.5">
              <p className="text-sm leading-relaxed text-slate-100">
                {lang === 'bn' && analysis.summaryBn ? analysis.summaryBn : analysis.summaryEn}
              </p>
              {analysis.taskVsLanguageEn && (
                <p className="border-t border-slate-800/80 pt-2.5 text-xs leading-relaxed text-cyan-200/90">
                  <span className="font-semibold text-cyan-300">
                    {lang === 'bn' ? 'কাজ বনাম ভাষা: ' : 'Task vs. Language: '}
                  </span>
                  {lang === 'bn' && analysis.taskVsLanguageBn
                    ? analysis.taskVsLanguageBn
                    : analysis.taskVsLanguageEn}
                </p>
              )}
            </div>

            {analysis.strengths.length > 0 && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'bn' ? 'সেশনের শক্তিশালী দিক' : 'Observed Strengths'}</span>
                </p>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-200">
                  {analysis.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.objectives.length > 0 && (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Target className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>
                    {lang === 'bn' ? 'সিনারিওর লক্ষ্যমাত্রার প্রমাণ' : 'Scenario Objective Evidence'}
                  </span>
                </p>
                <div className="space-y-2">
                  {analysis.objectives.map((obj) => (
                    <div
                      key={obj.objectiveId}
                      className="rounded-xl border border-slate-800 bg-[#050A22] p-3.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-100">
                          {lang === 'bn' ? obj.labelBn : obj.labelEn}
                        </span>
                        <span
                          className={`font-mono text-[11px] ${
                            obj.status === 'achieved'
                              ? 'text-emerald-300'
                              : obj.status === 'partially_achieved'
                                ? 'text-amber-300'
                                : 'text-slate-400'
                          }`}
                        >
                          {objectiveStatusLabel(obj.status, lang)}
                        </span>
                      </div>
                      {obj.evidenceQuote && (
                        <p className="mt-1.5 text-[11px] italic text-slate-400">
                          “{obj.evidenceQuote}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.dimensions.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-white">
                  {lang === 'bn' ? 'মাত্রাভিত্তিক প্রমাণ' : 'Evaluated Dimensions'}
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {analysis.dimensions.map((dim) => (
                    <div
                      key={dim.key}
                      className="rounded-xl border border-slate-800 bg-[#050A22] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-white">
                          {lang === 'bn' ? dim.labelBn : dim.labelEn}
                        </span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            dim.evaluated && dim.score !== null
                              ? dim.score >= 75
                                ? 'text-emerald-300'
                                : 'text-amber-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {dim.evaluated && dim.score !== null
                            ? `${dim.score}%`
                            : lang === 'bn'
                              ? 'মূল্যায়ন হয়নি'
                              : 'Not evaluated'}
                        </span>
                      </div>
                      {dim.explanationEn && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                          {lang === 'bn' && dim.explanationBn ? dim.explanationBn : dim.explanationEn}
                        </p>
                      )}
                      {dim.evidence && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {lang === 'bn' ? 'প্রমাণ: ' : 'Evidence: '}
                          {dim.evidence}
                        </p>
                      )}
                      {dim.limitationsEn && (
                        <p className="mt-1 text-[10px] text-slate-500">{dim.limitationsEn}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.pronunciationNotes.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-[#050A22] p-3.5 text-xs text-slate-300">
                <p className="font-semibold text-slate-200">
                  {lang === 'bn' ? 'স্পষ্টতা ও ছন্দ নোট' : 'Transcript Clarity Notes'}
                </p>
                <ul className="mt-1.5 space-y-1 text-slate-400">
                  {analysis.pronunciationNotes.map((note, idx) => (
                    <li key={idx}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Clearly Separated On-Demand AI Session Summary */}
        <div className="rounded-xl border border-violet-400/25 bg-[#060E2C] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-violet-300">
                {lang === 'bn'
                  ? 'নতুন তৈরি AI সারসংক্ষেপ (ঐতিহাসিক মূল্যায়ন থেকে পৃথক)'
                  : 'Newly Generated AI Summary (Separate from Historical Assessment)'}
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                {lang === 'bn'
                  ? 'সেশনের মূল প্যাটার্ন ও পরবর্তী প্র্যাকটিস ফোকাস জানতে অন-ডিমান্ড Gemini সারসংক্ষেপ তৈরি করুন।'
                  : 'Generate an optional on-demand Gemini takeaway summary strictly from this saved transcript.'}
              </p>
            </div>
            <button
              type="button"
              disabled={!session.hasTranscript || isLoadingSummary}
              onClick={() => void handleGenerateAiSummary()}
              data-testid="generate-replay-ai-summary-btn"
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/15 px-3.5 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/25 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isLoadingSummary ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>
                {lang === 'bn' ? 'AI সারসংক্ষেপ তৈরি করুন' : 'Generate AI Summary'}
              </span>
            </button>
          </div>

          {summaryError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200"
            >
              {summaryError}
            </div>
          )}

          {aiSummary && (
            <div
              data-testid="replay-ai-summary-output"
              className="space-y-2.5 border-t border-slate-800/80 pt-3 text-xs leading-relaxed text-slate-200"
            >
              <p>
                {lang === 'bn' && aiSummary.summaryBn
                  ? aiSummary.summaryBn
                  : aiSummary.summaryEn}
              </p>
              {aiSummary.evidenceBackedPatterns.length > 0 && (
                <div>
                  <p className="font-semibold text-cyan-300">
                    {lang === 'bn' ? 'পর্যবেক্ষিত প্যাটার্ন:' : 'Evidence-Backed Patterns:'}
                  </p>
                  <ul className="mt-1.5 space-y-2 text-slate-300">
                    {aiSummary.evidenceBackedPatterns.map((p, idx) => (
                      <li key={idx} className="rounded-lg border border-slate-800/80 bg-[#050A22] p-2.5">
                        <p className="font-medium text-slate-100">{p.patternEn}</p>
                        {p.supportingQuote && (
                          <p className="mt-0.5 text-[11px] italic text-slate-400">
                            “{p.supportingQuote}”
                          </p>
                        )}
                        {p.limitationEn && (
                          <p className="mt-0.5 text-[10px] text-slate-500">{p.limitationEn}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-emerald-200">
                <span className="font-semibold text-emerald-300">
                  {lang === 'bn' ? 'পরবর্তী ফোকাস: ' : 'Next Focus: '}
                </span>
                {lang === 'bn' && aiSummary.nextPracticeFocusBn
                  ? aiSummary.nextPracticeFocusBn
                  : aiSummary.nextPracticeFocusEn}
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                {aiSummary.model} · {aiSummary.promptVersion} ·{' '}
                {new Date(aiSummary.generatedAt).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Mandatory Non-Acoustic Pronunciation Honesty Notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-[#050A22]/80 p-3.5 text-[11px] leading-relaxed text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
          <p>{lang === 'bn' ? analysis.nonAcousticDisclosureBn : analysis.nonAcousticDisclosureEn}</p>
        </div>
      </section>

      {/* 3. Part 10 Communication DNA Evidence Trace */}
      <section
        aria-label={lang === 'bn' ? 'কমিউনিকেশন ডিএনএ প্রমাণ ট্রেস' : 'Communication DNA Evidence Trace'}
        data-testid="replay-dna-evidence-trace"
        className="rounded-2xl border border-cyan-400/15 bg-[#081031]/90 p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="font-portal flex items-center gap-2 text-base font-bold text-white">
              <Dna className="h-4 w-4 text-violet-400" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'Communication DNA প্রমাণ ট্রেস (পার্ট ১০ সংযোগ)'
                  : 'Communication DNA Evidence Trace (Part 10)'}
              </span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'bn'
                ? 'এই সেশনটি আপনার Communication DNA-এর কোন মাত্রায় প্রমাণ যুক্ত করেছে এবং কোনগুলো আপডেট করেনি তা দেখুন। রিপ্লে দেখলে কোনো ডুপ্লিকেট DNA প্রমাণ তৈরি হয় না।'
                : 'Inspect exactly which Communication DNA dimensions received evidence from this session and which remained untouched. Viewing a replay never duplicates DNA evidence.'}
            </p>
          </div>

          <Link
            to="/app/progress"
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors whitespace-nowrap"
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'Communication DNA খুলুন' : 'Open Communication DNA'}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {dnaEvidenceTrace.map((item) => (
            <div
              key={item.dnaDimensionId}
              data-testid={`dna-trace-${item.dnaDimensionId}`}
              className={`rounded-xl border p-3.5 text-xs ${
                item.contributed
                  ? 'border-emerald-500/25 bg-[#050A22]'
                  : 'border-slate-800/90 bg-[#050A22]/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  {lang === 'bn' ? item.labelBn : item.labelEn}
                </span>
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    item.contributed ? 'text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  {item.contributed
                    ? lang === 'bn'
                      ? 'প্রমাণ যুক্ত'
                      : 'Contributed'
                    : lang === 'bn'
                      ? 'আপডেট হয়নি'
                      : 'Not updated'}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                {lang === 'bn' ? item.reasonBn : item.reasonEn}
              </p>
              <p className="mt-1.5 font-mono text-[10px] text-slate-500">
                {item.sourceLabelEn} · {item.methodologyVersion}
                {item.assessedAt ? ` · ${new Date(item.assessedAt).toLocaleDateString()}` : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Practice & Retry Cross-System Actions */}
      <section
        aria-label={lang === 'bn' ? 'পুনরায় অনুশীলন ও পরবর্তী ধাপ' : 'Practice and Retry'}
        className="rounded-2xl border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(11,22,60,0.95)_0%,rgba(16,18,52,0.95)_100%)] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-portal text-base font-bold text-white">
              {lang === 'bn' ? 'পুনরায় অনুশীলন (Practice & Retry)' : 'Next Practice & Retry'}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {analysis.nextRecommendedActionEn
                ? lang === 'bn' && analysis.nextRecommendedActionBn
                  ? analysis.nextRecommendedActionBn
                  : analysis.nextRecommendedActionEn
                : lang === 'bn'
                  ? 'এই সেশনের সংশোধনগুলো মাথায় রেখে নতুন একটি চেষ্টা করুন, অথবা Mistake Memory-তে অনুশীলন করুন।'
                  : 'Apply what you reviewed by launching a fresh retry session or drilling flagged mistakes in Mistake Memory.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to={session.retryRoute}
              data-testid="replay-retry-cta"
              className="lv-portal-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{lang === 'bn' ? session.retryLabelBn : session.retryLabelEn}</span>
            </Link>

            <Link
              to="/app/improve"
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/15 px-3.5 py-2.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/25 transition-colors whitespace-nowrap"
            >
              <span>{lang === 'bn' ? 'ভুল সংশোধন করুন' : 'Drill Mistakes'}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Privacy, Consent, Export & Authorized Recording Deletion */}
      <section
        aria-label={lang === 'bn' ? 'গোপনীয়তা ও রেকর্ডিং নিয়ন্ত্রণ' : 'Privacy and Recording Controls'}
        data-testid="replay-privacy-controls"
        className="rounded-2xl border border-slate-800/90 bg-[#081031]/90 p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
          <div>
            <h3 className="font-portal flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>
                {lang === 'bn'
                  ? 'গোপনীয়তা, ডেটা এক্সপোর্ট ও রেকর্ডিং নিয়ন্ত্রণ'
                  : 'Privacy, Export & Recording Controls'}
              </span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {lang === 'bn'
                ? 'সংরক্ষণ সীমা: আপনার সেশন, নোট ও অনুমোদিত অডিও রেকর্ডিং বর্তমানে এই ব্রাউজারের localStorage ও IndexedDB-তে সংরক্ষিত। Cloudflare D1/R2 ক্লাউড সিঙ্ক সক্রিয় নয়।'
                : 'Storage scope: sessions, review notes, separate practice attempts, and authorized audio blobs are currently stored in browser-local storage (localStorage & IndexedDB). Cross-device Cloudflare D1/R2 cloud sync is not deployed in this runtime.'}
            </p>
          </div>
          <Link
            to="/app/settings"
            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 whitespace-nowrap"
          >
            {lang === 'bn' ? 'অ্যাকাউন্ট গোপনীয়তা সেটিংস →' : 'Account Privacy Settings →'}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-slate-400">
          <span>
            {lang === 'bn' ? 'মাইক রেকর্ডিং সম্মতি:' : 'Mic recording consent:'}{' '}
            <strong className="text-slate-200">
              {privacyConsent?.storeMicRecordings === false
                ? lang === 'bn'
                  ? 'বন্ধ'
                  : 'Disabled'
                : lang === 'bn'
                  ? 'চালু (লোকাল)'
                  : 'Enabled (Local)'}
            </strong>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            {lang === 'bn' ? 'অনুমোদিত অডিও ফাইল:' : 'Authorized local audio refs:'}{' '}
            <strong className="text-slate-200">{session.authorizedAudioKeys.length}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportSessionJson}
            data-testid="replay-export-json-btn"
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{lang === 'bn' ? 'সেশন JSON এক্সপোর্ট করুন' : 'Export Session JSON'}</span>
          </button>

          {session.authorizedAudioKeys.length > 0 && !confirmDeleteAudio && (
            <button
              type="button"
              onClick={() => setConfirmDeleteAudio(true)}
              data-testid="replay-delete-audio-trigger"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-950/20 px-3.5 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/35 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {lang === 'bn' ? 'লোকাল অডিও রেকর্ডিং মুছুন' : 'Delete Local Recording'}
              </span>
            </button>
          )}

          {confirmDeleteAudio && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs">
              <span className="text-rose-200">
                {lang === 'bn'
                  ? 'স্থায়ীভাবে লোকাল অডিও মুছবেন? (ট্রান্সক্রিপ্ট থাকবে)'
                  : 'Permanently delete local audio blobs? (Transcript stays intact)'}
              </span>
              <button
                type="button"
                disabled={isDeletingAudio}
                onClick={() => void handleDeleteLocalRecordings()}
                data-testid="replay-delete-audio-confirm"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAudio && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                <span>{lang === 'bn' ? 'হ্যাঁ, মুছুন' : 'Confirm Delete'}</span>
              </button>
              <button
                type="button"
                disabled={isDeletingAudio}
                onClick={() => setConfirmDeleteAudio(false)}
                className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
            </div>
          )}
        </div>

        {exportNotice && (
          <p data-testid="replay-export-notice" className="text-xs text-emerald-300">
            {exportNotice}
          </p>
        )}

        {deleteAudioMessage && (
          <p data-testid="replay-delete-audio-notice" className="text-xs text-amber-200">
            {deleteAudioMessage}
          </p>
        )}
      </section>
    </div>
  );
}
