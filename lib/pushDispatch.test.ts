import { REALTIME_CLAIM_PHRASES } from './contentHonesty';
import {
  ANDROID_CHANNEL_ID,
  buildFcmMessage,
  deliverableDevices,
  historyFromLog,
  isDeadTokenResponse,
  localClock,
  planSends,
  pushCopy,
  pushLocale,
  type PushDevice,
  type UserSnapshot,
} from './pushDispatch';
import type { RegionPresence } from './speciesRepository';

const KRONOBERG = 'SWE.9_1';
// 20:30 in Stockholm (CEST) — the last waking hour, so every user's send slot has arrived.
const SUMMER_EVENING = Date.parse('2026-06-15T18:30:00Z');

const robin: RegionPresence = { speciesId: 'european-robin', activeMonths: [6], occurrences: 900 };
const presence = new Map<string, RegionPresence[]>([[KRONOBERG, [robin]]]);

function device(overrides: Partial<PushDevice> = {}): PushDevice {
  return { token: 'tok-a', platform: 'android', locale: 'sv', updatedAtMs: 1, ...overrides };
}

function user(overrides: Partial<UserSnapshot> = {}): UserSnapshot {
  return {
    userId: 'user-a',
    homeRegion: KRONOBERG,
    devices: [device()],
    collectedIds: [],
    sentAtMs: [],
    ...overrides,
  };
}

describe('localClock', () => {
  it('reads Stockholm wall-clock time across both DST offsets', () => {
    expect(localClock(Date.parse('2026-01-15T07:30:00Z'))).toEqual({
      localHour: 8,
      month: 1,
      dateKey: '2026-01-15',
    });
    expect(localClock(Date.parse('2026-07-15T06:30:00Z'))).toEqual({
      localHour: 8,
      month: 7,
      dateKey: '2026-07-15',
    });
  });

  it('rolls the month at local midnight, not UTC midnight', () => {
    expect(localClock(Date.parse('2026-06-30T22:30:00Z')).month).toBe(7);
  });
});

describe('historyFromLog', () => {
  const now = Date.parse('2026-06-16T08:00:00Z'); // 10:00 local on the 16th

  it('is empty for a user never sent to', () => {
    expect(historyFromLog([], now)).toEqual({ lastSentMs: null, sentTodayCount: 0 });
  });

  it('counts only sends from the local day, and keeps the latest send for the interval cap', () => {
    const lateYesterday = Date.parse('2026-06-15T21:30:00Z'); // 23:30 local on the 15th
    const justAfterMidnight = Date.parse('2026-06-15T22:30:00Z'); // 00:30 local on the 16th
    expect(historyFromLog([justAfterMidnight, lateYesterday], now)).toEqual({
      lastSentMs: justAfterMidnight,
      sentTodayCount: 1,
    });
  });
});

describe('deliverableDevices', () => {
  it('drops iOS tokens — only raw FCM (Android) tokens are deliverable', () => {
    const map = deliverableDevices([user({ devices: [device({ platform: 'ios' })] })]);
    expect(map.get('user-a')).toBeUndefined();
  });

  it('gives a token shared by two accounts only to the newest registration', () => {
    const map = deliverableDevices([
      user({ userId: 'old', devices: [device({ updatedAtMs: 1 })] }),
      user({ userId: 'new', devices: [device({ updatedAtMs: 2 })] }),
    ]);
    expect(map.get('old')).toBeUndefined();
    expect(map.get('new')).toHaveLength(1);
  });
});

