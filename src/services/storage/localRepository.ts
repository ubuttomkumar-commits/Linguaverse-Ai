import { DEFAULT_PRIVACY_CONSENT } from '../../domain/adminGovernanceEngine';
import { getLessonById } from '../../domain/curriculumData';
import { evaluateDiagnosticAttempt } from '../../domain/diagnosticEngine';
import {
  appendIdempotentXpAward,
  buildLessonCompletionXpAward,
  buildLessonMasteryTierXpAward,
  buildMistakeResolvedXpAward,
  buildSpeakingSessionXpAward,
  buildTransferPassXpAward,
} from '../../domain/gamificationEngine';
import { computeNextMistakeReview } from '../../domain/mistakeMemoryEngine';
import { mapMistakeCategoryToDomain } from '../../domain/speakingEvaluation';
import { getSpeakingScenario } from '../../domain/speakingScenarios';
import {
  calculateLessonMastery,
  computeActiveStreakDays,
} from '../../domain/spacedRepetition';
import { getTransferScenario } from '../../domain/transferLabEngine';
import type {
  ActivityLedgerSummary,
  AuthSession,
  DiagnosticUserAnswer,
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  MistakeSeverity,
  SpacedRepetitionPreset,
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

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredUserRecord extends UserAccount {
  passwordSalt: string;
  passwordHash: string;
}

interface LocalDatabaseState {
  version: 5;
  users: Record<string, StoredUserRecord>;
  profiles: Record<string, LearnerProfile>;
  diagnostics: Record<string, EvidenceStartingProfile[]>;
  mistakes: Record<string, MistakeMemoryItem[]>;
  lessonAttempts: Record<string, LessonAttemptRecord[]>;
  exerciseAttempts: Record<string, ExerciseAttemptRecord[]>;
  speakingSessions: Record<string, SpeakingSessionRecord[]>;
  mistakeDrillAttempts: Record<string, MistakeDrillAttemptRecord[]>;
  transferAttempts: Record<string, TransferAttemptRecord[]>;
  xpLedger: Record<string, XpLedgerEntry[]>;
  activities: Record<string, ActivityLedgerSummary>;
}

const DB_STORAGE_KEY = 'linguaverse_d1_local_db_v1';
const SESSION_STORAGE_KEY = 'linguaverse_session_v1';

function createEmptyDb(): LocalDatabaseState {
  return {
    version: 5,
    users: {},
    profiles: {},
    diagnostics: {},
    mistakes: {},
    lessonAttempts: {},
    exerciseAttempts: {},
    speakingSessions: {},
    mistakeDrillAttempts: {},
    transferAttempts: {},
    xpLedger: {},
    activities: {},
  };
}

function createZeroActivitySummary(): ActivityLedgerSummary {
  return {
    completedLessons: 0,
    completedSpeakingSessions: 0,
    completedTransferDrills: 0,
    activeStreakDays: 0,
    totalPracticeMinutes: 0,
  };
}

function generateId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomPart}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}::${password}::linguaverse_v1`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function stripSecrets(user: StoredUserRecord): UserAccount {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    role: user.role ?? 'learner',
    createdAt: user.createdAt,
  };
}

function buildMasteryMap(
  userId: string,
  attempts: LessonAttemptRecord[],
  preset: SpacedRepetitionPreset
): Record<string, LessonMasteryRecord> {
  const lessonIds = Array.from(new Set(attempts.map((a) => a.lessonId)));
  const map: Record<string, LessonMasteryRecord> = {};
  for (const lessonId of lessonIds) {
    const record = calculateLessonMastery({
      userId,
      lessonId,
      attempts,
      schedulePreset: preset,
    });
    if (record) {
      map[lessonId] = record;
    }
  }
  return map;
}

function pickHigherSeverity(
  a?: MistakeSeverity,
  b?: MistakeSeverity
): MistakeSeverity {
  const rank: Record<MistakeSeverity, number> = { low: 1, medium: 2, high: 3 };
  const ra = a ? rank[a] : 1;
  const rb = b ? rank[b] : 1;
  if (ra >= rb) return a ?? 'medium';
  return b ?? 'medium';
}

function recomputeActivitySummary(
  base: ActivityLedgerSummary,
  lessonAttempts: LessonAttemptRecord[],
  speakingSessions: SpeakingSessionRecord[],
  drillAttempts: MistakeDrillAttemptRecord[] = [],
  transferAttempts: TransferAttemptRecord[] = []
): ActivityLedgerSummary {
  const uniqueCompletedLessons = new Set(lessonAttempts.map((a) => a.lessonId)).size;
  const completedSpeakingSessions = speakingSessions.filter((s) => s.turns.length > 0).length;
  const completedTransferDrills = transferAttempts.filter((t) => t.passed).length;

  const totalLessonSeconds = lessonAttempts.reduce(
    (sum, a) => sum + Math.max(0, a.durationSeconds),
    0
  );
  const totalSpeakingSeconds = speakingSessions.reduce(
    (sum, s) => sum + Math.max(0, s.durationSeconds),
    0
  );
  const totalDrillSeconds = drillAttempts.reduce(
    (sum, d) => sum + Math.max(0, d.durationSeconds),
    0
  );
  const totalTransferSeconds = transferAttempts.reduce(
    (sum, t) => sum + Math.max(0, t.durationSeconds),
    0
  );
  const totalSeconds =
    totalLessonSeconds + totalSpeakingSeconds + totalDrillSeconds + totalTransferSeconds;
  const hasAnyPractice =
    lessonAttempts.length > 0 ||
    completedSpeakingSessions > 0 ||
    drillAttempts.length > 0 ||
    transferAttempts.length > 0;
  const totalPracticeMinutes = hasAnyPractice
    ? Math.max(1, Math.round(totalSeconds / 60))
    : 0;

  const activityTimestamps = [
    ...lessonAttempts.map((a) => a.completedAt),
    ...speakingSessions.filter((s) => s.turns.length > 0).map((s) => s.updatedAt),
    ...drillAttempts.map((d) => d.timestamp),
    ...transferAttempts.map((t) => t.completedAt),
  ];
  const activeStreakDays = computeActiveStreakDays(activityTimestamps);

  return {
    ...base,
    completedLessons: uniqueCompletedLessons,
    completedSpeakingSessions,
    completedTransferDrills,
    totalPracticeMinutes,
    activeStreakDays,
  };
}

export class LocalPersistenceRepository implements LinguaVerseRepository {
  public readonly mode = 'local' as const;
  private readonly storage: StorageLike;

  constructor(storage?: StorageLike) {
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      const memory = new Map<string, string>();
      this.storage = {
        getItem: (k) => memory.get(k) ?? null,
        setItem: (k, v) => {
          memory.set(k, v);
        },
        removeItem: (k) => {
          memory.delete(k);
        },
      };
    }
  }

  private readDb(): LocalDatabaseState {
    try {
      const raw = this.storage.getItem(DB_STORAGE_KEY);
      if (!raw) return createEmptyDb();
      const parsed = JSON.parse(raw) as Partial<LocalDatabaseState>;
      return {
        version: 5,
        users: parsed.users ?? {},
        profiles: parsed.profiles ?? {},
        diagnostics: parsed.diagnostics ?? {},
        mistakes: parsed.mistakes ?? {},
        lessonAttempts: parsed.lessonAttempts ?? {},
        exerciseAttempts: parsed.exerciseAttempts ?? {},
        speakingSessions: parsed.speakingSessions ?? {},
        mistakeDrillAttempts: parsed.mistakeDrillAttempts ?? {},
        transferAttempts: parsed.transferAttempts ?? {},
        xpLedger: parsed.xpLedger ?? {},
        activities: parsed.activities ?? {},
      };
    } catch {
      return createEmptyDb();
    }
  }

  private writeDb(db: LocalDatabaseState): void {
    this.storage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  }

  private readSession(): AuthSession | null {
    try {
      const raw = this.storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed.token || !parsed.userId || !parsed.expiresAt) return null;
      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        this.storage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private createSession(userId: string): AuthSession {
    const now = Date.now();
    const session: AuthSession = {
      token: generateId('lv_sess'),
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };
    this.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  private hydrateProfile(raw: LearnerProfile): LearnerProfile {
    return {
      ...raw,
      spacedRepetitionPreset: raw.spacedRepetitionPreset ?? 'standard',
      privacyConsent: raw.privacyConsent ?? {
        ...DEFAULT_PRIVACY_CONSENT,
        updatedAt: raw.updatedAt,
      },
    };
  }

  private buildAuthResult(
    db: LocalDatabaseState,
    user: StoredUserRecord,
    session: AuthSession
  ): AuthResult {
    const profile = this.hydrateProfile(db.profiles[user.id]);
    const attempts = db.diagnostics[user.id] ?? [];
    const latestDiagnostic = attempts.length > 0 ? attempts[attempts.length - 1] : null;
    const mistakes = db.mistakes[user.id] ?? [];
    const lessonAttempts = db.lessonAttempts[user.id] ?? [];
    const exerciseAttempts = db.exerciseAttempts[user.id] ?? [];
    const speakingSessions = db.speakingSessions[user.id] ?? [];
    const mistakeDrillAttempts = db.mistakeDrillAttempts[user.id] ?? [];
    const transferAttempts = db.transferAttempts[user.id] ?? [];
    const xpLedger = db.xpLedger[user.id] ?? [];
    const lessonMastery = buildMasteryMap(
      user.id,
      lessonAttempts,
      profile.spacedRepetitionPreset
    );
    const activitySummary = recomputeActivitySummary(
      db.activities[user.id] ?? createZeroActivitySummary(),
      lessonAttempts,
      speakingSessions,
      mistakeDrillAttempts,
      transferAttempts
    );

    return {
      user: stripSecrets(user),
      profile,
      session,
      latestDiagnostic,
      mistakes,
      lessonAttempts,
      exerciseAttempts,
      lessonMastery,
      speakingSessions,
      mistakeDrillAttempts,
      transferAttempts,
      xpLedger,
      activitySummary,
    };
  }

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const name = payload.name.trim();
    const email = normalizeEmail(payload.email);
    const password = payload.password;

    if (!name || name.length < 2) {
      throw new Error('Please enter your full name (at least 2 characters).');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const db = this.readDb();
    const existing = Object.values(db.users).find((u) => u.email === email);
    if (existing) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }

    const now = new Date().toISOString();
    const userId = generateId('usr');
    const salt = generateId('salt');
    const passwordHash = await hashPassword(password, salt);

    const userRecord: StoredUserRecord = {
      id: userId,
      name,
      email,
      plan: payload.plan ?? 'free',
      role: 'learner',
      createdAt: now,
      passwordSalt: salt,
      passwordHash,
    };

    const learnerProfile: LearnerProfile = {
      userId,
      preferredUiLanguage: 'en',
      explanationLanguage: 'bn',
      selfEstimatedLevel: 'A2',
      primaryGoal: 'daily_speaking',
      dailyTimeGoalMinutes: 15,
      spacedRepetitionPreset: 'standard',
      privacyConsent: {
        storeMicRecordings: true,
        logAiEvaluations: true,
        updatedAt: now,
      },
      onboardingCompleted: false,
      diagnosticCompleted: false,
      updatedAt: now,
    };

    db.users[userId] = userRecord;
    db.profiles[userId] = learnerProfile;
    db.diagnostics[userId] = [];
    db.mistakes[userId] = [];
    db.lessonAttempts[userId] = [];
    db.exerciseAttempts[userId] = [];
    db.speakingSessions[userId] = [];
    db.mistakeDrillAttempts[userId] = [];
    db.transferAttempts[userId] = [];
    db.xpLedger[userId] = [];
    db.activities[userId] = createZeroActivitySummary();
    this.writeDb(db);

    const session = this.createSession(userId);
    return this.buildAuthResult(db, userRecord, session);
  }

  async login(payload: LoginPayload): Promise<AuthResult> {
    const email = normalizeEmail(payload.email);
    const password = payload.password;

    if (!email || !password) {
      throw new Error('Please enter both your email and password.');
    }

    const db = this.readDb();
    const user = Object.values(db.users).find((u) => u.email === email);
    if (!user) {
      throw new Error('No account found with this email. Please create an account first.');
    }

    const computedHash = await hashPassword(password, user.passwordSalt);
    if (computedHash !== user.passwordHash) {
      throw new Error('Incorrect password. Please check your credentials and try again.');
    }

    const session = this.createSession(user.id);
    return this.buildAuthResult(db, user, session);
  }

  async logout(): Promise<void> {
    this.storage.removeItem(SESSION_STORAGE_KEY);
  }

  async restoreSession(): Promise<AuthResult | null> {
    const session = this.readSession();
    if (!session) return null;

    const db = this.readDb();
    const user = db.users[session.userId];
    if (!user || !db.profiles[session.userId]) {
      this.storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return this.buildAuthResult(db, user, session);
  }

  async updateProfile(
    userId: string,
    patch: UpdateProfilePayload
  ): Promise<{
    user: UserAccount;
    profile: LearnerProfile;
    lessonMastery: Record<string, LessonMasteryRecord>;
  }> {
    const db = this.readDb();
    const user = db.users[userId];
    const existingProfile = db.profiles[userId];
    if (!user || !existingProfile) {
      throw new Error('Account not found.');
    }

    if (patch.name !== undefined) {
      const trimmedName = patch.name.trim();
      if (trimmedName.length < 2) {
        throw new Error('Display name must be at least 2 characters.');
      }
      user.name = trimmedName;
    }

    if (patch.role !== undefined) {
      user.role = patch.role;
    }

    const hydrated = this.hydrateProfile(existingProfile);
    const updatedProfile: LearnerProfile = {
      ...hydrated,
      preferredUiLanguage: patch.preferredUiLanguage ?? hydrated.preferredUiLanguage,
      explanationLanguage: patch.explanationLanguage ?? hydrated.explanationLanguage,
      selfEstimatedLevel: patch.selfEstimatedLevel ?? hydrated.selfEstimatedLevel,
      primaryGoal: patch.primaryGoal ?? hydrated.primaryGoal,
      dailyTimeGoalMinutes: patch.dailyTimeGoalMinutes ?? hydrated.dailyTimeGoalMinutes,
      spacedRepetitionPreset:
        patch.spacedRepetitionPreset ?? hydrated.spacedRepetitionPreset,
      privacyConsent: patch.privacyConsent ?? hydrated.privacyConsent,
      onboardingCompleted: patch.onboardingCompleted ?? hydrated.onboardingCompleted,
      diagnosticCompleted: patch.diagnosticCompleted ?? hydrated.diagnosticCompleted,
      updatedAt: new Date().toISOString(),
    };

    db.users[userId] = user;
    db.profiles[userId] = updatedProfile;
    this.writeDb(db);

    const lessonMastery = buildMasteryMap(
      userId,
      db.lessonAttempts[userId] ?? [],
      updatedProfile.spacedRepetitionPreset
    );

    return {
      user: stripSecrets(user),
      profile: updatedProfile,
      lessonMastery,
    };
  }

  async submitDiagnostic(
    userId: string,
    answers: DiagnosticUserAnswer[]
  ): Promise<{
    profile: LearnerProfile;
    diagnostic: EvidenceStartingProfile;
    mistakes: MistakeMemoryItem[];
  }> {
    const db = this.readDb();
    const rawProfile = db.profiles[userId];
    if (!rawProfile) {
      throw new Error('Learner profile not found.');
    }
    const profile = this.hydrateProfile(rawProfile);

    const attemptId = generateId('diag');
    const { profile: diagnosticResult, mistakes: diagnosticMistakes } =
      evaluateDiagnosticAttempt({
        attemptId,
        userId,
        selfEstimatedLevel: profile.selfEstimatedLevel,
        answers,
      });

    const updatedProfile: LearnerProfile = {
      ...profile,
      diagnosticCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    // Preserve any lesson-sourced mistakes while refreshing diagnostic-sourced mistakes
    const lessonMistakes = (db.mistakes[userId] ?? []).filter(
      (m) => m.source !== 'diagnostic'
    );
    const mergedMistakes = [...lessonMistakes, ...diagnosticMistakes];

    db.profiles[userId] = updatedProfile;
    db.diagnostics[userId] = [...(db.diagnostics[userId] ?? []), diagnosticResult];
    db.mistakes[userId] = mergedMistakes;
    this.writeDb(db);

    return {
      profile: updatedProfile,
      diagnostic: diagnosticResult,
      mistakes: mergedMistakes,
    };
  }

  async recordExerciseAttempt(
    userId: string,
    payload: RecordExerciseAttemptPayload
  ): Promise<{
    exerciseAttempt: ExerciseAttemptRecord;
    mistakes: MistakeMemoryItem[];
    loggedMistake: MistakeMemoryItem | null;
  }> {
    const db = this.readDb();
    if (!db.users[userId]) {
      throw new Error('Account not found.');
    }

    const timestamp = payload.timestamp ?? new Date().toISOString();
    const exerciseAttempt: ExerciseAttemptRecord = {
      id: generateId('exa'),
      userId,
      lessonId: payload.lessonId,
      stage: payload.stage,
      exerciseId: payload.exerciseId,
      exerciseType: payload.exerciseType,
      userResponse: payload.userResponse,
      expectedAnswer: payload.expectedAnswer,
      isCorrect: payload.isCorrect,
      mistakeCategory: payload.mistakeCategory,
      timestamp,
    };

    const existingExercises = db.exerciseAttempts[userId] ?? [];
    db.exerciseAttempts[userId] = [...existingExercises, exerciseAttempt];

    let loggedMistake: MistakeMemoryItem | null = null;
    const existingMistakes = [...(db.mistakes[userId] ?? [])];

    if (!payload.isCorrect) {
      const existingIndex = existingMistakes.findIndex(
        (m) =>
          m.category === payload.mistakeCategory &&
          m.patternEn === payload.patternEn &&
          m.status === 'active'
      );

      if (existingIndex >= 0) {
        const updated: MistakeMemoryItem = {
          ...existingMistakes[existingIndex],
          userExample: payload.userResponse || '(No response)',
          correctedExample: payload.expectedAnswer,
          occurrences: existingMistakes[existingIndex].occurrences + 1,
          lastSeenAt: timestamp,
          source: payload.mistakeSource,
          lessonId: payload.lessonId,
        };
        existingMistakes[existingIndex] = updated;
        loggedMistake = updated;
      } else {
        const created: MistakeMemoryItem = {
          id: generateId('mm'),
          userId,
          source: payload.mistakeSource,
          lessonId: payload.lessonId,
          domain: payload.domain,
          category: payload.mistakeCategory,
          userExample: payload.userResponse || '(No response)',
          correctedExample: payload.expectedAnswer,
          patternEn: payload.patternEn,
          patternBn: payload.patternBn,
          explanationEn: payload.explanationEn,
          explanationBn: payload.explanationBn,
          occurrences: 1,
          status: 'active',
          createdAt: timestamp,
          lastSeenAt: timestamp,
        };
        existingMistakes.unshift(created);
        loggedMistake = created;
      }

      db.mistakes[userId] = existingMistakes;
    }

    this.writeDb(db);

    return {
      exerciseAttempt,
      mistakes: db.mistakes[userId] ?? [],
      loggedMistake,
    };
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
    const db = this.readDb();
    const rawProfile = db.profiles[userId];
    if (!rawProfile) {
      throw new Error('Learner profile not found.');
    }
    const profile = this.hydrateProfile(rawProfile);

    const completedAt = payload.completedAt ?? new Date().toISOString();
    const totalItems =
      payload.guidedTotal + payload.independentTotal + payload.assessmentTotal;
    const totalCorrect =
      payload.guidedCorrect + payload.independentCorrect + payload.assessmentCorrect;
    const overallAccuracyPercent =
      totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;

    const lessonAttempt: LessonAttemptRecord = {
      id: generateId('la'),
      userId,
      lessonId: payload.lessonId,
      startedAt: payload.startedAt,
      completedAt,
      durationSeconds: Math.max(10, Math.round(payload.durationSeconds)),
      guidedCorrect: payload.guidedCorrect,
      guidedTotal: payload.guidedTotal,
      independentCorrect: payload.independentCorrect,
      independentTotal: payload.independentTotal,
      assessmentCorrect: payload.assessmentCorrect,
      assessmentTotal: payload.assessmentTotal,
      overallAccuracyPercent,
      mistakesLoggedCount: payload.mistakesLoggedCount,
    };

    const nextAttempts = [...(db.lessonAttempts[userId] ?? []), lessonAttempt];
    db.lessonAttempts[userId] = nextAttempts;

    const lessonMastery = buildMasteryMap(
      userId,
      nextAttempts,
      profile.spacedRepetitionPreset
    );

    // Auditable, idempotent XP awards (first verified completion + spaced mastery tier milestones)
    const lessonMeta = getLessonById(payload.lessonId);
    const titleEn = lessonMeta?.titleEn ?? payload.lessonId;
    const titleBn = lessonMeta?.titleBn ?? payload.lessonId;
    let xpLedger = [...(db.xpLedger[userId] ?? [])];
    const newlyAwardedXp: XpLedgerEntry[] = [];

    const firstPassAward = buildLessonCompletionXpAward(
      payload.lessonId,
      titleEn,
      titleBn,
      overallAccuracyPercent
    );
    const res1 = appendIdempotentXpAward(
      xpLedger,
      userId,
      firstPassAward,
      completedAt,
      generateId('xp')
    );
    xpLedger = res1.ledger;
    if (res1.newlyAwarded) newlyAwardedXp.push(res1.newlyAwarded);

    const recMastery = lessonMastery[payload.lessonId];
    if (recMastery) {
      const tierAward = buildLessonMasteryTierXpAward(
        payload.lessonId,
        titleEn,
        titleBn,
        recMastery.status,
        recMastery.masteryPercent
      );
      const res2 = appendIdempotentXpAward(
        xpLedger,
        userId,
        tierAward,
        completedAt,
        generateId('xp')
      );
      xpLedger = res2.ledger;
      if (res2.newlyAwarded) newlyAwardedXp.push(res2.newlyAwarded);
    }
    db.xpLedger[userId] = xpLedger;

    const activitySummary = recomputeActivitySummary(
      db.activities[userId] ?? createZeroActivitySummary(),
      nextAttempts,
      db.speakingSessions[userId] ?? [],
      db.mistakeDrillAttempts[userId] ?? [],
      db.transferAttempts[userId] ?? []
    );
    db.activities[userId] = activitySummary;
    this.writeDb(db);

    return {
      lessonAttempt,
      lessonAttempts: nextAttempts,
      lessonMastery,
      xpLedger,
      newlyAwardedXp,
      activitySummary,
    };
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
    const db = this.readDb();
    if (!db.users[userId]) {
      throw new Error('Account not found.');
    }

    const updatedAt = payload.updatedAt ?? new Date().toISOString();
    const totalMistakesDetected = payload.turns.reduce(
      (sum, turn) => sum + turn.evaluation.mistakes.length,
      0
    );

    const sessionRecord: SpeakingSessionRecord = {
      id: payload.sessionId,
      userId,
      modeId: payload.modeId,
      pressureLevel: payload.pressureLevel,
      startedAt: payload.startedAt,
      updatedAt,
      durationSeconds: Math.max(10, Math.round(payload.durationSeconds)),
      turns: payload.turns,
      totalMistakesDetected,
    };

    const existingSessions = [...(db.speakingSessions[userId] ?? [])];
    const existingIdx = existingSessions.findIndex((s) => s.id === sessionRecord.id);
    if (existingIdx >= 0) {
      existingSessions[existingIdx] = sessionRecord;
    } else {
      existingSessions.unshift(sessionRecord);
    }
    db.speakingSessions[userId] = existingSessions;

    // Push mistakes from the newly evaluated turn (or all turns if first save without turn filter)
    const turnsToSync = payload.newlyEvaluatedTurnId
      ? payload.turns.filter((t) => t.id === payload.newlyEvaluatedTurnId)
      : existingIdx === -1
        ? payload.turns
        : [];

    const existingMistakes = [...(db.mistakes[userId] ?? [])];
    for (const turn of turnsToSync) {
      for (const m of turn.evaluation.mistakes) {
        const normalizedCat = m.category.trim() || 'Grammar';
        const normalizedOriginal = m.original.trim().toLowerCase();
        const normalizedCorrected = m.corrected.trim().toLowerCase();

        const matchIdx = existingMistakes.findIndex(
          (item) =>
            item.status === 'active' &&
            item.category.toLowerCase() === normalizedCat.toLowerCase() &&
            (item.userExample.trim().toLowerCase() === normalizedOriginal ||
              item.correctedExample.trim().toLowerCase() === normalizedCorrected)
        );

        if (matchIdx >= 0) {
          const prev = existingMistakes[matchIdx];
          existingMistakes[matchIdx] = {
            ...prev,
            userExample: m.original.trim(),
            correctedExample: m.corrected.trim(),
            explanationEn: m.explanation_en,
            explanationBn: m.explanation_bn,
            occurrences: prev.occurrences + 1,
            severity: pickHigherSeverity(prev.severity, m.severity),
            confidence: m.confidence,
            source: 'speaking_studio',
            speakingSessionId: sessionRecord.id,
            lastSeenAt: updatedAt,
          };
        } else {
          existingMistakes.unshift({
            id: generateId('mm'),
            userId,
            source: 'speaking_studio',
            speakingSessionId: sessionRecord.id,
            domain: mapMistakeCategoryToDomain(normalizedCat),
            category: normalizedCat,
            userExample: m.original.trim(),
            correctedExample: m.corrected.trim(),
            patternEn: `${normalizedCat}: "${m.original.trim()}" → "${m.corrected.trim()}"`,
            patternBn: `${normalizedCat}: "${m.original.trim()}" → "${m.corrected.trim()}"`,
            explanationEn: m.explanation_en,
            explanationBn: m.explanation_bn,
            occurrences: 1,
            severity: m.severity,
            confidence: m.confidence,
            status: 'active',
            createdAt: updatedAt,
            lastSeenAt: updatedAt,
          });
        }
      }
    }
    db.mistakes[userId] = existingMistakes;

    // Idempotent Speaking Studio XP award (once per unique sessionId)
    const speakingScenario = getSpeakingScenario(payload.modeId);
    const speakingAward = buildSpeakingSessionXpAward(
      sessionRecord.id,
      speakingScenario.titleEn,
      speakingScenario.titleBn,
      sessionRecord.turns.length
    );
    const xpRes = appendIdempotentXpAward(
      db.xpLedger[userId] ?? [],
      userId,
      speakingAward,
      updatedAt,
      generateId('xp')
    );
    db.xpLedger[userId] = xpRes.ledger;
    const newlyAwardedXp = xpRes.newlyAwarded ? [xpRes.newlyAwarded] : [];

    const activitySummary = recomputeActivitySummary(
      db.activities[userId] ?? createZeroActivitySummary(),
      db.lessonAttempts[userId] ?? [],
      existingSessions,
      db.mistakeDrillAttempts[userId] ?? [],
      db.transferAttempts[userId] ?? []
    );
    db.activities[userId] = activitySummary;
    this.writeDb(db);

    return {
      session: sessionRecord,
      speakingSessions: existingSessions,
      mistakes: existingMistakes,
      xpLedger: xpRes.ledger,
      newlyAwardedXp,
      activitySummary,
    };
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
    const db = this.readDb();
    const rawProfile = db.profiles[userId];
    if (!rawProfile) {
      throw new Error('Learner profile not found.');
    }
    const profile = this.hydrateProfile(rawProfile);
    const existingMistakes = [...(db.mistakes[userId] ?? [])];
    const idx = existingMistakes.findIndex((m) => m.id === payload.mistakeId);
    if (idx < 0) {
      throw new Error('Mistake pattern not found.');
    }

    const timestamp = payload.timestamp ?? new Date().toISOString();
    const drillAttempt: MistakeDrillAttemptRecord = {
      id: generateId('mdr'),
      userId,
      mistakeId: payload.mistakeId,
      passed: payload.passed,
      userRewrite: payload.userRewrite.trim(),
      expectedAnswer: payload.expectedAnswer.trim(),
      durationSeconds: Math.max(5, Math.round(payload.durationSeconds)),
      timestamp,
    };

    const nextDrills = [...(db.mistakeDrillAttempts[userId] ?? []), drillAttempt];
    db.mistakeDrillAttempts[userId] = nextDrills;

    const current = existingMistakes[idx];
    const reviewUpdate = computeNextMistakeReview(
      current,
      payload.passed,
      profile.spacedRepetitionPreset,
      timestamp
    );

    const updatedMistake: MistakeMemoryItem = {
      ...current,
      ...reviewUpdate,
    };
    existingMistakes[idx] = updatedMistake;
    db.mistakes[userId] = existingMistakes;

    // Idempotent Mistake Resolution XP award (ONLY when verified as resolved, once per mistakeId)
    const resolveAward = buildMistakeResolvedXpAward(updatedMistake);
    const xpRes = appendIdempotentXpAward(
      db.xpLedger[userId] ?? [],
      userId,
      resolveAward,
      timestamp,
      generateId('xp')
    );
    db.xpLedger[userId] = xpRes.ledger;
    const newlyAwardedXp = xpRes.newlyAwarded ? [xpRes.newlyAwarded] : [];

    const activitySummary = recomputeActivitySummary(
      db.activities[userId] ?? createZeroActivitySummary(),
      db.lessonAttempts[userId] ?? [],
      db.speakingSessions[userId] ?? [],
      nextDrills,
      db.transferAttempts[userId] ?? []
    );
    db.activities[userId] = activitySummary;
    this.writeDb(db);

    return {
      drillAttempt,
      mistakeDrillAttempts: nextDrills,
      updatedMistake,
      mistakes: existingMistakes,
      xpLedger: xpRes.ledger,
      newlyAwardedXp,
      activitySummary,
    };
  }

  async reportFalseCorrection(
    userId: string,
    payload: ReportFalseCorrectionPayload
  ): Promise<{
    updatedMistake: MistakeMemoryItem;
    mistakes: MistakeMemoryItem[];
  }> {
    const db = this.readDb();
    const existingMistakes = [...(db.mistakes[userId] ?? [])];
    const idx = existingMistakes.findIndex((m) => m.id === payload.mistakeId);
    if (idx < 0) {
      throw new Error('Mistake pattern not found.');
    }

    const timestamp = payload.timestamp ?? new Date().toISOString();
    const current = existingMistakes[idx];
    const updatedMistake: MistakeMemoryItem = {
      ...current,
      falseCorrectionReported: payload.reported,
      falseCorrectionReason: payload.reported
        ? payload.reason?.trim() || 'Marked as false correction by learner'
        : undefined,
      falseCorrectionReportedAt: payload.reported ? timestamp : undefined,
    };

    existingMistakes[idx] = updatedMistake;
    db.mistakes[userId] = existingMistakes;
    this.writeDb(db);

    return {
      updatedMistake,
      mistakes: existingMistakes,
    };
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
    const db = this.readDb();
    if (!db.users[userId]) {
      throw new Error('Account not found.');
    }

    const completedAt = payload.completedAt ?? new Date().toISOString();
    const transferAttempt: TransferAttemptRecord = {
      id: generateId('trf'),
      userId,
      scenarioId: payload.scenarioId,
      pressureLevel: payload.pressureLevel,
      targetSkillLabelEn: payload.targetSkillLabelEn,
      targetSkillLabelBn: payload.targetSkillLabelBn,
      linkedSourceType: payload.linkedSourceType,
      linkedSourceId: payload.linkedSourceId,
      userResponse: payload.userResponse.trim(),
      twistPromptShown: payload.twistPromptShown,
      twistResponse: payload.twistResponse?.trim(),
      inputChannel: payload.inputChannel,
      durationSeconds: Math.max(10, Math.round(payload.durationSeconds)),
      timedOut: payload.timedOut,
      evaluation: payload.evaluation,
      passed: payload.evaluation.passed,
      completedAt,
    };

    const nextTransferAttempts = [transferAttempt, ...(db.transferAttempts[userId] ?? [])];
    db.transferAttempts[userId] = nextTransferAttempts;

    // Sync any newly detected Transfer Lab mistakes into Mistake Memory
    const existingMistakes = [...(db.mistakes[userId] ?? [])];
    for (const m of payload.evaluation.detected_mistakes) {
      const normalizedCat = m.category.trim() || 'Grammar';
      const normalizedOriginal = m.original.trim().toLowerCase();
      const normalizedCorrected = m.corrected.trim().toLowerCase();

      const matchIdx = existingMistakes.findIndex(
        (item) =>
          item.status !== 'resolved' &&
          !item.falseCorrectionReported &&
          item.category.toLowerCase() === normalizedCat.toLowerCase() &&
          (item.userExample.trim().toLowerCase() === normalizedOriginal ||
            item.correctedExample.trim().toLowerCase() === normalizedCorrected)
      );

      if (matchIdx >= 0) {
        const prev = existingMistakes[matchIdx];
        existingMistakes[matchIdx] = {
          ...prev,
          userExample: m.original.trim(),
          correctedExample: m.corrected.trim(),
          explanationEn: m.explanation_en,
          explanationBn: m.explanation_bn,
          occurrences: prev.occurrences + 1,
          severity: pickHigherSeverity(prev.severity, m.severity),
          confidence: m.confidence,
          source: 'speaking_studio',
          lastSeenAt: completedAt,
        };
      } else {
        existingMistakes.unshift({
          id: generateId('mm'),
          userId,
          source: 'speaking_studio',
          domain: mapMistakeCategoryToDomain(normalizedCat),
          category: normalizedCat,
          userExample: m.original.trim(),
          correctedExample: m.corrected.trim(),
          patternEn: `${normalizedCat}: "${m.original.trim()}" → "${m.corrected.trim()}"`,
          patternBn: `${normalizedCat}: "${m.original.trim()}" → "${m.corrected.trim()}"`,
          explanationEn: m.explanation_en,
          explanationBn: m.explanation_bn,
          occurrences: 1,
          severity: m.severity,
          confidence: m.confidence,
          status: 'active',
          createdAt: completedAt,
          lastSeenAt: completedAt,
        });
      }
    }
    db.mistakes[userId] = existingMistakes;

    // Idempotent Transfer Lab Pass XP (once per scenarioId + pressureLevel)
    const scenario = getTransferScenario(payload.scenarioId);
    const transferAward = buildTransferPassXpAward(
      payload.scenarioId,
      scenario.titleEn,
      scenario.titleBn,
      payload.pressureLevel,
      payload.evaluation.overall_score,
      payload.evaluation.passed
    );
    const xpRes = appendIdempotentXpAward(
      db.xpLedger[userId] ?? [],
      userId,
      transferAward,
      completedAt,
      generateId('xp')
    );
    db.xpLedger[userId] = xpRes.ledger;
    const newlyAwardedXp = xpRes.newlyAwarded ? [xpRes.newlyAwarded] : [];

    const activitySummary = recomputeActivitySummary(
      db.activities[userId] ?? createZeroActivitySummary(),
      db.lessonAttempts[userId] ?? [],
      db.speakingSessions[userId] ?? [],
      db.mistakeDrillAttempts[userId] ?? [],
      nextTransferAttempts
    );
    db.activities[userId] = activitySummary;
    this.writeDb(db);

    return {
      transferAttempt,
      transferAttempts: nextTransferAttempts,
      mistakes: existingMistakes,
      xpLedger: xpRes.ledger,
      newlyAwardedXp,
      activitySummary,
    };
  }

  async getMistakes(userId: string): Promise<MistakeMemoryItem[]> {
    const db = this.readDb();
    return db.mistakes[userId] ?? [];
  }

  async getFlaggedMistakes(): Promise<MistakeMemoryItem[]> {
    const db = this.readDb();
    const flagged: MistakeMemoryItem[] = [];
    for (const items of Object.values(db.mistakes)) {
      for (const item of items) {
        if (item.falseCorrectionReported || item.adminReviewStatus) {
          flagged.push(item);
        }
      }
    }
    return flagged.sort((a, b) => {
      const ta = a.falseCorrectionReportedAt ?? a.lastSeenAt ?? '';
      const tb = b.falseCorrectionReportedAt ?? b.lastSeenAt ?? '';
      return tb.localeCompare(ta);
    });
  }

  async reviewFlaggedMistake(payload: ReviewFlaggedMistakePayload): Promise<{
    updatedMistake: MistakeMemoryItem;
    flaggedMistakes: MistakeMemoryItem[];
    userMistakes?: MistakeMemoryItem[];
  }> {
    const db = this.readDb();
    const timestamp = payload.timestamp ?? new Date().toISOString();

    for (const [ownerId, items] of Object.entries(db.mistakes)) {
      const idx = items.findIndex((m) => m.id === payload.mistakeId);
      if (idx >= 0) {
        const current = items[idx];
        const updated: MistakeMemoryItem = {
          ...current,
          falseCorrectionReported: payload.decision === 'upheld_false_positive',
          adminReviewStatus: payload.decision,
          adminReviewNote: payload.note?.trim() || undefined,
          adminReviewedAt: timestamp,
          adminReviewedBy: payload.reviewerEmail,
        };
        const nextList = [...items];
        nextList[idx] = updated;
        db.mistakes[ownerId] = nextList;
        this.writeDb(db);

        const flaggedMistakes = await this.getFlaggedMistakes();
        return {
          updatedMistake: updated,
          flaggedMistakes,
          userMistakes: nextList,
        };
      }
    }

    throw new Error('Flagged mistake record not found.');
  }

  async clearLocalAccountData(userId: string): Promise<void> {
    const db = this.readDb();
    delete db.users[userId];
    delete db.profiles[userId];
    delete db.diagnostics[userId];
    delete db.mistakes[userId];
    delete db.lessonAttempts[userId];
    delete db.exerciseAttempts[userId];
    delete db.speakingSessions[userId];
    delete db.mistakeDrillAttempts[userId];
    delete db.transferAttempts[userId];
    delete db.xpLedger[userId];
    delete db.activities[userId];
    this.writeDb(db);
    this.storage.removeItem(SESSION_STORAGE_KEY);
  }
}
