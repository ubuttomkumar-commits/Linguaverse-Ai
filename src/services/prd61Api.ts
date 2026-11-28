import { buildCsrfHeaders } from './authApi';
import { attachAuthBearerHeader, getApiCredentialsMode, resolveApiUrl } from './apiBase';
import { fetchWithTimeout, sharedQueryCache } from './queryCache';
import type {
  AiRuntimeConfig,
  PlatformFeatureFlags,
  ProviderId,
  ProviderStatusView,
} from '../domain/aiProviderRegistry';
import type {
  IeltsExamAttemptRecord,
  IeltsExamTask,
} from '../domain/ieltsExamEngine';
import type {
  HumanBridgeLogRecord,
  ShadowingPhraseItem,
  WRITING_MODES,
  WritingDiaryEntryRecord,
  WritingModeId,
} from '../domain/advancedLearningLabsEngine';
import type {
  PersistedUserNotification,
  UserNotificationPreferences,
} from '../domain/notificationsEngine';

export type WritingModeDefinition = (typeof WRITING_MODES)[number];
export type IeltsPracticeTask = IeltsExamTask;
export type NotificationPreferences = UserNotificationPreferences;
export type UserNotificationRecord = PersistedUserNotification;

async function prd61FetchJson<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const isMutation = method !== 'GET';
  let headers: Record<string, string> = isMutation
    ? await buildCsrfHeaders({ 'Content-Type': 'application/json' })
    : {};
  headers = attachAuthBearerHeader(headers);

  const response = await fetchWithTimeout(
    resolveApiUrl(path),
    {
      method,
      credentials: getApiCredentialsMode(),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    },
    12_000
  );

  const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

// ============================================================================
// 1. Public Platform Status (Maintenance Mode & Feature Flags)
// ============================================================================
export interface PublicSystemStatusResponse {
  ok: boolean;
  maintenanceMode: boolean;
  maintenanceBannerEn: string;
  maintenanceBannerBn: string;
  allowNewRegistrations: boolean;
  featureFlags: PlatformFeatureFlags;
}

const SYSTEM_STATUS_CACHE_KEY = 'public:system_status';
const LEARNER_NOTIFICATIONS_CACHE_KEY = 'learner:notifications';

export function invalidateSystemStatusCache(): void {
  sharedQueryCache.invalidate(SYSTEM_STATUS_CACHE_KEY);
}

export function invalidateNotificationsCache(): void {
  sharedQueryCache.invalidate(LEARNER_NOTIFICATIONS_CACHE_KEY);
}

export function clearPrd61ClientCache(): void {
  sharedQueryCache.clear();
}

export function fetchPublicSystemStatus(options?: {
  forceRefresh?: boolean;
}): Promise<PublicSystemStatusResponse> {
  return sharedQueryCache.fetchWithCache(
    SYSTEM_STATUS_CACHE_KEY,
    () => prd61FetchJson<PublicSystemStatusResponse>('/api/v1/system/status'),
    {
      ttlMs: 60_000,
      staleWhileRevalidateMs: 120_000,
      forceRefresh: options?.forceRefresh,
    }
  );
}

// ============================================================================
// 2. Admin Feature Flags, AI Providers & System Health
// ============================================================================
export function fetchAdminFeatureFlags(): Promise<{ featureFlags: PlatformFeatureFlags }> {
  return prd61FetchJson('/api/v1/admin/feature-flags');
}

export function updateAdminFeatureFlags(
  patch: Partial<PlatformFeatureFlags>
): Promise<{ featureFlags: PlatformFeatureFlags }> {
  return prd61FetchJson('/api/v1/admin/feature-flags', {
    method: 'PUT',
    body: patch,
  });
}

export interface AdminAiProvidersResponse {
  runtimeConfig: AiRuntimeConfig;
  providers: ProviderStatusView[];
  supportedModels: {
    text: readonly string[];
    transcribe: readonly string[];
    tts: readonly string[];
  };
  productionSecretGuidance: string;
}

export function fetchAdminAiProviders(): Promise<AdminAiProvidersResponse> {
  return prd61FetchJson('/api/v1/admin/ai-providers');
}

export function updateAdminAiRuntimeConfig(
  patch: Partial<AiRuntimeConfig>
): Promise<{ runtimeConfig: AiRuntimeConfig; providers: ProviderStatusView[] }> {
  return prd61FetchJson('/api/v1/admin/ai-providers', {
    method: 'PUT',
    body: patch,
  });
}

export function rotateAdminProviderKey(
  providerId: ProviderId,
  payload: { secretValue?: string; clear?: boolean }
): Promise<{
  ok: boolean;
  providerId: ProviderId;
  action: 'rotated' | 'cleared';
  providers: ProviderStatusView[];
}> {
  return prd61FetchJson(`/api/v1/admin/ai-providers/${encodeURIComponent(providerId)}/rotate-key`, {
    method: 'POST',
    body: payload,
  });
}

export function checkAdminProviderHealth(providerId: ProviderId): Promise<{
  providerId: ProviderId;
  ok: boolean;
  status: string;
  latencyMs: number;
  message: string;
  providers: ProviderStatusView[];
}> {
  return prd61FetchJson(`/api/v1/admin/ai-providers/${encodeURIComponent(providerId)}/health`, {
    method: 'POST',
    body: {},
  });
}

