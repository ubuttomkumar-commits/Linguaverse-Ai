import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createDefaultCmsConfig,
  sanitizeCmsConfigPatch,
  sanitizeText,
  validateMediaUpload,
  type CmsAnalyticsSummary,
  type CmsConfig,
  type CmsMediaAsset,
} from '../src/domain/cmsEngine.ts';
import { verifyImageMagicBytes } from '../src/domain/securityPolicy.ts';

interface ServerAuditRecord {
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

interface AnalyticsEventRecord {
  id: string;
  eventType: string;
  path: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

interface PersistedCmsDatabase {
  published: CmsConfig;
  draft: CmsConfig;
  analytics: AnalyticsEventRecord[];
  auditLogs: ServerAuditRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'cms-store.json');

function ensureStorageDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function createInitialDb(): PersistedCmsDatabase {
  const initial = createDefaultCmsConfig();
  return {
    published: initial,
    draft: structuredClone(initial),
    analytics: [],
    auditLogs: [],
  };
}

let cachedDb: PersistedCmsDatabase | null = null;

function loadDb(): PersistedCmsDatabase {
  if (cachedDb) return cachedDb;
  ensureStorageDirs();
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedCmsDatabase>;
      const fallback = createDefaultCmsConfig();
      cachedDb = {
        published: parsed.published
          ? { ...fallback, ...parsed.published }
          : fallback,
        draft: parsed.draft
          ? { ...fallback, ...parsed.draft }
          : parsed.published
            ? structuredClone({ ...fallback, ...parsed.published })
            : structuredClone(fallback),
        analytics: Array.isArray(parsed.analytics) ? parsed.analytics : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      };
      return cachedDb;
    } catch {
      cachedDb = createInitialDb();
      return cachedDb;
    }
  }
  cachedDb = createInitialDb();
  persistDb(cachedDb);
  return cachedDb;
}

