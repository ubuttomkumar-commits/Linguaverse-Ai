import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_AI_RUNTIME_CONFIG,
  DEFAULT_FEATURE_FLAGS,
  PROVIDER_CATALOG,
  maskSecretFingerprint,
  type AiRuntimeConfig,
  type PlatformFeatureFlags,
  type ProviderId,
  type ProviderStatusView,
} from '../src/domain/aiProviderRegistry.ts';
import type { IeltsExamAttemptRecord } from '../src/domain/ieltsExamEngine.ts';
import type {
  HumanBridgeLogRecord,
  WritingDiaryEntryRecord,
} from '../src/domain/advancedLearningLabsEngine.ts';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type PersistedUserNotification,
  type UserNotificationPreferences,
} from '../src/domain/notificationsEngine.ts';
import type {
  CurriculumCourse,
  CurriculumLesson,
  CurriculumModule,
  CustomCurriculumOverlay,
  MistakeMemoryItem,
} from '../src/types/domain.ts';

export interface SecurityEventRecord {
  id: string;
  eventType: string;
  severity: 'info' | 'warning' | 'high';
  actorEmail?: string;
  path: string;
  summary: string;
  createdAt: string;
}

interface ProviderRuntimeSecretEntry {
  secretValue: string;
  rotatedAt: string;
  rotatedBy: string;
  note: string;
}

interface ProviderHealthSnapshot {
  checkedAt: string;
  status: 'healthy' | 'degraded' | 'unconfigured';
  latencyMs: number | null;
  message: string;
}

interface Prd61StoreFile {
  aiRuntimeConfig: AiRuntimeConfig;
  featureFlags: PlatformFeatureFlags;
  providerSecrets: Partial<Record<ProviderId, ProviderRuntimeSecretEntry>>;
  providerHealth: Partial<Record<ProviderId, ProviderHealthSnapshot>>;
  examinationAttempts: IeltsExamAttemptRecord[];
  writingDiaryEntries: WritingDiaryEntryRecord[];
  humanBridgeLogs: HumanBridgeLogRecord[];
  notificationPreferences: Record<string, UserNotificationPreferences>;
  notifications: PersistedUserNotification[];
  securityEvents: SecurityEventRecord[];
  curriculumOverlay: CustomCurriculumOverlay;
  flaggedMistakes: MistakeMemoryItem[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'prd61-store.json');

function defaultCurriculumOverlay(): CustomCurriculumOverlay {
  return {
    schemaVersion: 1,
    catalogVersion: 1,
    customCourses: [],
    customModules: [],
    customLessons: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function defaultStore(): Prd61StoreFile {
  return {
    aiRuntimeConfig: { ...DEFAULT_AI_RUNTIME_CONFIG },
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    providerSecrets: {},
    providerHealth: {},
    examinationAttempts: [],
    writingDiaryEntries: [],
    humanBridgeLogs: [],
    notificationPreferences: {},
    notifications: [],
    securityEvents: [],
    curriculumOverlay: defaultCurriculumOverlay(),
    flaggedMistakes: [],
  };
}

function readStore(): Prd61StoreFile {
  try {
    if (!fs.existsSync(STORE_PATH)) return defaultStore();
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Prd61StoreFile>;
    const overlay = parsed.curriculumOverlay;
    return {
      aiRuntimeConfig: { ...DEFAULT_AI_RUNTIME_CONFIG, ...(parsed.aiRuntimeConfig ?? {}) },
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...(parsed.featureFlags ?? {}) },
      providerSecrets: parsed.providerSecrets ?? {},
      providerHealth: parsed.providerHealth ?? {},
      examinationAttempts: Array.isArray(parsed.examinationAttempts) ? parsed.examinationAttempts : [],
      writingDiaryEntries: Array.isArray(parsed.writingDiaryEntries) ? parsed.writingDiaryEntries : [],
      humanBridgeLogs: Array.isArray(parsed.humanBridgeLogs) ? parsed.humanBridgeLogs : [],
      notificationPreferences: parsed.notificationPreferences ?? {},
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      securityEvents: Array.isArray(parsed.securityEvents) ? parsed.securityEvents : [],
      curriculumOverlay: overlay
        ? {
            schemaVersion: 1,
            catalogVersion: typeof overlay.catalogVersion === 'number' ? overlay.catalogVersion : 1,
            customCourses: Array.isArray(overlay.customCourses) ? overlay.customCourses : [],
            customModules: Array.isArray(overlay.customModules) ? overlay.customModules : [],
            customLessons: Array.isArray(overlay.customLessons) ? overlay.customLessons : [],
            updatedAt: overlay.updatedAt ?? new Date().toISOString(),
          }
        : defaultCurriculumOverlay(),
      flaggedMistakes: Array.isArray(parsed.flaggedMistakes) ? parsed.flaggedMistakes : [],
    };
  } catch {
    return defaultStore();
  }
}

function writeStore(data: Prd61StoreFile): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${STORE_PATH}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, STORE_PATH);
}

