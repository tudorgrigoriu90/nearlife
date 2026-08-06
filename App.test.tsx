import { fireEvent, render, screen } from '@testing-library/react-native';
import App from './App';
import { createTranslator } from './lib/i18n';
import { KRONOBERG_SPECIES } from './lib/species/kronoberg';
import { commonNameFor } from './lib/species/localized';
import { thisWeek } from './lib/thisWeek';
import { monthOf } from './lib/season';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Onboarding asks the OS for permissions; mock to a deterministic "granted" so the flow is drivable.
jest.mock('./lib/permissions', () => ({
  requestLocationPermission: jest.fn(async () => 'granted'),
  requestNotificationPermission: jest.fn(async () => 'granted'),
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

async function completeOnboarding() {
  await render(<App />);
  await press(tr('onboarding.welcome.cta'));
  await press(tr('onboarding.location.cta'));
  await press(tr('onboarding.hometown.cta', { region: 'Kronoberg' })); // location granted → confirm
  await press(tr('onboarding.notif.cta'));
  // The first-spotted card shows the starter's always-free mission content (T-059: content is
  // passed in — guards against the card losing its content when the source became a prop).
  expect(await screen.findByText(tr('card.give'))).toBeTruthy();
  await press(tr('onboarding.firstSpotted.cta'));
  await screen.findByText(tr('thisWeek.honesty')); // landed on the tabs
}

describe('App', () => {
  it('boots into the compliance-shaped onboarding flow', async () => {
    await render(<App />);
    expect(screen.getByText(tr('onboarding.welcome.title'))).toBeTruthy();
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
});
