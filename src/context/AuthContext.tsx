import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  repository,
  type LoginPayload,
  type RecordExerciseAttemptPayload,
  type RecordLessonAttemptPayload,
  type RecordMistakeDrillPayload,
  type RecordTransferAttemptPayload,
  type RegisterPayload,
  type ReportFalseCorrectionPayload,
  type ReviewFlaggedMistakePayload,
  type SaveSpeakingSessionPayload,
  type UpdateProfilePayload,
} from '../services/storage';
import { computeTotalVerifiedXp } from '../domain/gamificationEngine';
import { appendAuditLog } from '../services/governanceStore';
import { clearAllAudioBlobs } from '../utils/audioBlobStore';
import type {
  ActivityLedgerSummary,
  DiagnosticUserAnswer,
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
} from '../types/domain';
import { useLanguage } from '../i18n/LanguageContext';

const ZERO_ACTIVITY: ActivityLedgerSummary = {
  completedLessons: 0,
  completedSpeakingSessions: 0,
  completedTransferDrills: 0,
  activeStreakDays: 0,
  totalPracticeMinutes: 0,
};

interface AuthContextValue {
  isHydrating: boolean;
  user: UserAccount | null;
  profile: LearnerProfile | null;
  latestDiagnostic: EvidenceStartingProfile | null;
  mistakes: MistakeMemoryItem[];
  lessonAttempts: LessonAttemptRecord[];
  exerciseAttempts: ExerciseAttemptRecord[];
  lessonMastery: Record<string, LessonMasteryRecord>;
  speakingSessions: SpeakingSessionRecord[];
  mistakeDrillAttempts: MistakeDrillAttemptRecord[];
  transferAttempts: TransferAttemptRecord[];
  xpLedger: XpLedgerEntry[];
  totalVerifiedXp: number;
  activitySummary: ActivityLedgerSummary;
  storageMode: 'local' | 'cloudflare-d1';
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<void>;
  submitDiagnostic: (answers: DiagnosticUserAnswer[]) => Promise<EvidenceStartingProfile>;
  recordExerciseAttempt: (payload: RecordExerciseAttemptPayload) => Promise<{
    exerciseAttempt: ExerciseAttemptRecord;
    loggedMistake: MistakeMemoryItem | null;
  }>;
  recordLessonAttempt: (payload: RecordLessonAttemptPayload) => Promise<{
    lessonAttempt: LessonAttemptRecord;
    mastery: LessonMasteryRecord | null;
    newlyAwardedXp: XpLedgerEntry[];
  }>;
  saveSpeakingSession: (payload: SaveSpeakingSessionPayload) => Promise<{
    session: SpeakingSessionRecord;
    newlyAwardedXp: XpLedgerEntry[];
  }>;
  recordMistakeDrillAttempt: (
    payload: RecordMistakeDrillPayload
  ) => Promise<{
    drillAttempt: MistakeDrillAttemptRecord;
    updatedMistake: MistakeMemoryItem;
    newlyAwardedXp: XpLedgerEntry[];
  }>;
  reportFalseCorrection: (
    payload: ReportFalseCorrectionPayload
  ) => Promise<MistakeMemoryItem>;
  recordTransferAttempt: (
    payload: RecordTransferAttemptPayload
  ) => Promise<{
    transferAttempt: TransferAttemptRecord;
    newlyAwardedXp: XpLedgerEntry[];
  }>;
  getFlaggedMistakes: () => Promise<MistakeMemoryItem[]>;
  reviewFlaggedMistake: (
    payload: Omit<ReviewFlaggedMistakePayload, 'reviewerEmail'>
  ) => Promise<{
    updatedMistake: MistakeMemoryItem;
    flaggedMistakes: MistakeMemoryItem[];
  }>;
  deleteAllRecordings: () => Promise<{ deletedCount: number }>;
  clearAccount: () => Promise<{ deletedAudioCount: number }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setLang } = useLanguage();
  const [isHydrating, setIsHydrating] = useState(true);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [latestDiagnostic, setLatestDiagnostic] = useState<EvidenceStartingProfile | null>(null);
  const [mistakes, setMistakes] = useState<MistakeMemoryItem[]>([]);
  const [lessonAttempts, setLessonAttempts] = useState<LessonAttemptRecord[]>([]);
  const [exerciseAttempts, setExerciseAttempts] = useState<ExerciseAttemptRecord[]>([]);
  const [lessonMastery, setLessonMastery] = useState<Record<string, LessonMasteryRecord>>({});
  const [speakingSessions, setSpeakingSessions] = useState<SpeakingSessionRecord[]>([]);
  const [mistakeDrillAttempts, setMistakeDrillAttempts] = useState<MistakeDrillAttemptRecord[]>([]);
  const [transferAttempts, setTransferAttempts] = useState<TransferAttemptRecord[]>([]);
  const [xpLedger, setXpLedger] = useState<XpLedgerEntry[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivityLedgerSummary>(ZERO_ACTIVITY);

  const totalVerifiedXp = useMemo(() => computeTotalVerifiedXp(xpLedger), [xpLedger]);

  const hydrateFromResult = useCallback(
    (result: Awaited<ReturnType<typeof repository.restoreSession>>) => {
      if (!result) return;
      setUser(result.user);
      setProfile(result.profile);
      setLatestDiagnostic(result.latestDiagnostic);
      setMistakes(result.mistakes);
      setLessonAttempts(result.lessonAttempts);
      setExerciseAttempts(result.exerciseAttempts);
      setLessonMastery(result.lessonMastery);
      setSpeakingSessions(result.speakingSessions);
      setMistakeDrillAttempts(result.mistakeDrillAttempts ?? []);
      setTransferAttempts(result.transferAttempts ?? []);
      setXpLedger(result.xpLedger ?? []);
      setActivitySummary(result.activitySummary);
      if (result.profile.onboardingCompleted) {
        setLang(result.profile.preferredUiLanguage);
      }
    },
    [setLang]
  );

  useEffect(() => {
    let active = true;
    repository
      .restoreSession()
      .then((result) => {
        if (!active) return;
        hydrateFromResult(result);
      })
      .finally(() => {
        if (active) setIsHydrating(false);
      });

    return () => {
      active = false;
    };
  }, [hydrateFromResult]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await repository.register(payload);
    setUser(result.user);
    setProfile(result.profile);
    setLatestDiagnostic(result.latestDiagnostic);
    setMistakes(result.mistakes);
    setLessonAttempts(result.lessonAttempts);
    setExerciseAttempts(result.exerciseAttempts);
    setLessonMastery(result.lessonMastery);
    setSpeakingSessions(result.speakingSessions);
    setMistakeDrillAttempts(result.mistakeDrillAttempts ?? []);
    setTransferAttempts(result.transferAttempts ?? []);
    setXpLedger(result.xpLedger ?? []);
    setActivitySummary(result.activitySummary);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await repository.login(payload);
      hydrateFromResult(result);
    },
    [hydrateFromResult]
  );

  const logout = useCallback(async () => {
    await repository.logout();
    setUser(null);
    setProfile(null);
    setLatestDiagnostic(null);
    setMistakes([]);
    setLessonAttempts([]);
    setExerciseAttempts([]);
    setLessonMastery({});
    setSpeakingSessions([]);
    setMistakeDrillAttempts([]);
    setTransferAttempts([]);
    setXpLedger([]);
    setActivitySummary(ZERO_ACTIVITY);
  }, []);

  const updateProfile = useCallback(
    async (patch: UpdateProfilePayload) => {
      if (!user) throw new Error('Not authenticated.');
      const updated = await repository.updateProfile(user.id, patch);
      setUser(updated.user);
      setProfile(updated.profile);
      setLessonMastery(updated.lessonMastery);
      if (patch.preferredUiLanguage) {
        setLang(patch.preferredUiLanguage);
      }
    },
    [user, setLang]
  );

  const submitDiagnostic = useCallback(
    async (answers: DiagnosticUserAnswer[]) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.submitDiagnostic(user.id, answers);
      setProfile(res.profile);
      setLatestDiagnostic(res.diagnostic);
      setMistakes(res.mistakes);
      return res.diagnostic;
    },
    [user]
  );

  const recordExerciseAttempt = useCallback(
    async (payload: RecordExerciseAttemptPayload) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.recordExerciseAttempt(user.id, payload);
      setExerciseAttempts((prev) => [...prev, res.exerciseAttempt]);
      setMistakes(res.mistakes);
      return {
        exerciseAttempt: res.exerciseAttempt,
        loggedMistake: res.loggedMistake,
      };
    },
    [user]
  );

  const recordLessonAttempt = useCallback(
    async (payload: RecordLessonAttemptPayload) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.recordLessonAttempt(user.id, payload);
      setLessonAttempts(res.lessonAttempts);
      setLessonMastery(res.lessonMastery);
      setXpLedger(res.xpLedger);
      setActivitySummary(res.activitySummary);
      return {
        lessonAttempt: res.lessonAttempt,
        mastery: res.lessonMastery[payload.lessonId] ?? null,
        newlyAwardedXp: res.newlyAwardedXp,
      };
    },
    [user]
  );

  const saveSpeakingSession = useCallback(
    async (payload: SaveSpeakingSessionPayload) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.saveSpeakingSession(user.id, payload);
      setSpeakingSessions(res.speakingSessions);
      setMistakes(res.mistakes);
      setXpLedger(res.xpLedger);
      setActivitySummary(res.activitySummary);
      return {
        session: res.session,
        newlyAwardedXp: res.newlyAwardedXp,
      };
    },
    [user]
  );

  const recordMistakeDrillAttempt = useCallback(
    async (payload: RecordMistakeDrillPayload) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.recordMistakeDrillAttempt(user.id, payload);
      setMistakeDrillAttempts(res.mistakeDrillAttempts);
      setMistakes(res.mistakes);
      setXpLedger(res.xpLedger);
      setActivitySummary(res.activitySummary);
      return {
        drillAttempt: res.drillAttempt,
        updatedMistake: res.updatedMistake,
        newlyAwardedXp: res.newlyAwardedXp,
      };
    },
    [user]
  );

  const reportFalseCorrection = useCallback(
    async (payload: ReportFalseCorrectionPayload) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.reportFalseCorrection(user.id, payload);
      setMistakes(res.mistakes);
      return res.updatedMistake;
    },
    [user]
  );

  const recordTransferAttempt = useCallback(
    async (payload: RecordTransferAttemptPayload) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.recordTransferAttempt(user.id, payload);
      setTransferAttempts(res.transferAttempts);
      setMistakes(res.mistakes);
      setXpLedger(res.xpLedger);
      setActivitySummary(res.activitySummary);
      return {
        transferAttempt: res.transferAttempt,
        newlyAwardedXp: res.newlyAwardedXp,
      };
    },
    [user]
  );

  const getFlaggedMistakes = useCallback(async () => {
    return repository.getFlaggedMistakes();
  }, []);

  const reviewFlaggedMistake = useCallback(
    async (payload: Omit<ReviewFlaggedMistakePayload, 'reviewerEmail'>) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.reviewFlaggedMistake({
        ...payload,
        reviewerEmail: user.email,
      });
      if (res.updatedMistake.userId === user.id && res.userMistakes) {
        setMistakes(res.userMistakes);
      }
      return {
        updatedMistake: res.updatedMistake,
        flaggedMistakes: res.flaggedMistakes,
      };
    },
    [user]
  );

  const deleteAllRecordings = useCallback(async () => {
    const result = await clearAllAudioBlobs();
    if (user) {
      appendAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        actorRole: user.role ?? 'learner',
        action: 'privacy.recordings_purged',
        resourceType: 'recordings_purge',
        resourceId: user.id,
        summaryEn: `Verified purge of ${result.deletedCount} stored IndexedDB voice recording(s).`,
        summaryBn: `সংরক্ষিত ${result.deletedCount}টি ভয়েস রেকর্ডিং যাচাইপূর্বক মুছে ফেলা হয়েছে।`,
        metadata: { deletedCount: result.deletedCount },
      });
    }
    return result;
  }, [user]);

  const clearAccount = useCallback(async () => {
    if (!user) return { deletedAudioCount: 0 };
    const { deletedCount } = await clearAllAudioBlobs();
    appendAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role ?? 'learner',
      action: 'privacy.account_deleted',
      resourceType: 'account_deletion',
      resourceId: user.id,
      summaryEn: `Verified deletion of account ${user.email} and ${deletedCount} voice recording(s).`,
      summaryBn: `${user.email} অ্যাকাউন্ট এবং ${deletedCount}টি ভয়েস রেকর্ডিং সম্পূর্ণভাবে মুছে ফেলা হয়েছে।`,
      metadata: { deletedAudioCount: deletedCount },
    });
    await repository.clearLocalAccountData(user.id);
    setUser(null);
    setProfile(null);
    setLatestDiagnostic(null);
    setMistakes([]);
    setLessonAttempts([]);
    setExerciseAttempts([]);
    setLessonMastery({});
    setSpeakingSessions([]);
    setMistakeDrillAttempts([]);
    setTransferAttempts([]);
    setXpLedger([]);
    setActivitySummary(ZERO_ACTIVITY);
    return { deletedAudioCount: deletedCount };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        isHydrating,
        user,
        profile,
        latestDiagnostic,
        mistakes,
        lessonAttempts,
        exerciseAttempts,
        lessonMastery,
        speakingSessions,
        mistakeDrillAttempts,
        transferAttempts,
        xpLedger,
        totalVerifiedXp,
        activitySummary,
        storageMode: repository.mode,
        register,
        login,
        logout,
        updateProfile,
        submitDiagnostic,
        recordExerciseAttempt,
        recordLessonAttempt,
        saveSpeakingSession,
        recordMistakeDrillAttempt,
        reportFalseCorrection,
        recordTransferAttempt,
        getFlaggedMistakes,
        reviewFlaggedMistake,
        deleteAllRecordings,
        clearAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