// ============================================================================
// 1. AI Providers, Secret Resolution (Server-Only) & Feature Flags
// ============================================================================
export function getServerAiRuntimeConfig(): AiRuntimeConfig {
  return readStore().aiRuntimeConfig;
}

export function saveServerAiRuntimeConfig(
  patch: Partial<AiRuntimeConfig>,
  updatedBy: string
): AiRuntimeConfig {
  const store = readStore();
  const next: AiRuntimeConfig = {
    ...store.aiRuntimeConfig,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  store.aiRuntimeConfig = next;
  writeStore(store);
  return next;
}

export function getServerFeatureFlags(): PlatformFeatureFlags {
  return readStore().featureFlags;
}

export function saveServerFeatureFlags(
  patch: Partial<PlatformFeatureFlags>,
  updatedBy: string
): PlatformFeatureFlags {
  const store = readStore();
  const next: PlatformFeatureFlags = {
    ...store.featureFlags,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  store.featureFlags = next;
  writeStore(store);
  return next;
}

/**
 * Server-side only credential resolver (runtime admin override -> process.env).
 * NEVER exposed to frontend HTTP responses.
 */
export function resolveServerProviderSecret(providerId: ProviderId): {
  value: string | null;
  source: 'runtime_override' | 'env' | 'unconfigured';
  rotatedAt: string | null;
} {
  const store = readStore();
  const override = store.providerSecrets[providerId];
  if (override?.secretValue?.trim()) {
    return {
      value: override.secretValue.trim(),
      source: 'runtime_override',
      rotatedAt: override.rotatedAt,
    };
  }
  const desc = PROVIDER_CATALOG.find((p) => p.id === providerId);
  if (desc) {
    const primaryEnv = desc.envVarNames[0];
    const envVal = primaryEnv ? (process.env[primaryEnv] ?? '').trim() : '';
    if (envVal) {
      return { value: envVal, source: 'env', rotatedAt: null };
    }
  }
  return { value: null, source: 'unconfigured', rotatedAt: null };
}

export function rotateServerProviderSecret(
  providerId: ProviderId,
  secretValue: string | null,
  actorEmail: string,
  note: string
): { source: 'runtime_override' | 'env' | 'unconfigured'; maskedKey: string | null; rotatedAt: string | null } {
  const store = readStore();
  if (secretValue === null) {
    delete store.providerSecrets[providerId];
  } else {
    store.providerSecrets[providerId] = {
      secretValue,
      rotatedAt: new Date().toISOString(),
      rotatedBy: actorEmail,
      note,
    };
  }
  writeStore(store);
  const resolved = resolveServerProviderSecret(providerId);
  return {
    source: resolved.source,
    maskedKey: maskSecretFingerprint(resolved.value),
    rotatedAt: resolved.rotatedAt,
  };
}

export function recordServerProviderHealth(
  providerId: ProviderId,
  snapshot: ProviderHealthSnapshot
): void {
  const store = readStore();
  store.providerHealth[providerId] = snapshot;
  writeStore(store);
}

export function listServerProviderStatuses(): ProviderStatusView[] {
  const store = readStore();
  return PROVIDER_CATALOG.map((desc) => {
    const resolved = resolveServerProviderSecret(desc.id);
    const allEnvVarsReady =
      resolved.source === 'runtime_override' ||
      desc.envVarNames.every((name) => Boolean((process.env[name] ?? '').trim()));
    const configured = Boolean(resolved.value) && allEnvVarsReady;
    const health = store.providerHealth[desc.id];
    return {
      id: desc.id,
      name: desc.name,
      category: desc.category,
      configured,
      source: configured ? resolved.source : 'unconfigured',
      maskedKey: configured ? maskSecretFingerprint(resolved.value) : null,
      lastRotatedAt: resolved.rotatedAt,
      lastHealthCheckAt: health?.checkedAt ?? null,
      lastHealthStatus: health?.status ?? (configured ? 'unchecked' : 'unconfigured'),
      lastHealthLatencyMs: health?.latencyMs ?? null,
      lastHealthMessage: health?.message ?? null,
      envVarNames: [...desc.envVarNames],
      supportedFeatures: [...desc.supportedFeatures],
      productionSecretCommand: desc.productionSecretCommand,
      notes: desc.notes,
    };
  });
}

// ============================================================================
// 2. Examinations, Writing Diary, Human Bridge & Notifications
// ============================================================================
export function listUserExamAttempts(userId: string): IeltsExamAttemptRecord[] {
  return readStore()
    .examinationAttempts.filter((a) => a.userId === userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function saveUserExamAttempt(
  attempt: Omit<IeltsExamAttemptRecord, 'id' | 'createdAt'>
): IeltsExamAttemptRecord {
  const store = readStore();
  const record: IeltsExamAttemptRecord = {
    ...attempt,
    id: `exam_${crypto.randomBytes(6).toString('hex')}`,
    createdAt: new Date().toISOString(),
  };
  store.examinationAttempts.unshift(record);
  store.examinationAttempts = store.examinationAttempts.slice(0, 500);
  writeStore(store);
  return record;
}

export function listUserWritingDiary(userId: string): WritingDiaryEntryRecord[] {
  return readStore()
    .writingDiaryEntries.filter((e) => e.userId === userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function saveUserWritingDiary(
  entry: Omit<WritingDiaryEntryRecord, 'id' | 'createdAt' | 'updatedAt'>
): WritingDiaryEntryRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const record: WritingDiaryEntryRecord = {
    ...entry,
    id: `wry_${crypto.randomBytes(6).toString('hex')}`,
    createdAt: now,
    updatedAt: now,
  };
  store.writingDiaryEntries.unshift(record);
  store.writingDiaryEntries = store.writingDiaryEntries.slice(0, 500);
  writeStore(store);
  return record;
}

export function updateUserWritingRewrite(
  userId: string,
  entryId: string,
  rewrittenText: string
): WritingDiaryEntryRecord | null {
  const store = readStore();
  const found = store.writingDiaryEntries.find((e) => e.id === entryId && e.userId === userId);
  if (!found) return null;
  found.rewrittenText = rewrittenText.trim().slice(0, 4000);
  found.updatedAt = new Date().toISOString();
  writeStore(store);
  return found;
}

export function listUserHumanBridgeLogs(userId: string): HumanBridgeLogRecord[] {
  return readStore()
    .humanBridgeLogs.filter((l) => l.userId === userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function saveUserHumanBridgeLog(
  userId: string,
  input: Omit<HumanBridgeLogRecord, 'id' | 'userId' | 'evidenceType' | 'createdAt'>
): HumanBridgeLogRecord {
  const store = readStore();
  const record: HumanBridgeLogRecord = {
    id: `hbl_${crypto.randomBytes(6).toString('hex')}`,
    userId,
    ...input,
    evidenceType: 'user_reported',
    createdAt: new Date().toISOString(),
  };
  store.humanBridgeLogs.unshift(record);
  store.humanBridgeLogs = store.humanBridgeLogs.slice(0, 500);
  writeStore(store);
  return record;
}

export function deleteUserHumanBridgeLog(userId: string, logId: string): boolean {
  const store = readStore();
  const before = store.humanBridgeLogs.length;
  store.humanBridgeLogs = store.humanBridgeLogs.filter(
    (l) => !(l.id === logId && l.userId === userId)
  );
  if (store.humanBridgeLogs.length === before) return false;
  writeStore(store);
  return true;
}

export function getUserNotificationPreferences(userId: string): UserNotificationPreferences {
  const store = readStore();
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(store.notificationPreferences[userId] ?? {}),
  };
}

export function saveUserNotificationPreferences(
  userId: string,
  patch: Partial<UserNotificationPreferences>
): UserNotificationPreferences {
  const store = readStore();
  const next: UserNotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(store.notificationPreferences[userId] ?? {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.notificationPreferences[userId] = next;
  writeStore(store);
  return next;
}

export function listUserNotifications(userId: string): PersistedUserNotification[] {
  return readStore()
    .notifications.filter((n) => n.userId === userId || n.userId === '*')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 50);
}

export function createPersistedNotification(
  input: Omit<PersistedUserNotification, 'id' | 'readAt' | 'createdAt'>
): PersistedUserNotification {
  const store = readStore();
  const record: PersistedUserNotification = {
    ...input,
    id: `ntf_${crypto.randomBytes(6).toString('hex')}`,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
  store.notifications.unshift(record);
  store.notifications = store.notifications.slice(0, 300);
  writeStore(store);
  return record;
}

export function markPersistedNotificationRead(userId: string, notificationId: string): boolean {
  const store = readStore();
  const item = store.notifications.find(
    (n) => n.id === notificationId && (n.userId === userId || n.userId === '*')
  );
  if (!item) return false;
  item.readAt = new Date().toISOString();
  writeStore(store);
  return true;
}

export function appendSecurityEvent(
  event: Omit<SecurityEventRecord, 'id' | 'createdAt'>
): SecurityEventRecord {
  const store = readStore();
  const record: SecurityEventRecord = {
    ...event,
    id: `sec_${crypto.randomBytes(6).toString('hex')}`,
    createdAt: new Date().toISOString(),
  };
  store.securityEvents.unshift(record);
  store.securityEvents = store.securityEvents.slice(0, 200);
  writeStore(store);
  return record;
}

export function getPrd61StoreHealthSummary() {
  const store = readStore();
  return {
    examinationAttemptsCount: store.examinationAttempts.length,
    writingDiaryEntriesCount: store.writingDiaryEntries.length,
    humanBridgeLogsCount: store.humanBridgeLogs.length,
    notificationsCount: store.notifications.length,
    customCoursesCount: store.curriculumOverlay.customCourses.length,
    customModulesCount: store.curriculumOverlay.customModules.length,
    customLessonsCount: store.curriculumOverlay.customLessons.length,
    flaggedMistakesCount: store.flaggedMistakes.filter((m) => m.falseCorrectionReported).length,
    securityEvents: store.securityEvents.slice(0, 30),
    featureFlags: store.featureFlags,
    aiRuntimeConfig: store.aiRuntimeConfig,
  };
}

// ============================================================================
// 3. Server-Persisted Admin Curriculum Overlay & Flagged Mistakes Triage
// ============================================================================
export function getServerCurriculumOverlay(): CustomCurriculumOverlay {
  return readStore().curriculumOverlay;
}

export function upsertServerPublishedCourse(course: CurriculumCourse): {
  course: CurriculumCourse;
  overlay: CustomCurriculumOverlay;
} {
  const store = readStore();
  const current = store.curriculumOverlay;
  const idx = current.customCourses.findIndex((c) => c.id === course.id);
  const nextVersion = idx >= 0 ? (current.customCourses[idx].version ?? 1) + 1 : course.version ?? 1;
  const nowIso = new Date().toISOString();
  const saved: CurriculumCourse = {
    ...course,
    version: nextVersion,
    publishedStatus: course.publishedStatus ?? 'published',
    isCustom: true,
    updatedAt: nowIso,
  };
  const nextCourses = [...current.customCourses];
  if (idx >= 0) nextCourses[idx] = saved;
  else nextCourses.push(saved);

  store.curriculumOverlay = {
    ...current,
    catalogVersion: current.catalogVersion + 1,
    customCourses: nextCourses,
    updatedAt: nowIso,
  };
  writeStore(store);
  return { course: saved, overlay: store.curriculumOverlay };
}

export function upsertServerPublishedModule(mod: CurriculumModule): {
  module: CurriculumModule;
  overlay: CustomCurriculumOverlay;
} {
  const store = readStore();
  const current = store.curriculumOverlay;
  const idx = current.customModules.findIndex((m) => m.id === mod.id);
  const nextModules = [...current.customModules];
  if (idx >= 0) nextModules[idx] = mod;
  else nextModules.push(mod);

  store.curriculumOverlay = {
    ...current,
    catalogVersion: current.catalogVersion + 1,
    customModules: nextModules,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return { module: mod, overlay: store.curriculumOverlay };
}

export function upsertServerPublishedLesson(lesson: CurriculumLesson): {
  lesson: CurriculumLesson;
  overlay: CustomCurriculumOverlay;
} {
  const store = readStore();
  const current = store.curriculumOverlay;
  const idx = current.customLessons.findIndex((l) => l.id === lesson.id);
  const nextVersion = idx >= 0 ? (current.customLessons[idx].version ?? 1) + 1 : lesson.version ?? 1;
  const nowIso = new Date().toISOString();
  const saved: CurriculumLesson = {
    ...lesson,
    version: nextVersion,
    publishedStatus: lesson.publishedStatus ?? 'published',
    isCustom: true,
    updatedAt: nowIso,
  };
  const nextLessons = [...current.customLessons];
  if (idx >= 0) nextLessons[idx] = saved;
  else nextLessons.push(saved);

  store.curriculumOverlay = {
    ...current,
    catalogVersion: current.catalogVersion + 1,
    customLessons: nextLessons,
    updatedAt: nowIso,
  };
  writeStore(store);
  return { lesson: saved, overlay: store.curriculumOverlay };
}

export function listServerFlaggedMistakes(): MistakeMemoryItem[] {
  return readStore().flaggedMistakes.filter(
    (m) => m.falseCorrectionReported || Boolean(m.adminReviewStatus)
  );
}

export function upsertServerFlaggedMistake(mistake: MistakeMemoryItem): MistakeMemoryItem {
  const store = readStore();
  const idx = store.flaggedMistakes.findIndex((m) => m.id === mistake.id);
  if (idx >= 0) store.flaggedMistakes[idx] = mistake;
  else store.flaggedMistakes.unshift(mistake);
  store.flaggedMistakes = store.flaggedMistakes.slice(0, 300);
  writeStore(store);
  return mistake;
}

export function reviewServerFlaggedMistake(
  mistakeId: string,
  decision: 'upheld_false_positive' | 'confirmed_accurate',
  reviewerEmail: string,
  note?: string
): { updated: MistakeMemoryItem | null; flaggedMistakes: MistakeMemoryItem[] } {
  const store = readStore();
  const idx = store.flaggedMistakes.findIndex((m) => m.id === mistakeId);
  if (idx < 0) {
    return {
      updated: null,
      flaggedMistakes: store.flaggedMistakes.filter(
        (m) => m.falseCorrectionReported || Boolean(m.adminReviewStatus)
      ),
    };
  }
  const nowIso = new Date().toISOString();
  const existing = store.flaggedMistakes[idx];
  const updated: MistakeMemoryItem = {
    ...existing,
    falseCorrectionReported: decision === 'upheld_false_positive',
    adminReviewStatus: decision,
    adminReviewNote: note?.trim() || undefined,
    adminReviewedAt: nowIso,
    adminReviewedBy: reviewerEmail,
    status: decision === 'upheld_false_positive' ? 'resolved' : existing.status,
  };
  store.flaggedMistakes[idx] = updated;
  writeStore(store);
  return {
    updated,
    flaggedMistakes: store.flaggedMistakes.filter(
      (m) => m.falseCorrectionReported || Boolean(m.adminReviewStatus)
    ),
  };
}

