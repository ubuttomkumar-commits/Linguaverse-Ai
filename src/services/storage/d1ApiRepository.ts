import type {
  AccountStatus,
  ActivityLedgerSummary,
  AdminOverviewStats,
  AdminRole,
  AdminUserSummary,
  DiagnosticUserAnswer,
  EmailOtpDeliveryInfo,
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  SpeakingSessionRecord,
  TransferAttemptRecord,
  UserAccount,
  XpLedgerEntry,
} from '../../types/domain';
import type {
  AuthResult,
  LinguaVerseRepository,
  LoginPayload,
  RecordExerciseAttemptPayload,
  RecordLessonAttemptPayload,
  RecordMistakeDrillPayload,
  RecordTransferAttemptPayload,
  RegisterPayload,
  ReportFalseCorrectionPayload,
  ReviewFlaggedMistakePayload,
  SaveSpeakingSessionPayload,
  UpdateProfilePayload,
} from './repository';

const TOKEN_STORAGE_KEY = 'linguaverse_cf_token_v1';

/**
 * Cloudflare Workers + D1 HTTP Repository Adapter.
 * Automatically activated when VITE_API_BASE_URL is configured.
 * Matches the exact LinguaVerseRepository contract used by LocalPersistenceRepository.
 */
export class CloudflareD1Repository implements LinguaVerseRepository {
  public readonly mode = 'cloudflare-d1' as const;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private setToken(token: string | null): void {
    if (typeof window === 'undefined') return;
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const errBody = (await response.json()) as { error?: string };
        if (errBody.error) message = errBody.error;
      } catch {
        // Ignore non-JSON error responses
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const result = await this.request<AuthResult>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(result.session.token);
    return result;
  }

