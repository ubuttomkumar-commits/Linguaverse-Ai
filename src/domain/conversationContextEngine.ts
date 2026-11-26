import type {
  ConversationCorrectionStyle,
  SpeakingSessionRecord,
} from '../types/domain';
import type { ConversationHistoryEntry } from './speakingEvaluation.ts';
import { getSpeakingScenario } from './speakingScenarios.ts';

export interface CorrectionStyleOption {
  id: ConversationCorrectionStyle;
  labelEn: string;
  labelBn: string;
  descEn: string;
  descBn: string;
}

export const CORRECTION_STYLE_OPTIONS: CorrectionStyleOption[] = [
  {
    id: 'gentle',
    labelEn: 'Gentle Corrections',
    labelBn: 'কোমল সংশোধন',
    descEn: 'Highlights 1–2 highest-impact improvements while keeping conversation natural.',
    descBn: 'কথোপকথন স্বাভাবিক রেখে ১–২টি সবচেয়ে গুরুত্বপূর্ণ ভুল সংশোধন করে।',
  },
  {
    id: 'detailed',
    labelEn: 'Detailed Corrections',
    labelBn: 'বিস্তারিত সংশোধন',
    descEn: 'Thorough grammar, collocation, and Bangla-transfer breakdown on every turn.',
    descBn: 'প্রতিটি বাক্যে ব্যাকরণ, কলোকেশন ও বাংলা-থেকে-ইংরেজি ভুলের বিস্তারিত বিশ্লেষণ।',
  },
  {
    id: 'conversation_first',
    labelEn: 'Conversation-First',
    labelBn: 'আলাপচারিতা প্রাধান্য',
    descEn: 'Prioritizes flow and only flags high-impact clarity blockers.',
    descBn: 'কথার প্রবাহকে প্রাধান্য দেয়; শুধু বড় অর্থগত ভুলগুলো চিহ্নিত করে।',
  },
];

export const VALID_CORRECTION_STYLES = new Set<ConversationCorrectionStyle>([
  'gentle',
  'detailed',
  'conversation_first',
]);

export function isValidCorrectionStyle(val: unknown): val is ConversationCorrectionStyle {
  return (
    typeof val === 'string' &&
    VALID_CORRECTION_STYLES.has(val as ConversationCorrectionStyle)
  );
}

export interface BoundedConversationContext {
  recentHistory: ConversationHistoryEntry[];
  contextSummary: string;
  summarizedEntryCount: number;
  totalEntryCount: number;
  isWindowCompressed: boolean;
}

/**
 * Deterministic bounded context manager for long conversations.
 * Preserves up to `maxRecentEntries` verbatim recent messages and compresses
 * earlier turns into a compact summary (<= maxSummaryChars) so earlier context
 * is never silently dropped and prompt token budgets stay strictly bounded.
 */
export function buildBoundedConversationContext(
  history: ConversationHistoryEntry[],
  maxRecentEntries = 8,
  maxSummaryChars = 750
): BoundedConversationContext {
  const safeMax = Math.max(2, Math.min(10, maxRecentEntries));
  const clean = history.filter(
    (entry) =>
      entry &&
      (entry.role === 'ai' || entry.role === 'user') &&
      typeof entry.text === 'string' &&
      entry.text.trim().length > 0
  );

  if (clean.length <= safeMax) {
    return {
      recentHistory: clean,
      contextSummary: '',
      summarizedEntryCount: 0,
      totalEntryCount: clean.length,
      isWindowCompressed: false,
    };
  }

  const older = clean.slice(0, clean.length - safeMax);
  const recent = clean.slice(-safeMax);

  const summaryParts: string[] = [];
  let runningLen = 0;

  for (let i = 0; i < older.length; i++) {
    const item = older[i];
    const speaker = item.role === 'ai' ? 'AI' : 'Learner';
    const compact = item.text.replace(/\s+/g, ' ').trim();
    const snippet = compact.length > 110 ? `${compact.slice(0, 107).trimEnd()}...` : compact;
    const line = `${speaker}: ${snippet}`;
    if (runningLen + line.length + 3 > maxSummaryChars) {
      const remaining = older.length - i;
      summaryParts.push(`(+${remaining} earlier message${remaining === 1 ? '' : 's'} condensed)`);
      break;
    }
    summaryParts.push(line);
    runningLen += line.length + 3;
  }

  return {
    recentHistory: recent,
    contextSummary: summaryParts.join(' | ').slice(0, maxSummaryChars),
    summarizedEntryCount: older.length,
    totalEntryCount: clean.length,
    isWindowCompressed: true,
  };
}

