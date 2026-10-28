import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import App from './App';
import { requestNotificationPermission } from './lib/permissions';
import { CONSENT_STORAGE_KEY } from './lib/consentStore';
import { HOMETOWN_STORAGE_KEY } from './lib/hometownStore';
import { ONBOARDING_STORAGE_KEY } from './lib/onboardingStore';
import { createTranslator } from './lib/i18n';
import { KRONOBERG_SPECIES } from './lib/species/kronoberg';
import { commonNameFor } from './lib/species/localized';
import { thisWeek } from './lib/thisWeek';
import { monthOf } from './lib/season';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The collection is persisted on-device since T-165, so it now survives between renders — which is
// the point, but it also means it survives between *tests*. Clear it so each case starts from a
// known collection rather than inheriting the previous one's spots.
beforeEach(async () => {
  await AsyncStorage.clear();
});

// Onboarding asks the OS for permissions; mock to a deterministic "granted" so the flow is drivable.
jest.mock('./lib/permissions', () => ({
  requestLocationPermission: jest.fn(async () => 'granted'),
  getLocationFixOnce: jest.fn(async () => ({ latitude: 56.879, longitude: 14.806 })), // Växjö
  requestNotificationPermission: jest.fn(async () => 'granted'),
  getDevicePushToken: jest.fn(async () => null),
  onPushTokenChange: jest.fn(() => () => {}),
  showNotificationsInForeground: jest.fn(),
  // Captures the app's tap listener so a test can "tap" a notification (T-031).
  onNotificationTap: jest.fn((listener: (speciesId: string) => void) => {
    tapListener = listener;
    return () => {};
  }),
}));
let tapListener: ((speciesId: string) => void) | null = null;

// Account deletion talks to Supabase; stub the network half so the app-side reset can be tested.
jest.mock('./lib/supabase', () => ({
  getSupabase: () => ({}),
  ensureAnonymousSession: jest.fn(async () => 'user-1'),
}));
jest.mock('./lib/accountDeletion', () => ({
  ...jest.requireActual('./lib/accountDeletion'),
  deleteAccount: jest.fn(async () => ({ ok: true })),
}));

// The catch minigame's timers/gestures are covered by its own tests; here we stub it so App's
// catch-resolution branch (success → Caught + protect tip) is exercised deterministically.
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

const tr = createTranslator('en');
const month = monthOf(new Date());
// Onboarding auto-spots the first active-this-week species; the tabs' This Week then reorders it
// down (spotted = not "new"), so the *top rendered row* is the first active species with the
// starter marked spotted — the one we can deterministically tap (top of the virtualized list).
const onboardingStarter = thisWeek(KRONOBERG_SPECIES, month, new Set())[0].species;
const topRow = thisWeek(KRONOBERG_SPECIES, month, new Set([onboardingStarter.id]))[0].species;

const FLOW_TIMEOUT = 30000;

// RNTL 14's render + fireEvent are async (wrap in act) — await each press so state flushes before
// the next query, especially across screen transitions.
async function press(name: string | RegExp, opts?: { exact?: boolean }) {
  await fireEvent.press(await screen.findByText(name, opts));
}

// Age-gate (T-089) sits right after welcome. Compute years relative to "now" so the adult/minor
// paths stay correct whenever the suite runs.
const ADULT_BIRTH_YEAR = String(new Date().getFullYear() - 30);
const MINOR_BIRTH_YEAR = String(new Date().getFullYear() - 5);

