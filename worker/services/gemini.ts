import type { WorkerEnv } from '../types';
import { generateRandomId } from './crypto';

/**
 * Server-side Gemini REST evaluation for Cloudflare Workers
 * Logs every real call honestly into D1 `ai_telemetry_events`, `ai_provider_events`, and `ai_usage_ledger`.
 */

export interface GeminiJsonCallResult<T> {
  data: T;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  correlationId: string;
}

export async function callWorkerGeminiJson<T>(
  env: WorkerEnv,
  params: {
    endpoint: 'speaking_evaluate' | 'transfer_evaluate' | 'landing_analyze';
    promptVersion: string;
    systemInstruction: string;
    userPrompt: string;
    userId?: string;
    temperature?: number;
  }
): Promise<GeminiJsonCallResult<T>> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_PRIMARY_MODEL?.trim() || 'gemini-2.5-flash';
  const correlationId = generateRandomId('ai');
  const startedAt = Date.now();
  const nowIso = new Date(startedAt).toISOString();

  if (!apiKey) {
    await logWorkerAiEvent(env, {
      correlationId,
      endpoint: params.endpoint,
      model,
      promptVersion: params.promptVersion,
      status: 'error',
      latencyMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      errorCode: 'API_KEY_MISSING',
      errorMessage: 'GEMINI_API_KEY is not configured in Cloudflare Worker secrets.',
      userId: params.userId,
      createdAt: nowIso,
    });
    throw new Error('GEMINI_API_KEY is not configured on the Cloudflare Worker.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: params.systemInstruction }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: params.userPrompt }],
          },
        ],
        generationConfig: {
          temperature: params.temperature ?? 0.25,
          responseMimeType: 'application/json',
        },
      }),
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      await logWorkerAiEvent(env, {
        correlationId,
        endpoint: params.endpoint,
        model,
        promptVersion: params.promptVersion,
        status: 'error',
        latencyMs,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
        errorCode: `HTTP_${response.status}`,
        errorMessage: errText.slice(0, 240),
        userId: params.userId,
        createdAt: new Date().toISOString(),
      });
      throw new Error(`Gemini API failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned) as T;

    const promptTokens =
      body.usageMetadata?.promptTokenCount ?? Math.ceil(params.userPrompt.length / 4);
    const completionTokens =
      body.usageMetadata?.candidatesTokenCount ?? Math.ceil(cleaned.length / 4);
    const estimatedCostUsd = Number(
      ((promptTokens * 0.00000015) + (completionTokens * 0.0000006)).toFixed(6)
    );

    await logWorkerAiEvent(env, {
      correlationId,
      endpoint: params.endpoint,
      model,
      promptVersion: params.promptVersion,
      status: 'success',
      latencyMs,
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      userId: params.userId,
      createdAt: new Date().toISOString(),
    });

    return {
      data: parsed,
      model,
      latencyMs,
      promptTokens,
      completionTokens,
      estimatedCostUsd,
      correlationId,
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Gemini API failed')) {
      throw err;
    }
    const latencyMs = Date.now() - startedAt;
    await logWorkerAiEvent(env, {
      correlationId,
      endpoint: params.endpoint,
      model,
      promptVersion: params.promptVersion,
      status: 'error',
      latencyMs,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      errorCode: 'GEMINI_PARSE_OR_NETWORK',
      errorMessage: err instanceof Error ? err.message : 'Unexpected Gemini error',
      userId: params.userId,
      createdAt: new Date().toISOString(),
    });
    throw err;
  }
}

async function logWorkerAiEvent(
  env: WorkerEnv,
  row: {
    correlationId: string;
    endpoint: string;
    model: string;
    promptVersion: string;
    status: 'success' | 'error';
    latencyMs: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
    errorCode?: string;
    errorMessage?: string;
    userId?: string;
    createdAt: string;
  }
): Promise<void> {
  try {
    const id1 = generateRandomId('tel');
    const id2 = generateRandomId('prv');
    const id3 = generateRandomId('usg');
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO ai_telemetry_events (
          id, correlation_id, endpoint, model, prompt_version, status, latency_ms,
          estimated_input_tokens, estimated_output_tokens, estimated_cost_usd,
          error_code, error_message, user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id1,
        row.correlationId,
        row.endpoint,
        row.model,
        row.promptVersion,
        row.status,
        row.latencyMs,
        row.promptTokens,
        row.completionTokens,
        row.estimatedCostUsd,
        row.errorCode ?? null,
        row.errorMessage ?? null,
        row.userId ?? null,
        row.createdAt
      ),
      env.DB.prepare(
        `INSERT INTO ai_provider_events (
          id, correlation_id, provider, endpoint, model, prompt_version, status,
          latency_ms, error_code, error_message, user_id, created_at
        ) VALUES (?, ?, 'gemini', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id2,
        row.correlationId,
        row.endpoint,
        row.model,
        row.promptVersion,
        row.status,
        row.latencyMs,
        row.errorCode ?? null,
        row.errorMessage ?? null,
        row.userId ?? null,
        row.createdAt
      ),
      env.DB.prepare(
        `INSERT INTO ai_usage_ledger (
          id, correlation_id, user_id, endpoint, model, prompt_tokens,
          completion_tokens, estimated_cost_usd, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id3,
        row.correlationId,
        row.userId ?? null,
        row.endpoint,
        row.model,
        row.promptTokens,
        row.completionTokens,
        row.estimatedCostUsd,
        row.createdAt
      ),
    ]);
  } catch {
    // Non-fatal if telemetry tables are not yet migrated in preview
  }
}
