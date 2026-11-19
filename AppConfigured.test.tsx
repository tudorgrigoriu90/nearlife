import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import App from './App';
import { KRONOBERG_SPECIES } from './lib/species/kronoberg';
import { commonNameFor } from './lib/species/localized';
import { thisWeek } from './lib/thisWeek';
import { monthOf } from './lib/season';
import { HOMETOWN_STORAGE_KEY } from './lib/hometownStore';
import { ensureAnonymousSession } from './lib/supabase';
import { createTranslator } from './lib/i18n';
import { ONBOARDING_STORAGE_KEY } from './lib/onboardingStore';

// T-334 · review I-17: App with a backend configured. A third of App only exists then (the store,
// counties, family, sign-in, email link, access codes), and no other test reaches it. The fake
// client answers every query with no rows, so this is a signed-in user with nothing on the server
// yet; what is under test is App's wiring and its back button, not the server.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./lib/permissions', () => ({
  requestLocationPermission: jest.fn(async () => 'granted'),
  requestLocationAccess: jest.fn(async () => 'granted'),
  getLocationFixOnce: jest.fn(async () => ({ latitude: 56.879, longitude: 14.806 })),
  getCatchFix: jest.fn(async () => ({ latitude: 56.879, longitude: 14.806, accuracyM: 10 })),
  requestNotificationPermission: jest.fn(async () => 'granted'),
  getNotificationPermission: jest.fn(async () => 'granted'),
  getDevicePushToken: jest.fn(async () => null),
  onPushTokenChange: jest.fn(() => () => {}),
  showNotificationsInForeground: jest.fn(),
  onNotificationTap: jest.fn(() => () => {}),
}));
/** Any chain of calls, awaited anywhere along it, resolves to an empty answer. */
function mockEmpty(): unknown {
  const fn = () => undefined;
  return new Proxy(fn, {
    get: (_t, key) =>
      key === 'then'
        ? (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: 0 })
        : mockEmpty(),
    apply: () => mockEmpty(),
  });
}
jest.mock('./lib/supabase', () => ({
  getSupabase: () => mockEmpty(),
  ensureAnonymousSession: jest.fn(async () => 'user-1'),
}));

// The species come from the bundled set: the empty fake would leave nothing on screen to open.
jest.mock('./lib/speciesRepositoryFactory', () => {
  const actual = jest.requireActual('./lib/speciesRepositoryFactory');
  return { ...actual, createRepositoryParts: () => ({ ...actual.createRepositoryParts(), online: null }) };
});
jest.mock('./components/minigame/CatchMinigame', () => {
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ onComplete }: { onComplete: (o: { success: boolean; score: number }) => void }) => (
      <Pressable onPress={() => onComplete({ success: true, score: 1 })}>
        <Text>__WIN__</Text>
      </Pressable>
    ),
  };
});

const mockDelete = jest.fn(async (): Promise<{ ok: boolean; reason?: string }> => ({ ok: true }));
jest.mock('./lib/accountDeletion', () => ({
  ...jest.requireActual('./lib/accountDeletion'),
  deleteAccount: () => mockDelete(),
}));

const tr = createTranslator('en');
const KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] as const;

let backListeners: ((e: never) => boolean | null | undefined)[] = [];
beforeEach(async () => {
  // Keys set on the existing env object: Expo's Babel preset captured it at module load (T-333).
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  await AsyncStorage.clear();
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ agePath: 'full' }));
  await AsyncStorage.setItem(HOMETOWN_STORAGE_KEY, JSON.stringify({ id: 'SWE.9_1', name: 'Kronoberg' }));
  backListeners = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backListeners.push(handler as never);
    return { remove: () => (backListeners = backListeners.filter((h) => h !== handler)) };
  });
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  for (const k of KEYS) delete process.env[k];
  jest.restoreAllMocks();
});

async function systemBack(): Promise<boolean> {
  let handled = false;
  await act(async () => {
    handled = backListeners.some((h) => h({} as never) === true);
  });
  return handled;
}
const press = async (text: string | RegExp) => fireEvent.press(await screen.findByText(text));