async function completeOnboarding(
  birthYear: string | { rendered?: boolean; firstCardOpen?: boolean } = ADULT_BIRTH_YEAR,
) {
  const opts = typeof birthYear === 'string' ? {} : birthYear;
  const year = typeof birthYear === 'string' ? birthYear : ADULT_BIRTH_YEAR;
  if (!opts.rendered) await render(<App />);
  await press(tr('onboarding.welcome.cta'));
  // Age-gate: enter a birth year, then continue (T-089).
  await fireEvent.changeText(
    await screen.findByPlaceholderText(tr('onboarding.age.placeholder')),
    year,
  );
  await press(tr('onboarding.age.cta'));
  await press(tr('onboarding.location.cta'));
  await press(tr('onboarding.hometown.cta', { region: 'Kronoberg' })); // location granted → confirm
  await press(tr('onboarding.notif.cta'));
  // The first-spotted card shows the starter's always-free mission content (T-059: content is
  // passed in — guards against the card losing its content when the source became a prop).
  expect(await screen.findByText(tr('card.give'))).toBeTruthy();
  await press(tr('onboarding.firstSpotted.cta'));
  if (opts.firstCardOpen) return; // a queued notification tap opens a card instead of the tabs
  await screen.findByText(tr('thisWeek.honesty')); // landed on the tabs
}

