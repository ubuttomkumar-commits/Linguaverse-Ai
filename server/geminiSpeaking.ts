import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildSpeakingSystemInstruction,
  buildSpeakingTurnPrompt,
  normalizeSpeakingEvaluation,
  type SpeakingEvaluationRequest,
} from '../src/domain/speakingEvaluation.ts';
import type { SpeakingTurnEvaluation } from '../src/types/domain.ts';

export const SPEAKING_GEMINI_MODEL = 'gemini-4-hydrogen';
export const SPEAKING_GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
export const SPEAKING_PROMPT_VERSION = 'speaking-eval-v3.2';

export interface AiEvaluationTelemetry {
  correlationId: string;
  promptVersion: string;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}

export function computeGeminiTelemetry(params: {
  promptText: string;
  outputText: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  latencyMs: number;
  promptVersion: string;
}): AiEvaluationTelemetry {
  const estimatedInputTokens =
    typeof params.usageMetadata?.promptTokenCount === 'number' &&
    params.usageMetadata.promptTokenCount > 0
      ? params.usageMetadata.promptTokenCount
      : Math.max(1, Math.ceil(params.promptText.length / 4));

  const estimatedOutputTokens =
    typeof params.usageMetadata?.candidatesTokenCount === 'number' &&
    params.usageMetadata.candidatesTokenCount > 0
      ? params.usageMetadata.candidatesTokenCount
      : Math.max(1, Math.ceil(params.outputText.length / 4));

  // Transparent Flash/Lite reference pricing: $0.10 / 1M input tokens, $0.40 / 1M output tokens
  const estimatedCostUsd = Number(
    (
      (estimatedInputTokens / 1_000_000) * 0.1 +
      (estimatedOutputTokens / 1_000_000) * 0.4
    ).toFixed(6)
  );

  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  return {
    correlationId: `ai_${rand}`,
    promptVersion: params.promptVersion,
    latencyMs: Math.max(1, Math.round(params.latencyMs)),
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd,
  };
}

const EVALUATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ai_reply: {
      type: Type.STRING,
      description: 'Natural in-character conversational reply (1-3 sentences) ending with a natural follow-up question.',
    },
    ai_reply_bn_hint: {
      type: Type.STRING,
      description: 'Short 1-sentence Bangla gist/translation of ai_reply for learner comprehension.',
    },
    corrected_transcript: {
      type: Type.STRING,
      description: 'Clean grammatically corrected version of what the learner said.',
    },
    correct_elements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific strengths and accurate expressions the learner used well.',
    },
    mistakes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: 'Short category like Tense, Preposition, Word Order, Auxiliary Verb, Collocation, Grammar, Vocabulary, or Article.',
          },
          original: {
            type: Type.STRING,
            description: 'Exact flawed phrase from the learner response.',
          },
          corrected: {
            type: Type.STRING,
            description: 'Corrected natural phrase.',
          },
          explanation_en: {
            type: Type.STRING,
            description: 'Clear, concise English explanation of the grammar or phrasing issue.',
          },
          explanation_bn: {
            type: Type.STRING,
            description: 'Clear explanation in Bengali script (বাংলা) tailored for a Bangla speaker.',
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Model confidence score from 0.0 to 1.0.',
          },
          severity: {
            type: Type.STRING,
            description: 'Impact severity: "low", "medium", or "high".',
          },
        },
        required: [
          'category',
          'original',
          'corrected',
          'explanation_en',
          'explanation_bn',
          'confidence',
          'severity',
        ],
      },
      description: 'Detected errors only; return empty array if the response is fully accurate.',
    },
    natural_alternative: {
      type: Type.STRING,
      description: 'How a fluent/native speaker would naturally express the same idea in this context.',
    },
    pronunciation_note: {
      type: Type.STRING,
      description:
        'Honest non-fabricated clarity & spoken rhythm note explicitly noting that no raw acoustic phoneme stream was scored (never invent a numeric pronunciation score).',
    },
  },
  required: [
    'ai_reply',
    'ai_reply_bn_hint',
    'corrected_transcript',
    'correct_elements',
    'mistakes',
    'natural_alternative',
    'pronunciation_note',
  ],
};

