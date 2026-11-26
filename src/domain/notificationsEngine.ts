/**
 * Learner Notifications & Learning Schedule Domain Engine (PRD v6.1 §35)
 */

export interface UserNotificationPreferences {
  remindersEnabled: boolean;
  preferredTimeLocal: string; // HH:MM (24h)
  quietHoursStart: string; // HH:MM (24h)
  quietHoursEnd: string; // HH:MM (24h)
  reviewReminders: boolean;
  assessmentReminders: boolean;
  subscriptionNotices: boolean;
  securityNotifications: boolean; // Always recommended ON
  emailNotifications: boolean;
  updatedAt?: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  remindersEnabled: true,
  preferredTimeLocal: '20:00',
  quietHoursStart: '22:30',
  quietHoursEnd: '07:30',
  reviewReminders: true,
  assessmentReminders: true,
  subscriptionNotices: true,
  securityNotifications: true,
  emailNotifications: false,
};

export interface PersistedUserNotification {
  id: string;
  userId: string; // '*' for admin broadcast notice or specific userId
  type: 'review_reminder' | 'assessment' | 'subscription' | 'security' | 'system_broadcast';
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  actionRoute?: string;
  readAt: string | null;
  createdAt: string;
}

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateNotificationPreferencesPatch(
  input: unknown
): { ok: true; patch: Partial<UserNotificationPreferences> } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Notification preferences payload must be a JSON object.' };
  }
  const raw = input as Record<string, unknown>;
  const patch: Partial<UserNotificationPreferences> = {};
  const boolFields: Array<keyof UserNotificationPreferences> = [
    'remindersEnabled',
    'reviewReminders',
    'assessmentReminders',
    'subscriptionNotices',
    'securityNotifications',
    'emailNotifications',
  ];
  const timeFields: Array<keyof UserNotificationPreferences> = [
    'preferredTimeLocal',
    'quietHoursStart',
    'quietHoursEnd',
  ];

  for (const key of Object.keys(raw)) {
    if (
      !boolFields.includes(key as keyof UserNotificationPreferences) &&
      !timeFields.includes(key as keyof UserNotificationPreferences)
    ) {
      return { ok: false, error: `Unknown notification preference "${key}".` };
    }
  }

  for (const field of boolFields) {
    if (raw[field] !== undefined) {
      if (typeof raw[field] !== 'boolean') {
        return { ok: false, error: `${field} must be a boolean.` };
      }
      (patch as Record<string, boolean>)[field] = raw[field] as boolean;
    }
  }
  for (const field of timeFields) {
    if (raw[field] !== undefined) {
      if (typeof raw[field] !== 'string' || !HHMM_REGEX.test(raw[field])) {
        return { ok: false, error: `${field} must use 24-hour HH:MM format (e.g. 20:00).` };
      }
      (patch as Record<string, string>)[field] = raw[field] as string;
    }
  }
  return { ok: true, patch };
}

export function isWithinQuietHours(
  currentTimeHHMM: string,
  quietStartHHMM: string,
  quietEndHHMM: string
): boolean {
  if (!HHMM_REGEX.test(currentTimeHHMM) || !HHMM_REGEX.test(quietStartHHMM) || !HHMM_REGEX.test(quietEndHHMM)) {
    return false;
  }
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const now = toMins(currentTimeHHMM);
  const start = toMins(quietStartHHMM);
  const end = toMins(quietEndHHMM);
  if (start === end) return false;
  if (start < end) {
    return now >= start && now < end;
  }
  // Overnight window (e.g., 22:30 -> 07:30)
  return now >= start || now < end;
}