describe('App', () => {
  it('boots into the compliance-shaped onboarding flow', async () => {
    await render(<App />);
    expect(await screen.findByText(tr('onboarding.welcome.title'))).toBeTruthy();
  });

  it(
    'drives the full loop: onboarding → catch (success) → protect tip → pledge',
    async () => {
      await completeOnboarding();

      // Tap the top active species → its card (always-free mission content shows).
      await press(commonNameFor(topRow, 'en'));
      expect(await screen.findByText(tr('card.give'))).toBeTruthy();

      // Catch it (stubbed minigame → success) → contextual protect tip → continue back to the card.
      await press(tr('card.findNearby'), { exact: false });
      await press('__WIN__');
      await press(tr('catch.continue'));

      // Pledge a give action → Helped-tier confirmation. (Button renders "✓ <label>".)
      await fireEvent.press((await screen.findAllByText(tr('card.pledge'), { exact: false }))[0]);
      expect(await screen.findByText(tr('pledge.thanks'))).toBeTruthy();
      await press(tr('pledge.done'));
    },
    FLOW_TIMEOUT,
  );

  it(
    'reaches Settings, exports data, and switches to the Almanac tab',
    async () => {
      await completeOnboarding();

      await press(tr('nav.settings'), { exact: false });
      await press(tr('settings.exportData'));
      expect(await screen.findByText(tr('export.title'))).toBeTruthy(); // export view opened
      await press(tr('settings.done')); // close export view (its own Done)
      await press(tr('settings.done')); // close settings → tabs
      await press(tr('almanac.title'));
      expect(await screen.findByText(tr('almanac.filter.all'))).toBeTruthy();
      // Species loaded through the repository seam (T-057), not the bundled module directly: the
      // progress total reflects the loaded catalogue (would be 0 if the async load never resolved).
      // One species is spotted by onboarding, so discovered = 1.
      expect(
        screen.getByText(tr('almanac.progress', { discovered: 1, total: KRONOBERG_SPECIES.length })),
      ).toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  it(
    'routes an under-13 user to the minimal-data path: the analytics opt-in is withheld',
    async () => {
      await completeOnboarding(MINOR_BIRTH_YEAR); // age ~5 → restricted (T-089)

      await press(tr('nav.settings'), { exact: false });
      // The analytics toggle is removed entirely (not merely defaulted off), with an explanatory note.
      expect(screen.queryByText(tr('consent.analytics'))).toBeNull();
      expect(screen.getByText(tr('consent.analyticsLocked'))).toBeTruthy();
      // The other granular consents remain available.
      expect(screen.getByText(tr('consent.location'))).toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  it(
    'records notification consent from the onboarding opt-in, and only when the OS granted it',
    async () => {
      const storedNotificationConsent = async () =>
        JSON.parse((await AsyncStorage.getItem(CONSENT_STORAGE_KEY)) ?? '{}').notifications;

      await completeOnboarding();
      expect(await storedNotificationConsent()).toBe(true);

      await screen.unmount();
      await AsyncStorage.clear();
      (requestNotificationPermission as jest.Mock).mockResolvedValueOnce('denied');
      await completeOnboarding();
      expect(await storedNotificationConsent()).not.toBe(true);
    },
    FLOW_TIMEOUT,
  );

  it(
    'opens the tapped species card from a notification that arrived before onboarding finished',
    async () => {
      await render(<App />);
      // Cold start: the tap is delivered while onboarding is still on screen.
      await act(async () => tapListener?.('moose'));
      expect(screen.queryByText(tr('card.give'))).toBeNull();
      await completeOnboarding({ rendered: true, firstCardOpen: true });
      expect(await screen.findByText(commonNameFor(KRONOBERG_SPECIES.find((s) => s.id === 'moose')!, 'en'))).toBeTruthy();
      expect(screen.getByText(tr('card.give'))).toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  it(
    'remembers onboarding across a restart and goes straight to the app (T-209)',
    async () => {
      await completeOnboarding();
      await screen.unmount();
      await render(<App />);
      expect(await screen.findByText(tr('thisWeek.honesty'))).toBeTruthy();
      expect(screen.queryByText(tr('onboarding.welcome.title'))).toBeNull();
    },
    FLOW_TIMEOUT,
  );

  it(
    'keeps an under-13 account on the minimal-data path after a restart',
    async () => {
      await completeOnboarding(MINOR_BIRTH_YEAR);
      await screen.unmount();
      await render(<App />);
      await press(tr('nav.settings'), { exact: false });
      expect(screen.queryByText(tr('consent.analytics'))).toBeNull();
      expect(screen.getByText(tr('consent.analyticsLocked'))).toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  it(
    'erases onboarding and the hometown with the account, back to first run',
    async () => {
      await completeOnboarding();
      expect(await AsyncStorage.getItem(HOMETOWN_STORAGE_KEY)).not.toBeNull();
      await press(tr('nav.settings'), { exact: false });
      await press(tr('settings.deleteAccount'));
      await press(tr('delete.confirm'));
      expect(await screen.findByText(tr('onboarding.welcome.title'))).toBeTruthy();
      expect(await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
      expect(await AsyncStorage.getItem(HOMETOWN_STORAGE_KEY)).toBeNull();
    },
    FLOW_TIMEOUT,
  );

  it(
    'keeps the language chosen in Settings across a restart (T-211)',
    async () => {
      await completeOnboarding();
      await press(tr('nav.settings'), { exact: false });
      await press(tr('lang.sv'));
      await screen.unmount();
      await render(<App />);
      const sv = createTranslator('sv');
      expect(await screen.findByText(sv('thisWeek.honesty'))).toBeTruthy();
    },
    FLOW_TIMEOUT,
  );

  it(
    'only records notification consent from Settings when Android grants the permission (T-213)',
    async () => {
      // Onboarding with the OS saying no: consent stays off.
      (requestNotificationPermission as jest.Mock).mockResolvedValueOnce('denied');
      await completeOnboarding();
      const stored = async () =>
        JSON.parse((await AsyncStorage.getItem(CONSENT_STORAGE_KEY)) ?? '{}').notifications;
      await press(tr('nav.settings'), { exact: false });
      const notificationsSwitch = () => screen.getAllByRole('switch')[1];

      // Switch on, OS still says no → nothing recorded, so no device gets registered.
      (requestNotificationPermission as jest.Mock).mockResolvedValueOnce('denied');
      await act(async () => fireEvent(notificationsSwitch(), 'valueChange', true));
      expect(await stored()).not.toBe(true);

      // Switch on, OS grants → consent recorded.
      await act(async () => fireEvent(notificationsSwitch(), 'valueChange', true));
      expect(await stored()).toBe(true);
    },
    FLOW_TIMEOUT,
  );

  it(
    'keeps the free-catch allowance across a restart (T-200)',
    async () => {
      await completeOnboarding();
      await press(commonNameFor(topRow, 'en'));
      expect(await screen.findByText(tr('catch.remaining', { count: 3 }))).toBeTruthy();
      await press(tr('card.findNearby'), { exact: false });
      await press('__WIN__');
      await press(tr('catch.continue'));

      await screen.unmount();
      await render(<App />);
      await press(tr('almanac.title'));
      await press(commonNameFor(topRow, 'en'));
      // Before T-200 the counter lived in component state and this read 3 again.
      expect(await screen.findByText(tr('catch.remaining', { count: 2 }))).toBeTruthy();
    },
    FLOW_TIMEOUT,
  );
});