export class SpeakingApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'SpeakingApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new SpeakingApiError(
      'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets to enable live AI Speaking evaluation.',
      503,
      'API_KEY_MISSING'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function classifyUpstreamError(err: unknown): SpeakingApiError {
  if (err instanceof SpeakingApiError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const statusMatch = message.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
  const status = statusMatch ? Number(statusMatch[1]) : 500;

  if (status === 401 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return new SpeakingApiError(
      'Gemini API authentication failed. Please check your GEMINI_API_KEY in Settings > Secrets.',
      403,
      'API_KEY_INVALID'
    );
  }

  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return new SpeakingApiError(
      'Gemini API rate limit reached. Your recording is safely preserved — please wait a few seconds and retry.',
      429,
      'RATE_LIMITED'
    );
  }

  if (status === 503 || /UNAVAILABLE|high demand/i.test(message)) {
    return new SpeakingApiError(
      'Gemini is temporarily experiencing high demand. Your recording and transcript are safely preserved — click Retry Evaluation.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  if (/timed out|timeout|AbortError/i.test(message)) {
    return new SpeakingApiError(
      'AI evaluation timed out. Your recording and transcript are preserved — click Retry Evaluation.',
      504,
      'TIMEOUT'
    );
  }

  return new SpeakingApiError(
    'Unable to complete AI evaluation right now. Your recording and transcript are safely preserved — please retry.',
    status >= 400 && status < 600 ? status : 502,
    'UPSTREAM_ERROR'
  );
}

interface ModelAttemptPlan {
  model: string;
  thinkingLevel?: ThinkingLevel;
  timeoutMs: number;
}

const MODEL_ATTEMPT_PLANS: ModelAttemptPlan[] = [
  {
    model: SPEAKING_GEMINI_MODEL,
    thinkingLevel: ThinkingLevel.LOW,
    timeoutMs: 8000,
  },
  {
    model: SPEAKING_GEMINI_FALLBACK_MODEL,
    timeoutMs: 18000,
  },
];

export async function evaluateSpeakingTurnWithGemini(
  req: SpeakingEvaluationRequest
): Promise<{
  evaluation: SpeakingTurnEvaluation;
  model: string;
  telemetry: AiEvaluationTelemetry;
}> {
  const transcript = req.userTranscript?.trim() ?? '';
  if (!transcript) {
    throw new SpeakingApiError(
      'No spoken or typed text was detected. Please record your voice again or type your response.',
      400,
      'EMPTY_TRANSCRIPT'
    );
  }

  const ai = getGeminiClient();
  const systemInstruction = buildSpeakingSystemInstruction(req);
  const prompt = buildSpeakingTurnPrompt(req);

  let lastError: unknown;

  for (let i = 0; i < MODEL_ATTEMPT_PLANS.length; i++) {
    const plan = MODEL_ATTEMPT_PLANS[i];
    const attemptStart = Date.now();
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: plan.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: EVALUATION_RESPONSE_SCHEMA,
            ...(plan.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: plan.thinkingLevel } }
              : {}),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Gemini request timed out after ${plan.timeoutMs / 1000}s`)),
            plan.timeoutMs
          )
        ),
      ]);

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty response payload.');
      }

      const parsed = JSON.parse(rawText) as unknown;
      const evaluation = normalizeSpeakingEvaluation(parsed, transcript, req.inputChannel);
      const telemetry = computeGeminiTelemetry({
        promptText: `${systemInstruction}\n${prompt}`,
        outputText: rawText,
        usageMetadata: response.usageMetadata,
        latencyMs: Date.now() - attemptStart,
        promptVersion: SPEAKING_PROMPT_VERSION,
      });

      return {
        evaluation,
        model: plan.model,
        telemetry,
      };
    } catch (err) {
      lastError = err;
      const elapsedMs = Date.now() - attemptStart;
      console.error(
        `[Speaking API] ${plan.model} failed after ${elapsedMs}ms:`,
        err instanceof Error ? err.message : String(err)
      );
      const classified = classifyUpstreamError(err);
      const canFallback =
        i < MODEL_ATTEMPT_PLANS.length - 1 &&
        (classified.code === 'SERVICE_UNAVAILABLE' ||
          classified.code === 'RATE_LIMITED' ||
          classified.code === 'TIMEOUT' ||
          classified.statusCode === 502 ||
          classified.statusCode === 503 ||
          classified.statusCode === 504);

      if (canFallback) {
        continue;
      }
      throw classified;
    }
  }

  throw classifyUpstreamError(lastError);
}
