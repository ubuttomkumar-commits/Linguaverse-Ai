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
  type SubmitDiagnosticOptions,
  type UpdateProfilePayload,
} from '../services/storage';
import { computeTotalVerifiedXp } from '../domain/gamificationEngine';
import { appendAuditLog } from '../services/governanceStore';
import {
  syncServerLogin,
  syncServerLogout,
  syncServerRegister,
} from '../services/authApi';
import { clearAllAudioBlobs } from '../utils/audioBlobStore';
import { clearUserAcademyState } from '../services/academyStateStore';
import { clearUserSpeakingState } from '../services/speakingStateStore';
import { clearUserDnaAnalysisState } from '../services/dnaAnalysisStore';
import { clearUserTransferState } from '../services/transferSessionStore';
import { clearUserReplayState } from '../services/replayStateStore';
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
} from '../types/domain';
import { useLanguage } from '../i18n/LanguageContext';

const ZERO_ACTIVITY: ActivityLedgerSummary = {
  completedLessons: 0,
  completedSpeakingSessions: 0,
  completedTransferDrills: 0,
  activeStreakDays: 0,
  totalPracticeMinutes: 0,
};

const OTP_DELIVERY_SESSION_KEY = 'linguaverse_pending_otp_v1';

function readStoredOtpDelivery(userId: string): EmailOtpDeliveryInfo | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(OTP_DELIVERY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string; info?: EmailOtpDeliveryInfo };
    if (parsed.userId !== userId || !parsed.info) return null;
    return parsed.info;
  } catch {
    return null;
  }
}

function writeStoredOtpDelivery(userId: string | null, info: EmailOtpDeliveryInfo | null): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (!userId || !info) {
      window.sessionStorage.removeItem(OTP_DELIVERY_SESSION_KEY);
    } else {
      window.sessionStorage.setItem(
        OTP_DELIVERY_SESSION_KEY,
        JSON.stringify({ userId, info })
      );
    }
  } catch {
    // Ignore storage errors
  }
}

