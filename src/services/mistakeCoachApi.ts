import type { ExplanationLanguage } from '../types/domain';
import { getApiCredentialsMode, resolveApiUrl } from './apiBase';
import { buildCsrfHeaders } from './authApi';
import { recordAiTelemetryEvent } from './governanceStore';

export interface MistakeSummaryPayload {
  id: string;
  category: string;
  patternEn: string;
  patternBn?: string;
  userExample: string;
  correctedExample: string;
  occurrences: number;
  status: string;
}

export interface MistakeCoachChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface MistakeCoachApiResponse {
  coach: {
    replyEn: string;
    replyBn: string;
    focusedRuleEn: string;
    focusedRuleBn: string;
    examplePairs: Array<{
      wrong: string;
      right: string;
      whyBn: string;
    }>;
    suggestedFollowUps: string[];
  };
  model: string;
  telemetry?: {
    promptVersion: string;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
    latencyMs: number;
    estimatedCostUsd: number;
  };
}

export interface PersonalizedExerciseApiResponse {
  exercise: {
    titleEn: string;
    titleBn: string;
    contextSituationEn: string;
    contextSituationBn: string;
    mcqPromptEn: string;
    mcqPromptBn: string;
    mcqOptions: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
    rewriteFlawedSentence: string;
    rewritePromptEn: string;
    rewritePromptBn: string;
    rewriteExpectedAnswer: string;
    rewriteAcceptableAnswers: string[];
    banglaHint: string;
    explanationEn: string;
    explanationBn: string;
  };
  model: string;
  telemetry?: {
    promptVersion: string;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
    latencyMs: number;
    estimatedCostUsd: number;
  };
}

export interface MistakeCoachHealthStatus {
  configured: boolean;
  model: string;
  fallbackModel: string;
  promptVersion: string;
}

export class MistakeCoachClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'MistakeCoachClientError';
    this.status = status;
    this.code = code;
  }
}

function logCoachTelemetry(params: {
  userId?: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  status: 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
}) {
  const id = `tel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  recordAiTelemetryEvent({
    id,
    correlationId: id,
    userId: params.userId,
    endpoint: 'mistake_coach',
    model: params.model,
    promptVersion: params.promptVersion,
    latencyMs: params.latencyMs,
    estimatedInputTokens: params.estimatedInputTokens,
    estimatedOutputTokens: params.estimatedOutputTokens,
    estimatedCostUsd: params.estimatedCostUsd,
    status: params.status,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    timestamp: new Date().toISOString(),
  });
}

export async function fetchMistakeCoachHealth(): Promise<MistakeCoachHealthStatus | null> {
  try {
    const res = await fetch(resolveApiUrl('/api/mistakes/coach/health'), {
      credentials: getApiCredentialsMode(),
    });
    if (!res.ok) return null;
    return (await res.json()) as MistakeCoachHealthStatus;
  } catch {
    return null;
  }
}

export async function requestMistakeCoachReply(params: {
  message: string;
  explanationLanguage: ExplanationLanguage;
  learnerLevel?: string;
  focusedMistake?: MistakeSummaryPayload | null;
  topMistakes: MistakeSummaryPayload[];
  history?: MistakeCoachChatTurn[];
  userId?: string;
  allowTelemetry?: boolean;
}): Promise<MistakeCoachApiResponse> {
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(resolveApiUrl('/api/mistakes/coach'), {
    method: 'POST',
    credentials: getApiCredentialsMode(),
    headers,
    body: JSON.stringify({
      message: params.message,
      explanationLanguage: params.explanationLanguage,
      learnerLevel: params.learnerLevel,
      focusedMistake: params.focusedMistake ?? null,
      topMistakes: params.topMistakes.slice(0, 6),
      history: (params.history ?? []).slice(-6),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<MistakeCoachApiResponse> & {
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.coach) {
    throw new MistakeCoachClientError(
      data.error || 'Unable to reach the AI Learning Coach right now.',
      res.status,
      data.code || 'COACH_ERROR'
    );
  }

  if (params.allowTelemetry !== false && data.telemetry) {
    logCoachTelemetry({
      userId: params.userId,
      model: data.model ?? 'gemini-4-hydrogen',
      promptVersion: data.telemetry.promptVersion,
      latencyMs: data.telemetry.latencyMs,
      estimatedInputTokens: data.telemetry.estimatedInputTokens ?? 0,
      estimatedOutputTokens: data.telemetry.estimatedOutputTokens ?? 0,
      estimatedCostUsd: data.telemetry.estimatedCostUsd,
      status: 'success',
    });
  }

  return data as MistakeCoachApiResponse;
}

export async function requestPersonalizedMistakeExercise(params: {
  mistake: MistakeSummaryPayload;
  explanationLanguage: ExplanationLanguage;
  learnerLevel?: string;
  userId?: string;
  allowTelemetry?: boolean;
}): Promise<PersonalizedExerciseApiResponse> {
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(resolveApiUrl('/api/mistakes/generate-exercise'), {
    method: 'POST',
    credentials: getApiCredentialsMode(),
    headers,
    body: JSON.stringify({
      mistake: params.mistake,
      explanationLanguage: params.explanationLanguage,
      learnerLevel: params.learnerLevel,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<PersonalizedExerciseApiResponse> & {
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.exercise) {
    throw new MistakeCoachClientError(
      data.error || 'Unable to generate a personalized AI exercise right now.',
      res.status,
      data.code || 'EXERCISE_GEN_ERROR'
    );
  }

  if (params.allowTelemetry !== false && data.telemetry) {
    logCoachTelemetry({
      userId: params.userId,
      model: data.model ?? 'gemini-4-hydrogen',
      promptVersion: data.telemetry.promptVersion,
      latencyMs: data.telemetry.latencyMs,
      estimatedInputTokens: data.telemetry.estimatedInputTokens ?? 0,
      estimatedOutputTokens: data.telemetry.estimatedOutputTokens ?? 0,
      estimatedCostUsd: data.telemetry.estimatedCostUsd,
      status: 'success',
    });
  }

  return data as PersonalizedExerciseApiResponse;
}
