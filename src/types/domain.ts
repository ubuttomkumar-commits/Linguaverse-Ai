export type UILanguage = 'en' | 'bn';

export type ExplanationLanguage = 'bn' | 'en' | 'both';

export type SelfEstimatedLevel = 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type PrimaryGoal =
  | 'job_interview'
  | 'daily_speaking'
  | 'academic_ielts'
  | 'workplace';

export type DailyTimeGoalMinutes = 5 | 10 | 15 | 20 | 25 | 30 | 45;

export type LearningGoalId =
  | 'speak_confidently'
  | 'improve_pronunciation'
  | 'improve_grammar'
  | 'expand_vocabulary'
  | 'improve_listening'
  | 'improve_reading'
  | 'improve_writing'
  | 'prepare_interviews'
  | 'workplace_communication'
  | 'prepare_exams'
  | 'travel_communication';

export type ExplanationDepth = 'beginner_friendly' | 'balanced' | 'advanced';

export type LearningFormat =
  | 'voice_first'
  | 'structured_lessons'
  | 'mixed_practice'
  | 'quick_drills';

export type SelfProficiencyChoice =
  | 'complete_beginner'
  | 'few_words'
  | 'simple_sentences'
  | 'basic_conversations'
  | 'comfortable'
  | 'advanced'
  | 'unsure';

export type MicPermissionState =
  | 'idle'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'skipped';

export type AssessmentSkillKey =
  | 'vocabulary'
  | 'grammar'
  | 'reading'
  | 'listening'
  | 'speaking';

export type AssessmentSkillStatus = 'assessed' | 'not_assessed' | 'unavailable';

export interface FiveSkillResultItem {
  skill: AssessmentSkillKey;
  status: AssessmentSkillStatus;
  scorePercent: number | null;
  correctCount: number;
  totalCount: number;
  noteEn: string;
  noteBn: string;
}

export interface PersonalizedLearningPath {
  startingPointEn: string;
  startingPointBn: string;
  strongestSkills: AssessmentSkillKey[];
  prioritySkills: AssessmentSkillKey[];
  recommendedFirstLessonId: string;
  recommendedFirstLessonTitleEn: string;
  recommendedFirstLessonTitleBn: string;
  dailyPracticeMinutes: DailyTimeGoalMinutes;
  nextStepsEn: string[];
  nextStepsBn: string[];
}

export interface FiveSkillAssessmentSummary {
  skills: FiveSkillResultItem[];
  assessedSkillCount: number;
  hasSufficientRadarData: boolean;
  listeningMode: 'speech_synthesis' | 'skipped' | 'unavailable';
  speakingMode: 'ai_evaluated' | 'recorded_unscored' | 'skipped' | 'unavailable';
  speakingTranscript?: string;
  speakingCoachNoteEn?: string;
  speakingCoachNoteBn?: string;
  strengthsEn: string[];
  strengthsBn: string[];
  opportunitiesEn: string[];
  opportunitiesBn: string[];
  personalizedPath: PersonalizedLearningPath;
}

export type SubscriptionPlan = 'free' | 'pro' | 'institution';

export type SpacedRepetitionPreset = 'standard' | 'intensive' | 'relaxed';

export interface BilingualText {
  en: string;
  bn: string;
}

export type AdminRole =
  | 'learner'
  | 'moderator'
  | 'content_manager'
  | 'ai_ops'
  | 'admin'
  | 'super_admin';

export type AccountStatus = 'active' | 'suspended';

export interface PrivacyConsentSettings {
  storeMicRecordings: boolean;
  logAiEvaluations: boolean;
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  plan: SubscriptionPlan;
  role?: AdminRole;
  emailVerified?: boolean;
  accountStatus?: AccountStatus;
  createdAt: string;
}

export interface EmailOtpDeliveryInfo {
  email: string;
  expiresAt: string;
  resendAvailableAt: string;
  deliveryMode: 'email_provider' | 'local_dev_preview';
  /** Populated ONLY in unconfigured local development when no email provider API key is present */
  devPreviewOtp?: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  verifiedUsers: number;
  suspendedUsers: number;
  lessonsCompleted: number;
  speakingSessions: number;
  transferAttempts: number;
  aiCalls: number;
  activeMistakes: number;
  flaggedMistakes: number;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  plan: SubscriptionPlan;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  lessonsCompleted: number;
  speakingSessions: number;
  activeMistakes: number;
  createdAt: string;
}

