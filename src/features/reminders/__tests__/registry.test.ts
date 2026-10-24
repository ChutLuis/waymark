import { describe, expect, it } from 'vitest';
import {
  LEGACY_REGISTRY_KEY,
  REMINDER_KIND,
  adoptLegacyReminders,
  allReminders,
  exactAccessChanged,
  isRegistryKey,
  isTripReminder,
  parseRegistry,
  registryKey,
  reminderOwner,
  reminderPayload,
  remindersOf,
  remindersToReconcile,
  serializeRegistry,
  staleRegistryEntries,
  type NotificationRef,
  type Reminder,
} from '../registry';

const ANA = 'user-ana';
const BEN = 'user-ben';

const tagged = (identifier: string, userId: string, tripId: string): NotificationRef => ({
  identifier,
  data: reminderPayload(userId, tripId, `item-${identifier}`),
});
/** The shape reminders were scheduled with before they carried an account. */
const untagged = (identifier: string, tripId: string): NotificationRef => ({
  identifier,
  data: { tripId, itemId: `item-${identifier}` },
});
const other = (identifier: string): NotificationRef => ({ identifier, data: { promo: 'x' } });

const reminder = (itemId: string, tripId: string | null, notificationId: string | null = null): Reminder => ({
  itemId,
  tripId,
  offsetMinutes: 60,
  notificationId,
});

describe('registry keys', () => {
  it('keeps one registry per account', () => {
    expect(registryKey(ANA)).not.toBe(registryKey(BEN));
    expect(registryKey(ANA)).not.toBe(LEGACY_REGISTRY_KEY);
  });

  it('recognises every registry key, and nothing else', () => {
    expect(isRegistryKey(registryKey(ANA))).toBe(true);
    expect(isRegistryKey(LEGACY_REGISTRY_KEY)).toBe(true);
    expect(isRegistryKey('waymark.remindersEnabled')).toBe(false);
    expect(isRegistryKey('waymark.themePreference')).toBe(false);
  });
});

describe('parseRegistry', () => {
  it('round-trips through serializeRegistry', () => {
    const entries = [reminder('a', 'trip-1', 'n1'), reminder('b', null)];
    expect(parseRegistry(serializeRegistry(entries))).toEqual(entries);
  });

  it('reads entries written before reminders recorded their trip', () => {
    const legacy = JSON.stringify([{ itemId: 'a', offsetMinutes: 1440, notificationId: 'n1' }]);
    expect(parseRegistry(legacy)).toEqual([
      { itemId: 'a', tripId: null, offsetMinutes: 1440, notificationId: 'n1' },
    ]);
  });

  it('drops malformed entries instead of failing', () => {
    const raw = JSON.stringify([
      { itemId: 'ok', offsetMinutes: 0, notificationId: null },
      { itemId: 'bad-offset', offsetMinutes: 30 },
      { offsetMinutes: 60 },
      null,
      'nope',
    ]);
    expect(parseRegistry(raw).map((r) => r.itemId)).toEqual(['ok']);
  });

  it('treats empty, corrupt or non-list storage as an empty registry', () => {
    expect(parseRegistry(null)).toEqual([]);
    expect(parseRegistry('')).toEqual([]);
    expect(parseRegistry('{not json')).toEqual([]);
    expect(parseRegistry('{"itemId":"a"}')).toEqual([]);
  });
});

describe('reminder payloads', () => {
  it('tags a reminder with its account, trip and item', () => {
    expect(reminderPayload(ANA, 'trip-1', 'item-1')).toEqual({
      kind: REMINDER_KIND,
      userId: ANA,
      tripId: 'trip-1',
      itemId: 'item-1',
    });
  });

  it('recognises tagged and older untagged reminders, and nothing else', () => {
    expect(isTripReminder(tagged('n1', ANA, 'trip-1').data)).toBe(true);
    expect(isTripReminder(untagged('n2', 'trip-1').data)).toBe(true);
    expect(isTripReminder(other('n3').data)).toBe(false);
    expect(isTripReminder(null)).toBe(false);
    expect(isTripReminder(undefined)).toBe(false);
  });

  it('reads the owner, or null for an untagged reminder', () => {
    expect(reminderOwner(tagged('n1', ANA, 'trip-1').data)).toBe(ANA);
    expect(reminderOwner(untagged('n2', 'trip-1').data)).toBeNull();
  });
});

