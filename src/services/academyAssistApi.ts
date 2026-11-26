import { generateCorrelationId } from '../domain/adminGovernanceEngine';
import { getApiCredentialsMode, resolveApiUrl } from './apiBase';
import { buildCsrfHeaders } from './authApi';
import { recordAiTelemetryEvent } from './governanceStore';
import type { ApiTelemetryPayload, TelemetryOptions } from './speakingApi';
import type { ExplanationLanguage, LessonStageKey } from '../types/domain';

export interface AcademyAssistClientRequest {
  lessonId: string;
  lessonTitleEn: string;
  lessonTitleBn: string;
  cefrBand: string;
  conceptRuleEn: string;
  banglaInterferenceEn: string;
  activeStage: LessonStageKey;
  explanationLanguage: ExplanationLanguage;
  question: string;
}

export interface AcademyAssistPayload {
  answerEn: string;
  answerBn: string;
  examples: Array<{
    english: string;
    bangla: string;
  }>;
  keyTakeawayEn: string;
  keyTakeawayBn: string;
}

export interface AcademyAssistHealth {
  ok: boolean;
  configured: boolean;
  model: string;
}

export class AcademyAssistClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'AcademyAssistClientError';
    this.status = status;
    this.code = code;
  }
}

export async function fetchAcademyAssistHealth(): Promise<AcademyAssistHealth> {
  try {
    const res = await fetch(resolveApiUrl('/api/academy/assist/health'), {
      method: 'GET',
      credentials: getApiCredentialsMode(),
    });
    if (!res.ok) {
      return { ok: false, configured: false, model: 'gemini-4-hydrogen' };
    }
    return (await res.json()) as AcademyAssistHealth;
  } catch {
    return { ok: false, configured: false, model: 'gemini-4-hydrogen' };
  }
}

export async function requestAcademyAssist(
  payload: AcademyAssistClientRequest,
  options?: TelemetryOptions
): Promise<{
  assist: AcademyAssistPayload;
  model: string;
  telemetry?: ApiTelemetryPayload;
}> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  const start = Date.now();
  const shouldLog = options?.logTelemetry !== false;

  try {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
    const res = await fetch(resolveApiUrl('/api/academy/assist'), {
      method: 'POST',
      credentials: getApiCredentialsMode(),
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      assist?: AcademyAssistPayload;
      model?: string;
      telemetry?: ApiTelemetryPayload;
      error?: string;
      code?: string;
    };

    if (!res.ok || !data.assist) {
      const code = data.code ?? 'API_ERROR';
      const msg = data.error ?? `AI Tutor request failed (${res.status}).`;
      if (shouldLog) {
        recordAiTelemetryEvent({
          id: generateCorrelationId('tel'),
          correlationId: generateCorrelationId('ai'),
          endpoint: 'academy_assist',
          model: data.model ?? 'gemini-4-hydrogen',
          promptVersion: 'academy-assist-v1.0',
          status: 'error',
          latencyMs: Math.max(1, Date.now() - start),
          estimatedInputTokens: Math.max(1, Math.ceil(payload.question.length / 4)),
          estimatedOutputTokens: 0,
          estimatedCostUsd: 0,
          errorCode: code,
          errorMessage: msg,
          userId: options?.userId,
          timestamp: new Date().toISOString(),
        });
      }
      throw new AcademyAssistClientError(msg, res.status, code);
    }

    const model = data.model ?? 'gemini-4-hydrogen';
    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: data.telemetry?.correlationId ?? generateCorrelationId('ai'),
        endpoint: 'academy_assist',
        model,
        promptVersion: data.telemetry?.promptVersion ?? 'academy-assist-v1.0',
        status: 'success',
        latencyMs: data.telemetry?.latencyMs ?? Math.max(1, Date.now() - start),
        estimatedInputTokens:
          data.telemetry?.estimatedInputTokens ?? Math.max(1, Math.ceil(payload.question.length / 4)),
        estimatedOutputTokens: data.telemetry?.estimatedOutputTokens ?? 120,
        estimatedCostUsd: data.telemetry?.estimatedCostUsd ?? 0,
        userId: options?.userId,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      assist: data.assist,
      model,
      telemetry: data.telemetry,
    };
  } catch (err) {
    if (err instanceof AcademyAssistClientError) throw err;
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    const message = isTimeout
      ? 'AI Tutor timed out. Please retry your question.'
      : err instanceof Error
        ? err.message
        : 'Network error while reaching the AI Tutor service.';
    throw new AcademyAssistClientError(message, isTimeout ? 504 : 0, isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timeout);
  }
}
