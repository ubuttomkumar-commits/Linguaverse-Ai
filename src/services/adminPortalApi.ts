import { buildCsrfHeaders } from './authApi';
import { attachAuthBearerHeader, getApiCredentialsMode, resolveApiUrl } from './apiBase';
import {
  clearInMemorySessionToken,
  setInMemorySessionToken,
} from './sessionTokenMemory';
import type {
  AccountStatus,
  AdminRole,
  CurriculumCourse,
  CurriculumLesson,
  CurriculumModule,
  CustomCurriculumOverlay,
  MistakeMemoryItem,
} from '../types/domain';

export interface AdminPortalUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: AdminRole;
  emailVerified: boolean;
  accountStatus: AccountStatus;
  createdAt: string;
}

export interface AdminAuthStatusResponse {
  ok: boolean;
  hasAdminAccount: boolean;
  bootstrapAvailable: boolean;
  requiresBootstrapSecret: boolean;
}

export interface AdminAuthSessionResponse {
  user: AdminPortalUser;
  sessionToken?: string;
  expiresAt?: string;
}

async function adminPortalFetch<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const isMutation = method !== 'GET';
  let headers: Record<string, string> = isMutation
    ? await buildCsrfHeaders({ 'Content-Type': 'application/json' })
    : {};
  headers = attachAuthBearerHeader(headers);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 10_000) : null;

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), {
      method,
      credentials: getApiCredentialsMode(),
      headers,
      signal: controller?.signal,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Administrator API timed out. Please check your connection and retry.');
    }
    throw err;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }

  const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) {
    throw Object.assign(new Error(data.error || `Request failed (${response.status})`), {
      status: response.status,
      code: data.code,
    });
  }
  return data;
}

let inFlightAdminStatus: Promise<AdminAuthStatusResponse> | null = null;

export function fetchAdminAuthStatus(): Promise<AdminAuthStatusResponse> {
  if (!inFlightAdminStatus) {
    inFlightAdminStatus = adminPortalFetch<AdminAuthStatusResponse>('/api/v1/admin/auth/status').finally(() => {
      inFlightAdminStatus = null;
    });
  }
  return inFlightAdminStatus;
}

export async function bootstrapInitialAdmin(payload: {
  name: string;
  email: string;
  password: string;
  bootstrapSecret?: string;
}): Promise<AdminAuthSessionResponse> {
  const res = await adminPortalFetch<AdminAuthSessionResponse>('/api/v1/admin/auth/bootstrap', {
    method: 'POST',
    body: payload,
  });
  if (res.sessionToken) {
    setInMemorySessionToken(res.sessionToken);
  }
  return res;
}

export async function loginAdminPortal(payload: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<AdminAuthSessionResponse> {
  const res = await adminPortalFetch<AdminAuthSessionResponse>('/api/v1/admin/auth/login', {
    method: 'POST',
    body: payload,
  });
  if (res.sessionToken) {
    setInMemorySessionToken(res.sessionToken);
  }
  return res;
}

export async function fetchAdminPortalMe(): Promise<{ user: AdminPortalUser }> {
  return adminPortalFetch<{ user: AdminPortalUser }>('/api/v1/admin/auth/me');
}

export async function logoutAdminPortal(): Promise<void> {
  try {
    await adminPortalFetch<{ ok: boolean }>('/api/v1/admin/auth/logout', {
      method: 'POST',
      body: {},
    });
  } finally {
    clearInMemorySessionToken();
  }
}

export function fetchServerAdminUsers(searchQuery?: string): Promise<{ users: AdminPortalUser[] }> {
  const q = searchQuery?.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : '';
  return adminPortalFetch<{ users: AdminPortalUser[] }>(`/api/v1/admin/users${q}`);
}

export function patchServerAdminUser(
  userId: string,
  patch: { role?: AdminRole; accountStatus?: AccountStatus; plan?: 'free' | 'pro' | 'institution' }
): Promise<{ user: AdminPortalUser; revokedSessions?: number }> {
  return adminPortalFetch<{ user: AdminPortalUser; revokedSessions?: number }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      body: patch,
    }
  );
}

export function fetchServerCurriculumOverlay(): Promise<CustomCurriculumOverlay> {
  return adminPortalFetch<CustomCurriculumOverlay>('/api/v1/curriculum/overlay');
}

export function publishServerCourse(
  course: CurriculumCourse
): Promise<{ id: string; catalogVersion: number; overlay?: CustomCurriculumOverlay }> {
  return adminPortalFetch<{ id: string; catalogVersion: number; overlay?: CustomCurriculumOverlay }>(
    '/api/v1/admin/curriculum/courses',
    { method: 'POST', body: course }
  );
}

export function publishServerModule(
  mod: CurriculumModule
): Promise<{ id: string; courseId: string; overlay?: CustomCurriculumOverlay }> {
  return adminPortalFetch<{ id: string; courseId: string; overlay?: CustomCurriculumOverlay }>(
    '/api/v1/admin/curriculum/modules',
    { method: 'POST', body: mod }
  );
}

export function publishServerLesson(
  lesson: CurriculumLesson
): Promise<{ id: string; catalogVersion: number; overlay?: CustomCurriculumOverlay }> {
  return adminPortalFetch<{ id: string; catalogVersion: number; overlay?: CustomCurriculumOverlay }>(
    '/api/v1/admin/curriculum/lessons',
    { method: 'POST', body: lesson }
  );
}

export async function fetchServerFlaggedMistakes(): Promise<MistakeMemoryItem[]> {
  const res = await adminPortalFetch<{ mistakes?: MistakeMemoryItem[] } | MistakeMemoryItem[]>(
    '/api/v1/admin/flagged-mistakes'
  );
  return Array.isArray(res) ? res : Array.isArray(res.mistakes) ? res.mistakes : [];
}

export function reviewServerFlaggedMistakeApi(
  mistakeId: string,
  payload: { decision: 'upheld_false_positive' | 'confirmed_accurate'; note?: string }
): Promise<{
  ok: boolean;
  mistakeId: string;
  decision: string;
  updatedMistake?: MistakeMemoryItem;
  flaggedMistakes?: MistakeMemoryItem[];
}> {
  return adminPortalFetch(
    `/api/v1/admin/flagged-mistakes/${encodeURIComponent(mistakeId)}/review`,
    { method: 'POST', body: payload }
  );
}

export async function reportServerFalseCorrection(payload: {
  mistake: MistakeMemoryItem;
  reported: boolean;
  reason?: string;
}): Promise<void> {
  await adminPortalFetch('/api/v1/mistakes/report-false-correction', {
    method: 'POST',
    body: {
      mistake: payload.mistake,
      mistakeId: payload.mistake.id,
      reported: payload.reported,
      reason: payload.reason,
    },
  });
}


