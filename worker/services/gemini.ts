import type { WorkerEnv } from '../types';
import { generateRandomId } from './crypto';

/**
 * Server-side Gemini REST evaluation, audio transcription & TTS for Cloudflare Workers.
 * - Uses pure fetch() + Web-standard typed arrays (100% Workers runtime compatible).
 * - Supports automatic primary -> fallback model failover (gemini-4-hydrogen -> gemini-3.1-flash-lite).
 * - Logs every real call honestly into D1 `ai_telemetry_events`, `ai_provider_events`, and `ai_usage_ledger`.
 */

export type WorkerGeminiEndpoint =
  | 'landing_analyze'
  | 'speaking_evaluate'
  | 'transfer_evaluate'
  | 'academy_assist'
  | 'mistake_coach'
  | 'mistake_exercise'
  | 'dna_analyze'
  | 'dna_coach'
  | 'transfer_turn'
  | 'transfer_session_evaluate'
  | 'transfer_transcribe'
  | 'transfer_tts'
  | 'replay_ai_assist'
  | 'replay_practice';

export interface WorkerGeminiTelemetry {
  correlationId: string;
  promptVersion: string;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}

export interface GeminiJsonCallResult<T> {
  data: T;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  correlationId: string;
  telemetry: WorkerGeminiTelemetry;
}

export interface GeminiTranscribeResult {
  transcript: string;
  model: string;
  correlationId: string;
  telemetry: WorkerGeminiTelemetry;
}

export interface GeminiTtsResult {
  audioBase64: string;
  mimeType: 'audio/wav';
  model: string;
  correlationId: string;
  telemetry: WorkerGeminiTelemetry;
}

export function resolveWorkerGeminiModels(env: WorkerEnv) {
  return {
    primary: env.GEMINI_PRIMARY_MODEL?.trim() || 'gemini-4-hydrogen',
    fallback: env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-3.1-flash-lite',
    transcribe: env.GEMINI_TRANSCRIBE_MODEL?.trim() || 'gemini-3.5-transcribe',
    tts: env.GEMINI_TTS_MODEL?.trim() || 'gemini-3.8-flash-lite-tts',
  };
}

function estimateCostUsd(promptTokens: number, completionTokens: number): number {
  return Number(((promptTokens * 0.00000015) + (completionTokens * 0.0000006)).toFixed(6));
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Wraps raw signed 16-bit little-endian mono PCM bytes into a standard 44-byte RIFF/WAVE container.
 * Uses pure DataView/Uint8Array so it works identically in Cloudflare Workers and Node.
 */
export function wrapPcm16ToWavBase64(
  pcmBase64: string,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): string {
  const pcmBytes = base64ToBytes(pcmBase64);
  const headerSize = 44;
  const totalSize = headerSize + pcmBytes.byteLength;
  const wav = new Uint8Array(totalSize);
  const view = new DataView(wav.buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      wav[offset + i] = str.charCodeAt(i);
    }
  };

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.byteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcmBytes.byteLength, true);
  wav.set(pcmBytes, headerSize);

  return bytesToBase64(wav);
}