describe('App with a backend', () => {
  it('opens each account and purchase screen from Settings, and back returns to Settings', async () => {
    await render(<App />);
    await screen.findByText(tr('thisWeek.honesty'));
    await press(`⚙ ${tr('nav.settings')}`);
    await screen.findByText(tr('settings.title'));
    for (const [open, shown] of [
      [tr('settings.store'), tr('store.title')],
      [tr('settings.counties'), `${tr('counties.title')} 🗺`],
      [tr('settings.family'), `${tr('family.title')} 👪`],
      [tr('settings.linkEmail'), tr('link.title')],
      [tr('settings.accessCode'), tr('access.title')],
    ] as const) {
      // By role: "Family" is also the section heading above its row.
      await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${open}`) }));
      expect(await screen.findAllByText(shown)).not.toHaveLength(0);
      expect(await systemBack()).toBe(true);
      expect(await screen.findByText(tr('settings.title'))).toBeTruthy();
    }
  }, 30000);

  it('exports with the server parts, signs in from Settings, and backs out of each', async () => {
    await render(<App />);
    await screen.findByText(tr('thisWeek.honesty'));
    await press(`⚙ ${tr('nav.settings')}`);
    await press(tr('settings.exportData'));
    expect(await screen.findByText(tr('export.title'))).toBeTruthy();
    expect(await systemBack()).toBe(true);
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${tr('signin.entry')}`) }));
    expect(await screen.findAllByText(tr('signin.title'))).not.toHaveLength(0);
    expect(await systemBack()).toBe(true);
    expect(await screen.findByText(tr('settings.title'))).toBeTruthy();
  }, 30000);

  it('deletes the server account first, and keeps the device as it was when that fails', async () => {
    mockDelete.mockResolvedValueOnce({ ok: false, reason: 'network' });
    await render(<App />);
    await screen.findByText(tr('thisWeek.honesty'));
    await press(`⚙ ${tr('nav.settings')}`);
    await press(tr('settings.deleteAccount'));
    await press(tr('delete.confirm'));
    // The server refused: nothing on the phone is erased, the user is still onboarded.
    expect(await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)).not.toBeNull();
    await press(tr('delete.confirm'));
    expect(await screen.findByText(tr('onboarding.welcome.title'))).toBeTruthy();
    expect(await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  }, 30000);

  it('from a card: reports a mistake, and goes to an unmapped county’s catch spot to catch', async () => {
    const top = thisWeek(KRONOBERG_SPECIES, monthOf(new Date()), new Set())[0].species;
    await render(<App />);
    await screen.findByText(tr('thisWeek.honesty'));
    await press(commonNameFor(top, 'en'));
    await press(tr('report.link'));
    await press(tr('report.kind.photo'));
    await press(tr('report.send'));
    expect(await screen.findByText(tr('report.sent'))).toBeTruthy();
    await press(tr('report.close'));
    await press(new RegExp(tr('card.findNearby')));
    // The fake server has no spots for the county: catching is not tied to a place there.
    expect(await screen.findByText(tr('catchSpot.unmapped'))).toBeTruthy();
    expect(await systemBack()).toBe(true);
    await press(new RegExp(tr('card.findNearby')));
    await fireEvent.press((await screen.findAllByText(tr('catchSpot.catch')))[0]);
    expect(await screen.findByText('__WIN__')).toBeTruthy();
  }, 30000);

  it('still exports what the phone has when the server parts cannot be read, and says which', async () => {
    await render(<App />);
    await screen.findByText(tr('thisWeek.honesty'));
    (ensureAnonymousSession as jest.Mock).mockRejectedValue(new Error('offline'));
    await press(`⚙ ${tr('nav.settings')}`);
    await press(tr('settings.exportData'));
    expect(await screen.findByText(tr('export.title'))).toBeTruthy();
    expect(await screen.findByText(/"unavailable": \[[^\]]*"purchases"[^\]]*"server"/)).toBeTruthy();
    (ensureAnonymousSession as jest.Mock).mockResolvedValue('user-1');
  }, 30000);

  it('"I\u2019ve moved" checks the county once and backs out to Settings (T-349)', async () => {
    await render(<App />);
    await screen.findByText(tr('thisWeek.honesty'));
    await press(`⚙ ${tr('nav.settings')}`);
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${tr('move.entry')}`) }));
    // The fix is in Växjö, inside the home county already.
    expect(await screen.findByText(tr('move.same', { county: 'Kronoberg' }))).toBeTruthy();
    expect(await systemBack()).toBe(true);
    expect(await screen.findByText(tr('settings.title'))).toBeTruthy();
  }, 30000);
});
