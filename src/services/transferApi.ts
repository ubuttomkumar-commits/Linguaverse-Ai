import type { TransferEvaluationRequest } from '../domain/transferLabEngine';
import { generateCorrelationId } from '../domain/adminGovernanceEngine';
import { getApiCredentialsMode, resolveApiUrl } from './apiBase';
import { buildCsrfHeaders } from './authApi';
import { recordAiTelemetryEvent } from './governanceStore';
import type {
  AiTelemetryEvent,
  ExplanationLanguage,
  PressureLadderLevelId,
  SelfEstimatedLevel,
  TransferConversationTurn,
  TransferObjectiveProgress,
  TransferRubricEvaluation,
  TransferSessionEvaluationReport,
} from '../types/domain';
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

export interface TransferHealthResponse {
  ok: boolean;
  aiConfigured: boolean;
  transcriptionConfigured: boolean;
  ttsConfigured: boolean;
  model: string;
}

export interface TransferTurnClientRequest {
  scenarioId: string;
  pressureLevel: PressureLadderLevelId;
  learnerLevel: SelfEstimatedLevel;
  explanationLanguage: ExplanationLanguage;
  learnerMessage: string;
  transcript: TransferConversationTurn[];
  currentObjectives: TransferObjectiveProgress[];
  adaptationCues?: string[];
  linkedMistakePattern?: string;
}

export interface TransferTurnClientResponse {
  aiReply: string;
  aiReplyBnHint: string;
  phaseLabel: string;
  coachNudgeEn: string;
  coachNudgeBn: string;
  conversationShouldWrap: boolean;
  updatedObjectives: TransferObjectiveProgress[];
  model: string;
  telemetry?: ApiTelemetryPayload;
}

export interface TransferSessionEvaluateClientRequest {
  sessionId: string;
  scenarioId: string;
  pressureLevel: PressureLadderLevelId;
  learnerLevel: SelfEstimatedLevel;
  explanationLanguage: ExplanationLanguage;
  transcript: TransferConversationTurn[];
  currentObjectives: TransferObjectiveProgress[];
  linkedMistakePattern?: string;
}

export interface TransferSessionEvaluateClientResponse {
  report: TransferSessionEvaluationReport;
  rubricEvaluation: TransferRubricEvaluation;
  model: string;
  telemetry?: ApiTelemetryPayload;
}

export interface TransferTranscribeClientResponse {
  transcript: string;
  model: string;
  telemetry?: ApiTelemetryPayload;
}

export interface TransferTtsClientResponse {
  audioBase64: string;
  mimeType: 'audio/wav';
  model: string;
  telemetry?: ApiTelemetryPayload;
}

export async function fetchTransferHealth(): Promise<TransferHealthResponse> {
  try {
    const res = await fetch(resolveApiUrl('/api/transfer/health'), {
      credentials: getApiCredentialsMode(),
    });
    if (!res.ok) {
      return {
        ok: false,
        aiConfigured: false,
        transcriptionConfigured: false,
        ttsConfigured: false,
        model: 'unavailable',
      };
    }
    return (await res.json()) as TransferHealthResponse;
  } catch {
    return {
      ok: false,
      aiConfigured: false,
      transcriptionConfigured: false,
      ttsConfigured: false,
      model: 'unavailable',
    };
  }
}