async function invokeSingleGeminiJsonModel<T>(
  env: WorkerEnv,
  apiKey: string,
  model: string,
  correlationId: string,
  params: {
    endpoint: WorkerGeminiEndpoint;
    promptVersion: string;
    systemInstruction: string;
    userPrompt: string;
    userId?: string;
    temperature?: number;
  }
): Promise<GeminiJsonCallResult<T>> {
  const startedAt = Date.now();
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

    const latencyMs = Math.max(1, Date.now() - startedAt);
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
      const httpErr = new Error(`Gemini API failed with HTTP ${response.status}`) as Error & {
        httpStatus?: number;
      };
      httpErr.httpStatus = response.status;
      throw httpErr;
    }

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned) as T;

    const promptTokens =
      body.usageMetadata?.promptTokenCount ?? Math.max(1, Math.ceil(params.userPrompt.length / 4));
    const completionTokens =
      body.usageMetadata?.candidatesTokenCount ?? Math.max(1, Math.ceil(cleaned.length / 4));
    const costUsd = estimateCostUsd(promptTokens, completionTokens);

    await logWorkerAiEvent(env, {
      correlationId,
      endpoint: params.endpoint,
      model,
      promptVersion: params.promptVersion,
      status: 'success',
      latencyMs,
      promptTokens,
      completionTokens,
      estimatedCostUsd: costUsd,
      userId: params.userId,
      createdAt: new Date().toISOString(),
    });

    return {
      data: parsed,
      model,
      latencyMs,
      promptTokens,
      completionTokens,
      estimatedCostUsd: costUsd,
      correlationId,
      telemetry: {
        correlationId,
        promptVersion: params.promptVersion,
        latencyMs,
        estimatedInputTokens: promptTokens,
        estimatedOutputTokens: completionTokens,
        estimatedCostUsd: costUsd,
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Gemini API failed')) {
      throw err;
    }
    const latencyMs = Math.max(1, Date.now() - startedAt);
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
      errorMessage: err instanceof Error ? err.message.slice(0, 240) : 'Unexpected Gemini error',
      userId: params.userId,
      createdAt: new Date().toISOString(),
    });
    throw err;
  }
}

export async function callWorkerGeminiJson<T>(
  env: WorkerEnv,
  params: {
    endpoint: WorkerGeminiEndpoint;
    promptVersion: string;
    systemInstruction: string;
    userPrompt: string;
    userId?: string;
    temperature?: number;
  }
): Promise<GeminiJsonCallResult<T>> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const models = resolveWorkerGeminiModels(env);
  const correlationId = generateRandomId('ai');

  if (!apiKey) {
    await logWorkerAiEvent(env, {
      correlationId,
      endpoint: params.endpoint,
      model: models.primary,
      promptVersion: params.promptVersion,
      status: 'error',
      latencyMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      errorCode: 'API_KEY_MISSING',
      errorMessage: 'GEMINI_API_KEY is not configured in Cloudflare Worker secrets.',
      userId: params.userId,
      createdAt: new Date().toISOString(),
    });
    throw new Error('GEMINI_API_KEY is not configured on the Cloudflare Worker.');
  }

  try {
    return await invokeSingleGeminiJsonModel<T>(env, apiKey, models.primary, correlationId, params);
  } catch (primaryErr) {
    if (models.fallback && models.fallback !== models.primary) {
      return await invokeSingleGeminiJsonModel<T>(env, apiKey, models.fallback, correlationId, params);
    }
    throw primaryErr;
  }
}