export interface VocabularyTextSegment {
  text: string;
  matchedPhrase: string | null;
}

/**
 * Splits an AI message into plain and highlighted segments matching scenario
 * vocabulary phrases so learners can click and save real useful phrases directly.
 */
export function extractMessageVocabularyHighlights(
  text: string,
  vocabularyPhrases: string[]
): VocabularyTextSegment[] {
  if (!text) return [];
  const validPhrases = Array.from(
    new Set(
      vocabularyPhrases
        .map((p) => p.trim())
        .filter((p) => p.length >= 3)
    )
  ).sort((a, b) => b.length - a.length);

  if (validPhrases.length === 0) {
    return [{ text, matchedPhrase: null }];
  }

  const escaped = validPhrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  const lowerMap = new Map(validPhrases.map((p) => [p.toLowerCase(), p]));

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      matchedPhrase: lowerMap.get(part.toLowerCase()) ?? null,
    }));
}

/**
 * Searches real persisted SpeakingSessionRecord history by scenario name,
 * learner transcripts, or AI replies.
 */
export function filterConversationHistory(
  sessions: SpeakingSessionRecord[],
  query: string
): SpeakingSessionRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;

  return sessions.filter((session) => {
    const scenario = getSpeakingScenario(session.modeId);
    if (
      scenario.titleEn.toLowerCase().includes(q) ||
      scenario.titleBn.toLowerCase().includes(q) ||
      scenario.aiPersonaEn.toLowerCase().includes(q)
    ) {
      return true;
    }
    return session.turns.some(
      (turn) =>
        turn.userTranscript.toLowerCase().includes(q) ||
        turn.evaluation.ai_reply.toLowerCase().includes(q) ||
        turn.evaluation.corrected_transcript.toLowerCase().includes(q)
    );
  });
}

export type HonestConversationStatus =
  | 'Ready'
  | 'Listening'
  | 'Processing'
  | 'Responding'
  | 'Paused'
  | 'Unavailable'
  | 'Attention Needed';

export interface ConversationStatusDescriptor {
  status: HonestConversationStatus;
  labelEn: string;
  labelBn: string;
  tone: 'cyan' | 'violet' | 'blue' | 'amber' | 'slate';
}

export function deriveConversationStatus(params: {
  aiConfigured: boolean;
  isPaused: boolean;
  isEvaluating: boolean;
  isRecording: boolean;
  isSpeakingPrompt: boolean;
  hasError: boolean;
}): ConversationStatusDescriptor {
  if (!params.aiConfigured) {
    return {
      status: 'Unavailable',
      labelEn: 'Unavailable',
      labelBn: 'AI অনুপলব্ধ',
      tone: 'slate',
    };
  }
  if (params.isPaused) {
    return {
      status: 'Paused',
      labelEn: 'Paused',
      labelBn: 'বিরতিতে',
      tone: 'slate',
    };
  }
  if (params.isEvaluating) {
    return {
      status: 'Processing',
      labelEn: 'Processing',
      labelBn: 'বিশ্লেষণ চলছে',
      tone: 'violet',
    };
  }
  if (params.isRecording) {
    return {
      status: 'Listening',
      labelEn: 'Listening',
      labelBn: 'মাইক্রোফোন চালু',
      tone: 'cyan',
    };
  }
  if (params.isSpeakingPrompt) {
    return {
      status: 'Responding',
      labelEn: 'Responding',
      labelBn: 'AI বলছে',
      tone: 'blue',
    };
  }
  if (params.hasError) {
    return {
      status: 'Attention Needed',
      labelEn: 'Attention Needed',
      labelBn: 'মনোযোগ প্রয়োজন',
      tone: 'amber',
    };
  }
  return {
    status: 'Ready',
    labelEn: 'Ready',
    labelBn: 'প্রস্তুত',
    tone: 'cyan',
  };
}
