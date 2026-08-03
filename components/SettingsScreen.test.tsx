import { fireEvent, render, screen } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';
import { DEFAULT_CONSENT } from '../lib/consent';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

function renderSettings(overrides = {}) {
  const handlers = {
    consent: DEFAULT_CONSENT,
    onToggleConsent: jest.fn(),
    onSelectLocale: jest.fn(),
    onExportData: jest.fn(),
    onDone: jest.fn(),
    ...overrides,
  };
  return handlers;
}

describe('SettingsScreen', () => {
  it('renders the settings surface with consent controls (invariant #6)', async () => {
    await render(<SettingsScreen {...renderSettings()} />);
    expect(screen.getByText(tr('settings.title'))).toBeTruthy();
    expect(screen.getByText(tr('consent.location'))).toBeTruthy();
  });

  it('exposes data export (GDPR access, reachable any time)', async () => {
    const h = renderSettings();
    await render(<SettingsScreen {...h} />);
    fireEvent.press(screen.getByText(tr('settings.exportData')));
    expect(h.onExportData).toHaveBeenCalledTimes(1);
  });
});