export async function callWorkerGeminiTranscribe(
  env: WorkerEnv,
  params: {
    audioBase64: string;
    mimeType: string;
    promptVersion: string;
    userId?: string;
  }
): Promise<GeminiTranscribeResult> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const models = resolveWorkerGeminiModels(env);
  const correlationId = generateRandomId('ai');
  const startedAt = Date.now();

  if (!apiKey) {
    await logWorkerAiEvent(env, {
      correlationId,
      endpoint: 'transfer_transcribe',
      model: models.transcribe,
      promptVersion: params.promptVersion,
      status: 'error',
      latencyMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      errorCode: 'API_KEY_MISSING',
      errorMessage: 'GEMINI_API_KEY is not configured in Cloudflare Worker secrets.',
      userId: params.userId,
      createdAt: new Date().toISOString(),
    });
    throw new Error('GEMINI_API_KEY is not configured on the Cloudflare Worker.');
  }

  const candidateModels = Array.from(new Set([models.transcribe, models.fallback]));
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    const attemptStart = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Transcribe the learner spoken English verbatim. Preserve exact spoken wording without fixing grammar. Return only the plain transcript text.',
                },
                {
                  inline_data: {
                    mime_type: params.mimeType,
                    data: params.audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.0,
          },
        }),
      });

      const latencyMs = Math.max(1, Date.now() - attemptStart);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        await logWorkerAiEvent(env, {
          correlationId,
          endpoint: 'transfer_transcribe',
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
        lastError = new Error(`Transcription failed with HTTP ${response.status}`);
        continue;
      }

      const body = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const transcript = (body.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
      const promptTokens = body.usageMetadata?.promptTokenCount ?? 350;
      const completionTokens =
        body.usageMetadata?.candidatesTokenCount ?? Math.max(1, Math.ceil(transcript.length / 4));
      const costUsd = estimateCostUsd(promptTokens, completionTokens);

      await logWorkerAiEvent(env, {
        correlationId,
        endpoint: 'transfer_transcribe',
        model,
        promptVersion: params.promptVersion,
        status: 'success',
        latencyMs: Math.max(1, Date.now() - startedAt),
        promptTokens,
        completionTokens,
        estimatedCostUsd: costUsd,
        userId: params.userId,
        createdAt: new Date().toISOString(),
      });

      return {
        transcript,
        model,
        correlationId,
        telemetry: {
          correlationId,
          promptVersion: params.promptVersion,
          latencyMs: Math.max(1, Date.now() - startedAt),
          estimatedInputTokens: promptTokens,
          estimatedOutputTokens: completionTokens,
          estimatedCostUsd: costUsd,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Transcription failed.');
    }
  }

  throw lastError ?? new Error('Unable to transcribe audio.');
}

export async function callWorkerGeminiTts(
  env: WorkerEnv,
  params: {
    text: string;
    voiceName?: string;
    style?: string;
    promptVersion: string;
    userId?: string;
  }
): Promise<GeminiTtsResult> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const models = resolveWorkerGeminiModels(env);
  const correlationId = generateRandomId('ai');
  const startedAt = Date.now();

  if (!apiKey) {
    await logWorkerAiEvent(env, {
      correlationId,
      endpoint: 'transfer_tts',
      model: models.tts,
      promptVersion: params.promptVersion,
      status: 'error',
      latencyMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      errorCode: 'API_KEY_MISSING',
      errorMessage: 'GEMINI_API_KEY is not configured in Cloudflare Worker secrets.',
      userId: params.userId,
      createdAt: new Date().toISOString(),
    });
    throw new Error('GEMINI_API_KEY is not configured on the Cloudflare Worker.');
  }

  const spokenPrompt = params.style
    ? `Speak in a ${params.style} tone: ${params.text}`
    : params.text;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    models.tts
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: spokenPrompt }],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: params.voiceName || 'Kore',
            },
          },
        },
      },
    }),
  });

  const latencyMs = Math.max(1, Date.now() - startedAt);
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    await logWorkerAiEvent(env, {
      correlationId,
      endpoint: 'transfer_tts',
      model: models.tts,
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
    throw new Error(`TTS API failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
  };

  const parts = body.candidates?.[0]?.content?.parts ?? [];
  const audioPart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const rawData = audioPart?.inlineData?.data ?? audioPart?.inline_data?.data ?? '';
  const rawMime = (
    audioPart?.inlineData?.mimeType ??
    audioPart?.inline_data?.mime_type ??
    'audio/pcm'
  ).toLowerCase();

  if (!rawData) {
    throw new Error('TTS model returned no audio payload.');
  }

  const audioBase64 = rawMime.includes('wav')
    ? rawData
    : wrapPcm16ToWavBase64(rawData, 24000, 1, 16);

  const promptTokens = Math.max(1, Math.ceil(params.text.length / 4));
  const completionTokens = Math.max(1, Math.ceil(audioBase64.length / 128));
  const costUsd = estimateCostUsd(promptTokens, completionTokens);

  await logWorkerAiEvent(env, {
    correlationId,
    endpoint: 'transfer_tts',
    model: models.tts,
    promptVersion: params.promptVersion,
    status: 'success',
    latencyMs,
    promptTokens,
    completionTokens,
    estimatedCostUsd: costUsd,
    userId: params.userId,
    createdAt: new Date().toISOString(),
  });

  return {
    audioBase64,
    mimeType: 'audio/wav',
    model: models.tts,
    correlationId,
    telemetry: {
      correlationId,
      promptVersion: params.promptVersion,
      latencyMs,
      estimatedInputTokens: promptTokens,
      estimatedOutputTokens: completionTokens,
      estimatedCostUsd: costUsd,
    },
  };
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
