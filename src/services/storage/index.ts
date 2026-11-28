import { CloudflareD1Repository } from './d1ApiRepository';
import type { LinguaVerseRepository } from './repository';

const apiBaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
    : undefined;

function createLazyLocalRepository(): LinguaVerseRepository {
  let instancePromise: Promise<LinguaVerseRepository> | null = null;
  const load = (): Promise<LinguaVerseRepository> => {
    if (!instancePromise) {
      instancePromise = import('./localRepository').then(
        (m) => new m.LocalPersistenceRepository()
      );
    }
    return instancePromise;
  };

  return {
    mode: 'local',
    register: (p) => load().then((r) => r.register(p)),
    login: (p) => load().then((r) => r.login(p)),
    logout: () => load().then((r) => r.logout()),
    restoreSession: () => load().then((r) => r.restoreSession()),
    verifyEmailOtp: (u, c) => load().then((r) => r.verifyEmailOtp(u, c)),
    resendEmailOtp: (u) => load().then((r) => r.resendEmailOtp(u)),
    syncPasswordAfterReset: (e, p) =>
      load().then((r) => r.syncPasswordAfterReset?.(e, p)),
    hydrateServerUser: (p) =>
      load().then((r) => {
        if (!r.hydrateServerUser) {
          throw new Error('Local server hydration unavailable.');
        }
        return r.hydrateServerUser(p);
      }),
    updateProfile: (u, p) => load().then((r) => r.updateProfile(u, p)),
    submitDiagnostic: (u, a, o) => load().then((r) => r.submitDiagnostic(u, a, o)),
    recordExerciseAttempt: (u, p) => load().then((r) => r.recordExerciseAttempt(u, p)),
    recordLessonAttempt: (u, p) => load().then((r) => r.recordLessonAttempt(u, p)),
    saveSpeakingSession: (u, p) => load().then((r) => r.saveSpeakingSession(u, p)),
    recordMistakeDrillAttempt: (u, p) =>
      load().then((r) => r.recordMistakeDrillAttempt(u, p)),
    reportFalseCorrection: (u, p) => load().then((r) => r.reportFalseCorrection(u, p)),
    recordTransferAttempt: (u, p) => load().then((r) => r.recordTransferAttempt(u, p)),
    getMistakes: (u) => load().then((r) => r.getMistakes(u)),
    getFlaggedMistakes: () => load().then((r) => r.getFlaggedMistakes()),
    reviewFlaggedMistake: (p) => load().then((r) => r.reviewFlaggedMistake(p)),
    getAdminOverviewStats: (c) => load().then((r) => r.getAdminOverviewStats(c)),
    listAdminUsers: (q) => load().then((r) => r.listAdminUsers(q)),
    updateAdminUserAccount: (id, p) =>
      load().then((r) => r.updateAdminUserAccount(id, p)),
    clearLocalAccountData: (u) => load().then((r) => r.clearLocalAccountData(u)),
  };
}

export const repository: LinguaVerseRepository =
  apiBaseUrl && apiBaseUrl.trim().length > 0
    ? new CloudflareD1Repository(apiBaseUrl.trim())
    : createLazyLocalRepository();

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
  SubmitDiagnosticOptions,
} from './repository';
