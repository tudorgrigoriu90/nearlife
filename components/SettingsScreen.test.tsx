import { fireEvent, render, screen, within } from '@testing-library/react-native';
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

// ── Mother-tongue dual display (T-151 · F13.3) ───────────────────────────────
describe('SettingsScreen — second language', () => {
  it('is off by default and shows the discoverability info box instead of a picker', async () => {
    await render(<SettingsScreen {...renderSettings()} />);
    expect(screen.getByText(tr('dual.toggle'))).toBeTruthy();
    // While off: the user is *told* the option exists, but no picker and no pressure.
    expect(screen.getByText(tr('dual.hint'))).toBeTruthy();
    expect(screen.queryByText(tr('dual.choose'))).toBeNull();
    // No second-language picker rows at all (the primary language switcher is separate).
    expect(screen.queryByTestId('dual-locale-sv')).toBeNull();
  });

  it('turns the feature on through the toggle', async () => {
    const onToggleDualLanguage = jest.fn();
    await render(<SettingsScreen {...renderSettings({ onToggleDualLanguage })} />);
    fireEvent(screen.getAllByRole('switch').at(-1)!, 'valueChange', true);
    expect(onToggleDualLanguage).toHaveBeenCalledWith(true);
  });

  it('shows the language picker once enabled, in each language own script', async () => {
    await render(
      <SettingsScreen
        {...renderSettings({ dualLanguage: { enabled: true, secondaryLocale: null } })}
      />,
    );
    expect(screen.getByText(tr('dual.choose'))).toBeTruthy();
    // Endonym, not the English exonym.
    expect(within(screen.getByTestId('dual-locale-sv')).getByText('Svenska')).toBeTruthy();
    expect(screen.queryByText('Swedish')).toBeNull();
    // The info box is replaced by the picker — it has done its job.
    expect(screen.queryByText(tr('dual.hint'))).toBeNull();
  });

  it('never offers the language the app is already in', async () => {
    await render(
      <SettingsScreen
        {...renderSettings({ locale: 'sv', dualLanguage: { enabled: true, secondaryLocale: null } })}
      />,
    );
    // App is in Swedish, so Swedish is not a second-language option; English is.
    expect(screen.queryByTestId('dual-locale-sv')).toBeNull();
    expect(screen.getByTestId('dual-locale-en')).toBeTruthy();
  });

  it('reports the chosen language', async () => {
    const onSelectSecondaryLocale = jest.fn();
    await render(
      <SettingsScreen
        {...renderSettings({
          dualLanguage: { enabled: true, secondaryLocale: null },
          onSelectSecondaryLocale,
        })}
      />,
    );
    fireEvent.press(screen.getByTestId('dual-locale-sv'));
    expect(onSelectSecondaryLocale).toHaveBeenCalledWith('sv');
  });

  it('flags machine-translated languages up front, before the user picks one', async () => {
    await render(
      <SettingsScreen
        {...renderSettings({ dualLanguage: { enabled: true, secondaryLocale: 'sv' } })}
      />,
    );
    // Honesty (T-152): the quality caveat is visible at choice time, not only on the card.
    expect(screen.getAllByText(tr('dual.machineTranslated')).length).toBeGreaterThan(0);
    expect(screen.getByText(tr('dual.machineTranslatedHint'))).toBeTruthy();
  });
});
