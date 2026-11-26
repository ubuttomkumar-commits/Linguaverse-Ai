import type { ExplanationLanguage } from '../types/domain';
import type { DnaSkillNode, DnaTimeframe } from '../domain/communicationDnaLabEngine';
import { getApiCredentialsMode, resolveApiUrl } from './apiBase';
import { buildCsrfHeaders } from './authApi';
import { recordAiTelemetryEvent } from './governanceStore';

export interface DnaSkillSummaryPayload {
  id: string;
  titleEn: string;
  scorePercent: number | null;
  sampleSize: number;
  coverage: string;
  visualState: string;
  deltaPercent: number | null;
}

export interface DnaSynthesisPayload {
  communicationStyleEn: string;
  communicationStyleBn: string;
  executiveSummaryEn: string;
  executiveSummaryBn: string;
  observedStrengthsEn: string[];
  observedStrengthsBn: string[];
  priorityFocusEn: string[];
  priorityFocusBn: string[];
  learningBehaviorInsightEn: string;
  learningBehaviorInsightBn: string;
  sevenDayPlanEn: string[];
  sevenDayPlanBn: string[];
  evidenceBoundaryNoteEn: string;
  evidenceBoundaryNoteBn: string;
}

export interface DnaSynthesisApiResponse {
  synthesis: DnaSynthesisPayload;
  model: string;
  telemetry?: {
    promptVersion: string;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
    latencyMs: number;
    estimatedCostUsd: number;
  };
}

export interface DnaCoachChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface DnaCoachReplyPayload {
  replyEn: string;
  replyBn: string;
  actionableTipEn: string;
  actionableTipBn: string;
  practiceDrillPromptEn: string;
  practiceDrillPromptBn: string;
  suggestedFollowUps: string[];
}

export interface DnaCoachApiResponse {
  reply: DnaCoachReplyPayload;
  model: string;
  telemetry?: {
    promptVersion: string;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
    latencyMs: number;
    estimatedCostUsd: number;
  };
}

export interface DnaAiHealthStatus {
  configured: boolean;
  model: string;
  fallbackModel: string;
  promptVersion: string;
}

export class DnaCoachClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'DnaCoachClientError';
    this.status = status;
    this.code = code;
  }
}

export function serializeDnaSkillSummary(skill: DnaSkillNode): DnaSkillSummaryPayload {
  return {
    id: skill.id,
    titleEn: skill.titleEn,
    scorePercent: skill.scorePercent,
    sampleSize: skill.sampleSize,
    coverage: skill.coverage,
    visualState: skill.visualState,
    deltaPercent: skill.deltaPercent,
  };
}

function logDnaTelemetry(params: {
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
    endpoint: 'dna_analyze',
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

export async function fetchDnaAiHealth(): Promise<DnaAiHealthStatus | null> {
  try {
    const res = await fetch(resolveApiUrl('/api/dna/health'), {
      credentials: getApiCredentialsMode(),
    });
    if (!res.ok) return null;
    return (await res.json()) as DnaAiHealthStatus;
  } catch {
    return null;
  }
}

export async function requestDnaSynthesis(params: {
  explanationLanguage: ExplanationLanguage;
  timeframe: DnaTimeframe;
  measuredCount: number;
  totalVerifiedSamples: number;
  evidenceCoveragePercent: number;
  selfReportedLevel?: string;
  learningGoals?: string[];
  skills: DnaSkillNode[];
  topWeaknesses: string[];
  userId?: string;
  allowTelemetry?: boolean;
}): Promise<DnaSynthesisApiResponse> {
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(resolveApiUrl('/api/dna/analyze'), {
    method: 'POST',
    credentials: getApiCredentialsMode(),
    headers,
    body: JSON.stringify({
      explanationLanguage: params.explanationLanguage,
      timeframe: params.timeframe,
      measuredCount: params.measuredCount,
      totalVerifiedSamples: params.totalVerifiedSamples,
      evidenceCoveragePercent: params.evidenceCoveragePercent,
      selfReportedLevel: params.selfReportedLevel,
      learningGoals: params.learningGoals,
      skills: params.skills.map(serializeDnaSkillSummary),
      topWeaknesses: params.topWeaknesses.slice(0, 4),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<DnaSynthesisApiResponse> & {
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.synthesis) {
    throw new DnaCoachClientError(
      data.error || 'Unable to generate AI Communication DNA synthesis right now.',
      res.status,
      data.code || 'DNA_SYNTHESIS_ERROR'
    );
  }

  if (params.allowTelemetry !== false && data.telemetry) {
    logDnaTelemetry({
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

  return data as DnaSynthesisApiResponse;
}

export async function requestDnaCoachReply(params: {
  message: string;
  explanationLanguage: ExplanationLanguage;
  focusedSkill?: DnaSkillNode | null;
  measuredCount: number;
  totalVerifiedSamples: number;
  selfReportedLevel?: string;
  skills: DnaSkillNode[];
  topWeaknesses: string[];
  history?: DnaCoachChatTurn[];
  userId?: string;
  allowTelemetry?: boolean;
}): Promise<DnaCoachApiResponse> {
  const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(resolveApiUrl('/api/dna/coach'), {
    method: 'POST',
    credentials: getApiCredentialsMode(),
    headers,
    body: JSON.stringify({
      message: params.message,
      explanationLanguage: params.explanationLanguage,
      focusedSkill: params.focusedSkill ? serializeDnaSkillSummary(params.focusedSkill) : null,
      measuredCount: params.measuredCount,
      totalVerifiedSamples: params.totalVerifiedSamples,
      selfReportedLevel: params.selfReportedLevel,
      skills: params.skills.map(serializeDnaSkillSummary),
      topWeaknesses: params.topWeaknesses.slice(0, 4),
      history: (params.history ?? []).slice(-6),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<DnaCoachApiResponse> & {
    error?: string;
    code?: string;
  };

  if (!res.ok || !data.reply) {
    throw new DnaCoachClientError(
      data.error || 'Unable to reach the AI Communication Coach right now.',
      res.status,
      data.code || 'DNA_COACH_ERROR'
    );
  }

  if (params.allowTelemetry !== false && data.telemetry) {
    logDnaTelemetry({
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

  return data as DnaCoachApiResponse;
}