  async login(payload: LoginPayload): Promise<AuthResult> {
    const result = await this.request<AuthResult>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(result.session.token);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async restoreSession(): Promise<AuthResult | null> {
    if (!this.getToken()) return null;
    try {
      return await this.request<AuthResult>('/api/v1/auth/me', { method: 'GET' });
    } catch {
      this.setToken(null);
      return null;
    }
  }

  async verifyEmailOtp(_userId: string, code: string): Promise<{ user: UserAccount }> {
    return this.request<{ user: UserAccount }>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async resendEmailOtp(_userId: string): Promise<EmailOtpDeliveryInfo> {
    return this.request<EmailOtpDeliveryInfo>('/api/v1/auth/resend-otp', {
      method: 'POST',
    });
  }

  async updateProfile(
    userId: string,
    patch: UpdateProfilePayload
  ): Promise<{
    user: UserAccount;
    profile: LearnerProfile;
    lessonMastery: Record<string, LessonMasteryRecord>;
  }> {
    return this.request(
      `/api/v1/learners/${encodeURIComponent(userId)}/profile`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }
    );
  }

  async submitDiagnostic(
    userId: string,
    answers: DiagnosticUserAnswer[]
  ): Promise<{
    profile: LearnerProfile;
    diagnostic: EvidenceStartingProfile;
    mistakes: MistakeMemoryItem[];
  }> {
    return this.request(
      `/api/v1/learners/${encodeURIComponent(userId)}/diagnostic`,
      {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }
    );
  }

  async recordExerciseAttempt(
    userId: string,
    payload: RecordExerciseAttemptPayload
  ): Promise<{
    exerciseAttempt: ExerciseAttemptRecord;
    mistakes: MistakeMemoryItem[];
    loggedMistake: MistakeMemoryItem | null;
  }> {
    return this.request(
      `/api/v1/learners/${encodeURIComponent(userId)}/exercise-attempts`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async recordLessonAttempt(
    userId: string,
    payload: RecordLessonAttemptPayload
  ): Promise<{
    lessonAttempt: LessonAttemptRecord;
    lessonAttempts: LessonAttemptRecord[];
    lessonMastery: Record<string, LessonMasteryRecord>;
    xpLedger: XpLedgerEntry[];
    newlyAwardedXp: XpLedgerEntry[];
    activitySummary: ActivityLedgerSummary;
  }> {
    return this.request(
      `/api/v1/learners/${encodeURIComponent(userId)}/lesson-attempts`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async saveSpeakingSession(
    userId: string,
    payload: SaveSpeakingSessionPayload
  ): Promise<{
    session: SpeakingSessionRecord;
    speakingSessions: SpeakingSessionRecord[];
    mistakes: MistakeMemoryItem[];
    xpLedger: XpLedgerEntry[];
    newlyAwardedXp: XpLedgerEntry[];
    activitySummary: ActivityLedgerSummary;
  }> {
    return this.request(
      `/api/v1/learners/${encodeURIComponent(userId)}/speaking-sessions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async recordMistakeDrillAttempt(
    userId: string,
    payload: RecordMistakeDrillPayload
  ): Promise<{
    drillAttempt: MistakeDrillAttemptRecord;
    mistakeDrillAttempts: MistakeDrillAttemptRecord[];
    updatedMistake: MistakeMemoryItem;
    mistakes: MistakeMemoryItem[];
    xpLedger: XpLedgerEntry[];
    newlyAwardedXp: XpLedgerEntry[];
    activitySummary: ActivityLedgerSummary;
  }> {
    return this.request(
      `/api/v1/learners/${encodeURIComponent(userId)}/mistakes/${encodeURIComponent(payload.mistakeId)}/drill-attempts`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async reportFalseCorrection(
    userId: string,
    payload: ReportFalseCorrectionPayload
  ): Promise<{
    updatedMistake: MistakeMemoryItem;
    mistakes: MistakeMemoryItem[];
  }> {
    return this.request(
      `/api/v1/learners/${encodeURIComponent(userId)}/mistakes/${encodeURIComponent(payload.mistakeId)}/false-correction`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async recordTransferAttempt(
    userId: string,
    payload: RecordTransferAttemptPayload
  ): Promise<{
    transferAttempt: TransferAttemptRecord;
    transferAttempts: TransferAttemptRecord[];
    mistakes: MistakeMemoryItem[];
    xpLedger: XpLedgerEntry[];
    newlyAwardedXp: XpLedgerEntry[];
    activitySummary: ActivityLedgerSummary;
  }> {
    return this.request(
      `/api/v1/learners/${encodeURIComponent(userId)}/transfer-attempts`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getMistakes(userId: string): Promise<MistakeMemoryItem[]> {
    return this.request<MistakeMemoryItem[]>(
      `/api/v1/learners/${encodeURIComponent(userId)}/mistakes`,
      { method: 'GET' }
    );
  }

  async getFlaggedMistakes(): Promise<MistakeMemoryItem[]> {
    return this.request<MistakeMemoryItem[]>('/api/v1/admin/flagged-mistakes', {
      method: 'GET',
    });
  }

  async reviewFlaggedMistake(payload: ReviewFlaggedMistakePayload): Promise<{
    updatedMistake: MistakeMemoryItem;
    flaggedMistakes: MistakeMemoryItem[];
    userMistakes?: MistakeMemoryItem[];
  }> {
    return this.request(
      `/api/v1/admin/flagged-mistakes/${encodeURIComponent(payload.mistakeId)}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getAdminOverviewStats(): Promise<AdminOverviewStats> {
    return this.request<AdminOverviewStats>('/api/v1/admin/overview', {
      method: 'GET',
    });
  }

  async listAdminUsers(searchQuery = ''): Promise<AdminUserSummary[]> {
    const qs = searchQuery.trim()
      ? `?q=${encodeURIComponent(searchQuery.trim())}`
      : '';
    return this.request<AdminUserSummary[]>(`/api/v1/admin/users${qs}`, {
      method: 'GET',
    });
  }

  async updateAdminUserAccount(
    targetUserId: string,
    patch: {
      role?: AdminRole;
      accountStatus?: AccountStatus;
      emailVerified?: boolean;
    }
  ): Promise<AdminUserSummary> {
    return this.request<AdminUserSummary>(
      `/api/v1/admin/users/${encodeURIComponent(targetUserId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }
    );
  }

  async clearLocalAccountData(userId: string): Promise<void> {
    await this.request<void>(`/api/v1/learners/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    this.setToken(null);
  }
}
