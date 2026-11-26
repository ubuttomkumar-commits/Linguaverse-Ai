import type {
  CmsAnalyticsSummary,
  CmsConfig,
  CmsMediaAsset,
} from '../domain/cmsEngine';
import { buildCsrfHeaders } from './authApi';
import { getInMemorySessionToken } from './sessionTokenMemory';

export interface ServerAuditEntry {
  id: string;
  correlationId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  timestamp: string;
}

export interface AdminCmsBundle {
  published: CmsConfig;
  draft: CmsConfig;
  auditLogs: ServerAuditEntry[];
  analytics: CmsAnalyticsSummary;
}

export interface AdminAuthHeaders {
  email: string;
  role: string;
}

const API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : '';

async function buildAdminHeaders(
  _actor: AdminAuthHeaders,
  includeCsrf: boolean
): Promise<Record<string, string>> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getInMemorySessionToken();
  if (token) {
    baseHeaders.Authorization = `Bearer ${token}`;
  }
  if (includeCsrf && !API_BASE) {
    return buildCsrfHeaders(baseHeaders);
  }
  return baseHeaders;
}

export async function fetchPublicCmsConfig(): Promise<CmsConfig> {
  const res = await fetch(`${API_BASE}/api/v1/cms/public`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch public CMS config (${res.status}).`);
  }
  const data = (await res.json()) as { config: CmsConfig };
  return data.config;
}

export async function fetchAdminCmsBundle(
  actor: AdminAuthHeaders
): Promise<AdminCmsBundle> {
  const res = await fetch(`${API_BASE}/api/v1/admin/cms`, {
    method: 'GET',
    credentials: 'include',
    headers: await buildAdminHeaders(actor, false),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Admin CMS request failed (${res.status}).`);
  }
  return (await res.json()) as AdminCmsBundle;
}

export async function saveAdminCmsDraft(
  actor: AdminAuthHeaders,
  patch: Partial<CmsConfig>,
  summary?: string
): Promise<{ draft: CmsConfig; audit: ServerAuditEntry }> {
  const res = await fetch(`${API_BASE}/api/v1/admin/cms/draft`, {
    method: 'PUT',
    credentials: 'include',
    headers: await buildAdminHeaders(actor, true),
    body: JSON.stringify({ patch, summary }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Failed to save CMS draft (${res.status}).`);
  }
  return (await res.json()) as { draft: CmsConfig; audit: ServerAuditEntry };
}

export async function publishAdminCms(
  actor: AdminAuthHeaders,
  patch?: Partial<CmsConfig>
): Promise<{ published: CmsConfig; draft: CmsConfig; audit: ServerAuditEntry }> {
  const res = await fetch(`${API_BASE}/api/v1/admin/cms/publish`, {
    method: 'POST',
    credentials: 'include',
    headers: await buildAdminHeaders(actor, true),
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Failed to publish CMS (${res.status}).`);
  }
  return (await res.json()) as {
    published: CmsConfig;
    draft: CmsConfig;
    audit: ServerAuditEntry;
  };
}

export async function uploadAdminMedia(
  actor: AdminAuthHeaders,
  payload: {
    filename: string;
    mimeType: string;
    dataBase64: string;
    altText?: string;
  }
): Promise<CmsMediaAsset> {
  const res = await fetch(`${API_BASE}/api/v1/admin/media`, {
    method: 'POST',
    credentials: 'include',
    headers: await buildAdminHeaders(actor, true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Media upload failed (${res.status}).`);
  }
  const data = (await res.json()) as { asset: CmsMediaAsset };
  return data.asset;
}

export async function deleteAdminMedia(
  actor: AdminAuthHeaders,
  mediaId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/v1/admin/media/${encodeURIComponent(mediaId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: await buildAdminHeaders(actor, true),
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Failed to delete media (${res.status}).`);
  }
}

export async function trackPublicAnalyticsEvent(
  eventType: string,
  path: string,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, path, metadata }),
      keepalive: true,
    });
  } catch {
    // Non-blocking analytics
  }
}

export interface SubscriptionIntentResponse {
  status: 'payment_provider_not_configured' | 'checkout_ready';
  planSlug: string;
  billingInterval: 'monthly' | 'yearly';
  message: string;
  checkoutUrl?: string;
}

export async function requestSubscriptionIntent(payload: {
  planSlug: string;
  billingInterval: 'monthly' | 'yearly';
}): Promise<SubscriptionIntentResponse> {
  const res = await fetch(`${API_BASE}/api/v1/subscriptions/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return {
      status: 'payment_provider_not_configured',
      planSlug: payload.planSlug,
      billingInterval: payload.billingInterval,
      message:
        'Live billing checkout is not yet configured in this environment. You can start with the Free Plan right now.',
    };
  }
  return (await res.json()) as SubscriptionIntentResponse;
}