describe('planSends', () => {
  it('sends an in-season species to an eligible user, on all of their devices', () => {
    const devices = [device(), device({ token: 'tok-b' })];
    const plan = planSends([user({ devices })], presence, SUMMER_EVENING, { rng: () => 0 });
    expect(plan.sends).toEqual([{ userId: 'user-a', speciesId: 'european-robin', devices }]);
    expect(plan.skipped).toEqual({});
  });

  it('skips users with no region, no deliverable device, or nothing new in season', () => {
    const plan = planSends(
      [
        user({ userId: 'u1', homeRegion: null }),
        user({ userId: 'u2', devices: [device({ token: 'ios', platform: 'ios' })] }),
        user({ userId: 'u3', devices: [device({ token: 'c' })], collectedIds: ['european-robin'] }),
        user({ userId: 'u4', devices: [device({ token: 'd' })], homeRegion: 'SWE.unknown' }),
      ],
      presence,
      SUMMER_EVENING,
      { rng: () => 0 },
    );
    expect(plan.sends).toEqual([]);
    expect(plan.skipped).toEqual({ 'no-region': 1, 'no-device': 1, 'no-candidate': 2 });
  });

  it('holds the daily cap: a user already notified today is not notified again', () => {
    const earlierToday = Date.parse('2026-06-15T06:00:00Z');
    const plan = planSends([user({ sentAtMs: [earlierToday] })], presence, SUMMER_EVENING);
    expect(plan.sends).toEqual([]);
    expect(plan.skipped).toEqual({ 'daily-cap': 1 });
  });

  it('waits for the user slot unless the smoke test asks to skip it', () => {
    const morning = Date.parse('2026-06-15T06:30:00Z'); // 08:30 local, the first waking hour
    const users = Array.from({ length: 12 }, (_, i) =>
      user({ userId: `user-${i}`, devices: [device({ token: `t${i}` })] }),
    );
    const scheduled = planSends(users, presence, morning, { rng: () => 0 });
    expect(scheduled.skipped['before-slot']).toBeGreaterThan(0);
    const smoke = planSends(users, presence, morning, { rng: () => 0, ignoreSlot: true });
    expect(smoke.sends).toHaveLength(12);
  });

  it('never sends in quiet hours', () => {
    const night = Date.parse('2026-06-15T23:00:00Z'); // 01:00 local
    expect(planSends([user()], presence, night).skipped).toEqual({ 'quiet-hours': 1 });
  });
});

describe('pushLocale + pushCopy', () => {
  it('falls back to English for unknown or missing locales', () => {
    expect(pushLocale('sv')).toBe('sv');
    expect(pushLocale('ar')).toBe('en');
    expect(pushLocale(null)).toBe('en');
  });

  it('names the species and stays seasonal in every catalog language', () => {
    for (const locale of ['en', 'sv'] as const) {
      const copy = pushCopy(locale, 'Rödhake');
      expect(copy.title).toContain('Rödhake');
      const text = `${copy.title} ${copy.body}`.toLowerCase();
      for (const phrase of REALTIME_CLAIM_PHRASES[locale] ?? []) expect(text).not.toContain(phrase);
    }
    expect(pushCopy('sv', 'Rödhake').title).toBe('Rödhake är aktiv i din region');
  });
});

describe('buildFcmMessage', () => {
  const copy = { title: 'T', body: 'B' };

  it('carries the species id for the tap and targets the app channel', () => {
    const msg = buildFcmMessage({ token: 'tok', copy, speciesId: 'european-robin', imageUrl: null });
    expect(msg).toEqual({
      message: {
        token: 'tok',
        notification: { title: 'T', body: 'B' },
        data: { speciesId: 'european-robin' },
        android: { priority: 'normal', notification: { channel_id: ANDROID_CHANNEL_ID } },
      },
    });
  });

  it('attaches the photo when the species has one', () => {
    const msg = buildFcmMessage({ token: 'tok', copy, speciesId: 'x', imageUrl: 'https://img/x.jpg' });
    expect(msg.message.notification.image).toBe('https://img/x.jpg');
  });
});

describe('isDeadTokenResponse', () => {
  const fcmError = (status: string, message: string, errorCode?: string) =>
    JSON.stringify({ error: { status, message, details: errorCode ? [{ errorCode }] : [] } });

  it('treats unregistered and invalid tokens as dead', () => {
    expect(isDeadTokenResponse(404, fcmError('NOT_FOUND', 'Requested entity was not found.', 'UNREGISTERED'))).toBe(true);
    expect(isDeadTokenResponse(400, fcmError('INVALID_ARGUMENT', 'The registration token is not a valid FCM registration token'))).toBe(true);
  });

  it('does not delete devices because of our own malformed payload or a transient failure', () => {
    expect(isDeadTokenResponse(400, fcmError('INVALID_ARGUMENT', 'Invalid value at message.android.priority'))).toBe(false);
    expect(isDeadTokenResponse(503, fcmError('UNAVAILABLE', 'try later'))).toBe(false);
    expect(isDeadTokenResponse(500, '<html>oops</html>')).toBe(false);
  });
});