export interface AdminSystemHealthResponse {
  ok: boolean;
  runtime: string;
  database: {
    engine: string;
    status: string;
    migrationsReady: string[];
    backupStatus: string;
  };
  counts: {
    totalUsers: number;
    verifiedUsers?: number;
    suspendedUsers?: number;
    examinationAttempts: number;
    writingDiaryEntries: number;
    humanBridgeLogs: number;
    persistedNotifications?: number;
    auditLogs: number;
  };
  providersSummary: Array<{
    id: ProviderId;
    name: string;
    category: string;
    configured: boolean;
    lastHealthStatus: string;
  }>;
  securityEvents: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    category: string;
    actorEmail?: string;
    messageEn: string;
    path?: string;
    createdAt: string;
  }>;
  checkedAt: string;
}

export function fetchAdminSystemHealth(): Promise<AdminSystemHealthResponse> {
  return prd61FetchJson('/api/v1/admin/system-health');
}

export function deleteAdminUserAccount(userId: string): Promise<{ deleted: boolean; id: string }> {
  return prd61FetchJson(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export function broadcastAdminNotification(payload: {
  titleEn: string;
  titleBn?: string;
  bodyEn: string;
  bodyBn?: string;
  actionRoute?: string;
}): Promise<{ notification: UserNotificationRecord }> {
  return prd61FetchJson('/api/v1/admin/notifications/broadcast', {
    method: 'POST',
    body: payload,
  });
}

// ============================================================================
// 3. IELTS & English Examination Preparation
// ============================================================================
export interface IeltsCatalogResponse {
  tasks: IeltsPracticeTask[];
  disclaimerEn: string;
  disclaimerBn: string;
  featureEnabled: boolean;
}

export function fetchIeltsCatalog(): Promise<IeltsCatalogResponse> {
  return prd61FetchJson('/api/v1/examinations/catalog');
}

export function fetchIeltsAttempts(): Promise<{ attempts: IeltsExamAttemptRecord[] }> {
  return prd61FetchJson('/api/v1/examinations/attempts');
}

export function submitIeltsAttempt(payload: {
  taskId: string;
  responseText?: string;
  selectedAnswers?: Record<string, number>;
  durationSeconds: number;
}): Promise<{ attempt: IeltsExamAttemptRecord }> {
  return prd61FetchJson('/api/v1/examinations/evaluate', {
    method: 'POST',
    body: payload,
  });
}

// ============================================================================
// 4. Writing Intelligence, Language Diary, Shadowing & Human Bridge
// ============================================================================
export interface WritingEntriesResponse {
  entries: WritingDiaryEntryRecord[];
  modes: WritingModeDefinition[];
  shadowingPhrases: ShadowingPhraseItem[];
}

export function fetchWritingDiaryEntries(): Promise<WritingEntriesResponse> {
  return prd61FetchJson('/api/v1/writing/entries');
}

export function evaluateWritingDiaryEntry(payload: {
  mode: WritingModeId;
  title: string;
  originalText: string;
}): Promise<{ entry: WritingDiaryEntryRecord }> {
  return prd61FetchJson('/api/v1/writing/evaluate', {
    method: 'POST',
    body: payload,
  });
}

export function saveWritingDiaryRewrite(
  entryId: string,
  rewrittenText: string
): Promise<{ ok?: boolean; entry?: WritingDiaryEntryRecord }> {
  return prd61FetchJson(`/api/v1/writing/entries/${encodeURIComponent(entryId)}/rewrite`, {
    method: 'PATCH',
    body: { rewrittenText },
  });
}

export function fetchHumanBridgeLogs(): Promise<{ logs: HumanBridgeLogRecord[] }> {
  return prd61FetchJson('/api/v1/human-bridge/logs');
}

export function createHumanBridgeLog(payload: {
  scenarioContext: string;
  partnerType: 'colleague' | 'friend' | 'teacher' | 'interviewer' | 'customer_service' | 'other';
  goalEn: string;
  whatWentWell: string;
  whatFeltHard: string;
  selfReportedConfidence: number;
}): Promise<{ log: HumanBridgeLogRecord }> {
  return prd61FetchJson('/api/v1/human-bridge/logs', {
    method: 'POST',
    body: payload,
  });
}

export function deleteHumanBridgeLog(logId: string): Promise<{ deleted: boolean }> {
  return prd61FetchJson(`/api/v1/human-bridge/logs/${encodeURIComponent(logId)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// 5. Learner Notifications & Learning Schedule Preferences
// ============================================================================
export interface NotificationsResponse {
  preferences: NotificationPreferences;
  notifications: UserNotificationRecord[];
}

export function fetchLearnerNotifications(options?: {
  forceRefresh?: boolean;
}): Promise<NotificationsResponse> {
  return sharedQueryCache.fetchWithCache(
    LEARNER_NOTIFICATIONS_CACHE_KEY,
    () => prd61FetchJson<NotificationsResponse>('/api/v1/notifications'),
    {
      ttlMs: 30_000,
      staleWhileRevalidateMs: 60_000,
      forceRefresh: options?.forceRefresh,
    }
  );
}

export function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<{ preferences: NotificationPreferences }> {
  invalidateNotificationsCache();
  return prd61FetchJson('/api/v1/notifications/preferences', {
    method: 'PUT',
    body: patch,
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<{ ok: boolean }> {
  const result = await prd61FetchJson<{ ok: boolean }>(
    `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'POST',
      body: {},
    }
  );
  invalidateNotificationsCache();
  return result;
}