describe('remindersOf (a session ends)', () => {
  const scheduled = [
    tagged('ana-1', ANA, 'trip-1'),
    tagged('ben-1', BEN, 'trip-1'),
    untagged('old-1', 'trip-2'),
    other('promo'),
  ];

  it('cancels the account’s own reminders and any untagged ones', () => {
    expect(remindersOf(scheduled, ANA)).toEqual(['ana-1', 'old-1']);
  });

  it('leaves another account’s reminders and unrelated notifications alone', () => {
    expect(remindersOf(scheduled, ANA)).not.toContain('ben-1');
    expect(remindersOf(scheduled, ANA)).not.toContain('promo');
  });
});

describe('allReminders (nobody signed in)', () => {
  const scheduled = [tagged('ana-1', ANA, 'trip-1'), tagged('ben-1', BEN, 'trip-3'), untagged('old-1', 'trip-2'), other('promo')];

  it('cancels every trip reminder, whoever set it', () => {
    expect(allReminders(scheduled)).toEqual(['ana-1', 'ben-1', 'old-1']);
  });

  it('keeps the reminders of someone who signed in meanwhile', () => {
    expect(allReminders(scheduled, BEN)).toEqual(['ana-1', 'old-1']);
  });
});

describe('remindersToReconcile', () => {
  const scheduled = [
    tagged('kept', ANA, 'trip-1'),
    tagged('left-trip', ANA, 'trip-gone'),
    untagged('old-kept', 'trip-1'),
    untagged('old-left', 'trip-gone'),
    tagged('ben-leftover', BEN, 'trip-1'),
    other('promo'),
  ];

  it('cancels reminders for trips that left the list, and another account’s', () => {
    expect(remindersToReconcile(scheduled, ANA, new Set(['trip-1']))).toEqual([
      'left-trip',
      'old-left',
      'ben-leftover',
    ]);
  });

  it('cancels every own reminder when the person is on no trips', () => {
    expect(remindersToReconcile(scheduled, ANA, new Set())).toEqual([
      'kept',
      'left-trip',
      'old-kept',
      'old-left',
      'ben-leftover',
    ]);
  });

  it('cancels nothing when every trip is still there', () => {
    const mine = [tagged('a', ANA, 'trip-1'), untagged('b', 'trip-2')];
    expect(remindersToReconcile(mine, ANA, new Set(['trip-1', 'trip-2']))).toEqual([]);
  });
});

describe('staleRegistryEntries', () => {
  it('lists entries whose trip left the list and keeps entries without a trip', () => {
    const entries = [reminder('a', 'trip-1'), reminder('b', 'trip-gone'), reminder('c', null)];
    expect(staleRegistryEntries(entries, new Set(['trip-1']))).toEqual(['b']);
  });
});

describe('adoptLegacyReminders', () => {
  it('fills in each entry’s trip from its still-scheduled notification', () => {
    const legacy = [reminder('a', null, 'n1'), reminder('b', null, 'fired'), reminder('c', null)];
    const scheduled = [untagged('n1', 'trip-1')];
    expect(adoptLegacyReminders([], legacy, scheduled)).toEqual([
      reminder('a', 'trip-1', 'n1'),
      reminder('b', null, 'fired'),
      reminder('c', null),
    ]);
  });

  it('lets the account’s own entries win over the device-wide ones', () => {
    const own = [{ ...reminder('a', 'trip-1', 'n-new'), offsetMinutes: 0 as const }];
    const legacy = [reminder('a', null, 'n-old'), reminder('b', null)];
    expect(adoptLegacyReminders(own, legacy, [])).toEqual([own[0], reminder('b', null)]);
  });
});

describe('exactAccessChanged', () => {
  it('reschedules once access is allowed after reminders were set without it', () => {
    expect(exactAccessChanged('denied', 'granted')).toBe(true);
  });

  it('reschedules when access is taken away (Android cancels the exact alarms)', () => {
    expect(exactAccessChanged('granted', 'denied')).toBe(true);
  });

  it('reschedules when nothing was recorded yet, e.g. reminders set before this check existed', () => {
    expect(exactAccessChanged(null, 'granted')).toBe(true);
    expect(exactAccessChanged(null, 'denied')).toBe(true);
  });

  it('leaves reminders alone while access is unchanged', () => {
    expect(exactAccessChanged('granted', 'granted')).toBe(false);
    expect(exactAccessChanged('denied', 'denied')).toBe(false);
  });

  it('does nothing where exact alarms are not a thing (iOS, web)', () => {
    expect(exactAccessChanged(null, 'not-applicable')).toBe(false);
    expect(exactAccessChanged('granted', 'not-applicable')).toBe(false);
  });
});
