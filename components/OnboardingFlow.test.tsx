import { render, screen } from '@testing-library/react-native';
import OnboardingFlow from './OnboardingFlow';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

describe('OnboardingFlow', () => {
  it('opens on the welcome step (compliance-shaped onboarding)', async () => {
    await render(<OnboardingFlow locale="en" onComplete={() => {}} />);
    expect(screen.getByText(tr('onboarding.welcome.title'))).toBeTruthy();
    expect(screen.getByText(tr('onboarding.welcome.cta'))).toBeTruthy();
  });
});