async function postTransferJson<TResponse extends { model?: string; telemetry?: ApiTelemetryPayload }>(
  url: string,
  payload: unknown,
  endpointName: AiTelemetryEvent['endpoint'],
  defaultModel: string,
  defaultPromptVersion: string,
  estimatedInputLength: number,
  options?: TelemetryOptions
): Promise<TResponse> {
  const clientStart = Date.now();
  const shouldLog = options?.logTelemetry !== false;

  let res: Response;
  try {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
    res = await fetch(resolveApiUrl(url), {
      method: 'POST',
      credentials: getApiCredentialsMode(),
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    const errMsg =
      'Network error contacting the Transfer Lab AI server. Your work is safely preserved — please retry.';
    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: generateCorrelationId('ai'),
        endpoint: endpointName,
        model: defaultModel,
        promptVersion: defaultPromptVersion,
        status: 'error',
        latencyMs: Math.max(1, Date.now() - clientStart),
        estimatedInputTokens: Math.max(1, Math.ceil(estimatedInputLength / 4)),
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
    const errMsg = 'Received an invalid response from the Transfer Lab server. Please retry.';
    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: generateCorrelationId('ai'),
        endpoint: endpointName,
        model: defaultModel,
        promptVersion: defaultPromptVersion,
        status: 'error',
        latencyMs: Math.max(1, Date.now() - clientStart),
        estimatedInputTokens: Math.max(1, Math.ceil(estimatedInputLength / 4)),
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
        : 'Transfer Lab AI request failed. Please retry.';
    const code = typeof errObj.code === 'string' ? errObj.code : 'REQUEST_FAILED';
    if (shouldLog) {
      recordAiTelemetryEvent({
        id: generateCorrelationId('tel'),
        correlationId: generateCorrelationId('ai'),
        endpoint: endpointName,
        model: defaultModel,
        promptVersion: defaultPromptVersion,
        status: 'error',
        latencyMs: Math.max(1, Date.now() - clientStart),
        estimatedInputTokens: Math.max(1, Math.ceil(estimatedInputLength / 4)),
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

  const typed = data as TResponse;
  if (shouldLog) {
    recordAiTelemetryEvent({
      id: generateCorrelationId('tel'),
      correlationId: typed.telemetry?.correlationId ?? generateCorrelationId('ai'),
      endpoint: endpointName,
      model: typed.model ?? defaultModel,
      promptVersion: typed.telemetry?.promptVersion ?? defaultPromptVersion,
      status: 'success',
      latencyMs: typed.telemetry?.latencyMs ?? Math.max(1, Date.now() - clientStart),
      estimatedInputTokens:
        typed.telemetry?.estimatedInputTokens ?? Math.max(1, Math.ceil(estimatedInputLength / 4)),
      estimatedOutputTokens: typed.telemetry?.estimatedOutputTokens ?? 180,
      estimatedCostUsd: typed.telemetry?.estimatedCostUsd ?? 0,
      userId: options?.userId,
      timestamp: new Date().toISOString(),
    });
  }

  return typed;
}

export async function requestTransferEvaluation(
  payload: TransferEvaluationRequest,
  options?: TelemetryOptions
): Promise<TransferEvaluationResponse> {
  return postTransferJson<TransferEvaluationResponse>(
    '/api/transfer/evaluate',
    payload,
    'transfer_evaluate',
    'gemini-4-hydrogen',
    'transfer-rubric-v5.1',
    payload.userResponse.length,
    options
  );
}

export async function requestTransferTurn(
  payload: TransferTurnClientRequest,
  options?: TelemetryOptions
): Promise<TransferTurnClientResponse> {
  return postTransferJson<TransferTurnClientResponse>(
    '/api/transfer/turn',
    payload,
    'transfer_turn',
    'gemini-4-hydrogen',
    'transfer-lab-turn-v11.0',
    payload.learnerMessage.length + payload.transcript.length * 80,
    options
  );
}

export async function requestTransferSessionEvaluation(
  payload: TransferSessionEvaluateClientRequest,
  options?: TelemetryOptions
): Promise<TransferSessionEvaluateClientResponse> {
  return postTransferJson<TransferSessionEvaluateClientResponse>(
    '/api/transfer/session-evaluate',
    payload,
    'transfer_session_evaluate',
    'gemini-4-hydrogen',
    'transfer-lab-eval-v11.0',
    payload.transcript.reduce((sum, t) => sum + t.text.length, 0),
    options
  );
}

export async function requestTransferAudioTranscription(
  payload: { audioBase64: string; mimeType: string },
  options?: TelemetryOptions
): Promise<TransferTranscribeClientResponse> {
  return postTransferJson<TransferTranscribeClientResponse>(
    '/api/transfer/transcribe',
    payload,
    'transfer_transcribe',
    'gemini-3.5-transcribe',
    'transfer-transcribe-v11.0',
    600,
    options
  );
}

export async function requestTransferSpeechSynthesis(
  payload: { text: string; voiceName?: string; style?: string },
  options?: TelemetryOptions
): Promise<TransferTtsClientResponse> {
  return postTransferJson<TransferTtsClientResponse>(
    '/api/transfer/tts',
    payload,
    'transfer_tts',
    'gemini-3.8-flash-lite-tts',
    'transfer-tts-v11.0',
    payload.text.length,
    options
  );
}