interface AuthContextValue {
  isHydrating: boolean;
  hydrationError: string | null;
  retryHydration: () => Promise<void>;
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
  pendingOtpDelivery: EmailOtpDeliveryInfo | null;
  register: (payload: RegisterPayload) => Promise<UserAccount>;
  login: (payload: LoginPayload) => Promise<UserAccount>;
  logout: () => Promise<void>;
  verifyEmailOtp: (code: string) => Promise<UserAccount>;
  resendEmailOtp: () => Promise<EmailOtpDeliveryInfo>;
  applyPasswordResetSync: (email: string, newPassword: string) => Promise<void>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<void>;
  submitDiagnostic: (
    answers: DiagnosticUserAnswer[],
    options?: SubmitDiagnosticOptions
  ) => Promise<EvidenceStartingProfile>;
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
  getAdminOverviewStats: (aiCallsCount?: number) => Promise<AdminOverviewStats>;
  listAdminUsers: (searchQuery?: string) => Promise<AdminUserSummary[]>;
  updateAdminUserAccount: (
    targetUserId: string,
    patch: {
      role?: AdminRole;
      accountStatus?: AccountStatus;
      emailVerified?: boolean;
    }
  ) => Promise<AdminUserSummary>;
  deleteAllRecordings: () => Promise<{ deletedCount: number }>;
  clearAccount: () => Promise<{ deletedAudioCount: number }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setLang } = useLanguage();
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
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
  const [pendingOtpDelivery, setPendingOtpDelivery] = useState<EmailOtpDeliveryInfo | null>(null);

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
      if (result.user.emailVerified === false) {
        const otpInfo = result.otpDelivery ?? readStoredOtpDelivery(result.user.id);
        setPendingOtpDelivery(otpInfo);
        if (otpInfo) writeStoredOtpDelivery(result.user.id, otpInfo);
      } else {
        setPendingOtpDelivery(null);
        writeStoredOtpDelivery(null, null);
      }
      if (result.profile.onboardingCompleted) {
        setLang(result.profile.preferredUiLanguage);
      }
    },
    [setLang]
  );

  const runSessionHydration = useCallback(async () => {
    setIsHydrating(true);
    setHydrationError(null);
    try {
      const result = await repository.restoreSession();
      hydrateFromResult(result);
    } catch (err) {
      setHydrationError(
        err instanceof Error
          ? err.message
          : 'Unable to restore your learning session. Please retry.'
      );
    } finally {
      setIsHydrating(false);
    }
  }, [hydrateFromResult]);

  useEffect(() => {
    let active = true;
    setHydrationError(null);
    repository
      .restoreSession()
      .then((result) => {
        if (!active) return;
        hydrateFromResult(result);
      })
      .catch((err) => {
        if (!active) return;
        setHydrationError(
          err instanceof Error
            ? err.message
            : 'Unable to restore your learning session. Please retry.'
        );
      })
      .finally(() => {
        if (active) setIsHydrating(false);
      });

    return () => {
      active = false;
    };
  }, [hydrateFromResult]);

  const register = useCallback(async (payload: RegisterPayload) => {
    // Register in backend auth store (scrypt + rate limiting + CSRF) while preserving learner repository
    await syncServerRegister({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      plan: payload.plan,
    });
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
    const otpInfo = result.otpDelivery ?? null;
    setPendingOtpDelivery(otpInfo);
    writeStoredOtpDelivery(result.user.id, otpInfo);
    return result.user;
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const serverCheck = await syncServerLogin({
        email: payload.email,
        password: payload.password,
        rememberMe: payload.rememberMe,
      });
      if (!serverCheck.ok && serverCheck.status === 429) {
        throw new Error(serverCheck.error || 'Too many sign-in attempts. Please wait and try again.');
      }
      try {
        const result = await repository.login(payload);
        hydrateFromResult(result);
        return result.user;
      } catch (localErr) {
        if (serverCheck.ok && serverCheck.user && repository.hydrateServerUser) {
          const hydrated = await repository.hydrateServerUser({
            id: serverCheck.user.id,
            name: serverCheck.user.name,
            email: serverCheck.user.email,
            password: payload.password,
            role: serverCheck.user.role,
            plan: serverCheck.user.plan,
            emailVerified: serverCheck.user.emailVerified,
            createdAt: serverCheck.user.createdAt,
            rememberMe: payload.rememberMe,
          });
          hydrateFromResult(hydrated);
          return hydrated.user;
        }
        throw localErr;
      }
    },
    [hydrateFromResult]
  );

  const logout = useCallback(async () => {
    await syncServerLogout();
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
    setPendingOtpDelivery(null);
    writeStoredOtpDelivery(null, null);
  }, []);

  const applyPasswordResetSync = useCallback(async (email: string, newPassword: string) => {
    if (repository.syncPasswordAfterReset) {
      await repository.syncPasswordAfterReset(email, newPassword);
    }
    setUser(null);
    setProfile(null);
    setPendingOtpDelivery(null);
    writeStoredOtpDelivery(null, null);
  }, []);

  const verifyEmailOtp = useCallback(
    async (code: string) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.verifyEmailOtp(user.id, code);
      setUser(res.user);
      setPendingOtpDelivery(null);
      writeStoredOtpDelivery(null, null);
      appendAuditLog({
        actorUserId: res.user.id,
        actorEmail: res.user.email,
        actorRole: res.user.role ?? 'learner',
        action: 'auth.email_verified',
        resourceType: 'email_verification',
        resourceId: res.user.id,
        summaryEn: `Verified email address ${res.user.email} via 6-digit OTP.`,
        summaryBn: `৬-সংখ্যার OTP কোড দিয়ে ${res.user.email} ইমেইল যাচাই সম্পন্ন হয়েছে।`,
      });
      return res.user;
    },
    [user]
  );

  const resendEmailOtp = useCallback(async () => {
    if (!user) throw new Error('Not authenticated.');
    const info = await repository.resendEmailOtp(user.id);
    setPendingOtpDelivery(info);
    writeStoredOtpDelivery(user.id, info);
    return info;
  }, [user]);

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
    async (answers: DiagnosticUserAnswer[], options?: SubmitDiagnosticOptions) => {
      if (!user) throw new Error('Not authenticated.');
      const res = await repository.submitDiagnostic(user.id, answers, options);
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

  const getAdminOverviewStats = useCallback(async (aiCallsCount?: number) => {
    return repository.getAdminOverviewStats(aiCallsCount);
  }, []);

  const listAdminUsers = useCallback(async (searchQuery?: string) => {
    return repository.listAdminUsers(searchQuery);
  }, []);

  const updateAdminUserAccount = useCallback(
    async (
      targetUserId: string,
      patch: {
        role?: AdminRole;
        accountStatus?: AccountStatus;
        emailVerified?: boolean;
      }
    ) => {
      const updated = await repository.updateAdminUserAccount(targetUserId, patch);
      if (user && targetUserId === user.id) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                role: updated.role,
                accountStatus: updated.accountStatus,
                emailVerified: updated.emailVerified,
              }
            : prev
        );
      }
      return updated;
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
    clearUserAcademyState(user.id);
    clearUserSpeakingState(user.id);
    clearUserDnaAnalysisState(user.id);
    clearUserTransferState(user.id);
    clearUserReplayState(user.id);
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
        hydrationError,
        retryHydration: runSessionHydration,
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
        pendingOtpDelivery,
        register,
        login,
        logout,
        verifyEmailOtp,
        resendEmailOtp,
        applyPasswordResetSync,
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
        getAdminOverviewStats,
        listAdminUsers,
        updateAdminUserAccount,
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
