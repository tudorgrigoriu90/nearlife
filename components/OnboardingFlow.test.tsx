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
    await render(<OnboardingFlow locale="en" onComplete={onComplete} resolveHome={async () => ({ region: SKANE })} />);
    await throughLocation();
    await press(tr('onboarding.hometown.cta', { region: 'Skåne' }));
    await finish();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ hometown: SKANE }));
  });

  it('skips the confirm step when there is no location fix', async () => {
    const onComplete = jest.fn<void, [OnboardingResult]>();
    await render(
      <OnboardingFlow locale="en" onComplete={onComplete} resolveHome={async () => ({ region: null, reason: 'no-fix' })} />,
    );
    await throughLocation();
    expect(await screen.findByText(tr('onboarding.notif.cta'))).toBeTruthy();
    await finish();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ hometown: null }));
  });

  it('never asks for a fix when location is denied', async () => {
    (requestLocationPermission as jest.Mock).mockResolvedValueOnce('denied');
    const resolveHome = jest.fn(async () => ({ region: SKANE }));
    await render(<OnboardingFlow locale="en" onComplete={() => {}} resolveHome={resolveHome} />);
    await throughLocation();
    expect(await screen.findByText(tr('onboarding.notif.cta'))).toBeTruthy();
    expect(resolveHome).not.toHaveBeenCalled();
  });

  it('tells someone outside Sweden plainly, then continues in preview (T-107)', async () => {
    const onComplete = jest.fn<void, [OnboardingResult]>();
    await render(
      <OnboardingFlow
        locale="en"
        onComplete={onComplete}
        resolveHome={async () => ({ region: null, reason: 'outside-sweden' })}
      />,
    );
    await throughLocation();
    expect(await screen.findByText(tr('onboarding.outside.title'))).toBeTruthy();
    await press(tr('onboarding.outside.cta'));
    await finish();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ hometown: null }));
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

// T-275 · review B-16: the first sighting comes from the county just confirmed.
describe('the first sighting', () => {
  const pike = {
    id: 'gbif:2346633',
    scientificName: 'Esox lucius',
    commonName: 'Pike',
    category: 'fish',
    rarity: 'common',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  } as never;

  it('is the county starter when there is a home county', async () => {
    const onFirstSpotted = jest.fn();
    await render(
      <OnboardingFlow
        locale="en"
        onComplete={() => {}}
        onFirstSpotted={onFirstSpotted}
        resolveHome={async () => ({ region: SKANE })}
        starterFor={async (regionId) => (regionId === 'SWE.13_1' ? { species: pike, content: null } : null)}
      />,
    );
    await throughLocation();
    await press(tr('onboarding.hometown.cta', { region: 'Skåne' }));
    await press(tr('onboarding.notif.cta'));
    await screen.findByText(tr('onboarding.firstSpotted.cta'));
    expect(onFirstSpotted).toHaveBeenCalledWith('gbif:2346633');
  });

  it('in preview mode uses the bundled starter', async () => {
    const onFirstSpotted = jest.fn();
    const starterFor = jest.fn(async () => null);
    await render(
      <OnboardingFlow
        locale="en"
        onComplete={() => {}}
        onFirstSpotted={onFirstSpotted}
        resolveHome={async () => ({ region: null, reason: 'no-fix' })}
        starterFor={starterFor}
      />,
    );
    await throughLocation();
    await press(tr('onboarding.notif.cta'));
    await screen.findByText(tr('onboarding.firstSpotted.cta'));
    expect(starterFor).not.toHaveBeenCalled();
    expect(onFirstSpotted.mock.calls[0][0]).not.toMatch(/^gbif:/);
  });
});

// T-285 · review B-40: the notification answer never gates onboarding, even when the call fails.
describe('a failing notification prompt', () => {
  it('still reaches the first sighting', async () => {
    const { requestNotificationPermission } = jest.requireMock('../lib/permissions');
    (requestNotificationPermission as jest.Mock).mockRejectedValueOnce(new Error('no module'));
    const onComplete = jest.fn();
    await render(
      <OnboardingFlow locale="en" onComplete={onComplete} resolveHome={async () => ({ region: SKANE })} />,
    );
    await throughLocation();
    await press(tr('onboarding.hometown.cta', { region: 'Skåne' }));
    await press(tr('onboarding.notif.cta'));
    expect(await screen.findByText(tr('onboarding.firstSpotted.cta'))).toBeTruthy();
  });
});

// T-343 · review F-05.
describe('OnboardingFlow mother-tongue offer', () => {
  it('asks once on the welcome screen; Yes turns dual display on, No leaves it off', async () => {
    const onAccept = jest.fn();
    await render(<OnboardingFlow locale="en" onComplete={() => {}} motherTongue={{ locale: 'ar', onAccept }} />);
    const tr = createTranslator('en');
    expect(screen.getByText(tr('onboarding.motherTongue', { language: 'العربية' }))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('onboarding.motherTongue.yes')));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(tr('onboarding.motherTongue.yes'))).toBeNull();
  });

  it('No closes the offer without turning anything on', async () => {
    const onAccept = jest.fn();
    await render(<OnboardingFlow locale="en" onComplete={() => {}} motherTongue={{ locale: 'ar', onAccept }} />);
    const tr = createTranslator('en');
    await fireEvent.press(screen.getByText(tr('onboarding.motherTongue.no')));
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.queryByText(tr('onboarding.motherTongue', { language: 'العربية' }))).toBeNull();
  });

  it('shows no offer without one', async () => {
    await render(<OnboardingFlow locale="en" onComplete={() => {}} />);
    expect(screen.queryByText(createTranslator('en')('onboarding.motherTongue.yes'))).toBeNull();
  });
});
