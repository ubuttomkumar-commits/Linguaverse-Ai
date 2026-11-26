import type {
  ExplanationLanguage,
  ReplayCorrectionDeepDive,
  ReplayPracticeAttemptRecord,
  ReplaySessionAiSummary,
} from '../types/domain';
import { getApiCredentialsMode, resolveApiUrl } from './apiBase';
import { buildCsrfHeaders } from './authApi';
import { recordAiTelemetryEvent } from './governanceStore';

export interface ReplayAiHealthStatus {
  ok: boolean;
  aiConfigured: boolean;
  model: string;
  fallbackModel: string;
  promptVersion: string;
  cloudSyncActive: boolean;
}

export class ReplayApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ReplayApiError';
    this.status = status;
    this.code = code;
  }
}

function logReplayTelemetry(params: {
  endpoint: 'dna_analyze' | 'speaking_evaluate' | 'transfer_evaluate';
  model: string;
  promptVersion: string;
  latencyMs: number;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  estimatedCostUsd?: number;
  status: 'success' | 'error';
  userId?: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  recordAiTelemetryEvent({
    id: `tel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    correlationId: `rep_${Date.now().toString(36)}`,
    userId: params.userId,
    endpoint: params.endpoint,
    model: params.model,
    promptVersion: params.promptVersion,
    latencyMs: params.latencyMs,
    estimatedInputTokens: params.estimatedInputTokens ?? 0,
    estimatedOutputTokens: params.estimatedOutputTokens ?? 0,
    estimatedCostUsd: params.estimatedCostUsd ?? 0,
    status: params.status,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    timestamp: new Date().toISOString(),
  });
}

export async function fetchReplayHealth(): Promise<ReplayAiHealthStatus | null> {
  try {
    const res = await fetch(resolveApiUrl('/api/v1/replay/health'), {
      credentials: getApiCredentialsMode(),
    });
    if (!res.ok) return null;
    return (await res.json()) as ReplayAiHealthStatus;
  } catch {
    return null;
  }
}

export async function requestReplayCorrectionDeepDive(params: {
  sessionId: string;
  scenarioTitle: string;
  originalResponse: string;
  correctedResponse: string;
  category?: string;
  explanationLanguage: ExplanationLanguage;
  userId?: string;
}): Promise<ReplayCorrectionDeepDive> {
  const startedAt = Date.now();
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(resolveApiUrl('/api/v1/replay/ai-assist'), {
    method: 'POST',
    credentials: getApiCredentialsMode(),
    headers,
    body: JSON.stringify({
      mode: 'correction_deep_dive',
      sessionId: params.sessionId,
      scenarioTitle: params.scenarioTitle,
      originalResponse: params.originalResponse,
      correctedResponse: params.correctedResponse,
      category: params.category,
      explanationLanguage: params.explanationLanguage,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    deepDive?: ReplayCorrectionDeepDive;
    telemetry?: {
      model: string;
      promptVersion: string;
      latencyMs: number;
      estimatedInputTokens: number;
      estimatedOutputTokens: number;
      estimatedCostUsd: number;
    };
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.deepDive) {
    const errMsg = data.error || 'Unable to generate AI correction deep-dive right now.';
    logReplayTelemetry({
      endpoint: 'dna_analyze',
      model: 'gemini-4-hydrogen',
      promptVersion: 'replay-coach-v1.0',
      latencyMs: Date.now() - startedAt,
      status: 'error',
      userId: params.userId,
      errorCode: data.code || `HTTP_${res.status}`,
      errorMessage: errMsg,
    });
    throw new ReplayApiError(errMsg, res.status, data.code || 'REPLAY_AI_FAILED');
  }

  if (data.telemetry) {
    logReplayTelemetry({
      endpoint: 'dna_analyze',
      model: data.telemetry.model,
      promptVersion: data.telemetry.promptVersion,
      latencyMs: data.telemetry.latencyMs,
      estimatedInputTokens: data.telemetry.estimatedInputTokens,
      estimatedOutputTokens: data.telemetry.estimatedOutputTokens,
      estimatedCostUsd: data.telemetry.estimatedCostUsd,
      status: 'success',
      userId: params.userId,
    });
  }

  return data.deepDive;
}

export async function requestReplaySessionSummary(params: {
  sessionId: string;
  scenarioTitle: string;
  transcript: Array<{ speaker: 'ai' | 'learner'; text: string }>;
  explanationLanguage: ExplanationLanguage;
  userId?: string;
}): Promise<ReplaySessionAiSummary> {
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(resolveApiUrl('/api/v1/replay/ai-assist'), {
    method: 'POST',
    credentials: getApiCredentialsMode(),
    headers,
    body: JSON.stringify({
      mode: 'summarize_session',
      sessionId: params.sessionId,
      scenarioTitle: params.scenarioTitle,
      transcript: params.transcript.slice(0, 24),
      explanationLanguage: params.explanationLanguage,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    summary?: ReplaySessionAiSummary;
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.summary) {
    throw new ReplayApiError(
      data.error || 'Unable to generate evidence-backed replay summary right now.',
      res.status,
      data.code || 'REPLAY_SUMMARY_FAILED'
    );
  }

  return data.summary;
}

export async function evaluateReplayPracticeAttempt(params: {
  sessionId: string;
  turnId: string;
  scenarioTitle: string;
  originalResponse: string;
  correctedReference?: string;
  learnerRetryText: string;
  explanationLanguage: ExplanationLanguage;
}): Promise<NonNullable<ReplayPracticeAttemptRecord['aiFeedback']>> {
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(resolveApiUrl('/api/v1/replay/practice-attempts'), {
    method: 'POST',
    credentials: getApiCredentialsMode(),
    headers,
    body: JSON.stringify(params),
  });

  const data = (await res.json().catch(() => ({}))) as {
    feedback?: NonNullable<ReplayPracticeAttemptRecord['aiFeedback']>;
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.feedback) {
    throw new ReplayApiError(
      data.error || 'Unable to evaluate your replay practice attempt right now.',
      res.status,
      data.code || 'PRACTICE_EVAL_FAILED'
    );
  }

  return data.feedback;
}

export async function notifyServerRecordingDeletion(params: {
  sessionId: string;
  deletedLocalKeyCount: number;
}): Promise<{ ok: boolean; auditedOnServer: boolean }> {
  try {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
    const res = await fetch(
      resolveApiUrl(`/api/v1/replay/sessions/${encodeURIComponent(params.sessionId)}/recording`),
      {
        method: 'DELETE',
        credentials: getApiCredentialsMode(),
        headers,
        body: JSON.stringify({ deletedLocalKeyCount: params.deletedLocalKeyCount }),
      }
    );
    return { ok: res.ok, auditedOnServer: res.ok };
  } catch {
    return { ok: false, auditedOnServer: false };
  }
}
