import { fireEvent, render, screen } from '@testing-library/react-native';
import OnboardingFlow, { type OnboardingResult } from './OnboardingFlow';
import { createTranslator } from '../lib/i18n';
import { requestLocationPermission } from '../lib/permissions';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../lib/permissions', () => ({
  requestLocationPermission: jest.fn(async () => 'granted'),
  requestNotificationPermission: jest.fn(async () => 'granted'),
  getLocationFixOnce: jest.fn(async () => null),
}));

const tr = createTranslator('en');
const SKANE = { id: 'SWE.13_1', name: 'Skåne' };

async function press(text: string) {
  await fireEvent.press(await screen.findByText(text));
}

async function throughLocation() {
  await press(tr('onboarding.welcome.cta'));
  await fireEvent.changeText(
    await screen.findByPlaceholderText(tr('onboarding.age.placeholder')),
    String(new Date().getFullYear() - 30),
  );
  await press(tr('onboarding.age.cta'));
  await press(tr('onboarding.location.cta'));
}

async function finish() {
  await press(tr('onboarding.notif.cta'));
  await press(tr('onboarding.firstSpotted.cta'));
}

describe('OnboardingFlow', () => {
  it('opens on the welcome step (compliance-shaped onboarding)', async () => {
    await render(<OnboardingFlow locale="en" onComplete={() => {}} />);
    expect(screen.getByText(tr('onboarding.welcome.title'))).toBeTruthy();
    expect(screen.getByText(tr('onboarding.welcome.cta'))).toBeTruthy();
  });

  it('confirms the county the location resolved to, and reports it', async () => {
    const onComplete = jest.fn<void, [OnboardingResult]>();
    await render(<OnboardingFlow locale="en" onComplete={onComplete} resolveHome={async () => SKANE} />);
    await throughLocation();
    await press(tr('onboarding.hometown.cta', { region: 'Skåne' }));
    await finish();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ hometown: SKANE }));
  });

  it('skips the confirm step when no county resolves (no fix, or outside Sweden)', async () => {
    const onComplete = jest.fn<void, [OnboardingResult]>();
    await render(<OnboardingFlow locale="en" onComplete={onComplete} resolveHome={async () => null} />);
    await throughLocation();
    expect(await screen.findByText(tr('onboarding.notif.cta'))).toBeTruthy();
    await finish();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ hometown: null }));
  });

  it('never asks for a fix when location is denied', async () => {
    (requestLocationPermission as jest.Mock).mockResolvedValueOnce('denied');
    const resolveHome = jest.fn(async () => SKANE);
    await render(<OnboardingFlow locale="en" onComplete={() => {}} resolveHome={resolveHome} />);
    await throughLocation();
    expect(await screen.findByText(tr('onboarding.notif.cta'))).toBeTruthy();
    expect(resolveHome).not.toHaveBeenCalled();
  });

  it('does not strand onboarding if the lookup throws', async () => {
    await render(
      <OnboardingFlow
        locale="en"
        onComplete={() => {}}
        resolveHome={async () => {
          throw new Error('location services off');
        }}
      />,
    );
    await throughLocation();
    expect(await screen.findByText(tr('onboarding.notif.cta'))).toBeTruthy();
  });
});
