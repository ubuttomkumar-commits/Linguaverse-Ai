import type { AiTelemetryEvent, AuditLogEntry } from '../types/domain';
import { createAuditLogEntry } from '../domain/adminGovernanceEngine';

const TELEMETRY_KEY = 'linguaverse_ai_telemetry_v1';
const AUDIT_LOG_KEY = 'linguaverse_audit_logs_v1';
const MAX_TELEMETRY_RECORDS = 250;
const MAX_AUDIT_RECORDS = 500;

function getBrowserStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore restricted storage access
  }
  return null;
}

export function listAiTelemetryEvents(): AiTelemetryEvent[] {
  const storage = getBrowserStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AiTelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

export function recordAiTelemetryEvent(event: AiTelemetryEvent): AiTelemetryEvent[] {
  const current = listAiTelemetryEvents();
  const next = [event, ...current].slice(0, MAX_TELEMETRY_RECORDS);
  const storage = getBrowserStorage();
  if (storage) {
    try {
      storage.setItem(TELEMETRY_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }
  return next;
}

export function listAuditLogs(): AuditLogEntry[] {
  const storage = getBrowserStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(AUDIT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Append-only immutable audit log writer (never overwrites or mutates existing rows).
 */
export function appendAuditLog(
  input: Parameters<typeof createAuditLogEntry>[0]
): AuditLogEntry {
  const entry = createAuditLogEntry(input);
  const existing = listAuditLogs();
  const next = [entry, ...existing].slice(0, MAX_AUDIT_RECORDS);
  const storage = getBrowserStorage();
  if (storage) {
    try {
      storage.setItem(AUDIT_LOG_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }
  return entry;
}
