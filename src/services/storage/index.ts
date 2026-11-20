import { CloudflareD1Repository } from './d1ApiRepository';
import { LocalPersistenceRepository } from './localRepository';
import type { LinguaVerseRepository } from './repository';

const apiBaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
    : undefined;

export const repository: LinguaVerseRepository =
  apiBaseUrl && apiBaseUrl.trim().length > 0
    ? new CloudflareD1Repository(apiBaseUrl.trim())
    : new LocalPersistenceRepository();

export type {
  LinguaVerseRepository,
  AuthResult,
  RegisterPayload,
  LoginPayload,
  UpdateProfilePayload,
  RecordExerciseAttemptPayload,
  RecordLessonAttemptPayload,
  RecordMistakeDrillPayload,
  RecordTransferAttemptPayload,
  ReportFalseCorrectionPayload,
  ReviewFlaggedMistakePayload,
  SaveSpeakingSessionPayload,
} from './repository';
