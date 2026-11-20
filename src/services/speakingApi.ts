import type { SpeakingEvaluationRequest } from '../domain/speakingEvaluation';
import { generateCorrelationId } from '../domain/adminGovernanceEngine';
import { recordAiTelemetryEvent } from './governanceStore';
import type { SpeakingTurnEvaluation } from '../types/domain';

export interface SpeakingHealthResponse {
  ok: boolean;
  configured: boolean;
  model: string;
}

export interface ApiTelemetryPayload {
  correlationId: string;
  promptVersion: string;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}

export interface SpeakingEvaluateResponse {
  evaluation: SpeakingTurnEvaluation;
  model: string;
  telemetry?: ApiTelemetryPayload;
}

export interface TelemetryOptions {
  logTelemetry?: boolean;
  userId?: string;
}

export class SpeakingClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'SpeakingClientError';
    this.status = status;
    this.code = code;
  }
}

export async function fetchSpeakingHealth(): Promise<SpeakingHealthResponse> {
  const res = await fetch('/api/speaking/health', { method: 'GET' });
  if (!res.ok) {
    return { ok: false, configured: false, model: 'gemini-4-hydrogen' };
  }
  return (await res.json()) as SpeakingHealthResponse;
}

export async function requestSpeakingEvaluation(
  payload: SpeakingEvaluationRequest,
  options?: TelemetryOptions
): Promise<SpeakingEvaluateResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 50000);
  const clientStart = Date.now();
  const shouldLog = options?.logTelemetry !== false;

  try {
    const res = await fetch('/api/speaking/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      evaluation?: SpeakingTurnEvaluation;
      model?: string;
      telemetry?: ApiTelemetryPayload;
      error?: string;
      code?: string;
    };

    if (!res.ok || !data.evaluation) {
      const errCode = data.code ?? 'API_ERROR';
      const errMsg = data.error ?? `Evaluation request failed (${res.status}).`;
      if (shouldLog) {
        recordAiTelemetryEvent({
          id: generateCorrelationId('tel'),
          correlationId: generateCorrelationId('ai'),
          endpoint: 'speaking_evaluate',
          model: data.model ?? 'gemini-4-hydrogen',
          promptVersion: 'speaking-eval-v3.2',
          status: 'error',
          latencyMs: Math.max(1, Date.now() - clientStart),
          estimatedInputTokens: Math.max(1, Math.ceil(payload.userTranscript.length / 4)),
          estimatedOutputTokens: 0,
          estimatedCostUsd: 0,
          errorCode: errCode,
          errorMessage: errMsg,
          userId: options?.userId,
          timestamp: new Date().toISOString(),
        });
      }
      throw new SpeakingClientError(errMsg, res.status, errCode);
    }

    const model = data.model ?? 'gemini-4-hydrogen';
    const latencyMs = data.telemetry?.latencyMs ?? Math.max(1, Date.now() - clientStart);
    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: data.telemetry?.correlationId ?? generateCorrelationId('ai'),
        endpoint: 'speaking_evaluate',
        model,
        promptVersion: data.telemetry?.promptVersion ?? 'speaking-eval-v3.2',
        status: 'success',
        latencyMs,
        estimatedInputTokens:
          data.telemetry?.estimatedInputTokens ??
          Math.max(1, Math.ceil(payload.userTranscript.length / 4)),
        estimatedOutputTokens: data.telemetry?.estimatedOutputTokens ?? 120,
        estimatedCostUsd: data.telemetry?.estimatedCostUsd ?? 0,
        userId: options?.userId,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      evaluation: data.evaluation,
      model,
      telemetry: data.telemetry,
    };
  } catch (err) {
    if (err instanceof SpeakingClientError) {
      throw err;
    }
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    const errCode = isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR';
    const errMsg = isTimeout
      ? 'The AI evaluation timed out. Your audio recording and transcript are safely preserved — click Retry Evaluation.'
      : err instanceof Error
        ? err.message
        : 'Network error while reaching the AI Speaking server.';

    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: generateCorrelationId('ai'),
        endpoint: 'speaking_evaluate',
        model: 'gemini-4-hydrogen',
        promptVersion: 'speaking-eval-v3.2',
        status: 'error',
        latencyMs: Math.max(1, Date.now() - clientStart),
        estimatedInputTokens: Math.max(1, Math.ceil(payload.userTranscript.length / 4)),
        estimatedOutputTokens: 0,
        estimatedCostUsd: 0,
        errorCode: errCode,
        errorMessage: errMsg,
        userId: options?.userId,
        timestamp: new Date().toISOString(),
      });
    }
    throw new SpeakingClientError(errMsg, isTimeout ? 504 : 0, errCode);
  } finally {
    window.clearTimeout(timeout);
  }
}
