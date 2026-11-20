import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildTransferPrompt,
  buildTransferSystemInstruction,
  normalizeTransferEvaluation,
  type TransferEvaluationRequest,
} from '../src/domain/transferLabEngine.ts';
import type { TransferRubricEvaluation } from '../src/types/domain.ts';
import {
  computeGeminiTelemetry,
  SPEAKING_GEMINI_FALLBACK_MODEL,
  SPEAKING_GEMINI_MODEL,
  SpeakingApiError,
  type AiEvaluationTelemetry,
} from './geminiSpeaking.ts';

export const TRANSFER_PROMPT_VERSION = 'transfer-rubric-v5.1';

const RUBRIC_DIMENSION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: 'Honest integer score from 0 to 100 based strictly on evidence.',
    },
    feedbackEn: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence English evidence explaining this rubric score.',
    },
    feedbackBn: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence Bangla explanation (in Bengali script) for this rubric score.',
    },
  },
  required: ['score', 'feedbackEn', 'feedbackBn'],
};

const TRANSFER_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    task_completion: RUBRIC_DIMENSION_SCHEMA,
    target_grammar_application: RUBRIC_DIMENSION_SCHEMA,
    contextual_appropriateness: RUBRIC_DIMENSION_SCHEMA,
    response_relevance: RUBRIC_DIMENSION_SCHEMA,
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific accurate phrasing or communicative strengths observed.',
    },
    detected_mistakes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          original: { type: Type.STRING },
          corrected: { type: Type.STRING },
          explanation_en: { type: Type.STRING },
          explanation_bn: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          severity: { type: Type.STRING },
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
      description: 'Real mistakes only; empty array if grammatically clean.',
    },
    natural_model_response: {
      type: Type.STRING,
      description: 'Natural, fluent model response demonstrating ideal handling of this exact scenario.',
    },
    coach_summary_en: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence English coaching takeaway.',
    },
    coach_summary_bn: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence Bangla coaching takeaway in Bengali script.',
    },
    unexpected_twist_en: {
      type: Type.STRING,
      description: 'When Level 4 initial stage is active, a realistic 1-2 sentence unexpected in-character follow-up twist; otherwise empty string.',
    },
    unexpected_twist_bn: {
      type: Type.STRING,
      description: 'Short Bangla gist of the unexpected twist when Level 4 initial stage is active; otherwise empty string.',
    },
  },
  required: [
    'task_completion',
    'target_grammar_application',
    'contextual_appropriateness',
    'response_relevance',
    'strengths',
    'detected_mistakes',
    'natural_model_response',
    'coach_summary_en',
    'coach_summary_bn',
  ],
};

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new SpeakingApiError(
      'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets to enable live Transfer Lab grading.',
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

function classifyError(err: unknown): SpeakingApiError {
  if (err instanceof SpeakingApiError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const statusMatch = message.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
  const status = statusMatch ? Number(statusMatch[1]) : 500;

  if (status === 401 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return new SpeakingApiError(
      'Gemini API authentication failed. Please check GEMINI_API_KEY in Settings > Secrets.',
      403,
      'API_KEY_INVALID'
    );
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return new SpeakingApiError(
      'Gemini API rate limit reached. Your response is safely preserved — please retry shortly.',
      429,
      'RATE_LIMITED'
    );
  }
  if (status === 503 || /UNAVAILABLE|high demand/i.test(message)) {
    return new SpeakingApiError(
      'Gemini is temporarily experiencing high demand. Your response is safely preserved — click Retry Grading.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }
  if (/timed out|timeout|AbortError/i.test(message)) {
    return new SpeakingApiError(
      'AI rubric grading timed out. Your response is preserved — click Retry Grading.',
      504,
      'TIMEOUT'
    );
  }

  return new SpeakingApiError(
    'Unable to complete Transfer Lab AI rubric grading right now. Please retry.',
    status >= 400 && status < 600 ? status : 502,
    'UPSTREAM_ERROR'
  );
}

const ATTEMPT_PLANS = [
  { model: SPEAKING_GEMINI_MODEL, thinkingLevel: ThinkingLevel.LOW, timeoutMs: 9000 },
  { model: SPEAKING_GEMINI_FALLBACK_MODEL, timeoutMs: 18000 },
];

export async function evaluateTransferChallengeWithGemini(
  req: TransferEvaluationRequest
): Promise<{
  evaluation: TransferRubricEvaluation;
  model: string;
  telemetry: AiEvaluationTelemetry;
}> {
  const responseText = req.userResponse?.trim() ?? '';
  if (!responseText) {
    throw new SpeakingApiError(
      'Please speak or type your scenario response before submitting for grading.',
      400,
      'EMPTY_RESPONSE'
    );
  }

  const ai = getGeminiClient();
  const systemInstruction = buildTransferSystemInstruction(req);
  const prompt = buildTransferPrompt(req);

  let lastError: unknown;

  for (let i = 0; i < ATTEMPT_PLANS.length; i++) {
    const plan = ATTEMPT_PLANS[i];
    const start = Date.now();
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: plan.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: TRANSFER_RESPONSE_SCHEMA,
            ...(plan.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: plan.thinkingLevel } }
              : {}),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Transfer grading timed out after ${plan.timeoutMs / 1000}s`)),
            plan.timeoutMs
          )
        ),
      ]);

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Gemini returned an empty rubric payload.');
      }

      const parsed = JSON.parse(rawText) as unknown;
      const evaluation = normalizeTransferEvaluation(parsed, req);
      const telemetry = computeGeminiTelemetry({
        promptText: `${systemInstruction}\n${prompt}`,
        outputText: rawText,
        usageMetadata: response.usageMetadata,
        latencyMs: Date.now() - start,
        promptVersion: TRANSFER_PROMPT_VERSION,
      });

      return {
        evaluation,
        model: plan.model,
        telemetry,
      };
    } catch (err) {
      lastError = err;
      console.error(
        `[Transfer Lab API] ${plan.model} failed after ${Date.now() - start}ms:`,
        err instanceof Error ? err.message : String(err)
      );
      const classified = classifyError(err);
      const canFallback =
        i < ATTEMPT_PLANS.length - 1 &&
        (classified.code === 'SERVICE_UNAVAILABLE' ||
          classified.code === 'RATE_LIMITED' ||
          classified.code === 'TIMEOUT' ||
          classified.statusCode === 502 ||
          classified.statusCode === 503 ||
          classified.statusCode === 504);

      if (canFallback) continue;
      throw classified;
    }
  }

  throw classifyError(lastError);
}
