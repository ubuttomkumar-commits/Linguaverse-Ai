import type {
  ActivityLedgerSummary,
  AdminRole,
  AuthSession,
  DiagnosticSkillDomain,
  DiagnosticUserAnswer,
  EvidenceStartingProfile,
  ExerciseAttemptRecord,
  LearnerProfile,
  LessonAttemptRecord,
  LessonMasteryRecord,
  MistakeDrillAttemptRecord,
  MistakeMemoryItem,
  MistakeSource,
  PressureLadderLevelId,
  PrivacyConsentSettings,
  SpacedRepetitionPreset,
  SpeakingInputChannel,
  SpeakingModeId,
  SpeakingPressureLevel,
  SpeakingSessionRecord,
  SpeakingTurnRecord,
  SubscriptionPlan,
  TransferAttemptRecord,
  TransferRubricEvaluation,
  TransferScenarioId,
  UserAccount,
  XpLedgerEntry,
} from '../../types/domain';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  plan?: SubscriptionPlan;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  user: UserAccount;
  profile: LearnerProfile;
  session: AuthSession;
  latestDiagnostic: EvidenceStartingProfile | null;
  mistakes: MistakeMemoryItem[];
  lessonAttempts: LessonAttemptRecord[];
  exerciseAttempts: ExerciseAttemptRecord[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  speakingSessions: SpeakingSessionRecord[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
  transferAttempts: TransferAttemptRecord[];
  xpLedger: XpLedgerEntry[];
  activitySummary: ActivityLedgerSummary;
}

export interface UpdateProfilePayload {
  name?: string;
  role?: AdminRole;
  preferredUiLanguage?: LearnerProfile['preferredUiLanguage'];
  explanationLanguage?: LearnerProfile['explanationLanguage'];
  selfEstimatedLevel?: LearnerProfile['selfEstimatedLevel'];
  primaryGoal?: LearnerProfile['primaryGoal'];
  dailyTimeGoalMinutes?: LearnerProfile['dailyTimeGoalMinutes'];
  spacedRepetitionPreset?: SpacedRepetitionPreset;
  privacyConsent?: PrivacyConsentSettings;
  onboardingCompleted?: boolean;
  diagnosticCompleted?: boolean;
}

export interface ReviewFlaggedMistakePayload {
  mistakeId: string;
  decision: 'upheld_false_positive' | 'confirmed_accurate';
  note?: string;
  reviewerEmail: string;
  timestamp?: string;
}

export interface RecordExerciseAttemptPayload {
  lessonId: string;
  stage: 'guided' | 'independent' | 'assessment';
  exerciseId: string;
  exerciseType: string;
  userResponse: string;
  expectedAnswer: string;
  isCorrect: boolean;
  mistakeCategory: string;
  domain: DiagnosticSkillDomain;
  patternEn: string;
  patternBn: string;
  explanationEn: string;
  explanationBn: string;
  mistakeSource: MistakeSource;
  timestamp?: string;
}

export interface RecordLessonAttemptPayload {
  lessonId: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  guidedCorrect: number;
  guidedTotal: number;
  independentCorrect: number;
  independentTotal: number;
  assessmentCorrect: number;
  assessmentTotal: number;
  mistakesLoggedCount: number;
}

export interface SaveSpeakingSessionPayload {
  sessionId: string;
  modeId: SpeakingModeId;
  pressureLevel: SpeakingPressureLevel;
  startedAt: string;
  updatedAt?: string;
  durationSeconds: number;
  turns: SpeakingTurnRecord[];
  /** Newly added turn whose mistakes should be pushed into Mistake Memory (prevents double-counting on session updates) */
  newlyEvaluatedTurnId?: string;
}

export interface RecordMistakeDrillPayload {
  mistakeId: string;
  passed: boolean;
  userRewrite: string;
  expectedAnswer: string;
  durationSeconds: number;
  timestamp?: string;
}

export interface ReportFalseCorrectionPayload {
  mistakeId: string;
  reported: boolean;
  reason?: string;
  timestamp?: string;
}

export interface RecordTransferAttemptPayload {
  scenarioId: TransferScenarioId;
  pressureLevel: PressureLadderLevelId;
  targetSkillLabelEn: string;
  targetSkillLabelBn: string;
  linkedSourceType: 'mistake_memory' | 'academy_lesson' | 'baseline';
  linkedSourceId?: string;
  userResponse: string;
  twistPromptShown?: string;
  twistResponse?: string;
  inputChannel: SpeakingInputChannel;
  durationSeconds: number;
  timedOut: boolean;
  evaluation: TransferRubricEvaluation;
  completedAt?: string;
}

export interface LinguaVerseRepository {
  readonly mode: 'local' | 'cloudflare-d1';
  register(payload: RegisterPayload): Promise<AuthResult>;
  login(payload: LoginPayload): Promise<AuthResult>;
  logout(): Promise<void>;
  restoreSession(): Promise<AuthResult | null>;
  updateProfile(userId: string, patch: UpdateProfilePayload): Promise<{
    user: UserAccount;
    profile: LearnerProfile;
    lessonMastery: Record<string, LessonMasteryRecord>;
  }>;
  submitDiagnostic(
    userId: string,
    answers: DiagnosticUserAnswer[]
  ): Promise<{
    profile: LearnerProfile;
    diagnostic: EvidenceStartingProfile;
    mistakes: MistakeMemoryItem[];
  }>;
  recordExerciseAttempt(
    userId: string,
    payload: RecordExerciseAttemptPayload
  ): Promise<{
    exerciseAttempt: ExerciseAttemptRecord;
    mistakes: MistakeMemoryItem[];
    loggedMistake: MistakeMemoryItem | null;
  }>;
  recordLessonAttempt(
    userId: string,
    payload: RecordLessonAttemptPayload
  ): Promise<{
    lessonAttempt: LessonAttemptRecord;
    lessonAttempts: LessonAttemptRecord[];
    lessonMastery: Record<string, LessonMasteryRecord>;
    xpLedger: XpLedgerEntry[];
    newlyAwardedXp: XpLedgerEntry[];
    activitySummary: ActivityLedgerSummary;
  }>;
  saveSpeakingSession(
    userId: string,
    payload: SaveSpeakingSessionPayload
  ): Promise<{
    session: SpeakingSessionRecord;
    speakingSessions: SpeakingSessionRecord[];
    mistakes: MistakeMemoryItem[];
    xpLedger: XpLedgerEntry[];
    newlyAwardedXp: XpLedgerEntry[];
    activitySummary: ActivityLedgerSummary;
  }>;
  recordMistakeDrillAttempt(
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
  }>;
  reportFalseCorrection(
    userId: string,
    payload: ReportFalseCorrectionPayload
  ): Promise<{
    updatedMistake: MistakeMemoryItem;
    mistakes: MistakeMemoryItem[];
  }>;
  recordTransferAttempt(
    userId: string,
    payload: RecordTransferAttemptPayload
  ): Promise<{
    transferAttempt: TransferAttemptRecord;
    transferAttempts: TransferAttemptRecord[];
    mistakes: MistakeMemoryItem[];
    xpLedger: XpLedgerEntry[];
    newlyAwardedXp: XpLedgerEntry[];
    activitySummary: ActivityLedgerSummary;
  }>;
  getMistakes(userId: string): Promise<MistakeMemoryItem[]>;
  getFlaggedMistakes(): Promise<MistakeMemoryItem[]>;
  reviewFlaggedMistake(payload: ReviewFlaggedMistakePayload): Promise<{
    updatedMistake: MistakeMemoryItem;
    flaggedMistakes: MistakeMemoryItem[];
    userMistakes?: MistakeMemoryItem[];
  }>;
  clearLocalAccountData(userId: string): Promise<void>;
}
