import { generateCorrelationId } from '../domain/adminGovernanceEngine';
import { getAllCourses } from '../domain/curriculumData';
import {
  readCustomCurriculumOverlay,
  upsertPublishedCourse,
  upsertPublishedLesson,
  upsertPublishedModule,
} from './curriculumStore';
import {
  appendAuditLog,
  listAiTelemetryEvents,
  listAuditLogs,
} from './governanceStore';
import { repository } from './storage';
import {
  fetchSpeakingHealth,
  requestSpeakingEvaluation,
  type TelemetryOptions,
} from './speakingApi';
import { requestTransferEvaluation } from './transferApi';
import { clearAllAudioBlobs, listAudioBlobKeys } from '../utils/audioBlobStore';
import type { SpeakingEvaluationRequest } from '../domain/speakingEvaluation';
import type { TransferEvaluationRequest } from '../domain/transferLabEngine';
import type {
  AiTelemetryEvent,
  AuditLogEntry,
  CurriculumCourse,
  CurriculumLesson,
  CurriculumModule,
} from '../types/domain';

const TOKEN_STORAGE_KEY = 'linguaverse_cf_token_v1';

function resolveApiBaseUrl(): string | null {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
      : undefined;
  const trimmed = raw?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : null;
}

async function workerFetch<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Correlation-Id', generateCorrelationId('req'));

  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Cloudflare Worker request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Non-JSON response body
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Unified Frontend API Client abstracting Local D1-Ready Adapters vs.
 * Cloudflare Workers (`/api/v1/*`) + D1 + R2 + KV.
 *
 * Setting `VITE_API_BASE_URL=https://api.linguaverse.ai` switches persistence,
 * curriculum publishing, telemetry, and privacy erasure to live Cloudflare Workers
 * with zero UI component rewrites.
 */
export const apiClient = {
  getMode(): 'local' | 'cloudflare-d1' {
    return resolveApiBaseUrl() ? 'cloudflare-d1' : repository.mode;
  },

  getBaseUrl(): string | null {
    return resolveApiBaseUrl();
  },

  repository,

  ai: {
    health: fetchSpeakingHealth,
    evaluateSpeaking: (
      payload: SpeakingEvaluationRequest,
      options?: TelemetryOptions
    ) => requestSpeakingEvaluation(payload, options),
    evaluateTransfer: (
      payload: TransferEvaluationRequest,
      options?: TelemetryOptions
    ) => requestTransferEvaluation(payload, options),
  },

  curriculum: {
    async listCourses(): Promise<CurriculumCourse[]> {
      const base = resolveApiBaseUrl();
      if (base) {
        return workerFetch<CurriculumCourse[]>(base, '/api/v1/curriculum/courses', {
          method: 'GET',
        });
      }
      return getAllCourses();
    },

    async publishCourse(course: CurriculumCourse): Promise<{ catalogVersion: number }> {
      const base = resolveApiBaseUrl();
      if (base) {
        return workerFetch<{ catalogVersion: number }>(
          base,
          '/api/v1/admin/curriculum/courses',
          { method: 'POST', body: JSON.stringify(course) }
        );
      }
      const next = upsertPublishedCourse(course);
      return { catalogVersion: next.catalogVersion };
    },

    async publishModule(mod: CurriculumModule): Promise<{ catalogVersion: number }> {
      const base = resolveApiBaseUrl();
      if (base) {
        return workerFetch<{ catalogVersion: number }>(
          base,
          '/api/v1/admin/curriculum/modules',
          { method: 'POST', body: JSON.stringify(mod) }
        );
      }
      const next = upsertPublishedModule(mod);
      return { catalogVersion: next.catalogVersion };
    },

    async publishLesson(lesson: CurriculumLesson): Promise<{ catalogVersion: number }> {
      const base = resolveApiBaseUrl();
      if (base) {
        return workerFetch<{ catalogVersion: number }>(
          base,
          '/api/v1/admin/curriculum/lessons',
          { method: 'POST', body: JSON.stringify(lesson) }
        );
      }
      const next = upsertPublishedLesson(lesson);
      return { catalogVersion: next.catalogVersion };
    },

    getLocalCatalogVersion(): number {
      return readCustomCurriculumOverlay().catalogVersion;
    },
  },

  governance: {
    async listAiTelemetry(): Promise<AiTelemetryEvent[]> {
      const base = resolveApiBaseUrl();
      if (base) {
        return workerFetch<AiTelemetryEvent[]>(base, '/api/v1/admin/ai-telemetry', {
          method: 'GET',
        });
      }
      return listAiTelemetryEvents();
    },

    async listAuditLogs(): Promise<AuditLogEntry[]> {
      const base = resolveApiBaseUrl();
      if (base) {
        return workerFetch<AuditLogEntry[]>(base, '/api/v1/admin/audit-logs', {
          method: 'GET',
        });
      }
      return listAuditLogs();
    },

    appendAuditLog,
  },

  privacy: {
    async listStoredRecordingKeys(userId?: string): Promise<string[]> {
      const base = resolveApiBaseUrl();
      if (base && userId) {
        return workerFetch<string[]>(
          base,
          `/api/v1/learners/${encodeURIComponent(userId)}/recordings`,
          { method: 'GET' }
        );
      }
      return listAudioBlobKeys();
    },

    async deleteAllRecordings(userId?: string): Promise<{ deletedCount: number }> {
      const base = resolveApiBaseUrl();
      if (base && userId) {
        return workerFetch<{ deletedCount: number }>(
          base,
          `/api/v1/learners/${encodeURIComponent(userId)}/recordings`,
          { method: 'DELETE' }
        );
      }
      return clearAllAudioBlobs();
    },
  },
};
