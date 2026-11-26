import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isWithinQuietHours,
  validateNotificationPreferencesPatch,
} from './notificationsEngine.ts';

test('notificationsEngine: validates preferences and rejects invalid time format', () => {
  const ok = validateNotificationPreferencesPatch({
    remindersEnabled: true,
    preferredTimeLocal: '19:30',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });
  assert.equal(ok.ok, true);

  const badTime = validateNotificationPreferencesPatch({ preferredTimeLocal: '25:99' });
  assert.equal(badTime.ok, false);
});

test('notificationsEngine: enforces overnight and daytime quiet hours accurately', () => {
  assert.equal(isWithinQuietHours('23:15', '22:30', '07:30'), true);
  assert.equal(isWithinQuietHours('06:45', '22:30', '07:30'), true);
  assert.equal(isWithinQuietHours('14:00', '22:30', '07:30'), false);
  assert.equal(isWithinQuietHours('13:30', '13:00', '14:00'), true);
});
