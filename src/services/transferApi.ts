import type { TransferEvaluationRequest } from '../domain/transferLabEngine';
import { generateCorrelationId } from '../domain/adminGovernanceEngine';
import { recordAiTelemetryEvent } from './governanceStore';
import type { TransferRubricEvaluation } from '../types/domain';
import {
  SpeakingClientError,
  type ApiTelemetryPayload,
  type TelemetryOptions,
} from './speakingApi';

export interface TransferEvaluationResponse {
  evaluation: TransferRubricEvaluation;
  model: string;
  telemetry?: ApiTelemetryPayload;
}

export async function requestTransferEvaluation(
  payload: TransferEvaluationRequest,
  options?: TelemetryOptions
): Promise<TransferEvaluationResponse> {
  const clientStart = Date.now();
  const shouldLog = options?.logTelemetry !== false;

  let res: Response;
  try {
    res = await fetch('/api/transfer/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    const errMsg =
      'Network error contacting the Transfer Lab AI grading server. Your response is safely preserved — please retry.';
    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: generateCorrelationId('ai'),
        endpoint: 'transfer_evaluate',
        model: 'gemini-4-hydrogen',
        promptVersion: 'transfer-rubric-v5.1',
        status: 'error',
        latencyMs: Math.max(1, Date.now() - clientStart),
        estimatedInputTokens: Math.max(1, Math.ceil(payload.userResponse.length / 4)),
        estimatedOutputTokens: 0,
        estimatedCostUsd: 0,
        errorCode: 'NETWORK_ERROR',
        errorMessage: errMsg,
        userId: options?.userId,
        timestamp: new Date().toISOString(),
      });
    }
    throw new SpeakingClientError(errMsg, 0, 'NETWORK_ERROR');
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    const errMsg =
      'Received an invalid response from the Transfer Lab grading server. Please retry.';
    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: generateCorrelationId('ai'),
        endpoint: 'transfer_evaluate',
        model: 'gemini-4-hydrogen',
        promptVersion: 'transfer-rubric-v5.1',
        status: 'error',
        latencyMs: Math.max(1, Date.now() - clientStart),
        estimatedInputTokens: Math.max(1, Math.ceil(payload.userResponse.length / 4)),
        estimatedOutputTokens: 0,
        estimatedCostUsd: 0,
        errorCode: 'INVALID_JSON',
        errorMessage: errMsg,
        userId: options?.userId,
        timestamp: new Date().toISOString(),
      });
    }
    throw new SpeakingClientError(errMsg, res.status, 'INVALID_JSON');
  }

  if (!res.ok) {
    const errObj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const message =
      typeof errObj.error === 'string' && errObj.error.trim()
        ? errObj.error
        : 'Transfer Lab AI grading failed. Please retry.';
    const code = typeof errObj.code === 'string' ? errObj.code : 'EVALUATION_FAILED';
    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: generateCorrelationId('ai'),
        endpoint: 'transfer_evaluate',
        model: 'gemini-4-hydrogen',
        promptVersion: 'transfer-rubric-v5.1',
        status: 'error',
        latencyMs: Math.max(1, Date.now() - clientStart),
        estimatedInputTokens: Math.max(1, Math.ceil(payload.userResponse.length / 4)),
        estimatedOutputTokens: 0,
        estimatedCostUsd: 0,
        errorCode: code,
        errorMessage: message,
        userId: options?.userId,
        timestamp: new Date().toISOString(),
      });
    }
    throw new SpeakingClientError(message, res.status, code);
  }

  const typed = data as TransferEvaluationResponse;
  if (shouldLog) {
    recordAiTelemetryEvent({
      id: generateCorrelationId('tel'),
      correlationId: typed.telemetry?.correlationId ?? generateCorrelationId('ai'),
      endpoint: 'transfer_evaluate',
      model: typed.model ?? 'gemini-4-hydrogen',
      promptVersion: typed.telemetry?.promptVersion ?? 'transfer-rubric-v5.1',
      status: 'success',
      latencyMs: typed.telemetry?.latencyMs ?? Math.max(1, Date.now() - clientStart),
      estimatedInputTokens:
        typed.telemetry?.estimatedInputTokens ??
        Math.max(1, Math.ceil(payload.userResponse.length / 4)),
      estimatedOutputTokens: typed.telemetry?.estimatedOutputTokens ?? 180,
      estimatedCostUsd: typed.telemetry?.estimatedCostUsd ?? 0,
      userId: options?.userId,
      timestamp: new Date().toISOString(),
    });
  }

  return typed;
}
