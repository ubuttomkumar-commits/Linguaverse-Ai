import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { SampleErrorCategory, SampleMistakeAnalysis } from '../src/domain/sampleAnalyzer.ts';
import {
  SPEAKING_GEMINI_FALLBACK_MODEL,
  SPEAKING_GEMINI_MODEL,
} from './geminiSpeaking.ts';

const SAMPLE_ANALYZE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hasDetectedMistake: {
      type: Type.BOOLEAN,
      description: 'True if the sentence has a real grammar, preposition, tense, redundancy, or phrasing mistake.',
    },
    errorCategory: {
      type: Type.STRING,
      description: 'One of: Verb Tense, Preposition, Redundancy, Sentence Structure, Auxiliary Verb, Clean.',
    },
    errorCategoryBn: {
      type: Type.STRING,
      description: 'Short Bangla label for the error category in Bengali script.',
    },
    errorSpan: {
      type: Type.STRING,
      description: 'Exact flawed phrase from the input sentence (or empty string if clean).',
    },
    correctionSpan: {
      type: Type.STRING,
      description: 'Exact corrected replacement phrase (or empty string if clean).',
    },
    correctedSentence: {
      type: Type.STRING,
      description: 'Natural, fluent English version of the user sentence.',
    },
    patternNameEn: {
      type: Type.STRING,
      description: 'Concise name of the grammar or phrasing pattern in English.',
    },
    patternNameBn: {
      type: Type.STRING,
      description: 'Concise name of the pattern in Bengali script.',
    },
    l1TriggerEn: {
      type: Type.STRING,
      description: '1 sentence explaining how Bangla phrasing or speech habits influence this mistake.',
    },
    l1TriggerBn: {
      type: Type.STRING,
      description: '1 sentence in Bengali script explaining why Bangla speakers commonly make this slip.',
    },
    explanationEn: {
      type: Type.STRING,
      description: 'Clear 1-2 sentence English explanation of the correction.',
    },
    explanationBn: {
      type: Type.STRING,
      description: 'Clear, friendly 1-2 sentence Bangla explanation in Bengali script.',
    },
  },
  required: [
    'hasDetectedMistake',
    'errorCategory',
    'errorCategoryBn',
    'errorSpan',
    'correctionSpan',
    'correctedSentence',
    'patternNameEn',
    'patternNameBn',
    'l1TriggerEn',
    'l1TriggerBn',
    'explanationEn',
    'explanationBn',
  ],
};

const ALLOWED_CATEGORIES: SampleErrorCategory[] = [
  'Verb Tense',
  'Preposition',
  'Redundancy',
  'Sentence Structure',
  'Auxiliary Verb',
  'Clean',
];

function normalizeCategory(raw: unknown, hasMistake: boolean): SampleErrorCategory {
  if (!hasMistake) return 'Clean';
  if (typeof raw === 'string') {
    const found = ALLOWED_CATEGORIES.find((c) => c.toLowerCase() === raw.trim().toLowerCase());
    if (found && found !== 'Clean') return found;
    if (/tense|past|present|future/i.test(raw)) return 'Verb Tense';
    if (/prep|in|on|at|to|for|since/i.test(raw)) return 'Preposition';
    if (/redundan|repeat|extra/i.test(raw)) return 'Redundancy';
    if (/aux|do|does|did|verb/i.test(raw)) return 'Auxiliary Verb';
  }
  return 'Sentence Structure';
}

export async function analyzeLandingSentenceWithGemini(
  sentence: string
): Promise<SampleMistakeAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `You are LINGUAVERSE AI's bilingual English communication coach for Bangla-speaking learners.
Analyze a single short English sentence submitted on the public landing page sandbox.
Rules:
- Be strictly honest. If the sentence is already natural, grammatical English, set hasDetectedMistake=false and errorCategory="Clean".
- If there is a real mistake (verb tense, preposition, redundancy, missing article, Bangla literal translation, word order, auxiliary verb), fix it into natural everyday/professional English.
- Provide crisp, friendly explanations in both English and authentic Bengali script (বাংলা).
- Never invent fake scores or telemetry.`;

  const prompt = `Analyze this English sentence from a Bangla-speaking learner:\n"${sentence}"`;

  const models = [
    { model: SPEAKING_GEMINI_MODEL, thinkingLevel: ThinkingLevel.LOW, timeoutMs: 7000 },
    { model: SPEAKING_GEMINI_FALLBACK_MODEL, timeoutMs: 12000 },
  ];

  for (const plan of models) {
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: plan.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: SAMPLE_ANALYZE_SCHEMA,
            ...(plan.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: plan.thinkingLevel } }
              : {}),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Landing sample analysis timeout')), plan.timeoutMs)
        ),
      ]);

      const text = (response.text ?? '').trim();
      if (!text) continue;
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const hasDetectedMistake = Boolean(parsed.hasDetectedMistake);
      const errorCategory = normalizeCategory(parsed.errorCategory, hasDetectedMistake);

      return {
        originalSentence: sentence,
        hasDetectedMistake,
        errorCategory,
        errorCategoryBn:
          typeof parsed.errorCategoryBn === 'string' && parsed.errorCategoryBn.trim()
            ? parsed.errorCategoryBn.trim()
            : hasDetectedMistake
              ? 'বাক্য গঠন ও প্রয়োগ'
              : 'সঠিক গঠন',
        errorSpan: typeof parsed.errorSpan === 'string' ? parsed.errorSpan.trim() : '',
        correctionSpan:
          typeof parsed.correctionSpan === 'string' ? parsed.correctionSpan.trim() : '',
        correctedSentence:
          typeof parsed.correctedSentence === 'string' && parsed.correctedSentence.trim()
            ? parsed.correctedSentence.trim()
            : sentence,
        patternNameEn:
          typeof parsed.patternNameEn === 'string' && parsed.patternNameEn.trim()
            ? parsed.patternNameEn.trim()
            : hasDetectedMistake
              ? 'Spoken English Phrasing Adjustment'
              : 'Natural English Phrasing',
        patternNameBn:
          typeof parsed.patternNameBn === 'string' && parsed.patternNameBn.trim()
            ? parsed.patternNameBn.trim()
            : hasDetectedMistake
              ? 'স্বাভাবিক ইংরেজি বাক্য গঠন'
              : 'সঠিক ও স্বাভাবিক ইংরেজি',
        l1TriggerEn:
          typeof parsed.l1TriggerEn === 'string' && parsed.l1TriggerEn.trim()
            ? parsed.l1TriggerEn.trim()
            : 'Checked against common Bangla-to-English interference patterns.',
        l1TriggerBn:
          typeof parsed.l1TriggerBn === 'string' && parsed.l1TriggerBn.trim()
            ? parsed.l1TriggerBn.trim()
            : 'বাংলা থেকে ইংরেজি অনুবাদের সাধারণ প্রবণতা যাচাই করা হয়েছে।',
        explanationEn:
          typeof parsed.explanationEn === 'string' && parsed.explanationEn.trim()
            ? parsed.explanationEn.trim()
            : 'Your sentence was evaluated for grammar and natural spoken phrasing.',
        explanationBn:
          typeof parsed.explanationBn === 'string' && parsed.explanationBn.trim()
            ? parsed.explanationBn.trim()
            : 'আপনার বাক্যটির গ্রামার এবং স্বাভাবিক ব্যবহার যাচাই করা হয়েছে।',
        memoryTag: hasDetectedMistake ? 'AI-SANDBOX-DETECTED' : 'SAMPLE-CLEAN',
        analysisSource: 'gemini',
      };
    } catch {
      continue;
    }
  }

  return null;
}
