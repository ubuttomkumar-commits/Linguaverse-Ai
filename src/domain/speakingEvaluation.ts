import type {
  DiagnosticSkillDomain,
  ExplanationLanguage,
  MistakeSeverity,
  SelfEstimatedLevel,
  SpeakingDetectedMistake,
  SpeakingInputChannel,
  SpeakingModeId,
  SpeakingPressureLevel,
  SpeakingTurnEvaluation,
} from '../types/domain';
import { getPressureLevelConfig, getSpeakingScenario } from './speakingScenarios';

export interface ConversationHistoryEntry {
  role: 'ai' | 'user';
  text: string;
}

export interface SpeakingEvaluationRequest {
  modeId: SpeakingModeId;
  pressureLevel: SpeakingPressureLevel;
  userTranscript: string;
  inputChannel: SpeakingInputChannel;
  learnerLevel: SelfEstimatedLevel;
  explanationLanguage: ExplanationLanguage;
  history: ConversationHistoryEntry[];
  timedOut?: boolean;
}

export function buildSpeakingSystemInstruction(req: SpeakingEvaluationRequest): string {
  const scenario = getSpeakingScenario(req.modeId);
  const pressure = getPressureLevelConfig(req.pressureLevel);

  const tierInstruction =
    pressure.levelNumber === 4
      ? '- LEVEL 4 UNEXPECTED FOLLOW-UP TWIST: In your `ai_reply`, introduce an unexpected real-world twist, objection, or sudden change of circumstance relevant to the scenario so the learner must think on their feet.'
      : pressure.levelNumber === 5
        ? '- LEVEL 5 HIGH-STAKES SIMULATION: Maintain realistic high-stakes urgency and ask a sharp, multi-part follow-up question appropriate for a time-limited simulation.'
        : pressure.levelNumber === 1
          ? '- LEVEL 1 CONTROLLED PRACTICE: Keep your follow-up question clear, concise, and approachable so the learner can practice structured templates.'
          : '';

  return [
    'You are LINGUAVERSE AI, a supportive, evidence-based English Speaking Coach specializing in helping Bangla-speaking learners speak clear, natural English.',
    `Active Scenario: ${scenario.titleEn} (${scenario.aiPersonaEn}).`,
    `Pressure Ladder Tier: ${pressure.titleEn}.`,
    `Learner Self-Estimated Level: ${req.learnerLevel}.`,
    'Your job for EVERY turn is two-fold:',
    '1. Stay in character and respond naturally in `ai_reply` (1 to 3 concise sentences) with a natural follow-up question to keep the conversation moving.',
    '2. Perform an honest linguistic evaluation of the user\'s message in strict JSON matching the schema.',
    tierInstruction,
    '',
    'CRITICAL EVIDENCE & HONESTY RULES:',
    '- NEVER invent mistakes that do not exist. If the user\'s English is already completely natural and grammatically accurate, return an empty `mistakes` array (`[]`) and praise specifically in `correct_elements`.',
    '- Look especially for common Bangla-L1 English transfer errors (missing past tense with time markers like "yesterday", missing "do/does/did", redundant prepositions like "discuss about / return back / order for", tense misuse with "since/for", word order slips, literal collocations like "give an exam" / "say me").',
    '- Every item in `mistakes` MUST include a clear, natural Bangla explanation (`explanation_bn`) written in proper Bengali script explaining WHY it is an error for a Bangla speaker, plus an English explanation (`explanation_en`), a `confidence` float between 0.0 and 1.0, and `severity` ("low", "medium", or "high").',
    '- `pronunciation_note` HONESTY RULE: You ONLY received text (either typed text or browser Speech-to-Text transcript), NOT raw acoustic phoneme audio. Therefore, you MUST NEVER invent or fabricate a percentage pronunciation score (e.g., never write "85% pronunciation" or "9/10 accent"). Explicitly state whether clarity was inferred from Speech-to-Text transcription or typed text, and only offer constructive rhythm/stress guidance relevant to the words used.',
    '- Keep `ai_reply_bn_hint` as a short 1-sentence Bangla translation/gist of your `ai_reply`.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildSpeakingTurnPrompt(req: SpeakingEvaluationRequest): string {
  const historyLines =
    req.history.length > 0
      ? req.history
          .slice(-8)
          .map((h) => `${h.role === 'ai' ? 'Interlocutor' : 'Learner'}: ${h.text}`)
          .join('\n')
      : '(First turn of conversation)';

  const channelDescription =
    req.inputChannel === 'voice_stt'
      ? 'Browser Speech-to-Text voice transcription (no raw acoustic phoneme stream provided)'
      : req.inputChannel === 'voice_with_manual_edit'
        ? 'Voice recording with learner-edited transcript (no raw acoustic phoneme stream provided)'
        : 'Typed text fallback (no microphone audio used)';

  const timeoutNote = req.timedOut
    ? 'Note: The 45-second response timer expired while the learner was responding.'
    : '';

  return [
    'Recent conversation context:',
    historyLines,
    '',
    `Input channel: ${channelDescription}`,
    timeoutNote,
    `Learner's latest response: "${req.userTranscript.trim()}"`,
    '',
    'Return strictly valid JSON following the configured responseSchema.',
  ]
    .filter(Boolean)
    .join('\n');
}

function clampConfidence(val: unknown): number {
  const num = typeof val === 'number' && Number.isFinite(val) ? val : 0.75;
  return Math.max(0, Math.min(1, Math.round(num * 100) / 100));
}

function normalizeSeverity(val: unknown): MistakeSeverity {
  if (val === 'high' || val === 'medium' || val === 'low') return val;
  return 'medium';
}

function stripFabricatedPronunciationScores(
  note: string,
  inputChannel: SpeakingInputChannel
): string {
  const trimmed = note.trim();
  const scorePattern = /\b\d{1,3}\s*(?:%|\/\s*100\b|\/\s*10\b|out of\s*100\b|out of\s*10\b)/i;
  const scoreReplacePattern = /\b\d{1,3}\s*(?:%|\/\s*100\b|\/\s*10\b|out of\s*100\b|out of\s*10\b)/gi;
  const hasFakeScore = scorePattern.test(trimmed);

  const honestyPrefix =
    inputChannel === 'text_fallback'
      ? 'Typed fallback mode — no voice audio was captured, so acoustic pronunciation cannot be scored. '
      : 'Speech-to-text clarity note (not an acoustic phoneme score — browser STT only captures recognized words, not phonetic precision). ';

  if (!trimmed) {
    return `${honestyPrefix}Focus on pausing cleanly between clauses and stressing key content words when speaking aloud.`;
  }

  if (hasFakeScore) {
    const cleaned = trimmed.replace(scoreReplacePattern, 'unscored');
    return `${honestyPrefix}${cleaned}`;
  }

  if (
    inputChannel === 'text_fallback' &&
    !/typed|text|no (voice|audio|microphone)/i.test(trimmed)
  ) {
    return `${honestyPrefix}${trimmed}`;
  }

  return trimmed;
}

export function normalizeSpeakingEvaluation(
  raw: unknown,
  userTranscript: string,
  inputChannel: SpeakingInputChannel
): SpeakingTurnEvaluation {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const aiReply =
    typeof obj.ai_reply === 'string' && obj.ai_reply.trim()
      ? obj.ai_reply.trim()
      : 'Thank you for sharing that. Could you tell me a little more about what happened next?';

  const aiReplyBnHint =
    typeof obj.ai_reply_bn_hint === 'string' && obj.ai_reply_bn_hint.trim()
      ? obj.ai_reply_bn_hint.trim()
      : 'আপনার উত্তরটির জন্য ধন্যবাদ। এরপর কী হয়েছিল তা আরেকটু বিস্তারিত বলবেন কি?';

  const correctedTranscript =
    typeof obj.corrected_transcript === 'string' && obj.corrected_transcript.trim()
      ? obj.corrected_transcript.trim()
      : userTranscript.trim();

  const correctElements = Array.isArray(obj.correct_elements)
    ? obj.correct_elements
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    : [];

  const rawMistakes = Array.isArray(obj.mistakes) ? obj.mistakes : [];
  const mistakes: SpeakingDetectedMistake[] = rawMistakes
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      category:
        typeof item.category === 'string' && item.category.trim()
          ? item.category.trim()
          : 'Grammar',
      original:
        typeof item.original === 'string' && item.original.trim()
          ? item.original.trim()
          : userTranscript.trim(),
      corrected:
        typeof item.corrected === 'string' && item.corrected.trim()
          ? item.corrected.trim()
          : correctedTranscript,
      explanation_en:
        typeof item.explanation_en === 'string' && item.explanation_en.trim()
          ? item.explanation_en.trim()
          : 'Adjust this phrasing to sound more accurate in natural English.',
      explanation_bn:
        typeof item.explanation_bn === 'string' && item.explanation_bn.trim()
          ? item.explanation_bn.trim()
          : 'স্বাভাবিক ও শুদ্ধ ইংরেজির জন্য বাক্যটির এই অংশটি সংশোধন করুন।',
      confidence: clampConfidence(item.confidence),
      severity: normalizeSeverity(item.severity),
    }))
    .filter((m) => m.original.toLowerCase() !== m.corrected.toLowerCase());

  const naturalAlternative =
    typeof obj.natural_alternative === 'string' && obj.natural_alternative.trim()
      ? obj.natural_alternative.trim()
      : correctedTranscript;

  const pronunciationNote = stripFabricatedPronunciationScores(
    typeof obj.pronunciation_note === 'string' ? obj.pronunciation_note : '',
    inputChannel
  );

  return {
    ai_reply: aiReply,
    ai_reply_bn_hint: aiReplyBnHint,
    corrected_transcript: correctedTranscript,
    correct_elements: correctElements,
    mistakes,
    natural_alternative: naturalAlternative,
    pronunciation_note: pronunciationNote,
  };
}

export function mapMistakeCategoryToDomain(category: string): DiagnosticSkillDomain {
  const lower = category.toLowerCase();
  if (lower.includes('vocab') || lower.includes('collocation') || lower.includes('word choice')) {
    return 'vocabulary';
  }
  if (lower.includes('word order') || lower.includes('structure') || lower.includes('sentence')) {
    return 'sentence_construction';
  }
  return 'grammar';
}