export interface LearnerProfile {
  userId: string;
  preferredUiLanguage: UILanguage;
  explanationLanguage: ExplanationLanguage;
  selfEstimatedLevel: SelfEstimatedLevel;
  primaryGoal: PrimaryGoal;
  dailyTimeGoalMinutes: DailyTimeGoalMinutes;
  spacedRepetitionPreset: SpacedRepetitionPreset;
  nativeLanguage?: string;
  targetLanguage?: string;
  learningGoals?: LearningGoalId[];
  explanationDepth?: ExplanationDepth;
  learningFormat?: LearningFormat;
  dailyReminderEnabled?: boolean;
  dailyReminderTime?: string;
  selfProficiencyChoice?: SelfProficiencyChoice;
  microphonePermissionStatus?: MicPermissionState;
  privacyConsent?: PrivacyConsentSettings;
  onboardingCompleted: boolean;
  diagnosticCompleted: boolean;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export type DiagnosticSkillDomain =
  | 'vocabulary'
  | 'grammar'
  | 'sentence_construction'
  | 'reading';

export type DiagnosticQuestionType = 'mcq' | 'sentence_builder';

export interface DiagnosticOption {
  id: string;
  label: string;
}

export interface DiagnosticQuestion {
  id: string;
  order: number;
  domain: DiagnosticSkillDomain;
  type: DiagnosticQuestionType;
  promptEn: string;
  promptBn: string;
  passageEn?: string;
  passageBnHint?: string;
  options?: DiagnosticOption[];
  wordBank?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  mistakeCategory: string;
  mistakePatternEn: string;
  mistakePatternBn: string;
  explanationEn: string;
  explanationBn: string;
}

export interface DiagnosticUserAnswer {
  questionId: string;
  userResponse: string;
}

export interface EvaluatedDiagnosticItem {
  questionId: string;
  domain: DiagnosticSkillDomain;
  userResponse: string;
  correctAnswer: string;
  isCorrect: boolean;
  mistakeCategory: string;
  mistakePatternEn: string;
  mistakePatternBn: string;
  explanationEn: string;
  explanationBn: string;
}

export interface DomainBreakdown {
  domain: DiagnosticSkillDomain;
  correct: number;
  total: number;
  accuracyPercent: number;
}

export interface EvidenceStartingProfile {
  attemptId: string;
  userId: string;
  completedAt: string;
  totalCorrect: number;
  totalQuestions: number;
  accuracyPercent: number;
  estimatedStartingBand: string;
  estimatedStartingBandBn: string;
  recommendedTrackEn: string;
  recommendedTrackBn: string;
  selfEstimatedLevel: SelfEstimatedLevel;
  calibrationNoteEn: string;
  calibrationNoteBn: string;
  confidenceCoveragePercent: number;
  confidenceLabelEn: string;
  confidenceLabelBn: string;
  isCertifiedCefr: false;
  domainBreakdown: DomainBreakdown[];
  items: EvaluatedDiagnosticItem[];
  fiveSkillSummary?: FiveSkillAssessmentSummary;
}

export type MistakeSource =
  | 'diagnostic'
  | 'lesson_guided'
  | 'lesson_independent'
  | 'lesson_assessment'
  | 'speaking_studio';

export type MistakeSeverity = 'low' | 'medium' | 'high';

export type MistakeCategory =
  | 'Grammar'
  | 'Tense'
  | 'Preposition'
  | 'Word Order'
  | 'Vocabulary'
  | 'Auxiliary Verb'
  | 'Collocation'
  | 'Article'
  | 'Pronunciation / Clarity'
  | 'Reading';

export type MistakeStatus = 'active' | 'practicing' | 'resolved';

export type MistakeFilterCategory =
  | 'verb_tense'
  | 'prepositions'
  | 'articles'
  | 'word_order'
  | 'vocabulary'
  | 'sentence_structure';

export interface MistakeMemoryItem {
  id: string;
  userId: string;
  source: MistakeSource;
  lessonId?: string;
  speakingSessionId?: string;
  domain: DiagnosticSkillDomain;
  category: string;
  userExample: string;
  correctedExample: string;
  patternEn: string;
  patternBn: string;
  explanationEn: string;
  explanationBn: string;
  occurrences: number;
  severity?: MistakeSeverity;
  confidence?: number;
  status: MistakeStatus;
  practiceAttemptsCount?: number;
  practicePassCount?: number;
  reviewIntervalDays?: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
  falseCorrectionReported?: boolean;
  falseCorrectionReason?: string;
  falseCorrectionReportedAt?: string;
  adminReviewStatus?: 'pending' | 'upheld_false_positive' | 'confirmed_accurate';
  adminReviewNote?: string;
  adminReviewedAt?: string;
  adminReviewedBy?: string;
  createdAt: string;
  lastSeenAt?: string;
}

export interface MistakeDrillAttemptRecord {
  id: string;
  userId: string;
  mistakeId: string;
  passed: boolean;
  userRewrite: string;
  expectedAnswer: string;
  durationSeconds: number;
  timestamp: string;
}

export interface ActivityLedgerSummary {
  completedLessons: number;
  completedSpeakingSessions: number;
  completedTransferDrills: number;
  activeStreakDays: number;
  totalPracticeMinutes: number;
}

// ============================================================================
// Phase 2: The Academy — Structured Curriculum, 7-Stage Lessons & Spaced Rep
// ============================================================================

export type LessonStageKey =
  | 'objective'
  | 'explanation'
  | 'examples'
  | 'guided'
  | 'independent'
  | 'assessment'
  | 'mastery';

export interface ContrastRow {
  banglaThought: string;
  commonTrap: string;
  naturalEnglish: string;
}

export interface LessonExample {
  id: string;
  contextEn: string;
  contextBn: string;
  englishSentence: string;
  highlightPhrase: string;
  banglaMeaning: string;
}

export type GuidedExerciseType = 'fill_blank' | 'reorder' | 'error_spot';

export interface GuidedExercise {
  id: string;
  type: GuidedExerciseType;
  promptEn: string;
  promptBn: string;
  /** Used for fill_blank */
  sentenceTemplate?: string;
  options?: string[];
  /** Used for reorder */
  wordBank?: string[];
  acceptableAnswers?: string[];
  /** Used for error_spot: clickable segments of a sentence */
  segments?: string[];
  errorSegmentIndex?: number;
  correctAnswer: string;
  mistakeCategory: MistakeCategory;
  domain: DiagnosticSkillDomain;
  patternEn: string;
  patternBn: string;
  explanationEn: string;
  explanationBn: string;
}

export interface TrapHintRule {
  pattern: string;
  feedbackEn: string;
  feedbackBn: string;
}

export interface IndependentExercise {
  id: string;
  promptEn: string;
  promptBn: string;
  banglaCue: string;
  hintWords: string[];
  sampleCorrectAnswer: string;
  acceptableAnswers: string[];
  requiredKeywords?: string[];
  forbiddenPatterns?: TrapHintRule[];
  mistakeCategory: MistakeCategory;
  domain: DiagnosticSkillDomain;
  patternEn: string;
  patternBn: string;
  explanationEn: string;
  explanationBn: string;
}

export interface AssessmentQuestion {
  id: string;
  type: 'mcq' | 'construct';
  promptEn: string;
  promptBn: string;
  options?: { id: string; label: string }[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  mistakeCategory: MistakeCategory;
  domain: DiagnosticSkillDomain;
  patternEn: string;
  patternBn: string;
  explanationEn: string;
  explanationBn: string;
}

export interface CurriculumLesson {
  id: string;
  courseId: string;
  moduleId: string;
  order: number;
  cefrBand: string;
  estimatedMinutes: number;
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  objectivesEn: string[];
  objectivesBn: string[];
  prerequisiteLessonIds: string[];
  prerequisiteNoteEn: string;
  prerequisiteNoteBn: string;
  targetCategories: MistakeCategory[];
  conceptRuleTitleEn: string;
  conceptRuleTitleBn: string;
  conceptRuleEn: string;
  conceptRuleBn: string;
  banglaInterferenceTitleEn: string;
  banglaInterferenceTitleBn: string;
  banglaInterferenceEn: string;
  banglaInterferenceBn: string;
  contrastRows: ContrastRow[];
  examples: LessonExample[];
  guidedExercises: GuidedExercise[];
  independentExercises: IndependentExercise[];
  assessmentQuestions: AssessmentQuestion[];
  version?: number;
  publishedStatus?: 'draft' | 'published' | 'archived';
  isCustom?: boolean;
  updatedAt?: string;
}

export interface CurriculumModule {
  id: string;
  courseId: string;
  order: number;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  lessons: CurriculumLesson[];
}

export interface CurriculumCourse {
  id: string;
  order: number;
  cefrRange: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  targetAudienceEn: string;
  targetAudienceBn: string;
  modules: CurriculumModule[];
  version?: number;
  publishedStatus?: 'draft' | 'published' | 'archived';
  isCustom?: boolean;
  updatedAt?: string;
}

export interface ExerciseAttemptRecord {
  id: string;
  userId: string;
  lessonId: string;
  lessonAttemptId?: string;
  stage: 'guided' | 'independent' | 'assessment';
  exerciseId: string;
  exerciseType: string;
  userResponse: string;
  expectedAnswer: string;
  isCorrect: boolean;
  mistakeCategory: string;
  timestamp: string;
}

export interface LessonAttemptRecord {
  id: string;
  userId: string;
  lessonId: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  guidedCorrect: number;
  guidedTotal: number;
  independentCorrect: number;
  independentTotal: number;
  assessmentCorrect: number;
  assessmentTotal: number;
  overallAccuracyPercent: number;
  mistakesLoggedCount: number;
}

export type MasteryStatus =
  | 'not_started'
  | 'needs_review'
  | 'initial_acquisition'
  | 'reinforced'
  | 'consolidating'
  | 'mastered';

export interface LessonMasteryRecord {
  lessonId: string;
  userId: string;
  attemptCount: number;
  consecutivePassCount: number;
  bestAccuracyPercent: number;
  lastAccuracyPercent: number;
  masteryPercent: number;
  status: MasteryStatus;
  reviewIntervalDays: number;
  schedulePreset: SpacedRepetitionPreset;
  lastAttemptAt: string;
  nextReviewAt: string;
}

// ============================================================================
// Phase 3: AI Speaking Studio & Communication Replay
// ============================================================================

export type SpeakingScenarioCategory = 'everyday' | 'professional' | 'academic' | 'travel';

export type SpeakingModeId =
  | 'daily_conversations'
  | 'self_introduction'
  | 'job_interviews'
  | 'workplace_communication'
  | 'travel'
  | 'customer_service'
  | 'unexpected_questions'
  | 'academic_discussion'
  | 'presentation_pitch'
  | 'travel_airport_assistance';

export type PressureLadderLevelId =
  | 'level_1_controlled'
  | 'level_2_guided'
  | 'level_3_open'
  | 'level_4_twist'
  | 'level_5_timed_high_stakes';

/** Backward-compatible union supporting legacy Phase 3 keys + full Phase 5 5-level Pressure Ladder */
export type SpeakingPressureLevel =
  | PressureLadderLevelId
  | 'guided'
  | 'open_ended'
  | 'time_limited';

export type SpeakingInputChannel = 'voice_stt' | 'voice_with_manual_edit' | 'text_fallback';

export interface SpeakingDetectedMistake {
  category: string;
  original: string;
  corrected: string;
  explanation_en: string;
  explanation_bn: string;
  confidence: number;
  severity: MistakeSeverity;
}

export interface SpeakingTurnEvaluation {
  ai_reply: string;
  ai_reply_bn_hint: string;
  corrected_transcript: string;
  correct_elements: string[];
  mistakes: SpeakingDetectedMistake[];
  natural_alternative: string;
  pronunciation_note: string;
}

export interface SpeakingTurnRecord {
  id: string;
  turnNumber: number;
  promptShown: string;
  userTranscript: string;
  inputChannel: SpeakingInputChannel;
  audioBlobKey?: string;
  audioDurationSeconds?: number;
  responseTimeSeconds?: number;
  timedOut?: boolean;
  evaluation: SpeakingTurnEvaluation;
  createdAt: string;
}

export interface SpeakingSessionRecord {
  id: string;
  userId: string;
  modeId: SpeakingModeId;
  pressureLevel: SpeakingPressureLevel;
  startedAt: string;
  updatedAt: string;
  durationSeconds: number;
  turns: SpeakingTurnRecord[];
  totalMistakesDetected: number;
}

export type ConversationCorrectionStyle = 'gentle' | 'detailed' | 'conversation_first';

export interface SavedConversationVocabItem {
  id: string;
  phrase: string;
  contextSentence: string;
  scenarioId: SpeakingModeId;
  savedAt: string;
}

// ============================================================================
// Phase 5 & Part 11: Transfer Lab, 5-Level Pressure Ladder & Verified Gamification
// ============================================================================

export type LegacyTransferScenarioId =
  | 'job_interview_followup'
  | 'workplace_project_delay'
  | 'order_issue_resolution'
  | 'university_admission_interview'
  | 'storytelling_under_pressure';

export type TransferScenarioCategory =
  | 'daily_life'
  | 'travel_international'
  | 'professional'
  | 'customer_communication'
  | 'education'
  | 'emergency_practical';

export type TransferDifficultyLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'professional';

export type TransferObjectiveStatus =
  | 'not_started'
  | 'in_progress'
  | 'achieved'
  | 'partially_achieved'
  | 'not_achieved'
  | 'not_evaluated';

export type TransferEightDimensionKey =
  | 'task_completion'
  | 'communication_clarity'
  | 'grammar_application'
  | 'vocabulary_application'
  | 'contextual_appropriateness'
  | 'response_relevance'
  | 'conversation_coherence'
  | 'problem_solving_communication';

export type TransferInteractionMode = 'text' | 'voice';

/**
 * Backward-compatible Scenario ID union covering both the 5 Phase 5 scenarios
 * and all 30 Part 11 Transfer Lab Universe scenarios.
 */
export type TransferScenarioId = LegacyTransferScenarioId | (string & {});

export interface TransferObjectiveProgress {
  objectiveId: string;
  labelEn: string;
  labelBn: string;
  criteriaEn: string;
  status: TransferObjectiveStatus;
  evidenceQuote?: string;
  rationaleEn?: string;
  rationaleBn?: string;
}

export interface TransferDimensionEvaluation {
  dimension: TransferEightDimensionKey;
  labelEn: string;
  labelBn: string;
  evaluated: boolean;
  /** Strictly null when evaluated === false (missing evidence); 0-100 integer when evaluated */
  score: number | null;
  verdict: 'strong' | 'adequate' | 'developing' | 'needs_work' | 'not_evaluated';
  evidenceFromConversation: string;
  supportingLearnerResponse: string;
  identifiedProblemEn: string;
  identifiedProblemBn: string;
  explanationEn: string;
  explanationBn: string;
  suggestedCorrection: string;
  betterExample: string;
  confidence: number; // 0-1
  limitationsNoteEn: string;
  limitationsNoteBn: string;
}

export interface TransferSessionEvaluationReport {
  sessionId: string;
  scenarioId: TransferScenarioId;
  evaluatedAt: string;
  taskOutcomeStatus: 'achieved' | 'partially_achieved' | 'not_achieved';
  languageCorrectnessNoteEn: string;
  languageCorrectnessNoteBn: string;
  taskVsLanguageDistinctionEn: string;
  taskVsLanguageDistinctionBn: string;
  scoringMethodologyEn: string;
  scoringMethodologyBn: string;
  evaluatedDimensionCount: number;
  overallScore: number | null;
  passed: boolean;
  objectives: TransferObjectiveProgress[];
  dimensions: TransferDimensionEvaluation[];
  strengths: string[];
  detectedMistakes: SpeakingDetectedMistake[];
  naturalModelResponse: string;
  coachSummaryEn: string;
  coachSummaryBn: string;
  nextRecommendedActionEn: string;
  nextRecommendedActionBn: string;
}

export interface TransferConversationTurn {
  id: string;
  role: 'ai' | 'learner';
  text: string;
  hintBn?: string;
  timestamp: string;
  inputChannel?: SpeakingInputChannel;
  audioBlobKey?: string;
  audioDurationSeconds?: number;
  transcriptionSource?: 'gemini_transcribe' | 'browser_stt' | 'manual_text';
  coachNudgeEn?: string;
  coachNudgeBn?: string;
}

export interface TransferSessionDraft {
  sessionId: string;
  scenarioId: TransferScenarioId;
  pressureLevel: PressureLadderLevelId;
  interactionMode: TransferInteractionMode;
  startedAt: string;
  updatedAt: string;
  elapsedSeconds: number;
  messages: TransferConversationTurn[];
  objectives: TransferObjectiveProgress[];
  currentPhaseLabel: string;
  draftInput: string;
  voiceConsentGranted: boolean;
  retainAudioConsent: boolean;
  adaptationSummaryEn?: string;
  adaptationSummaryBn?: string;
}

export interface TransferRubricDimensionScore {
  score: number; // 0-100
  feedbackEn: string;
  feedbackBn: string;
}

export interface TransferRubricEvaluation {
  task_completion: TransferRubricDimensionScore;
  target_grammar_application: TransferRubricDimensionScore;
  contextual_appropriateness: TransferRubricDimensionScore;
  response_relevance: TransferRubricDimensionScore;
  overall_score: number;
  passed: boolean;
  strengths: string[];
  detected_mistakes: SpeakingDetectedMistake[];
  natural_model_response: string;
  coach_summary_en: string;
  coach_summary_bn: string;
  unexpected_twist_en?: string;
  unexpected_twist_bn?: string;
  /** Optional full Part 11 8-dimension + objective criteria evaluation report */
  part11Report?: TransferSessionEvaluationReport;
}

export interface TransferAttemptRecord {
  id: string;
  userId: string;
  scenarioId: TransferScenarioId;
  pressureLevel: PressureLadderLevelId;
  targetSkillLabelEn: string;
  targetSkillLabelBn: string;
  linkedSourceType: 'mistake_memory' | 'academy_lesson' | 'baseline';
  linkedSourceId?: string;
  userResponse: string;
  twistPromptShown?: string;
  twistResponse?: string;
  /** Full multi-turn conversation transcript when completed in Part 11 Immersive Room (Part 12 Replay ready) */
  transcript?: TransferConversationTurn[];
  inputChannel: SpeakingInputChannel;
  durationSeconds: number;
  timedOut: boolean;
  evaluation: TransferRubricEvaluation;
  passed: boolean;
  completedAt: string;
}

export type XpActionSourceType =
  | 'lesson_completed'
  | 'lesson_mastery_tier'
  | 'speaking_session_completed'
  | 'mistake_resolved'
  | 'transfer_lab_passed';

export interface XpLedgerEntry {
  id: string;
  userId: string;
  /** Deterministic key preventing duplicate XP farming on reload or resubmission */
  idempotencyKey: string;
  sourceType: XpActionSourceType;
  sourceId: string;
  titleEn: string;
  titleBn: string;
  detailEn: string;
  detailBn: string;
  xpEarned: number;
  verifiedAt: string;
}

// ============================================================================
// Phase 6: Admin Control Center, AI Operations & Privacy Governance
// ============================================================================

export type AdminPermission =
  | 'admin:access'
  | 'overview:read'
  | 'users:manage'
  | 'curriculum:write'
  | 'ai_ops:read'
  | 'mistakes:review'
  | 'audit:read'
  | 'rbac:manage';

export interface AiTelemetryEvent {
  id: string;
  correlationId: string;
  userId?: string;
  endpoint:
    | 'speaking_evaluate'
    | 'transfer_evaluate'
    | 'transfer_turn'
    | 'transfer_session_evaluate'
    | 'transfer_transcribe'
    | 'transfer_tts'
    | 'landing_analyze'
    | 'academy_assist'
    | 'mistake_coach'
    | 'dna_analyze';
  model: string;
  promptVersion: string;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  status: 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export type AuditResourceType =
  | 'curriculum'
  | 'mistake_review'
  | 'privacy_consent'
  | 'data_export'
  | 'recordings_purge'
  | 'account_deletion'
  | 'rbac_role'
  | 'user_account'
  | 'email_verification';

export interface AuditLogEntry {
  id: string;
  correlationId: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: AdminRole;
  action: string;
  resourceType: AuditResourceType;
  resourceId: string;
  summaryEn: string;
  summaryBn: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp: string;
}

export interface CustomCurriculumOverlay {
  schemaVersion: number;
  catalogVersion: number;
  customCourses: CurriculumCourse[];
  customModules: CurriculumModule[];
  customLessons: CurriculumLesson[];
  updatedAt: string;
}

// ============================================================================
// Part 12: Communication Replay — Unified Session Review, Timeline & Diff
// ============================================================================

export type ReplaySourceType = 'speaking_studio' | 'transfer_lab';

export type ReplayReviewStatus = 'unreviewed' | 'in_review' | 'reviewed';

export type ReplayAudioStatus =
  | 'available'
  | 'missing_recording'
  | 'text_only'
  | 'unauthorized';

export interface ReplaySessionReviewRecord {
  sessionId: string;
  source: ReplaySourceType;
  status: ReplayReviewStatus;
  startedReviewAt?: string;
  updatedAt: string;
  reviewedAt?: string;
  lastReviewedTurnId?: string;
  reviewedComparisonIds?: string[];
  learnerNote?: string;
}

export interface ReplayTranscriptTurn {
  id: string;
  turnIndex: number;
  speaker: 'ai' | 'learner';
  speakerLabelEn: string;
  speakerLabelBn: string;
  text: string;
  hintBn?: string;
  timestamp: string;
  hasValidTimestamp?: boolean;
  inputChannel?: SpeakingInputChannel;
  audioBlobKey?: string;
  audioDurationSeconds?: number;
  hasAuthorizedAudioKey: boolean;
  correctedText?: string;
  naturalAlternative?: string;
  mistakeCount: number;
  coachNudgeEn?: string;
  coachNudgeBn?: string;
}

export interface ReplayMistakeEvent {
  id: string;
  turnId?: string;
  turnIndex?: number;
  category: string;
  detectionSourceEn: string;
  detectionSourceBn: string;
  original: string;
  corrected: string;
  explanationEn: string;
  explanationBn: string;
  severity: MistakeSeverity;
  confidence: number;
  syncedToMemory: boolean;
  memoryItemId?: string;
  memoryStatus?: MistakeStatus;
  memoryOccurrences?: number;
  practiceLink: string;
}

export interface ReplayComparisonItem {
  id: string;
  turnIndex: number;
  turnId: string;
  original: string;
  corrected: string;
  naturalAlternative?: string;
  explanationEn?: string;
  explanationBn?: string;
  hasChanges: boolean;
  mistakeCategories: string[];
}

export interface ReplayDimensionSnapshot {
  key: string;
  labelEn: string;
  labelBn: string;
  evaluated: boolean;
  score: number | null;
  verdict?: string;
  evidence?: string;
  explanationEn?: string;
  explanationBn?: string;
  methodologyEn?: string;
  limitationsEn?: string;
  limitationsBn?: string;
}

export interface ReplayAnalysisSnapshot {
  hasEvaluation: boolean;
  evaluationType: 'transfer_8d' | 'transfer_4rubric' | 'speaking_turns' | 'missing';
  methodologyVersion: string;
  overallScore: number | null;
  passed: boolean | null;
  taskOutcomeStatus?: 'achieved' | 'partially_achieved' | 'not_achieved';
  summaryEn: string;
  summaryBn: string;
  taskVsLanguageEn?: string;
  taskVsLanguageBn?: string;
  strengths: string[];
  dimensions: ReplayDimensionSnapshot[];
  objectives: TransferObjectiveProgress[];
  pronunciationNotes: string[];
  nonAcousticDisclosureEn: string;
  nonAcousticDisclosureBn: string;
  nextRecommendedActionEn?: string;
  nextRecommendedActionBn?: string;
}

export interface ReplayCorrectionDeepDive {
  provenance: 'newly_generated_ai_suggestion';
  promptVersion: string;
  model: string;
  generatedAt: string;
  grammarExplanationEn: string;
  grammarExplanationBn: string;
  vocabularyImprovementEn: string;
  naturalPhrasingEn: string;
  contextualAlternativeEn: string;
  formalVersionEn: string;
  informalVersionEn: string;
  newContextExampleEn: string;
  practiceChallengeEn: string;
  practiceChallengeBn: string;
}

export interface ReplaySessionAiSummary {
  provenance: 'newly_generated_ai_summary';
  promptVersion: string;
  model: string;
  generatedAt: string;
  summaryEn: string;
  summaryBn: string;
  evidenceBackedPatterns: Array<{
    patternEn: string;
    supportingQuote: string;
    limitationEn: string;
  }>;
  nextPracticeFocusEn: string;
  nextPracticeFocusBn: string;
}

/**
 * Strictly separate Response Replay Practice record.
 * Never mutates or overwrites historical SpeakingSessionRecord or TransferAttemptRecord.
 */
export interface ReplayPracticeAttemptRecord {
  id: string;
  userId: string;
  sessionId: string;
  source: ReplaySourceType;
  turnId: string;
  originalResponse: string;
  correctedReference?: string;
  learnerRetryText: string;
  correctionHiddenDuringAttempt: boolean;
  createdAt: string;
  aiFeedback?: {
    provenance: 'newly_generated_practice_feedback';
    promptVersion: string;
    model: string;
    improvedClarity: boolean;
    feedbackEn: string;
    feedbackBn: string;
    improvedVersionEn: string;
    remainingIssueEn?: string;
    nonAcousticNoteEn: string;
  };
}

export interface ReplayDnaEvidenceContribution {
  dnaDimensionId: string;
  labelEn: string;
  labelBn: string;
  contributed: boolean;
  reasonEn: string;
  reasonBn: string;
  sourceLabelEn: string;
  assessedAt?: string;
  methodologyVersion: string;
}

export interface UnifiedReplaySession {
  id: string;
  userId: string;
  source: ReplaySourceType;
  sourceId: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  targetLanguage: string;
  scenarioCategory: string;
  categoryLabelEn: string;
  categoryLabelBn: string;
  pressureLabelEn: string;
  pressureLabelBn: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  inputChannel: SpeakingInputChannel;
  hasTranscript: boolean;
  transcriptGapReasonEn?: string;
  transcriptGapReasonBn?: string;
  turns: ReplayTranscriptTurn[];
  learnerTurnCount: number;
  aiTurnCount: number;
  mistakes: ReplayMistakeEvent[];
  comparisons: ReplayComparisonItem[];
  analysis: ReplayAnalysisSnapshot;
  audioKeyCount: number;
  authorizedAudioKeys: string[];
  reviewStatus: ReplayReviewStatus;
  startedReviewAt?: string;
  reviewedAt?: string;
  lastReviewedTurnId?: string;
  reviewedComparisonIds: string[];
  learnerNote?: string;
  retryRoute: string;
  retryLabelEn: string;
  retryLabelBn: string;
}

/**
 * Planned Cloudflare D1 / R2 cloud synchronization contract for Communication Replay.
 * Currently NOT deployed in this runtime (localStorage + IndexedDB only).
 */
export interface ReplayCloudSyncContract {
  deploymentStatus: 'not_deployed_local_only';
  plannedEndpoints: {
    listSessions: '/api/v1/replay/sessions';
    updateReviewState: '/api/v1/replay/sessions/:sessionId/review';
    getSignedAudioUrl: '/api/v1/replay/audio/:audioKey';
    deleteRecording: '/api/v1/replay/sessions/:sessionId/recording';
  };
  plannedTables: readonly ['speaking_sessions', 'transfer_attempts', 'replay_session_reviews', 'replay_practice_attempts', 'audio_assets'];
  plannedObjectStore: 'cloudflare_r2_private_audio_bucket';
}