function persistDb(db: PersistedCmsDatabase): void {
  ensureStorageDirs();
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function addAudit(
  db: PersistedCmsDatabase,
  actor: { email: string; role: string },
  action: string,
  resourceType: string,
  resourceId: string,
  summary: string
): ServerAuditRecord {
  const rec: ServerAuditRecord = {
    id: `aud_${crypto.randomBytes(6).toString('hex')}`,
    correlationId: `cor_${crypto.randomBytes(5).toString('hex')}`,
    actorEmail: sanitizeText(actor.email, 120) || 'admin@linguaverse.ai',
    actorRole: sanitizeText(actor.role, 40) || 'admin',
    action,
    resourceType,
    resourceId,
    summary: sanitizeText(summary, 280),
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(rec);
  if (db.auditLogs.length > 300) {
    db.auditLogs = db.auditLogs.slice(0, 300);
  }
  return rec;
}

export function getPublishedCmsConfig(): CmsConfig {
  return loadDb().published;
}

export function getAdminCmsState(): {
  published: CmsConfig;
  draft: CmsConfig;
  auditLogs: ServerAuditRecord[];
  analytics: CmsAnalyticsSummary;
} {
  const db = loadDb();
  return {
    published: db.published,
    draft: db.draft,
    auditLogs: db.auditLogs,
    analytics: computeAnalyticsSummary(db.analytics),
  };
}

export function saveCmsDraft(
  patch: Partial<CmsConfig>,
  actor: { email: string; role: string },
  summary = 'Updated CMS draft configuration.'
): { draft: CmsConfig; audit: ServerAuditRecord } {
  const db = loadDb();
  db.draft = sanitizeCmsConfigPatch(db.draft, patch, actor.email);
  const audit = addAudit(db, actor, 'cms.draft_saved', 'cms', `v${db.draft.version}`, summary);
  persistDb(db);
  return { draft: db.draft, audit };
}

export function publishCmsDraft(
  actor: { email: string; role: string },
  patch?: Partial<CmsConfig>
): { published: CmsConfig; draft: CmsConfig; audit: ServerAuditRecord } {
  const db = loadDb();
  const base = patch ? sanitizeCmsConfigPatch(db.draft, patch, actor.email) : db.draft;
  const nowIso = new Date().toISOString();
  const nextVersion = (db.published.version || 1) + 1;
  const published: CmsConfig = {
    ...base,
    version: nextVersion,
    publishedAt: nowIso,
    updatedAt: nowIso,
    updatedBy: sanitizeText(actor.email, 120) || 'admin',
  };
  db.published = published;
  db.draft = structuredClone(published);
  const audit = addAudit(
    db,
    actor,
    'cms.published',
    'cms',
    `v${nextVersion}`,
    `Published landing page & platform CMS revision v${nextVersion}.`
  );
  persistDb(db);
  return { published: db.published, draft: db.draft, audit };
}

export function resetCmsToDefaults(actor: {
  email: string;
  role: string;
}): { published: CmsConfig; draft: CmsConfig; audit: ServerAuditRecord } {
  const db = loadDb();
  const fresh = createDefaultCmsConfig();
  fresh.version = (db.published.version || 1) + 1;
  fresh.publishedAt = new Date().toISOString();
  fresh.updatedAt = fresh.publishedAt;
  fresh.updatedBy = actor.email;
  db.published = fresh;
  db.draft = structuredClone(fresh);
  const audit = addAudit(
    db,
    actor,
    'cms.reset_defaults',
    'cms',
    `v${fresh.version}`,
    'Restored CMS content to default configuration.'
  );
  persistDb(db);
  return { published: db.published, draft: db.draft, audit };
}

export function saveUploadedMedia(input: {
  filename: string;
  mimeType: string;
  dataBase64: string;
  altText?: string;
  actor: { email: string; role: string };
}): { ok: true; asset: CmsMediaAsset } | { ok: false; error: string } {
  const cleanBase64 = input.dataBase64.replace(/^data:[^;]+;base64,/, '').trim();
  const buffer = Buffer.from(cleanBase64, 'base64');
  const check = validateMediaUpload({
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: buffer.byteLength,
  });
  if (!check.ok) {
    return { ok: false, error: check.error || 'Invalid upload.' };
  }

  const sigCheck = verifyImageMagicBytes(buffer, input.mimeType);
  if (!sigCheck.ok) {
    return { ok: false, error: sigCheck.error };
  }

  ensureStorageDirs();
  const ext = sigCheck.extension;
  const id = `med_${crypto.randomBytes(6).toString('hex')}`;
  const uploadsRoot = path.resolve(UPLOADS_DIR);
  const filePath = path.resolve(uploadsRoot, `${id}.${ext}`);
  if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return { ok: false, error: 'Invalid upload destination path.' };
  }
  fs.writeFileSync(filePath, buffer);

  const asset: CmsMediaAsset = {
    id,
    filename: sanitizeText(input.filename, 120),
    mimeType: input.mimeType,
    sizeBytes: buffer.byteLength,
    url: `/api/v1/media/${id}.${ext}`,
    altText: sanitizeText(input.altText || input.filename, 160),
    uploadedBy: sanitizeText(input.actor.email, 120),
    createdAt: new Date().toISOString(),
  };

  const db = loadDb();
  db.draft.media = [asset, ...db.draft.media];
  db.published.media = [asset, ...db.published.media];
  addAudit(
    db,
    input.actor,
    'media.uploaded',
    'media',
    asset.id,
    `Uploaded media asset "${asset.filename}" (${Math.round(asset.sizeBytes / 1024)} KB).`
  );
  persistDb(db);
  return { ok: true, asset };
}

export function deleteUploadedMedia(
  mediaId: string,
  actor: { email: string; role: string }
): boolean {
  const db = loadDb();
  const target =
    db.draft.media.find((m) => m.id === mediaId) ??
    db.published.media.find((m) => m.id === mediaId);
  if (!target) return false;

  const basename = path.basename(target.url);
  const diskPath = path.join(UPLOADS_DIR, basename);
  if (fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }

  db.draft.media = db.draft.media.filter((m) => m.id !== mediaId);
  db.published.media = db.published.media.filter((m) => m.id !== mediaId);
  addAudit(
    db,
    actor,
    'media.deleted',
    'media',
    mediaId,
    `Deleted media asset "${target.filename}".`
  );
  persistDb(db);
  return true;
}

export function resolveUploadedMediaFile(filenameParam: string): {
  filePath: string;
  mimeType: string;
} | null {
  const safeName = path.basename(filenameParam);
  if (!/^med_[a-f0-9]+\.(png|jpg|webp)$/.test(safeName)) return null;
  const uploadsRoot = path.resolve(UPLOADS_DIR);
  const filePath = path.resolve(uploadsRoot, safeName);
  if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) return null;
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(safeName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return { filePath, mimeType: mimeMap[ext] || 'application/octet-stream' };
}

export function recordAnalyticsEvent(input: {
  eventType: string;
  path: string;
  metadata?: Record<string, string | number | boolean>;
}): void {
  const db = loadDb();
  const event: AnalyticsEventRecord = {
    id: `evt_${crypto.randomBytes(5).toString('hex')}`,
    eventType: sanitizeText(input.eventType, 60) || 'unknown',
    path: sanitizeText(input.path, 160) || '/',
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };
  db.analytics.unshift(event);
  if (db.analytics.length > 1000) {
    db.analytics = db.analytics.slice(0, 1000);
  }
  persistDb(db);
}

export function computeAnalyticsSummary(events: AnalyticsEventRecord[]): CmsAnalyticsSummary {
  let totalPageViews = 0;
  let heroCtaClicks = 0;
  let watchDemoClicks = 0;
  let pricingClicks = 0;
  let liveDemoSubmissions = 0;
  let upgradeModalOpens = 0;

  for (const e of events) {
    if (e.eventType === 'page_view') totalPageViews += 1;
    else if (e.eventType === 'hero_cta_click') heroCtaClicks += 1;
    else if (e.eventType === 'watch_demo_click') watchDemoClicks += 1;
    else if (e.eventType === 'pricing_click') pricingClicks += 1;
    else if (e.eventType === 'live_demo_analyze') liveDemoSubmissions += 1;
    else if (e.eventType === 'upgrade_modal_open') upgradeModalOpens += 1;
  }

  return {
    totalPageViews,
    heroCtaClicks,
    watchDemoClicks,
    pricingClicks,
    liveDemoSubmissions,
    upgradeModalOpens,
    recentEvents: events.slice(0, 25),
  };
}

export function getAnalyticsSummary(): CmsAnalyticsSummary {
  return computeAnalyticsSummary(loadDb().analytics);
}

export function getServerAuditLogs(): ServerAuditRecord[] {
  return loadDb().auditLogs;
}

export function appendServerAuditLog(input: {
  actorEmail: string;
  actorRole: string;
  action: string;
  resource: string;
  details: string;
}): ServerAuditRecord {
  const db = loadDb();
  const [resourceType, ...rest] = input.resource.split(':');
  const rec = addAudit(
    db,
    { email: input.actorEmail, role: input.actorRole },
    input.action,
    resourceType || 'system',
    rest.join(':') || input.resource,
    input.details
  );
  persistDb(db);
  return rec;
}
